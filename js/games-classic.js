/* games-classic.js — duel minigames in the spirit of the original 28 (part 1).
   Phones replace the motion controllers; rumble becomes sound (+ vibration on Android). */
"use strict";

/* ------------------------------------------------------------------ BALL COUNT */
const BallCount = {
  id: "balls", cat: "classic", name: "Ball Count", icon: "🎱", tag: "Tilt · Listen", col: "#8b5a2b", phoneOnly: true,
  desc: "There's a box of balls inside your phone. Tilt it, listen to the clacks and guess how many.",
  how: ["Hold the phone flat and tilt it slowly", "Each ball clacks when it hits the box wall (Android also buzzes)", "When time is up, tap your guess on the phone", "Exact = 2 points, off by one = 1 point · 3 rounds"],
  phoneHow: "Tilt slowly and LISTEN. Then guess how many balls.",
  ROUNDS: 3, FEEL: 12,
  reset() { this.r = 0; this.pts = { 1: 0, 2: 0 }; this.next(); },
  next() {
    this.r++; this.st = "feel"; this.stT = now(); this.N = { 1: randi(2, 11), 2: randi(2, 11) }; this.g = { 1: 0, 2: 0 };
    if (H.phase === "play") pushUiAll();
  },
  phoneUi(p) {
    if (this.st === "feel") return { mode: "balls", n: this.N[p.n], seed: this.r, hint: `Round ${this.r}/${this.ROUNDS} · tilt slowly and listen…` };
    if (this.st === "guess") return { mode: "grid", title: "How many balls?", cols: 4, buttons: Array.from({ length: 12 }, (_, i) => ({ t: i + 1, v: i + 1, on: this.g[p.n] === i + 1 })) };
    return { mode: "text", icon: "🎱", title: `${this.N[p.n]} balls!`, hint: `You said ${this.g[p.n] || "—"}` };
  },
  onBtn(p, v) { if (this.st !== "guess") return; this.g[p.n] = v | 0; pushUi(p); if (this.g[1] && this.g[2]) this.reveal(); },
  reveal() {
    this.st = "reveal"; this.stT = now();
    for (const n of [1, 2]) { const d = Math.abs(this.g[n] - this.N[n]), pt = !this.g[n] ? 0 : d === 0 ? 2 : d === 1 ? 1 : 0; this.pts[n] += pt; if (pt) FX.say("+" + pt, PX(n), 300, H.P[n].color, 60); }
    AU.sfx("chime"); pushUiAll();
  },
  update(dt, t) {
    const el = (t - this.stT) / 1000;
    if (this.st === "feel" && el > this.FEEL) { this.st = "guess"; this.stT = t; AU.sfx("beep"); pushUiAll(); }
    else if (this.st === "guess" && el > 15) this.reveal();
    else if (this.st === "reveal" && el > 3.5) {
      if (this.r >= this.ROUNDS) { const a = this.pts[1], b = this.pts[2]; finish(a === b ? 0 : a > b ? 1 : 2, `${a} – ${b} points`); }
      else this.next();
    }
  },
  draw(c, t) {
    paper(c, "#f3e9dc"); floorBand(c, 700, "#e2d3bf");
    const el = (t - this.stT) / 1000;
    hud(c, this.pts[1] + " pts", this.pts[2] + " pts", `Round ${this.r}`, this.st === "feel" ? `${Math.ceil(Math.max(0, this.FEEL - el))} s to feel` : this.st === "guess" ? "Tap your guess!" : "");
    for (const n of [1, 2]) {
      const x = PX(n), y = 470;
      c.save(); c.translate(x, y); c.rotate(this.st === "feel" ? Math.sin(t / 300 + n) * 0.04 : 0);
      rr(c, -190, -150, 380, 300, 26); c.fillStyle = "#8b5a2b"; c.fill(); rr(c, -170, -130, 340, 260, 18); c.fillStyle = "#6b4220"; c.fill();
      if (this.st === "reveal") {
        for (let i = 0; i < this.N[n]; i++) disc(c, -120 + (i % 4) * 80, -80 + Math.floor(i / 4) * 80, 32, ["#ff4057", "#12a4ff", "#ffb400", "#2bd47d"][i % 4]);
      } else text(c, this.st === "guess" && this.g[n] ? "✓" : "?", 0, 6, 160, "rgba(255,255,255,.35)", "center", 900);
      c.restore();
      if (this.st === "reveal") text(c, `${this.N[n]} balls · guessed ${this.g[n] || "—"}`, x, 680, 34, H.P[n].color, "center", 900);
    }
  },
};

/* ------------------------------------------------------------------ MILK */
const Milk = scoreGame({
  id: "milk", name: "Milk", icon: "🐄", tag: "Squeeze · Pull", col: "#cdeec0", T: 20,
  desc: "Milk the cow! Squeeze (thumb on screen) and pull down. Most milk in 20 seconds wins.",
  how: ["Hold the phone upright like a cow's udder", "Press your thumb on the screen (squeeze)…", "…and pull the phone DOWN in short strokes", "Most milk after 20 seconds wins"],
  phoneHow: "Thumb on the screen = squeeze. Then pull DOWN, again and again!",
  keys: "No phone: tap Q (P1) / U (P2)",
  fmt: v => (v * 0.05).toFixed(2) + " L",
  phoneUi() { return { mode: "text", icon: "🥛", title: "Squeeze & pull!", hint: "Thumb on the screen, pull the phone down" }; },
  onEvent(p, k, v) { if (k !== "pump" || (p.phone && !p.tc)) return; this.add(p.n); AU.sfx("squirt"); fx(p, "squirt"); },
  tick() { for (const n of [1, 2]) phoneBar(H.P[n], this.c[n] / 120); },
  draw(c, t) {
    paper(c, "#e9f6e3"); floorBand(c, 690, "#cfe8b9");
    hud(c, this.fmt(this.c[1]), this.fmt(this.c[2]), Math.ceil(this.left()), "seconds");
    for (const n of [1, 2]) {
      const x = PX(n), f = n === 1 ? 1 : -1, fresh = now() - this.flash[n] < 150;
      c.save(); c.translate(x, 470);
      rr(c, -200, -120, 330, 190, 90); c.fillStyle = "#fff"; c.fill(); c.lineWidth = 6; c.strokeStyle = INK; c.stroke();
      for (const [sx, sy, r] of [[-120, -60, 36], [-20, 10, 30], [40, -70, 26]]) disc(c, sx, sy, r, INK);
      rr(c, 100 * f - 60, -190, 120, 110, 50); c.fillStyle = "#fff"; c.fill(); c.stroke();
      disc(c, 100 * f, -120, 30, "#ffb6c1");
      c.fillStyle = INK; for (const lx of [-170, -60, 30, 100]) c.fillRect(lx, 50, 22, 90);
      rr(c, -80, 50, 90, 50, 25); c.fillStyle = fresh ? "#ff7fa2" : "#ffb6c1"; c.fill();
      if (fresh) { c.strokeStyle = "#fff"; c.lineWidth = 8; c.beginPath(); c.moveTo(-35, 100); c.lineTo(-35, 190); c.stroke(); }
      rr(c, -95, 190, 120, 120, 14); c.fillStyle = "#b9c3cc"; c.fill();
      const lv = clamp(this.c[n] / 120, 0, 1) * 105; c.fillStyle = "#fff"; c.fillRect(-88, 302 - lv, 106, lv);
      c.restore();
      nameTag(c, n, x, 860, "center");
    }
  },
});

