// ============================================================
//  HUD  –  in-game overlay
// ============================================================
function _rr(ctx, x, y, w, h, rad) {
  ctx.beginPath();
  if (ctx.roundRect) { ctx.roundRect(x, y, w, h, rad); }
  else { ctx.rect(x, y, w, h); }
}

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

    const px = 10, py = C.H - 134;
    const pw2 = 228, ph = 124;

    // Panel shadow
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    _rr(ctx, px + 3, py + 3, pw2, ph, 10);
    ctx.fill();

    // Panel background
    ctx.fillStyle = 'rgba(8,8,22,0.88)';
    _rr(ctx, px, py, pw2, ph, 10);
    ctx.fill();
    ctx.strokeStyle = pw.color;
    ctx.lineWidth = 1.5;
    _rr(ctx, px, py, pw2, ph, 10);
    ctx.stroke();

    // Colored top bar
    ctx.fillStyle = pw.color;
    ctx.globalAlpha = 0.18;
    _rr(ctx, px, py, pw2, 28, [10, 10, 0, 0]);
    ctx.fill();
    ctx.globalAlpha = 1;

    // Wizard name + stars
    ctx.fillStyle = pw.color;
    ctx.font = 'bold 11px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(WIZARD_TYPES[pw.wizardType].name, px + 10, py + 17);

    ctx.fillStyle = '#FFD700';
    ctx.font = '11px Arial';
    ctx.fillText(starsLabel(pw.stars), px + 10, py + 30);

    // Level badge
    ctx.fillStyle = pw.color;
    ctx.globalAlpha = 0.85;
    _rr(ctx, px + pw2 - 38, py + 6, 32, 16, 4);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 10px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`Lv ${pw.level}`, px + pw2 - 22, py + 17);

    // HP label
    ctx.fillStyle = '#aaa';
    ctx.font = '9px Arial';
    ctx.textAlign = 'left';
    ctx.fillText('HP', px + 10, py + 43);

    // HP bar background
    ctx.fillStyle = '#1a1a2e';
    _rr(ctx, px + 26, py + 33, 140, 11, 3);
    ctx.fill();
    const hpPct = clamp(pw.hp / pw.maxHp, 0, 1);
    const hpCol = hpPct > 0.5 ? '#22dd55' : hpPct > 0.25 ? '#ffaa00' : '#ff3333';
    ctx.fillStyle = hpCol;
    _rr(ctx, px + 26, py + 33, 140 * hpPct, 11, 3);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = '8px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`${Math.ceil(pw.hp)} / ${pw.maxHp}`, px + 96, py + 42);

    // XP bar
    if (pw.level < 3) {
      ctx.fillStyle = '#aaa';
      ctx.font = '9px Arial';
      ctx.textAlign = 'left';
      ctx.fillText('XP', px + 10, py + 58);
      ctx.fillStyle = '#1a1a2e';
      _rr(ctx, px + 26, py + 49, 140, 7, 3);
      ctx.fill();
      const xpPct = pw.xp / pw.xpNeeded;
      ctx.fillStyle = '#6699ff';
      _rr(ctx, px + 26, py + 49, 140 * xpPct, 7, 3);
      ctx.fill();
    }

    // Item icons
    const items = [];
    if (pw.itemBonuses.speed)  items.push({ icon: '⚡', col: '#00ff99' });
    if (pw.itemBonuses.health) items.push({ icon: '❤', col: '#ff5555' });
    if (pw.itemBonuses.damage) items.push({ icon: '⚔', col: '#ffdd00' });
    ctx.font = '13px Arial';
    ctx.textAlign = 'left';
    items.forEach((it, i) => {
      ctx.fillStyle = it.col;
      ctx.fillText(it.icon, px + pw2 - 50 + i * 18, py + 55);
    });

    // ── Spell slots ──────────────────────────────────────────
    const spells = [
      { key: 'Q', label: 'Förmåga', ready: pw.abilityTimer <= 0,  timer: pw.abilityTimer,  max: pw.abilityCooldown, col: '#44ff88' },
      { key: 'E', label: 'Rush',    ready: pw.rushTimer <= 0,     timer: pw.rushTimer,     max: C.RUSH_COOLDOWN,    col: '#44ddff' },
      { key: 'R', label: 'Ultim',   ready: pw.ultimateTimer <= 0, timer: pw.ultimateTimer, max: pw.ultimateCooldown, col: '#ff5566' },
    ];
    const sw = 68, sh = 30, sgap = 3;
    spells.forEach((sp, i) => {
      const bx = px + 4 + i * (sw + sgap);
      const by = py + ph - sh - 6;

      // Slot bg
      ctx.fillStyle = sp.ready ? 'rgba(20,40,20,0.9)' : 'rgba(15,15,25,0.9)';
      _rr(ctx, bx, by, sw, sh, 5);
      ctx.fill();

      // Cooldown fill (empties left to right as it cools down)
      if (!sp.ready) {
        const pct = clamp(sp.timer / sp.max, 0, 1);
        ctx.fillStyle = 'rgba(0,0,0,0.55)';
        _rr(ctx, bx, by, sw * pct, sh, [5, 0, 0, 5]);
        ctx.fill();
      }

      // Border
      ctx.strokeStyle = sp.ready ? sp.col : '#444';
      ctx.lineWidth = 1.2;
      _rr(ctx, bx, by, sw, sh, 5);
      ctx.stroke();

      // Key badge
      ctx.fillStyle = sp.ready ? sp.col : '#555';
      _rr(ctx, bx + 3, by + 3, 14, 14, 3);
      ctx.fill();
      ctx.fillStyle = sp.ready ? '#000' : '#999';
      ctx.font = 'bold 8px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(sp.key, bx + 10, by + 13);

      // Label / timer
      ctx.fillStyle = sp.ready ? '#ddd' : '#777';
      ctx.font = sp.ready ? 'bold 8px Arial' : '8px Arial';
      ctx.textAlign = 'left';
      ctx.fillText(sp.ready ? sp.label : sp.timer.toFixed(1) + 's', bx + 20, by + 13);

      // Ready flash
      if (sp.ready) {
        ctx.fillStyle = sp.col;
        ctx.font = '7px Arial';
        ctx.fillText('REDO', bx + 20, by + 24);
      }
    });
  }

  _drawTimer(ctx, game) {
    const t   = game.globalTimer;
    const rem = Math.max(0, C.MEGA_TRIGGER_TIME - t);
    const mins = Math.floor(rem / 60);
    const secs = Math.floor(rem % 60);
    const label = rem > 0
      ? `☠ Mega Skelett: ${mins}:${String(secs).padStart(2, '0')}`
      : '☠ MEGA SKELETT!';
    const col = rem < 20 ? '#ff4444' : rem < 60 ? '#ffaa00' : '#ccccdd';

    // Panel
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    _rr(ctx, C.W / 2 - 106, 4, 212, 24, 6);
    ctx.fill();
    ctx.strokeStyle = col;
    ctx.lineWidth = 1;
    _rr(ctx, C.W / 2 - 106, 4, 212, 24, 6);
    ctx.stroke();

    ctx.fillStyle = col;
    ctx.font = 'bold 12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(label, C.W / 2, 20);
  }

  _drawAnnouncements(ctx, game) {
    for (const ann of game.announcements) {
      const alpha = clamp(ann.duration / ann.maxDuration, 0, 1);
      drawAnnouncement(ctx, ann.text, alpha);
    }
    game.announcements = game.announcements.filter(a => {
      a.duration -= 1 / 60;
      return a.duration > 0;
    });
  }

  _drawMegaWarning(ctx, game) {
    const t = game.globalTimer;
    if (t >= C.MEGA_TRIGGER_TIME - 10 && t < C.MEGA_TRIGGER_TIME) {
      const pulse = Math.abs(Math.sin(Date.now() / 180)) * 0.65 + 0.3;
      ctx.globalAlpha = pulse;
      ctx.fillStyle = '#ff2200';
      ctx.font = 'bold 22px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('⚠ MEGA SKELETT SNART! ⚠', C.W / 2, 50);
      ctx.globalAlpha = 1;
    }
  }

  _drawControls(ctx) {
    const px = C.W - 168, py = C.H - 134;
    const cw = 162, ch = 124;

    // Panel shadow + bg
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    _rr(ctx, px + 3, py + 3, cw, ch, 10);
    ctx.fill();
    ctx.fillStyle = 'rgba(8,8,22,0.82)';
    _rr(ctx, px, py, cw, ch, 10);
    ctx.fill();
    ctx.strokeStyle = 'rgba(80,80,130,0.6)';
    ctx.lineWidth = 1.2;
    _rr(ctx, px, py, cw, ch, 10);
    ctx.stroke();

    // Header
    ctx.fillStyle = 'rgba(80,80,130,0.25)';
    _rr(ctx, px, py, cw, 22, [10, 10, 0, 0]);
    ctx.fill();
    ctx.fillStyle = '#8888bb';
    ctx.font = 'bold 9px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('KONTROLLER', px + cw / 2, py + 14);

    const lines = [
      ['WASD', 'Rör dig'],
      ['Mus',  'Sikta'],
      ['Klick','Attackera'],
      ['Q',    'Speciell'],
      ['E',    'Rusa till nexus'],
      ['R',    'Ultimat'],
    ];
    lines.forEach(([key, desc], i) => {
      const lx = px + 8, ly = py + 32 + i * 15;
      ctx.fillStyle = '#6688cc';
      ctx.font = 'bold 8px Arial';
      ctx.textAlign = 'left';
      ctx.fillText(key, lx, ly);
      ctx.fillStyle = '#888';
      ctx.font = '8px Arial';
      ctx.fillText('– ' + desc, lx + 28, ly);
    });
  }
}
