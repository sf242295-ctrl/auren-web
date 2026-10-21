# Web de Auren RP (Cloudflare Worker, gratis)

```
auren-worker/
├── wrangler.jsonc     ← configuración de Cloudflare (no lo toques)
├── public/
│   └── index.html     ← LA PÁGINA (aquí cambias textos, links, streamers…)
└── src/
    └── worker.js      ← login con Discord (no lo toques)
```

Lo que cambias normalmente está en `public/index.html`, en el bloque **CONFIGURACIÓN** encima del `<script>`:
Discord (discord.gg/aurenrp), compras VIP (también el Discord), código cfx.re (lee9965), cupos,
frases del cartel y streamers.

## Actualizar la web
En GitHub abre `public/index.html` → lápiz (Edit) → cambia → **Commit changes**.
Cloudflare la vuelve a publicar sola en menos de un minuto.

## Variables de Discord (Cloudflare → tu Worker → Settings → Variables and Secrets)

| Nombre | Valor | Tipo |
|---|---|---|
| `DISCORD_CLIENT_ID` | Client ID de tu app de Discord | Text |
| `DISCORD_CLIENT_SECRET` | Client Secret | Secret |
| `SESSION_SECRET` | 40+ letras y números al azar | Secret |
| `DISCORD_GUILD_ID` | ID de tu servidor de Discord (opcional) | Text |
| `VERIFIED_ROLE_ID` | ID del rol de verificado (opcional) | Text |

## Redirect en Discord
Discord Developer Portal → tu app → OAuth2 → Redirects:
`https://<tu-dirección>.workers.dev/api/auth/callback`
(la misma dirección que Cloudflare te muestra para el Worker, terminada en `/api/auth/callback`).

## Cómo funciona el login
"Iniciar sesión" lleva a Discord, el jugador autoriza y vuelve con su foto y nombre arriba.
Si pusiste `DISCORD_GUILD_ID`, la web dice si está en tu Discord y si está verificado.
La sesión dura 7 días en una cookie firmada. No se guarda nada en bases de datos.
