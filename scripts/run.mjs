/**
 * Tiny TS runner for the maintenance scripts: bundles an entry point with
 * esbuild (already present via Vite) and executes it on Node. Keeps the scripts
 * written in TypeScript so they can import the game logic directly.
 *
 *   node scripts/run.mjs scripts/validate-levels.ts
 */
import { build } from 'esbuild';
import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { pathToFileURL } from 'url';

const entry = process.argv[2];
if (!entry) {
  console.error('usage: node scripts/run.mjs <entry.ts> [args…]');
  process.exit(1);
}

const dir = mkdtempSync(join(tmpdir(), 'toonblast-script-'));
const outfile = join(dir, 'bundle.mjs');
const cleanup = () => rmSync(dir, { recursive: true, force: true });
process.on('exit', cleanup);

await build({
  entryPoints: [entry],
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node20',
  outfile,
  logLevel: 'error',
});

await import(pathToFileURL(outfile).href);
