// ============================================================
//  PLAYER WIZARD
// ============================================================
class Wizard extends Entity {
  constructor(data, team = 'player') {
    const stats = computeStats(data.type, data.stars, data.level || 1);
    const spawnX = C.LANE_CENTERS[1]; // start in mid lane
    const spawnY = team === 'player' ? C.PLAYER_BASE_Y - 30 : C.ENEMY_BASE_Y + 30;
    super(spawnX, spawnY, team);

    this.wizardType = data.type;
    this.stars = data.stars;
    this.level = data.level || 1;
    this.xp = 0;
    this.xpNeeded = C.LEVEL_XP[this.level - 1] || Infinity;

    this.maxHp = stats.hp;
    this.hp    = stats.hp;
    this.atk   = stats.atk;
    this.speed = stats.spd;
    this.range = stats.range;
    this.atkRate  = stats.atkRate;
    this.projSpeed = C.BASE_STATS[data.type].projSpd;

    this.atkTimer = 0;
    this.abilityTimer = 0;
    this.abilityCooldown = WIZARD_TYPES[data.type].abilityCooldown;
    this.rushTimer = 0;
    this.rushCooldown = C.RUSH_COOLDOWN;

    this.isRushing = false;
    this.rushTarget = null;
    this.teleportToNexus = false;
    this.isInvisible = false;

    this.facingAngle = team === 'player' ? -Math.PI / 2 : Math.PI / 2;
    this.color = WIZARD_TYPES[data.type].color;
    this.glowColor = WIZARD_TYPES[data.type].glowColor;

    this.itemBonuses = Object.assign({ speed: 0, health: 0, damage: 0 }, data.itemBonuses || {});
    this.type = 'wizard';
    this.id = data.id || uid();
    this.isPlayerControlled = (team === 'player');

    this.radius = 14;
    this.effects = [];
  }

  applyItemBonus(itemType) {
    if (itemType === 'speed'  && !this.itemBonuses.speed)  { this.speed *= (1 + C.ITEM_SPEED_BONUS); this.itemBonuses.speed  = 1; }
    if (itemType === 'health' && !this.itemBonuses.health) { this.maxHp += C.ITEM_HP_BONUS; this.hp += C.ITEM_HP_BONUS; this.itemBonuses.health = 1; }
    if (itemType === 'damage' && !this.itemBonuses.damage) { this.atk  *= (1 + C.ITEM_DMG_BONUS);  this.itemBonuses.damage = 1; }
  }

  gainXP(amount) {
    if (this.level >= 3) return;
    this.xp += amount;
    while (this.xp >= this.xpNeeded && this.level < 3) {
      this.xp -= this.xpNeeded;
      this.levelUp();
    }
  }

  levelUp() {
    this.level++;
    const stats = computeStats(this.wizardType, this.stars, this.level);
    const oldMax = this.maxHp;
    this.maxHp = stats.hp;
    this.hp = Math.min(this.hp + Math.floor((this.maxHp - oldMax) * 0.5) + 10, this.maxHp);
    this.atk   = stats.atk;
    this.speed = stats.spd;
    this.xpNeeded = this.level < 3 ? C.LEVEL_XP[this.level - 1] : Infinity;
    // Reapply item bonuses
    if (this.itemBonuses.speed)  this.speed *= (1 + C.ITEM_SPEED_BONUS);
    if (this.itemBonuses.damage) this.atk   *= (1 + C.ITEM_DMG_BONUS);
  }

