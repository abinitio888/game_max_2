// ============================================================
//  VICTORY / DEFEAT SCREEN
// ============================================================
class VictoryScreen {
  constructor() {
    this.timer = 0;
    this.particles = [];
  }

  enter(winner) {
    this.winner = winner; // 'player' | 'enemy'
    this.timer  = 0;
    // Spawn celebratory burst
    for (let i = 0; i < 40; i++) {
      const x = Math.random() * C.W;
      const y = Math.random() * C.H;
      this.particles.push(...burst(x, y, winner === 'player' ? '#FFD700' : '#ff4444', 5));
    }
  }

  handleClick(mx, my, game) {
    if (this.timer < 1) return; // wait before allowing restart

    // Restart button
    if (mx >= C.W / 2 - 100 && mx <= C.W / 2 + 100 && my >= C.H / 2 + 100 && my <= C.H / 2 + 150) {
      game.resetToStart();
    }
  }

  update(dt) {
    this.timer += dt;
    this.particles = this.particles.filter(p => {
      p.update(dt);
      return p.life > 0;
    });
    // Respawn particles occasionally
    if (this.winner === 'player' && Math.random() < 0.15) {
      const x = Math.random() * C.W;
      this.particles.push(...burst(x, C.H, '#FFD700', 3));
    }
  }

  draw(ctx, game) {
    // Background
    ctx.fillStyle = 'rgba(0,0,0,0.82)';
    ctx.fillRect(0, 0, C.W, C.H);

    // Particles
    for (const p of this.particles) p.draw(ctx);

    const win = this.winner === 'player';

    ctx.textAlign = 'center';

    // Big result text
    ctx.shadowBlur  = 40;
    ctx.shadowColor = win ? '#FFD700' : '#ff0000';
    ctx.font = 'bold 72px Arial';
    ctx.fillStyle = win ? '#FFD700' : '#ff3333';
    ctx.fillText(win ? '🏆 SEGER!' : '💀 FÖRLUST!', C.W / 2, C.H / 2 - 60);
    ctx.shadowBlur = 0;

    ctx.fillStyle = '#ccc';
    ctx.font = '22px Arial';
    ctx.fillText(win ? 'Du förstörde fiendens nexus!' : 'Din nexus är förstörd!', C.W / 2, C.H / 2);

    // Stats
    ctx.fillStyle = '#aaa';
    ctx.font = '16px Arial';
    const mins = Math.floor(game.globalTimer / 60);
    const secs = Math.floor(game.globalTimer % 60);
    ctx.fillText(`Tid: ${mins}:${String(secs).padStart(2, '0')}`, C.W / 2, C.H / 2 + 40);

    // Restart button
    if (this.timer >= 1) {
      ctx.fillStyle = '#2244cc';
      ctx.strokeStyle = '#4477ff';
      ctx.lineWidth = 2;
      const bx = C.W / 2 - 100, by = C.H / 2 + 100;
      if (ctx.roundRect) ctx.roundRect(bx, by, 200, 50, 10);
      else ctx.rect(bx, by, 200, 50);
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 22px Arial';
      ctx.fillText('↩ Till start', C.W / 2, by + 33);
    }
  }
}
