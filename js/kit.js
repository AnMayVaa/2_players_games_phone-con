/* kit.js — the shared flat "party" look + building blocks used by the minigames.
   Everything draws in the 1600×900 logical canvas. */
"use strict";

const INK = "#1d1d1f", PAPER = "#f6f5f1", SOFT = "#e8e6df", MUTE = "#8c8a84";

function paper(c, col = PAPER) { c.fillStyle = col; c.fillRect(-50, -50, VW + 100, VH + 100); }
function floorBand(c, y, col = SOFT) { c.fillStyle = col; c.fillRect(-50, y, VW + 100, VH - y + 50); }
function disc(c, x, y, r, fill) { c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fillStyle = fill; c.fill(); }
function ring(c, x, y, r, v, col, w = 14, bg = "rgba(0,0,0,.08)") {
  c.lineCap = "round"; c.lineWidth = w;
  c.strokeStyle = bg; c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.stroke();
  if (v > 0) { c.strokeStyle = col; c.beginPath(); c.arc(x, y, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * clamp(v, 0, 1)); c.stroke(); }
}
function pill(c, txt, x, y, size, fg = "#fff", bg = INK, padX = 0.6) {
  c.font = `900 ${size}px "M PLUS Rounded 1c",system-ui,-apple-system,"Segoe UI",Roboto,sans-serif`;
  const w = c.measureText(txt).width + size * padX * 2, h = size * 1.5;
  rr(c, x - w / 2, y - h / 2, w, h, h / 2); c.fillStyle = bg; c.fill();
  text(c, txt, x, y + size * 0.04, size, fg, "center", 900);
}
/** big centred headline with a soft pop-in; t0 = when it appeared */
function headline(c, txt, y, size, col = INK, t0) {
  const k = t0 ? clamp((now() - t0) / 220, 0, 1) : 1, s = 0.6 + 0.4 * easeBack(k);
  c.save(); c.translate(VW / 2, y); c.scale(s, s); text(c, txt, 0, 0, size, col, "center", 900); c.restore();
}
function easeBack(k) { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(k - 1, 3) + c1 * Math.pow(k - 1, 2); }
const ease3 = k => 1 - Math.pow(1 - clamp(k, 0, 1), 3);

/** top HUD: player names in their colour + a value under each, optional centre text (timer / round) */
function hud(c, v1, v2, center, sub) {
  for (const n of [1, 2]) {
    const L = n === 1, x = L ? 56 : VW - 56, al = L ? "left" : "right", p = H.P[n];
    rr(c, L ? 30 : VW - 30 - 380, 26, 380, 104, 26); c.fillStyle = "#fff"; c.fill();
    c.fillStyle = p.color; rr(c, L ? 30 : VW - 30 - 12, 26, 12, 104, 6); c.fill();
    text(c, `P${n} · ${p.name}${p.phone ? "" : " ⌨"}`, x, 58, 26, p.color, al, 900);
    const v = n === 1 ? v1 : v2;
    if (v != null) text(c, String(v), x, 100, 36, INK, al, 900);
  }
  const dark = H.game && H.game.dark;
  if (center != null) text(c, String(center), VW / 2, 70, 54, dark ? "#fff" : INK, "center", 900);
  if (sub) text(c, sub, VW / 2, 116, 22, dark ? "rgba(255,255,255,.6)" : MUTE, "center", 800);
}
/** small pips for best-of-N scores */
function pips(c, x, y, won, of, col, dir = 1) {
  for (let i = 0; i < of; i++) disc(c, x + dir * i * 34, y, 12, i < won ? col : "rgba(0,0,0,.12)");
}

/** a flat "bean" person. arms: angle in radians from straight down (+ = towards the outside / up) */
function person(c, x, y, sc, col, o = {}) {
  const s = sc;
  c.save(); c.translate(x, y); if (o.lean) c.rotate(o.lean); c.scale(o.flip ? -1 : 1, 1);
  const body = o.body || col;
  c.strokeStyle = body; c.lineCap = "round"; c.lineWidth = 26 * s;
  const legs = o.legs || [0.12, -0.12];
  c.beginPath(); c.moveTo(-14 * s, -40 * s); c.lineTo(-14 * s + Math.sin(legs[0]) * 90 * s, -40 * s + Math.cos(legs[0]) * 90 * s); c.stroke();
  c.beginPath(); c.moveTo(14 * s, -40 * s); c.lineTo(14 * s + Math.sin(legs[1]) * 90 * s, -40 * s + Math.cos(legs[1]) * 90 * s); c.stroke();
  rr(c, -46 * s, -200 * s, 92 * s, 175 * s, 46 * s); c.fillStyle = body; c.fill();
  const arm = (side, ang) => {
    const sx = side * 40 * s, sy = -165 * s, ex = sx + Math.sin(ang) * side * 95 * s, ey = sy + Math.cos(ang) * 95 * s;
    c.strokeStyle = body; c.lineWidth = 22 * s; c.beginPath(); c.moveTo(sx, sy); c.lineTo(ex, ey); c.stroke();
    disc(c, ex, ey, 15 * s, o.hand || "#f2c9a0");
    return [ex, ey];
  };
  const hl = arm(-1, o.armL != null ? o.armL : 0.25), hr = arm(1, o.armR != null ? o.armR : 0.25);
  disc(c, 0, -250 * s, 56 * s, o.skin || "#f2c9a0");
  c.fillStyle = INK;
  const face = o.face || "smile";
  if (face === "x") { c.lineWidth = 6 * s; c.strokeStyle = INK; for (const ex of [-20, 20]) { c.beginPath(); c.moveTo((ex - 8) * s, -268 * s); c.lineTo((ex + 8) * s, -252 * s); c.moveTo((ex + 8) * s, -268 * s); c.lineTo((ex - 8) * s, -252 * s); c.stroke(); } }
  else if (face === "sleep") { c.lineWidth = 5 * s; c.strokeStyle = INK; for (const ex of [-20, 20]) { c.beginPath(); c.arc(ex * s, -262 * s, 8 * s, 0.2, Math.PI - 0.2); c.stroke(); } }
  else { disc(c, -20 * s, -262 * s, 7 * s, INK); disc(c, 20 * s, -262 * s, 7 * s, INK); }
  c.lineWidth = 6 * s; c.strokeStyle = INK; c.beginPath();
  if (face === "o") { c.arc(0, -228 * s, 11 * s, 0, Math.PI * 2); }
  else if (face === "sad" || face === "x") c.arc(0, -218 * s, 16 * s, Math.PI + 0.5, -0.5);
  else c.arc(0, -238 * s, 18 * s, 0.4, Math.PI - 0.4);
  c.stroke();
  if (o.band !== false) { c.fillStyle = col; c.fillRect(-56 * s, -292 * s, 112 * s, 14 * s); }
  c.restore();
  const f = o.flip ? -1 : 1;
  return { l: [x + hl[0] * f, y + hl[1]], r: [x + hr[0] * f, y + hr[1]] };
}

