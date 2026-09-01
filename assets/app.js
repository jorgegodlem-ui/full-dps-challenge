/* ==========================================================================
   FULL DPS CHALLENGE — front del ranking
   Lee data/config.json + data/ranking.json y pinta el damage meter.
   No necesita build ni framework: es un archivo estático.
   ========================================================================== */

const TIERS = ["HIERRO","BRONCE","PLATA","ORO","PLATINO","ESMERALDA","DIAMANTE","MAESTRO","GRANMAESTRO","RETADOR"];
const DIVS  = { "I":3, "II":2, "III":1, "IV":0 };
const ROLES = { TOP:"Top", JUNGLA:"Jungla", MEDIO:"Medio", ADC:"ADC", SUPPORT:"Support", FLEX:"Flex" };

const state = {
  config: null,
  data: null,
  busqueda: "",
  orden: { campo: "lp", dir: "desc" }
};

/* ---------- utilidades ---------- */

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

function lpTotal(j){
  const t = TIERS.indexOf(String(j.tier || "").toUpperCase());
  if (t < 0) return 0;
  if (t >= 7) return 2800 + (j.lp || 0);              // Maestro+ : LP continuo
  return t * 400 + (DIVS[j.division] ?? 0) * 100 + (j.lp || 0);
}
function eloTexto(j){
  const t = String(j.tier || "").toUpperCase();
  // Riot no asigna rango hasta las 5 clasificatorias: mientras tanto se muestra el avance,
  // porque "Sin rango" hacía parecer que el jugador no estaba jugando.
  if (!t) return typeof j.clasificatorias === "number" && j.clasificatorias > 0
    ? `Clasificatorias ${Math.min(j.clasificatorias, 5)}/5`
    : "Sin rango";
  const nombre = t.charAt(0) + t.slice(1).toLowerCase();
  return TIERS.indexOf(t) >= 7 ? nombre : `${nombre} ${j.division || ""}`.trim();
}
function partidas(j){ return (j.victorias || 0) + (j.derrotas || 0); }
function winrate(j){
  const p = partidas(j);
  return p ? Math.round((j.victorias / p) * 100) : 0;
}
function inicial(n){ return String(n || "?").replace(/[{}[\]]/g, "").trim().charAt(0).toUpperCase() || "?"; }
function esc(s){
  return String(s ?? "").replace(/[&<>"]/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;" }[c]));
}
function activo(j){ return j.estado !== "fuera"; }

/* ---------- carga de datos ---------- */

async function cargar(){
  // Modo vista previa: los datos vienen embebidos en la página.
  if (window.__FDPS__) {
    state.config = window.__FDPS__.config;
    state.data = window.__FDPS__.ranking;
    pintarTodo();
    return;
  }
  const bust = "?t=" + Date.now();
  try {
    const [cfg, rank] = await Promise.all([
      fetch("data/config.json" + bust).then(r => r.json()),
      fetch("data/ranking.json" + bust).then(r => r.json())
    ]);
    state.config = cfg;
    state.data = rank;
    pintarTodo();
  } catch (err) {
    console.error("No se pudo cargar la data", err);
    const tb = $("#rankBody");
    if (tb && !state.data) {
      tb.innerHTML = `<tr><td colspan="9"><div class="empty-row">No se pudo cargar el ranking. Reintentando…</div></td></tr>`;
    }
  }
}

/* ---------- render ---------- */

function pintarTodo(){
  const c = state.config, d = state.data;
  document.title = `${c.nombre} — Ranking en vivo`;
  $("#logoName").innerHTML = c.nombre.replace(/^(\S+)/, "<span>$1</span>");
  $("#heroTitle").innerHTML = c.nombre.replace(/(DPS)/i, "<em>$1</em>");
  $("#heroSub").textContent = c.descripcion;
  $("#tagRegion").textContent = c.region;
  $("#tagFechas").textContent = `${fechaCorta(c.inicio)} → ${fechaCorta(c.fin)}`;
  $("#tagJugadores").textContent = `${(d.jugadores || []).filter(activo).length} participantes`;
  $("#footerNombre").textContent = c.nombre;
  $("#anio").textContent = new Date().getFullYear();

  pintarActualizado();
  pintarContador();
  pintarCanalOficial();
  pintarTabla();
}

function fechaCorta(iso){
  if (!iso) return "—";
  const [a, m, d] = String(iso).split("-");
  return `${d}/${m}`;
}

