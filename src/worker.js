/*
  Auren RP — Worker de Cloudflare
  - Sirve la web (carpeta public)
  - Login con Discord:   /api/auth/login, /callback, /me, /logout
  - Estadísticas:        /api/stats  (jugadores de FiveM y miembros del Discord)
  - Panel del staff:     /api/admin/ws      (navegador del staff, en vivo)
                         /api/admin/bridge  (conexión que abre el servidor de FiveM)
                         /api/admin/status
  - GandyDev (IA):       POST /api/gandy
  - The GOATs:           /api/goats
  - Streamers:           /api/streamers, /api/streamers/me, POST /api/streamers/channels

  Variables (Cloudflare > tu Worker > Settings > Variables and Secrets):
    DISCORD_CLIENT_ID      (Text)
    DISCORD_CLIENT_SECRET  (Secret)
    SESSION_SECRET         (Secret: 40+ letras y números al azar)
    DISCORD_GUILD_ID       (Text, opcional: ID de tu servidor de Discord)
    ADMIN_BRIDGE_KEY       (Secret: la misma clave que web_panel.key en auren_admin)
    DISCORD_BOT_TOKEN      (Secret: token del bot de Discord, para leer el rol de Streamers)
    STREAMER_ROLE_ID       (Text, opcional: por defecto 1553781042383552687)
    WEB_ADMIN_IDS          (Text: IDs de Discord de los admins de la web, separados por comas)
    WEB_ADMIN_ROLE_IDS     (Text, opcional: IDs de roles de Discord que también son admins de la web)
    TWITCH_CLIENT_ID / TWITCH_CLIENT_SECRET  (Secret, opcional: directos y seguidores de Twitch)
    KICK_CLIENT_ID / KICK_CLIENT_SECRET      (Secret, opcional: directos de Kick)
    GANDY_MODEL            (Text, opcional: modelo de IA de GandyDev)
    GOAT_IDS               (Text, opcional: IDs de Discord de The GOATs, separados por comas)
    CFX_CODE               (Text, opcional: por defecto lee9965)
    DISCORD_INVITE         (Text, opcional: por defecto aurenrp)
*/
import { DurableObject } from "cloudflare:workers";

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

const json = (data, status = 200, extra = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...extra },
  });

