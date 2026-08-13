import { getSettings } from './settings';

/**
 * Touch feedback via the Vibration API, which Android's WebView exposes
 * directly — no native plugin needed, just the VIBRATE permission in the
 * manifest. Silently absent on desktop and iOS Safari, which is fine: haptics
 * are a bonus, never load-bearing.
 */
const canVibrate = () =>
  typeof navigator !== 'undefined' &&
  typeof navigator.vibrate === 'function' &&
  getSettings().vibration;

function buzz(pattern: number | number[]): void {
  if (!canVibrate()) return;
  try {
    navigator.vibrate(pattern);
  } catch {
    // some WebViews throw when vibration is blocked by policy
  }
}

/** Light tick for an ordinary match — scales a little with the group size. */
export function hapticBlast(cellsCleared: number): void {
  buzz(cellsCleared >= 6 ? 18 : cellsCleared >= 4 ? 12 : 8);
}

/** Firmer thump when a rocket / bomb / disco goes off. */
export function hapticPowerUp(): void {
  buzz(28);
}

/** Double pulse for a power-up combo — the biggest moment in a level. */
export function hapticCombo(): void {
  buzz([0, 22, 45, 35]);
}

/** Celebratory rise on a win. */
export function hapticWin(): void {
  buzz([0, 30, 60, 30, 60, 70]);
}

/** Short, flat buzz on a loss. */
export function hapticLose(): void {
  buzz([0, 55, 70, 55]);
}

/** Crisp tap for menu buttons and boosters. */
export function hapticTap(): void {
  buzz(10);
}
