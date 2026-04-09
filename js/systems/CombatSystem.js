// ============================================================
//  COMBAT SYSTEM  –  cleans up dead entities, handles tower cascade
// ============================================================
class CombatSystem {
  update(game) {
    // Remove dead entities (keep for 1 frame then remove)
    game.entities = game.entities.filter(e => e.alive);

    // Check win conditions
    if (game.playerNexus && game.playerNexus.destroyed && game.state === 'PLAYING') {
      game.endGame('enemy');
    }
    if (game.enemyNexus && game.enemyNexus.destroyed && game.state === 'PLAYING') {
      game.endGame('player');
    }
  }
}
