// ============================================================
//  TOWER
// ============================================================
class Tower {
  constructor(x, y, team, towerType) {
    this.x = x;
    this.y = y;
    this.team = team;       // 'player' | 'enemy'
    this.towerType = towerType; // 'skeleton' | 'nexus'
    this.hp = towerType === 'nexus' ? C.NEXUS_TOWER_HP : C.SKEL_TOWER_HP;
    this.maxHp = this.hp;
    this.radius = C.TOWER_RADIUS;
    this.destroyed = false;
    this.spawnTimer = 0;
    this.alive = true;
    this.type = 'tower';
    this.effects = [];
    // Visual
    this.explosionTimer = -1;
    this.explosionAlpha = 1;
  }

  takeDamage(amount, game) {
    if (this.destroyed) return;
    this.hp = Math.max(0, this.hp - amount);
    if (this.hp <= 0 && !this.destroyed) {
      this.destroyed = true;
      this.alive = false;
      this.startExplosion(game);
    }
  }

  startExplosion(game) {
    this.explosionTimer = 0.6;
    if (game && game.particles) {
      game.particles.push(...burst(this.x, this.y,
        this.team === 'player' ? '#4466ff' : '#ff4422', 25));
    }
    if (game) game.onTowerDestroyed(this);
  }

  update(dt, game) {
    if (this.explosionTimer > 0) {
      this.explosionTimer -= dt;
    }
    if (this.destroyed) return;

    if (this.towerType === 'skeleton') {
      this.spawnTimer -= dt;
      if (this.spawnTimer <= 0) {
        this.spawnTimer = C.SKEL_SPAWN_INTERVAL;
        game.spawnSys.spawnSkeleton(this, game);
      }

      // Damage aura: 8 dmg/s to enemies within 60px
      const AURA_R = 60, AURA_DPS = 8;
      for (const e of game.entities) {
        if (!e.alive || e.team === this.team || e.hp === undefined) continue;
        if (dist(this, e) < AURA_R + (e.radius || 14)) {
          e.takeDamage(AURA_DPS * dt, game);
        }
      }
    }
  }

  draw(ctx) {
    if (this.explosionTimer > 0) {
      const alpha = this.explosionTimer / 0.6;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = '#ff8800';
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius * 2 * (1 - alpha) + this.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      return;
    }
    if (this.destroyed) return;

    const isNexus = this.towerType === 'nexus';
    const teamColor = this.team === 'player' ? '#2266ff' : '#cc2222';
    const innerColor = isNexus ? (this.team === 'player' ? '#4499ff' : '#ff6644') : '#aaaaaa';

    // Damage aura ring (skeleton towers only)
    if (!isNexus) {
      const pulse = Math.abs(Math.sin(Date.now() / 700)) * 0.08 + 0.04;
      ctx.globalAlpha = pulse;
      ctx.fillStyle = teamColor;
      ctx.beginPath();
      ctx.arc(this.x, this.y, 60, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.globalAlpha = 0.3;
      ctx.strokeStyle = teamColor;
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 6]);
      ctx.beginPath();
      ctx.arc(this.x, this.y, 60, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;
    }

    // Outer ring
    ctx.strokeStyle = teamColor;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.stroke();

    // Body
    ctx.fillStyle = innerColor;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius - 4, 0, Math.PI * 2);
    ctx.fill();

    // Icon
    ctx.fillStyle = '#fff';
    ctx.font = `bold ${isNexus ? 18 : 14}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(isNexus ? '⚡' : '💀', this.x, this.y);

    // HP bar
    drawHpBar(ctx, this.x, this.y + this.radius + 4, this.radius * 2, this.hp, this.maxHp,
      this.team === 'player' ? '#2266ff' : '#cc2222');
  }
}
