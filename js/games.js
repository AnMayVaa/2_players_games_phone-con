/* games.js — every game is one object in GAMES[].
   Interface: id, name, icon, tag, desc, how[], phoneHow, keys, bg, options?,
              reset(), begin?(), update(dt,t), draw(ctx,t), onSample?(p,dt,lin,gyro), onTap?(p,t), phoneUi(p), stop?()
   Logical canvas: 1600 x 900. Call finish(winner|0, detail) once the match is decided. */
"use strict";

const easeOut = k => 1 - Math.pow(1 - clamp(k, 0, 1), 3);

/* =====================================================================
   1. CHAMPAGNE POP — shake to build pressure, first cork out wins
   ===================================================================== */
const Champagne = {
  id: "champ", name: "Champagne Pop", icon: "🍾", tag: "Shake", bg: "#1a0f2e",
  desc: "Shake your phone like a bottle of champagne. First cork to pop wins!",
  how: [
    "Grip your phone tight (a wrist strap or case helps!)",
    "When GO! appears, SHAKE it as hard as you can",
    "Pressure leaks out when you stop — keep shaking",
    "First cork to blow wins",
  ],
  phoneHow: "Grip tight. When GO! appears — SHAKE!",
  keys: "No phone: tap Q (P1) / U (P2) rapidly",
  mk() { return { pr: 0, sh: 0, popped: false, cx: 0, cy: 0, cvx: 0, cvy: 0, ca: 0, ms: 0 }; },
  reset() { this.s = { 1: this.mk(), 2: this.mk() }; this.win = 0; this.winT = 0; },
  phoneUi(p) { return { mode: "text", icon: "🍾", title: "SHAKE!", hint: "Shake hard to build pressure", bar: this.s[p.n].pr / 100 }; },
  onSample(p, dt, l) {
    if (this.win) return;
    const s = this.s[p.n], e = Math.max(0, l - 0.35);
    s.pr += e * 12 * dt;
    s.sh = Math.max(s.sh, Math.min(1, e / 1.6));
  },
  bx(n) { return n === 1 ? 540 : 1060; },
  update(dt, t) {
    for (const n of [1, 2]) {
      const s = this.s[n], p = H.P[n];
      if (!this.win) {
        s.pr = Math.max(0, s.pr - 2.5 * dt);
        const ms = Math.floor(s.pr / 25);
        if (ms > s.ms) { s.ms = ms; fx(p, "buzz", { ms: 40 + ms * 25 }); }
        if (ms < s.ms - 1) s.ms = ms + 1;
        phoneBar(p, s.pr / 100);
      }
      s.sh = Math.max(0, s.sh - dt * 2.2);
      if (s.popped) { s.cvy += 1100 * dt; s.cx += s.cvx * dt; s.cy += s.cvy * dt; s.ca += dt * 16; }
      if (s.popped && t - this.winT < 900 && Math.random() < 0.8)
        FX.burst(this.bx(n), 255, 4, { dir: -Math.PI / 2, spread: 0.35, speed: [400, 900], colors: ["#fff6d5", "#ffe08a", "#fff"], life: [0.5, 1.2], size: [3, 7], g: 900 });
    }
    if (!this.win) { for (const n of [1, 2]) if (this.s[n].pr >= 100) { this.pop(n); break; } }
    else if (t - this.winT > 2000) finish(this.win, `${H.P[this.win].name}'s cork flew first!`);
  },
  pop(n) {
    const s = this.s[n];
    s.popped = true; s.pr = 100; s.cvy = -1500; s.cvx = rnd(-160, 160);
    this.win = n; this.winT = now();
    FX.burst(this.bx(n), 255, 160, { dir: -Math.PI / 2, spread: 0.7, speed: [300, 1200], colors: ["#fff6d5", "#ffe08a", "#ffffff", "#f7c948"], life: [0.6, 1.7], size: [3, 9], g: 900, drag: 0.5 });
    SHAKE.v = 20; AU.sfx("pop");
    fx(H.P[n], "pop"); fx(H.P[other(n)], "buzz", { ms: 300 });
  },
  draw(c, t) {
    const g = c.createLinearGradient(0, 0, 0, VH); g.addColorStop(0, "#2a1450"); g.addColorStop(1, "#0d0718");
    c.fillStyle = g; c.fillRect(0, 0, VW, VH);
    for (let i = 0; i < 60; i++) {            // twinkles
      const x = (i * 263) % VW, y = (i * 137) % 700, a = 0.3 + 0.3 * Math.sin(t / 400 + i);
      c.fillStyle = `rgba(255,230,160,${a})`; c.fillRect(x, y, 3, 3);
    }
    c.fillStyle = "#3b1f1a"; c.fillRect(0, 820, VW, 80);            // table
    c.fillStyle = "#5a3125"; c.fillRect(0, 815, VW, 10);
    for (const n of [1, 2]) this.bottle(c, n, t);
    text(c, H.phase === "play" && !this.win ? (Math.floor(t / 300) % 2 ? "SHAKE! SHAKE! SHAKE!" : "SHAKE!  SHAKE!  SHAKE!") : "Champagne Pop",
      VW / 2, 90, 48, "#ffe08a", "center", 900, "middle", "rgba(0,0,0,.6)");
  },
  bottle(c, n, t) {
    const s = this.s[n], x = this.bx(n), p = H.P[n], side = n === 1 ? -1 : 1;
    // gauge
    const gx = x + side * 175, gy = 330, gh = 470;
    rr(c, gx - 18, gy, 36, gh, 18); c.fillStyle = "rgba(255,255,255,.1)"; c.fill();
    const v = clamp(s.pr / 100, 0, 1), fh = gh * v;
    const gg = c.createLinearGradient(0, gy + gh, 0, gy); gg.addColorStop(0, "#2ecc71"); gg.addColorStop(0.6, "#f5b041"); gg.addColorStop(1, "#ff4d4d");
    if (fh > 2) { rr(c, gx - 18, gy + gh - fh, 36, fh, 18); c.fillStyle = gg; c.fill(); }
    text(c, Math.round(s.pr) + "%", gx, gy - 28, 30, "#fff", "center", 900);
    nameTag(c, n, x, 880 - 24, "center");
    // bottle (origin bottom-centre at the table)
    c.save(); c.translate(x, 820);
    const sh = s.popped ? 0 : s.sh;
    c.rotate(Math.sin(t / 23) * sh * 0.08); c.translate(Math.sin(t / 15) * sh * 12, 0);
    const body = () => {
      c.beginPath(); c.moveTo(-75, -12); c.quadraticCurveTo(-75, 0, -62, 0); c.lineTo(62, 0); c.quadraticCurveTo(75, 0, 75, -12);
      c.lineTo(75, -360); c.bezierCurveTo(75, -430, 26, -440, 26, -500); c.lineTo(26, -565); c.lineTo(-26, -565); c.lineTo(-26, -500);
      c.bezierCurveTo(-26, -440, -75, -430, -75, -360); c.closePath();
    };
    body();
    const bg = c.createLinearGradient(-75, 0, 75, 0);
    bg.addColorStop(0, "#082a17"); bg.addColorStop(0.35, "#1c6e40"); bg.addColorStop(0.5, "#2c9358"); bg.addColorStop(1, "#06200f");
    c.fillStyle = bg; c.fill();
    c.save(); body(); c.clip();
    const lvl = -250, foamTop = lvl - v * 320;
    c.fillStyle = "rgba(247,201,72,.75)"; c.fillRect(-80, lvl, 160, 260);
    c.fillStyle = "rgba(255,248,220,.55)"; c.fillRect(-80, foamTop, 160, lvl - foamTop + 4);
    for (let i = 0; i < 26; i++) {
      const bx = ((i * 37) % 130) - 65, by = -((t * 0.06 * (1 + sh * 4) + i * 53) % 250);
      c.fillStyle = "rgba(255,255,255,.7)"; c.beginPath(); c.arc(bx, by, 2 + (i % 3), 0, 7); c.fill();
    }
    c.restore();
    c.strokeStyle = "rgba(255,255,255,.25)"; c.lineWidth = 6; c.beginPath(); c.moveTo(-52, -40); c.lineTo(-52, -340); c.stroke();
    rr(c, -62, -235, 124, 95, 12); c.fillStyle = p.color; c.fill();
    text(c, "P" + n, 0, -200, 40, "#fff", "center", 900);
    text(c, "BRUT", 0, -160, 18, "rgba(255,255,255,.85)", "center", 800);
    c.fillStyle = "#d4a937"; c.fillRect(-28, -565, 56, 70);         // foil
    if (!s.popped) {
      const push = Math.max(0, (s.pr - 75) / 25) * 16 + Math.sin(t / 18) * sh * 3;
      rr(c, -22, -618 - push, 44, 58, 9); c.fillStyle = "#c8955b"; c.fill();
      c.fillStyle = "#a4733f"; c.fillRect(-22, -585 - push, 44, 5);
    }
    c.restore();
    if (s.popped) {
      c.save(); c.translate(x + s.cx, 820 - 590 + s.cy); c.rotate(s.ca);
      rr(c, -22, -29, 44, 58, 9); c.fillStyle = "#c8955b"; c.fill(); c.restore();
    }
  },
};

