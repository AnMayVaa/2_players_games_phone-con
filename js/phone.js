/* phone.js — controller page opened from a QR (#pair=<hostId>&p=<1|2>).
   Streams motion + touch to the big screen over WebRTC (PeerJS) and renders the screen the host asks for. */
"use strict";

const C = {
  n: HASH.get("p") === "2" ? 2 : 1, host: HASH.get("pair"),
  peer: null, conn: null, open: false, started: false, dialT: 0,
  name: "", ui: { mode: "text" }, ptr: new Map(), btn: 0,
  layout: "L", ux: 0, hum: null, wl: null,
  safe: { target: null, lock: 0, of: 3, notch: null, inZone: false },
};

/* Motion state. u = "up" vector in the device frame (x right, y top, z out of screen), in G.
   Android and iOS disagree on the sign of accelerationIncludingGravity, so the sign is
   learned by comparing with the orientation-derived up vector (M.sign). */
const M = { u: [0, 0, 1], raw: [0, 0, 9.81], has: false, lin: 0, gyro: 0, pkL: 0, pkR: 0, dial: 0, lastT: 0, sign: IS_IOS ? -1 : 1, vote: 0, gotEvent: false };

function onMotion(e) {
  M.gotEvent = true;
  const t = now(), dt = M.lastT ? Math.min(0.1, (t - M.lastT) / 1000) : 0.016; M.lastT = t;
  const g = e.accelerationIncludingGravity, a = e.acceleration, r = e.rotationRate;
  if (g && g.x != null) {
    M.raw = [g.x, g.y, g.z]; M.has = true;
    const s = M.sign / 9.81; M.u = [g.x * s, g.y * s, g.z * s];
  }
  const lin = a && a.x != null ? Math.hypot(a.x, a.y, a.z) / 9.81 : Math.abs(Math.hypot(M.raw[0], M.raw[1], M.raw[2]) / 9.81 - 1);
  M.lin = lin; M.pkL = Math.max(M.pkL, lin);
  if (r && r.alpha != null) {
    M.gyro = Math.hypot(r.alpha || 0, r.beta || 0, r.gamma || 0);
    M.pkR = Math.max(M.pkR, M.gyro);
    M.dial += (r.alpha || 0) * dt;           // rotation around the screen normal = safe dial
  }
}
function onOrient(e) {
  if (e.beta == null) return;
  M.gotEvent = true;
  const b = (e.beta * Math.PI) / 180, gm = ((e.gamma || 0) * Math.PI) / 180;
  const uo = [-Math.cos(b) * Math.sin(gm), Math.sin(b), Math.cos(b) * Math.cos(gm)];
  if (M.has) {
    const m = Math.hypot(M.raw[0], M.raw[1], M.raw[2]);
    if (m > 7 && m < 12.5) {
      const d = (M.raw[0] * uo[0] + M.raw[1] * uo[1] + M.raw[2] * uo[2]) / m;
      if (Math.abs(d) > 0.6) { M.vote = clamp(M.vote + Math.sign(d), -60, 60); if (Math.abs(M.vote) > 15) M.sign = Math.sign(M.vote); }
    }
  } else M.u = uo;
}

function askMotion() {
  // both requests start synchronously inside the tap (iOS requirement)
  const req = [];
  try { if (typeof DeviceMotionEvent !== "undefined" && typeof DeviceMotionEvent.requestPermission === "function") req.push(DeviceMotionEvent.requestPermission()); } catch (e) {}
  try { if (typeof DeviceOrientationEvent !== "undefined" && typeof DeviceOrientationEvent.requestPermission === "function") req.push(DeviceOrientationEvent.requestPermission()); } catch (e) {}
  if (!req.length) return Promise.resolve(true);
  return Promise.all(req.map(p => p.catch(() => "denied"))).then(rs => rs[0] === "granted");
}

async function wakeLock() {
  try { if ("wakeLock" in navigator && (!C.wl || C.wl.released)) C.wl = await navigator.wakeLock.request("screen"); } catch (e) {}
}

