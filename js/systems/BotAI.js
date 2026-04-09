// ============================================================
//  BOT AI  –  controls enemy wizard
// ============================================================
class BotAI {
  constructor() {
    this.decisionTimer = 0;
  }

  update(dt, game) {
    const ew = game.enemyWizard;
    if (!ew || !ew.alive) {
      // Respawn enemy wizard if timer expired
      if (game.enemyRespawnTimer > 0) {
        game.enemyRespawnTimer -= dt;
        if (game.enemyRespawnTimer <= 0) {
          game.spawnEnemyWizard();
        }
      }
      return;
    }

    this.decisionTimer -= dt;
    if (this.decisionTimer <= 0) {
      this.decisionTimer = C.BOT_DECISION_INTERVAL + Math.random();
      this._makeLaneDecision(game);
      this._checkStateTransition(game);
    }

    ew.update(dt, null, game);
  }

  _makeLaneDecision(game) {
    const ew = game.enemyWizard;
    if (!ew || !ew.alive) return;

    const scores = [0, 0, 0];
    for (let i = 0; i < 3; i++) {
      const lx = C.LANE_CENTERS[i];
      // Threat: if player wizard is in this lane
      if (game.playerWizard && game.playerWizard.alive) {
        const pl = game.playerWizard;
        if (Math.abs(pl.x - lx) < 100) scores[i] -= 15;
      }
      // Skeletons in lane on enemy side (already pushing) — less priority
      const allySk = game.entities.filter(e => e.alive && e.type === 'skeleton' && e.team === 'enemy' && Math.abs(e.x - lx) < 100);
      scores[i] -= allySk.length * 3;
      // Boss alive in lane (enemy tries to help or avoid)
      const boss = game.bosses ? game.bosses.find(b => b.laneIdx === i && b.alive) : null;
      if (boss) scores[i] += 8;
      // Player tower health in lane
      const pTower = game.towers.find(t => t.team === 'player' && !t.destroyed && Math.abs(t.x - lx) < 120);
      if (pTower) scores[i] += (1 - pTower.hp / pTower.maxHp) * 20;
    }

    const best = scores.indexOf(Math.max(...scores));
    ew.aiLane  = best;
  }

  _checkStateTransition(game) {
    const ew = game.enemyWizard;
    if (!ew || !ew.alive) return;

    const hpPct = ew.hp / ew.maxHp;
    const nexus  = game.playerNexus;

    if (hpPct < 0.30) {
      ew.aiState = 'retreat';
    } else if (nexus && !nexus.destroyed && nexus.hp < 200 && ew.rushTimer <= 0) {
      // Rush nexus!
      ew.isRushing  = true;
      ew.rushTarget = { x: nexus.x, y: nexus.y };
      ew.rushTimer  = C.RUSH_COOLDOWN;
      WIZARD_TYPES[ew.wizardType].rushEffect(ew, game);
      ew.aiState = 'rush';
    } else if (hpPct > 0.55) {
      ew.aiState = 'push';
    }
  }
}
