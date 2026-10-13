# 2P Phone Party — AI Context Guide

> Read this before changing the code. Use case: a **computer** shows the game (big screen / host). **Two phones** are the controllers, and each pairs through **its own QR** (P1, P2) and streams sensors to the host in real time. The project has 47 mini-games: 28 "Duel Classics" and 17 "Party Pack" games in the spirit of 1-2-Switch / Everybody 1-2-Switch!, plus 2 originals. It is fan-made and uses no Nintendo assets, names or logos.

---

## 1. Status

| Feature | Status | Notes |
|---|---|---|
| Two-QR pairing + live link (PeerJS/WebRTC) | ✅ emulation (Chromium host + iPhone 14 + Pixel 7) | |
| All 47 games open, run and reach a result | ✅ emulation: keyboard bots + phone bots, 0 page errors | |
| Light "party" theme (hub, overlays, phone) | ✅ | Font: M PLUS Rounded 1c (Google Fonts) |
| Real-device tuning of motion thresholds | ⚠ needs play-testing | Constants in §6 and in each game |
| Camera (Color Shoot) | ✅ emulation with fake camera | Needs https + camera permission |

---

## 2. Roles and files

- `#pair=<hostId>&p=<1|2>[&srv=<url>]` → **phone** controller (`js/phone.js`); otherwise → **host**.
- Load order: `core.js` → `host.js` → `kit.js` → `phone.js` → `games.js` → `games-classic.js` → `games-classic2.js` → `games-party.js` (registry) → `boot()`.

| Symbol | File | Purpose |
|---|---|---|
| `AU` | core | Web Audio synth: `tone(f,ms,vol,type,slide,at)`, `noise(...)`, `tick`, `seq`, `sfx(name)` (~40 named effects) |
| `MUSIC` | core | Beat clock + synth backing track: `start(bpm, "pop"/"rock"/"calm")`, `stop()`, `at(k)` = performance-time of beat k, `beatNow()`, `nearest(t)` |
| `HAPTIC.tap()`, `vibrate()` | core | iOS 18 switch haptic (in a gesture only) / Android vibration |
| `H` | host | Host state: `phase` (hub/intro/count/play/result), `game`, `P[1..2]`, `wins` |
| player fields | host | `us` smoothed up-vector, `l` peak linear G, `r` peak gyro °/s, `d` dial ° (around the screen normal), `vz:[min,max]` vertical accel G, `a` linear accel G, `g` gyro °/s, `gp` gyro vector at the peak, `rot:[x,y,z]` integrated rotations °, `tc` touching, `bt` buttons, `lat` one-way ms, `kb` keyboard |
| `EV` / `EVENTS` | host | Motion events detected from the stream → `game.onEvent(p, name, strength, t)` (§4) |
| `S` | host | Signals for phone **or** keyboard: `up`, `gas`, `brake`, `steer`, `calibrate`, `pose`, `still`, `tiltFrom` |
| `send / sendAll / fx / phoneBar / pushUi / pushUiAll` | host | Messages to phones |
| `openGame → showIntro → startCountdown → play → finish(w, detail) → rematch / backToHub` | host | Game flow |
| `FX` (+`FX.say` floating text), `SHAKE`, `text`, `rr`, `bar`, `nameTag` | host/kit | Canvas helpers (logical 1600×900, letter-boxed) |
| `paper`, `floorBand`, `disc`, `ring`, `pill`, `headline`, `hud`, `pips`, `person`, `phoneIcon` | kit | Shared flat look. `person()` draws the bean characters and returns hand positions |
| `scoreGame(def)` | kit | Scaffold for "most in T seconds / first to goal" games (`c[n]`, `add(n,a)`, `end(w,msg)`, `left()`) |
| `PX(n)`, `pick`, `randi`, `winnerOf` | kit/party | Small helpers |
| `C`, `M` | phone | Link/UI state; motion state and its sign auto-detection |
| `applyUi`, `renderGrid`, `camOn/camSample`, `ballsOn/ballsStep`, `phoneFx`, `phoneLoop` | phone | Controller screens and local feedback |

