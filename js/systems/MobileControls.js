// ============================================================
//  MOBILE CONTROLS  –  virtual joystick + spell buttons
//  Only activates on touch devices
// ============================================================
class MobileControls {
  constructor(input) {
    this.input   = input;
    this.enabled = ('ontouchstart' in window);
    this.joy     = { active: false, id: null, baseX: 0, baseY: 0, nx: 0, ny: 0 };
    if (this.enabled) this._build();
  }

  _build() {
    // ── Styles ─────────────────────────────────────────────
    const style = document.createElement('style');
    style.textContent = `
      #mob {
        position: fixed;
        bottom: 0; left: 0; right: 0;
        height: 160px;
        pointer-events: none;
        z-index: 200;
        touch-action: none;
      }
      #mob-joy {
        position: absolute;
        left: 24px; bottom: 20px;
        width: 120px; height: 120px;
        pointer-events: all;
        touch-action: none;
      }
      #mob-joy-base {
        position: absolute;
        inset: 0;
        border-radius: 50%;
        background: rgba(255,255,255,0.07);
        border: 2px solid rgba(255,255,255,0.22);
      }
      #mob-joy-knob {
        position: absolute;
        top: 35px; left: 35px;
        width: 50px; height: 50px;
        border-radius: 50%;
        background: rgba(255,255,255,0.32);
        border: 2px solid rgba(255,255,255,0.7);
        will-change: transform;
      }
      #mob-right {
        position: absolute;
        right: 20px; bottom: 20px;
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        gap: 10px;
        pointer-events: none;
      }
      #mob-spells {
        display: flex;
        gap: 10px;
        pointer-events: none;
      }
      .mob-btn {
        width: 58px; height: 58px;
        border-radius: 50%;
        background: rgba(10,10,30,0.75);
        border: 2px solid #aaa;
        color: #fff;
        font-size: 13px;
        font-weight: bold;
        pointer-events: all;
        touch-action: none;
        -webkit-tap-highlight-color: transparent;
        user-select: none;
        display: flex; flex-direction: column;
        align-items: center; justify-content: center;
        line-height: 1.1;
      }
      .mob-btn span { font-size: 9px; opacity: 0.7; }
      #mob-atk {
        width: 78px; height: 78px;
        font-size: 22px;
        background: rgba(30,30,80,0.8);
        border-color: #4477ff;
        color: #88aaff;
      }
    `;
    document.head.appendChild(style);

    // ── HTML ───────────────────────────────────────────────
    const div = document.createElement('div');
    div.id = 'mob';
    div.innerHTML = `
      <div id="mob-joy">
        <div id="mob-joy-base"></div>
        <div id="mob-joy-knob"></div>
      </div>
      <div id="mob-right">
        <div id="mob-spells">
          <button class="mob-btn" id="mob-q" style="border-color:#aaffaa;color:#aaffaa">Q<span>Förmåga</span></button>
          <button class="mob-btn" id="mob-e" style="border-color:#aaffaa;color:#aaffaa">E<span>Rush</span></button>
          <button class="mob-btn" id="mob-r" style="border-color:#ff6666;color:#ff6666">R<span>Ultimat</span></button>
        </div>
        <button class="mob-btn" id="mob-atk">⚔</button>
      </div>
    `;
    document.body.appendChild(div);

    // ── Joystick ───────────────────────────────────────────
    const joyEl  = document.getElementById('mob-joy');
    const knobEl = document.getElementById('mob-joy-knob');
    const R = 38; // max radius

    joyEl.addEventListener('touchstart', e => {
      e.preventDefault();
      const t = e.changedTouches[0];
      const r = joyEl.getBoundingClientRect();
      this.joy.id    = t.identifier;
      this.joy.active = true;
      this.joy.baseX  = r.left + r.width / 2;
      this.joy.baseY  = r.top  + r.height / 2;
    }, { passive: false });

    joyEl.addEventListener('touchmove', e => {
      e.preventDefault();
      for (const t of e.changedTouches) {
        if (t.identifier !== this.joy.id) continue;
        const dx = t.clientX - this.joy.baseX;
        const dy = t.clientY - this.joy.baseY;
        const mag = Math.hypot(dx, dy) || 1;
        const clamp = Math.min(mag, R);
        this.joy.nx = (dx / mag);
        this.joy.ny = (dy / mag);
        knobEl.style.transform =
          `translate(${this.joy.nx * clamp}px, ${this.joy.ny * clamp}px)`;
      }
    }, { passive: false });

    const joyEnd = e => {
      e.preventDefault();
      for (const t of e.changedTouches) {
        if (t.identifier !== this.joy.id) continue;
        this.joy.active = false;
        this.joy.nx = 0; this.joy.ny = 0;
        knobEl.style.transform = '';
      }
    };
    joyEl.addEventListener('touchend',    joyEnd, { passive: false });
    joyEl.addEventListener('touchcancel', joyEnd, { passive: false });

    // ── Spell buttons ─────────────────────────────────────
    const spell = (id, key) => {
      const btn = document.getElementById(id);
      btn.addEventListener('touchstart', e => {
        e.preventDefault();
        this.input.justPressed[key] = true;
      }, { passive: false });
      btn.addEventListener('touchend', e => e.preventDefault(), { passive: false });
    };
    spell('mob-q', 'q');
    spell('mob-e', 'e');
    spell('mob-r', 'r');

    // ── Attack button (hold = continuous fire via space) ──
    const atk = document.getElementById('mob-atk');
    atk.addEventListener('touchstart', e => {
      e.preventDefault();
      this.input.keys[' '] = true;
    }, { passive: false });
    atk.addEventListener('touchend', e => {
      e.preventDefault();
      this.input.keys[' '] = false;
    }, { passive: false });
    atk.addEventListener('touchcancel', e => {
      this.input.keys[' '] = false;
    }, { passive: false });
  }

  // Call once per frame from main loop
  update() {
    if (!this.enabled) return;
    const DEAD = 0.2;
    const { active, nx, ny } = this.joy;
    this.input.keys['a'] = active && nx < -DEAD;
    this.input.keys['d'] = active && nx >  DEAD;
    this.input.keys['w'] = active && ny < -DEAD;
    this.input.keys['s'] = active && ny >  DEAD;
  }
}
