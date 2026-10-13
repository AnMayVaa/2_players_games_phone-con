/* games-party.js — party minigames in the spirit of the 17-game party sequel, played 1 vs 1 with phones. */
"use strict";

const winnerOf = (a, b, eps = 0) => (Math.abs(a - b) <= eps ? 0 : a > b ? 1 : 2);

/* ------------------------------------------------------------------ BALLOONS */
const Balloons = {
  id: "balloons", cat: "party", name: "Balloons", icon: "🎈", tag: "Pump · Risk", col: "#ff5a5f",
  desc: "Pump your balloon as big as you dare, then tie it off. Pop it and you get nothing!",
  how: ["Pump the phone DOWN like a bicycle pump to inflate", "TAP the screen to tie the balloon off and bank its size", "Every balloon bursts at a secret size", "3 rounds · biggest total wins"],
  phoneHow: "Pump DOWN to inflate. TAP to tie it off before it pops!",
  keys: "No phone: Q / U pump · hold E / O + Q / U to tie",
  reset() { this.r = 0; this.tot = { 1: 0, 2: 0 }; this.next(); },
  next() { this.r++; this.s = { 1: this.mk(), 2: this.mk() }; this.stT = now(); this.done = 0; if (H.phase === "play") pushUiAll(); },
  mk() { return { size: 10, lim: rnd(55, 140), st: "pump" }; },
  phoneUi(p) { const s = this.s[p.n]; return s.st === "pump" ? { mode: "text", icon: "🎈", title: "Pump!", hint: "Pump down · TAP to tie it off", bar: s.size / 150 } : { mode: "text", icon: s.st === "pop" ? "💥" : "🎀", title: s.st === "pop" ? "POP!" : `Tied: ${Math.round(s.size)}`, hint: "Waiting…" }; },
  pump(p) {
    const s = this.s[p.n]; if (s.st !== "pump") return;
    s.size += rnd(4, 9); AU.sfx("pump"); phoneBar(p, s.size / 150);
    if (s.size >= s.lim) { s.st = "pop"; AU.sfx("pop"); fx(p, "pop"); FX.burst(PX(p.n), 420, 60, { speed: [200, 700], colors: [p.color, "#fff"], life: [0.3, 0.8], size: [4, 9] }); pushUi(p); }
  },
  tie(p) { const s = this.s[p.n]; if (s.st !== "pump") return; s.st = "tied"; AU.sfx("chime"); this.tot[p.n] += Math.round(s.size); FX.say(`+${Math.round(s.size)}`, PX(p.n), 260, p.color, 60); pushUi(p); },
  onEvent(p, k) { if (k === "pump") this.pump(p); },
  onKb(p) { if (p.kb.b) this.tie(p); else this.pump(p); },
  onTap(p) { if (p.phone) this.tie(p); },
  update(dt, t) {
    const all = this.s[1].st !== "pump" && this.s[2].st !== "pump";
    if (!this.done && (all || (t - this.stT) / 1000 > 20)) { for (const n of [1, 2]) if (this.s[n].st === "pump") this.tie(H.P[n]); this.done = t; }
    if (this.done && t - this.done > 2200) { if (this.r >= 3) finish(winnerOf(this.tot[1], this.tot[2]), `${this.tot[1]} – ${this.tot[2]}`); else this.next(); }
  },
  draw(c, t) {
    paper(c, "#fff3f3");
    hud(c, this.tot[1], this.tot[2], `Round ${this.r}/3`, null);
    for (const n of [1, 2]) {
      const s = this.s[n], x = PX(n), R = s.st === "pop" ? 0 : 40 + s.size * 1.5, cy = 560 - R;
      c.strokeStyle = "#aaa"; c.lineWidth = 3; c.beginPath(); c.moveTo(x, 560); c.lineTo(x, 780); c.stroke();
      if (R) { c.beginPath(); c.ellipse(x, cy, R * 0.85, R, 0, 0, Math.PI * 2); c.fillStyle = COLORS[n]; c.fill(); disc(c, x - R * 0.3, cy - R * 0.4, R * 0.15, "rgba(255,255,255,.5)"); }
      else text(c, "💥", x, 450, 120);
      if (s.st === "tied") text(c, "🎀", x, 565, 50);
      person(c, x, 880, 0.6, COLORS[n], { armL: 1.6, armR: 1.6, face: s.st === "pop" ? "x" : "o" });
    }
  },
};

/* ------------------------------------------------------------------ HIP BUMP (rhythm) */
const HipBump = {
  id: "hipbump", cat: "party", name: "Hip Bump", icon: "🍑", tag: "Rhythm", col: "#ff8a3d",
  desc: "Phone on your hip, bump to the beat! Hit every bump marker exactly on time.",
  how: ["Hold the phone against your hip", "BUMP your hip sideways when a marker hits the line", "On time = 2, close = 1", "Highest score after the song wins"],
  phoneHow: "Phone on your hip. Bump on the beat!",
  keys: "No phone: Q / U = bump",
  reset() { const pats = [[0, 2], [0, 1, 2], [0, 1, 2, 3], [0, 1.5, 3], [0, 0.5, 2]]; this.notes = []; for (let b = 0; b < 8; b++) for (const x of pick(pats)) this.notes.push(4 + b * 4 + x); this.hit = { 1: new Set(), 2: new Set() }; this.sc = { 1: 0, 2: 0 }; this.last = { 1: 0, 2: 0 }; this.started = false; this.bump = { 1: 0, 2: 0 }; },
  begin() { MUSIC.start(100, "pop", 400); this.started = true; },
  stop() { MUSIC.stop(); },
  phoneUi() { return { mode: "text", icon: "🍑", title: "Bump!", hint: "On the beat" }; },
  onKb(p) { this.go(p, now()); },
  onEvent(p, k, v, t) { if (k === "shake") this.go(p, t); },
  go(p, t) {
    if (!this.started || t - this.last[p.n] < 150) return; this.last[p.n] = t; this.bump[p.n] = now();
    let best = -1, bo = 1e9; this.notes.forEach((b, i) => { const o = Math.abs(t - MUSIC.at(b)); if (o < bo && !this.hit[p.n].has(i)) { bo = o; best = i; } });
    if (best >= 0 && bo < 170) { this.hit[p.n].add(best); const pf = bo < 70; this.sc[p.n] += pf ? 2 : 1; FX.say(pf ? "BUMP!" : "ok", PX(p.n), 330, p.color, pf ? 50 : 32, 0.6); AU.sfx("thump"); }
  },
  update() { if (this.started && MUSIC.beatNow() > 4 + 32 + 2) { MUSIC.stop(); finish(winnerOf(this.sc[1], this.sc[2]), `${this.sc[1]} – ${this.sc[2]}`); } },
  draw(c, t) {
    paper(c, "#fff4ea"); floorBand(c, 760, "#fde0c8");
    hud(c, this.sc[1], this.sc[2], "🍑", null);
    const y = 230, lx = 800;
    c.strokeStyle = INK; c.lineWidth = 6; c.beginPath(); c.moveTo(lx, y - 60); c.lineTo(lx, y + 60); c.stroke();
    if (this.started) for (const b of this.notes) { const x = lx + (MUSIC.at(b) - now()) * 0.4; if (x > 120 && x < 1480) disc(c, x, y, 34, "#ff8a3d"); }
    for (const n of [1, 2]) { const b = now() - this.bump[n] < 150; person(c, PX(n) + (b ? (n === 1 ? 40 : -40) : 0), 800, 1.05, COLORS[n], { lean: b ? (n === 1 ? -0.2 : 0.2) : 0, armL: 0.9, armR: 0.9, face: "smile" }); }
  },
};

