// ============================================================
//  PROJECTILE
// ============================================================
const PROJ_COLORS = {
  fireball:    '#ff6b35',
  ice_shard:   '#7ecef4',
  bolt:        '#ffe066',
  shadow_orb:  '#8a4fff',
  vine:        '#4caf50',
  void_pulse:  '#9c27b0',
  skeleton:    '#cccccc',
  boss:        '#ff0000',
};

class Projectile extends Entity {
  constructor(x, y, angle, speed, damage, team, projType, owner) {
    super(x, y, team);
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.damage = damage;
    this.projType = projType;
    this.owner = owner;
    this.lifetime = C.PROJ_LIFETIME;
    this.radius = 6;
    this.type = 'projectile';
    this.pierce = (projType === 'void_pulse');
    this.hitSet = new Set();
  }

  update(dt, game) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.lifetime -= dt;
    if (this.lifetime <= 0 || this.x < 0 || this.x > C.W || this.y < 0 || this.y > C.H) {
      this.alive = false;
    }
  }

  draw(ctx) {
    const color = PROJ_COLORS[this.projType] || '#fff';
    ctx.shadowBlur = 8;
    ctx.shadowColor = color;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  }
}