/* ---------------- boot ---------------- */
function phoneBoot() {
  $("#phone").hidden = false;
  document.title = `P${C.n} controller — 2P Phone Party`;
  setColor(COLORS[C.n]);
  $("#c-badge").textContent = "P" + C.n;
  $("#c-start-title").textContent = "Player " + C.n;
  const nm = store.get("mg2p-name", "");
  $("#c-nameinp").value = nm;
  $("#c-nameinp").placeholder = DEFAULT_NAMES[C.n];
  $("#c-name").textContent = nm || DEFAULT_NAMES[C.n];
  if (!window.isSecureContext) $("#c-nosecure").hidden = false;
  $("#c-go").onclick = phoneStartTap;
  loadScript(LIB.peer).catch(() => status("Cannot load the link library — check internet", "bad"));
  buildDial();
  bindTouch();
  setInterval(sendTick, 20);
  setInterval(() => { if (C.started && !C.open && now() - C.dialT > 5000) connect(); }, 1000);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && C.started) { wakeLock(); AU.init(); if (!C.open) connect(); }
  });
  requestAnimationFrame(phoneLoop);
}

function phoneStartTap() {
  AU.unlock(); HAPTIC.tap();
  const perm = askMotion();
  C.name = ($("#c-nameinp").value.trim() || DEFAULT_NAMES[C.n]).slice(0, 16);
  store.set("mg2p-name", $("#c-nameinp").value.trim());
  $("#c-name").textContent = C.name;
  addEventListener("devicemotion", onMotion);
  addEventListener("deviceorientation", onOrient);
  perm.then(ok => { if (!ok) { $("#c-perm").hidden = false; $("#c-start").hidden = false; $("#c-main").hidden = true; } });
  setTimeout(() => { if (!M.gotEvent && C.started) $("#c-hint").textContent = "⚠ No motion data from this browser — check Motion & Orientation permission."; }, 3000);
  wakeLock();
  C.started = true;
  $("#c-start").hidden = true; $("#c-main").hidden = false;
  applyUi({ mode: "text", icon: "📡", title: "Connecting…", hint: "Linking to the big screen" });
  connect();
}

/* ---------------- link ---------------- */
function status(msg, cls) { const el = $("#c-stat"); el.className = cls || ""; el.querySelector("em").textContent = msg; }

function connect() {
  if (!window.Peer) { status("Loading…", "warn"); loadScript(LIB.peer).then(connect, () => status("No internet?", "bad")); return; }
  C.dialT = now();
  if (!C.peer || C.peer.destroyed) {
    status("Connecting…", "warn");
    C.peer = new Peer(peerOpts());
    C.peer.on("open", () => { if (!C.open) dial(); });
    C.peer.on("error", e => {
      if (e.type === "peer-unavailable") { status("Big screen not found", "bad"); applyUi({ mode: "text", icon: "🔎", title: "Big screen not found", hint: "Reload the big screen and scan its QR again. Retrying…" }); }
      else status("Link error: " + e.type, "bad");
    });
    C.peer.on("disconnected", () => setTimeout(() => { try { if (!C.peer.destroyed && C.peer.disconnected) C.peer.reconnect(); } catch (e) {} }, 1000));
    return;
  }
  if (C.peer.open) dial();
  else if (C.peer.disconnected) { try { C.peer.reconnect(); } catch (e) {} }
}

function dial() {
  if (C.conn) { const old = C.conn; C.conn = null; try { old.close(); } catch (e) {} }
  C.dialT = now(); status("Linking…", "warn");
  const conn = C.peer.connect(C.host, { serialization: "json", reliable: true });
  C.conn = conn;
  conn.on("open", () => {
    if (C.conn !== conn) return;
    C.open = true;
    conn.send({ t: "hi", p: C.n, name: C.name, ios: IS_IOS });
    status("Connected", "ok");
  });
  conn.on("data", phoneRx);
  conn.on("close", () => {
    if (C.conn !== conn) return;
    C.open = false; C.btn = 0; humOff();
    status("Reconnecting…", "warn");
    applyUi({ mode: "text", icon: "📡", title: "Reconnecting…", hint: "Lost the big screen — retrying" });
  });
  conn.on("error", () => {});
}

function sendTick() {
  if (!C.open || !C.conn) return;
  try {
    C.conn.send({ t: "s", u: M.u.map(r2), l: r2(M.pkL), r: Math.round(M.pkR), d: Math.round(M.dial * 10) / 10, tc: C.ptr.size ? 1 : 0, bt: C.btn });
  } catch (e) {}
  M.pkL = M.lin; M.pkR = M.gyro;
}

function phoneRx(m) {
  if (!m || typeof m !== "object") return;
  switch (m.t) {
    case "welcome": setColor(m.color); break;
    case "ui": applyUi(m); break;
    case "bar": { const b = $("#c-bar"); b.hidden = false; b.querySelector("i").style.width = clamp(m.v, 0, 1) * 100 + "%"; break; }
    case "big": big(m.text); break;
    case "ping": try { C.conn.send({ t: "pong", ts: m.ts }); } catch (e) {} status(`Connected · ${m.lat | 0} ms`, "ok"); break;
    case "fx": phoneFx(m); break;
  }
}

