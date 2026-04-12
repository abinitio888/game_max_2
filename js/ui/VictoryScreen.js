// ============================================================
//  VICTORY / DEFEAT SCREEN
// ============================================================
class VictoryScreen {
  constructor() {
    this.timer = 0;
    this.particles = [];
    this._phase = 0;
  }

  enter(winner) {
    this.winner = winner; // 'player' | 'enemy'
    this.timer  = 0;
    this._phase = 0;
    this.particles = [];
    // Initial burst
    for (let i = 0; i < 60; i++) {
      const x = Math.random() * C.W;
      const y = Math.random() * C.H;
      this.particles.push(...burst(x, y, winner === 'player' ? '#FFD700' : '#ff4444', 6));
    }
  }

  handleClick(mx, my, game) {
    if (this.timer < 1) return;
    const bx = C.W / 2 - 110, by = C.H / 2 + 90;
    if (mx >= bx && mx <= bx + 220 && my >= by && my <= by + 52) {
      game.resetToStart();
    }
  }

  update(dt) {
    this.timer += dt;
    this._phase = Math.min(1, this.timer / 0.8); // fade-in over 0.8s
    this.particles = this.particles.filter(p => {
      p.update(dt);
      return p.life > 0;
    });
    // Continuous particles for winner
    if (this.winner === 'player' && Math.random() < 0.2) {
      const x = Math.random() * C.W;
      this.particles.push(...burst(x, C.H + 10, '#FFD700', 3));
    }
    if (this.winner === 'enemy' && Math.random() < 0.08) {
      const x = Math.random() * C.W;
      const y = Math.random() * C.H;
      this.particles.push(...burst(x, y, '#440000', 2));
    }
  }

  draw(ctx, game) {
    const win   = this.winner === 'player';
    const phase = this._phase;
    const t     = this.timer;

    // ── Dark overlay ──────────────────────────────────────────
    ctx.fillStyle = win
      ? `rgba(0,0,8,${0.78 * phase})`
      : `rgba(8,0,0,${0.84 * phase})`;
    ctx.fillRect(0, 0, C.W, C.H);

    // ── Vignette ─────────────────────────────────────────────
    const vig = ctx.createRadialGradient(C.W/2, C.H/2, 60, C.W/2, C.H/2, C.H * 0.75);
    vig.addColorStop(0, 'rgba(0,0,0,0)');
    vig.addColorStop(1, win ? 'rgba(0,0,0,0.6)' : 'rgba(60,0,0,0.7)');
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, C.W, C.H);

    // ── Particles ────────────────────────────────────────────
    for (const p of this.particles) p.draw(ctx);

    ctx.globalAlpha = phase;

    // ── Center panel ─────────────────────────────────────────
    const panW = 420, panH = 300;
    const panX = C.W / 2 - panW / 2;
    const panY = C.H / 2 - panH / 2 - 20;

    // Panel shadow
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(panX + 5, panY + 5, panW, panH, 18);
    else ctx.rect(panX + 5, panY + 5, panW, panH);
    ctx.fill();

    // Panel body
    ctx.fillStyle = win ? 'rgba(5,12,30,0.95)' : 'rgba(18,4,4,0.95)';
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(panX, panY, panW, panH, 18);
    else ctx.rect(panX, panY, panW, panH);
    ctx.fill();

    // Panel border
    const borderCol = win ? '#aa8800' : '#880000';
    ctx.strokeStyle = borderCol;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(panX, panY, panW, panH, 18);
    else ctx.rect(panX, panY, panW, panH);
    ctx.stroke();

    // Top accent bar
    ctx.fillStyle = win ? 'rgba(255,200,0,0.12)' : 'rgba(255,50,0,0.12)';
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(panX, panY, panW, 50, [18, 18, 0, 0]);
    else ctx.rect(panX, panY, panW, 50);
    ctx.fill();

