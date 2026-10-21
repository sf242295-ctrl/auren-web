/* =========================================================
   AUREN RP — script compartido de todas las páginas
   ========================================================= */

/* ---------------- CONFIGURACIÓN (cambia solo esto) ---------------- */
window.AUREN_CONFIG = {
  discord: "https://discord.gg/aurenrp",
  // Las compras VIP y los tickets se hacen por el Discord
  tienda:  "https://discord.gg/aurenrp",
  tickets: "https://discord.gg/aurenrp",
  // Código cfx.re del servidor
  cfxCode: "lee9965",
  maxSlots: 128,
  // Redes (deja "" para ocultar)
  kick:   "",
  tiktok: "",
  ticker: ["Bienvenidos a Auren NYC", "Whitelist abierta", "Únete al Discord", "Staff 24/7", "Compras VIP por Discord"],
  // Streamers: plataforma "twitch" o "kick" + canal
  streamers: [
    { name: "Streamer1", platform: "twitch", role: "Policía de Auren" },
    { name: "Streamer2", platform: "kick",   role: "Mecánico del bloque" },
    { name: "Streamer3", platform: "twitch", role: "EMS Auren Medical" }
  ]
};
/* ------------------------------------------------------------------ */

(function(){
  const C = window.AUREN_CONFIG;
  const page = document.body.dataset.page || "home";
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const store = {
    get(k){ try{ return localStorage.getItem(k); }catch(e){ return null; } },
    set(k,v){ try{ localStorage.setItem(k,v); }catch(e){} }
  };

  // Tamaño de letra guardado (antes de pintar)
  const savedSize = store.get("auren_text");
  if(savedSize === "lg" || savedSize === "xl") document.documentElement.dataset.text = savedSize;

  const ICON = {
    mark:'<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M32 5 L58 58 H45 L32 31 L19 58 H6 Z" fill="currentColor"/><path d="M23 45 H41" stroke="#06070a" stroke-width="4"/></svg>',
    discord:'<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M20.3 4.4A19.8 19.8 0 0 0 15.4 3l-.6 1.3a18.3 18.3 0 0 0-5.5 0L8.6 3a19.7 19.7 0 0 0-4.9 1.4C.6 9.1-.3 13.6.1 18.1a19.9 19.9 0 0 0 6 3l1.3-2a12.9 12.9 0 0 1-2-1l.5-.4a14.2 14.2 0 0 0 12.2 0l.5.4c-.6.4-1.3.7-2 1l1.3 2a19.8 19.8 0 0 0 6-3c.5-5.2-.8-9.7-3.6-13.7ZM8 15.4c-1.2 0-2.2-1.1-2.2-2.4S6.8 10.6 8 10.6s2.2 1.1 2.2 2.4-1 2.4-2.2 2.4Zm8 0c-1.2 0-2.2-1.1-2.2-2.4s1-2.4 2.2-2.4 2.2 1.1 2.2 2.4-1 2.4-2.2 2.4Z"/></svg>',
    menu:'<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true"><path d="M3 7h18M3 12h18M3 17h18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>'
  };
  window.AUREN_ICON = ICON;

  /* ---------- cabecera ---------- */
  const links = [
    ["home#jugar", "index.html#jugar", "Cómo jugar"],
    ["home#directos", "index.html#directos", "Directos"],
    ["home#comunidad", "index.html#comunidad", "Comunidad"],
    ["normativas", "normativas.html", "Normativas"],
    ["ayuda", "ayuda.html", "Ayuda"]
  ];
  const header = document.getElementById("siteHeader");
  header.className = "nav";
  header.innerHTML = `
    <a class="brand" href="index.html" aria-label="Auren RP, inicio">${ICON.mark}<span>AUREN</span></a>
    <nav class="nav-links" id="navLinks" aria-label="Principal">
      ${links.map(([k,h,t])=>`<a href="${h}"${k===page?' aria-current="page"':''}>${t}</a>`).join("")}
    </nav>
    <div class="textsize">
      <button class="icon-btn aa" id="aaBtn" aria-label="Tamaño de letra" aria-expanded="false" aria-controls="aaPop"><span>A<b>A</b></span></button>
      <div class="pop" id="aaPop" hidden>
        <p>Tamaño de letra</p>
        <div class="seg" role="group" aria-label="Tamaño de letra">
          <button data-size="md">Normal</button><button data-size="lg">Grande</button><button data-size="xl">Enorme</button>
        </div>
      </div>
    </div>
    <div class="auth" id="authSlot"></div>
    <button class="icon-btn menu-btn" id="menuBtn" aria-label="Abrir menú" aria-expanded="false" aria-controls="navLinks">${ICON.menu}</button>`;

  const navLinks = document.getElementById("navLinks"), menuBtn = document.getElementById("menuBtn");
  menuBtn.addEventListener("click", ()=>{ const o = navLinks.classList.toggle("open"); menuBtn.setAttribute("aria-expanded", o); });
  navLinks.querySelectorAll("a").forEach(a=>a.addEventListener("click", ()=>{ navLinks.classList.remove("open"); menuBtn.setAttribute("aria-expanded", false); }));

  // control AA
  const aaBtn = document.getElementById("aaBtn"), aaPop = document.getElementById("aaPop");
  const markSize = ()=> aaPop.querySelectorAll("[data-size]").forEach(b=> b.setAttribute("aria-pressed", (document.documentElement.dataset.text || "md") === b.dataset.size));
  markSize();
  aaBtn.addEventListener("click", e=>{ e.stopPropagation(); aaPop.hidden = !aaPop.hidden; aaBtn.setAttribute("aria-expanded", !aaPop.hidden); });
  aaPop.addEventListener("click", e=>{
    e.stopPropagation();
    const b = e.target.closest("[data-size]"); if(!b) return;
    if(b.dataset.size === "md") delete document.documentElement.dataset.text; else document.documentElement.dataset.text = b.dataset.size;
    store.set("auren_text", b.dataset.size); markSize();
  });
  document.addEventListener("click", ()=>{ aaPop.hidden = true; aaBtn.setAttribute("aria-expanded", false); });

  /* ---------- pie ---------- */
  const footer = document.getElementById("siteFooter");
  footer.className = "site-footer";
  const social = [["Discord", C.discord], ["Kick", C.kick], ["TikTok", C.tiktok]].filter(s=>s[1]);
  footer.innerHTML = `
    <div class="wrap">
      <div class="foot-grid">
        <div class="foot-brand">
          <a class="brand" href="index.html">${ICON.mark}AUREN RP</a>
          <p>Roleplay en Nueva York con sabor dominicano. No estamos afiliados a Rockstar Games ni a Take-Two Interactive.</p>
        </div>
        <div class="foot-col"><h4>Servidor</h4><ul>
          <li><a href="index.html#jugar">Cómo jugar</a></li>
          <li><a href="index.html#directos">Directos</a></li>
          <li><a href="normativas.html">Normativas</a></li>
          <li><a href="#" data-connect>Conectar</a></li></ul></div>
        <div class="foot-col"><h4>Cuenta</h4><ul>
          <li><a href="/api/auth/login" data-auth="login">Iniciar sesión</a></li>
          <li><a href="panel.html">Panel y whitelist</a></li>
          <li><a href="ayuda.html">Ayuda</a></li></ul></div>
        <div class="foot-col"><h4>Comunidad</h4><ul>
          ${social.map(([n,u])=>`<li><a href="${esc(u)}" target="_blank" rel="noopener">${n}</a></li>`).join("")}
          <li><a href="${esc(C.tienda)}" target="_blank" rel="noopener">Compras VIP</a></li></ul></div>
      </div>
      <div class="foot-bottom">
        <span>© ${new Date().getFullYear()} Auren RP</span>
        <nav><a href="privacidad.html">Privacidad</a><a href="terminos.html">Términos</a></nav>
      </div>
    </div>
    <div class="toast" id="toast" role="status" hidden></div>`;

  /* ---------- ciudad (canvas + radio) ---------- */
  document.body.insertAdjacentHTML("afterbegin", `
    <canvas id="city" aria-hidden="true"></canvas>
    <div class="radio" id="radio" aria-hidden="true">
      <span class="live"></span><span class="lbl">Radio de la ciudad</span><span class="msg" id="radioMsg">Noche tranquila en Auren NYC</span>
      <button id="cityPause" type="button" aria-label="Pausar animación de la ciudad" title="Pausar ciudad">
        <svg viewBox="0 0 24 24" width="14" height="14"><path id="pauseIcon" d="M7 5h3v14H7zM14 5h3v14h-3z" fill="currentColor"/></svg>
      </button>
    </div>`);

  /* ---------- utilidades ---------- */
  const toastEl = document.getElementById("toast"); let tt;
  function toast(msg){ toastEl.textContent = msg; toastEl.hidden = false; clearTimeout(tt); tt = setTimeout(()=> toastEl.hidden = true, 5500); }

  async function copy(text, btn){
    try{ await navigator.clipboard.writeText(text); toast("Copiado: " + text); }
    catch(e){
      const r = document.createRange(), el = btn && btn.previousElementSibling;
      if(el){ r.selectNodeContents(el); const s = getSelection(); s.removeAllRanges(); s.addRange(r); }
      toast("Selecciona el texto y cópialo con Ctrl + C.");
    }
  }

  // Enlaces de configuración
  document.addEventListener("click", e=>{
    const c = e.target.closest("[data-connect]");
    if(c){ e.preventDefault(); location.href = "fivem://connect/cfx.re/join/" + C.cfxCode;
      setTimeout(()=> toast("Si no se abrió FiveM, ábrelo y pulsa F8: connect cfx.re/join/" + C.cfxCode), 900); }
    const cp = e.target.closest("[data-copy]");
    if(cp){ e.preventDefault(); copy(cp.dataset.copy, cp); }
  });
  document.querySelectorAll("[data-link]").forEach(a=>{ a.href = C[a.dataset.link]; a.target = "_blank"; a.rel = "noopener"; });

  /* ---------- login con Discord ---------- */
  let authReady = false, authError = "El inicio de sesión con Discord no está disponible en esta copia de la web.";
  const nextPath = () => location.pathname.replace(/\.html$/,"") + location.hash;
  function loginHref(){ return "/api/auth/login?next=" + encodeURIComponent(nextPath()); }
  function syncLoginLinks(){ document.querySelectorAll('[data-auth="login"]').forEach(a=> a.href = loginHref()); }

  document.addEventListener("click", e=>{
    const a = e.target.closest('[data-auth="login"]');
    if(!a) return;
    if(!authReady){ e.preventDefault(); toast(authError); return; }
    a.href = loginHref();
  });

  const avatarHTML = (u, cls="") => u.avatar
    ? `<span class="avatar ${cls}"><img src="https://cdn.discordapp.com/avatars/${esc(u.id)}/${esc(u.avatar)}.png?size=128" alt=""></span>`
    : `<span class="avatar ${cls}">${esc((u.name||"?")[0].toUpperCase())}</span>`;

  function statusPill(u){
    if(u.member === false) return `<span class="pill bad"><span class="dot"></span>No estás en el Discord</span>`;
    if(u.verified === true) return `<span class="pill ok"><span class="dot"></span>Whitelist aprobada</span>`;
    if(u.verified === false) return `<span class="pill warn"><span class="dot"></span>Whitelist pendiente</span>`;
    return `<span class="pill ok"><span class="dot"></span>Cuenta vinculada</span>`;
  }

  function renderAuth(u){
    const slot = document.getElementById("authSlot");
    if(!u){
      slot.innerHTML = `<a class="btn btn-primary" href="${loginHref()}" data-auth="login">${ICON.discord}<span>Iniciar <span class="lbl-long">sesión</span></span></a>`;
      return;
    }
    slot.innerHTML = `
      <button class="user-chip" id="userChip" aria-expanded="false" aria-controls="userMenu">${avatarHTML(u)}<span class="uname">${esc(u.name)}</span></button>
      <div class="pop user-menu" id="userMenu" hidden>
        <div class="who">${avatarHTML(u)}<div><b>${esc(u.name)}</b><small>@${esc(u.username)}</small></div></div>
        ${statusPill(u)}
        <a href="panel.html">Mi panel y whitelist</a>
        ${u.member === false ? `<a href="${esc(C.discord)}" target="_blank" rel="noopener">Unirse al Discord de Auren</a>` : ""}
        <a href="/api/auth/logout">Cerrar sesión</a>
      </div>`;
    const chip = document.getElementById("userChip"), menu = document.getElementById("userMenu");
    chip.addEventListener("click", e=>{ e.stopPropagation(); menu.hidden = !menu.hidden; chip.setAttribute("aria-expanded", !menu.hidden); });
    menu.addEventListener("click", e=> e.stopPropagation());
    document.addEventListener("click", ()=>{ menu.hidden = true; chip.setAttribute("aria-expanded", false); });
  }

  renderAuth(null);
  syncLoginLinks();

  const userPromise = (async ()=>{
    try{
      const r = await fetch("/api/auth/me", {credentials:"same-origin"});
      const isJson = (r.headers.get("content-type")||"").includes("json");
      const data = isJson ? await r.json() : null;
      if(!r.ok || !data){ if(data && data.error) authError = "Login con Discord no disponible: " + data.error; throw 0; }
      authReady = true;
      renderAuth(data.user);
      return data.user;
    }catch(e){ authReady = false; return null; }
    finally{
      const p = new URLSearchParams(location.search);
      if(p.has("login")){
        toast(p.get("login")==="ok" ? "Sesión iniciada con Discord." : "No se pudo iniciar sesión con Discord. Inténtalo de nuevo.");
        p.delete("login");
        history.replaceState(null, "", location.pathname + (p.toString() ? "?" + p : "") + location.hash);
      }
    }
  })();

  // Estadísticas en vivo (FiveM + Discord), compartidas por las páginas
  const statsPromise = fetch("/api/stats").then(r=> r.ok ? r.json() : null).catch(()=> null);

  window.Auren = { config:C, esc, toast, copy, avatarHTML, statusPill, user:userPromise, stats:statsPromise,
    isAuthReady: ()=> authReady, loginHref, store };
})();
