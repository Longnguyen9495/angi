import { Script, Vec4, EVENT_MOUSEDOWN, EVENT_MOUSEMOVE, EVENT_MOUSEUP, EVENT_TOUCHSTART, EVENT_TOUCHMOVE, EVENT_TOUCHEND } from 'playcanvas';

/*
 * 2D farm (scene farm-2d): the owner's painting as a base plate with live layers on top.
 * Stage = a screen-space group the size of the picture (1678×937 px); every child is placed in
 * picture pixels from the top-left. Plots and hotspots come from the farm2d-layout JSON asset
 * (written by scripts/farm2d/prepare.mjs).
 *
 * Website bridge (window.postMessage, the page embeds this build in an iframe):
 *   host → scene  { type: 'farm:view', plots: [{ id, tile, crop?, stage?, ready? }], selected? }
 *                 { type: 'farm:focus', x, y }  (picture px to centre on when the view is narrower than the picture)
 *                 tile: 'grass' | 'soil' | 'seeded' | 'sprout'; stage: 'sprout' | 'young' | 'flowering' | 'ready'
 *   scene → host  { type: 'farm:ready' }
 *                 { type: 'farm:intent', kind: 'plot', id }   (tap on a field plot)
 *                 { type: 'farm:intent', kind: 'place', id }  (tap on a hotspot: farmhouse, pond_fish, …)
 */

const PIC_W = 1678;
const PIC_H = 937;

/** Signed side of (x, y) against every edge of a convex quad: inside when all agree. */
function inQuad(q, x, y) {
  let pos = 0;
  let neg = 0;
  for (let k = 0; k < 4; k++) {
    const [ax, ay] = q[k];
    const [bx, by] = q[(k + 1) % 4];
    const c = (bx - ax) * (y - ay) - (by - ay) * (x - ax);
    if (c > 0) pos++;
    else if (c < 0) neg++;
  }
  return pos === 0 || neg === 0;
}

/** Fit, pan, pointer, plots and the website bridge. Lives on the Stage entity. */
export class Farm2dStage extends Script {
  static scriptName = 'farm2dStage';

  /** @attribute Extra zoom over "cover" (1 = picture just fills the view). */
  zoom = 1;

  /** @attribute Show a sample farm until the website sends its state. */
  demo = true;

  /** @attribute Picture point (px) kept in view on narrow screens: between the field and the pond. */
  focusX = 760;

  /** @attribute */
  focusY = 540;

