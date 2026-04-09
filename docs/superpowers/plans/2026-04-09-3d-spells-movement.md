# 3D Rendering, Soft Lanes & R-Ultimates Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert Wizard Wars from Canvas 2D to Three.js 3D rendering, remove inner lane walls, and add R-ultimate spells per wizard type.

**Architecture:** Hybrid model — all game logic (positions, collisions, AI) stays untouched in existing JS files. A new `ThreeRenderer` reads entity x/y coordinates each frame and updates 3D mesh positions. A separate 2D HUD canvas overlays the Three.js canvas for UI.

**Tech Stack:** Three.js r163 (CDN), vanilla JS, no bundler. Coordinate mapping: 50px = 1 Three.js unit, origin at map center (480, 320).

---

## File Map

**New files:**
- `js/renderer/ThreeRenderer.js` — WebGLRenderer, scene, camera, lights, mesh lifecycle (create/update/remove)
- `js/renderer/EntityMeshes.js` — mesh factory: one function per entity type returning a THREE.Group

**Modified files:**
- `index.html` — add Three.js CDN, replace single canvas with Three.js canvas + HUD canvas overlay
- `js/main.js` — use `game.renderer` instead of 2D draw, add HUD canvas ctx, add R key, add `game.aimX/aimY`
- `js/wizards/WizardTypes.js` — add `useUltimate(wizard, game)` to all 6 types, add `HealZone` class
- `js/entities/Wizard.js` — add `ultimateTimer`, handle R key, update clamp to `[40, C.W-40]`, remove `_resolveWalls()` call
- `js/entities/EnemyWizard.js` — remove `_resolveWalls()` call, clamp to `[40, C.W-40]`
- `js/ui/HUD.js` — add R spell slot to spell bar

---

## Coordinate Helper (used throughout)

```js
// Convert game coords to Three.js position
function toWorld(x, y) {
  return {
    x: (x - C.W / 2) / 50,
    z: (y - C.H / 2) / 50,
  };
}
```

---

### Task 1: Three.js CDN + dual canvas in index.html

**Files:**
- Modify: `index.html`

- [ ] **Step 1: Update index.html**

Replace the existing `index.html` with this (add Three.js CDN before constants, replace single canvas with two layered canvases):

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Wizard Wars</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      background: #000;
      display: flex;
      justify-content: center;
      align-items: center;
      height: 100vh;
      overflow: hidden;
    }
    #gameWrapper {
      position: relative;
    }
    #gameCanvas, #hudCanvas {
      display: block;
    }
    #hudCanvas {
      position: absolute;
      top: 0;
      left: 0;
      pointer-events: none;
    }
  </style>
</head>
<body>
  <div id="gameWrapper">
    <canvas id="gameCanvas"></canvas>
    <canvas id="hudCanvas"></canvas>
  </div>

  <!-- Three.js -->
  <script src="https://cdn.jsdelivr.net/npm/three@0.163/build/three.min.js"></script>
  <!-- 1. Constants -->
  <script src="js/constants.js"></script>
  <!-- 2. Utils + Particle -->
  <script src="js/utils.js"></script>
  <!-- 3. Wizard types + special entity classes -->
  <script src="js/wizards/WizardTypes.js"></script>
  <!-- 4. Entities -->
  <script src="js/entities/Entity.js"></script>
  <script src="js/entities/Wizard.js"></script>
  <script src="js/entities/EnemyWizard.js"></script>
  <script src="js/entities/Skeleton.js"></script>
  <script src="js/entities/MegaSkeleton.js"></script>
  <script src="js/entities/Boss.js"></script>
  <script src="js/entities/Tower.js"></script>
  <script src="js/entities/Projectile.js"></script>
  <!-- 5. Systems -->
  <script src="js/systems/GameMap.js"></script>
  <script src="js/systems/SpawnSystem.js"></script>
  <script src="js/systems/CollisionSystem.js"></script>
  <script src="js/systems/CombatSystem.js"></script>
  <script src="js/systems/BotAI.js"></script>
  <script src="js/systems/GachaSystem.js"></script>
  <!-- 6. Renderer -->
  <script src="js/renderer/EntityMeshes.js"></script>
  <script src="js/renderer/ThreeRenderer.js"></script>
  <!-- 7. UI -->
  <script src="js/ui/StartScreen.js"></script>
  <script src="js/ui/RosterUI.js"></script>
  <script src="js/ui/HUD.js"></script>
  <script src="js/ui/VictoryScreen.js"></script>
  <!-- 8. Main -->
  <script src="js/main.js"></script>
