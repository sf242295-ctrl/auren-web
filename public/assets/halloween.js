/* =========================================================
   Temporada de Halloween en Auren
   Luna llena, murciélagos, niebla, brasas, telarañas, una
   araña que baja del techo, radio de temporada y botones
   naranja calabaza. Se activa sola en temporada (assets/site.js
   → halloween) y cada persona la puede quitar en el botón AA.
   ========================================================= */
(function(){
  if(window.__auHalloween) return; window.__auHalloween = true;
  const root = document.documentElement;
  const on = () => root.dataset.season === "halloween";
  const still = () => matchMedia("(prefers-reduced-motion: reduce)").matches || root.dataset.motion === "reduce" || root.dataset.contrast === "high";
  const R = Math.random;
  const SFX = n => { try{ window.AurenSFX && window.AurenSFX.play(n); }catch{} };

  const web = c => `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100' fill='none' stroke='${c}' stroke-width='1'><path d='M100 0L40 60M100 0L60 100M100 0L0 40M100 0L20 90M100 0L80 100'/><path d='M88 0q2 10 12 12M74 0q4 22 26 26M58 0q8 34 42 42M42 0q12 48 58 58M26 0q16 62 74 74'/></svg>`)}")`;
  const BAT = `<svg viewBox="0 0 64 30" aria-hidden="true"><g class="wl"><path d="M30 13C24 3 12 1 2 7c6 1 8 4 8 8 3-3 7-3 9 0 2-3 6-3 8 1z"/></g><g class="wr"><path d="M34 13C40 3 52 1 62 7c-6 1-8 4-8 8-3-3-7-3-9 0-2-3-6-3-8 1z"/></g><ellipse cx="32" cy="15" rx="4" ry="6"/><path d="M29 10l1-4 2 3 2-3 1 4z"/></svg>`;
  const SPIDER = `<svg viewBox="0 0 40 40" aria-hidden="true"><g stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" class="legs"><path d="M15 18l-8-6-4 3M15 21l-9-2-4 4M15 24l-8 3-3 5M16 26l-5 6-1 5M25 18l8-6 4 3M25 21l9-2 4 4M25 24l8 3 3 5M24 26l5 6 1 5"/></g><ellipse cx="20" cy="22" rx="6.5" ry="7.5" fill="currentColor"/><circle cx="20" cy="13" r="4.5" fill="currentColor"/><circle cx="18.3" cy="12.4" r="1.2" fill="#ff8a1f"/><circle cx="21.7" cy="12.4" r="1.2" fill="#ff8a1f"/></svg>`;

  const css = `
  .hw-layer{position:fixed;inset:0;z-index:0;pointer-events:none;overflow:hidden;display:none}
  html[data-season="halloween"] .hw-layer{display:block}
  html[data-contrast="high"] .hw-layer,html[data-contrast="high"] .hw-spider{display:none!important}
  .hw-tint{position:absolute;inset:0;background:linear-gradient(180deg,rgba(70,24,110,.28),transparent 42%,transparent 70%,rgba(255,110,20,.07))}
  .hw-moon{position:absolute;top:92px;right:7vw;width:150px;height:150px;border-radius:50%;
    background:radial-gradient(circle at 30% 34%,rgba(194,65,12,.35) 0 7%,transparent 8%),radial-gradient(circle at 62% 58%,rgba(194,65,12,.3) 0 9%,transparent 10%),radial-gradient(circle at 70% 28%,rgba(194,65,12,.22) 0 5%,transparent 6%),radial-gradient(circle at 38% 36%,#fff6dc,#ffd98f 42%,#f59e2b 74%,#c2410c);
    box-shadow:0 0 60px 18px rgba(255,160,60,.28),0 0 160px 60px rgba(255,120,30,.12);animation:hwMoon 9s ease-in-out infinite}
  .hw-moon::after{content:"";position:absolute;left:-40%;top:42%;width:180%;height:22%;border-radius:50%;background:linear-gradient(90deg,transparent,rgba(20,10,30,.65),transparent);filter:blur(6px);animation:hwCloud 26s linear infinite}
  @keyframes hwMoon{50%{box-shadow:0 0 70px 22px rgba(255,160,60,.34),0 0 180px 70px rgba(255,120,30,.14)}}
  @keyframes hwCloud{from{transform:translateX(-30%)}to{transform:translateX(30%)}}
  .hw-fog{position:absolute;left:-20%;right:-20%;bottom:0;height:42vh;
    background:radial-gradient(ellipse 40% 60% at 20% 100%,rgba(140,80,200,.26),transparent 70%),radial-gradient(ellipse 35% 55% at 70% 100%,rgba(255,120,40,.13),transparent 70%),radial-gradient(ellipse 45% 50% at 50% 100%,rgba(200,190,230,.10),transparent 70%);
    animation:hwFog 22s ease-in-out infinite alternate;filter:blur(8px)}
  @keyframes hwFog{to{transform:translateX(8%)}}
  .hw-bat{position:absolute;left:0;width:var(--s,40px);animation:hwFly var(--d,18s) linear infinite;animation-delay:var(--dl,0s)}
  .hw-bat .bob{animation:hwBob var(--b,1.6s) ease-in-out infinite alternate}
  .hw-bat svg{width:100%;fill:#0b0612;filter:drop-shadow(0 0 6px rgba(255,140,40,.25))}
  .hw-bat.rev svg{transform:scaleX(-1)}
  .hw-bat .wl,.hw-bat .wr{transform-box:view-box;transform-origin:32px 13px;animation:hwFlap .22s ease-in-out infinite alternate}
  @keyframes hwFlap{to{transform:scaleY(.25)}}
  @keyframes hwFly{from{transform:translateX(-12vw)}to{transform:translateX(112vw)}}
  .hw-bat.rev{animation-name:hwFlyRev}
  @keyframes hwFlyRev{from{transform:translateX(112vw)}to{transform:translateX(-12vw)}}
  @keyframes hwBob{from{transform:translateY(-14px)}to{transform:translateY(14px)}}
  .hw-ember{position:absolute;bottom:-12px;width:var(--s,4px);height:var(--s,4px);border-radius:50%;background:#ffb347;box-shadow:0 0 10px 3px rgba(255,130,30,.6);opacity:0;animation:hwRise var(--d,12s) linear infinite;animation-delay:var(--dl,0s)}
  @keyframes hwRise{0%{opacity:0;transform:translate(0,0)}10%{opacity:.9}50%{transform:translate(var(--sw,20px),-55vh)}90%{opacity:.5}100%{opacity:0;transform:translate(calc(var(--sw,20px) * -1),-110vh)}}
  .hw-spider{position:fixed;top:0;z-index:44;width:34px;pointer-events:none;display:none}
  html[data-season="halloween"] .hw-spider.show{display:block}
  .hw-spider .thread{position:absolute;left:50%;top:0;width:1px;height:var(--len,0px);background:linear-gradient(rgba(255,255,255,.15),rgba(255,255,255,.55));transition:height var(--t,3s) cubic-bezier(.3,.7,.3,1)}
  .hw-spider .bug{position:absolute;left:0;top:var(--len,0px);width:34px;height:34px;color:#140a1e;transform:translateY(-6px);transition:top var(--t,3s) cubic-bezier(.3,.7,.3,1);pointer-events:auto;cursor:pointer;filter:drop-shadow(0 4px 8px rgba(0,0,0,.5)) drop-shadow(0 0 6px rgba(255,140,40,.25))}
  .hw-spider .bug svg{width:100%;height:100%;animation:hwSwing 2.4s ease-in-out infinite;transform-origin:50% 0}
  .hw-spider .legs{animation:hwLegs .3s ease-in-out infinite alternate;transform-origin:20px 22px}
  @keyframes hwSwing{0%,100%{transform:rotate(-6deg)}50%{transform:rotate(6deg)}}
  @keyframes hwLegs{to{transform:scaleY(.9)}}
  html[data-season="halloween"]:not([data-contrast="high"]){--accent:#ff8a1f;--on-accent:#1b0b00}
  html[data-season="halloween"]:not([data-contrast="high"]) .btn-primary:hover{background:#ffa24d}
  html[data-season="halloween"] .hero h1{background:linear-gradient(180deg,#ffe2b0 8%,#ff9a3c 52%,#b4410a);-webkit-background-clip:text;background-clip:text;color:transparent;animation:hwGlow 4s ease-in-out infinite}
  html[data-season="halloween"] .sx-title{background:linear-gradient(100deg,#b4410a 0%,#ffd59e 30%,#fff1d6 40%,#ffb259 50%,#b4410a 80%) 0 0/250% 100%;-webkit-background-clip:text;background-clip:text;color:transparent}
  @keyframes hwGlow{0%,100%{filter:drop-shadow(0 0 18px rgba(255,138,31,.25))}45%{filter:drop-shadow(0 0 30px rgba(255,138,31,.45))}52%{filter:drop-shadow(0 0 12px rgba(255,138,31,.18))}}
  html[data-season="halloween"] .card,html[data-season="halloween"] .goat{background-image:${web("rgba(255,255,255,.13)")};background-repeat:no-repeat;background-position:right top;background-size:96px}
  html[data-season="halloween"][data-theme="light"] .card,html[data-season="halloween"][data-theme="light"] .goat{background-image:${web("rgba(60,30,90,.18)")}}
  html[data-season="halloween"] .brand span::after{content:" 🎃";font-size:.9em}
  .hw-pill{border-color:rgba(255,138,31,.45)!important;color:#ffcf99!important;background:rgba(255,138,31,.1)!important}
  html[data-theme="light"] .hw-pill{color:#9a3412!important}
  .hw-foot{margin-top:10px;color:#ffb46b;font-weight:500}
  html[data-theme="light"] .hw-foot{color:#9a3412}
  html:not([data-season="halloween"]) .hw-pill,html:not([data-season="halloween"]) .hw-foot{display:none}
  html[data-theme="light"] .hw-tint{background:linear-gradient(180deg,rgba(120,60,170,.12),transparent 45%,transparent 70%,rgba(255,120,30,.08))}
  html[data-theme="light"] .hw-bat svg{fill:#2a1442}
  html[data-theme="light"] .hw-fog{opacity:.6}
  html[data-theme="light"] .hw-spider .thread{background:linear-gradient(rgba(40,20,60,.2),rgba(40,20,60,.5))}
  html[data-motion="reduce"] .hw-bat,html[data-motion="reduce"] .hw-ember,html[data-motion="reduce"] .hw-spider{display:none!important}
  @media (prefers-reduced-motion:reduce){ .hw-bat,.hw-ember,.hw-spider{display:none!important} .hw-layer *{animation:none!important} }
  @media (max-width:700px){ .hw-moon{width:92px;height:92px;top:86px;right:5vw} .hw-bat:nth-child(n+7){display:none} }
  `;
  const st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);

  /* ---------- capa de ambiente ---------- */
  const layer = document.createElement("div");
  layer.className = "hw-layer"; layer.setAttribute("aria-hidden", "true");
  let html = `<div class="hw-tint"></div><div class="hw-moon"></div><div class="hw-fog"></div>`;
  for(let i = 0; i < 8; i++){
    const rev = i % 3 === 1;
    html += `<div class="hw-bat${rev ? " rev" : ""}" style="top:${(6 + R() * 48).toFixed(1)}vh;--s:${Math.round(24 + R() * 30)}px;--d:${(13 + R() * 16).toFixed(1)}s;--dl:${(-R() * 30).toFixed(1)}s;--b:${(1.2 + R()).toFixed(2)}s"><div class="bob">${BAT}</div></div>`;
  }
  for(let i = 0; i < 18; i++){
    html += `<span class="hw-ember" style="left:${(R() * 100).toFixed(1)}%;--s:${(2 + R() * 3).toFixed(1)}px;--d:${(9 + R() * 9).toFixed(1)}s;--dl:${(-R() * 18).toFixed(1)}s;--sw:${Math.round((R() - .5) * 80)}px"></span>`;
  }
  layer.innerHTML = html;
  const city = document.getElementById("city");
  if(city) city.after(layer); else document.body.prepend(layer);

  /* ---------- la araña que baja del techo ---------- */
  const spider = document.createElement("div");
  spider.className = "hw-spider"; spider.setAttribute("aria-hidden", "true");
  spider.innerHTML = `<span class="thread"></span><span class="bug" title="¡Una araña!">${SPIDER}</span>`;
  document.body.appendChild(spider);
  let spiderBusy = false;
  function spiderRun(){
    if(spiderBusy || !on() || still() || document.hidden) return;
    spiderBusy = true;
    const x = Math.round(innerWidth * (.12 + R() * .76));
    spider.style.left = x + "px"; spider.style.setProperty("--t", "0s"); spider.style.setProperty("--len", "0px");
    spider.classList.add("show");
    requestAnimationFrame(()=> requestAnimationFrame(()=>{
      spider.style.setProperty("--t", "3.2s");
      spider.style.setProperty("--len", Math.round(110 + R() * Math.min(260, innerHeight * .35)) + "px");
    }));
    clearTimeout(spider._up); spider._up = setTimeout(()=> spiderUp(2.4), 9000 + R() * 5000);
  }
  function spiderUp(t){
    spider.style.setProperty("--t", t + "s"); spider.style.setProperty("--len", "0px");
    setTimeout(()=>{ spider.classList.remove("show"); spiderBusy = false; }, t * 1000 + 200);
  }
  spider.querySelector(".bug").addEventListener("click", ()=>{ SFX("squeak"); clearTimeout(spider._up); spiderUp(.45); });
  setTimeout(spiderRun, 12000 + R() * 8000);
  setInterval(()=>{ if(R() < .5) spiderRun(); }, 38000);

  /* ---------- radio de temporada ---------- */
  const RADIO = ["Luna llena sobre Manhattan esta noche", "Ruidos extraños en el cementerio de Brooklyn", "Reportan murciélagos en el puente de Queensboro",
    "Fiesta de disfraces en el Bronx", "Calabazas encendidas por todo Harlem", "Niebla espesa en el puerto de Liberty City",
    "Alguien vio una sombra en el metro de la línea 7", "Truco o trato en Washington Heights", "La policía revisa una casa embrujada en Queens"];
  setInterval(()=>{
    const m = document.getElementById("radioMsg");
    if(!m || !on() || document.hidden || R() < .45) return;
    m.style.opacity = 0;
    setTimeout(()=>{ m.textContent = RADIO[Math.floor(R() * RADIO.length)]; m.style.opacity = 1; }, 350);
  }, 17000);

  /* ---------- detalles: portada y pie ---------- */
  const live = document.querySelector(".hero .live-pill");
  if(live && !document.querySelector(".hw-pill")) live.insertAdjacentHTML("afterend", ` <span class="pill hw-pill">🎃 Temporada de Halloween</span>`);
  const fb = document.querySelector(".foot-bottom");
  if(fb && !document.querySelector(".hw-foot")) fb.insertAdjacentHTML("beforebegin", `<p class="wrap hw-foot">🎃 Feliz Halloween de parte de todo Auren RP.</p>`);
})();
