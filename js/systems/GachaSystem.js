// ============================================================
//  GACHA SYSTEM  –  egg opening, roster persistence, gold
// ============================================================
const LS_KEY      = 'wizardRoster_v2';
const LS_GOLD_KEY = 'wizardGold_v1';

class GachaSystem {
  constructor() {
    this.roster    = this._loadRoster();
    this.gold      = this._loadGold();
    this.eggPhase  = 'idle'; // 'idle' | 'shake' | 'crack' | 'reveal'
    this.eggTimer  = 0;
    this.lastResult = null;
  }

  // Returns false if not enough gold
  openEgg() {
    if (this.eggPhase !== 'idle') return false;
    if (this.gold < C.GOLD_EGG_COST) return false;

    this.gold -= C.GOLD_EGG_COST;
    this._saveGold();

    // Star rates: 50% = 1★, 30% = 2★, 20% = 3★
    const roll = Math.random();
    const stars = roll < C.EGG_STAR_RATES[0] ? 1
                : roll < C.EGG_STAR_RATES[1] ? 2
                : 3;

    const wData = {
      id: uid(),
      type:  randomFrom(WIZARD_TYPE_KEYS),
      stars,
      level: 1,
      xp:    0,
      itemBonuses: { speed: 0, health: 0, damage: 0 },
    };
    this.roster.push(wData);
    this._saveRoster();
    this.eggPhase   = 'shake';
    this.eggTimer   = 0.6;
    this.lastResult = wData;
    return wData;
  }

  earnGold(amount) {
    this.gold += amount;
    this._saveGold();
  }

  update(dt) {
    if (this.eggPhase === 'idle') return;
    this.eggTimer -= dt;
    if (this.eggTimer <= 0) {
      if      (this.eggPhase === 'shake')  { this.eggPhase = 'crack';  this.eggTimer = 0.4; }
      else if (this.eggPhase === 'crack')  { this.eggPhase = 'reveal'; this.eggTimer = 1.8; }
      else if (this.eggPhase === 'reveal') { this.eggPhase = 'idle'; }
    }
  }

  getRoster() { return this.roster; }

  removeFromRoster(id) {
    this.roster = this.roster.filter(w => w.id !== id);
    this._saveRoster();
  }

  _saveRoster() {
    try { localStorage.setItem(LS_KEY, JSON.stringify(this.roster)); } catch {}
  }
  _loadRoster() {
    try { const d = localStorage.getItem(LS_KEY); return d ? JSON.parse(d) : []; } catch { return []; }
  }
  _saveGold() {
    try { localStorage.setItem(LS_GOLD_KEY, String(this.gold)); } catch {}
  }
  _loadGold() {
    try { return parseInt(localStorage.getItem(LS_GOLD_KEY) || '0', 10) || 0; } catch { return 0; }
  }

  // ── Drawing helpers ────────────────────────────────────────
  drawEggAnimation(ctx, cx, cy) {
    const tier = this.lastResult ? this.lastResult.stars : 1;
    if (this.eggPhase === 'idle') { this._drawEgg(ctx, cx, cy, tier, 0); return; }

    if (this.eggPhase === 'shake') {
      const shakeX = Math.sin(Date.now() / 50) * 8;
      this._drawEgg(ctx, cx + shakeX, cy, tier, 0);
    } else if (this.eggPhase === 'crack') {
      this._drawEgg(ctx, cx, cy, tier, 1 - this.eggTimer / 0.4);
    } else if (this.eggPhase === 'reveal' && this.lastResult) {
      const progress = 1 - this.eggTimer / 1.8;
      ctx.globalAlpha = progress;
      this._drawWizardCard(ctx, cx - 45, cy - 70, this.lastResult);
      ctx.globalAlpha = 1;
    }
  }

  _drawEgg(ctx, cx, cy, tier, crackAmt) {
    const colors = ['#aaaaaa', '#e8b84b', '#a78bfa'];
    const glows  = ['rgba(136,136,136,0.4)', 'rgba(200,150,0,0.4)', 'rgba(140,60,240,0.4)'];

    // Cheap glow halo
    ctx.globalAlpha = 0.4;
    ctx.fillStyle = glows[tier - 1];
    ctx.beginPath();
    ctx.ellipse(cx, cy, 36, 46, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

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
  }

  _drawWizardCard(ctx, x, y, wData) {
    const tw = WIZARD_TYPES[wData.type];
    const w = 90, h = 130;

    ctx.fillStyle = '#1a1a2e';
    ctx.strokeStyle = tw.color;
    ctx.lineWidth = 2;
    ctx.roundRect ? ctx.roundRect(x, y, w, h, 8) : ctx.rect(x, y, w, h);
    ctx.fill(); ctx.stroke();

    // Cheap glow ring instead of shadowBlur
    ctx.globalAlpha = 0.4;
    ctx.strokeStyle = tw.glowColor;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(x + w / 2, y + 42, 26, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;

    ctx.fillStyle = tw.color;
    ctx.beginPath();
    ctx.arc(x + w / 2, y + 42, 22, 0, Math.PI * 2);
    ctx.fill();

    for (let i = 0; i < wData.stars; i++) {
      drawStar(ctx, x + 18 + i * 18, y + 78, 6, '#FFD700');
    }

    ctx.fillStyle = '#fff';
    ctx.font = '9px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(tw.name, x + w / 2, y + 100);
    ctx.fillText(starsLabel(wData.stars), x + w / 2, y + 115);
  }
}
