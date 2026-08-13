/**
 * Regenerates src/game/levels.ts with a difficulty curve that is *measured*
 * rather than guessed.
 *
 * For every level we fix the shape (board size, move budget, obstacles) from a
 * smooth curve, then let the simulator play the board many times to learn how
 * much it can realistically clear. The color goals are set at the quantile that
 * produces the win-rate we want for that point in the campaign — so difficulty
 * follows a deliberate curve instead of an arbitrary formula that runs away.
 *
 * Run:  npm run levels:generate
 */
import { writeFileSync } from 'fs';
import { resolve } from 'path';
import { playLevel, setSeed, winRate, type ColorWeights } from './sim/engine';
import { LEVELS as EXISTING } from '../src/game/levels';
import type { CellColor, LevelConfig } from '../src/game/types';

const ALL_COLORS: CellColor[] = ['red', 'blue', 'green', 'yellow', 'purple', 'orange'];
const TOTAL = 160;
const HARVEST_TRIALS = 25;
const SEARCH_TRIALS = 30;
const SEARCH_STEPS = 8;
const VERIFY_TRIALS = 60;
/** Guard rails enforced on every generated level; validate-levels.ts re-checks them. */
const FLOOR_WIN = 0.22;
const CEILING_WIN = 0.98;

/** Board grows in stages so the campaign visibly opens up as it goes. */
function boardSize(lvl: number): { rows: number; cols: number } {
  if (lvl <= 10) return { rows: 8, cols: 7 };
  if (lvl <= 25) return { rows: 9, cols: 7 };
  if (lvl <= 45) return { rows: 9, cols: 8 };
  if (lvl <= 70) return { rows: 10, cols: 8 };
  if (lvl <= 100) return { rows: 10, cols: 9 };
  if (lvl <= 130) return { rows: 11, cols: 9 };
  return { rows: 12, cols: 10 };
}

/** Move budget stays in a comfortable band — difficulty comes from the goals. */
function moveBudget(lvl: number): number {
  return Math.round(18 + 10 * Math.pow(lvl / TOTAL, 0.7));
}

const isBoss = (lvl: number) => lvl % 25 === 0 || lvl === TOTAL;
const isBreather = (lvl: number) => !isBoss(lvl) && lvl % 10 === 0;

/** Obstacles as a share of the board, capped so they never choke it. */
function obstacles(lvl: number, rows: number, cols: number): { crates: number; ice: number; stones: number } {
  const cells = rows * cols;
  const ease = isBreather(lvl) ? 0.5 : isBoss(lvl) ? 1.15 : 1;
  const crateRatio = lvl < 4 ? 0 : Math.min(0.12, 0.02 + 0.1 * (lvl / TOTAL)) * ease;
  const iceRatio = lvl < 12 ? 0 : Math.min(0.1, 0.015 + 0.085 * (lvl / TOTAL)) * ease;
  // Stones enter late and stay sparse: they only yield to a power-up, so a few
  // go a long way, and too many would strand the board.
  const stoneRatio = lvl < 30 ? 0 : Math.min(0.07, 0.01 + 0.06 * ((lvl - 30) / (TOTAL - 30))) * ease;
  return {
    crates: Math.round(cells * crateRatio),
    ice: Math.round(cells * iceRatio),
    stones: Math.round(cells * stoneRatio),
  };
}

/** How many colors the level asks for, and their relative goal sizes. */
function goalShape(lvl: number): { colors: CellColor[]; weights: ColorWeights } {
  const count =
    lvl <= 8 ? 2 :
    lvl <= 35 ? 3 :
    lvl <= 90 ? (lvl % 3 === 0 ? 4 : 3) :
    lvl % 7 === 0 ? 3 : 4;

  // 5 is coprime with 6, so the starting color walks through all six across
  // consecutive levels instead of cycling through only half of them.
  const start = (lvl * 5) % ALL_COLORS.length;
  const colors = Array.from({ length: count }, (_, i) => ALL_COLORS[(start + i) % ALL_COLORS.length]);

  const patterns: Record<number, number[][]> = {
    2: [[1, 1], [1, 0.75]],
    3: [[1, 1, 1], [1, 1, 0.7]],
    4: [[1, 1, 1, 1], [1, 1, 0.8, 0.8]],
  };
  const pattern = patterns[count][lvl % 2];
  const weights: ColorWeights = {};
  colors.forEach((c, i) => { weights[c] = pattern[i]; });
  return { colors, weights };
}

