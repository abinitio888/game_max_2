// ============================================================
//  TOWER
// ============================================================
class Tower {
  constructor(x, y, team, towerType) {
    this.x = x;
    this.y = y;
    this.team = team;       // 'player' | 'enemy'
    this.towerType = towerType; // 'skeleton' | 'nexus'
    this.hp = towerType === 'nexus' ? C.NEXUS_TOWER_HP : C.SKEL_TOWER_HP;
    this.maxHp = this.hp;
    this.radius = C.TOWER_RADIUS;
    this.destroyed = false;
    this.spawnTimer = 0;
    this.alive = true;
    this.type = 'tower';
    this.effects = [];
    // Visual
    this.explosionTimer = -1;
    this.explosionAlpha = 1;
  }

  takeDamage(amount, game) {
    if (this.destroyed) return;
    this.hp = Math.max(0, this.hp - amount);
    if (this.hp <= 0 && !this.destroyed) {
      this.destroyed = true;
      this.alive = false;
      this.startExplosion(game);
    }
  }

  startExplosion(game) {
    this.explosionTimer = 0.6;
    if (game && game.particles) {
      game.particles.push(...burst(this.x, this.y,
        this.team === 'player' ? '#4466ff' : '#ff4422', 25));
    }
    if (game) game.onTowerDestroyed(this);
  }

  update(dt, game) {
    if (this.explosionTimer > 0) {
      this.explosionTimer -= dt;
    }
    if (this.destroyed) return;

    if (this.towerType === 'skeleton') {
      this.spawnTimer -= dt;
      if (this.spawnTimer <= 0) {
        this.spawnTimer = C.SKEL_SPAWN_INTERVAL;
        game.spawnSys.spawnSkeleton(this, game);
      }

      // Damage aura: 8 dmg/s to enemies within 60px
      const AURA_R = 60, AURA_DPS = 8;
      for (const e of game.entities) {
        if (!e.alive || e.team === this.team || e.hp === undefined) continue;
        if (dist(this, e) < AURA_R + (e.radius || 14)) {
          e.takeDamage(AURA_DPS * dt, game);
        }
      }
    }
  }

