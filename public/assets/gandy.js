/* =========================================================
   GandyDev — el asistente de Auren RP
   - Camina por la parte de abajo de la web.
   - Al tocarlo abre un chat: responde sobre las reglas y la ayuda,
     y encuentra accesos directos de la web.
   - Usa la IA gratis de Cloudflare (/api/gandy). Si no está
     disponible, responde con su propia búsqueda.
   ========================================================= */
(function(){
  if(window.__gandy) return; window.__gandy = true;
  const A = window.Auren || {}, C = window.AUREN_CONFIG || {};
  const esc = A.esc || (s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])));
  const root = document.documentElement;
  const still = () => matchMedia("(prefers-reduced-motion: reduce)").matches || root.dataset.motion === "reduce" || root.dataset.contrast === "high";

  /* ---------- estilos ---------- */
  const css = `
  .gd{position:fixed;z-index:45;left:0;top:0;width:64px;height:84px;padding:0;border:0;background:none;cursor:grab;touch-action:none;user-select:none;-webkit-user-select:none;-webkit-tap-highlight-color:transparent;transform:translate3d(var(--x,0px),var(--y,0px),0);will-change:transform}
  .gd.drag{cursor:grabbing}
  .gd svg{width:100%;height:100%;overflow:visible;filter:drop-shadow(0 6px 12px rgba(0,0,0,.6));pointer-events:none}
  .gd .sq{transform-origin:32px 82px;transition:transform .12s ease-out}
  .gd.crouch .sq{transform:scale(1.14,.82)}
  .gd.land .sq{transform:scale(1.2,.78)}
  .gd.air .sq{transform:scale(.92,1.1)}
  .gd .spin{transform-origin:32px 46px}
  .gd.spinning .spin{animation:gdSpin .7s cubic-bezier(.3,.7,.3,1)}
  .gd.flipping .spin{animation:gdFlip .75s cubic-bezier(.35,.6,.3,1)}
  .gd .flip{transform-origin:32px 42px;transition:transform .2s}
  .gd.left .flip{transform:scaleX(-1)}
  .gd .legL,.gd .legR,.gd .armL,.gd .armR{transform-box:fill-box;transform-origin:top center;transition:transform .15s}
  .gd .eye,.gd .mouth{transform-box:fill-box;transform-origin:center}
  .gd .eyes{transform:translate(var(--ex,0px),var(--ey,0px));transition:transform .15s}
  .gd .heyes,.gd .zz{opacity:0;transition:opacity .15s}
  .gd .eye{animation:gdBlink 4.5s infinite}
  .gd .light{animation:gdLight 2s infinite}
  .gd.walk .legL{animation:gdLeg .5s infinite ease-in-out}
  .gd.walk .legR{animation:gdLeg .5s infinite ease-in-out reverse}
  .gd.walk .armL{animation:gdArm .5s infinite ease-in-out reverse}
  .gd.walk .armR{animation:gdArm .5s infinite ease-in-out}
  .gd.walk .bodyg{animation:gdBob .25s infinite alternate ease-in-out}
  .gd.run .legL,.gd.run .legR,.gd.run .armL,.gd.run .armR{animation-duration:.26s}
  .gd.air .legL{transform:rotate(28deg)} .gd.air .legR{transform:rotate(-28deg)}
  .gd.air .armL{transform:rotate(150deg)} .gd.air .armR{transform:rotate(-150deg)}
  .gd.drag .legL{animation:gdDangle .5s infinite alternate ease-in-out}
  .gd.drag .legR{animation:gdDangle .5s infinite alternate-reverse ease-in-out}
  .gd.drag .armL{transform:rotate(160deg)} .gd.drag .armR{transform:rotate(-160deg)}
  .gd.dance .bodyg{transform-box:fill-box;transform-origin:bottom center;animation:gdSway .45s infinite alternate ease-in-out}
  .gd.dance .armL{animation:gdUpL .45s infinite alternate ease-in-out}
  .gd.dance .armR{animation:gdUpR .45s infinite alternate-reverse ease-in-out}
  .gd.dance .legL{animation:gdLeg .45s infinite ease-in-out}
  .gd.dance .legR{animation:gdLeg .45s infinite ease-in-out reverse}
  .gd.wave .armR{animation:gdWave .4s 4 ease-in-out}
  .gd.look .eyes{animation:gdLook 2.4s ease-in-out}
  .gd.happy .eyes{opacity:0} .gd.happy .heyes{opacity:1}
  .gd.sleep .eye{animation:none;transform:scaleY(.12)}
  .gd.sleep .zz{opacity:1} .gd.sleep .zz text{animation:gdZ 2s infinite} .gd.sleep .zz text+text{animation-delay:1s}
  .gd.sleep .bodyg{animation:gdBreath 2.4s infinite ease-in-out}
  .gd.talk .mouth,.gd-head .av.talk .mouth{animation:gdTalk .14s infinite alternate}
  .gd:focus-visible{outline:3px solid var(--focus,#ffd76a);outline-offset:4px;border-radius:14px}
  @keyframes gdLeg{0%,100%{transform:rotate(18deg)}50%{transform:rotate(-18deg)}}
  @keyframes gdArm{0%,100%{transform:rotate(16deg)}50%{transform:rotate(-16deg)}}
  @keyframes gdBob{to{transform:translateY(-2px)}}
  @keyframes gdBlink{0%,92%,100%{transform:scaleY(1)}95%{transform:scaleY(.1)}}
  @keyframes gdWave{0%,100%{transform:rotate(0)}50%{transform:rotate(-140deg)}}
  @keyframes gdLight{50%{opacity:.35}}
  @keyframes gdSpin{to{transform:rotateY(360deg)}}
  @keyframes gdFlip{0%{transform:translateY(0) rotate(0)}50%{transform:translateY(-34px) rotate(-180deg)}100%{transform:translateY(0) rotate(-360deg)}}
  @keyframes gdDangle{from{transform:rotate(14deg)}to{transform:rotate(-14deg)}}
  @keyframes gdSway{from{transform:rotate(-9deg) translateY(0)}to{transform:rotate(9deg) translateY(-3px)}}
  @keyframes gdUpL{from{transform:rotate(130deg)}to{transform:rotate(175deg)}}
  @keyframes gdUpR{from{transform:rotate(-130deg)}to{transform:rotate(-175deg)}}
  @keyframes gdLook{0%,100%{transform:translate(0,0)}25%{transform:translate(-3px,-1px)}65%{transform:translate(3px,-1px)}}
  @keyframes gdZ{0%{opacity:0;transform:translate(0,4px)}30%{opacity:1}100%{opacity:0;transform:translate(6px,-10px)}}
  @keyframes gdBreath{50%{transform:translateY(1.5px)}}
  @keyframes gdTalk{from{transform:scaleY(1) scaleX(1)}to{transform:scaleY(3.2) scaleX(.8)}}
  .gd-bubble{position:fixed;z-index:46;left:0;top:0;max-width:250px;padding:10px 14px;border-radius:14px;background:#f3f4f6;color:#0a0b0e;font:500 .95rem/1.4 var(--font,system-ui);box-shadow:0 12px 30px -8px rgba(0,0,0,.7);pointer-events:none;transform:translate3d(var(--bx,0px),var(--by,0px),0);opacity:0;transition:opacity .18s}
  .gd-bubble.on{opacity:1}
  .gd-bubble::after{content:"";position:absolute;left:var(--tail,50%);bottom:-6px;width:12px;height:12px;background:#f3f4f6;transform:translateX(-50%) rotate(45deg);border-radius:2px}
  .gd-fx{position:fixed;z-index:46;left:0;top:0;pointer-events:none;font:700 18px/1 system-ui;color:#ffd76a;text-shadow:0 2px 8px rgba(0,0,0,.6);animation:gdFx 1.1s ease-out forwards}
  @keyframes gdFx{from{opacity:1;transform:translate(var(--fx0),var(--fy0)) scale(.6)}to{opacity:0;transform:translate(calc(var(--fx0) + var(--dx)),calc(var(--fy0) - 70px)) scale(1.3) rotate(var(--rot))}}
  .gd-panel{position:fixed;z-index:70;padding:0;margin:0;right:max(16px, env(safe-area-inset-right,0px));bottom:calc(104px + env(safe-area-inset-bottom,0px));width:min(410px,calc(100% - 32px));height:min(580px,calc(100vh - 140px));display:flex;flex-direction:column;border-radius:20px;background:#0d1016;border:1px solid var(--line-2,rgba(255,255,255,.22));box-shadow:0 30px 70px -15px rgba(0,0,0,.9);color:var(--ink,#f3f4f6);font-family:var(--font,system-ui);overflow:hidden}
  .gd-head{display:flex;align-items:center;gap:12px;padding:14px 14px 14px 16px;border-bottom:1px solid var(--line,rgba(255,255,255,.11))}
  .gd-head .av{width:40px;height:40px;border-radius:12px;background:#1b1f27;display:grid;place-items:center;flex:none}
  .gd-head .av svg{width:30px;height:38px}
  .gd-head b{display:block;font-size:1.02rem}
  .gd-head small{color:var(--muted,#a7aebb);font-size:.84rem}
  .gd-head button{margin-left:auto;width:40px;height:40px;border-radius:10px;border:1px solid var(--line,rgba(255,255,255,.11));background:transparent;color:inherit;cursor:pointer;display:grid;place-items:center}
  .gd-head,.gd-chips,.gd-form{flex:none}
  .gd-msgs{flex:1 1 auto;min-height:0;overflow:auto;overscroll-behavior:contain;padding:16px;display:flex;flex-direction:column;gap:12px}
  .gd-m{max-width:88%;padding:11px 14px;border-radius:16px;font-size:.98rem;line-height:1.55;overflow-wrap:anywhere}
  .gd-m.bot{background:rgba(255,255,255,.06);border:1px solid var(--line,rgba(255,255,255,.11));border-top-left-radius:6px;align-self:flex-start}
  .gd-m.me{background:#f3f4f6;color:#0a0b0e;border-top-right-radius:6px;align-self:flex-end}
  .gd-m a{color:inherit;text-decoration:underline;text-underline-offset:3px}
  .gd-m ul{padding-left:18px;margin-top:4px}
  .gd-m .code{display:inline-block;font-size:.84em;font-weight:600;padding:0 7px;border-radius:999px;border:1px solid var(--line-2,rgba(255,255,255,.3));text-decoration:none;margin:0 1px}
  .gd-links{display:grid;gap:8px;margin-top:10px}
  .gd-link{display:grid;gap:2px;padding:10px 12px;border-radius:12px;border:1px solid var(--line-2,rgba(255,255,255,.22));background:rgba(0,0,0,.25);color:inherit;text-decoration:none!important;text-align:left;cursor:pointer;font:inherit}
  .gd-link:hover{background:rgba(255,255,255,.08)}
  .gd-link b{font-size:.95rem}
  .gd-link span{color:var(--soft,#d6dae1);font-size:.86rem}
  .gd-src{margin-top:8px;font-size:.84rem;color:var(--muted,#a7aebb)}
  .gd-chips{display:flex;gap:8px;overflow-x:auto;padding:0 16px 10px}
  .gd-chips button{flex:none;min-height:36px;padding:0 12px;border-radius:999px;border:1px solid var(--line-2,rgba(255,255,255,.22));background:rgba(255,255,255,.04);color:inherit;cursor:pointer;font:inherit;font-size:.88rem;white-space:nowrap}
  .gd-form{display:flex;gap:8px;padding:12px;border-top:1px solid var(--line,rgba(255,255,255,.11))}
  .gd-form input{flex:1;min-width:0;height:46px;padding:0 14px;border-radius:12px;border:1px solid var(--line-2,rgba(255,255,255,.22));background:rgba(0,0,0,.35);color:inherit;font:inherit;font-size:1rem}
  .gd-form input:focus{outline:none;border-color:rgba(255,255,255,.5)}
  .gd-form button{height:46px;padding:0 16px;border-radius:12px;border:0;background:#f3f4f6;color:#0a0b0e;font:inherit;font-weight:600;cursor:pointer}
  .gd-typing{display:inline-flex;gap:4px}
  .gd-typing i{width:6px;height:6px;border-radius:50%;background:currentColor;opacity:.4;animation:gdDot 1s infinite}
  .gd-typing i:nth-child(2){animation-delay:.15s}.gd-typing i:nth-child(3){animation-delay:.3s}
  @keyframes gdDot{50%{opacity:1}}
  html[data-contrast="high"] .gd-panel{background:#000;border-color:#fff}
  @media (max-width:560px){ .gd{width:54px;height:72px} .gd-panel{bottom:calc(90px + env(safe-area-inset-bottom,0px));height:min(560px,calc(100vh - 120px))} }
    html[data-motion="reduce"] .gd *, html[data-contrast="high"] .gd *, html[data-motion="reduce"] .gd-head .av *{animation:none!important;transition:none!important}
  `;
  const st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);

  /* ---------- el muñequito (diseño propio) ---------- */
  const BOT = () => `<svg viewBox="0 0 64 84" aria-hidden="true"><g class="sq"><g class="spin"><g class="flip">
    <g class="legL"><rect x="22" y="62" width="7" height="16" rx="3.5" fill="#2b313c"/><rect x="20" y="75" width="11" height="6" rx="3" fill="#f3f4f6"/></g>
    <g class="legR"><rect x="35" y="62" width="7" height="16" rx="3.5" fill="#2b313c"/><rect x="33" y="75" width="11" height="6" rx="3" fill="#f3f4f6"/></g>
    <g class="bodyg">
      <g class="armL"><rect x="11" y="45" width="6" height="15" rx="3" fill="#2b313c"/></g>
      <g class="armR"><rect x="47" y="45" width="6" height="15" rx="3" fill="#2b313c"/></g>
      <rect x="17" y="43" width="30" height="22" rx="9" fill="#1b1f27" stroke="#3a414e" stroke-width="1.5"/>
      <text x="32" y="58" text-anchor="middle" font-family="system-ui,sans-serif" font-size="9" font-weight="700" fill="#f3f4f6">GD</text>
      <line x1="32" y1="8" x2="32" y2="14" stroke="#3a414e" stroke-width="2"/>
      <circle class="light" cx="32" cy="7" r="3" fill="#4ade80"/>
      <rect x="10" y="13" width="44" height="32" rx="12" fill="#1b1f27" stroke="#3a414e" stroke-width="1.5"/>
      <path d="M12 21c2-7 9-10 20-10s18 3 20 10z" fill="#f3f4f6"/>
      <path d="M9 21h12v4H11a2 2 0 0 1-2-2z" fill="#f3f4f6"/>
      <rect x="15" y="23" width="34" height="17" rx="7" fill="#06070a"/>
      <g class="eyes"><rect class="eye" x="22" y="27" width="6" height="9" rx="3" fill="#7af0b4"/><rect class="eye" x="36" y="27" width="6" height="9" rx="3" fill="#7af0b4"/></g>
      <g class="heyes" fill="none" stroke="#7af0b4" stroke-width="2.4" stroke-linecap="round"><path d="M21.5 33.5l3.5-4 3.5 4"/><path d="M35.5 33.5l3.5-4 3.5 4"/></g>
      <rect class="mouth" x="29" y="37" width="6" height="1.6" rx=".8" fill="#7af0b4"/>
    </g></g></g>
    <g class="zz" font-family="system-ui,sans-serif" font-weight="700" fill="#d6dae1"><text x="50" y="10" font-size="10">z</text><text x="57" y="2" font-size="7">z</text></g>
  </g></svg>`;

  const gd = document.createElement("button");
  gd.className = "gd"; gd.type = "button";
  gd.setAttribute("aria-label", "Abrir a GandyDev, el asistente de Auren");
  gd.setAttribute("aria-expanded", "false");
  gd.title = "GandyDev · tócame o arrástrame";
  gd.innerHTML = BOT();
  document.body.appendChild(gd);

  /* ---------- frases ---------- */
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const R = Math.random;
  const LINES = {
    hi: ["¡Klk! Soy GandyDev. ¿En qué te ayudo?", "¡Hey! Dime, ¿qué buscas?", "¡Wepa! Pregúntame lo que quieras.", "¡Epa! Aquí estoy. ¿Qué necesitas?"],
    bye: ["¡Aquí sigo si me necesitas!", "¡Dale, nos vemos!", "Me voy a dar una vueltita."],
    drop: ["¡Wiiii!", "¡Epa, cuidado!", "¡Ay, que me mareo!", "¡Otra vez, otra vez!"],
    wake: ["¡Ah! Estaba descansando los ojos…", "¿Eh? ¡Estoy despierto, estoy despierto!"],
    jump: ["¡Wepa, qué salto!", "¡Arriba!", "Desde aquí se ve toda la ciudad."],
    idle: ["Klk, ¿todo bien por ahí?", "Si te pierdes, tócame y te llevo.", "Me sé todas las normativas. Pregúntame.",
      `¿Ya te conectaste? F8 y connect cfx.re/join/${C.cfxCode || "lee9965"}`, "Dando una vueltita por la web…",
      "Ojo con los robos de día, ¿eh?", "¿Viste quién está en directo? Mira Streamers.", "Puedes arrastrarme, no muerdo."]
  };

  /* ---------- bocadillo que habla letra a letra ---------- */
  let bubble = null, bubbleTimer = 0, speaking = 0;
  function talk(on){
    speaking = Math.max(0, speaking + (on ? 1 : -1));
    gd.classList.toggle("talk", speaking > 0);
    if(panel) panel.querySelector(".gd-head .av")?.classList.toggle("talk", speaking > 0);
  }
  function say(text, ms){
    if(!bubble){ bubble = document.createElement("div"); bubble.className = "gd-bubble"; bubble.setAttribute("aria-hidden", "true"); document.body.appendChild(bubble); }
    clearTimeout(bubbleTimer); clearInterval(bubble._t); if(bubble._talk){ talk(false); bubble._talk = false; }
    bubble.textContent = ""; bubble.classList.add("on");
    if(still()){ bubble.textContent = text; }
    else {
      let i = 0; talk(true); bubble._talk = true;
      bubble._t = setInterval(()=>{ i += 1; bubble.textContent = text.slice(0, i); if(i >= text.length){ clearInterval(bubble._t); talk(false); bubble._talk = false; } }, 34);
    }
    placeBubble();
    bubbleTimer = setTimeout(()=> bubble.classList.remove("on"), (ms || 2600) + text.length * 34);
  }
  function placeBubble(){
    if(!bubble || !bubble.classList.contains("on")) return;
    const bw = bubble.offsetWidth, bh = bubble.offsetHeight, w = gd.offsetWidth;
    const bx = Math.max(8, Math.min(x + w/2 - bw/2, innerWidth - bw - 8));
    const by = Math.max(8, y - bh - 10);
    bubble.style.setProperty("--bx", bx + "px"); bubble.style.setProperty("--by", by + "px");
    bubble.style.setProperty("--tail", Math.max(14, Math.min(bw - 14, x + w/2 - bx)) + "px");
  }
  function burst(chars = "✦♥★✦"){
    if(still()) return;
    const cx = x + gd.offsetWidth/2, cy = y + 10;
    [...chars].forEach((c, i)=>{
      const f = document.createElement("span"); f.className = "gd-fx"; f.textContent = c; f.setAttribute("aria-hidden", "true");
      f.style.setProperty("--fx0", (cx - 8 + (i - chars.length/2) * 10) + "px"); f.style.setProperty("--fy0", cy + "px");
      f.style.setProperty("--dx", ((R() - .5) * 90) + "px"); f.style.setProperty("--rot", ((R() - .5) * 90) + "deg");
      f.style.animationDelay = (i * 60) + "ms"; if(c === "♥") f.style.color = "#ff6b8a";
      document.body.appendChild(f); setTimeout(()=> f.remove(), 1400 + i * 60);
    });
  }

  /* ---------- se mueve, salta y juega por la web ---------- */
  const G = 2300;
  let x = innerWidth - 100, y = innerHeight - 94, vx = 0, vy = 0, mode = "ground", dir = -1;
  let plat = null, platDX = 0, target = null, prep = null, open = false, hold = false;
  let last = performance.now(), pauseUntil = last + 1500, nextAct = last + 5000 + R() * 4000, platUntil = 0;
  let act = null, actUntil = 0, face = null, faceUntil = 0, landUntil = 0, lastTouch = last;
  const W = () => gd.offsetWidth || 64, H = () => gd.offsetHeight || 84;
  const groundY = () => innerHeight - H() - 10;
  function groundBounds(){
    const radio = document.getElementById("radio");
    const minX = radio && radio.offsetParent ? Math.min(radio.getBoundingClientRect().right + 16, innerWidth - 120) : 16;
    return [Math.max(16, minX), innerWidth - W() - 16];
  }
  const PLAT_SEL = ".card,.sx-stat,.stream,.top,.sc,.spot,.feat,.step,.btn-primary,.btn-ghost,.pill,.acard,.qk,.goat,.rule,.faq-item,.cta,.sec-head h2,.page-head h1";
  function rectOk(el){
    if(!el || !el.isConnected || el.closest(".gd-panel,dialog,[hidden],.tour")) return null;
    const r = el.getBoundingClientRect();
    if(r.width < 80 || r.height < 18 || r.top < 96 || r.top > innerHeight - H() - 40 || r.left < 4 || r.right > innerWidth - 4) return null;
    const cs = getComputedStyle(el); if(cs.visibility === "hidden" || cs.display === "none" || +cs.opacity < .2) return null;
    return r;
  }
  function findPlatform(){
    const all = [...document.querySelectorAll(PLAT_SEL)].filter(el=> el !== plat && rectOk(el));
    if(!all.length) return null;
    const near = all.filter(el=>{ const r = el.getBoundingClientRect(); return Math.abs(r.left + r.width/2 - x) < innerWidth * .55; });
    return pick(near.length ? near : all);
  }
  function setAct(name, ms){ act = name; actUntil = performance.now() + ms; }
  function setFace(name, ms){ face = name; faceUntil = performance.now() + ms; }
  function jumpTo(tx, ty, el, opts = {}){
    const peak = Math.max(14, Math.min(y, ty) - (opts.h || (60 + R() * 90)));
    const up = Math.max(10, y - peak), down = Math.max(10, ty - peak);
    const v0 = Math.sqrt(2 * G * up), T = v0 / G + Math.sqrt(2 * down / G);
    prep = { at: performance.now() + (opts.now ? 0 : 150), vx: (tx - x) / T, vy: -v0, el };
    dir = tx >= x ? 1 : -1; act = null;
  }
  function hop(h = 320){ if(mode === "ground" || mode === "plat"){ jumpTo(x, y, mode === "plat" ? plat : null, { h:h * .25, now:true }); } }
  function fall(){ mode = "air"; vx = 0; vy = 0; target = null; plat = null; }
  function landed(now){ vx = 0; vy = 0; target = null; landUntil = now + 170; pauseUntil = now + 400 + R() * 900; }
  function randomAction(now){
    if(R() < .5 && prep == null){
      const el = findPlatform();
      if(el){ const r = el.getBoundingClientRect(), w = W();
        const tx = r.width < w + 8 ? r.left + (r.width - w)/2 : Math.max(r.left + 4, Math.min(r.right - w - 4, x + (R() - .5) * 300));
        jumpTo(tx, r.top - H() + 2, el); return; }
    }
    const idleLong = now - lastTouch > 70000;
    const r = R();
    if(idleLong && r < .18){ setAct("sleep", 9000 + R() * 6000); return; }
    if(r < .22) setAct("dance", 2600 + R() * 1800);
    else if(r < .34){ setAct("spinning", 700); }
    else if(r < .44){ setAct("flipping", 750); }
    else if(r < .58){ setAct("look", 2400); }
    else if(r < .66){ setAct("wave", 1700); }
    else if(r < .80){ hop(); }
    else if(!bubble || !bubble.classList.contains("on")) say(pick(LINES.idle));
  }
  function stepGround(now, dt){
    const [minX, maxX] = groundBounds();
    y = groundY();
    if(open || hold){
      const goal = maxX;
      if(Math.abs(x - goal) > 3){ dir = goal > x ? 1 : -1; x += dir * Math.min(220 * dt, Math.abs(goal - x)); gd.classList.add("walk", "run"); }
      else { x = goal; dir = -1; gd.classList.remove("walk", "run"); }
      return;
    }
    gd.classList.remove("run");
    if(act || now < pauseUntil || now < landUntil){ gd.classList.remove("walk"); }
    else {
      gd.classList.add("walk");
      if(x < minX - 2) dir = 1;
      x += dir * 44 * dt;
      if(x <= minX && dir < 0){ x = minX; dir = 1; pauseUntil = now + 1200 + R() * 3000; }
      if(x >= maxX){ x = maxX; dir = -1; pauseUntil = now + 1200 + R() * 3000; }
      if(R() < dt * .1) pauseUntil = now + 1000 + R() * 2500;
    }
    if(!act && now > nextAct){ nextAct = now + 4500 + R() * 6500; randomAction(now); }
  }
  function stepPlat(now, dt){
    const r = rectOk(plat);
    if(!r || open || hold){ fall(); return; }
    const w = W(), room = r.width - w - 8;
    if(!act && now > pauseUntil && room > 30){
      gd.classList.add("walk");
      platDX += dir * 36 * dt;
      if(platDX <= 4){ platDX = 4; dir = 1; pauseUntil = now + 900 + R() * 2000; }
      if(platDX >= room){ platDX = room; dir = -1; pauseUntil = now + 900 + R() * 2000; }
    } else gd.classList.remove("walk");
    platDX = Math.max(4, Math.min(Math.max(4, room), platDX));
    x = r.left + platDX; y = r.top - H() + 2;
    if(!act && now > platUntil){
      platUntil = now + 3000 + R() * 5000;
      const c = R();
      if(c < .3) setAct(pick(["dance", "look", "wave", "spinning"]), 2000);
      else if(c < .65){ const el = findPlatform(); if(el){ const q = el.getBoundingClientRect(); jumpTo(Math.max(q.left + 4, Math.min(q.right - w - 4, q.left + R() * (q.width - w))), q.top - H() + 2, el); } else jumpDown(); }
      else jumpDown();
    }
  }
  function jumpDown(){ const [minX, maxX] = groundBounds(); jumpTo(Math.max(minX, Math.min(maxX, x + (R() - .5) * 260)), groundY(), null, { h:40 + R() * 50 }); }
  function stepAir(now, dt){
    vy += G * dt; x += vx * dt; y += vy * dt;
    const w = W();
    if(x < 6){ x = 6; vx = Math.abs(vx) * .5; dir = 1; }
    if(x > innerWidth - w - 6){ x = innerWidth - w - 6; vx = -Math.abs(vx) * .5; dir = -1; }
    if(target && vy > 0){
      const r = rectOk(target);
      if(r){ const ty = r.top - H() + 2, cx = x + w/2;
        if(y >= ty && y - vy * dt <= ty + 6 && cx >= r.left && cx <= r.right){
          y = ty; plat = target; platDX = x - r.left; mode = "plat"; platUntil = now + 3500 + R() * 6000; landed(now);
          if(R() < .25 && !open && now - lastTouch > 4000) say(pick(LINES.jump));
          return; } }
    }
    if(y >= groundY()){ y = groundY(); mode = "ground"; plat = null; landed(now); }
  }
  function frame(now){
    const dt = Math.min((now - last) / 1000, .04); last = now;
    if(still()){
      mode = "ground"; prep = null; act = null; y = groundY(); x = groundBounds()[1]; dir = -1;
      gd.className = "gd" + (gd.classList.contains("talk") ? " talk" : "");
    } else {
      if(prep && now >= prep.at && mode !== "drag"){
        vx = prep.vx; vy = prep.vy; target = prep.el; plat = null; mode = "air"; prep = null;
      }
      if(act && now > actUntil){ if(act === "sleep" && !open) {} act = null; }
      if(face && now > faceUntil) face = null;
      if(pressed && mode !== "drag"){ /* quieto mientras lo tocas */ }
      else if(mode === "air") stepAir(now, dt);
      else if(mode === "plat") stepPlat(now, dt);
      else if(mode === "ground") stepGround(now, dt);
      const cl = gd.classList;
      cl.toggle("air", mode === "air" || mode === "drag");
      cl.toggle("crouch", !!prep);
      cl.toggle("land", now < landUntil);
      cl.toggle("left", dir < 0);
      cl.toggle("drag", mode === "drag");
      ["dance", "spinning", "flipping", "look", "wave", "sleep"].forEach(n=> cl.toggle(n, act === n));
      cl.toggle("happy", face === "happy");
      if(mode !== "ground" && mode !== "plat") cl.remove("walk");
      if(act) cl.remove("walk");
    }
    gd.style.setProperty("--x", Math.round(x) + "px");
    gd.style.setProperty("--y", Math.round(y) + "px");
    placeBubble();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  // los ojos siguen al cursor
  let eyeRaf = 0;
  addEventListener("pointermove", e=>{
    if(eyeRaf) return;
    eyeRaf = requestAnimationFrame(()=>{
      eyeRaf = 0;
      const dx = e.clientX - (x + W()/2), dy = e.clientY - (y + 30);
      const k = Math.max(1, Math.hypot(dx, dy) / 3);
      gd.style.setProperty("--ex", (Math.max(-3, Math.min(3, dx / k)) * (dir < 0 ? -1 : 1)).toFixed(1) + "px");
      gd.style.setProperty("--ey", Math.max(-2, Math.min(2, dy / k)).toFixed(1) + "px");
    });
  }, { passive:true });
  addEventListener("resize", ()=>{ if(mode === "ground") y = groundY(); x = Math.min(x, innerWidth - W() - 6); });

  // arrastrar, atrapar y lanzar (si lo tocas en el aire, lo atrapas)
  let down = null, suppressClick = false, pressed = false;
  gd.addEventListener("pointerdown", e=>{
    if(e.button > 0) return;
    down = { px:e.clientX, py:e.clientY, ox:e.clientX - x, oy:e.clientY - y, hist:[{x:e.clientX, y:e.clientY, t:performance.now()}] };
    try{ gd.setPointerCapture(e.pointerId); }catch{}
    if(still()) return;
    pressed = true; prep = null;
    if(mode === "air"){ mode = "drag"; lastTouch = performance.now(); }
  });
  gd.addEventListener("pointermove", e=>{
    if(!down || still()) return;
    if(mode !== "drag" && Math.hypot(e.clientX - down.px, e.clientY - down.py) > 7){
      mode = "drag"; prep = null; act = null; plat = null; target = null; lastTouch = performance.now();
    }
    if(mode === "drag"){
      x = Math.max(0, Math.min(innerWidth - W(), e.clientX - down.ox)); y = Math.max(0, Math.min(groundY(), e.clientY - down.oy));
      down.hist.push({x:e.clientX, y:e.clientY, t:performance.now()}); if(down.hist.length > 6) down.hist.shift();
    }
  });
  function endDrag(e){
    if(!down) return;
    const wasDrag = mode === "drag", moved = Math.hypot((e?.clientX ?? down.px) - down.px, (e?.clientY ?? down.py) - down.py) > 7;
    pressed = false;
    if(wasDrag){
      const h = down.hist, a = h[0], b = h[h.length - 1], dt = Math.max(16, b.t - a.t) / 1000;
      vx = moved ? Math.max(-1500, Math.min(1500, (b.x - a.x) / dt)) : 0; vy = moved ? Math.max(-1500, Math.min(1200, (b.y - a.y) / dt)) : 0;
      mode = "air"; target = null;
      if(moved){ say(pick(LINES.drop), 1400); setFace("happy", 1500); }
    }
    down = null;
    if(e && e.type === "pointerup" && !moved){ suppressClick = true; setTimeout(()=> suppressClick = false, 400); activate(); }
    else if(moved){ suppressClick = true; setTimeout(()=> suppressClick = false, 400); }
  }
  gd.addEventListener("pointerup", endDrag);
  gd.addEventListener("pointercancel", endDrag);

  function greet(){
    lastTouch = performance.now();
    if(act === "sleep"){ act = null; say(pick(LINES.wake)); setFace("happy", 1200); return; }
    setFace("happy", 1600);
    if(!still()){ hop(380); setTimeout(()=> setAct("wave", 1600), 420); burst(); }
    say(pick(LINES.hi));
  }

  // saludo una vez por visita
  let bubbleShown = false;
  try{ bubbleShown = sessionStorage.getItem("gd_hi") === "1"; }catch{}
  if(!bubbleShown) setTimeout(()=>{
    if(open || hold) return;
    setAct("wave", 1700); setFace("happy", 1700);
    say("¡Hola! Soy GandyDev. Tócame si tienes dudas de las reglas, o arrástrame por la pantalla.", 4500);
    try{ sessionStorage.setItem("gd_hi", "1"); }catch{}
  }, 7000);

  /* ---------- datos para buscar ---------- */
  function loadScript(src){ return new Promise(res=>{ const s = document.createElement("script"); s.src = src; s.onload = res; s.onerror = res; document.head.appendChild(s); }); }
  let index = null;
  const norm = s => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const STOP = new Set("a al algo algun alguna como con cual cuales cuando de del donde el ella en entre es esa ese eso esta este esto hay la las le les lo los me mas mi mis muy no nos o para pero por porque puede puedo que quien se sea ser si sin sobre son su sus te tengo ti tu tus un una uno unos y ya yo hacer hago saber dime decir quiero necesito favor gracias hola buenas como".split(" "));
  const stem = w => w.length >= 5 ? w.slice(0, 4) : w;
  const toks = s => norm(s).replace(/[^a-z0-9ñ\s/+]/g, " ").split(/\s+/).filter(w => w && !STOP.has(w) && (w.length > 2 || /\d/.test(w))).map(stem);

  async function buildIndex(){
    if(index) return index;
    if(!window.AUREN_NORMATIVAS) await loadScript("data/normativas.js");
    if(!window.AUREN_AYUDA) await loadScript("data/ayuda.js");
    const docs = [];
    const N = window.AUREN_NORMATIVAS, F = window.AUREN_AYUDA;
    const pad = n => String(n).padStart(2, "0");
    (N?.categorias || []).forEach(c=>{
      if(c.intro) docs.push({type:"rule", code:c.id, title:`${c.nombre} (antes de empezar)`, text:c.intro.replace(/\[\[|\]\]|\*\*/g, ""), href:`normativas.html#${c.id}`});
      (c.ejemplos || []).forEach(e=> docs.push({type:"rule", code:c.id, title:`Ejemplo de entorno: ${e.t}`, text:e.d, href:`normativas.html#${c.id}`}));
      c.reglas.forEach((r,i)=> docs.push({type:"rule", code:`${c.id}-${pad(i+1)}`, title:r.t, text:r.d, cat:c.nombre, href:`normativas.html#${c.id}-${pad(i+1)}`}));
      if(c.nota) docs.push({type:"rule", code:c.id, title:`Nota de ${c.nombre}`, text:c.nota, href:`normativas.html#${c.id}`});
      if(c.tabla) docs.push({type:"rule", code:c.id, title:c.tabla.titulo, text:c.tabla.filas.map(f=>`${f[0]}: ${f[1]}`).join(". ") + ".", href:`normativas.html#${c.id}`});
    });
    (F || []).forEach(sec=> sec.preguntas.forEach(p=> docs.push({type:"faq", code:"Ayuda", title:p.q, text:p.a.replace(/<[^>]+>/g, ""), href:`ayuda.html#${sec.id}`})));
    docs.forEach(d=>{ d.tt = new Set(toks(d.title + " " + (d.cat || ""))); d.xt = new Set(toks(d.text)); });
    const df = new Map();
    docs.forEach(d=> new Set([...d.tt, ...d.xt]).forEach(t=> df.set(t, (df.get(t) || 0) + 1)));
    index = {docs, idf: t => Math.log(1 + docs.length / (1 + (df.get(t) || 0)))};
    return index;
  }
  async function search(q){
    const I = await buildIndex(), qt = [...new Set(toks(q))];
    if(!qt.length) return [];
    return I.docs.map(d=>{
      let s = 0;
      qt.forEach(t=>{ if(d.tt.has(t)) s += 2 * I.idf(t); else if(d.xt.has(t)) s += I.idf(t); });
      return {d, s};
    }).filter(x=>x.s > 0).sort((a,b)=>b.s - a.s);
  }

  /* ---------- accesos directos ---------- */
  const PAGES = [
    {k:["normativa","normas","reglas","regla","reglamento"], t:"Normativas", d:"Todas las reglas, con buscador", href:"normativas.html"},
    {k:["delito","delitos","robo","robos","robar","atraco","asalto","secuestro","estafa","entorno","911"], t:"Reglas de delitos", d:"Actos delictivos, robos pequeños y conducta", href:"normativas.html#DEL"},
    {k:["ayuda","faq","preguntas","dudas"], t:"Ayuda", d:"Preguntas frecuentes", href:"ayuda.html"},
    {k:["conectar","conecto","conectarme","entrar","servidor","ip","connect","f8"], t:"Conectar al servidor", d:"Abre FiveM directo en Auren", action:"connect"},
    {k:["discord","ticket","tickets","soporte","apelar","apelacion","reportar","reporte"], t:"Discord de Auren", d:"Tickets, anuncios y soporte", href:C.discord, ext:true},
    {k:["vip","comprar","compra","tienda","donar","voucher"], t:"Compras VIP", d:"Se hacen por ticket en el Discord", href:C.tienda || C.discord, ext:true},
    {k:["staff","admin","panel","moderador","moderacion"], t:"Panel del staff", d:"Solo para el equipo", href:"staff.html"},
    {k:["cuenta","perfil","sesion","login","iniciar"], t:"Mi cuenta", d:"Tu Discord vinculado", href:"panel.html"},
    {k:["jugar","instalar","fivem","gta","requisitos","guia","empezar"], t:"Cómo jugar", d:"La guía para empezar", href:"index.html#jugar"},
    {k:["directo","directos","stream","twitch","kick","streamer","streamers","seguidores","vivo"], t:"Streamers", d:"Quién está en directo y el top de la comunidad", href:"streamers.html"},
    {k:["privacidad","datos"], t:"Privacidad", d:"Qué datos usa la web", href:"privacidad.html"},
    {k:["terminos","condiciones"], t:"Términos", d:"Condiciones de uso", href:"terminos.html"},
    {k:["lectura","letra","contraste","accesibilidad","ciego","vision","leer","grande"], t:"Opciones de lectura", d:"Letra grande, alto contraste y menos movimiento", action:"aa"},
    {k:["goat","goats","owner","owners","dueno","duenos","fundador","jefe","jefes","gandy","rich","richdinero","magic","magicbullet"], t:"The GOATs", d:"Los owners de Auren", href:"index.html#goats"},
    {k:["tutorial","tour","recorrido","guia de la web","enseñame","ensename"], t:"Ver el tutorial", d:"Un recorrido rápido por la web", action:"tour"}
  ];
  function matchPages(q){
    const words = norm(q).replace(/[^a-z0-9ñ\s]/g, " ").split(/\s+/).filter(Boolean);
    return PAGES.map(p=>({p, s: p.k.reduce((n,k)=> n + (words.some(w=> w === k || (w.length > 4 && k.startsWith(w.slice(0,5))) || (k.length > 4 && w.startsWith(k.slice(0,5)))) ? 1 : 0), 0)}))
      .filter(x=>x.s > 0).sort((a,b)=>b.s - a.s).map(x=>x.p);
  }
  const linkHTML = p => p.action
    ? `<button class="gd-link" type="button" data-gd-action="${p.action}"><b>${esc(p.t)}</b>${p.d ? `<span>${esc(p.d)}</span>` : ""}</button>`
    : `<a class="gd-link" href="${esc(p.href)}"${p.ext ? ' target="_blank" rel="noopener"' : ""}><b>${esc(p.t)}</b>${p.d ? `<span>${esc(p.d)}</span>` : ""}</a>`;

  /* ---------- "¿quisiste decir…?" ---------- */
  const SALUDOS = /^(klk|k lo k|q lo q|qlq|que lo que|ke lo ke|dime a ver|dimelo|hola+|holi|buenas( tardes| noches| dias)?|buenos dias|hey+|ey+|epa+|wepa+|saludos|que tal|q tal|klk mi pana|klk manito|que hay|sup|yo)[\s!¡?.,]*$/;
  const JERGA = { klk:"hola", qlq:"hola", vaina:"", pana:"", manito:"", tiguere:"", jevi:"", heavy:"", chepa:"", bacano:"", "q":"que", "k":"que", "pq":"porque", "xq":"porque", "tmb":"tambien", "tb":"tambien", "rob":"robo", "cops":"policia", "poli":"policia", "pd":"policia", "lspd":"policia", "ems":"ems", "sv":"servidor", "server":"servidor", "wl":"whitelist", "ck":"ck", "pk":"pk", "vdm":"vdm", "rdm":"rdm" };
  let vocab = null;
  function buildVocab(I){
    if(vocab) return vocab;
    vocab = new Map();
    const add = w => { if(w.length >= 3 && !STOP.has(w)) vocab.set(w, (vocab.get(w) || 0) + 1); };
    I.docs.forEach(d=> norm(d.title + " " + d.text).replace(/[^a-z0-9ñ\s]/g, " ").split(/\s+/).forEach(add));
    PAGES.forEach(p=> p.k.forEach(k=> norm(k).split(/\s+/).forEach(w=> { add(w); add(w); })));
    return vocab;
  }
  function dist(a, b){
    const m = a.length, n = b.length; if(Math.abs(m - n) > 3) return 9;
    const d = Array.from({length:m + 1}, (_, i)=> [i, ...Array(n).fill(0)]);
    for(let j = 1; j <= n; j++) d[0][j] = j;
    for(let i = 1; i <= m; i++) for(let j = 1; j <= n; j++){
      d[i][j] = Math.min(d[i-1][j] + 1, d[i][j-1] + 1, d[i-1][j-1] + (a[i-1] === b[j-1] ? 0 : 1));
      if(i > 1 && j > 1 && a[i-1] === b[j-2] && a[i-2] === b[j-1]) d[i][j] = Math.min(d[i][j], d[i-2][j-2] + 1);
    }
    return d[m][n];
  }
  function closest(w, V){
    if(V.has(w)) return null;
    const max = w.length <= 4 ? 1 : w.length <= 7 ? 2 : 3;
    let best = null, bs = 99, bc = 0;
    for(const [v, c] of V){
      if(Math.abs(v.length - w.length) > max) { if(!(w.length >= 4 && v.startsWith(w))) continue; }
      let s = dist(w, v);
      if(w.length >= 4 && v.startsWith(w)) s = Math.min(s, 1);
      if(s < bs || (s === bs && c > bc)){ best = v; bs = s; bc = c; }
    }
    return bs <= max ? best : null;
  }
  // palabras parecidas (para "¿quisiste decir…?" cuando no hay nada)
  async function suggest(q){
    const I = await buildIndex(), V = buildVocab(I);
    const words = norm(q).replace(/[^a-z0-9ñ\s]/g, " ").split(/\s+/).filter(w=> w.length >= 3 && !STOP.has(w));
    const out = [];
    words.forEach(w=>{
      const cand = [];
      for(const [v, c] of V){
        if(v.length < 4 || Math.abs(v.length - w.length) > 4) continue;
        const d = dist(w, v) / Math.max(w.length, v.length);
        const pre = v.startsWith(w.slice(0, 3)) ? -.15 : 0;
        if(d + pre <= .5) cand.push([v, d + pre - Math.min(c, 20) * .002]);
      }
      cand.sort((a, b)=> a[1] - b[1]).slice(0, 3).forEach(([v])=> { if(!out.includes(v)) out.push(v); });
    });
    return out.slice(0, 4);
  }
  // corrige la pregunta: jerga dominicana + faltas de ortografía
  async function correct(q){
    const I = await buildIndex(), V = buildVocab(I);
    const words = norm(q).replace(/[^a-z0-9ñ\s]/g, " ").split(/\s+/).filter(Boolean);
    let changed = false;
    const out = words.map(w=>{
      if(w in JERGA){ if(JERGA[w] && JERGA[w] !== w && !STOP.has(JERGA[w])) changed = true; return JERGA[w]; }
      if(STOP.has(w) || w.length < 3 || /\d/.test(w)) return w;
      const c = closest(w, V);
      if(c){ changed = true; return c; }
      return w;
    }).filter(Boolean);
    return changed ? out.join(" ") : null;
  }

  /* ---------- chat ---------- */
  let panel = null, msgs = null, input = null, srLive = null, history = [], aiOn = null, busy = false, typing = null;
  let voiceOn = false; try{ voiceOn = localStorage.getItem("gd_voice") === "1"; }catch{}
  const fmt = txt => esc(txt)
    .replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>")
    .replace(/\[([A-Z]{2,4}-\d{2})\]/g, (m, code)=> `<a class="code" href="normativas.html#${code}">${code}</a>`)
    .replace(/(^|\n)[-•] (.+)/g, "$1• $2")
    .replace(/\n/g, "<br>");

  function addMsg(html, who="bot"){
    const d = document.createElement("div");
    d.className = "gd-m " + who; d.innerHTML = html;
    msgs.appendChild(d); msgs.scrollTop = msgs.scrollHeight;
    return d;
  }
  const nearBottom = () => msgs.scrollHeight - msgs.scrollTop - msgs.clientHeight < 80;

  // GandyDev "habla": escribe la respuesta letra a letra
  function typeInto(el, html){
    if(typing) typing.finish();
    el.innerHTML = html;
    const plain = el.textContent;
    if(srLive) srLive.textContent = "";
    const done = () => { if(srLive) srLive.textContent = "GandyDev: " + plain; };
    if(still()){ done(); speak(plain); return Promise.resolve(); }
    const extras = [...el.querySelectorAll(".gd-links,.gd-src")];
    extras.forEach(x=> x.style.display = "none");
    const nodes = [];
    const tw = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, { acceptNode: n => n.parentElement.closest(".gd-links,.gd-src") ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT });
    while(tw.nextNode()) nodes.push(tw.currentNode);
    const full = nodes.map(n=> n.nodeValue);
    const hidden = [...el.querySelectorAll("*")].filter(e=> e.tagName !== "BR" && !e.closest(".gd-links,.gd-src"));
    hidden.forEach(e=> e.style.visibility = "hidden");
    nodes.forEach(n=> n.nodeValue = "");
    const total = full.reduce((n, t)=> n + t.length, 0);
    const per = Math.max(1, Math.ceil(total / 260));       // como mucho ~6 segundos escribiendo
    let ni = 0, ci = 0, timer = 0, resolve;
    talk(true); speak(plain);
    const reveal = n => { let p = n.parentElement; while(p && p !== el){ p.style.visibility = ""; p = p.parentElement; } };
    function finish(){
      if(!typing || typing.el !== el) return;
      clearTimeout(timer);
      nodes.forEach((n, i)=> n.nodeValue = full[i]);
      hidden.forEach(e=> e.style.visibility = "");
      extras.forEach(x=>{ x.style.display = ""; x.animate?.([{opacity:0, transform:"translateY(6px)"}, {opacity:1, transform:"none"}], {duration:260, easing:"ease-out"}); });
      typing = null; talk(false); done();
      msgs.scrollTop = msgs.scrollHeight;
      resolve();
    }
    function tick(){
      const stick = nearBottom();
      let n = per, ch = "";
      while(n-- > 0 && ni < nodes.length){
        if(ci === 0) reveal(nodes[ni]);
        ch = full[ni][ci]; ci++;
        nodes[ni].nodeValue = full[ni].slice(0, ci);
        if(ci >= full[ni].length){ ni++; ci = 0; }
      }
      if(stick) msgs.scrollTop = msgs.scrollHeight;
      if(ni >= nodes.length) return finish();
      const pause = per > 2 ? 0 : /[.!?¿¡]/.test(ch) ? 220 : /[,;:]/.test(ch) ? 90 : 0;
      timer = setTimeout(tick, 18 + pause + Math.random() * 14);
    }
    typing = { el, finish };
    el.addEventListener("click", finish, { once:true });
    return new Promise(r=>{ resolve = r; timer = setTimeout(tick, 120); });
  }
  // voz opcional (botón del altavoz)
  function speak(text){
    if(!voiceOn || !("speechSynthesis" in window)) return;
    try{
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text.replace(/[A-Z]{2,4}-\d{2}/g, m=> m.replace("-", " ")).slice(0, 400));
      const vs = speechSynthesis.getVoices();
      u.voice = vs.find(v=> /es[-_](DO|US|MX|419)/i.test(v.lang)) || vs.find(v=> /^es/i.test(v.lang)) || null;
      u.lang = u.voice?.lang || "es-US"; u.rate = 1.05; u.pitch = 1.15;
      u.onstart = ()=> talk(true); u.onend = u.onerror = ()=> talk(false);
      speechSynthesis.speak(u);
    }catch{}
  }
  const SPK = on => `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M11 5 6 9H2v6h4l5 4z"/>${on ? '<path d="M15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14"/>' : '<path d="m22 9-6 6M16 9l6 6"/>'}</svg>`;

  function openPanel(){
    if(!panel){
      panel = document.createElement("section");
      panel.className = "gd-panel"; panel.setAttribute("role", "dialog"); panel.setAttribute("aria-labelledby", "gdTitle");
      panel.innerHTML = `
        <div class="gd-head"><span class="av">${BOT()}</span><div><b id="gdTitle">GandyDev</b><small>Asistente de Auren</small></div>
          <button type="button" data-gd-voice aria-pressed="${voiceOn}" aria-label="Voz de GandyDev" title="Voz de GandyDev">${SPK(voiceOn)}</button>
          <button type="button" data-gd-close aria-label="Cerrar a GandyDev" style="margin-left:6px"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg></button></div>
        <div class="gd-msgs" aria-live="off"></div>
        <div class="sr-only" aria-live="polite" data-gd-sr></div>
        <div class="gd-chips" aria-label="Preguntas rápidas">
          ${["¿Cómo me conecto?","¿Puedo robar de día?","Reglas de robos pequeños","¿Qué es un entorno?","¿Quiénes son los owners?","¿Hay whitelist?"].map(c=>`<button type="button" data-gd-q="${esc(c)}">${esc(c)}</button>`).join("")}
        </div>
        <form class="gd-form"><label class="sr-only" for="gdIn">Escribe tu pregunta</label><input id="gdIn" autocomplete="off" maxlength="300" placeholder="Pregunta o busca algo de la web"><button type="submit">Enviar</button></form>`;
      document.body.appendChild(panel);
      msgs = panel.querySelector(".gd-msgs"); input = panel.querySelector("#gdIn"); srLive = panel.querySelector("[data-gd-sr]");
      panel.querySelector(".gd-head [data-gd-voice]").style.marginLeft = "auto";
      typeInto(addMsg(""), `¡Klk! Soy <b>GandyDev</b>. Pregúntame sobre las reglas de Auren, cómo entrar al servidor, o dime qué buscas y te llevo.`);
      panel.querySelector("[data-gd-close]").onclick = closePanel;
      panel.querySelector("[data-gd-voice]").onclick = e=>{
        voiceOn = !voiceOn; try{ localStorage.setItem("gd_voice", voiceOn ? "1" : "0"); }catch{}
        const b = e.currentTarget; b.setAttribute("aria-pressed", voiceOn); b.innerHTML = SPK(voiceOn);
        if(!voiceOn) try{ speechSynthesis.cancel(); }catch{} else speak("Listo, ahora te hablo.");
      };
      panel.querySelector(".gd-form").onsubmit = e=>{ e.preventDefault(); ask(input.value); };
      panel.addEventListener("click", e=>{
        const c = e.target.closest("[data-gd-q]"); if(c){ ask(c.dataset.gdQ); return; }
        const a = e.target.closest("[data-gd-action]");
        if(a){
          if(a.dataset.gdAction === "connect") document.querySelector("[data-connect]")?.click() || (location.href = "fivem://connect/cfx.re/join/" + (C.cfxCode || ""));
          if(a.dataset.gdAction === "aa"){ closePanel(); setTimeout(()=> document.getElementById("aaBtn")?.click(), 50); }
          if(a.dataset.gdAction === "tour"){ closePanel(); if(window.AurenTour) window.AurenTour.start(); else location.href = "index.html?tour=1"; }
        }
      });
      panel.addEventListener("keydown", e=>{ if(e.key === "Escape") closePanel(); });
    }
    panel.hidden = false; open = true; gd.setAttribute("aria-expanded", "true");
    setTimeout(()=> input.focus(), 30);
    buildIndex();
  }
  function closePanel(){
    if(!panel) return;
    if(typing) typing.finish();
    try{ speechSynthesis.cancel(); }catch{}
    panel.hidden = true; open = false; gd.setAttribute("aria-expanded", "false"); gd.focus();
    if(!still()){ setAct("wave", 1500); say(pick(LINES.bye), 1600); }
  }
  function activate(){
    if(open){ closePanel(); return; }
    greet(); openPanel();
  }
  gd.addEventListener("click", ()=>{ if(suppressClick) return; activate(); });   // teclado (Enter / Espacio)

  async function ask(q){
    q = String(q || "").trim();
    if(!q || busy) return;
    if(typing) typing.finish();
    busy = true; input.value = "";
    lastTouch = performance.now();
    addMsg(esc(q), "me");
    const wait = addMsg(`<span class="gd-typing" aria-label="GandyDev está pensando"><i></i><i></i><i></i></span>`);
    let html = "", final = "";
    try{
      const nq = norm(q).trim();
      if(SALUDOS.test(nq)){
        const klk = /^(klk|k lo k|q lo q|qlq|que lo que|ke lo ke)/.test(nq);
        html = (klk ? "¡Klk! Aquí tranquilo, cuidando la ciudad. " : "¡Hola! ") + "¿Qué necesitas? Puedo explicarte una regla, decirte cómo conectarte o llevarte a cualquier parte de la web.";
        setFace("happy", 1500); hop(300);
        return;
      }
      let used = q, fixed = null;
      let shortcuts = matchPages(q).slice(0, 3);
      let hits = (await search(q)).slice(0, 6);
      // si escribió algo que no existe (falta de ortografía o jerga), buscamos lo parecido
      fixed = await correct(q);
      if(fixed && SALUDOS.test(fixed)){ html = "¡Klk! ¿Qué necesitas? Puedo explicarte una regla, decirte cómo conectarte o llevarte a cualquier parte de la web."; return; }
      if(fixed){
        const h2 = (await search(fixed)).slice(0, 6), s2 = matchPages(fixed).slice(0, 3);
        if(h2.length || s2.length){ used = fixed; hits = h2.length ? h2 : hits; shortcuts = s2.length ? s2 : shortcuts; }
        else fixed = null;
      }
      const didYou = fixed ? `¿Quisiste decir <b>«${esc(fixed)}»</b>? Te respondo sobre eso.<br>` : "";
      let ai = null;
      if(aiOn !== false && (hits.length || !fixed)) ai = await askAI(used, hits).catch(()=> null);
      if(ai){
        html = didYou + fmt(ai);
        const cited = [...ai.matchAll(/\[([A-Z]{2,4}-\d{2})\]/g)].map(m=>m[1]);
        const src = hits.filter(h=> h.d.type === "rule" && !cited.includes(h.d.code)).slice(0, cited.length ? 0 : 2);
        if(src.length) html += `<div class="gd-src">Relacionado: ${src.map(h=>`<a class="code" href="${h.d.href}">${esc(h.d.code)}</a> ${esc(h.d.title)}`).join(" · ")}</div>`;
        final = ai;
      } else {
        const good = hits.filter(h=> h.s >= (hits[0]?.s || 0) * .55).slice(0, 3);
        if(good.length){
          html = (didYou || "") + `${fixed ? "Esto es lo que encontré" : "Esto es lo que encontré"}:<ul>${good.map(h=>`<li><a class="code" href="${h.d.href}">${esc(h.d.code)}</a> <b>${esc(h.d.title)}</b>: ${esc(h.d.text.length > 240 ? h.d.text.slice(0, 237) + "…" : h.d.text)}</li>`).join("")}</ul>`;
        } else if(!shortcuts.length){
          const sug = await suggest(q);
          if(sug.length){
            html = `Mmm, no encontré nada sobre <b>«${esc(q)}»</b>. ¿Quisiste decir alguna de estas?`;
            html += `<div class="gd-links">${sug.map(c=>`<button class="gd-link" type="button" data-gd-q="${esc(c)}"><b>${esc(c)}</b><span>Buscar «${esc(c)}»</span></button>`).join("")}</div>`;
          } else {
            html = `Mmm, no encontré nada sobre <b>«${esc(q)}»</b>. Prueba con otras palabras, o mira estas ideas:`;
            html += `<div class="gd-links">${["¿Cómo me conecto?","Reglas de robos pequeños","¿Hay whitelist?"].map(c=>`<button class="gd-link" type="button" data-gd-q="${esc(c)}"><b>${esc(c)}</b></button>`).join("")}</div>`;
          }
          shortcuts.push(PAGES[4]);
        } else html = (didYou || "") + `Te llevo:`;
      }
      if(shortcuts.length) html += `<div class="gd-links">${shortcuts.map(linkHTML).join("")}</div>`;
      if(fixed) html += `<div class="gd-src">Si no era eso, escríbelo de otra forma.</div>`;
    } finally {
      busy = false;
      if(!html) html = "Algo falló buscando eso. Inténtalo otra vez.";
      wait.innerHTML = "";
      typeInto(wait, html).then(()=>{ if(open && !still()) hop(260); });
      const tmp = document.createElement("div"); tmp.innerHTML = html;
      history.push({role:"user", content:q}, {role:"assistant", content: final || tmp.textContent.slice(0, 500)});
      history = history.slice(-8);
    }
  }

  async function askAI(q, hits){
    const facts = [
      `Servidor: Auren RP, roleplay de FiveM en Nueva York (Liberty City) con sabor dominicano.`,
      `Conectar: botón Conectar de la web, o en FiveM pulsa F8 y escribe connect cfx.re/join/${C.cfxCode || "lee9965"}.`,
      `No hay whitelist: entrada directa. Discord: ${C.discord || "discord.gg/aurenrp"} (tickets, soporte, apelaciones y compras VIP).`,
      `Páginas: Normativas (normativas.html), Ayuda (ayuda.html), Streamers (streamers.html), Mi cuenta (panel.html), Panel del staff (staff.html, solo staff), The GOATs en la portada (index.html#goats).`,
      `Owners de Auren (The GOATs): ${(C.goats || []).map(g=> `${g.name} (${g.rank}${g.desc ? ": " + g.desc : ""})`).join("; ") || "Gandy (Owner principal), RichDinero (segundo owner principal), MagicBullet (owner)"}.`,
      `Tú eres GandyDev, el asistente de la web de Auren.`
    ];
    const ctx = facts.join("\n") + "\n\nREGLAS Y AYUDA RELEVANTES:\n" + hits.map(h=>`[${h.d.code}] ${h.d.title}: ${h.d.text}`).join("\n");
    const r = await fetch("/api/gandy", {method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({q, context: ctx.slice(0, 5500), history})});
    if(r.status === 404 || r.status === 503 || r.status === 405){ aiOn = false; return null; }
    if(!r.ok) return null;
    const j = await r.json().catch(()=> ({}));
    aiOn = true;
    return (j.answer || "").trim() || null;
  }
  window.GandyDev = { bot: BOT, open: ()=>{ if(!open){ greet(); openPanel(); } }, say, hold: v=>{ hold = !!v; if(hold) act = null; }, el: gd };
})();