/* ------------------------------------------------------------------ TELEPHONE */
const Telephone = {
  id: "phone", cat: "classic", name: "Telephone", icon: "☎️", tag: "Reflex · Listen", col: "#ffb400",
  desc: "Phones on the table. When they RING, grab yours and put it to your ear first. Don't fall for fake sounds!",
  how: ["Put your phone on the table, screen up, and keep your hands off", "Wait… listen carefully", "When the phones RING: grab yours and lift it to your ear", "Doorbells and kettles are fakes — picking up on a fake loses the round", "First to 3 rounds"],
  phoneHow: "Phone on the table, screen up. Grab it only when it RINGS!",
  keys: "No phone: Q / U = pick up",
  reset() { this.sc = { 1: 0, 2: 0 }; this.newRound(); },
  newRound() { this.st = "place"; this.stT = now(); this.hold = 0; this.real = false; this.rw = 0; this.msg = ""; this.fakes = 0; if (H.phase === "play") pushUiAll(); },
  down(p) { return p.phone ? Math.abs(p.us[2]) > 0.8 && p.r < 40 : true; },
  picked(p) { return p.phone ? (p.us[1] > 0.55 || Math.abs(p.us[2]) < 0.55) : now() - (p.kbT || 0) < 200; },
  phoneUi() {
    if (this.st === "ring") return { mode: "text", icon: "📞", title: "RING RING!", hint: "Pick up!", loop: "ring", every: 1300, bg: "#ffe9a8" };
    if (this.st === "fake") return { mode: "text", icon: "👂", title: "…", hint: "Is it really the phone?" };
    if (this.st === "done") return { mode: "text", icon: this.rw ? "📞" : "😅", title: this.msg, hint: "" };
    return { mode: "text", icon: "⬇️", title: "Put me down", hint: "Screen up on the table · hands off · listen", bg: "#222" };
  },
  onKb(p) { p.kbT = now(); },
  update(dt, t) {
    const el = (t - this.stT) / 1000, P1 = H.P[1], P2 = H.P[2];
    if (this.st === "place") {
      if (this.down(P1) && this.down(P2)) this.hold += dt; else this.hold = 0;
      if (this.hold > 1) { this.st = "wait"; this.stT = t; this.wait = rnd(2, 6); }
    } else if (this.st === "wait") {
      for (const n of [1, 2]) if (this.picked(H.P[n]) && el > 0.3) return this.done(other(n), `${H.P[n].name} picked up too early!`);
      if (el > this.wait) {
        if (this.fakes < 2 && Math.random() < 0.45) { this.st = "fake"; this.stT = t; this.fakes++; const k = pick(["doorbell", "kettle", "chime"]); AU.sfx(k); sendAll({ t: "fx", k }); pushUiAll(); }
        else { this.st = "ring"; this.stT = t; this.real = true; AU.sfx("ring"); pushUiAll(); }
      }
    } else if (this.st === "fake") {
      for (const n of [1, 2]) if (this.picked(H.P[n])) return this.done(other(n), `${H.P[n].name} fell for the fake!`);
      if (el > 2.5) { this.st = "wait"; this.stT = t; this.wait = rnd(1.5, 4); pushUiAll(); }
    } else if (this.st === "ring") {
      if (Math.floor(el / 1.3) !== Math.floor((el - dt) / 1.3)) AU.sfx("ring");
      const a = this.picked(P1), b = this.picked(P2);
      if (a || b) return this.done(a && b ? 0 : a ? 1 : 2, a && b ? "Both at once!" : `${H.P[a ? 1 : 2].name} answered first! (${Math.round(el * 1000)} ms)`);
    } else if (this.st === "done" && el > 2.4) {
      const w = this.sc[1] >= 3 ? 1 : this.sc[2] >= 3 ? 2 : 0;
      if (w) finish(w, `${this.sc[w]} – ${this.sc[other(w)]}`); else this.newRound();
    }
  },
  done(w, msg) {
    this.st = "done"; this.stT = now(); this.rw = w; this.msg = msg;
    if (w) { this.sc[w]++; FX.say("+1", PX(w), 300, H.P[w].color, 70); AU.sfx("right"); } else AU.sfx("boo");
    pushUiAll();
  },
  draw(c, t) {
    paper(c, "#fff6dd"); floorBand(c, 560, "#d9b48a");
    hud(c, this.sc[1], this.sc[2], "first to 3", null);
    for (const n of [1, 2]) {
      const p = H.P[n], x = PX(n), ringing = this.st === "ring", up = this.picked(p) && this.st !== "place";
      if (up) { person(c, x, 560, 1, p.color, { armR: 2.6, face: "o" }); phoneIcon(c, x + 60, 300, 1.4, 0.3, p.color); }
      else {
        person(c, x, 560, 1, p.color, { armL: 0.5, armR: 0.5, face: "smile" });
        const jig = ringing ? Math.sin(t / 25) * 8 : 0;
        phoneIcon(c, x + jig, 640, 1.6, Math.PI / 2, p.color, ringing ? "#ffe14d" : "#9ad7ff");
        if (this.st === "place") text(c, this.down(p) ? "✓ ready" : "put it down", x, 760, 30, this.down(p) ? "#1fbf6a" : MUTE, "center", 900);
      }
    }
    if (this.st === "ring") headline(c, "RING RING!", 220, 110, "#ff4057", this.stT);
    else if (this.st === "fake") headline(c, "…was that the phone?", 220, 70, MUTE, this.stT);
    else if (this.st === "wait") headline(c, "Shhh… listen", 220, 70, MUTE);
    else if (this.st === "place") headline(c, "Phones down, hands off", 220, 64, INK);
    else headline(c, this.msg, 220, 54, this.rw ? COLORS[this.rw] : INK, this.stT);
  },
};

