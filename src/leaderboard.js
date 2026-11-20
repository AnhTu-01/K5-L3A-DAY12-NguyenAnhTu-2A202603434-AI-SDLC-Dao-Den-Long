// Lưu bảng xếp hạng trên đĩa (Node). Mặc định data/leaderboard.json cạnh repo; đổi bằng biến môi trường DDL_LEADERBOARD.
import fs from 'node:fs';
import path from 'node:path';
import { sanitize, addEntry } from './leaderboard-core.js';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
export const defaultFile = () => process.env.DDL_LEADERBOARD || path.join(root, 'data', 'leaderboard.json');

export function load(file = defaultFile()) {
  try { return sanitize(JSON.parse(fs.readFileSync(file, 'utf8')).entries); } catch (e) { return []; }
}
export function save(entries, file = defaultFile()) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = file + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify({ entries }, null, 2) + '\n');
  fs.renameSync(tmp, file); // ghi nguyên tử: tắt đột ngột không làm hỏng file
}
export function add(entry, file = defaultFile()) {
  const entries = addEntry(load(file), entry);
  save(entries, file);
  return entries;
}
export function exportTo(out, file = defaultFile()) {
  fs.writeFileSync(out, JSON.stringify({ entries: load(file) }, null, 2) + '\n');
}
