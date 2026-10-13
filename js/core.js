/* core.js — shared helpers, audio and boot. Loaded by both the big screen (host) and the phones. */
"use strict";

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const rnd = (a, b) => a + Math.random() * (b - a);
const now = () => performance.now();
const r2 = v => Math.round(v * 100) / 100;
const wrapPI = a => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; };
const other = n => 3 - n;

const COLORS = { 1: "#12a4ff", 2: "#ff4057" };
const DEFAULT_NAMES = { 1: "Player 1", 2: "Player 2" };
const IS_IOS = /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
const DEFAULT_PHONE_URL = "https://anmayvaa.github.io/2_players_games_phone-con/";
const LIB = {
  peer: "https://unpkg.com/peerjs@1.5.4/dist/peerjs.min.js",
  qr: "https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js",
};
const HASH = new URLSearchParams(location.hash.slice(1));
const ROLE = HASH.get("pair") ? "phone" : "host";
/* Optional self-hosted PeerJS server: open the big screen with ?server=wss://my-peer-server.example:443/
   (the phones get it through the QR link). Default = the free PeerJS cloud server. */
const SRV = new URLSearchParams(location.search).get("server") || HASH.get("srv") || "";
function peerOpts() {
  const o = { debug: 1 };
  if (!SRV) return o;
  try {
    const u = new URL(SRV.includes("://") ? SRV : "wss://" + SRV);
    o.secure = u.protocol === "wss:" || u.protocol === "https:";
    o.host = u.hostname; o.port = +u.port || (o.secure ? 443 : 80); o.path = u.pathname || "/";
  } catch (e) {}
  return o;
}

const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
};

const _loaded = {};
function loadScript(src) {
  if (_loaded[src]) return _loaded[src];
  return (_loaded[src] = new Promise((res, rej) => {
    const s = document.createElement("script");
    s.src = src; s.async = true;
    s.onload = () => res();
    s.onerror = () => { delete _loaded[src]; rej(new Error("failed to load " + src)); };
    document.head.appendChild(s);
  }));
}

