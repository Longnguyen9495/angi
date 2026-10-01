import { Script } from 'playcanvas';

/*
 * Idle life for the painted farm scene (Editor preview): sails turning,
 * koi circling, clouds drifting. Visual only — no state, no network.
 */

export class PaintedSpin extends Script {
  static scriptName = 'paintedSpin';

  /** @attribute Degrees per second around the local axis. */
  speed = 30;

  /** @attribute Axis: 0 = x, 1 = y, 2 = z. */
  axis = 2;

  update(dt) {
    const a = this.speed * dt;
    this.entity.rotateLocal(this.axis === 0 ? a : 0, this.axis === 1 ? a : 0, this.axis === 2 ? a : 0);
  }
}

export class PaintedBob extends Script {
  static scriptName = 'paintedBob';

  /** @attribute Sideways drift in metres. */
  drift = 0.6;

  /** @attribute Up and down in metres. */
  lift = 0.15;

  /** @attribute Cycles per minute. */
  speed = 3;

  initialize() {
    this.base = this.entity.getLocalPosition().clone();
    this.t = Math.random() * 60;
  }

  update(dt) {
    this.t += dt;
    const w = (this.speed / 60) * Math.PI * 2;
    this.entity.setLocalPosition(
      this.base.x + Math.sin(this.t * w) * this.drift,
      this.base.y + Math.sin(this.t * w * 1.7) * this.lift,
      this.base.z + Math.cos(this.t * w * 0.8) * this.drift * 0.5,
    );
  }
}

/** Measurement only: logs frame rate, frame time, draw calls and drawn triangles every few seconds. */
export class PaintedStats extends Script {
  static scriptName = 'paintedStats';

  /** @attribute Seconds between log lines. */
  every = 3;

  initialize() {
    this.t = 0;
    this.frames = 0;
    this.worst = 0;
  }

  update(dt) {
    this.t += dt;
    this.frames++;
    this.worst = Math.max(this.worst, dt);
    if (this.t < this.every) return;
    const s = this.app.stats;
    const d = this.app.graphicsDevice;
    console.log(
      `[stats] fps=${(this.frames / this.t).toFixed(1)} avgMs=${((this.t / this.frames) * 1000).toFixed(1)} worstMs=${(this.worst * 1000).toFixed(1)} drawCalls=${s.drawCalls.total} tris=${s.frame.triangles} canvas=${d.width}x${d.height} dpr=${d.maxPixelRatio}`,
    );
    this.t = 0;
    this.frames = 0;
    this.worst = 0;
  }
}

/**
 * A koi swimming an ellipse inside the pond (paths checked to stay in the water,
 * nose to tail), facing where it goes; a gentle tail wag.
 */
export class PaintedSwim extends Script {
  static scriptName = 'paintedSwim';

  /** @attribute */ cx = 5.2;
  /** @attribute */ cz = 3.2;
  /** @attribute */ rx = 1;
  /** @attribute */ rz = 1;
  /** @attribute Radians per second (negative swims the other way). */
  speed = 0.3;
  /** @attribute */ phase = 0;

  initialize() {
    this.t = this.phase;
    this.y = this.entity.getLocalPosition().y;
  }

  update(dt) {
    this.t += this.speed * dt;
    const c = Math.cos(this.t);
    const s = Math.sin(this.t);
    const dir = Math.sign(this.speed) || 1;
    const vx = -s * this.rx * dir;
    const vz = c * this.rz * dir;
    const wag = Math.sin(this.t * 14) * 6;
    this.entity.setLocalPosition(this.cx + c * this.rx, this.y, this.cz + s * this.rz);
    this.entity.setLocalEulerAngles(0, (Math.atan2(-vz, vx) * 180) / Math.PI + wag, 0);
  }
}
