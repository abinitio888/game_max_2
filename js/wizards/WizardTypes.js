// ============================================================
//  WIZARD TYPE DEFINITIONS
//  Each type: color, glowColor, projectileType, abilityCooldown,
//  useAbility(wizard, game), rushEffect(wizard, game)
// ============================================================
const WIZARD_TYPES = {

  fire: {
    name: 'Eld-magiker',
    color: '#ff6b35',
    glowColor: '#ff4500',
    projectileType: 'fireball',
    abilityCooldown: 8,
    useAbility(w, game) {
      // Flame Burst: AOE around wizard
      game.entities.push(new AoeEffect(w.x, w.y, 80, w.atk * 2.5, w.team, '#ff4500', 0.5));
      game.particles.push(...burst(w.x, w.y, '#ff6600', 20));
      // Apply burn to nearby enemies
      game.entities
        .filter(e => e.alive && e.team !== w.team && e.hp !== undefined && dist(w, e) < 80)
        .forEach(e => { if (e.effects) e.effects.push({ type: 'burn', duration: 3, magnitude: 5 }); });
    },
    rushEffect(w, game) {
      w.rushDash = true;
      game.particles.push(...burst(w.x, w.y, '#ff4500', 15));
    },
  },

  ice: {
    name: 'Is-trollkarl',
    color: '#7ecef4',
    glowColor: '#00bfff',
    projectileType: 'ice_shard',
    abilityCooldown: 12,
    useAbility(w, game) {
      // Blizzard: slow zone at wizard position
      game.entities.push(new SlowZone(w.x, w.y, 120, 3, w.team));
      game.particles.push(...burst(w.x, w.y, '#aaddff', 16));
    },
    rushEffect(w, game) {
      game.particles.push(...burst(w.x, w.y, '#7ecef4', 15));
    },
  },

  thunder: {
    name: 'Åska-magiker',
    color: '#ffe066',
    glowColor: '#ffdd00',
    projectileType: 'bolt',
    abilityCooldown: 10,
    useAbility(w, game) {
      // Thunderstorm: 5 lightning strikes near wizard
      for (let i = 0; i < 5; i++) {
        const angle = Math.random() * Math.PI * 2;
        const r = Math.random() * 150;
        const tx = w.x + Math.cos(angle) * r;
        const ty = w.y + Math.sin(angle) * r;
        game.entities.push(new LightningStrike(tx, ty, w.atk * 2, w.team, i * 0.3));
      }
    },
    rushEffect(w, game) {
      // Thunder teleport - handled in Wizard.startRush by teleporting instantly
      w.teleportToNexus = true;
      game.particles.push(...burst(w.x, w.y, '#ffe066', 20));
    },
  },

  shadow: {
    name: 'Skugga-trollkarl',
    color: '#8a4fff',
    glowColor: '#6600cc',
    projectileType: 'shadow_orb',
    abilityCooldown: 15,
    useAbility(w, game) {
      // Shadow Clone: a decoy that draws attacks
      game.entities.push(new ShadowClone(w.x, w.y, w.team, w.atk * 0.5, w.maxHp * 0.3));
      w.effects.push({ type: 'speed_boost', duration: 4, magnitude: 1.3 });
      game.particles.push(...burst(w.x, w.y, '#8a4fff', 14));
    },
    rushEffect(w, game) {
      w.isInvisible = true;
      setTimeout(() => { if (w) w.isInvisible = false; }, 2000);
      game.particles.push(...burst(w.x, w.y, '#8a4fff', 12));
    },
  },

  nature: {
    name: 'Natur-druid',
    color: '#4caf50',
    glowColor: '#00cc44',
    projectileType: 'vine',
    abilityCooldown: 14,
    useAbility(w, game) {
      // Nature's Embrace: heal + root nearby enemies
      w.hp = Math.min(w.maxHp, w.hp + w.maxHp * 0.3);
      game.particles.push(...burst(w.x, w.y, '#4caf50', 16));
      game.entities
        .filter(e => e.alive && e.team !== w.team && e.hp !== undefined && dist(w, e) < 80)
        .forEach(e => { if (e.effects) e.effects.push({ type: 'root', duration: 1.5, magnitude: 0 }); });
    },
    rushEffect(w, game) {
      game.particles.push(...burst(w.x, w.y, '#4caf50', 12));
    },
  },

  void: {
    name: 'Void-magiker',
    color: '#1a1a2e',
    glowColor: '#9c27b0',
    projectileType: 'void_pulse',
    abilityCooldown: 16,
    useAbility(w, game) {
      // Event Horizon: black hole that pulls enemies
      game.entities.push(new BlackHole(w.x, w.y, w.atk * 1.5, w.team, 2.5));
      game.particles.push(...burst(w.x, w.y, '#9c27b0', 18));
    },
    rushEffect(w, game) {
      // Void Rift portal remains 1s
      game.entities.push(new VoidPortal(w.x, w.y, game.playerNexus || game.enemyNexus, 1));
      game.particles.push(...burst(w.x, w.y, '#9c27b0', 15));
    },
  },
};

// ── Wizard type list for display ──────────────────────────────
const WIZARD_TYPE_KEYS = ['fire','ice','thunder','shadow','nature','void'];

// ── Star display helper ────────────────────────────────────────
function starsLabel(n) { return '★'.repeat(n) + '☆'.repeat(3 - n); }


// ============================================================
//  SPECIAL ENTITY TYPES (used by abilities)
// ============================================================

