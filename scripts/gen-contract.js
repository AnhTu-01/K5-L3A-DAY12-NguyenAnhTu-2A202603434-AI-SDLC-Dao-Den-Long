// Sinh game.contract.json từ src/tuning.js để hai nơi không lệch nhau.
import fs from 'node:fs';
import { TUNING } from '../src/tuning.js';
const contract = {
  contract_version: '1.1',
  team: '2A202603434-nguyen-anh-tu',
  build_cmd: 'npm install',
  run_cmd: 'npm start',
  headless_cmd: 'node src/headless.js',
  tuning: TUNING,
};
fs.writeFileSync(new URL('../game.contract.json', import.meta.url), JSON.stringify(contract, null, 2) + '\n');