/* ---------------- Audio (Web Audio synth, no files) ---------------- */
const AU = {
  ctx: null, master: null,
  init() {
    if (!this.ctx) {
      const C = window.AudioContext || window.webkitAudioContext;
      if (!C) return null;
      this.ctx = new C();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.8;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state !== "running") this.ctx.resume().catch(() => {});
    // iPhone: play even when the silent switch is on (Safari 16.4+)
    try { if (navigator.audioSession) navigator.audioSession.type = "playback"; } catch (e) {}
    return this.ctx;
  },
  /** must run inside a tap on iPhone */
  unlock() {
    const c = this.init(); if (!c) return;
    try { const b = c.createBuffer(1, 1, 22050), s = c.createBufferSource(); s.buffer = b; s.connect(c.destination); s.start(0); } catch (e) {}
  },
  ok() { return this.ctx && this.ctx.state === "running"; },
  /** at = AudioContext time (optional, for beat-accurate scheduling) */
  tone(f, ms, vol = 0.3, type = "sine", slideTo, at) {
    if (!this.ok()) return;
    const c = this.ctx, t = at || c.currentTime, d = ms / 1000, o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + d);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g); g.connect(this.master); o.start(t); o.stop(t + d + 0.05);
  },
  noise(ms, vol = 0.4, freq = 1200, q = 0.7, type = "bandpass", at) {
    if (!this.ok()) return;
    const c = this.ctx, t = at || c.currentTime, len = Math.max(1, Math.ceil(c.sampleRate * ms / 1000));
    const b = c.createBuffer(1, len, c.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2);
    const s = c.createBufferSource(); s.buffer = b;
    const f = c.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
    const g = c.createGain(); g.gain.value = vol;
    s.connect(f); f.connect(g); g.connect(this.master); s.start(t);
  },
  tick(vol = 0.5, freq = 3500) { this.noise(14, vol, freq, 5); },
  seq(notes, step = 120, vol = 0.25, type = "triangle") { notes.forEach((f, i) => f && setTimeout(() => this.tone(f, step * 1.6, vol, type), i * step)); },
  sfx(k) {
    switch (k) {
      case "beep": this.tone(660, 140, 0.25, "square"); break;
      case "go": this.tone(990, 380, 0.3, "square"); break;
      case "pop": this.noise(200, 0.95, 900, 0.6); this.tone(520, 180, 0.4, "sine", 90); break;
      case "clash": this.noise(260, 0.6, 3200, 2); this.tone(1800, 220, 0.15, "sawtooth", 500); break;
      case "hit": this.noise(220, 0.7, 600, 0.8); this.tone(170, 260, 0.4, "sawtooth", 55); break;
      case "shot": this.noise(380, 1, 1500, 0.4, "lowpass"); this.tone(120, 200, 0.4, "square", 40); break;
      case "win": this.seq([523, 659, 784, 1047], 120); break;
      case "lose": this.seq([392, 330, 262], 160, 0.22); break;
      case "click": this.noise(45, 0.9, 2400, 3); this.tone(110, 70, 0.35, "square"); break;
      case "tick": this.tick(0.5, 3500); break;
      case "buzz": this.tone(150, 180, 0.35, "sawtooth"); break;
      case "swish": this.noise(240, 0.35, 1700, 1.1); break;
      case "lap": this.tone(880, 120, 0.25, "triangle"); setTimeout(() => this.tone(1320, 220, 0.25, "triangle"), 120); break;
      case "splash": this.noise(500, 0.6, 800, 0.5, "lowpass"); break;
      case "ring": [0, 90, 180, 270, 360, 450].forEach(d => setTimeout(() => { this.tone(1320, 70, 0.22, "square"); this.tone(1100, 70, 0.18, "square"); }, d)); break;
      case "doorbell": this.tone(880, 500, 0.3, "sine"); setTimeout(() => this.tone(698, 700, 0.3, "sine"), 380); break;
      case "kettle": this.tone(2600, 900, 0.12, "sine", 2900); break;
      case "chirp": this.tone(2400, 60, 0.18, "sine", 3200); setTimeout(() => this.tone(2800, 60, 0.15, "sine", 3600), 90); break;
      case "whistle": this.tone(2200, 500, 0.25, "sine", 2400); break;
      case "moo": this.tone(160, 700, 0.35, "sawtooth", 110); break;
      case "squirt": this.noise(120, 0.4, 3000, 2); break;
      case "bounce": this.noise(30, 0.7, 1800, 4); this.tone(900, 40, 0.2, "sine"); break;
      case "bat": this.noise(60, 1, 1200, 1.5); this.tone(300, 80, 0.4, "square", 120); break;
      case "cheer": this.noise(900, 0.35, 1400, 0.3); break;
      case "boo": this.tone(140, 600, 0.3, "sawtooth", 100); break;
      case "chime": this.seq([1047, 1319, 1568], 90, 0.2, "sine"); break;
      case "wrong": this.tone(220, 300, 0.3, "square", 180); break;
      case "right": this.tone(880, 100, 0.25, "triangle"); setTimeout(() => this.tone(1175, 180, 0.25, "triangle"), 90); break;
      case "whip": this.noise(90, 0.6, 2600, 1.2); break;
      case "chomp": this.noise(70, 0.7, 500, 1); break;
      case "pump": this.noise(160, 0.35, 700, 0.8, "lowpass"); break;
      case "thump": this.tone(80, 140, 0.6, "sine", 45); break;
      case "beam": this.tone(330, 300, 0.12, "sawtooth", 360); break;
      case "laser": this.tone(1800, 180, 0.2, "square", 300); break;
      case "boom": this.noise(700, 1, 300, 0.5, "lowpass"); this.tone(70, 500, 0.5, "sine", 35); break;
      case "dice": for (let i = 0; i < 6; i++) setTimeout(() => this.noise(25, 0.6, 2500 + i * 200, 4), i * 45); break;
      case "cry": this.tone(700, 400, 0.18, "sawtooth", 500); setTimeout(() => this.tone(650, 500, 0.18, "sawtooth", 450), 450); break;
      case "coo": this.tone(500, 300, 0.12, "sine", 650); break;
      case "strum": [196, 247, 294, 392].forEach((f, i) => setTimeout(() => this.tone(f, 500, 0.12, "sawtooth"), i * 12)); break;
    }
  },
};

