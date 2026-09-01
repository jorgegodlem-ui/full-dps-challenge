# FULL DPS CHALLENGE — sitio del torneo

Ranking en vivo de SoloQ alimentado por la API oficial de Riot Games.
Sitio estático: no necesita build, servidor ni base de datos.

```
index.html              la página completa
assets/styles.css       estilos
assets/app.js           lógica del ranking (filtros, orden, contador)
data/config.json        nombre, fechas, región del torneo
data/participantes.json los jugadores inscritos  ← acá van los Riot ID
data/ranking.json       lo que muestra el sitio (lo regenera el script)
data/historial.json     snapshots para calcular el ±LP de 24 h
scripts/riot-sync.mjs   consulta la API de Riot y regenera el ranking
.github/workflows/      corre el script cada 15 minutos, gratis
```

---

## 1. Sacar la API key de Riot

1. Entra a **developer.riotgames.com** con tu cuenta de LoL.
2. En el dashboard aparece la **development key** (`RGAPI-...`). Cópiala.
3. Esa key **expira cada 24 horas**: hay que volver a la página y regenerarla.

Para no estar renovándola todos los días, postula la **production key** desde
"Register Product" una vez que el sitio esté publicado — es el flujo normal: se
postula con el sitio andando. Mientras la aprueban, la development key funciona.

Límites de la development key: 20 requests por segundo y 100 cada 2 minutos.
El script va en serie con pausa de 1,3 s, así que ~30 jugadores entran cómodos.

## 2. Cargar los participantes

Edita `data/participantes.json`. Un objeto por jugador:

```json
{
  "id": "p01",
  "nombre": "Nombre del jugador",
  "riotId": "Invocador#TAG",
  "rol": "JUNGLA",
  "estado": "activo"
}
```

- `id` tiene que ser único y **no cambiar nunca** (con eso se calcula el ±LP y el movimiento de posiciones).
- `rol`: TOP, JUNGLA, MEDIO, ADC, SUPPORT o FLEX.
- `estado`: `activo`, `castigo` o `fuera`.
- El `opgg` se genera solo a partir del Riot ID.

## 3. Probar en tu máquina

```bash
RIOT_API_KEY=RGAPI-tu-key node scripts/riot-sync.mjs
npx serve .          # o: python3 -m http.server 8000
```

Abre `http://localhost:8000`. El front se refresca solo cada 60 segundos.

## 4. Publicar

**GitHub Pages (gratis, y es donde ya corre la actualización automática):**

1. Sube la carpeta a un repo de GitHub.
2. Settings → Pages → Source: `main` / carpeta raíz.
3. Settings → Secrets and variables → Actions → New secret:
   - `RIOT_API_KEY` con tu key.
4. La acción corre cada 15 minutos, regenera `data/ranking.json` y lo commitea. El sitio queda actualizado solo.

**Netlify o Vercel:** arrastra la carpeta, sin configuración. La actualización sigue
saliendo de GitHub Actions, así que conviene conectarlo al repo igual.

> Con la development key hay que regenerarla cada 24 h y actualizar el secret.
> Es el único trámite diario hasta que llegue la production key.

## 5. Dominio propio

En GitHub Pages: Settings → Pages → Custom domain, y en tu proveedor de dominio
un registro `CNAME` apuntando a `tu-usuario.github.io`.

---

## Ajustes rápidos

| Qué | Dónde |
|---|---|
| Fechas y hora de cierre | `data/config.json` |
| Cambiar a LAN | `plataforma: "la1"` en `config.json` |
| Canal de la transmisión | `canalOficial` en `data/config.json` |
| Normas | sección `#normas` en `index.html` y `REGLAS.md` |
| Cada cuánto se refresca el navegador | último `setInterval` de `app.js` |
| Cada cuánto consulta la API | cron en `.github/workflows/sync.yml` |

### La transmisión oficial

La franja de arriba muestra un solo canal: el de la organización. Se configura en
`canalOficial` dentro de `data/config.json` — nombre, plataforma, URL y `live`.
Ese `live` se cambia a mano (`true` cuando estén al aire, `false` cuando no):
son dos segundos y evita depender de otra API. Los participantes no aparecen ahí,
porque no transmiten.

### Racha real

Por defecto la racha viene vacía para ahorrar requests. Para calcularla con
match-v5, pon `RIOT_STREAK: "1"` en el workflow. Suma ~10 requests por jugador,
así que con más de 20 participantes conviene bajar el cron a cada 30 minutos.

---

Este proyecto no está avalado por Riot Games. Al usar su API quedas sujeto a sus
políticas de desarrollador: no scrapear, no compartir la key, y mantener el sitio
gratis para los jugadores.
