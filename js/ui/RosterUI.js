// ============================================================
//  ROSTER UI  –  shown when wizard dies, pick next
// ============================================================
class RosterUI {
  constructor() {
    this.selectedIdx = -1;
    // minStars: 0 = alla, 1, 2, or 3
    this.minStars = parseInt(localStorage.getItem('rosterMinStars') || '0', 10);
  }

  _setMinStars(n) {
    this.minStars = n;
    localStorage.setItem('rosterMinStars', String(n));
    this.selectedIdx = -1;
  }

  handleClick(mx, my, game) {
    // Star filter buttons (top of screen)
    const filters = [0, 1, 2, 3];
    const labels  = ['Alla', '★', '★★', '★★★'];
    const fw = 70, fh = 28, fgap = 8;
    const ftotalW = filters.length * fw + (filters.length - 1) * fgap;
    const fx0 = C.W / 2 - ftotalW / 2;
    const fy  = 92;
    for (let f = 0; f < filters.length; f++) {
      const bx = fx0 + f * (fw + fgap);
      if (mx >= bx && mx <= bx + fw && my >= fy && my <= fy + fh) {
        this._setMinStars(filters[f]);
        return;
      }
    }

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
        const wd = available[i];
        const refund = wd.stars === 3 ? 70 : wd.stars === 2 ? 50 : 30;
        game.gacha.removeFromRoster(wd.id);
        game.gacha.earnGold(refund);
        game.announcements.push({ text: `+${refund} 💰 återbetalning`, duration: 1.5, maxDuration: 1.5 });
        if (this.selectedIdx >= available.length - 1) this.selectedIdx = -1;
        return;
      }

      // Only selectable if meets star filter
      if (mx >= cx && mx <= cx + cardW && my >= cy && my <= cy + cardH) {
        if (available[i].stars >= (this.minStars || 1)) {
          this.selectedIdx = i;
        }
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
    ctx.fillText('Välj nästa trollkarl', C.W / 2, 72);

    // ── Star filter buttons ──────────────────────────────
    const filters = [0, 1, 2, 3];
    const labels  = ['Alla', '1★+', '2★+', '3★'];
    const fw = 70, fh = 28, fgap = 8;
    const ftotalW = filters.length * fw + (filters.length - 1) * fgap;
    const fx0 = C.W / 2 - ftotalW / 2;
    const fy  = 92;

    ctx.font = '11px Arial';
    ctx.fillStyle = '#888';
    ctx.fillText('Visa bara:', fx0 - 44, fy + 18);

    for (let f = 0; f < filters.length; f++) {
      const bx = fx0 + f * (fw + fgap);
      const active = this.minStars === filters[f];
      ctx.fillStyle = active ? '#ffdd00' : '#222';
      ctx.strokeStyle = active ? '#ffdd00' : '#555';
      ctx.lineWidth = 1.5;
      if (ctx.roundRect) ctx.roundRect(bx, fy, fw, fh, 6);
      else ctx.rect(bx, fy, fw, fh);
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = active ? '#000' : '#aaa';
      ctx.font = active ? 'bold 11px Arial' : '11px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(labels[f], bx + fw / 2, fy + 18);
    }

    const roster = game.gacha.getRoster();
    const usedIds = game.usedWizardIds || new Set();
    const available = roster.filter(w => !usedIds.has(w.id));
    const deployable = available.filter(w => w.stars >= (this.minStars || 1));

    if (available.length === 0) {
      ctx.fillStyle = '#ff4444';
      ctx.font = '22px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('Inga fler trollkarlar! Du förlorar...', C.W / 2, C.H / 2);
      setTimeout(() => game.endGame('enemy'), 2000);
      return;
    }

    if (deployable.length === 0) {
      ctx.fillStyle = '#ffaa00';
      ctx.font = '16px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('Inga trollkarlar matchar filtret — ändra filtret ovan', C.W / 2, C.H / 2);
      return;
    }

    const cols = 4;
    const cardW = 100, cardH = 140, gap = 12;
    const totalW = cols * (cardW + gap) - gap;
    const startX = C.W / 2 - totalW / 2;
    const startY = 180;

    ctx.fillStyle = '#aaa';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`Tillgängliga: ${available.length}  |  Matchar filter: ${deployable.length}`, C.W / 2, 142);

    for (let i = 0; i < available.length; i++) {
      const col = i % cols, row = Math.floor(i / cols);
      const cx = startX + col * (cardW + gap);
      const cy = startY + row * (cardH + gap);
      const wd = available[i];
      const tw = WIZARD_TYPES[wd.type];
      const sel    = (i === this.selectedIdx);
      const locked = wd.stars < (this.minStars || 1);

      ctx.globalAlpha = locked ? 0.35 : 1;
      ctx.fillStyle = sel ? '#1a1a4e' : '#1a1a2e';
      ctx.strokeStyle = sel ? '#ffdd00' : (locked ? '#444' : tw.color);
      ctx.lineWidth = sel ? 3 : 1.5;
      if (ctx.roundRect) ctx.roundRect(cx, cy, cardW, cardH, 8);
      else ctx.rect(cx, cy, cardW, cardH);
      ctx.fill(); ctx.stroke();

      // Wizard sprite (grayed if locked)
      if (locked) {
        ctx.fillStyle = '#444';
        ctx.beginPath();
        ctx.arc(cx + cardW / 2, cy + 44, 22, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#888';
        ctx.font = '18px Arial';
        ctx.textBaseline = 'middle';
        ctx.textAlign = 'center';
        ctx.fillText('🔒', cx + cardW / 2, cy + 44);
        ctx.textBaseline = 'alphabetic';
      } else {
        drawWizardSprite(ctx, cx + cardW / 2, cy + 44, tw.color, tw.glowColor, -Math.PI / 2, 18);
      }

      // Stars
      for (let s = 0; s < wd.stars; s++) {
        drawStar(ctx, cx + cardW / 2 - (wd.stars - 1) * 7 + s * 14, cy + 78, 6,
          locked ? '#666' : '#FFD700');
      }

      // Name
      ctx.fillStyle = locked ? '#666' : '#ddd';
      ctx.font = '9px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(tw.name, cx + cardW / 2, cy + 100);
      ctx.fillText(`Lv ${wd.level || 1}`, cx + cardW / 2, cy + 114);

      ctx.globalAlpha = 1;

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
      ctx.textAlign = 'center';
      ctx.fillText('Sänd ut!', C.W / 2, confY + 26);
    }
  }
}
