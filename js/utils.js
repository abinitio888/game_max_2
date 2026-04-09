// ============================================================
//  UTILITIES
// ============================================================

function computeStats(type, stars, level) {
  const b = C.BASE_STATS[type];
  const sm = C.STAR_MULT[stars];
  const lv = level - 1;
  return {
    hp:      Math.floor(b.hp  * sm * (1 + C.LEVEL_BONUS.hp  * lv)),
    atk:     Math.floor(b.atk * sm * (1 + C.LEVEL_BONUS.atk * lv)),
    spd:     Math.floor(b.spd * sm * (1 + C.LEVEL_BONUS.spd * lv)),
    range:   b.range,
    atkRate: b.atkRate,
    projSpd: b.projSpd,
  };
}

function dist(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function normalize(dx, dy) {
  const len = Math.hypot(dx, dy) || 1;
  return { x: dx / len, y: dy / len };
}

function rectOverlap(ax, ay, aw, ah, bx, by, bw, bh) {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

function circlesOverlap(ax, ay, ar, bx, by, br) {
  return Math.hypot(ax - bx, ay - by) < ar + br;
}

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

function randomFrom(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

let _uid = 0;
function uid() { return ++_uid; }

// ── Particles ────────────────────────────────────────────────
class Particle {
  constructor(x, y, color, vx, vy, life) {
    this.x = x; this.y = y;
    this.color = color;
    this.vx = vx; this.vy = vy;
    this.life = life; this.maxLife = life;
    this.r = 3 + Math.random() * 3;
  }
  update(dt) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.vy += 60 * dt;
    this.life -= dt;
  }
  draw(ctx) {
    ctx.globalAlpha = Math.max(0, this.life / this.maxLife);
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}

function burst(x, y, color, count = 10) {
  const p = [];
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const spd = 40 + Math.random() * 100;
    p.push(new Particle(x, y, color, Math.cos(angle) * spd, Math.sin(angle) * spd, 0.5 + Math.random() * 0.5));
  }
  return p;
}

// ── Canvas helpers ────────────────────────────────────────────
function drawStar(ctx, cx, cy, r, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const a = (i * 4 * Math.PI) / 5 - Math.PI / 2;
    const ai = ((i * 4 + 2) * Math.PI) / 5 - Math.PI / 2;
    if (i === 0) ctx.moveTo(cx + r * Math.cos(a), cy + r * Math.sin(a));
    else ctx.lineTo(cx + r * Math.cos(a), cy + r * Math.sin(a));
    ctx.lineTo(cx + (r * 0.45) * Math.cos(ai), cy + (r * 0.45) * Math.sin(ai));
  }
  ctx.closePath();
  ctx.fill();
}

function drawHpBar(ctx, x, y, w, hp, maxHp, color = '#22cc44') {
  const h = 5;
  ctx.fillStyle = '#333';
  ctx.fillRect(x - w / 2, y, w, h);
  const pct = clamp(hp / maxHp, 0, 1);
  ctx.fillStyle = pct > 0.5 ? color : pct > 0.25 ? '#ffaa00' : '#ff3333';
  ctx.fillRect(x - w / 2, y, w * pct, h);
}

function drawAnnouncement(ctx, text, alpha) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.font = 'bold 36px Arial';
  ctx.textAlign = 'center';
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 4;
  ctx.strokeText(text, C.W / 2, C.H / 2 - 40);
  ctx.fillStyle = '#fff';
  ctx.fillText(text, C.W / 2, C.H / 2 - 40);
  ctx.restore();
}

// ── Lane helpers ──────────────────────────────────────────────
function inLane(x, laneIdx) {
  return x >= C.LANE_LEFT[laneIdx] && x <= C.LANE_RIGHT[laneIdx];
}

function nearestLane(x) {
  let best = 0, bestD = Infinity;
  C.LANE_CENTERS.forEach((cx, i) => {
    const d = Math.abs(x - cx);
    if (d < bestD) { bestD = d; best = i; }
  });
  return best;
}

function inWall(x, y) {
  for (const r of C.WALL_RECTS) {
    if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) return true;
  }
  return false;
}

function resolveWallCollision(entity) {
  for (const r of C.WALL_RECTS) {
    const hw = entity.radius || 14;
    if (entity.x + hw > r.x && entity.x - hw < r.x + r.w &&
        entity.y + hw > r.y && entity.y - hw < r.y + r.h) {
      // push out on nearest axis
      const overlapLeft  = (entity.x + hw) - r.x;
      const overlapRight = (r.x + r.w) - (entity.x - hw);
      if (overlapLeft < overlapRight) entity.x -= overlapLeft;
      else entity.x += overlapRight;
    }
  }
}