</body>
</html>
```

- [ ] **Step 2: Commit**

```bash
git add index.html
git commit -m "feat: dual canvas layout + Three.js CDN"
```

---

### Task 2: EntityMeshes.js — mesh factory

**Files:**
- Create: `js/renderer/EntityMeshes.js`

- [ ] **Step 1: Create the mesh factory**

```js
// ============================================================
//  ENTITY MESHES  –  3D mesh factory for each entity type
// ============================================================

const PROJ_THREE_COLORS = {
  fireball:   0xff6b35,
  ice_shard:  0x7ecef4,
  bolt:       0xffe066,
  shadow_orb: 0x8a4fff,
  vine:       0x4caf50,
  void_pulse: 0x9c27b0,
  skeleton:   0xcccccc,
  boss:       0xff0000,
};

function hexToInt(hex) {
  return parseInt(hex.replace('#', ''), 16);
}

function makWizardMesh(entity) {
  const color = hexToInt(entity.color || '#ffffff');
  const group = new THREE.Group();

  // Body cylinder
  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(0.28, 0.28, 0.6, 12),
    new THREE.MeshLambertMaterial({ color })
  );
  body.position.y = 0.3;
  group.add(body);

  // Hat cone
  const hat = new THREE.Mesh(
    new THREE.ConeGeometry(0.28, 0.6, 12),
    new THREE.MeshLambertMaterial({ color })
  );
  hat.position.y = 0.9;
  group.add(hat);

  // Glow ring at base
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.32, 0.05, 8, 24),
    new THREE.MeshBasicMaterial({ color: hexToInt(entity.glowColor || entity.color || '#ffffff') })
  );
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.05;
  group.add(ring);

  // Enemy wizard: red ring on top
  if (entity.isPlayerControlled === false) {
    const eRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.34, 0.06, 8, 24),
      new THREE.MeshBasicMaterial({ color: 0xff3333 })
    );
    eRing.rotation.x = Math.PI / 2;
    eRing.position.y = 0.62;
    group.add(eRing);
  }

  return group;
}

function makeSkeletonMesh(entity) {
  const color = hexToInt(entity.color || '#cccccc');
  const group = new THREE.Group();

  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(0.16, 0.16, 0.35, 8),
    new THREE.MeshLambertMaterial({ color })
  );
  body.position.y = 0.175;
  group.add(body);

  // Head sphere
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.14, 8, 6),
    new THREE.MeshLambertMaterial({ color })
  );
  head.position.y = 0.47;
  group.add(head);

  return group;
}

function makeBossMesh(entity) {
  const color = hexToInt(entity.color || '#aa55ff');
  const group = new THREE.Group();

  // Wide body
  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(0.44, 0.44, 0.7, 12),
    new THREE.MeshLambertMaterial({ color })
  );
  body.position.y = 0.35;
  group.add(body);

  // Left horn
  const hornL = new THREE.Mesh(
    new THREE.ConeGeometry(0.1, 0.4, 6),
    new THREE.MeshLambertMaterial({ color: 0x222222 })
  );
  hornL.position.set(-0.24, 1.0, 0);
  hornL.rotation.z = 0.3;
  group.add(hornL);

  // Right horn
  const hornR = hornL.clone();
  hornR.position.set(0.24, 1.0, 0);
  hornR.rotation.z = -0.3;
  group.add(hornR);

  // Yellow eyes
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0xffff00 });
  const eyeGeo = new THREE.SphereGeometry(0.07, 6, 4);
  const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
  eyeL.position.set(-0.16, 0.55, 0.4);
  group.add(eyeL);
  const eyeR = eyeL.clone();
  eyeR.position.set(0.16, 0.55, 0.4);
  group.add(eyeR);

  return group;
}

function makeTowerMesh(entity) {
  const isNexus = entity.towerType === 'nexus';
  const teamColor = entity.team === 'player' ? 0x2266ff : 0xcc2222;
  const group = new THREE.Group();

  const height = isNexus ? 1.4 : 0.8;
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(0.6, height, 0.6),
    new THREE.MeshLambertMaterial({ color: teamColor })
  );
  body.position.y = height / 2;
  group.add(body);

  // Top battlement
  const top = new THREE.Mesh(
    new THREE.BoxGeometry(0.7, 0.15, 0.7),
    new THREE.MeshLambertMaterial({ color: teamColor })
  );
  top.position.y = height + 0.075;
  group.add(top);

  // Nexus: glowing ring around middle
  if (isNexus) {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.5, 0.06, 8, 24),
      new THREE.MeshBasicMaterial({ color: teamColor })
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = height * 0.5;
    group.add(ring);
  }

  return group;
}

