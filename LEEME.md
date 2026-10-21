# Web de Auren RP (Cloudflare Worker, gratis)

```
auren-worker/
├── wrangler.jsonc            ← configuración de Cloudflare (no lo toques)
├── src/worker.js             ← login con Discord, estadísticas y canal en vivo del staff (no lo toques)
└── public/                   ← LA WEB
    ├── index.html            ← portada (guía, números en vivo, directos…)
    ├── normativas.html       ← reglas con buscador
    ├── ayuda.html            ← preguntas frecuentes
    ├── panel.html            ← Mi cuenta
    ├── staff.html            ← PANEL DEL STAFF (en vivo con el admin menu)
    ├── privacidad.html, terminos.html
    ├── assets/site.js        ← CONFIGURACIÓN: Discord, cfx.re, streamers, frases…
    ├── assets/site.css       ← colores, letra y modos de lectura
    ├── assets/city.js        ← la ciudad animada del fondo
    ├── assets/staff.js       ← lógica del panel del staff
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

## Panel del staff
- Está en `/staff` (también en el pie de página → Cuenta → Panel del staff).
- Entra quien tenga su Discord enlazado a un rango en el admin menu. Cada botón usa los
  permisos de su rango, igual que en el juego, y todo queda en los logs (GANDYLOGS) con su nombre.
- La conexión la abre el servidor de FiveM hacia la web: no hay que abrir puertos.
- Si el servidor está apagado, el panel lo dice y se conecta solo cuando vuelva.
- El canal en vivo usa Durable Objects de Cloudflare, incluidos gratis en el plan Free.

## Lectura y accesibilidad
El botón **AA** de arriba abre las opciones de lectura: tamaño de letra, letra fácil de leer
(Atkinson Hyperlegible, pensada para baja visión), alto contraste y menos movimiento.
Se recuerdan en cada navegador. Si el sistema de la persona pide alto contraste, se activa solo.
