/* host.js — big screen: PeerJS room, two QR codes, hub, game flow, keyboard fallback, canvas + particles */
"use strict";

const VW = 1600, VH = 900;              // logical game canvas size (letter-boxed)
const KEYMAP = {
  1: { up: "KeyW", down: "KeyS", left: "KeyA", right: "KeyD", a: "KeyQ", b: "KeyE" },
  2: { up: "KeyI", down: "KeyK", left: "KeyJ", right: "KeyL", a: "KeyU", b: "KeyO" },
};

function mkPlayer(n) {
  return {
    n, color: COLORS[n], name: DEFAULT_NAMES[n],
    conn: null, phone: false, ios: false, lat: 0,
    u: [0, 0, 1], us: [0, 0, 1],   // up-vector in device frame (G), raw + smoothed
    l: 0, r: 0, d: 0,              // peak linear accel (G), peak gyro (deg/s), dial angle (deg)
    tc: false, bt: 0,              // touching, buttons bitmask (1 gas, 2 brake)
    lastS: 0, ready: false, th0: 0, tapT: 0,
    kb: { steer: 0, gas: false, brake: false, b: false },
    _bar: -1, _barT: 0,
  };
}

const H = {
  peer: null, id: null, idTries: 0, online: false,
  phase: "hub",            // hub | intro | count | play | result
  game: null, opts: store.get("mg2p-opts", {}),
  wins: { 1: 0, 2: 0 }, keys: {},
  countT: 0, countN: 0, goT: 0, result: null,
  P: { 1: mkPlayer(1), 2: mkPlayer(2) },
  optsFor(G) { const o = Object.assign({}, this.opts[G.id] || {}); (G.options || []).forEach(op => { if (!op.values.includes(o[op.key])) o[op.key] = op.def; }); return o; },
};
try { const w = JSON.parse(sessionStorage.getItem("mg2p-wins")); if (w) H.wins = w; } catch (e) {}

/* ---------------- messaging ---------------- */
function send(p, m) { if (p.conn && p.conn.open) { try { p.conn.send(m); } catch (e) {} } }
function sendAll(m) { send(H.P[1], m); send(H.P[2], m); }
function fx(p, k, extra) { send(p, Object.assign({ t: "fx", k }, extra || {})); }
/** throttled progress bar on the phone (0..1) */
function phoneBar(p, v) {
  const t = now();
  if (Math.abs(v - p._bar) < 0.01 && t - p._barT < 500) return;
  if (t - p._barT < 90) return;
  p._bar = v; p._barT = t; send(p, { t: "bar", v: r2(clamp(v, 0, 1)) });
}

/* ---------------- input signals (phone or keyboard) ---------------- */
const S = {
  up: p => (p.phone ? p.us[1] : p.kb.b ? 1 : 0),           // +1 = phone top points up (saber hilt), -1 = down
  gas: p => !!(p.bt & 1) || p.kb.gas,
  brake: p => !!(p.bt & 2) || p.kb.brake,
  theta: p => Math.atan2(p.us[1], p.us[0]),                 // angle of "up" in the screen plane
  /* "straight" = the nearest portrait/landscape angle. Learned lazily (phone may be flat at GO)
     and re-learned if the grip changes by > 80° for half a second. */
  calibrate(p) { p.th0 = null; p.offT = 0; },
  steer(p) {
    if (p.kb.steer) return p.kb.steer;
    if (!p.phone) return 0;
    const m = Math.hypot(p.us[0], p.us[1]);
    if (m < 0.3) return 0;                                    // phone lying flat → can't read the wheel
    const th = S.theta(p), snap = () => (p.th0 = Math.round(th / (Math.PI / 2)) * (Math.PI / 2));
    if (p.th0 == null) { if (m < 0.55) return 0; snap(); }
    let rel = (wrapPI(th - p.th0) * 180) / Math.PI;           // + = turned clockwise = right
    if (Math.abs(rel) > 80) { if (!p.offT) p.offT = now(); else if (now() - p.offT > 500) { snap(); p.offT = 0; rel = (wrapPI(th - p.th0) * 180) / Math.PI; } }
    else p.offT = 0;
    return Math.sign(rel) * clamp((Math.abs(rel) - 3) / 32, 0, 1);
  },
  tiltFrom(p, b) {
    const u = p.us, m = Math.hypot(u[0], u[1], u[2]) || 1, mb = Math.hypot(b[0], b[1], b[2]) || 1;
    return (Math.acos(clamp((u[0] * b[0] + u[1] * b[1] + u[2] * b[2]) / (m * mb), -1, 1)) * 180) / Math.PI;
  },
};