/* =====================================================================
   2. SABER DUEL — swing to strike, hold upright to block, last one standing
   ===================================================================== */
const STARS = Array.from({ length: 140 }, (_, i) => [(i * 911) % VW, (i * 577) % 640, (i % 3) + 1]);
const Saber = {
  id: "saber", name: "Saber Duel", icon: "⚔️", tag: "Swing · Block", bg: "#05060f",
  desc: "Your phone is a light saber. Swing to strike, hold it upright to block. Last one standing wins.",
  how: [
    "Hold the phone like a saber hilt — top of the phone pointing up",
    "SWING fast to attack; the strike lands a split second later",
    "Hold the phone UPRIGHT and still to BLOCK it",
    "Blocking drains stamina — run out and your guard breaks",
    "A blocked attacker is stunned. Bring your rival to 0 HP!",
  ],
  phoneHow: "Swing to attack · hold upright & still to block",
  keys: "No phone: Q / U attack · hold E / O to block",
  mk() { return { hp: 100, hpS: 100, st: 100, broken: 0, cd: 0, stun: 0, blk: false, flash: 0, swingT: -9999, ang: 0.6 }; },
  reset() { this.s = { 1: this.mk(), 2: this.mk() }; this.atk = []; this.over = 0; this.overT = 0; this.msgs = []; },
  phoneUi() { return { mode: "saber", hint: "Swing to attack · hold upright & still to block" }; },
  x(n) { return n === 1 ? 520 : 1080; },
  onSample(p, dt, l, r) {
    if (this.over) return;
    const s = this.s[p.n];
    if (r > 420 && s.cd <= 0 && s.stun <= 0) this.attack(p.n, r);
  },
  attack(n, r) {
    const s = this.s[n];
    s.cd = 0.65; s.swingT = now();
    const o = this.atk.find(a => a.from === other(n) && a.t < 0.2);
    if (o) { this.atk = this.atk.filter(a => a !== o); this.clash(); return; }
    this.atk.push({ from: n, to: other(n), t: 0, dur: 0.3, dmg: Math.round(clamp(10 + (r - 420) / 40, 10, 25)) });
    AU.sfx("swish");
  },
  clash() {
    FX.burst(800, 420, 70, { speed: [200, 700], colors: ["#fff", "#fffbe0", COLORS[1], COLORS[2]], life: [0.3, 0.8], size: [2, 5], glow: 12, drag: 0.8 });
    AU.sfx("clash"); fx(H.P[1], "clash"); fx(H.P[2], "clash"); SHAKE.v = 10;
    this.s[1].cd = this.s[2].cd = 0.45;
    this.say("CLASH!", 800, 300, "#fff");
  },
  say(txt, x, y, col) { this.msgs.push({ txt, x, y, col, t: now() }); },
  update(dt, t) {
    for (const n of [1, 2]) {
      const s = this.s[n], p = H.P[n];
      s.cd -= dt; s.stun -= dt; s.broken -= dt; s.flash -= dt;
      const up = S.up(p), still = p.phone ? p.r < 260 : true;
      s.blk = !this.over && s.hp > 0 && s.stun <= 0 && s.broken <= 0 && s.st > 0 && up > 0.72 && still && t - s.swingT > 250;
      if (s.blk) {
        s.st -= 20 * dt;
        if (s.st <= 0) { s.st = 0; s.broken = 1.8; s.blk = false; this.say("GUARD BROKEN", this.x(n), 220, "#ffb020"); fx(p, "buzz", { ms: 260 }); AU.sfx("buzz"); }
      } else s.st = Math.min(100, s.st + (s.broken > 0 ? 8 : 16) * dt);
      s.hpS = lerp(s.hpS, s.hp, 1 - Math.pow(0.002, dt));
      let target;
      if (s.blk) target = 0.15;
      else if (p.phone) { const m = Math.hypot(p.us[0], p.us[1], p.us[2]) || 1; target = clamp(Math.acos(clamp(p.us[1] / m, -1, 1)), 0.1, 2.3); }
      else target = 0.9;
      s.ang = lerp(s.ang, target, 0.3);
    }
    for (const a of this.atk) { a.t += dt; if (a.t >= a.dur && !a.done) { a.done = true; this.land(a); } }
    this.atk = this.atk.filter(a => !a.done);
    this.msgs = this.msgs.filter(m => t - m.t < 1000);
    if (this.over && t - this.overT > 1600) finish(this.over, `${H.P[this.over].name} is the last one standing`);
  },
  land(a) {
    const d = this.s[a.to], at = this.s[a.from], x = this.x(a.to), f = a.to === 1 ? 1 : -1;
    if (this.over) return;
    if (d.blk) {
      at.stun = 0.8; d.st = Math.max(0, d.st - 12);
      FX.burst(x + f * 80, 400, 45, { speed: [150, 600], colors: ["#fff", "#cdefff", H.P[a.to].color], life: [0.2, 0.6], size: [2, 4], glow: 10, drag: 0.8 });
      AU.sfx("clash"); fx(H.P[a.to], "clash"); fx(H.P[a.from], "buzz", { ms: 200 });
      this.say("BLOCKED!", x, 220, "#9be7ff"); SHAKE.v = 6;
    } else {
      d.hp = Math.max(0, d.hp - a.dmg); d.flash = 0.35;
      FX.burst(x, 470, 40, { speed: [100, 500], colors: [H.P[a.from].color, "#fff", "#ffd27a"], life: [0.3, 0.9], size: [2, 6], glow: 14, g: 400 });
      AU.sfx("hit"); fx(H.P[a.to], "hit"); fx(H.P[a.from], "tick");
      this.say("-" + a.dmg, x, 300, "#ff7b7b"); SHAKE.v = 14;
      if (d.hp <= 0) { this.over = a.from; this.overT = now(); this.say("K.O.!", 800, 230, "#fff"); }
    }
  },
  draw(c, t) {
    const g = c.createLinearGradient(0, 0, 0, VH); g.addColorStop(0, "#05060f"); g.addColorStop(1, "#141a3a");
    c.fillStyle = g; c.fillRect(0, 0, VW, VH);
    for (const [x, y, z] of STARS) { c.fillStyle = `rgba(255,255,255,${0.25 + 0.2 * z * (0.6 + 0.4 * Math.sin(t / 700 + x))})`; c.fillRect(x, y, z, z); }
    const fl = c.createLinearGradient(0, 720, 0, VH); fl.addColorStop(0, "#2a3570"); fl.addColorStop(1, "#0b0f25");
    c.fillStyle = fl; c.fillRect(0, 720, VW, 180);
    c.strokeStyle = "rgba(120,160,255,.35)"; c.lineWidth = 2; c.beginPath(); c.moveTo(0, 720); c.lineTo(VW, 720); c.stroke();
    for (const n of [1, 2]) this.fighter(c, n, t);
    for (const a of this.atk) {                    // travelling slash
      const xa = this.x(a.from), xd = this.x(a.to), k = a.t / a.dur, x = lerp(xa, xd, k), f = a.from === 1 ? 1 : -1, col = H.P[a.from].color;
      c.save(); c.shadowColor = col; c.shadowBlur = 30; c.strokeStyle = col; c.lineWidth = 14; c.lineCap = "round";
      c.beginPath(); c.arc(x - f * 60, 450, 120, -0.9 * f + (f < 0 ? Math.PI : 0), 0.9 * f + (f < 0 ? Math.PI : 0), f < 0); c.stroke();
      c.strokeStyle = "#fff"; c.lineWidth = 5; c.stroke(); c.restore();
    }
    // HUD
    for (const n of [1, 2]) {
      const s = this.s[n], p = H.P[n], L = n === 1, x = L ? 60 : 940;
      nameTag(c, n, L ? 60 : VW - 60, 70, L ? "left" : "right");
      bar(c, x, 92, 600, 30, s.hpS / 100, "rgba(255,255,255,.35)", !L);
      bar(c, x, 92, 600, 30, s.hp / 100, p.color, !L, "rgba(0,0,0,0)");
      text(c, Math.ceil(s.hp) + " HP", L ? x + 12 : x + 588, 107, 20, "#fff", L ? "left" : "right", 900);
      bar(c, x, 130, 600, 12, s.st / 100, s.broken > 0 ? "#ff8c1a" : "#f5d76e", !L);
      const lab = s.hp <= 0 ? "DOWN" : s.broken > 0 ? "GUARD BROKEN" : s.stun > 0 ? "STUNNED" : s.blk ? "🛡 BLOCKING" : s.cd > 0 ? "…" : "READY";
      text(c, lab, L ? x : x + 600, 166, 22, s.blk ? "#9be7ff" : "#cfd3ff", L ? "left" : "right", 800);
    }
    for (const m of this.msgs) {
      const k = (t - m.t) / 1000;
      c.save(); c.globalAlpha = 1 - k; text(c, m.txt, m.x, m.y - k * 60, 54, m.col, "center", 900, "middle", "rgba(0,0,0,.7)"); c.restore();
    }
  },
  fighter(c, n, t) {
    const s = this.s[n], p = H.P[n], x = this.x(n), f = n === 1 ? 1 : -1, col = p.color;
    c.save();
    if (s.hp <= 0) { c.translate(x, 715); c.rotate(-f * 1.35); c.translate(-x, -715); }
    const body = s.flash > 0 ? "#ffffff" : "#d7dcff";
    c.strokeStyle = body; c.lineWidth = 16; c.lineCap = "round"; c.lineJoin = "round";
    c.beginPath(); c.moveTo(x - 38 * f, 715); c.lineTo(x, 600); c.lineTo(x + 34 * f, 715); c.stroke();
    c.beginPath(); c.moveTo(x, 600); c.lineTo(x, 470); c.stroke();
    c.fillStyle = body; c.beginPath(); c.arc(x, 425, 36, 0, 7); c.fill();
    c.fillStyle = col; c.fillRect(x - 36, 412, 72, 9);                     // headband
    const swingK = (now() - s.swingT) / 300;
    let hx = x + 70 * f, hy = 520, ang = s.ang;
    if (swingK >= 0 && swingK < 1) { ang = lerp(-0.7, 2.1, easeOut(swingK)); hx = x + 90 * f; hy = 470; }
    else if (s.blk) { hx = x + 60 * f; hy = 480; }
    c.strokeStyle = body; c.lineWidth = 13;
    c.beginPath(); c.moveTo(x, 485); c.lineTo(lerp(x, hx, 0.5), lerp(485, hy, 0.5) + 25); c.lineTo(hx, hy); c.stroke();
    const dx = Math.sin(ang) * f, dy = -Math.cos(ang), L = 290;
    c.strokeStyle = "#8b93a8"; c.lineWidth = 14; c.beginPath(); c.moveTo(hx - dx * 36, hy - dy * 36); c.lineTo(hx, hy); c.stroke();
    c.save(); c.shadowColor = col; c.shadowBlur = 40; c.strokeStyle = col; c.lineWidth = 18;
    c.beginPath(); c.moveTo(hx, hy); c.lineTo(hx + dx * L, hy + dy * L); c.stroke();
    c.shadowBlur = 10; c.strokeStyle = "#fff"; c.lineWidth = 7; c.stroke(); c.restore();
    if (s.blk) {
      c.save(); c.globalAlpha = 0.25 + 0.1 * Math.sin(t / 60); c.strokeStyle = "#9be7ff"; c.lineWidth = 8;
      c.beginPath(); c.arc(x, 520, 190, f > 0 ? -1.1 : Math.PI - 1.1, f > 0 ? 1.1 : Math.PI + 1.1); c.stroke(); c.restore();
    }
    if (s.stun > 0 && s.hp > 0) for (let i = 0; i < 3; i++) {
      const a = t / 200 + (i * Math.PI * 2) / 3; text(c, "★", x + Math.cos(a) * 50, 370 + Math.sin(a) * 14, 26, "#ffe14d");
    }
    c.restore();
  },
};

