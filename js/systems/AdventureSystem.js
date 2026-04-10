// ============================================================
//  ADVENTURE SYSTEM  –  persistent boss bonuses
// ============================================================
const ADV_KEY = 'adventureBonuses_v1';

class AdventureSystem {
  constructor() {
    this.bonuses = this._load();
  }

  addBonus(type) {
    this.bonuses[type] = (this.bonuses[type] || 0) + 1;
    this._save();
  }

  // Returns total multiplier for a stat type (e.g. damage → 1.66 after 2 kills)
  getMultiplier(type) {
    return 1 + (this.bonuses[type] || 0) * 0.33;
  }

  _load() {
    try {
      const d = localStorage.getItem(ADV_KEY);
      return d ? JSON.parse(d) : { damage: 0, health: 0, speed: 0 };
    } catch { return { damage: 0, health: 0, speed: 0 }; }
  }

  _save() {
    try { localStorage.setItem(ADV_KEY, JSON.stringify(this.bonuses)); } catch {}
  }
}
