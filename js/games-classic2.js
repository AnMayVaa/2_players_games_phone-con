/* games-classic2.js — duel minigames in the spirit of the original 28 (part 2). */
"use strict";

/* ------------------------------------------------------------------ SHAVE */
const Shave = scoreGame({
  id: "shave", name: "Shave", icon: "🪒", tag: "Stroke", col: "#7fd3ff", goal: 100, T: 25,
  desc: "Your phone is a razor. Smooth strokes shave the beard off — too rough and you nick yourself.",
  how: ["Hold the phone against your cheek like a razor", "Make smooth strokes downwards, again and again", "Jerky or violent strokes = OUCH (you lose some progress)", "First clean face wins (or the cleanest after 25 s)"],
  phoneHow: "Phone on your cheek. Smooth strokes down — don't nick yourself!",
  fmt: v => Math.round(v) + "%",
  phoneUi() { return { mode: "text", icon: "🪒", title: "Shave!", hint: "Smooth strokes on your cheek" }; },
  onEvent(p, k, v) {
    if (k !== "stroke") return;
    if (v > 2.3) { this.c[p.n] = Math.max(0, this.c[p.n] - 6); FX.say("OUCH!", PX(p.n), 300, "#ff4057", 60); AU.sfx("hit"); fx(p, "bad"); }
    else { this.add(p.n, rnd(4, 7)); AU.sfx("swish"); }
    this.c[p.n] = Math.min(100, this.c[p.n]); phoneBar(p, this.c[p.n] / 100);
  },
  init() { this.dots = Array.from({ length: 120 }, () => [rnd(-110, 110), rnd(-10, 110), Math.random()]); },
  draw(c, t) {
    paper(c, "#eaf7ff");
    hud(c, this.fmt(this.c[1]), this.fmt(this.c[2]), Math.ceil(this.left()), "seconds");
    for (const n of [1, 2]) {
      const x = PX(n), y = 470, v = this.c[n] / 100;
      disc(c, x, y, 190, "#f5cfa8");
      disc(c, x - 60, y - 40, 16, INK); disc(c, x + 60, y - 40, 16, INK);
      c.lineWidth = 8; c.strokeStyle = INK; c.beginPath(); c.arc(x, y + 50, 40, 0.3, Math.PI - 0.3); c.stroke();
      for (const [dx, dy, r] of this.dots) if (r > v) disc(c, x + dx, y + 40 + dy, 7, "#4a3826");
      if (now() - this.flash[n] < 200) disc(c, x + rnd(-80, 80), y + 80, 30, "rgba(255,255,255,.9)");
      bar(c, x - 200, 720, 400, 24, v, H.P[n].color);
      nameTag(c, n, x, 790, "center");
    }
  },
});

/* ------------------------------------------------------------------ TABLE TENNIS */
const Pong = {
  id: "pong", cat: "classic", name: "Table Tennis", icon: "🏓", tag: "Timing", col: "#ff8a3d",
  desc: "Rally by ear: swing your paddle exactly when the ball reaches you. First to 5 points.",
  how: ["Hold the phone like a paddle", "Listen: tok (hit) … tik (bounce) … then it's on your side", "SWING when the ball arrives — perfect timing makes a fast return", "Miss and your rival scores · first to 5"],
  phoneHow: "Swing when the ball reaches you! Listen for the bounce.",
  keys: "No phone: Q / U = swing",
  reset() { this.sc = { 1: 0, 2: 0 }; this.server = 1; this.serve(); },
  serve() { this.to = other(this.server); this.st = "fly"; this.dur = 1100; this.t0 = now() + 900; this.hitBy = 0; this.bounced = false; this.swung = { 1: 0, 2: 0 }; AU.sfx("whistle"); },
  arrive() { return this.t0 + this.dur; },
  onKb(p) { this.onEvent(p, "swing", 800, now()); },
  onEvent(p, k, v, t) {
    if (k !== "swing" && k !== "shake") return;
    if (this.st !== "fly" || p.n !== this.to || now() - this.swung[p.n] < 250) return;
    this.swung[p.n] = now();
    const off = t - this.arrive();
    if (off < -200) return;                           // way too early: ignore (wind-up)
    if (off > 140) return;
    const perfect = Math.abs(off) < 55;
    AU.sfx("bat"); fx(p, "tick");
    FX.say(perfect ? "SMASH!" : "Nice!", PX(p.n), 330, p.color, perfect ? 64 : 46);
    this.dur = clamp(this.dur * (perfect ? 0.85 : 0.96), 520, 1200);
    this.t0 = now(); this.to = other(p.n); this.bounced = false;
  },
  point(w) { this.sc[w]++; this.st = "point"; this.stT = now(); this.server = other(w); FX.say("+1", PX(w), 280, COLORS[w], 80); AU.sfx("right"); fx(H.P[w], "good"); fx(H.P[other(w)], "bad"); },
  update(dt, t) {
    if (this.st === "fly") {
      if (!this.bounced && t > this.t0 + this.dur * 0.6) { this.bounced = true; AU.sfx("bounce"); }
      if (t > this.arrive() + 160) this.point(other(this.to));
    } else if (this.st === "point" && t - this.stT > 1500) {
      for (const n of [1, 2]) if (this.sc[n] >= 5) return finish(n, `${this.sc[n]} – ${this.sc[other(n)]}`);
      this.serve();
    }
  },
  draw(c, t) {
    paper(c, "#fff1e6");
    hud(c, this.sc[1], this.sc[2], "first to 5", null);
    c.fillStyle = "#1f6fb2"; rr(c, 260, 420, 1080, 300, 20); c.fill();
    c.strokeStyle = "#fff"; c.lineWidth = 6; c.strokeRect(270, 430, 1060, 280); c.beginPath(); c.moveTo(270, 570); c.lineTo(1330, 570); c.stroke();
    c.fillStyle = "#333"; c.fillRect(796, 400, 8, 340);
    for (const n of [1, 2]) { const sw = now() - this.swung[n] < 200; person(c, n === 1 ? 170 : 1430, 760, 0.9, COLORS[n], { armR: sw ? 2.2 : 1.2, flip: n === 2, face: "o" }); }
    if (this.st === "fly") {
      const now2 = now(), k = clamp((now2 - this.t0) / this.dur, 0, 1.15), fromX = this.to === 2 ? 300 : 1300, toX = this.to === 2 ? 1300 : 300;
      const x = lerp(fromX, toX, k), hop = k < 0.6 ? Math.sin((k / 0.6) * Math.PI) * 150 : Math.sin(((k - 0.6) / 0.4) * Math.PI) * 90;
      disc(c, x, 560 - hop + 10, 16 - hop * 0.04, "rgba(0,0,0,.18)");
      disc(c, x, 540 - hop, 18, "#fff");
      if (now2 < this.t0) text(c, "Serve…", VW / 2, 300, 60, MUTE, "center", 900);
    }
  },
};