    // Decorative corner ornaments
    const oc = win ? '#886600' : '#660000';
    for (const [ox, oy] of [[panX + 18, panY + 18], [panX + panW - 18, panY + 18],
                             [panX + 18, panY + panH - 18], [panX + panW - 18, panY + panH - 18]]) {
      ctx.strokeStyle = oc;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(ox, oy, 8, 0, Math.PI * 2);
      ctx.stroke();
    }

    // ── Result icon + text ────────────────────────────────────
    ctx.textAlign = 'center';

    // Animated glow behind title
    const glowPulse = Math.abs(Math.sin(t * 2.2)) * 0.5 + 0.5;
    ctx.shadowBlur   = 40 + glowPulse * 20;
    ctx.shadowColor  = win ? '#ffcc00' : '#ff2200';

    ctx.font  = 'bold 58px Arial';
    ctx.fillStyle = win ? '#FFD700' : '#ff4444';
    ctx.fillText(win ? '🏆 SEGER!' : '💀 FÖRLUST!', C.W / 2, panY + 52);
    ctx.shadowBlur = 0;

    // Subtitle
    ctx.fillStyle = win ? '#ddeeff' : '#ffcccc';
    ctx.font = '18px Arial';
    ctx.fillText(
      win ? 'Du krossade fiendens nexus!' : 'Din nexus har förstörts!',
      C.W / 2, panY + 90
    );

    // Divider line
    ctx.strokeStyle = win ? 'rgba(200,160,0,0.4)' : 'rgba(200,50,0,0.4)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(panX + 30, panY + 108);
    ctx.lineTo(panX + panW - 30, panY + 108);
    ctx.stroke();

    // ── Stats ────────────────────────────────────────────────
    const mins = Math.floor(game.globalTimer / 60);
    const secs = Math.floor(game.globalTimer % 60);
    const timeStr = `${mins}:${String(secs).padStart(2, '0')}`;

    const statY = panY + 142;
    const stats = [
      { label: 'Tid:', value: timeStr },
    ];
    // Add XP and gold if available
    if (game.playerWizard) {
      stats.push({ label: 'Nivå:', value: `${game.playerWizard.level}` });
    }

    ctx.font = '15px Arial';
    stats.forEach((s, i) => {
      const sx = C.W / 2 - 60 + i * 130;
      // Stat box
      ctx.fillStyle = 'rgba(255,255,255,0.05)';
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(sx - 50, statY - 20, 100, 44, 8);
      else ctx.rect(sx - 50, statY - 20, 100, 44);
      ctx.fill();
      ctx.fillStyle = win ? '#aabb88' : '#bb9988';
      ctx.fillText(s.label, sx, statY);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 18px Arial';
      ctx.fillText(s.value, sx, statY + 20);
      ctx.font = '15px Arial';
    });

    // ── Restart button ────────────────────────────────────────
    if (this.timer >= 1) {
      const bx = C.W / 2 - 110, by = panY + panH - 68;
      const bw = 220, bh = 50;

      // Button shadow
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(bx + 3, by + 3, bw, bh, 10);
      else ctx.rect(bx + 3, by + 3, bw, bh);
      ctx.fill();

      // Button body
      ctx.fillStyle = win ? '#162460' : '#360808';
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(bx, by, bw, bh, 10);
      else ctx.rect(bx, by, bw, bh);
      ctx.fill();

      // Button highlight
      ctx.fillStyle = win ? 'rgba(80,140,255,0.18)' : 'rgba(200,60,60,0.18)';
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(bx, by, bw, bh / 2, [10, 10, 0, 0]);
      else ctx.rect(bx, by, bw, bh / 2);
      ctx.fill();

      // Button border
      ctx.strokeStyle = win ? '#4477ff' : '#cc3333';
      ctx.lineWidth = 2;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(bx, by, bw, bh, 10);
      else ctx.rect(bx, by, bw, bh);
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 18px Arial';
      ctx.fillText('↩  Till startsidan', C.W / 2, by + 31);
    }

    ctx.globalAlpha = 1;
  }
}
