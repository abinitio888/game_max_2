// ============================================================
//  ADVENTURE SCREEN  –  boss selection
// ============================================================
const ADV_BOSS_BONUS_LABEL = { speed: 'Hastighet', health: 'Hälsa', damage: 'Skada' };
const ADV_BOSS_BONUS_ICON  = { speed: '⚡', health: '❤', damage: '⚔' };

class AdventureScreen {
  constructor(adventureSys) {
    this.advSys = adventureSys;
  }

  handleClick(mx, my, game) {
    // Back button
    if (mx >= 20 && mx <= 140 && my >= 16 && my <= 46) {
      game.state = 'START_SCREEN';
      return;
    }

    // Boss cards – 3 cards centered
    for (let i = 0; i < 3; i++) {
      const { cx, cy, bw, bh } = this._cardBounds(i);
      if (mx >= cx - bw / 2 && mx <= cx + bw / 2 &&
          my >= cy - bh / 2 && my <= cy + bh / 2) {
        game.startAdventureBattle(i);
        return;
      }
    }
  }

  draw(ctx, game) {
    // Background
    ctx.fillStyle = '#07071a';
    ctx.fillRect(0, 0, C.W, C.H);

    // Faint star field
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    for (let i = 0; i < 60; i++) {
      ctx.beginPath();
      ctx.arc((i * 157 + 30) % C.W, (i * 89 + 20) % C.H, i % 3 === 0 ? 1.5 : 1, 0, Math.PI * 2);
      ctx.fill();
    }

    // Title
    ctx.fillStyle = '#ffdd44';
    ctx.font = 'bold 44px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('⚔ ÄVENTYR', C.W / 2, 72);

    ctx.fillStyle = '#aaaacc';
    ctx.font = '14px Arial';
    ctx.fillText('Döda en boss och tjäna en permanent bonus (+33% per seger)', C.W / 2, 102);

    // Current bonuses summary
    const adv = this.advSys.bonuses;
    const parts = [];
    if (adv.damage) parts.push(`⚔ Skada +${adv.damage * 33}%`);
    if (adv.health) parts.push(`❤ Hälsa +${adv.health * 33}%`);
    if (adv.speed)  parts.push(`⚡ Hastighet +${adv.speed * 33}%`);
    ctx.fillStyle = '#44ff88';
    ctx.font = 'bold 12px Arial';
    ctx.fillText(parts.length ? `Dina bonusar: ${parts.join('  ')}` : 'Inga bonusar ännu — vinn en match!', C.W / 2, 126);

    // Boss cards
    for (let i = 0; i < 3; i++) this._drawBossCard(ctx, i);

    // Back button
    ctx.fillStyle = '#1a1a2e';
    ctx.strokeStyle = '#555';
    ctx.lineWidth = 1;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(20, 16, 120, 30, 6);
    else ctx.rect(20, 16, 120, 30);
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#aaa';
    ctx.font = '12px Arial';
    ctx.textAlign = 'left';
    ctx.fillText('← Tillbaka', 32, 36);
  }

  _cardBounds(i) {
    const bw = 220, bh = 300;
    const gap = 40;
    const totalW = 3 * bw + 2 * gap;
    const cx = C.W / 2 - totalW / 2 + bw / 2 + i * (bw + gap);
    const cy = C.H / 2 + 30;
    return { cx, cy, bw, bh };
  }

  _drawBossCard(ctx, i) {
    const { cx, cy, bw, bh } = this._cardBounds(i);
    const color = BOSS_COLORS[i];
    const drop  = BOSS_DROPS[i];
    const count = this.advSys.bonuses[drop] || 0;
    const pct   = count * 33;

    // Card background
    ctx.fillStyle = '#10101f';
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(cx - bw / 2, cy - bh / 2, bw, bh, 14);
    else ctx.rect(cx - bw / 2, cy - bh / 2, bw, bh);
    ctx.fill(); ctx.stroke();

    // Boss glow
    ctx.globalAlpha = 0.2;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(cx, cy - 75, 48, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    // Boss body
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(cx, cy - 75, 36, 0, Math.PI * 2);
    ctx.fill();

    // Horns
    ctx.fillStyle = '#222';
    ctx.beginPath();
    ctx.moveTo(cx - 14, cy - 111);
    ctx.lineTo(cx - 7,  cy - 127);
    ctx.lineTo(cx,      cy - 111);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cx,      cy - 111);
    ctx.lineTo(cx + 7,  cy - 127);
    ctx.lineTo(cx + 14, cy - 111);
    ctx.fill();

    // Eyes
    ctx.fillStyle = '#ff0';
    ctx.beginPath();
    ctx.arc(cx - 10, cy - 80, 5, 0, Math.PI * 2);
    ctx.arc(cx + 10, cy - 80, 5, 0, Math.PI * 2);
    ctx.fill();

    // Boss name
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(BOSS_NAMES[i], cx, cy - 22);

    // Bonus type
    ctx.font = '26px Arial';
    ctx.fillText(ADV_BOSS_BONUS_ICON[drop], cx, cy + 16);
    ctx.fillStyle = '#ccc';
    ctx.font = '12px Arial';
    ctx.fillText(`+33% ${ADV_BOSS_BONUS_LABEL[drop]} per seger`, cx, cy + 36);

    // Current bonus
    if (pct > 0) {
      ctx.fillStyle = '#44ff88';
      ctx.font = 'bold 15px Arial';
      ctx.fillText(`Nuvarande bonus: +${pct}%`, cx, cy + 62);
      ctx.fillStyle = '#888';
      ctx.font = '10px Arial';
      ctx.fillText(`Dödad ${count} gång${count > 1 ? 'er' : ''}`, cx, cy + 78);
    } else {
      ctx.fillStyle = '#666';
      ctx.font = '11px Arial';
      ctx.fillText('Ingen bonus ännu', cx, cy + 62);
    }

    // Challenge button
    ctx.fillStyle = color;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(cx - 80, cy + 100, 160, 40, 8);
    else ctx.rect(cx - 80, cy + 100, 160, 40);
    ctx.fill();
    ctx.fillStyle = '#000';
    ctx.font = 'bold 15px Arial';
    ctx.fillText('⚔ Utmana', cx, cy + 125);
  }
}
