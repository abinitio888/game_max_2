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
        if (t === 'boss' && !e.aggroed) continue; // ignorera sovande bossar
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

    this.x = clamp(this.x, this.radius, C.W - this.radius);
  }

  draw(ctx) {
    if (!this.alive) return;
    const cx = this.x, cy = this.y;
    const r  = this.radius; // 10

    ctx.save();
    ctx.translate(cx, cy);

    // Glow for stronger variants
    if (this.quality !== 'normal') {
      ctx.globalAlpha = 0.22;
      ctx.fillStyle = this.color;
      ctx.beginPath();
      ctx.arc(0, 0, r * 2.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    // ── Body / ribcage ───────────────────────────────────────
    ctx.strokeStyle = this.color;
    ctx.lineWidth = r * 0.22;
    ctx.lineCap = 'round';
    // Spine
    ctx.beginPath();
    ctx.moveTo(0, -r * 0.2);
    ctx.lineTo(0,  r * 1.1);
    ctx.stroke();
    // Ribs (3 pairs)
    ctx.lineWidth = r * 0.16;
    for (let i = 0; i < 3; i++) {
      const ry = r * (0.1 + i * 0.35);
      const rw = r * (0.85 - i * 0.15);
      ctx.beginPath();
      ctx.moveTo(-rw, ry); ctx.lineTo(rw, ry);
      ctx.stroke();
    }
    // Hip bone
    ctx.lineWidth = r * 0.2;
    ctx.beginPath();
    ctx.moveTo(-r * 0.6, r * 1.1); ctx.lineTo(r * 0.6, r * 1.1);
    ctx.stroke();
    // Legs
    ctx.lineWidth = r * 0.18;
    ctx.beginPath();
    ctx.moveTo(-r * 0.4, r * 1.1); ctx.lineTo(-r * 0.5, r * 1.9);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo( r * 0.4, r * 1.1); ctx.lineTo( r * 0.5, r * 1.9);
    ctx.stroke();
    // Arms
    ctx.beginPath();
    ctx.moveTo(-r * 0.1, r * 0.1); ctx.lineTo(-r * 1.1, r * 0.8);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo( r * 0.1, r * 0.1); ctx.lineTo( r * 1.1, r * 0.8);
    ctx.stroke();

    // ── Skull ────────────────────────────────────────────────
    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.arc(r * 0.1, -r * 0.85, r * 0.65, 0, Math.PI * 2);
    ctx.fill();
    // Skull dome
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(0, -r * 0.9, r * 0.62, 0, Math.PI * 2);
    ctx.fill();
    // Jaw
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.moveTo(-r * 0.38, -r * 0.58);
    ctx.lineTo( r * 0.38, -r * 0.58);
    ctx.lineTo( r * 0.3,  -r * 0.35);
    ctx.lineTo(-r * 0.3,  -r * 0.35);
    ctx.closePath();
    ctx.fill();
    // Skull shadow (right side)
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.beginPath();
    ctx.arc(r * 0.18, -r * 0.9, r * 0.55, -Math.PI * 0.4, Math.PI * 0.6);
    ctx.fill();
    // Eye sockets (hollow)
    ctx.fillStyle = '#080810';
    ctx.beginPath();
    ctx.arc(-r * 0.22, -r * 0.98, r * 0.18, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc( r * 0.22, -r * 0.98, r * 0.18, 0, Math.PI * 2);
    ctx.fill();
    // Eye glow (quality variants)
    if (this.quality !== 'normal') {
      const eyeCol = this.quality === 'best' ? '#ff4400' : '#ffaa00';
      ctx.fillStyle = eyeCol;
      ctx.globalAlpha = 0.85;
      ctx.beginPath();
      ctx.arc(-r * 0.22, -r * 0.98, r * 0.1, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc( r * 0.22, -r * 0.98, r * 0.1, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    // Teeth
    ctx.fillStyle = '#080810';
    for (let t = -1; t <= 1; t++) {
      ctx.fillRect(t * r * 0.22 - r * 0.07, -r * 0.56, r * 0.12, r * 0.15);
    }

    ctx.restore();

    if (this.quality !== 'normal') {
      drawHpBar(ctx, cx, cy - r * 2.4, 22, this.hp, this.maxHp);
    }
  }
}