/* ------------------------------------------------------------------ RELAY RACE */
const RELAY = [
  { k: "shake", n: 10, txt: "Shake ×10", icon: "🫨" },
  { k: "spin", n: 720, txt: "Spin it flat — 2 full turns", icon: "🔄" },
  { k: "up", n: 1.2, txt: "Point UP and hold still", icon: "⬆️" },
  { k: "jump", n: 3, txt: "Jump ×3", icon: "🦘" },
  { k: "tap", n: 15, txt: "Tap ×15", icon: "👆" },
];
const Relay = {
  id: "relay", cat: "party", name: "Relay Race", icon: "🏃", tag: "Mixed tasks", col: "#2bd47d",
  desc: "Five quick challenges in a row — shake, spin, hold, jump and tap. First through all five wins.",
  how: RELAY.map(r => `${r.icon} ${r.txt}`),
  phoneHow: "Follow the task on your phone, as fast as you can!",
  reset() { this.s = { 1: { i: 0, v: 0, last: null }, 2: { i: 0, v: 0, last: null } }; this.win = 0; },
  phoneUi(p) { const s = this.s[p.n], r = RELAY[s.i]; return r ? { mode: "text", icon: r.icon, title: r.txt, hint: `Leg ${s.i + 1} of ${RELAY.length}`, bar: s.v / r.n } : { mode: "text", icon: "🏁", title: "Finished!", hint: "" }; },
  prog(p, kind, amt) {
    const s = this.s[p.n], r = RELAY[s.i]; if (!r || r.k !== kind || this.win) return;
    s.v += amt; phoneBar(p, s.v / r.n);
    if (s.v >= r.n) { s.i++; s.v = 0; s.last = null; AU.sfx("lap"); fx(p, "good"); pushUi(p); if (s.i >= RELAY.length) { this.win = p.n; this.winT = now(); AU.sfx("win"); } }
  },
  onEvent(p, k) { if (k === "shake" || k === "jump") this.prog(p, k, 1); },
  onTap(p) { this.prog(p, "tap", 1); },
  onKb(p) { const r = RELAY[this.s[p.n].i]; if (!r) return; this.prog(p, r.k, r.k === "spin" ? 90 : r.k === "up" ? 0.4 : 1); },
  onSample(p, dt) {
    const s = this.s[p.n], r = RELAY[s.i]; if (!r) return;
    if (r.k === "spin") { if (s.last != null) this.prog(p, "spin", Math.abs(p.d - s.last)); s.last = p.d; }
    if (r.k === "up") { if (p.us[1] > 0.75 && p.r < 40) this.prog(p, "up", dt); else s.v = 0; }
  },
  update(dt, t) { if (this.win && t - this.winT > 1500) finish(this.win, `${H.P[this.win].name} finished all ${RELAY.length} legs!`); },
  draw(c, t) {
    paper(c, "#ecfff4");
    hud(c, `leg ${Math.min(this.s[1].i + 1, 5)}/5`, `leg ${Math.min(this.s[2].i + 1, 5)}/5`, null);
    for (const n of [1, 2]) {
      const y = n === 1 ? 380 : 650, s = this.s[n];
      RELAY.forEach((r, i) => {
        const x = 260 + i * 270, done = i < s.i, cur = i === s.i;
        disc(c, x, y, 80, done ? COLORS[n] : cur ? "#fff" : SOFT);
        if (cur) ring(c, x, y, 80, s.v / r.n, COLORS[n], 12);
        text(c, done ? "✓" : r.icon, x, y + 4, 60, done ? "#fff" : INK);
        if (i < RELAY.length - 1) { c.fillStyle = i < s.i ? COLORS[n] : SOFT; c.fillRect(x + 82, y - 6, 106, 12); }
      });
      text(c, `P${n} ${H.P[n].name}`, 90, y - 110, 28, COLORS[n], "left", 900);
    }
    if (this.win) headline(c, `${H.P[this.win].name} wins!`, 520, 80, COLORS[this.win], this.winT);
  },
};

/* ------------------------------------------------------------------ SAMURAI SHOWDOWN */
const Showdown = {
  id: "showdown", cat: "party", name: "Samurai Showdown", icon: "⚔️", tag: "Reflex · Slash", col: "#3d3d3d",
  desc: "Two samurai, one signal. Slash in the direction shown — CHOP down or SWEEP sideways — before your rival.",
  how: ["Hold the phone upright like a katana", "Wait for the signal…", "⬇ CHOP = swing straight down · ➡ SWEEP = swing sideways", "Wrong direction or too early loses · first to 3"],
  phoneHow: "Upright like a katana. On the signal, slash the right way!",
  keys: "No phone: Q / U = chop, hold E / O + Q / U = sweep",
  reset() { this.sc = { 1: 0, 2: 0 }; this.next(); },
  next() { this.st = "wait"; this.stT = now(); this.wait = rnd(2, 5); this.dir = pick(["chop", "sweep"]); this.rw = 0; this.msg = ""; if (H.phase === "play") pushUiAll(); },
  phoneUi(p) { if (this.st === "go") return { mode: "text", icon: this.dir === "chop" ? "⬇️" : "➡️", title: this.dir === "chop" ? "CHOP!" : "SWEEP!", hint: "", flash: "#fff" }; if (this.st === "done") return { mode: "text", icon: this.rw === p.n ? "😎" : "😵", title: this.msg, hint: "" }; return { mode: "text", icon: "🧘", title: "Focus…", hint: "Wait for the signal" }; },
  dirOf(p) { const g = p.gp.map(Math.abs); return g[1] >= Math.max(g[0], g[2]) ? "chop" : "sweep"; },
  onKb(p) { this.slash(p, p.kb.b ? "sweep" : "chop", now()); },
  onEvent(p, k, v, t) { if (k === "swing" && p.phone) this.slash(p, this.dirOf(p), t); },
  slash(p, d, t) {
    if (this.st === "wait") return this.done(other(p.n), `${p.name} moved too early!`);
    if (this.st !== "go") return;
    if (d !== this.dir) return this.done(other(p.n), `${p.name} slashed the wrong way!`);
    this.done(p.n, `${p.name} strikes first! (${Math.round(t - this.goT)} ms)`);
  },
  done(w, msg) { this.st = "done"; this.stT = now(); this.rw = w; this.msg = msg; if (w) { this.sc[w]++; fx(H.P[w], "good"); fx(H.P[other(w)], "bad"); } AU.sfx("clash"); SHAKE.v = 12; pushUiAll(); },
  update(dt, t) {
    const el = (t - this.stT) / 1000;
    if (this.st === "wait" && el > this.wait) { this.st = "go"; this.goT = t; AU.sfx("go"); sendAll({ t: "fx", k: "fire" }); pushUiAll(); }
    else if (this.st === "go" && el > this.wait + 3) this.done(0, "Too slow — nobody scores");
    else if (this.st === "done" && el > 2.3) { const w = this.sc[1] >= 3 ? 1 : this.sc[2] >= 3 ? 2 : 0; if (w) finish(w, `${this.sc[w]} – ${this.sc[other(w)]}`); else this.next(); }
  },
  draw(c, t) {
    paper(c, this.st === "go" ? "#fff" : "#f0ebe1"); floorBand(c, 720, "#d9cfbd");
    disc(c, 800, 330, 150, this.st === "go" ? "#ff4057" : "#e74c3c55");
    hud(c, this.sc[1], this.sc[2], "first to 3", null);
    for (const n of [1, 2]) {
      const won = this.st === "done" && this.rw === n, lost = this.st === "done" && this.rw !== n;
      const h = person(c, PX(n), 760, 1.05, COLORS[n], { armR: won ? 1.7 : 2.8, armL: won ? 1.7 : 2.8, flip: n === 2, face: lost ? "x" : "o", lean: lost ? (n === 1 ? -0.3 : 0.3) : 0 });
      c.strokeStyle = "#cfd6e0"; c.lineWidth = 9; c.beginPath(); c.moveTo(h.r[0], h.r[1]); c.lineTo(h.r[0] + (n === 1 ? 1 : -1) * (won ? 220 : 30), h.r[1] - (won ? 20 : 220)); c.stroke();
    }
    if (this.st === "go") headline(c, this.dir === "chop" ? "⬇ CHOP!" : "➡ SWEEP!", 330, 110, "#fff", this.goT);
    else if (this.st === "done") headline(c, this.msg, 330, 50, COLORS[this.rw] || INK, this.stT);
  },
};

/* ------------------------------------------------------------------ HIDE & SEEK */
const HideSeek = {
  id: "hide", cat: "party", name: "Hide & Seek", icon: "🙈", tag: "Hide · Listen", col: "#7fd3ff", phoneOnly: true,
  desc: "Hide your phone somewhere in the room. It chirps every few seconds — your rival has to find it. Fastest finder wins.",
  how: ["The HIDER hides their phone (screen showing) while the SEEKER closes their eyes", "After 25 s the hidden phone starts to chirp", "SEEKER: follow the sound, pick the phone up — that stops the clock", "Swap roles · fastest find wins"],
  phoneHow: "Hider: hide me! Seeker: close your eyes, then listen for the chirp.",
  HIDE: 25,
  reset() { this.turn = 0; this.time = { 1: null, 2: null }; this.next(); },
  next() { this.turn++; this.H = this.turn === 1 ? 1 : 2; this.st = "hide"; this.stT = now(); if (H.phase === "play") pushUiAll(); },
  phoneUi(p) {
    const hider = p.n === this.H;
    if (this.st === "hide") return hider ? { mode: "text", icon: "🙈", title: "Hide me!", hint: "Put this phone somewhere sneaky, then walk away", bg: "#e0f4ff" } : { mode: "text", icon: "🙈", title: "Close your eyes!", hint: "No peeking…", bg: "#222" };
    if (this.st === "seek") return hider ? { mode: "text", icon: "🐦", title: "You found me!", hint: "", loop: "chirp", every: 2500 } : { mode: "text", icon: "👂", title: "SEEK!", hint: "Follow the chirp, pick up the hidden phone" };
    return { mode: "text", icon: "⏱️", title: "Found!", hint: "" };
  },
  update(dt, t) {
    const el = (t - this.stT) / 1000, hp = H.P[this.H];
    if (this.st === "hide" && el > this.HIDE) { this.st = "seek"; this.stT = t; this.calm = 0; AU.sfx("whistle"); pushUiAll(); }
    else if (this.st === "seek") {
      if (el > 1.5 && (hp.l > 0.45 || hp.r > 120 || !hp.phone)) this.found(el);
      else if (el > 120) this.found(120);
    } else if (this.st === "found" && el > 3) {
      if (this.turn >= 2) { const a = this.time[2], b = this.time[1]; finish(Math.abs(a - b) < 0.2 ? 0 : a < b ? 1 : 2, `${H.P[1].name} found it in ${a.toFixed(1)} s · ${H.P[2].name} in ${b.toFixed(1)} s`); }
      else this.next();
    }
  },
  onTap(p) { if (this.st === "seek" && p.n === this.H && (now() - this.stT) / 1000 > 1.5) this.found((now() - this.stT) / 1000); },
  found(sec) { const seeker = other(this.H); this.time[this.H] = sec; this.st = "found"; this.stT = now(); AU.sfx("cheer"); FX.say(`${sec.toFixed(1)} s`, PX(seeker), 400, COLORS[seeker], 90, 2); pushUiAll(); },
  draw(c, t) {
    paper(c, "#eaf7ff");
    hud(c, this.time[2] != null ? this.time[2].toFixed(1) + " s" : "—", this.time[1] != null ? this.time[1].toFixed(1) + " s" : "—", this.st === "hide" ? Math.ceil(Math.max(0, this.HIDE - (now() - this.stT) / 1000)) : this.st === "seek" ? ((now() - this.stT) / 1000).toFixed(1) : "", "finding time");
    const seeker = other(this.H);
    if (this.st === "hide") { headline(c, `${H.P[this.H].name}: HIDE your phone!`, 380, 64, COLORS[this.H]); headline(c, `${H.P[seeker].name}: close your eyes 🙈`, 500, 54, COLORS[seeker]); }
    else if (this.st === "seek") { headline(c, `${H.P[seeker].name}: SEEK! 👂`, 420, 80, COLORS[seeker]); text(c, "♪", 800 + Math.sin(t / 200) * 200, 600, 80, MUTE); }
    else headline(c, "Found it! 🎉", 450, 90, COLORS[seeker], this.stT);
  },
};