/* ------------------------------------------------------------------ BEACH FLAGS */
const BeachFlags = {
  id: "beachflags", cat: "classic", name: "Beach Flags", icon: "🏖️", tag: "Reflex · Run", col: "#ffd166",
  desc: "Lie still, wait for the whistle, then pump your arms to sprint to the flag. Moving early = penalty.",
  how: ["Hold the phone still until the whistle", "On the WHISTLE pump your arms (shake the phone) to run", "Moving before the whistle sets you back", "First to grab the flag wins"],
  phoneHow: "Stay still… on the WHISTLE pump your arms!",
  keys: "No phone: tap Q / U to run",
  reset() { this.s = { 1: 0, 2: 0 }; this.st = "set"; this.stT = now(); this.wait = rnd(2, 4.5); this.win = 0; this.foul = { 1: 0, 2: 0 }; },
  phoneUi() { return this.st === "run" ? { mode: "text", icon: "🏃", title: "RUN!", hint: "Pump your arms!", bg: "#fff5cc" } : { mode: "text", icon: "🤫", title: "Stay still", hint: "Wait for the whistle…" }; },
  onEvent(p, k) {
    if (k !== "shake" || this.win) return;
    if (this.st === "set") { if (!this.foul[p.n]) { this.foul[p.n] = 1; this.s[p.n] = -15; FX.say("FALSE START!", PX(p.n), 300, "#ff4057", 50); fx(p, "bad"); AU.sfx("wrong"); } return; }
    this.s[p.n] += 4; AU.tick(0.3, 900);
    if (this.s[p.n] >= 100) { this.win = p.n; this.winT = now(); AU.sfx("win"); }
  },
  update(dt, t) {
    if (this.st === "set" && (t - this.stT) / 1000 > this.wait) { this.st = "run"; AU.sfx("whistle"); sendAll({ t: "fx", k: "whistle" }); pushUiAll(); }
    for (const n of [1, 2]) phoneBar(H.P[n], this.s[n] / 100);
    if (this.win && t - this.winT > 1400) finish(this.win, `${H.P[this.win].name} grabbed the flag!`);
  },
  draw(c, t) {
    paper(c, "#bfe9ff"); c.fillStyle = "#4fb6e8"; c.fillRect(0, 140, VW, 120); floorBand(c, 260, "#f6dca0");
    hud(c, this.foul[1] ? "false start" : "", this.foul[2] ? "false start" : "", null);
    const fx0 = 1450;
    c.fillStyle = "#555"; c.fillRect(fx0, 330, 8, 420); c.fillStyle = "#ff4057"; c.beginPath(); c.moveTo(fx0 + 8, 330); c.lineTo(fx0 + 110, 365); c.lineTo(fx0 + 8, 400); c.fill();
    for (const n of [1, 2]) {
      const y = n === 1 ? 520 : 780, x = lerp(160, fx0 - 60, clamp(this.s[n], 0, 100) / 100), run = this.st === "run";
      const ph = Math.sin(t / 60) * (run ? 0.7 : 0);
      person(c, x, y, 0.8, COLORS[n], run ? { armL: 1 + ph, armR: 1 - ph, legs: [ph * 0.6, -ph * 0.6], lean: 0.2, face: "o" } : { lean: 1.4, armL: 2.8, armR: 2.8, face: "smile" });
    }
    if (this.st === "set") headline(c, "On your marks…", 330, 60, INK); else if (!this.win) headline(c, "GO GO GO!", 330, 70, "#ff4057");
    else headline(c, `${H.P[this.win].name} wins!`, 330, 70, COLORS[this.win], this.winT);
  },
};

