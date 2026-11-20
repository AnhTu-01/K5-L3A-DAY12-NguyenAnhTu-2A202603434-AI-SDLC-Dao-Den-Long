import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

export const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ddl-'));

export function runHeadless({ seed, ticks, scenario, inputs, every, extra = [] }) {
  const out = path.join(tmp, `out-${Math.random().toString(36).slice(2)}.jsonl`);
  const args = ['src/headless.js', '--seed', String(seed), '--night', '1', '--ticks', String(ticks), '--out', out];
  if (scenario) { const f = path.join(tmp, 'sc-' + Math.random().toString(36).slice(2) + '.json'); fs.writeFileSync(f, JSON.stringify(scenario)); args.push('--scenario', f); }
  if (inputs) { const f = path.join(tmp, 'in-' + Math.random().toString(36).slice(2) + '.json'); fs.writeFileSync(f, JSON.stringify(inputs)); args.push('--inputs', f); }
  if (every) args.push('--snapshot-every', String(every));
  args.push(...extra);
  const r = spawnSync('node', args, { cwd: root, encoding: 'utf8' });
  const lines = fs.existsSync(out) ? fs.readFileSync(out, 'utf8').trim().split('\n').map((l) => JSON.parse(l)) : [];
  return { status: r.status, stderr: r.stderr, lines, raw: fs.existsSync(out) ? fs.readFileSync(out, 'utf8') : '' };
}