/* ------------------------------------------------------------------ BINGO */
const Bingo = {
  id: "bingo", cat: "party", name: "Bingo", icon: "🔢", tag: "Listen · Mark", col: "#ffb400", phoneOnly: true,
  desc: "Your phone is a bingo card. Mark the numbers as they're called and shout BINGO first!",
  how: ["Numbers are called on the big screen", "Tap them on your card to mark them", "Five in a row, column or diagonal → tap BINGO!", "A false BINGO locks your card for 5 s"],
  phoneHow: "Mark called numbers. Five in a row? Tap BINGO!",
  reset() {
    const col = k => { const a = []; while (a.length < 5) { const v = randi(k * 15 + 1, k * 15 + 15); if (!a.includes(v)) a.push(v); } return a; };
    const mk = () => { const cols = [0, 1, 2, 3, 4].map(col), cells = []; for (let r = 0; r < 5; r++) for (let k = 0; k < 5; k++) cells.push(r === 2 && k === 2 ? 0 : cols[k][r]); return { cells, mark: new Set([12]), lock: 0 }; };
    this.card = { 1: mk(), 2: mk() };
    this.bag = Array.from({ length: 75 }, (_, i) => i + 1).sort(() => Math.random() - 0.5); this.called = []; this.callT = now() + 1500; this.win = 0;
  },
  phoneUi(p) {
    const cd = this.card[p.n], locked = now() < cd.lock;
    const btns = cd.cells.map((v, i) => ({ t: v === 0 ? "★" : v, v: i, on: cd.mark.has(i) }));
    btns.push({ t: locked ? "🔒 locked…" : "BINGO!", v: "bingo", wide: true, c: "#ff4057", dis: locked });
    return { mode: "grid", title: this.called.length ? `Called: ${this.called[this.called.length - 1]}` : "Get ready…", cols: 5, small: true, buttons: btns };
  },
  onBtn(p, v) {
    const cd = this.card[p.n]; if (this.win || now() < cd.lock) return;
    if (v === "bingo") {
      if (this.check(cd)) { this.win = p.n; this.winT = now(); AU.sfx("win"); AU.sfx("cheer"); pushUiAll(); }
      else { cd.lock = now() + 5000; AU.sfx("wrong"); FX.say("False BINGO!", PX(p.n), 380, "#ff4057", 50); fx(p, "bad"); pushUi(p); setTimeout(() => pushUi(p), 5100); }
      return;
    }
    const i = v | 0; if (i === 12) return;
    cd.mark.has(i) ? cd.mark.delete(i) : cd.mark.add(i); pushUi(p);
  },
  check(cd) {
    const ok = i => i === 12 || (cd.mark.has(i) && this.called.includes(cd.cells[i]));
    const lines = []; for (let r = 0; r < 5; r++) { lines.push([0, 1, 2, 3, 4].map(k => r * 5 + k)); lines.push([0, 1, 2, 3, 4].map(k => k * 5 + r)); }
    lines.push([0, 6, 12, 18, 24], [4, 8, 12, 16, 20]);
    return lines.some(L => L.every(ok));
  },
  update(dt, t) {
    if (this.win) { if (t - this.winT > 2000) finish(this.win, `BINGO after ${this.called.length} numbers`); return; }
    if (t > this.callT && this.bag.length) { this.called.push(this.bag.pop()); this.callT = t + 3800; AU.sfx("chime"); pushUiAll(); }
  },
  draw(c, t) {
    paper(c, "#fff8e1");
    hud(c, `${this.card[1].mark.size - 1} marked`, `${this.card[2].mark.size - 1} marked`, null);
    const last = this.called[this.called.length - 1];
    disc(c, 800, 420, 200, "#ffb400"); disc(c, 800, 420, 150, "#fff");
    if (last) { text(c, "BINGO"[Math.floor((last - 1) / 15)], 800, 330, 50, MUTE, "center", 900); text(c, String(last), 800, 440, 150, INK, "center", 900); }
    const prev = this.called.slice(-11, -1).reverse();
    prev.forEach((v, i) => { disc(c, 300 + i * 110, 760, 44, SOFT); text(c, String(v), 300 + i * 110, 762, 34, INK, "center", 900); });
    if (this.win) headline(c, `${H.P[this.win].name}: BINGO!`, 220, 80, COLORS[this.win], this.winT);
  },
};

/* ------------------------------------------------------------------ ICE CREAM PARLOR (stacker) */
const SCOOP = ["#ffb3c7", "#fff1b8", "#b5f0c8", "#8e5b3c", "#c9b8ff", "#ffd7a8"];
const IceCream = {
  id: "icecream", cat: "party", name: "Ice Cream Parlor", icon: "🍦", tag: "Tap · Timing", col: "#ffb3c7",
  desc: "Stack scoops on your cone! Tap to drop the swinging scoop — whatever overhangs falls off.",
  how: ["The scoop swings above your cone", "TAP to drop it", "Only the part on top of the stack stays — it gets narrower", "3 complete misses and your tower is done · tallest tower in 30 s wins"],
  phoneHow: "TAP to drop the scoop right on top!",
  keys: "No phone: Q / U = drop",
  reset() { this.s = { 1: this.mk(), 2: this.mk() }; this.t = 0; this.end = 0; },
  mk() { return { st: [{ x: 0, w: 150 }], ph: Math.random() * 6, done: false, miss: 0 }; },
  phoneUi(p) { const s = this.s[p.n]; return { mode: "text", icon: "🍦", title: s.done ? `${s.st.length - 1} scoops` : "TAP!", hint: s.done ? "Tower finished" : "Drop it on the stack" }; },
  sx(s) { return Math.sin(s.ph) * 220; },
  onTap(p) {
    const s = this.s[p.n]; if (s.done || this.end) return;
    const top = s.st[s.st.length - 1], x = this.sx(s), l = Math.max(x - top.w / 2, top.x - top.w / 2), r = Math.min(x + top.w / 2, top.x + top.w / 2);
    if (r - l < 8) { s.miss++; AU.sfx("splash"); fx(p, "bad"); FX.say(s.miss >= 3 ? "Tower done!" : `Splat! (${3 - s.miss} left)`, PX(p.n), 400, "#ff4057", 50); if (s.miss >= 3) { s.done = true; pushUi(p); } return; }
    const perfect = Math.abs(x - top.x) < 8;
    s.st.push({ x: perfect ? top.x : (l + r) / 2, w: perfect ? top.w : r - l, c: SCOOP[s.st.length % SCOOP.length] });
    AU.sfx(perfect ? "right" : "thump"); if (perfect) FX.say("Perfect!", PX(p.n), 300, p.color, 44, 0.7);
  },
  update(dt, t) {
    if (this.end) { if (t - this.end > 1500) { const a = this.s[1].st.length - 1, b = this.s[2].st.length - 1; finish(winnerOf(a, b), `${a} – ${b} scoops`); } return; }
    this.t += dt;
    for (const n of [1, 2]) { const s = this.s[n]; if (!s.done) s.ph += dt * (1.8 + s.st.length * 0.18); }
    if (this.t > 30 || (this.s[1].done && this.s[2].done)) this.end = t;
  },
  draw(c, t) {
    paper(c, "#fff0f5");
    hud(c, `${this.s[1].st.length - 1} 🍨`, `${this.s[2].st.length - 1} 🍨`, Math.ceil(Math.max(0, 30 - this.t)), "seconds");
    for (const n of [1, 2]) {
      const s = this.s[n], cx = PX(n), base = 830, H2 = 34, shift = Math.max(0, s.st.length - 14) * H2;
      c.fillStyle = "#e0a96d"; c.beginPath(); c.moveTo(cx - 80, base - 60); c.lineTo(cx + 80, base - 60); c.lineTo(cx, base + 60); c.fill();
      s.st.forEach((q, i) => { if (!i) return; rr(c, cx + q.x - q.w / 2, base - 60 - i * H2 + shift, q.w, H2 + 4, 16); c.fillStyle = q.c; c.fill(); });
      if (!s.done) { const top = s.st.length; rr(c, cx + this.sx(s) - s.st[s.st.length - 1].w / 2, base - 60 - (top + 3) * H2 + shift, s.st[s.st.length - 1].w, H2 + 4, 16); c.fillStyle = SCOOP[top % SCOOP.length]; c.fill(); }
      nameTag(c, n, cx, 880, "center");
    }
  },
};

