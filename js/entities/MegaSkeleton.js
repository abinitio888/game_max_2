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
    this.atkTimer = Math.max(0, this.atkTimer - dt);

    if (!this.targetTower || this.targetTower.destroyed) {
      this.targetTower = this.findTarget(game);
    }
    if (!this.targetTower) {
      // All towers gone - just stand still
      return;
    }

    const d = dist(this, this.targetTower);
    if (d > this.radius + this.targetTower.radius + 5) {
      // Move toward target
      const n = normalize(this.targetTower.x - this.x, this.targetTower.y - this.y);
      this.x += n.x * this.speed * dt;
      this.y += n.y * this.speed * dt;
      this.state = 'walking';
    } else {
      // Attack
      this.state = 'attacking';
      if (this.atkTimer <= 0) {
        this.atkTimer = 1.0;
        this.targetTower.takeDamage(C.MEGA_TOWER_DMG, game);
      }
    }

    // Knock back any wizard or skeleton that gets close (we're unstoppable)
    game.entities.forEach(e => {
      if (e.alive && e !== this && dist(this, e) < this.radius + (e.radius || 14)) {
        const n = normalize(e.x - this.x, e.y - this.y);
        e.x += n.x * 80 * dt;
        e.y += n.y * 80 * dt;
      }
    });
  }

  draw(ctx) {
    // Ominous glow ring
    ctx.globalAlpha = 0.35;
    ctx.strokeStyle = '#880000';
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius + 8, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;

    // Body
    ctx.fillStyle = '#444';
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();

    // Red eyes
    ctx.fillStyle = '#ff0000';
    ctx.beginPath();
    ctx.arc(this.x - 9, this.y - 5, 5, 0, Math.PI * 2);
    ctx.arc(this.x + 9, this.y - 5, 5, 0, Math.PI * 2);
    ctx.fill();

    // Bones pattern
    ctx.strokeStyle = '#777';
    ctx.lineWidth = 2;
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(this.x + Math.cos(a) * 12, this.y + Math.sin(a) * 12);
      ctx.lineTo(this.x + Math.cos(a) * (this.radius - 3), this.y + Math.sin(a) * (this.radius - 3));
      ctx.stroke();
    }

    // HP bar (large)
    drawHpBar(ctx, this.x, this.y + this.radius + 6, 80, this.hp, this.maxHp, '#cc2200');
    ctx.fillStyle = '#fff';
    ctx.font = '10px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('MEGA SKELETON', this.x, this.y + this.radius + 20);
  }
}
