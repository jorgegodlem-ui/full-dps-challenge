# FULL DPS CHALLENGE — contexto del proyecto

Sitio del torneo de SoloQ de League of Legends. Ranking en vivo alimentado por la API oficial de Riot. Sitio estático: sin build, sin framework, sin backend.

- Repo: [https://github.com/jorgegodlem-ui/full-dps-challenge](https://github.com/jorgegodlem-ui/full-dps-challenge)  
- Producción: [https://comfy-palmier-f0a6ec.netlify.app](https://comfy-palmier-f0a6ec.netlify.app) (Netlify, conectado al repo)  
- Región del torneo: **LAS** (`la2`), ruteo `americas`

## Decisiones ya tomadas — no proponer lo contrario

- El torneo es **individual**. No hay equipos ni duos.  
- Los participantes **NO son streamers**. No existen reglas de directo, VOD ni modo streamer, y no hay columna ni badge de "en vivo" para ellos.  
- El único canal que aparece es la **transmisión oficial de la organización** (Proyecto Gordos), configurado en `data/config.json` → `canalOficial`. Su estado `live` se cambia a mano, a propósito.  
- **No hay premios.** No agregar una sección de premios.  
- **No hay mínimo ni tope de partidas.**  
- **No hay tramos de high elo / low elo.** Los filtros son solo Todos y Castigos.  
- El proyecto no tiene relación con el canal de Kick del dueño más allá de ser la transmisión oficial; no mezclar ambos proyectos.

## Estructura

index.html              página completa (una sola)

assets/styles.css       estilos — identidad "damage meter", dark only a propósito

assets/app.js           render del ranking: filtros, orden, contador, refresco

data/config.json        nombre, fechas, región, canal oficial

data/participantes.json inscritos: id, nombre, riotId, rol, estado

data/ranking.json       lo que muestra el sitio; lo regenera el script

data/historial.json     snapshots para el ±LP de 24 h

scripts/riot-sync.mjs   consulta la API de Riot y regenera ranking.json

.github/workflows/sync.yml  corre el script cada 15 min y commitea

`app.js` lee los JSON con `fetch` y repinta cada 60 s. Si existe `window.__FDPS__`, usa esos datos embebidos en vez de hacer fetch (modo vista previa).

## Cómo se calcula el LP total

Tier × 400 \+ división × 100 \+ LP. Maestro y arriba: 2800 \+ LP real. La barra de cada jugador es su LP total respecto al líder.

## Comandos

RIOT\_API\_KEY=RGAPI-... node scripts/riot-sync.mjs   \# regenera el ranking

python3 \-m http.server 8000                          \# servir local

`RIOT_STREAK=1` calcula la racha con match-v5 (\~10 requests extra por jugador).

## Estado y pendientes

- [ ] Cargar el secret `RIOT_API_KEY` en GitHub (Settings → Secrets → Actions). La development key de Riot **expira cada 24 h** y hay que renovar el secret.  
- [ ] Reemplazar los `{JUGADOR 01}` de `data/participantes.json` por los Riot ID reales.  
- [ ] Poner las fechas reales en `data/config.json` (hoy tiene valores inventados).  
- [ ] Poner el nombre real del canal en `canalOficial.nombre` (hoy `{PROYECTO GORDOS}`).  
- [ ] Cambiar el nombre del sitio en Netlify a algo presentable.  
- [ ] Postular la production key de Riot para dejar de renovar a diario.

## Convenciones

- Todo el texto de cara al usuario va en **español de Chile**, directo, sin solemnidad. Los comentarios del código también van en español.  
- El diseño es dark only a propósito: es un torneo de esports, no un documento.  
- No agregar dependencias ni build step. Si algo necesita una librería, primero discutirlo: el valor de este proyecto es que se despliega arrastrando archivos.  
- No scrapear op.gg ni ninguna fuente que no sea la API oficial de Riot: está explícitamente prohibido por Riot y arriesga el acceso.

