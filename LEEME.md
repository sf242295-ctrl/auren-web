# Web de Auren RP (Cloudflare Worker, gratis)

```
auren-worker/
├── wrangler.jsonc            ← configuración de Cloudflare (no lo toques)
├── src/worker.js             ← login con Discord, estadísticas, panel del staff, GandyDev y streamers (no lo toques)
└── public/                   ← LA WEB
    ├── index.html            ← portada (guía, números en vivo, directos…)
    ├── normativas.html       ← reglas con buscador
    ├── ayuda.html            ← preguntas frecuentes
    ├── panel.html            ← Mi cuenta
    ├── streamers.html        ← STREAMERS: en directo, top por seguidores y el más activo
    ├── staff.html            ← PANEL DEL STAFF (en vivo con el admin menu + monitor de pantallas)
    ├── privacidad.html, terminos.html
    ├── assets/site.js        ← CONFIGURACIÓN: Discord, cfx.re, streamers, frases…
    ├── assets/site.css       ← colores, letra y modos de lectura
    ├── assets/city.js        ← la ciudad animada del fondo
    ├── assets/staff.js       ← lógica del panel del staff
    ├── assets/gandy.js       ← GandyDev, el asistente que camina y salta por la web
    ├── assets/tour.js        ← recorrido de bienvenida (abre The GOATs)
    ├── assets/halloween.js   ← ambiente de Halloween (luna, murciélagos, araña…)
    ├── familia.html          ← FAMILIA STAFF (el equipo y de qué se encarga cada uno)
    ├── buzon.html            ← BUZÓN (experiencias públicas y quejas anónimas)
    ├── ruleta.html           ← RULETA de Halloween
    ├── data/normativas.js    ← AQUÍ editas las reglas
    └── data/ayuda.js         ← AQUÍ editas las preguntas frecuentes
```

## Qué editar normalmente
- Links, código de FiveM, streamers y redes: bloque **CONFIGURACIÓN** de `public/assets/site.js`.
- Reglas: `public/data/normativas.js`. Preguntas de ayuda: `public/data/ayuda.js`.

En GitHub abre el archivo → lápiz (Edit) → cambia → **Commit changes**. En un minuto está publicado.

## Variables en Cloudflare (tu Worker → Settings → Variables and Secrets)

| Nombre | Valor | Tipo |
|---|---|---|
| `DISCORD_CLIENT_ID` | Client ID de tu app de Discord | Text |
| `DISCORD_CLIENT_SECRET` | Client Secret | Secret |
| `SESSION_SECRET` | 40+ letras y números al azar | Secret |
| `DISCORD_GUILD_ID` | ID de tu servidor de Discord (opcional) | Text |
| `ADMIN_BRIDGE_KEY` | La clave de `web_panel.key` en `auren_admin/config/auren_server.json` | **Secret** |
| `DISCORD_BOT_TOKEN` | Token de tu bot de Discord (el mismo bot de Auren sirve) | **Secret** |
| `WEB_ADMIN_IDS` | IDs de Discord de los admins de la web, separados por comas | Text |
| `WEB_ADMIN_ROLE_IDS` | (opcional) IDs de roles de Discord que también gestionan streamers | Text |
| `STREAMER_ROLE_ID` | (opcional) ya viene puesto `1553781042383552687` | Text |
| `TWITCH_CLIENT_ID` | Client ID de una app de dev.twitch.tv | **Secret** |
| `TWITCH_CLIENT_SECRET` | Client Secret de esa app | **Secret** |
| `KICK_CLIENT_ID` / `KICK_CLIENT_SECRET` | (opcional) app de kick.com para detectar directos de Kick | **Secret** |
| `GOAT_IDS` | (opcional) IDs de Discord de The GOATs; ya vienen puestos Gandy, RichDinero y MagicBullet | Text |
| `BUZON_WEBHOOK` | Webhook de Discord donde llegan las experiencias y las quejas (ya lo tienes) | **Secret** |
| `QUEJAS_WEBHOOK` | (opcional) otro webhook solo para las quejas anónimas | **Secret** |
| `ROULETTE_FROM` / `ROULETTE_TO` | (opcional) fechas de la ruleta, por defecto 10-01 a 11-02 | Text |
| `ROULETTE_OPEN` | (opcional) ponlo en `false` para cerrar la ruleta antes de tiempo | Text |

