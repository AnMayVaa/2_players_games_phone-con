# 2P Phone Party

A 2-player party console in the browser. **47 mini-games** in the spirit of *1-2-Switch* and *Everybody 1-2-Switch!*, rebuilt for phones.
The **computer** is the screen and **two phones** are the controllers. Each phone pairs by scanning its own QR code (P1 / P2) and streams its motion sensors, touch, buttons and camera to the computer over WebRTC.

> Fan-made and unofficial. It has no connection to Nintendo, and no Nintendo assets, names or logos are used. Every graphic and sound is drawn or synthesised in code.

**Play:** https://anmayvaa.github.io/2_players_games_phone-con/

## How to play

1. Open the page on a laptop, PC or TV browser. Two QR codes appear.
2. Player 1 scans **P1** and Player 2 scans **P2** with their phone camera, then each taps **Connect & start** (on iPhone, allow *Motion & Orientation*).
3. Pick a game. Both players tap their phones to get ready, and the countdown starts.
4. After a match, tap the phone (or press Enter) for a rematch. Esc goes back to the hub.

No phone? Most games also work with a keyboard. **P1:** W A S D + Q (action) / E (hold). **P2:** I J K L + U (action) / O (hold). Games marked 📱 need both phones.

## Games

### Duel Classics (28)
| | Game | You do… |
|---|---|---|
| 🎱 | Ball Count | Tilt the phone, listen to the balls clack, guess how many 📱 |
| 🐄 | Milk | Thumb on screen + pull down — most milk |
| ☎️ | Telephone | Grab your phone when it really rings (fakes!) |
| 🗝️ | Treasure Chest | Twist like a key 5 turns, then lift the lid |
| 🍵 | Zen | Balance a full cup of tea — don't move |
| 🤠 | Quick Draw | Holster, then raise & tap on FIRE!! |
| 🔐 | Safe Crack | Rotate like a dial, listen for clicks |
| 🥷 | Samurai Training | Swing down / clap to catch the blade |
| 🚩 | Signal Flags | "BLUE UP! RED DON'T go down!" |
| 🎲 | Sneaky Dice | Shake, slam, peek, keep or re-roll |
| 🥤 | Soda Shake | Shake, pass — don't be holding it when it bursts |
| 👶 | Baby | Rock the baby to sleep gently |
| ⚾ | Baseball | Pick a pitch / swing on time |
| 🧭 | Precise Turn | Rotate exactly N° without looking |
| 🎯 | Fake Draw | Quick Draw with FISH / FRIES decoys |
| 🪒 | Shave | Smooth razor strokes, don't nick yourself |
| 🏓 | Table Tennis | Swing when the ball reaches you |
| 🏖️ | Beach Flags | Still… whistle… pump your arms to the flag |
| 🥊 | Boxing Gym | Punch fast, GUARD on cue |
| 🥪 | Eating Contest | Bite in a steady rhythm, don't choke |
| 🍽️ | Plate Spin | Keep circling in the green zone |
| ⚔️ | Sword Fight | Light-saber duel: swing to strike, upright to block |
| 🪄 | Wizard | Whirl fast circles to win the beam duel |
| 🎸 | Air Guitar | Strum on the notes |
| 🕺 | Copy Dance | Lead a move / copy it exactly 📱 |
| 💃 | Dance Off | Point UP / DOWN / LEFT / RIGHT on the beat |
| 🦍 | Gorilla | Pound your chest in rhythm |
| 👠 | Runway | Strut, then freeze in a pose |

### Party Pack (17)
| | Game | You do… |
|---|---|---|
| 🎈 | Balloons | Pump, then tap to tie before it pops |
| 🍑 | Hip Bump | Bump your hip on the beat |
| 🏃 | Relay Race | Shake → spin → hold → jump → tap |
| ⚔️ | Samurai Showdown | On the signal CHOP or SWEEP first |
| 🙈 | Hide & Seek | Hide your phone; it chirps; fastest finder wins 📱 |
| 🔢 | Bingo | Mark called numbers, tap BINGO 📱 |
| 🍦 | Ice Cream Parlor | Tap to stack scoops |
| 📸 | Color Shoot | Find a colour in the room and shoot it with the camera 📱 |
| 🔨 | Auction | Secret bids on mystery items 📱 |
| 🗽 | Statues | Dance, then FREEZE when the music stops |
| ❓ | Quiz Show | Quick-fire trivia 📱 |
| 🥷 | Ninjas | Lean, jump or duck to dodge stars |
| 🛸 | UFOs | Aim the phone at the screen, tap to shoot |
| 🪢 | Jump Rope | Jump every time the rope passes |
| 🏋️ | Squats | Most full squats in 30 s |
| ⏲️ | Kitchen Timer | Tap when N seconds have passed (no clock!) |
| 🪑 | Musical Chairs | When the music stops, phone flat on the table first |

### Originals (2)
🍾 **Champagne Pop** (shake until the cork flies) · 🏎️ **Tilt Racer** (tilt to steer, 2–3 laps)

## Requirements

- Phones must open the page over **https** (GitHub Pages provides this), or the browser blocks the motion sensors and the camera.
- Both devices need internet for the WebRTC handshake (the free PeerJS cloud server plus public STUN/TURN). Very strict school or office Wi-Fi can block WebRTC. If that happens, try a phone hotspot.
- iPhone can't vibrate from a website, so all feedback is **sound**. Keep the volume up.
- Optional self-hosted PeerJS server: open the big screen with `?server=wss://your-peer-server:443/`.

## Files

```
index.html          markup for both roles (big screen + phone controller)
css/style.css       light, flat party theme
js/core.js          helpers, Web Audio synth + sound effects, beat clock (MUSIC), boot
js/host.js          big screen: PeerJS room, QR codes, hub, game flow, motion events, keyboard, canvas
js/kit.js           shared drawing (people, HUD, rings…) and the scoreGame() helper
js/phone.js         phone controller: sensors, link, screens (text / grid / camera / ball box / saber / race / dial)
js/games.js         originals + Quick Draw, Safe, Zen, Sword Fight
js/games-classic.js / games-classic2.js   the duel classics
js/games-party.js   the party pack + the game registry
GAMES.md            developer / AI context guide
```

No build step. Any static file server works.