function pintarActualizado(){
  const t = state.data.actualizado;
  const el = $("#updated");
  if (!t) { el.innerHTML = "Última actualización: <b>—</b>"; return; }
  const dt = new Date(t);
  const mins = Math.round((Date.now() - dt.getTime()) / 60000);
  const rel = mins < 1 ? "hace instantes" : mins < 60 ? `hace ${mins} min` : `hace ${Math.round(mins/60)} h`;
  el.innerHTML = `Última actualización: <b>${dt.toLocaleTimeString("es-CL",{hour:"2-digit",minute:"2-digit"})} · ${rel}</b>`;
}

let cdTimer = null;
function pintarContador(){
  const c = state.config;
  const objetivo = new Date(`${c.fin}T${c.horaCierre || "23:59"}:00${c.utcOffset || "-04:00"}`);
  const inicio = new Date(`${c.inicio}T${c.horaInicio || "00:00"}:00${c.utcOffset || "-04:00"}`);

  const tick = () => {
    const ahora = Date.now();
    const arrancado = ahora >= inicio.getTime();
    const ref = arrancado ? objetivo.getTime() : inicio.getTime();
    let ms = ref - ahora;
    $("#cdLabel").textContent = arrancado ? "El torneo termina en" : "El torneo empieza en";
    if (ms <= 0) {
      ms = 0;
      $("#cdLabel").textContent = arrancado ? "Torneo cerrado" : "Arrancando";
    }
    const d = Math.floor(ms / 86400000);
    const h = Math.floor(ms % 86400000 / 3600000);
    const m = Math.floor(ms % 3600000 / 60000);
    const s = Math.floor(ms % 60000 / 1000);
    const pad = n => String(n).padStart(2, "0");
    $("#cdD").textContent = pad(d);
    $("#cdH").textContent = pad(h);
    $("#cdM").textContent = pad(m);
    $("#cdS").textContent = pad(s);
    $("#cdDias").classList.toggle("crit", arrancado && d <= 3);
    $("#hdrClock").innerHTML = arrancado
      ? `Quedan <b>${d}d ${pad(h)}h</b>`
      : `Empieza en <b>${d}d ${pad(h)}h</b>`;
  };
  tick();
  clearInterval(cdTimer);
  cdTimer = setInterval(tick, 1000);
}

// La transmisión oficial del torneo. Los participantes no transmiten: acá va
// el canal de la organización y nada más.
function pintarCanalOficial(){
  const canal = state.config.canalOficial;
  const cont = $("#canalOficial");
  if (!canal) { $("#tiraCanal").hidden = true; return; }

  const live = !!canal.live;
  $("#estadoCanal").textContent = live ? "En directo ahora" : "Fuera del aire";
  $("#tiraCanal").classList.toggle("off", !live);

  cont.innerHTML = `
    <a class="live-card" href="${esc(canal.url)}" target="_blank" rel="noopener">
      <span class="av">${esc(inicial(canal.nombre))}</span>
      <span>
        <span class="who nm">${esc(canal.nombre)}</span>
        <span class="plat">${esc(canal.plataforma || "")} · ${live ? "transmitiendo el torneo" : "sin transmisión"}</span>
      </span>
    </a>`;
}

function filtrar(js){
  const q = state.busqueda.trim().toLowerCase();
  return js.filter(j => {
    if (q) {
      const heno = `${j.nombre} ${j.riotId} ${j.rol}`.toLowerCase();
      if (!heno.includes(q)) return false;
    }
    return true;
  });
}

function ordenar(js){
  const { campo, dir } = state.orden;
  const mult = dir === "desc" ? -1 : 1;
  const val = j => ({
    lp: lpTotal(j),
    nombre: j.nombre.toLowerCase(),
    rol: j.rol || "",
    wr: winrate(j),
    partidas: partidas(j),
    delta: j.deltaLp || 0
  }[campo]);
  return js.slice().sort((a, b) => {
    const va = val(a), vb = val(b);
    if (va < vb) return -1 * mult;
    if (va > vb) return 1 * mult;
    return lpTotal(b) - lpTotal(a);
  });
}

