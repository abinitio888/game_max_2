// ============================================================
//  LANE BOSS
// ============================================================
const BOSS_DROPS = ['speed', 'health', 'damage'];   // per lane 0/1/2
const BOSS_NAMES = ['Skugghärskaren', 'Tidsvakt', 'Eld-demon'];
const BOSS_COLORS = ['#aa55ff', '#55ffaa', '#ff5533'];

class Boss extends Entity {
  constructor(x, y, laneIdx) {
    super(x, y, 'enemy');
    this.laneIdx = laneIdx;
    this.hp = this.maxHp = C.BOSS_HP;
    this.speed = C.BOSS_SPEED;
    this.atk = C.BOSS_ATK;
    this.range = C.BOSS_RANGE;
    this.radius = 22;
    this.type = 'boss';
    this.effects = [];
    this.atkTimer = 0;
    this.defeated = false;
    this.patrolDir = 1;
    this.patrolTimer = 2;
    this.startX = x;
    this.name = BOSS_NAMES[laneIdx];
    this.color = BOSS_COLORS[laneIdx];
    this.dropType = BOSS_DROPS[laneIdx];
    this.phase = 1;
  }

  onDeath(game) {
    this.defeated = true;
    game.particles.push(...burst(this.x, this.y, this.color, 25));
    // Give XP
    if (game.playerWizard && game.playerWizard.alive) {
      game.playerWizard.gainXP(C.XP_BOSS);
    }
    // Drop item
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
      this.atk *= 1.5;
      this.speed *= 1.3;
      game.particles.push(...burst(this.x, this.y, this.color, 15));
      game.announcements.push({ text: `${this.name} fas 2!`, duration: 2, maxDuration: 2 });
    }

    // Aggro: find nearest player unit
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
    } else if (target && minD < 300) {
      // Chase
      const n = normalize(target.x - this.x, target.y - this.y);
      this.x += n.x * this.speed * sm * dt;
      this.y += n.y * this.speed * sm * dt;
    } else {
      // Patrol around spawn
      this.patrolTimer -= dt;
      if (this.patrolTimer <= 0) {
        this.patrolDir *= -1;
        this.patrolTimer = 2;
      }
      this.x += this.patrolDir * 30 * dt;
      this.x = clamp(this.x, C.LANE_LEFT[this.laneIdx] + 5, C.LANE_RIGHT[this.laneIdx] - 5);
      this.y = C.BOSS_Y;
    }
  }

  draw(ctx) {
    if (!this.alive) return;
    ctx.shadowBlur = 18;
    ctx.shadowColor = this.color;

    // Body
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();

    // Horns
    ctx.fillStyle = '#222';
    ctx.beginPath();
    ctx.moveTo(this.x - 12, this.y - this.radius);
    ctx.lineTo(this.x - 6, this.y - this.radius - 14);
    ctx.lineTo(this.x, this.y - this.radius);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(this.x, this.y - this.radius);
    ctx.lineTo(this.x + 6, this.y - this.radius - 14);
    ctx.lineTo(this.x + 12, this.y - this.radius);
    ctx.fill();

    // Eyes
    ctx.fillStyle = '#ff0';
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

    ctx.shadowBlur = 0;

    // HP bar
    drawHpBar(ctx, this.x, this.y + this.radius + 4, 50, this.hp, this.maxHp, this.color);

    // Name + drop hint
    ctx.fillStyle = '#fff';
    ctx.font = '9px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(this.name, this.x, this.y - this.radius - 8);
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
    ctx.shadowBlur = 12;
    ctx.shadowColor = this.itemType === 'speed' ? '#00ff88' : this.itemType === 'health' ? '#ff4444' : '#ffdd00';
    ctx.fillStyle = ctx.shadowColor;
    ctx.beginPath();
    ctx.arc(this.x, this.y + yOff, this.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 12px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.itemType === 'speed' ? '⚡' : this.itemType === 'health' ? '❤' : '⚔', this.x, this.y + yOff);
    ctx.shadowBlur = 0;
    ctx.textBaseline = 'alphabetic';
  }
}