/* ------------------------------------------------------------------ BOXING GYM */
const Boxing = scoreGame({
  id: "boxing", name: "Boxing Gym", icon: "🥊", tag: "Punch · Guard", col: "#ff4057", T: 20,
  desc: "Punch the bag as fast as you can — but when it says GUARD, hold your phone up in front of your face.",
  how: ["Hold the phone in your fist and throw punches", "Each strong punch counts", "On GUARD! stop and hold the phone up in front of your face", "Punching during GUARD or not guarding = −5 · most punches in 20 s"],
  phoneHow: "Punch! On GUARD hold the phone up in front of your face.",
  init() { this.guard = 0; this.nextG = now() + rnd(3500, 6000); this.checked = false; },
  phoneUi() { return this.guard ? { mode: "text", icon: "🛡️", title: "GUARD!", hint: "Phone up in front of your face", bg: "#ffe3e0" } : { mode: "text", icon: "🥊", title: "PUNCH!", hint: "Fast, strong punches" }; },
  onEvent(p, k) {
    if (k !== "punch") return;
    if (this.guard) { this.c[p.n] = Math.max(0, this.c[p.n] - 5); FX.say("−5", PX(p.n), 300, "#ff4057", 60); fx(p, "bad"); return; }
    this.add(p.n); AU.sfx("thump");
  },
  tick(dt, t) {
    if (!this.guard && t > this.nextG) { this.guard = t; this.checked = false; AU.sfx("whistle"); pushUiAll(); }
    if (this.guard && t - this.guard > 1400 && !this.checked) {
      this.checked = true;
      for (const n of [1, 2]) { const p = H.P[n]; if (p.phone ? !(p.us[1] > 0.6 || Math.abs(p.us[2]) < 0.5) : !p.kb.b) { this.c[n] = Math.max(0, this.c[n] - 5); FX.say("BAM! −5", PX(n), 300, "#ff4057", 54); fx(p, "hit"); } else FX.say("Blocked ✓", PX(n), 300, "#1fbf6a", 50); }
    }
    if (this.guard && t - this.guard > 1700) { this.guard = 0; this.nextG = t + rnd(3500, 6000); pushUiAll(); }
  },
  draw(c, t) {
    paper(c, "#fff0ee"); floorBand(c, 760, "#f2d8d3");
    hud(c, this.c[1], this.c[2], Math.ceil(this.left()), "seconds");
    for (const n of [1, 2]) {
      const x = PX(n), hit = now() - this.flash[n] < 160;
      c.strokeStyle = "#888"; c.lineWidth = 6; c.beginPath(); c.moveTo(x, 130); c.lineTo(x, 230); c.stroke();
      c.save(); c.translate(x, 230); c.rotate(hit ? (n === 1 ? 0.2 : -0.2) : Math.sin(t / 300) * 0.03);
      rr(c, -90, 0, 180, 380, 60); c.fillStyle = H.P[n].color; c.fill(); c.fillStyle = "rgba(255,255,255,.25)"; c.fillRect(-90, 160, 180, 26);
      c.restore();
      text(c, String(this.c[n]), x, 680, 80, INK, "center", 900);
    }
    if (this.guard) headline(c, "GUARD!", 450, 160, "#ff4057", this.guard);
  },
});

/* ------------------------------------------------------------------ EATING CONTEST */
const Eating = scoreGame({
  id: "eating", name: "Eating Contest", icon: "🥪", tag: "Tap · Rhythm", col: "#ffb400", goal: 24, T: 25,
  desc: "Gobble sandwiches! Every tap is a bite — but rush and you'll choke. Eat 6 sandwiches first.",
  how: ["Hold the phone in front of your mouth like a sandwich", "TAP the screen to take a bite (chomp with your mouth for style!)", "Biting faster than ~4 times a second makes you choke for a moment", "6 sandwiches (4 bites each) — first to finish wins"],
  phoneHow: "Tap = bite. Steady rhythm — don't choke!",
  keys: "No phone: tap Q / U (not too fast!)",
  fmt: v => (v / 4).toFixed(1) + " 🥪",
  init() { this.last = { 1: 0, 2: 0 }; this.choke = { 1: 0, 2: 0 }; },
  phoneUi() { return { mode: "text", icon: "🥪", title: "CHOMP!", hint: "Tap to bite — steady rhythm" }; },
  onTap(p) {
    const T = now();
    if (T < this.choke[p.n]) return;
    if (T - this.last[p.n] < 210) { this.choke[p.n] = T + 1200; FX.say("*cough*", PX(p.n), 300, "#ff4057", 54); AU.sfx("buzz"); fx(p, "bad"); this.last[p.n] = T; return; }
    this.last[p.n] = T; this.add(p.n); AU.sfx("chomp"); phoneBar(p, this.c[p.n] / 24);
  },
  goalMsg(n) { return `${H.P[n].name} ate 6 sandwiches!`; },
  draw(c, t) {
    paper(c, "#fff6e0");
    hud(c, this.fmt(this.c[1]), this.fmt(this.c[2]), Math.ceil(this.left()), "seconds");
    for (const n of [1, 2]) {
      const x = PX(n), bites = this.c[n] % 4, choking = now() < this.choke[n], chew = now() - this.flash[n] < 120;
      person(c, x, 820, 1.1, COLORS[n], { armR: 2.2, armL: 2.2, face: choking ? "x" : chew ? "o" : "smile" });
      c.save(); c.translate(x, 420);
      c.fillStyle = "#f4d03f"; rr(c, -100, -30, 200, 60, 20); c.fill(); c.fillStyle = "#6ab04c"; c.fillRect(-104, -6, 208, 14); c.fillStyle = "#e17055"; c.fillRect(-100, 6, 200, 10);
      c.globalCompositeOperation = "destination-out"; for (let i = 0; i < bites; i++) disc(c, 100 - i * 50, 0, 38, "#000"); c.globalCompositeOperation = "source-over";
      c.restore();
      for (let i = 0; i < 6; i++) text(c, i < Math.floor(this.c[n] / 4) ? "✔" : "🥪", x - 125 + i * 50, 120 + 70, 30, INK);
    }
  },
});

