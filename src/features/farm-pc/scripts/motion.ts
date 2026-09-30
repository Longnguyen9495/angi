import { Quat, Script, StandardMaterial, Vec3, type Entity } from 'playcanvas';
import type { FarmEffect, FarmEnv, FarmView } from '../contract';
import { FARM_EVENTS, LAMP_LEVEL, currentEnv, currentView } from './events';

/*
 * Presentation-only scene scripts (PlayCanvas ESM scripts). Attached from code
 * in the procedural corner, or in the Editor to entities named by the
 * convention in plans/playcanvas-editor-pipeline.md. Every script honours
 * reduced motion and removes its listeners on destroy.
 */

// Scratch values shared by all instances (never kept across frames).
const q = new Quat();
const pose = new Quat();

/*
 * Helpers instead of a shared base class: the Editor's script parser only
 * registers classes that extend Script directly.
 */

/** Subscribes to an app event for the script's lifetime. */
function listen<T>(s: Script, event: string, fn: (payload: T) => void) {
  s.app.on(event, fn, s);
  s.once('destroy', () => s.app.off(event, fn, s));
}

/** Keeps `s.reduced` in step with farm:env (current value first, then changes). */
function trackEnv(s: Script & { reduced: boolean }, onChange?: (env: FarmEnv) => void) {
  const apply = (env: FarmEnv) => {
    s.reduced = env.reduced;
    onChange?.(env);
  };
  const now = currentEnv(s.app);
  if (now) apply(now);
  listen<FarmEnv>(s, FARM_EVENTS.env, apply);
}

/** Gentle wind: tilts the entity a few degrees around its rest pose, out of phase with neighbours. */
export class Sway extends Script {
  reduced = false;
  static scriptName = 'farmSway';

  /** @attribute Maximum tilt, degrees. */
  amplitude = 2;
  /** @attribute Cycles per second (roughly). */
  speed = 0.25;
  /** @attribute Phase offset, radians (0 = derived from position). */
  phase = 0;

  private rest = new Quat();
  private t = 0;

  initialize() {
    this.rest.copy(this.entity.getLocalRotation());
    if (!this.phase) {
      const p = this.entity.getPosition();
      this.phase = p.x * 1.7 + p.z * 1.3;
    }
    trackEnv(this, (env) => {
      if (env.reduced) this.entity.setLocalRotation(this.rest);
    });
  }

  update(dt: number) {
    if (this.reduced) return;
    this.t += dt;
    const w = this.t * this.speed * Math.PI * 2 + this.phase;
    q.setFromEulerAngles(Math.sin(w) * this.amplitude, 0, Math.cos(w * 0.8) * this.amplitude * 0.7);
    this.entity.setLocalRotation(pose.copy(this.rest).mul(q));
  }
}

/** A new crop or stage pops in once: quick overshoot from small to rest scale. */
export class Pop extends Script {
  reduced = false;
  static scriptName = 'farmPop';

  /** @attribute Seconds. */
  duration = 0.38;
  /** @attribute Scale it starts from, relative to rest. */
  from = 0.55;
  /** @attribute Play on creation (false for crops that were already there at load). */
  playOnStart = true;

  private rest = new Vec3();
  private t = -1;

  initialize() {
    this.rest.copy(this.entity.getLocalScale());
    trackEnv(this);
    if (this.playOnStart && !this.reduced) this.play();
  }

  play() {
    this.t = 0;
    this.apply(0);
  }

  get playing() {
    return this.t >= 0;
  }

  update(dt: number) {
    if (this.t < 0) return;
    this.t += dt;
    const k = Math.min(1, this.t / this.duration);
    this.apply(k);
    if (k >= 1) this.t = -1;
  }

  private apply(k: number) {
    // easeOutBack: overshoots ~8% then settles.
    const c = 1.70158;
    const eased = 1 + (c + 1) * (k - 1) ** 3 + c * (k - 1) ** 2;
    const s = this.from + (1 - this.from) * eased;
    this.entity.setLocalScale(this.rest.x * s, this.rest.y * s, this.rest.z * s);
  }
}

/** Swings a hinge entity open while the barn is selected. */
export class DoorOnSelect extends Script {
  reduced = false;
  static scriptName = 'farmDoor';

  /** @attribute Opening angle around local Y, degrees. */
  openAngle = -100;
  /** @attribute Which selection opens it. */
  target = 'barn' as const;

  private rest = new Quat();
  private open = 0;
  private goal = 0;

  initialize() {
    this.rest.copy(this.entity.getLocalRotation());
    trackEnv(this);
    const apply = (view: FarmView) => {
      this.goal = view.selected?.kind === this.target ? 1 : 0;
    };
    const now = currentView(this.app);
    if (now) apply(now);
    listen<FarmView>(this, FARM_EVENTS.view, apply);
  }

  get openness() {
    return this.open;
  }

  update(dt: number) {
    if (this.open === this.goal) return;
    this.open = this.reduced
      ? this.goal
      : this.open + (this.goal - this.open) * Math.min(1, dt * 6);
    if (Math.abs(this.goal - this.open) < 0.002) this.open = this.goal;
    q.setFromEulerAngles(0, this.openAngle * this.open, 0);
    this.entity.setLocalRotation(pose.copy(this.rest).mul(q));
    this.app.renderNextFrame = true;
  }
}

/** Lamp brightness by day part: the entity's light plus an optional glowing mesh. */
export class Lamp extends Script {
  reduced = false;
  static scriptName = 'farmLamp';

  /** @attribute Light intensity at full night. */
  intensity = 2.2;
  /** @attribute Entity whose emissive material glows with the lamp. */
  glow: Entity | null = null;

  level = 0;

  initialize() {
    trackEnv(this, (env) => this.set(LAMP_LEVEL[env.dayPart]));
  }

  private set(level: number) {
    this.level = level;
    if (this.entity.light) this.entity.light.intensity = level * this.intensity;
    const mi = this.glow?.render?.meshInstances[0];
    if (mi && mi.material instanceof StandardMaterial) {
      mi.material.emissiveIntensity = 0.15 + level * 2;
      mi.material.update();
    }
  }
}

/**
 * Plays an Editor particle system at the plot an effect happened on. Needs an
 * entity with a particlesystem component (fx-water, fx-dust, fx-sparkle).
 */
export class PlayFx extends Script {
  reduced = false;
  static scriptName = 'farmFx';

  /** @attribute Which effect triggers it. */
  kind: FarmEffect['kind'] = 'water';
  /** @attribute Height above the plot anchor. */
  lift = 0.2;

  initialize() {
    trackEnv(this);
    listen<FarmEffect>(this, FARM_EVENTS.effect, (fx) => {
      if (fx.kind !== this.kind || this.reduced) return;
      for (const id of fx.plotIds) {
        const plot = this.app.root.findByName(`plot-${id}`);
        const ps = this.entity.particlesystem;
        if (!plot || !ps) continue;
        const p = plot.getPosition();
        this.entity.setPosition(p.x, p.y + this.lift, p.z);
        ps.reset();
        ps.play();
      }
    });
  }
}

export const FARM_SCRIPTS = [Sway, Pop, DoorOnSelect, Lamp, PlayFx];
