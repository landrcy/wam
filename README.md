# W.A.M.

A tiny pixel timing-combat RPG (first playable test). Plain HTML/CSS/JS, no build step.

Play: https://landrcy.github.io/wam/

## Controls
- **J / Space / Enter**: strike when the moving line is over the gold (perfect) or green (good) zone. A perfect during an enemy wind-up parries it.
- **1 2 3** or click a portrait: switch who you control. **Tab** cycles. Allies auto-attack.
- **Click a foe** or **Up/Down**: pick a target.
- **Esc / P**: pause or back. **M**: mute.
- Mobile: STRIKE / Swap / Menu buttons under the arena.

## Code
`src/*.js` are concatenated into `js/game.js`:
`cat src/1_core.js src/2_data.js src/3_battle.js src/4_ui.js src/5_main.js > js/game.js`.
Tuning knobs are in `TUNE` (src/1_core.js). Add `?debug` to the URL to unlock everything.