---

## 3. Link protocol

The host creates peer `mg2p-<random>` (kept in `sessionStorage`) and shows two QRs: `<phone URL>#pair=<id>&p=1` / `&p=2`. The phone taps **Connect & start** → audio unlock + motion permission (requested synchronously in the tap) + wake lock → `peer.connect(hostId, {serialization:"json", reliable:true})`. A watchdog redials when the link has been down for more than 5 s. If the host sees no sensor stream for 5 s, it frees the slot.

### Phone → host
| `t` | Payload | Rate |
|---|---|---|
| `hi` | `p`, `name`, `ios` | on open |
| `s` | `u` up-vector, `l` peak lin G, `r` peak gyro, `d` dial, `tc`, `bt`, `a` lin accel, `vz:[min,max]`, `g` gyro, `gp` gyro at peak, `rot:[rx,ry,rz]` | every 20 ms |
| `tap` | — | every pointer-down outside grid buttons |
| `btn` | `v` | grid button pressed |
| `color` | `rgb:[r,g,b]` | tap in camera mode (average of the centre) |
| `pong` | `ts` | reply to ping |

Peaks and min/max are taken **since the last send**, so short spikes are never lost.

### Host → phone
| `t` | Payload | Effect |
|---|---|---|
| `ui` | `mode`, `icon`, `title`, `hint`, `tap`, `bar`, `bg`, `flash`, `loop`, `every` + mode extras | Whole controller screen |
| ui `mode` | `text` · `grid` (`buttons:[{t,v,on,dis,c,wide}]`, `cols`, `small`) · `cam` (`target` css colour) · `balls` (`n`, `seed`) · `saber` · `race` · `safe` (`target`, `lock`, `of`) | |
| `bar` | `v` 0–1 | progress bar |
| `big` | `text` | big pop-up (countdown, GO!) |
| `fx` | `k`: buzz, hit, clash, pop, fire, shot, win, lose, unlock, lap, splash, ring, good, bad, or any `AU.sfx` name | sound + vibration + flash |
| `loop` / ui.`loop` | `k` sound name, `every` ms | repeating sound on the phone (telephone ring, hide & seek chirp, crying baby) |
| `ping` | `ts`, `lat` | every 2 s |

---

## 4. Sensors, events and poses

- **Up-vector `u`** (device frame: x right, y toward the top, z out of the screen), in G. `M.sign` fixes the iOS/Android sign difference. The phone learns it by voting against the orientation-derived up-vector `(-cosβ·sinγ, sinβ, cosβ·cosγ)`. The same sign is applied to `acceleration`.
- **Vertical accel** `vz = a · û` (+ = accelerating upward).
- **Events** (`EV.run`, every sample; keyboard Q/U fires all of them):

| Event | Rule |
|---|---|
| `shake` | `l > 1.2 G`, re-armed below 0.6 |
| `punch` | `l > 1.6 G`, re-armed below 0.5 |
| `swing` | gyro > 420 °/s, re-armed below 150 |
| `jump` | `vz max > 0.9 G` |
| `pump` | `vz min < −0.55 G` (strong down stroke) |
| `squat` | a down-phase (`vz < −0.25`) followed within 1.6 s by an up-phase (`vz > 0.25`), at most every 650 ms |
| `stroke` | one smooth push `l > 0.35` ending below 0.15. Strength = peak, which Shave uses to detect "too rough" |
| `impact` | `l > 1.8` then stillness within 500 ms (slam on a table) |

- **`S.pose(p)`**: `up` / `down` (top of the phone points up / down), `left` / `right` (tipped sideways), `flat` (screen up), `face` (screen down), `mid`. Keyboard: W/S/A/D/E.
- **`S.still(p)`**: gyro < 25 °/s and `l < 0.12`.
- **Steering** (Tilt Racer): θ = atan2(u_y, u_x), snapped "straight" learned lazily (see `S.steer`).
- **Aiming** (UFOs): cursor = −dial (yaw) and `rot[0]` (pitch) × 16 px/°, re-centred by dragging at the screen edges.
- **Rhythm games** (Air Guitar, Dance Off, Hip Bump) judge an event at `t = arrival − one-way latency` against `MUSIC.at(beat)`.

