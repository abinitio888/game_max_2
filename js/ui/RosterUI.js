// ============================================================
//  ROSTER UI  –  shown when wizard dies, pick next
// ============================================================
class RosterUI {
  constructor() {
    this.selectedIdx = -1;
  }

  handleClick(mx, my, game) {
    const roster = game.gacha.getRoster();
    const usedIds = game.usedWizardIds || new Set();
    const available = roster.filter(w => !usedIds.has(w.id));

    const cols = 4;
    const cardW = 100, cardH = 140, gap = 12;
    const totalW = cols * (cardW + gap) - gap;
    const startX = C.W / 2 - totalW / 2;
    const startY = 180;

    for (let i = 0; i < available.length; i++) {
      const col = i % cols, row = Math.floor(i / cols);
      const cx = startX + col * (cardW + gap);
      const cy = startY + row * (cardH + gap);

      // × delete button (top-right corner of card)
      const delX = cx + cardW - 10, delY = cy + 10;
      if (Math.hypot(mx - delX, my - delY) < 10) {
        game.gacha.removeFromRoster(available[i].id);
        if (this.selectedIdx >= available.length - 1) this.selectedIdx = -1;
        return;
      }

      if (mx >= cx && mx <= cx + cardW && my >= cy && my <= cy + cardH) {
        this.selectedIdx = i;
        return;
      }
    }

    // Confirm button
    if (this.selectedIdx >= 0) {
      const confX = C.W / 2 - 70, confY = C.H - 80;
      if (mx >= confX && mx <= confX + 140 && my >= confY && my <= confY + 40) {
        const wData = available[this.selectedIdx];
        game.deployPlayerWizard(wData);
        this.selectedIdx = -1;
      }
    }
  }

  draw(ctx, game) {
    // Dim background
    ctx.fillStyle = 'rgba(0,0,0,0.75)';
    ctx.fillRect(0, 0, C.W, C.H);

    ctx.fillStyle = '#fff';
    ctx.font = 'bold 28px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Välj nästa trollkarl', C.W / 2, 80);

    const roster = game.gacha.getRoster();
    const usedIds = game.usedWizardIds || new Set();
    const available = roster.filter(w => !usedIds.has(w.id));

    if (available.length === 0) {
      ctx.fillStyle = '#ff4444';
      ctx.font = '22px Arial';
      ctx.fillText('Inga fler trollkarlar! Du förlorar...', C.W / 2, C.H / 2);
      setTimeout(() => game.endGame('enemy'), 2000);
      return;
    }

    const cols = 4;
    const cardW = 100, cardH = 140, gap = 12;
    const totalW = cols * (cardW + gap) - gap;
    const startX = C.W / 2 - totalW / 2;
    const startY = 180;

    ctx.fillStyle = '#aaa';
    ctx.font = '14px Arial';
    ctx.fillText(`Tillgängliga: ${available.length}`, C.W / 2, 130);

    for (let i = 0; i < available.length; i++) {
      const col = i % cols, row = Math.floor(i / cols);
      const cx = startX + col * (cardW + gap);
      const cy = startY + row * (cardH + gap);
      const wd = available[i];
      const tw = WIZARD_TYPES[wd.type];
      const sel = (i === this.selectedIdx);

      ctx.fillStyle = sel ? '#1a1a4e' : '#1a1a2e';
      ctx.strokeStyle = sel ? '#ffdd00' : tw.color;
      ctx.lineWidth = sel ? 3 : 1.5;
      if (ctx.roundRect) ctx.roundRect(cx, cy, cardW, cardH, 8);
      else ctx.rect(cx, cy, cardW, cardH);
      ctx.fill(); ctx.stroke();

      // Wizard circle
      ctx.shadowBlur  = 10;
      ctx.shadowColor = tw.glowColor;
      ctx.fillStyle   = tw.color;
      ctx.beginPath();
      ctx.arc(cx + cardW / 2, cy + 44, 22, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Stars
      for (let s = 0; s < wd.stars; s++) {
        drawStar(ctx, cx + cardW / 2 - (wd.stars - 1) * 7 + s * 14, cy + 78, 6, '#FFD700');
      }

      // Name
      ctx.fillStyle = '#ddd';
      ctx.font = '9px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(tw.name, cx + cardW / 2, cy + 100);
      ctx.fillText(`Lv ${wd.level || 1}`, cx + cardW / 2, cy + 114);

      // × delete button
      const delX = cx + cardW - 10, delY = cy + 10;
      ctx.fillStyle = '#cc2222';
      ctx.beginPath();
      ctx.arc(delX, delY, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 11px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('×', delX, delY);
      ctx.textBaseline = 'alphabetic';
    }

    // Confirm button
    if (this.selectedIdx >= 0) {
      const confX = C.W / 2 - 70, confY = C.H - 80;
      ctx.fillStyle = '#2244cc';
      ctx.strokeStyle = '#4477ff';
      ctx.lineWidth = 2;
      if (ctx.roundRect) ctx.roundRect(confX, confY, 140, 40, 8);
      else ctx.rect(confX, confY, 140, 40);
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 16px Arial';
      ctx.fillText('Sänd ut!', C.W / 2, confY + 26);
    }
  }
}
