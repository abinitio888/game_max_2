// ============================================================
//  SKELETON MINION
// ============================================================
class Skeleton extends Entity {
  constructor(x, y, team, quality) {
    super(x, y, team);
    this.quality = quality; // 'normal' | 'good' | 'best'
    this.radius = 10;
    this.type = 'skeleton';
    this.effects = [];

    if (quality === 'best') {
      this.hp = this.maxHp = 80;
      this.speed = 55;
      this.atk = C.SKEL_ATK_DMG * C.SKEL_BEST_MULT; // ~50 % of weakest wizard
      this.atkRange = 30;
      this.color = '#ff8800';
    } else if (quality === 'good') {
      this.hp = this.maxHp = 55;
      this.speed = 70;
      this.atk = C.SKEL_ATK_DMG * 2;
      this.atkRange = 25;
      this.color = '#ddaa44';
    } else {
      this.hp = this.maxHp = C.SKEL_HP;
      this.speed = C.SKEL_SPEED;
      this.atk = C.SKEL_ATK_DMG;
      this.atkRange = 22;
      this.color = '#cccccc';
    }

    this.atkTimer = 0;
    this.targetY = team === 'player' ? C.ENEMY_BASE_Y : C.PLAYER_BASE_Y;
    this._cachedTarget = null;
    this._targetCacheTimer = 0;
  }

  onDeath(game) {
    if (game && game.particles) game.particles.push(...burst(this.x, this.y, this.color, 5));
    if (game && game.playerWizard && this.team !== game.playerWizard.team && game.playerWizard.alive) {
      game.playerWizard.gainXP(C.XP_SKELETON);
      game.earnGold(C.GOLD_SKEL);
    }
  }

  update(dt, game) {
    const sm = this.updateEffects(dt);
    if (sm === 0) return; // stunned/rooted

    this.atkTimer = Math.max(0, this.atkTimer - dt);

    // Refresh target cache every 0.5s instead of searching every frame
    this._targetCacheTimer -= dt;
    if (this._targetCacheTimer <= 0 || (this._cachedTarget && !this._cachedTarget.alive)) {
      this._targetCacheTimer = 0.5;
      let target = null, minD = Infinity;
      for (const e of game.entities) {
        if (!e.alive || e.team === this.team || e.hp === undefined) continue;
        const t = e.type;
        if (t !== 'wizard' && t !== 'boss') continue;
        const d = dist(this, e);
        if (d < minD) { minD = d; target = e; }
      }
      for (const t of game.towers) {
        if (t.destroyed || t.team === this.team) continue;
        const d = dist(this, t);
        if (d < minD) { minD = d; target = t; }
      }
      this._cachedTarget = target;
    }

    const target = this._cachedTarget;
    const minD = target ? dist(this, target) : Infinity;

    if (target && minD < this.atkRange) {
      if (this.atkTimer <= 0) {
        target.takeDamage(this.atk, game);
        this.atkTimer = 1.2;
      }
    } else {
      // Move toward enemy base
      const dy = this.targetY - this.y;
      const dx = 0; // skeletons stay in lane
      if (Math.abs(dy) > 3) {
        this.y += (dy / Math.abs(dy)) * this.speed * sm * dt;
      }
    }

    this.x = clamp(this.x, C.LANE_LEFT[nearestLane(this.x)] + this.radius, C.LANE_RIGHT[nearestLane(this.x)] - this.radius);
  }

  draw(ctx) {
    // Body
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();

    // Skull face
    ctx.fillStyle = '#111';
    ctx.fillRect(this.x - 3, this.y - 2, 2, 2);
    ctx.fillRect(this.x + 1, this.y - 2, 2, 2);

    if (this.quality !== 'normal') {
      drawHpBar(ctx, this.x, this.y - this.radius - 6, 20, this.hp, this.maxHp);
    }
  }
}