  initialize() {
    const asset = this.app.assets.find('farm2d-layout', 'json');
    this.layout = asset?.resource;
    if (!this.layout) {
      console.error('[farm2d] layout asset missing');
      return;
    }
    this.pan = { x: 0, y: 0 };
    this.userPanned = false;
    this.scale = 1;
    this.hover = null;
    this.selected = null;
    this.drag = null;
    this.tex = (name) => this.app.assets.find(`farm2d-${name}`, 'texture');
    this.plots = new Map();
    for (const p of this.layout.plots) {
      const e = this.entity.findByName(`Plot-${p.id}`);
      if (e) this.plots.set(p.id, { ...p, entity: e, crop: e.findByName('Crop'), glow: e.findByName('Glow') });
    }
    this.halo = this.entity.findByName('Halo');
    // Smallest first: the dock wins over the pond, the windmill over the farmhouse.
    this.places = this.layout.hotspots
      .filter((h) => h.id !== 'crops')
      .sort((a, b) => (a.bbox_px[2] - a.bbox_px[0]) * (a.bbox_px[3] - a.bbox_px[1]) - (b.bbox_px[2] - b.bbox_px[0]) * (b.bbox_px[3] - b.bbox_px[1]));

    if (this.demo) this.applyView(Farm2dStage.DEMO);
    this.onMessage = (ev) => {
      const m = ev.data;
      if (m && m.type === 'farm:view') this.applyView(m);
      if (m && m.type === 'farm:focus' && Number.isFinite(m.x) && Number.isFinite(m.y)) {
        this.focusX = m.x;
        this.focusY = m.y;
        this.userPanned = false;
      }
    };
    window.addEventListener('message', this.onMessage);
    this.post({ type: 'farm:ready' });

    const mouse = this.app.mouse;
    if (mouse) {
      mouse.on(EVENT_MOUSEDOWN, (e) => this.down(e.x, e.y), this);
      mouse.on(EVENT_MOUSEMOVE, (e) => this.move(e.x, e.y), this);
      mouse.on(EVENT_MOUSEUP, (e) => this.up(e.x, e.y), this);
    }
    const touch = this.app.touch;
    if (touch) {
      touch.on(EVENT_TOUCHSTART, (e) => e.touches[0] && this.down(e.touches[0].x, e.touches[0].y), this);
      touch.on(EVENT_TOUCHMOVE, (e) => e.touches[0] && this.move(e.touches[0].x, e.touches[0].y), this);
      touch.on(EVENT_TOUCHEND, (e) => e.changedTouches[0] && this.up(e.changedTouches[0].x, e.changedTouches[0].y, true), this);
    }
    this.on('destroy', () => {
      window.removeEventListener('message', this.onMessage);
      mouse?.off(EVENT_MOUSEDOWN, undefined, this);
      mouse?.off(EVENT_MOUSEMOVE, undefined, this);
      mouse?.off(EVENT_MOUSEUP, undefined, this);
      touch?.off(EVENT_TOUCHSTART, undefined, this);
      touch?.off(EVENT_TOUCHMOVE, undefined, this);
      touch?.off(EVENT_TOUCHEND, undefined, this);
    });
    this.t = 0;
  }

  post(msg) {
    if (window.parent !== window) window.parent.postMessage(msg, '*');
  }

  // ——— Fit and pan ———

  /** Device pixels per CSS pixel of the canvas (pointer events come in CSS pixels). */
  get dpr() {
    const c = this.app.graphicsDevice.canvas;
    return c.clientWidth ? this.app.graphicsDevice.width / c.clientWidth : 1;
  }

  layoutStage() {
    const gw = this.app.graphicsDevice.width;
    const gh = this.app.graphicsDevice.height;
    this.scale = Math.max(gw / PIC_W, gh / PIC_H) * this.zoom;
    if (!this.userPanned) {
      this.pan.x = (PIC_W / 2 - this.focusX) * this.scale;
      this.pan.y = (this.focusY - PIC_H / 2) * this.scale;
    }
    const mx = Math.max(0, (PIC_W * this.scale - gw) / 2);
    const my = Math.max(0, (PIC_H * this.scale - gh) / 2);
    this.pan.x = Math.max(-mx, Math.min(mx, this.pan.x));
    this.pan.y = Math.max(-my, Math.min(my, this.pan.y));
    this.entity.setLocalScale(this.scale, this.scale, 1);
    this.entity.setLocalPosition(this.pan.x, this.pan.y, 0);
  }

  /** CSS pointer position → picture pixels. */
  toPicture(x, y) {
    const r = this.dpr;
    const gw = this.app.graphicsDevice.width;
    const gh = this.app.graphicsDevice.height;
    return [(x * r - (gw / 2 + this.pan.x)) / this.scale + PIC_W / 2, (y * r - (gh / 2 - this.pan.y)) / this.scale + PIC_H / 2];
  }

  // ——— Pointer ———

  hit(px, py) {
    for (const p of this.plots.values()) if (inQuad(p.quad, px, py)) return { kind: 'plot', id: p.id };
    for (const h of this.places) {
      const [x0, y0, x1, y1] = h.bbox_px;
      if (px >= x0 && px <= x1 && py >= y0 && py <= y1) return { kind: 'place', id: h.id };
    }
    return null;
  }

  down(x, y) {
    this.drag = { x, y, px: this.pan.x, py: this.pan.y, moved: false };
  }