/* =====================================================================
   3. TILT RACER — buttons for gas / brake, tilt like a wheel, 2–3 laps
   ===================================================================== */
const TRACK_CP = [[250, 720], [240, 380], [400, 190], [690, 200], [800, 380], [950, 240], [1240, 170], [1410, 310], [1360, 520], [1110, 560], [1210, 730], [920, 800], [620, 700], [430, 810]];
const Race = {
  id: "race", name: "Tilt Racer", icon: "🏎️", tag: "Tilt · Buttons", bg: "#2f6b2f",
  options: [{ key: "laps", label: "Laps", values: [2, 3], def: 3 }],
  desc: "Hold your phone like a steering wheel. Tilt to steer, buttons for gas and brake. First to finish the laps wins.",
  how: [
    "Hold the phone sideways with both hands, like a steering wheel",
    "Right thumb = GAS, left thumb = BRAKE / REVERSE",
    "Turn the wheel (tilt) left or right to steer",
    "Hold it level during the countdown — that is \"straight\"",
    "Grass slows you down. First over the line after the last lap wins!",
  ],
  phoneHow: "Hold sideways like a wheel. Right thumb GAS, left thumb BRAKE. Tilt to steer.",
  keys: "No phone: W/S gas·brake, A/D steer (P1) · I/K, J/L (P2)",
  HW: 56, N: 600,
  init() {
    if (this.pts) return;
    const cp = TRACK_CP, raw = [];
    const cr = (a, b, c2, d, t) => { const t2 = t * t, t3 = t2 * t; return 0.5 * (2 * b + (-a + c2) * t + (2 * a - 5 * b + 4 * c2 - d) * t2 + (-a + 3 * b - 3 * c2 + d) * t3); };
    for (let i = 0; i < cp.length; i++) {
      const p0 = cp[(i - 1 + cp.length) % cp.length], p1 = cp[i], p2 = cp[(i + 1) % cp.length], p3 = cp[(i + 2) % cp.length];
      for (let k = 0; k < 60; k++) { const t = k / 60; raw.push([cr(p0[0], p1[0], p2[0], p3[0], t), cr(p0[1], p1[1], p2[1], p3[1], t)]); }
    }
    const cum = [0];
    for (let i = 1; i <= raw.length; i++) { const a = raw[i - 1], b = raw[i % raw.length]; cum.push(cum[i - 1] + Math.hypot(b[0] - a[0], b[1] - a[1])); }
    const total = cum[cum.length - 1], pts = []; let j = 0;
    for (let i = 0; i < this.N; i++) {
      const d = (i / this.N) * total; while (cum[j + 1] < d) j++;
      const a = raw[j], b = raw[(j + 1) % raw.length], k = (d - cum[j]) / (cum[j + 1] - cum[j] || 1);
      pts.push([lerp(a[0], b[0], k), lerp(a[1], b[1], k)]);
    }
    let s0 = 0, bd = 1e18;                       // put the start line in the middle of the left straight
    pts.forEach((q, i) => { const d = (q[0] - 245) ** 2 + (q[1] - 560) ** 2; if (d < bd) { bd = d; s0 = i; } });
    this.pts = pts.slice(s0).concat(pts.slice(0, s0)); this.len = total;
    this.img = this.renderTrack();
  },
  tang(i) { const a = this.pts[(i - 1 + this.N) % this.N], b = this.pts[(i + 1) % this.N]; return Math.atan2(b[1] - a[1], b[0] - a[0]); },
  renderTrack() {
    const k = 1.5, oc = document.createElement("canvas"); oc.width = VW * k; oc.height = VH * k;
    const g = oc.getContext("2d"); g.scale(k, k);
    g.fillStyle = "#3f8f3f"; g.fillRect(0, 0, VW, VH);
    for (let i = 0; i < 900; i++) { g.fillStyle = i % 2 ? "rgba(0,0,0,.06)" : "rgba(255,255,255,.04)"; const x = (i * 7919) % VW, y = (i * 104729) % VH; g.fillRect(x, y, 6 + (i % 5) * 3, 3); }
    const path = () => { g.beginPath(); this.pts.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.closePath(); };
    g.lineJoin = g.lineCap = "round";
    path(); g.strokeStyle = "rgba(0,0,0,.25)"; g.lineWidth = this.HW * 2 + 30; g.stroke();
    path(); g.strokeStyle = "#e23b3b"; g.lineWidth = this.HW * 2 + 16; g.stroke();
    g.setLineDash([20, 20]); path(); g.strokeStyle = "#ffffff"; g.stroke(); g.setLineDash([]);
    path(); g.strokeStyle = "#4b515c"; g.lineWidth = this.HW * 2; g.stroke();
    g.setLineDash([26, 26]); path(); g.strokeStyle = "rgba(255,255,255,.35)"; g.lineWidth = 3; g.stroke(); g.setLineDash([]);
    const p0 = this.pts[0], a = this.tang(0);
    g.save(); g.translate(p0[0], p0[1]); g.rotate(a);
    const sq = 14, rows = Math.ceil((this.HW * 2) / sq);
    for (let r = 0; r < rows; r++) for (let cI = 0; cI < 2; cI++) { g.fillStyle = (r + cI) % 2 ? "#111" : "#fff"; g.fillRect(-sq + cI * sq, -this.HW + r * sq, sq, sq); }
    g.restore();
    return oc;
  },
  reset() {
    this.init();
    this.laps = H.optsFor(this).laps;
    const si = this.N - 14, p = this.pts[si], a = this.tang(si), nx = -Math.sin(a), ny = Math.cos(a);
    this.cars = {};
    for (const n of [1, 2]) {
      const off = n === 1 ? -24 : 24;
      this.cars[n] = { x: p[0] + nx * off, y: p[1] + ny * off, a, v: 0, idx: si, prog: -14, lap: 0, off: false, lapT: 0, best: 0, steer: 0, done: false };
    }
    this.win = 0; this.winT = 0; this.t = 0; this.banner = null;
  },
  begin() { for (const n of [1, 2]) S.calibrate(H.P[n]); this.t = 0; },
  phoneUi() { return { mode: "race", hint: "Hold sideways · tilt to steer" }; },
  nearest(c) {
    let best = 1e18, bi = c.idx;
    for (let k = -35; k <= 35; k++) { const i = (c.idx + k + this.N) % this.N, q = this.pts[i], d = (q[0] - c.x) ** 2 + (q[1] - c.y) ** 2; if (d < best) { best = d; bi = i; } }
    if (best > (this.HW * 3) ** 2) for (let i = 0; i < this.N; i++) { const q = this.pts[i], d = (q[0] - c.x) ** 2 + (q[1] - c.y) ** 2; if (d < best) { best = d; bi = i; } }
    return [bi, Math.sqrt(best)];
  },
  update(dt, t) {
    this.t += dt;
    for (const n of [1, 2]) {
      const c = this.cars[n], p = H.P[n];
      const gas = S.gas(p) && !c.done, brk = S.brake(p) && !c.done;
      c.steer = lerp(c.steer, c.done ? 0 : S.steer(p), 0.35);
      if (gas) c.v += (c.v < 0 ? 620 : 330) * dt;
      if (brk) c.v -= (c.v > 0 ? 540 : 230) * dt;
      if (!gas && !brk) c.v *= Math.pow(c.done ? 0.2 : 0.55, dt);
      const vmax = c.off ? 170 : 440;
      c.v = clamp(c.v, -150, Math.max(vmax, c.v - 700 * dt));
      if (c.off && Math.abs(c.v) > 170) c.v -= Math.sign(c.v) * 650 * dt;
      c.a += c.steer * 2.7 * clamp(c.v / 160, -1, 1) * dt;
      c.x += Math.cos(c.a) * c.v * dt; c.y += Math.sin(c.a) * c.v * dt;
      if (c.x < 20 || c.x > VW - 20 || c.y < 100 || c.y > VH - 15) { c.x = clamp(c.x, 20, VW - 20); c.y = clamp(c.y, 100, VH - 15); c.v *= 0.5; }
      const [bi, dist] = this.nearest(c);
      c.off = dist > this.HW + 4;
      let di = bi - c.idx; if (di > this.N / 2) di -= this.N; if (di < -this.N / 2) di += this.N;
      c.prog += di; c.idx = bi;
      const lap = Math.floor(c.prog / this.N);
      if (lap > c.lap && !c.done) {
        c.lap = lap;
        const lt = this.t - c.lapT; c.lapT = this.t; c.best = c.best ? Math.min(c.best, lt) : lt;
        if (c.lap >= this.laps) {
          c.done = true;
          if (!this.win) { this.win = n; this.winT = now(); AU.sfx("win"); fx(p, "lap"); FX.burst(c.x, c.y, 80, { speed: [100, 500], colors: ["#fff", "#111", p.color, "#ffe14d"], life: [0.5, 1.4], size: [3, 7] }); }
        } else {
          AU.sfx("lap"); fx(p, "lap");
          if (c.lap === this.laps - 1) this.banner = { txt: `${p.name}: FINAL LAP!`, col: p.color, t: now() };
        }
      }
      if (gas && Math.random() < 0.4) FX.add({ x: c.x - Math.cos(c.a) * 22, y: c.y - Math.sin(c.a) * 22, vx: rnd(-20, 20), vy: rnd(-20, 20), life: 0.5, size: rnd(2, 4), color: "rgba(220,220,220,.6)" });
      if (c.off && Math.abs(c.v) > 80 && Math.random() < 0.5) FX.add({ x: c.x, y: c.y, vx: rnd(-40, 40), vy: rnd(-40, 40), life: 0.4, size: 3, color: "#6b4a2a" });
    }
    const A = this.cars[1], B = this.cars[2], dx = B.x - A.x, dy = B.y - A.y, d = Math.hypot(dx, dy);
    if (d < 30 && d > 0.01) { const push = (30 - d) / 2, ux = dx / d, uy = dy / d; A.x -= ux * push; A.y -= uy * push; B.x += ux * push; B.y += uy * push; A.v *= 0.9; B.v *= 0.9; }
    if (this.win && now() - this.winT > 1800) finish(this.win, `${this.laps} laps in ${this.t.toFixed(1)} s`);
  },
  car(c2, car, col) {
    c2.save(); c2.translate(car.x, car.y); c2.rotate(car.a);
    rr(c2, -19, -9, 42, 24, 7); c2.fillStyle = "rgba(0,0,0,.35)"; c2.fill();
    c2.fillStyle = "#111"; c2.fillRect(-16, -14, 10, 5); c2.fillRect(8, -14, 10, 5); c2.fillRect(-16, 9, 10, 5); c2.fillRect(8, 9, 10, 5);
    rr(c2, -22, -11, 44, 22, 8); c2.fillStyle = col; c2.fill();
    c2.fillStyle = "rgba(0,0,0,.35)"; c2.fillRect(-24, -12, 5, 24);
    rr(c2, -4, -8, 14, 16, 4); c2.fillStyle = "#1b2230"; c2.fill();
    c2.fillStyle = "#fff"; c2.fillRect(-18, -2, 12, 4);
    c2.fillStyle = "#ffe98a"; c2.fillRect(19, -9, 3, 5); c2.fillRect(19, 4, 3, 5);
    c2.restore();
  },
  draw(c, t) {
    c.drawImage(this.img, 0, 0, VW, VH);
    for (const n of [1, 2]) this.car(c, this.cars[n], H.P[n].color);
    for (const n of [1, 2]) { const car = this.cars[n]; text(c, "P" + n, car.x, car.y - 28, 18, "#fff", "center", 900, "middle", "rgba(0,0,0,.8)"); }
    c.fillStyle = "rgba(0,0,0,.55)"; c.fillRect(0, 0, VW, 92);
    const lead = this.cars[1].prog >= this.cars[2].prog ? 1 : 2;
    for (const n of [1, 2]) {
      const car = this.cars[n], p = H.P[n], L = n === 1, x = L ? 70 : VW - 70, al = L ? "left" : "right";
      nameTag(c, n, x, 30, al);
      const lapTxt = car.done ? "FINISHED" : `Lap ${Math.min(car.lap + 1, this.laps)} / ${this.laps}`;
      text(c, `${lapTxt}   ${lead === n ? "1st" : "2nd"}`, x, 68, 26, "#fff", al, 800);
      const gx = L ? 560 : VW - 560;                     // steering + pedals meter
      c.save(); c.translate(gx, 46); c.strokeStyle = "rgba(255,255,255,.35)"; c.lineWidth = 5;
      c.beginPath(); c.arc(0, 0, 30, 0, 7); c.stroke(); c.rotate(car.steer * 1.2);
      c.strokeStyle = p.color; c.lineWidth = 6; c.beginPath(); c.moveTo(-30, 0); c.lineTo(30, 0); c.moveTo(0, 0); c.lineTo(0, 30); c.stroke(); c.restore();
      c.fillStyle = S.gas(p) ? "#2ecc71" : "rgba(255,255,255,.15)"; rr(c, gx + 44, 22, 16, 48, 4); c.fill();
      c.fillStyle = S.brake(p) ? "#ff4d4d" : "rgba(255,255,255,.15)"; rr(c, gx - 60, 22, 16, 48, 4); c.fill();
    }
    text(c, H.phase === "play" ? this.t.toFixed(1) + " s" : "", VW / 2, 46, 34, "#ffe14d", "center", 900);
    if (this.banner && now() - this.banner.t < 2200) {
      c.save(); c.globalAlpha = 1 - (now() - this.banner.t) / 2200; text(c, this.banner.txt, VW / 2, 470, 60, this.banner.col, "center", 900, "middle", "rgba(0,0,0,.8)"); c.restore();
    }
    if (this.win) text(c, `🏁 ${H.P[this.win].name} WINS!`, VW / 2, 470, 80, "#fff", "center", 900, "middle", "rgba(0,0,0,.8)");
  },
};

