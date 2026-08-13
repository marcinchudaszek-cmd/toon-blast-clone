import { getSettings } from './settings';

let ctx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!ctx) ctx = new AudioContext();
  return ctx;
}

function gain(ac: AudioContext, value: number, at: number, end: number): GainNode {
  const g = ac.createGain();
  g.gain.setValueAtTime(value, at);
  g.gain.exponentialRampToValueAtTime(0.001, end);
  return g;
}

function osc(ac: AudioContext, type: OscillatorType, freq: number, start: number, stop: number): OscillatorNode {
  const o = ac.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(freq, start);
  o.start(start);
  o.stop(stop);
  return o;
}

// Short pop when cells blast
export function playPop(count: number) {
  if (!getSettings().sound) return;
  try {
    const ac = getCtx();
    const t = ac.currentTime;
    const freq = 300 + Math.min(count * 40, 400);

    const o = ac.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(freq, t);
    o.frequency.exponentialRampToValueAtTime(freq * 0.4, t + 0.12);

    const g = gain(ac, 0.25, t, t + 0.15);
    o.connect(g);
    g.connect(ac.destination);
    o.start(t);
    o.stop(t + 0.15);
  } catch { /* audio unavailable */ }
}

// Rising arpeggio when a power-up is created
export function playPowerUpCreated(type: 'rocket' | 'bomb' | 'disco') {
  if (!getSettings().sound) return;
  try {
    const ac = getCtx();
    const t = ac.currentTime;
    const notes =
      type === 'disco'  ? [523, 659, 784, 1047] :
      type === 'bomb'   ? [220, 277, 349, 440]  :
                          [349, 440, 523, 659];

    notes.forEach((freq, i) => {
      const start = t + i * 0.07;
      const o = osc(ac, 'triangle', freq, start, start + 0.15);
      const g = gain(ac, 0.18, start, start + 0.18);
      o.connect(g);
      g.connect(ac.destination);
    });
  } catch { /* audio unavailable */ }
}

// Boom when a power-up activates
export function playPowerUpActivate(type: 'rocket' | 'bomb' | 'disco') {
  if (!getSettings().sound) return;
  try {
    const ac = getCtx();
    const t = ac.currentTime;

    if (type === 'rocket') {
      // Whoosh sweep upward
      const o = ac.createOscillator();
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(80, t);
      o.frequency.exponentialRampToValueAtTime(800, t + 0.25);
      const g = gain(ac, 0.2, t, t + 0.3);
      o.connect(g); g.connect(ac.destination);
      o.start(t); o.stop(t + 0.3);
    } else if (type === 'bomb') {
      // Low thud
      const o = ac.createOscillator();
      o.type = 'sine';
      o.frequency.setValueAtTime(120, t);
      o.frequency.exponentialRampToValueAtTime(40, t + 0.3);
      const g = gain(ac, 0.4, t, t + 0.35);
      o.connect(g); g.connect(ac.destination);
      o.start(t); o.stop(t + 0.35);
    } else {
      // Disco shimmer
      [523, 659, 784, 1047, 784, 659].forEach((freq, i) => {
        const s = t + i * 0.04;
        const o = osc(ac, 'sine', freq, s, s + 0.1);
        const g = gain(ac, 0.15, s, s + 0.12);
        o.connect(g); g.connect(ac.destination);
      });
    }
  } catch { /* audio unavailable */ }
}

// Combo sound — escalates with combo count
export function playCombo(combo: number) {
  if (!getSettings().sound) return;
  try {
    const ac = getCtx();
    const t = ac.currentTime;
    const base = 440 * Math.pow(1.2, Math.min(combo - 2, 6));
    const o = osc(ac, 'triangle', base, t, t + 0.2);
    const g = gain(ac, 0.22, t, t + 0.22);
    o.connect(g); g.connect(ac.destination);
  } catch { /* audio unavailable */ }
}

// Victory fanfare
export function playWin() {
  if (!getSettings().sound) return;
  try {
    const ac = getCtx();
    const t = ac.currentTime;
    const melody = [523, 659, 784, 1047, 784, 1047, 1319];
    melody.forEach((freq, i) => {
      const s = t + i * 0.1;
      const o = osc(ac, 'triangle', freq, s, s + 0.18);
      const g = gain(ac, 0.2, s, s + 0.2);
      o.connect(g); g.connect(ac.destination);
    });
  } catch { /* audio unavailable */ }
}

// Lose sound
export function playLose() {
  if (!getSettings().sound) return;
  try {
    const ac = getCtx();
    const t = ac.currentTime;
    [440, 349, 294, 220].forEach((freq, i) => {
      const s = t + i * 0.12;
      const o = osc(ac, 'sawtooth', freq, s, s + 0.2);
      const g = gain(ac, 0.15, s, s + 0.22);
      o.connect(g); g.connect(ac.destination);
    });
  } catch { /* audio unavailable */ }
}
