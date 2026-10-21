/*
  Auren RP — Worker de Cloudflare
  - Sirve la web (carpeta public)
  - Login con Discord en /api/auth/login, /callback, /me, /logout

  Variables (Cloudflare > tu Worker > Settings > Variables and Secrets):
    DISCORD_CLIENT_ID      (Text)
    DISCORD_CLIENT_SECRET  (Secret)
    SESSION_SECRET         (Secret: 40+ letras y números al azar)
    DISCORD_GUILD_ID       (Text, opcional: ID de tu servidor de Discord)
    VERIFIED_ROLE_ID       (Text, opcional: ID del rol de verificado)

  Redirect en Discord Developer Portal > OAuth2 > Redirects:
    https://TU-WORKER.workers.dev/api/auth/callback
*/

const SESSION_COOKIE = "auren_session";
const STATE_COOKIE = "auren_state";
const SESSION_DAYS = 7;
const enc = new TextEncoder();

/* ---------- utilidades ---------- */
const toB64url = (bytes) =>
  btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const fromB64url = (s) => {
  s = s.replace(/-/g, "+").replace(/_/g, "/");
  while (s.length % 4) s += "=";
  return Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
};
const hmacKey = (secret) =>
  crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);

async function signSession(secret, data) {
  const payload = toB64url(enc.encode(JSON.stringify(data)));
  const sig = await crypto.subtle.sign("HMAC", await hmacKey(secret), enc.encode(payload));
  return `${payload}.${toB64url(sig)}`;
}

async function readSession(secret, token) {
  if (!token || !token.includes(".")) return null;
  const [payload, sig] = token.split(".");
  try {
    const ok = await crypto.subtle.verify("HMAC", await hmacKey(secret), fromB64url(sig), enc.encode(payload));
    if (!ok) return null;
    const data = JSON.parse(new TextDecoder().decode(fromB64url(payload)));
    if (!data.exp || data.exp < Date.now()) return null;
    return data;
  } catch {
    return null;
  }
}

function getCookie(request, name) {
  const header = request.headers.get("Cookie") || "";
  for (const part of header.split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k === name) return decodeURIComponent(v.join("="));
  }
  return null;
}

const cookie = (name, value, maxAge) =>
  `${name}=${encodeURIComponent(value)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;

const redirect = (to, cookies = []) => {
  const headers = new Headers({ Location: to });
  cookies.forEach((c) => headers.append("Set-Cookie", c));
  return new Response(null, { status: 302, headers });
};

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });

/* ---------- rutas ---------- */
async function handleAuth(request, env, action) {
  const url = new URL(request.url);
  const redirectUri = `${url.origin}/api/auth/callback`;

  if (!env.DISCORD_CLIENT_ID || !env.DISCORD_CLIENT_SECRET || !env.SESSION_SECRET) {
    return json({ error: "Faltan variables de entorno de Discord en Cloudflare." }, 500);
  }

  // 1) Mandar a Discord
  if (action === "login") {
    const state = toB64url(crypto.getRandomValues(new Uint8Array(24)));
    const scopes = ["identify"];
    if (env.DISCORD_GUILD_ID) scopes.push("guilds.members.read");
    const auth = new URL("https://discord.com/oauth2/authorize");
    auth.search = new URLSearchParams({
      client_id: env.DISCORD_CLIENT_ID,
      response_type: "code",
      redirect_uri: redirectUri,
      scope: scopes.join(" "),
      state,
      prompt: "none",
    });
    return redirect(auth.toString(), [cookie(STATE_COOKIE, state, 600)]);
  }

  // 2) Discord vuelve con un código
  if (action === "callback") {
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const clearState = cookie(STATE_COOKIE, "", 0);
    if (!code || !state || state !== getCookie(request, STATE_COOKIE)) {
      return redirect("/?login=error", [clearState]);
    }

    const tokenRes = await fetch("https://discord.com/api/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: env.DISCORD_CLIENT_ID,
        client_secret: env.DISCORD_CLIENT_SECRET,
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
      }),
    });
    if (!tokenRes.ok) return redirect("/?login=error", [clearState]);
    const { access_token } = await tokenRes.json();
    const authHeader = { Authorization: `Bearer ${access_token}` };

    const userRes = await fetch("https://discord.com/api/users/@me", { headers: authHeader });
    if (!userRes.ok) return redirect("/?login=error", [clearState]);
    const user = await userRes.json();

    // ¿Está en el Discord de Auren?
    let member = null, verified = false;
    if (env.DISCORD_GUILD_ID) {
      const mRes = await fetch(`https://discord.com/api/users/@me/guilds/${env.DISCORD_GUILD_ID}/member`, { headers: authHeader });
      if (mRes.ok) {
        const m = await mRes.json();
        member = true;
        verified = env.VERIFIED_ROLE_ID ? (m.roles || []).includes(env.VERIFIED_ROLE_ID) : true;
      } else {
        member = false;
      }
    }

    const session = {
      id: user.id,
      username: user.username,
      name: user.global_name || user.username,
      avatar: user.avatar,
      member,
      verified,
      exp: Date.now() + SESSION_DAYS * 864e5,
    };
    const token = await signSession(env.SESSION_SECRET, session);
    return redirect("/?login=ok", [clearState, cookie(SESSION_COOKIE, token, SESSION_DAYS * 86400)]);
  }

  // 3) ¿Quién está conectado?
  if (action === "me") {
    const s = await readSession(env.SESSION_SECRET, getCookie(request, SESSION_COOKIE));
    if (!s) return json({ user: null });
    const { exp, ...user } = s;
    return json({ user });
  }

  // 4) Cerrar sesión
  if (action === "logout") {
    return redirect("/", [cookie(SESSION_COOKIE, "", 0)]);
  }

  return json({ error: "Ruta no encontrada" }, 404);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const m = url.pathname.match(/^\/api\/auth\/([a-z]+)\/?$/);
    if (m) {
      if (request.method !== "GET") return json({ error: "Método no permitido" }, 405);
      return handleAuth(request, env, m[1]);
    }
    if (url.pathname.startsWith("/api/")) return json({ error: "Ruta no encontrada" }, 404);
    return env.ASSETS.fetch(request);
  },
};
