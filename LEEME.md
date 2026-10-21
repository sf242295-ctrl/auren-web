# Web de Auren RP (Cloudflare Worker, gratis)

```
auren-worker/
├── wrangler.jsonc            ← configuración de Cloudflare (no lo toques)
├── src/worker.js             ← login con Discord, whitelist y estadísticas (no lo toques)
└── public/                   ← LA WEB
    ├── index.html            ← portada (guía por pasos, números en vivo, directos…)
    ├── normativas.html       ← página de reglas con buscador
    ├── ayuda.html            ← preguntas frecuentes
    ├── panel.html            ← panel del jugador y solicitud de whitelist
    ├── privacidad.html, terminos.html
    ├── assets/site.js        ← CONFIGURACIÓN: Discord, cfx.re, streamers, frases…
    ├── assets/site.css       ← colores y estilos
    ├── assets/city.js        ← la ciudad animada del fondo
    ├── data/normativas.js    ← AQUÍ editas las reglas
    └── data/ayuda.js         ← AQUÍ editas las preguntas frecuentes
```

## Qué editar normalmente
- Links, código de FiveM, streamers y redes: bloque **CONFIGURACIÓN** al principio de `public/assets/site.js`.
- Reglas: `public/data/normativas.js`. Los códigos (GEN-01, ROL-03…) se ponen solos según el orden.
- Preguntas de ayuda: `public/data/ayuda.js`.

En GitHub abre el archivo → lápiz (Edit) → cambia → **Commit changes**. En un minuto está publicado.

## Variables en Cloudflare (tu Worker → Settings → Variables and Secrets)

| Nombre | Valor | Tipo |
|---|---|---|
| `DISCORD_CLIENT_ID` | Client ID de tu app de Discord | Text |
| `DISCORD_CLIENT_SECRET` | Client Secret | Secret |
| `SESSION_SECRET` | 40+ letras y números al azar | Secret |
| `DISCORD_GUILD_ID` | ID de tu servidor de Discord | Text |
| `VERIFIED_ROLE_ID` | ID del rol que das a los de whitelist aprobada (opcional) | Text |
| `DISCORD_WEBHOOK_WHITELIST` | Webhook del canal del staff donde llegan las solicitudes | Secret |

### Crear el webhook de whitelist
1. En tu Discord crea un canal privado para el staff, por ejemplo `#solicitudes-whitelist`.
2. Ajustes del canal → **Integraciones** → **Webhooks** → **Nuevo webhook** → **Copiar URL del webhook**.
3. Pégala en Cloudflare como `DISCORD_WEBHOOK_WHITELIST` (tipo Secret). No la pongas nunca en GitHub.

### Rol de whitelist (opcional)
Si das un rol a quien aprueban (por ejemplo "Ciudadano"), pon su ID en `VERIFIED_ROLE_ID`.
La web dirá "Whitelist aprobada" a quien lo tenga y le quitará el formulario.

## Cómo funciona
- **Iniciar sesión** lleva a Discord y vuelve a la misma página donde estabas.
- **Panel**: el jugador ve su cuenta y manda la whitelist. Llega al canal del staff con su usuario.
  Solo puede mandar una cada 24 horas.
- **Números en vivo**: jugadores conectados (FiveM) y miembros del Discord, actualizados cada minuto.
- **AA** arriba: tamaño de letra normal, grande o enorme. Se recuerda en cada navegador.
- No se guarda nada en bases de datos. La sesión dura 7 días en una cookie firmada.
