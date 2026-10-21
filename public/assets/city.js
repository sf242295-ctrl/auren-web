// =========================================================
//  CIUDAD VIVA — Nueva York de noche, estilo foto de larga exposición
//  Desenfoque, luces bokeh, estelas de tráfico, reflejos y niebla.
//  Eventos: persecución, ambulancia, tren, helicóptero, avión,
//  apagón, oficinas encendiéndose y lluvia con relámpagos.
// =========================================================
(function city(){
  const cv = document.getElementById("city");
  const ctx = cv.getContext("2d");
  const radioMsg = document.getElementById("radioMsg");
  const pauseBtn = document.getElementById("cityPause");
  const pauseIcon = document.getElementById("pauseIcon");
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const mobile = matchMedia("(max-width:700px)").matches;
  const DIMMED = document.body.dataset.city === "dim";
  const DIM_BASE = DIMMED ? .55 : .12, DIM_MAX = DIMMED ? .7 : .6;
  const rnd = (a,b)=> a + Math.random()*(b-a);
  const pick = a => a[Math.random()*a.length|0];
  const canFilter = "filter" in ctx;

  let W=0, H=0, DPR=1, groundY=0, trackY=0, lastW=0;
  let sky=null, road=null, layers=[], live=[], lamps=[], cars=[], bokeh=[], fog=[], drops=[], stars=[], timers=[];
  let train=null, heli=null, plane=null, blackout=null, wave=null, flash=0, rain=0, rainTarget=0;
  let scrollY=0, mx=0, tmx=0, t=0, last=0, paused=false, running=false, nextEvent=3, lastEvent="";

  /* ---------- sprites de luz (rápidos de dibujar) ---------- */
  const sprites = {};
  function glowSprite(rgb){
    if(sprites[rgb]) return sprites[rgb];
    const c = document.createElement("canvas"); c.width = c.height = 128;
    const g = c.getContext("2d"), gr = g.createRadialGradient(64,64,0,64,64,64);
    gr.addColorStop(0, `rgba(${rgb},1)`); gr.addColorStop(.25, `rgba(${rgb},.55)`); gr.addColorStop(.6, `rgba(${rgb},.12)`); gr.addColorStop(1, `rgba(${rgb},0)`);
    g.fillStyle = gr; g.fillRect(0,0,128,128);
    return sprites[rgb] = c;
  }
  function glow(x, y, r, rgb, a){
    if(a <= 0) return;
    ctx.globalAlpha = Math.min(1, a);
    ctx.drawImage(glowSprite(rgb), x-r, y-r, r*2, r*2);
    ctx.globalAlpha = 1;
  }
  const WARM = "255,206,150", WHITE = "246,242,234", COOL = "205,220,248", RED = "255,58,58", BLUE = "70,120,255", SODIUM = "255,170,95";

  function setRadio(text){
    radioMsg.style.opacity = 0;
    setTimeout(()=>{ radioMsg.textContent = text; radioMsg.style.opacity = 1; }, 350);
  }
  const after = (s, fn)=> timers.push({at:t+s, fn});

  /* ---------- capas de edificios (se dibujan una vez, con desenfoque) ---------- */
  const LAYERS = [
    {name:"far",  color:[13,17,27],  hmin:.32, hmax:.6,  wmin:46, wmax:96,  gap:3,  win:[2,3,6,9],   lit:.2,  blur:3.2, par:.03, mpar:.3},
    {name:"mid",  color:[9,12,19],   hmin:.22, hmax:.5,  wmin:54, wmax:118, gap:5,  win:[3,4,8,11],  lit:.17, blur:1.5, par:.06, mpar:.6},
    {name:"near", color:[4,6,10],    hmin:.12, hmax:.38, wmin:64, wmax:136, gap:9,  win:[3,5,10,14], lit:.13, blur:0,   par:.1,  mpar:1, landmarks:true}
  ];
  const winColor = ()=>{ const r = Math.random(); return r < .5 ? WARM : r < .8 ? WHITE : COOL; };

  function buildLayer(cfg){
    const w = W + 60;
    const raw = document.createElement("canvas");
    raw.width = Math.ceil(w*DPR); raw.height = Math.ceil(H*DPR);
    const g = raw.getContext("2d"); g.scale(DPR,DPR);
    const [r,gc,b] = cfg.color;
    const blds = [], wins = [];

    const fillGrad = (top)=>{ const gr = g.createLinearGradient(0, top, 0, groundY); gr.addColorStop(0, `rgb(${r+6},${gc+7},${b+10})`); gr.addColorStop(1, `rgb(${r},${gc},${b})`); return gr; };
    function addBuilding(x, tiers, opts={}){
      const bd = {x, tiers:[], wins:[], ...opts};
      let base = groundY;
      tiers.forEach(tr=>{
        const left = x + (tiers[0].w - tr.w)/2, top = base - tr.h;
        g.fillStyle = fillGrad(top); g.fillRect(left, top, tr.w, tr.h);
        bd.tiers.push({left, top, w:tr.w, bottom:base});
        base = top;
      });
      bd.top = base;
      if(opts.spire){ g.fillStyle = `rgb(${r},${gc},${b})`; g.fillRect(x + tiers[0].w/2 - 1.2, base - opts.spire, 2.4, opts.spire); bd.antenna = {x:x + tiers[0].w/2, y:base - opts.spire}; }
      if(opts.crown){
        const cx = x + tiers[0].w/2, tw = tiers.at(-1).w;
        g.fillStyle = `rgb(${r+4},${gc+5},${b+8})`;
        g.beginPath(); g.moveTo(cx - tw/2, base); g.lineTo(cx, base - opts.crown); g.lineTo(cx + tw/2, base); g.fill();
        g.fillRect(cx - 1, base - opts.crown - 26, 2, 26);
        bd.antenna = {x:cx, y:base - opts.crown - 26};
      }
      const [ww, wh, sx, sy] = cfg.win;
      bd.tiers.forEach(tr=>{
        for(let y = tr.top + 8; y < tr.bottom - wh - 6; y += sy){
          for(let xx = tr.left + 5; xx < tr.left + tr.w - ww - 4; xx += sx){
            const wi = {x:xx, y, w:ww, h:wh, col:winColor(), a:rnd(.35,.95), b:bd};
            if(Math.random() < cfg.lit){
              g.fillStyle = `rgba(${wi.col},${wi.a})`; g.fillRect(xx, y, ww, wh);
            } else { bd.wins.push(wi); wins.push(wi); }
          }
        }
      });
      blds.push(bd);
    }

    const reserved = [];
    if(cfg.landmarks){
      const s = Math.max(.7, Math.min(1.2, H/900));
      let x = W*.2;  reserved.push([x-8, x+96*s]);
      addBuilding(x, [{w:88*s,h:H*.27},{w:62*s,h:H*.06},{w:40*s,h:H*.05},{w:22*s,h:H*.04}], {spire:66*s, landmark:true});
      x = W*.5; reserved.push([x-8, x+76*s]);
      addBuilding(x, [{w:68*s,h:H*.25},{w:50*s,h:H*.07},{w:34*s,h:H*.03}], {crown:44*s, landmark:true});
      x = W*.78; reserved.push([x-8, x+88*s]);
      addBuilding(x, [{w:82*s,h:H*.12},{w:70*s,h:H*.1},{w:58*s,h:H*.1},{w:44*s,h:H*.08},{w:28*s,h:H*.06}], {spire:86*s, landmark:true});
    }
    let x = -20;
    while(x < w){
      const bw = rnd(cfg.wmin, cfg.wmax) * (mobile ? .8 : 1);
      if(reserved.some(([a,bb])=> x+bw > a && x < bb)){ x += 12; continue; }
      const tiers = [{w:bw, h:rnd(cfg.hmin, cfg.hmax)*H}];
      if(Math.random() < .28) tiers.push({w:bw*.6, h:rnd(14,40)});
      addBuilding(x, tiers);
      x += bw + rnd(1, cfg.gap);
    }

    let canvas = raw;
    if(cfg.blur && canFilter){
      const soft = document.createElement("canvas");
      soft.width = raw.width; soft.height = raw.height;
      const sg = soft.getContext("2d");
      sg.filter = `blur(${cfg.blur*DPR}px)`;
      sg.drawImage(raw, 0, 0);
      canvas = soft;
    }
    return {cfg, canvas, blds, wins};
  }

  /* ---------- montaje ---------- */
  function build(){
    DPR = Math.min(window.devicePixelRatio || 1, mobile ? 1.25 : 1.5);
    W = window.innerWidth; H = window.innerHeight; lastW = W;
    cv.width = Math.ceil(W*DPR); cv.height = Math.ceil(H*DPR);
    ctx.setTransform(DPR,0,0,DPR,0,0);
    groundY = Math.round(H*.86);
    trackY = groundY - Math.max(42, H*.075);

    sky = ctx.createLinearGradient(0,0,0,groundY);
    sky.addColorStop(0, "#010204"); sky.addColorStop(.5, "#060910"); sky.addColorStop(.85, "#0d121c"); sky.addColorStop(1, "#191b22");
    road = ctx.createLinearGradient(0, groundY, 0, H);
    road.addColorStop(0, "#0a0b0f"); road.addColorStop(1, "#040506");

    layers = LAYERS.map(buildLayer);

    // ventanas que se prenden y apagan en vivo
    live = [];
    const pool = [...layers[2].wins.map(w=>({w, L:2})), ...layers[1].wins.map(w=>({w, L:1}))];
    const n = mobile ? 45 : 90;
    for(let i=0;i<n && pool.length;i++){
      const p = pool.splice(Math.random()*pool.length|0, 1)[0];
      live.push({...p, on: Math.random()<.5, a:0, next: rnd(1,14)});
    }

    stars = Array.from({length: mobile ? 30 : 60}, ()=>({x:Math.random()*W, y:Math.random()*H*.35, r:rnd(.4,1.1), p:Math.random()*6}));
    lamps = []; for(let x = 40; x < W + 40; x += mobile ? 150 : 210) lamps.push({x, f:0, on:true});
    bokeh = Array.from({length: mobile ? 5 : 9}, ()=>({x:Math.random()*W, y:rnd(H*.15,H*.95), r:rnd(26,90), vx:rnd(-6,6), col:pick([WARM,COOL,WHITE,SODIUM]), a:rnd(.025,.06)}));
    fog = Array.from({length:4}, (_,i)=>({x:Math.random()*W, y:groundY - rnd(10,120), rx:rnd(W*.3,W*.6), ry:rnd(30,70), vx:rnd(4,10)*(i%2?1:-1)}));
    cars = []; drops = [];
    for(let i=0;i<(mobile?5:10);i++){ spawnCar(0, Math.random()*W); spawnCar(1, Math.random()*W); }
  }

  /* ---------- tráfico: estelas de luz ---------- */
  const laneY = l => groundY + (H-groundY) * (l===0 ? .3 : .68);
  function spawnCar(lane, x, type="car"){
    const dir = lane===0 ? 1 : -1;
    const base = {car:rnd(150,260), flee:520, police:560, ambulance:420}[type];
    if(x === undefined) x = dir>0 ? -40 : W+40;
    cars.push({lane, dir, type, x, speed:base, trail:base*rnd(.5,.75), off:rnd(-3,3)});
  }
  function updateCars(dt){
    [0,1].forEach(lane=>{
      const count = cars.filter(c=>c.lane===lane && c.type==="car").length;
      const target = Math.round(W / (mobile ? 110 : 120));
      if(count < target && Math.random() < dt*2.2) spawnCar(lane);
    });
    cars.forEach(c=> c.x += c.dir*c.speed*(1/1)*dt);
    cars = cars.filter(c=> c.x > -c.trail-60 && c.x < W + c.trail + 60);
  }
  function drawTrail(c, k){
    // carril 0: luces traseras rojas; carril 1: faros blancos
    const y = laneY(c.lane) + c.off;
    const red = c.lane===0 && c.type==="car";
    const rgb = c.type==="police" || c.type==="ambulance" ? WHITE : red ? "255,64,54" : "255,244,226";
    const tail = c.x - c.dir*c.trail;
    const width = c.lane===1 ? 2.6 : 1.8;
    const gr = ctx.createLinearGradient(tail, y, c.x, y);
    gr.addColorStop(0, `rgba(${rgb},0)`); gr.addColorStop(1, `rgba(${rgb},${.9*k})`);
    ctx.strokeStyle = gr; ctx.lineCap = "round";
    ctx.lineWidth = width*4; ctx.globalAlpha = .18; ctx.beginPath(); ctx.moveTo(tail, y); ctx.lineTo(c.x, y); ctx.stroke();
    ctx.lineWidth = width; ctx.globalAlpha = 1; ctx.beginPath(); ctx.moveTo(tail, y); ctx.lineTo(c.x, y); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(tail, y+width*1.6); ctx.lineTo(c.x, y+width*1.6); ctx.globalAlpha = .55; ctx.stroke(); ctx.globalAlpha = 1;
    // reflejo en el asfalto mojado
    const refl = .1 + rain*.25;
    ctx.lineWidth = width*3; ctx.globalAlpha = refl; ctx.beginPath(); ctx.moveTo(tail, y + 9); ctx.lineTo(c.x, y + 9); ctx.stroke(); ctx.globalAlpha = 1;
    glow(c.x, y, c.lane===1 ? 9 : 6, rgb, .7*k);
    if(c.type==="police" || c.type==="ambulance"){
      const ph = Math.floor(t*7)%2;
      const col = c.type==="police" ? (ph ? RED : BLUE) : (ph ? RED : WHITE);
      glow(c.x - c.dir*6, y - 10, 46, col, .9*k);
      glow(c.x - c.dir*6, y - 10, 220, col, .16*k);
      glow(c.x - c.dir*6, y + 14, 60, col, .2*k*(1+rain));
    }
  }

  /* ---------- eventos ---------- */
  const EVENTS = {
    chase(){
      setRadio("Persecución policial bajando por la 5ta Avenida");
      const lane = Math.random()<.5 ? 0 : 1;
      spawnCar(lane, undefined, "flee");
      after(.6, ()=> spawnCar(lane, undefined, "police"));
      after(1.3, ()=> spawnCar(lane, undefined, "police"));
    },
    ambulance(){
      setRadio("Ambulancia de Auren Medical en camino a Harlem");
      spawnCar(Math.random()<.5 ? 0 : 1, undefined, "ambulance");
    },
    train(){
      setRadio("Pasa el tren de la línea 7 por Queens");
      const dir = Math.random()<.5 ? 1 : -1, carL = mobile ? 64 : 88, n = 6;
      train = {dir, carL, n, x: dir>0 ? -carL*n - 20 : W + 20, speed: mobile ? 340 : 480};
    },
    heli(){
      setRadio("Helicóptero de la policía sobre Midtown");
      const dir = Math.random()<.5 ? 1 : -1;
      heli = {dir, x: dir>0 ? -60 : W+60, y: H*rnd(.12,.2), speed: rnd(50,75), sweep: Math.random()*6};
    },
    plane(){
      setRadio("Vuelo de llegada aterrizando en JFK");
      const dir = Math.random()<.5 ? 1 : -1;
      plane = {dir, x: dir>0 ? -20 : W+20, y: H*rnd(.06,.14), speed: rnd(40,60)};
    },
    blackout(){
      setRadio("Apagón en un edificio de Washington Heights");
      const list = layers[2].blds.filter(b=>!b.landmark && b.tiers[0].w > 60);
      if(!list.length) return;
      blackout = {b: pick(list), a:0, phase:"in", hold: rnd(5,8), t:0};
    },
    wave(){
      setRadio("Se encienden las oficinas en Wall Street");
      const L = Math.random()<.6 ? 2 : 1;
      const list = layers[L].blds.filter(b=> b.wins.length > 20);
      if(!list.length) return;
      const b = pick(list);
      const rows = [...new Set(b.wins.map(w=>w.y))].sort((a,c)=>c-a);
      wave = {b, L, rows, t:0, hold: rnd(5,8), a:1};
    },
    rain(){
      setRadio("Empieza a llover en Manhattan");
      rainTarget = 1;
      after(rnd(14,20), ()=>{ rainTarget = 0; setRadio("Para la lluvia, las calles siguen mojadas"); });
      [3,8,12].forEach(s=> after(s + rnd(0,2), ()=>{ if(rainTarget){ flash = 1; after(.14, ()=> flash = .6); } }));
    }
  };
  function triggerEvent(){
    const options = Object.keys(EVENTS).filter(k=>
      k!==lastEvent && !(k==="train"&&train) && !(k==="heli"&&heli) && !(k==="plane"&&plane) && !(k==="rain"&&rainTarget) && !(k==="blackout"&&blackout) && !(k==="wave"&&wave));
    const k = pick(options); lastEvent = k; EVENTS[k]();
  }

  /* ---------- actualización ---------- */
  function update(dt){
    t += dt;
    for(let i=timers.length-1;i>=0;i--) if(timers[i].at <= t){ const f = timers[i].fn; timers.splice(i,1); f(); }
    nextEvent -= dt;
    if(nextEvent <= 0){ triggerEvent(); nextEvent = rnd(7,13); }

    live.forEach(l=>{
      l.next -= dt;
      if(l.next <= 0){ l.on = !l.on; l.next = l.on ? rnd(4,20) : rnd(2,12); }
      l.a += ((l.on ? 1 : 0) - l.a) * Math.min(1, dt*3);
    });

    updateCars(dt);
    mx += (tmx - mx) * Math.min(1, dt*2.5);

    if(train){ train.x += train.dir*train.speed*dt; if(train.dir>0 ? train.x > W+20 : train.x < -train.carL*train.n-20) train = null; }
    if(heli){ heli.x += heli.dir*heli.speed*dt; heli.sweep += dt*.8; if(heli.x < -120 || heli.x > W+120) heli = null; }
    if(plane){ plane.x += plane.dir*plane.speed*dt; if(plane.x < -40 || plane.x > W+40) plane = null; }

    if(blackout){
      const bo = blackout; bo.t += dt;
      if(bo.phase==="in"){ bo.a = bo.t < .5 ? (Math.random()<.5 ? 1 : .3) : 1; if(bo.t > .5){ bo.phase="hold"; bo.t=0; } }
      else if(bo.phase==="hold"){ bo.a = 1; if(bo.t > bo.hold){ bo.phase="out"; bo.t=0; } }
      else { bo.a = Math.max(0, 1 - bo.t/1.6); if(bo.a <= 0) blackout = null; }
    }
    if(wave){ wave.t += dt; const total = wave.rows.length*.08; if(wave.t > total + wave.hold) wave.a -= dt*.6; if(wave.a <= 0) wave = null; }

    bokeh.forEach(b=>{ b.x += b.vx*dt; if(b.x < -b.r) b.x = W + b.r; if(b.x > W + b.r) b.x = -b.r; });
    fog.forEach(f=>{ f.x += f.vx*dt; if(f.x - f.rx > W) f.x = -f.rx; if(f.x + f.rx < 0) f.x = W + f.rx; });

    rain += (rainTarget - rain) * Math.min(1, dt*.7);
    const want = Math.round(rain * (mobile ? 90 : 200));
    while(drops.length < want) drops.push({x: Math.random()*(W+120), y: Math.random()*-H, v: rnd(900,1300), l: rnd(14,26)});
    if(drops.length > want) drops.length = want;
    drops.forEach(d=>{ d.y += d.v*dt; d.x -= d.v*dt*.12; if(d.y > H){ d.y = rnd(-80,0); d.x = Math.random()*(W+120); } });
    flash = Math.max(0, flash - dt*3);

    lamps.forEach(l=>{ if(l.f > 0){ l.f -= dt; l.on = Math.random() > .45; } else { l.on = true; if(Math.random() < dt*.02) l.f = rnd(.6,1.8); } });
  }

  /* ---------- dibujo ---------- */
  const layerX = L => -30 + mx*10*L.cfg.mpar;
  const layerY = (L, sy) => -sy*L.cfg.par;

  function draw(){
    const sy = Math.min(scrollY, H*1.5);
    ctx.globalCompositeOperation = "source-over"; ctx.globalAlpha = 1;
    ctx.fillStyle = sky; ctx.fillRect(0,0,W,H);
    // contaminación lumínica en el horizonte
    glow(W*.5, groundY - sy*.04, Math.max(W,H)*.75, "120,105,95", .16);

    if(rain < .5){
      stars.forEach(s=>{ ctx.globalAlpha = (.18 + .18*Math.sin(t*1.2 + s.p)) * (1-rain*2); ctx.fillStyle = "#e8ecf4"; ctx.beginPath(); ctx.arc(s.x, s.y - sy*.01, s.r, 0, 7); ctx.fill(); });
      ctx.globalAlpha = 1;
      glow(W*.84, H*.13 - sy*.015, 90, "220,228,245", .1*(1-rain*2));
      glow(W*.84, H*.13 - sy*.015, 16, "236,240,248", .75*(1-rain*2));
    }

    if(plane){
      const on = Math.floor(t*1.5)%2;
      glow(plane.x, plane.y, 5, RED, .9);
      if(on) glow(plane.x + plane.dir*10, plane.y, 10, WHITE, 1);
    }

    // edificios
    layers.forEach((L,i)=>{
      ctx.drawImage(L.canvas, layerX(L), layerY(L, sy), W+60, H);
      // niebla entre capas
      if(i===0 || i===1) fog.forEach(f=>{ ctx.globalAlpha = .05; ctx.fillStyle = "#9aa3b5"; ctx.beginPath(); ctx.ellipse(f.x, f.y - sy*(.03+i*.03), f.rx, f.ry, 0, 0, 7); ctx.fill(); ctx.globalAlpha = 1; });
    });

    // ventanas en vivo
    live.forEach(l=>{
      if(l.a < .02) return;
      if(blackout && l.w.b === blackout.b) return;
      const L = layers[l.L], x = l.w.x + layerX(L), y = l.w.y + layerY(L, sy);
      ctx.globalAlpha = l.a * l.w.a; ctx.fillStyle = `rgb(${l.w.col})`; ctx.fillRect(x, y, l.w.w, l.w.h); ctx.globalAlpha = 1;
    });
    // oficinas encendiéndose
    if(wave){
      const L = layers[wave.L], ox = layerX(L), oy = layerY(L, sy);
      wave.rows.forEach((ry, i)=>{
        const a = Math.min(1, Math.max(0, (wave.t - i*.08) * 4)) * wave.a;
        if(a <= 0) return;
        ctx.globalAlpha = a*.9; ctx.fillStyle = `rgb(${WHITE})`;
        wave.b.wins.forEach(w=>{ if(w.y === ry) ctx.fillRect(w.x + ox, w.y + oy, w.w, w.h); });
      });
      ctx.globalAlpha = 1;
    }
    // apagón: el edificio queda a oscuras
    if(blackout){
      const L = layers[2], ox = layerX(L), oy = layerY(L, sy), [r,g,b] = L.cfg.color;
      ctx.globalAlpha = blackout.a; ctx.fillStyle = `rgb(${r},${g},${b})`;
      blackout.b.tiers.forEach(tr=> ctx.fillRect(tr.left + ox, tr.top + oy, tr.w, tr.bottom - tr.top));
      ctx.globalAlpha = 1;
    }

    const nearX = layerX(layers[2]), nearY = layerY(layers[2], sy);
    ctx.save(); ctx.translate(0, nearY);

    // vía elevada y tren
    ctx.fillStyle = "#05070b"; ctx.fillRect(0, trackY, W, 5);
    for(let x = ((nearX % 120) + 120) % 120 - 120; x < W + 120; x += 120) ctx.fillRect(x, trackY + 5, 4, groundY - trackY - 5);
    if(train){
      for(let i=0;i<train.n;i++){
        const cx = train.x + i*train.carL;
        ctx.fillStyle = "#07090e"; ctx.fillRect(cx + 2, trackY - 20, train.carL - 4, 18);
        for(let wx = cx + 8; wx < cx + train.carL - 12; wx += 12){ ctx.fillStyle = `rgba(${WARM},.85)`; ctx.fillRect(wx, trackY - 16, 7, 6); }
      }
    }

    // acera y calle
    ctx.fillStyle = "#07080b"; ctx.fillRect(0, groundY - 2, W, 6);
    ctx.fillStyle = road; ctx.fillRect(0, groundY + 4, W, H - groundY + 300);
    ctx.restore();

    // oscurecer al bajar para leer el contenido
    const dim = DIM_BASE + Math.min(scrollY / (H*.9), 1) * (DIM_MAX - DIM_BASE);
    ctx.fillStyle = `rgba(4,5,7,${dim})`; ctx.fillRect(0,0,W,H);
    const k = 1 - dim*.45;

    // ---- luces (modo aditivo, por encima del oscurecido) ----
    ctx.globalCompositeOperation = "lighter";
    ctx.save(); ctx.translate(0, nearY);
    // antenas
    if(Math.floor(t*1.1)%2===0) layers[2].blds.forEach(b=>{ if(b.antenna) glow(b.antenna.x + nearX, b.antenna.y, 9, RED, .85*k); });
    // farolas de sodio con reflejo
    lamps.forEach(l=>{
      if(!l.on) return;
      glow(l.x, groundY - 46, 30, SODIUM, .55*k);
      glow(l.x, groundY - 46, 5, "255,222,180", .9*k);
      const g = ctx.createLinearGradient(0, groundY + 4, 0, groundY + 60);
      g.addColorStop(0, `rgba(${SODIUM},${(.12 + rain*.2)*k})`); g.addColorStop(1, `rgba(${SODIUM},0)`);
      ctx.fillStyle = g; ctx.fillRect(l.x - 7, groundY + 4, 14, 56);
    });
    // tren iluminado
    if(train) glow(train.x + train.carL*train.n/2, trackY - 12, train.carL*train.n*.42, WARM, .1*k);
    // tráfico
    cars.forEach(c=> drawTrail(c, k));
    ctx.restore();

    // helicóptero con reflector
    if(heli){
      const gx = heli.x + Math.sin(heli.sweep)*Math.min(240, W*.25), gy = groundY + nearY;
      const cone = ctx.createLinearGradient(heli.x, heli.y, gx, gy);
      cone.addColorStop(0, `rgba(${COOL},${.22*k})`); cone.addColorStop(1, `rgba(${COOL},${.03*k})`);
      ctx.fillStyle = cone; ctx.beginPath(); ctx.moveTo(heli.x-2, heli.y+3); ctx.lineTo(gx-56, gy); ctx.lineTo(gx+56, gy); ctx.lineTo(heli.x+2, heli.y+3); ctx.closePath(); ctx.fill();
      glow(gx, gy, 70, COOL, .2*k);
      glow(heli.x, heli.y, 4, WHITE, .9);
      if(Math.floor(t*2)%2) glow(heli.x - heli.dir*16, heli.y, 7, RED, .9);
    }

    // bokeh en primer plano (desenfoque de cámara)
    bokeh.forEach(b=> glow(b.x + mx*24, b.y, b.r, b.col, b.a*(1+rain)));

    // lluvia
    if(drops.length){
      ctx.strokeStyle = `rgba(200,210,230,${.22*rain})`; ctx.lineWidth = 1; ctx.beginPath();
      drops.forEach(d=>{ ctx.moveTo(d.x, d.y); ctx.lineTo(d.x + d.l*.12, d.y - d.l); }); ctx.stroke();
    }
    if(flash > 0){ ctx.fillStyle = `rgba(190,205,235,${flash*.14})`; ctx.fillRect(0,0,W,H); }
    ctx.globalCompositeOperation = "source-over";
    if(rain > .02){ ctx.fillStyle = `rgba(10,13,20,${.18*rain})`; ctx.fillRect(0,0,W,H); }
  }

  /* ---------- grano de película (fijo, muy suave) ---------- */
  (function grain(){
    try{
      const c = document.createElement("canvas"); c.width = c.height = 160;
      const g = c.getContext("2d"), img = g.createImageData(160,160);
      for(let i=0;i<img.data.length;i+=4){ const v = Math.random()*255; img.data[i]=img.data[i+1]=img.data[i+2]=v; img.data[i+3]=255; }
      g.putImageData(img,0,0);
      const d = document.createElement("div");
      d.setAttribute("aria-hidden","true"); d.className = "grain";
      d.style.cssText = `position:fixed;inset:0;z-index:0;pointer-events:none;opacity:.045;mix-blend-mode:overlay;background-image:url(${c.toDataURL()})`;
      cv.after(d);
    }catch(e){}
  })();

  /* ---------- bucle ---------- */
  function loop(now){
    if(!running) return;
    const dt = Math.min((now - last)/1000, .05); last = now;
    update(dt); draw();
    requestAnimationFrame(loop);
  }
  const root = document.documentElement;
  const userStill = ()=> root.dataset.motion === "reduce" || root.dataset.contrast === "high" || root.dataset.theme === "light";
  function start(){ if(running || paused || reduce || userStill()) return; running = true; last = performance.now(); requestAnimationFrame(loop); }
  function stop(){ running = false; }

  build(); draw();
  document.addEventListener("auren:prefs", ()=>{ if(userStill()) stop(); else start(); });
  if(reduce){ paused = true; setRadio("Animación en pausa (movimiento reducido)"); pauseIcon.setAttribute("d","M8 5v14l11-7z"); }
  else start();

  addEventListener("scroll", ()=>{ scrollY = window.scrollY; if(!running) draw(); }, {passive:true});
  addEventListener("pointermove", e=>{ if(e.pointerType==="mouse") tmx = (e.clientX / W - .5) * 2; }, {passive:true});
  let rt; addEventListener("resize", ()=>{ clearTimeout(rt); rt = setTimeout(()=>{ if(window.innerWidth !== lastW || Math.abs(window.innerHeight - H) > 160){ build(); draw(); } }, 200); });
  document.addEventListener("visibilitychange", ()=>{ if(document.hidden) stop(); else start(); });
  pauseBtn.addEventListener("click", ()=>{
    paused = !paused;
    pauseBtn.setAttribute("aria-label", paused ? "Reanudar animación de la ciudad" : "Pausar animación de la ciudad");
    pauseBtn.title = paused ? "Reanudar ciudad" : "Pausar ciudad";
    pauseIcon.setAttribute("d", paused ? "M8 5v14l11-7z" : "M7 5h3v14H7zM14 5h3v14h-3z");
    if(paused) stop(); else start();
  });
})();