/* ------------------------------------------------------------------ TREASURE CHEST */
const Chest = {
  id: "chest", cat: "classic", name: "Treasure Chest", icon: "🗝️", tag: "Twist", col: "#c98a2b",
  desc: "Turn the key in the lock — five full turns — then lift the lid. First to open the treasure wins.",
  how: ["Hold the phone like a big key, pointing forward", "Twist your wrist to turn it (one direction)", "After 5 full turns, LIFT the phone up to open the lid", "First open chest wins"],
  phoneHow: "Hold like a key and TWIST your wrist. Then lift!",
  keys: "No phone: tap Q / U to turn",
  TURNS: 5,
  reset() { this.s = { 1: this.mk(), 2: this.mk() }; this.win = 0; this.winT = 0; },
  mk() { return { prog: 0, last: null, dir: 0, open: false, lid: 0 }; },
  phoneUi(p) { const s = this.s[p.n]; return s.prog >= this.TURNS * 360 ? { mode: "text", icon: "⬆️", title: "LIFT!", hint: "Raise the phone to open the lid" } : { mode: "text", icon: "🗝️", title: "Twist!", hint: "Turn your wrist like a key", bar: s.prog / (this.TURNS * 360) }; },
  onSample(p) {
    const s = this.s[p.n], ry = p.rot[1];
    if (s.last == null) { s.last = ry; return; }
    const d = ry - s.last; s.last = ry;
    if (!s.dir && Math.abs(d) > 4) s.dir = Math.sign(d);
    this.turn(p, Math.max(0, d * s.dir));
  },
  onKb(p) { this.turn(p, 45); if (this.s[p.n].prog >= this.TURNS * 360) this.lift(p.n); },
  turn(p, d) {
    const s = this.s[p.n]; if (this.win || s.open) return;
    const before = Math.floor(s.prog / 360); s.prog = Math.min(this.TURNS * 360, s.prog + d);
    if (Math.floor(s.prog / 360) > before) { AU.sfx("click"); fx(p, "tick"); FX.say(`${Math.floor(s.prog / 360)}/${this.TURNS}`, PX(p.n), 330, p.color, 44); if (s.prog >= this.TURNS * 360) pushUi(p); }
    phoneBar(p, s.prog / (this.TURNS * 360));
  },
  onEvent(p, k) { if (k === "jump" || k === "swing") if (this.s[p.n].prog >= this.TURNS * 360) this.lift(p.n); },
  lift(n) { if (this.win) return; const s = this.s[n]; s.open = true; this.win = n; this.winT = now(); AU.sfx("win"); FX.burst(PX(n), 480, 90, { speed: [200, 700], colors: ["#ffd700", "#fff3a0", "#fff"], life: [0.5, 1.4], size: [3, 8], g: 500 }); },
  update(dt, t) {
    for (const n of [1, 2]) { const s = this.s[n], p = H.P[n]; if (s.open) s.lid = Math.min(1, s.lid + dt * 3); if (p.phone && s.prog >= this.TURNS * 360 && p.us[1] > 0.75 && p.vz[1] > 0.35) this.lift(n); }
    if (this.win && t - this.winT > 1600) finish(this.win, `${H.P[this.win].name} found the treasure!`);
  },
  draw(c, t) {
    paper(c, "#fbf1de"); floorBand(c, 690, "#ead6b4");
    hud(c, `${Math.floor(this.s[1].prog / 360)}/${this.TURNS} turns`, `${Math.floor(this.s[2].prog / 360)}/${this.TURNS} turns`, null);
    for (const n of [1, 2]) {
      const s = this.s[n], x = PX(n), y = 520;
      rr(c, x - 200, y - 80, 400, 210, 20); c.fillStyle = "#b9752a"; c.fill();
      c.fillStyle = "#8a5418"; c.fillRect(x - 200, y - 10, 400, 14); c.fillRect(x - 140, y - 80, 24, 210); c.fillRect(x + 116, y - 80, 24, 210);
      c.save(); c.translate(x - 200, y - 80); c.rotate(-s.lid * 1.4);
      rr(c, 0, -110, 400, 110, 40); c.fillStyle = "#c98a2b"; c.fill(); c.restore();
      if (s.lid > 0.2) { c.save(); c.globalAlpha = s.lid; disc(c, x, y - 60, 120, "rgba(255,215,0,.6)"); text(c, "💰", x, y - 70, 90); c.restore(); }
      rr(c, x - 40, y - 30, 80, 90, 16); c.fillStyle = "#ffd76a"; c.fill();
      c.save(); c.translate(x, y + 10); c.rotate((s.prog * Math.PI) / 180);
      c.fillStyle = INK; c.fillRect(-6, -30, 12, 60); c.fillRect(-26, -6, 52, 12); c.restore();
      ring(c, x, y + 10, 70, (s.prog % 360) / 360 || (s.prog >= this.TURNS * 360 ? 1 : 0), H.P[n].color, 10);
      if (s.prog >= this.TURNS * 360 && !s.open) text(c, "LIFT! ⬆️", x, y - 160, 52, H.P[n].color, "center", 900);
      nameTag(c, n, x, 800, "center");
    }
  },
};

/* ------------------------------------------------------------------ SAMURAI TRAINING */
const Samurai = {
  id: "samurai", cat: "classic", name: "Samurai Training", icon: "🥷", tag: "Swing · Clap", col: "#3d3d3d",
  desc: "One swings the sword down, the other catches it between their palms. Swap after every strike.",
  how: ["Attacker: raise the phone above your head, then SWING it down whenever you like", "Defender: hold your phone between your palms and CLAP (a sharp squeeze/jerk) to catch the blade", "Clap too early = flinch, too late = hit", "3 strikes each — most points wins"],
  phoneHow: "Attacker: raise, then swing down. Defender: clap your palms on the phone!",
  keys: "No phone: Q / U = swing or clap",
  reset() { this.turn = 0; this.sc = { 1: 0, 2: 0 }; this.next(); },
  next() { this.turn++; this.A = this.turn % 2 ? 1 : 2; this.st = "raise"; this.stT = now(); this.swT = 0; this.msg = ""; this.rw = 0; if (H.phase === "play") pushUiAll(); },
  phoneUi(p) {
    const att = p.n === this.A;
    if (this.st === "done") return { mode: "text", icon: this.rw === p.n ? "😎" : "😵", title: this.msg, hint: "" };
    return att ? { mode: "text", icon: "🗡️", title: this.st === "raise" ? "Raise it!" : "Strike!", hint: this.st === "raise" ? "Hold the phone above your head" : "Swing DOWN whenever you want…", bg: "#ffe3e0" }
      : { mode: "text", icon: "👏", title: "Catch!", hint: "Phone between your palms. CLAP when the blade comes!", bg: "#e0f2ff" };
  },
  onKb(p) { this.onEvent(p, p.n === this.A ? "swing" : "punch", 2, now()); },
  onTap(p, t) { if (p.n !== this.A) this.onEvent(p, "punch", 2, t); },
  onEvent(p, k, v, t) {
    if (this.st === "done") return;
    if (p.n === this.A) {
      if (k === "swing" && this.st === "ready") { this.st = "strike"; this.swT = t; AU.sfx("swish"); }
    } else if (k === "shake" || k === "punch") {
      if (this.st === "ready" || this.st === "raise") this.done(this.A, "Flinched! 🙈");
      else if (this.st === "strike") { if (t - this.swT < 450) this.done(p.n, `CAUGHT! (${Math.round(t - this.swT)} ms)`); }
    }
  },
  done(w, msg) { this.st = "done"; this.stT = now(); this.rw = w; this.msg = msg; this.sc[w]++; AU.sfx(w === this.A ? "hit" : "clash"); fx(H.P[w], "good"); fx(H.P[other(w)], "bad"); FX.say("+1", PX(w), 280, COLORS[w], 70); SHAKE.v = 10; pushUiAll(); },
  update(dt, t) {
    const el = (t - this.stT) / 1000, a = H.P[this.A];
    if (this.st === "raise" && (S.up(a) > 0.7 || !a.phone) && el > 0.8) { this.st = "ready"; this.stT = t; pushUiAll(); }
    else if (this.st === "ready" && el > 6) { this.st = "strike"; this.swT = t; AU.sfx("swish"); }
    else if (this.st === "strike" && t - this.swT > 450) this.done(this.A, "HIT! 💥");
    else if (this.st === "done" && el > 2.2) {
      if (this.turn >= 6) { const x = this.sc[1], y = this.sc[2]; finish(x === y ? 0 : x > y ? 1 : 2, `${x} – ${y}`); } else this.next();
    }
  },
  draw(c, t) {
    paper(c, "#f4efe6"); floorBand(c, 700, "#e3dccd");
    c.fillStyle = "#d8cfbd"; for (let x = 0; x < VW; x += 200) c.fillRect(x, 130, 6, 570);
    hud(c, this.sc[1], this.sc[2], `Strike ${Math.min(this.turn, 6)}/6`, `${H.P[this.A].name} attacks`);
    const D = other(this.A), ax = PX(this.A), dx = PX(D), f = this.A === 1 ? 1 : -1;
    const k = this.st === "strike" ? clamp((now() - this.swT) / 450, 0, 1) : this.st === "done" ? 1 : 0;
    const armAng = this.st === "raise" ? 1.2 : this.st === "ready" ? 3.0 : lerp(3.0, 1.6, ease3(k));
    const h = person(c, ax, 700, 1.05, COLORS[this.A], { armR: armAng, armL: armAng, flip: f < 0, face: "smile" });
    const sdx = Math.sin(armAng) * f, sdy = Math.cos(armAng);
    c.lineCap = "round"; c.strokeStyle = "#555"; c.lineWidth = 14; c.beginPath(); c.moveTo(h.r[0] - sdx * 20, h.r[1] - sdy * 20); c.lineTo(h.r[0] + sdx * 30, h.r[1] + sdy * 30); c.stroke();
    c.strokeStyle = "#cfd6e0"; c.lineWidth = 10; c.beginPath(); c.moveTo(h.r[0] + sdx * 30, h.r[1] + sdy * 30); c.lineTo(h.r[0] + sdx * 250, h.r[1] + sdy * 250); c.stroke();
    const caught = this.st === "done" && this.rw === D;
    person(c, dx, 700, 1.05, COLORS[D], { armL: caught ? 2.9 : 2.2, armR: caught ? 2.9 : 2.2, flip: f > 0, face: this.st === "done" ? (caught ? "smile" : "x") : "o" });
    if (this.st === "ready") headline(c, "…", 230, 90, MUTE);
    if (this.st === "done") headline(c, this.msg, 230, 64, COLORS[this.rw], this.stT);
  },
};