---

## 5. Game objects

```js
{ id, cat: "classic" | "party" | "original", name, icon, tag, col (card colour), desc, how:[...], phoneHow,
  keys?, phoneOnly?, dark? (light HUD text), options?:[{key,label,values,def}],
  reset(), begin?(), update(dt, t), draw(ctx, t), stop?(),
  onSample?(p, dt, lin, gyro), onEvent?(p, name, strength, t), onTap?(p, t), onBtn?(p, v), onColor?(p, rgb), onKb?(p),
  phoneUi(p) }
```
- `reset()` runs on open, on rematch and at countdown start. `begin()` runs at GO (start `MUSIC` here). `stop()` runs when leaving.
- Input hooks run only in phase `play`. Call `finish(winner | 0, detail)` once, usually ~1.5 s after the decisive moment.
- Call `pushUi(p)` / `pushUiAll()` whenever the phone screen for the game state changes.
- Register the game by adding it to `GAMES.push(...)` at the bottom of `games-party.js`. The hub tabs come from `cat`.
- Keyboard support is free for games that use `onEvent` / `onTap` / `S.*`. Give `onKb` when Q/U should mean something specific. Set `phoneOnly` when keyboard play makes no sense.

---

## 6. Adaptations from the originals

The originals rely on HD Rumble, the IR camera or many players. Here is how each was translated:

| Original idea | Here |
|---|---|
| HD Rumble (Ball Count, Safe, Sneaky Dice) | Sounds on the phone speaker, plus vibration on Android. Ball Count simulates the balls on the phone itself |
| IR camera (Eating Contest) | Tap-to-bite with a choke rule |
| Joy-Con squeeze (Milk) | Thumb on the screen + downward pump |
| Clap the Joy-Con (Samurai Training) | Sharp shake/jerk of the phone between the palms (or tap) |
| Team / up to 100 players (Party Pack) | Always 1 vs 1 |
| Hide the Joy-Con | Hide the phone. It chirps. Picking it up stops the clock |
| Smart-device camera (Color Shoot) | Phone back camera; colour match by hue/saturation/lightness |

---

## 7. Testing without phones

Playwright (Chromium), one browser:
- Route `https://anmayvaa.github.io/2_players_games_phone-con/**` to the local folder (gives a secure context). Also route unpkg / cdnjs / Google Fonts to local copies or empty responses.
- Use a local PeerJS server (`npm i peer`, `ExpressPeerServer` on 127.0.0.1:9000) and open the host with `?server=ws://127.0.0.1:9000/`. Launch Chromium with `--disable-features=BlockInsecurePrivateNetworkRequests,PrivateNetworkAccessSendPreflights,LocalNetworkAccessChecks,WebRtcHideLocalIpsWithMdns` and `--use-fake-device-for-media-stream`.
- Synthetic sensors: an init script dispatches `DeviceMotionEvent` / `DeviceOrientationEvent` every 16 ms from `window.__mot = {g, a, r, o}`.
- Keyboard bots (Q/U + WASD) can finish every non-phone-only game. Phone-only games are played with phone bots tapping grid buttons.

---

## 8. Rules for future edits

1. All input goes through `S.*`, `onEvent`, `onSample`, `onTap`, `onBtn` and `onColor`, so phones and keyboard behave the same.
2. Feedback that must happen on the phone uses `fx()` / `pushUi()`. Never rely on vibration alone, because iPhone needs the sound path.
3. Keep messages small JSON and the sensor interval at 20 ms.
4. Don't overwrite a `#pair=` hash. A phone page must never become a host.
5. No Nintendo names, logos, characters or assets in the UI or graphics. Keep the mini-game names generic.
6. Commit and push only after the owner approves. Commits are authored by AnMayVaa with no AI attribution.
