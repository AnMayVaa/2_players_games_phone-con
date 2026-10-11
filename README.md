# 2P Phone Party

A 2-player party game console in the browser, in the spirit of *1-2-Switch*.
The **computer** is the main screen, and **two phones** are the controllers. Each phone pairs by scanning its own QR code (P1 / P2) and streams its motion sensors and touch input to the computer over WebRTC.

**Play:** https://anmayvaa.github.io/2_players_games_phone-con/

## Games

| | Game | Controls | Win |
|---|---|---|---|
| 🍾 | **Champagne Pop** | Shake the phone | First cork to pop |
| ⚔️ | **Saber Duel** | Swing to attack, hold upright & still to block (stamina) | Last one standing |
| 🏎️ | **Tilt Racer** | Hold sideways like a wheel: tilt = steer, right thumb GAS, left thumb BRAKE/REVERSE | First to finish 2 or 3 laps |
| 🤠 | **Quick Draw** | Point the phone at the floor, then on **FIRE!!** raise it and tap | Best of 3 (shooting early is a foul) |
| 🍵 | **Steady Hands** | Hold the phone flat and perfectly still for 30 s | Least tea spilled |
| 🔐 | **Safe Cracker** | Rotate the phone like a safe dial and listen for the clicks | First to open 3 locks |

## How to play

1. Open the page on a laptop, PC or TV browser. Two QR codes appear.
2. Player 1 scans the **P1** QR and Player 2 scans the **P2** QR with their phone camera. Then each taps **Connect & start** (on iPhone, allow *Motion & Orientation*).
3. Pick a game on the big screen. Both players tap their phones to get ready, and the countdown starts.
4. After a match, tap the phone (or press Enter) for a rematch. Esc goes back to the hub.

No phone? A keyboard works too. **P1:** W A S D + Q (action) / E (hold). **P2:** I J K L + U (action) / O (hold).

## Requirements

- Phones must open the page over **https** (GitHub Pages provides this), or the browser blocks the motion sensors.
- Both devices need internet for the WebRTC handshake (the free PeerJS cloud server plus public STUN/TURN). Very strict school or office Wi-Fi can block WebRTC. If that happens, try a phone hotspot.
- iPhone can't vibrate from a website, so every haptic is played as **sound**. Keep the volume up.
- Optional self-hosted PeerJS server: open the big screen with `?server=wss://your-peer-server:443/`. The QR codes pass it on to the phones.

## Files

```
index.html      markup for both roles (big screen + phone controller)
css/style.css   styles
js/core.js      helpers, Web Audio synth, iOS haptic, boot/role switch
js/host.js      big screen: PeerJS room, QR codes, hub, game flow, keyboard, canvas + particles
js/phone.js     phone controller: sensors, link, controller screens
js/games.js     the six games
GAMES.md        developer / AI context guide (protocol, sensor maths, how to add a game)
```

No build step. Any static file server works.