// Comparación en tiempo constante (para la clave del puente)
function safeEqual(a, b) {
  a = String(a || ""); b = String(b || "");
  if (!a || !b) return false;
  const x = enc.encode(a), y = enc.encode(b);
  let diff = x.length ^ y.length;
  for (let i = 0; i < Math.max(x.length, y.length); i++) diff |= (x[i] || 0) ^ (y[i] || 0);
  return diff === 0;
}

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

    let member = null, mData = null;
    if (env.DISCORD_GUILD_ID) {
      const mRes = await fetch(`https://discord.com/api/users/@me/guilds/${env.DISCORD_GUILD_ID}/member`, { headers: authHeader });
      member = mRes.ok;
      if (mRes.ok) mData = await mRes.json().catch(() => null);
    }
    // Guardamos su perfil público (foto, banner, apodo) para The GOATs y Streamers,
    // así salen aunque todavía no esté puesto el bot de Discord.
    try {
      if (env.SITE_STORE) {
        const role = env.STREAMER_ROLE_ID || DEFAULT_STREAMER_ROLE;
        const store = env.SITE_STORE.get(env.SITE_STORE.idFromName("auren"));
        await store.fetch("https://store/profile", { method: "POST", body: JSON.stringify({
          id: user.id, username: user.username, globalName: user.global_name || null,
          nick: mData?.nick || null, avatar: user.avatar || null, guildAvatar: mData?.avatar || null,
          banner: user.banner || null, accent: user.accent_color ?? null,
          deco: user.avatar_decoration_data?.asset || mData?.avatar_decoration_data?.asset || null,
          joinedAt: mData?.joined_at || null, streamer: !!(mData?.roles || []).includes(role), at: Date.now(),
        }) });
      }
    } catch {}

    const session = {
      id: user.id,
      username: user.username,
      name: user.global_name || user.username,
      avatar: user.avatar,
      member,
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

/* ---------- panel del staff ---------- */
async function handleAdmin(request, env, sub) {
  const url = new URL(request.url);
  const hub = env.ADMIN_HUB.get(env.ADMIN_HUB.idFromName("auren"));
  const isWs = (request.headers.get("Upgrade") || "").toLowerCase() === "websocket";

  if (sub === "bridge") {
    if (!isWs) return json({ error: "Se esperaba WebSocket." }, 426);
    if (!env.ADMIN_BRIDGE_KEY) return json({ error: "Falta ADMIN_BRIDGE_KEY en Cloudflare." }, 503);
    return hub.fetch(new Request("https://hub/bridge", { headers: { Upgrade: "websocket" } }));
  }

  if (!authConfigured(env)) return json({ error: "El login con Discord no está configurado." }, 500);
  const user = await getUser(request, env);
  if (!user) return json({ error: "Inicia sesión con Discord." }, 401);

  if (sub === "status") {
    return hub.fetch(new Request("https://hub/status"));
  }

  if (sub === "ws") {
    if (!isWs) return json({ error: "Se esperaba WebSocket." }, 426);
    const origin = request.headers.get("Origin");
    if (origin && origin !== url.origin) return json({ error: "Origen no permitido." }, 403);
    return hub.fetch(new Request("https://hub/viewer", {
      headers: {
        Upgrade: "websocket",
        "X-Discord-Id": user.id,
        "X-Name": encodeURIComponent(user.name || user.username || ""),
      },
    }));
  }

  return json({ error: "Ruta no encontrada" }, 404);
}

/* ---------- canal en vivo: servidor de FiveM ⇄ navegadores del staff ---------- */
export class AdminHub extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.rate = new Map();
    // Responde al ping sin despertar al objeto (no gasta peticiones)
    this.ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair('{"type":"ping"}', '{"type":"pong"}'));
  }

  bridge(exclude) {
    return this.ctx.getWebSockets("bridge").find((ws) => ws !== exclude && ws.deserializeAttachment()?.authed) || null;
  }
  staffViewers(exclude) {
    return this.ctx.getWebSockets("viewer").filter((ws) => ws !== exclude && ws.deserializeAttachment()?.staff);
  }
  safeSend(ws, obj) {
    try { ws.send(typeof obj === "string" ? obj : JSON.stringify(obj)); } catch {}
  }
  tellViewerCount(exclude) {
    const b = this.bridge();
    if (b) this.safeSend(b, { type: "viewers", n: this.staffViewers(exclude).length });
  }
  askWhoami(viewer) {
    const a = viewer.deserializeAttachment();
    const b = this.bridge();
    if (!b) { this.safeSend(viewer, { type: "bridge", online: false }); return; }
    this.safeSend(b, { type: "req", reqId: `${a.uid}|__whoami`, discordId: a.discordId, method: "auren:whoami" });
  }

  async fetch(request) {
    const url = new URL(request.url);

    if (url.pathname === "/status") {
      return json({ bridge: !!this.bridge(), viewers: this.staffViewers().length });
    }

    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);

    if (url.pathname === "/bridge") {
      this.ctx.acceptWebSocket(server, ["bridge"]);
      server.serializeAttachment({ role: "bridge", authed: false, at: Date.now() });
      await this.ctx.storage.setAlarm(Date.now() + 10000);
      return new Response(null, { status: 101, webSocket: client });
    }

    if (url.pathname === "/viewer") {
      const discordId = request.headers.get("X-Discord-Id") || "";
      const uid = crypto.randomUUID().replace(/-/g, "").slice(0, 12);
      this.ctx.acceptWebSocket(server, ["viewer", `v:${uid}`, `d:${discordId}`]);
      server.serializeAttachment({ role: "viewer", uid, discordId, name: decodeURIComponent(request.headers.get("X-Name") || ""), staff: null });
      const b = this.bridge();
      this.safeSend(server, { type: "bridge", online: !!b });
      if (b) this.askWhoami(server);
      return new Response(null, { status: 101, webSocket: client });
    }

    return new Response("No encontrado", { status: 404 });
  }

  async webSocketMessage(ws, message) {
    const a = ws.deserializeAttachment() || {};
    let m;
    try { m = JSON.parse(typeof message === "string" ? message : new TextDecoder().decode(message)); } catch { return; }

    /* ---- mensajes del servidor de FiveM ---- */
    if (a.role === "bridge") {
      if (!a.authed) {
        if (m.type === "hello" && safeEqual(m.key, this.env.ADMIN_BRIDGE_KEY)) {
          for (const old of this.ctx.getWebSockets("bridge")) if (old !== ws) { try { old.close(4409, "otra conexión"); } catch {} }
          ws.serializeAttachment({ ...a, authed: true, server: String(m.server || "FiveM").slice(0, 60) });
          this.safeSend(ws, { type: "hello_ok" });
          for (const v of this.ctx.getWebSockets("viewer")) { this.safeSend(v, { type: "bridge", online: true }); this.askWhoami(v); }
          this.tellViewerCount();
        } else {
          try { ws.close(4401, "clave incorrecta"); } catch {}
        }
        return;
      }

      if (m.type === "res" && typeof m.reqId === "string") {
        const [uid, id] = m.reqId.split("|");
        const v = this.ctx.getWebSockets(`v:${uid}`)[0];
        if (!v) return;
        const va = v.deserializeAttachment() || {};
        if (m.code === "not_staff") {
          this.safeSend(v, { type: "denied", error: m.error });
          v.serializeAttachment({ ...va, staff: null });
          try { v.close(4403, "no es staff"); } catch {}
          this.tellViewerCount();
          return;
        }
        if (id === "__whoami") {
          if (m.ok) {
            v.serializeAttachment({ ...va, staff: { perms: m.result?.perms || {}, nickname: m.result?.nickname } });
            this.safeSend(v, { type: "hello", me: m.result });
            this.tellViewerCount();
          } else {
            this.safeSend(v, { type: "denied", error: m.error });
          }
          return;
        }
        this.safeSend(v, { type: "res", id, ok: !!m.ok, result: m.result, error: m.error });
        return;
      }

      if (m.type === "event") {
        const targets = m.target ? this.ctx.getWebSockets(`d:${m.target}`) : this.ctx.getWebSockets("viewer");
        const out = JSON.stringify({ type: "event", kind: m.kind, key: m.key, method: m.method, params: m.params, value: m.value });
        for (const v of targets) {
          const va = v.deserializeAttachment();
          if (!va?.staff) continue;
          if (m.perm && !va.staff.perms?.[m.perm]) continue;
          this.safeSend(v, out);
        }
      }
      return;
    }

    /* ---- mensajes del navegador del staff ---- */
    if (a.role === "viewer" && m.type === "req") {
      const id = String(m.id ?? "").slice(0, 40);
      if (!a.staff) { this.safeSend(ws, { type: "res", id, ok: false, error: "Todavía no se ha verificado tu rango." }); return; }
      // Límite: 20 peticiones cada 10 segundos por pestaña
      const now = Date.now(), r = this.rate.get(a.uid) || { n: 0, t: now };
      if (now - r.t > 10000) { r.n = 0; r.t = now; }
      r.n++; this.rate.set(a.uid, r);
      if (r.n > 20) { this.safeSend(ws, { type: "res", id, ok: false, error: "Vas muy rápido. Espera unos segundos." }); return; }
      const b = this.bridge();
      if (!b) { this.safeSend(ws, { type: "res", id, ok: false, error: "El servidor de FiveM no está conectado ahora mismo." }); return; }
      this.safeSend(b, { type: "req", reqId: `${a.uid}|${id}`, discordId: a.discordId, method: String(m.method || "").slice(0, 80), data: m.data });
    }
  }

  async webSocketClose(ws, code, reason) {
    const a = ws.deserializeAttachment() || {};
    try { ws.close(code === 1005 || code === 1006 ? 1000 : code, reason); } catch {}
    if (a.role === "bridge" && a.authed && !this.bridge(ws)) {
      for (const v of this.ctx.getWebSockets("viewer")) this.safeSend(v, { type: "bridge", online: false });
    }
    if (a.role === "viewer") { this.rate.delete(a.uid); this.tellViewerCount(ws); }
  }

  async webSocketError(ws) {
    const a = ws.deserializeAttachment() || {};
    if (a.role === "viewer") this.tellViewerCount(ws);
  }

  async alarm() {
    // Cierra conexiones del servidor que no se identificaron a tiempo
    for (const ws of this.ctx.getWebSockets("bridge")) {
      const a = ws.deserializeAttachment() || {};
      if (!a.authed && Date.now() - (a.at || 0) > 9000) { try { ws.close(4401, "sin identificar"); } catch {} }
    }
  }
}