/* =====================================================================
   4. QUICK DRAW — holster (point down), wait for FIRE!!, raise & tap. Best of 3
   ===================================================================== */
const Draw = {
  id: "draw", name: "Quick Draw", icon: "🤠", tag: "Reflex", bg: "#c46a3a",
  desc: "A wild-west duel. Phone pointed at the floor, wait for FIRE!!, then raise it and tap to shoot. Best of 3.",
  how: [
    "Hold your phone pointing DOWN at the floor — that is your holster",
    "Wait for it… tapping before FIRE!! is a foul and loses the round",
    "On FIRE!! raise the phone toward your rival and TAP the screen",
    "Fastest valid shot wins the round · first to 2 rounds wins",
  ],
  phoneHow: "Point phone at the floor. On FIRE!! raise it and TAP.",
  keys: "No phone: Q (P1) / U (P2) to shoot",
  reset() { this.score = { 1: 0, 2: 0 }; this.round = 0; this.over = 0; this.finalMsg = ""; this.next(true); },
  next(first) {
    this.round++; this.st = "holster"; this.hold = 0; this.wait = 0; this.fireT = 0; this.rw = 0; this.msg = ""; this.stT = now();
    this.warn = { 1: 0, 2: 0 }; this.flashT = 0;
    if (!first) pushUiAll();
  },
  holstered(p) { return p.phone ? p.us[1] < -0.6 : true; },
  raised(p) { return p.phone ? Math.abs(p.us[1]) < 0.6 : true; },
  phoneUi(p) {
    switch (this.st) {
      case "holster": return { mode: "text", icon: "⬇️", title: "Point DOWN", hint: "Holster: aim the phone at the floor and wait", bg: "#3a2412" };
      case "steady": return { mode: "text", icon: "🤫", title: "Steady…", hint: "Do NOT tap yet!", bg: "#2a1a0e" };
      case "fire": return { mode: "text", icon: "💥", title: "FIRE!!", hint: "Raise & TAP!", flash: "#ffcc00", bg: "#9b1d12" };
      default: return { mode: "text", icon: this.rw === p.n ? "🎯" : "💀", title: this.rw === p.n ? "Hit!" : "Shot down", hint: this.msg };
    }
  },
  update(dt, t) {
    if (this.st === "holster") {
      if (this.holstered(H.P[1]) && this.holstered(H.P[2])) this.hold += dt; else this.hold = 0;
      if (this.hold > 1) { this.st = "steady"; this.wait = rnd(1.8, 4.2); AU.sfx("tick"); pushUiAll(); }
    } else if (this.st === "steady") {
      this.wait -= dt;
      if (this.wait <= 0) { this.st = "fire"; this.fireT = now(); AU.sfx("go"); fx(H.P[1], "fire"); fx(H.P[2], "fire"); pushUiAll(); }
    } else if (this.st === "done" && t - this.stT > 2300) {
      if (this.over) finish(this.over, this.finalMsg); else this.next();
    }
  },
  onTap(p, tt) {
    if (this.st === "steady") this.result(other(p.n), `${p.name} drew too early — foul!`);
    else if (this.st === "fire") {
      if (!this.raised(p)) { this.warn[p.n] = now(); fx(p, "buzz", { ms: 80 }); return; }
      const rt = Math.max(0, tt - this.fireT);
      this.result(p.n, `${p.name} fired in ${(rt / 1000).toFixed(3)} s`);
    }
  },
  result(w, msg) {
    this.st = "done"; this.stT = now(); this.rw = w; this.msg = msg; this.score[w]++; this.flashT = now();
    AU.sfx("shot"); fx(H.P[w], "shot"); fx(H.P[other(w)], "hit"); SHAKE.v = 14;
    const gx = w === 1 ? 470 : 1130;
    FX.burst(gx, 560, 30, { speed: [100, 400], colors: ["#fff6c0", "#ffb300", "#fff"], life: [0.1, 0.4], size: [3, 7], glow: 12 });
    if (this.score[w] >= 2) { this.over = w; this.finalMsg = `${H.P[w].name} wins the duel ${this.score[w]}–${this.score[other(w)]}`; }
    pushUiAll();
  },
  draw(c, t) {
    const g = c.createLinearGradient(0, 0, 0, 640);
    g.addColorStop(0, "#2b1055"); g.addColorStop(0.45, "#d7385e"); g.addColorStop(0.8, "#f7a34b"); g.addColorStop(1, "#fbd56b");
    c.fillStyle = g; c.fillRect(0, 0, VW, 640);
    c.fillStyle = "rgba(255,240,180,.95)"; c.beginPath(); c.arc(800, 560, 120, 0, 7); c.fill();
    c.fillStyle = "#5b2a3c"; c.beginPath(); c.moveTo(0, 640);
    [[0, 520], [180, 470], [330, 540], [520, 450], [700, 560], [900, 480], [1080, 540], [1300, 440], [1450, 520], [1600, 470], [1600, 640]].forEach(([x, y]) => c.lineTo(x, y));
    c.fill();
    const gr = c.createLinearGradient(0, 600, 0, VH); gr.addColorStop(0, "#b8743c"); gr.addColorStop(1, "#6e3d1c");
    c.fillStyle = gr; c.fillRect(0, 600, VW, 300);
    this.cactus(c, 150, 700, 1.1); this.cactus(c, 1460, 690, 0.9); this.cactus(c, 760, 640, 0.5);
    const tw = ((t / 6) % (VW + 200)) - 100;                       // tumbleweed
    c.strokeStyle = "#7a5230"; c.lineWidth = 3; c.beginPath(); c.arc(tw, 800, 22, 0, 7); c.stroke();
    for (const n of [1, 2]) this.cowboy(c, n, t);
    for (const n of [1, 2]) {
      const L = n === 1;
      nameTag(c, n, L ? 60 : VW - 60, 50, L ? "left" : "right");
      for (let i = 0; i < 2; i++) { c.fillStyle = i < this.score[n] ? H.P[n].color : "rgba(255,255,255,.25)"; c.beginPath(); c.arc((L ? 75 : VW - 75) + (L ? 1 : -1) * i * 40, 95, 13, 0, 7); c.fill(); }
      if (now() - this.warn[n] < 800) text(c, "RAISE TO AIM!", L ? 470 : 1130, 330, 34, "#fff", "center", 900, "middle", "rgba(0,0,0,.8)");
      if (this.st === "holster") text(c, this.holstered(H.P[n]) ? "✓ holstered" : "point phone DOWN", L ? 470 : 1130, 380, 28, this.holstered(H.P[n]) ? "#a8ffb0" : "#fff", "center", 800, "middle", "rgba(0,0,0,.7)");
    }
    text(c, `Round ${this.round}`, VW / 2, 50, 30, "rgba(255,255,255,.85)", "center", 800);
    if (this.st === "holster") text(c, "HOLSTER YOUR PHONES", VW / 2, 200, 64, "#fff", "center", 900, "middle", "rgba(0,0,0,.6)");
    else if (this.st === "steady") text(c, "Steady…", VW / 2, 200, 90, `rgba(255,255,255,${0.6 + 0.4 * Math.sin(t / 200)})`, "center", 900, "middle", "rgba(0,0,0,.6)");
    else if (this.st === "fire") text(c, "FIRE!!", VW / 2, 220, 200 + 10 * Math.sin(t / 30), Math.floor(t / 80) % 2 ? "#ffe14d" : "#ff3b3b", "center", 900, "middle", "rgba(0,0,0,.7)");
    else { text(c, this.msg, VW / 2, 200, 52, "#fff", "center", 900, "middle", "rgba(0,0,0,.7)"); }
    if (this.flashT && now() - this.flashT < 120) { c.fillStyle = "rgba(255,255,255,.7)"; c.fillRect(0, 0, VW, VH); }
  },
  cactus(c, x, y, s) {
    c.save(); c.translate(x, y); c.scale(s, s); c.fillStyle = "#2f5d34";
    rr(c, -18, -170, 36, 170, 18); c.fill(); rr(c, -62, -120, 26, 70, 13); c.fill(); rr(c, 36, -140, 26, 80, 13); c.fill();
    c.fillRect(-50, -66, 40, 18); c.fillRect(10, -76, 40, 18); c.restore();
  },
  cowboy(c, n, t) {
    const p = H.P[n], x = n === 1 ? 380 : 1220, f = n === 1 ? 1 : -1, dead = this.st === "done" && this.rw && this.rw !== n;
    c.save();
    if (dead) { const k = easeOut((now() - this.stT) / 600); c.translate(x, 820); c.rotate(-f * 1.4 * k); c.translate(-x, -820); }
    const sil = "#1d0f08";
    c.fillStyle = sil;
    rr(c, x - 34, 560, 68, 150, 18); c.fill();
    c.fillRect(x - 30, 700, 22, 120); c.fillRect(x + 8, 700, 22, 120);
    c.beginPath(); c.arc(x, 520, 34, 0, 7); c.fill();
    c.fillRect(x - 70, 490, 140, 12); rr(c, x - 36, 446, 72, 50, 14); c.fill();
    c.fillStyle = p.color; c.fillRect(x - 34, 552, 68, 14);
    let ang = p.phone ? Math.asin(clamp(p.us[1], -1, 1)) : (this.st === "done" && this.rw === n ? 0 : -1.3);
    ang = clamp(ang, -1.45, 0.4);
    if (dead) ang = -1.4;
    const sx = x + f * 26, sy = 585, ax = sx + Math.cos(ang) * 95 * f, ay = sy - Math.sin(ang) * 95;
    c.strokeStyle = sil; c.lineWidth = 18; c.lineCap = "round"; c.beginPath(); c.moveTo(sx, sy); c.lineTo(ax, ay); c.stroke();
    c.lineWidth = 12; c.beginPath(); c.moveTo(ax, ay); c.lineTo(ax + Math.cos(ang) * 34 * f, ay - Math.sin(ang) * 34); c.stroke();
    if (this.st === "done" && this.rw === n && now() - this.stT < 200) {
      c.fillStyle = "#ffe14d"; c.beginPath(); c.arc(ax + Math.cos(ang) * 50 * f, ay - Math.sin(ang) * 50, 22, 0, 7); c.fill();
    }
    c.restore();
  },
};

