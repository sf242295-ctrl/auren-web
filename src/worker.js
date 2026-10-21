/*
  Auren RP — Worker de Cloudflare
  - Sirve la web (carpeta public)
  - Login con Discord:   /api/auth/login, /callback, /me, /logout
  - Estadísticas:        /api/stats  (jugadores de FiveM y miembros del Discord)
  - Panel del staff:     /api/admin/ws      (navegador del staff, en vivo)
                         /api/admin/bridge  (conexión que abre el servidor de FiveM)
                         /api/admin/status

  Variables (Cloudflare > tu Worker > Settings > Variables and Secrets):
    DISCORD_CLIENT_ID      (Text)
    DISCORD_CLIENT_SECRET  (Secret)
    SESSION_SECRET         (Secret: 40+ letras y números al azar)
    DISCORD_GUILD_ID       (Text, opcional: ID de tu servidor de Discord)
    ADMIN_BRIDGE_KEY       (Secret: la misma clave que web_panel.key en auren_admin)
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

    let member = null;
    if (env.DISCORD_GUILD_ID) {
      const mRes = await fetch(`https://discord.com/api/users/@me/guilds/${env.DISCORD_GUILD_ID}/member`, { headers: authHeader });
      member = mRes.ok;
    }

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

/* ---------- enrutado ---------- */
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const m = url.pathname.match(/^\/api\/auth\/([a-z]+)\/?$/);
    if (m) {
      if (request.method !== "GET") return json({ error: "Método no permitido" }, 405);
      return handleAuth(request, env, m[1]);
    }
    const ad = url.pathname.match(/^\/api\/admin\/([a-z]+)\/?$/);
    if (ad) return handleAdmin(request, env, ad[1]);
    if (url.pathname === "/api/stats") return handleStats(request, env, ctx);
    if (url.pathname.startsWith("/api/")) return json({ error: "Ruta no encontrada" }, 404);
    return env.ASSETS.fetch(request);
  },
};
