// ============================================================
//  ENEMY WIZARD (AI controlled)
// ============================================================
class EnemyWizard extends Wizard {
  constructor(data) {
    super({ ...data, itemBonuses: {} }, 'enemy');
    this.isPlayerControlled = false;
    this.aiState  = 'push';   // 'push' | 'retreat' | 'rush'
    this.aiLane   = Math.floor(Math.random() * 3);
    this.aiTimer  = 0;
    this.atkTimer = 0;
  }

  // Called by BotAI; does nothing here — BotAI drives update
  update(dt, input, game) {
    if (!this.alive) return;
    this.atkTimer     = Math.max(0, this.atkTimer - dt);
    this.abilityTimer = Math.max(0, this.abilityTimer - dt);
    this.rushTimer    = Math.max(0, this.rushTimer - dt);
    this.updateEffects(dt);

    // Burn damage
    for (const e of this.effects) {
      if (e.type === 'burn') this.takeDamage(e.magnitude * dt, game);
    }

    // Rush movement
    if (this.isRushing && this.rushTarget) {
      const d  = dist(this, this.rushTarget);
      if (d < 12) { this.isRushing = false; this.rushTarget = null; }
      else {
        const n = normalize(this.rushTarget.x - this.x, this.rushTarget.y - this.y);
        this.x += n.x * this.speed * 5 * dt;
        this.y += n.y * this.speed * 5 * dt;
      }
      this._resolveWalls();
      return;
    }

    // Controlled by BotAI.update() which calls _aiMove()
    this._aiMove(dt, game);

    this.x = clamp(this.x, 5, C.W - 5);
    this.y = clamp(this.y, 5, C.H - 5);
    this._resolveWalls();
  }

  _aiMove(dt, game) {
    const laneCenter = C.LANE_CENTERS[this.aiLane];
    let targetY = C.PLAYER_BASE_Y;

    if (this.aiState === 'retreat') targetY = C.ENEMY_BASE_Y;

    // Move toward target lane X
    const dx = laneCenter - this.x;
    if (Math.abs(dx) > 20) this.x += (dx > 0 ? 1 : -1) * this.speed * 0.8 * dt;

    // Move toward target Y
    const dy = targetY - this.y;
    if (Math.abs(dy) > 20) this.y += (dy > 0 ? 1 : -1) * this.speed * dt;

    this.facingAngle = this.aiState === 'retreat' ? -Math.PI / 2 : Math.PI / 2;

    // Attack nearest player entity in range
    if (this.atkTimer <= 0) {
      const targets = [
        ...(game.playerWizard && game.playerWizard.alive ? [game.playerWizard] : []),
        ...game.entities.filter(e => e.alive && e.team === 'player' && e.hp !== undefined),
        ...game.towers.filter(t => !t.destroyed && t.team === 'player'),
      ];
      let closest = null, minD = Infinity;
      for (const t of targets) {
        const d = dist(this, t);
        if (d < this.range && d < minD) { minD = d; closest = t; }
      }
      if (closest) {
        this.facingAngle = Math.atan2(closest.y - this.y, closest.x - this.x);
        this._attack(game);
        this.atkTimer = 1 / this.atkRate;
      }
    }

    // Use ability if off cooldown
    if (this.abilityTimer <= 0 && Math.random() < 0.3) {
      WIZARD_TYPES[this.wizardType].useAbility(this, game);
      this.abilityTimer = this.abilityCooldown;
    }
  }
}
