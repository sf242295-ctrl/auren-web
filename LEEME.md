# Web de Auren RP — aurenroleplay.com

Carpeta del proyecto:

```
auren-web/
├── index.html                      ← la página
└── functions/api/auth/[[path]].js  ← login con Discord (no lo toques)
```

Todo lo que se cambia normalmente está arriba del `<script>` en `index.html`, en el bloque **CONFIGURACIÓN**:
invitación de Discord (discord.gg/aurenrp), enlace de compras VIP (también el Discord), código cfx.re
(lee9965), cupos, frases del cartel y streamers.

El fondo es una ciudad animada: tráfico, taxis, persecuciones, ambulancias, tren elevado de la línea 7,
helicóptero con reflector, aviones, apagones, oficinas que se encienden y lluvia con relámpagos.
Abajo a la izquierda, la "Radio de la ciudad" anuncia cada evento y tiene un botón para pausar.

---

## 1. Crear la app de Discord (para "Iniciar sesión")

1. Entra en https://discord.com/developers/applications → **New Application** → nombre: `Auren RP`.
2. Menú **OAuth2**:
   - Copia el **Client ID**.
   - Pulsa **Reset Secret** y copia el **Client Secret** (guárdalo, no lo compartas).
   - En **Redirects** añade estas tres:
     - `https://aurenroleplay.com/api/auth/callback`
     - `https://www.aurenroleplay.com/api/auth/callback`
     - `https://auren-rp.pages.dev/api/auth/callback` (cámbialo si tu proyecto se llama distinto)
3. (Opcional) ID de tu servidor de Discord: en Discord activa *Ajustes → Avanzado → Modo desarrollador*,
   clic derecho en el servidor → **Copiar ID del servidor**. Si además quieres que "verificado" dependa de
   un rol, clic derecho en el rol → **Copiar ID del rol**.

## 2. Subir la web a Cloudflare Pages (gratis)

Cloudflare Pages es gratis, sin límite de visitas ni de ancho de banda, y corre en su red mundial.

> Importante: el método de **arrastrar y soltar** del panel de Cloudflare NO sube la carpeta `functions`,
> así que el login no funcionaría. Usa GitHub (recomendado) o Wrangler.

**Opción A — con GitHub (sin instalar nada):**
1. Crea cuenta en https://github.com → **New repository** → nombre `auren-web` → *Create*.
2. En el repo pulsa **uploading an existing file** y arrastra el CONTENIDO de la carpeta `auren-web`
   (index.html y la carpeta functions) → **Commit changes**.
3. Crea cuenta en https://dash.cloudflare.com → **Workers & Pages** → **Create** → pestaña **Pages**
   → **Connect to Git** → elige `auren-web`.
4. Framework preset: **None**. Build command: vacío. Output directory: `/`. → **Save and Deploy**.
5. Cada vez que cambies un archivo en GitHub, la web se actualiza sola en unos segundos.

**Opción B — con Wrangler (si tienes Node.js):**
```
npx wrangler login
npx wrangler pages deploy . --project-name=auren-rp
```
(ejecútalo dentro de la carpeta `auren-web`)

## 3. Poner las claves de Discord en Cloudflare

En tu proyecto de Pages → **Settings → Variables and Secrets** → añade (en *Production*):

| Nombre | Valor | Tipo |
|---|---|---|
| `DISCORD_CLIENT_ID` | el Client ID | Text |
| `DISCORD_CLIENT_SECRET` | el Client Secret | Secret |
| `SESSION_SECRET` | una frase larga al azar (40+ caracteres, de un generador de contraseñas) | Secret |
| `DISCORD_GUILD_ID` | ID de tu servidor de Discord (opcional) | Text |
| `VERIFIED_ROLE_ID` | ID del rol de verificado (opcional) | Text |

Después ve a **Deployments** y pulsa **Retry deployment** para que use las claves.

## 4. Dirección gratis o dominio propio

Gratis para siempre: tu web queda en `https://auren-rp.pages.dev` (o el nombre que pongas al proyecto).
No hay que pagar nada.

Si algún día quieres `aurenroleplay.com`, ese dominio sí cuesta (se paga una vez al año):

1. Compra el dominio. Lo más fácil: en Cloudflare → **Domain Registration → Register Domains**,
   busca `aurenroleplay.com` (Cloudflare lo vende a precio de costo, sin recargo; se paga una vez al año).
   Si ya lo compraste en otro sitio (GoDaddy, Namecheap…), en Cloudflare pulsa **Add a domain** y cambia
   los nameservers donde lo compraste por los que te da Cloudflare.
2. En tu proyecto de Pages → **Custom domains** → **Set up a custom domain** → `aurenroleplay.com`.
   Repite con `www.aurenroleplay.com`.
3. En unos minutos tendrás https://aurenroleplay.com con candado (SSL gratis).

## Cómo funciona el login

- "Iniciar sesión" lleva a Discord, el jugador autoriza su cuenta y vuelve a la web ya conectado
  (sale su foto y nombre arriba a la derecha).
- Si pusiste `DISCORD_GUILD_ID`, la web le dice si está en tu Discord y si está verificado.
- La sesión dura 7 días y se guarda en una cookie firmada; la web no guarda datos en ninguna base de datos.
- Permisos que se piden a Discord: `identify` (nombre y foto) y, si pusiste el servidor, `guilds.members.read`.