/* ------------------------------------------------------------------ SIGNAL FLAGS */
const Flags = {
  id: "flags", cat: "classic", name: "Signal Flags", icon: "🚩", tag: "Listen · Pose", col: "#ff4057",
  desc: "\"Blue UP! Red DON'T go down!\" Raise or lower your flag exactly as told.",
  how: ["Your phone is a flag: hold it out in front of you (level)", "UP = point the phone up · DOWN = point it down", "\"DON'T…\" means stay where you are", "Each command is for your colour only — read carefully, it gets faster!"],
  phoneHow: "Phone = flag. UP points up, DOWN points down. Watch for DON'T!",
  keys: "No phone: W = up, S = down (P1) · I / K (P2)",
  N: 12,
  reset() { this.i = 0; this.sc = { 1: 0, 2: 0 }; this.st = "gap"; this.stT = now(); this.cmd = null; this.res = null; },
  phoneUi(p) { return this.cmd ? { mode: "text", icon: "🚩", title: this.cmd[p.n].txt, hint: "", bg: this.cmd[p.n].dont ? "#fff1c2" : "" } : { mode: "text", icon: "🚩", title: "Flag level", hint: "Hold the phone out in front of you" }; },
  mkCmd() {
    const one = n => { const dir = pick(["up", "down"]), dont = Math.random() < 0.3; return { dir, dont, txt: `${n === 1 ? "BLUE" : "RED"} ${dont ? "DON'T go " : ""}${dir.toUpperCase()}!`, start: S.pose(H.P[n]) }; };
    return { 1: one(1), 2: one(2) };
  },
  ok(n) {
    const c = this.cmd[n], ps = S.pose(H.P[n]);
    if (c.dont) return ps !== c.dir;
    return ps === c.dir;
  },
  update(dt, t) {
    const el = (t - this.stT) / 1000, win = Math.max(1.0, 1.9 - this.i * 0.07);
    if (this.st === "gap" && el > 1.0) {
      if (this.i >= this.N) { const a = this.sc[1], b = this.sc[2]; return finish(a === b ? 0 : a > b ? 1 : 2, `${a} – ${b} correct`); }
      this.i++; this.cmd = this.mkCmd(); this.st = "cmd"; this.stT = t; AU.sfx("whistle"); pushUiAll();
    } else if (this.st === "cmd" && el > win) {
      this.res = {};
      for (const n of [1, 2]) { const ok = this.ok(n); this.res[n] = ok; if (ok) { this.sc[n]++; FX.say("✓", PX(n), 260, "#1fbf6a", 90); fx(H.P[n], "good"); } else { FX.say("✗", PX(n), 260, "#ff4057", 90); fx(H.P[n], "bad"); } }
      this.st = "gap"; this.stT = t; this.cmd = null; pushUiAll();
    }
  },
  draw(c, t) {
    paper(c, "#eef6ff"); floorBand(c, 700, "#dde8f3");
    hud(c, this.sc[1], this.sc[2], `${this.i}/${this.N}`, null);
    for (const n of [1, 2]) {
      const p = H.P[n], ps = S.pose(p), x = PX(n), ang = ps === "up" ? 2.9 : ps === "down" ? 0.15 : 1.57;
      const h = person(c, x, 720, 1.05, p.color, { armR: ang, flip: n === 2, face: this.res && this.st === "gap" ? (this.res[n] ? "smile" : "sad") : "o" });
      const side = n === 1 ? 1 : -1, dx = Math.sin(ang) * side, dy = Math.cos(ang), tx = h.r[0] + dx * 130, ty = h.r[1] + dy * 130;
      c.strokeStyle = "#777"; c.lineWidth = 8; c.beginPath(); c.moveTo(h.r[0], h.r[1]); c.lineTo(tx, ty); c.stroke();
      c.fillStyle = p.color; c.beginPath(); c.moveTo(tx, ty); c.lineTo(tx - dx * 60 + dy * 80 * side, ty - dy * 60 - dx * 80 * side); c.lineTo(tx - dx * 60, ty - dy * 60); c.fill();
      if (this.cmd) text(c, this.cmd[n].txt, x, 250, 50, p.color, "center", 900, "middle");
    }
    if (this.st === "cmd") { const el = (now() - this.stT) / 1000, win = Math.max(1.0, 1.9 - this.i * 0.07); bar(c, 600, 160, 400, 14, 1 - el / win, INK); }
  },
};

