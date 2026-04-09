// ============================================================
//  LANE BOSS
// ============================================================
const BOSS_DROPS  = ['speed', 'health', 'damage'];
const BOSS_NAMES  = ['Skugghärskaren', 'Tidsvakt', 'Eld-demon'];
const BOSS_COLORS = ['#aa55ff', '#55ffaa', '#ff5533'];

const BOSS_TERRITORY = 140; // px radius — aggros anything inside

class Boss extends Entity {
  constructor(x, y, laneIdx) {
    super(x, y, 'enemy');
    this.laneIdx  = laneIdx;
    this.hp       = this.maxHp = C.BOSS_HP;
    this.speed    = C.BOSS_SPEED;
    this.atk      = C.BOSS_ATK;
    this.range    = C.BOSS_RANGE;
    this.radius   = 22;
    this.type     = 'boss';
    this.effects  = [];
    this.atkTimer = 0;
    this.defeated = false;
    this.name     = BOSS_NAMES[laneIdx];
    this.color    = BOSS_COLORS[laneIdx];
    this.dropType = BOSS_DROPS[laneIdx];
    this.phase    = 1;

    // Spawn/home position
    this.spawnX = x;
    this.spawnY = y;

    // Dormant state — awakens when intruded or attacked
    this.aggroed     = false;
    this.aggroTarget = null;
    this.patrolAngle = 0; // slow circular patrol when dormant
    this.deaggroTimer = 0;
  }

  // Aggro on any hit
  takeDamage(amount, game) {
    if (!this.aggroed) this._aggro(game);
    super.takeDamage(amount, game);
  }

  _aggro(game) {
    if (this.aggroed) return;
    this.aggroed = true;
    game.announcements.push({ text: `⚠ ${this.name} vaknar!`, duration: 2, maxDuration: 2 });
    game.particles.push(...burst(this.x, this.y, this.color, 16));
  }

  onDeath(game) {
    this.defeated = true;
    game.particles.push(...burst(this.x, this.y, this.color, 25));
    if (game.playerWizard && game.playerWizard.alive) {
      game.playerWizard.gainXP(C.XP_BOSS);
      game.earnGold(C.GOLD_BOSS);
    }
    game.entities.push(new ItemPickup(this.x, this.y, this.dropType));
    game.announcements.push({ text: `${this.name} besegrad! +${this.dropType}`, duration: 3, maxDuration: 3 });
  }

  update(dt, game) {
    if (!this.alive) return;
    const sm = this.updateEffects(dt);
    this.atkTimer = Math.max(0, this.atkTimer - dt);

    // Phase 2 at 50% HP
    if (this.hp < this.maxHp * 0.5 && this.phase === 1) {
      this.phase = 2;
      this.atk  *= 1.5;
      this.speed *= 1.3;
      game.particles.push(...burst(this.x, this.y, this.color, 15));
      game.announcements.push({ text: `${this.name} fas 2!`, duration: 2, maxDuration: 2 });
    }

    if (!this.aggroed) {
      this._updateDormant(dt, game);
    } else {
      this._updateAggro(dt, sm, game);
    }
  }

  _updateDormant(dt, game) {
    // Slow circular patrol around spawn point
    this.patrolAngle += dt * 0.4;
    this.x = this.spawnX + Math.cos(this.patrolAngle) * 20;
    this.y = this.spawnY + Math.sin(this.patrolAngle) * 12;

    // Bara trollkarlar (inte skelett) väcker bossen genom att gå in i området
    const intruders = [
      ...(game.playerWizard && game.playerWizard.alive ? [game.playerWizard] : []),
      ...(game.enemyWizard  && game.enemyWizard.alive  ? [game.enemyWizard]  : []),
    ];
    for (const e of intruders) {
      if (dist({ x: this.spawnX, y: this.spawnY }, e) < BOSS_TERRITORY) {
        this._aggro(game);
        return;
      }
    }
  }

