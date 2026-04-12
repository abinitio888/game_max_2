// ============================================================
//  MEGA SKELETON  (spawns at 2-minute mark)
// ============================================================
class MegaSkeleton extends Entity {
  constructor(x, y) {
    super(x, y, 'neutral');
    this.hp = this.maxHp = C.MEGA_HP;
    this.speed = C.MEGA_SPEED;
    this.radius = 30;
    this.type = 'mega_skeleton';
    this.state = 'seeking'; // 'seeking' | 'walking' | 'attacking' | 'dead'
    this.targetTower = null;
    this.atkTimer = 0;
    this.effects = [];
    this._t = 0;
  }

  findTarget(game) {
    let best = null, bestD = Infinity;
    for (const t of game.towers) {
      if (t.destroyed) continue;
      const d = dist(this, t);
      if (d < bestD) { bestD = d; best = t; }
    }
    return best;
  }

  onDeath(game) {
    game.particles.push(...burst(this.x, this.y, '#666', 30));
  }

  update(dt, game) {
    if (this.state === 'dead') return;
    this._t += dt;
    this.atkTimer = Math.max(0, this.atkTimer - dt);

    if (!this.targetTower || this.targetTower.destroyed) {
      this.targetTower = this.findTarget(game);
    }
    if (!this.targetTower) {
      return;
    }

    const d = dist(this, this.targetTower);
    if (d > this.radius + this.targetTower.radius + 5) {
      const n = normalize(this.targetTower.x - this.x, this.targetTower.y - this.y);
      this.x += n.x * this.speed * dt;
      this.y += n.y * this.speed * dt;
      this.state = 'walking';
    } else {
      this.state = 'attacking';
      if (this.atkTimer <= 0) {
        this.atkTimer = 1.0;
        this.targetTower.takeDamage(C.MEGA_TOWER_DMG, game);
      }
    }

    // Knock back any wizard or skeleton that gets close
    game.entities.forEach(e => {
      if (e.alive && e !== this && dist(this, e) < this.radius + (e.radius || 14)) {
        const n = normalize(e.x - this.x, e.y - this.y);
        e.x += n.x * 80 * dt;
        e.y += n.y * 80 * dt;
      }
    });
  }