  draw(ctx) {
    if (this.explosionTimer > 0) {
      const alpha = this.explosionTimer / 0.6;
      const boom  = this.radius * 2 * (1 - alpha) + this.radius;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = '#ffaa00';
      ctx.beginPath(); ctx.arc(this.x, this.y, boom, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ff4400';
      ctx.beginPath(); ctx.arc(this.x, this.y, boom * 0.6, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
      return;
    }
    if (this.destroyed) return;

    const isNexus   = this.towerType === 'nexus';
    const isPlayer  = this.team === 'player';
    const teamColor = isPlayer ? '#3377ff' : '#dd2222';
    const r = this.radius; // 28
    const cx = this.x, cy = this.y;

    // ── Damage aura (skeleton towers) ────────────────────────
    if (!isNexus) {
      const pulse = Math.abs(Math.sin(Date.now() / 800)) * 0.07 + 0.03;
      ctx.globalAlpha = pulse;
      ctx.fillStyle = teamColor;
      ctx.beginPath(); ctx.arc(cx, cy, 60, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 0.25;
      ctx.strokeStyle = teamColor;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([5, 7]);
      ctx.beginPath(); ctx.arc(cx, cy, 60, 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;
    }

    if (isNexus) {
      // ── NEXUS: crystal/gem shape ──────────────────────────
      const gc = isPlayer ? '#1144dd' : '#aa1100';
      const gl = isPlayer ? '#4488ff' : '#ff5533';

      // Outer glow
      ctx.globalAlpha = 0.35;
      ctx.fillStyle = gl;
      ctx.beginPath(); ctx.arc(cx, cy, r + 10, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;

      // Shadow base
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.beginPath(); ctx.arc(cx + 3, cy + 4, r, 0, Math.PI * 2); ctx.fill();

      // Crystal body (octagon)
      ctx.fillStyle = gc;
      ctx.beginPath();
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2 - Math.PI / 8;
        const cr = (i % 2 === 0) ? r : r * 0.72;
        if (i === 0) ctx.moveTo(cx + Math.cos(a) * cr, cy + Math.sin(a) * cr);
        else         ctx.lineTo(cx + Math.cos(a) * cr, cy + Math.sin(a) * cr);
      }
      ctx.closePath(); ctx.fill();

      // Crystal face (lighter inner)
      ctx.fillStyle = gl;
      ctx.beginPath();
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2 - Math.PI / 8;
        const cr = (i % 2 === 0) ? r * 0.55 : r * 0.38;
        if (i === 0) ctx.moveTo(cx + Math.cos(a) * cr, cy + Math.sin(a) * cr);
        else         ctx.lineTo(cx + Math.cos(a) * cr, cy + Math.sin(a) * cr);
      }
      ctx.closePath(); ctx.fill();

      // Crystal shine
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.beginPath();
      ctx.moveTo(cx - r * 0.3, cy - r * 0.55);
      ctx.lineTo(cx + r * 0.1, cy - r * 0.6);
      ctx.lineTo(cx - r * 0.05, cy - r * 0.1);
      ctx.closePath(); ctx.fill();

      // Pulsing ring
      const pulse2 = Math.abs(Math.sin(Date.now() / 600)) * 0.4 + 0.15;
      ctx.globalAlpha = pulse2;
      ctx.strokeStyle = gl;
      ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(cx, cy, r + 6 + pulse2 * 6, 0, Math.PI * 2); ctx.stroke();
      ctx.globalAlpha = 1;

    } else {
      // ── SKELETON TOWER: castle tower shape ───────────────
      const stoneLight = isPlayer ? '#4a5a8a' : '#7a3a3a';
      const stoneDark  = isPlayer ? '#2a3055' : '#4a1a1a';
      const tw = r * 1.1;   // tower width
      const th = r * 1.6;   // tower height
      const bw = r * 0.55;  // battlement width
      const bh = r * 0.45;  // battlement height

      // Shadow
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.fillRect(cx - tw / 2 + 4, cy - th / 2 + 5, tw, th);

      // Tower body
      ctx.fillStyle = stoneLight;
      ctx.fillRect(cx - tw / 2, cy - th / 2, tw, th);

      // Stone row lines
      ctx.strokeStyle = stoneDark;
      ctx.lineWidth = 1;
      for (let ry = cy - th / 2 + 10; ry < cy + th / 2; ry += 10) {
        ctx.beginPath();
        ctx.moveTo(cx - tw / 2, ry); ctx.lineTo(cx + tw / 2, ry);
        ctx.stroke();
      }
      // Stone column lines (offset alternating)
      for (let ry = cy - th / 2; ry < cy + th / 2; ry += 10) {
        const rowOff = ((Math.floor((ry - cy + th / 2) / 10)) % 2) * (tw / 4);
        for (let rxOff = 0; rxOff <= tw; rxOff += tw / 2) {
          const rx = cx - tw / 2 + rxOff + rowOff;
          ctx.beginPath();
          ctx.moveTo(rx, ry); ctx.lineTo(rx, Math.min(ry + 10, cy + th / 2));
          ctx.stroke();
        }
      }

      // Left side shading
      ctx.fillStyle = stoneDark;
      ctx.fillRect(cx - tw / 2, cy - th / 2, tw * 0.18, th);

      // Battlements (merlons) on top
      const numMerlons = 3;
      for (let m = 0; m < numMerlons; m++) {
        const mx = cx - tw / 2 + m * (tw / numMerlons);
        ctx.fillStyle = stoneLight;
        ctx.fillRect(mx, cy - th / 2 - bh, bw, bh);
        ctx.strokeStyle = stoneDark;
        ctx.lineWidth = 1;
        ctx.strokeRect(mx, cy - th / 2 - bh, bw, bh);
      }

      // Arrow slit (window)
      ctx.fillStyle = stoneDark;
      ctx.fillRect(cx - 3, cy - 6, 6, 14);
      ctx.fillRect(cx - 6, cy - 1, 12, 5);

      // Team color banner
      ctx.fillStyle = teamColor;
      ctx.fillRect(cx - tw / 2, cy - th / 2 + 2, tw, r * 0.3);

      // Banner shine
      ctx.fillStyle = 'rgba(255,255,255,0.15)';
      ctx.fillRect(cx - tw / 2, cy - th / 2 + 2, tw * 0.4, r * 0.3);

      // Tower outline
      ctx.strokeStyle = 'rgba(0,0,0,0.5)';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(cx - tw / 2, cy - th / 2, tw, th);
    }

    // ── HP bar ────────────────────────────────────────────────
    drawHpBar(ctx, cx, cy + r + 6, r * 2.2, this.hp, this.maxHp,
      isPlayer ? '#3377ff' : '#dd2222');

    // ── HP numbers (nexus only) ───────────────────────────────
    if (isNexus) {
      ctx.fillStyle = '#ccc';
      ctx.font = '9px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'alphabetic';
      ctx.fillText(`${Math.ceil(this.hp)}/${this.maxHp}`, cx, cy + r + 20);
    }
  }
}
