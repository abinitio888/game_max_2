// ============================================================
//  SPAWN SYSTEM  –  handles skeleton waves + mega skeleton event
// ============================================================
class SpawnSystem {
  constructor() {
    this.megaTriggered = false;
    this.megaSpawned   = false;
    this.megaSkeleton  = null;
  }

  // Called by Tower.update when its spawn timer fires
  spawnSkeleton(tower, game) {
    if (tower.destroyed) return;

    // Pick quality randomly; best is rare
    const roll = Math.random();
    const quality = roll < 0.10 ? 'best' : roll < 0.35 ? 'good' : 'normal';

    // Spawn 1–3 skeletons
    const count = quality === 'normal' ? 1 + Math.floor(Math.random() * 2) : 1;

    for (let i = 0; i < count; i++) {
      const laneIdx = tower.laneIdx !== undefined ? tower.laneIdx : this._assignLane(tower);
      const lx = C.LANE_CENTERS[laneIdx] + (Math.random() - 0.5) * 20;
      const ly = tower.y + (tower.team === 'player' ? -tower.radius - 10 : tower.radius + 10);
      const sk = new Skeleton(lx, ly, tower.team, quality);
      game.entities.push(sk);
    }
  }

  _assignLane(tower) {
    // Assign skeleton tower to a lane based on its X position
    if (tower.x < 300) return 0;
    if (tower.x > 600) return 2;
    return 1;
  }

  update(dt, game) {
    // Check mega skeleton trigger
    if (!this.megaTriggered && game.globalTimer >= C.MEGA_TRIGGER_TIME) {
      this.megaTriggered = true;
      this._triggerMegaSkeleton(game);
    }

    // Update mega skeleton
    if (this.megaSkeleton && this.megaSkeleton.alive) {
      this.megaSkeleton.update(dt, game);
    }
  }

  _triggerMegaSkeleton(game) {
    game.announcements.push({
      text: '💀 MEGA SKELETT VAKNAR! 💀',
      duration: 3,
      maxDuration: 3,
    });

    const mega = new MegaSkeleton(C.W / 2, C.H / 2);
    this.megaSkeleton = mega;
    game.entities.push(mega);
    this.megaSpawned = true;
  }
}