/* ---------- GandyDev: IA gratis de Cloudflare ---------- */
const GANDY_SYSTEM = `Eres GandyDev, el asistente de la web de Auren RP, un servidor de roleplay de FiveM en Nueva York (Liberty City) con sabor dominicano.
Respondes SIEMPRE en español, claro y breve: como mucho 5 frases o una lista corta.
Usa SOLO la información de Auren que aparece abajo para hablar de reglas, del servidor o de la web. Si la respuesta no está ahí, dilo con sinceridad y sugiere preguntar en el Discord (discord.gg/aurenrp) abriendo un ticket.
Cuando te apoyes en una regla, cita su código entre corchetes, por ejemplo [CON-04].
No inventes reglas, números, precios ni fechas. No ayudes con trampas, cheats ni a saltarse las normas. Tutea a la persona.`;

async function rateLimited(request, bucket, perMinute) {
  const ip = request.headers.get("CF-Connecting-IP") || "0";
  const key = new Request(`https://rl.local/${bucket}/${ip}/${Math.floor(Date.now() / 60000)}`);
  const cache = caches.default;
  const hit = await cache.match(key);
  const n = hit ? Number(await hit.text()) || 0 : 0;
  if (n >= perMinute) return true;
  await cache.put(key, new Response(String(n + 1), { headers: { "Cache-Control": "max-age=70" } }));
  return false;
}

