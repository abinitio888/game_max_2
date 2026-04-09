# Design: 3D-rendering, mjuka lanes & utökade trollformler

**Datum:** 2026-04-09
**Status:** Godkänd

---

## Översikt

Tre sammanhängande uppgraderingar av Wizard Wars:
1. Byt rendering från Canvas 2D till Three.js (3D)
2. Ta bort hårda lane-väggar — fri rörelse med mjuka zoner
3. Lägg till R-ultimate per trollkarl (Q · E · R spellsystem)

---

## Arkitektur

### Hybridmodell
All spellogik (positioner, kollision, AI, skada, XP) förblir orörd i befintliga JS-filer. Bara `draw()`-metoderna i varje entitet skrivs om. Koordinatsystemet (x, y) behålls som "source of truth" — Three.js konverterar dem till 3D-rymd vid rendering.

### Filstruktur (ny)
```
js/
  renderer/
    ThreeRenderer.js   — Three.js scene, kamera, ljus, render-loop
    EntityMeshes.js    — 3D-mesh-fabrik för varje entitetstyp
    MapMesh.js         — 3D-karta med lane-plattor och diken
  systems/             — oförändrade
  entities/            — draw()-metoder ersätts med mesh-uppdateringar
  ui/                  — HUD-canvas ligger kvar som 2D-overlay
```

### Three.js-integration
- Läggs till via CDN i `index.html`: `<script src="https://cdn.jsdelivr.net/npm/three@0.163/build/three.min.js"></script>`
- `ThreeRenderer` skapar WebGLRenderer, scene, perspektivkamera och ljussättning
- Varje entitet får ett `mesh`-property (Three.js Object3D) som ThreeRenderer håller i en Map
- `game.map.draw(ctx)` ersätts av `game.renderer.render()` anropat från gameloopen
- HUD, StartScreen, RosterUI, VictoryScreen renderas på ett separat 2D-canvas (`id="hudCanvas"`) ovanpå Three.js-canvaset med `position:absolute`

### Kamera
- `PerspectiveCamera`, FOV 50°
- Fast position: snett uppifrån, lätt bakåtlutad (Clash Royale-stil)
- Aldrig roterbar av spelaren
- Koordinatmappning: `mesh.position.set(entity.x / 50 - 9.6, 0, entity.y / 50 - 6.4)`

### Ljussättning
- `AmbientLight` (#ffffff, intensitet 0.4)
- `DirectionalLight` snett uppifrån (#ffffff, intensitet 0.8)
- Projektiler får varsin `PointLight` (färg = projektiltyp, räckvidd 3)

---

## 3D-objekt per entitetstyp

| Entitet | Geometri | Material |
|---|---|---|
| Wizard (spelare) | CylinderGeometry + konhatt | MeshLambertMaterial, wizardColor |
| EnemyWizard | Samma som wizard | MeshLambertMaterial, röd outline-ring |
| Skeleton | Liten CylinderGeometry | MeshLambertMaterial, grå |
| MegaSkeleton | Stor CylinderGeometry + ring | MeshLambertMaterial, mörk + röd ring |
| Boss | Bred CylinderGeometry + horngeometri | MeshLambertMaterial, bossColor |
| Tower (skeleton) | BoxGeometry, medelhög | MeshLambertMaterial, teamColor |
| Tower (nexus) | BoxGeometry, hög + glödring | MeshLambertMaterial, teamColor |
| Projectile | SphereGeometry (liten) + PointLight | MeshBasicMaterial, projColor |
| ItemPickup | SphereGeometry, bobbar upp/ner | MeshBasicMaterial, itemColor |
| Karta (lanes) | PlaneGeometry per lane | MeshLambertMaterial, laneColor |
| Mellangångar | PlaneGeometry, lägre (y = -0.1) | MeshLambertMaterial, mörkare |

---

## Rörelse & mjuka lanes

### Borttaget
- `WALL_RECTS` i `constants.js` används ej längre för kollision
- `resolveWallCollision()` anropas ej
- Spelaren kan röra sig fritt med WASD över hela banan

### Behållet (oförändrat)
- Skeletons rör sig mot `targetY`, håller sig i sin lane via `clamp` mot `LANE_LEFT`/`LANE_RIGHT` — men dessa är nu mjuka riktlinjer, inte hårda väggar
- BotAI väljer lane som förut
- `nearestLane()` och `inLane()` helpers kvar för AI-logik

### Visuell markering av lanes
- Lane-plattor är lätt upphöjda (y = 0) jämfört med mellangångar (y = -0.15)
- Mellangångarna är mörkare och smalare — signalerar "du kan gå här men det är inte lane"
- Inga osynliga väggar

---

## Spellsystem: Q · E · R

### Befintliga spells (oförändrade)
- **Q** — unik förmåga per trollkarl (cooldown: 8–16s)
- **E** — rusa till nexus med rushEffect (cooldown: 30s)

### Nytt: R — Ultimate
- Cooldown: 45s för alla typer
- Tangent: `r`
- HUD: tredje knapp i spell-baren, röd färg, nedräkning i sekunder
- `WIZARD_TYPES[type].useUltimate(wizard, game)` — ny funktion i WizardTypes.js

### R per trollkarl

**Eld — Meteorregn**
8 eldkulor faller på slumpmässiga positioner inom 200px från musen. Varje meteor: `AoeEffect` (r=50, skada=atk×3). Visuellt: fallande sfärer med ParticleSystem.

**Is — Djupfrysning**
Alla levande fiender på banan får `{ type: 'root', duration: 2.0 }` effect. Visuellt: isglitter-partiklar runt varje fryst fiende.

**Åska — Kedjeblixten**
Blixten träffar närmaste fiende, studsar till nästa inom 180px, max 6 studsar. Skada: `atk × 2.5` per studs (minskar ej). Visuellt: `LightningStrike` per studs med 0.1s delay.

**Skugga — Dödsmarkering**
Markerar närmaste fiende inom `range`. Efter 3s exploderar fienden och tar `atk × 8` skada. Visuellt: roterande skull-ikon ovanför fienden, explosion vid detonation.

**Natur — Helingslund**
Skapar en `HealZone` (r=100) på wizardens position i 4s. Varje sekund: helar spelaren `maxHp × 0.25` och rotar fiender inne i zonen. Visuellt: grön glödande cirkel på marken.

**Void — Singularitet**
`BlackHole` med r=150, dps=`atk×3`, varaktighet=3s. Alla fiender inom 300px dras in med 5× normal drag-kraft. Visuellt: stor pulserande svart sfär med lila glöd-ring.

---

## HUD-ändringar

Spell-baren (befintlig Q + E) utökas med R:

```
[Q] Förmåga  [E] Rush  [R] Ultimate
 8.2s          Redo      44.1s
```

- R-knappen: röd bakgrund, nedräkning i vitt
- När redo: pulserande röd glow-effekt (CSS animation på HUD-canvaset)

---

## Koordinatkonvertering

Spelet använder pixelkoordinater (0–960 x, 0–640 y). Three.js-scenen centreras:

```js
// entity.x, entity.y → Three.js position
mesh.position.x = (entity.x - C.W / 2) / 50;
mesh.position.z = (entity.y - C.H / 2) / 50;
mesh.position.y = 0; // höjd på marken
```

Skala: 50px = 1 Three.js-enhet.

---

## Inte i scope

- Multiplayer
- Ljud
- Animerade 3D-modeller (GLTF) — enkla geometrier räcker
- Mobilstöd / touchkontroller
- Kamerarotation eller zoom av spelaren