/* =====================================================================
   5. STEADY HANDS — balance a full cup of tea; any wobble spills it (30 s)
   ===================================================================== */
const Zen = {
  id: "zen", name: "Steady Hands", icon: "🍵", tag: "Balance", bg: "#d9e6dc", T: 30,
  desc: "Balance a full cup of tea on your phone. Any wobble spills it. Hold perfectly still for 30 seconds.",
  how: [
    "Hold your phone flat on your open palm, arm stretched out",
    "Imagine a cup of tea filled to the brim on top of it",
    "Moving, shaking or tilting spills tea",
    "Spill 100% and you lose — otherwise the least spilled after 30 s wins",
  ],
  phoneHow: "Hold the phone flat on your palm. Stay perfectly still!",
  keys: "No phone: Q / U = wobble",
  mk() { return { sp: 0, base: null, out: false, mv: 0, hist: [] }; },
  reset() { this.s = { 1: this.mk(), 2: this.mk() }; this.t = 0; this.win = 0; this.endT = 0; this.detail = ""; this.histT = 0; },
  begin() { for (const n of [1, 2]) this.s[n].base = H.P[n].us.slice(); },
  phoneUi(p) { return { mode: "text", icon: "🍵", title: "Stay still…", hint: "Every wobble spills tea", bar: this.s[p.n].sp / 100 }; },
  onSample(p, dt, l, r) {
    const s = this.s[p.n]; if (s.out || this.win) return;
    let mv = Math.max(0, r - 5) * 0.22 + Math.max(0, l - 0.06) * 35;
    if (p.phone && s.base) mv += Math.max(0, S.tiltFrom(p, s.base) - 12) * 0.9;
    s.sp = Math.min(100, s.sp + mv * dt);
    s.mv = Math.max(s.mv, mv);
  },
  update(dt, t) {
    if (this.win) { if (t - this.endT > 1500) finish(this.win === 3 ? 0 : this.win, this.detail); return; }
    this.t += dt;
    const rec = t - this.histT > 100; if (rec) this.histT = t;
    for (const n of [1, 2]) {
      const s = this.s[n], p = H.P[n];
      s.mv *= Math.pow(0.1, dt);
      if (rec) { s.hist.push(s.mv); if (s.hist.length > 120) s.hist.shift(); }
      phoneBar(p, s.sp / 100);
      if (s.mv > 15 && Math.random() < 0.3) FX.add({ x: this.cx(n) + rnd(-90, 90), y: 520, vx: rnd(-60, 60), vy: rnd(-50, 20), g: 900, life: 0.8, size: rnd(3, 6), color: "#b5651d" });
      if (s.sp >= 100 && !s.out) {
        s.out = true; AU.sfx("splash"); fx(p, "splash");
        FX.burst(this.cx(n), 520, 80, { speed: [150, 500], colors: ["#b5651d", "#8a4a12", "#d79a52"], life: [0.5, 1.2], size: [3, 8], g: 900 });
      }
    }
    const o1 = this.s[1].out, o2 = this.s[2].out;
    if (o1 || o2) this.end(o1 && o2 ? 3 : o1 ? 2 : 1, o1 && o2 ? "Both spilled!" : `${H.P[o1 ? 1 : 2].name} spilled the tea`);
    else if (this.t >= this.T) {
      const a = this.s[1].sp, b = this.s[2].sp;
      this.end(Math.abs(a - b) < 0.5 ? 3 : a < b ? 1 : 2, `Spilled: ${H.P[1].name} ${a.toFixed(1)}% · ${H.P[2].name} ${b.toFixed(1)}%`);
    }
  },
  end(w, d) { this.win = w; this.detail = d; this.endT = now(); },
  cx(n) { return n === 1 ? 460 : 1140; },
  draw(c, t) {
    const g = c.createLinearGradient(0, 0, 0, VH); g.addColorStop(0, "#eef5ef"); g.addColorStop(1, "#bfd3c3");
    c.fillStyle = g; c.fillRect(0, 0, VW, VH);
    c.strokeStyle = "rgba(90,120,95,.18)"; c.lineWidth = 3;          // raked sand
    for (let y = 700; y < VH; y += 18) { c.beginPath(); for (let x = 0; x <= VW; x += 40) c.lineTo(x, y + Math.sin(x / 90 + y) * 4); c.stroke(); }
    const left = Math.max(0, this.T - this.t);
    text(c, H.phase === "play" ? left.toFixed(1) : String(this.T), VW / 2, 160, 120, "#3d5a45", "center", 900);
    text(c, "seconds", VW / 2, 240, 28, "#5f7d68", "center", 700);
    for (const n of [1, 2]) {
      const s = this.s[n], x = this.cx(n), p = H.P[n];
      nameTag(c, n, x, 90, "center");
      c.save(); c.translate(x, 560); c.rotate(Math.sin(t / 50) * Math.min(0.12, s.mv / 400));
      c.fillStyle = "rgba(0,0,0,.12)"; c.beginPath(); c.ellipse(0, 150, 170, 26, 0, 0, 7); c.fill();
      c.fillStyle = "#f4f1ea"; c.beginPath(); c.ellipse(0, 130, 160, 24, 0, 0, 7); c.fill();           // saucer
      c.beginPath(); c.moveTo(-120, -40); c.lineTo(120, -40); c.quadraticCurveTo(110, 120, 0, 125); c.quadraticCurveTo(-110, 120, -120, -40); c.closePath();
      c.fillStyle = "#ffffff"; c.fill(); c.strokeStyle = p.color; c.lineWidth = 6; c.stroke();
      c.strokeStyle = "#ffffff"; c.lineWidth = 18; c.beginPath(); c.arc(130, 20, 34, -1.2, 1.4); c.stroke();
      const lvl = -34 + (s.sp / 100) * 120, wob = Math.min(30, s.mv * 0.6);
      c.save(); c.beginPath(); c.moveTo(-120, -40); c.lineTo(120, -40); c.quadraticCurveTo(110, 120, 0, 125); c.quadraticCurveTo(-110, 120, -120, -40); c.clip();
      c.fillStyle = "#b5651d"; c.beginPath(); c.moveTo(-130, lvl);
      for (let k = -130; k <= 130; k += 10) c.lineTo(k, lvl + Math.sin(k / 30 + t / 90) * wob * 0.3 + (k / 130) * wob * Math.sin(t / 120));
      c.lineTo(130, 140); c.lineTo(-130, 140); c.closePath(); c.fill(); c.restore();
      c.restore();
      bar(c, x - 160, 760, 320, 22, s.sp / 100, s.sp > 70 ? "#e74c3c" : s.sp > 40 ? "#f5b041" : "#2ecc71");
      text(c, s.out ? "SPILLED!" : `spilled ${s.sp.toFixed(1)}%`, x, 805, 26, s.out ? "#c0392b" : "#3d5a45", "center", 800);
      c.strokeStyle = p.color; c.lineWidth = 3; c.beginPath();                   // wobble sparkline
      s.hist.forEach((v, i) => { const px = x - 160 + (i / 120) * 320, py = 860 - Math.min(40, v * 0.8); i ? c.lineTo(px, py) : c.moveTo(px, py); }); c.stroke();
    }
  },
};