async function handleGandy(request, env) {
  if (request.method !== "POST") return json({ error: "Método no permitido" }, 405);
  if (!env.AI) return json({ error: "ai_off" }, 503);
  const url = new URL(request.url);
  const origin = request.headers.get("Origin");
  if (origin && origin !== url.origin) return json({ error: "Origen no permitido." }, 403);
  if (await rateLimited(request, "gandy", 12)) return json({ error: "Demasiadas preguntas seguidas. Espera un minuto." }, 429);
  let body;
  try { body = await request.json(); } catch { return json({ error: "Petición no válida." }, 400); }
  const q = String(body.q || "").slice(0, 400).trim();
  if (!q) return json({ error: "Pregunta vacía." }, 400);
  const context = String(body.context || "").slice(0, 6000);
  const history = (Array.isArray(body.history) ? body.history : []).slice(-6)
    .filter((m) => m && (m.role === "user" || m.role === "assistant"))
    .map((m) => ({ role: m.role, content: String(m.content || "").slice(0, 600) }));
  const messages = [{ role: "system", content: `${GANDY_SYSTEM}\n\nINFORMACIÓN DE AUREN:\n${context}` }, ...history, { role: "user", content: q }];
  const models = [env.GANDY_MODEL || "@cf/meta/llama-3.1-8b-instruct-fp8", "@cf/meta/llama-3.2-3b-instruct"];
  for (const model of models) {
    try {
      const r = await env.AI.run(model, { messages, max_tokens: 380, temperature: 0.3 });
      const answer = String(r?.response ?? r?.result?.response ?? r?.choices?.[0]?.message?.content ?? "").trim();
      if (answer) return json({ answer: answer.slice(0, 1600) });
    } catch (e) { /* prueba el siguiente modelo */ }
  }
  return json({ error: "La IA no respondió." }, 502);
}

/* ---------- Streamers ---------- */
const DEFAULT_STREAMER_ROLE = "1553781042383552687";
const list = (v) => String(v || "").split(",").map((x) => x.trim()).filter(Boolean);

async function isWebAdmin(env, user) {
  if (!user) return false;
  if (list(env.WEB_ADMIN_IDS).includes(user.id)) return true;
  if ((list(env.GOAT_IDS).length ? list(env.GOAT_IDS) : GOAT_IDS_DEFAULT).includes(user.id)) return true;   // los owners siempre
  const roles = list(env.WEB_ADMIN_ROLE_IDS);
  if (!roles.length || !env.DISCORD_BOT_TOKEN || !env.DISCORD_GUILD_ID) return false;
  const key = new Request(`https://admin.local/${user.id}`);
  const hit = await caches.default.match(key);
  if (hit) return (await hit.text()) === "1";
  let ok = false;
  try {
    const r = await fetch(`https://discord.com/api/v10/guilds/${env.DISCORD_GUILD_ID}/members/${user.id}`, { headers: { Authorization: `Bot ${env.DISCORD_BOT_TOKEN}` } });
    if (r.ok) { const m = await r.json(); ok = (m.roles || []).some((x) => roles.includes(x)); }
  } catch {}
  await caches.default.put(key, new Response(ok ? "1" : "0", { headers: { "Cache-Control": "max-age=300" } }));
  return ok;
}

// Acepta enlaces completos o solo el nombre del canal
function cleanChannel(platform, v) {
  v = String(v || "").trim();
  if (!v) return "";
  const pats = {
    twitch: /(?:twitch\.tv\/)?@?([a-zA-Z0-9_]{3,25})\/?$/,
    kick: /(?:kick\.com\/)?@?([a-zA-Z0-9_-]{3,30})\/?$/,
    youtube: /(?:youtube\.com\/)?((?:@[\w.-]{3,40})|(?:channel\/[\w-]{10,40}))\/?$/,
    tiktok: /(?:tiktok\.com\/)?@?([\w.]{2,30})\/?$/,
  };
  const m = v.replace(/^https?:\/\/(www\.|m\.)?/i, "").replace(/\?.*$/, "").match(pats[platform]);
  if (!m) return "";
  return platform === "youtube" && !m[1].startsWith("@") && !m[1].startsWith("channel/") ? "@" + m[1] : m[1];
}

async function handleStreamers(request, env, sub) {
  const store = env.SITE_STORE.get(env.SITE_STORE.idFromName("auren"));
  if (!sub) {
    if (await rateLimited(request, "streamers", 60)) return json({ error: "Demasiadas peticiones." }, 429);
    return store.fetch("https://store/data");
  }
  const user = authConfigured(env) ? await getUser(request, env) : null;
  if (sub === "me") return json({ admin: await isWebAdmin(env, user), logged: !!user });
  if (sub === "channels" || sub === "refresh") {
    if (request.method !== "POST") return json({ error: "Método no permitido" }, 405);
    const url = new URL(request.url);
    const origin = request.headers.get("Origin");
    if (origin && origin !== url.origin) return json({ error: "Origen no permitido." }, 403);
    if (!user) return json({ error: "Inicia sesión con Discord." }, 401);
    if (!(await isWebAdmin(env, user))) return json({ error: "Solo los admins de la web pueden cambiar esto." }, 403);
    if (sub === "refresh") return store.fetch("https://store/refresh", { method: "POST" });
    let b; try { b = await request.json(); } catch { return json({ error: "Petición no válida." }, 400); }
    if (!/^\d{5,25}$/.test(String(b.id || ""))) return json({ error: "Streamer no válido." }, 400);
    const entry = {
      twitch: cleanChannel("twitch", b.twitch), kick: cleanChannel("kick", b.kick),
      youtube: cleanChannel("youtube", b.youtube), tiktok: cleanChannel("tiktok", b.tiktok),
      featured: !!b.featured, by: user.name || user.username, at: Date.now(),
    };
    for (const k of ["twitch", "kick", "youtube", "tiktok"]) if (b[k] && !entry[k]) return json({ error: `El canal de ${k} no es válido. Pega el enlace completo o solo el nombre.` }, 400);
    return store.fetch("https://store/save", { method: "POST", body: JSON.stringify({ id: String(b.id), entry }) });
  }
  return json({ error: "Ruta no encontrada" }, 404);
}

