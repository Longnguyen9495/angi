import type { SpinPlan } from '../foodReel.types';
import { DECELERATE_AT, spinProgress, spinSpeed } from './spin';

export type EngineMode = 'rest' | 'drag' | 'inertia' | 'snap' | 'spin' | 'jump';

export interface EngineCallbacks {
  /** The integer item at the camera centre changed. */
  onIndexChange?: (index: number) => void;
  /** Drag/inertia/keyboard motion came to rest on an item. */
  onRest?: (index: number) => void;
  /** A spin passed its cruise phase and is visibly slowing down. */
  onDecelerate?: () => void;
  /** A spin reached its planned target (always exactly `plan.target`). */
  onSettle?: (index: number) => void;
}

export interface FrameState {
  /** Continuous position in item units (plus idle sway when resting). */
  position: number;
  /** Absolute speed in items/second, drives fake motion blur and ticks. */
  speed: number;
  mode: EngineMode;
  /** ms since the last spin settled (Infinity when not applicable). */
  settleAge: number;
}

const SPRING_K = 190;
const SPRING_C = 2 * Math.sqrt(SPRING_K) * 0.92;
const FRICTION = 0.935; // per 60 Hz frame
const MAX_FLICK = 40; // items/second
const REDUCED_SPIN_MS = 400;

/**
 * Framework-free reel physics. Time is always passed in, so the engine is
 * deterministic under test and never owns timers or DOM.
 */
export class ReelEngine {
  position: number;
  velocity = 0;
  mode: EngineMode = 'rest';
  reduced: boolean;

  private cb: EngineCallbacks;
  private last: number | null = null;
  private target = 0;
  private spin: { plan: SpinPlan; start: number; decelerated: boolean } | null = null;
  private jumpAt = 0;
  private settledAt = -Infinity;
  private lastIndex: number;
  private samples: { t: number; p: number }[] = [];

  constructor(position: number, reduced: boolean, cb: EngineCallbacks = {}) {
    this.position = position;
    this.reduced = reduced;
    this.cb = cb;
    this.lastIndex = Math.round(position);
  }

  setReduced(reduced: boolean) {
    this.reduced = reduced;
  }

  setCallbacks(cb: EngineCallbacks) {
    this.cb = cb;
  }

  get isMoving(): boolean {
    return this.mode !== 'rest';
  }

  get index(): number {
    return Math.round(this.position);
  }

  startDrag(now: number) {
    if (this.mode === 'spin' || this.mode === 'jump') return;
    this.mode = 'drag';
    this.velocity = 0;
    this.samples = [{ t: now, p: this.position }];
  }

  dragBy(deltaItems: number, now: number) {
    if (this.mode !== 'drag') return;
    this.position += deltaItems;
    this.samples.push({ t: now, p: this.position });
    this.samples = this.samples.filter((s) => now - s.t < 100);
    this.emitIndex();
  }

  endDrag(now: number) {
    if (this.mode !== 'drag') return;
    const first = this.samples[0];
    const dt = first ? (now - first.t) / 1000 : 0;
    const v = dt > 0.008 && first ? (this.position - first.p) / dt : 0;
    this.velocity = Math.max(-MAX_FLICK, Math.min(MAX_FLICK, v));
    if (this.reduced) {
      // One discrete step in the flick direction, no inertia.
      const step = Math.abs(this.velocity) > 2 ? Math.sign(this.velocity) : 0;
      this.jumpTo(Math.round(this.position) + step);
      return;
    }
    this.mode = 'inertia';
  }

  /** Keyboard / programmatic navigation to a virtual index. */
  goTo(index: number) {
    if (this.mode === 'spin' || this.mode === 'jump') return;
    if (this.reduced) {
      this.jumpTo(index);
      return;
    }
    this.target = index;
    this.mode = 'snap';
  }

  spinTo(plan: SpinPlan, now: number) {
    this.spin = { plan, start: now, decelerated: false };
    this.velocity = 0;
    if (this.reduced) {
      this.mode = 'jump';
      this.jumpAt = now + REDUCED_SPIN_MS;
      return;
    }
    this.position = plan.from;
    this.mode = 'spin';
  }

  private jumpTo(index: number) {
    this.position = index;
    this.velocity = 0;
    this.mode = 'rest';
    this.emitIndex();
    this.cb.onRest?.(index);
  }

  private emitIndex() {
    const i = Math.round(this.position);
    if (i !== this.lastIndex) {
      this.lastIndex = i;
      this.cb.onIndexChange?.(i);
    }
  }

  private finishSpin(now: number) {
    const plan = this.spin!.plan;
    this.position = plan.target;
    this.velocity = 0;
    this.mode = 'rest';
    this.settledAt = now;
    this.spin = null;
    this.emitIndex();
    this.cb.onSettle?.(plan.target);
  }

  /** Advances the simulation to `now` (ms) and returns what should be drawn. */
  step(now: number): FrameState {
    const dt = this.last === null ? 0 : Math.min(0.05, Math.max(0, (now - this.last) / 1000));
    this.last = now;
    let speed = Math.abs(this.velocity);

    switch (this.mode) {
      case 'inertia': {
        this.velocity *= FRICTION ** (dt * 60);
        this.position += this.velocity * dt;
        speed = Math.abs(this.velocity);
        if (speed < 2.5) {
          this.target = Math.round(this.position + this.velocity * 0.08);
          this.mode = 'snap';
        }
        break;
      }
      case 'snap': {
        const a = -SPRING_K * (this.position - this.target) - SPRING_C * this.velocity;
        this.velocity += a * dt;
        this.position += this.velocity * dt;
        speed = Math.abs(this.velocity);
        if (Math.abs(this.position - this.target) < 0.002 && speed < 0.02) {
          this.position = this.target;
          this.velocity = 0;
          this.mode = 'rest';
          this.emitIndex();
          this.cb.onRest?.(this.target);
        }
        break;
      }
      case 'spin': {
        const s = this.spin!;
        const elapsed = now - s.start;
        const u = elapsed / s.plan.durationMs;
        if (!s.decelerated && u >= DECELERATE_AT) {
          s.decelerated = true;
          this.cb.onDecelerate?.();
        }
        if (u >= 1) {
          this.finishSpin(now);
          speed = 0;
        } else {
          this.position = s.plan.from + (s.plan.target - s.plan.from) * spinProgress(u);
          speed = Math.abs(spinSpeed(s.plan, elapsed));
        }
        break;
      }
      case 'jump': {
        if (now >= this.jumpAt && this.spin) {
          if (!this.spin.decelerated) this.cb.onDecelerate?.();
          this.finishSpin(now);
        }
        speed = 0;
        break;
      }
      default:
        break;
    }
    if (this.mode !== 'rest') this.emitIndex();

    // Idle sway: a barely-there breathing motion so the scene never freezes.
    const sway = this.mode === 'rest' && !this.reduced ? Math.sin(now / 1400) * 0.035 : 0;
    return {
      position: this.position + sway,
      speed,
      mode: this.mode,
      settleAge: now - this.settledAt,
    };
  }
}