Para que `DISCORD_GUILD_ID` y el bot funcionen con Streamers, `DISCORD_GUILD_ID` tiene que estar puesto.

## Streamers (`/streamers`)
- La lista sale sola de las personas con el rol **1553781042383552687** en tu Discord, con su foto y su apodo.
- **Bot de Discord:** discord.com/developers → tu bot → *Bot* → activa **Server Members Intent**. El bot tiene
  que estar dentro de tu servidor. Copia su token como Secret `DISCORD_BOT_TOKEN` (nunca en GitHub ni en el chat).
- **Admins de la web:** Gandy, RichDinero y MagicBullet ya lo son siempre. Para añadir a más gente pon su ID de
  Discord en `WEB_ADMIN_IDS`. El botón **Gestionar streamers** sale siempre en /streamers (también en el pie de
  página → Cuenta): si no has iniciado sesión te lleva a hacerlo, y si eres admin abre el panel: ahí pegas el enlace de Twitch,
  Kick, YouTube y TikTok de cada uno y marcas quién va **Destacado**.
- **Twitch (directos y seguidores):** dev.twitch.tv/console → *Register Your Application* → nombre "Auren Web",
  OAuth Redirect `https://auren-rp.sf242295.workers.dev`, categoría *Website Integration*, cliente *Confidential*.
  Copia el Client ID y genera un Client Secret.
- **Kick (opcional):** kick.com → Settings → Developer → crea una app y copia Client ID y Secret.
  Los seguidores de Kick se leen de su página pública y a veces Kick lo bloquea; los directos sí van por la API oficial.
- Cada 10 minutos la web actualiza sola quién está en vivo, los seguidores y las horas en directo
  (el "más activo" es quien más horas hizo en los últimos 7 días, contando desde que pones los canales).

## Ambiente de Halloween
- Se enciende solo entre el 1 de octubre y el 2 de noviembre (cámbialo en `assets/site.js` → `halloween`).
- Luna llena, murciélagos, niebla, brasas, telarañas en las tarjetas, una araña que baja del techo, botones
  color calabaza, GandyDev con sombrero de bruja y una calabaza, y la radio con noticias de temporada.
- Cada persona lo puede quitar en el botón AA → “Ambiente de Halloween”.

## Recorrido de bienvenida y The GOATs
- La primera vez que alguien abre la portada, GandyDev le enseña la web en 8 pasos con una barra de progreso.
  Al terminar se abre **The GOATs** (portada, al final): Gandy destacado en dorado como Owner principal y mérito
  principal, RichDinero (segundo owner principal: ingresos, negocios y progreso) y MagicBullet (owner).
- Los tres salen iguales, cada uno con su color; Gandy con "Owner principal" y los otros con "Owner".
- Las fotos salen de Discord: con el bot (`DISCORD_BOT_TOKEN`) si está puesto; si no, cuando cada uno inicia sesión
  en la web se guarda su foto; y si tampoco, se usa un servicio público de perfiles de Discord. Además
  `assets/site.js` → `goats` trae sus fotos actuales de respaldo. La "Sobre mí" de Discord no se puede leer.
- Si alguien salta el recorrido, la sección sale bloqueada con su barra de progreso y un botón para abrirla.
  Se puede repetir el recorrido diciéndole "tutorial" a GandyDev.

## GandyDev
- El muñequito camina, salta encima de las tarjetas y botones, baila, da vueltas, mira el cursor y hasta se
  duerme si nadie le hace caso. Lo puedes arrastrar y lanzar (si lo tocas en el aire, lo atrapas).
- Al tocarlo te saluda con animación y abre el chat. Escribe sus respuestas letra a letra mientras mueve la boca,
  y tiene un botón de altavoz para que además las lea en voz alta.
- Entiende jerga ("klk", "qlq"…) y faltas de ortografía: si escribes "robbo" o "polisia" te dice
  "¿Quisiste decir «robo»?" y te responde sobre eso; si no encuentra nada, te propone palabras parecidas.
