/* =========================================================
   AUREN RP — Panel del staff (en vivo con el admin menu)
   Cada acción pasa por el menú del servidor con los permisos
   de tu rango. Si la web no está en Cloudflare (vista previa),
   se abre en modo demostración con datos de ejemplo.
   ========================================================= */
(function(){
  const A = window.Auren, esc = A.esc;
  const $ = (s, el=document) => el.querySelector(s);
  const root = $("#root"), dlg = $("#dlg"), pdlg = $("#pdlg");
  const conn = $("#conn"), connText = $("#connText"), meTag = $("#meTag");

  /* ---------- utilidades ---------- */
  const list = v => Array.isArray(v) ? v : (v && typeof v === "object" ? Object.values(v) : []);
  const num = n => (n == null || isNaN(n)) ? "—" : Number(n).toLocaleString("es");
  const money = n => (n == null || isNaN(n)) ? "—" : "$" + Number(n).toLocaleString("es");
  const toDate = v => { if(v == null) return null; const d = typeof v === "number" ? new Date(v) : new Date(String(v).replace(" ", "T") + (/[zZ+]/.test(String(v)) ? "" : "Z")); return isNaN(d) ? null : d; };
  const when = v => { const d = toDate(v); return d ? d.toLocaleString("es", {day:"numeric", month:"short", hour:"2-digit", minute:"2-digit"}) : "—"; };
  const ago = v => {
    const d = toDate(v); if(!d) return "—";
    const m = Math.round((Date.now() - d) / 60000);
    if(m < 1) return "ahora"; if(m < 60) return `hace ${m} min`;
    const h = Math.round(m/60); if(h < 48) return `hace ${h} h`;
    return `hace ${Math.round(h/24)} días`;
  };
  const mins = m => { m = Math.round(m || 0); const h = Math.floor(m/60); return h ? `${h} h ${m%60} min` : `${m} min`; };
  const ICONS = {
    resumen:'<path d="M3 13h8V3H3zM13 21h8V11h-8zM3 21h8v-6H3zM13 3v6h8V3z"/>',
    jugadores:'<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/>',
    chats:'<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
    baneos:'<path d="M4.9 4.9l14.2 14.2M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20"/>',
    advertencias:'<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0zM12 9v4M12 17h.01"/>',
    carcel:'<path d="M5 3v18M10 3v18M15 3v18M20 3v18M3 3h18M3 21h18"/>',
    registros:'<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M8 13h8M8 17h8"/>',
    staff:'<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/>',
    servidor:'<path d="M2 4h20v6H2zM2 14h20v6H2zM6 7h.01M6 17h.01"/>'
  };
  const icon = k => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[k]}</svg>`;

  /* ---------- conexión en vivo ---------- */
  const RT = {
    ws:null, seq:1, pending:new Map(), demo:false, me:null, retry:0, stop:false,
    call(method, data){
      if(this.demo) return Demo.call(method, data);
      return new Promise((resolve, reject)=>{
        if(!this.ws || this.ws.readyState !== 1) return reject(new Error("No hay conexión con el servidor."));
        const id = String(this.seq++);
        const t = setTimeout(()=>{ this.pending.delete(id); reject(new Error("El servidor no respondió a tiempo.")); }, 25000);
        this.pending.set(id, {resolve, reject, t});
        this.ws.send(JSON.stringify({type:"req", id, method, data}));
      });
    }
  };
  const can = p => !p || !!RT.me?.perms?.[p];
  const canAny = (...ps) => ps.some(can);

  function setConn(state, text){
    conn.className = "pill conn " + state;
    connText.textContent = text;
  }

  function connect(){
    const url = (location.protocol === "https:" ? "wss://" : "ws://") + location.host + "/api/admin/ws";
    let ws;
    try{ ws = new WebSocket(url); }catch(e){ return startDemo(); }
    RT.ws = ws;
    setConn("wait", "Conectando…");
    ws.onmessage = ev=>{
      let m; try{ m = JSON.parse(ev.data); }catch{ return; }
      if(m.type === "bridge"){
        if(!m.online){ setConn("off", "Servidor de FiveM desconectado"); if(!RT.me) renderState("offline"); }
        else setConn("wait", "Verificando tu rango…");
      }
      else if(m.type === "hello"){ RT.retry = 0; RT.me = m.me; setConn("live", "En vivo"); onReady(); }
      else if(m.type === "denied"){ RT.stop = true; renderState("denied", m.error); setConn("off", "Sin acceso"); }
      else if(m.type === "res"){
        const p = RT.pending.get(m.id); if(!p) return;
        clearTimeout(p.t); RT.pending.delete(m.id);
        m.ok ? p.resolve(m.result) : p.reject(new Error(m.error || "No se pudo completar."));
      }
      else if(m.type === "event") onEvent(m);
    };
    ws.onclose = ev=>{
      for(const p of RT.pending.values()){ clearTimeout(p.t); p.reject(new Error("Se cortó la conexión.")); }
      RT.pending.clear();
      if(RT.stop || ev.code === 4403) return;
      setConn("wait", "Reconectando…");
      RT.retry++;
      setTimeout(connect, Math.min(15000, 1000 * 2 ** Math.min(RT.retry, 4)));
    };
  }

  /* ---------- estado de la página ---------- */
  function renderState(kind, detail){
    const T = {
      login:  ["Inicia sesión con Discord", "El panel reconoce tu rango por tu cuenta de Discord, la misma que tienes enlazada en el admin menu.", `<a class="btn btn-primary" href="/api/auth/login" data-auth="login">${window.AUREN_ICON.discord}Iniciar sesión con Discord</a>`],
      denied: ["No tienes acceso al panel", detail || "Tu cuenta de Discord no está enlazada a ningún rango del staff.", `<a class="btn btn-ghost" href="index.html">Volver al inicio</a>`],
      offline:["El servidor de FiveM no está conectado", "En cuanto el servidor se conecte, el panel se abrirá solo. Si tarda, revisa en la consola del servidor el comando auren_web.", ""]
    }[kind];
    root.innerHTML = `<div class="card state-box"><h2>${T[0]}</h2><p>${esc(T[1])}</p>${T[2]}</div>`;
  }

  /* ---------- datos en vivo ---------- */
  const players = new Map();
  let chatsUnread = 0, liveLogs = [], current = "resumen", openChatId = null, openPlayerId = null, cfg = {jailCells:[]};
  const pid = p => Number(p.source ?? p.id);
  const pChar = p => p.char?.name || p.char_name || p.charName || "";
  const pJob = p => p.char?.job ? `${p.char.job.label || p.char.job.name}${p.char.job.gradeName ? " · " + p.char.job.gradeName : ""}` : (p.job || "");

  function setPlayers(arr){ players.clear(); list(arr).forEach(p=>{ if(!isNaN(pid(p))) players.set(pid(p), p); }); refreshLive("players"); }
  let liveTimer = null;
  function refreshLive(what){
    clearTimeout(liveTimer);
    liveTimer = setTimeout(()=>{
      if(current === "jugadores" && what === "players") renderPlayersTable();
      if(current === "resumen") updateOverviewCount();
      if(openPlayerId != null && what === "players" && !players.has(openPlayerId)){ A.toast(`El jugador ${openPlayerId} se desconectó.`); }
    }, 250);
  }

  function onEvent(m){
    if(m.kind === "players"){
      if(m.key === "playerList") setPlayers(m.value);
      else if(m.key === "addPlayer" || m.key === "updatePlayer"){ const p = m.value; if(p && !isNaN(pid(p))) players.set(pid(p), {...(players.get(pid(p))||{}), ...p}); refreshLive("players"); }
      else if(m.key === "removePlayer"){ players.delete(Number(m.value?.source ?? m.value)); refreshLive("players"); }
    }
    else if(m.kind === "log"){
      liveLogs.unshift(m.value); liveLogs = liveLogs.slice(0, 60);
      if(current === "registros") prependLog(m.value);
      if(current === "resumen") renderFeed();
    }
    else if(m.kind === "chat"){
      const cid = m.params?.chatId ?? m.params?.id;
      if(m.method === "backend.chat:receiveMessage"){
        if(current === "chats" && String(openChatId) === String(cid)) appendMsg(m.params.message);
        else { chatsUnread++; updateBadge(); }
      }
      if(m.method === "backend.chat:closed" && current === "chats") loadChats();
    }
    else if(m.kind === "toast"){
      const t = m.params || {}; A.toast([t.title, t.description].filter(Boolean).join(": ") || "Aviso del servidor");
    }
  }

  /* ---------- estructura ---------- */
  const VIEWS = [
    ["resumen", "Resumen", null],
    ["jugadores", "Jugadores", null],
    ["chats", "Chats y reportes", "chats.view"],
    ["baneos", "Baneos", ["moderation.view.bans","player.unban","player.ban"]],
    ["advertencias", "Advertencias", ["moderation.view.warnings","player.warn"]],
    ["carcel", "Cárcel", ["moderation.view.jail","player.jail"]],
    ["registros", "Registros", "logs.view"],
    ["staff", "Staff", "staff.view"],
    ["servidor", "Servidor", ["announcements.create","weather.change","console.execute","resources.read"]]
  ];
  const allowed = v => !v[2] || (Array.isArray(v[2]) ? canAny(...v[2]) : can(v[2]));

  function onReady(){
    meTag.hidden = false;
    meTag.innerHTML = `<span class="dot" style="background:var(--ok)"></span>${esc(RT.me.nickname || "Staff")} · ${esc(RT.me.groupLabel || RT.me.group || "")}`;
    if(root.dataset.ready === "1"){ show(current); return; }
    root.dataset.ready = "1";
    root.innerHTML = `
      ${RT.demo ? `<div class="demo-note" role="note"><b>Vista de demostración.</b> Los datos son de ejemplo y los botones no hacen nada. En tu web publicada en Cloudflare, el panel se conecta en vivo a tu servidor.</div>` : ""}
      <div class="adm">
        <nav class="card side" aria-label="Secciones del panel">
          ${VIEWS.filter(allowed).map(([k,t])=>`<button type="button" data-view="${k}">${icon(k)}<span>${t}</span>${k==="chats"?'<span class="badge" id="chatBadge" hidden></span>':""}</button>`).join("")}
        </nav>
        <section class="card view" id="view" aria-live="polite"></section>
      </div>`;
    root.querySelector(".side").addEventListener("click", e=>{ const b = e.target.closest("[data-view]"); if(b) show(b.dataset.view); });
    RT.call("auren:config").then(c=> cfg = c || cfg).catch(()=>{});
    RT.call("call:getPlayers").then(setPlayers).catch(()=>{});
    const start = (location.hash || "").slice(1);
    show(VIEWS.some(v=>v[0]===start && allowed(v)) ? start : "resumen");
  }

  function updateBadge(){ const b = $("#chatBadge"); if(b){ b.hidden = chatsUnread === 0; b.textContent = chatsUnread; } }

  function show(view){
    current = view;
    root.querySelectorAll("[data-view]").forEach(b=> b.setAttribute("aria-current", b.dataset.view === view ? "page" : "false"));
    try{ history.replaceState(null, "", "#" + view); }catch{}
    const v = $("#view");
    v.onclick = null;
    v.innerHTML = `<p class="sub">Cargando…</p>`;
    ({resumen:viewResumen, jugadores:viewJugadores, chats:viewChats, baneos:viewBaneos, advertencias:viewAdvertencias, carcel:viewCarcel, registros:viewRegistros, staff:viewStaff, servidor:viewServidor}[view] || viewResumen)(v);
  }

  async function run(method, data, okMsg){
    try{
      const r = await RT.call(method, data);
      if(r === false) A.toast("No se pudo. Puede que el jugador tenga un rango más alto que el tuyo o ya no esté conectado.");
      else if(okMsg) A.toast(okMsg);
      return r;
    }catch(e){ A.toast(e.message); throw e; }
  }

  /* ---------- RESUMEN ---------- */
  let ov = null;
  async function viewResumen(v){
    v.innerHTML = `<h2>Resumen</h2><p class="sub">Lo que pasa ahora mismo en Auren.</p>
      <div class="tiles">
        <div class="tile"><b id="tPlayers">—</b><span>jugadores conectados</span></div>
        <div class="tile"><b id="tStaff">—</b><span>staff en el servidor</span></div>
        <div class="tile"><b id="tDuty">—</b><span>staff en servicio</span></div>
        <div class="tile"><b id="tUp">—</b><span>tiempo encendido</span></div>
      </div>
      <div class="cols">
        <div class="box"><h3>Staff conectado</h3><ul class="rows" id="ovStaff"><li class="muted">Cargando…</li></ul></div>
        <div class="box"><h3>Trabajos en la ciudad</h3><ul class="rows" id="ovJobs"><li class="muted">Cargando…</li></ul></div>
      </div>
      ${can("logs.view") ? `<div class="box" style="margin-top:16px"><h3>Actividad del staff en vivo</h3><ul class="feed" id="feed"></ul></div>` : ""}`;
    renderFeed();
    try{
      ov = await RT.call("auren:overview");
      $("#tPlayers").textContent = `${ov.players}/${ov.maxPlayers}`;
      $("#tStaff").textContent = ov.staff.length;
      $("#tDuty").textContent = ov.staff.filter(s=>s.onDuty).length;
      $("#tUp").textContent = mins(ov.uptimeMin);
      $("#ovStaff").innerHTML = ov.staff.length ? ov.staff.map(s=>`<li><span>${esc(s.nickname)} <span class="muted">· ${esc(s.groupLabel||s.group)}</span></span><span class="tag ${s.onDuty?"ok":""}">${s.onDuty?"En servicio":"Fuera de servicio"}</span></li>`).join("") : `<li class="muted">No hay staff conectado.</li>`;
      const jobs = Object.entries(ov.jobs || {}).sort((a,b)=>b[1]-a[1]).slice(0,8);
      $("#ovJobs").innerHTML = jobs.length ? jobs.map(([j,n])=>`<li><span>${esc(j)}</span><span class="num">${n}</span></li>`).join("") : `<li class="muted">Nadie conectado.</li>`;
    }catch(e){ $("#ovStaff").innerHTML = `<li class="muted">${esc(e.message)}</li>`; }
  }
  function updateOverviewCount(){ const t = $("#tPlayers"); if(t && ov) t.textContent = `${players.size}/${ov.maxPlayers}`; }
  function renderFeed(){
    const f = $("#feed"); if(!f) return;
    f.innerHTML = liveLogs.length ? liveLogs.slice(0,25).map(l=>`<li><time>${when(l.ts)} · ${esc(l.staff||"")}</time>${esc(l.text)}</li>`).join("") : `<li>Aquí aparecen al momento las acciones del staff (kicks, baneos, revives…).</li>`;
  }

  /* ---------- JUGADORES ---------- */
  const selected = new Set();
  function viewJugadores(v){
    v.innerHTML = `<h2>Jugadores</h2><p class="sub">Lista en vivo. Pulsa “Gestionar” para ver su ficha y las acciones.</p>
      <div class="bar">
        <div class="search"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
          <input class="input" id="pq" type="search" placeholder="Buscar por ID, nombre o trabajo" aria-label="Buscar jugadores" autocomplete="off"></div>
        <span class="pill" id="pCount"></span>
      </div>
      <div class="tbl-wrap"><table>
        <caption class="sr-only">Jugadores conectados</caption>
        <thead><tr><th scope="col"><input type="checkbox" class="chk" id="pAll" aria-label="Seleccionar todos"></th><th scope="col">ID</th><th scope="col">Personaje</th><th scope="col" class="hide-sm">Trabajo</th><th scope="col" class="hide-sm">Rango</th><th scope="col"><span class="sr-only">Acciones</span></th></tr></thead>
        <tbody id="pBody"></tbody></table></div>
      <div class="bulk" id="bulk" hidden></div>`;
    $("#pq").addEventListener("input", renderPlayersTable);
    $("#pAll").addEventListener("change", e=>{ visiblePlayers().forEach(p=> e.target.checked ? selected.add(pid(p)) : selected.delete(pid(p))); renderPlayersTable(); });
    $("#pBody").addEventListener("click", e=>{ const b = e.target.closest("[data-open]"); if(b) openPlayer(Number(b.dataset.open)); });
    $("#pBody").addEventListener("change", e=>{ const c = e.target.closest("[data-sel]"); if(!c) return; const id = Number(c.dataset.sel); c.checked ? selected.add(id) : selected.delete(id); renderBulk(); });
    renderPlayersTable();
  }
  function visiblePlayers(){
    const q = ($("#pq")?.value || "").trim().toLowerCase();
    return [...players.values()].sort((a,b)=>pid(a)-pid(b)).filter(p=>!q || String(pid(p)) === q || [p.name, pChar(p), pJob(p)].join(" ").toLowerCase().includes(q));
  }
  function renderPlayersTable(){
    const body = $("#pBody"); if(!body) return;
    for(const id of [...selected]) if(!players.has(id)) selected.delete(id);
    const rows = visiblePlayers();
    $("#pCount").textContent = `${players.size} conectados`;
    body.innerHTML = rows.length ? rows.map(p=>`<tr>
        <td><input type="checkbox" class="chk" data-sel="${pid(p)}" ${selected.has(pid(p))?"checked":""} aria-label="Seleccionar a ${esc(pChar(p)||p.name)}"></td>
        <td class="num">${pid(p)}</td>
        <td><span class="two"><span>${esc(pChar(p) || p.name || "—")}</span><small>${esc(p.name || "")}</small></span></td>
        <td class="hide-sm">${esc(pJob(p) || "—")}</td>
        <td class="hide-sm">${p.groupLabel || p.group ? `<span class="tag">${esc(p.groupLabel || p.group)}</span>` : "—"}</td>
        <td style="text-align:right"><button class="btn btn-ghost btn-sm" type="button" data-open="${pid(p)}">Gestionar</button></td>
      </tr>`).join("") : `<tr><td colspan="6" class="empty">${players.size ? "Nadie coincide con la búsqueda." : "No hay jugadores conectados."}</td></tr>`;
    renderBulk();
  }

  const BULK = [
    {id:"multi_message", label:"Mensaje", perm:"player.notify", fields:[{n:"message", l:"Mensaje para todos los seleccionados", t:"textarea", req:true}]},
    {id:"multi_revive", label:"Revivir", perm:"player.revive"},
    {id:"multi_freeze", label:"Congelar", perm:"player.freeze", data:{state:true}},
    {id:"multi_freeze", key:"multi_unfreeze", label:"Descongelar", perm:"player.freeze", data:{state:false}},
    {id:"multi_teleport_last_location", label:"Devolver a su última posición", perm:"player.teleport"},
    {id:"multi_warn", label:"Advertir", perm:"player.warn", fields:[{n:"reason", l:"Motivo", req:true}]},
    {id:"multi_kick", label:"Expulsar", perm:"player.kick", danger:true, fields:[{n:"reason", l:"Motivo", req:true}]}
  ];
  function renderBulk(){
    const b = $("#bulk"); if(!b) return;
    b.hidden = selected.size === 0;
    if(!selected.size) return;
    const acts = BULK.filter(a=>can(a.perm));
    b.innerHTML = `<b>${selected.size} seleccionados</b>${acts.map((a,i)=>`<button class="btn ${a.danger?"btn-danger":"btn-ghost"} btn-sm" type="button" data-bulk="${i}">${a.label}</button>`).join("")}<button class="btn btn-ghost btn-sm" type="button" data-clear>Quitar selección</button>`;
    b.onclick = e=>{
      if(e.target.closest("[data-clear]")){ selected.clear(); renderPlayersTable(); return; }
      const x = e.target.closest("[data-bulk]"); if(!x) return;
      const a = acts[Number(x.dataset.bulk)], targets = [...selected];
      actionDialog({...a, title:`${a.label} · ${targets.length} jugadores`, confirm:a.danger}, vals=> run("action:" + a.id, {...(a.data||{}), ...vals, targets}, `${a.label}: hecho.`));
    };
  }

  /* ---------- formulario genérico de acción ---------- */
  const BAN_TIMES = [["3600000","1 hora"],["21600000","6 horas"],["86400000","1 día"],["259200000","3 días"],["604800000","7 días"],["2592000000","30 días"],["0","Permanente"]];
  function actionDialog(a, submit){
    const fields = (a.fields || []).map(f=> typeof f.opts === "function" ? {...f, opts:f.opts()} : f);
    if(!fields.length && !a.confirm){ submit({}).catch(()=>{}); return; }
    const fieldHTML = f=>{
      const id = "f_" + f.n, req = f.req ? "required" : "";
      if(f.t === "textarea") return `<div class="field"><label for="${id}">${f.l}</label><textarea class="input" id="${id}" name="${f.n}" ${req} maxlength="500"></textarea></div>`;
      if(f.t === "select") return `<div class="field"><label for="${id}">${f.l}</label><select class="input" id="${id}" name="${f.n}" ${req}>${(f.opts||[]).map(o=>{ const [val,lab] = Array.isArray(o) ? o : [o,o]; return `<option value="${esc(val)}">${esc(lab)}</option>`; }).join("")}</select></div>`;
      return `<div class="field"><label for="${id}">${f.l}</label><input class="input" id="${id}" name="${f.n}" type="${f.t||"text"}" ${f.min!=null?`min="${f.min}"`:""} ${f.step?`step="${f.step}"`:""} ${f.list?`list="${f.list}"`:""} value="${esc(f.v ?? "")}" ${req} autocomplete="off"></div>`;
    };
    dlg.innerHTML = `<form class="dlg-in" method="dialog" novalidate>
      <h3 id="dlgTitle">${esc(a.title || a.label)}</h3>
      ${a.note ? `<p style="color:var(--soft)">${esc(a.note)}</p>` : ""}
      <div class="form-grid">${fields.map(fieldHTML).join("")}
        ${a.typed ? `<div class="field"><label for="f_typed">Escribe <b>${esc(a.typed)}</b> para confirmar</label><input class="input" id="f_typed" autocomplete="off"></div>` : ""}
      </div>
      ${a.extra || ""}
      <p class="form-err" id="ferr" role="alert" hidden></p>
      <div class="actions"><button class="btn btn-ghost" type="button" data-cancel>Cancelar</button><button class="btn ${a.danger?"btn-danger":"btn-primary"}" type="submit">${esc(a.cta || a.label)}</button></div>
    </form>`;
    const form = dlg.querySelector("form"), err = $("#ferr", dlg);
    dlg.querySelector("[data-cancel]").onclick = ()=> dlg.close();
    form.onsubmit = async e=>{
      e.preventDefault();
      const vals = {};
      for(const f of fields){
        const el = form.elements[f.n]; let val = el.value.trim();
        if(f.req && !val){ err.textContent = `Completa: ${f.l}.`; err.hidden = false; el.focus(); return; }
        if(f.t === "number"){ val = Number(val); if(isNaN(val)){ err.textContent = `${f.l} debe ser un número.`; err.hidden = false; el.focus(); return; } }
        vals[f.n] = val;
      }
      if(a.typed && $("#f_typed", dlg).value.trim() !== a.typed){ err.textContent = "El texto de confirmación no coincide."; err.hidden = false; return; }
      const btn = form.querySelector("[type=submit]"); btn.disabled = true; btn.textContent = "Enviando…";
      try{ await submit(a.map ? a.map(vals) : vals); dlg.close(); }
      catch(ex){ err.textContent = ex.message; err.hidden = false; btn.disabled = false; btn.textContent = a.cta || a.label; }
    };
    dlg.showModal();
    const first = form.querySelector("input,textarea,select"); (first || form.querySelector("[type=submit]")).focus();
  }

  /* ---------- FICHA DEL JUGADOR ---------- */
  const lists = {};
  async function getList(key, method, perm){
    if(lists[key]) return lists[key];
    if(perm && !can(perm)) return [];
    try{ lists[key] = await RT.call(method); }catch{ lists[key] = []; }
    return lists[key];
  }
  const asOptions = (raw, pick) => {
    const out = [];
    if(Array.isArray(raw)) raw.forEach((x,i)=> out.push(pick(x, typeof x === "string" ? x : i)));
    else if(raw && typeof raw === "object") Object.entries(raw).forEach(([k,x])=> out.push(pick(x, k)));
    return out.filter(Boolean);
  };

  function playerActions(p){
    const id = pid(p);
    return [
      {g:"Comunicación", id:"send_message", label:"Enviar mensaje", perm:"player.notify", fields:[{n:"message", l:"Mensaje", t:"textarea", req:true}], ok:"Mensaje enviado."},
      {g:"Moderación", id:"warn", label:"Advertir", perm:"player.warn", fields:[{n:"reason", l:"Motivo", req:true}], ok:"Advertencia enviada.", note: cfg.maxWarnings ? `Con ${cfg.maxWarnings} advertencias el menú banea automáticamente.` : ""},
      {g:"Moderación", id:"kick", label:"Expulsar", perm:"player.kick", danger:true, fields:[{n:"reason", l:"Motivo", req:true}], ok:"Jugador expulsado."},
      {g:"Moderación", id:"ban", label:"Banear", perm:"player.ban", danger:true, fields:[{n:"reason", l:"Motivo", req:true},{n:"duration", l:"Duración", t:"select", opts:BAN_TIMES}], map:v=>({reason:v.reason, duration:Number(v.duration)}), ok:"Jugador baneado."},
      {g:"Moderación", id:"jail", label:"Encarcelar", perm:"player.jail", fields:[{n:"reason", l:"Motivo", req:true},{n:"minutes", l:"Minutos", t:"number", min:1, v:10, req:true}, ...(cfg.jailCells?.length ? [{n:"cell", l:"Celda", t:"select", opts:cfg.jailCells}] : [])], map:v=>({reason:v.reason, duration:v.minutes*60000, cell:v.cell || cfg.jailCells?.[0], bucket:0}), ok:"Jugador encarcelado."},
      {g:"Moderación", id:"freeze", label:"Congelar", perm:"player.freeze", data:{state:true}, ok:"Congelado."},
      {g:"Moderación", id:"freeze", label:"Descongelar", perm:"player.freeze", data:{state:false}, ok:"Descongelado."},
      {g:"Moderación", id:"handcuff", label:"Esposar", perm:"player.handcuff", data:{state:true}, ok:"Esposado."},
      {g:"Moderación", id:"handcuff", label:"Quitar esposas", perm:"player.handcuff", data:{state:false}, ok:"Esposas quitadas."},
      {g:"Salud", id:"revive", label:"Revivir", perm:"player.revive", ok:"Revivido."},
      {g:"Salud", id:"heal", label:"Curar", perm:"player.heal", ok:"Curado."},
      {g:"Salud", id:"give_armor", label:"Dar chaleco", perm:"player.give_armor", ok:"Chaleco dado."},
      {g:"Salud", id:"give_food_and_water", label:"Dar comida y agua", perm:"player.give_food_and_water", ok:"Hecho."},
      {g:"Salud", id:"kill", label:"Matar", perm:"player.kill", danger:true, confirm:true, ok:"Hecho."},
      {g:"Posición", id:"teleport_last_location", label:"Devolver a su última posición", perm:"player.teleport", data:{keepVehicle:true}, ok:"Teletransportado."},
      {g:"Posición", id:"teleport_to_coords", label:"Llevar a coordenadas", perm:"player.teleport", fields:[{n:"x", l:"X", t:"number", step:"any", req:true},{n:"y", l:"Y", t:"number", step:"any", req:true},{n:"z", l:"Z", t:"number", step:"any", req:true}], map:v=>({coords:{x:v.x, y:v.y, z:v.z}, keepVehicle:true}), ok:"Teletransportado."},
      {g:"Posición", id:"routing_bucket", label:"Cambiar dimensión", perm:"player.routing_bucket", fields:[{n:"bucket", l:"Dimensión (0 = normal)", t:"number", min:0, v:0, req:true}], ok:"Dimensión cambiada."},
      {g:"Dinero", id:"update_money_account", label:"Fijar saldo", perm:"player.manage_accounts", fields:[{n:"account", l:"Cuenta", t:"select", opts:()=> Object.keys(p._accounts || {money:1, bank:1, black_money:1}).map(k=>[k, {money:"Efectivo", bank:"Banco", black_money:"Dinero negro"}[k] || k])},{n:"amount", l:"Nuevo saldo", t:"number", min:0, req:true}], ok:"Saldo actualizado."},
      {g:"Inventario", id:"give_item", label:"Dar objeto", perm:"inventory.give", fields:[{n:"item", l:"Objeto (nombre interno)", list:"itemList", req:true},{n:"amount", l:"Cantidad", t:"number", min:1, v:1, req:true}], extra:'<datalist id="itemList"></datalist>', ok:"Objeto entregado.", prep:fillItems},
      {g:"Trabajo", id:"update_job", label:"Cambiar trabajo", perm:"player.update_job", fields:[{n:"job", l:"Trabajo", list:"jobList", req:true},{n:"grade", l:"Rango (número)", t:"number", min:0, v:0, req:true}], extra:'<datalist id="jobList"></datalist>', ok:"Trabajo actualizado.", prep:fillJobs},
      {g:"Vehículos", id:"spawn_vehicle", label:"Darle un vehículo", perm:"vehicles.spawn", fields:[{n:"model", l:"Modelo", list:"vehList", req:true}], extra:'<datalist id="vehList"></datalist>', ok:"Vehículo creado.", prep:fillVehicles},
      {g:"Vehículos", id:"fix_vehicle", label:"Reparar su vehículo", perm:"vehicles.repair", ok:"Reparado."},
      {g:"Vehículos", id:"flip_vehicle", label:"Voltear su vehículo", perm:"vehicles.repair", ok:"Volteado."},
      {g:"Vehículos", id:"give_vehicle_key", label:"Dar llave por matrícula", perm:"vehicles.give_key", fields:[{n:"plate", l:"Matrícula", req:true}], ok:"Llave entregada."},
      {g:"Personaje", id:"change_ped_model", label:"Cambiar modelo", perm:"player.change_ped", fields:[{n:"model", l:"Modelo de ped", req:true}], ok:"Modelo cambiado."},
      {g:"Personaje", id:"reset_ped_model", label:"Restaurar modelo", perm:"player.change_ped", ok:"Modelo restaurado."},
      {g:"Castigos", id:"slap", label:"Bofetada", perm:"player.slap", ok:"Hecho."},
      {g:"Castigos", id:"ragdoll", label:"Tirar al suelo", perm:"player.ragdoll", ok:"Hecho."},
      {g:"Castigos", id:"burn", label:"Prender fuego", perm:"player.burn", danger:true, confirm:true, ok:"Hecho."},
      {g:"Castigos", id:"explosion", label:"Explosión", perm:"player.explosion", danger:true, confirm:true, ok:"Hecho."},
      {g:"Zona peligrosa", id:"delete_character", label:"Borrar personaje", perm:"player.delete_character", danger:true, typed:String(id), note:"Esto borra el personaje para siempre. No se puede deshacer.", ok:"Personaje borrado."}
    ].filter(a=>can(a.perm));
  }

  async function fillItems(){ const raw = await getList("items", "call:inventory:getItemList", "inventory.give"); const dl = $("#itemList", dlg); if(dl) dl.innerHTML = asOptions(raw, (x,k)=>{ const n = typeof x === "string" ? x : (x.name || k); return n ? `<option value="${esc(n)}">${esc(x.label || "")}</option>` : ""; }).slice(0,3000).join(""); }
  async function fillJobs(){ const raw = await getList("jobs", "action:get_jobs", "player.update_job"); const dl = $("#jobList", dlg); if(dl) dl.innerHTML = asOptions(raw, (x,k)=>{ const n = typeof x === "string" ? x : (x.name || k); return n ? `<option value="${esc(n)}">${esc(x.label || "")}</option>` : ""; }).join(""); }
  async function fillVehicles(){ const raw = await getList("veh", "call:getAllVehicleModels", "vehicles.spawn"); const dl = $("#vehList", dlg); if(dl) dl.innerHTML = asOptions(raw, (x,k)=>{ const n = typeof x === "string" ? x : (x.model || x.name || k); return n ? `<option value="${esc(n)}">${esc(x.label || x.displayName || "")}</option>` : ""; }).slice(0,3000).join(""); }

  async function openPlayer(id){
    openPlayerId = id;
    const base = players.get(id) || {source:id};
    pdlg.innerHTML = `
      <div class="p-head"><span class="pid">${id}</span><div><h3 id="pTitle">${esc(pChar(base) || base.name || "Jugador " + id)}</h3><p>${esc(base.name || "")}${pJob(base) ? " · " + esc(pJob(base)) : ""}</p></div>
        <button class="icon-btn" type="button" data-close aria-label="Cerrar ficha"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg></button></div>
      <div class="ptabs" role="tablist" aria-label="Ficha del jugador">
        ${[["info","Información"],["acciones","Acciones"],["inventario","Inventario","inventory.view"],["vehiculos","Vehículos","vehicles.view"],["avisos","Advertencias","player.warn"]].filter(t=>!t[2]||can(t[2])).map(([k,t],i)=>`<button role="tab" type="button" data-tab="${k}" aria-selected="${i===0}">${t}</button>`).join("")}
      </div>
      <div class="pbody" id="pBodyTab" role="tabpanel"></div>`;
    pdlg.querySelector("[data-close]").onclick = ()=> pdlg.close();
    pdlg.onclose = ()=>{ openPlayerId = null; };
    const tabs = pdlg.querySelector(".ptabs");
    tabs.onclick = e=>{ const b = e.target.closest("[data-tab]"); if(!b) return; tabs.querySelectorAll("[data-tab]").forEach(x=>x.setAttribute("aria-selected", x===b)); renderTab(b.dataset.tab); };
    pdlg.showModal();
    renderTab("info");

    async function renderTab(tab){
      const box = $("#pBodyTab", pdlg);
      box.innerHTML = `<p class="sub">Cargando…</p>`;
      try{
        if(tab === "info"){
          const [p, ha, acc] = await Promise.all([
            RT.call("auren:player", {id}),
            RT.call("action:get_health_and_armor", {target:id}).catch(()=>null),
            can("player.view_money_accounts") ? RT.call("action:get_player_accounts", {target:id}).catch(()=>null) : null
          ]);
          base._accounts = acc || null;
          const row = (k,v)=> `<div><dt>${k}</dt><dd>${v}</dd></div>`;
          const accHtml = acc && typeof acc === "object" ? Object.entries(acc).map(([k,v])=> row({money:"Efectivo", bank:"Banco", black_money:"Dinero negro"}[k] || esc(k), money(v))).join("") : (p.cash != null ? row("Efectivo", money(p.cash)) + row("Banco", money(p.bank)) : "");
          box.innerHTML = `<dl class="kv">
            ${row("Personaje", esc(pChar(p) || "—"))}${row("Nombre en FiveM", esc(p.name || "—"))}
            ${row("Trabajo", esc(pJob(p) || "—"))}${p.char?.gang ? row("Banda", esc(`${p.char.gang.label || p.char.gang.name} · ${p.char.gang.gradeName || ""}`)) : ""}
            ${row("Ping", p.ping != null ? `${p.ping} ms` : "—")}${row("Conectado", p.joined ? ago(p.joined * (p.joined < 1e12 ? 1000 : 1)) : "—")}
            ${row("Vida", ha ? `${ha.health} · chaleco ${ha.armor}` : (p.dead ? "Muerto" : "—"))}${row("Rango del staff", esc(p.groupLabel || p.group || "Jugador"))}
            ${p.char?.phoneNumber ? row("Teléfono", esc(p.char.phoneNumber)) : ""}${p.char?.birthday ? row("Nacimiento", esc(p.char.birthday)) : ""}
            ${p.discord ? row("Discord", `<span class="num">${esc(p.discord)}</span>`) : ""}${p.usingVpn ? row("Aviso", '<span class="tag warn">Usa VPN</span>') : ""}
            ${accHtml}
            ${p.ip ? row("IP", esc(p.ip)) : ""}
          </dl>
          ${p.identifiers ? `<details style="margin-top:14px"><summary style="cursor:pointer;color:var(--soft)">Identificadores</summary><ul style="margin-top:8px;padding-left:18px;color:var(--soft);overflow-wrap:anywhere">${list(p.identifiers).map(i=>`<li>${esc(i)}</li>`).join("")}</ul></details>` : ""}`;
          base.uniqueId = p.uniqueId || base.uniqueId;
        }
        else if(tab === "acciones"){
          const acts = playerActions(base);
          const groups = [...new Set(acts.map(a=>a.g))];
          box.innerHTML = groups.map(g=>`<div class="agroup"><h4>${g}</h4><div class="btns">${acts.map((a,i)=>a.g===g ? `<button class="btn ${a.danger?"btn-danger":"btn-ghost"} btn-sm" type="button" data-act="${i}">${a.label}</button>` : "").join("")}</div></div>`).join("") || `<p class="sub">Tu rango no tiene acciones sobre jugadores.</p>`;
          box.onclick = e=>{
            const b = e.target.closest("[data-act]"); if(!b) return;
            const a = acts[Number(b.dataset.act)];
            actionDialog({...a, title:`${a.label} · ${pChar(base) || base.name || id}`}, vals=> run("action:" + a.id, {...(a.data||{}), ...vals, target:id}, a.ok));
            if(a.prep) a.prep();
          };
        }
        else if(tab === "inventario"){
          const inv = list(await RT.call("auren:inventory", {id}));
          const canRemove = can("inventory.remove");
          box.innerHTML = inv.length ? `<div class="tbl-wrap"><table><caption class="sr-only">Inventario</caption><thead><tr><th scope="col">Objeto</th><th scope="col">Cantidad</th><th scope="col">Detalle</th>${canRemove?'<th scope="col"><span class="sr-only">Quitar</span></th>':""}</tr></thead><tbody>
            ${inv.map((it,i)=>`<tr><td><span class="two"><span>${esc(it.label || it.name)}</span><small>${esc(it.name)}</small></span></td><td class="num">${num(it.count)}</td><td>${it.weapon ? `Serie ${esc(it.serial || "sin serie")}${it.ammo != null ? ` · ${it.ammo} balas` : ""}` : "—"}</td>${canRemove?`<td style="text-align:right"><button class="btn btn-ghost btn-sm" type="button" data-rm="${i}">Quitar</button></td>`:""}</tr>`).join("")}
          </tbody></table></div>` : `<p class="empty">Inventario vacío.</p>`;
          box.onclick = e=>{
            const b = e.target.closest("[data-rm]"); if(!b) return;
            const it = inv[Number(b.dataset.rm)];
            actionDialog({id:"remove_item", label:"Quitar objeto", title:`Quitar ${it.label || it.name}`, danger:true, fields:[{n:"amount", l:`Cantidad (tiene ${it.count})`, t:"number", min:1, v:it.count, req:true}]},
              vals=> run("action:remove_item", {target:id, name:it.name, amount:vals.amount, slot:it.slot}, "Objeto quitado.").then(()=> renderTab("inventario")));
          };
        }
        else if(tab === "vehiculos"){
          const vehs = list(await RT.call("action:get_player_vehicles", {target:id}));
          box.innerHTML = vehs.length ? `<div class="tbl-wrap"><table><caption class="sr-only">Vehículos</caption><thead><tr><th scope="col">Matrícula</th><th scope="col">Modelo</th><th scope="col">Estado</th><th scope="col"><span class="sr-only">Acciones</span></th></tr></thead><tbody>
            ${vehs.map((v,i)=>`<tr><td class="num">${esc(v.plate || "—")}</td><td>${esc(v.label || v.model || v.vehicle?.model || "—")}</td><td>${esc(v.garage || v.parking || v.state || "—")}</td><td style="text-align:right">${can("vehicles.send_to_garage")?`<button class="btn btn-ghost btn-sm" type="button" data-garage="${i}">Mandar al garaje</button>`:""}</td></tr>`).join("")}
          </tbody></table></div>` : `<p class="empty">No tiene vehículos registrados.</p>`;
          box.onclick = e=>{ const b = e.target.closest("[data-garage]"); if(!b) return; run("action:send_to_garage", {plate:vehs[Number(b.dataset.garage)].plate}, "Vehículo enviado al garaje.").catch(()=>{}); };
        }
        else if(tab === "avisos"){
          if(!base.uniqueId){ const p = await RT.call("auren:player", {id}); base.uniqueId = p.uniqueId; }
          const ws = list(await RT.call("action:get_warnings", {uniqueId:base.uniqueId}));
          const canRm = can("player.warn_remove");
          box.innerHTML = ws.length ? `<ul class="rows">${ws.map(w=>`<li><span><b>${esc(w.reason)}</b><br><span class="muted">${when(w.created_at)}</span></span>${canRm?`<button class="btn btn-ghost btn-sm" type="button" data-wrm="${w.id}">Quitar</button>`:""}</li>`).join("")}</ul>` : `<p class="empty">Sin advertencias.</p>`;
          box.onclick = e=>{ const b = e.target.closest("[data-wrm]"); if(!b) return; run("action:warn_remove", {id:Number(b.dataset.wrm)}, "Advertencia quitada.").then(()=> renderTab("avisos")).catch(()=>{}); };
        }
      }catch(e){ box.innerHTML = `<p class="empty">${esc(e.message)}</p>`; }
    }
  }

  /* ---------- CHATS Y REPORTES ---------- */
  let chats = [];
  async function viewChats(v){
    chatsUnread = 0; updateBadge();
    v.innerHTML = `<h2>Chats y reportes</h2><p class="sub">Los chats del staff y los reportes del menú, en vivo.</p>
      <div class="chat"><div class="chat-list" id="chatList" aria-label="Chats"></div>
      <div class="chat-pane" id="chatPane"><p class="empty">Elige un chat de la lista.</p></div></div>`;
    $("#chatList").onclick = e=>{ const b = e.target.closest("[data-chat]"); if(b) openChat(b.dataset.chat); };
    loadChats();
  }
  async function loadChats(){
    const el = $("#chatList"); if(!el) return;
    try{
      chats = list(await RT.call("call:chat:staff:fetchAll"));
      el.innerHTML = chats.length ? chats.map(c=>{
        const id = c.id ?? c.chatId, isReport = c.type === "report" || c.is_report || c.report;
        return `<button type="button" data-chat="${esc(id)}" aria-current="${String(openChatId)===String(id)}"><b>${esc(c.name || c.title || c.author_name || "Chat " + id)}</b><small>${isReport ? "Reporte" : "Chat del staff"}${c.claimed_by_name || c.claimedBy ? " · atendido" : ""}${c.closed ? " · cerrado" : ""}</small></button>`;
      }).join("") : `<p class="empty">No hay chats abiertos.</p>`;
    }catch(e){ el.innerHTML = `<p class="empty">${esc(e.message)}</p>`; }
  }
  async function openChat(id){
    openChatId = id;
    $("#chatList").querySelectorAll("[data-chat]").forEach(b=> b.setAttribute("aria-current", b.dataset.chat === String(id)));
    const c = chats.find(x=> String(x.id ?? x.chatId) === String(id)) || {};
    const isReport = c.type === "report" || c.is_report || c.report;
    const pane = $("#chatPane");
    pane.innerHTML = `<div class="chat-top"><b>${esc(c.name || c.title || "Chat " + id)}</b>
        ${isReport ? `<button class="btn btn-ghost btn-sm" type="button" data-claim>Atender</button><button class="btn btn-ghost btn-sm" type="button" data-unclaim>Soltar</button>${can("reports.close")?'<button class="btn btn-danger btn-sm" type="button" data-closerep>Cerrar reporte</button>':""}` : ""}</div>
      <div class="msgs" id="msgs" aria-live="polite"><p class="sub">Cargando…</p></div>
      <form class="chat-send" id="chatForm"><label class="sr-only" for="chatMsg">Mensaje</label><input class="input" id="chatMsg" placeholder="Escribe un mensaje" autocomplete="off" maxlength="500"><button class="btn btn-primary" type="submit">Enviar</button></form>`;
    pane.onclick = e=>{
      if(e.target.closest("[data-claim]")) run("call:chat:staff:claimReport", id, "Reporte atendido.").then(loadChats).catch(()=>{});
      if(e.target.closest("[data-unclaim]")) run("call:chat:staff:unclaimReport", id, "Reporte soltado.").then(loadChats).catch(()=>{});
      if(e.target.closest("[data-closerep]")) run("call:chat:staff:closeReport", id, "Reporte cerrado.").then(loadChats).catch(()=>{});
    };
    $("#chatForm").onsubmit = async e=>{
      e.preventDefault();
      const inp = $("#chatMsg"), text = inp.value.trim(); if(!text) return;
      inp.value = "";
      try{ await RT.call("call:chat:sendMessage", {chatId:isNaN(id) ? id : Number(id), message:text, attachments:[]}); if(RT.demo) appendMsg({author_name:RT.me.nickname, message:text, created_at:Date.now()}); }
      catch(ex){ A.toast(ex.message); inp.value = text; }
    };
    try{
      const msgs = list(await RT.call("call:chat:join", isNaN(id) ? id : Number(id)));
      $("#msgs").innerHTML = "";
      msgs.forEach(appendMsg);
      if(!msgs.length) $("#msgs").innerHTML = `<p class="empty">Sin mensajes todavía.</p>`;
    }catch(e){ $("#msgs").innerHTML = `<p class="empty">${esc(e.message)}</p>`; }
  }
  function appendMsg(m){
    const box = $("#msgs"); if(!box || !m) return;
    box.querySelector(".empty, .sub")?.remove();
    box.insertAdjacentHTML("beforeend", `<div class="msg"><b>${esc(m.author_name || m.author || "—")}</b><time>${when(m.created_at)}</time><p>${esc(m.message || "")}</p></div>`);
    box.scrollTop = box.scrollHeight;
  }

  /* ---------- tablas de moderación ---------- */
  function tableView(v, {title, sub, method, cols, empty, rowActions, search=true}){
    v.innerHTML = `<h2>${title}</h2><p class="sub">${sub}</p>
      ${search ? `<div class="bar"><div class="search"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg><input class="input" id="tq" type="search" placeholder="Buscar" aria-label="Buscar" autocomplete="off"></div></div>` : '<div style="height:16px"></div>'}
      <div class="tbl-wrap"><table><caption class="sr-only">${title}</caption><thead><tr>${cols.map(c=>`<th scope="col">${c[0]}</th>`).join("")}${rowActions?'<th scope="col"><span class="sr-only">Acciones</span></th>':""}</tr></thead><tbody id="tBody"><tr><td class="empty" colspan="${cols.length+1}">Cargando…</td></tr></tbody></table></div>`;
    let rows = [], t;
    const load = async ()=>{
      try{
        rows = list(await RT.call(method, {q: $("#tq")?.value || ""}));
        $("#tBody").innerHTML = rows.length ? rows.map((r,i)=>`<tr>${cols.map(c=>`<td${c[2]?` class="${c[2]}"`:""}>${c[1](r)}</td>`).join("")}${rowActions?`<td style="text-align:right">${rowActions(r,i)}</td>`:""}</tr>`).join("") : `<tr><td class="empty" colspan="${cols.length+1}">${empty}</td></tr>`;
      }catch(e){ $("#tBody").innerHTML = `<tr><td class="empty" colspan="${cols.length+1}">${esc(e.message)}</td></tr>`; }
    };
    $("#tq")?.addEventListener("input", ()=>{ clearTimeout(t); t = setTimeout(load, 350); });
    load();
    return {reload:load, row:i=>rows[i]};
  }

  function viewBaneos(v){
    const tv = tableView(v, {title:"Baneos", sub:"Los últimos 200 baneos. Busca por nombre, motivo o número.", method:"auren:bans", empty:"No hay baneos.",
      cols:[["N.º", r=>r.id, "num"],["Jugador", r=>esc(r.player_name)],["Motivo", r=>esc(r.reason)],["Por", r=>esc(r.staff || "—")],["Fecha", r=>when(r.created_at), "num"],["Vence", r=>{ const d = toDate(r.expires_at); return !d ? "—" : d.getFullYear() >= 2199 ? '<span class="tag bad">Permanente</span>' : d < new Date() ? '<span class="tag">Vencido</span>' : when(r.expires_at); }, "num"]],
      rowActions:(r,i)=> can("player.unban") ? `<button class="btn btn-ghost btn-sm" type="button" data-unban="${i}">Desbanear</button>` : ""});
    v.onclick = e=>{ const b = e.target.closest("[data-unban]"); if(!b) return; const r = tv.row(Number(b.dataset.unban));
      actionDialog({label:"Desbanear", title:`Desbanear a ${r.player_name}`, confirm:true, note:`Ban n.º ${r.id}: ${r.reason}`}, ()=> run("action:unban", {id:r.id}, "Desbaneado.").then(tv.reload)); };
  }
  function viewAdvertencias(v){
    const tv = tableView(v, {title:"Advertencias", sub:"Las últimas 200 advertencias.", method:"auren:warnings", empty:"No hay advertencias.",
      cols:[["Jugador", r=>esc(r.player_name)],["Motivo", r=>esc(r.reason)],["Por", r=>esc(r.staff || "—")],["Fecha", r=>when(r.created_at), "num"]],
      rowActions:(r,i)=> can("player.warn_remove") ? `<button class="btn btn-ghost btn-sm" type="button" data-wrm="${i}">Quitar</button>` : ""});
    v.onclick = e=>{ const b = e.target.closest("[data-wrm]"); if(!b) return; const r = tv.row(Number(b.dataset.wrm)); run("action:warn_remove", {id:r.id}, "Advertencia quitada.").then(tv.reload).catch(()=>{}); };
  }
  function viewCarcel(v){
    const tv = tableView(v, {title:"Cárcel", sub:"Condenas activas ahora mismo.", method:"auren:jails", empty:"No hay nadie en la cárcel.", search:false,
      cols:[["Preso", r=>esc(r.char_name)],["Motivo", r=>esc(r.reason)],["Celda", r=>esc(r.cell_name || "—")],["Por", r=>esc(r.staff_name || "—")],["Termina", r=> r.time_mode === "playtime" ? `${mins((r.remaining_ms||0)/60000)} jugando` : when(r.expires_at), "num"]],
      rowActions:(r,i)=> can("player.jail_remove") ? `<button class="btn btn-ghost btn-sm" type="button" data-free="${i}">Liberar</button>` : ""});
    v.onclick = e=>{ const b = e.target.closest("[data-free]"); if(!b) return; const r = tv.row(Number(b.dataset.free)); run("action:un_jail", {sentenceId:r.id}, "Liberado.").then(tv.reload).catch(()=>{}); };
  }

  /* ---------- REGISTROS ---------- */
  function viewRegistros(v){
    tableView(v, {title:"Registros", sub:"Todo lo que hace el staff, con lo nuevo apareciendo al momento arriba.", method:"auren:logs", empty:"Sin registros.",
      cols:[["Fecha", r=>when(r.created_at), "num"],["Staff", r=>esc(r.staff_name || "—")],["Acción", r=>esc(r.text)]]});
  }
  function prependLog(l){
    const body = $("#tBody"); if(!body || ($("#tq")?.value || "")) return;
    body.querySelector(".empty")?.closest("tr")?.remove();
    body.insertAdjacentHTML("afterbegin", `<tr><td class="num">${when(l.ts)}</td><td>${esc(l.staff || "—")}</td><td>${esc(l.text)}</td></tr>`);
  }

  /* ---------- STAFF ---------- */
  function viewStaff(v){
    tableView(v, {title:"Staff", sub:"Quién está conectado y cuánto ha trabajado en los últimos 7 días.", method:"auren:staff", empty:"No hay staff registrado.", search:false,
      cols:[["Nombre", r=>`<span class="two"><span>${esc(r.nickname)}</span><small>${esc(r.groupLabel || r.group)}</small></span>`],
            ["Estado", r=> r.online ? `<span class="tag ${r.onDuty?"ok":""}">${r.onDuty?"En servicio":"Conectado"}</span>` : `<span class="tag">Desconectado</span>`],
            ["En servicio (7 días)", r=>mins(r.weekDutyMin), "num"],["Conectado (7 días)", r=>mins(r.weekOnlineMin), "num"],["Acciones (7 días)", r=>num(r.weekActions), "num"],["Visto", r=> r.online ? "ahora" : ago(r.lastSeen), "num"]]});
  }

  /* ---------- SERVIDOR ---------- */
  const WEATHERS = [["EXTRASUNNY","Muy soleado"],["CLEAR","Despejado"],["CLOUDS","Nublado"],["OVERCAST","Cubierto"],["SMOG","Contaminación"],["FOGGY","Niebla"],["RAIN","Lluvia"],["THUNDER","Tormenta"],["CLEARING","Despejando"],["SNOW","Nieve"],["BLIZZARD","Ventisca"],["XMAS","Navidad"],["HALLOWEEN","Halloween"]];
  function viewServidor(v){
    v.innerHTML = `<h2>Servidor</h2><p class="sub">Anuncios, clima, hora, consola y recursos.</p><div class="cols" id="srv"></div>`;
    const srv = $("#srv");
    if(can("announcements.create")) srv.insertAdjacentHTML("beforeend", `<form class="box form-grid" id="fAnn"><h3>Anuncio para todos</h3>
      <div class="field"><label for="annMsg">Mensaje</label><textarea class="input" id="annMsg" required maxlength="300"></textarea></div>
      <div class="field"><label for="annType">Tipo</label><select class="input" id="annType"><option value="announcment">Anuncio grande en pantalla</option><option value="notification">Notificación</option></select></div>
      <div class="field"><label for="annDur">Segundos en pantalla</label><input class="input" id="annDur" type="number" min="3" max="60" value="10"></div>
      <div><button class="btn btn-primary" type="submit">Enviar anuncio</button></div></form>`);
    if(can("weather.change")) srv.insertAdjacentHTML("beforeend", `<div class="box form-grid"><h3>Clima y hora</h3>
      <form class="form-grid" id="fWea"><div class="field"><label for="wea">Clima</label><select class="input" id="wea">${WEATHERS.map(([k,l])=>`<option value="${k}">${l}</option>`).join("")}</select></div><div><button class="btn btn-ghost" type="submit">Cambiar clima</button></div></form>
      <form class="form-grid" id="fTime"><div class="field"><label for="hh">Hora (0 a 23)</label><input class="input" id="hh" type="number" min="0" max="23" value="12"></div><div class="field"><label for="mm">Minutos</label><input class="input" id="mm" type="number" min="0" max="59" value="0"></div><div><button class="btn btn-ghost" type="submit">Cambiar hora</button></div></form></div>`);
    if(can("console.execute")) srv.insertAdjacentHTML("beforeend", `<form class="box form-grid" id="fCon"><h3>Consola del servidor</h3>
      <p style="color:var(--soft);font-size:.95rem">Ejecuta comandos de la consola. Cuidado: tienen efecto inmediato.</p>
      <div class="field"><label for="cmd">Comando</label><input class="input" id="cmd" autocomplete="off" placeholder="Por ejemplo: restart nombre_recurso" style="font-family:ui-monospace,Consolas,monospace"></div>
      <div><button class="btn btn-ghost" type="submit">Ejecutar</button></div><div class="console" id="conOut" hidden></div></form>`);
    if(can("resources.read")) srv.insertAdjacentHTML("beforeend", `<div class="box"><h3>Recursos</h3><div class="search" style="margin-bottom:10px"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg><input class="input" id="rq" type="search" placeholder="Buscar recurso" aria-label="Buscar recurso" autocomplete="off"></div><ul class="rows" id="resList" style="max-height:360px;overflow:auto"><li class="muted">Cargando…</li></ul></div>`);
    if(!srv.children.length) srv.innerHTML = `<p class="empty">Tu rango no tiene opciones de servidor.</p>`;

    $("#fAnn")?.addEventListener("submit", e=>{ e.preventDefault(); const msg = $("#annMsg").value.trim(); if(!msg) return A.toast("Escribe el mensaje del anuncio.");
      run("action:announcment", {type:$("#annType").value, message:msg, duration:Math.max(3, Number($("#annDur").value)||10)*1000}, "Anuncio enviado.").then(()=> $("#annMsg").value = "").catch(()=>{}); });
    $("#fWea")?.addEventListener("submit", e=>{ e.preventDefault(); run("action:update_weather", {weather:$("#wea").value}, "Clima cambiado.").catch(()=>{}); });
    $("#fTime")?.addEventListener("submit", e=>{ e.preventDefault(); run("action:update_time", {hour:Number($("#hh").value)||0, minute:Number($("#mm").value)||0}, "Hora cambiada.").catch(()=>{}); });
    $("#fCon")?.addEventListener("submit", async e=>{ e.preventDefault(); const c = $("#cmd").value.trim(); if(!c) return; const out = $("#conOut"); out.hidden = false;
      try{ const r = await RT.call("call:console:sendCommand", c); out.textContent = `> ${c}\n${r == null || r === true ? "Comando enviado." : typeof r === "string" ? r : JSON.stringify(r, null, 2)}`; $("#cmd").value = ""; }
      catch(ex){ out.textContent = `> ${c}\n${ex.message}`; } });
    if(can("resources.read")){
      let res = [];
      const draw = ()=>{ const q = ($("#rq").value||"").toLowerCase(); const items = res.filter(r=> !q || r.name.toLowerCase().includes(q)).slice(0,200);
        $("#resList").innerHTML = items.length ? items.map(r=>`<li><span>${esc(r.name)} <span class="tag ${r.state==="started"?"ok":""}">${r.state==="started"?"Encendido":esc(r.state||"Apagado")}</span></span>${can("resources.manage") ? (r.state==="started" ? `<button class="btn btn-ghost btn-sm" type="button" data-stop="${esc(r.name)}">Detener</button>` : `<button class="btn btn-ghost btn-sm" type="button" data-start="${esc(r.name)}">Iniciar</button>`) : ""}</li>`).join("") : `<li class="muted">Sin resultados.</li>`; };
      const load = ()=> RT.call("call:resources:getResources").then(r=>{ res = asOptions(r, (x,k)=> typeof x === "string" ? {name:x, state:"started"} : {name:x.name || k, state:x.state || x.status}); draw(); }).catch(e=> $("#resList").innerHTML = `<li class="muted">${esc(e.message)}</li>`);
      $("#rq").addEventListener("input", draw);
      $("#resList").addEventListener("click", e=>{
        const s = e.target.closest("[data-start]"), t = e.target.closest("[data-stop]");
        if(s) run("call:resources:start", s.dataset.start, `Iniciando ${s.dataset.start}.`).then(()=>setTimeout(load, 1500)).catch(()=>{});
        if(t) actionDialog({label:"Detener recurso", title:`Detener ${t.dataset.stop}`, danger:true, confirm:true, note:"Los jugadores pueden notar el cambio al momento."}, ()=> run("call:resources:stop", t.dataset.stop, `Deteniendo ${t.dataset.stop}.`).then(()=>setTimeout(load, 1500)));
      });
      load();
    }
  }

  /* ---------- MODO DEMOSTRACIÓN (vista previa) ---------- */
  const Demo = {
    players: [
      {source:1, name:"RichDinero", char:{name:"Ricardo Peña", job:{label:"Policía", gradeName:"Sargento"}}, group:"owner", groupLabel:"Dueño"},
      {source:4, name:"JoelS", char:{name:"Joel Santana", job:{label:"Mecánico", gradeName:"Aprendiz"}}},
      {source:7, name:"Yari_RD", char:{name:"Yarisa Méndez", job:{label:"EMS", gradeName:"Paramédica"}}},
      {source:9, name:"ElTigre", char:{name:"Luis Almonte", job:{label:"Desempleado"}}},
      {source:12, name:"Kiko809", char:{name:"Francisco Rosario", job:{label:"Camionero", gradeName:"Conductor"}}},
      {source:15, name:"Mia.nyc", char:{name:"Mía Castillo", job:{label:"Abogada"}}},
      {source:21, name:"Dembow", char:{name:"Carlos Batista", job:{label:"Taxista"}}},
      {source:23, name:"Nana", char:{name:"Ana Polanco", job:{label:"Policía", gradeName:"Cadete"}}}
    ],
    async call(method, data){
      await new Promise(r=>setTimeout(r, 160));
      const now = Date.now(), h = 3600e3;
      switch(method){
        case "auren:config": return {jailCells:["Celda 1","Celda 2","Celda 3"], maxWarnings:3};
        case "call:getPlayers": return Demo.players;
        case "auren:overview": return {players:Demo.players.length, maxPlayers:128, uptimeMin:347, staff:[{nickname:"Rich", groupLabel:"Dueño", onDuty:true},{nickname:"Yari", groupLabel:"Moderadora", onDuty:false}], jobs:{"Policía":2,"Mecánico":1,"EMS":1,"Camionero":1,"Taxista":1,"Abogada":1,"Desempleado":1}};
        case "auren:player": { const p = Demo.players.find(x=>x.source===data.id) || {}; return {...p, ping:42, joined:Math.floor((now-52*60e3)/1000), discord:"123456789012345678", cash:1840, bank:25300, char:{...p.char, phoneNumber:"917-555-0142", birthday:"1998-05-11"}}; }
        case "action:get_health_and_armor": return {health:180, armor:50};
        case "action:get_player_accounts": return {money:1840, bank:25300, black_money:0};
        case "auren:inventory": return [{name:"phone", label:"Auren Phone", count:1},{name:"water", label:"Agua", count:3},{name:"WEAPON_PISTOL", label:"Pistola", count:1, weapon:true, serial:"AUR-48213", ammo:24}];
        case "action:get_player_vehicles": return [{plate:"AUR 482", model:"sultan", garage:"Garaje central"},{plate:"NYC 909", model:"faggio", garage:"Fuera"}];
        case "action:get_warnings": return [{id:3, reason:"Metagaming en el chat de voz", created_at:now-2*24*h}];
        case "auren:bans": return [{id:41, player_name:"Pedro Ruiz", reason:"Cheats (mod menú)", staff:"Rich", created_at:now-3*24*h, expires_at:new Date("2200-01-01").getTime()},{id:40, player_name:"Kevin Díaz", reason:"RDM repetido", staff:"Yari", created_at:now-5*24*h, expires_at:now+2*24*h}];
        case "auren:warnings": return [{id:3, player_name:"Joel Santana", reason:"Metagaming en el chat de voz", staff:"Yari", created_at:now-2*24*h},{id:2, player_name:"Luis Almonte", reason:"VDM en la 5ta Avenida", staff:"Rich", created_at:now-6*24*h}];
        case "auren:jails": return [{id:8, char_name:"Luis Almonte", reason:"Robo sin policías", cell_name:"Celda 2", staff_name:"Rich", time_mode:"realtime", expires_at:now+18*60e3}];
        case "auren:logs": return [{id:900, staff_name:"Rich", text:"Revivió a [7] Yarisa Méndez", created_at:now-4*60e3},{id:899, staff_name:"Yari", text:"Advirtió a [4] Joel Santana: Metagaming en el chat de voz", created_at:now-35*60e3},{id:898, staff_name:"Rich", text:"Cambió el clima a RAIN", created_at:now-80*60e3}];
        case "auren:staff": return [{nickname:"Rich", groupLabel:"Dueño", online:true, onDuty:true, weekDutyMin:1260, weekOnlineMin:1840, weekActions:96},{nickname:"Yari", groupLabel:"Moderadora", online:true, onDuty:false, weekDutyMin:640, weekOnlineMin:910, weekActions:41},{nickname:"Kiko", groupLabel:"Soporte", online:false, weekDutyMin:120, weekOnlineMin:300, weekActions:7, lastSeen:now-30*h}];
        case "call:chat:staff:fetchAll": return [{id:1, name:"Reporte de Joel Santana", type:"report"},{id:2, name:"Staff general", type:"chat"}];
        case "call:chat:join": return data===1 ? [{author_name:"Joel Santana", message:"Me chocaron el carro y se fueron, ¿me ayudan?", created_at:now-6*60e3}] : [{author_name:"Yari", message:"Hoy hay evento en Times Square a las 9.", created_at:now-50*60e3}];
        case "call:resources:getResources": return [{name:"auren_admin", state:"started"},{name:"auren_fuel", state:"started"},{name:"lb-phone", state:"started"},{name:"auren_medical", state:"stopped"}];
        case "action:get_jobs": return {police:{name:"police", label:"Policía"}, ambulance:{name:"ambulance", label:"EMS"}, mechanic:{name:"mechanic", label:"Mecánico"}};
        case "call:inventory:getItemList": return [{name:"water", label:"Agua"},{name:"bread", label:"Pan"},{name:"phone", label:"Auren Phone"}];
        case "call:getAllVehicleModels": return ["sultan","faggio","adder","police","ambulance"];
        default:
          if(method.startsWith("action:") || method.startsWith("call:")) throw new Error("Modo demostración: en tu web real esta acción se ejecuta en el servidor.");
          return null;
      }
    }
  };
  function startDemo(){
    RT.demo = true;
    RT.me = {nickname:"Rich", group:"owner", groupLabel:"Dueño (demostración)", perms:new Proxy({}, {get:()=>true})};
    setConn("wait", "Demostración, sin conexión real");
    onReady();
    // un poco de vida en la demo
    setTimeout(()=> onEvent({kind:"log", value:{ts:Date.now(), staff:"Yari", text:"Revivió a [12] Francisco Rosario"}}), 2500);
  }

  /* ---------- arranque ---------- */
  A.user.then(u=>{
    if(!A.isAuthReady()) return startDemo();
    if(!u){ setConn("off", "Sin sesión"); return renderState("login"); }
    connect();
  });
})();
