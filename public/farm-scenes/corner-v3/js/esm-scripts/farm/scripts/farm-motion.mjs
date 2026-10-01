import { Script, Quat, Vec3, StandardMaterial } from '../../../playcanvas-stable.min.mjs';

function _define_property(obj, key, value) {
    if (key in obj) {
        Object.defineProperty(obj, key, {
            value: value,
            enumerable: true,
            configurable: true,
            writable: true
        });
    } else {
        obj[key] = value;
    }
    return obj;
}
// src/features/farm-pc/scripts/events.ts
var FARM_EVENTS = {
    /** FarmView: plots (crop, stage, wet, thirsty) and the current selection. */ view: "farm:view",
    /** FarmEffect: plant / water / harvest on plot ids, fired after the domain accepted it. */ effect: "farm:effect",
    /** FarmEnv: day part, quality tier, reduced motion. */ env: "farm:env"
};
var lastEnv = /* @__PURE__ */ new WeakMap();
var lastView = /* @__PURE__ */ new WeakMap();
function currentEnv(app) {
    return lastEnv.get(app);
}
function currentView(app) {
    return lastView.get(app);
}
var LAMP_LEVEL = {
    morning: 0,
    noon: 0,
    evening: 0.6,
    night: 1
};
// src/features/farm-pc/scripts/motion.ts
var q = new Quat();
var pose = new Quat();
/** Subscribes to an app event for the script's lifetime. */ function listen(s, event, fn) {
    s.app.on(event, fn, s);
    s.once("destroy", ()=>s.app.off(event, fn, s));
}
/** Keeps `s.reduced` in step with farm:env (current value first, then changes). */ function trackEnv(s, onChange) {
    const apply = (env)=>{
        s.reduced = env.reduced;
        onChange?.(env);
    };
    const now = currentEnv(s.app);
    if (now) apply(now);
    listen(s, FARM_EVENTS.env, apply);
}
/** Gentle wind: tilts the entity a few degrees around its rest pose, out of phase with neighbours. */ class Sway extends Script {
    initialize() {
        this.rest.copy(this.entity.getLocalRotation());
        if (!this.phase) {
            const p = this.entity.getPosition();
            this.phase = p.x * 1.7 + p.z * 1.3;
        }
        trackEnv(this, (env)=>{
            if (env.reduced) this.entity.setLocalRotation(this.rest);
        });
    }
    update(dt) {
        if (this.reduced) return;
        this.t += dt;
        const w = this.t * this.speed * Math.PI * 2 + this.phase;
        q.setFromEulerAngles(Math.sin(w) * this.amplitude, 0, Math.cos(w * 0.8) * this.amplitude * 0.7);
        this.entity.setLocalRotation(pose.copy(this.rest).mul(q));
    }
    constructor(...args){
        super(...args), _define_property(this, "reduced", false), /** @attribute Maximum tilt, degrees. */ _define_property(this, "amplitude", 2), /** @attribute Cycles per second (roughly). */ _define_property(this, "speed", 0.25), /** @attribute Phase offset, radians (0 = derived from position). */ _define_property(this, "phase", 0), _define_property(this, "rest", new Quat()), _define_property(this, "t", 0);
    }
}
_define_property(Sway, "scriptName", "farmSway");
/** A new crop or stage pops in once: quick overshoot from small to rest scale. */ class Pop extends Script {
    initialize() {
        this.rest.copy(this.entity.getLocalScale());
        trackEnv(this, (env)=>{
            if (env.reduced) {
                this.t = -1;
                this.entity.setLocalScale(this.rest);
            }
        });
        if (this.playOnStart && !this.reduced) this.play();
    }
    play() {
        if (this.reduced) {
            this.t = -1;
            this.entity.setLocalScale(this.rest);
            return;
        }
        this.t = 0;
        this.apply(0);
    }
    get playing() {
        return this.t >= 0;
    }
    update(dt) {
        if (this.t < 0) return;
        this.t += dt;
        const k = Math.min(1, this.t / this.duration);
        this.apply(k);
        if (k >= 1) this.t = -1;
    }
    apply(k) {
        const c = 1.70158;
        const eased = 1 + (c + 1) * (k - 1) ** 3 + c * (k - 1) ** 2;
        const s = this.from + (1 - this.from) * eased;
        this.entity.setLocalScale(this.rest.x * s, this.rest.y * s, this.rest.z * s);
    }
    constructor(...args){
        super(...args), _define_property(this, "reduced", false), /** @attribute Seconds. */ _define_property(this, "duration", 0.38), /** @attribute Scale it starts from, relative to rest. */ _define_property(this, "from", 0.55), /** @attribute Play on creation (false for crops that were already there at load). */ _define_property(this, "playOnStart", true), _define_property(this, "rest", new Vec3()), _define_property(this, "t", -1);
    }
}
_define_property(Pop, "scriptName", "farmPop");
/** Swings a hinge entity open while the barn is selected. */ class DoorOnSelect extends Script {
    initialize() {
        this.rest.copy(this.entity.getLocalRotation());
        trackEnv(this);
        const apply = (view)=>{
            this.goal = view.selected?.kind === this.target ? 1 : 0;
        };
        const now = currentView(this.app);
        if (now) apply(now);
        listen(this, FARM_EVENTS.view, apply);
    }
    get openness() {
        return this.open;
    }
    update(dt) {
        if (this.open === this.goal) return;
        this.open = this.reduced ? this.goal : this.open + (this.goal - this.open) * Math.min(1, dt * 6);
        if (Math.abs(this.goal - this.open) < 2e-3) this.open = this.goal;
        q.setFromEulerAngles(0, this.openAngle * this.open, 0);
        this.entity.setLocalRotation(pose.copy(this.rest).mul(q));
        this.app.renderNextFrame = true;
    }
    constructor(...args){
        super(...args), _define_property(this, "reduced", false), /** @attribute Opening angle around local Y, degrees. */ _define_property(this, "openAngle", -100), /** @attribute Which selection opens it. */ _define_property(this, "target", "barn"), _define_property(this, "rest", new Quat()), _define_property(this, "open", 0), _define_property(this, "goal", 0);
    }
}
_define_property(DoorOnSelect, "scriptName", "farmDoor");
/** Lamp brightness by day part: the entity's light plus an optional glowing mesh. */ class Lamp extends Script {
    initialize() {
        trackEnv(this, (env)=>this.set(LAMP_LEVEL[env.dayPart]));
    }
    set(level) {
        this.level = level;
        if (this.entity.light) this.entity.light.intensity = level * this.intensity;
        const mi = this.glow?.render?.meshInstances[0];
        if (mi && mi.material instanceof StandardMaterial) {
            mi.material.emissiveIntensity = 0.15 + level * 2;
            mi.material.update();
        }
    }
    constructor(...args){
        super(...args), _define_property(this, "reduced", false), /** @attribute Light intensity at full night. */ _define_property(this, "intensity", 2.2), /** @attribute Entity whose emissive material glows with the lamp.
   * @type {Entity}
   */ _define_property(this, "glow", null), _define_property(this, "level", 0);
    }
}
_define_property(Lamp, "scriptName", "farmLamp");
/**
 * Plays an Editor particle system at the plot an effect happened on. Needs an
 * entity with a particlesystem component (fx-water, fx-dust, fx-sparkle).
 */ class PlayFx extends Script {
    stopAll() {
        for (const emitter of [
            this.entity,
            ...this.emitters.values()
        ]){
            emitter.particlesystem?.stop();
            emitter.particlesystem?.reset();
            if (emitter !== this.entity) emitter.enabled = false;
        }
    }
    initialize() {
        if (this.entity.particlesystem) this.entity.particlesystem.autoPlay = false;
        this.stopAll();
        trackEnv(this, (env)=>{
            if (env.reduced) this.stopAll();
        });
        this.once("destroy", ()=>{
            this.stopAll();
            for (const emitter of this.emitters.values())emitter.destroy();
            this.emitters.clear();
        });
        listen(this, FARM_EVENTS.effect, (fx)=>{
            if (fx.kind !== this.kind || this.reduced) return;
            for (const id of new Set(fx.plotIds)){
                const plot = this.app.root.findByName(`plot-${id}`);
                if (!plot || !this.entity.particlesystem) continue;
                let emitter = this.emitters.get(id);
                if (!emitter) {
                    emitter = this.entity.clone();
                    if (emitter.script) emitter.removeComponent("script");
                    emitter.name = `${this.entity.name}-plot-${id}`;
                    this.app.root.addChild(emitter);
                    this.emitters.set(id, emitter);
                }
                const ps = emitter.particlesystem;
                if (!ps) continue;
                const p = plot.getPosition();
                emitter.setPosition(p.x, p.y + this.lift, p.z);
                emitter.enabled = true;
                ps.autoPlay = false;
                ps.loop = false;
                ps.reset();
                ps.play();
            }
        });
    }
    constructor(...args){
        super(...args), _define_property(this, "reduced", false), /** @attribute Which effect triggers it. */ _define_property(this, "kind", "water"), /** @attribute Height above the plot anchor. */ _define_property(this, "lift", 0.2), _define_property(this, "emitters", /* @__PURE__ */ new Map());
    }
}
_define_property(PlayFx, "scriptName", "farmFx");
var FARM_SCRIPTS = [
    Sway,
    Pop,
    DoorOnSelect,
    Lamp,
    PlayFx
];

export { DoorOnSelect, FARM_SCRIPTS, Lamp, PlayFx, Pop, Sway };
