// Logic thuần của bảng xếp hạng (TICKET-04 §3) — dùng chung cho máy chủ Node và trình duyệt.
export const MAX_ENTRIES = 10;
export const NAME_RE = /^[A-Za-z0-9_]{3,12}$/;

export function validateName(name) {
  if (typeof name !== 'string' || !NAME_RE.test(name)) return 'Tên phải dài 3–12 ký tự, chỉ gồm chữ cái không dấu, số và dấu _';
  return null;
}

export function validateEntry(e) {
  if (!e || typeof e !== 'object') return 'mục không hợp lệ';
  const n = validateName(e.name); if (n) return n;
  if (!Number.isInteger(e.score) || e.score < 0) return 'score phải là số nguyên ≥ 0';
  if (!Number.isInteger(e.nights_won) || e.nights_won < 0 || e.nights_won > 3) return 'nights_won phải từ 0 đến 3';
  if (typeof e.achieved_at !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/.test(e.achieved_at) || Number.isNaN(Date.parse(e.achieved_at))) return 'achieved_at phải là ISO 8601 có múi giờ';
  if (!Number.isInteger(e.seed)) return 'seed phải là số nguyên';
  return null;
}

// ISO 8601 theo giờ địa phương kèm độ lệch múi giờ, ví dụ 2026-11-20T16:40:00+07:00
export function nowIso(d = new Date()) {
  const p = (n, l = 2) => String(Math.abs(n)).padStart(l, '0');
  const off = -d.getTimezoneOffset(), sign = off >= 0 ? '+' : '-';
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}${sign}${p(Math.floor(Math.abs(off) / 60))}:${p(Math.abs(off) % 60)}`;
}

// score giảm dần; bằng điểm thì ai đạt trước (achieved_at nhỏ hơn) đứng trên; vẫn bằng thì giữ thứ tự thêm vào
export function sortEntries(entries) {
  return entries.map((e, i) => [e, i]).sort((a, b) => b[0].score - a[0].score || Date.parse(a[0].achieved_at) - Date.parse(b[0].achieved_at) || a[1] - b[1]).map((x) => x[0]);
}

export function addEntry(entries, entry) {
  const err = validateEntry(entry);
  if (err) throw new Error(err);
  const clean = { name: entry.name, score: entry.score, nights_won: entry.nights_won, achieved_at: entry.achieved_at, seed: entry.seed };
  return sortEntries([...entries, clean]).slice(0, MAX_ENTRIES);
}

// Lọc dữ liệu đọc từ đĩa: bỏ mục hỏng thay vì làm hỏng cả bảng
export function sanitize(list) {
  if (!Array.isArray(list)) return [];
  return sortEntries(list.filter((e) => validateEntry(e) === null)).slice(0, MAX_ENTRIES);
}
