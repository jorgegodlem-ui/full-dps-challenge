# Postulación — Personal API Key (Riot Developer Portal)

Campos del formulario:

- Product Name .......  FULL DPS CHALLENGE
- Product URL ........  https://fulldpschallenge.netlify.app
- Product Group ......  Default Group (dejar como viene)
- Product Game Focus .  League of Legends
- Product Description   el texto de abajo, completo

---

## Product Description (pegar tal cual)

FULL DPS CHALLENGE is a small private ranked ladder for a group of 11 friends playing Solo/Duo queue on the LAS server. It is a single static web page showing a live leaderboard of those 11 registered participants, sorted by their total League Points. The tournament runs from September 1st to September 28th, 2026, and whoever holds the highest total LP at the closing time wins.

It is a free hobby project made for friends: there is no prize money, no entry fee, no advertising, no user accounts, no login, and no collection or storage of personal data. The full source code is public at https://github.com/jorgegodlem-ui/full-dps-challenge

How it works: a scheduled job runs every 15 minutes and reads the current ranked standing of each of the 11 registered players, then writes the result into a static JSON file that the page renders. Nothing is stored beyond the current standings plus a rolling 8-day snapshot of LP totals, which is used only to display how much LP each player gained or lost in the last 24 hours.

The APIs we are using are:

ACCOUNT-V1 (/riot/account/v1/accounts/by-riot-id) to resolve each participant's Riot ID into a PUUID. This is called once per player and the result is cached, so it is not repeated on later runs.

LEAGUE-V4 (/lol/league/v4/entries/by-puuid) to read tier, division, league points, wins and losses in the RANKED_SOLO_5x5 queue. This is the main source of the leaderboard.

SUMMONER-V4 (/lol/summoner/v4/summoners/by-puuid) used only as a fallback, when the league-v4 by-puuid endpoint returns no data.

MATCH-V5 (/lol/match/v5/matches/by-puuid/{puuid}/ids and /lol/match/v5/matches/{matchId}) used only for players who have not yet finished their five placement games, so the page can show their placement progress and record instead of showing them as unranked. As soon as Riot assigns a player a rank, these calls stop for that player. We also read the gameEndedInEarlySurrender flag so that remakes are correctly excluded, matching how Riot itself treats them.

Request volume: roughly 50 requests per run, once every 15 minutes, with a 1.3 second pause between calls and exponential backoff on errors. This stays well within the 100 requests per 2 minutes limit. We only ever query the 11 registered participants; the application never crawls, enumerates or discovers other players.

All displayed data comes from the official Riot API. Nothing is scraped from third-party websites. The page states clearly that it is not endorsed by Riot Games and does not reflect their views.

---

## Qué dice, en corto (esto no se envía)

Que es una tabla privada para 11 amigos jugando SoloQ en LAS, del 1 al 28 de
septiembre, gana el de más LP total. Sin premios, sin publicidad, sin registro
ni datos personales. Código público. Corre cada 15 minutos y escribe un JSON
estático. Detalla los cuatro endpoints y para qué sirve cada uno, aclara que
match-v5 solo se usa mientras el jugador está en clasificatorias, y que son
~50 requests por corrida con pausa de 1,3 s, muy por debajo del límite.
Aclara que solo consulta a los 11 inscritos y que no scrapea nada.
