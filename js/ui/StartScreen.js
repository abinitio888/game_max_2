// ============================================================
//  START SCREEN
// ============================================================
class StartScreen {
  constructor(gacha) {
    this.gacha = gacha;
  }

  handleClick(mx, my, game) {
    // Single egg button (center of screen)
    const ex = C.W / 2, ey = 300;
    if (Math.hypot(mx - ex, my - ey) < 55) {
      if (this.gacha.gold < C.GOLD_EGG_COST) {
        game.announcements.push({ text: 'Inte tillräckligt med guld! Spela för att tjäna mer.', duration: 2.5, maxDuration: 2.5 });
      } else {
        this.gacha.openEgg();
      }
      return;
    }

    // Start button
    if (mx >= C.W / 2 - 80 && mx <= C.W / 2 + 80 && my >= 415 && my <= 455) {
      if (this.gacha.getRoster().length > 0) {
        game.state = 'WIZARD_SELECT';
      } else {
        game.announcements.push({ text: 'Öppna ett ägg först!', duration: 2, maxDuration: 2 });
      }
    }

    // Adventure button
    if (mx >= C.W / 2 - 80 && mx <= C.W / 2 + 80 && my >= 463 && my <= 497) {
      game.state = 'ADVENTURE';
    }

    // Clear roster button
    if (mx >= C.W - 124 && mx <= C.W - 6 && my >= C.H - 36 && my <= C.H - 8) {
      if (confirm('Rensa hela samlingen?')) {
        try { localStorage.removeItem(LS_KEY); } catch {}
        this.gacha.roster = [];
      }
    }

    // Delete individual wizard (× on each mini circle in roster)
    const roster = this.gacha.getRoster();
    const maxShow = 8;
    const startX = Math.max(30, C.W / 2 - (Math.min(roster.length, maxShow) * 55) / 2);
    for (let i = 0; i < Math.min(roster.length, maxShow); i++) {
      const cx = startX + i * 55 + 25;
      const cy = 590;
      const btnX = cx + 12, btnY = cy - 22;
      if (Math.hypot(mx - btnX, my - btnY) < 10) {
        const wd = roster[roster.length - 1 - i];
        const refund = wd.stars === 3 ? 70 : wd.stars === 2 ? 50 : 30;
        this.gacha.removeFromRoster(wd.id);
        this.gacha.earnGold(refund);
        game.announcements.push({ text: `+${refund} 💰 återbetalning`, duration: 1.5, maxDuration: 1.5 });
        return;
      }
    }
  }

  update(dt) {
    this.gacha.update(dt);
  }

  draw(ctx, game) {
    // ── Background gradient ───────────────────────────────────
    const bg = ctx.createLinearGradient(0, 0, 0, C.H);
    bg.addColorStop(0,   '#08041a');
    bg.addColorStop(0.5, '#0d0d22');
    bg.addColorStop(1,   '#050816');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, C.W, C.H);
    this._drawStars(ctx);