/* ------------------------------------------------------------------ COLOR SHOOT (phone camera) */
const COLOR_TARGETS = [
  { name: "RED", h: 0, css: "#ff3b30" }, { name: "ORANGE", h: 28, css: "#ff9500" }, { name: "YELLOW", h: 54, css: "#ffcc00" },
  { name: "GREEN", h: 125, css: "#34c759" }, { name: "BLUE", h: 215, css: "#007aff" }, { name: "PURPLE", h: 275, css: "#af52de" },
  { name: "PINK", h: 330, css: "#ff2d92" }, { name: "WHITE", white: true, css: "#ffffff" }, { name: "BLACK", black: true, css: "#111111" },
];
function rgb2hsl([r, g, b]) {
  r /= 255; g /= 255; b /= 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2; let h = 0, s = 0;
  if (mx !== mn) { const d = mx - mn; s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn); h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h *= 60; }
  return [h, s, l];
}
const ColorShoot = {
  id: "colors", cat: "party", name: "Color Shoot", icon: "📸", tag: "Camera hunt", col: "#af52de", phoneOnly: true,
  desc: "A colour is called — find something that colour in the room and shoot it with your phone camera first!",
  how: ["Allow camera access on your phone", "A colour appears on the big screen", "Run, aim the circle at something that colour and TAP to shoot", "First correct shot wins the round · first to 3"],
  phoneHow: "Aim the circle at the colour and TAP to shoot!",
  reset() { this.sc = { 1: 0, 2: 0 }; this.used = []; this.next(); },
  next() { let c; do c = pick(COLOR_TARGETS); while (this.used.includes(c.name) && this.used.length < 8); this.used.push(c.name); this.tg = c; this.st = "hunt"; this.stT = now(); this.cool = { 1: 0, 2: 0 }; this.shots = { 1: null, 2: null }; if (H.phase === "play") pushUiAll(); },
  phoneUi() { return this.st === "hunt" ? { mode: "cam", target: this.tg.css, hint: `Find something ${this.tg.name}!` } : { mode: "text", icon: "📸", title: this.msg, hint: "" }; },
  match(rgb) {
    const [h, s, l] = rgb2hsl(rgb), tg = this.tg;
    if (tg.white) return l > 0.78 && s < 0.3;
    if (tg.black) return l < 0.16;
    const dh = Math.min(Math.abs(h - tg.h), 360 - Math.abs(h - tg.h));
    return s > 0.3 && l > 0.15 && l < 0.85 && dh < (tg.name === "ORANGE" || tg.name === "YELLOW" ? 14 : 24);
  },
  onColor(p, rgb) {
    if (this.st !== "hunt" || now() < this.cool[p.n]) return;
    this.shots[p.n] = rgb;
    if (this.match(rgb)) { this.sc[p.n]++; this.st = "done"; this.stT = now(); this.rw = p.n; this.msg = `${p.name} shot ${this.tg.name}!`; AU.sfx("right"); fx(p, "good"); pushUiAll(); }
    else { this.cool[p.n] = now() + 1500; AU.sfx("wrong"); fx(p, "bad"); FX.say("Not quite!", PX(p.n), 650, "#ff4057", 44); }
  },
  update(dt, t) {
    if (this.st === "hunt" && (t - this.stT) / 1000 > 45) { this.st = "done"; this.stT = t; this.rw = 0; this.msg = "Time's up!"; pushUiAll(); }
    if (this.st === "done" && (t - this.stT) / 1000 > 2.5) { const w = this.sc[1] >= 3 ? 1 : this.sc[2] >= 3 ? 2 : 0; if (w || this.used.length >= 7) finish(w || winnerOf(this.sc[1], this.sc[2]), `${this.sc[1]} – ${this.sc[2]}`); else this.next(); }
  },
  draw(c, t) {
    paper(c, "#f6f0ff");
    hud(c, this.sc[1], this.sc[2], "first to 3", null);
    disc(c, 800, 430, 170, this.tg.css); c.lineWidth = 8; c.strokeStyle = INK; c.beginPath(); c.arc(800, 430, 170, 0, 7); c.stroke();
    headline(c, this.st === "hunt" ? `Find something ${this.tg.name}!` : this.msg, 700, 60, INK, this.stT);
    for (const n of [1, 2]) if (this.shots[n]) { rr(c, PX(n) - 60, 360, 120, 120, 20); c.fillStyle = `rgb(${this.shots[n]})`; c.fill(); text(c, "last shot", PX(n), 510, 24, MUTE, "center", 800); }
  },
};

/* ------------------------------------------------------------------ AUCTION */
const LOTS = [["🖼️", "Old painting"], ["🏺", "Ancient vase"], ["⌚", "Gold watch"], ["🧸", "Teddy bear"], ["💎", "Shiny gem"], ["🎻", "Violin"], ["🪑", "Antique chair"], ["👟", "Rare sneakers"], ["📀", "Signed record"], ["🗿", "Stone head"]];
const Auction = {
  id: "auction", cat: "party", name: "Auction", icon: "🔨", tag: "Bid · Bluff", col: "#00c2c7", phoneOnly: true,
  desc: "Secretly bid on mystery items. Some are treasures, some are junk. Most money + item value at the end wins.",
  how: ["Each of you starts with 1000 coins", "A mystery item appears with a value hint", "Build a secret bid on your phone and confirm it", "Highest bid buys it (ties: nobody) · 5 items · coins + item values = score"],
  phoneHow: "Build your secret bid and confirm!",
  reset() { this.coins = { 1: 1000, 2: 1000 }; this.val = { 1: 0, 2: 0 }; this.lots = [...LOTS].sort(() => Math.random() - 0.5).slice(0, 5); this.i = -1; this.next(); },
  next() {
    this.i++; const lo = randi(1, 6) * 50; this.lot = { icon: this.lots[this.i][0], name: this.lots[this.i][1], lo, hi: lo + 250, v: Math.max(10, Math.round(rnd(lo - 50, lo + 300) / 10) * 10) };
    this.bid = { 1: 0, 2: 0 }; this.ok = { 1: false, 2: false }; this.st = "bid"; this.stT = now(); if (H.phase === "play") pushUiAll();
  },
  phoneUi(p) {
    if (this.st === "reveal") return { mode: "text", icon: this.lot.icon, title: `Worth ${this.lot.v}`, hint: this.msg };
    if (this.ok[p.n]) return { mode: "text", icon: "🤫", title: `Bid: ${this.bid[p.n]}`, hint: "Locked. Waiting…" };
    const b = this.bid[p.n], m = this.coins[p.n];
    return { mode: "grid", title: `${this.lot.icon} Bid: ${b}`, hint: `You have ${m} coins · hint ${this.lot.lo}–${this.lot.hi}`, cols: 3, buttons: [{ t: "+10", v: 10 }, { t: "+50", v: 50 }, { t: "+100", v: 100 }, { t: "Clear", v: "clr" }, { t: "All in", v: "all" }, { t: "Bid ✓", v: "ok", c: "#1fbf6a" }] };
  },
  onBtn(p, v) {
    if (this.st !== "bid" || this.ok[p.n]) return;
    const m = this.coins[p.n];
    if (v === "clr") this.bid[p.n] = 0; else if (v === "all") this.bid[p.n] = m; else if (v === "ok") { this.ok[p.n] = true; AU.sfx("click"); } else this.bid[p.n] = Math.min(m, this.bid[p.n] + (v | 0));
    pushUi(p);
    if (this.ok[1] && this.ok[2]) this.reveal();
  },
  reveal() {
    const a = this.bid[1], b = this.bid[2], w = a === b ? 0 : a > b ? 1 : 2;
    if (w) { this.coins[w] -= this.bid[w]; this.val[w] += this.lot.v; }
    this.rw = w; this.msg = w ? `${H.P[w].name} buys it for ${this.bid[w]} (${this.lot.v - this.bid[w] >= 0 ? "profit +" : "loss "}${this.lot.v - this.bid[w]})` : "Tie — nobody buys it";
    this.st = "reveal"; this.stT = now(); AU.sfx("thump"); AU.sfx("chime"); pushUiAll();
  },
  total(n) { return this.coins[n] + this.val[n]; },
  update(dt, t) {
    if (this.st === "bid" && (t - this.stT) / 1000 > 30) { this.ok[1] = this.ok[2] = true; this.reveal(); }
    if (this.st === "reveal" && (t - this.stT) / 1000 > 3.5) { if (this.i >= 4) finish(winnerOf(this.total(1), this.total(2)), `${this.total(1)} – ${this.total(2)}`); else this.next(); }
  },
  draw(c, t) {
    paper(c, "#e8fbfb");
    hud(c, `💰 ${this.coins[1]} + ${this.val[1]}`, `💰 ${this.coins[2]} + ${this.val[2]}`, `Lot ${this.i + 1}/5`, null);
    rr(c, 560, 200, 480, 420, 40); c.fillStyle = "#fff"; c.fill();
    text(c, this.lot.icon, 800, 360, 170);
    text(c, this.lot.name, 800, 500, 40, INK, "center", 900);
    text(c, this.st === "reveal" ? `Real value: ${this.lot.v}` : `Hint: worth ${this.lot.lo}–${this.lot.hi}`, 800, 560, 30, this.st === "reveal" ? "#1fbf6a" : MUTE, "center", 900);
    for (const n of [1, 2]) text(c, this.st === "reveal" ? `bid ${this.bid[n]}` : this.ok[n] ? "🤫 bid locked" : "thinking…", PX(n) + (n === 1 ? -140 : 140), 420, 36, COLORS[n], "center", 900);
    if (this.st === "reveal") headline(c, this.msg, 720, 40, this.rw ? COLORS[this.rw] : INK, this.stT);
  },
};