/* ------------------------------------------------------------------ PLATE SPIN */
const Plates = {
  id: "plates", cat: "classic", name: "Plate Spin", icon: "🍽️", tag: "Circle", col: "#a0e7e5",
  desc: "Keep the plates spinning! Make steady circles with the phone — too slow they wobble off, too fast they fly away.",
  how: ["Hold the phone up like a stick", "Make steady circles with your wrist to spin the plates", "Keep the speed needle in the GREEN zone", "More plates join the longer you keep it up · most points in 30 s"],
  phoneHow: "Circle your wrist steadily — keep it in the green!",
  keys: "No phone: hold E / O (in the green)",
  T: 30, LO: 120, HI: 520,
  reset() { this.s = { 1: this.mk(), 2: this.mk() }; this.t = 0; this.done = 0; },
  mk() { return { spd: 0, pl: 1, pts: 0, bad: 0, grow: 0, ang: 0 }; },
  phoneUi() { return { mode: "text", icon: "🍽️", title: "Spin!", hint: "Steady circles — stay in the green" }; },
  update(dt, t) {
    if (this.done) { if (t - this.done > 1400) { const a = this.s[1].pts, b = this.s[2].pts; finish(Math.abs(a - b) < 1 ? 0 : a > b ? 1 : 2, `${Math.round(a)} – ${Math.round(b)} points`); } return; }
    this.t += dt;
    for (const n of [1, 2]) {
      const s = this.s[n], p = H.P[n], raw = p.phone ? p.r : p.kb.b ? 300 : 0;
      s.spd = lerp(s.spd, raw, 1 - Math.pow(0.05, dt)); s.ang += s.spd * dt * 0.03;
      const ok = s.spd >= this.LO && s.spd <= this.HI;
      if (ok && s.pl > 0) { s.pts += dt * (1 + s.pl * 0.6); s.bad = 0; s.grow += dt; if (s.grow > 6 && s.pl < 5) { s.grow = 0; s.pl++; AU.sfx("chime"); FX.say("+1 plate", PX(n), 300, p.color, 44); } }
      else { s.bad += dt; if (s.bad > (s.spd > this.HI ? 1.0 : 1.6) && s.pl > 0) { s.pl--; s.bad = 0; s.grow = 0; AU.sfx("clash"); fx(p, "bad"); FX.say(s.spd > this.HI ? "Flew off!" : "Crash!", PX(n), 300, "#ff4057", 50); FX.burst(PX(n), 300, 30, { speed: [100, 400], colors: ["#fff", "#cfd8dc"], life: [0.4, 0.9], size: [3, 7], g: 900 }); } }
      if (s.pl === 0) { s.grow += dt; if (s.grow > 3) { s.pl = 1; s.grow = 0; } }
      phoneBar(p, clamp(s.spd / 700, 0, 1));
    }
    if (this.t >= this.T) this.done = t;
  },
  draw(c, t) {
    paper(c, "#e8fbfa");
    hud(c, Math.round(this.s[1].pts) + " pts", Math.round(this.s[2].pts) + " pts", Math.ceil(Math.max(0, this.T - this.t)), "seconds");
    for (const n of [1, 2]) {
      const s = this.s[n], x = PX(n), ok = s.spd >= this.LO && s.spd <= this.HI, wob = ok ? 0 : Math.sin(t / 60) * 0.25;
      c.fillStyle = "#999"; c.fillRect(x - 4, 300, 8, 450);
      for (let i = 0; i < s.pl; i++) {
        c.save(); c.translate(x, 300 - i * 34); c.rotate(wob);
        c.beginPath(); c.ellipse(0, 0, 120, 26, 0, 0, Math.PI * 2); c.fillStyle = "#fff"; c.fill(); c.lineWidth = 5; c.strokeStyle = COLORS[n]; c.stroke();
        c.fillStyle = COLORS[n]; c.beginPath(); c.ellipse(Math.cos(s.ang + i) * 80, Math.sin(s.ang + i) * 14, 12, 6, 0, 0, Math.PI * 2); c.fill();
        c.restore();
      }
      const gx = x - 200, gy = 790, gw = 400;
      rr(c, gx, gy, gw, 24, 12); c.fillStyle = "#ffd6d6"; c.fill();
      c.fillStyle = "#b9f6ca"; c.fillRect(gx + (this.LO / 700) * gw, gy, ((this.HI - this.LO) / 700) * gw, 24);
      c.fillStyle = INK; c.fillRect(gx + clamp(s.spd / 700, 0, 1) * gw - 4, gy - 10, 8, 44);
      nameTag(c, n, x, 860, "center");
    }
  },
};

