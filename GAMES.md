# 2P Phone Party — AI Context Guide

> Read this before changing the code. Use case: a **computer** shows the game (big screen / host). **Two phones** are controllers, and each pairs through **its own QR** (P1, P2). The phones stream sensors to the host in real time.

---

## 1. Status

| Feature | Status | Notes |
|---|---|---|
| Two-QR pairing + live link (PeerJS/WebRTC) | ✅ verified in emulation (Chromium, host + iPhone 14 + Pixel 7 contexts) | Not yet confirmed on real phones |
| All 6 games reach a winner | ✅ verified in emulation with synthetic motion events | |
| Keyboard fallback (no phones) | ✅ verified | |
| Drop detection (closed tab / lost Wi-Fi) | ✅ 5 s without sensor stream → slot freed | |
| iOS accel sign auto-detect | ✅ verified (`M.sign` voting) | |
| Real-device tuning (shake / swing / tremor thresholds) | ⚠ needs play-testing | Constants listed in §6 |

---

## 2. Roles and files

- `#pair=<hostId>&p=<1|2>[&srv=<url>]` in the URL → **phone** controller (`js/phone.js`). Without it → **host** (`js/host.js`).
- `index.html` holds the markup for both roles: `#host` (hub + `#game` canvas) and `#phone`.
- Load order: `core.js` → `host.js` → `phone.js` → `games.js` → `boot()`.
- External scripts load lazily: `https://unpkg.com/peerjs@1.5.4/dist/peerjs.min.js`, `https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js`.

| Symbol | File | Purpose |
|---|---|---|
| `AU` | core | Web Audio synth (`tone`, `noise`, `tick`, `sfx(name)`), `unlock()` inside a tap, iOS `audioSession = "playback"` |
| `HAPTIC.tap()` | core | iOS 18 `<input switch>` haptic (only works inside a user gesture) |
| `peerOpts()`, `SRV` | core | Optional self-hosted PeerJS server (`?server=` on host, `&srv=` in the QR link) |
| `H` | host | Host state: `phase` (hub/intro/count/play/result), `game`, `P[1..2]` players, `wins` |
| `mkPlayer` fields | host | `us` smoothed up-vector, `l` peak linear G, `r` peak gyro °/s, `d` dial °, `tc` touching, `bt` buttons, `lat` one-way ms, `kb` keyboard state |
| `S` | host | Input signals that work for phone **or** keyboard: `up`, `gas`, `brake`, `steer`, `calibrate`, `tiltFrom` |
| `send / sendAll / fx / phoneBar / pushUi / pushUiAll` | host | Messages to phones |
| `openGame → showIntro → startCountdown → (play) → finish(w, detail) → rematch / backToHub` | host | Game flow |
| `FX`, `SHAKE`, `text`, `rr`, `bar`, `nameTag` | host | Canvas particles, screen shake and draw helpers (logical 1600×900, letter-boxed) |
| `C`, `M` | phone | Link/UI state; motion state (`u` up-vector, `pkL`, `pkR`, `dial`, `sign`) |
| `applyUi`, `phoneFx`, `phoneLoop` | phone | Render host-requested screen, play feedback, per-frame race layout / saber hum / safe ticks |
| `GAMES[]` | games | The game objects |

---

## 3. Link protocol

The host creates peer `mg2p-<random>` (kept in `sessionStorage`, so a reload keeps the same QR when possible) and renders two QRs: `<phone URL>#pair=<id>&p=1` and `…&p=2`. The phone URL is the host's own https URL, or the "Phone page URL" setting (default `https://anmayvaa.github.io/2_players_games_phone-con/`) when the host runs from `file://` or plain http.

Phone tap **Connect & start** → `AU.unlock()` + motion permission (both `requestPermission()` calls start synchronously in the tap) + wake lock → `peer.connect(hostId, {serialization:"json", reliable:true})`. A watchdog redials if the link has been down for more than 5 s. A new phone that sends `hi` for a taken slot replaces the old connection.

### Phone → host
| `t` | Payload | Rate |
|---|---|---|
| `hi` | `p`, `name`, `ios` | on open |
| `s` | `u:[x,y,z]` up-vector (G), `l` peak linear accel (G), `r` peak gyro (°/s), `d` dial (°), `tc` 0/1, `bt` bitmask (1 gas, 2 brake) | every 20 ms |
| `tap` | — | every pointer-down (ready / rematch / shoot) |
| `pong` | `ts` | reply to ping |

`l` and `r` are **peaks since the last send**, so short spikes (swings, shakes) are never lost between samples.

### Host → phone
| `t` | Payload | Effect |
|---|---|---|
| `welcome` | `p`, `color` | |
| `ui` | `mode` (`text`/`saber`/`race`/`safe`), `icon`, `title`, `hint`, `tap`, `bar`, `bg`, `flash`, `target`, `lock`, `of` | Whole controller screen |
| `bar` | `v` 0–1 | Progress bar (throttled by `phoneBar`) |
| `big` | `text` | Big pop-up text (countdown 3-2-1, GO!) |
| `fx` | `k`: `buzz{ms}`, `hit`, `clash`, `pop`, `fire`, `shot`, `win`, `lose`, `unlock`, `lap`, `splash`, `tick`, `swish` | Vibrate (Android) and/or sound + flash |
| `ping` | `ts`, `lat` | Every 2 s |

