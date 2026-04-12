// ============================================================
//  GAME MAP  –  renders the static background
// ============================================================
class GameMap {
  constructor() {
    this._cache = document.createElement('canvas');
    this._cache.width  = C.W;
    this._cache.height = C.H;
    this._buildCache(this._cache.getContext('2d'));
  }

  draw(ctx) {
    ctx.drawImage(this._cache, 0, 0);
  }

  _buildCache(ctx) {
    // ── Deep space background gradient ───────────────────────
    const bg = ctx.createLinearGradient(0, 0, 0, C.H);
    bg.addColorStop(0,   '#0a0010');
    bg.addColorStop(0.15,'#100820');
    bg.addColorStop(0.5, '#0e0e1e');
    bg.addColorStop(0.85,'#080c20');
    bg.addColorStop(1,   '#040818');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, C.W, C.H);

    // Subtle noise dots (stars in background)
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    for (let i = 0; i < 120; i++) {
      const px = ((i * 173 + 37) % C.W);
      const py = ((i * 113 + 59) % C.H);
      const pr = (i % 4 === 0) ? 1.2 : 0.7;
      ctx.beginPath();
      ctx.arc(px, py, pr, 0, Math.PI * 2);
      ctx.fill();
    }

    // ── Lane ground strips ───────────────────────────────────
    for (let i = 0; i < 3; i++) {
      const lx = C.LANE_LEFT[i];
      const lw = C.LANE_RIGHT[i] - C.LANE_LEFT[i];

      // Lane fill gradient (center slightly brighter)
      const lg = ctx.createLinearGradient(lx, 0, lx + lw, 0);
      lg.addColorStop(0,   'rgba(40,40,65,0.85)');
      lg.addColorStop(0.5, 'rgba(50,50,80,0.92)');
      lg.addColorStop(1,   'rgba(40,40,65,0.85)');
      ctx.fillStyle = lg;
      ctx.fillRect(lx, 0, lw, C.H);

      // Cobblestone row lines
      ctx.strokeStyle = 'rgba(30,30,50,0.6)';
      ctx.lineWidth = 1;
      for (let ry = 40; ry < C.H; ry += 32) {
        ctx.beginPath();
        ctx.moveTo(lx, ry);
        ctx.lineTo(lx + lw, ry);
        ctx.stroke();
      }
      // Cobblestone column lines (offset every other row)
      for (let ry = 40; ry < C.H; ry += 32) {
        const offset = ((ry / 32) % 2) * (lw / 4);
        for (let rx = lx + offset; rx < lx + lw; rx += lw / 2) {
          ctx.beginPath();
          ctx.moveTo(rx, ry);
          ctx.lineTo(rx, ry + 32);
          ctx.stroke();
        }
      }

      // Lane border glow lines
      ctx.strokeStyle = 'rgba(80,80,140,0.4)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(lx, 0); ctx.lineTo(lx, C.H);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(lx + lw, 0); ctx.lineTo(lx + lw, C.H);
      ctx.stroke();

      // Centre dash line
      ctx.strokeStyle = 'rgba(80,80,120,0.28)';
      ctx.setLineDash([14, 18]);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(C.LANE_CENTERS[i], 120);
      ctx.lineTo(C.LANE_CENTERS[i], 520);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // ── Between-lane dark strips ─────────────────────────────
    // Left gap
    ctx.fillStyle = '#07070f';
    ctx.fillRect(0, 0, C.LANE_LEFT[0], C.H);
    // Middle-left gap
    ctx.fillRect(C.LANE_RIGHT[0], 0, C.LANE_LEFT[1] - C.LANE_RIGHT[0], C.H);
    // Middle-right gap
    ctx.fillRect(C.LANE_RIGHT[1], 0, C.LANE_LEFT[2] - C.LANE_RIGHT[1], C.H);
    // Right gap
    ctx.fillRect(C.LANE_RIGHT[2], 0, C.W - C.LANE_RIGHT[2], C.H);

    // ── Player base zone ─────────────────────────────────────
    const pbg = ctx.createLinearGradient(0, 530, 0, C.H);
    pbg.addColorStop(0, 'rgba(0,40,120,0)');
    pbg.addColorStop(1, 'rgba(0,50,150,0.55)');
    ctx.fillStyle = pbg;
    ctx.fillRect(0, 530, C.W, C.H - 530);

    // Player base top border glow
    ctx.strokeStyle = 'rgba(60,130,255,0.5)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, 530); ctx.lineTo(C.W, 530);
    ctx.stroke();

    // ── Enemy base zone ──────────────────────────────────────
    const ebg = ctx.createLinearGradient(0, 0, 0, 110);
    ebg.addColorStop(0, 'rgba(150,10,10,0.55)');
    ebg.addColorStop(1, 'rgba(120,0,0,0)');
    ctx.fillStyle = ebg;
    ctx.fillRect(0, 0, C.W, 110);

    // Enemy base bottom border glow
    ctx.strokeStyle = 'rgba(220,50,50,0.5)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, 110); ctx.lineTo(C.W, 110);
    ctx.stroke();

    // ── Boss zone marker ─────────────────────────────────────
    ctx.strokeStyle = 'rgba(220,170,0,0.22)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([10, 12]);
    ctx.beginPath();
    ctx.moveTo(60, C.BOSS_Y); ctx.lineTo(C.W - 60, C.BOSS_Y);
    ctx.stroke();
    ctx.setLineDash([]);
    // Boss zone skull icons
    ctx.fillStyle = 'rgba(220,170,0,0.22)';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('☠', 48, C.BOSS_Y + 4);
    ctx.fillText('☠', C.W - 48, C.BOSS_Y + 4);

    // ── Zone labels ──────────────────────────────────────────
    ctx.font = 'bold 10px Arial';
    ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(100,160,255,0.4)';
    ctx.fillText('▲ SPELARE', 8, C.H - 8);
    ctx.fillStyle = 'rgba(255,90,90,0.4)';
    ctx.fillText('▼ FIENDE', 8, 14);

    // Lane names
    const laneNames = ['VÄNSTER', 'MITTEN', 'HÖGER'];
    const dropIcons  = ['⚡', '❤', '⚔'];
    for (let i = 0; i < 3; i++) {
      ctx.fillStyle = 'rgba(180,180,220,0.22)';
      ctx.font = 'bold 9px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(laneNames[i], C.LANE_CENTERS[i], 122);
      ctx.font = '11px Arial';
      ctx.fillText(dropIcons[i], C.LANE_CENTERS[i], C.BOSS_Y + 22);
    }
  }
}
