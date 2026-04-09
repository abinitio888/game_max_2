// ============================================================
//  START SCREEN
// ============================================================
class StartScreen {
  constructor(gacha) {
    this.gacha  = gacha;
    this.scroll = 0; // roster scroll offset
  }

  handleClick(mx, my, game) {
    // Egg buttons
    for (let i = 0; i < 3; i++) {
      const ex = 220 + i * 170, ey = 310;
      if (Math.hypot(mx - ex, my - ey) < 50) {
        this.gacha.openEgg(i + 1);
        return;
      }
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

    // Starfield
    this._drawStars(ctx);

    // Title
    ctx.shadowBlur  = 30;
    ctx.shadowColor = '#6644ff';
    ctx.fillStyle   = '#fff';
    ctx.font = 'bold 52px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('⚗ TROLLKARNAS KRIG', C.W / 2, 80);
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#aaaacc';
    ctx.font = '16px Arial';
    ctx.fillText('Öppna ägg för att samla trollkarlar och strid mot AI', C.W / 2, 115);

    // Egg section header
    ctx.fillStyle = '#ccccdd';
    ctx.font = 'bold 18px Arial';
    ctx.fillText('— Välj ett ägg att öppna —', C.W / 2, 200);

    const eggLabels = ['Vanligt Ägg', 'Sällsynt Ägg', 'Episkt Ägg'];
    const eggTiers  = [1, 2, 3];
    const eggCost   = ['Gratis', 'Gratis', 'Gratis'];

    for (let i = 0; i < 3; i++) {
      const ex = 220 + i * 170;
      const ey = 280;

      // Draw egg (gacha system handles animation for lastResult tier)
      if (this.gacha.eggPhase !== 'idle' && this.gacha.lastResult &&
          this.gacha.lastResult.stars === i + 1) {
        this.gacha.drawEggAnimation(ctx, ex, ey, i + 1);
      } else {
        this.gacha._drawEgg(ctx, ex, ey, i + 1, 0);
      }

      // Label
      ctx.fillStyle = '#ccc';
      ctx.font = '12px Arial';
      ctx.fillText(eggLabels[i], ex, ey + 55);
      ctx.fillStyle = '#aaa';
      ctx.font = '10px Arial';
      ctx.fillText(eggCost[i], ex, ey + 70);
    }

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
      a.duration -= 1/60;
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
    ctx.fillText('Rensa samling', C.W - 65, C.H - 17);
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
    ctx.fillText(`Din samling: ${roster.length} trollkarlar`, C.W / 2, 560);

    const startX = Math.max(30, C.W / 2 - (Math.min(roster.length, 8) * 55) / 2);
    const maxShow = 8;
    for (let i = 0; i < Math.min(roster.length, maxShow); i++) {
      const wd = roster[roster.length - 1 - i]; // newest first
      const cx = startX + i * 55 + 25;
      const cy = 590;
      const tw = WIZARD_TYPES[wd.type];

      ctx.shadowBlur  = 8;
      ctx.shadowColor = tw.glowColor;
      ctx.fillStyle   = tw.color;
      ctx.beginPath();
      ctx.arc(cx, cy, 18, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      for (let s = 0; s < wd.stars; s++) {
        drawStar(ctx, cx - (wd.stars - 1) * 5 + s * 10, cy + 22, 4, '#FFD700');
      }
    }
    if (roster.length > maxShow) {
      ctx.fillStyle = '#888';
      ctx.font = '10px Arial';
      ctx.fillText(`+${roster.length - maxShow} fler`, startX + maxShow * 55 + 30, 595);
    }
  }

  _drawStars(ctx) {
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    // Static starfield (deterministic positions)
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