/* ------------------------------------------------------------------ SNEAKY DICE */
const Dice = {
  id: "dice", cat: "classic", name: "Sneaky Dice", icon: "🎲", tag: "Shake · Slam", col: "#a66bff",
  desc: "Your phone is a dice cup. Shake, slam it on the table and peek. Keep it or re-roll once. Higher total wins.",
  how: ["Shake the phone like a dice cup (at least 3 shakes)", "Slam it down on the table — then peek at your phone", "Keep your roll or re-roll once (you must keep the second roll)", "Higher total wins the round · first to 2 rounds"],
  phoneHow: "Shake, then SLAM it on the table. Peek, then keep or re-roll.",
  keys: "No phone: Q / U = roll (keeps automatically)",
  reset() { this.sc = { 1: 0, 2: 0 }; this.round = 0; this.next(); },
  next() { this.round++; this.st = "roll"; this.stT = now(); this.s = { 1: this.mk(), 2: this.mk() }; if (H.phase === "play") pushUiAll(); },
  mk() { return { shakes: 0, d: null, rerolled: false, kept: false }; },
  phoneUi(p) {
    const s = this.s[p.n];
    if (this.st === "reveal") return { mode: "text", icon: "🎲", title: `${s.d[0] + s.d[1]}`, hint: this.msg };
    if (s.kept) return { mode: "text", icon: "🤫", title: `You: ${s.d[0]} + ${s.d[1]} = ${s.d[0] + s.d[1]}`, hint: "Kept. Waiting for your rival…" };
    if (s.d && !s.rolling) return { mode: "grid", title: `🎲 ${s.d[0]} + ${s.d[1]} = ${s.d[0] + s.d[1]}`, hint: s.rerolled ? "Second roll — you must keep it" : "Keep it or re-roll once?", cols: 1, buttons: [{ t: "Keep ✓", v: "keep", c: "#1fbf6a" }, { t: "Re-roll 🎲", v: "reroll", dis: s.rerolled }] };
    return { mode: "text", icon: "🎲", title: s.shakes >= 3 ? "SLAM it!" : "Shake!", hint: s.shakes >= 3 ? "Slam the phone onto the table" : "Rattle the dice cup", bar: Math.min(1, s.shakes / 3) };
  },
  onKb(p) { const s = this.s[p.n]; if (this.st !== "roll" || s.kept) return; s.shakes = 3; this.slam(p); s.kept = true; pushUi(p); this.check(); },
  onEvent(p, k) {
    const s = this.s[p.n]; if (this.st !== "roll" || s.kept || (s.d && !s.rolling)) return;
    if (k === "shake") { s.shakes++; s.rolling = true; AU.sfx("dice"); if (s.shakes === 3) pushUi(p); }
    if (k === "impact" && s.shakes >= 3) this.slam(p);
  },
  slam(p) { const s = this.s[p.n]; s.d = [randi(1, 6), randi(1, 6)]; s.rolling = false; AU.sfx("thump"); fx(p, "thump"); pushUi(p); },
  onBtn(p, v) {
    const s = this.s[p.n]; if (this.st !== "roll" || !s.d || s.kept) return;
    if (v === "keep") { s.kept = true; pushUi(p); this.check(); }
    else if (v === "reroll" && !s.rerolled) { s.rerolled = true; s.d = null; s.shakes = 0; pushUi(p); }
  },
  check() {
    if (!(this.s[1].kept && this.s[2].kept)) return;
    const a = this.s[1].d[0] + this.s[1].d[1], b = this.s[2].d[0] + this.s[2].d[1], w = a === b ? 0 : a > b ? 1 : 2;
    this.rw = w; this.msg = w ? `${H.P[w].name} wins the round (${a} vs ${b})` : `Tie (${a} vs ${b})`;
    if (w) this.sc[w]++;
    this.st = "reveal"; this.stT = now(); AU.sfx("chime"); pushUiAll();
  },
  update(dt, t) {
    if (this.st === "reveal" && (t - this.stT) / 1000 > 3.2) {
      const w = this.sc[1] >= 2 ? 1 : this.sc[2] >= 2 ? 2 : 0;
      if (w || this.round >= 5) finish(w || (this.sc[1] === this.sc[2] ? 0 : this.sc[1] > this.sc[2] ? 1 : 2), `${this.sc[1]} – ${this.sc[2]} rounds`); else this.next();
    }
  },
  die(c, x, y, v, col) {
    rr(c, x - 50, y - 50, 100, 100, 20); c.fillStyle = "#fff"; c.fill(); c.lineWidth = 5; c.strokeStyle = col; c.stroke();
    const P = { 1: [[0, 0]], 2: [[-1, -1], [1, 1]], 3: [[-1, -1], [0, 0], [1, 1]], 4: [[-1, -1], [1, -1], [-1, 1], [1, 1]], 5: [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]], 6: [[-1, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [1, 1]] }[v];
    for (const [a, b] of P) disc(c, x + a * 25, y + b * 25, 9, INK);
  },
  draw(c, t) {
    paper(c, "#f3eeff"); floorBand(c, 640, "#2f7a4b");
    hud(c, this.sc[1], this.sc[2], `Round ${this.round}`, "first to 2");
    for (const n of [1, 2]) {
      const s = this.s[n], x = PX(n), col = H.P[n].color;
      if (this.st === "reveal") { this.die(c, x - 60, 560, s.d[0], col); this.die(c, x + 60, 560, s.d[1], col); text(c, String(s.d[0] + s.d[1]), x, 420, 90, col, "center", 900); }
      else {
        const wob = s.rolling ? Math.sin(t / 30) * 0.15 : 0;
        c.save(); c.translate(x, 600); c.rotate(wob);
        c.beginPath(); c.moveTo(-90, 0); c.lineTo(-70, -200); c.lineTo(70, -200); c.lineTo(90, 0); c.closePath(); c.fillStyle = col; c.fill();
        c.restore();
        text(c, s.kept ? "kept 🤫" : s.d ? "peeking…" : s.shakes >= 3 ? "SLAM!" : `shake ${s.shakes}/3`, x, 700, 34, "#fff", "center", 900);
      }
    }
    if (this.st === "reveal") headline(c, this.msg, 250, 50, this.rw ? COLORS[this.rw] : INK, this.stT);
  },
};