/* ---------------- boot + PeerJS room ---------------- */
async function hostBoot() {
  $("#host").hidden = false;
  document.title = "2P Phone Party — big screen";
  buildHub();
  bindKeys();
  CV.el = $("#cv"); CV.ctx = CV.el.getContext("2d");
  requestAnimationFrame(frame);
  setInterval(() => { const t = now(); for (const n of [1, 2]) send(H.P[n], { t: "ping", ts: t, lat: H.P[n].lat }); }, 2000);
  setInterval(hubLive, 100);
  setInterval(() => {                       // a phone whose stream stopped for 5 s is gone (closed tab, lost Wi-Fi)
    for (const n of [1, 2]) { const p = H.P[n]; if (p.phone && p.conn && p.lastS && now() - p.lastS > 5000) { const c = p.conn; dropConn(c); try { c.close(); } catch (e) {} } }
  }, 1000);
  try { await Promise.all([loadScript(LIB.peer), loadScript(LIB.qr)]); }
  catch (e) { setNet("Could not load PeerJS / QR library — check the internet connection", "bad"); return; }
  hostPeer();
}

function hostPeer() {
  let id = null;
  try { id = sessionStorage.getItem("mg2p-host"); } catch (e) {}
  if (!id || H.idTries > 2) id = "mg2p-" + Math.random().toString(36).slice(2, 10);
  const peer = new Peer(id, peerOpts());
  H.peer = peer;
  peer.on("open", pid => {
    H.id = pid; H.online = true; H.idTries = 0;
    try { sessionStorage.setItem("mg2p-host", pid); } catch (e) {}
    setNet("Online · room " + pid.slice(5), "ok");
    renderQRs();
  });
  peer.on("error", e => {
    if (e.type === "unavailable-id") {          // old tab still holds the id — retry, then pick a new one
      H.idTries++; peer.destroy(); setTimeout(hostPeer, 1500); return;
    }
    if (e.type === "peer-unavailable") return;
    setNet("Link error: " + e.type, "bad");
  });
  peer.on("disconnected", () => {
    H.online = false; setNet("Reconnecting to the signalling server…", "warn");
    setTimeout(() => { if (!peer.destroyed && peer.disconnected) { try { peer.reconnect(); } catch (e) {} } }, 1500);
  });
  peer.on("connection", conn => {
    conn.on("data", m => hostRx(conn, m));
    conn.on("close", () => dropConn(conn));
    conn.on("error", () => dropConn(conn));
  });
}

function hostRx(conn, m) {
  if (!m || typeof m !== "object") return;
  if (m.t === "hi") {
    const n = m.p == 2 ? 2 : 1, p = H.P[n];
    if (p.conn && p.conn !== conn) { const old = p.conn; p.conn = null; try { old.close(); } catch (e) {} }
    p.conn = conn; conn._pn = n; p.phone = true; p.ios = !!m.ios; p.lastS = now();
    p.name = String(m.name || DEFAULT_NAMES[n]).slice(0, 16);
    send(p, { t: "welcome", p: n, color: p.color });
    pushUi(p); renderPlayers(); AU.sfx("beep");
    toast(`${p.name} connected as P${n}`);
    return;
  }
  const p = H.P[conn._pn];
  if (!p || p.conn !== conn) return;
  switch (m.t) {
    case "s": {
      const t = now(), dt = p.lastS ? Math.min(0.1, (t - p.lastS) / 1000) : 0.02;
      p.lastS = t;
      if (Array.isArray(m.u)) { p.u = m.u; for (let i = 0; i < 3; i++) p.us[i] = lerp(p.us[i], +m.u[i] || 0, 0.3); }
      p.l = +m.l || 0; p.r = +m.r || 0; p.d = +m.d || 0; p.tc = !!m.tc; p.bt = m.bt | 0;
      sample(p, dt, p.l, p.r);
      break;
    }
    case "tap": onTap(p, now() - p.lat); break;                  // p.lat is already one-way
    case "pong": p.lat = Math.round((now() - m.ts) / 2); break;   // one-way estimate
  }
}

