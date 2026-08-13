/**
 * Guards the difficulty curve committed in src/game/levels.ts.
 *
 * Levels used to drift into "needs 414 cells cleared in 6 moves" territory,
 * which no player could ever finish. This script plays every level with the
 * simulator and fails the run if any level is unwinnable, dead-ends too often,
 * or is so trivial it is not worth playing.
 *
 *   npm run levels:validate              quick pass
 *   npm run levels:validate -- --thorough   more trials, less noise
 */
import { setSeed, winRate } from './sim/engine';
import { LEVELS } from '../src/game/levels';

/** A level the bot wins less often than this is treated as unbeatable. */
const MIN_WIN = 0.15;
/** Past this, the level is a formality — fine early, suspicious later. */
const MAX_WIN = 0.995;
const TRIVIAL_AFTER_LEVEL = 20;
/** Boards that run out of legal moves this often are badly configured. */
const MAX_STUCK = 0.1;

interface Row {
  lvl: number;
  name: string;
  rate: number;
  stuck: number;
  needed: number;
  cells: number;
}

function main() {
  const thorough = process.argv.includes('--thorough');
  const trials = thorough ? 60 : 25;
  setSeed(4242);

  console.log(`Validating ${LEVELS.length} levels — ${trials} simulated playthroughs each…\n`);

  const rows: Row[] = [];
  for (const level of LEVELS) {
    const { rate, stuckRate } = winRate(level, trials);
    rows.push({
      lvl: level.level,
      name: level.name,
      rate,
      stuck: stuckRate,
      needed: Object.values(level.targets).reduce((a, b) => a + (b ?? 0), 0),
      cells: level.rows * level.cols,
    });
    if (level.level % 20 === 0) process.stdout.write(`  …${level.level}/${LEVELS.length}\n`);
  }

  const failures: string[] = [];
  for (const r of rows) {
    if (r.rate < MIN_WIN) {
      failures.push(`level ${r.lvl} "${r.name}": win-rate ${(r.rate * 100).toFixed(0)}% is below the ${MIN_WIN * 100}% floor — needs ${r.needed} cells cleared on a ${r.cells}-cell board`);
    }
    if (r.stuck > MAX_STUCK) {
      failures.push(`level ${r.lvl} "${r.name}": board dead-ends in ${(r.stuck * 100).toFixed(0)}% of runs`);
    }
    if (r.lvl > TRIVIAL_AFTER_LEVEL && r.rate > MAX_WIN) {
      failures.push(`level ${r.lvl} "${r.name}": win-rate ${(r.rate * 100).toFixed(0)}% — too trivial for this point in the campaign`);
    }
  }

  // The curve should trend downward: late levels must not be easier than early ones.
  const avg = (xs: Row[]) => xs.reduce((a, r) => a + r.rate, 0) / Math.max(1, xs.length);
  const firstQuarter = avg(rows.slice(0, 40));
  const lastQuarter = avg(rows.slice(-40));
  if (lastQuarter > firstQuarter) {
    failures.push(`curve inverted: last 40 levels average ${(lastQuarter * 100).toFixed(0)}% vs ${(firstQuarter * 100).toFixed(0)}% for the first 40`);
  }

  console.log('\nband        | levels | avg win-rate');
  for (let start = 0; start < rows.length; start += 40) {
    const chunk = rows.slice(start, start + 40);
    console.log(
      `${String(start + 1).padStart(3)}–${String(start + chunk.length).padEnd(3)}     |   ${String(chunk.length).padStart(3)}  |   ${(avg(chunk) * 100).toFixed(0)}%`
    );
  }

  const hardest = [...rows].sort((a, b) => a.rate - b.rate).slice(0, 5);
  console.log('\ntoughest levels:');
  for (const r of hardest) {
    console.log(`  ${String(r.lvl).padStart(3)} "${r.name}" — ${(r.rate * 100).toFixed(0)}%`);
  }

  if (failures.length > 0) {
    console.error(`\n✗ ${failures.length} problem(s):`);
    for (const f of failures) console.error('  - ' + f);
    process.exit(1);
  }
  console.log('\n✓ every level is winnable and the curve trends the right way');
}

main();
