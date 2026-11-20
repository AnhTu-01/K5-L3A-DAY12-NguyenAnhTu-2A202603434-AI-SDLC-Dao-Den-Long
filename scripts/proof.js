// Sinh bằng chứng Phase 2: chạy từng kịch bản qua CHẾ ĐỘ HEADLESS THẬT (CLI), lưu scenario/inputs/output
// và kết quả kiểm tra vào docs/proof/phase2/. Không sửa tay các file này; chạy lại bằng `npm run proof`.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import { cases } from '../tests/cases.js';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const dir = path.join(root, 'docs', 'proof', 'phase2');
// Chỉ xóa phần tự sinh; GUI.md và ảnh chụp là ghi chú tay (chơi thử thật) nên giữ nguyên.
for (const sub of ['scenarios', 'inputs', 'outputs']) { fs.rmSync(path.join(dir, sub), { recursive: true, force: true }); fs.mkdirSync(path.join(dir, sub), { recursive: true }); }
fs.mkdirSync(dir, { recursive: true });
fs.rmSync(path.join(dir, 'RESULTS.md'), { force: true });

const gitHead = spawnSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: root, encoding: 'utf8' }).stdout.trim() || '(chưa commit)';
const rows = [];
let failed = 0;

function run(c) {
  const args = ['src/headless.js', '--seed', String(c.seed), '--night', String(c.night || 1), '--ticks', String(c.ticks), '--out', path.join(dir, 'outputs', c.name + '.jsonl')];
  if (c.every) args.push('--snapshot-every', String(c.every));
  if (c.scenario) { const f = path.join(dir, 'scenarios', c.name + '.json'); fs.writeFileSync(f, JSON.stringify(c.scenario, null, 2) + '\n'); args.push('--scenario', f); }
  if (c.inputs) { const f = path.join(dir, 'inputs', c.name + '.json'); fs.writeFileSync(f, JSON.stringify(c.inputs, null, 2) + '\n'); args.push('--inputs', f); }
  const r = spawnSync('node', args, { cwd: root, encoding: 'utf8' });
  const outFile = path.join(dir, 'outputs', c.name + '.jsonl');
  const lines = fs.existsSync(outFile) ? fs.readFileSync(outFile, 'utf8').trim().split('\n').map((l) => JSON.parse(l)) : [];
  return { status: r.status, lines, outFile };
}

for (const c of cases) {
  const r = run(c);
  let v = { ok: false, detail: 'headless thoát với mã ' + r.status };
  if (r.status === 0) v = c.check(r.lines);
  if (!v.ok) failed++;
  rows.push({ c, v });
}

// Kiểm tra tính tất định bằng băm SHA-256 của hai lần chạy
const det = cases.find((x) => x.name === 'random_world_night1');
const hashes = [0, 1].map((i) => {
  const out = path.join(os.tmpdir(), `det-${i}.jsonl`);
  const f = path.join(dir, 'inputs', 'determinism.json');
  fs.writeFileSync(f, JSON.stringify({ frames: [{ tick: 0, move: [1, 1] }, { tick: 500, move: [-1, 0], interact: true }] }, null, 2) + '\n');
  spawnSync('node', ['src/headless.js', '--seed', '7', '--night', '1', '--ticks', '3000', '--inputs', f, '--out', out], { cwd: root });
  return crypto.createHash('sha256').update(fs.readFileSync(out)).digest('hex');
});
const detOk = hashes[0] === hashes[1];
if (!detOk) failed++;

// Các mã thoát lỗi
const badFile = path.join(os.tmpdir(), 'bad-inputs.json');
fs.writeFileSync(badFile, JSON.stringify({ frames: [{ tick: 5 }, { tick: 5 }] }));
const rc = spawnSync('node', ['src/headless.js', '--seed', '1', '--night', '1', '--ticks', '5', '--inputs', badFile, '--out', path.join(os.tmpdir(), 'x.jsonl')], { cwd: root, encoding: 'utf8' });
const exitOk = rc.status === 2;
if (!exitOk) failed++;

const md = [];
md.push('# Bằng chứng Phase 2 (Contract v1.1) (tự sinh, không sửa tay)');
md.push('');
md.push(`- Sinh bởi: \`npm run proof\` (scripts/proof.js)`);
md.push(`- Commit lúc sinh: \`${gitHead}\` · Node ${process.version} · ${os.platform()} ${os.arch()}`);
md.push(`- Mỗi dòng dưới đây chạy **chế độ headless thật** (\`node src/headless.js ...\`); scenario, inputs và output nằm cạnh trong \`scenarios/\`, \`inputs/\`, \`outputs/\`.`);
md.push('');
md.push('| # | Yêu cầu | Kịch bản | Kết quả | Chi tiết đo được |');
md.push('|---|---|---|---|---|');
rows.forEach(({ c, v }, i) => md.push(`| ${i + 1} | ${c.req} | \`${c.name}\` (seed ${c.seed}, ${c.ticks} tick) | ${v.ok ? 'ĐẠT' : '**CHƯA ĐẠT**'} | ${String(v.detail).replace(/\|/g, '\\|')} |`));
md.push(`| ${rows.length + 1} | Tất định: cùng seed + scenario + inputs → output giống hệt | seed 7, 3000 tick, chạy 2 lần | ${detOk ? 'ĐẠT' : '**CHƯA ĐẠT**'} | SHA-256 lần 1 = \`${hashes[0].slice(0, 16)}…\`, lần 2 = \`${hashes[1].slice(0, 16)}…\` |`);
md.push(`| ${rows.length + 2} | File inputs sai định dạng → mã thoát 2 | frames trùng tick | ${exitOk ? 'ĐẠT' : '**CHƯA ĐẠT**'} | mã thoát = ${rc.status}, stderr: ${(rc.stderr || '').trim().replace(/\|/g, '\\|')} |`);
md.push('');
md.push('## Chưa đạt / chưa kiểm chứng được');
md.push('');
md.push(failed ? `Có ${failed} mục chưa đạt ở bảng trên (xem cột Kết quả).` : '- Không có mục headless nào chưa đạt ở lần chạy này.');
md.push('- Phần hiển thị 3D, HUD và cảm giác chơi **không** kiểm bằng headless: xem `docs/proof/phase2/GUI.md` (ghi chú chơi thử) để biết mục nào đã/chưa kiểm.');
md.push('');
fs.writeFileSync(path.join(dir, 'RESULTS.md'), md.join('\n'));
console.log(md.slice(5, 5 + rows.length + 5).join('\n'));
console.log(failed ? `\n${failed} MỤC CHƯA ĐẠT` : '\nTẤT CẢ ĐẠT');
process.exit(failed ? 1 : 0);