/* Beat clock + synth backing track (host). Beat k happens at MUSIC.at(k) in performance.now() time. */
const MUSIC = {
  on: false, bpm: 120, per: 500, t0: 0, i: 0, timer: 0, style: "pop",
  start(bpm = 120, style = "pop", lead = 600) {
    this.stop(); AU.init();
    this.bpm = bpm; this.per = 60000 / bpm; this.style = style; this.t0 = now() + lead; this.i = 0; this.on = true;
    this.timer = setInterval(() => this.pump(), 25);
  },
  stop() { this.on = false; clearInterval(this.timer); },
  at(k) { return this.t0 + k * this.per; },
  beatNow() { return (now() - this.t0) / this.per; },
  nearest(t) { const k = Math.round((t - this.t0) / this.per); return { k, off: t - this.at(k) }; },
  pump() {
    if (!this.on || !AU.ok()) return;
    const c = AU.ctx;
    while (true) {
      const tt = this.t0 + (this.i * this.per) / 2;          // 8th notes
      if (tt > now() + 150) break;
      const when = c.currentTime + Math.max(0, (tt - now()) / 1000);
      if (tt >= now() - 30) this.note(this.i, when);
      this.i++;
    }
  },
  note(i, at) {
    const beat = i / 2, bar = Math.floor(beat / 4), b4 = beat % 4, st = this.style;
    const roots = st === "rock" ? [82, 82, 110, 98] : st === "calm" ? [131, 110, 87, 98] : [131, 98, 110, 87];
    const root = roots[bar % 4];
    if (st === "calm") { if (i % 4 === 0) AU.tone(root * 2, 900, 0.07, "sine", null, at); if (i % 2 === 0) AU.tone(root * 3, 300, 0.035, "triangle", null, at); return; }
    if (b4 === 0 || b4 === 2) AU.tone(110, 120, 0.5, "sine", 40, at);                 // kick
    if (b4 === 1 || b4 === 3) AU.noise(140, 0.35, 1800, 0.7, "bandpass", at);           // snare
    AU.noise(30, 0.12, 8000, 1, "highpass", at);                                        // hat
    if (i % 2 === 0) AU.tone(root, 220, st === "rock" ? 0.16 : 0.12, st === "rock" ? "sawtooth" : "triangle", null, at);
    if (st === "rock" && i % 2 === 1) AU.tone(root * 1.5, 160, 0.08, "sawtooth", null, at);
  },
};

/* iOS 18+: the only web haptic is toggling an <input switch>, honoured inside a tap */
const HAPTIC = {
  el: null,
  tap() {
    if (!IS_IOS) return;
    if (!this.el) {
      const l = document.createElement("label"), i = document.createElement("input");
      i.type = "checkbox"; i.setAttribute("switch", "");
      l.style.cssText = "position:fixed;left:-200px;top:0;opacity:0;pointer-events:none";
      l.appendChild(i); document.body.appendChild(l); this.el = l;
    }
    try { this.el.click(); } catch (e) {}
  },
};
function vibrate(pattern) {
  if (navigator.vibrate) { try { return navigator.vibrate(pattern); } catch (e) {} }
  return false;
}

function boot() {
  if (ROLE === "phone") phoneBoot();
  else hostBoot();
}