function makeProjectileMesh(entity) {
  const color = PROJ_THREE_COLORS[entity.projType] || 0xffffff;
  const group = new THREE.Group();

  const sphere = new THREE.Mesh(
    new THREE.SphereGeometry(0.12, 8, 6),
    new THREE.MeshBasicMaterial({ color })
  );
  group.add(sphere);

  // Point light for glow effect
  const light = new THREE.PointLight(color, 1.2, 3);
  group.add(light);

  return group;
}

function makeMegaSkeletonMesh() {
  const group = new THREE.Group();

  // Large dark body
  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(0.6, 0.6, 1.2, 12),
    new THREE.MeshLambertMaterial({ color: 0x444444 })
  );
  body.position.y = 0.6;
  group.add(body);

  // Red eyes
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
  const eyeGeo = new THREE.SphereGeometry(0.1, 6, 4);
  const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
  eyeL.position.set(-0.2, 0.9, 0.55);
  group.add(eyeL);
  const eyeR = eyeL.clone();
  eyeR.position.set(0.2, 0.9, 0.55);
  group.add(eyeR);

  // Dark red glow ring
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.72, 0.08, 8, 24),
    new THREE.MeshBasicMaterial({ color: 0x880000 })
  );
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.1;
  group.add(ring);

  return group;
}

function makeItemPickupMesh(entity) {
  const colorMap = { speed: 0x00ff88, health: 0xff4444, damage: 0xffdd00 };
  const color = colorMap[entity.itemType] || 0xffffff;
  const group = new THREE.Group();

  const sphere = new THREE.Mesh(
    new THREE.SphereGeometry(0.28, 10, 8),
    new THREE.MeshBasicMaterial({ color })
  );
  group.add(sphere);

  // Glow point light
  const light = new THREE.PointLight(color, 1.5, 4);
  group.add(light);

  return group;
}

function makeAoeMesh() {
  const group = new THREE.Group();
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(1.6, 0.08, 8, 32),
    new THREE.MeshBasicMaterial({ color: 0xff4500, transparent: true, opacity: 0.7 })
  );
  ring.rotation.x = Math.PI / 2;
  group.add(ring);
  return group;
}

function makeSlowZoneMesh() {
  const group = new THREE.Group();
  const disk = new THREE.Mesh(
    new THREE.CircleGeometry(2.4, 32),
    new THREE.MeshBasicMaterial({ color: 0xaaddff, transparent: true, opacity: 0.2, side: THREE.DoubleSide })
  );
  disk.rotation.x = -Math.PI / 2;
  disk.position.y = 0.02;
  group.add(disk);
  return group;
}

function makeHealZoneMesh() {
  const group = new THREE.Group();
  const disk = new THREE.Mesh(
    new THREE.CircleGeometry(2.0, 32),
    new THREE.MeshBasicMaterial({ color: 0x00cc44, transparent: true, opacity: 0.25, side: THREE.DoubleSide })
  );
  disk.rotation.x = -Math.PI / 2;
  disk.position.y = 0.02;
  group.add(disk);
  return group;
}

function makeBlackHoleMesh() {
  const group = new THREE.Group();
  const sphere = new THREE.Mesh(
    new THREE.SphereGeometry(0.5, 12, 10),
    new THREE.MeshBasicMaterial({ color: 0x110022 })
  );
  sphere.position.y = 0.5;
  group.add(sphere);
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.8, 0.1, 8, 24),
    new THREE.MeshBasicMaterial({ color: 0x9c27b0 })
  );
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.5;
  group.add(ring);
  return group;
}

function makeShadowCloneMesh(entity) {
  const group = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(0.22, 0.22, 0.5, 10),
    new THREE.MeshBasicMaterial({ color: 0x8a4fff, transparent: true, opacity: 0.5 })
  );
  body.position.y = 0.25;
  group.add(body);
  return group;
}