function dropConn(conn) {
  for (const n of [1, 2]) {
    const p = H.P[n];
    if (p.conn === conn) {
      p.conn = null; p.phone = false; p.bt = 0; p.tc = false; p.l = 0; p.r = 0;
      renderPlayers(); toast(`${p.name} disconnected — rescan the P${n} QR`);
    }
  }
}

function phoneBase() {
  const local = ["localhost", "127.0.0.1"].includes(location.hostname);
  if (location.protocol === "https:" || (local && location.protocol === "http:")) return location.origin + location.pathname;
  return store.get("mg2p-phone-url", DEFAULT_PHONE_URL);
}
function pairUrl(n) { return `${phoneBase()}#pair=${H.id}&p=${n}` + (SRV ? "&srv=" + encodeURIComponent(SRV) : ""); }

function renderQRs() {
  if (!H.id || !window.QRCode) return;
  for (const n of [1, 2]) {
    const el = $("#qr" + n), url = pairUrl(n);
    el.innerHTML = "";
    new QRCode(el, { text: url, width: 200, height: 200, colorDark: "#000000", colorLight: "#ffffff", correctLevel: QRCode.CorrectLevel.M });
    const a = $("#qrurl" + n); a.href = url; a.textContent = url;
  }
}

function setNet(msg, cls) { const el = $("#net"); el.className = "net " + cls; el.querySelector("span").textContent = msg; }
let _toastT = 0;
function toast(msg) {
  const el = $("#toast"); if (!el) return;
  el.textContent = msg; el.classList.add("show");
  clearTimeout(_toastT); _toastT = setTimeout(() => el.classList.remove("show"), 2600);
}

/* ---------------- hub ---------------- */
function buildHub() {
  const box = $("#games");
  GAMES.forEach(G => {
    const b = document.createElement("button");
    b.className = "gcard"; b.type = "button"; b.dataset.id = G.id;
    b.innerHTML = `<span class="gi">${G.icon}</span><b>${G.name}</b><p>${G.desc}</p><span class="tag">${G.tag}</span>`;
    b.onclick = () => { AU.init(); openGame(G.id); };
    box.appendChild(b);
  });
  const inp = $("#phone-url");
  inp.value = phoneBase();
  if (location.protocol === "https:") inp.disabled = true;
  inp.onchange = () => { store.set("mg2p-phone-url", inp.value.trim()); renderQRs(); };
  $("#reset-wins").onclick = () => { H.wins = { 1: 0, 2: 0 }; saveWins(); renderPlayers(); };
  $$(".pc-qrbtn").forEach(b => (b.onclick = () => b.closest(".pc").classList.toggle("showqr")));
  $("#g-back").onclick = backToHub;
  $("#intro").addEventListener("click", e => {
    const a = e.target.closest("[data-act]"); if (!a) return;
    if (a.dataset.act === "start") startCountdown(); else backToHub();
  });
  $("#result").addEventListener("click", e => {
    const a = e.target.closest("[data-act]"); if (!a) return;
    if (a.dataset.act === "again") rematch(); else backToHub();
  });
  renderPlayers();
}

