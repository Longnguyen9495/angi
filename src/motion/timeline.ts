export interface TimelineStep {
  at: number;
  run: () => void;
}

export interface Timeline {
  /** Stop pending steps without running them (unmount / state change). */
  cancel: () => void;
  /** Run every remaining step immediately (skip button, reduced motion). */
  finish: () => void;
  readonly done: boolean;
}

/**
 * Tiny sequencer: JS decides *when* each visual step starts, CSS does the
 * interpolation. Every timer is tracked so cancel/finish leave nothing behind.
 */
export function createTimeline(steps: TimelineStep[], onDone?: () => void): Timeline {
  const ordered = [...steps].sort((a, b) => a.at - b.at);
  const timers = new Set<ReturnType<typeof setTimeout>>();
  const ran = new Set<TimelineStep>();
  let done = false;

  const complete = () => {
    if (done) return;
    done = true;
    onDone?.();
  };

  const runStep = (step: TimelineStep) => {
    if (ran.has(step) || done) return;
    ran.add(step);
    step.run();
    if (ran.size === ordered.length) complete();
  };

  for (const step of ordered) {
    const t = setTimeout(() => {
      timers.delete(t);
      runStep(step);
    }, step.at);
    timers.add(t);
  }
  if (ordered.length === 0) complete();

  const clear = () => {
    timers.forEach((t) => clearTimeout(t));
    timers.clear();
  };

  return {
    cancel() {
      clear();
      done = true;
    },
    finish() {
      clear();
      for (const step of ordered) runStep(step);
      complete();
    },
    get done() {
      return done;
    },
  };
}
