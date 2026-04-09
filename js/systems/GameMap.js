// ============================================================
//  GAME MAP  –  renders the static background
// ============================================================
class GameMap {
  constructor() {
    // Pre-render the static background once to an offscreen canvas
    this._cache = document.createElement('canvas');
    this._cache.width  = C.W;
    this._cache.height = C.H;
    this._buildCache(this._cache.getContext('2d'));
  }

  draw(ctx) {
    ctx.drawImage(this._cache, 0, 0);
  }

  _buildCache(ctx) {
    // Background
    ctx.fillStyle = C.BG_COLOR;
    ctx.fillRect(0, 0, C.W, C.H);

    // Lane ground strips
    for (let i = 0; i < 3; i++) {
      const x = C.LANE_LEFT[i];
      const w = C.LANE_RIGHT[i] - C.LANE_LEFT[i];
      ctx.fillStyle = C.LANE_COLOR;
      ctx.fillRect(x, 0, w, C.H);

      // Lane edge lines
      ctx.strokeStyle = '#3a3a5a';
      ctx.lineWidth = 1;
      ctx.strokeRect(x, 0, w, C.H);

      // Subtle lane dashes
      ctx.strokeStyle = '#33334a';
      ctx.setLineDash([12, 16]);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(C.LANE_CENTERS[i], 100);
      ctx.lineTo(C.LANE_CENTERS[i], 540);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Wall / separator strips
    for (const r of C.WALL_RECTS) {
      ctx.fillStyle = C.WALL_COLOR;
      ctx.fillRect(r.x, r.y, r.w, r.h);
      // Stone texture lines
      ctx.strokeStyle = '#0d0d20';
      ctx.lineWidth = 1;
      for (let y = 0; y < C.H; y += 30) {
        ctx.beginPath();
        ctx.moveTo(r.x, y);
        ctx.lineTo(r.x + r.w, y);
        ctx.stroke();
      }
    }

    // Player base zone
    ctx.fillStyle = C.BASE_P_COLOR;
    ctx.fillRect(0, 540, C.W, 100);
    ctx.fillStyle = 'rgba(0,80,200,0.15)';
    ctx.fillRect(0, 540, C.W, 100);

    // Enemy base zone
    ctx.fillStyle = C.BASE_E_COLOR;
    ctx.fillRect(0, 0, C.W, 100);
    ctx.fillStyle = 'rgba(200,0,0,0.15)';
    ctx.fillRect(0, 0, C.W, 100);

    // Boss zone marker
    ctx.strokeStyle = 'rgba(255,200,0,0.18)';
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 8]);
    ctx.beginPath();
    ctx.moveTo(80, C.BOSS_Y);
    ctx.lineTo(880, C.BOSS_Y);
    ctx.stroke();
    ctx.setLineDash([]);

    // Labels
    ctx.fillStyle = 'rgba(100,180,255,0.35)';
    ctx.font = '11px Arial';
    ctx.textAlign = 'left';
    ctx.fillText('SPELARE', 8, 630);
    ctx.fillStyle = 'rgba(255,100,100,0.35)';
    ctx.fillText('FIENDE', 8, 18);

    // Lane labels
    const laneNames = ['VÄNSTER', 'MITTEN', 'HÖGER'];
    const dropNames = ['[Hastighet]', '[Hälsa]', '[Skada]'];
    ctx.fillStyle = 'rgba(200,200,200,0.25)';
    ctx.font = '10px Arial';
    ctx.textAlign = 'center';
    for (let i = 0; i < 3; i++) {
      ctx.fillText(laneNames[i], C.LANE_CENTERS[i], 115);
      ctx.fillText(dropNames[i], C.LANE_CENTERS[i], C.BOSS_Y + 35);
    }
  }
}
