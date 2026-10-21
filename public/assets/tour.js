/* =========================================================
   Recorrido de bienvenida (la primera vez que abres la web)
   GandyDev te enseña la web paso a paso con una barra de
   progreso. Al terminar se abre la sección The GOATs.
   ========================================================= */
(function(){
  if(window.AurenTour) return;
  const A = window.Auren || {}, store = A.store || { get(){ return null; }, set(){} };
  const esc = A.esc || (s => String(s ?? ""));
  const root = document.documentElement;
  const still = () => matchMedia("(prefers-reduced-motion: reduce)").matches || root.dataset.motion === "reduce";

  const STEPS = [
    { t:"¡Bienvenido a Auren RP!", d:"Klk, soy GandyDev. Te enseño la web en menos de un minuto. Al final se abre una sección especial: The GOATs." },
    { t:"Entra a la ciudad", d:"Este botón abre FiveM y te conecta directo a Auren. Aquí no hay whitelist.", el:".hero [data-connect]" },
    { t:"¿Primera vez?", d:"Aquí tienes la guía paso a paso: GTA V, FiveM, tu Discord y a jugar.", el:"#jugar .sec-head" },
    { t:"Las normativas", d:"Todas las reglas de la ciudad, con buscador. Léelas antes de rolear para no llevarte una sanción.", el:'#navLinks a[href="normativas.html"]', alt:"#menuBtn", altD:"En el menú ☰ están las Normativas: todas las reglas, con buscador." },
    { t:"Streamers", d:"Mira quién está en directo, el top por seguidores y el más activo de la semana.", el:'#navLinks a[href="streamers.html"]', alt:"#menuBtn", altD:"En el menú ☰ está Streamers: quién está en directo y el top de la comunidad." },
    { t:"Lectura cómoda", d:"Con el botón AA pones la letra más grande, alto contraste o menos movimiento.", el:"#aaBtn" },
    { t:"Este soy yo", d:"Tócame cuando tengas una duda o arrástrame por la pantalla. Me sé todas las reglas y te llevo a cualquier parte.", el:".gd" },
    { t:"¡The GOATs desbloqueado!", d:"Los owners de Auren RP: Gandy, RichDinero y MagicBullet. Gracias por hacer el recorrido. ¡Nos vemos en la ciudad!", el:"#goats .sec-head", final:true }
  ];
  const N = STEPS.length;

  const css = `
  body.tour-on .gd-bubble{display:none!important}
  .tour{position:fixed;inset:0;z-index:80}
  .tour-shade{position:fixed;inset:0;background:rgba(3,4,6,.8)}
  .tour-hole{position:fixed;left:0;top:0;border-radius:14px;box-shadow:0 0 0 9999px rgba(3,4,6,.8),0 0 0 3px #ffd76a,0 0 30px 6px rgba(255,215,106,.45);pointer-events:none;transition:transform .35s cubic-bezier(.2,.8,.2,1),width .35s,height .35s}
  .tour-hole.pulse{animation:tourPulse 1.8s infinite}
  @keyframes tourPulse{50%{box-shadow:0 0 0 9999px rgba(3,4,6,.8),0 0 0 3px #ffd76a,0 0 46px 12px rgba(255,215,106,.6)}}
  .tour-card{position:fixed;left:0;top:0;width:min(400px,calc(100% - 24px));padding:20px;border-radius:20px;background:var(--panel);border:1px solid rgb(var(--fg) / .22);box-shadow:0 30px 70px -15px rgb(var(--sink) / .95);color:var(--ink,#f3f4f6);font-family:var(--font,system-ui);display:grid;gap:12px;transition:transform .35s cubic-bezier(.2,.8,.2,1)}
  .tour-top{display:flex;align-items:center;gap:10px}
  .tour-av{width:40px;height:40px;border-radius:12px;background:var(--chip);display:grid;place-items:center;flex:none}
  .tour-av svg{width:30px;height:38px}
  .tour-av .eye,.tour-av .mouth{transform-box:fill-box;transform-origin:center}
  .tour-av .heyes,.tour-av .zz{opacity:0}
  .tour-av.talk .mouth{animation:gdTalk .14s infinite alternate}
  .tour-top b{display:block;font-size:.98rem}
  .tour-top small{color:var(--muted,#a7aebb);font-size:.84rem}
  .tour-bar{height:10px;border-radius:10px;background:rgb(var(--fg) / .09);overflow:hidden;position:relative}
  .tour-bar i{position:absolute;inset:0 auto 0 0;border-radius:10px;background:linear-gradient(90deg,#f5c451,#fff1b8);transition:width .5s cubic-bezier(.2,.8,.2,1)}
  .tour-bar i::after{content:"";position:absolute;inset:0;background:linear-gradient(90deg,transparent,rgb(var(--fg) / .6),transparent);background-size:50% 100%;background-repeat:no-repeat;animation:tourShine 1.6s infinite}
  @keyframes tourShine{from{background-position:-60% 0}to{background-position:160% 0}}
  .tour-dots{display:flex;gap:6px}
  .tour-dots span{flex:1;height:4px;border-radius:4px;background:rgb(var(--fg) / .12)}
  .tour-dots span.on{background:#f5c451}
  .tour-card h3{font-size:1.3rem;letter-spacing:-.02em;line-height:1.15}
  .tour-card p{color:var(--soft,#d6dae1);font-size:1rem;line-height:1.55;min-height:3.1em}
  .tour-btns{display:flex;gap:8px;align-items:center}
  .tour-btns .sp{flex:1}
  .tour-btns button{height:44px;padding:0 16px;border-radius:12px;font:inherit;font-weight:600;cursor:pointer;border:1px solid rgb(var(--fg) / .22);background:rgb(var(--fg) / .05);color:inherit}
  .tour-btns .next{background:var(--accent,#f3f4f6);color:var(--on-accent,#0a0b0e);border-color:var(--accent,#f3f4f6)}
  .tour-btns .next.gold{background:linear-gradient(90deg,#f5c451,#fff1b8);border:0}
  .tour-btns .skip{border:0;background:none;color:var(--muted,#a7aebb);text-decoration:underline;text-underline-offset:3px;padding:0 4px;font-weight:500}
  .tour-btns button:focus-visible{outline:3px solid #ffd76a;outline-offset:3px}
  .tour-burst{position:fixed;pointer-events:none;z-index:81;width:8px;height:8px;border-radius:2px;left:0;top:0;animation:tourConf 1.4s cubic-bezier(.2,.7,.4,1) forwards}
  @keyframes tourConf{from{opacity:1;transform:translate(var(--x0),var(--y0)) rotate(0)}to{opacity:0;transform:translate(calc(var(--x0) + var(--dx)),calc(var(--y0) + var(--dy))) rotate(var(--r))}}
  html[data-motion="reduce"] .tour *{transition:none!important;animation:none!important}
  `;
  const st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);

  let el = null, hole, card, shade, cur = 0, raf = 0, typer = 0, lastFocus = null, targetEl = null;

  function visible(node){
    if(!node) return false;
    const r = node.getBoundingClientRect();
    return r.width > 0 && r.height > 0 && getComputedStyle(node).visibility !== "hidden";
  }
  function resolve(step){
    let t = step.el ? document.querySelector(step.el) : null, alt = false;
    if(t && !visible(t) && step.alt){ t = document.querySelector(step.alt); alt = true; }
    return { t: visible(t) ? t : null, alt };
  }

  function build(){
    el = document.createElement("div"); el.className = "tour";
    el.innerHTML = `<div class="tour-shade"></div><div class="tour-hole"></div>
      <div class="tour-card" role="dialog" aria-modal="true" aria-labelledby="tourT" aria-describedby="tourD">
        <div class="tour-top"><span class="tour-av">${window.GandyDev ? window.GandyDev.bot() : ""}</span>
          <div><b>GandyDev</b><small id="tourN">Paso 1 de ${N}</small></div></div>
        <div class="tour-bar" role="progressbar" aria-label="Progreso para abrir The GOATs" aria-valuemin="0" aria-valuemax="100"><i></i></div>
        <div class="tour-dots" aria-hidden="true">${STEPS.map(()=> "<span></span>").join("")}</div>
        <h3 id="tourT"></h3>
        <p id="tourD"></p>
        <div class="tour-btns"><button type="button" class="skip">Saltar</button><span class="sp"></span>
          <button type="button" class="back">Atrás</button><button type="button" class="next">Siguiente</button></div>
      </div>`;
    document.body.appendChild(el);
    hole = el.querySelector(".tour-hole"); card = el.querySelector(".tour-card"); shade = el.querySelector(".tour-shade");
    el.querySelector(".skip").onclick = ()=> end(false);
    el.querySelector(".back").onclick = ()=> go(cur - 1);
    el.querySelector(".next").onclick = ()=>{ if(cur >= N - 1) return end(true); window.AurenSFX && window.AurenSFX.play("step"); go(cur + 1); };
    el.addEventListener("keydown", e=>{
      if(e.key === "Escape"){ e.preventDefault(); end(false); }
      else if(e.key === "ArrowRight"){ e.preventDefault(); el.querySelector(".next").click(); }
      else if(e.key === "ArrowLeft" && cur > 0){ e.preventDefault(); go(cur - 1); }
      else if(e.key === "Tab"){
        const f = [...card.querySelectorAll("button")]; const i = f.indexOf(document.activeElement);
        if(e.shiftKey && i <= 0){ e.preventDefault(); f[f.length - 1].focus(); }
        else if(!e.shiftKey && i === f.length - 1){ e.preventDefault(); f[0].focus(); }
      }
    });
  }

  function typeText(p, text){
    clearInterval(typer);
    const av = card.querySelector(".tour-av");
    if(still()){ p.textContent = text; return; }
    let i = 0; p.textContent = ""; av.classList.add("talk");
    typer = setInterval(()=>{ i += 1; p.textContent = text.slice(0, i); if(i >= text.length){ clearInterval(typer); av.classList.remove("talk"); } }, 22);
  }

  function place(){
    if(!el) return;
    const pad = 8, gap = 14, cw = card.offsetWidth, ch = card.offsetHeight;
    let cx, cy;
    if(targetEl && visible(targetEl)){
      const r = targetEl.getBoundingClientRect();
      shade.style.display = "none"; hole.style.display = "";
      hole.style.width = (r.width + pad * 2) + "px"; hole.style.height = (r.height + pad * 2) + "px";
      hole.style.transform = `translate(${r.left - pad}px, ${r.top - pad}px)`;
      cx = Math.max(12, Math.min(innerWidth - cw - 12, r.left + r.width / 2 - cw / 2));
      const below = r.bottom + pad + gap, above = r.top - pad - gap - ch;
      cy = (below + ch < innerHeight - 12) ? below : (above > 12 ? above : Math.max(12, innerHeight - ch - 12));
    } else {
      hole.style.display = "none"; shade.style.display = "";
      cx = (innerWidth - cw) / 2; cy = (innerHeight - ch) / 2;
    }
    card.style.transform = `translate(${Math.round(cx)}px, ${Math.round(cy)}px)`;
    raf = requestAnimationFrame(place);
  }

  function burst(){
    if(still()) return;
    const r = card.getBoundingClientRect(), colors = ["#f5c451", "#fff1b8", "#3ddc97", "#ff5d73", "#f3f4f6"];
    for(let i = 0; i < 46; i++){
      const b = document.createElement("i"); b.className = "tour-burst";
      b.style.background = colors[i % colors.length];
      b.style.setProperty("--x0", (r.left + r.width / 2) + "px"); b.style.setProperty("--y0", (r.top + 20) + "px");
      b.style.setProperty("--dx", ((Math.random() - .5) * 520) + "px"); b.style.setProperty("--dy", (-80 - Math.random() * 260) + "px");
      b.style.setProperty("--r", (Math.random() * 720) + "deg"); b.style.animationDelay = (Math.random() * 120) + "ms";
      document.body.appendChild(b); setTimeout(()=> b.remove(), 1700);
    }
  }

  function go(i){
    cur = Math.max(0, Math.min(N - 1, i));
    const s = STEPS[cur], { t, alt } = resolve(s);
    targetEl = t;
    if(t){
      const r = t.getBoundingClientRect();
      if(r.top < 80 || r.bottom > innerHeight - 220) t.scrollIntoView({ block:"center", behavior: still() ? "auto" : "smooth" });
    }
    const pct = Math.round((cur + 1) / N * 100);
    card.querySelector("#tourN").textContent = s.final ? "¡Completado!" : `Paso ${cur + 1} de ${N} · ${pct}% para abrir The GOATs`;
    const bar = card.querySelector(".tour-bar"); bar.setAttribute("aria-valuenow", pct); bar.firstElementChild.style.width = pct + "%";
    card.querySelectorAll(".tour-dots span").forEach((d, k)=> d.classList.toggle("on", k <= cur));
    card.querySelector("#tourT").textContent = s.t;
    typeText(card.querySelector("#tourD"), alt && s.altD ? s.altD : s.d);
    card.querySelector(".back").hidden = cur === 0;
    const next = card.querySelector(".next");
    next.textContent = s.final ? "Ver The GOATs" : cur === N - 2 ? "Abrir The GOATs" : "Siguiente";
    next.classList.toggle("gold", cur >= N - 2);
    hole.classList.toggle("pulse", !!s.final);
    const prev = +(store.get("auren_tour_step") || 0);
    if(cur + 1 > prev){ store.set("auren_tour_step", String(cur + 1)); window.dispatchEvent(new Event("auren:tour-progress")); }
    if(s.final){ window.dispatchEvent(new Event("auren:goats-unlock")); burst(); window.AurenSFX && window.AurenSFX.play("unlock"); }
    if(window.GandyDev){ if(t && t.classList.contains("gd")) window.GandyDev.say("¡Ese soy yo! 👋", 2500); }
    setTimeout(()=> next.focus({ preventScroll:true }), 30);
  }

  function start(from = 0){
    if(el) return;
    lastFocus = document.activeElement;
    build(); document.body.classList.add("tour-on");
    if(window.GandyDev) window.GandyDev.hold(true);
    // si ya terminaste antes, vuelve a empezar desde el principio
    go(from >= N ? 0 : Math.max(0, from - (from ? 1 : 0)));
    raf = requestAnimationFrame(place);
  }
  function end(completed){
    if(!el) return;
    cancelAnimationFrame(raf); clearInterval(typer);
    el.remove(); el = null; document.body.classList.remove("tour-on");
    if(window.GandyDev) window.GandyDev.hold(false);
    store.set("auren_tour", completed ? "done" : "skipped");
    if(completed){
      const g = document.getElementById("goats");
      if(g) g.scrollIntoView({ block:"start", behavior: still() ? "auto" : "smooth" });
    } else if(lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll:true });
  }

  window.AurenTour = { start, end, steps: N };

  // primera visita (o ?tour=1): arranca solo
  const qs = new URLSearchParams(location.search);
  if((document.body.dataset.page || "home") === "home" && (qs.has("tour") || !store.get("auren_tour"))){
    let tries = 0;
    const wait = () => (window.GandyDev || ++tries > 20 ? start(0) : setTimeout(wait, 150));
    setTimeout(wait, qs.has("tour") ? 400 : 1600);
  }
})();
