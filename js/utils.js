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

// Draws an oval using 4 bezier curves — no ellipse() needed
function _oval(ctx, cx, cy, rx, ry) {
  const k = 0.5523;
  ctx.beginPath();
  ctx.moveTo(cx + rx, cy);
  ctx.bezierCurveTo(cx + rx, cy + ry * k, cx + rx * k, cy + ry, cx, cy + ry);
  ctx.bezierCurveTo(cx - rx * k, cy + ry, cx - rx, cy + ry * k, cx - rx, cy);
  ctx.bezierCurveTo(cx - rx, cy - ry * k, cx - rx * k, cy - ry, cx, cy - ry);
  ctx.bezierCurveTo(cx + rx * k, cy - ry, cx + rx, cy - ry * k, cx + rx, cy);
  ctx.closePath();
}

// ============================================================
//  WIZARD SPRITE  –  reusable canvas drawing for any radius
// ============================================================
function drawWizardSprite(ctx, x, y, color, glowColor, facingAngle, r) {
  ctx.save();
  ctx.translate(x, y);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Glow aura
  ctx.globalAlpha = 0.22;
  ctx.fillStyle = glowColor;
  _oval(ctx, 0, r * 0.3, r * 1.5, r * 0.55);
  ctx.fill();
  ctx.globalAlpha = 1;

  const lx = Math.cos(facingAngle) * r * 0.15;
  const ly = Math.sin(facingAngle) * r * 0.15;

  // ── Body outline (drawn first, slightly larger, for pop) ──
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.beginPath();
  ctx.moveTo(-r * 0.66, -r * 0.36);
  ctx.lineTo( r * 0.66, -r * 0.36);
  ctx.lineTo( r * 1.08,  r * 1.3);
  ctx.lineTo(-r * 1.08,  r * 1.3);
  ctx.closePath();
  ctx.fill();
  // Head outline
  ctx.beginPath();
  ctx.arc(0, -r * 0.9, r * 0.56, 0, Math.PI * 2);
  ctx.fill();

  // ── Robe shadow ──────────────────────────────────────────
  ctx.fillStyle = 'rgba(0,0,0,0.28)';
  ctx.beginPath();
  ctx.moveTo(-r * 0.62, -r * 0.3);
  ctx.lineTo( r * 0.62, -r * 0.3);
  ctx.lineTo( r * 1.05,  r * 1.28);
  ctx.lineTo(-r * 1.05,  r * 1.28);
  ctx.closePath();
  ctx.fill();

  // ── Robe main ────────────────────────────────────────────
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(-r * 0.6,  -r * 0.32);
  ctx.lineTo( r * 0.6,  -r * 0.32);
  ctx.lineTo( r * 1.0,   r * 1.22);
  ctx.lineTo(-r * 1.0,   r * 1.22);
  ctx.closePath();
  ctx.fill();

  // Robe left-side darkening (polygon, no gradient)
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ctx.beginPath();
  ctx.moveTo(-r * 0.6,  -r * 0.32);
  ctx.lineTo(-r * 0.18, -r * 0.32);
  ctx.lineTo(-r * 0.25,  r * 1.22);
  ctx.lineTo(-r * 1.0,   r * 1.22);
  ctx.closePath();
  ctx.fill();

  // Robe centre stripe
  ctx.fillStyle = 'rgba(255,255,255,0.13)';
  ctx.beginPath();
  ctx.moveTo(-r * 0.15, -r * 0.32);
  ctx.lineTo( r * 0.15, -r * 0.32);
  ctx.lineTo( r * 0.28,  r * 1.22);
  ctx.lineTo(-r * 0.28,  r * 1.22);
  ctx.closePath();
  ctx.fill();

  // ── Belt ─────────────────────────────────────────────────
  ctx.fillStyle = '#2e1804';
  ctx.beginPath();
  ctx.moveTo(-r * 0.65, r * 0.26);
  ctx.lineTo( r * 0.65, r * 0.26);
  ctx.lineTo( r * 0.7,  r * 0.44);
  ctx.lineTo(-r * 0.7,  r * 0.44);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#c8901a';
  ctx.fillRect(-r * 0.13, r * 0.28, r * 0.26, r * 0.14);
  ctx.strokeStyle = '#8a5c08';
  ctx.lineWidth = r * 0.05;
  ctx.strokeRect(-r * 0.13, r * 0.28, r * 0.26, r * 0.14);

  // ── Shoulder pads ────────────────────────────────────────
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(-r * 0.62, -r * 0.24, r * 0.27, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc( r * 0.62, -r * 0.24, r * 0.27, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.22)';
  ctx.lineWidth = r * 0.08;
  ctx.beginPath();
  ctx.arc(-r * 0.62, -r * 0.24, r * 0.27, Math.PI, 0);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc( r * 0.62, -r * 0.24, r * 0.27, Math.PI, 0);
  ctx.stroke();

  // ── Wand arm ─────────────────────────────────────────────
  const wx = Math.cos(facingAngle) * r * 1.35;
  const wy = Math.sin(facingAngle) * r * 1.35;
  const aX = r * 0.54, aY = r * 0.02;
  // Sleeve
  ctx.strokeStyle = color;
  ctx.lineWidth = r * 0.26;
  ctx.beginPath();
  ctx.moveTo(aX, aY);
  ctx.lineTo(aX + wx * 0.52, aY + wy * 0.52);
  ctx.stroke();
  // Forearm (skin)
  ctx.strokeStyle = '#d4946a';
  ctx.lineWidth = r * 0.19;
  ctx.beginPath();
  ctx.moveTo(aX + wx * 0.46, aY + wy * 0.46);
  ctx.lineTo(aX + wx * 0.74, aY + wy * 0.74);
  ctx.stroke();
  // Wand stick
  ctx.strokeStyle = '#5a3010';
  ctx.lineWidth = r * 0.1;
  ctx.beginPath();
  ctx.moveTo(aX + wx * 0.68, aY + wy * 0.68);
  ctx.lineTo(aX + wx, aY + wy);
  ctx.stroke();
  // Wand tip glow
  const tipX = aX + wx, tipY = aY + wy;
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(tipX, tipY, r * 0.13, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 0.7;
  ctx.fillStyle = glowColor;
  ctx.beginPath();
  ctx.arc(tipX, tipY, r * 0.27, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 0.28;
  ctx.beginPath();
  ctx.arc(tipX, tipY, r * 0.54, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  // ── Neck ─────────────────────────────────────────────────
  ctx.fillStyle = '#c8845a';
  ctx.beginPath();
  ctx.arc(0, -r * 0.36, r * 0.2, 0, Math.PI * 2);
  ctx.fill();

  // ── Head shadow ──────────────────────────────────────────
  ctx.fillStyle = 'rgba(0,0,0,0.16)';
  ctx.beginPath();
  ctx.arc(r * 0.07, -r * 0.84, r * 0.51, 0, Math.PI * 2);
  ctx.fill();

  // ── Head skin ────────────────────────────────────────────
  ctx.fillStyle = '#f0b878';
  ctx.beginPath();
  ctx.arc(0, -r * 0.9, r * 0.5, 0, Math.PI * 2);
  ctx.fill();

  // Forehead highlight
  ctx.fillStyle = 'rgba(255,240,200,0.22)';
  ctx.beginPath();
  ctx.arc(-r * 0.1, -r * 1.06, r * 0.26, 0, Math.PI * 2);
  ctx.fill();

  // ── Eyebrows ─────────────────────────────────────────────
  ctx.strokeStyle = '#3a1e06';
  ctx.lineWidth = r * 0.1;
  ctx.beginPath();
  ctx.moveTo(-r * 0.34, -r * 1.04);
  ctx.quadraticCurveTo(-r * 0.19, -r * 1.1, -r * 0.06, -r * 1.04);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(r * 0.06, -r * 1.04);
  ctx.quadraticCurveTo(r * 0.19, -r * 1.1, r * 0.34, -r * 1.04);
  ctx.stroke();

  // ── Eyes ─────────────────────────────────────────────────
  ctx.fillStyle = '#f5f4ee';
  ctx.beginPath();
  ctx.arc(-r * 0.21, -r * 0.94, r * 0.13, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc( r * 0.21, -r * 0.94, r * 0.13, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#1a4090';
  ctx.beginPath();
  ctx.arc(-r * 0.21, -r * 0.94, r * 0.082, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc( r * 0.21, -r * 0.94, r * 0.082, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#06060e';
  ctx.beginPath();
  ctx.arc(-r * 0.21, -r * 0.94, r * 0.048, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc( r * 0.21, -r * 0.94, r * 0.048, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.88)';
  ctx.beginPath();
  ctx.arc(-r * 0.18, -r * 0.97, r * 0.028, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc( r * 0.24, -r * 0.97, r * 0.028, 0, Math.PI * 2);
  ctx.fill();

  // ── Nose ─────────────────────────────────────────────────
  ctx.strokeStyle = 'rgba(110,55,18,0.38)';
  ctx.lineWidth = r * 0.08;
  ctx.beginPath();
  ctx.moveTo(r * 0.05, -r * 0.86);
  ctx.lineTo(r * 0.13, -r * 0.79);
  ctx.lineTo(r * 0.05, -r * 0.77);
  ctx.stroke();

  // ── Mustache ─────────────────────────────────────────────
  ctx.fillStyle = '#6a3e18';
  ctx.beginPath();
  ctx.moveTo(-r * 0.26, -r * 0.73);
  ctx.quadraticCurveTo(-r * 0.13, -r * 0.665, 0, -r * 0.69);
  ctx.quadraticCurveTo( r * 0.13, -r * 0.665, r * 0.26, -r * 0.73);
  ctx.quadraticCurveTo( r * 0.13, -r * 0.775, 0, -r * 0.748);
  ctx.quadraticCurveTo(-r * 0.13, -r * 0.775, -r * 0.26, -r * 0.73);
  ctx.fill();

  // ── Beard ────────────────────────────────────────────────
  ctx.fillStyle = '#7a4820';
  ctx.beginPath();
  ctx.moveTo(-r * 0.3, -r * 0.71);
  ctx.lineTo( r * 0.3, -r * 0.71);
  ctx.lineTo( r * 0.22, -r * 0.4);
  ctx.quadraticCurveTo(0, -r * 0.3, -r * 0.22, -r * 0.4);
  ctx.closePath();
  ctx.fill();
  // Beard highlight stripe
  ctx.fillStyle = 'rgba(255,240,200,0.12)';
  ctx.beginPath();
  ctx.moveTo(-r * 0.09, -r * 0.7);
  ctx.lineTo( r * 0.09, -r * 0.7);
  ctx.lineTo( r * 0.07, -r * 0.43);
  ctx.lineTo(-r * 0.07, -r * 0.43);
  ctx.closePath();
  ctx.fill();

  // ── Hat cone ─────────────────────────────────────────────
  // Dark outline behind cone for pop
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.beginPath();
  ctx.moveTo(-r * 0.68, -r * 1.3);
  ctx.lineTo( r * 0.68, -r * 1.3);
  ctx.lineTo( lx,        -r * 2.82 + ly);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(-r * 0.64, -r * 1.34);
  ctx.lineTo( r * 0.64, -r * 1.34);
  ctx.lineTo( lx,        -r * 2.75 + ly);
  ctx.closePath();
  ctx.fill();
  // Cone highlight (left side lighter)
  ctx.fillStyle = 'rgba(255,255,255,0.15)';
  ctx.beginPath();
  ctx.moveTo(-r * 0.64, -r * 1.34);
  ctx.lineTo(-r * 0.1,  -r * 1.34);
  ctx.lineTo( lx,        -r * 2.75 + ly);
  ctx.closePath();
  ctx.fill();
  // Cone right-side shadow
  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  ctx.beginPath();
  ctx.moveTo(r * 0.1,  -r * 1.34);
  ctx.lineTo(r * 0.64, -r * 1.34);
  ctx.lineTo(lx,        -r * 2.75 + ly);
  ctx.closePath();
  ctx.fill();

  // ── Hat brim (oval via bezier) ────────────────────────────
  // Shadow oval
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  _oval(ctx, 0, -r * 1.32, r * 0.86, r * 0.19);
  ctx.fill();
  // Main brim
  ctx.fillStyle = color;
  _oval(ctx, 0, -r * 1.36, r * 0.84, r * 0.18);
  ctx.fill();
  // Brim edge highlight
  ctx.strokeStyle = 'rgba(255,255,255,0.2)';
  ctx.lineWidth = r * 0.06;
  _oval(ctx, 0, -r * 1.36, r * 0.84, r * 0.18);
  ctx.stroke();

  // ── Hat band ─────────────────────────────────────────────
  ctx.fillStyle = '#140a02';
  ctx.beginPath();
  ctx.moveTo(-r * 0.64, -r * 1.34);
  ctx.lineTo( r * 0.64, -r * 1.34);
  ctx.lineTo( r * 0.55, -r * 1.58);
  ctx.lineTo(-r * 0.55, -r * 1.58);
  ctx.closePath();
  ctx.fill();
  // Band buckle
  ctx.fillStyle = '#f0d040';
  ctx.fillRect(-r * 0.11, -r * 1.52, r * 0.22, r * 0.14);
  ctx.strokeStyle = '#a07820';
  ctx.lineWidth = r * 0.04;
  ctx.strokeRect(-r * 0.11, -r * 1.52, r * 0.22, r * 0.14);

  // ── Hat star ─────────────────────────────────────────────
  ctx.fillStyle = '#FFD700';
  ctx.globalAlpha = 0.95;
  const sx = lx * 0.45, sy = -r * 1.95 + ly * 0.45;
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const a  = (i * 4 * Math.PI) / 5 - Math.PI / 2;
    const ai = ((i * 4 + 2) * Math.PI) / 5 - Math.PI / 2;
    if (i === 0) ctx.moveTo(sx + Math.cos(a)  * r * 0.16, sy + Math.sin(a)  * r * 0.16);
    else         ctx.lineTo(sx + Math.cos(a)  * r * 0.16, sy + Math.sin(a)  * r * 0.16);
    ctx.lineTo(  sx + Math.cos(ai) * r * 0.07, sy + Math.sin(ai) * r * 0.07);
  }
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 1;

  ctx.restore();
}

