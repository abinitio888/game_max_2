// ============================================================
//  HUD  –  in-game overlay
// ============================================================
class HUD {
  draw(ctx, game) {
    this._drawPlayerPanel(ctx, game);
    this._drawTimer(ctx, game);
    this._drawAnnouncements(ctx, game);
    this._drawMegaWarning(ctx, game);
    this._drawControls(ctx);
  }

  _drawPlayerPanel(ctx, game) {
    const pw = game.playerWizard;
    if (!pw || !pw.alive) return;

    const px = 10, py = C.H - 90;

    // Panel bg
    ctx.fillStyle = 'rgba(0,0,0,0.65)';
    ctx.fillRect(px, py, 220, 80);
    ctx.strokeStyle = pw.color;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(px, py, 220, 80);

    // Type + stars
    ctx.fillStyle = pw.color;
    ctx.font = 'bold 12px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(`${WIZARD_TYPES[pw.wizardType].name}`, px + 8, py + 16);
    ctx.fillStyle = '#FFD700';
    ctx.fillText(starsLabel(pw.stars), px + 8, py + 30);

    // HP bar
    ctx.fillStyle = '#555';
    ctx.fillRect(px + 8, py + 35, 120, 8);
    const hpPct = clamp(pw.hp / pw.maxHp, 0, 1);
    ctx.fillStyle = hpPct > 0.5 ? '#22cc44' : hpPct > 0.25 ? '#ffaa00' : '#ff3333';
    ctx.fillRect(px + 8, py + 35, 120 * hpPct, 8);
    ctx.fillStyle = '#ccc';
    ctx.font = '9px Arial';
    ctx.fillText(`${Math.ceil(pw.hp)}/${pw.maxHp}`, px + 8, py + 54);

    // XP bar
    if (pw.level < 3) {
      ctx.fillStyle = '#333';
      ctx.fillRect(px + 8, py + 58, 120, 5);
      const xpPct = pw.xp / pw.xpNeeded;
      ctx.fillStyle = '#88aaff';
      ctx.fillRect(px + 8, py + 58, 120 * xpPct, 5);
    }

    // Level
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 11px Arial';
    ctx.fillText(`Lv ${pw.level}`, px + 140, py + 44);

    // Items
    const items = [];
    if (pw.itemBonuses.speed)  items.push('⚡');
    if (pw.itemBonuses.health) items.push('❤');
    if (pw.itemBonuses.damage) items.push('⚔');
    ctx.font = '14px Arial';
    ctx.fillText(items.join(' '), px + 140, py + 62);

    // Ability cooldowns
    const abilityReady = pw.abilityTimer <= 0;
    const rushReady    = pw.rushTimer <= 0;
    ctx.fillStyle = abilityReady ? '#aaffaa' : '#777';
    ctx.font = '9px Arial';
    ctx.fillText(`[Q] ${abilityReady ? 'Redo' : pw.abilityTimer.toFixed(1) + 's'}`, px + 8, py + 72);
    ctx.fillStyle = rushReady ? '#aaffaa' : '#777';
    ctx.fillText(`[E] Rush ${rushReady ? 'Redo' : pw.rushTimer.toFixed(1) + 's'}`, px + 70, py + 72);
  }

  _drawTimer(ctx, game) {
    const t = game.globalTimer;
    const remaining = Math.max(0, C.MEGA_TRIGGER_TIME - t);
    const mins = Math.floor(remaining / 60);
    const secs = Math.floor(remaining % 60);
    const label = remaining > 0
      ? `Mega Skelett om: ${mins}:${String(secs).padStart(2, '0')}`
      : '💀 Mega Skelett!';

    const color = remaining < 20 ? '#ff4444' : remaining < 60 ? '#ffaa00' : '#ffffff';
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(C.W / 2 - 100, 4, 200, 22);
    ctx.fillStyle = color;
    ctx.font = 'bold 13px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(label, C.W / 2, 20);
  }

  _drawAnnouncements(ctx, game) {
    let y = C.H / 2 + 20;
    for (const ann of game.announcements) {
      const alpha = clamp(ann.duration / ann.maxDuration, 0, 1);
      drawAnnouncement(ctx, ann.text, alpha);
    }
    // Tick
    game.announcements = game.announcements.filter(a => {
      a.duration -= 1/60;
      return a.duration > 0;
    });
  }

  _drawMegaWarning(ctx, game) {
    const t = game.globalTimer;
    if (t >= C.MEGA_TRIGGER_TIME - 10 && t < C.MEGA_TRIGGER_TIME) {
      const pulse = Math.abs(Math.sin(Date.now() / 200)) * 0.6 + 0.3;
      ctx.globalAlpha = pulse;
      ctx.fillStyle = '#ff0000';
      ctx.font = 'bold 20px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('⚠ MEGA SKELETT SNART! ⚠', C.W / 2, 45);
      ctx.globalAlpha = 1;
    }
  }

  _drawControls(ctx) {
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(C.W - 165, C.H - 90, 160, 86);
    ctx.fillStyle = '#888';
    ctx.font = '9px Arial';
    ctx.textAlign = 'left';
    const lines = ['WASD – Rör dig', 'Mus – Sikta', 'Klick/Mellanslag – Attackera', 'Q – Speciell förmåga', 'E – Rusa till nexus'];
    lines.forEach((l, i) => ctx.fillText(l, C.W - 158, C.H - 74 + i * 13));
  }
}