function renderPlayers() {
  for (const n of [1, 2]) {
    const p = H.P[n], card = $(`.pc[data-n="${n}"]`);
    card.classList.toggle("on", p.phone);
    if (!p.phone) card.classList.remove("showqr");
    card.querySelector(".pc-name").textContent = p.name;
    card.querySelector(".pc-wins b").textContent = H.wins[n];
    card.querySelector(".pc-stat").textContent = p.phone ? `Connected ✓ ${p.ios ? "(iPhone)" : ""}` : "Waiting for phone…";
    $("#sc" + n).textContent = H.wins[n];
    const g = $(`.g-pl[data-n="${n}"]`);
    if (g) { g.textContent = `P${n} ${p.name}${p.phone ? "" : " · keyboard"}`; g.classList.toggle("on", p.phone); }
  }
}
function saveWins() { try { sessionStorage.setItem("mg2p-wins", JSON.stringify(H.wins)); } catch (e) {} }

function hubLive() {
  if (H.phase !== "hub") return;
  for (const n of [1, 2]) {
    const p = H.P[n], card = $(`.pc[data-n="${n}"]`);
    const x = clamp(-p.us[0], -1, 1) * 26, y = clamp(p.us[1], -1, 1) * 26;
    card.querySelector(".tilt i").style.transform = `translate(${x}px,${y}px)`;
    card.querySelector(".mbar i").style.width = clamp(p.r / 500 + p.l / 2, 0, 1) * 100 + "%";
    card.querySelector(".tbar i").style.width = (p.tc || p.bt ? 100 : 0) + "%";
    if (p.phone) card.querySelector(".pc-stat").textContent = `Connected ✓ · ${p.lat} ms${p.ios ? " · iPhone" : ""}`;
  }
}

/* ---------------- game flow ---------------- */
function phoneUiFor(p) {
  const G = H.game;
  if (H.phase === "hub" || !G) return { mode: "text", icon: "🎮", title: "Connected ✓", hint: "Pick a game on the big screen" };
  if (H.phase === "intro") return { mode: "text", icon: G.icon, title: G.name, hint: G.phoneHow, tap: p.ready ? "Ready ✓ — waiting for the other player" : "Tap anywhere when ready" };
  if (H.phase === "result") {
    const w = H.result.w;
    return { mode: "text", icon: w === p.n ? "🏆" : w ? "😵" : "🤝", title: w === p.n ? "YOU WIN!" : w ? "You lose" : "Draw", hint: H.result.detail || "", tap: p.ready ? "Rematch ✓ — waiting…" : "Tap for a rematch" };
  }
  return Object.assign({ mode: "text", icon: G.icon, title: G.name, hint: "" }, G.phoneUi ? G.phoneUi(p) : {});
}
function pushUi(p) { const ui = phoneUiFor(p); ui.t = "ui"; ui.phase = H.phase; ui.color = p.color; ui.name = p.name; ui.n = p.n; send(p, ui); }
function pushUiAll() { pushUi(H.P[1]); pushUi(H.P[2]); }

function openGame(id) {
  const G = GAMES.find(g => g.id === id); if (!G) return;
  H.game = G; H.phase = "intro";
  H.P[1].ready = H.P[2].ready = false;
  FX.clear(); SHAKE.v = 0;
  G.reset();
  $("#hub").hidden = true; $("#game").hidden = false; $("#result").hidden = true;
  $("#g-name").textContent = `${G.icon} ${G.name}`;
  showIntro(); renderPlayers(); pushUiAll();
}

function showIntro() {
  const G = H.game, box = $("#intro");
  box.querySelector(".i-icon").textContent = G.icon;
  box.querySelector(".i-name").textContent = G.name;
  box.querySelector(".i-desc").textContent = G.desc;
  box.querySelector(".i-how").innerHTML = G.how.map(h => `<li>${h}</li>`).join("");
  box.querySelector(".i-keys").textContent = "⌨ " + G.keys;
  const opts = box.querySelector(".i-opts"); opts.innerHTML = "";
  const cur = H.optsFor(G);
  (G.options || []).forEach(op => {
    const d = document.createElement("div"); d.className = "opt";
    d.innerHTML = `<span>${op.label}</span>` + op.values.map(v => `<button type="button" data-v="${v}" class="${v === cur[op.key] ? "sel" : ""}">${v}</button>`).join("");
    d.onclick = e => {
      const b = e.target.closest("button"); if (!b) return;
      H.opts[G.id] = Object.assign({}, H.opts[G.id], { [op.key]: +b.dataset.v }); store.set("mg2p-opts", H.opts);
      d.querySelectorAll("button").forEach(x => x.classList.toggle("sel", x === b));
      G.reset();
    };
    opts.appendChild(d);
  });
  box.hidden = false; updateReady(box);
}