  draw(ctx) {
    const cx = this.x, cy = this.y;
    const r  = this.radius; // 30
    const t  = this._t || 0;

    ctx.save();
    ctx.translate(cx, cy);

    // ── Outer ominous pulse ───────────────────────────────────
    const pulse = Math.abs(Math.sin(t * 2.5)) * 0.4 + 0.15;
    ctx.globalAlpha = pulse;
    ctx.fillStyle = '#cc0000';
    ctx.beginPath();
    ctx.arc(0, 0, r + 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    // Inner dark aura
    ctx.globalAlpha = 0.4;
    ctx.fillStyle = '#330000';
    ctx.beginPath();
    ctx.arc(0, 0, r + 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    // ── Body / ribcage ───────────────────────────────────────
    const boneColor = '#c8c8c8';
    ctx.strokeStyle = boneColor;
    ctx.lineCap = 'round';

    // Spine
    ctx.lineWidth = r * 0.12;
    ctx.beginPath();
    ctx.moveTo(0, -r * 0.05);
    ctx.lineTo(0,  r * 1.05);
    ctx.stroke();

    // Ribs (4 pairs, larger)
    ctx.lineWidth = r * 0.1;
    for (let i = 0; i < 4; i++) {
      const ry  = r * (0.05 + i * 0.27);
      const rw  = r * (0.88 - i * 0.12);
      ctx.beginPath();
      ctx.moveTo(-rw, ry);
      ctx.quadraticCurveTo(-rw * 0.5, ry - r * 0.08, 0, ry - r * 0.04);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo( rw, ry);
      ctx.quadraticCurveTo( rw * 0.5, ry - r * 0.08, 0, ry - r * 0.04);
      ctx.stroke();
    }

    // Hip bone
    ctx.lineWidth = r * 0.14;
    ctx.beginPath();
    ctx.moveTo(-r * 0.65, r * 1.05);
    ctx.lineTo( r * 0.65, r * 1.05);
    ctx.stroke();

    // Legs
    ctx.lineWidth = r * 0.12;
    ctx.beginPath();
    ctx.moveTo(-r * 0.45, r * 1.05);
    ctx.lineTo(-r * 0.55, r * 1.75);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo( r * 0.45, r * 1.05);
    ctx.lineTo( r * 0.55, r * 1.75);
    ctx.stroke();

    // Raised attacking arms
    const armSwing = Math.sin(t * 3) * 0.15;
    ctx.lineWidth = r * 0.12;
    // Left arm (raised menacingly)
    ctx.beginPath();
    ctx.moveTo(-r * 0.1, r * 0.1);
    ctx.lineTo(-r * 1.3, -r * 0.3 + armSwing * r);
    ctx.stroke();
    // Left forearm
    ctx.beginPath();
    ctx.moveTo(-r * 1.3, -r * 0.3 + armSwing * r);
    ctx.lineTo(-r * 1.1, -r * 0.9);
    ctx.stroke();
    // Right arm
    ctx.beginPath();
    ctx.moveTo( r * 0.1, r * 0.1);
    ctx.lineTo( r * 1.3, -r * 0.3 - armSwing * r);
    ctx.stroke();
    // Right forearm
    ctx.beginPath();
    ctx.moveTo( r * 1.3, -r * 0.3 - armSwing * r);
    ctx.lineTo( r * 1.1, -r * 0.9);
    ctx.stroke();

    // Clawed fingers (left hand)
    ctx.lineWidth = r * 0.07;
    for (let f = -1; f <= 1; f++) {
      ctx.beginPath();
      ctx.moveTo(-r * 1.1, -r * 0.9);
      ctx.lineTo(-r * (1.2 + f * 0.12), -r * 1.22);
      ctx.stroke();
    }
    // Clawed fingers (right hand)
    for (let f = -1; f <= 1; f++) {
      ctx.beginPath();
      ctx.moveTo( r * 1.1, -r * 0.9);
      ctx.lineTo( r * (1.2 + f * 0.12), -r * 1.22);
      ctx.stroke();
    }

    // ── Crown ────────────────────────────────────────────────
    const crownY = -r * 1.62;
    ctx.fillStyle = '#cc9900';
    ctx.strokeStyle = '#ffdd44';
    ctx.lineWidth = r * 0.05;
    // Crown band
    ctx.fillRect(-r * 0.52, crownY, r * 1.04, r * 0.22);
    // Crown spikes
    const spikes = [[-0.44, -0.18], [0, -0.26], [0.44, -0.18]];
    for (const [sx, sy] of spikes) {
      ctx.beginPath();
      ctx.moveTo(sx * r - r * 0.1, crownY);
      ctx.lineTo(sx * r, crownY + sy * r);
      ctx.lineTo(sx * r + r * 0.1, crownY);
      ctx.closePath();
      ctx.fill();
    }
    // Crown gems
    const gemCols = ['#ff3333', '#33ff99', '#3388ff'];
    for (let g = 0; g < 3; g++) {
      ctx.fillStyle = gemCols[g];
      ctx.beginPath();
      ctx.arc((g - 1) * r * 0.36, crownY + r * 0.11, r * 0.08, 0, Math.PI * 2);
      ctx.fill();
    }

    // ── Skull ────────────────────────────────────────────────
    const skullY = -r * 1.38;
    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath();
    ctx.arc(r * 0.1, skullY + r * 0.05, r * 0.62, 0, Math.PI * 2);
    ctx.fill();
    // Dome
    ctx.fillStyle = boneColor;
    ctx.beginPath();
    ctx.arc(0, skullY, r * 0.6, 0, Math.PI * 2);
    ctx.fill();
    // Side shadow
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.beginPath();
    ctx.arc(r * 0.18, skullY, r * 0.52, -Math.PI * 0.4, Math.PI * 0.6);
    ctx.fill();
    // Jaw
    ctx.fillStyle = boneColor;
    ctx.beginPath();
    ctx.moveTo(-r * 0.4, skullY + r * 0.28);
    ctx.lineTo( r * 0.4, skullY + r * 0.28);
    ctx.lineTo( r * 0.34, skullY + r * 0.52);
    ctx.lineTo(-r * 0.34, skullY + r * 0.52);
    ctx.closePath();
    ctx.fill();

    // Eye sockets
    ctx.fillStyle = '#080810';
    ctx.beginPath();
    ctx.arc(-r * 0.22, skullY - r * 0.08, r * 0.19, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc( r * 0.22, skullY - r * 0.08, r * 0.19, 0, Math.PI * 2);
    ctx.fill();

    // Red eye glow (pulsing)
    const eyePulse = Math.abs(Math.sin(t * 4)) * 0.4 + 0.6;
    ctx.globalAlpha = eyePulse;
    ctx.fillStyle = '#ff2200';
    ctx.beginPath();
    ctx.arc(-r * 0.22, skullY - r * 0.08, r * 0.13, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc( r * 0.22, skullY - r * 0.08, r * 0.13, 0, Math.PI * 2);
    ctx.fill();
    // Eye gleam
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#ff9977';
    ctx.beginPath();
    ctx.arc(-r * 0.24, skullY - r * 0.11, r * 0.05, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc( r * 0.20, skullY - r * 0.11, r * 0.05, 0, Math.PI * 2);
    ctx.fill();

    // Nasal cavity
    ctx.fillStyle = '#1a1a1a';
    ctx.beginPath();
    ctx.moveTo(-r * 0.07, skullY + r * 0.14);
    ctx.lineTo( r * 0.07, skullY + r * 0.14);
    ctx.lineTo(0, skullY + r * 0.26);
    ctx.closePath();
    ctx.fill();

    // Teeth (6 large)
    ctx.fillStyle = '#1a1a1a';
    for (let i = -2; i <= 2; i++) {
      if (i === 0) continue; // gap in middle
      const tx = i * r * 0.15;
      ctx.fillRect(tx - r * 0.06, skullY + r * 0.3, r * 0.1, r * 0.18);
    }

    ctx.restore();

    // HP bar (large, above skull)
    drawHpBar(ctx, cx, cy - r * 2.85, 90, this.hp, this.maxHp, '#cc2200');

    // Name label
    ctx.fillStyle = '#cc4444';
    ctx.font = 'bold 9px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('☠ MEGA SKELETT ☠', cx, cy - r * 2.85 - 6);
  }
}
