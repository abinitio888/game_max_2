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
    const angle = Math.atan2(this.vy, this.vx);
    const cx = this.x, cy = this.y;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angle);

    switch (this.projType) {

      case 'fireball': {
        // Outer glow
        ctx.globalAlpha = 0.2;
        ctx.fillStyle = '#ffdd00';
        ctx.beginPath(); ctx.arc(0, 0, 14, 0, Math.PI * 2); ctx.fill();
        // Inner flame teardrop
        ctx.globalAlpha = 0.7;
        ctx.fillStyle = '#ff8800';
        ctx.beginPath();
        ctx.moveTo(8, 0);
        ctx.quadraticCurveTo(2, -5, -8, 0);
        ctx.quadraticCurveTo(2, 5, 8, 0);
        ctx.fill();
        // Hot core
        ctx.globalAlpha = 1;
        ctx.fillStyle = '#ffee88';
        ctx.beginPath(); ctx.arc(2, 0, 4, 0, Math.PI * 2); ctx.fill();
        break;
      }

      case 'ice_shard': {
        // Glow
        ctx.globalAlpha = 0.25;
        ctx.fillStyle = '#aaeeff';
        ctx.beginPath(); ctx.arc(0, 0, 11, 0, Math.PI * 2); ctx.fill();
        // Shard body
        ctx.globalAlpha = 0.9;
        ctx.fillStyle = '#7ecef4';
        ctx.beginPath();
        ctx.moveTo(9, 0);
        ctx.lineTo(2, -3.5);
        ctx.lineTo(-8, 0);
        ctx.lineTo(2, 3.5);
        ctx.closePath();
        ctx.fill();
        // White tip
        ctx.globalAlpha = 1;
        ctx.fillStyle = '#ddf4ff';
        ctx.beginPath();
        ctx.moveTo(9, 0); ctx.lineTo(4, -2); ctx.lineTo(4, 2);
        ctx.closePath(); ctx.fill();
        break;
      }

      case 'bolt': {
        // Outer flash
        ctx.globalAlpha = 0.2;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath(); ctx.arc(0, 0, 13, 0, Math.PI * 2); ctx.fill();
        // Bolt trail
        ctx.globalAlpha = 0.55;
        ctx.fillStyle = '#ffe066';
        ctx.beginPath();
        ctx.moveTo(-9, -2); ctx.lineTo(0, -3); ctx.lineTo(-2, 0);
        ctx.lineTo(9, -1); ctx.lineTo(0, 1); ctx.lineTo(2, 3);
        ctx.closePath(); ctx.fill();
        // Core
        ctx.globalAlpha = 1;
        ctx.fillStyle = '#fff8aa';
        ctx.beginPath();
        ctx.moveTo(-4, -1.5); ctx.lineTo(3, -2); ctx.lineTo(-1, 0.5);
        ctx.lineTo(4, 0); ctx.closePath(); ctx.fill();
        break;
      }

      case 'shadow_orb': {
        // Outer dark glow
        ctx.globalAlpha = 0.3;
        ctx.fillStyle = '#220044';
        ctx.beginPath(); ctx.arc(0, 0, 14, 0, Math.PI * 2); ctx.fill();
        // Orb body
        ctx.globalAlpha = 0.9;
        ctx.fillStyle = '#6a20cc';
        ctx.beginPath(); ctx.arc(0, 0, 7, 0, Math.PI * 2); ctx.fill();
        // Inner glow
        ctx.globalAlpha = 1;
        ctx.fillStyle = '#cc88ff';
        ctx.beginPath(); ctx.arc(-2, -2, 3, 0, Math.PI * 2); ctx.fill();
        // Wispy tendrils
        ctx.globalAlpha = 0.4;
        ctx.strokeStyle = '#aa44ff';
        ctx.lineWidth = 1.5;
        ctx.lineCap = 'round';
        for (let i = 0; i < 4; i++) {
          const a = (i / 4) * Math.PI * 2;
          ctx.beginPath();
          ctx.moveTo(Math.cos(a) * 7, Math.sin(a) * 7);
          ctx.lineTo(Math.cos(a) * 13, Math.sin(a) * 12);
          ctx.stroke();
        }
        break;
      }

      case 'vine': {
        // Glow
        ctx.globalAlpha = 0.25;
        ctx.fillStyle = '#88ff44';
        ctx.beginPath(); ctx.arc(0, 0, 12, 0, Math.PI * 2); ctx.fill();
        // Vine body
        ctx.globalAlpha = 1;
        ctx.strokeStyle = '#2d8a20';
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(-8, 0); ctx.quadraticCurveTo(0, -4, 8, 0); ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(-8, 0); ctx.quadraticCurveTo(0,  4, 8, 0); ctx.stroke();
        // Leaves
        ctx.fillStyle = '#4caf50';
        ctx.beginPath();
        ctx.moveTo(3, 0); ctx.quadraticCurveTo(6, -5, 9, 0);
        ctx.quadraticCurveTo(6, 5, 3, 0); ctx.fill();
        break;
      }

      case 'void_pulse': {
        // Outer ring
        ctx.globalAlpha = 0.25;
        ctx.strokeStyle = '#cc44ff';
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(0, 0, 14, 0, Math.PI * 2); ctx.stroke();
        // Main ring
        ctx.globalAlpha = 0.8;
        ctx.strokeStyle = '#9c27b0';
        ctx.lineWidth = 4;
        ctx.beginPath(); ctx.arc(0, 0, 8, 0, Math.PI * 2); ctx.stroke();
        // Center core
        ctx.globalAlpha = 1;
        ctx.fillStyle = '#e040fb';
        ctx.beginPath(); ctx.arc(0, 0, 3, 0, Math.PI * 2); ctx.fill();
        break;
      }

      case 'boss': {
        // Outer threat glow
        ctx.globalAlpha = 0.3;
        ctx.fillStyle = '#ff0000';
        ctx.beginPath(); ctx.arc(0, 0, 16, 0, Math.PI * 2); ctx.fill();
        // Body
        ctx.globalAlpha = 1;
        ctx.fillStyle = '#cc0000';
        ctx.beginPath(); ctx.arc(0, 0, 8, 0, Math.PI * 2); ctx.fill();
        // Core
        ctx.fillStyle = '#ff6666';
        ctx.beginPath(); ctx.arc(-2, -2, 4, 0, Math.PI * 2); ctx.fill();
        // Spike trail
        ctx.fillStyle = '#ff3300';
        ctx.globalAlpha = 0.6;
        ctx.beginPath();
        ctx.moveTo(-8, 0); ctx.lineTo(-18, -4); ctx.lineTo(-14, 0);
        ctx.lineTo(-18, 4); ctx.closePath(); ctx.fill();
        break;
      }

      default: {
        ctx.globalAlpha = 0.28;
        ctx.fillStyle = color;
        ctx.beginPath(); ctx.arc(0, 0, 10, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1;
        ctx.fillStyle = color;
        ctx.beginPath(); ctx.arc(0, 0, 5, 0, Math.PI * 2); ctx.fill();
      }
    }

    ctx.globalAlpha = 1;
    ctx.restore();
  }
}
