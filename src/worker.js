/*
  Auren RP — Worker de Cloudflare
  - Sirve la web (carpeta public)
  - Login con Discord:  /api/auth/login, /callback, /me, /logout
  - Whitelist:          POST /api/whitelist  (manda la solicitud a un canal de Discord)
  - Estadísticas:       /api/stats           (jugadores de FiveM y miembros del Discord)

  Variables (Cloudflare > tu Worker > Settings > Variables and Secrets):
    DISCORD_CLIENT_ID          (Text)
    DISCORD_CLIENT_SECRET      (Secret)
    SESSION_SECRET             (Secret: 40+ letras y números al azar)
    DISCORD_GUILD_ID           (Text, opcional: ID de tu servidor de Discord)
    VERIFIED_ROLE_ID           (Text, opcional: ID del rol que tienen los de whitelist aprobada)
    DISCORD_WEBHOOK_WHITELIST  (Secret: webhook del canal del staff donde llegan las solicitudes)
    CFX_CODE                   (Text, opcional: por defecto lee9965)
    DISCORD_INVITE             (Text, opcional: por defecto aurenrp)
*/

const SESSION_COOKIE = "auren_session";
const STATE_COOKIE = "auren_state";
const WL_COOKIE = "auren_wl";
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

const cookie = (name, value, maxAge, httpOnly = true) =>
  `${name}=${encodeURIComponent(value)}; Path=/; ${httpOnly ? "HttpOnly; " : ""}Secure; SameSite=Lax; Max-Age=${maxAge}`;

const redirect = (to, cookies = []) => {
  const headers = new Headers({ Location: to });
  cookies.forEach((c) => headers.append("Set-Cookie", c));
  return new Response(null, { status: 302, headers });
};

const json = (data, status = 200, extra = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...extra },
  });