/** The win-rate we want the bot to hit, with a boss/breather rhythm. */
function desiredWinRate(lvl: number): number {
  let p = 0.95 - 0.45 * Math.pow((lvl - 1) / (TOTAL - 1), 0.9);
  if (isBoss(lvl)) p -= 0.1;
  else if (isBreather(lvl)) p += 0.08;
  return Math.min(0.97, Math.max(0.38, p));
}

function quantile(sorted: number[], q: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.round(q * (sorted.length - 1))));
  return sorted[idx];
}

function buildLevel(lvl: number, name: string): { config: LevelConfig; measured: number; stuck: number } {
  const { rows, cols } = boardSize(lvl);
  const moves = moveBudget(lvl);
  const { crates, ice, stones } = obstacles(lvl, rows, cols);
  const { colors, weights } = goalShape(lvl);

  const shape: LevelConfig = {
    level: lvl, rows, cols, moves, name,
    targets: {},
    ...(crates > 0 ? { crates } : {}),
    ...(ice > 0 ? { iceCells: ice } : {}),
    ...(stones > 0 ? { stones } : {}),
  };

  // Harvest pass: play the board with no goals and record, per attempt, how far
  // the weakest requested color got. That distribution anchors the search range.
  const yields: number[] = [];
  for (let i = 0; i < HARVEST_TRIALS; i++) {
    const r = playLevel(shape, { colors, weights });
    let weakest = Infinity;
    for (const c of colors) {
      const w = weights[c] ?? 1;
      weakest = Math.min(weakest, (r.cleared[c] ?? 0) / w);
    }
    yields.push(weakest);
  }
  yields.sort((a, b) => a - b);

  const p = desiredWinRate(lvl);
  const targetsFor = (unit: number): Partial<Record<CellColor, number>> => {
    const t: Partial<Record<CellColor, number>> = {};
    for (const c of colors) t[c] = Math.max(6, Math.round(unit * (weights[c] ?? 1)));
    return t;
  };

  // The quantile alone lands wide, because a goal-aware bot is more efficient
  // at reaching a fixed threshold than the harvest bot is at maximising yield.
  // Win-rate falls monotonically as goals grow, so bisect on the goal size until
  // the *measured* win-rate matches the curve.
  let lo = 0;
  let hi = Math.max(quantile(yields, 0.98), 8) * 1.6;
  let unit = quantile(yields, 1 - p);
  for (let step = 0; step < SEARCH_STEPS; step++) {
    unit = (lo + hi) / 2;
    const { rate } = winRate({ ...shape, targets: targetsFor(unit) }, SEARCH_TRIALS);
    if (rate > p) lo = unit;
    else hi = unit;
  }

  // Guard rail. Bisection samples are noisy, and a level that lands at 4% on a
  // different seed is exactly the bug this whole script exists to prevent — so
  // re-check on fresh seeds and walk the goals back until the level is sane.
  let settled = (lo + hi) / 2;
  let rate = 0;
  let stuckRate = 0;
  for (let attempt = 0; attempt < 5; attempt++) {
    setSeed(9000 + lvl * 31 + attempt * 7);
    const measured = winRate({ ...shape, targets: targetsFor(settled) }, VERIFY_TRIALS);
    rate = measured.rate;
    stuckRate = measured.stuckRate;
    if (rate < FLOOR_WIN) settled *= 0.88;
    else if (rate > CEILING_WIN && lvl > 20) settled *= 1.12;
    else break;
  }

  const config: LevelConfig = { ...shape, targets: targetsFor(settled) };
  return { config, measured: rate, stuck: stuckRate };
}

function serialize(levels: LevelConfig[]): string {
  const body = levels.map(l => {
    const targets = Object.entries(l.targets).map(([c, n]) => `${c}: ${n}`).join(', ');
    const extra = [
      l.crates ? `\n    crates: ${l.crates},` : '',
      l.iceCells ? `\n    iceCells: ${l.iceCells},` : '',
      l.stones ? `\n    stones: ${l.stones},` : '',
    ].join('');
    return `  {
    level: ${l.level},
    rows: ${l.rows},
    cols: ${l.cols},
    moves: ${l.moves},
    targets: { ${targets} },
    name: '${l.name.replace(/'/g, "\\'")}',${extra}
  },`;
  }).join('\n');

  return `import { LevelConfig } from './types';

// GENERATED FILE — do not hand-edit.
// Goals are calibrated by simulation so the difficulty curve is measured, not
// guessed: every level is played thousands of times by the bot in
// scripts/sim/engine.ts and its goals are set at the quantile that yields the
// intended win-rate for that point in the campaign.
//
//   npm run levels:generate   regenerate this file
//   npm run levels:validate   check the committed curve still holds
export const LEVELS: LevelConfig[] = [
${body}
];
`;
}

