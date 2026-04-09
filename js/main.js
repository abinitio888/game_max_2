// ============================================================
//  MAIN.JS  –  game loop, state machine, input, initialization
// ============================================================

// ── Canvas setup ────────────────────────────────────────────
const canvas = document.getElementById('gameCanvas');
const ctx    = canvas.getContext('2d');
canvas.width  = C.W;
canvas.height = C.H;

// Scale canvas to window
function resizeCanvas() {
  const scaleX = window.innerWidth  / C.W;
  const scaleY = window.innerHeight / C.H;
  const scale  = Math.min(scaleX, scaleY, 1.5);
  canvas.style.width  = (C.W * scale) + 'px';
  canvas.style.height = (C.H * scale) + 'px';
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// ── Input ────────────────────────────────────────────────────
const input = {
  keys:       {},
  justPressed:{},
  mouseClick: false,
  mouse:      { x: C.W / 2, y: C.H / 2 },
};

window.addEventListener('keydown', e => {
  const k = e.key.toLowerCase();
  if (!input.keys[k]) input.justPressed[k] = true;
  input.keys[k] = true;
  // Prevent browser scroll
  if (['arrowup','arrowdown','arrowleft','arrowright',' '].includes(k)) e.preventDefault();
});
window.addEventListener('keyup', e => {
  input.keys[e.key.toLowerCase()] = false;
});

function canvasCoords(e) {
  const rect   = canvas.getBoundingClientRect();
  const scaleX = C.W / rect.width;
  const scaleY = C.H / rect.height;
  const cx = e.touches ? e.touches[0].clientX : e.clientX;
  const cy = e.touches ? e.touches[0].clientY : e.clientY;
  return { x: (cx - rect.left) * scaleX, y: (cy - rect.top) * scaleY };
}

canvas.addEventListener('mousemove', e => {
  const c = canvasCoords(e);
  input.mouse.x = c.x;
  input.mouse.y = c.y;
});
canvas.addEventListener('mousedown', e => {
  const c = canvasCoords(e);
  input.mouse.x = c.x;
  input.mouse.y = c.y;
  input.mouseClick = true;
  handleClick(c.x, c.y);
});
canvas.addEventListener('touchstart', e => {
  e.preventDefault();
  const c = canvasCoords(e);
  input.mouse.x = c.x;
  input.mouse.y = c.y;
  input.mouseClick = true;
  handleClick(c.x, c.y);
}, { passive: false });

// ── Game state ────────────────────────────────────────────────
const game = {
  state:        'START_SCREEN', // START_SCREEN | WIZARD_SELECT | PLAYING | WIZARD_DEAD | GAME_OVER
  winner:       null,
  globalTimer:  0,

  entities:     [],   // all active non-tower entities
  towers:       [],   // all 6 towers
  bosses:       [],   // references to boss entities (also in entities)

  playerWizard: null,
  enemyWizard:  null,
  enemyRespawnTimer: 0,

  playerNexus:      null,
  enemyNexus:       null,
  playerSkelTwr1:   null,
  playerSkelTwr2:   null,
  enemySkelTwr1:    null,
  enemySkelTwr2:    null,

  particles:    [],
  announcements:[],

  usedWizardIds: new Set(),

  // Systems
  map:       new GameMap(),
  spawnSys:  new SpawnSystem(),
  collision: new CollisionSystem(),
  combat:    new CombatSystem(),
  botAI:     new BotAI(),

  // UI
  gacha:      null, // initialized below
  startScreen: null,
  rosterUI:   new RosterUI(),
  victoryScreen: new VictoryScreen(),

  // ── Methods ──────────────────────────────────────────────
  init() {
    this.gacha      = new GachaSystem();
    this.startScreen = new StartScreen(this.gacha);
    this._setupTowers();
    this._setupBosses();
  },

  _setupTowers() {
    this.towers = [];

    this.playerSkelTwr1 = new Tower(C.LANE_CENTERS[0], C.PLAYER_BASE_Y, 'player', 'skeleton');
    this.playerSkelTwr2 = new Tower(C.LANE_CENTERS[2], C.PLAYER_BASE_Y, 'player', 'skeleton');
    this.playerNexus    = new Tower(C.LANE_CENTERS[1], C.PLAYER_BASE_Y, 'player', 'nexus');

    this.enemySkelTwr1  = new Tower(C.LANE_CENTERS[0], C.ENEMY_BASE_Y, 'enemy', 'skeleton');
    this.enemySkelTwr2  = new Tower(C.LANE_CENTERS[2], C.ENEMY_BASE_Y, 'enemy', 'skeleton');
    this.enemyNexus     = new Tower(C.LANE_CENTERS[1], C.ENEMY_BASE_Y, 'enemy', 'nexus');

    // Stagger initial spawn timers
    this.playerSkelTwr1.spawnTimer = C.SKEL_SPAWN_INTERVAL * 0.3;
    this.playerSkelTwr2.spawnTimer = C.SKEL_SPAWN_INTERVAL * 0.7;
    this.enemySkelTwr1.spawnTimer  = C.SKEL_SPAWN_INTERVAL * 0.5;
    this.enemySkelTwr2.spawnTimer  = C.SKEL_SPAWN_INTERVAL * 0.9;

    this.towers = [
      this.playerSkelTwr1, this.playerSkelTwr2, this.playerNexus,
      this.enemySkelTwr1,  this.enemySkelTwr2,  this.enemyNexus,
    ];
  },

  _setupBosses() {
    this.bosses = [];
    for (let i = 0; i < 3; i++) {
      const b = new Boss(C.LANE_CENTERS[i], C.BOSS_Y, i);
      this.bosses.push(b);
      this.entities.push(b);
    }
  },

  spawnEnemyWizard() {
    const roster = this.gacha.getRoster();
    const wData  = roster[Math.floor(Math.random() * roster.length)];
    if (!wData) return;
    const ew = new EnemyWizard({ ...wData });
    ew.x = C.LANE_CENTERS[Math.floor(Math.random() * 3)];
    ew.y = C.ENEMY_BASE_Y + 30;
    this.enemyWizard = ew;
    this.entities.push(ew);
  },

  deployPlayerWizard(wData) {
    this.usedWizardIds.add(wData.id);
    const w = new Wizard(wData, 'player');
    w.x = this.playerNexus ? this.playerNexus.x : C.LANE_CENTERS[1];
    w.y = this.playerNexus ? this.playerNexus.y - 40 : C.PLAYER_BASE_Y - 40;
    this.playerWizard = w;
    this.entities.push(w);
    this.state = 'PLAYING';

    // Start enemy wizard if not present
    if (!this.enemyWizard || !this.enemyWizard.alive) {
      this.spawnEnemyWizard();
    }
  },

  onTowerDestroyed(tower) {
    if (tower.towerType === 'nexus') return; // handled by combat system

    // Give XP for destroying towers
    if (this.playerWizard && this.playerWizard.alive && this.playerWizard.team !== tower.team) {
      this.playerWizard.gainXP(C.XP_TOWER);
      this.earnGold(C.GOLD_TOWER);
    }

    // Check if this was triggered by mega skeleton cascade
    // After any skeleton tower dies, check if we should cascade
    const aliveSkelTowers = this.towers.filter(t => t.towerType === 'skeleton' && !t.destroyed);

    // Only cascade if the mega skeleton is active (post-2min event)
    if (this.spawnSys.megaTriggered) {
      // Explode remaining skeleton towers with delay
      let delay = 600;
      for (const t of aliveSkelTowers) {
        if (t !== tower) {
          setTimeout(() => {
            if (!t.destroyed) {
              t.takeDamage(C.MEGA_TOWER_DMG, this);
            }
          }, delay);
          delay += 500;
        }
      }
    }
  },

  earnGold(amount) {
    if (this.gacha) this.gacha.earnGold(amount);
  },

  endGame(winner) {
    this.state  = 'GAME_OVER';
    this.winner = winner;
    this.victoryScreen.enter(winner);
  },

  resetToStart() {
    this.state       = 'START_SCREEN';
    this.winner      = null;
    this.globalTimer = 0;
    this.entities    = [];
    this.particles   = [];
    this.announcements = [];
    this.usedWizardIds = new Set();
    this.playerWizard  = null;
    this.enemyWizard   = null;
    this.enemyRespawnTimer = 0;
    this.spawnSys    = new SpawnSystem();
    this.botAI       = new BotAI();
    this._setupTowers();
    this._setupBosses();
  },
};

// ── Click dispatcher ─────────────────────────────────────────
function handleClick(mx, my) {
  if (game.state === 'START_SCREEN')  game.startScreen.handleClick(mx, my, game);
  if (game.state === 'WIZARD_SELECT') game.rosterUI.handleClick(mx, my, game);
  if (game.state === 'WIZARD_DEAD')   game.rosterUI.handleClick(mx, my, game);
  if (game.state === 'GAME_OVER')     game.victoryScreen.handleClick(mx, my, game);
}

// ── Game loop ─────────────────────────────────────────────────
let lastTime = 0;
function gameLoop(timestamp) {
  const dt = Math.min((timestamp - lastTime) / 1000, 0.05);
  lastTime = timestamp;

  update(dt);
  draw();

  // Clear justPressed after each frame
  for (const k in input.justPressed) delete input.justPressed[k];

  requestAnimationFrame(gameLoop);
}

function update(dt) {
  switch (game.state) {
    case 'START_SCREEN':
      game.startScreen.update(dt);
      break;

    case 'WIZARD_SELECT':
      break;

    case 'WIZARD_DEAD':
      break;

    case 'PLAYING': {
      game.globalTimer += dt;

      // Update player wizard
      if (game.playerWizard && game.playerWizard.alive) {
        game.playerWizard.update(dt, input, game);
      }

      // Update towers
      for (const t of game.towers) t.update(dt, game);

      // Update all entities (skeletons, bosses, projectiles, special entities)
      for (const e of game.entities) {
        if (e.alive && e !== game.playerWizard && e !== game.enemyWizard) {
          if (typeof e.update === 'function') e.update(dt, game);
        }
      }

      // Bot AI + enemy wizard
      game.botAI.update(dt, game);

      // Spawn system (mega skeleton)
      game.spawnSys.update(dt, game);

      // Collision
      game.collision.update(game);

      // Combat cleanup + win check
      game.combat.update(game);

      // Particles
      game.particles = game.particles.filter(p => {
        p.update(dt);
        return p.life > 0;
      });

      break;
    }

    case 'GAME_OVER':
      game.victoryScreen.update(dt);
      break;
  }
}

function draw() {
  ctx.clearRect(0, 0, C.W, C.H);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';

  switch (game.state) {
    case 'START_SCREEN':
      game.startScreen.draw(ctx, game);
      break;

    case 'WIZARD_SELECT':
      game.map.draw(ctx);
      drawTowersAndEntities(ctx);
      // Dim + show roster UI
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(0, 0, C.W, C.H);
      game.rosterUI.draw(ctx, game);
      break;

    case 'PLAYING':
      game.map.draw(ctx);
      drawTowersAndEntities(ctx);
      for (const p of game.particles) p.draw(ctx);
      game.hud = game.hud || new HUD();
      game.hud.draw(ctx, game);
      break;

    case 'WIZARD_DEAD':
      game.map.draw(ctx);
      drawTowersAndEntities(ctx);
      game.rosterUI.draw(ctx, game);
      break;

    case 'GAME_OVER':
      game.map.draw(ctx);
      drawTowersAndEntities(ctx);
      for (const p of game.particles) p.draw(ctx);
      game.victoryScreen.draw(ctx, game);
      break;
  }
}

function drawTowersAndEntities(ctx) {
  // Towers first (behind entities)
  for (const t of game.towers) t.draw(ctx);

  // Entities by Y order (painter's algorithm)
  const sorted = [...game.entities].sort((a, b) => (a.y || 0) - (b.y || 0));
  for (const e of sorted) {
    if (typeof e.draw === 'function') e.draw(ctx);
  }

  // Particles (drawn in game loop draw for PLAYING state)
  if (game.state !== 'PLAYING') {
    for (const p of game.particles) p.draw(ctx);
  }
}

// ── WIZARD_SELECT alias (same roster UI) ──────────────────────
// The WIZARD_SELECT state shows roster UI when first starting
// Hook into click handler
const origHandleClick = handleClick;

// ── Initialize and start ──────────────────────────────────────
game.init();
game.hud = new HUD();
requestAnimationFrame(gameLoop);