/* ------------------------------------------------------------------ SODA SHAKE */
const Soda = {
  id: "soda", cat: "classic", name: "Soda Shake", icon: "🥤", tag: "Shake · Pass", col: "#2bd47d",
  desc: "Take turns shaking the same soda bottle. Shake enough, then pass it. Whoever makes it burst loses!",
  how: ["Only the player holding the bottle shakes", "Shake until your 'enough' bar is full, then TAP to pass", "You have 8 seconds per turn", "Somewhere the bottle bursts — don't be holding it!"],
  phoneHow: "Your turn: shake until the bar is full, then tap to pass!",
  keys: "No phone: Q / U = shake, hold E / O and press Q / U = pass",
  MIN: 12,
  reset() { this.pr = 0; this.L = rnd(55, 130); this.turn = randi(1, 2); this.tp = 0; this.stT = now(); this.boom = 0; this.boomT = 0; },
  phoneUi(p) {
    if (this.boom) return { mode: "text", icon: this.boom === p.n ? "💦" : "😆", title: this.boom === p.n ? "BOOM!" : "Phew!", hint: "" };
    return p.n === this.turn ? { mode: "text", icon: "🥤", title: "SHAKE!", hint: this.tp >= this.MIN ? "Enough — tap to pass!" : "Keep shaking…", bar: this.tp / this.MIN, bg: "#e6fff1" } : { mode: "text", icon: "👀", title: "Wait…", hint: "Your rival is shaking the bottle" };
  },
  add(p, a) {
    if (this.boom || p.n !== this.turn) return;
    const was = this.tp >= this.MIN;
    this.pr += a; this.tp += a; phoneBar(p, this.tp / this.MIN);
    if (!was && this.tp >= this.MIN) pushUi(p);
    if (this.pr >= this.L) { this.boom = p.n; this.boomT = now(); AU.sfx("pop"); AU.sfx("splash"); fx(p, "pop"); SHAKE.v = 20; FX.burst(VW / 2, 330, 180, { dir: -Math.PI / 2, spread: 1.2, speed: [300, 1100], colors: ["#7fffb0", "#c9ffe0", "#fff"], life: [0.6, 1.6], size: [3, 9], g: 900 }); pushUiAll(); }
  },
  onSample(p, dt, l) { this.add(p, Math.max(0, l - 0.35) * 9 * dt); },
  onKb(p) { if (p.kb.b) this.pass(p); else this.add(p, 3); },
  onTap(p) { if (p.phone) this.pass(p); },
  pass(p) {
    if (this.boom || p.n !== this.turn || this.tp < this.MIN) return;
    this.turn = other(this.turn); this.tp = 0; this.stT = now(); AU.sfx("swish"); pushUiAll();
  },
  update(dt, t) {
    if (this.boom) { if (t - this.boomT > 1800) finish(other(this.boom), `${H.P[this.boom].name} got soaked!`); return; }
    if ((t - this.stT) / 1000 > 8) {
      if (this.tp >= this.MIN) this.pass(H.P[this.turn]);
      else { this.boom = this.turn; this.boomT = t; AU.sfx("boo"); this.slow = true; pushUiAll(); }
    }
  },
  draw(c, t) {
    paper(c, "#eafff3"); floorBand(c, 720, "#cdeedb");
    hud(c, this.turn === 1 && !this.boom ? "holding 🥤" : "", this.turn === 2 && !this.boom ? "holding 🥤" : "", this.boom ? "" : Math.ceil(Math.max(0, 8 - (now() - this.stT) / 1000)), "seconds to pass");
    for (const n of [1, 2]) person(c, PX(n), 760, 1, H.P[n].color, { armR: this.turn === n ? 1.4 : 0.3, armL: this.turn === n ? 1.4 : 0.3, flip: n === 2, face: this.boom === n ? "x" : this.turn === n ? "o" : "smile" });
    const bx = lerp(PX(1) + 150, PX(2) - 150, this.turn === 1 ? 0 : 1), sh = this.boom ? 0 : (H.P[this.turn].l || 0) * 10;
    c.save(); c.translate(bx + Math.sin(t / 20) * sh, 560); c.rotate(Math.sin(t / 30) * sh * 0.01);
    rr(c, -45, -200, 90, 230, 30); c.fillStyle = "rgba(60,180,110,.85)"; c.fill();
    const fz = clamp(this.pr / 140, 0, 1) * 200; c.fillStyle = "rgba(255,255,255,.75)"; c.fillRect(-40, 25 - fz, 80, fz);
    rr(c, -18, -240, 36, 44, 8); c.fillStyle = this.boom ? "transparent" : "#ff4057"; c.fill();
    c.restore();
    if (this.boom) headline(c, this.slow ? `${H.P[this.boom].name} was too slow!` : "BOOM!", 230, 80, COLORS[this.boom], this.boomT);
    else bar(c, bx - 60, 620, 120, 14, this.tp / this.MIN, COLORS[this.turn]);
  },
};

/* ------------------------------------------------------------------ BABY */
const Baby = {
  id: "baby", cat: "classic", name: "Baby", icon: "👶", tag: "Rock gently", col: "#ff7ac8",
  desc: "Your phone is a crying baby. Rock it gently until it falls asleep. Too rough and it cries harder.",
  how: ["Cradle the phone flat in both hands", "Rock it gently from side to side", "Shaking or jerking wakes the baby up", "Standing still does nothing — keep a soft rhythm", "First baby to fall asleep wins"],
  phoneHow: "Cradle me and rock me gently… shhh",
  keys: "No phone: hold E / O to rock",
  reset() { this.s = { 1: { calm: 0, mood: 0, cryT: 0 }, 2: { calm: 0, mood: 0, cryT: 0 } }; this.win = 0; this.winT = 0; },
  phoneUi(p) { return { mode: "text", icon: this.s[p.n].calm > 80 ? "😪" : this.s[p.n].mood < 0 ? "😭" : "👶", title: this.s[p.n].calm > 80 ? "Almost asleep…" : "Rock me", hint: "Gentle, steady rocking", bar: this.s[p.n].calm / 100, loop: this.s[p.n].mood < 0 ? "cry" : null, every: 1300 }; },
  update(dt, t) {
    if (this.win) { if (t - this.winT > 2000) finish(this.win, `${H.P[this.win].name}'s baby is sound asleep 💤`); return; }
    for (const n of [1, 2]) {
      const s = this.s[n], p = H.P[n];
      const r = p.phone ? p.r : p.kb.b ? 70 : 0, l = p.phone ? p.l : 0;
      const prev = s.mood;
      if (r > 230 || l > 0.9) { s.calm = Math.max(0, s.calm - 30 * dt); s.mood = -1; }
      else if (r > 18) { s.calm += 9 * dt; s.mood = 1; }
      else { s.calm = Math.max(0, s.calm - 4 * dt); s.mood = 0; }
      if (s.mood !== prev) pushUi(p);
      if (s.mood < 0 && t - s.cryT > 1400) { s.cryT = t; AU.sfx("cry"); }
      phoneBar(p, s.calm / 100);
      if (s.calm >= 100) { this.win = n; this.winT = t; AU.sfx("coo"); pushUiAll(); }
    }
  },
  draw(c, t) {
    paper(c, "#fff0f7"); floorBand(c, 700, "#fbd9ea");
    hud(c, Math.round(this.s[1].calm) + "% calm", Math.round(this.s[2].calm) + "% calm", null);
    for (const n of [1, 2]) {
      const s = this.s[n], x = PX(n), p = H.P[n], rock = Math.sin(t / 400) * (s.mood > 0 ? 0.12 : 0.02), sleep = s.calm > 80 || this.win === n;
      c.save(); c.translate(x, 520); c.rotate(rock + (s.mood < 0 ? Math.sin(t / 30) * 0.05 : 0));
      c.beginPath(); c.ellipse(0, 60, 220, 90, 0, 0, Math.PI); c.fillStyle = p.color; c.fill();
      rr(c, -160, -10, 320, 90, 45); c.fillStyle = "#fff"; c.fill();
      disc(c, 0, -60, 105, "#ffe0c4");
      c.lineWidth = 7; c.strokeStyle = INK;
      if (sleep) { for (const ex of [-38, 38]) { c.beginPath(); c.arc(ex, -70, 14, 0.2, Math.PI - 0.2); c.stroke(); } text(c, "z Z", 120, -170, 44, MUTE); }
      else if (s.mood < 0) { for (const ex of [-38, 38]) { c.beginPath(); c.moveTo(ex - 16, -76); c.lineTo(ex + 16, -64); c.stroke(); } disc(c, 0, -20, 26, "#c0392b"); }
      else { disc(c, -38, -70, 10, INK); disc(c, 38, -70, 10, INK); c.beginPath(); c.arc(0, -35, 18, 0.3, Math.PI - 0.3); c.stroke(); }
      c.restore();
      bar(c, x - 200, 760, 400, 22, s.calm / 100, p.color);
      nameTag(c, n, x, 820, "center");
    }
  },
};