// ── Main factory ──────────────────────────────────────────────
function createMeshForEntity(entity) {
  switch (entity.type) {
    case 'wizard':       return makWizardMesh(entity);
    case 'skeleton':     return makeSkeletonMesh(entity);
    case 'boss':         return makeBossMesh(entity);
    case 'tower':        return makeTowerMesh(entity);
    case 'projectile':   return makeProjectileMesh(entity);
    case 'mega_skeleton':return makeMegaSkeletonMesh();
    case 'item_pickup':  return makeItemPickupMesh(entity);
    case 'aoe':          return makeAoeMesh();
    case 'slow_zone':    return makeSlowZoneMesh();
    case 'heal_zone':    return makeHealZoneMesh();
    case 'black_hole':   return makeBlackHoleMesh();
    case 'shadow_clone': return makeShadowCloneMesh(entity);
    default:             return null;
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add js/renderer/EntityMeshes.js
git commit -m "feat: EntityMeshes 3D mesh factory for all entity types"
```

---

### Task 3: ThreeRenderer.js — scene, camera, map, mesh lifecycle

**Files:**
- Create: `js/renderer/ThreeRenderer.js`

- [ ] **Step 1: Create ThreeRenderer**

```js
// ============================================================
//  THREE RENDERER  –  scene, camera, map geometry, mesh lifecycle
// ============================================================
class ThreeRenderer {
  constructor(canvas) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(C.W, C.H);
    this.renderer.setClearColor(0x0a0a15);

    this.scene  = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(50, C.W / C.H, 0.1, 100);
    // Clash Royale-style: above and slightly behind player base
    this.camera.position.set(0, 14, 8);
    this.camera.lookAt(0, 0, -1);

    this._setupLights();
    this._buildMap();

    // entity → THREE.Group
    this._meshMap = new Map();
  }

  // ── Coordinate conversion ────────────────────────────────
  _toX(px) { return (px - C.W / 2) / 50; }
  _toZ(py) { return (py - C.H / 2) / 50; }

  // ── Lights ───────────────────────────────────────────────
  _setupLights() {
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.45));
    const sun = new THREE.DirectionalLight(0xffffff, 0.85);
    sun.position.set(3, 10, 5);
    this.scene.add(sun);
  }

  // ── Static map geometry ──────────────────────────────────
  _buildMap() {
    // Dark background plane (full map)
    const bg = new THREE.Mesh(
      new THREE.PlaneGeometry(19.5, 13),
      new THREE.MeshLambertMaterial({ color: 0x12121f })
    );
    bg.rotation.x = -Math.PI / 2;
    bg.position.y = -0.18;
    this.scene.add(bg);

    // Lane platforms (slightly raised)
    const laneColor = 0x2a2a3a;
    const laneW = (C.LANE_RIGHT[0] - C.LANE_LEFT[0]) / 50; // ~2.0 units
    for (let i = 0; i < 3; i++) {
      const lx = this._toX(C.LANE_CENTERS[i]);
      const lane = new THREE.Mesh(
        new THREE.BoxGeometry(laneW, 0.06, 12.8),
        new THREE.MeshLambertMaterial({ color: laneColor })
      );
      lane.position.set(lx, -0.03, 0);
      this.scene.add(lane);

      // Dashed center line
      const dash = new THREE.Mesh(
        new THREE.PlaneGeometry(0.04, 8.8),
        new THREE.MeshBasicMaterial({ color: 0x33334a })
      );
      dash.rotation.x = -Math.PI / 2;
      dash.position.set(lx, 0.01, 0);
      this.scene.add(dash);
    }

    // Outer walls (hard boundaries)
    const wallMat = new THREE.MeshLambertMaterial({ color: 0x1a1a2e });
    const wallH = 1.2;
    const leftWall = new THREE.Mesh(
      new THREE.BoxGeometry(0.8, wallH, 13),
      wallMat
    );
    leftWall.position.set(this._toX(0) - 0.4, wallH / 2 - 0.05, 0);
    this.scene.add(leftWall);

    const rightWall = leftWall.clone();
    rightWall.position.set(this._toX(C.W) + 0.4, wallH / 2 - 0.05, 0);
    this.scene.add(rightWall);

    // Player base zone (blue)
    const pBase = new THREE.Mesh(
      new THREE.BoxGeometry(19.5, 0.04, 2.0),
      new THREE.MeshLambertMaterial({ color: 0x0d3b66 })
    );
    pBase.position.set(0, -0.02, this._toZ(C.PLAYER_BASE_Y));
    this.scene.add(pBase);

    // Enemy base zone (red)
    const eBase = new THREE.Mesh(
      new THREE.BoxGeometry(19.5, 0.04, 2.0),
      new THREE.MeshLambertMaterial({ color: 0x6b0e1e })
    );
    eBase.position.set(0, -0.02, this._toZ(C.ENEMY_BASE_Y));
    this.scene.add(eBase);
  }

  // ── Mesh lifecycle ───────────────────────────────────────
  _getOrCreateMesh(entity) {
    if (this._meshMap.has(entity)) return this._meshMap.get(entity);
    const mesh = createMeshForEntity(entity);
    if (!mesh) return null;
    this.scene.add(mesh);
    this._meshMap.set(entity, mesh);
    return mesh;
  }

  _removeMesh(entity) {
    const mesh = this._meshMap.get(entity);
    if (mesh) {
      this.scene.remove(mesh);
      this._meshMap.delete(entity);
    }
  }

  _syncMesh(entity) {
    const mesh = this._getOrCreateMesh(entity);
    if (!mesh) return;
    mesh.position.x = this._toX(entity.x);
    mesh.position.z = this._toZ(entity.y);

    // Special Y adjustments
    if (entity.type === 'item_pickup') {
      mesh.position.y = Math.sin((entity.bobTimer || 0) * 2) * 0.15 + 0.3;
    }

    // Wizard facing rotation
    if (entity.type === 'wizard' && entity.facingAngle !== undefined) {
      mesh.rotation.y = -entity.facingAngle - Math.PI / 2;
    }

    // Invisible wizard (shadow type rush)
    if (entity.isInvisible !== undefined) {
      mesh.traverse(child => {
        if (child.material) child.material.opacity = entity.isInvisible ? 0.3 : 1;
        if (child.material) child.material.transparent = entity.isInvisible;
      });
    }

    // Projectile height — fly slightly above ground
    if (entity.type === 'projectile') {
      mesh.position.y = 0.5;
    }

    // AoE/SlowZone/HealZone/BlackHole — scale with entity radius
    if (entity.type === 'aoe' || entity.type === 'slow_zone' ||
        entity.type === 'heal_zone' || entity.type === 'black_hole') {
      const s = (entity.radius || 80) / 80;
      mesh.scale.setScalar(s);
      mesh.position.y = 0;
    }
  }

  // ── Main render ──────────────────────────────────────────
  render(game) {
    const allEntities = [...game.entities, ...game.towers];
    const alive = new Set(allEntities.filter(e => e.alive || (e.explosionTimer > 0)));

    // Remove meshes for dead entities
    for (const [entity] of this._meshMap) {
      if (!alive.has(entity)) this._removeMesh(entity);
    }

    // Sync alive entities
    for (const entity of alive) {
      this._syncMesh(entity);
    }

    this.renderer.render(this.scene, this.camera);
  }

  resize(w, h) {
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add js/renderer/ThreeRenderer.js
git commit -m "feat: ThreeRenderer with scene, camera, map geometry, mesh lifecycle"
```

---

### Task 4: Wire ThreeRenderer into main.js

**Files:**
- Modify: `js/main.js`

- [ ] **Step 1: Add hudCanvas setup at top of main.js**

Find the canvas setup block at the top of `main.js` (lines 6–19) and replace it with:

```js
// ── Canvas setup ────────────────────────────────────────────
const canvas    = document.getElementById('gameCanvas');
const hudCanvas = document.getElementById('hudCanvas');
const ctx       = hudCanvas.getContext('2d');

// Size both canvases
canvas.width  = C.W;
canvas.height = C.H;
hudCanvas.width  = C.W;
hudCanvas.height = C.H;

// Scale wrapper to window
function resizeCanvas() {
  const scaleX = window.innerWidth  / C.W;
  const scaleY = window.innerHeight / C.H;
  const scale  = Math.min(scaleX, scaleY, 1.5);
  const wrapper = document.getElementById('gameWrapper');
  wrapper.style.width  = (C.W * scale) + 'px';
  wrapper.style.height = (C.H * scale) + 'px';
  canvas.style.width   = (C.W * scale) + 'px';
  canvas.style.height  = (C.H * scale) + 'px';
  hudCanvas.style.width  = (C.W * scale) + 'px';
  hudCanvas.style.height = (C.H * scale) + 'px';
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);
```

- [ ] **Step 2: Add aimX/aimY tracking and R key to input handler**

In the `input` object definition (around line 23), it stays the same. But in `mousemove` and `mousedown` handlers add aim tracking. Find the `canvas.addEventListener('mousemove'` block and replace it:

```js
canvas.addEventListener('mousemove', e => {
  const c = canvasCoords(e);
  input.mouse.x = c.x;
  input.mouse.y = c.y;
  game.aimX = c.x;
  game.aimY = c.y;
});
```

- [ ] **Step 3: Add renderer and aimX/aimY to game object**

In the `game` object, add after `botAI`:

```js
  aimX: C.W / 2,
  aimY: C.H / 2,

  // Renderer initialized after init()
  renderer: null,
```

- [ ] **Step 4: Initialize renderer in game.init()**

In `game.init()`, add at the end:

```js
    this.renderer = new ThreeRenderer(canvas);
```

- [ ] **Step 5: Replace the draw() function**

Replace the entire `draw()` function with:

```js
function draw() {
  // Three.js renders the 3D game world
  if (game.renderer) {
    if (game.state === 'PLAYING' || game.state === 'WIZARD_DEAD' ||
        game.state === 'WIZARD_SELECT' || game.state === 'GAME_OVER') {
      game.renderer.render(game);
    } else {
      // START_SCREEN: clear to dark
      game.renderer.renderer.setClearColor(0x0d0d1a);
      game.renderer.renderer.clear();
    }
  }

  // 2D HUD canvas handles all UI
  ctx.clearRect(0, 0, C.W, C.H);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';

  switch (game.state) {
    case 'START_SCREEN':
      game.startScreen.draw(ctx, game);
      break;

    case 'WIZARD_SELECT':
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillRect(0, 0, C.W, C.H);
      game.rosterUI.draw(ctx, game);
      break;

    case 'PLAYING':
      // Particles drawn on HUD canvas (2D overlay)
      for (const p of game.particles) p.draw(ctx);
      game.hud.draw(ctx, game);
      break;

    case 'WIZARD_DEAD':
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillRect(0, 0, C.W, C.H);
      game.rosterUI.draw(ctx, game);
      break;

    case 'GAME_OVER':
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      ctx.fillRect(0, 0, C.W, C.H);
      game.victoryScreen.draw(ctx, game);
      break;
  }
}
```

- [ ] **Step 6: Remove drawTowersAndEntities function**

Delete the entire `drawTowersAndEntities` function (it's replaced by ThreeRenderer).

- [ ] **Step 7: Add R key to player wizard update in game loop**

In the `update()` function's `PLAYING` case, the player wizard is updated with `game.playerWizard.update(dt, input, game)`. The R key handling is added inside `Wizard.js` in Task 6 — no change needed here.

- [ ] **Step 8: Commit**

```bash
git add js/main.js
git commit -m "feat: wire ThreeRenderer into game loop, dual canvas draw()"
```

---

### Task 5: Soft lanes — remove inner wall collision, add outer walls

**Files:**
- Modify: `js/entities/Wizard.js`
- Modify: `js/entities/EnemyWizard.js`

- [ ] **Step 1: Update Wizard.update() — remove _resolveWalls, update clamp**

In `Wizard.update()`, find the two lines at the bottom:

```js
    this.x = clamp(this.x, 5, C.W - 5);
    this.y = clamp(this.y, 5, C.H - 5);
    this._resolveWalls();
```

Replace with:

```js
    this.x = clamp(this.x, 40, C.W - 40);
    this.y = clamp(this.y, 5, C.H - 5);
```

Also find the rush movement block `this._resolveWalls();` (inside the rush section) and remove it:

```js
      // Remove this line:
      this._resolveWalls();
```

- [ ] **Step 2: Update EnemyWizard.update() — remove _resolveWalls, update clamp**

In `EnemyWizard.update()`, find:

```js
    this.x = clamp(this.x, 5, C.W - 5);
    this.y = clamp(this.y, 5, C.H - 5);
    this._resolveWalls();
```

Replace with:

```js
    this.x = clamp(this.x, 40, C.W - 40);
    this.y = clamp(this.y, 5, C.H - 5);
```

Also remove the `this._resolveWalls();` call in the rush block inside `EnemyWizard.update()`.

- [ ] **Step 3: Commit**

```bash
git add js/entities/Wizard.js js/entities/EnemyWizard.js
git commit -m "feat: soft lanes — remove inner wall collision, clamp to outer edges"
```

---

### Task 6: R-ultimate spell handling in Wizard.js

**Files:**
- Modify: `js/entities/Wizard.js`

- [ ] **Step 1: Add ultimateTimer to Wizard constructor**

In the `constructor`, after `this.rushTimer = 0;` add:

```js
    this.ultimateTimer    = 0;
    this.ultimateCooldown = 45;
```

- [ ] **Step 2: Tick ultimateTimer in Wizard.update()**

In `update()`, after `this.rushTimer = Math.max(0, this.rushTimer - dt);` add:

```js
    this.ultimateTimer = Math.max(0, this.ultimateTimer - dt);
```

- [ ] **Step 3: Add R key handler in player input block**

In the player input block (where Q and E are handled), after the E key block add:

```js
      if (input.justPressed['r'] && this.ultimateTimer <= 0) {
        WIZARD_TYPES[this.wizardType].useUltimate(this, game);
        this.ultimateTimer = this.ultimateCooldown;
        game.announcements.push({ text: `[R] ${WIZARD_TYPES[this.wizardType].name} ultimate!`, duration: 2, maxDuration: 2 });
      }
```

- [ ] **Step 4: Commit**

```bash
git add js/entities/Wizard.js
git commit -m "feat: R key ultimate spell with 45s cooldown"
```

---

### Task 7: useUltimate() for all 6 wizard types + HealZone class

**Files:**
- Modify: `js/wizards/WizardTypes.js`

- [ ] **Step 1: Add HealZone class at the bottom of WizardTypes.js (before the closing)**

Add after `VoidPortal` class:

```js
class HealZone {
  constructor(x, y, owner, duration) {
    this.x = x; this.y = y;
    this.owner = owner; // the wizard who cast it
    this.radius = 100;
    this.duration = duration;
    this.maxDuration = duration;
    this.tickTimer = 0;
    this.alive = true;
    this.type = 'heal_zone';
    this.team = owner.team;
  }
  update(dt, game) {
    this.duration -= dt;
    if (this.duration <= 0) { this.alive = false; return; }
    this.tickTimer -= dt;
    if (this.tickTimer <= 0) {
      this.tickTimer = 1.0;
      // Heal the owner
      if (this.owner && this.owner.alive) {
        this.owner.hp = Math.min(this.owner.maxHp, this.owner.hp + this.owner.maxHp * 0.25);
      }
      // Root enemies inside zone
      game.entities.forEach(e => {
        if (e.alive && e.team !== this.team && e.effects && dist(this, e) < this.radius) {
          e.effects.push({ type: 'root', duration: 1.2, magnitude: 0 });
        }
      });
      game.particles.push(...burst(this.x, this.y, '#4caf50', 8));
    }
  }
  draw(ctx) {
    const alpha = (this.duration / this.maxDuration) * 0.3;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = '#00cc44';
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}
```

- [ ] **Step 2: Add useUltimate to fire type**

In the `fire` object, add after `rushEffect`:

```js
    useUltimate(w, game) {
      // Meteorregn: 8 fireballs at random positions near aim point
      const mx = game.aimX || w.x;
      const my = game.aimY || w.y;
      for (let i = 0; i < 8; i++) {
        setTimeout(() => {
          const tx = mx + (Math.random() - 0.5) * 400;
          const ty = my + (Math.random() - 0.5) * 400;
          game.entities.push(new AoeEffect(tx, ty, 50, w.atk * 3, w.team, '#ff4500', 0.5));
          game.particles.push(...burst(tx, ty, '#ff6600', 12));
        }, i * 150);
      }
    },
```

- [ ] **Step 3: Add useUltimate to ice type**

```js
    useUltimate(w, game) {
      // Djupfrysning: freeze all enemies for 2s
      game.entities.forEach(e => {
        if (e.alive && e.team !== w.team && e.hp !== undefined && e.effects) {
          e.effects.push({ type: 'root', duration: 2.0, magnitude: 0 });
          game.particles.push(...burst(e.x, e.y, '#aaddff', 6));
        }
      });
      game.particles.push(...burst(w.x, w.y, '#7ecef4', 20));
    },
```

- [ ] **Step 4: Add useUltimate to thunder type**

```js
    useUltimate(w, game) {
      // Kedjeblixten: chain lightning up to 6 enemies
      const enemies = game.entities.filter(e =>
        e.alive && e.team !== w.team && e.hp !== undefined
      );
      const hit = new Set();
      let current = w;
      for (let i = 0; i < 6; i++) {
        let nearest = null, minD = 360;
        for (const e of enemies) {
          if (hit.has(e)) continue;
          const d = dist(current, e);
          if (d < minD) { minD = d; nearest = e; }
        }
        if (!nearest) break;
        hit.add(nearest);
        const delay = i * 100;
        ;(function(target, d) {
          setTimeout(() => {
            game.entities.push(new LightningStrike(target.x, target.y, w.atk * 2.5, w.team, 0));
            target.takeDamage(w.atk * 2.5, game);
          }, d);
        })(nearest, delay);
        current = nearest;
      }
    },
```

- [ ] **Step 5: Add useUltimate to shadow type**

```js
    useUltimate(w, game) {
      // Dödsmarkering: mark nearest enemy, deal atk*8 after 3s
      const enemies = game.entities.filter(e =>
        e.alive && e.team !== w.team && e.hp !== undefined && dist(w, e) < w.range
      );
      if (enemies.length === 0) return;
      enemies.sort((a, b) => dist(w, a) - dist(w, b));
      const target = enemies[0];
      target.deathMark = true;
      game.particles.push(...burst(target.x, target.y, '#8a4fff', 10));
      setTimeout(() => {
        if (target.alive) {
          target.takeDamage(w.atk * 8, game);
          game.particles.push(...burst(target.x, target.y, '#8a4fff', 20));
          game.entities.push(new AoeEffect(target.x, target.y, 60, 0, w.team, '#8a4fff', 0.3));
        }
      }, 3000);
    },
```

- [ ] **Step 6: Add useUltimate to nature type**

```js
    useUltimate(w, game) {
      // Helingslund: heal zone for 4s
      game.entities.push(new HealZone(w.x, w.y, w, 4));
      game.particles.push(...burst(w.x, w.y, '#4caf50', 20));
    },
```

- [ ] **Step 7: Add useUltimate to void type**

```js
    useUltimate(w, game) {
      // Singularitet: massive black hole
      game.entities.push(new BlackHole(w.x, w.y, w.atk * 3, w.team, 3));
      // Override pull strength by tagging it
      const bh = game.entities[game.entities.length - 1];
      bh._superPull = true;
      game.particles.push(...burst(w.x, w.y, '#9c27b0', 25));
    },
```

- [ ] **Step 8: Update BlackHole.update() to support _superPull**

In `BlackHole.update()`, find `e.x += n.x * 60 * dt;` and replace the pull block:

```js
          const pullStrength = this._superPull ? 300 : 60;
          e.x += n.x * pullStrength * dt;
          e.y += n.y * pullStrength * dt;
```

- [ ] **Step 9: Commit**

```bash
git add js/wizards/WizardTypes.js
git commit -m "feat: R ultimate spells for all 6 wizard types + HealZone class"
```

---

### Task 8: HUD — add R spell slot

**Files:**
- Modify: `js/ui/HUD.js`

- [ ] **Step 1: Update _drawPlayerPanel to show Q, E, R**

In `_drawPlayerPanel`, find the ability cooldowns section (currently shows Q and E) and replace it:

```js
    // Spell bar: Q, E, R
    const spells = [
      { key: 'Q', ready: pw.abilityTimer <= 0, timer: pw.abilityTimer, color: '#aaffaa' },
      { key: 'E', ready: pw.rushTimer <= 0,    timer: pw.rushTimer,    color: '#aaffaa' },
      { key: 'R', ready: pw.ultimateTimer <= 0, timer: pw.ultimateTimer, color: '#ff6666' },
    ];
    spells.forEach((sp, i) => {
      const sx = px + 8 + i * 70;
      const sy = py + 60;
      ctx.fillStyle = sp.ready ? (sp.key === 'R' ? '#660000' : '#224400') : '#222';
      ctx.fillRect(sx, sy, 62, 16);
      ctx.strokeStyle = sp.ready ? sp.color : '#555';
      ctx.lineWidth = 1;
      ctx.strokeRect(sx, sy, 62, 16);
      ctx.fillStyle = sp.ready ? sp.color : '#666';
      ctx.font = '9px Arial';
      ctx.textAlign = 'left';
      ctx.fillText(
        `[${sp.key}] ${sp.ready ? 'Redo' : sp.timer.toFixed(1) + 's'}`,
        sx + 3, sy + 11
      );
    });
```

- [ ] **Step 2: Commit**

```bash
git add js/ui/HUD.js
git commit -m "feat: HUD spell bar shows Q E R with cooldowns"
```

---

### Task 9: Push to GitHub

- [ ] **Step 1: Final push**

```bash
git push origin master
```

GitHub Pages will auto-update within ~2 minutes at `https://abinitio888.github.io/game_max_2/`.

---

## Self-Review

**Spec coverage:**
- ✅ Three.js via CDN — Task 1
- ✅ ThreeRenderer with scene/camera/lights — Task 3
- ✅ Mesh per entity type — Task 2
- ✅ HUD as 2D overlay canvas — Task 4
- ✅ Coordinate mapping (px - C.W/2) / 50 — Task 3
- ✅ Outer wall clamp to [40, C.W-40] — Task 5
- ✅ Remove resolveWallCollision — Task 5
- ✅ R ultimate (45s cooldown, R key) — Task 6
- ✅ All 6 useUltimate() implementations — Task 7
- ✅ HealZone class — Task 7
- ✅ HUD R slot — Task 8
- ✅ BlackHole _superPull — Task 7

**Type consistency:**
- `createMeshForEntity(entity)` used in ThreeRenderer._getOrCreateMesh ✅
- `HealZone` type = `'heal_zone'` matches `makeHealZoneMesh` case in factory ✅
- `entity.bobTimer` read in ThreeRenderer, set in ItemPickup.update() ✅
- `entity.ultimateTimer` set in Task 6, read in HUD Task 8 ✅
- `game.aimX / game.aimY` set in Task 4, read in fire ultimate Task 7 ✅
