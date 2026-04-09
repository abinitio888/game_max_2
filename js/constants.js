// ============================================================
//  GAME CONSTANTS
// ============================================================
const C = {
  W: 960, H: 640,

  // ── Map geometry ──────────────────────────────────────────
  LANE_CENTERS: [180, 480, 780],          // x centre of left / mid / right lane
  LANE_LEFT:    [80,  340, 680],          // left wall of each lane
  LANE_RIGHT:   [280, 620, 880],          // right wall of each lane
  WALL_RECTS: [                           // impassable wall strips
    { x: 280, y: 0, w: 60,  h: 640 },
    { x: 620, y: 0, w: 60,  h: 640 },
  ],
  PLAYER_BASE_Y: 590,
  ENEMY_BASE_Y:  50,
  BOSS_Y: 270,

  // ── Towers ────────────────────────────────────────────────
  SKEL_TOWER_HP:     750,
  NEXUS_TOWER_HP:    1000,
  TOWER_RADIUS:      28,
  SKEL_SPAWN_INTERVAL: 8,     // seconds between skeleton waves

  // ── Mega Skeleton ─────────────────────────────────────────
  MEGA_TRIGGER_TIME: 120,     // seconds into game
  MEGA_HP:           5000,
  MEGA_SPEED:        65,
  MEGA_TOWER_DMG:    99999,

  // ── Stars / levels ────────────────────────────────────────
  STAR_MULT: [null, 1.0, 1.5, 2.25],     // index by star count

  LEVEL_XP:    [80, 200],                 // XP to reach level 2, then level 3
  LEVEL_BONUS: { hp: 0.15, atk: 0.20, spd: 0.05 },

  // ── XP rewards ────────────────────────────────────────────
  XP_SKELETON:      5,
  XP_BOSS:          100,
  XP_ENEMY_WIZARD:  50,
  XP_TOWER:         75,

  // ── Items ─────────────────────────────────────────────────
  ITEM_SPEED_BONUS:  0.25,
  ITEM_HP_BONUS:     50,
  ITEM_DMG_BONUS:    0.30,

  // ── Boss ─────────────────────────────────────────────────
  BOSS_HP:    600,
  BOSS_SPEED: 50,
  BOSS_ATK:   20,
  BOSS_RANGE: 90,

  // ── Skeletons ─────────────────────────────────────────────
  SKEL_HP:      40,
  SKEL_SPEED:   70,
  SKEL_ATK_DMG: 8,     // normal skeleton attack damage
  SKEL_BEST_MULT: 6,   // multiplier for "best" skeleton (50 % of 80 HP base wizard)

  // ── Projectiles ───────────────────────────────────────────
  PROJ_LIFETIME: 2.5,  // seconds

  // ── Wizard base stats ────────────────────────────────────
  BASE_STATS: {
    fire:    { hp: 80,  atk: 18, spd: 140, range: 200, atkRate: 1.0, projSpd: 350 },
    ice:     { hp: 100, atk: 12, spd: 130, range: 180, atkRate: 0.8, projSpd: 280 },
    thunder: { hp: 70,  atk: 22, spd: 150, range: 250, atkRate: 1.2, projSpd: 500 },
    shadow:  { hp: 90,  atk: 15, spd: 160, range: 190, atkRate: 1.1, projSpd: 380 },
    nature:  { hp: 130, atk: 10, spd: 120, range: 170, atkRate: 0.7, projSpd: 260 },
    void:    { hp: 85,  atk: 20, spd: 145, range: 210, atkRate: 1.0, projSpd: 320 },
  },

  // ── Guld ─────────────────────────────────────────────────
  GOLD_EGG_COST:    100,
  GOLD_SKEL:        5,
  GOLD_BOSS:        50,
  GOLD_TOWER:       30,
  GOLD_ENEMY_WIZ:   25,
  EGG_STAR_RATES:   [0.50, 0.80, 1.00], // kumulativa: <0.50=1★, <0.80=2★, else 3★

  // ── Rush ─────────────────────────────────────────────────
  RUSH_COOLDOWN: 30,

  // ── Bot AI ────────────────────────────────────────────────
  BOT_DECISION_INTERVAL: 2.5,

  // ── Colours ───────────────────────────────────────────────
  LANE_COLOR:   '#2a2a3a',
  WALL_COLOR:   '#1a1a2e',
  BASE_P_COLOR: '#0d3b66',
  BASE_E_COLOR: '#6b0e1e',
  BG_COLOR:     '#12121f',
};
