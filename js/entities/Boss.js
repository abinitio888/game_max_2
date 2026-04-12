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
    if (game.adventureMode) {
      game._adventureWin(this.dropType);
    } else {
      game.entities.push(new ItemPickup(this.x, this.y, this.dropType));
      game.announcements.push({ text: `${this.name} besegrad! +${this.dropType}`, duration: 3, maxDuration: 3 });
    }
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

    // Push boss out of any tower it overlaps
    this._resolveTowerCollisions(game);
  }

  _resolveTowerCollisions(game) {
    for (const t of game.towers) {
      if (t.destroyed) continue;
      const dx = this.x - t.x;
      const dy = this.y - t.y;
      const d  = Math.hypot(dx, dy);
      const minDist = this.radius + t.radius;
      if (d < minDist && d > 0) {
        const push = (minDist - d) / d;
        this.x += dx * push;
        this.y += dy * push;
      }
    }
  }

  draw(ctx) {
    if (!this.alive) return;
    const cx = this.x, cy = this.y;
    const r  = this.radius; // 22
    const t  = Date.now() / 1000;

    // ── Territory zone (dormant) ─────────────────────────────
    if (!this.aggroed) {
      const pulse = Math.abs(Math.sin(t * 0.8)) * 0.1 + 0.05;
      ctx.globalAlpha = pulse;
      ctx.strokeStyle = this.color;
      ctx.lineWidth = 2;
      ctx.setLineDash([10, 12]);
      ctx.beginPath();
      ctx.arc(this.spawnX, this.spawnY, BOSS_TERRITORY, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;
    }

    ctx.save();
    ctx.translate(cx, cy);

    // ── Outer aura ───────────────────────────────────────────
    const auraSize = this.aggroed ? (0.45 + Math.sin(t * 3) * 0.08) : 0.22;
    ctx.globalAlpha = auraSize;
    ctx.fillStyle = this.color;
    ctx.beginPath(); ctx.arc(0, 0, r * 2.4, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;

    // Phase 2 extra aura ring
    if (this.phase === 2) {
      ctx.globalAlpha = 0.5 + Math.sin(t * 5) * 0.2;
      ctx.strokeStyle = '#ff2200';
      ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(0, 0, r + 10 + Math.sin(t * 4) * 3, 0, Math.PI * 2); ctx.stroke();
      ctx.globalAlpha = 1;
    }

    // ── Wings ────────────────────────────────────────────────
    const wingFlap = this.aggroed ? Math.sin(t * 4) * 0.15 : 0.05;
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    // Left wing
    ctx.beginPath();
    ctx.moveTo(-r * 0.4, -r * 0.3);
    ctx.quadraticCurveTo(-r * 2.5, -r * 1.5 + wingFlap * r * 3, -r * 2.8, r * 0.6);
    ctx.quadraticCurveTo(-r * 2.0,  r * 0.4, -r * 1.2, r * 0.6);
    ctx.quadraticCurveTo(-r * 0.8, -r * 0.1, -r * 0.4, -r * 0.3);
    ctx.fill();
    ctx.fillStyle = this.color + '44';
    ctx.beginPath();
    ctx.moveTo(-r * 0.4, -r * 0.3);
    ctx.quadraticCurveTo(-r * 2.4, -r * 1.4 + wingFlap * r * 3, -r * 2.7, r * 0.5);
    ctx.quadraticCurveTo(-r * 1.9,  r * 0.3, -r * 1.1, r * 0.5);
    ctx.quadraticCurveTo(-r * 0.7, -r * 0.05, -r * 0.4, -r * 0.3);
    ctx.fill();
    // Right wing (mirrored)
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.beginPath();
    ctx.moveTo(r * 0.4, -r * 0.3);
    ctx.quadraticCurveTo(r * 2.5, -r * 1.5 + wingFlap * r * 3, r * 2.8, r * 0.6);
    ctx.quadraticCurveTo(r * 2.0,  r * 0.4, r * 1.2, r * 0.6);
    ctx.quadraticCurveTo(r * 0.8, -r * 0.1, r * 0.4, -r * 0.3);
    ctx.fill();
    ctx.fillStyle = this.color + '44';
    ctx.beginPath();
    ctx.moveTo(r * 0.4, -r * 0.3);
    ctx.quadraticCurveTo(r * 2.4, -r * 1.4 + wingFlap * r * 3, r * 2.7, r * 0.5);
    ctx.quadraticCurveTo(r * 1.9,  r * 0.3, r * 1.1, r * 0.5);
    ctx.quadraticCurveTo(r * 0.7, -r * 0.05, r * 0.4, -r * 0.3);
    ctx.fill();

    // ── Shadow under body ────────────────────────────────────
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath(); ctx.arc(r * 0.2, r * 0.3, r * 0.9, 0, Math.PI * 2); ctx.fill();

    // ── Body ─────────────────────────────────────────────────
    ctx.fillStyle = this.color;
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
    // Body shading
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath(); ctx.arc(r * 0.25, r * 0.2, r * 0.8, 0, Math.PI * 2); ctx.fill();
    // Chest highlight
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.beginPath(); ctx.arc(-r * 0.2, -r * 0.2, r * 0.5, 0, Math.PI * 2); ctx.fill();

    // ── Horns ────────────────────────────────────────────────
    ctx.fillStyle = '#1a0808';
    // Left horn
    ctx.beginPath();
    ctx.moveTo(-r * 0.55, -r * 0.75);
    ctx.quadraticCurveTo(-r * 0.9, -r * 1.9, -r * 0.3, -r * 2.3);
    ctx.quadraticCurveTo(-r * 0.5, -r * 1.5, -r * 0.1, -r * 0.82);
    ctx.closePath(); ctx.fill();
    // Right horn
    ctx.beginPath();
    ctx.moveTo(r * 0.55, -r * 0.75);
    ctx.quadraticCurveTo(r * 0.9, -r * 1.9, r * 0.3, -r * 2.3);
    ctx.quadraticCurveTo(r * 0.5, -r * 1.5, r * 0.1, -r * 0.82);
    ctx.closePath(); ctx.fill();
    // Horn highlights
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.beginPath();
    ctx.moveTo(-r * 0.5, -r * 0.8);
    ctx.quadraticCurveTo(-r * 0.7, -r * 1.5, -r * 0.35, -r * 2.1);
    ctx.lineTo(-r * 0.3, -r * 2.0);
    ctx.quadraticCurveTo(-r * 0.6, -r * 1.4, -r * 0.38, -r * 0.82);
    ctx.closePath(); ctx.fill();

    // ── Face ─────────────────────────────────────────────────
    // Eyes (3 sets for intimidation)
    const eyeColor = this.aggroed
      ? (this.phase === 2 ? '#ff0000' : '#ff4400')
      : '#ddcc00';
    // Main eyes
    ctx.fillStyle = '#1a0808';
    ctx.beginPath(); ctx.arc(-r * 0.28, -r * 0.2, r * 0.22, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc( r * 0.28, -r * 0.2, r * 0.22, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = eyeColor;
    ctx.globalAlpha = 0.9;
    ctx.beginPath(); ctx.arc(-r * 0.28, -r * 0.2, r * 0.15, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc( r * 0.28, -r * 0.2, r * 0.15, 0, Math.PI * 2); ctx.fill();
    // Vertical slit pupils
    ctx.fillStyle = '#000';
    ctx.globalAlpha = 1;
    ctx.fillRect(-r * 0.3,  -r * 0.32, r * 0.04, r * 0.24);
    ctx.fillRect( r * 0.26, -r * 0.32, r * 0.04, r * 0.24);
    // Third eye (forehead, only aggroed)
    if (this.aggroed) {
      ctx.fillStyle = '#1a0808';
      ctx.beginPath(); ctx.arc(0, -r * 0.55, r * 0.14, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = eyeColor;
      ctx.globalAlpha = 0.8 + Math.sin(t * 6) * 0.2;
      ctx.beginPath(); ctx.arc(0, -r * 0.55, r * 0.09, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
    }
    // Mouth / fangs
    ctx.fillStyle = '#1a0808';
    ctx.beginPath();
    ctx.moveTo(-r * 0.4, r * 0.2);
    ctx.quadraticCurveTo(0, r * 0.55, r * 0.4, r * 0.2);
    ctx.quadraticCurveTo(0, r * 0.35, -r * 0.4, r * 0.2);
    ctx.fill();
    // Fangs
    ctx.fillStyle = '#ffe8cc';
    ctx.beginPath();
    ctx.moveTo(-r * 0.25, r * 0.22); ctx.lineTo(-r * 0.18, r * 0.44); ctx.lineTo(-r * 0.1, r * 0.22);
    ctx.closePath(); ctx.fill();
    ctx.beginPath();
    ctx.moveTo( r * 0.1, r * 0.22); ctx.lineTo( r * 0.18, r * 0.44); ctx.lineTo( r * 0.25, r * 0.22);
    ctx.closePath(); ctx.fill();

    ctx.restore();

    // ── Name + HP ─────────────────────────────────────────────
    if (this.aggroed || this.phase === 2) {
      drawHpBar(ctx, cx, cy + r + 6, 60, this.hp, this.maxHp, this.color);
      ctx.fillStyle = this.color;
      ctx.font = 'bold 10px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(this.name, cx, cy - r * 2.5);
      if (this.phase === 2) {
        ctx.fillStyle = '#ff2200';
        ctx.font = 'bold 8px Arial';
        ctx.fillText('⚡ FAS 2 ⚡', cx, cy - r * 2.5 + 13);
      }
    } else {
      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      ctx.font = '9px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(this.name, cx, cy - r - 10);
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