  move(x, y) {
    if (this.drag) {
      const dx = x - this.drag.x;
      const dy = y - this.drag.y;
      if (Math.hypot(dx, dy) > 6) this.drag.moved = true;
      if (this.drag.moved) {
        this.userPanned = true;
        this.pan.x = this.drag.px + dx * this.dpr;
        this.pan.y = this.drag.py - dy * this.dpr;
      }
    }
    this.setHover(this.drag?.moved ? null : this.hit(...this.toPicture(x, y)));
  }

  up(x, y, isTouch = false) {
    const tap = this.drag && !this.drag.moved;
    this.drag = null;
    if (!tap) return;
    const target = this.hit(...this.toPicture(x, y));
    if (!target) return;
    if (target.kind === 'plot') this.selected = target.id;
    this.post({ type: 'farm:intent', ...target });
    this.app.fire('farm2d:intent', target);
    if (isTouch) this.setHover(null);
  }

  setHover(target) {
    const key = target ? `${target.kind}:${target.id}` : null;
    if (key === this.hoverKey) return;
    this.hoverKey = key;
    this.hover = target;
    this.app.graphicsDevice.canvas.style.cursor = target ? 'pointer' : '';
    if (this.halo) {
      const h = target?.kind === 'place' ? this.places.find((p) => p.id === target.id) : null;
      this.halo.enabled = !!h;
      if (h) {
        const [x0, y0, x1, y1] = h.bbox_px;
        this.halo.setLocalPosition((x0 + x1) / 2, -(y0 + y1) / 2, 0);
        this.halo.element.width = (x1 - x0) * 0.9;
        this.halo.element.height = (y1 - y0) * 0.9;
      }
    }
  }

  // ——— Plots ———

  applyView(view) {
    if (view.selected !== undefined) this.selected = view.selected;
    const { crops, stages } = this.layout.crops;
    for (const v of view.plots ?? []) {
      const p = this.plots.get(v.id);
      if (!p) continue;
      const tile = this.tex(`tile-${v.tile ?? 'soil'}`);
      if (tile) p.entity.element.textureAsset = tile;
      const row = crops.indexOf(v.crop);
      const col = stages.indexOf(v.stage);
      p.ready = !!v.ready || v.stage === 'ready';
      if (p.crop) {
        p.crop.enabled = row >= 0 && col >= 0;
        if (p.crop.enabled)
          p.crop.element.rect = new Vec4(col / stages.length, 1 - (row + 1) / crops.length, 1 / stages.length, 1 / crops.length);
      }
    }
  }

  update(dt) {
    if (!this.layout) return;
    this.t += dt;
    this.layoutStage();
    const pulse = 0.55 + 0.35 * Math.sin(this.t * 4);
    for (const p of this.plots.values()) {
      const on = this.hover?.kind === 'plot' && this.hover.id === p.id;
      if (p.glow) {
        p.glow.enabled = on || this.selected === p.id;
        p.glow.element.opacity = on ? 1 : pulse;
      }
      // Ready crops sway a little so they read as "pick me".
      if (p.crop?.enabled) {
        const s = p.ready ? 1 + 0.04 * Math.sin(this.t * 5 + p.id) : 1;
        p.crop.setLocalScale(s, s, 1);
      }
    }
    if (this.halo?.enabled) this.halo.element.opacity = 0.6 + 0.4 * Math.sin(this.t * 3);
  }
}

/** Sample farm shown in the Editor and until the website sends its own state. */
Farm2dStage.DEMO = {
  plots: [
    { id: 1, tile: 'soil', crop: 'chili', stage: 'ready' },
    { id: 2, tile: 'soil', crop: 'herbs', stage: 'flowering' },
    { id: 3, tile: 'seeded' },
    { id: 4, tile: 'soil', crop: 'scallion', stage: 'young' },
    { id: 5, tile: 'soil', crop: 'rice', stage: 'sprout' },
    { id: 6, tile: 'soil' },
    { id: 7, tile: 'soil', crop: 'lemongrass', stage: 'ready' },
    { id: 8, tile: 'sprout' },
    { id: 9, tile: 'grass' },
  ],
};