/* ------------------------------------------------------------------ STATUES */
const Statues = {
  id: "statues", cat: "party", name: "Statues", icon: "🗽", tag: "Dance · Freeze", col: "#ffd166",
  desc: "Dance while the music plays. When it stops — FREEZE! The first to wobble loses.",
  how: ["Hold the phone and dance while the music plays", "When the music STOPS, freeze immediately", "Moving during the freeze knocks you out", "Survive longer — or out-dance your rival"],
  phoneHow: "Dance! When the music stops: FREEZE!",
  keys: "No phone: tap Q / U to dance, release everything to freeze",
  reset() { this.r = 0; this.dance = { 1: 0, 2: 0 }; this.out = { 1: false, 2: false }; this.musicOn(); },
  musicOn() { this.r++; this.st = "dance"; this.stT = now(); this.len = rnd(3.5, 8); if (H.phase === "play") { MUSIC.start(124, "pop", 100); pushUiAll(); } },
  begin() { this.stT = now(); MUSIC.start(124, "pop", 100); },
  stop() { MUSIC.stop(); },
  phoneUi() { return this.st === "freeze" ? { mode: "text", icon: "🧊", title: "FREEZE!", hint: "Don't move!", bg: "#dff3ff" } : { mode: "text", icon: "💃", title: "DANCE!", hint: "Move to the music" }; },
  onSample(p) { if (this.st === "dance") this.dance[p.n] += (Math.min(p.r, 400) / 400 + Math.min(p.l, 1)) * 0.05; },
  onKb(p) { if (this.st === "dance") this.dance[p.n] += 0.6; },
  update(dt, t) {
    const el = (t - this.stT) / 1000;
    if (this.st === "dance" && el > this.len) { this.st = "freeze"; this.stT = t; MUSIC.stop(); AU.sfx("whistle"); pushUiAll(); }
    else if (this.st === "freeze") {
      if (el > 0.7 && el < 3) for (const n of [1, 2]) { const p = H.P[n]; const moving = p.phone ? p.r > 40 || p.l > 0.18 : now() - (p.kbT || 0) < 250; if (moving && !this.out[n]) { this.out[n] = true; AU.sfx("buzz"); fx(p, "bad"); FX.say("MOVED!", PX(n), 300, "#ff4057", 70); } }
      if (el > 3) {
        if (this.out[1] || this.out[2] || this.r >= 6) {
          const w = this.out[1] && !this.out[2] ? 2 : this.out[2] && !this.out[1] ? 1 : winnerOf(this.dance[1], this.dance[2], 0.5);
          finish(w, this.out[1] !== this.out[2] ? `${H.P[this.out[1] ? 1 : 2].name} wobbled!` : `Dance points ${Math.round(this.dance[1])} – ${Math.round(this.dance[2])}`);
        } else this.musicOn();
      }
    }
  },
  draw(c, t) {
    const fr = this.st === "freeze";
    paper(c, fr ? "#e6f6ff" : "#fff8e1"); floorBand(c, 740, fr ? "#cfe9f7" : "#ffe9a8");
    hud(c, `💃 ${Math.round(this.dance[1])}`, `💃 ${Math.round(this.dance[2])}`, `Round ${this.r}`, null);
    for (const n of [1, 2]) {
      const p = H.P[n], u = p.us, sw = fr ? 0 : Math.sin(t / 130 + n);
      person(c, PX(n), 780, 1.05, this.out[n] ? "#b0aea8" : p.color, { armR: 1.5 + u[1] + sw * 0.5, armL: 1.5 - u[1] - sw * 0.5, lean: fr ? 0 : sw * 0.08, face: this.out[n] ? "x" : fr ? "o" : "smile" });
    }
    headline(c, fr ? "FREEZE!" : "♪ DANCE ♪", 260, 110, fr ? "#12a4ff" : "#ff8a3d", this.stT);
  },
};

/* ------------------------------------------------------------------ QUIZ SHOW */
const QUIZ = [
  ["Which planet is known as the Red Planet?", ["Mars", "Venus", "Jupiter", "Mercury"]],
  ["How many legs does a spider have?", ["8", "6", "10", "12"]],
  ["What is H₂O?", ["Water", "Salt", "Oxygen", "Hydrogen gas"]],
  ["Which is the largest ocean?", ["Pacific", "Atlantic", "Indian", "Arctic"]],
  ["How many minutes are in a day?", ["1440", "1240", "1600", "960"]],
  ["What colour do you get mixing blue and yellow?", ["Green", "Purple", "Orange", "Brown"]],
  ["Which animal is the tallest?", ["Giraffe", "Elephant", "Camel", "Horse"]],
  ["What is 7 × 8?", ["56", "54", "64", "48"]],
  ["Which language has the most native speakers?", ["Mandarin Chinese", "English", "Spanish", "Hindi"]],
  ["What is the capital of Japan?", ["Tokyo", "Osaka", "Kyoto", "Seoul"]],
  ["What is the capital of Thailand?", ["Bangkok", "Chiang Mai", "Phuket", "Hanoi"]],
  ["Which gas do plants take in?", ["Carbon dioxide", "Oxygen", "Nitrogen", "Helium"]],
  ["How many sides does a hexagon have?", ["6", "5", "7", "8"]],
  ["Which is a prime number?", ["13", "21", "27", "33"]],
  ["Binary 1010 equals…", ["10", "12", "8", "5"]],
  ["What does CPU stand for?", ["Central Processing Unit", "Computer Power Unit", "Core Program Utility", "Central Print Unit"]],
  ["Which is NOT a programming language?", ["HTML-ish Banana", "Python", "Rust", "Go"]],
  ["Which metal is liquid at room temperature?", ["Mercury", "Iron", "Silver", "Aluminium"]],
  ["How many continents are there?", ["7", "5", "6", "8"]],
  ["What is the boiling point of water at sea level?", ["100 °C", "90 °C", "120 °C", "80 °C"]],
  ["Which instrument has 88 keys?", ["Piano", "Guitar", "Violin", "Flute"]],
  ["Which shape has no corners?", ["Circle", "Square", "Triangle", "Pentagon"]],
  ["Which bird can't fly?", ["Penguin", "Eagle", "Sparrow", "Parrot"]],
  ["What is the fastest land animal?", ["Cheetah", "Lion", "Horse", "Greyhound"]],
  ["Which unit measures electric resistance?", ["Ohm", "Volt", "Watt", "Ampere"]],
  ["What is 2¹⁰?", ["1024", "1000", "512", "2048"]],
  ["Which sport uses a shuttlecock?", ["Badminton", "Tennis", "Squash", "Volleyball"]],
  ["What do bees make?", ["Honey", "Milk", "Silk", "Wax only"]],
  ["Which is the smallest planet?", ["Mercury", "Mars", "Pluto", "Venus"]],
  ["How many hours are in a week?", ["168", "144", "160", "172"]],
  ["Which country is famous for the maple leaf flag?", ["Canada", "Japan", "Switzerland", "Peru"]],
  ["What does a thermometer measure?", ["Temperature", "Pressure", "Humidity", "Speed"]],
];
const Quiz = {
  id: "quiz", cat: "party", name: "Quiz Show", icon: "❓", tag: "Trivia · Buzz", col: "#12a4ff", phoneOnly: true,
  desc: "Quick-fire trivia! Answer on your phone — first correct answer gets 2 points, second gets 1, wrong loses 1.",
  how: ["The question appears on the big screen", "Pick your answer on the phone — you only get one try", "First correct = 2, second correct = 1, wrong = −1", "8 questions · highest score wins"],
  phoneHow: "Pick the right answer — fast!",
  N: 8,
  reset() { this.qs = [...QUIZ].sort(() => Math.random() - 0.5).slice(0, this.N); this.i = -1; this.sc = { 1: 0, 2: 0 }; this.next(); },
  next() { this.i++; const [q, a] = this.qs[this.i]; this.q = q; this.ans = a[0]; this.opts = [...a].sort(() => Math.random() - 0.5); this.pick = { 1: null, 2: null }; this.order = []; this.st = "ask"; this.stT = now(); if (H.phase === "play") pushUiAll(); },
  phoneUi(p) {
    if (this.st === "show") return { mode: "text", icon: this.pick[p.n] === this.ans ? "✅" : "❌", title: this.ans, hint: "" };
    if (this.pick[p.n] != null) return { mode: "text", icon: "⏳", title: "Answer locked", hint: this.pick[p.n] };
    return { mode: "grid", title: this.q, cols: 1, buttons: this.opts.map((o, i) => ({ t: `${"ABCD"[i]}  ${o}`, v: i, c: ["#ff4057", "#12a4ff", "#ffb400", "#1fbf6a"][i] })) };
  },
  onBtn(p, v) {
    if (this.st !== "ask" || this.pick[p.n] != null) return;
    const o = this.opts[v | 0]; this.pick[p.n] = o;
    if (o === this.ans) { const pts = this.order.length ? 1 : 2; this.order.push(p.n); this.sc[p.n] += pts; FX.say(`+${pts}`, PX(p.n), 760, COLORS[p.n], 60); fx(p, "good"); }
    else { this.sc[p.n] -= 1; FX.say("−1", PX(p.n), 760, "#ff4057", 60); fx(p, "bad"); }
    pushUi(p);
    if (this.pick[1] != null && this.pick[2] != null) this.show();
  },
  show() { this.st = "show"; this.stT = now(); AU.sfx("chime"); pushUiAll(); },
  update(dt, t) {
    if (this.st === "ask" && (t - this.stT) / 1000 > 15) this.show();
    if (this.st === "show" && (t - this.stT) / 1000 > 3) { if (this.i >= this.N - 1) finish(winnerOf(this.sc[1], this.sc[2]), `${this.sc[1]} – ${this.sc[2]} points`); else this.next(); }
  },
  draw(c, t) {
    paper(c, "#eaf6ff");
    hud(c, this.sc[1], this.sc[2], `Q ${this.i + 1}/${this.N}`, this.st === "ask" ? `${Math.ceil(Math.max(0, 15 - (now() - this.stT) / 1000))} s` : "");
    rr(c, 160, 170, 1280, 170, 40); c.fillStyle = "#fff"; c.fill();
    const words = this.q.split(" "); let line = "", lines = [];
    c.font = `900 46px "M PLUS Rounded 1c",sans-serif`;
    for (const w of words) { if (c.measureText(line + " " + w).width > 1180) { lines.push(line); line = w; } else line = line ? line + " " + w : w; } lines.push(line);
    lines.forEach((l, i) => text(c, l, 800, 255 - (lines.length - 1) * 28 + i * 56, 46, INK, "center", 900));
    this.opts.forEach((o, i) => {
      const x = i % 2 ? 1130 : 470, y = 460 + Math.floor(i / 2) * 150, show = this.st === "show", right = o === this.ans;
      rr(c, x - 310, y - 58, 620, 116, 58); c.fillStyle = show ? (right ? "#1fbf6a" : "#ddd") : ["#ff4057", "#12a4ff", "#ffb400", "#1fbf6a"][i]; c.fill();
      text(c, `${"ABCD"[i]}  ${o}`, x, y + 2, o.length > 18 ? 26 : 34, "#fff", "center", 900);
      for (const n of [1, 2]) if (show && this.pick[n] === o) { disc(c, x + (n === 1 ? -265 : 265), y, 26, "#fff"); disc(c, x + (n === 1 ? -265 : 265), y, 20, COLORS[n]); }
    });
  },
};