/* ------------------------------------------------------------------ BASEBALL */
const PITCHES = { fast: { t: "Fastball 🔥", d: 0.55 }, curve: { t: "Curveball 🌀", d: 0.78, curve: 1 }, change: { t: "Change-up 🐢", d: 0.98 } };
const Baseball = {
  id: "baseball", cat: "classic", name: "Baseball", icon: "⚾", tag: "Pitch · Swing", col: "#1fbf6a",
  desc: "Pitcher picks a pitch on the phone, batter swings at the perfect moment. 5 pitches each, then swap.",
  how: ["Pitcher: choose a pitch on your phone — it's thrown at once", "Batter: hold the phone like a bat and SWING when the ball reaches the plate", "Perfect timing = HOME RUN (2 runs), good = hit (1 run)", "5 pitches per batter, then swap · most runs wins"],
  phoneHow: "Pitcher: tap a pitch. Batter: swing when the ball arrives!",
  keys: "No phone: Q / U = pitch (fastball) or swing",
  reset() { this.half = 1; this.k = 0; this.runs = { 1: 0, 2: 0 }; this.newPitch(); },
  bat() { return this.half === 1 ? 1 : 2; },
  newPitch() { this.st = "choose"; this.stT = now(); this.ball = null; this.res = ""; this.swung = false; if (H.phase === "play") pushUiAll(); },
  phoneUi(p) {
    const batter = p.n === this.bat();
    if (batter) return { mode: "text", icon: "🏏", title: this.st === "fly" ? "SWING!" : "Batter up", hint: "Swing when the ball reaches the plate", bg: "#e6fff1" };
    if (this.st === "choose") return { mode: "grid", title: "Pick a pitch", cols: 1, buttons: Object.entries(PITCHES).map(([v, o]) => ({ t: o.t, v })) };
    return { mode: "text", icon: "⚾", title: "Pitched!", hint: this.res || "" };
  },
  onBtn(p, v) { if (this.st === "choose" && p.n !== this.bat() && PITCHES[v]) this.throw(v); },
  onKb(p) { if (p.n === this.bat()) this.onEvent(p, "swing", 800, now()); else if (this.st === "choose") this.throw("fast"); },
  throw(v) { const P = PITCHES[v]; this.st = "fly"; this.ball = { type: v, t0: now(), dur: P.d * rnd(0.95, 1.08), curve: P.curve || 0 }; AU.sfx("swish"); pushUiAll(); },
  onEvent(p, k, v, t) {
    if (k !== "swing" || p.n !== this.bat() || this.st !== "fly" || this.swung) return;
    this.swung = true;
    const off = t - (this.ball.t0 + this.ball.dur * 1000), a = Math.abs(off);
    let run = 0, txt;
    if (a < 55) { run = 2; txt = "HOME RUN!"; AU.sfx("bat"); AU.sfx("cheer"); }
    else if (a < 120) { run = 1; txt = "HIT!"; AU.sfx("bat"); }
    else if (a < 190) { txt = off < 0 ? "Foul (early)" : "Foul (late)"; AU.sfx("bat"); }
    else txt = off < 0 ? "Strike — too early" : "Strike — too late";
    this.result(run, txt);
  },
  result(run, txt) {
    const b = this.bat(); this.runs[b] += run; this.res = txt; this.st = "res"; this.stT = now(); this.k++;
    FX.say(txt, VW / 2, 300, run ? COLORS[b] : INK, 70, 1.6);
    if (run) { fx(H.P[b], "good"); FX.burst(800, 600, 60, { speed: [200, 700], colors: ["#fff", COLORS[b], "#ffd700"], life: [0.5, 1.2], size: [3, 7], g: 400 }); } else fx(H.P[b], "bad");
    pushUiAll();
  },
  update(dt, t) {
    if (this.st === "choose" && (t - this.stT) / 1000 > 6) this.throw(pick(Object.keys(PITCHES)));
    else if (this.st === "fly" && !this.swung && t > this.ball.t0 + this.ball.dur * 1000 + 250) { this.swung = true; this.result(0, "Strike — no swing"); AU.sfx("thump"); }
    else if (this.st === "res" && (t - this.stT) / 1000 > 1.8) {
      if (this.k >= 5) { if (this.half === 1) { this.half = 2; this.k = 0; FX.say("Switch sides!", VW / 2, 450, INK, 70, 1.5); } else { const a = this.runs[1], b = this.runs[2]; return finish(a === b ? 0 : a > b ? 1 : 2, `${a} – ${b} runs`); } }
      this.newPitch();
    }
  },
  draw(c, t) {
    paper(c, "#e9f7ec"); c.fillStyle = "#cfe9b8"; c.beginPath(); c.moveTo(800, 330); c.lineTo(1320, 620); c.lineTo(800, 900); c.lineTo(280, 620); c.fill();
    c.fillStyle = "#e8cfa6"; c.beginPath(); c.arc(800, 520, 70, 0, 7); c.fill();
    hud(c, `${this.runs[1]} runs`, `${this.runs[2]} runs`, `${H.P[this.bat()].name} bats`, `pitch ${Math.min(this.k + 1, 5)}/5`);
    const pit = other(this.bat());
    person(c, 800, 470, 0.55, COLORS[pit], { armR: this.st === "fly" ? 2.4 : 1.2, face: "smile" });
    person(c, 800, 870, 0.9, COLORS[this.bat()], { armR: this.swung ? 1.6 : 2.6, armL: this.swung ? 1.4 : 2.4, face: "o", band: true });
    c.fillStyle = "#fff"; c.beginPath(); c.moveTo(760, 820); c.lineTo(840, 820); c.lineTo(800, 850); c.fill();
    if (this.ball && this.st === "fly") {
      const k = clamp((now() - this.ball.t0) / (this.ball.dur * 1000), 0, 1.2), x = 800 + Math.sin(k * Math.PI) * 140 * this.ball.curve, y = lerp(470, 800, k);
      disc(c, x, y, lerp(8, 30, k), "#fff"); c.lineWidth = 2; c.strokeStyle = "#e33"; c.beginPath(); c.arc(x, y, lerp(8, 30, k) * 0.7, 0.5, 2.5); c.stroke();
    }
    if (this.st === "choose") headline(c, `${H.P[pit].name}: pick a pitch on your phone`, 250, 40, COLORS[pit]);
  },
};