/** Clouds drifting across the sky, wrapping round the picture. */
export class Farm2dDrift extends Script {
  static scriptName = 'farm2dDrift';

  /** @attribute Picture pixels per second (negative drifts left). */
  speed = 6;

  initialize() {
    this.p = this.entity.getLocalPosition().clone();
  }

  update(dt) {
    const w = this.entity.element.width;
    this.p.x += this.speed * dt;
    if (this.p.x > PIC_W + w / 2) this.p.x = -w / 2;
    if (this.p.x < -w / 2) this.p.x = PIC_W + w / 2;
    this.entity.setLocalPosition(this.p);
  }
}

/** A koi swimming an ellipse in the pond, turned to face where it goes. */
export class Farm2dSwim extends Script {
  static scriptName = 'farm2dSwim';

  /** @attribute Ellipse centre, picture px. */
  cx = 1015;

  /** @attribute */
  cy = 772;

  /** @attribute Radii, picture px. */
  rx = 170;

  /** @attribute */
  ry = 50;

  /** @attribute Radians per second (sign = direction). */
  speed = 0.25;

  /** @attribute Start angle, radians. */
  phase = 0;

  /** @attribute Direction the painted fish faces in its sprite, degrees (0 = right, 90 = up). */
  facing = 0;

  initialize() {
    this.a = this.phase;
  }

  update(dt) {
    this.a += this.speed * dt;
    // A slow wobble in radius so the paths don't look like rails.
    const k = 1 + 0.08 * Math.sin(this.a * 2.3 + this.phase);
    const x = this.cx + Math.cos(this.a) * this.rx * k;
    const y = this.cy + Math.sin(this.a) * this.ry * k;
    this.entity.setLocalPosition(x, -y, 0);
    // Heading in stage space (y up).
    const s = Math.sign(this.speed) || 1;
    const hx = -Math.sin(this.a) * this.rx * s;
    const hy = -Math.cos(this.a) * this.ry * s;
    const deg = (Math.atan2(hy, hx) * 180) / Math.PI;
    this.entity.setLocalEulerAngles(0, 0, deg - this.facing + Math.sin(this.a * 9) * 4);
  }
}

/** Sun glints on the water: fade in and out, each on its own beat. */
export class Farm2dTwinkle extends Script {
  static scriptName = 'farm2dTwinkle';

  /** @attribute Seconds per glint. */
  period = 3.5;

  /** @attribute 0..1 offset in the cycle. */
  phase = 0;

  initialize() {
    this.t = this.phase * this.period;
    this.base = this.entity.getLocalScale().clone();
  }

  update(dt) {
    this.t += dt;
    const u = (this.t % this.period) / this.period;
    const o = Math.max(0, Math.sin(u * Math.PI * 2)) ** 2;
    this.entity.element.opacity = o * 0.9;
    this.entity.setLocalScale(this.base.x * (0.7 + o * 0.4), this.base.y, 1);
  }
}

/** Measurement only: logs frame rate and draw calls every few seconds. */
export class Farm2dStats extends Script {
  static scriptName = 'farm2dStats';

  /** @attribute Seconds between log lines. */
  every = 3;

  initialize() {
    this.t = 0;
    this.frames = 0;
  }

  update(dt) {
    this.t += dt;
    this.frames++;
    if (this.t < this.every) return;
    const st = this.app.stats;
    console.log(
      `[farm2d-stats] fps=${(this.frames / this.t).toFixed(1)} ms=${((this.t / this.frames) * 1000).toFixed(2)} draws=${st.drawCalls?.total ?? '?'} px=${this.app.graphicsDevice.width}x${this.app.graphicsDevice.height}`,
    );
    this.t = 0;
    this.frames = 0;
  }
}