/* ------------------------------------------------------------------ NINJAS (dodge) */
const DODGE = { left: { t: "⬅ LEAN LEFT", icon: "⬅️" }, right: { t: "LEAN RIGHT ➡", icon: "➡️" }, jump: { t: "⬆ JUMP!", icon: "⬆️" }, duck: { t: "⬇ DUCK!", icon: "⬇️" } };
const Ninjas = {
  id: "ninjas", cat: "party", name: "Ninjas", icon: "🥷", tag: "Dodge", col: "#2d3436",
  desc: "Ninja stars incoming! Lean left, lean right, jump or duck exactly as called. Three hits and you're out.",
  how: ["Hold the phone upright in front of you", "LEAN = tip the phone left/right · JUMP = hop · DUCK = squat down quickly", "Dodge before the star arrives", "3 lives each — last ninja standing wins"],
  phoneHow: "Dodge the stars: lean, jump or duck as called!",
  keys: "No phone: A / D lean, W jump, S duck (P1) · J / L, I, K (P2)",
  reset() { this.lives = { 1: 3, 2: 3 }; this.k = 0; this.over = 0; this.s = { 1: null, 2: null }; this.nextT = now() + 1200; this.ev = { 1: {}, 2: {} }; },
  phoneUi(p) { const s = this.s[p.n]; return s ? { mode: "text", icon: DODGE[s.d].icon, title: DODGE[s.d].t, hint: "", bg: "#fff1c2" } : { mode: "text", icon: "🥷", title: "Ready…", hint: `${"❤".repeat(this.lives[p.n])}` }; },
  onEvent(p, k, v, t) { if (k === "jump" || k === "squat" || k === "pump") this.ev[p.n][k === "jump" ? "jump" : "duck"] = now(); },
  dodged(n, s) {
    const p = H.P[n], since = k => now() - (this.ev[n][k] || 0) < now() - s.t0 + 100;
    if (!p.phone) { const k = p.kb; return s.d === "left" ? k.steer < 0 : s.d === "right" ? k.steer > 0 : s.d === "jump" ? k.gas : k.brake; }
    if (s.d === "left") return p.us[0] > 0.45;
    if (s.d === "right") return p.us[0] < -0.45;
    if (s.d === "jump") return since("jump");
    return since("duck") || p.vz[0] < -0.4 || p.us[1] < -0.3;
  },
  update(dt, t) {
    if (this.over) { if (t - this.overT > 1500) finish(this.over, `${H.P[this.over].name} is the last ninja standing`); return; }
    if (!this.s[1] && !this.s[2] && t > this.nextT) {
      this.k++; const dur = Math.max(800, 1400 - this.k * 40);
      for (const n of [1, 2]) if (this.lives[n] > 0) this.s[n] = { d: pick(Object.keys(DODGE)), t0: t, dur };
      AU.sfx("whip"); pushUiAll();
    }
    for (const n of [1, 2]) {
      const s = this.s[n]; if (!s || t < s.t0 + s.dur) continue;
      if (this.dodged(n, s)) { FX.say("dodged!", PX(n), 330, "#1fbf6a", 46); fx(H.P[n], "good"); }
      else { this.lives[n]--; FX.say("OUCH!", PX(n), 330, "#ff4057", 64); fx(H.P[n], "hit"); AU.sfx("hit"); SHAKE.v = 8; }
      this.s[n] = null; this.nextT = t + 900; pushUi(H.P[n]);
    }
    const a = this.lives[1] > 0, b = this.lives[2] > 0;
    if (!a || !b || this.k >= 16) { this.over = a && !b ? 1 : b && !a ? 2 : winnerOf(this.lives[1], this.lives[2]); this.overT = t; if (!this.over) finish(0, !a && !b ? "Both ninjas went down — draw" : "Both ninjas are still standing — draw"); }
  },
  draw(c, t) {
    paper(c, "#ecebe6"); floorBand(c, 740, "#d8d5cc");
    hud(c, "❤".repeat(Math.max(0, this.lives[1])) || "out", "❤".repeat(Math.max(0, this.lives[2])) || "out", `Star ${this.k}`, null);
    for (const n of [1, 2]) {
      const p = H.P[n], s = this.s[n], ps = S.pose(p), x = PX(n), lean = p.phone ? clamp(-p.us[0], -1, 1) * 0.5 : p.kb.steer * 0.5;
      const duck = p.phone ? p.vz[0] < -0.4 : p.kb.brake, jump = p.phone ? now() - (this.ev[n].jump || 0) < 300 : p.kb.gas;
      person(c, x, 780 - (jump ? 80 : 0) + (duck ? 60 : 0), duck ? 0.8 : 1, this.lives[n] > 0 ? p.color : "#b0aea8", { lean, face: this.lives[n] > 0 ? "o" : "x", armL: 0.7, armR: 0.7 });
      if (s) {
        const k = clamp((t - s.t0) / s.dur, 0, 1), sx = lerp(x + (n === 1 ? -420 : 420), x, k), sy = s.d === "jump" ? 740 : s.d === "duck" ? 420 : 520;
        c.save(); c.translate(sx, sy); c.rotate(t / 40); c.fillStyle = "#333";
        for (let i = 0; i < 4; i++) { c.rotate(Math.PI / 2); c.beginPath(); c.moveTo(0, 0); c.lineTo(10, -40); c.lineTo(-10, -40); c.fill(); } c.restore();
        text(c, DODGE[s.d].t, x, 250, 50, p.color, "center", 900);
      }
      void ps;
    }
  },
};

