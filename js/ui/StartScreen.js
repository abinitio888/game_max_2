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
    if (mx >= C.W / 2 - 80 && mx <= C.W / 2 + 80 && my >= 490 && my <= 530) {
      if (this.gacha.getRoster().length > 0) {
        game.state = 'WIZARD_SELECT';
      } else {
        game.announcements.push({ text: 'Öppna ett ägg först!', duration: 2, maxDuration: 2 });
      }
    }

    // Clear roster button
    if (mx >= C.W - 120 && mx <= C.W - 10 && my >= C.H - 34 && my <= C.H - 6) {
      if (confirm('Rensa hela samlingen?')) {
        try { localStorage.removeItem(LS_KEY); } catch {}
        this.gacha.roster = [];
      }
    }
  }

  update(dt) {
    this.gacha.update(dt);
  }

  draw(ctx, game) {
    // Background
    ctx.fillStyle = '#0d0d1a';
    ctx.fillRect(0, 0, C.W, C.H);
    this._drawStars(ctx);

    // Title
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 52px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('⚗ TROLLKARNAS KRIG', C.W / 2, 80);
    ctx.fillStyle = '#aaaacc';
    ctx.font = '16px Arial';
    ctx.fillText('Öppna ägg för att samla trollkarlar och strid mot AI', C.W / 2, 115);

    // Gold display
    const gold = this.gacha.gold;
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(C.W / 2 - 70, 130, 140, 32);
    ctx.strokeStyle = '#e8b84b';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(C.W / 2 - 70, 130, 140, 32);
    ctx.fillStyle = '#e8b84b';
    ctx.font = 'bold 18px Arial';
    ctx.fillText(`💰 ${gold} guld`, C.W / 2, 152);

    // Egg section
    ctx.fillStyle = '#ccccdd';
    ctx.font = 'bold 16px Arial';
    ctx.fillText('— Öppna ett magiskt ägg —', C.W / 2, 198);

    // Probability info
    ctx.fillStyle = '#888';
    ctx.font = '11px Arial';
    ctx.fillText('1★ 50%   2★ 30%   3★ 20%', C.W / 2, 218);

    // Single egg
    const ex = C.W / 2, ey = 300;
    if (this.gacha.eggPhase !== 'idle') {
      this.gacha.drawEggAnimation(ctx, ex, ey);
    } else {
      this.gacha._drawEgg(ctx, ex, ey, 1, 0);
    }

    // Cost label under egg
    const canAfford = gold >= C.GOLD_EGG_COST;
    ctx.fillStyle = canAfford ? '#e8b84b' : '#cc4444';
    ctx.font = 'bold 13px Arial';
    ctx.fillText(`Kostar ${C.GOLD_EGG_COST} 💰`, ex, ey + 60);
    if (!canAfford) {
      ctx.fillStyle = '#cc4444';
      ctx.font = '11px Arial';
      ctx.fillText('Inte råd — spela för att tjäna guld!', ex, ey + 76);
    }

    // How to earn gold
    ctx.fillStyle = '#555';
    ctx.font = '10px Arial';
    ctx.fillText(`Skelett +${C.GOLD_SKEL}  Boss +${C.GOLD_BOSS}  Torn +${C.GOLD_TOWER}  Trollkarl +${C.GOLD_ENEMY_WIZ}`, ex, ey + 95);

    // Start button
    const canStart = this.gacha.getRoster().length > 0;
    ctx.fillStyle = canStart ? '#2244cc' : '#443355';
    ctx.strokeStyle = canStart ? '#4477ff' : '#555';
    ctx.lineWidth = 2;
    const bx = C.W / 2 - 80, by = 490;
    if (ctx.roundRect) ctx.roundRect(bx, by, 160, 40, 8);
    else ctx.rect(bx, by, 160, 40);
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = canStart ? '#fff' : '#888';
    ctx.font = 'bold 20px Arial';
    ctx.fillText('▶ SPELA', C.W / 2, 516);

    // Roster
    this._drawRoster(ctx, game);

    // Announcements
    game.announcements = game.announcements.filter(a => {
      a.duration -= 1 / 60;
      return a.duration > 0;
    });
    for (const ann of game.announcements) {
      drawAnnouncement(ctx, ann.text, clamp(ann.duration / ann.maxDuration, 0, 1));
    }

    // Clear button
    ctx.fillStyle = '#333';
    ctx.fillRect(C.W - 120, C.H - 34, 110, 28);
    ctx.fillStyle = '#888';
    ctx.font = '10px Arial';
    ctx.textAlign = 'left';
    ctx.fillText('Rensa samling', C.W - 116, C.H - 17);
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

      // Cheap glow ring
      ctx.globalAlpha = 0.35;
      ctx.strokeStyle = tw.glowColor;
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(cx, cy, 22, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;

      ctx.fillStyle = tw.color;
      ctx.beginPath();
      ctx.arc(cx, cy, 18, 0, Math.PI * 2);
      ctx.fill();

      for (let s = 0; s < wd.stars; s++) {
        drawStar(ctx, cx - (wd.stars - 1) * 5 + s * 10, cy + 22, 4, '#FFD700');
      }
    }
    if (roster.length > maxShow) {
      ctx.fillStyle = '#888';
      ctx.font = '10px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(`+${roster.length - maxShow} fler`, startX + maxShow * 55 + 30, 595);
    }
  }

  _drawStars(ctx) {
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    for (let i = 0; i < 80; i++) {
      const x = ((i * 127 + 43) % C.W);
      const y = ((i * 91  + 17) % 480);
      const r = (i % 3 === 0) ? 1.5 : 1;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}
