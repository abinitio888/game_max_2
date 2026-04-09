// ============================================================
//  BASE ENTITY
// ============================================================
class Entity {
  constructor(x, y, team) {
    this.x = x;
    this.y = y;
    this.team = team; // 'player' | 'enemy'
    this.hp = 100;
    this.maxHp = 100;
    this.speed = 100;
    this.radius = 14;
    this.alive = true;
    this.type = 'entity';
    this.effects = []; // [{type, duration, magnitude}]
  }

  distanceTo(other) { return dist(this, other); }

  takeDamage(amount, game) {
    if (!this.alive) return;
    this.hp = Math.max(0, this.hp - amount);
    if (this.hp <= 0) {
      this.alive = false;
      this.onDeath(game);
    }
  }

  heal(amount) {
    this.hp = Math.min(this.maxHp, this.hp + amount);
  }

  updateEffects(dt) {
    let speedMult = 1;
    this.effects = this.effects.filter(e => {
      e.duration -= dt;
      return e.duration > 0;
    });
    for (const e of this.effects) {
      if (e.type === 'slow')        speedMult *= 0.5;
      if (e.type === 'speed_boost') speedMult *= e.magnitude;
      if (e.type === 'root')        speedMult = 0;
      if (e.type === 'stun')        speedMult = 0;
    }
    return speedMult;
  }

  onDeath(game) {}

  update(dt, game) {}

  draw(ctx) {}
}