function updateReady(box) {
  for (const n of [1, 2]) {
    const p = H.P[n], el = box.querySelector(`.rd[data-n="${n}"]`);
    el.classList.toggle("ok", p.ready);
    const how = p.phone ? "tap your phone" : `press ${KEYMAP[n].a.slice(3)}`;
    el.textContent = `P${n} ${p.name}: ${p.ready ? "READY ✓" : how}`;
  }
}

function onTap(p, t) {
  p.tapT = t;
  if (H.phase === "intro") {
    if (!p.ready) { p.ready = true; updateReady($("#intro")); pushUi(p); AU.sfx("beep"); }
    if (H.P[1].ready && H.P[2].ready) startCountdown();
  } else if (H.phase === "result") {
    if (!p.ready) { p.ready = true; updateReady($("#result")); pushUi(p); AU.sfx("beep"); }
    if (H.P[1].ready && H.P[2].ready) rematch();
  } else if (H.phase === "play" && H.game.onTap) H.game.onTap(p, t);
}

function sample(p, dt, l, r) { if (H.phase === "play" && H.game && H.game.onSample) H.game.onSample(p, dt, l, r); }

function startCountdown() {
  if (!H.game || H.phase === "count" || H.phase === "play") return;
  AU.init();
  H.phase = "count"; H.countT = now(); H.countN = 0;
  FX.clear(); SHAKE.v = 0;
  H.game.reset();
  $("#intro").hidden = true; $("#result").hidden = true;
  pushUiAll();
}
function rematch() { H.P[1].ready = H.P[2].ready = false; startCountdown(); }

/** called by games when the match is decided. w = 1 | 2 | 0 (draw) */
function finish(w, detail) {
  if (H.phase !== "play") return;
  H.phase = "result"; H.result = { w, detail };
  if (w) { H.wins[w]++; saveWins(); }
  H.P[1].ready = H.P[2].ready = false;
  AU.sfx(w ? "win" : "lose");
  if (w) { fx(H.P[w], "win"); fx(H.P[other(w)], "lose"); }
  const box = $("#result");
  box.querySelector(".r-icon").textContent = w ? "🏆" : "🤝";
  const t = box.querySelector(".r-title");
  t.textContent = w ? `${H.P[w].name} wins!` : "It's a draw!";
  t.style.color = w ? COLORS[w] : "#fff";
  box.querySelector(".r-detail").textContent = detail || "";
  box.querySelector(".r-tally").innerHTML = `<span style="color:var(--p1)">${H.P[1].name} ${H.wins[1]}</span> &nbsp;–&nbsp; <span style="color:var(--p2)">${H.wins[2]} ${H.P[2].name}</span>`;
  box.hidden = false; updateReady(box);
  renderPlayers(); pushUiAll();
}

function backToHub() {
  if (H.game && H.game.stop) H.game.stop();
  H.phase = "hub"; H.game = null;
  $("#game").hidden = true; $("#hub").hidden = false;
  $("#intro").hidden = true; $("#result").hidden = true;
  renderPlayers(); pushUiAll();
}