function phoneFx(m) {
  switch (m.k) {
    case "buzz": if (!vibrate(m.ms || 120)) AU.sfx("buzz"); break;
    case "hit": vibrate([70, 30, 140]); AU.sfx("hit"); flash("#ff2a2a"); break;
    case "clash": vibrate(40); AU.sfx("clash"); flash("#ffffff"); break;
    case "pop": vibrate([30, 30, 250]); AU.sfx("pop"); flash("#fff3c4"); break;
    case "fire": vibrate(90); AU.sfx("go"); flash("#ffd400"); break;
    case "shot": vibrate(60); AU.sfx("shot"); flash("#fff"); break;
    case "win": vibrate([50, 50, 50, 50, 220]); AU.sfx("win"); break;
    case "lose": vibrate(400); AU.sfx("lose"); break;
    case "unlock": vibrate([40, 40, 140]); AU.sfx("click"); setTimeout(() => AU.sfx("lap"), 120); flash("#2ecc71"); break;
    case "lap": vibrate(70); AU.sfx("lap"); break;
    case "splash": vibrate(300); AU.sfx("splash"); flash("#c8e6c9"); break;
    default: AU.sfx(m.k);
  }
}

/* ---------------- screens ---------------- */
function setColor(c) { document.documentElement.style.setProperty("--pc", c); }
function big(txt) { const el = $("#c-big"); el.textContent = txt; el.classList.remove("show"); void el.offsetWidth; el.classList.add("show"); }
function flash(col) { const el = $("#c-flash"); el.style.background = col; el.classList.remove("show"); void el.offsetWidth; el.classList.add("show"); }

function applyUi(ui) {
  C.ui = ui;
  if (ui.color) setColor(ui.color);
  if (ui.name) $("#c-name").textContent = ui.name;
  const mode = ["text", "saber", "race", "safe"].includes(ui.mode) ? ui.mode : "text";
  for (const k of ["text", "saber", "race", "safe"]) $("#lay-" + k).hidden = k !== mode;
  $("#c-icon").textContent = ui.icon || "";
  $("#c-title").textContent = ui.title || "";
  $("#c-hint").textContent = ui.hint || "";
  $("#c-tap").textContent = ui.tap || "";
  const b = $("#c-bar");
  if (ui.bar != null) { b.hidden = false; b.querySelector("i").style.width = clamp(ui.bar, 0, 1) * 100 + "%"; } else b.hidden = true;
  if (ui.flash) flash(ui.flash);
  $("#phone").style.background = ui.bg ? ui.bg : "";
  if (mode === "saber") { humOn(); if (ui.hint) $(".sab-hint").textContent = ui.hint; } else humOff();
  if (mode === "race" && ui.hint) $("#race-tip span").textContent = ui.hint;
  if (mode === "safe") {
    const tg = ui.target == null ? null : ui.target;
    if (tg !== C.safe.target) { C.safe.target = tg; C.safe.inZone = false; }
    C.safe.lock = ui.lock | 0; C.safe.of = ui.of || 3;
    $("#safe-info").textContent = ui.lock >= C.safe.of ? "Safe open! 🎉" : `Lock ${C.safe.lock + 1} / ${C.safe.of}`;
  } else C.safe.target = null;
  if (mode !== "race") C.btn = 0;
}

/* touch: every pointer-down is a "tap"; in race mode pointers are hit-tested against GAS / BRAKE */
function bindTouch() {
  const root = $("#phone");
  const upd = () => {
    if (C.ui.mode !== "race" || $("#lay-race").hidden) { C.btn = 0; return; }
    const g = $("#rb-gas").getBoundingClientRect(), b = $("#rb-brake").getBoundingClientRect();
    let bt = 0;
    for (const [, q] of C.ptr) {
      if (q.x >= g.left && q.x <= g.right && q.y >= g.top && q.y <= g.bottom) bt |= 1;
      if (q.x >= b.left && q.x <= b.right && q.y >= b.top && q.y <= b.bottom) bt |= 2;
    }
    if ((bt & ~C.btn) && IS_IOS) HAPTIC.tap();
    C.btn = bt;
    $("#rb-gas").classList.toggle("on", !!(bt & 1));
    $("#rb-brake").classList.toggle("on", !!(bt & 2));
  };
  root.addEventListener("pointerdown", e => {
    if (!C.started || e.target.closest("#c-start")) return;
    e.preventDefault();
    if (!AU.ok()) AU.unlock();
    C.ptr.set(e.pointerId, { x: e.clientX, y: e.clientY });
    try { root.setPointerCapture(e.pointerId); } catch (_) {}
    upd();
    if (C.ui.mode !== "race") HAPTIC.tap();
    if (C.open) { try { C.conn.send({ t: "tap" }); } catch (_) {} }
  });
  root.addEventListener("pointermove", e => { if (C.ptr.has(e.pointerId)) { C.ptr.set(e.pointerId, { x: e.clientX, y: e.clientY }); upd(); } });
  const end = e => { if (C.ptr.delete(e.pointerId)) upd(); };
  root.addEventListener("pointerup", end);
  root.addEventListener("pointercancel", end);
  root.addEventListener("touchend", () => { if (C.started && !AU.ok()) AU.unlock(); }, { passive: true });
  root.addEventListener("contextmenu", e => e.preventDefault());
}