    // Subtle vignette
    const vig = ctx.createRadialGradient(C.W/2, C.H/2, C.H*0.3, C.W/2, C.H/2, C.H*0.85);
    vig.addColorStop(0, 'rgba(0,0,0,0)');
    vig.addColorStop(1, 'rgba(0,0,0,0.55)');
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, C.W, C.H);

    // ── Title ────────────────────────────────────────────────
    // Shadow
    ctx.fillStyle = 'rgba(80,0,160,0.5)';
    ctx.font = 'bold 54px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('⚗ TROLLKARNAS KRIG', C.W / 2 + 3, 83);
    // Main
    ctx.fillStyle = '#e8e0ff';
    ctx.fillText('⚗ TROLLKARNAS KRIG', C.W / 2, 80);
    // Glow underline
    ctx.strokeStyle = 'rgba(160,80,255,0.5)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(C.W / 2 - 220, 90);
    ctx.lineTo(C.W / 2 + 220, 90);
    ctx.stroke();

    ctx.fillStyle = '#8888bb';
    ctx.font = '14px Arial';
    ctx.fillText('Öppna ägg · Samla trollkarlar · Strid mot AI', C.W / 2, 110);

    // ── Gold display ─────────────────────────────────────────
    const gold = this.gacha.gold;
    ctx.fillStyle = 'rgba(20,14,4,0.9)';
    if (ctx.roundRect) ctx.roundRect(C.W / 2 - 80, 122, 160, 34, 8);
    else ctx.rect(C.W / 2 - 80, 122, 160, 34);
    ctx.fill();
    ctx.strokeStyle = '#c8902a';
    ctx.lineWidth = 1.5;
    if (ctx.roundRect) ctx.roundRect(C.W / 2 - 80, 122, 160, 34, 8);
    else ctx.rect(C.W / 2 - 80, 122, 160, 34);
    ctx.stroke();
    ctx.fillStyle = '#f0c040';
    ctx.font = 'bold 17px Arial';
    ctx.fillText(`💰 ${gold} guld`, C.W / 2, 144);

    // ── Egg section label ────────────────────────────────────
    ctx.fillStyle = '#9988cc';
    ctx.font = 'bold 14px Arial';
    ctx.fillText('— Öppna ett magiskt ägg —', C.W / 2, 186);
    ctx.fillStyle = '#555577';
    ctx.font = '10px Arial';
    ctx.fillText('1★ 50%   2★ 30%   3★ 20%', C.W / 2, 202);

    // ── Egg ──────────────────────────────────────────────────
    const ex = C.W / 2, ey = 295;
    if (this.gacha.eggPhase !== 'idle') {
      this.gacha.drawEggAnimation(ctx, ex, ey);
    } else {
      this.gacha._drawEgg(ctx, ex, ey, 1, 0);
    }

    // Cost label
    const canAfford = gold >= C.GOLD_EGG_COST;
    ctx.fillStyle = canAfford ? '#f0c040' : '#cc4444';
    ctx.font = 'bold 12px Arial';
    ctx.fillText(`Kostar ${C.GOLD_EGG_COST} 💰`, ex, ey + 58);
    if (!canAfford) {
      ctx.fillStyle = '#cc4444';
      ctx.font = '10px Arial';
      ctx.fillText('Inte råd — spela för att tjäna guld!', ex, ey + 72);
    }
    ctx.fillStyle = '#3a3a55';
    ctx.font = '9px Arial';
    ctx.fillText(`Skelett +${C.GOLD_SKEL}  Boss +${C.GOLD_BOSS}  Torn +${C.GOLD_TOWER}  Trollkarl +${C.GOLD_ENEMY_WIZ}`, ex, ey + 88);

    // ── Buttons ───────────────────────────────────────────────
    const canStart = this.gacha.getRoster().length > 0;
    const bx = C.W / 2 - 88, by = 410;

    // SPELA button
    ctx.fillStyle = canStart ? '#162560' : '#221836';
    if (ctx.roundRect) ctx.roundRect(bx, by, 176, 44, 10);
    else ctx.rect(bx, by, 176, 44);
    ctx.fill();
    if (canStart) {
      ctx.fillStyle = 'rgba(80,140,255,0.15)';
      if (ctx.roundRect) ctx.roundRect(bx, by, 176, 22, [10, 10, 0, 0]);
      else ctx.rect(bx, by, 176, 22);
      ctx.fill();
    }
    ctx.strokeStyle = canStart ? '#4477ff' : '#443366';
    ctx.lineWidth = 2;
    if (ctx.roundRect) ctx.roundRect(bx, by, 176, 44, 10);
    else ctx.rect(bx, by, 176, 44);
    ctx.stroke();
    ctx.fillStyle = canStart ? '#ffffff' : '#555577';
    ctx.font = 'bold 20px Arial';
    ctx.fillText('▶  SPELA', C.W / 2, by + 28);

    // ÄVENTYR button
    const aby = by + 54;
    ctx.fillStyle = '#0d1f10';
    if (ctx.roundRect) ctx.roundRect(bx, aby, 176, 38, 10);
    else ctx.rect(bx, aby, 176, 38);
    ctx.fill();
    ctx.fillStyle = 'rgba(40,180,80,0.12)';
    if (ctx.roundRect) ctx.roundRect(bx, aby, 176, 19, [10, 10, 0, 0]);
    else ctx.rect(bx, aby, 176, 19);
    ctx.fill();
    ctx.strokeStyle = '#33bb55';
    ctx.lineWidth = 1.8;
    if (ctx.roundRect) ctx.roundRect(bx, aby, 176, 38, 10);
    else ctx.rect(bx, aby, 176, 38);
    ctx.stroke();
    ctx.fillStyle = '#44ee77';
    ctx.font = 'bold 16px Arial';
    ctx.fillText('⚔  ÄVENTYR', C.W / 2, aby + 24);

    // ── Roster ───────────────────────────────────────────────
    this._drawRoster(ctx, game);

    // ── Announcements ────────────────────────────────────────
    game.announcements = game.announcements.filter(a => {
      a.duration -= 1 / 60;
      return a.duration > 0;
    });
    for (const ann of game.announcements) {
      drawAnnouncement(ctx, ann.text, clamp(ann.duration / ann.maxDuration, 0, 1));
    }

    // ── Clear roster button ───────────────────────────────────
    ctx.fillStyle = 'rgba(30,10,10,0.8)';
    if (ctx.roundRect) ctx.roundRect(C.W - 124, C.H - 36, 118, 28, 6);
    else ctx.rect(C.W - 124, C.H - 36, 118, 28);
    ctx.fill();
    ctx.strokeStyle = '#553333';
    ctx.lineWidth = 1;
    if (ctx.roundRect) ctx.roundRect(C.W - 124, C.H - 36, 118, 28, 6);
    else ctx.rect(C.W - 124, C.H - 36, 118, 28);
    ctx.stroke();
    ctx.fillStyle = '#774444';
    ctx.font = '10px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('🗑 Rensa samling', C.W - 65, C.H - 18);
  }

  _drawRoster(ctx, game) {
    const roster = this.gacha.getRoster();
    if (roster.length === 0) {
      ctx.fillStyle = '#555';
      ctx.font = '13px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('Din samling är tom – öppna ett ägg!', C.W / 2, 570);
      return;
    }
    ctx.fillStyle = '#aaa';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`Din samling: ${roster.length} trollkarlar`, C.W / 2, 560);

    const maxShow = 8;
    const startX = Math.max(30, C.W / 2 - (Math.min(roster.length, maxShow) * 55) / 2);
    for (let i = 0; i < Math.min(roster.length, maxShow); i++) {
      const wd = roster[roster.length - 1 - i];
      const cx = startX + i * 55 + 25;
      const cy = 590;
      const tw = WIZARD_TYPES[wd.type];

      drawWizardSprite(ctx, cx, cy, tw.color, tw.glowColor, -Math.PI / 2, 16);

      for (let s = 0; s < wd.stars; s++) {
        drawStar(ctx, cx - (wd.stars - 1) * 5 + s * 10, cy + 22, 4, '#FFD700');
      }

      // Delete × button
      const btnX = cx + 12, btnY = cy - 22;
      ctx.fillStyle = '#cc2222';
      ctx.beginPath();
      ctx.arc(btnX, btnY, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 10px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('×', btnX, btnY);
      ctx.textBaseline = 'alphabetic';
    }
    if (roster.length > maxShow) {
      ctx.fillStyle = '#888';
      ctx.font = '10px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(`+${roster.length - maxShow} fler`, startX + maxShow * 55 + 30, 595);
    }
  }

  _drawStars(ctx) {
    for (let i = 0; i < 140; i++) {
      const sx = ((i * 173 + 43) % C.W);
      const sy = ((i * 113 + 17) % C.H);
      const sr = (i % 5 === 0) ? 1.8 : (i % 3 === 0) ? 1.2 : 0.7;
      const alpha = (i % 7 === 0) ? 0.9 : (i % 3 === 0) ? 0.6 : 0.35;
      ctx.fillStyle = `rgba(255,255,255,${alpha})`;
      ctx.beginPath();
      ctx.arc(sx, sy, sr, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}