export class SiteStore extends DurableObject {
  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname === "/data") {
      const data = await this.publicData();
      const stale = !data.updatedAt || Date.now() - data.updatedAt > 12 * 60000;
      if (stale) this.ctx.waitUntil(this.refresh().catch(() => {}));
      return json(data, 200, { "Cache-Control": "public, max-age=30" });
    }
    if (url.pathname === "/save") {
      const { id, entry } = await request.json();
      const channels = (await this.ctx.storage.get("channels")) || {};
      channels[id] = entry;
      await this.ctx.storage.put("channels", channels);
      this.ctx.waitUntil(this.refresh(true).catch(() => {}));
      return json({ ok: true, entry });
    }
    if (url.pathname === "/refresh") {
      await this.refresh(true);
      return json({ ok: true });
    }
    if (url.pathname === "/profile" && request.method === "POST") {
      const p = await request.json();
      if (!/^\d{5,25}$/.test(String(p.id || ""))) return json({ error: "id" }, 400);
      const all = (await this.ctx.storage.get("profiles")) || {};
      all[p.id] = p;
      const ids = Object.keys(all);
      if (ids.length > 3000) ids.sort((a, b) => (all[a].at || 0) - (all[b].at || 0)).slice(0, ids.length - 3000).forEach((k) => delete all[k]);
      await this.ctx.storage.put("profiles", all);
      return json({ ok: true });
    }
    if (url.pathname === "/profiles") {
      const all = (await this.ctx.storage.get("profiles")) || {};
      const ids = (url.searchParams.get("ids") || "").split(",").filter(Boolean);
      const out = {}; ids.forEach((id) => { if (all[id]) out[id] = all[id]; });
      return json(out);
    }
    return json({ error: "no encontrado" }, 404);
  }

  async publicData() {
    const [members, channels, status, activity] = await Promise.all([
      this.ctx.storage.get("members"), this.ctx.storage.get("channels"), this.ctx.storage.get("status"), this.ctx.storage.get("activity"),
    ]);
    const ch = channels || {}, st = status?.per || {}, act = activity || {};
    let memberList = members?.list || [];
    if (!(this.env.DISCORD_BOT_TOKEN && this.env.DISCORD_GUILD_ID)) {
      // sin bot: usamos a quienes iniciaron sesión en la web y tienen el rol de Streamer
      const prof = (await this.ctx.storage.get("profiles")) || {};
      memberList = Object.values(prof).filter((p) => p.streamer).map((p) => ({ id: p.id, name: p.nick || p.globalName || p.username, username: p.username, avatar: profileAvatar(p, this.env, 256).still }));
    }
    const week = {};
    for (const day of Object.keys(act)) for (const [id, m] of Object.entries(act[day])) week[id] = (week[id] || 0) + m;
    const streamers = memberList.map((m) => {
      const c = ch[m.id] || {}, s = st[m.id] || {};
      return {
        id: m.id, name: m.name, username: m.username, avatar: m.avatar,
        channels: { twitch: c.twitch || "", kick: c.kick || "", youtube: c.youtube || "", tiktok: c.tiktok || "" },
        featured: !!c.featured, live: s.live || null, followers: s.followers || {}, lastLive: s.lastLive || null,
        weekMinutes: week[m.id] || 0,
      };
    });
    const withF = streamers.map((x) => ({ id: x.id, f: (x.followers.twitch || 0) + (x.followers.kick || 0) })).filter((x) => x.f > 0).sort((a, b) => b.f - a.f);
    const active = streamers.filter((x) => x.weekMinutes > 0).sort((a, b) => b.weekMinutes - a.weekMinutes)[0];
    return {
      updatedAt: status?.at || members?.at || null,
      configured: { discord: !!(this.env.DISCORD_BOT_TOKEN && this.env.DISCORD_GUILD_ID), twitch: !!(this.env.TWITCH_CLIENT_ID && this.env.TWITCH_CLIENT_SECRET), kick: !!(this.env.KICK_CLIENT_ID && this.env.KICK_CLIENT_SECRET) },
      streamers,
      top: { followers: withF.slice(0, 3).map((x) => x.id), active: active ? active.id : null },
    };
  }

  async refresh(force = false) {
    const lock = (await this.ctx.storage.get("refreshing")) || 0;
    if (!force && Date.now() - lock < 60000) return;
    await this.ctx.storage.put("refreshing", Date.now());
    try {
      await this.refreshMembers();
      await this.refreshStatus();
    } finally {
      await this.ctx.storage.put("refreshing", 0);
    }
  }

  async refreshMembers() {
    const env = this.env;
    if (!env.DISCORD_BOT_TOKEN || !env.DISCORD_GUILD_ID) return;
    const role = env.STREAMER_ROLE_ID || DEFAULT_STREAMER_ROLE;
    const out = [];
    let after = "0";
    for (let page = 0; page < 5; page++) {
      const r = await fetch(`https://discord.com/api/v10/guilds/${env.DISCORD_GUILD_ID}/members?limit=1000&after=${after}`, { headers: { Authorization: `Bot ${env.DISCORD_BOT_TOKEN}` } });
      if (!r.ok) throw new Error(`Discord ${r.status}`);
      const batch = await r.json();
      for (const m of batch) {
        if (!(m.roles || []).includes(role) || m.user?.bot) continue;
        const u = m.user;
        const avatar = m.avatar
          ? `https://cdn.discordapp.com/guilds/${env.DISCORD_GUILD_ID}/users/${u.id}/avatars/${m.avatar}.png?size=256`
          : u.avatar ? `https://cdn.discordapp.com/avatars/${u.id}/${u.avatar}.png?size=256`
          : `https://cdn.discordapp.com/embed/avatars/${Number((BigInt(u.id) >> 22n) % 6n)}.png`;
        out.push({ id: u.id, name: m.nick || u.global_name || u.username, username: u.username, avatar });
      }
      if (batch.length < 1000) break;
      after = batch[batch.length - 1].user.id;
    }
    await this.ctx.storage.put("members", { at: Date.now(), list: out });
  }

  async token(platform) {
    const env = this.env;
    const saved = await this.ctx.storage.get(`tok_${platform}`);
    if (saved && saved.exp > Date.now() + 60000) return saved.token;
    const cfg = platform === "twitch"
      ? { url: "https://id.twitch.tv/oauth2/token", id: env.TWITCH_CLIENT_ID, secret: env.TWITCH_CLIENT_SECRET }
      : { url: "https://id.kick.com/oauth/token", id: env.KICK_CLIENT_ID, secret: env.KICK_CLIENT_SECRET };
    if (!cfg.id || !cfg.secret) return null;
    const r = await fetch(cfg.url, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ client_id: cfg.id, client_secret: cfg.secret, grant_type: "client_credentials" }) });
    if (!r.ok) return null;
    const j = await r.json();
    await this.ctx.storage.put(`tok_${platform}`, { token: j.access_token, exp: Date.now() + (Number(j.expires_in) || 3600) * 1000 });
    return j.access_token;
  }

  async refreshStatus() {
    const env = this.env;
    let members = (await this.ctx.storage.get("members"))?.list || [];
    if (!(env.DISCORD_BOT_TOKEN && env.DISCORD_GUILD_ID)) members = Object.values((await this.ctx.storage.get("profiles")) || {}).filter((p) => p.streamer);
    const channels = (await this.ctx.storage.get("channels")) || {};
    const prev = (await this.ctx.storage.get("status"))?.per || {};
    const per = {};
    const ids = members.map((m) => m.id);
    for (const id of ids) per[id] = { live: null, followers: { ...(prev[id]?.followers || {}) }, lastLive: prev[id]?.lastLive || null };

    // Twitch
    const tw = ids.filter((id) => channels[id]?.twitch).map((id) => ({ id, login: channels[id].twitch.toLowerCase() }));
    const ttok = tw.length ? await this.token("twitch").catch(() => null) : null;
    if (ttok) {
      const h = { "Client-Id": env.TWITCH_CLIENT_ID, Authorization: `Bearer ${ttok}` };
      const qs = tw.slice(0, 100).map((x) => `user_login=${encodeURIComponent(x.login)}`).join("&");
      const us = tw.slice(0, 100).map((x) => `login=${encodeURIComponent(x.login)}`).join("&");
      const [streams, users] = await Promise.all([
        fetch(`https://api.twitch.tv/helix/streams?${qs}&first=100`, { headers: h }).then((r) => (r.ok ? r.json() : { data: [] })).catch(() => ({ data: [] })),
        fetch(`https://api.twitch.tv/helix/users?${us}`, { headers: h }).then((r) => (r.ok ? r.json() : { data: [] })).catch(() => ({ data: [] })),
      ]);
      const byLogin = new Map(tw.map((x) => [x.login, x.id]));
      for (const st of streams.data || []) {
        const id = byLogin.get(String(st.user_login).toLowerCase()); if (!id) continue;
        per[id].live = { platform: "twitch", channel: st.user_login, title: st.title, game: st.game_name, viewers: st.viewer_count, startedAt: st.started_at, thumbnail: String(st.thumbnail_url || "").replace("{width}", "640").replace("{height}", "360") };
      }
      // seguidores: unos pocos por vuelta para no pasar el límite gratis de peticiones
      const order = (await this.ctx.storage.get("tw_rot")) || 0;
      const usersArr = users.data || [];
      const slice = usersArr.length ? Array.from({ length: Math.min(12, usersArr.length) }, (_, i) => usersArr[(order + i) % usersArr.length]) : [];
      await this.ctx.storage.put("tw_rot", order + slice.length);
      await Promise.all(slice.map(async (u) => {
        const id = byLogin.get(String(u.login).toLowerCase()); if (!id) return;
        const r = await fetch(`https://api.twitch.tv/helix/channels/followers?broadcaster_id=${u.id}&first=1`, { headers: h }).catch(() => null);
        if (r && r.ok) { const j = await r.json(); per[id].followers.twitch = Number(j.total) || 0; }
      }));
    }

    // Kick (API oficial para directos; seguidores si se pueden leer)
    const kk = ids.filter((id) => channels[id]?.kick).map((id) => ({ id, slug: channels[id].kick.toLowerCase() }));
    const ktok = kk.length ? await this.token("kick").catch(() => null) : null;
    if (ktok) {
      const qs = kk.slice(0, 50).map((x) => `slug=${encodeURIComponent(x.slug)}`).join("&");
      const r = await fetch(`https://api.kick.com/public/v1/channels?${qs}`, { headers: { Authorization: `Bearer ${ktok}`, Accept: "application/json" } }).catch(() => null);
      if (r && r.ok) {
        const j = await r.json().catch(() => ({}));
        const bySlug = new Map(kk.map((x) => [x.slug, x.id]));
        for (const c of j.data || []) {
          const id = bySlug.get(String(c.slug || "").toLowerCase()); if (!id) continue;
          if (c.stream?.is_live && !per[id].live) per[id].live = { platform: "kick", channel: c.slug, title: c.stream_title || "", game: c.category?.name || "", viewers: c.stream?.viewer_count ?? null, startedAt: c.stream?.start_time || null, thumbnail: c.stream?.thumbnail || "" };
          const f = c.followers_count ?? c.followers ?? c.follower_count;
          if (f != null) per[id].followers.kick = Number(f) || 0;
        }
      }
    }
    // respaldo para seguidores de Kick (página pública), unos pocos por vuelta
    const needKick = kk;
    const krot = (await this.ctx.storage.get("kk_rot")) || 0;
    const kslice = needKick.length ? Array.from({ length: Math.min(6, needKick.length) }, (_, i) => needKick[(krot + i) % needKick.length]) : [];
    await this.ctx.storage.put("kk_rot", krot + kslice.length);
    for (const x of kslice) {
      const r = await fetch(`https://kick.com/api/v2/channels/${encodeURIComponent(x.slug)}`, { headers: { Accept: "application/json", "User-Agent": "Mozilla/5.0" } }).catch(() => null);
      if (r && r.ok) { const j = await r.json().catch(() => null); if (j && j.followers_count != null) per[x.id].followers.kick = Number(j.followers_count) || 0; }
    }

    // actividad: minutos en directo por día (para "el más activo")
    const now = Date.now(), last = (await this.ctx.storage.get("status"))?.at || now;
    const mins = Math.max(0, Math.min(20, Math.round((now - last) / 60000)));
    const day = new Date().toISOString().slice(0, 10);
    const act = (await this.ctx.storage.get("activity")) || {};
    act[day] = act[day] || {};
    for (const id of ids) if (per[id].live) { per[id].lastLive = now; if (mins) act[day][id] = (act[day][id] || 0) + mins; }
    for (const d of Object.keys(act).sort().slice(0, -7)) delete act[d];
    await this.ctx.storage.put("activity", act);
    await this.ctx.storage.put("status", { at: now, per });
  }
}