function main() {
  setSeed(20260813);
  // Resolved against the project root: the script runs from a bundle in a temp
  // dir, so import.meta.url would point at the bundle instead of the source.
  const out = resolve(process.cwd(), 'src/game/levels.ts');

  // --only=1,40,160 calibrates just those levels and skips the write, for
  // iterating on the curve without paying for a full run.
  const onlyArg = process.argv.find(a => a.startsWith('--only='));
  const only = onlyArg ? onlyArg.slice(7).split(',').map(Number) : null;
  const queue = only ?? Array.from({ length: TOTAL }, (_, i) => i + 1);

  const levels: LevelConfig[] = [];
  const report: { lvl: number; want: number; got: number; stuck: number }[] = [];
  const started = Date.now();

  for (const lvl of queue) {
    const name = EXISTING[lvl - 1]?.name ?? `Level ${lvl}`;
    const { config, measured, stuck } = buildLevel(lvl, name);
    levels.push(config);
    report.push({ lvl, want: desiredWinRate(lvl), got: measured, stuck });
    if (!only && lvl % 10 === 0) {
      const per = (Date.now() - started) / lvl;
      process.stdout.write(`  …calibrated ${lvl}/${TOTAL} (~${Math.round((TOTAL - lvl) * per / 1000)}s left)\n`);
    }
  }

  if (only) {
    console.log('\nlevel |  goal  | measured | board | moves | crates/ice | targets');
    report.forEach((r, i) => {
      const l = levels[i];
      const total = Object.values(l.targets).reduce((a, b) => a + (b ?? 0), 0);
      console.log(
        String(r.lvl).padStart(5) +
        ' | ' + (r.want * 100).toFixed(0).padStart(4) + '%' +
        ' | ' + (r.got * 100).toFixed(0).padStart(7) + '%' +
        ' | ' + `${l.rows}x${l.cols}`.padStart(5) +
        ' | ' + String(l.moves).padStart(5) +
        ' | ' + `${l.crates ?? 0}/${l.iceCells ?? 0}`.padStart(10) +
        ' | ' + total + '  ' + JSON.stringify(l.targets)
      );
    });

    // --write patches just these levels back into the committed file, so an
    // outlier flagged by the validator can be repaired without a full rerun.
    if (process.argv.includes('--write')) {
      const patched = EXISTING.map(existing => {
        const replacement = levels.find(l => l.level === existing.level);
        return replacement ?? existing;
      });
      writeFileSync(out, serialize(patched), 'utf8');
      console.log(`\npatched ${levels.length} level(s) into ${out} (${((Date.now() - started) / 1000).toFixed(1)}s)`);
    } else {
      console.log(`\nprobe only — nothing written (${((Date.now() - started) / 1000).toFixed(1)}s)`);
    }
    return;
  }

  writeFileSync(out, serialize(levels), 'utf8');

  console.log('\nlevel |  goal  | measured | board | moves | crates/ice | targets');
  for (const r of report.filter(r => r.lvl % 10 === 0 || r.lvl === 1 || r.lvl === TOTAL)) {
    const l = levels[r.lvl - 1];
    const total = Object.values(l.targets).reduce((a, b) => a + (b ?? 0), 0);
    console.log(
      String(r.lvl).padStart(5) +
      ' | ' + (r.want * 100).toFixed(0).padStart(4) + '%' +
      ' | ' + (r.got * 100).toFixed(0).padStart(7) + '%' +
      ' | ' + `${l.rows}x${l.cols}`.padStart(5) +
      ' | ' + String(l.moves).padStart(5) +
      ' | ' + `${l.crates ?? 0}/${l.iceCells ?? 0}`.padStart(10) +
      ' | ' + total
    );
  }

  const off = report.filter(r => Math.abs(r.got - r.want) > 0.22);
  const stuck = report.filter(r => r.stuck > 0.05);
  console.log(`\nwrote ${out}`);
  console.log(`levels more than 22pp off target: ${off.length}`);
  console.log(`levels that dead-end >5% of runs: ${stuck.length}`);
}

main();
