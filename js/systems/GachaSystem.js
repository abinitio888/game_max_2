// ============================================================
//  GACHA SYSTEM  –  egg opening, roster persistence
// ============================================================
const LS_KEY = 'wizardRoster_v2';

class GachaSystem {
  constructor() {
    this.roster = this._load();
    this.openingEgg  = null; // { tier, phase, timer, result }
    this.eggPhase    = 'idle'; // 'idle' | 'shake' | 'crack' | 'reveal'
    this.eggTimer    = 0;
    this.lastResult  = null;
  }

  openEgg(tier) {
    if (this.eggPhase !== 'idle') return;
    const type  = randomFrom(WIZARD_TYPE_KEYS);
    const stars = tier;
    const wData = {
      id: uid(),
      type,
      stars,
      level: 1,
      xp: 0,
      itemBonuses: { speed: 0, health: 0, damage: 0 },
    };
    this.roster.push(wData);
    this._save();
    this.eggPhase  = 'shake';
    this.eggTimer  = 0.6;
    this.lastResult = wData;
    return wData;
  }

  update(dt) {
    if (this.eggPhase === 'idle') return;
    this.eggTimer -= dt;
    if (this.eggTimer <= 0) {
      if (this.eggPhase === 'shake')  { this.eggPhase = 'crack';  this.eggTimer = 0.4; }
      else if (this.eggPhase === 'crack')  { this.eggPhase = 'reveal'; this.eggTimer = 1.8; }
      else if (this.eggPhase === 'reveal') { this.eggPhase = 'idle'; }
    }
  }

  getRoster() { return this.roster; }

  removeFromRoster(id) {
    // Not used currently; kept for future
    this.roster = this.roster.filter(w => w.id !== id);
    this._save();
  }

  _save() {
    try { localStorage.setItem(LS_KEY, JSON.stringify(this.roster)); } catch {}
  }

  _load() {
    try {
      const d = localStorage.getItem(LS_KEY);
      return d ? JSON.parse(d) : [];
    } catch { return []; }
  }

  // ── Drawing helpers (used by StartScreen) ──────────────────
  drawEggAnimation(ctx, cx, cy, tier) {
    if (this.eggPhase === 'idle') { this._drawEgg(ctx, cx, cy, tier, 0); return; }

    const phase = this.eggPhase;
    const colors = ['#c0c0c0', '#e8b84b', '#a78bfa'];
    const color  = colors[tier - 1];

    if (phase === 'shake') {
      const shakeX = Math.sin(Date.now() / 50) * 8;
      this._drawEgg(ctx, cx + shakeX, cy, tier, 0);
    } else if (phase === 'crack') {
      this._drawEgg(ctx, cx, cy, tier, 1 - this.eggTimer / 0.4);
    } else if (phase === 'reveal' && this.lastResult) {
      const progress = 1 - this.eggTimer / 1.8;
      ctx.globalAlpha = progress;
      this._drawWizardCard(ctx, cx - 45, cy - 70, this.lastResult);
      ctx.globalAlpha = 1;
    }
  }

  _drawEgg(ctx, cx, cy, tier, crackAmt) {
    const colors = ['#aaaaaa', '#e8b84b', '#a78bfa'];
    const glow   = ['#888', '#cc9900', '#7c3aed'];
    ctx.shadowBlur  = 18;
    ctx.shadowColor = glow[tier - 1];

    ctx.fillStyle = colors[tier - 1];
    ctx.beginPath();
    ctx.ellipse(cx, cy, 28, 36, 0, 0, Math.PI * 2);
    ctx.fill();

    // Shine
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.beginPath();
    ctx.ellipse(cx - 8, cy - 10, 10, 14, -0.4, 0, Math.PI * 2);
    ctx.fill();

    // Stars on egg
    for (let i = 0; i < tier; i++) {
      drawStar(ctx, cx - (tier - 1) * 7 + i * 14, cy + 30, 5, '#FFD700');
    }

    // Crack overlay
    if (crackAmt > 0) {
      ctx.strokeStyle = '#111';
      ctx.lineWidth = 2;
      ctx.globalAlpha = crackAmt;
      ctx.beginPath();
      ctx.moveTo(cx - 10, cy - 10);
      ctx.lineTo(cx, cy + 5);
      ctx.lineTo(cx + 8, cy - 8);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    ctx.shadowBlur = 0;
  }

  _drawWizardCard(ctx, x, y, wData) {
    const tw  = WIZARD_TYPES[wData.type];
    const w = 90, h = 130;

    // Card bg
    ctx.fillStyle = '#1a1a2e';
    ctx.strokeStyle = tw.color;
    ctx.lineWidth = 2;
    ctx.roundRect ? ctx.roundRect(x, y, w, h, 8) : ctx.rect(x, y, w, h);
    ctx.fill(); ctx.stroke();

    // Wizard orb
    ctx.shadowBlur  = 12;
    ctx.shadowColor = tw.glowColor;
    ctx.fillStyle   = tw.color;
    ctx.beginPath();
    ctx.arc(x + w / 2, y + 42, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Stars
    for (let i = 0; i < wData.stars; i++) {
      drawStar(ctx, x + 18 + i * 18, y + 78, 6, '#FFD700');
    }

    // Name
    ctx.fillStyle = '#fff';
    ctx.font = '9px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(tw.name, x + w / 2, y + 100);
    ctx.fillText(`${starsLabel(wData.stars)}`, x + w / 2, y + 115);
  }
}