/* ------------------------------------------------------------------ WIZARD */
const Wizard = {
  id: "wizard", cat: "classic", dark: true, name: "Wizard", icon: "🪄", tag: "Circle fast", col: "#6c5ce7",
  desc: "A magic beam duel. Whirl your wand (phone) in fast circles to push the beam into your rival.",
  how: ["Hold the phone like a wand", "Whirl it in fast circles — the faster, the stronger your spell", "Push the clash point all the way to your rival", "Or be ahead after 30 seconds"],
  phoneHow: "Whirl your wand in FAST circles!",
  keys: "No phone: tap Q / U rapidly",
  reset() { this.b = 0; this.pow = { 1: 0, 2: 0 }; this.kb = { 1: 0, 2: 0 }; this.t = 0; this.win = -1; this.winT = 0; },
  phoneUi() { return { mode: "text", icon: "🪄", title: "Whirl!", hint: "Fast circles!", bg: "#ece8ff" }; },
  onKb(p) { this.kb[p.n] = Math.min(900, this.kb[p.n] + 220); },
  update(dt, t) {
    if (this.win >= 0) { if (t - this.winT > 1600) finish(this.win, this.win ? `${H.P[this.win].name}'s spell wins!` : "Equal magic!"); return; }
    this.t += dt;
    for (const n of [1, 2]) { const p = H.P[n]; this.kb[n] *= Math.pow(0.3, dt); const raw = p.phone ? Math.min(p.r, 900) : this.kb[n]; this.pow[n] = lerp(this.pow[n], raw, 1 - Math.pow(0.08, dt)); }
    this.b = clamp(this.b + ((this.pow[1] - this.pow[2]) / 900) * 0.45 * dt, -1, 1);
    if (Math.floor(t / 300) !== Math.floor((t - dt * 1000) / 300)) AU.sfx("beam");
    if (Math.abs(this.b) >= 1) { this.win = this.b > 0 ? 1 : 2; this.winT = t; AU.sfx("boom"); SHAKE.v = 20; }
    else if (this.t > 30) { this.win = Math.abs(this.b) < 0.05 ? 0 : this.b > 0 ? 1 : 2; this.winT = t; }
    phoneBar(H.P[1], (this.b + 1) / 2); phoneBar(H.P[2], (1 - this.b) / 2);
  },
  draw(c, t) {
    paper(c, "#1b1640");
    for (let i = 0; i < 80; i++) disc(c, (i * 397) % VW, (i * 211) % 700, 2, `rgba(255,255,255,${0.3 + 0.3 * Math.sin(t / 500 + i)})`);
    hud(c, Math.round(this.pow[1]) + " ✨", Math.round(this.pow[2]) + " ✨", Math.ceil(Math.max(0, 30 - this.t)), "seconds");
    const x1 = 230, x2 = 1370, y = 520, mx = lerp(x2 - 60, x1 + 60, (this.b + 1) / 2);
    for (const n of [1, 2]) {
      const x = n === 1 ? x1 : x2, h = person(c, x, 800, 1, COLORS[n], { armR: 1.6, flip: n === 2, face: "o" });
      c.fillStyle = "#3d2c8d"; c.beginPath(); c.moveTo(x - 70, 545); c.lineTo(x + 70, 545); c.lineTo(x + (n === 1 ? 20 : -20), 400); c.fill();
      const hx = h.r[0], hy = h.r[1], ex = mx, col = COLORS[n];
      c.save(); c.shadowColor = col; c.shadowBlur = 40; c.strokeStyle = col; c.lineWidth = 20 + this.pow[n] / 40; c.lineCap = "round";
      c.beginPath(); c.moveTo(hx, hy); c.lineTo(ex, y); c.stroke(); c.strokeStyle = "#fff"; c.lineWidth = 6; c.stroke(); c.restore();
    }
    disc(c, mx, y, 60 + Math.sin(t / 40) * 10, "#fff");
    if (this.win > 0) headline(c, `${H.P[this.win].name} wins!`, 260, 80, COLORS[this.win], this.winT);
  },
};

/* ------------------------------------------------------------------ AIR GUITAR (rhythm) */
const Guitar = {
  id: "guitar", cat: "classic", name: "Air Guitar", icon: "🎸", tag: "Rhythm", col: "#ff4057",
  desc: "Rock out! Strum (flick the phone down) exactly on the notes as they hit the line.",
  how: ["Hold the phone like a guitar pick", "Flick it down to STRUM when a note reaches the line", "Perfect = 3, Good = 1 · random strumming earns nothing", "Highest score at the end of the song wins"],
  phoneHow: "Flick DOWN to strum on every note!",
  keys: "No phone: Q / U = strum",
  reset() {
    const bars = [[0, 2], [0, 1, 2, 3], [0, 1.5, 2, 3], [0, 0.5, 1, 2, 3], [0, 1, 2, 2.5, 3], [0, 2, 3, 3.5]];
    this.notes = []; for (let b = 0; b < 8; b++) for (const x of pick(bars)) this.notes.push(4 + b * 4 + x);
    this.hit = { 1: new Set(), 2: new Set() }; this.sc = { 1: 0, 2: 0 }; this.last = { 1: 0, 2: 0 }; this.end = 4 + 8 * 4 + 2; this.started = false;
  },
  begin() { MUSIC.start(120, "rock", 400); this.started = true; },
  stop() { MUSIC.stop(); },
  phoneUi() { return { mode: "text", icon: "🎸", title: "Strum!", hint: "Flick down on each note" }; },
  onKb(p) { this.strum(p, now()); },
  onEvent(p, k, v, t) { if (k === "swing" || k === "shake") this.strum(p, t); },
  strum(p, t) {
    if (!this.started || t - this.last[p.n] < 110) return; this.last[p.n] = t;
    let best = -1, bo = 1e9;
    this.notes.forEach((b, i) => { const o = Math.abs(t - MUSIC.at(b)); if (o < bo && !this.hit[p.n].has(i)) { bo = o; best = i; } });
    const y = p.n === 1 ? 420 : 640;
    if (best >= 0 && bo < 150) { this.hit[p.n].add(best); const pf = bo < 60; this.sc[p.n] += pf ? 3 : 1; FX.say(pf ? "PERFECT" : "good", 330, y - 60, p.color, pf ? 40 : 30, 0.7); AU.sfx("strum"); fx(p, "tick"); }
  },
  update(dt, t) {
    if (this.started && MUSIC.beatNow() > this.end) { MUSIC.stop(); const a = this.sc[1], b = this.sc[2]; finish(a === b ? 0 : a > b ? 1 : 2, `${a} – ${b} points`); }
  },
  draw(c, t) {
    paper(c, "#fff0f0");
    hud(c, this.sc[1] + " pts", this.sc[2] + " pts", "🎸", null);
    const hitX = 330, pxms = 0.45;
    for (const n of [1, 2]) {
      const y = n === 1 ? 420 : 640;
      rr(c, 120, y - 60, 1400, 120, 60); c.fillStyle = "#fff"; c.fill();
      c.lineWidth = 4; c.strokeStyle = COLORS[n]; c.stroke();
      disc(c, hitX, y, 50, COLORS[n] + "33"); c.lineWidth = 6; c.strokeStyle = COLORS[n]; c.beginPath(); c.arc(hitX, y, 50, 0, 7); c.stroke();
      text(c, `P${n}`, 170, y, 30, COLORS[n], "center", 900);
      if (this.started) this.notes.forEach((b, i) => {
        if (this.hit[n].has(i)) return;
        const x = hitX + (MUSIC.at(b) - now()) * pxms; if (x < 120 || x > 1520) return;
        disc(c, x, y, 34, COLORS[n]); disc(c, x, y, 14, "#fff");
      });
    }
    if (this.started) { const k = MUSIC.beatNow(); if (k < 4 && k > 0) headline(c, String(4 - Math.floor(k)), 820, 70, INK); }
  },
};

