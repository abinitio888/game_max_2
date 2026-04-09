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
        game.spawnSystem.spawnSkeleton(this, game);
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

    // Shadow
    ctx.shadowBlur = 12;
    ctx.shadowColor = teamColor;

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

    ctx.shadowBlur = 0;

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