---

## 4. Sensor maths

- **Up-vector `u`** (device frame: x right, y toward the top of the phone, z out of the screen), in G = `accelerationIncludingGravity × sign / 9.81`. Android follows the spec (+g points up). iOS has historically been inverted, so `M.sign` starts at −1 on iOS and is **learned** by voting the dot product with the orientation-derived up `(-cosβ·sinγ, sinβ, cosβ·cosγ)`.
- **Upright** (saber hilt) = `us[1] > 0.72`. **Holstered** (quick draw) = `us[1] < −0.6`. **Raised/aiming** = `|us[1]| < 0.6`.
- **Steering**: θ = atan2(u_y, u_x), the angle of gravity in the screen plane. A clockwise wheel turn makes θ increase, which is steer right. "Straight" `th0` = θ snapped to the nearest 90° (works for both landscape directions and for portrait). It is learned lazily once the phone is no longer flat, and re-learned when the grip is off by more than 80° for 0.5 s. Full lock is at 35°, with a 3° dead zone.
- **Race buttons layout** on the phone follows `u_x` (works with rotation lock): `L` = top points left → GAS on the device bottom half; `R` = mirrored; `P` = page rotated or portrait → left/right halves. Labels rotate ±90° so they read upright.
- **Dial** = ∫ rotationRate.alpha dt on the phone (rotation around the screen normal).

---

## 5. Game objects

```js
{ id, name, icon, tag, desc, how:[...], phoneHow, keys, bg, options?:[{key,label,values,def}],
  reset(), begin?(), update(dt, t), draw(ctx, t),
  onSample?(p, dt, lin, gyro),   // every sensor message (also synthetic from keyboard Q/U: l=2.6, r=800)
  onTap?(p, t),                  // t is latency-corrected (now − one-way latency)
  phoneUi(p), stop?() }
```
- `reset()` runs on open, on rematch and at countdown start. `begin()` runs at GO.
- `update`, `onSample` and `onTap` only run in phase `play`. Call `finish(winner | 0, detail)` once. Most games wait ~1.5 s after the decisive moment so the animation can play.
- Options are stored per game in `localStorage["mg2p-opts"]` (Race: laps 2/3).
- **To add a game:** write the object, append it to `GAMES`, and use only `S.*` / `p.l` / `p.r` / `p.d` / `onTap` for input so the keyboard fallback keeps working.

---

## 6. Tuning constants (play-test on real phones)

| Game | Constant | Value |
|---|---|---|
| Champagne | pressure rate | `(l − 0.35) × 12` per s, leak 2.5/s, pop at 100 |
| Saber | attack | gyro peak > 420 °/s, cooldown 0.65 s, travel 0.3 s, dmg 10–25 |
| Saber | block | `us[1] > 0.72` and gyro < 260 °/s; stamina −20/s, broken 1.8 s; blocked attacker stunned 0.8 s; two swings within 0.2 s = clash |
| Race | car | accel 330, brake 540, reverse −150, vmax 440 (grass 170), steer 2.7 rad/s |
| Quick Draw | timing | holster both for 1 s, then random 1.8–4.2 s wait |
| Steady Hands | spill/s | `(gyro−5)·0.22 + (l−0.06)·35 + (tilt−12°)·0.9`, 30 s |
| Safe | lock | target 70–240° away, within ±6° and gyro < 45 °/s for 1 s |

---

## 7. Testing without phones

Playwright (Chromium), one browser and three contexts (host desktop 1600×900, `devices['iPhone 14']`, `devices['Pixel 7']`):
- Serve the files by routing `https://anmayvaa.github.io/2_players_games_phone-con/**` to the local folder (gives a secure context).
- If the public PeerJS server is unreachable, run a local one (`npm i peer`, `ExpressPeerServer` on 127.0.0.1:9000), open the host with `?server=ws://127.0.0.1:9000/`, and launch Chromium with `--disable-features=BlockInsecurePrivateNetworkRequests,PrivateNetworkAccessSendPreflights,LocalNetworkAccessChecks`.
- Synthetic sensors: an init script dispatches `DeviceMotionEvent` / `DeviceOrientationEvent` every 16 ms from `window.__mot = {g, a, r, o}`.
- Race buttons need real touches: CDP `Input.dispatchTouchEvent` on `#rb-gas`.

---

## 8. Rules for future edits

1. All input goes through `S.*` / `onSample` / `onTap` so phones and keyboard behave the same.
2. Feedback that must happen on the phone uses `fx()` / `pushUi()`. Never rely on vibration alone, because iPhone needs the sound path.
3. Keep messages small JSON (2-decimal rounding) and the sensor send interval at 20 ms.
4. Don't overwrite a `#pair=` hash. A phone page with `#pair` must never become a host.
5. Commit and push only after the owner approves. Commits are authored by AnMayVaa with no AI attribution.