// Solo rutas internas de la web para volver tras el login
const safeNext = (n) => (typeof n === "string" && /^\/(?!\/)[\w\-\/.#]*$/.test(n) ? n : "/");
const withParam = (path, kv) => {
  const [p, h = ""] = path.split("#");
  return `${p}${p.includes("?") ? "&" : "?"}${kv}${h ? "#" + h : ""}`;
};

const authConfigured = (env) => env.DISCORD_CLIENT_ID && env.DISCORD_CLIENT_SECRET && env.SESSION_SECRET;
const getUser = (request, env) => readSession(env.SESSION_SECRET, getCookie(request, SESSION_COOKIE));

/* ---------- login con Discord ---------- */
async function handleAuth(request, env, action) {
  const url = new URL(request.url);
  const redirectUri = `${url.origin}/api/auth/callback`;

  if (!authConfigured(env)) {
    return json({ error: "faltan las claves de Discord (Variables and Secrets) en Cloudflare." }, 500);
  }

  if (action === "login") {
    const state = toB64url(crypto.getRandomValues(new Uint8Array(24)));
    const next = safeNext(url.searchParams.get("next"));
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
    return redirect(auth.toString(), [cookie(STATE_COOKIE, `${state}|${next}`, 600)]);
  }

  if (action === "callback") {
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const [savedState, savedNext] = (getCookie(request, STATE_COOKIE) || "").split("|");
    const next = safeNext(savedNext);
    const clearState = cookie(STATE_COOKIE, "", 0);
    if (!code || !state || state !== savedState) return redirect(withParam(next, "login=error"), [clearState]);

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
    if (!tokenRes.ok) return redirect(withParam(next, "login=error"), [clearState]);
    const { access_token } = await tokenRes.json();
    const authHeader = { Authorization: `Bearer ${access_token}` };

    const userRes = await fetch("https://discord.com/api/users/@me", { headers: authHeader });
    if (!userRes.ok) return redirect(withParam(next, "login=error"), [clearState]);
    const user = await userRes.json();

    // ¿Está en el Discord? ¿Tiene el rol de whitelist?
    let member = null, verified = null;
    if (env.DISCORD_GUILD_ID) {
      const mRes = await fetch(`https://discord.com/api/users/@me/guilds/${env.DISCORD_GUILD_ID}/member`, { headers: authHeader });
      if (mRes.ok) {
        const m = await mRes.json();
        member = true;
        if (env.VERIFIED_ROLE_ID) verified = (m.roles || []).includes(env.VERIFIED_ROLE_ID);
      } else {
        member = false;
        if (env.VERIFIED_ROLE_ID) verified = false;
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
    return redirect(withParam(next, "login=ok"), [clearState, cookie(SESSION_COOKIE, token, SESSION_DAYS * 86400)]);
  }

  if (action === "me") {
    const s = await getUser(request, env);
    if (!s) return json({ user: null });
    const { exp, ...user } = s;
    return json({ user });
  }

  if (action === "logout") {
    return redirect("/", [cookie(SESSION_COOKIE, "", 0)]);
  }

  return json({ error: "Ruta no encontrada" }, 404);
}

/* ---------- whitelist ---------- */
const LIMITS = { personaje: [3, 60], edad: [1, 3], historia: [200, 1500], mg: [30, 500], pg: [30, 500], situacion: [30, 500], experiencia: [1, 40], conocio: [0, 100] };
const LABELS = { personaje: "Personaje", edad: "Edad", experiencia: "Experiencia en RP", conocio: "Cómo nos conoció", historia: "Historia del personaje", mg: "¿Qué es el metagaming?", pg: "¿Qué es el powergaming?", situacion: "Le apuntan con un arma y le piden la cartera" };
// Evita menciones (@everyone, @here) y formato raro en el canal del staff
const clean = (s) => String(s || "").replace(/@/g, "@​").replace(/\r/g, "").trim();

async function handleWhitelist(request, env) {
  const url = new URL(request.url);
  const origin = request.headers.get("Origin");
  if (origin && origin !== url.origin) return json({ error: "Origen no permitido." }, 403);
  if (!authConfigured(env)) return json({ error: "El login con Discord no está configurado." }, 500);
  if (!env.DISCORD_WEBHOOK_WHITELIST) return json({ error: "El staff todavía no ha activado las solicitudes de whitelist." }, 503);

  const user = await getUser(request, env);
  if (!user) return json({ error: "Tu sesión caducó. Vuelve a iniciar sesión con Discord." }, 401);
  if (user.member === false) return json({ error: "Primero únete al Discord de Auren." }, 403);
  if (user.verified === true) return json({ error: "Tu whitelist ya está aprobada." }, 409);
  if (getCookie(request, WL_COOKIE)) return json({ error: "Ya enviaste una solicitud. Podrás mandar otra pasadas 24 horas." }, 429);

  let body;
  try { body = await request.json(); } catch { return json({ error: "Solicitud no válida." }, 400); }
  const data = {};
  for (const [k, [min, max]] of Object.entries(LIMITS)) {
    const v = clean(body[k]);
    if (v.length < min) return json({ error: `Falta completar: ${LABELS[k]}.` }, 400);
    data[k] = v.slice(0, max);
  }
  if (!/^\d{1,3}$/.test(data.edad)) return json({ error: "La edad debe ser un número." }, 400);

  const avatar = user.avatar ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=128` : undefined;
  const payload = {
    username: "Auren RP · Whitelist",
    allowed_mentions: { parse: [] },
    content: `Nueva solicitud de whitelist de <@${user.id}>`,
    embeds: [{
      title: data.personaje,
      color: 0x3d7bf2,
      author: { name: `${clean(user.name)} (@${clean(user.username)})`, icon_url: avatar },
      fields: [
        { name: LABELS.edad, value: data.edad, inline: true },
        { name: LABELS.experiencia, value: data.experiencia, inline: true },
        { name: LABELS.conocio, value: data.conocio || "—", inline: true },
        { name: LABELS.mg, value: data.mg.slice(0, 1024) },
        { name: LABELS.pg, value: data.pg.slice(0, 1024) },
        { name: LABELS.situacion, value: data.situacion.slice(0, 1024) },
      ],
      description: `**${LABELS.historia}**\n${data.historia}`,
      footer: { text: `Discord ID: ${user.id}` },
      timestamp: new Date().toISOString(),
    }],
  };

  const res = await fetch(env.DISCORD_WEBHOOK_WHITELIST, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) return json({ error: "Discord no aceptó la solicitud. Inténtalo en unos minutos." }, 502);

  return json({ ok: true }, 200, { "Set-Cookie": cookie(WL_COOKIE, String(Date.now()), 86400, false) });
}

/* ---------- estadísticas (con caché de 60 s) ---------- */
async function handleStats(request, env, ctx) {
  const cache = caches.default;
  const key = new Request(new URL("/api/stats", request.url).toString());
  const hit = await cache.match(key);
  if (hit) return hit;

  const code = env.CFX_CODE || "lee9965";
  const invite = env.DISCORD_INVITE || "aurenrp";
  const out = { players: null, maxPlayers: null, discordMembers: null, discordOnline: null };

  const [fivem, discord] = await Promise.allSettled([
    fetch(`https://servers-frontend.fivem.net/api/servers/single/${code}`, {
      headers: { "User-Agent": "Mozilla/5.0 (AurenRP website)", Accept: "application/json" },
    }).then((r) => (r.ok ? r.json() : null)),
    fetch(`https://discord.com/api/v10/invites/${invite}?with_counts=true`).then((r) => (r.ok ? r.json() : null)),
  ]);
  if (fivem.status === "fulfilled" && fivem.value && fivem.value.Data) {
    const d = fivem.value.Data;
    out.players = d.clients ?? (d.players ? d.players.length : null);
    out.maxPlayers = d.sv_maxclients ?? d.svMaxclients ?? null;
  }
  if (discord.status === "fulfilled" && discord.value) {
    out.discordMembers = discord.value.approximate_member_count ?? null;
    out.discordOnline = discord.value.approximate_presence_count ?? null;
  }

  const res = new Response(JSON.stringify(out), {
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "public, max-age=60" },
  });
  ctx.waitUntil(cache.put(key, res.clone()));
  return res;
}

/* ---------- enrutado ---------- */
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const m = url.pathname.match(/^\/api\/auth\/([a-z]+)\/?$/);
    if (m) {
      if (request.method !== "GET") return json({ error: "Método no permitido" }, 405);
      return handleAuth(request, env, m[1]);
    }
    if (url.pathname === "/api/whitelist") {
      if (request.method !== "POST") return json({ error: "Método no permitido" }, 405);
      return handleWhitelist(request, env);
    }
    if (url.pathname === "/api/stats") return handleStats(request, env, ctx);
    if (url.pathname.startsWith("/api/")) return json({ error: "Ruta no encontrada" }, 404);
    return env.ASSETS.fetch(request);
  },
};