function pintarTabla(){
  const todos = (state.data.jugadores || []);
  // La posición oficial siempre sale del LP total, no del orden que el usuario elija.
  const oficial = todos.slice().sort((a, b) => lpTotal(b) - lpTotal(a));
  const posicion = new Map(oficial.filter(activo).map((j, i) => [j.id, i + 1]));
  const tope = Math.max(1, ...oficial.map(lpTotal));

  const lista = ordenar(filtrar(todos));
  const tb = $("#rankBody");

  if (!lista.length) {
    tb.innerHTML = `<tr><td colspan="9"><div class="empty-row">Nadie coincide con esa búsqueda.</div></td></tr>`;
    return;
  }

  tb.innerHTML = lista.map(j => {
    const pos = posicion.get(j.id);
    const total = lpTotal(j);
    const pct = Math.max(2, Math.round(total / tope * 100));
    const wr = winrate(j);
    const wrClase = wr >= 55 ? "wr-good" : wr >= 50 ? "wr-mid" : "wr-bad";
    const mov = movimiento(j, pos);
    const racha = pintarRacha(j.racha);
    const dl = j.deltaLp || 0;
    const dClase = dl > 0 ? "up" : dl < 0 ? "down" : "flat";
    const fuera = !activo(j);

    return `<tr class="${fuera ? "out" : ""} ${pos === 1 ? "top1" : pos === 2 ? "top2" : pos === 3 ? "top3" : ""}">
      <td>
        <span class="pos">
          <span class="n">${fuera ? "—" : pos}</span>
          <span class="mv ${mov.clase}">${mov.txt}</span>
        </span>
      </td>
      <td>
        <div class="who-cell">
          <span class="av">${esc(inicial(j.nombre))}</span>
          <span class="who">
            <span class="nm">${esc(j.nombre)}
              ${j.estado === "fuera" ? '<span class="badge-out">FUERA</span>' : ""}
            </span>
            <span class="rid">${j.riotId && !j.riotId.includes("{") ? esc(j.riotId) : "cuenta por confirmar"}</span>
          </span>
        </div>
      </td>
      <td><span class="role">${esc(ROLES[j.rol] || j.rol || "—")}</span></td>
      <td>
        <div class="meter">
          <div class="top"><span class="elo">${esc(eloTexto(j))}</span>${j.tier ? `<span class="lp">${j.lp || 0} LP</span>` : ""}</div>
          <div class="bar"><i style="width:${pct}%"></i></div>
        </div>
      </td>
      <td><span class="wl"><b class="${wrClase}">${wr}%</b> <span class="d">${j.victorias || 0}V · ${j.derrotas || 0}D</span></span></td>
      <td>${racha}</td>
      <td><span class="delta ${dClase}">${dl > 0 ? "+" : ""}${dl}</span></td>
      <td><span class="mono" style="color:var(--ink-3)">${partidas(j)}</span></td>
      <td>${j.opgg ? `<a class="opgg" href="${esc(j.opgg)}" target="_blank" rel="noopener">OP.GG</a>` : ""}</td>
    </tr>`;
  }).join("");
}

function movimiento(j, pos){
  if (!j.posAnterior || !pos) return { clase: "same", txt: "–" };
  const dif = j.posAnterior - pos;
  if (dif > 0) return { clase: "up", txt: `▲${dif}` };
  if (dif < 0) return { clase: "down", txt: `▼${Math.abs(dif)}` };
  return { clase: "same", txt: "–" };
}

function pintarRacha(r){
  if (!r || !r.n) return '<span class="streak none">—</span>';
  const clase = r.tipo === "W" ? "w" : "l";
  const simbolo = r.tipo === "W" ? "▲" : "▼";
  return `<span class="streak ${clase}">${simbolo} ${r.n}${r.tipo}</span>`;
}

/* ---------- interacción ---------- */

function conectarUI(){
  $("#buscador").addEventListener("input", e => {
    state.busqueda = e.target.value;
    pintarTabla();
  });

  $$("th.sortable").forEach(th => {
    th.addEventListener("click", () => {
      const campo = th.dataset.campo;
      if (state.orden.campo === campo) {
        state.orden.dir = state.orden.dir === "desc" ? "asc" : "desc";
      } else {
        state.orden = { campo, dir: "desc" };
      }
      $$("th.sortable").forEach(x => x.removeAttribute("aria-sort"));
      th.setAttribute("aria-sort", state.orden.dir === "desc" ? "descending" : "ascending");
      pintarTabla();
    });
  });
}

/* ---------- arranque ---------- */

conectarUI();
cargar();
setInterval(cargar, 60000);            // el ranking se refresca solo cada minuto
setInterval(pintarActualizado, 30000);
