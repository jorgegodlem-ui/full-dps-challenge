#!/usr/bin/env node
/* ==========================================================================
   FULL DPS CHALLENGE — sincronización con la API de Riot
   --------------------------------------------------------------------------
   Lee data/participantes.json, consulta la API oficial y regenera
   data/ranking.json con elo, LP, victorias, derrotas, racha y ±LP 24h.

   Uso:
     RIOT_API_KEY=RGAPI-xxxx node scripts/riot-sync.mjs

   Opcionales:
     RIOT_STREAK=1                      calcula la racha con match-v5 (más requests)

   Rate limit de una development key: 20 req/s y 100 req cada 2 min.
   El script va en serie con pausa, así que ~30 jugadores entran cómodos.
   ========================================================================== */

import { readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

const KEY = process.env.RIOT_API_KEY;
if (!KEY) {
  console.error("Falta RIOT_API_KEY. Sácala en https://developer.riotgames.com (la de desarrollo dura 24 h).");
  process.exit(1);
}

// fileURLToPath y no .pathname: en Windows .pathname devuelve "/C:/..." con los
// espacios codificados como %20, y fs no sabe abrir eso.
const RAIZ = fileURLToPath(new URL("../", import.meta.url));
const F_CONFIG = RAIZ + "data/config.json";
const F_PART = RAIZ + "data/participantes.json";
const F_RANK = RAIZ + "data/ranking.json";
const F_HIST = RAIZ + "data/historial.json";

const PAUSA = Number(process.env.RIOT_PAUSA || 1300);   // ms entre requests
const dormir = ms => new Promise(r => setTimeout(r, ms));

const config = JSON.parse(await readFile(F_CONFIG, "utf8"));
const PLATAFORMA = config.plataforma || "la2";          // LAS = la2, LAN = la1
const RUTEO = config.ruteo || "americas";
// match-v5 espera segundos, no milisegundos
const DESDE = Math.floor(new Date(`${config.inicio}T${config.horaInicio || "00:00"}:00${config.utcOffset || "-04:00"}`).getTime() / 1000);

/* ---------- cliente HTTP con reintentos ---------- */

async function api(host, ruta, intentos = 3) {
  const url = `https://${host}.api.riotgames.com${ruta}`;
  for (let i = 1; i <= intentos; i++) {
    const res = await fetch(url, { headers: { "X-Riot-Token": KEY } });

    if (res.status === 429) {
      const espera = Number(res.headers.get("retry-after") || 10);
      console.warn(`  · rate limit, esperando ${espera}s`);
      await dormir(espera * 1000);
      continue;
    }
    if (res.status === 404) return null;
    if (res.status === 401 || res.status === 403) {
      throw new Error(`Key inválida o vencida (${res.status}). Regenérala en developer.riotgames.com.`);
    }
    if (!res.ok) {
      if (i === intentos) throw new Error(`${res.status} en ${ruta}`);
      await dormir(1500 * i);
      continue;
    }
    return res.json();
  }
  return null;
}

/* ---------- pasos de la consulta ---------- */

async function buscarPuuid(riotId) {
  const [nombre, tag] = String(riotId).split("#");
  if (!nombre || !tag) throw new Error(`Riot ID mal escrito: "${riotId}" (tiene que ser Nombre#TAG)`);
  const cuenta = await api(RUTEO, `/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(nombre)}/${encodeURIComponent(tag)}`);
  return cuenta?.puuid || null;
}

async function buscarLiga(puuid) {
  // Vía nueva: entries por puuid.
  let entradas = await api(PLATAFORMA, `/lol/league/v4/entries/by-puuid/${puuid}`);

  // Respaldo para claves o regiones donde ese endpoint todavía no responde.
  if (!entradas) {
    const inv = await api(PLATAFORMA, `/lol/summoner/v4/summoners/by-puuid/${puuid}`);
    if (inv?.id) {
      await dormir(PAUSA);
      entradas = await api(PLATAFORMA, `/lol/league/v4/entries/by-summoner/${inv.id}`);
    }
  }
  if (!Array.isArray(entradas)) return null;
  return entradas.find(e => e.queueType === "RANKED_SOLO_5x5") || null;
}

async function buscarRacha(puuid) {
  const ids = await api(RUTEO, `/lol/match/v5/matches/by-puuid/${puuid}/ids?queue=420&count=10`);
  if (!Array.isArray(ids) || !ids.length) return { tipo: "W", n: 0 };
  let tipo = null, n = 0;
  for (const id of ids) {
    await dormir(PAUSA);
    const m = await api(RUTEO, `/lol/match/v5/matches/${id}`);
    const yo = m?.info?.participants?.find(p => p.puuid === puuid);
    if (!yo) break;
    const gano = yo.win ? "W" : "L";
    if (tipo === null) tipo = gano;
    if (gano !== tipo) break;
    n++;
  }
  return { tipo: tipo || "W", n };
}

/* Cuando Riot todavia no asigna rango en SoloQ (faltan clasificatorias), league-v4
   no devuelve nada y el jugador se ve congelado en 0 aunque este jugando. Estas
   partidas si estan en match-v5, asi que se cuentan de ahi. Solo se consulta para
   quienes no tienen rango: en cuanto Riot los clasifica, deja de costar requests. */
async function buscarClasificatorias(puuid, desde){
  const ids = await api(RUTEO, `/lol/match/v5/matches/by-puuid/${puuid}/ids?queue=420&startTime=${desde}&count=10`);
  if (!Array.isArray(ids) || !ids.length) return { jugadas: 0, victorias: 0, derrotas: 0 };
  let victorias = 0, derrotas = 0;
  for (const id of ids) {
    await dormir(PAUSA);
    const m = await api(RUTEO, `/lol/match/v5/matches/${id}`);
    const yo = m?.info?.participants?.find(p => p.puuid === puuid);
    if (!yo) continue;
    // Un remake queda anulado: Riot no lo cuenta como partida jugada, no toca el LP
    // y no avanza las clasificatorias. El torneo lo trata igual.
    if (yo.gameEndedInEarlySurrender) continue;
    if (yo.win) victorias++; else derrotas++;
  }
  return { jugadas: victorias + derrotas, victorias, derrotas };
}

/* ---------- historial para el ±LP de 24 h ---------- */

function lpTotal(j) {
  const TIERS = ["IRON","BRONZE","SILVER","GOLD","PLATINUM","EMERALD","DIAMOND","MASTER","GRANDMASTER","CHALLENGER"];
  const ES = { IRON:"HIERRO", BRONZE:"BRONCE", SILVER:"PLATA", GOLD:"ORO", PLATINUM:"PLATINO", EMERALD:"ESMERALDA", DIAMOND:"DIAMANTE", MASTER:"MAESTRO", GRANDMASTER:"GRANMAESTRO", CHALLENGER:"RETADOR" };
  const DIV = { I:3, II:2, III:1, IV:0 };
  const clave = Object.keys(ES).find(k => ES[k] === j.tier) || "IRON";
  const t = TIERS.indexOf(clave);
  if (t >= 7) return 2800 + (j.lp || 0);
  return t * 400 + (DIV[j.division] ?? 0) * 100 + (j.lp || 0);
}

async function leerJSON(ruta, porDefecto) {
  if (!existsSync(ruta)) return porDefecto;
  try { return JSON.parse(await readFile(ruta, "utf8")); } catch { return porDefecto; }
}

/* ---------- proceso principal ---------- */

const { jugadores: participantes } = JSON.parse(await readFile(F_PART, "utf8"));
const anterior = await leerJSON(F_RANK, { jugadores: [] });
const historial = await leerJSON(F_HIST, { snapshots: [] });
const previos = new Map((anterior.jugadores || []).map(j => [j.id, j]));

console.log(`FULL DPS CHALLENGE · sincronizando ${participantes.length} cuentas en ${PLATAFORMA.toUpperCase()}`);

const salida = [];
let conCuenta = 0, fallaron = 0;

for (const p of participantes) {
  const previo = previos.get(p.id) || {};
  const fila = {
    ...p,
    puuid: p.puuid || previo.puuid || "",
    tier: previo.tier || "", division: previo.division || "", lp: previo.lp || 0,
    victorias: previo.victorias || 0, derrotas: previo.derrotas || 0,
    racha: previo.racha || { tipo: "W", n: 0 },
    deltaLp: 0, posAnterior: 0,
    opgg: p.opgg || previo.opgg || ""
  };

  if (String(p.riotId).includes("{")) {
    // sin cuenta confirmada no hay perfil que enlazar: se limpia el opgg viejo
    fila.opgg = "";
    console.log(`  – ${p.nombre}: sin Riot ID todavía, se deja como está`);
    salida.push(fila);
    continue;
  }

  conCuenta++;
  try {
    if (!fila.puuid) {
      fila.puuid = await buscarPuuid(p.riotId);
      await dormir(PAUSA);
    }
    if (!fila.puuid) {
      console.warn(`  ! ${p.nombre}: no existe la cuenta ${p.riotId}`);
      salida.push(fila);
      continue;
    }

    // Los PUUID vienen cifrados por API key: el que se guardo con la key de ayer
    // deja de servir hoy y league-v4 responde 400, aunque la key nueva este bien.
    // Si pasa, se vuelve a resolver el PUUID desde el Riot ID y se reintenta.
    let liga;
    try {
      liga = await buscarLiga(fila.puuid);
    } catch (e) {
      if (!String(e.message).startsWith("400")) throw e;
      console.log(`    · ${p.nombre}: el PUUID guardado quedo obsoleto, se vuelve a resolver`);
      await dormir(PAUSA);
      fila.puuid = await buscarPuuid(p.riotId);
      await dormir(PAUSA);
      if (!fila.puuid) throw new Error(`no se pudo re-resolver ${p.riotId}`);
      liga = await buscarLiga(fila.puuid);
    }
    await dormir(PAUSA);

    if (liga) {
      const ES = { IRON:"HIERRO", BRONZE:"BRONCE", SILVER:"PLATA", GOLD:"ORO", PLATINUM:"PLATINO", EMERALD:"ESMERALDA", DIAMOND:"DIAMANTE", MASTER:"MAESTRO", GRANDMASTER:"GRANMAESTRO", CHALLENGER:"RETADOR" };
      fila.tier = ES[liga.tier] || liga.tier;
      fila.division = liga.rank || "";
      fila.lp = liga.leaguePoints || 0;
      fila.victorias = liga.wins || 0;
      fila.derrotas = liga.losses || 0;
      delete fila.clasificatorias;
    } else {
      // sin rango en SoloQ: se muestra el avance de las clasificatorias
      fila.tier = ""; fila.division = ""; fila.lp = 0;
      const cl = await buscarClasificatorias(fila.puuid, DESDE);
      await dormir(PAUSA);
      fila.clasificatorias = cl.jugadas;
      fila.victorias = cl.victorias;
      fila.derrotas = cl.derrotas;
    }

    if (process.env.RIOT_STREAK === "1") {
      fila.racha = await buscarRacha(fila.puuid);
      await dormir(PAUSA);
    }

    if (!fila.opgg && p.riotId) {
      const [n, t] = p.riotId.split("#");
      fila.opgg = `https://op.gg/lol/summoners/${PLATAFORMA === "la1" ? "lan" : "las"}/${encodeURIComponent(n)}-${encodeURIComponent(t)}`;
    }

    const estado = fila.tier ? `${fila.tier} ${fila.division} ${fila.lp} LP` : `clasificatorias ${fila.clasificatorias || 0}/5`;
    console.log(`  ✓ ${p.nombre}: ${estado} (${fila.victorias}V/${fila.derrotas}D)`);
  } catch (e) {
    fallaron++;
    console.error(`  ! ${p.nombre}: ${e.message}`);
  }

  salida.push(fila);
}

/* Si fallaron TODAS las cuentas, el problema es la key o la API, no los jugadores.
   No se escribe nada: un ranking.json con fecha nueva y datos viejos le miente a
   la gente diciendo "actualizado hace instantes". Mejor que la Action quede roja. */
if (conCuenta > 0 && fallaron === conCuenta) {
  console.error(`
Fallaron las ${fallaron} cuentas consultadas. No se escribe ranking.json.`);
  console.error("Casi siempre es la key vencida: regenérala en developer.riotgames.com y actualiza el secret RIOT_API_KEY.");
  process.exit(1);
}

/* posiciones previas y ±LP de las últimas 24 h */
const ordenPrevio = (anterior.jugadores || [])
  .filter(j => j.estado !== "fuera")
  .sort((a, b) => lpTotal(b) - lpTotal(a));
const posPrevia = new Map(ordenPrevio.map((j, i) => [j.id, i + 1]));

const hace24h = Date.now() - 86400000;
const viejo = (historial.snapshots || []).filter(s => new Date(s.t).getTime() <= hace24h).pop()
  || (historial.snapshots || [])[0];

for (const j of salida) {
  j.posAnterior = posPrevia.get(j.id) || 0;
  const base = viejo?.lp?.[j.id];
  j.deltaLp = typeof base === "number" ? lpTotal(j) - base : 0;
}

/* guardar */
const ahora = new Date().toISOString();
historial.snapshots = [
  ...(historial.snapshots || []).filter(s => new Date(s.t).getTime() > Date.now() - 8 * 86400000),
  { t: ahora, lp: Object.fromEntries(salida.map(j => [j.id, lpTotal(j)])) }
];

await writeFile(F_RANK, JSON.stringify({ actualizado: ahora, fuente: "riot-api", jugadores: salida }, null, 2));
await writeFile(F_HIST, JSON.stringify(historial, null, 2));

console.log(`Listo. ${salida.length} jugadores escritos en data/ranking.json`);
