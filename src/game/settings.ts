const STORAGE_KEY = 'toon-blast-settings';

export interface GameSettings {
  sound: boolean;
  vibration: boolean;
}

const DEFAULT: GameSettings = { sound: true, vibration: true };

/**
 * Settings live outside React state on purpose: the sound and haptics helpers
 * are called from deep inside the reducer, where hooks cannot reach. The module
 * keeps the current values in memory and notifies subscribers on change.
 */
let current: GameSettings = load();
const listeners = new Set<(s: GameSettings) => void>();

function load(): GameSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT };
    const parsed = JSON.parse(raw);
    return {
      sound: typeof parsed?.sound === 'boolean' ? parsed.sound : DEFAULT.sound,
      vibration: typeof parsed?.vibration === 'boolean' ? parsed.vibration : DEFAULT.vibration,
    };
  } catch {
    return { ...DEFAULT };
  }
}

export function getSettings(): GameSettings {
  return current;
}

export function setSettings(patch: Partial<GameSettings>): GameSettings {
  current = { ...current, ...patch };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
  } catch {
    // storage unavailable — keep the in-memory value for this session
  }
  listeners.forEach(fn => fn(current));
  return current;
}

export function subscribeSettings(fn: (s: GameSettings) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