/* =====================================================================
   6. SAFE CRACKER — rotate the phone like a dial, listen for clicks, 3 locks
   ===================================================================== */
const Safe = {
  id: "safe", name: "Safe Cracker", icon: "🔐", tag: "Rotate · Listen", bg: "#14181f", LOCKS: 3,
  desc: "Turn your phone like a safe dial and listen to the clicks. Crack 3 locks before your rival.",
  how: [
    "Lay the phone flat on your palm, screen up — volume up!",
    "Turn it slowly like a safe dial (spin it around the screen)",
    "Ticks get louder and higher as you get close",
    "At the sweet spot you hear a CLICK — hold still for 1 second",
    "Open 3 locks before your rival",
  ],
  phoneHow: "Phone flat, screen up. Rotate slowly & listen. Hold still on the CLICK.",
  keys: "No phone: A / D (P1) · J / L (P2) to turn",
  mk() { return { lock: 0, target: 0, hold: 0, heat: 0, openT: 0 }; },
  reset() { this.s = { 1: this.mk(), 2: this.mk() }; this.win = 0; this.winT = 0; },
  begin() { for (const n of [1, 2]) this.newTarget(n); },
  newTarget(n) {
    const p = H.P[n], s = this.s[n];
    s.target = p.d + rnd(70, 240) * (Math.random() < 0.5 ? -1 : 1); s.hold = 0;
    pushUi(p);
  },
  phoneUi(p) { const s = this.s[p.n]; return { mode: "safe", target: H.phase === "play" ? s.target : null, lock: s.lock, of: this.LOCKS }; },
  update(dt, t) {
    if (this.win) { if (t - this.winT > 1600) finish(this.win, `${H.P[this.win].name} cracked the safe`); return; }
    for (const n of [1, 2]) {
      const s = this.s[n], p = H.P[n], ad = Math.abs(s.target - p.d);
      s.heat = lerp(s.heat, clamp(1 - ad / 90, 0, 1), 0.2);
      const still = p.phone ? p.r < 45 : !p.kb.steer;
      if (ad < 6 && still) s.hold += dt; else s.hold = Math.max(0, s.hold - dt * 1.5);
      if (s.hold >= 1) {
        s.lock++; s.openT = now(); AU.sfx("click"); fx(p, "unlock");
        FX.burst(this.cx(n), 300, 40, { speed: [100, 400], colors: ["#2ecc71", "#a8ffb0", "#fff"], life: [0.3, 0.9], size: [2, 5], glow: 10 });
        if (s.lock >= this.LOCKS) { this.win = n; this.winT = now(); pushUi(p); FX.burst(this.cx(n), 520, 120, { speed: [200, 700], colors: ["#ffd700", "#fff3a0", "#fff"], life: [0.6, 1.6], size: [3, 8], g: 300 }); }
        else this.newTarget(n);
      }
    }
  },
  cx(n) { return n === 1 ? 430 : 1170; },
  draw(c, t) {
    c.fillStyle = "#14181f"; c.fillRect(0, 0, VW, VH);
    c.strokeStyle = "rgba(255,255,255,.03)"; c.lineWidth = 2;
    for (let x = 0; x < VW; x += 60) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, VH); c.stroke(); }
    text(c, "Rotate slowly · listen for the click · hold still", VW / 2, 860, 26, "rgba(255,255,255,.5)", "center", 700);
    for (const n of [1, 2]) {
      const s = this.s[n], p = H.P[n], x = this.cx(n), y = 520, open = this.win === n;
      nameTag(c, n, x, 110, "center");
      for (let i = 0; i < this.LOCKS; i++) {
        const lx = x + (i - 1) * 70, on = i < s.lock;
        c.fillStyle = on ? "#2ecc71" : "#3b4250"; c.beginPath(); c.arc(lx, 180, 20, 0, 7); c.fill();
        if (on) { c.save(); c.shadowColor = "#2ecc71"; c.shadowBlur = 20; c.fill(); c.restore(); }
        text(c, on ? "✓" : "🔒", lx, 182, 20, "#fff");
      }
      c.save(); c.translate(x, y);
      if (open) { const k = easeOut((now() - this.winT) / 900); c.fillStyle = "rgba(255,215,0,.35)"; rr(c, -230, -230, 460, 460, 30); c.fill(); c.scale(1 - k * 0.85, 1); }
      const dg = c.createLinearGradient(-230, -230, 230, 230); dg.addColorStop(0, "#6f7787"); dg.addColorStop(0.5, "#4a515f"); dg.addColorStop(1, "#2d323c");
      rr(c, -230, -230, 460, 460, 30); c.fillStyle = dg; c.fill(); c.strokeStyle = p.color; c.lineWidth = 6; c.stroke();
      for (const [bx, by] of [[-200, -200], [200, -200], [-200, 200], [200, 200]]) { c.fillStyle = "#222"; c.beginPath(); c.arc(bx, by, 9, 0, 7); c.fill(); }
      const hc = `hsl(${lerp(210, 0, s.heat)},90%,55%)`;
      c.save(); c.shadowColor = hc; c.shadowBlur = 20 + s.heat * 40; c.strokeStyle = hc; c.lineWidth = 10; c.beginPath(); c.arc(0, 0, 160, 0, 7); c.stroke(); c.restore();
      if (s.hold > 0) { c.strokeStyle = "#2ecc71"; c.lineWidth = 12; c.beginPath(); c.arc(0, 0, 178, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * clamp(s.hold, 0, 1)); c.stroke(); }
      c.save(); c.rotate((p.d * Math.PI) / 180);
      c.fillStyle = "#1d2028"; c.beginPath(); c.arc(0, 0, 145, 0, 7); c.fill();
      for (let i = 0; i < 100; i++) {
        const a = (i / 100) * Math.PI * 2, L = i % 10 === 0 ? 22 : i % 5 === 0 ? 14 : 8;
        c.strokeStyle = "#e8ecf5"; c.lineWidth = i % 10 === 0 ? 3 : 1.5;
        c.beginPath(); c.moveTo(Math.sin(a) * 140, -Math.cos(a) * 140); c.lineTo(Math.sin(a) * (140 - L), -Math.cos(a) * (140 - L)); c.stroke();
        if (i % 10 === 0) text(c, String(i), Math.sin(a) * 95, -Math.cos(a) * 95, 20, "#cfd5e3", "center", 800);
      }
      const hg = c.createRadialGradient(-15, -15, 5, 0, 0, 55); hg.addColorStop(0, "#9aa3b6"); hg.addColorStop(1, "#2b2f38");
      c.fillStyle = hg; c.beginPath(); c.arc(0, 0, 55, 0, 7); c.fill();
      c.restore();
      c.fillStyle = "#ff4d4d"; c.beginPath(); c.moveTo(-14, -190); c.lineTo(14, -190); c.lineTo(0, -160); c.closePath(); c.fill();
      c.restore();
      if (now() - s.openT < 900 && s.lock) text(c, "CLICK! 🔓", x, 330, 48, "#a8ffb0", "center", 900, "middle", "rgba(0,0,0,.7)");
      if (open) text(c, "💰 OPEN!", x, y, 70, "#ffd700", "center", 900, "middle", "rgba(0,0,0,.8)");
    }
  },
};

const GAMES = [Champagne, Saber, Race, Draw, Zen, Safe];