  _updateAggro(dt, sm, game) {
    // Find nearest player unit
    const targets = [
      ...(game.playerWizard && game.playerWizard.alive ? [game.playerWizard] : []),
      ...game.entities.filter(e => e.alive && e.team === 'player' && e.hp !== undefined),
      ...game.towers.filter(t => !t.destroyed && t.team === 'player'),
    ];
    let target = null, minD = Infinity;
    for (const t of targets) {
      const d = dist(this, t);
      if (d < minD) { minD = d; target = t; }
    }

    if (target && minD < this.range + (target.radius || 14)) {
      // Attack
      if (this.atkTimer <= 0) {
        target.takeDamage(this.atk, game);
        this.atkTimer = 1.0;
      }
      this.deaggroTimer = 0;
    } else if (target) {
      // Chase anywhere on the map
      const n = normalize(target.x - this.x, target.y - this.y);
      this.x += n.x * this.speed * sm * dt;
      this.y += n.y * this.speed * sm * dt;
      this.deaggroTimer = 0;
    } else {
      // No target in range — return home
      this.deaggroTimer += dt;
      const dx = this.spawnX - this.x;
      const dy = this.spawnY - this.y;
      const d  = Math.hypot(dx, dy);
      if (d > 8) {
        this.x += (dx / d) * this.speed * 0.8 * sm * dt;
        this.y += (dy / d) * this.speed * 0.8 * sm * dt;
      }
      // De-aggro after 4s away from any target
      if (this.deaggroTimer > 4) {
        this.aggroed = false;
        this.deaggroTimer = 0;
        // Restore HP slightly when retreating
        this.hp = Math.min(this.maxHp, this.hp + this.maxHp * 0.1);
      }
    }
  }

  draw(ctx) {
    if (!this.alive) return;

    // Territory zone (shown when dormant)
    if (!this.aggroed) {
      const pulse = Math.abs(Math.sin(Date.now() / 1200)) * 0.12 + 0.06;
      ctx.globalAlpha = pulse;
      ctx.strokeStyle = this.color;
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 10]);
      ctx.beginPath();
      ctx.arc(this.spawnX, this.spawnY, BOSS_TERRITORY, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;
    }

    // Glow ring (brighter when aggroed)
    ctx.globalAlpha = this.aggroed ? 0.55 : 0.25;
    ctx.strokeStyle = this.color;
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius + 6, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;

    // Body
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();

    // Horns
    ctx.fillStyle = '#222';
    ctx.beginPath();
    ctx.moveTo(this.x - 12, this.y - this.radius);
    ctx.lineTo(this.x - 6,  this.y - this.radius - 14);
    ctx.lineTo(this.x,      this.y - this.radius);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(this.x,      this.y - this.radius);
    ctx.lineTo(this.x + 6,  this.y - this.radius - 14);
    ctx.lineTo(this.x + 12, this.y - this.radius);
    ctx.fill();

    // Eyes — red when aggroed, yellow when dormant
    ctx.fillStyle = this.aggroed ? '#ff2200' : '#ff0';
    ctx.beginPath();
    ctx.arc(this.x - 7, this.y - 5, 4, 0, Math.PI * 2);
    ctx.arc(this.x + 7, this.y - 5, 4, 0, Math.PI * 2);
    ctx.fill();

    // Phase 2 indicator
    if (this.phase === 2) {
      ctx.strokeStyle = '#ff0000';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius + 4, 0, Math.PI * 2);
      ctx.stroke();
    }

    // HP bar + name (only when aggroed or phase 2)
    if (this.aggroed || this.phase === 2) {
      drawHpBar(ctx, this.x, this.y + this.radius + 4, 50, this.hp, this.maxHp, this.color);
      ctx.fillStyle = '#fff';
      ctx.font = '9px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(this.name, this.x, this.y - this.radius - 8);
    } else {
      // Dormant: just show name faintly
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.font = '9px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(this.name, this.x, this.y - this.radius - 8);
    }
  }
}

// ── Item pickup ───────────────────────────────────────────────
class ItemPickup {
  constructor(x, y, itemType) {
    this.x = x; this.y = y;
    this.itemType = itemType;
    this.radius = 14;
    this.alive = true;
    this.type = 'item_pickup';
    this.bobTimer = 0;
    this.effects = [];
  }
  update(dt) {
    this.bobTimer += dt;
  }
  draw(ctx) {
    const yOff = Math.sin(this.bobTimer * 2) * 4;
    const glowColor = this.itemType === 'speed' ? '#00ff88' : this.itemType === 'health' ? '#ff4444' : '#ffdd00';
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = glowColor;
    ctx.beginPath();
    ctx.arc(this.x, this.y + yOff, this.radius + 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = glowColor;
    ctx.beginPath();
    ctx.arc(this.x, this.y + yOff, this.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 12px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.itemType === 'speed' ? '⚡' : this.itemType === 'health' ? '❤' : '⚔', this.x, this.y + yOff);
    ctx.textBaseline = 'alphabetic';
  }
}
