# FULL DPS CHALLENGE — contexto del proyecto

Sitio del torneo de SoloQ de League of Legends. Ranking en vivo alimentado por la API oficial de Riot. Sitio estático: sin build, sin framework, sin backend.

- Repo: [https://github.com/jorgegodlem-ui/full-dps-challenge](https://github.com/jorgegodlem-ui/full-dps-challenge)  
- Producción: [https://jorgegodlem-ui.github.io/full-dps-challenge](https://jorgegodlem-ui.github.io/full-dps-challenge) — **GitHub Pages**
- El sitio estuvo en Netlify (`fulldpschallenge.netlify.app`) hasta el 2-sep-2026. Se movió porque Netlify **pausó los production deploys** del equipo Cadencia Digital por límite de plan: el repo seguía al día y el sitio quedó 15 horas congelado sin aviso. Pages es gratis e ilimitado para repos públicos y publica con el mismo push del bot. El sitio de Netlify sigue existiendo por si se retoma, pero la URL oficial es la de Pages. 
- Región del torneo: **LAS** (`la2`), ruteo `americas`

## Decisiones ya tomadas — no proponer lo contrario

- El torneo es **individual**. No hay equipos ni duos.  
- Los participantes **NO son streamers**. No existen reglas de directo, VOD ni modo streamer, y no hay columna ni badge de "en vivo" para ellos.  
- El único canal que aparece es la **transmisión oficial de la organización** (Proyecto Gordos), configurado en `data/config.json` → `canalOficial`. Su estado `live` se cambia a mano, a propósito.  
- **No hay castigos.** El torneo no descuenta LP por conducta ni publica sanciones. Se sacaron el filtro de castigos, el badge, la tarjeta de normas "Conducta" y la caja de puntaje. Lo único que queda es la **descalificación** (account sharing, win trading, suspensión de cuenta), y para eso está el estado `fuera`.
- **No hay premios.** No agregar una sección de premios.  
- **No hay mínimo ni tope de partidas.**  
- **No hay tramos de high elo / low elo.** Tampoco hay filtros: sobre la tabla queda solo el buscador.  
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

El torneo **arrancó el 1 de septiembre de 2026** y cierra el **28 de septiembre a las 23:59** de Chile.

- [x] ~~Cargar el secret `RIOT_API_KEY` en GitHub.~~ Hecho: el workflow corre solo y commitea.
- [ ] **Renovar la key todos los días.** La development key de Riot muere a las 24 h y el workflow empieza a fallar en rojo. El camino que funciona, sin copiar y pegar a mano:

  ```bash
  notepad .env                                    # pegar la key nueva
  node -e "const fs=require(fs);process.stdout.write((fs.readFileSync(.env,utf8).match(/^\s*RIOT_API_KEY\s*=\s*(.*)$/m)||[])[1].trim())" | gh secret set RIOT_API_KEY --repo jorgegodlem-ui/full-dps-challenge
  ```

- [ ] Completar los Riot ID que faltan en `data/participantes.json`: Sutter, Kromosoman, Gamblez, Charwo y Patrick están como `{PENDIENTE}` porque todavía no tienen cuenta. El script los salta sin romperse y la tabla los muestra como "cuenta por confirmar".
- [ ] Poner el **rol real** de cada jugador. Hoy están todos en `FLEX` porque no se informaron.
- [ ] Poner `canalOficial.live` en `true` cuando la transmisión salga al aire, y en `false` cuando termine. Es a mano, a propósito.
- [ ] Cambiar el nombre del sitio en Netlify a algo presentable.
- [ ] Postular la production key de Riot para dejar de renovar a diario.

`data/ranking.json` está con `"fuente": "pendiente"` y todos en 0: son los 11 inscritos reales, sin datos de la API todavía. La primera corrida del script lo reemplaza.

## Convenciones

- Todo el texto de cara al usuario va en **español de Chile**, directo, sin solemnidad. Los comentarios del código también van en español.  
- El diseño es dark only a propósito: es un torneo de esports, no un documento.  
- No agregar dependencias ni build step. Si algo necesita una librería, primero discutirlo: el valor de este proyecto es que se despliega arrastrando archivos.  
- No scrapear op.gg ni ninguna fuente que no sea la API oficial de Riot: está explícitamente prohibido por Riot y arriesga el acceso.