/* ---------- The GOATs: perfiles de Discord de los owners ---------- */
const GOAT_IDS_DEFAULT = ["1270133887372230718", "457432500768210945", "808082230320693338"];
const snowflakeDate = (id) => { try { return new Date(Number((BigInt(id) >> 22n) + 1420070400000n)).toISOString(); } catch { return null; } };

function profileAvatar(p, env, size) {
  const cdn = "https://cdn.discordapp.com";
  const img = (path, hash) => hash ? { still: `${cdn}/${path}/${hash}.png?size=${size}`, anim: hash.startsWith("a_") ? `${cdn}/${path}/${hash}.gif?size=${size}` : null } : null;
  return (p.guildAvatar && env.DISCORD_GUILD_ID && img(`guilds/${env.DISCORD_GUILD_ID}/users/${p.id}/avatars`, p.guildAvatar))
    || img(`avatars/${p.id}`, p.avatar)
    || { still: `${cdn}/embed/avatars/${Number((BigInt(p.id) >> 22n) % 6n)}.png`, anim: null };
}

async function handleGoats(request, env) {
  const ids = list(env.GOAT_IDS).length ? list(env.GOAT_IDS) : GOAT_IDS_DEFAULT;
  const key = new Request(`https://goats.local/v3/${ids.join("-")}`);
  const hit = await caches.default.match(key);
  if (hit) return new Response(hit.body, { headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "public, max-age=300" } });
  const cdn = "https://cdn.discordapp.com";
  const H = env.DISCORD_BOT_TOKEN ? { Authorization: `Bot ${env.DISCORD_BOT_TOKEN}` } : null;
  let saved = {};
  try { if (env.SITE_STORE) saved = await (await env.SITE_STORE.get(env.SITE_STORE.idFromName("auren")).fetch(`https://store/profiles?ids=${ids.join(",")}`)).json(); } catch {}
  const people = await Promise.all(ids.map(async (id) => {
    const out = { id, createdAt: snowflakeDate(id) };
    let u = null, m = null;
    try {
      if (H) [u, m] = await Promise.all([
        fetch(`https://discord.com/api/v10/users/${id}`, { headers: H }).then((r) => (r.ok ? r.json() : null)),
        env.DISCORD_GUILD_ID ? fetch(`https://discord.com/api/v10/guilds/${env.DISCORD_GUILD_ID}/members/${id}`, { headers: H }).then((r) => (r.ok ? r.json() : null)) : null,
      ]);
    } catch {}
    const p = saved[id];
    if (!u && p) u = { id, username: p.username, global_name: p.globalName, avatar: p.avatar, banner: p.banner, accent_color: p.accent, avatar_decoration_data: p.deco ? { asset: p.deco } : null };
    if (!m && p && (p.nick || p.guildAvatar || p.joinedAt)) m = { nick: p.nick, avatar: p.guildAvatar, joined_at: p.joinedAt };
    if (!u) {
      // último recurso: perfil público de Discord por un servicio abierto
      try { const r = await fetch(`https://japi.rest/discord/v1/user/${id}`, { headers: { Accept: "application/json" } }); if (r.ok) { const j = await r.json(); u = j.data || j; } } catch {}
    }
    if (!u || !u.username) return out;
    out.username = u.username;
    out.name = (m && m.nick) || u.global_name || u.username;
    out.globalName = u.global_name || u.username;
    const img = (path, hash, size) => hash ? { still: `${cdn}/${path}/${hash}.png?size=${size}`, anim: hash.startsWith("a_") ? `${cdn}/${path}/${hash}.gif?size=${size}` : null } : null;
    out.avatar = (m && m.avatar && env.DISCORD_GUILD_ID && img(`guilds/${env.DISCORD_GUILD_ID}/users/${id}/avatars`, m.avatar, 512)) || img(`avatars/${id}`, u.avatar, 512)
      || { still: `${cdn}/embed/avatars/${Number((BigInt(id) >> 22n) % 6n)}.png`, anim: null };
    out.banner = (m && m.banner && env.DISCORD_GUILD_ID && img(`guilds/${env.DISCORD_GUILD_ID}/users/${id}/banners`, m.banner, 1024)) || img(`banners/${id}`, u.banner, 1024);
    out.accent = u.accent_color ? "#" + Number(u.accent_color).toString(16).padStart(6, "0") : null;
    const deco = (m && m.avatar_decoration_data) || u.avatar_decoration_data;
    out.decoration = deco && deco.asset ? `${cdn}/avatar-decoration-presets/${deco.asset}.png?size=240&passthrough=true` : null;
    out.joinedAt = (m && m.joined_at) || null;
    return out;
  }));
  const body = JSON.stringify({ configured: !!H, people });
  await caches.default.put(key, new Response(body, { headers: { "Cache-Control": "max-age=900" } }));
  return new Response(body, { headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "public, max-age=300" } });
}

