// ============================================================
//  COLLISION SYSTEM
// ============================================================
class CollisionSystem {
  update(game) {
    const projectiles = game.entities.filter(e => e.alive && e.type === 'projectile');
    const hittable    = [
      ...game.entities.filter(e =>
        e.alive && e.hp !== undefined &&
        e.type !== 'projectile' && e.type !== 'aoe' &&
        e.type !== 'slow_zone' && e.type !== 'lightning' &&
        e.type !== 'black_hole' && e.type !== 'void_portal' &&
        e.type !== 'shadow_clone'
      ),
      ...game.towers.filter(t => !t.destroyed),
    ];

    for (const proj of projectiles) {
      for (const target of hittable) {
        if (proj.team === target.team) continue;
        if (proj.hitSet && proj.hitSet.has(target)) continue;
        if (circlesOverlap(proj.x, proj.y, proj.radius, target.x, target.y, target.radius || 14)) {
          // Apply special effects based on projectile type
          this._applyProjEffect(proj, target, game);
          target.takeDamage(proj.damage, game);
          if (proj.pierce && proj.hitSet) {
            proj.hitSet.add(target);
          } else {
            proj.alive = false;
            game.particles.push(...burst(proj.x, proj.y, PROJ_COLORS[proj.projType] || '#fff', 4));
          }
          break;
        }
      }
    }

    // Player wizard picks up items
    if (game.playerWizard && game.playerWizard.alive) {
      const pw = game.playerWizard;
      const items = game.entities.filter(e => e.alive && e.type === 'item_pickup');
      for (const item of items) {
        if (circlesOverlap(pw.x, pw.y, pw.radius + 8, item.x, item.y, item.radius)) {
          pw.applyItemBonus(item.itemType);
          item.alive = false;
          game.announcements.push({
            text: `✨ ${item.itemType === 'speed' ? 'Hastighetsbonus' : item.itemType === 'health' ? 'Hälsobonus' : 'Skadebonus'}!`,
            duration: 2, maxDuration: 2,
          });
          game.particles.push(...burst(item.x, item.y, '#FFD700', 12));
        }
      }
    }
  }

  _applyProjEffect(proj, target, game) {
    if (!target.effects) return;
    switch (proj.projType) {
      case 'ice_shard':
        target.effects.push({ type: 'slow', duration: 1.5, magnitude: 0.5 });
        break;
      case 'vine':
        target.effects.push({ type: 'root', duration: 0.6, magnitude: 0 });
        break;
      case 'shadow_orb':
        // Shadow orbs deal bonus damage (already baked into atk) — no extra effect
        break;
    }
  }
}
