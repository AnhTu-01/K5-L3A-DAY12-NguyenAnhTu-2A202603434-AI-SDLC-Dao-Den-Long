#!/usr/bin/env node
// Chế độ headless theo Test Contract v1.0
// node src/headless.js --seed <int> --night 1 [--scenario f.json] [--inputs f.json]
//                      --ticks <int> --out f.jsonl [--snapshot-every <int>]
import fs from 'node:fs';
import { createGame, step, snapshot, validateInputs, newInputState, applyFrame, ScenarioError } from './sim.js';

function fail(code, msg) {
  process.stderr.write(msg + '\n');
  process.exit(code);
}

function parseArgs(argv) {
  const a = {};
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i];
    if (!k.startsWith('--')) fail(1, 'tham số lạ: ' + k);
    const key = k.slice(2);
    const val = argv[i + 1];
    if (val === undefined || val.startsWith('--')) fail(1, 'thiếu giá trị cho ' + k);
    a[key] = val;
    i++;
  }
  return a;
}

function intArg(a, name, def, min) {
  const raw = a[name];
  if (raw === undefined) {
    if (def === undefined) fail(1, `thiếu --${name}`);
    return def;
  }
  if (!/^-?\d+$/.test(raw)) fail(1, `--${name} phải là số nguyên`);
  const v = Number(raw);
  if (v < min) fail(1, `--${name} phải >= ${min}`);
  return v;
}

function readJson(path, what) {
  let text;
  try { text = fs.readFileSync(path, 'utf8'); } catch (e) { fail(2, `không đọc được ${what} ${path}: ${e.message}`); }
  try { return JSON.parse(text); } catch (e) { fail(2, `${what} ${path} không phải JSON hợp lệ: ${e.message}`); }
}

const args = parseArgs(process.argv.slice(2));
const seed = intArg(args, 'seed', 1, -2147483648);
const night = intArg(args, 'night', 1, 1);
if (night !== 1) fail(1, 'Phase 1 chỉ có --night 1');
const ticks = intArg(args, 'ticks', undefined, 0);
const every = intArg(args, 'snapshot-every', 10, 1);
if (!args.out) fail(1, 'thiếu --out');

let scenario = null, frames = [];
if (args.scenario) scenario = readJson(args.scenario, 'scenario');
if (args.inputs) {
  const inp = readJson(args.inputs, 'inputs');
  try { validateInputs(inp); } catch (e) { fail(2, e.message); }
  frames = inp.frames;
}

let game;
try { game = createGame({ seed, scenario }); } catch (e) {
  if (e instanceof ScenarioError) fail(2, e.message);
  throw e;
}

const lines = [JSON.stringify(snapshot(game))];
const input = newInputState();
let fi = 0;
let lastSnapTick = 0;
for (let k = 0; k < ticks && game.state === 'playing'; k++) {
  while (fi < frames.length && frames[fi].tick <= k) { applyFrame(input, frames[fi]); fi++; }
  const events = step(game, input);
  for (const e of events) lines.push(JSON.stringify(e));
  if (game.sim_tick % every === 0) { lines.push(JSON.stringify(snapshot(game))); lastSnapTick = game.sim_tick; }
}
if (game.sim_tick !== lastSnapTick) lines.push(JSON.stringify(snapshot(game)));
lines.push(JSON.stringify({ type: 'end', ticks: game.sim_tick, state: game.state, score: game.score }));
try { fs.writeFileSync(args.out, lines.join('\n') + '\n'); } catch (e) { fail(1, 'không ghi được --out: ' + e.message); }