/* ------------------------------------------------------------------ COPY DANCE */
const CopyDance = {
  id: "copydance", cat: "classic", name: "Copy Dance", icon: "🕺", tag: "Lead · Copy", col: "#a66bff", phoneOnly: true,
  desc: "One leads a dance move, the other copies it as closely as possible. Swap, and see who copies best.",
  how: ["The LEADER dances a move with the phone for 3 seconds", "The COPIER watches, then repeats the same move", "The closer the copy (and the bigger the move), the more points", "4 turns, roles swap each turn"],
  phoneHow: "Leader: dance a move! Copier: watch, then copy it.",
  REC: 3.2,
  reset() { this.turn = 0; this.sc = { 1: 0, 2: 0 }; this.next(); },
  next() { this.turn++; this.L = this.turn % 2 ? 1 : 2; this.st = "lead"; this.stT = now() + 900; this.recL = []; this.recF = []; this.recT = 0; this.last = null; if (H.phase === "play") pushUiAll(); },
  phoneUi(p) {
    const lead = p.n === this.L;
    if (this.st === "lead") return lead ? { mode: "text", icon: "🕺", title: "DANCE!", hint: "Make a big move!", bg: "#f1e8ff" } : { mode: "text", icon: "👀", title: "Watch!", hint: "Remember the move" };
    if (this.st === "copy") return lead ? { mode: "text", icon: "👀", title: "Watch", hint: "Your rival is copying" } : { mode: "text", icon: "🪞", title: "COPY!", hint: "Same move, same timing", bg: "#f1e8ff" };
    return { mode: "text", icon: "📊", title: this.last != null ? `${this.last}%` : "", hint: "match" };
  },
  update(dt, t) {
    const el = (t - this.stT) / 1000;
    if (el < 0) return;
    if (this.st === "lead" || this.st === "copy") {
      if (t - this.recT > 50) { this.recT = t; const who = this.st === "lead" ? this.L : other(this.L); (this.st === "lead" ? this.recL : this.recF).push(H.P[who].us.slice()); }
      if (el > this.REC) {
        if (this.st === "lead") { this.st = "copy"; this.stT = t + 700; AU.sfx("beep"); pushUiAll(); }
        else this.score();
      }
    } else if (this.st === "score" && el > 2.8) { if (this.turn >= 4) { const a = this.sc[1], b = this.sc[2]; finish(a === b ? 0 : a > b ? 1 : 2, `${a} – ${b} points`); } else this.next(); }
  },
  score() {
    const A = this.recL, B = this.recF; let best = -1;
    for (let lag = -8; lag <= 8; lag++) { let s = 0, k = 0; for (let i = 0; i < A.length; i++) { const j = i + lag; if (j < 0 || j >= B.length) continue; s += A[i][0] * B[j][0] + A[i][1] * B[j][1] + A[i][2] * B[j][2]; k++; } if (k > 10) best = Math.max(best, s / k); }
    const mean = [0, 1, 2].map(i => A.reduce((s, v) => s + v[i], 0) / (A.length || 1));
    const range = A.reduce((m, v) => Math.max(m, Math.hypot(v[0] - mean[0], v[1] - mean[1], v[2] - mean[2])), 0);
    const pts = Math.round(clamp((best - 0.4) / 0.6, 0, 1) * 100 * clamp(range / 0.7, 0.25, 1));
    const F = other(this.L); this.sc[F] += pts; this.last = pts;
    this.st = "score"; this.stT = now(); FX.say(`${pts}%`, PX(F), 320, COLORS[F], 90, 1.8); AU.sfx(pts > 60 ? "cheer" : "chime"); pushUiAll();
  },
  draw(c, t) {
    paper(c, "#f4edff"); floorBand(c, 720, "#e6dafb");
    hud(c, this.sc[1] + " pts", this.sc[2] + " pts", `Turn ${this.turn}/4`, `${H.P[this.L].name} leads`);
    for (const n of [1, 2]) {
      const p = H.P[n], u = p.us, act = (this.st === "lead" && n === this.L) || (this.st === "copy" && n !== this.L);
      person(c, PX(n), 760, 1.05, p.color, { armR: 1.5 + u[1] * 1.3, armL: 1.5 - u[0] * 1.3, lean: u[0] * 0.25, flip: n === 2, face: act ? "o" : "smile" });
      if (act) text(c, this.st === "lead" ? "LEAD" : "COPY", PX(n), 230, 60, p.color, "center", 900);
    }
    rr(c, 560, 300, 480, 200, 30); c.fillStyle = "#fff"; c.fill();
    const plot = (rec, col, y0) => { c.strokeStyle = col; c.lineWidth = 5; c.beginPath(); rec.forEach((v, i) => { const x = 580 + i * 6.6, y = y0 - v[1] * 70 - v[0] * 20; i ? c.lineTo(x, y) : c.moveTo(x, y); }); c.stroke(); };
    plot(this.recL, COLORS[this.L], 400); plot(this.recF, COLORS[other(this.L)], 400);
    text(c, "move trace", 800, 480, 20, MUTE, "center", 800);
    if ((this.st === "lead" || this.st === "copy") && now() < this.stT) headline(c, this.st === "lead" ? "Leader, get ready…" : "Copier, your turn…", 560, 50, INK);
  },
};

