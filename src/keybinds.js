// Đổi phím (TICKET-04 §4): logic thuần, dùng chung cho trình duyệt và test. Giá trị là KeyboardEvent.code.
export const ACTIONS = [
  ['up', 'Đi lên'], ['down', 'Đi xuống'], ['left', 'Sang trái'], ['right', 'Sang phải'],
  ['jump', 'Nhảy'], ['dash', 'Lướt'], ['interact', 'Tương tác (nạp / châm dầu)'], ['pulse', 'Tỏa Sáng'], ['pause', 'Tạm dừng'],
];
export const DEFAULTS = { up: 'KeyW', down: 'KeyS', left: 'KeyA', right: 'KeyD', jump: 'Space', dash: 'ShiftLeft', interact: 'KeyE', pulse: 'KeyF', pause: 'Escape' };
// Phím cố định, không cho gán (đã dùng cho camera, bắt đầu, khởi động lại)
export const RESERVED = ['ArrowLeft', 'ArrowRight', 'Enter', 'KeyR'];

export const normalize = (code) => (code === 'ShiftRight' ? 'ShiftLeft' : code === 'ControlRight' ? 'ControlLeft' : code === 'AltRight' ? 'AltLeft' : code);

export function label(code) {
  const m = { Space: 'Space', ShiftLeft: 'Shift', ControlLeft: 'Ctrl', AltLeft: 'Alt', Escape: 'Esc', ArrowUp: '↑', ArrowDown: '↓', Tab: 'Tab', Backspace: '⌫' };
  if (m[code]) return m[code];
  if (/^Key[A-Z]$/.test(code)) return code.slice(3);
  if (/^Digit\d$/.test(code)) return code.slice(5);
  return code;
}

// Trả về { action: [các action trùng phím với nó] } cho mọi phím bị dùng cho ≥2 hành động
export function conflicts(map) {
  const by = {};
  for (const [a] of ACTIONS) { const c = normalize(map[a]); (by[c] = by[c] || []).push(a); }
  const out = {};
  for (const list of Object.values(by)) if (list.length > 1) for (const a of list) out[a] = list.filter((x) => x !== a);
  return out;
}

// Gán phím mới. Từ chối (ok:false) nếu trùng hoặc phím cố định; không đổi map khi từ chối.
export function rebind(map, action, code) {
  code = normalize(code);
  if (!ACTIONS.some(([a]) => a === action)) return { ok: false, reason: 'hành động không tồn tại' };
  if (RESERVED.includes(code)) return { ok: false, reason: `${label(code)} là phím cố định` };
  const other = ACTIONS.find(([a]) => a !== action && normalize(map[a]) === code);
  if (other) return { ok: false, reason: `Trùng phím ${label(code)} với "${other[1]}"`, with: other[0] };
  return { ok: true, map: { ...map, [action]: code } };
}

// Đọc từ localStorage: bỏ giá trị không hợp lệ; nếu kết quả trùng phím thì quay về mặc định
export function sanitize(saved) {
  const m = { ...DEFAULTS };
  if (saved && typeof saved === 'object') for (const [a] of ACTIONS) if (typeof saved[a] === 'string' && saved[a].length < 24) m[a] = normalize(saved[a]);
  return Object.keys(conflicts(m)).length ? { ...DEFAULTS } : m;
}