function buildDial() {
  const f = $("#dial-num");
  for (let i = 0; i < 10; i++) {
    const b = document.createElement("b"), a = i * 36;
    b.textContent = i * 10;
    b.style.transform = `rotate(${a}deg) translateY(calc(min(78vw, 330px) * -0.27)) rotate(${-a}deg)`;
    f.appendChild(b);
  }
}

/* saber hum: two detuned saws through a low-pass; pitch / brightness follow the swing speed */
function humOn() {
  const c = AU.ctx; if (!c || C.hum || !AU.ok()) return;
  const o1 = c.createOscillator(), o2 = c.createOscillator(), f = c.createBiquadFilter(), g = c.createGain();
  o1.type = o2.type = "sawtooth"; o1.frequency.value = 82; o2.frequency.value = 84.5;
  f.type = "lowpass"; f.frequency.value = 420; g.gain.value = 0;
  o1.connect(f); o2.connect(f); f.connect(g); g.connect(AU.master); o1.start(); o2.start();
  C.hum = { o1, o2, f, g };
}
function humOff() {
  if (!C.hum || !AU.ctx) { C.hum = null; return; }
  const { o1, o2, g } = C.hum, t = AU.ctx.currentTime;
  try { g.gain.setTargetAtTime(0, t, 0.05); o1.stop(t + 0.3); o2.stop(t + 0.3); } catch (e) {}
  C.hum = null;
}

function phoneLoop() {
  const mode = C.ui.mode;
  if (mode === "saber") {
    if (!C.hum) humOn();
    const k = clamp(M.gyro / 600, 0, 1);
    if (C.hum) {
      const t = AU.ctx.currentTime;
      C.hum.o1.frequency.setTargetAtTime(82 + k * 90, t, 0.03);
      C.hum.o2.frequency.setTargetAtTime(84.5 + k * 95, t, 0.03);
      C.hum.f.frequency.setTargetAtTime(420 + k * 2600, t, 0.03);
      C.hum.g.gain.setTargetAtTime(0.1 + k * 0.35, t, 0.03);
    }
    $("#lay-saber .blade").style.filter = `brightness(${1 + k * 0.8})`;
  } else if (mode === "race") {
    const rot = ((screen.orientation && screen.orientation.angle) || window.orientation || 0) % 180 !== 0;
    C.ux = lerp(C.ux, M.u[0], 0.15);
    let L = C.layout;
    if (rot) L = "P";
    else if (C.ux > 0.45) L = "L";            // phone top points left  → gas under the right thumb = device bottom
    else if (C.ux < -0.45) L = "R";           // phone top points right → gas = device top
    else if (Math.abs(M.u[1]) > 0.85 && L !== "L" && L !== "R") L = "P";
    if (L !== C.layout) { C.layout = L; $("#lay-race").className = "lay " + L; }
  } else if (mode === "safe") {
    const d = M.dial;
    $("#dial-face").style.transform = $("#dial-num").style.transform = `rotate(${d}deg)`;
    const S2 = C.safe;
    if (S2.target != null) {
      const notch = Math.floor(d / 5), ad = Math.abs(S2.target - d);
      if (S2.notch !== null && notch !== S2.notch) {
        const heat = clamp(1 - ad / 90, 0, 1);
        AU.tick(0.12 + heat * 0.88, 1400 + heat * 3800);
      }
      S2.notch = notch;
      const inZ = ad < 6;
      if (inZ && !S2.inZone) { AU.sfx("click"); vibrate(35); }
      S2.inZone = inZ;
      $("#dial").classList.toggle("hot", inZ);
    }
  }
  requestAnimationFrame(phoneLoop);
}