/* ------------------------------------------------------------------ DANCE OFF (poses on the beat) */
const POSE_ICON = { up: "⬆️", down: "⬇️", left: "⬅️", right: "➡️" };
const DanceOff = {
  id: "danceoff", cat: "classic", name: "Dance Off", icon: "💃", tag: "Rhythm · Pose", col: "#ff7ac8",
  desc: "Strike the pose on the beat! Point the phone UP, DOWN, LEFT or RIGHT exactly when the arrow lands.",
  how: ["Hold the phone in front of you", "Arrows scroll in — when one hits the line, be in that pose", "UP / DOWN = point the phone's top up or down · LEFT / RIGHT = tip it sideways", "+1 for every pose on the beat · highest score wins"],
  phoneHow: "Point the phone where the arrow says, on the beat!",
  keys: "No phone: W A S D (P1) · I J K L (P2)",
  reset() { this.seq = []; let last = ""; for (let i = 0; i < 16; i++) { let d; do d = pick(["up", "down", "left", "right"]); while (d === last); last = d; this.seq.push({ b: 4 + i * 2, d, res: {} }); } this.sc = { 1: 0, 2: 0 }; this.started = false; },
  begin() { MUSIC.start(110, "pop", 400); this.started = true; },
  stop() { MUSIC.stop(); },
  phoneUi() { return { mode: "text", icon: "💃", title: "Dance!", hint: "Pose on the beat" }; },
  update(dt, t) {
    if (!this.started) return;
    for (const s of this.seq) if (!s.done && now() > MUSIC.at(s.b) + 150) {
      s.done = true;
      for (const n of [1, 2]) { const ok = S.pose(H.P[n]) === s.d; s.res[n] = ok; if (ok) { this.sc[n]++; FX.say("✓", PX(n), 360, COLORS[n], 70, 0.6); } }
      AU.sfx("tick");
    }
    if (MUSIC.beatNow() > 4 + 32 + 2) { MUSIC.stop(); const a = this.sc[1], b = this.sc[2]; finish(a === b ? 0 : a > b ? 1 : 2, `${a} – ${b} poses`); }
  },
  draw(c, t) {
    paper(c, "#fff0f8"); floorBand(c, 740, "#fbd9ea");
    hud(c, this.sc[1], this.sc[2], "💃", null);
    const lineX = 800, y = 230;
    c.strokeStyle = INK; c.lineWidth = 6; c.beginPath(); c.moveTo(lineX, y - 70); c.lineTo(lineX, y + 70); c.stroke();
    if (this.started) for (const s of this.seq) {
      const x = lineX + (MUSIC.at(s.b) - now()) * 0.35; if (x < 100 || x > 1500) continue;
      disc(c, x, y, 55, s.done ? "#eee" : "#fff"); text(c, POSE_ICON[s.d], x, y + 4, 60, INK);
    }
    for (const n of [1, 2]) {
      const ps = S.pose(H.P[n]), arms = { up: [2.9, 2.9], down: [0.1, 0.1], left: [2.6, 0.4], right: [0.4, 2.6], flat: [1.4, 1.4], face: [1.4, 1.4], mid: [1.2, 1.2] }[ps];
      const k = Math.sin(t / (MUSIC.per / Math.PI || 160)) * 0.08;
      person(c, PX(n), 780, 1.05, COLORS[n], { armL: arms[0], armR: arms[1], lean: k, face: "smile" });
      text(c, POSE_ICON[ps] || "·", PX(n), 420, 50, INK);
    }
  },
};

/* ------------------------------------------------------------------ GORILLA */
const Gorilla = scoreGame({
  id: "gorilla", name: "Gorilla", icon: "🦍", tag: "Pound · Rhythm", col: "#6d4c41", T: 15,
  desc: "Impress the gorilla by pounding your chest! Fast is good, a steady rhythm is even better.",
  how: ["Hold the phone against your chest", "Pound your chest with it — hard and fast", "Keeping a steady rhythm builds a combo bonus", "The gorilla loves whoever has more points after 15 s"],
  phoneHow: "Pound your chest! Keep a steady rhythm for combos.",
  fmt: v => Math.round(v) + " ❤",
  init() { this.lastT = { 1: 0, 2: 0 }; this.iv = { 1: 0, 2: 0 }; this.combo = { 1: 0, 2: 0 }; },
  phoneUi() { return { mode: "text", icon: "🦍", title: "POUND!", hint: "Steady rhythm = combo" }; },
  onEvent(p, k, v, t) {
    if (k !== "shake") return;
    const n = p.n, iv = t - this.lastT[n]; this.lastT[n] = t;
    if (this.iv[n] && Math.abs(iv - this.iv[n]) < this.iv[n] * 0.22) this.combo[n] = Math.min(10, this.combo[n] + 1); else this.combo[n] = 0;
    this.iv[n] = iv;
    this.add(n, 1 + this.combo[n] * 0.3); AU.sfx("thump");
    if (this.combo[n] >= 3) FX.say(`combo x${this.combo[n]}`, PX(n), 320, p.color, 36, 0.6);
  },
  draw(c, t) {
    paper(c, "#f1ffe9"); floorBand(c, 720, "#d4efc2");
    hud(c, this.fmt(this.c[1]), this.fmt(this.c[2]), Math.ceil(this.left()), "seconds");
    const lead = this.c[1] === this.c[2] ? 0 : this.c[1] > this.c[2] ? 1 : 2, look = lead === 1 ? -30 : lead === 2 ? 30 : 0;
    c.save(); c.translate(800, 560);
    disc(c, 0, 0, 170, "#4e342e"); disc(c, 0, -180, 100, "#4e342e"); disc(c, look, -170, 70, "#8d6e63");
    disc(c, look - 25, -195, 11, INK); disc(c, look + 25, -195, 11, INK);
    c.fillStyle = "#ff7ac8"; c.beginPath(); c.moveTo(-40, -280); c.lineTo(0, -255); c.lineTo(40, -280); c.lineTo(40, -230); c.lineTo(0, -255); c.lineTo(-40, -230); c.fill();
    c.restore();
    if (lead) for (let i = 0; i < 3; i++) text(c, "❤", 800 + (lead === 1 ? -1 : 1) * (120 + ((t / 5 + i * 80) % 240)), 360 - i * 30, 40, "#ff4057");
    for (const n of [1, 2]) { const hit = now() - this.flash[n] < 120; person(c, n === 1 ? 260 : 1340, 780, 0.95, COLORS[n], { armL: hit ? 2.4 : 1.6, armR: hit ? 2.4 : 1.6, face: "o" }); }
  },
});