  update(dt, input, game) {
    if (!this.alive) return;

    this.atkTimer     = Math.max(0, this.atkTimer - dt);
    this.abilityTimer = Math.max(0, this.abilityTimer - dt);
    this.rushTimer    = Math.max(0, this.rushTimer - dt);

    // Teleport on rush for thunder
    if (this.teleportToNexus) {
      this.teleportToNexus = false;
      const nexus = this.team === 'player' ? game.playerNexus : game.enemyNexus;
      if (nexus && !nexus.destroyed) { this.x = nexus.x; this.y = nexus.y; }
      this.isRushing = false;
      return;
    }

    const sm = this.updateEffects(dt);

    // Burn damage
    for (const e of this.effects) {
      if (e.type === 'burn') this.takeDamage(e.magnitude * dt, game);
    }

    // Rush movement
    if (this.isRushing && this.rushTarget) {
      const rushSpd = this.speed * 5;
      const dx = this.rushTarget.x - this.x;
      const dy = this.rushTarget.y - this.y;
      const d  = Math.hypot(dx, dy);
      if (d < 12) {
        this.isRushing = false;
        this.rushTarget = null;
      } else {
        this.x += (dx / d) * rushSpd * dt;
        this.y += (dy / d) * rushSpd * dt;
      }
      this._resolveWalls();
      return;
    }

    if (this.isPlayerControlled && input) {
      let mx = 0, my = 0;
      if (input.keys['a'] || input.keys['arrowleft'])  mx -= 1;
      if (input.keys['d'] || input.keys['arrowright']) mx += 1;
      if (input.keys['w'] || input.keys['arrowup'])    my -= 1;
      if (input.keys['s'] || input.keys['arrowdown'])  my += 1;

      if (mx !== 0 || my !== 0) {
        const len = Math.hypot(mx, my);
        this.x += (mx / len) * this.speed * sm * dt;
        this.y += (my / len) * this.speed * sm * dt;
        this.facingAngle = Math.atan2(my, mx);
      }

      if (input.mouse) {
        const mdx = input.mouse.x - this.x;
        const mdy = input.mouse.y - this.y;
        if (Math.hypot(mdx, mdy) > 5) this.facingAngle = Math.atan2(mdy, mdx);
      }

      if ((input.mouseClick || input.keys[' ']) && this.atkTimer <= 0) {
        this._attack(game);
        this.atkTimer = 1 / this.atkRate;
      }

      if (input.justPressed['q'] && this.abilityTimer <= 0) {
        WIZARD_TYPES[this.wizardType].useAbility(this, game);
        this.abilityTimer = this.abilityCooldown;
      }

      if (input.justPressed['e'] && this.rushTimer <= 0) {
        this._startRush(game);
      }

      input.mouseClick = false;
    }

    this.x = clamp(this.x, 5, C.W - 5);
    this.y = clamp(this.y, 5, C.H - 5);
    this._resolveWalls();
  }

  _attack(game) {
    const typeInfo = WIZARD_TYPES[this.wizardType];
    const proj = new Projectile(
      this.x, this.y,
      this.facingAngle,
      this.projSpeed,
      this.atk,
      this.team,
      typeInfo.projectileType,
      this
    );
    game.entities.push(proj);
  }

  _startRush(game) {
    const nexus = this.team === 'player' ? game.playerNexus : game.enemyNexus;
    if (!nexus || nexus.destroyed) return;
    this.isRushing  = true;
    this.rushTarget = { x: nexus.x, y: nexus.y };
    this.rushTimer  = C.RUSH_COOLDOWN;
    WIZARD_TYPES[this.wizardType].rushEffect(this, game);
    game.announcements.push({ text: `[E] ${WIZARD_TYPES[this.wizardType].name} rusar till nexus!`, duration: 1.5, maxDuration: 1.5 });
  }

  _resolveWalls() {
    resolveWallCollision(this);
    this.x = clamp(this.x, 5, C.W - 5);
    this.y = clamp(this.y, 5, C.H - 5);
  }

  onDeath(game) {
    game.particles.push(...burst(this.x, this.y, this.color, 18));
    if (this.isPlayerControlled) {
      game.state = 'WIZARD_DEAD';
    } else {
      // Enemy wizard died — respawn them later
      if (game.playerWizard && game.playerWizard.alive) {
        game.playerWizard.gainXP(C.XP_ENEMY_WIZARD);
        game.earnGold(C.GOLD_ENEMY_WIZ);
      }
      game.enemyRespawnTimer = 4; // respawn after 4 seconds
    }
  }

  draw(ctx) {
    if (!this.alive) return;
    const alpha = this.isInvisible ? 0.35 : 1;
    ctx.globalAlpha = alpha;

    // Cheap glow ring instead of shadowBlur
    ctx.globalAlpha = alpha * 0.35;
    ctx.strokeStyle = this.glowColor;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius + 4, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = alpha;

    // Body
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();

    // Outline
    ctx.strokeStyle = this.isPlayerControlled ? '#fff' : '#ff8888';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Hat (pointing in facing direction)
    const hx = this.x + Math.cos(this.facingAngle) * 9;
    const hy = this.y + Math.sin(this.facingAngle) * 9;
    const pa = this.facingAngle - Math.PI / 2;
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.moveTo(hx + Math.cos(pa) * 8, hy + Math.sin(pa) * 8);
    ctx.lineTo(hx - Math.cos(pa) * 8, hy - Math.sin(pa) * 8);
    ctx.lineTo(hx + Math.cos(this.facingAngle) * 16, hy + Math.sin(this.facingAngle) * 16);
    ctx.closePath();
    ctx.fill();

    // Stars above head
    for (let i = 0; i < this.stars; i++) {
      drawStar(ctx, this.x - (this.stars - 1) * 5 + i * 10, this.y - 24, 4, '#FFD700');
    }

    ctx.globalAlpha = 1;

    // HP bar
    drawHpBar(ctx, this.x, this.y + this.radius + 3, 28, this.hp, this.maxHp);

    // Level badge
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 9px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`Lv${this.level}`, this.x, this.y + this.radius + 18);
  }
}
