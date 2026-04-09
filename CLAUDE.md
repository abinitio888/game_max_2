# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Running the Game

No build step required. Open `index.html` directly in a browser (or serve with any static file server):

```sh
python3 -m http.server 8080
# then open http://localhost:8080
```

There are no tests, no linter, and no package manager.

## Architecture

This is a vanilla JS browser game — no bundler, no modules, no framework. All files are loaded via `<script>` tags in `index.html` in dependency order. The global constant `C` (from `js/constants.js`) is available everywhere.

### Script load order matters

Files must be loaded in this order:
1. `js/constants.js` — global `C` object
2. `js/utils.js` — global helpers (`dist`, `normalize`, `burst`, `uid`, `computeStats`, etc.) and `Particle`
3. `js/wizards/WizardTypes.js` — `WIZARD_TYPES` map + special entity classes (`AoeEffect`, `SlowZone`, `LightningStrike`, `ShadowClone`, `BlackHole`, `VoidPortal`)
4. `js/entities/` — `Entity` base class, then `Wizard`, `EnemyWizard`, `Skeleton`, `MegaSkeleton`, `Boss`, `Tower`, `Projectile`
5. `js/systems/` — `GameMap`, `SpawnSystem`, `CollisionSystem`, `CombatSystem`, `BotAI`, `GachaSystem`
6. `js/ui/` — `StartScreen`, `RosterUI`, `HUD`, `VictoryScreen`
7. `js/main.js` — game loop, state machine, `game` singleton

### Game state machine

The `game` object in `main.js` is the central singleton. States: `START_SCREEN → WIZARD_SELECT → PLAYING → WIZARD_DEAD → GAME_OVER`. Each UI class receives `(ctx, game)` in `draw()` and `(mx, my, game)` in `handleClick()`.

### Entity system

All live entities (skeletons, wizards, bosses, projectiles, special effects) live in `game.entities[]`. Towers are separate in `game.towers[]`. Each frame: `entity.update(dt, game)` then `entity.draw(ctx)`. Dead entities (`alive = false`) are culled by `CombatSystem` each frame.

`Entity` (base class) provides: `hp/maxHp`, `alive`, `effects[]`, `takeDamage(amount, game)`, `updateEffects(dt)`.

### Wizard types

Defined in `WIZARD_TYPES` (6 types: fire, ice, thunder, shadow, nature, void). Each type defines `color`, `glowColor`, `projectileType`, `abilityCooldown`, `useAbility(wizard, game)`, and `rushEffect(wizard, game)`. Stats are computed via `computeStats(type, stars, level)` using `C.BASE_STATS` × `C.STAR_MULT[stars]` × level bonus.

### Gacha / roster persistence

`GachaSystem` stores the player's wizard roster in `localStorage` under key `wizardRoster_v2`. Wizards have `{ id, type, stars (1–3), level (1–3), xp, itemBonuses }`.

### Map geometry

3 vertical lanes with impassable walls between them. Lane centers at x = 180, 480, 780. Player base at y = 590, enemy base at y = 50. `WALL_RECTS` define the two wall strips. Helpers: `inLane(x, laneIdx)`, `nearestLane(x)`, `resolveWallCollision(entity)`.

### Bot AI

`BotAI` controls the enemy wizard via a scored lane-selection decision every `C.BOT_DECISION_INTERVAL` seconds. Enemy wizard state: `push | retreat | rush`.

### Key timing events

- Skeletons spawn from skeleton towers every `C.SKEL_SPAWN_INTERVAL` (8s)
- Mega Skeleton event triggers at `C.MEGA_TRIGGER_TIME` (120s) via `SpawnSystem`
- When a skeleton tower dies post-mega-trigger, remaining skeleton towers cascade-destroy with delays