/* ------------------------------------------------------------------ RUNWAY */
const Runway = {
  id: "runway", cat: "classic", dark: true, name: "Runway", icon: "👠", tag: "Walk · Pose", col: "#2d3436",
  desc: "Strut down the catwalk with style, then freeze in your best pose when the cameras flash.",
  how: ["Hold the phone and walk on the spot with a bounce", "Each confident step scores (up to 12 per walk)", "On POSE! freeze instantly and hold perfectly still", "3 walks · steps + pose stillness = your score"],
  phoneHow: "Strut with a bounce! On POSE freeze completely.",
  keys: "No phone: tap Q / U to step, then don't press anything",
  reset() { this.r = 0; this.sc = { 1: 0, 2: 0 }; this.next(); },
  next() { this.r++; this.st = "walk"; this.stT = now(); this.steps = { 1: 0, 2: 0 }; this.mot = { 1: 0, 2: 0 }; this.armed = { 1: true, 2: true }; this.lastStep = { 1: 0, 2: 0 }; if (H.phase === "play") pushUiAll(); },
  phoneUi() { return this.st === "pose" ? { mode: "text", icon: "📸", title: "POSE!", hint: "Freeze!", bg: "#fff" } : { mode: "text", icon: "👠", title: "Strut!", hint: "Walk with a bounce" }; },
  step(n) { if (this.st !== "walk" || now() - this.lastStep[n] < 250) return; this.lastStep[n] = now(); this.steps[n]++; AU.tick(0.4, 1500); },
  onKb(p) { this.step(p.n); },
  onSample(p) {
    const vmax = p.vz[1];
    if (this.armed[p.n] && vmax > 0.22) { this.armed[p.n] = false; this.step(p.n); } else if (vmax < 0.08) this.armed[p.n] = true;
    if (this.st === "pose" && now() - this.stT > 300) this.mot[p.n] += p.r * 0.02 + p.l * 30;
  },
  update(dt, t) {
    const el = (t - this.stT) / 1000;
    if (this.st === "walk" && el > 4.5) { this.st = "pose"; this.stT = t; AU.sfx("shot"); pushUiAll(); }
    else if (this.st === "pose") {
      if (Math.random() < 0.15) FX.add({ x: rnd(100, 1500), y: rnd(150, 400), life: 0.2, size: rnd(20, 50), color: "#fff" });
      for (const n of [1, 2]) if (!H.P[n].phone && now() - (H.P[n].kbT || 0) < 300 && el > 0.3) this.mot[n] += 5;
      if (el > 2.3) {
        for (const n of [1, 2]) { const pose = Math.round(clamp(20 - this.mot[n] / 4, 0, 20)), pts = Math.min(12, this.steps[n]) + pose; this.sc[n] += pts; FX.say(`+${pts}`, PX(n), 300, COLORS[n], 70, 1.6); }
        this.st = "score"; this.stT = t; AU.sfx("cheer"); pushUiAll();
      }
    } else if (this.st === "score" && el > 2.2) { if (this.r >= 3) { const a = this.sc[1], b = this.sc[2]; finish(a === b ? 0 : a > b ? 1 : 2, `${a} – ${b} style points`); } else this.next(); }
  },
  draw(c, t) {
    paper(c, "#202124");
    c.fillStyle = "#3c3c3c"; c.beginPath(); c.moveTo(620, 160); c.lineTo(980, 160); c.lineTo(1300, 900); c.lineTo(300, 900); c.fill();
    hud(c, this.sc[1], this.sc[2], `Walk ${this.r}/3`, this.st === "walk" ? `${H.P[1].name} ${this.steps[1]} · ${this.steps[2]} ${H.P[2].name} steps` : "");
    const k = this.st === "walk" ? clamp((now() - this.stT) / 4500, 0, 1) : 1;
    for (const n of [1, 2]) {
      const x = lerp(n === 1 ? 740 : 860, n === 1 ? 600 : 1000, k), y = lerp(330, 830, k), s = lerp(0.45, 1.1, k), sw = this.st === "walk" ? Math.sin(t / 150 + n) : 0;
      person(c, x, y, s, COLORS[n], this.st === "walk" ? { armL: 0.4 + sw * 0.3, armR: 0.4 - sw * 0.3, legs: [sw * 0.3, -sw * 0.3], face: "smile" } : { armL: n === 1 ? 2.8 : 0.6, armR: n === 1 ? 0.9 : 2.7, lean: n === 1 ? -0.1 : 0.1, face: "smile" });
    }
    if (this.st === "pose") headline(c, "POSE!", 250, 140, "#fff", this.stT);
  },
};
