# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Running the Game

No build step or package manager required. Open `index.html` in a browser via a local web server (needed for Web Audio API to load sounds):

```bash
# Python
python3 -m http.server 8000
# Node
npx serve .
```

Then open `http://localhost:8000` in a modern browser (Chrome 60+, Firefox 55+, Safari 11+, Edge 79+).

**Debug tools** (browser console when running on localhost): `GameDebug.spawnFruit()`, `GameDebug.spawnBomb()`, `GameDebug.createFruitRain(10)`, `GameDebug.getStats()`, `GameDebug.toggleDebug()`, `GameDebug.clearEffects()`. Keyboard: `Ctrl+D` toggles debug overlay, `Ctrl+P` prints perf stats.

**In-game shortcuts**: `F` or `F11` toggles fullscreen, `M` mutes/unmutes, `Esc` pauses, `Space` starts/restarts, hold `Esc ~2s` exits fullscreen.

## Architecture

Pure vanilla JS + HTML5 Canvas game. No frameworks, no bundler, no npm. Scripts loaded via `<script>` tags in `index.html` — **load order matters** due to global singleton dependencies.

### Global Singletons (created at bottom of each file)

All managers are instantiated as global variables at the end of their respective files. They cross-reference each other freely:

- `GameConstants` — static config object (Constants.js), no dependencies
- `gameState` — `new GameState()` (GameState.js), depends on `GameConstants`
- `audioManager` — `new AudioManager()` (AudioManager.js)
- `effectsManager` — `new EffectsManager()` (EffectsManager.js), depends on `gameState`, `ComboSplash`, `Particle`, `FruitSlice`, `audioManager`, `uiManager`
- `spawnManager` — `new SpawnManager()` (SpawnManager.js), depends on `GameConstants`, `gameState`, `audioManager`, `Fruit`, `GeometryUtils`
- `collisionDetector` — `new CollisionDetector()` (CollisionDetector.js), depends on `gameState`, `effectsManager`, `audioManager`, `GeometryUtils`
- `uiManager` — `new UIManager()` (UIManager.js), depends on `gameState`, `audioManager`, `spawnManager`, `gameEngine`
- `gameEngine` — `new GameEngine()` (GameEngine.js), depends on `Renderer`, `InputManager`, `gameState`, all other singletons

### Script Load Order (from index.html)

```
Constants → GameState → AudioManager → GeometryUtils → EmojiCache →
GameObject → Fruit → FruitSlice → Particle → ComboSplash →
EffectsManager → InputManager → Renderer → SpawnManager →
CollisionDetector → UIManager → GameEngine → main.js
```

### Entity Hierarchy

`GameObject` (base: position, velocity, gravity, rotation, lifecycle) is extended by:
- `Fruit` — fruits and bombs; `Fruit.slice()` triggers game logic (score/combo or game over)
- `FruitSlice` — halves of a sliced fruit, clipped emoji rendering, time-limited
- `Particle` — juice/explosion/wallSplash variants with type-specific physics and rendering
- `ComboSplash` — animated combo text, scale pulse animation, milestone styling at 5/7/10+

### Game Loop (GameEngine)

Fixed-timestep at 120Hz (`_fixedDelta = 1/120`), capped at 8 iterations per frame. Render runs once per rAF. Update order each physics step: `spawnManager.update → updateFruits → effectsManager.updateEffects → collisionDetector.update → uiManager.update → gameState.updateDifficulty/updateComboStatus`.

### Data Flow

All game entities live in arrays on `gameState`: `fruits`, `slices`, `bombExplosions`, `juiceParticles`, `wallSplashes`, `comboSplashes`. Effects are created by `EffectsManager` and stored there; rendering reads from these arrays. `CollisionDetector` checks swipe trail (`gameState.swipePoints`) against fruits, calls `fruit.slice()` which calls back into managers.

### Key Systems

- **Rendering**: `Renderer` draws all entities via their `render(ctx)` methods. `EmojiCache` pre-renders emoji to offscreen canvases for fast `drawImage` calls. Swipe trail rendered as fading line segments.
- **Audio**: `AudioManager` pools `Audio` elements per file (3 per sound, up to 8 channels). Sounds organized by group (fruitSpawn, bombSpawn, fruitCut, bombCut, swipe, combo). Menu music uses a looping `<audio>` element with fade in/out.
- **Spawning**: `SpawnManager` uses a timer-based system with adaptive throttling (slows spawns when too many effects active). Difficulty scales spawn interval from 1000ms → 300ms over time.
- **Collision**: `CollisionDetector` tests last 6 swipe segments against fruits, with bounding-box early rejection. Uses `GeometryUtils.lineIntersectsCircle` for line-circle tests.
- **Screen effects**: Shake and flash stored as objects on `gameState` (`screenShake`, `screenFlash`), updated by `UIManager.updateScreenEffects()`, applied by `Renderer`.

### Game Balance

All tunable values are in `scripts/core/Constants.js`. Key ones: `GRAVITY` (1000), `INITIAL_SPAWN_INTERVAL` (1000ms), `MIN_SPAWN_INTERVAL` (300ms), `BOMB_CHANCE` (0.15), `COMBO_THRESHOLD` (800ms), spawn velocities, particle counts, and effect caps.

### UI Flow

Fullscreen gate → Main menu → Ready screen (tap apple) → Gameplay → Game over → Restart loop. Pause overlay with resume/restart/exit options. High scores persisted in localStorage (top 10).