/* ---------- enrutado ---------- */
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    // www.aurenroleplay.com → aurenroleplay.com (una sola dirección para que el login no se líe)
    if (url.hostname.startsWith("www.")) {
      url.hostname = url.hostname.slice(4);
      return Response.redirect(url.toString(), 301);
    }
    const m = url.pathname.match(/^\/api\/auth\/([a-z]+)\/?$/);
    if (m) {
      if (request.method !== "GET") return json({ error: "Método no permitido" }, 405);
      return handleAuth(request, env, m[1]);
    }
    const ad = url.pathname.match(/^\/api\/admin\/([a-z]+)\/?$/);
    if (ad) return handleAdmin(request, env, ad[1]);
    if (url.pathname === "/api/stats") return handleStats(request, env, ctx);
    if (url.pathname === "/api/gandy") return handleGandy(request, env);
    if (url.pathname === "/api/goats") return handleGoats(request, env);
    const sm = url.pathname.match(/^\/api\/streamers(?:\/([a-z]+))?\/?$/);
    if (sm) return handleStreamers(request, env, sm[1] || "");
    if (url.pathname.startsWith("/api/")) return json({ error: "Ruta no encontrada" }, 404);
    return env.ASSETS.fetch(request);
  },
  // Cada 10 minutos: actualiza miembros del rol, directos, seguidores y actividad
  async scheduled(event, env, ctx) {
    const store = env.SITE_STORE.get(env.SITE_STORE.idFromName("auren"));
    ctx.waitUntil(store.fetch("https://store/refresh", { method: "POST" }).catch(() => {}));
  },
};