/* ------------------------------------------------------------------ UFOs (aim & shoot) */
const Ufos = {
  id: "ufos", cat: "party", dark: true, name: "UFOs", icon: "🛸", tag: "Aim · Shoot", col: "#6c5ce7",
  desc: "Point your phone at the screen like a laser and blast the flying saucers. Most hits in 30 seconds wins.",
  how: ["Hold the phone like a remote, pointing at the screen", "Turn left/right and tilt up/down to move your crosshair", "TAP to fire — gold UFOs are worth 3", "Most points in 30 s wins"],
  phoneHow: "Point at the screen, move the crosshair, TAP to shoot!",
  keys: "No phone: W A S D aim, Q shoot (P1) · I J K L, U (P2)",
  reset() { this.sc = { 1: 0, 2: 0 }; this.u = []; this.cur = { 1: { x: 600, y: 500, d0: null, r0: null }, 2: { x: 1000, y: 500, d0: null, r0: null } }; this.t = 0; this.spawnT = 0; this.end = 0; this.shots = []; },
  phoneUi() { return { mode: "text", icon: "🛸", title: "Aim & TAP!", hint: "Point the phone at the screen" }; },
  aim(n, dt) {
    const p = H.P[n], cu = this.cur[n];
    if (!p.phone) { cu.x = clamp(cu.x + p.kb.steer * 700 * dt, 40, VW - 40); cu.y = clamp(cu.y + ((p.kb.brake ? 1 : 0) - (p.kb.gas ? 1 : 0)) * 600 * dt, 160, VH - 40); return; }
    if (cu.d0 == null) { cu.d0 = p.d; cu.r0 = p.rot[0]; }
    let x = (n === 1 ? 600 : 1000) - (p.d - cu.d0) * 16, y = 500 - (p.rot[0] - cu.r0) * 16;
    if (x < 40) { cu.d0 -= (40 - x) / 16; x = 40; } if (x > VW - 40) { cu.d0 += (x - VW + 40) / 16; x = VW - 40; }
    if (y < 160) { cu.r0 -= (160 - y) / 16; y = 160; } if (y > VH - 40) { cu.r0 += (y - VH + 40) / 16; y = VH - 40; }
    cu.x = lerp(cu.x, x, 0.5); cu.y = lerp(cu.y, y, 0.5);
  },
  onTap(p) {
    if (this.end) return; const cu = this.cur[p.n]; AU.sfx("laser"); this.shots.push({ n: p.n, x: cu.x, y: cu.y, t: now() });
    for (const u of this.u) if (!u.dead && Math.hypot(u.x - cu.x, u.y - cu.y) < 70) { u.dead = now(); const pts = u.gold ? 3 : 1; this.sc[p.n] += pts; FX.say(`+${pts}`, u.x, u.y - 40, p.color, 50); FX.burst(u.x, u.y, 30, { speed: [100, 400], colors: [u.gold ? "#ffd700" : "#9be7ff", "#fff"], life: [0.3, 0.8], size: [3, 6] }); AU.sfx("boom"); fx(p, "good"); break; }
  },
  update(dt, t) {
    if (this.end) { if (t - this.end > 1300) finish(winnerOf(this.sc[1], this.sc[2]), `${this.sc[1]} – ${this.sc[2]} points`); return; }
    this.t += dt; for (const n of [1, 2]) this.aim(n, dt);
    if (t > this.spawnT) { this.spawnT = t + rnd(500, 1100); const L = Math.random() < 0.5; this.u.push({ x: L ? -60 : VW + 60, y: rnd(220, 760), vx: (L ? 1 : -1) * rnd(180, 380), ph: Math.random() * 6, gold: Math.random() < 0.12 }); }
    for (const u of this.u) { u.x += u.vx * dt; u.ph += dt * 3; u.y += Math.sin(u.ph) * 40 * dt; }
    this.u = this.u.filter(u => u.x > -100 && u.x < VW + 100 && (!u.dead || now() - u.dead < 300));
    this.shots = this.shots.filter(s => now() - s.t < 150);
    if (this.t > 30) this.end = t;
  },
  draw(c, t) {
    paper(c, "#1d2340");
    for (let i = 0; i < 70; i++) disc(c, (i * 523) % VW, 150 + ((i * 331) % 750), 2, "rgba(255,255,255,.5)");
    hud(c, this.sc[1], this.sc[2], Math.ceil(Math.max(0, 30 - this.t)), "seconds");
    for (const u of this.u) { if (u.dead) continue; c.save(); c.translate(u.x, u.y); c.beginPath(); c.ellipse(0, 0, 70, 22, 0, 0, Math.PI * 2); c.fillStyle = u.gold ? "#ffd700" : "#b2bec3"; c.fill(); c.beginPath(); c.ellipse(0, -14, 32, 22, 0, Math.PI, 0); c.fillStyle = "#9be7ff"; c.fill(); c.restore(); }
    for (const s of this.shots) { c.strokeStyle = COLORS[s.n]; c.lineWidth = 6; c.beginPath(); c.moveTo(s.n === 1 ? 0 : VW, VH); c.lineTo(s.x, s.y); c.stroke(); }
    for (const n of [1, 2]) { const cu = this.cur[n]; c.strokeStyle = COLORS[n]; c.lineWidth = 6; c.beginPath(); c.arc(cu.x, cu.y, 34, 0, 7); c.moveTo(cu.x - 50, cu.y); c.lineTo(cu.x + 50, cu.y); c.moveTo(cu.x, cu.y - 50); c.lineTo(cu.x, cu.y + 50); c.stroke(); text(c, `P${n}`, cu.x + 48, cu.y - 40, 22, COLORS[n], "left", 900); }
  },
};

/* ------------------------------------------------------------------ JUMP ROPE */
const JumpRope = {
  id: "jumprope", cat: "party", name: "Jump Rope", icon: "🪢", tag: "Jump · Timing", col: "#ff7ac8",
  desc: "The rope keeps swinging — and speeding up. Jump every time it passes your feet. Trip 3 times and you're out.",
  how: ["Hold the phone and stand up", "JUMP each time the rope swings under your feet (listen for the whip)", "It gets faster and faster", "3 trips and you're out · last jumper wins"],
  phoneHow: "Jump every time the rope hits the floor!",
  keys: "No phone: Q / U = jump",
  reset() { this.lives = { 1: 3, 2: 3 }; this.per = 1300; this.nextP = now() + 4500; this.k = 0; this.lastJ = { 1: 0, 2: 0 }; this.over = 0; },
  begin() { this.nextP = now() + 1500; },
  phoneUi(p) { return { mode: "text", icon: "🪢", title: "JUMP!", hint: "Each time the rope passes · " + "❤".repeat(Math.max(0, this.lives[p.n])) }; },
  onEvent(p, k, v, t) { if (k === "jump") this.lastJ[p.n] = t; },
  onKb(p) { this.lastJ[p.n] = now(); },
  update(dt, t) {
    if (this.over) { if (t - this.overT > 1500) finish(this.over, `${H.P[this.over].name} kept jumping (${this.k} jumps)`); return; }
    const tp = this.nextP;
    if (t > tp + 180) {
      for (const n of [1, 2]) {
        if (this.lives[n] <= 0) continue;
        const ok = Math.abs(this.lastJ[n] - tp) < 300 && this.lastJ[n] > tp - 300;
        if (!ok) { this.lives[n]--; FX.say("TRIP!", PX(n), 360, "#ff4057", 60); fx(H.P[n], "bad"); AU.sfx("buzz"); pushUi(H.P[n]); }
      }
      this.k++; this.per = Math.max(620, this.per * 0.97); this.nextP = tp + this.per;
      const a = this.lives[1] > 0, b = this.lives[2] > 0;
      if (!a || !b) { if (!a && !b) return finish(winnerOf(this.lives[1], this.lives[2]), "Both tripped out!"); this.over = a ? 1 : 2; this.overT = t; }
    }
    if (t > tp - 60 && !this.whipped) { this.whipped = true; AU.sfx("whip"); sendAll({ t: "fx", k: "whip" }); }
    if (t > tp + 100) this.whipped = false;
  },
  draw(c, t) {
    paper(c, "#fff0f7"); floorBand(c, 760, "#fbd9ea");
    hud(c, "❤".repeat(Math.max(0, this.lives[1])) || "out", "❤".repeat(Math.max(0, this.lives[2])) || "out", `${this.k} jumps`, null);
    const tp = this.nextP, ph = 1 - clamp((tp - t) / this.per, 0, 1), ang = ph * Math.PI * 2;
    const ry = 470 + Math.cos(ang) * 330;
    person(c, 120, 780, 0.8, "#888", { armR: 1.6, face: "smile" }); person(c, 1480, 780, 0.8, "#888", { armR: 1.6, flip: true, face: "smile" });
    const back = Math.sin(ang) < 0;
    const drawRope = () => { c.strokeStyle = "#ff4057"; c.lineWidth = 8; c.beginPath(); c.moveTo(190, 610); c.quadraticCurveTo(800, ry * 2 - 610, 1410, 610); c.stroke(); };
    if (back) drawRope();
    for (const n of [1, 2]) { const up = now() - this.lastJ[n] < 300; person(c, PX(n), 780 - (up ? 90 : 0), 1, this.lives[n] > 0 ? COLORS[n] : "#b0aea8", { armL: 0.8, armR: 0.8, face: this.lives[n] > 0 ? "o" : "x", legs: up ? [0.4, -0.4] : [0.12, -0.12] }); }
    if (!back) drawRope();
  },
};

/* ------------------------------------------------------------------ SQUATS */
const Squats = scoreGame({
  id: "squats", cat: "party", name: "Squats", icon: "🏋️", tag: "Exercise", col: "#1fbf6a", T: 30,
  desc: "Hold the phone to your chest and squat! Proper, full squats only. Most squats in 30 seconds wins.",
  how: ["Hold the phone against your chest", "Squat all the way down and stand back up", "Each full squat counts (bouncing doesn't)", "Most squats in 30 s wins"],
  phoneHow: "Phone on your chest. Full squats!",
  keys: "No phone: Q / U = squat",
  phoneUi() { return { mode: "text", icon: "🏋️", title: "SQUAT!", hint: "Down… and up!" }; },
  onEvent(p, k) { if (k === "squat") { this.add(p.n); AU.sfx("right"); fx(p, "tick"); } },
  draw(c, t) {
    paper(c, "#ecfff4"); floorBand(c, 780, "#cdeedb");
    hud(c, this.c[1], this.c[2], Math.ceil(this.left()), "seconds");
    for (const n of [1, 2]) {
      const k = clamp((now() - this.flash[n]) / 500, 0, 1), down = Math.sin(k * Math.PI);
      person(c, PX(n), 820, 1.05, COLORS[n], { armL: 1.5, armR: 1.5, legs: [0.12 + down * 0.9, -0.12 - down * 0.9], face: down > 0.3 ? "o" : "smile" });
      text(c, String(this.c[n]), PX(n), 330, 110, COLORS[n], "center", 900);
    }
  },
});