/* ---------------- keyboard fallback ---------------- */
function bindKeys() {
  addEventListener("keydown", e => {
    if (e.target && /INPUT|TEXTAREA/.test(e.target.tagName)) return;
    AU.init();
    H.keys[e.code] = true;
    if (e.code === "Escape") { if (H.phase !== "hub") backToHub(); return; }
    if (e.code === "Enter") { if (H.phase === "intro") startCountdown(); else if (H.phase === "result") rematch(); e.preventDefault(); return; }
    if (e.repeat) return;
    for (const n of [1, 2]) if (e.code === KEYMAP[n].a) kbAction(H.P[n]);
  });
  addEventListener("keyup", e => { H.keys[e.code] = false; });
  addEventListener("blur", () => { H.keys = {}; });
  addEventListener("pointerdown", () => AU.init(), { capture: true });
  addEventListener("mousemove", () => { H.mouseT = now(); });
}
/** Q / U = one "action": a tap, a shake burst and a swing */
function kbAction(p) { onTap(p, now()); if (H.phase === "play") sample(p, 0.3, 2.6, 800); }
function kbUpdate(dt) {
  for (const n of [1, 2]) {
    const p = H.P[n], k = KEYMAP[n], K = H.keys;
    p.kb.steer = (K[k.right] ? 1 : 0) - (K[k.left] ? 1 : 0);
    p.kb.gas = !!K[k.up]; p.kb.brake = !!K[k.down]; p.kb.b = !!K[k.b];
    if (!p.phone && p.kb.steer) p.d += p.kb.steer * 70 * dt;
  }
}

/* ---------------- canvas, loop, particles ---------------- */
const CV = { el: null, ctx: null, s: 1, ox: 0, oy: 0, dpr: 1 };
const SHAKE = { v: 0 };
function fitCanvas() {
  const el = CV.el, w = el.clientWidth || innerWidth, h = el.clientHeight || innerHeight, dpr = Math.min(2, devicePixelRatio || 1);
  const W = Math.round(w * dpr), Hh = Math.round(h * dpr);
  if (el.width !== W || el.height !== Hh) { el.width = W; el.height = Hh; }
  CV.dpr = dpr; CV.s = Math.min(w / VW, h / VH); CV.ox = (w - VW * CV.s) / 2; CV.oy = (h - VH * CV.s) / 2;
}

let _lastT = now();
function frame() {
  const t = now(), dt = Math.min(0.05, (t - _lastT) / 1000); _lastT = t;
  kbUpdate(dt);
  const G = H.game;
  if (G && H.phase !== "hub") {
    if (H.phase === "count") {
      const el = (t - H.countT) / 1000, n = 3 - Math.floor(el);
      if (n !== H.countN && n > 0) { H.countN = n; AU.sfx("beep"); sendAll({ t: "big", text: String(n) }); }
      if (el >= 3) {
        H.phase = "play"; H.goT = t;
        if (G.begin) G.begin();
        AU.sfx("go"); pushUiAll(); sendAll({ t: "big", text: "GO!" });
      }
    }
    if (H.phase === "play" || (H.phase === "result" && G.updateAfter)) G.update(dt, t);
    FX.update(dt);
    SHAKE.v = Math.max(0, SHAKE.v - dt * 45);
    render(t);
  }
  const hide = !!G && (H.phase === "play" || H.phase === "count") && t - (H.mouseT || 0) > 2500;
  if (hide !== H._hid) { H._hid = hide; $("#game").classList.toggle("hidebar", hide); }
  requestAnimationFrame(frame);
}

function render(t) {
  fitCanvas();
  const c = CV.ctx, G = H.game;
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.fillStyle = G.bg || "#000"; c.fillRect(0, 0, CV.el.width, CV.el.height);
  c.setTransform(CV.s * CV.dpr, 0, 0, CV.s * CV.dpr, CV.ox * CV.dpr, CV.oy * CV.dpr);
  c.save();
  if (SHAKE.v > 0) c.translate(rnd(-1, 1) * SHAKE.v, rnd(-1, 1) * SHAKE.v);
  G.draw(c, t);
  FX.draw(c);
  c.restore();
  if (H.phase === "count") {
    const el = (t - H.countT) / 1000, n = 3 - Math.floor(el), f = el % 1;
    c.save(); c.globalAlpha = 1 - f * 0.6;
    text(c, String(Math.max(1, n)), VW / 2, VH / 2, 260 * (1.3 - f * 0.3), "#fff", "center", 900, "middle", "rgba(0,0,0,.6)");
    c.restore();
    text(c, "GET READY", VW / 2, VH / 2 + 170, 40, "rgba(255,255,255,.85)", "center", 800, "middle", "rgba(0,0,0,.6)");
  } else if (H.phase === "play" && t - H.goT < 800) {
    const f = (t - H.goT) / 800;
    c.save(); c.globalAlpha = 1 - f;
    text(c, "GO!", VW / 2, VH / 2, 240 * (1 + f * 0.4), "#ffe14d", "center", 900, "middle", "rgba(0,0,0,.6)");
    c.restore();
  }
}