/** a phone drawn in the scene (so players see what pose is expected) */
function phoneIcon(c, x, y, sc, ang, col = INK, screen = "#9ad7ff") {
  c.save(); c.translate(x, y); c.rotate(ang || 0); c.scale(sc, sc);
  rr(c, -22, -40, 44, 80, 9); c.fillStyle = col; c.fill(); rr(c, -18, -33, 36, 62, 5); c.fillStyle = screen; c.fill();
  c.restore();
}

/** typical "most / first" game scaffolding: counts per player, time limit or goal, finish delay */
function scoreGame(def) {
  const G = Object.assign({
    cat: "classic", T: 0, goal: 0, finishDelay: 1400,
    reset() { this.c = { 1: 0, 2: 0 }; this.t = 0; this.win = -1; this.endT = 0; this.flash = { 1: 0, 2: 0 }; if (def.init) def.init.call(this); },
    add(n, a = 1) {
      if (this.win >= 0) return;
      this.c[n] += a; this.flash[n] = now();
      if (def.onAdd) def.onAdd.call(this, n, a);
      if (this.goal && this.c[n] >= this.goal) this.end(n, def.goalMsg ? def.goalMsg.call(this, n) : `${H.P[n].name} got there first!`);
    },
    end(w, msg) { if (this.win >= 0) return; this.win = w; this.msg = msg; this.endT = now(); if (def.onEnd) def.onEnd.call(this, w); },
    left() { return Math.max(0, this.T - this.t); },
    update(dt, t) {
      if (this.win >= 0) { if (t - this.endT > this.finishDelay) finish(this.win, this.msg); return; }
      this.t += dt;
      if (def.tick) def.tick.call(this, dt, t);
      if (this.T && this.t >= this.T && this.win < 0) {
        const a = this.c[1], b = this.c[2], fmt = def.fmt || (v => Math.round(v));
        this.end(a === b ? 0 : a > b ? 1 : 2, `${H.P[1].name} ${fmt(a)} – ${fmt(b)} ${H.P[2].name}`);
      }
    },
  }, def);
  return G;
}

/* floating score texts ("+1", "PERFECT!", "OUCH") on top of the particles */
FX.texts = [];
FX.say = function (txt, x, y, col = INK, size = 48, life = 1) { this.texts.push({ txt, x, y, col, size, t: now(), life }); };
(function () {
  const clr = FX.clear.bind(FX), upd = FX.update.bind(FX), drw = FX.draw.bind(FX);
  FX.clear = function () { clr(); this.texts.length = 0; };
  FX.update = function (dt) { upd(dt); const T = now(); this.texts = this.texts.filter(q => T - q.t < q.life * 1000); };
  FX.draw = function (c) {
    drw(c);
    const T = now();
    for (const q of this.texts) {
      const k = (T - q.t) / (q.life * 1000), s = 0.7 + 0.3 * easeBack(clamp(k * 4, 0, 1));
      c.save(); c.globalAlpha = 1 - Math.max(0, k - 0.6) / 0.4; c.translate(q.x, q.y - k * 50); c.scale(s, s);
      c.lineWidth = q.size * 0.18; c.strokeStyle = "#fff"; c.lineJoin = "round";
      c.font = `900 ${q.size}px "M PLUS Rounded 1c",system-ui,sans-serif`; c.textAlign = "center"; c.textBaseline = "middle";
      c.strokeText(q.txt, 0, 0); c.fillStyle = q.col; c.fillText(q.txt, 0, 0); c.restore();
    }
  };
})();
const pick = a => a[(Math.random() * a.length) | 0];
const randi = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const PX = n => (n === 1 ? 470 : 1130);       // default x of each player's half