/* ------------------------------------------------------------------ KITCHEN TIMER */
const Kitchen = {
  id: "kitchen", cat: "party", name: "Kitchen Timer", icon: "⏲️", tag: "Inner clock", col: "#ff8a3d",
  desc: "No clocks allowed! Tap your phone when you think exactly the right number of seconds has passed.",
  how: ["A target time appears, then GO!", "Count in your head — the screens show nothing", "TAP your phone when you think the time is up", "Closest wins the round · 3 rounds"],
  phoneHow: "Count in your head and TAP when the time is up!",
  keys: "No phone: Q / U = tap",
  reset() { this.r = 0; this.sc = { 1: 0, 2: 0 }; this.next(); },
  next() { this.r++; this.tg = randi(5, 15); this.st = "show"; this.stT = now(); this.tap = { 1: null, 2: null }; if (H.phase === "play") pushUiAll(); },
  phoneUi(p) { if (this.st === "show") return { mode: "text", icon: "⏲️", title: `${this.tg} seconds`, hint: "Get ready…" }; if (this.st === "count") return this.tap[p.n] != null ? { mode: "text", icon: "✋", title: "Stopped", hint: "" } : { mode: "text", icon: "🤔", title: "…", hint: `Tap at ${this.tg} s`, bg: "#222" }; return { mode: "text", icon: "⏲️", title: `${this.tap[p.n] != null ? this.tap[p.n].toFixed(2) : "—"} s`, hint: `target ${this.tg} s` }; },
  onTap(p, t) { if (this.st !== "count" || this.tap[p.n] != null) return; this.tap[p.n] = (t - this.goT) / 1000; AU.sfx("click"); pushUi(p); if (this.tap[1] != null && this.tap[2] != null) this.reveal(); },
  reveal() {
    this.st = "reveal"; this.stT = now();
    const e = n => (this.tap[n] == null ? 99 : Math.abs(this.tap[n] - this.tg)); const w = winnerOf(-e(1), -e(2), 0.005);
    this.rw = w; if (w) { this.sc[w]++; FX.say("+1", PX(w), 300, COLORS[w], 70); } AU.sfx("chime"); pushUiAll();
  },
  update(dt, t) {
    const el = (t - this.stT) / 1000;
    if (this.st === "show" && el > 2.5) { this.st = "count"; this.goT = t; this.stT = t; AU.sfx("go"); pushUiAll(); }
    else if (this.st === "count" && el > this.tg * 2 + 3) this.reveal();
    else if (this.st === "reveal" && el > 3.2) { if (this.r >= 3) finish(winnerOf(this.sc[1], this.sc[2]), `${this.sc[1]} – ${this.sc[2]} rounds`); else this.next(); }
  },
  draw(c, t) {
    paper(c, "#fff4ea");
    hud(c, this.sc[1], this.sc[2], `Round ${this.r}/3`, null);
    disc(c, 800, 470, 220, "#fff"); c.lineWidth = 14; c.strokeStyle = "#ff8a3d"; c.beginPath(); c.arc(800, 470, 220, 0, 7); c.stroke();
    if (this.st === "show") text(c, `${this.tg} s`, 800, 480, 150, INK, "center", 900);
    else if (this.st === "count") text(c, "?", 800, 480, 220, "#ff8a3d", "center", 900);
    else { text(c, `${this.tg} s`, 800, 420, 70, MUTE, "center", 900); for (const n of [1, 2]) text(c, this.tap[n] != null ? `${this.tap[n].toFixed(2)} s` : "—", 800, 500 + (n - 1) * 80, 54, COLORS[n], "center", 900); }
    for (const n of [1, 2]) text(c, this.st === "count" ? (this.tap[n] != null ? "✋ stopped" : "counting…") : "", PX(n) + (n === 1 ? -150 : 150), 470, 36, COLORS[n], "center", 900);
  },
};

/* ------------------------------------------------------------------ MUSICAL CHAIRS */
const Chairs = {
  id: "chairs", cat: "party", name: "Musical Chairs", icon: "🪑", tag: "Dance · Sit", col: "#a66bff",
  desc: "Walk around while the music plays. When it stops, SIT — put your phone flat on the table — first!",
  how: ["Keep the phone in your hand and walk/dance while the music plays", "When the music STOPS: put the phone flat on the table (screen up) and let go", "Sitting while the music still plays is a foul", "First to 3 rounds"],
  phoneHow: "Walk while music plays. When it stops: phone FLAT on the table!",
  keys: "No phone: hold E / O = sit",
  reset() { this.sc = { 1: 0, 2: 0 }; this.round(); },
  round() { this.st = "music"; this.stT = now(); this.len = rnd(4, 9); this.hold = { 1: 0, 2: 0 }; this.rw = 0; if (H.phase === "play") { MUSIC.start(128, "pop", 100); pushUiAll(); } },
  begin() { this.stT = now(); MUSIC.start(128, "pop", 100); },
  stop() { MUSIC.stop(); },
  sitting(p) { return p.phone ? Math.abs(p.us[2]) > 0.85 && p.r < 20 && p.l < 0.08 : p.kb.b; },
  phoneUi(p) { return this.st === "music" ? { mode: "text", icon: "🎶", title: "Walk!", hint: "Keep moving…" } : this.st === "stop" ? { mode: "text", icon: "🪑", title: "SIT!", hint: "Phone flat on the table!", bg: "#ffe3e0" } : { mode: "text", icon: this.rw === p.n ? "😎" : "😵", title: this.msg, hint: "" }; },
  update(dt, t) {
    const el = (t - this.stT) / 1000;
    if (this.st === "music") {
      for (const n of [1, 2]) { if (this.sitting(H.P[n]) && el > 1) this.hold[n] += dt; else this.hold[n] = 0; if (this.hold[n] > 0.8) return this.done(other(n), `${H.P[n].name} sat down too early!`); }
      if (el > this.len) { this.st = "stop"; this.stT = t; MUSIC.stop(); AU.sfx("whistle"); pushUiAll(); }
    } else if (this.st === "stop") {
      for (const n of [1, 2]) { if (this.sitting(H.P[n])) this.hold[n] += dt; else this.hold[n] = 0; }
      const a = this.hold[1] > 0.35, b = this.hold[2] > 0.35;
      if (a || b) this.done(a && b ? 0 : a ? 1 : 2, a && b ? "Same time!" : `${H.P[a ? 1 : 2].name} got the chair!`);
      else if (el > 8) this.done(0, "Nobody sat down");
    } else if (this.st === "done" && el > 2.3) { const w = this.sc[1] >= 3 ? 1 : this.sc[2] >= 3 ? 2 : 0; if (w) finish(w, `${this.sc[w]} – ${this.sc[other(w)]}`); else this.round(); }
  },
  done(w, msg) { MUSIC.stop(); this.st = "done"; this.stT = now(); this.rw = w; this.msg = msg; if (w) { this.sc[w]++; fx(H.P[w], "good"); fx(H.P[other(w)], "bad"); AU.sfx("right"); } pushUiAll(); },
  draw(c, t) {
    paper(c, "#f4edff"); floorBand(c, 760, "#e6dafb");
    hud(c, this.sc[1], this.sc[2], "first to 3", null);
    c.fillStyle = "#8e6e53"; rr(c, 720, 560, 160, 30, 10); c.fill(); c.fillRect(730, 590, 18, 170); c.fillRect(852, 590, 18, 170); c.fillRect(730, 420, 18, 150);
    for (const n of [1, 2]) {
      const sit = this.sitting(H.P[n]) && this.st !== "music", ang = this.st === "music" ? t / 900 + (n === 1 ? 0 : Math.PI) : 0;
      const x = sit && this.rw === n ? 800 : this.st === "music" ? 800 + Math.cos(ang) * 420 : PX(n), y = this.st === "music" ? 780 + Math.sin(ang) * 40 : 780;
      person(c, x, y, 1, COLORS[n], { armL: 0.5, armR: 0.5, legs: this.st === "music" ? [Math.sin(t / 120) * 0.3, -Math.sin(t / 120) * 0.3] : [0.12, -0.12], face: this.st === "done" ? (this.rw === n ? "smile" : "sad") : "o" });
    }
    headline(c, this.st === "music" ? "♪ ♫ ♪" : this.st === "stop" ? "SIT!" : this.msg, 250, this.st === "done" ? 54 : 110, this.st === "stop" ? "#ff4057" : this.rw ? COLORS[this.rw] : INK, this.stT);
  },
};

/* ------------------------------------------------------------------ registry: originals + classics + party */
for (const [G, cat, name] of [[Champagne, "original"], [Race, "original"], [Draw, "classic"], [Safe, "classic", "Safe Crack"], [Zen, "classic", "Zen"], [Saber, "classic", "Sword Fight"]]) { G.cat = cat; if (name) G.name = name; }
Draw.col = "#e67e22"; Safe.col = "#3d4f6b"; Zen.col = "#8fd19e"; Saber.col = "#15151a"; Champagne.col = "#2c9358"; Race.col = "#ff4057";
GAMES.push(
  BallCount, Milk, Telephone, Chest, Zen, Draw, Safe, Samurai, Flags, Dice, Soda, Baby, Baseball, Rotate,
  FakeDraw, Shave, Pong, BeachFlags, Boxing, Eating, Plates, Saber, Wizard, Guitar, CopyDance, DanceOff, Gorilla, Runway,
  Balloons, HipBump, Relay, Showdown, HideSeek, Bingo, IceCream, ColorShoot, Auction, Statues, Quiz, Ninjas, Ufos, JumpRope, Squats, Kitchen, Chairs,
  Champagne, Race,
);
