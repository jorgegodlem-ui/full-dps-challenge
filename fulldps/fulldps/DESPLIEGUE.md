# Poner el sitio online

Dos caminos. La diferencia no es el hosting: es si el ranking se actualiza solo o no.

---

## Camino A — GitHub + Netlify (el que quieres)

El sitio queda público **y** el ranking se refresca solo cada 15 minutos.
Toma unos 10 minutos la primera vez.

### 1. Subir el proyecto a GitHub

La carpeta ya viene como repositorio de git con el primer commit hecho. Solo falta
crear el repo en GitHub y empujarlo:

```bash
cd fulldps
git remote add origin https://github.com/TU-USUARIO/full-dps-challenge.git
git branch -M main
git push -u origin main
```

Si tienes el comando `gh` instalado, los tres pasos son uno:

```bash
cd fulldps
gh repo create full-dps-challenge --public --source=. --push
```

El repo tiene que ser **público** si vas a usar GitHub Pages gratis. Con Netlify
puede ser privado.

### 2. Cargar la API key como secret

En el repo: **Settings → Secrets and variables → Actions → New repository secret**

- Name: `RIOT_API_KEY`
- Secret: tu key `RGAPI-...` de developer.riotgames.com

> La key de desarrollo **expira cada 24 horas**. Cada día entras a
> developer.riotgames.com, copias la nueva y la pegas en ese mismo secret.
> Cuando te aprueben la production key, esto se acaba.

### 3. Encender la actualización automática

En el repo: pestaña **Actions** → habilitar los workflows → entrar a
"Actualizar ranking" → **Run workflow** para probarla al tiro.

Si funcionó, en la pestaña de commits vas a ver uno nuevo de `ranking-bot`.
Desde ahí corre sola cada 15 minutos.

### 4. Conectar Netlify

1. Entra a **netlify.com** con tu cuenta (puedes entrar con GitHub).
2. **Add new site → Import an existing project → GitHub** y elige el repo.
3. Build command: **vacío**. Publish directory: **`.`** (ya viene en `netlify.toml`).
4. **Deploy**.

Queda en algo como `full-dps-challenge.netlify.app`. Cada vez que el bot commitea
el ranking, Netlify redeploya solo.

### 5. Dominio propio (opcional)

En Netlify: **Domain settings → Add a domain**. Si el dominio lo tienes en otro
proveedor, apunta un CNAME a la dirección que te da Netlify.

---

## Camino B — Netlify Drop (30 segundos, sin GitHub)

1. Entra a **app.netlify.com/drop**
2. Arrastra la carpeta `fulldps` completa.
3. Listo, tienes URL pública.

**El pero:** así el ranking queda **congelado** en lo que diga `data/ranking.json`
en ese momento. Sin repo no hay GitHub Action, y sin Action nadie consulta la API
de Riot. Para actualizarlo tendrías que correr el script en tu máquina y volver a
arrastrar la carpeta cada vez.

Sirve para mostrarle el sitio a alguien hoy. No sirve para el torneo.

---

## Si prefieres saltarte Netlify

Con GitHub solo también queda público: **Settings → Pages → Source: `main`, carpeta
`/ (root)`**. Queda en `tu-usuario.github.io/full-dps-challenge`. Es un servicio
menos que administrar; Netlify gana si quieres el dominio propio con menos vueltas.

---

## Comprobar que quedó bien

- Abre el sitio: el contador tiene que estar corriendo.
- La línea "Última actualización" tiene que decir hace pocos minutos.
- Abre `tu-sitio/data/ranking.json` en el navegador: tiene que mostrar los datos
  reales, no los `{JUGADOR 01}` de ejemplo.
- Si dice "hace 3 horas", la Action se cayó: revisa la pestaña Actions. El error
  más común es la key vencida.