/* ------------------------------------------------------------------ PRECISE TURN (rotation) */
const Rotate = {
  id: "turn", cat: "classic", name: "Precise Turn", icon: "🧭", tag: "Rotate", col: "#00c2c7",
  desc: "Lay the phone flat and turn it by exactly the angle shown — without looking. Closest wins the round.",
  how: ["Lay the phone flat on the table (or your palm)", "Turn it by the angle on the big screen — the phone won't show you", "Tap the phone to lock your answer", "Closest wins the round · 3 rounds"],
  phoneHow: "Phone flat. Turn by the angle on the big screen, then TAP to lock.",
  keys: "No phone: A / D turn, Q locks (P1) · J / L, U (P2)",
  reset() { this.r = 0; this.sc = { 1: 0, 2: 0 }; this.next(); },
  next() { this.r++; this.target = randi(4, 33) * 10; this.st = "turn"; this.stT = now(); this.s = { 1: { d0: H.P[1].d, lock: null }, 2: { d0: H.P[2].d, lock: null } }; if (H.phase === "play") pushUiAll(); },
  phoneUi(p) { const s = this.s[p.n]; return s.lock != null ? { mode: "text", icon: "🔒", title: `Locked`, hint: "Waiting…" } : { mode: "text", icon: "🧭", title: `Turn ${this.target}°`, hint: "Keep it flat · tap to lock", bg: "#e0fbfb" }; },
  onTap(p) { const s = this.s[p.n]; if (this.st !== "turn" || s.lock != null) return; s.lock = Math.abs(p.d - s.d0); AU.sfx("click"); pushUi(p); if (this.s[1].lock != null && this.s[2].lock != null) this.reveal(); },
  reveal() {
    this.st = "reveal"; this.stT = now();
    const e1 = Math.abs(this.s[1].lock - this.target), e2 = Math.abs(this.s[2].lock - this.target);
    this.rw = Math.abs(e1 - e2) < 1 ? 0 : e1 < e2 ? 1 : 2; if (this.rw) { this.sc[this.rw]++; FX.say("+1", PX(this.rw), 300, COLORS[this.rw], 70); }
    AU.sfx("chime"); pushUiAll();
  },
  update(dt, t) {
    if (this.st === "turn" && (t - this.stT) / 1000 > 20) { for (const n of [1, 2]) if (this.s[n].lock == null) this.s[n].lock = Math.abs(H.P[n].d - this.s[n].d0); this.reveal(); }
    if (this.st === "reveal" && (t - this.stT) / 1000 > 3.5) { if (this.r >= 3) { const a = this.sc[1], b = this.sc[2]; finish(a === b ? 0 : a > b ? 1 : 2, `${a} – ${b}`); } else this.next(); }
  },
  draw(c, t) {
    paper(c, "#e8fbfb");
    hud(c, this.sc[1], this.sc[2], `Round ${this.r}/3`, null);
    headline(c, `${this.target}°`, 280, 150, INK);
    for (const n of [1, 2]) {
      const x = PX(n), y = 620, s = this.s[n];
      disc(c, x, y, 170, "#fff"); c.lineWidth = 4; c.strokeStyle = SOFT; c.beginPath(); c.arc(x, y, 170, 0, 7); c.stroke();
      c.strokeStyle = "rgba(0,0,0,.25)"; c.lineWidth = 6; c.setLineDash([10, 10]);
      c.beginPath(); c.moveTo(x, y); c.arc(x, y, 150, -Math.PI / 2, -Math.PI / 2 + (this.target * Math.PI) / 180); c.closePath(); c.stroke(); c.setLineDash([]);
      if (this.st === "reveal") {
        c.fillStyle = H.P[n].color + "88"; c.beginPath(); c.moveTo(x, y); c.arc(x, y, 150, -Math.PI / 2, -Math.PI / 2 + (s.lock * Math.PI) / 180); c.closePath(); c.fill();
        text(c, `${Math.round(s.lock)}° (off by ${Math.round(Math.abs(s.lock - this.target))}°)`, x, 840, 32, H.P[n].color, "center", 900);
      } else text(c, s.lock != null ? "🔒 locked" : "turning…", x, 840, 32, H.P[n].color, "center", 900);
      phoneIcon(c, x, y, 1.3, this.st === "reveal" ? (s.lock * Math.PI) / 180 : 0, H.P[n].color);
    }
  },
};

/* ------------------------------------------------------------------ FAKE DRAW (Quick Draw with decoys) */
const FAKE_WORDS = ["FISH!", "FIRE…WORKS", "FRIES!", "FIRST!", "FIGHT?", "FIVE!", "FREEZE!", "FIRE TRUCK"];
const FakeDraw = Object.assign(Object.create(Draw), {
  id: "fakedraw", cat: "classic", name: "Fake Draw", icon: "🎯", tag: "Reflex · Listen", col: "#e67e22",
  desc: "Quick Draw with tricks: only shoot on \"FIRE!!\" — FISH, FRIES and FIREWORKS are traps.",
  how: ["Point your phone at the floor (holstered)", "Words will appear… most are FAKES", "Only on \"FIRE!!\" raise it and TAP to shoot", "Shooting on a fake or too early is a foul · best of 3"],
  phoneHow: "Point DOWN. Shoot ONLY on FIRE!! — ignore the fakes.",
  update(dt, t) {
    if (this.st === "steady") {
      this.wait -= dt;
      if (this.wait <= 0) {
        if ((this.fakesLeft == null ? (this.fakesLeft = randi(1, 3)) : this.fakesLeft) > 0) { this.fakesLeft--; this.st = "fake"; this.word = pick(FAKE_WORDS); this.fakeT = now(); AU.sfx("beep"); this.wait = rnd(1.0, 2.5); pushUiAll(); }
        else { this.fakesLeft = null; this.st = "fire"; this.fireT = now(); AU.sfx("go"); fx(H.P[1], "fire"); fx(H.P[2], "fire"); pushUiAll(); }
      }
      return;
    }
    if (this.st === "fake") { if (now() - this.fakeT > 900) { this.st = "steady"; pushUiAll(); } return; }
    Draw.update.call(this, dt, t);
  },
  onTap(p, tt) { if (this.st === "fake") return this.result(other(p.n), `${p.name} shot at "${this.word}" — foul!`); Draw.onTap.call(this, p, tt); },
  phoneUi(p) { if (this.st === "fake") return { mode: "text", icon: "❓", title: this.word, hint: "Don't shoot!" }; return Draw.phoneUi.call(this, p); },
  draw(c, t) {
    const st = this.st; if (st === "fake") this.st = "steady";
    Draw.draw.call(this, c, t); this.st = st;
    if (st === "fake") { c.fillStyle = "rgba(0,0,0,.25)"; c.fillRect(0, 130, VW, 160); text(c, this.word, VW / 2, 215, 150, "#ffe14d", "center", 900, "middle", "rgba(0,0,0,.7)"); }
  },
});
