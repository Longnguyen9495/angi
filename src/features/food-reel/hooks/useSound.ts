import { useCallback, useEffect, useRef } from 'react';

/**
 * Tiny synthesized sound kit (no audio files): a soft "air" whoosh at spin
 * start, ticks as items pass, a warm chime on the winner. Silent unless the
 * user turned sound on; the AudioContext is created on first user gesture.
 */
export function useSound(enabled: boolean) {
  const ctxRef = useRef<AudioContext | null>(null);
  const lastTick = useRef(0);

  const ctx = useCallback((): AudioContext | null => {
    if (!enabled) return null;
    const AC =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    if (!ctxRef.current) ctxRef.current = new AC();
    if (ctxRef.current.state === 'suspended') void ctxRef.current.resume();
    return ctxRef.current;
  }, [enabled]);

  useEffect(
    () => () => {
      void ctxRef.current?.close();
      ctxRef.current = null;
    },
    [],
  );

  const tone = useCallback(
    (freq: number, dur: number, gain: number, type: OscillatorType = 'sine') => {
      const c = ctx();
      if (!c) return;
      const t = c.currentTime;
      const osc = c.createOscillator();
      const g = c.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, t);
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(gain, t + 0.005);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      osc.connect(g).connect(c.destination);
      osc.start(t);
      osc.stop(t + dur + 0.02);
    },
    [ctx],
  );

  const whoosh = useCallback(() => {
    const c = ctx();
    if (!c) return;
    const len = Math.floor(c.sampleRate * 0.6);
    const buf = c.createBuffer(1, len, c.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = c.createBufferSource();
    src.buffer = buf;
    const filter = c.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(400, c.currentTime);
    filter.frequency.exponentialRampToValueAtTime(1800, c.currentTime + 0.5);
    const g = c.createGain();
    g.gain.setValueAtTime(0.05, c.currentTime);
    src.connect(filter).connect(g).connect(c.destination);
    src.start();
  }, [ctx]);

  /** Rate-limited so a fast spin never turns into noise. */
  const tick = useCallback(
    (speed: number) => {
      const now = performance.now();
      if (now - lastTick.current < 45) return;
      lastTick.current = now;
      tone(1200 + Math.min(speed, 60) * 12, 0.03, 0.025, 'triangle');
    },
    [tone],
  );

  const chime = useCallback(() => {
    tone(660, 0.5, 0.05);
    setTimeout(() => tone(990, 0.6, 0.035), 90);
  }, [tone]);

  return { whoosh, tick, chime };
}
