// Chạy game: node server.js            → mở http://localhost:8080
//            node server.js --export-leaderboard out.json   → xuất bảng xếp hạng {"entries":[...]} rồi thoát
import { exec } from 'node:child_process';
import { createAppServer } from './server-lib.js';
import { exportTo } from './src/leaderboard.js';

const argv = process.argv.slice(2);
const ei = argv.indexOf('--export-leaderboard');
if (ei >= 0) {
  const out = argv[ei + 1];
  if (!out || out.startsWith('--')) { console.error('thiếu đường dẫn sau --export-leaderboard'); process.exit(1); }
  try { exportTo(out); } catch (e) { console.error('không ghi được ' + out + ': ' + e.message); process.exit(1); }
  process.exit(0);
}

const PORT = Number(process.env.PORT) || 8080;
createAppServer().listen(PORT, () => {
  const url = `http://localhost:${PORT}`;
  console.log(`Đảo Đèn Lồng đang chạy: ${url}  (Ctrl+C để dừng)`);
  if (process.env.NO_OPEN !== '1') {
    const cmd = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start' : 'xdg-open';
    exec(`${cmd} ${url}`, () => {});
  }
});