- Responde sobre las reglas y la web y te da accesos directos. Cita el código de la regla (por ejemplo `CON-04`) con enlace.
- Usa la IA gratis de Cloudflare (Workers AI, 10.000 "neuronas" al día en el plan Free; da para cientos de preguntas).
  Ya está activada en `wrangler.jsonc` (`"ai"`). Si un día se acaba el cupo, GandyDev sigue respondiendo con
  el buscador de reglas de la web.
- Solo usa las reglas de `data/normativas.js` y la ayuda de `data/ayuda.js`: si cambias las reglas, él lo sabe al momento.

## Panel del staff
- Está en `/staff` (también en el pie de página → Cuenta → Panel del staff).
- Entra quien tenga su Discord enlazado a un rango en el admin menu. Cada botón usa los
  permisos de su rango, igual que en el juego, y todo queda en los logs (GANDYLOGS) con su nombre.
- La conexión la abre el servidor de FiveM hacia la web: no hay que abrir puertos.
- Si el servidor está apagado, el panel lo dice y se conecta solo cuando vuelva.
- El canal en vivo usa Durable Objects de Cloudflare, incluidos gratis en el plan Free.
- **Monitor de pantallas:** en el menú del panel. Elige hasta 4 jugadores y ves sus pantallas cada 6 segundos;
  pulsa una para verla en grande. Hace falta el permiso de monitoreo o de spectate en tu rango. Queda en los logs.

## Familia Staff (`/familia`)
- Sale el equipo completo agrupado por rango (Owners, Administradores, Moderadores…) y de qué se encarga cada uno.
- La lista sale sola de Discord. Un owner o admin de la web pulsa **Gestionar Familia Staff** y:
  - en **Rangos** marca qué roles de Discord son del staff y les pone nombre y descripción;
  - en **Funciones** escribe de qué se encarga cada persona.
- **En tiempo real:** si le quitas o le pones un rango a alguien en Discord, aparece o desaparece de la web
  al momento (hace falta el bot en Cloudflare, o el servidor de FiveM encendido con el panel web conectado).

## Buzón (`/buzon`)
- **Mi experiencia:** cualquiera que esté en el Discord cuenta su experiencia (con estrellas). Sale en la página
  y llega al canal de Discord del webhook `BUZON_WEBHOOK`.
- **Queja anónima:** llega al mismo canal (o a `QUEJAS_WEBHOOK`) **sin decir quién la mandó**. La web no guarda
  quién fue; solo comprueba que estés en el Discord para evitar spam.
- Los owners y admins de la web pueden ocultar una experiencia desde la misma página.

## Ruleta de Halloween (`/ruleta`)
- Un giro por cuenta. El premio lo decide el servidor (no se puede trucar desde el navegador).
- Premios: 3 armas, 1 carro VIP, Pase Élite de Navidad, una cadena gratis, nada, y 3 items random
  (al que le toquen los 3 items elige entre venda, radio o agua).
- Cada ganador recibe un código; el staff lo ve en **Ver ganadores** y marca lo que ya entregó.
- Para cambiar los premios o los pesos, usa el Secret `ROULETTE_PRIZES` (JSON). Se abre sola en temporada.

## En tiempo real
- Streamers, Familia Staff, el buzón y la ruleta se actualizan solos en todas las pestañas abiertas,
  sin recargar, por un canal en vivo (`/api/live`).

## Modo blanco y sonidos
- Arriba hay un botón de sol/luna para pasar a **modo blanco** y otro de altavoz para **activar o quitar los sonidos**
  (en el móvil están dentro del botón AA). Se recuerdan en cada navegador.
- Los sonidos se generan en la propia web (sin archivos): botones, avisos, GandyDev (saludo, saltos, cuando lo
  lanzas o lo atrapas, cuando escribe) y el recorrido (cada paso y al abrir The GOATs).
- Si alguien inicia sesión con Discord y tiene el rol de Streamer, también aparece en Streamers aunque el bot no esté puesto.

## Lectura y accesibilidad
El botón **AA** de arriba abre las opciones de lectura: tamaño de letra, letra fácil de leer
(Atkinson Hyperlegible, pensada para baja visión), alto contraste y menos movimiento.
Se recuerdan en cada navegador. Si el sistema de la persona pide alto contraste, se activa solo.