class AoeEffect {
  constructor(x, y, radius, damage, team, color, duration) {
    this.x = x; this.y = y;
    this.radius = radius;
    this.damage = damage;
    this.team = team;
    this.color = color;
    this.duration = duration;
    this.maxDuration = duration;
    this.type = 'aoe';
    this.alive = true;
    this.hitSet = new Set();
  }
  update(dt, game) {
    this.duration -= dt;
    if (this.duration <= 0) { this.alive = false; return; }
    // Damage nearby enemies once
    game.entities.forEach(e => {
      if (e.alive && e.team !== this.team && e.hp !== undefined && !this.hitSet.has(e)) {
        if (circlesOverlap(this.x, this.y, this.radius, e.x, e.y, e.radius || 14)) {
          e.takeDamage(this.damage, game);
          this.hitSet.add(e);
        }
      }
    });
  }
  draw(ctx) {
    const alpha = (this.duration / this.maxDuration) * 0.5;
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = this.color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius * (1 - this.duration / this.maxDuration + 0.1), 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
}

class SlowZone {
  constructor(x, y, radius, duration, team) {
    this.x = x; this.y = y;
    this.radius = radius;
    this.duration = duration;
    this.maxDuration = duration;
    this.team = team;
    this.type = 'slow_zone';
    this.alive = true;
  }
  update(dt, game) {
    this.duration -= dt;
    if (this.duration <= 0) { this.alive = false; return; }
    game.entities.forEach(e => {
      if (e.alive && e.team !== this.team && e.effects && dist(this, e) < this.radius) {
        if (!e.effects.some(ef => ef.type === 'slow')) {
          e.effects.push({ type: 'slow', duration: 0.5, magnitude: 0.5 });
        }
      }
    });
  }
  draw(ctx) {
    const alpha = (this.duration / this.maxDuration) * 0.35;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = '#aaddff';
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}

class LightningStrike {
  constructor(x, y, damage, team, delay) {
    this.x = x; this.y = y;
    this.damage = damage;
    this.team = team;
    this.delay = delay;
    this.duration = 0.25;
    this.alive = true;
    this.type = 'lightning';
    this.hit = false;
  }
  update(dt, game) {
    this.delay -= dt;
    if (this.delay > 0) return;
    this.duration -= dt;
    if (this.duration <= 0) { this.alive = false; return; }
    if (!this.hit) {
      this.hit = true;
      game.entities.forEach(e => {
        if (e.alive && e.team !== this.team && e.hp !== undefined &&
            circlesOverlap(this.x, this.y, 30, e.x, e.y, e.radius || 14)) {
          e.takeDamage(this.damage, game);
          if (e.effects) e.effects.push({ type: 'stun', duration: 0.2, magnitude: 0 });
        }
      });
      game.particles.push(...burst(this.x, this.y, '#ffe066', 8));
    }
  }
  draw(ctx) {
    if (this.delay > 0) return;
    ctx.globalAlpha = this.duration / 0.25;
    ctx.strokeStyle = '#fff700';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(this.x, this.y - 80);
    ctx.lineTo(this.x, this.y);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
}

class ShadowClone {
  constructor(x, y, team, atk, hp) {
    this.x = x; this.y = y;
    this.team = team;
    this.atk = atk;
    this.hp = hp; this.maxHp = hp;
    this.duration = 4;
    this.alive = true;
    this.type = 'shadow_clone';
    this.radius = 12;
    this.effects = [];
    this.atkTimer = 0;
    this.range = 120;
  }
  takeDamage(amt) {
    this.hp -= amt;
    if (this.hp <= 0) this.alive = false;
  }
  update(dt, game) {
    this.duration -= dt;
    if (this.duration <= 0) { this.alive = false; return; }
    this.atkTimer = Math.max(0, this.atkTimer - dt);
    if (this.atkTimer <= 0) {
      const target = game.entities.find(e => e.alive && e.team !== this.team && e.hp !== undefined && dist(this, e) < this.range);
      if (target) {
        target.takeDamage(this.atk, game);
        this.atkTimer = 1.2;
      }
    }
  }
  draw(ctx) {
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = '#8a4fff';
    ctx.beginPath();
    ctx.arc(this.x, this.y, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}

class BlackHole {
  constructor(x, y, dps, team, duration) {
    this.x = x; this.y = y;
    this.dps = dps;
    this.team = team;
    this.duration = duration;
    this.maxDuration = duration;
    this.alive = true;
    this.type = 'black_hole';
    this.radius = 0;
    this.maxRadius = 70;
  }
  update(dt, game) {
    this.duration -= dt;
    if (this.duration <= 0) { this.alive = false; return; }
    this.radius = this.maxRadius * (1 - this.duration / this.maxDuration);
    game.entities.forEach(e => {
      if (e.alive && e.team !== this.team && e.hp !== undefined) {
        const d = dist(this, e);
        if (d < 150) {
          // Pull
          const n = normalize(this.x - e.x, this.y - e.y);
          e.x += n.x * 60 * dt;
          e.y += n.y * 60 * dt;
          if (d < this.radius) {
            e.takeDamage(this.dps * dt * (d < 20 ? 3 : 1), game);
          }
        }
      }
    });
  }
  draw(ctx) {
    const alpha = this.duration / this.maxDuration;
    ctx.globalAlpha = alpha;
    const grad = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, Math.max(this.radius, 5));
    grad.addColorStop(0, '#000');
    grad.addColorStop(1, 'rgba(150,0,200,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(this.x, this.y, Math.max(this.radius, 5) + 20, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}

class VoidPortal {
  constructor(x, y, destination, duration) {
    this.x = x; this.y = y;
    this.destination = destination;
    this.duration = duration;
    this.alive = true;
    this.type = 'void_portal';
  }
  update(dt) {
    this.duration -= dt;
    if (this.duration <= 0) this.alive = false;
  }
  draw(ctx) {
    ctx.globalAlpha = this.duration;
    ctx.strokeStyle = '#9c27b0';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(this.x, this.y, 20, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
}
