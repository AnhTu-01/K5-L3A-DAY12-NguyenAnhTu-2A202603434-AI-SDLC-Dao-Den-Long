#!/usr/bin/env node
// Đóng gói bản chạy được cho GitHub Release: dist/dao-den-long-v1.0.0.zip (cần Node 22+, giải nén rồi `node server.js`).
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const version = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')).version;
const name = `dao-den-long-v${version}`;
const stage = path.join(root, 'dist', name);
fs.rmSync(path.join(root, 'dist'), { recursive: true, force: true });
fs.mkdirSync(path.join(stage, 'node_modules', 'three', 'build'), { recursive: true });
for (const d of ['src', 'web', 'scripts']) fs.cpSync(path.join(root, d), path.join(stage, d), { recursive: true });
for (const f of ['server.js', 'server-lib.js', 'package.json', 'game.contract.json', 'README.md', 'CHANGELOG.md', 'CREDITS.md', 'LICENSE']) fs.copyFileSync(path.join(root, f), path.join(stage, f));
fs.copyFileSync(path.join(root, 'node_modules', 'three', 'build', 'three.module.js'), path.join(stage, 'node_modules', 'three', 'build', 'three.module.js'));
fs.copyFileSync(path.join(root, 'node_modules', 'three', 'LICENSE'), path.join(stage, 'node_modules', 'three', 'LICENSE'));
fs.writeFileSync(path.join(stage, 'CHAY-GAME.txt'), `Đảo Đèn Lồng v${version}\n\nCần Node.js 22 trở lên (https://nodejs.org).\n  1. Giải nén thư mục này\n  2. Mở Terminal tại thư mục: node server.js\n  3. Trình duyệt tự mở http://localhost:8080 (đặt NO_OPEN=1 để không tự mở)\n\nKhông cần npm install: three.js đã kèm sẵn. Bảng xếp hạng lưu ở data/leaderboard.json.\n`);
const zip = path.join(root, 'dist', name + '.zip');
const r = spawnSync('zip', ['-qr', zip, name], { cwd: path.join(root, 'dist'), stdio: 'inherit' });
if (r.status !== 0) { console.error('cần lệnh zip'); process.exit(1); }
console.log(zip);
