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
  ticker: ["Bienvenidos a Auren NYC", "Entrada directa, sin whitelist", "Únete al Discord", "Staff 24/7", "Compras VIP por Discord"],
  // Streamers: plataforma "twitch" o "kick" + canal
  streamers: [
    { name: "Streamer1", platform: "twitch", role: "Policía de Auren" },
    { name: "Streamer2", platform: "kick",   role: "Mecánico del bloque" },
    { name: "Streamer3", platform: "twitch", role: "EMS Auren Medical" }
  ],
  // The GOATs: los owners de Auren. La foto, el banner y el nombre salen solos de su Discord
  // (avatar/banner de aquí solo se usan si la web todavía no pudo leer Discord).
  goats: [
    { id: "1270133887372230718", name: "Gandy",       rank: "Owner principal", main: true,
      avatar: "https://cdn.discordapp.com/avatars/1270133887372230718/a_1dc5f56c54cd02906b5b8a0e9f6b3274.gif?size=512" },
    { id: "457432500768210945",  name: "RichDinero",  rank: "Owner", desc: "Ingresos, negocios y progreso del servidor.",
      avatar: "https://cdn.discordapp.com/avatars/457432500768210945/affd2075fc540c95957b2f01357c2e82.png?size=512",
      banner: "https://cdn.discordapp.com/banners/457432500768210945/8892adac035ccee13429d444770a4d24.png?size=1024" },
    { id: "808082230320693338",  name: "MagicBullet", rank: "Owner",
      avatar: "https://cdn.discordapp.com/avatars/808082230320693338/12d17430c040ffc1d925c739e8448606.png?size=512" }
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

  /* ---------- preferencias de lectura (se guardan en este navegador) ---------- */
  const root = document.documentElement;
  const PREFS = {
    text:     { key:"auren_text",     values:["md","lg","xl"], def:"md" },
    font:     { key:"auren_font",     values:["normal","legible"], def:"normal" },
    contrast: { key:"auren_contrast", values:["normal","high"], def:"normal" },
    motion:   { key:"auren_motion",   values:["normal","reduce"], def:"normal" },
    theme:    { key:"auren_theme",    values:["dark","light"], def:"dark" },
    sound:    { key:"auren_sound",    values:["on","off"], def:"on" }
  };
  function loadLegibleFont(){
    if(document.getElementById("legibleFont")) return;
    const l = document.createElement("link");
    l.id = "legibleFont"; l.rel = "stylesheet";
    l.href = "https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible+Next:wght@400;500;600;700&display=swap";
    document.head.appendChild(l);
  }
  function applyPref(name, value){
    const P = PREFS[name];
    if(!P.values.includes(value)) value = P.def;
    if(value === P.def && name !== "contrast") delete root.dataset[name];
    else root.dataset[name] = value;
    if(name === "font" && value === "legible") loadLegibleFont();
    store.set(P.key, value);
    if(name === "theme"){ const m = document.querySelector('meta[name="theme-color"]'); if(m) m.content = value === "light" ? "#eef0f3" : "#06070a"; }
    document.dispatchEvent(new CustomEvent("auren:prefs", {detail:{name, value}}));
  }
  const getPref = name => root.dataset[name] || PREFS[name].def;
  Object.entries(PREFS).forEach(([name,P])=>{
    const v = store.get(P.key);
    if(v && v !== P.def){ root.dataset[name] = v; if(name === "font" && v === "legible") loadLegibleFont(); }
  });
  // Si el sistema pide alto contraste y la persona no eligió nada, lo respetamos
  if(!store.get(PREFS.contrast.key) && matchMedia("(prefers-contrast: more)").matches) root.dataset.contrast = "high";

  /* ---------- efectos de sonido (se generan aquí mismo, sin archivos) ---------- */
  const SFX = (()=>{
    let ctx = null, master = null, gestured = false, lastHover = 0;
    const enabled = () => getPref("sound") !== "off";
    ["pointerdown","keydown","touchstart"].forEach(ev=> addEventListener(ev, ()=>{ gestured = true; }, {capture:true, passive:true}));
    function ac(){
      if(!gestured) return null;
      if(!ctx){ const AC = window.AudioContext || window.webkitAudioContext; if(!AC) return null; ctx = new AC(); master = ctx.createGain(); master.gain.value = .2; master.connect(ctx.destination); }
      if(ctx.state === "suspended") ctx.resume();
      return ctx;
    }
    function tone(o){
      const c = ac(); if(!c) return;
      const { f = 440, f2 = null, t = .08, type = "sine", v = .4, at = 0, a = .006 } = o;
      const now = c.currentTime + at, osc = c.createOscillator(), g = c.createGain();
      osc.type = type; osc.frequency.setValueAtTime(f, now);
      if(f2) osc.frequency.exponentialRampToValueAtTime(f2, now + t);
      g.gain.setValueAtTime(.0001, now); g.gain.exponentialRampToValueAtTime(v, now + a); g.gain.exponentialRampToValueAtTime(.0001, now + t);
      osc.connect(g); g.connect(master); osc.start(now); osc.stop(now + t + .03);
    }
    function noise(o){
      const c = ac(); if(!c) return;
      const { t = .2, v = .25, f = 1000, f2 = null, at = 0 } = o;
      const now = c.currentTime + at, len = Math.ceil(c.sampleRate * t), buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0);
      for(let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      const src = c.createBufferSource(), bp = c.createBiquadFilter(), g = c.createGain();
      src.buffer = buf; bp.type = "bandpass"; bp.Q.value = .9; bp.frequency.setValueAtTime(f, now); if(f2) bp.frequency.exponentialRampToValueAtTime(f2, now + t);
      g.gain.setValueAtTime(.0001, now); g.gain.exponentialRampToValueAtTime(v, now + t * .3); g.gain.exponentialRampToValueAtTime(.0001, now + t);
      src.connect(bp); bp.connect(g); g.connect(master); src.start(now); src.stop(now + t + .02);
    }
    const S = {
      hover:     ()=> tone({ f:2100, t:.025, v:.05 }),
      click:     ()=> tone({ f:620, f2:420, t:.06, type:"triangle", v:.3 }),
      toggleOn:  ()=>{ tone({ f:660, t:.07, v:.28 }); tone({ f:990, t:.1, v:.28, at:.065 }); },
      toggleOff: ()=>{ tone({ f:880, t:.07, v:.25 }); tone({ f:520, t:.1, v:.25, at:.065 }); },
      open:      ()=> tone({ f:420, f2:880, t:.13, v:.28 }),
      close:     ()=> tone({ f:760, f2:360, t:.13, v:.22 }),
      notify:    ()=>{ tone({ f:880, t:.09, v:.22 }); tone({ f:1320, t:.14, v:.18, at:.08 }); },
      chirp:     ()=>{ tone({ f:1100, f2:1700, t:.08, v:.22 }); tone({ f:1400, f2:2200, t:.09, v:.2, at:.1 }); },
      jump:      ()=> tone({ f:260, f2:820, t:.18, type:"sine", v:.3 }),
      land:      ()=> tone({ f:150, f2:70, t:.1, v:.35 }),
      whoosh:    ()=> noise({ t:.28, v:.22, f:500, f2:2400 }),
      catch:     ()=>{ tone({ f:500, f2:900, t:.07, type:"triangle", v:.25 }); },
      blip:      ()=> tone({ f:520 + Math.random() * 420, t:.03, type:"square", v:.035 }),
      step:      ()=>{ tone({ f:740, t:.09, v:.22 }); tone({ f:1110, t:.13, v:.2, at:.07 }); },
      unlock:    ()=>{ [523, 659, 784, 1047].forEach((f, i)=> tone({ f, t:.22, type:"triangle", v:.25, at:i * .09 })); noise({ t:.5, v:.08, f:6000, at:.3 }); },
      pop:       ()=> tone({ f:1000, f2:300, t:.08, v:.28 })
    };
    // sonidos de interfaz: botones, enlaces y tarjetas
    document.addEventListener("click", e=>{
      const el = e.target.closest && e.target.closest("button,a,[role=button]");
      if(!el || el.closest(".gd") || el.hasAttribute("data-nosfx")) return;
      play("click");
    }, true);
    document.addEventListener("pointerover", e=>{
      if(e.pointerType !== "mouse") return;
      const el = e.target.closest && e.target.closest(".btn,.nav-links a,.icon-btn,.link,.stream,.sc,.top,.goat .dc,.gd-link");
      if(!el || (e.relatedTarget && el.contains(e.relatedTarget))) return;
      const n = performance.now(); if(n - lastHover < 70) return; lastHover = n; play("hover");
    }, true);
    function play(name){ if(!enabled() || !S[name]) return; try{ S[name](); }catch(e){} }
    return { play, enabled };
  })();
  window.AurenSFX = SFX;

  // Enlace para saltar directo al contenido (lectores de pantalla y teclado)
  document.body.insertAdjacentHTML("afterbegin", '<a class="skip-link" href="#contenido">Saltar al contenido</a>');
  const mainEl = document.querySelector("main");
  if(mainEl && !mainEl.id){ mainEl.id = "contenido"; mainEl.tabIndex = -1; }

  const ICON = {
    mark:'<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M32 5 L58 58 H45 L32 31 L19 58 H6 Z" fill="currentColor"/><path d="M23 45 H41" stroke="#06070a" stroke-width="4"/></svg>',
    discord:'<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M20.3 4.4A19.8 19.8 0 0 0 15.4 3l-.6 1.3a18.3 18.3 0 0 0-5.5 0L8.6 3a19.7 19.7 0 0 0-4.9 1.4C.6 9.1-.3 13.6.1 18.1a19.9 19.9 0 0 0 6 3l1.3-2a12.9 12.9 0 0 1-2-1l.5-.4a14.2 14.2 0 0 0 12.2 0l.5.4c-.6.4-1.3.7-2 1l1.3 2a19.8 19.8 0 0 0 6-3c.5-5.2-.8-9.7-3.6-13.7ZM8 15.4c-1.2 0-2.2-1.1-2.2-2.4S6.8 10.6 8 10.6s2.2 1.1 2.2 2.4-1 2.4-2.2 2.4Zm8 0c-1.2 0-2.2-1.1-2.2-2.4s1-2.4 2.2-2.4 2.2 1.1 2.2 2.4-1 2.4-2.2 2.4Z"/></svg>',
    menu:'<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true"><path d="M3 7h18M3 12h18M3 17h18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>'
  };
  window.AUREN_ICON = ICON;

  /* ---------- cabecera ---------- */
  const links = [
    ["home#jugar", "index.html#jugar", "Cómo jugar"],
    ["streamers", "streamers.html", "Streamers"],
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
    <div class="quick-btns">
      <button class="icon-btn theme-btn" id="themeBtn" type="button" aria-label="Cambiar a modo blanco" title="Modo blanco / oscuro"><svg class="moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg><svg class="sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4.2"/><path d="M12 2v2.2M12 19.8V22M4.9 4.9l1.6 1.6M17.5 17.5l1.6 1.6M2 12h2.2M19.8 12H22M4.9 19.1l1.6-1.6M17.5 6.5l1.6-1.6"/></svg></button>
      <button class="icon-btn snd-btn" id="sndBtn" type="button" aria-label="Sonidos" aria-pressed="true" title="Activar o quitar los sonidos"><svg class="on" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 5 6 9H2v6h4l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14"/></svg><svg class="off" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 5 6 9H2v6h4l5 4z"/><path d="m22 9-6 6M16 9l6 6"/></svg></button>
    </div>
    <div class="textsize">
      <button class="icon-btn aa" id="aaBtn" aria-label="Opciones de lectura, tema y sonido" aria-expanded="false" aria-controls="aaPop" title="Opciones: lectura, tema y sonido"><span aria-hidden="true">A<b>A</b></span></button>
      <div class="pop" id="aaPop" role="dialog" aria-label="Opciones de lectura, tema y sonido" hidden>
        <p id="sizeLbl">Tamaño de letra</p>
        <div class="seg" role="group" aria-labelledby="sizeLbl">
          <button type="button" data-pref="text" data-val="md">Normal</button><button type="button" data-pref="text" data-val="lg">Grande</button><button type="button" data-pref="text" data-val="xl">Enorme</button>
        </div>
        <p id="themeLbl">Tema</p>
        <div class="seg" role="group" aria-labelledby="themeLbl">
          <button type="button" data-pref="theme" data-val="dark">Oscuro</button><button type="button" data-pref="theme" data-val="light">Blanco</button>
        </div>
        <button type="button" class="opt" data-toggle="sound" data-on="on"><span>Sonidos<small>Efectos al tocar botones y a GandyDev</small></span><span class="sw" aria-hidden="true"></span></button>
        <button type="button" class="opt" data-toggle="font" data-on="legible"><span>Letra fácil de leer<small>Pensada para baja visión</small></span><span class="sw" aria-hidden="true"></span></button>
        <button type="button" class="opt" data-toggle="contrast" data-on="high"><span>Alto contraste<small>Fondo negro y texto blanco</small></span><span class="sw" aria-hidden="true"></span></button>
        <button type="button" class="opt" data-toggle="motion" data-on="reduce"><span>Menos movimiento<small>Detiene la ciudad animada</small></span><span class="sw" aria-hidden="true"></span></button>
      </div>
    </div>
    <div class="auth" id="authSlot"></div>
    <button class="icon-btn menu-btn" id="menuBtn" aria-label="Abrir menú" aria-expanded="false" aria-controls="navLinks">${ICON.menu}</button>`;

  const navLinks = document.getElementById("navLinks"), menuBtn = document.getElementById("menuBtn");
  menuBtn.addEventListener("click", ()=>{ const o = navLinks.classList.toggle("open"); menuBtn.setAttribute("aria-expanded", o); });
  navLinks.querySelectorAll("a").forEach(a=>a.addEventListener("click", ()=>{ navLinks.classList.remove("open"); menuBtn.setAttribute("aria-expanded", false); }));

  // opciones de lectura
  const aaBtn = document.getElementById("aaBtn"), aaPop = document.getElementById("aaPop");
  function markPrefs(){
    aaPop.querySelectorAll("[data-pref]").forEach(b=> b.setAttribute("aria-pressed", getPref(b.dataset.pref) === b.dataset.val));
    aaPop.querySelectorAll("[data-toggle]").forEach(b=> b.setAttribute("aria-pressed", getPref(b.dataset.toggle) === b.dataset.on));
  }
  markPrefs();
  const closePop = ()=>{ aaPop.hidden = true; aaBtn.setAttribute("aria-expanded", false); };
  aaBtn.addEventListener("click", e=>{ e.stopPropagation(); aaPop.hidden = !aaPop.hidden; aaBtn.setAttribute("aria-expanded", !aaPop.hidden); if(!aaPop.hidden) aaPop.querySelector("button").focus(); });
  aaPop.addEventListener("click", e=>{
    e.stopPropagation();
    const b = e.target.closest("[data-pref],[data-toggle]"); if(!b) return;
    if(b.dataset.pref) applyPref(b.dataset.pref, b.dataset.val);
    else { const n = b.dataset.toggle; applyPref(n, getPref(n) === b.dataset.on ? PREFS[n].values.find(v=> v !== b.dataset.on) : b.dataset.on); }
    markPrefs();
    if(b.dataset.toggle) SFX.play(b.getAttribute("aria-pressed") === "true" ? "toggleOn" : "toggleOff");
  });
  // botones rápidos de tema y sonido
  const themeBtn = document.getElementById("themeBtn"), sndBtn = document.getElementById("sndBtn");
  function markQuick(){
    themeBtn.setAttribute("aria-label", getPref("theme") === "light" ? "Cambiar a modo oscuro" : "Cambiar a modo blanco");
    sndBtn.setAttribute("aria-pressed", getPref("sound") === "on");
  }
  markQuick();
  document.addEventListener("auren:prefs", ()=>{ markQuick(); markPrefs(); });
  themeBtn.addEventListener("click", ()=>{ applyPref("theme", getPref("theme") === "light" ? "dark" : "light"); SFX.play("toggleOn"); });
  sndBtn.addEventListener("click", ()=>{ const on = getPref("sound") !== "on"; applyPref("sound", on ? "on" : "off"); if(on) SFX.play("toggleOn"); });
  aaPop.addEventListener("keydown", e=>{ if(e.key === "Escape"){ closePop(); aaBtn.focus(); } });
  document.addEventListener("click", closePop);

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
          <li><a href="streamers.html">Streamers</a></li>
          <li><a href="normativas.html">Normativas</a></li>
          <li><a href="#" data-connect>Conectar</a></li></ul></div>
        <div class="foot-col"><h4>Cuenta</h4><ul>
          <li><a href="/api/auth/login" data-auth="login">Iniciar sesión</a></li>
          <li><a href="panel.html">Mi cuenta</a></li>
          <li><a href="staff.html">Panel del staff</a></li>
          <li><a href="streamers.html#gestionar">Gestionar streamers</a></li>
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
  function toast(msg){ SFX.play("notify"); toastEl.textContent = msg; toastEl.hidden = false; clearTimeout(tt); tt = setTimeout(()=> toastEl.hidden = true, 5500); }

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
        <a href="panel.html">Mi cuenta</a>
        <a href="staff.html">Panel del staff</a>
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

  window.Auren = { config:C, esc, toast, copy, avatarHTML, statusPill, user:userPromise, stats:statsPromise, getPref,
    isAuthReady: ()=> authReady, loginHref, store };

  // GandyDev, el asistente que camina por la web
  if(!document.querySelector('script[src$="gandy.js"]')){
    const gs = document.createElement("script"); gs.src = "assets/gandy.js"; gs.defer = true; document.body.appendChild(gs);
  }
})();