const FX = {
  list: [],
  clear() { this.list.length = 0; },
  add(o) { this.list.push(Object.assign({ x: 0, y: 0, vx: 0, vy: 0, g: 0, drag: 0, life: 1, size: 4, color: "#fff", glow: 0 }, o, { max: o.life || 1 })); },
  burst(x, y, n, o = {}) {
    const sp = o.speed || [100, 400], lf = o.life || [0.4, 1], sz = o.size || [2, 6], cols = o.colors || ["#fff"];
    for (let i = 0; i < n; i++) {
      const a = o.dir != null ? o.dir + rnd(-(o.spread || 0.5), o.spread || 0.5) : rnd(0, Math.PI * 2), v = rnd(sp[0], sp[1]);
      this.add({ x: x + rnd(-(o.jx || 0), o.jx || 0), y: y + rnd(-(o.jy || 0), o.jy || 0), vx: Math.cos(a) * v, vy: Math.sin(a) * v, g: o.g || 0, drag: o.drag || 0,
        life: rnd(lf[0], lf[1]), size: rnd(sz[0], sz[1]), color: cols[(Math.random() * cols.length) | 0], glow: o.glow || 0 });
    }
  },
  update(dt) {
    const L = this.list;
    for (let i = L.length - 1; i >= 0; i--) {
      const q = L[i];
      q.life -= dt; if (q.life <= 0) { L.splice(i, 1); continue; }
      q.vy += q.g * dt; const k = Math.pow(1 - Math.min(0.99, q.drag), dt);
      q.vx *= k; q.vy *= k; q.x += q.vx * dt; q.y += q.vy * dt;
    }
    if (L.length > 1500) L.splice(0, L.length - 1500);
  },
  draw(c) {
    c.save();
    for (const q of this.list) {
      c.globalAlpha = clamp(q.life / q.max, 0, 1);
      c.fillStyle = q.color;
      if (q.glow) { c.shadowColor = q.color; c.shadowBlur = q.glow; } else c.shadowBlur = 0;
      c.beginPath(); c.arc(q.x, q.y, q.size, 0, Math.PI * 2); c.fill();
    }
    c.restore();
  },
};

/* ---------------- drawing helpers ---------------- */
function text(c, s, x, y, size, color, align = "center", weight = 800, base = "middle", shadow) {
  c.font = `${weight} ${size}px system-ui,-apple-system,"Segoe UI",Roboto,sans-serif`;
  c.textAlign = align; c.textBaseline = base;
  if (shadow) { c.save(); c.shadowColor = shadow; c.shadowBlur = size * 0.15; c.shadowOffsetY = size * 0.04; }
  c.fillStyle = color; c.fillText(s, x, y);
  if (shadow) c.restore();
}
function rr(c, x, y, w, h, r) {
  c.beginPath();
  if (c.roundRect) { c.roundRect(x, y, w, h, r); return; }
  r = Math.min(r, w / 2, h / 2);
  c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
}
/** horizontal bar; fromRight fills right→left */
function bar(c, x, y, w, h, v, color, fromRight, bg = "rgba(255,255,255,.14)") {
  v = clamp(v, 0, 1);
  rr(c, x, y, w, h, h / 2); c.fillStyle = bg; c.fill();
  if (v <= 0) return;
  const fw = Math.max(h, w * v);
  rr(c, fromRight ? x + w - fw : x, y, fw, h, h / 2); c.fillStyle = color; c.fill();
}
function nameTag(c, n, x, y, align) {
  const p = H.P[n];
  text(c, `P${n} · ${p.name}${p.phone ? "" : " ⌨"}`, x, y, 30, p.color, align, 900, "middle", "rgba(0,0,0,.5)");
}
