// Bản chơi 3D: dùng đúng lõi mô phỏng src/sim.js (60 tick/giây, 3 Đêm) và vẽ bằng Three.js.
// Mọi thứ chỉ để nhìn/nghe (âm thanh, hạt, lá gió, đèn hộ vệ) nằm ở đây, KHÔNG ảnh hưởng đầu ra headless.
import * as THREE from 'three';
import { createGame, step, newInputState, timeLeftS, capacity, DT } from '/src/sim.js';
import { TUNING as T, WORLD } from '/src/tuning.js';
import { NIGHTS } from '/src/maps.js';
import { PAL, ambientIntensity } from '/web/palette.js';

const $ = (id) => document.getElementById(id);
const Q = new URLSearchParams(location.search);

// ---------- Cài đặt (lưu giữa các lần mở) ----------
const settings = { volume: 0.7, sens: 1, cb: false };
try { Object.assign(settings, JSON.parse(localStorage.getItem('ddl-settings') || '{}')); } catch (e) { /* localStorage có thể không dùng được */ }
function applyCb() { document.documentElement.style.setProperty('--danger', settings.cb ? '#FFFFFF' : '#FF5A5F'); document.documentElement.classList.toggle('cb', !!settings.cb); }
applyCb();
function saveSettings() { try { localStorage.setItem('ddl-settings', JSON.stringify(settings)); } catch (e) { /* bỏ qua */ } }

// ---------- Âm thanh (WebAudio tổng hợp, không cần file) ----------
let actx = null, master = null, musicTimer = null, musicStep = 0;
function ensureAudio() {
  if (actx) { if (actx.state === 'suspended') actx.resume(); return; }
  try {
    actx = new (window.AudioContext || window.webkitAudioContext)();
    master = actx.createGain(); master.gain.value = settings.volume; master.connect(actx.destination);
  } catch (e) { actx = null; }
}
function setVolume(v) { settings.volume = v; if (master) master.gain.value = v; saveSettings(); }
function tone(freq, dur, type = 'sine', gain = 0.2, slideTo = null, when = 0) {
  if (!actx) return;
  const t0 = actx.currentTime + when, o = actx.createOscillator(), g = actx.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t0);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(gain, t0 + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g); g.connect(master); o.start(t0); o.stop(t0 + dur + 0.05);
}
function noise(dur, gain = 0.2, lo = 400, hi = 4000, when = 0) {
  if (!actx) return;
  const n = Math.floor(actx.sampleRate * dur), buf = actx.createBuffer(1, n, actx.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
  const s = actx.createBufferSource(); s.buffer = buf;
  const f = actx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = (lo + hi) / 2; f.Q.value = 0.7;
  const g = actx.createGain(); g.gain.value = gain; s.connect(f); f.connect(g); g.connect(master); s.start(actx.currentTime + when);
}
const SFX = {
  pick: () => { tone(880, 0.12, 'sine', 0.18, 1320); },
  light: () => { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.5, 'triangle', 0.18, null, i * 0.08)); },
  pulse: () => { tone(300, 0.5, 'sawtooth', 0.12, 1400); noise(0.4, 0.12, 1000, 6000); },
  hit: () => { tone(120, 0.35, 'square', 0.25, 50); noise(0.3, 0.25, 100, 1200); },
  jump: () => { tone(300, 0.15, 'square', 0.1, 600); },
  dash: () => { noise(0.22, 0.2, 600, 5000); },
  win: () => { [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.6, 'triangle', 0.2, null, i * 0.12)); },
  lose: () => { [392, 330, 262, 196].forEach((f, i) => tone(f, 0.6, 'sawtooth', 0.14, null, i * 0.2)); },
  spawn: () => { tone(90, 0.7, 'sawtooth', 0.12, 60); },
  tick: () => { tone(1000, 0.08, 'square', 0.12); },
  charm: () => { tone(660, 0.3, 'triangle', 0.18, 1320); tone(990, 0.3, 'triangle', 0.14, 1980, 0.1); },
  steal: () => { tone(700, 0.3, 'sawtooth', 0.15, 200); },
  wind: () => { noise(1.6, 0.14, 200, 1800); },
};
const sfx = (n) => { try { SFX[n]?.(); } catch (e) { /* âm thanh không được làm hỏng game */ } };
const SCALE = [0, 3, 5, 7, 10, 12, 15];
function startMusic() {
  if (!actx || musicTimer) return;
  musicTimer = setInterval(() => {
    if (!actx || ui.mode !== 'play' || (game && game.state === 'paused')) return;
    const root = 110 * Math.pow(2, 0 / 12);
    const n = SCALE[(musicStep * 3 + (musicStep >> 2)) % SCALE.length];
    tone(root * Math.pow(2, n / 12 + (musicStep % 8 === 0 ? 0 : 1)), 1.6, 'sine', 0.05);
    if (musicStep % 8 === 0) tone(root / 2, 3.2, 'triangle', 0.06);
    musicStep++;
  }, 650);
}
function stopMusic() { if (musicTimer) { clearInterval(musicTimer); musicTimer = null; } }

// ---------- Three.js ----------
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
renderer.setSize(innerWidth, innerHeight);
document.body.prepend(renderer.domElement);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 400);
scene.background = new THREE.Color(PAL.sky);
scene.fog = new THREE.Fog(PAL.mist, 40, 150);
const ambient = new THREE.AmbientLight(0xaab4ff, ambientIntensity(0, 5));
scene.add(ambient);
const moon = new THREE.DirectionalLight(0x9fb0ff, 1.3); moon.position.set(-30, 60, -20); scene.add(moon);
const lam = (c, e = 0, ei = 0) => new THREE.MeshLambertMaterial({ color: c, emissive: e, emissiveIntensity: ei });

const stars = new THREE.Points(
  new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(Array.from({ length: 900 }, (_, i) => { const a = i * 12.9898, b = i * 78.233, r = 170; return i % 3 === 0 ? Math.sin(a) * r : i % 3 === 1 ? 40 + Math.abs(Math.sin(b)) * 110 : Math.cos(a * b) * r; }), 3)),
  new THREE.PointsMaterial({ color: 0xfff1c9, size: 0.9, fog: false }));
scene.add(stars);
const sea = new THREE.Mesh(new THREE.PlaneGeometry(900, 900), new THREE.MeshBasicMaterial({ color: PAL.cloudSea }));
sea.rotation.x = -Math.PI / 2; sea.position.y = -6; scene.add(sea);
const clouds = [];
for (let i = 0; i < 30; i++) {
  const c = new THREE.Mesh(new THREE.SphereGeometry(5 + (i % 5) * 1.5, 10, 8), new THREE.MeshBasicMaterial({ color: 0x1f4f68, transparent: true, opacity: 0.6 }));
  c.scale.y = 0.3; c.userData = { a: i * 2.399, r: 30 + (i % 9) * 14, s: 0.02 + (i % 4) * 0.01 }; c.position.y = -5; scene.add(c); clouds.push(c);
}

// Hình tròn sáng (halo) dùng chung
function glowTex(color) {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d'), grd = g.createRadialGradient(32, 32, 2, 32, 32, 32);
  const col = '#' + color.toString(16).padStart(6, '0');
  grd.addColorStop(0, col); grd.addColorStop(0.35, col + 'cc'); grd.addColorStop(1, col + '00');
  g.fillStyle = grd; g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}
const haloMat = new THREE.SpriteMaterial({ map: glowTex(PAL.moteHalo), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
const lanternGlowMat = new THREE.SpriteMaterial({ map: glowTex(PAL.lanternLit), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });

// Mây (người chơi)
const player = new THREE.Group();
{
  const robe = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.55, 1.0, 14), lam(PAL.robe)); robe.position.y = 0.6; player.add(robe);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.38, 16, 12), lam(0xf6d9b0)); head.position.y = 1.35; player.add(head);
  const scarf = new THREE.Mesh(new THREE.TorusGeometry(0.36, 0.1, 8, 16), lam(PAL.scarf)); scarf.rotation.x = Math.PI / 2; scarf.position.y = 1.08; player.add(scarf);
  const tail = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.7, 0.05), lam(PAL.scarf)); tail.position.set(0, 0.8, -0.38); tail.rotation.x = 0.35; player.add(tail);
  const hat = new THREE.Mesh(new THREE.ConeGeometry(0.75, 0.45, 20), lam(0xd9b46a)); hat.position.y = 1.72; player.add(hat);
  const staff = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.5, 6), lam(PAL.wood)); staff.position.set(0.55, 0.9, 0.1); player.add(staff);
  const mini = new THREE.Mesh(new THREE.SphereGeometry(0.17, 12, 10), new THREE.MeshBasicMaterial({ color: PAL.moteCore })); mini.position.set(0.55, 1.62, 0.1); player.add(mini);
  const pl = new THREE.PointLight(PAL.lanternLit, 1.6, 16, 1.6); pl.position.set(0.55, 1.6, 0.1); player.add(pl);
  player.userData = { light: pl, mini };
}
scene.add(player);

const world = new THREE.Group(); scene.add(world); // phần thay đổi theo Đêm

// ---------- Dựng bản đồ từ src/maps.js ----------
const rad = (d) => (d * Math.PI) / 180;
function buildWorld(night) {
  world.clear();
  const N = NIGHTS[night];
  const grass = lam(PAL.grass), sand = lam(PAL.sand), wood = lam(PAL.wood);
  const depth = 5;
  for (const s of N.surfaces) {
    let m;
    if (s.k === 'disc' && s.h >= 14) { // tháp chuông
      const tw = new THREE.Group();
      const body = new THREE.Mesh(new THREE.CylinderGeometry(s.r, s.r + 0.2, 8, 20), wood); body.position.set(s.cx, 6 + 4, s.cz); tw.add(body);
      const roof = new THREE.Mesh(new THREE.ConeGeometry(s.r + 0.8, 2, 20), lam(PAL.scarf)); roof.position.set(s.cx, 15, s.cz); tw.add(roof);
      const bell = new THREE.Mesh(new THREE.SphereGeometry(0.7, 12, 10), new THREE.MeshBasicMaterial({ color: PAL.gold })); bell.position.set(s.cx, 13, s.cz); tw.add(bell);
      world.add(tw); continue;
    }
    if (s.k === 'disc') {
      m = new THREE.Mesh(new THREE.CylinderGeometry(s.r, s.r - (s.h === 0 ? 3 : 0), s.h + depth, 48), [sand, grass, sand]);
      m.position.set(s.cx, (s.h - depth) / 2, s.cz);
    } else if (s.k === 'halfring') {
      const sh = new THREE.Shape(); sh.absarc(0, 0, s.r1, Math.PI, Math.PI * 2, false); sh.absarc(0, 0, s.r0, Math.PI * 2, Math.PI, true);
      const geo = new THREE.ExtrudeGeometry(sh, { depth: s.h + depth, bevelEnabled: false, curveSegments: 40 });
      geo.rotateX(-Math.PI / 2); m = new THREE.Mesh(geo, [grass, sand]); m.position.y = -depth;
    } else if (s.k === 'rect') {
      m = new THREE.Mesh(new THREE.BoxGeometry(s.x1 - s.x0, 0.4, s.z1 - s.z0), wood);
      m.position.set((s.x0 + s.x1) / 2, s.h - 0.2, (s.z0 + s.z1) / 2);
      for (let x = s.x0 + 1; x < s.x1; x += 2) { // ván cầu
        const p = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.06, s.z1 - s.z0), lam(0x8a6540)); p.position.set(x, s.h + 0.02, (s.z0 + s.z1) / 2); world.add(p);
      }
    } else if (s.k === 'ramp') {
      const sh = new THREE.Shape(); sh.moveTo(s.u0, -1); sh.lineTo(s.u0, s.hHigh); sh.lineTo(s.u1, 0); sh.lineTo(s.u1, -1); sh.closePath();
      const geo = new THREE.ExtrudeGeometry(sh, { depth: s.w, bevelEnabled: false }); geo.translate(0, 0, -s.w / 2);
      m = new THREE.Mesh(geo, wood); m.rotation.y = -rad(s.a);
    }
    if (m) world.add(m);
  }
  // bục nhảy
  for (const p of N.pads) {
    const pad = new THREE.Mesh(new THREE.CylinderGeometry(p.r, p.r, 0.18, 24), lam(PAL.gold, PAL.gold, 0.8)); pad.position.set(p.pos[0], p.pos[1] + 0.09, p.pos[2]); pad.userData.pad = true; world.add(pad);
    const spr = new THREE.Sprite(haloMat); spr.scale.set(4, 4, 1); spr.position.set(p.pos[0], p.pos[1] + 0.6, p.pos[2]); world.add(spr);
  }
}

// ---------- Thực thể ----------
const lanternObjs = new Map(), moteObjs = new Map(), shadeObjs = new Map(), drifterObjs = new Map(), charmObjs = new Map();
const pulses = [], guardians = [];
const moteGeo = new THREE.SphereGeometry(0.2, 10, 8), moteMat = new THREE.MeshBasicMaterial({ color: PAL.moteCore });

function makeLantern(l) {
  const g = new THREE.Group();
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.2, 3.4, 8), lam(PAL.wood)); pole.position.y = 1.7; g.add(pole);
  const box = new THREE.Mesh(new THREE.BoxGeometry(1.3, 1.5, 1.3), lam(PAL.lanternOff)); box.position.y = 4.0; g.add(box);
  const core = new THREE.Mesh(new THREE.SphereGeometry(0.35, 12, 10), new THREE.MeshBasicMaterial({ color: PAL.lanternCore })); core.position.y = 4.0; core.visible = false; g.add(core);
  const cap = new THREE.Mesh(new THREE.ConeGeometry(1.1, 0.7, 4), lam(PAL.wood)); cap.position.y = 5.1; cap.rotation.y = Math.PI / 4; g.add(cap);
  const glow = new THREE.Sprite(lanternGlowMat.clone()); glow.scale.set(11, 11, 1); glow.position.y = 4; glow.visible = false; g.add(glow);
  const ring = new THREE.Mesh(new THREE.RingGeometry(T.safe_radius - 0.15, T.safe_radius, 64), new THREE.MeshBasicMaterial({ color: PAL.lanternLit, transparent: true, opacity: 0, side: THREE.DoubleSide }));
  ring.rotation.x = -Math.PI / 2; ring.position.y = 0.08; g.add(ring);
  const tank = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.12, 0.9), new THREE.MeshBasicMaterial({ color: PAL.lanternLit })); tank.position.y = 2.2; g.add(tank);
  const bar = new THREE.Group(); bar.position.y = 6.2; g.add(bar);
  const barBg = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.2, 0.1), new THREE.MeshBasicMaterial({ color: 0x1b2350 })); bar.add(barBg);
  const barFill = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.14, 0.12), new THREE.MeshBasicMaterial({ color: PAL.lanternLit })); bar.add(barFill);
  const torn = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.6, 3), new THREE.MeshBasicMaterial({ color: 0x14101c })); torn.position.set(0.5, 3.9, 0.67); torn.rotation.z = 0.5; torn.visible = false; g.add(torn);
  g.position.set(l.pos[0], l.pos[1], l.pos[2]); world.add(g);
  return { g, box, core, glow, ring, tank, bar, barFill, torn };
}
function makeShade() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.9, 16, 12), new THREE.MeshLambertMaterial({ color: PAL.shadeBody, emissive: PAL.shadeRim, emissiveIntensity: 0.25 })); g.add(body);
  const rim = new THREE.Mesh(new THREE.SphereGeometry(1.0, 16, 12), new THREE.MeshBasicMaterial({ color: PAL.shadeRim, side: THREE.BackSide, transparent: true, opacity: 0.55 })); g.add(rim);
  const eyes = []; for (const x of [-0.3, 0.3]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), new THREE.MeshBasicMaterial({ color: 0xe9d9ff })); e.position.set(x, 0.15, 0.78); g.add(e); eyes.push(e); }
  const drip = new THREE.Mesh(new THREE.ConeGeometry(0.5, 0.9, 10), new THREE.MeshLambertMaterial({ color: PAL.shadeBody })); drip.position.y = -0.8; drip.rotation.x = Math.PI; g.add(drip);
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1, 6), new THREE.MeshBasicMaterial({ color: 0xff9a3c, transparent: true, opacity: 0.7 })); beam.visible = false; world.add(beam);
  world.add(g); return { g, body, rim, eyes, beam };
}
function makeDrifter() {
  const g = new THREE.Group(); const m = new THREE.MeshBasicMaterial({ color: PAL.drifter, transparent: true, opacity: 0.85, side: THREE.DoubleSide });
  const strips = [];
  for (let i = 0; i < 4; i++) { const s = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 2.6, 1, 8), m); s.position.set((i - 1.5) * 0.4, 0, 0); g.add(s); strips.push(s); }
  const cargo = new THREE.Mesh(new THREE.SphereGeometry(0.3, 10, 8), new THREE.MeshBasicMaterial({ color: PAL.moteCore })); cargo.position.y = -1.5; cargo.visible = false; g.add(cargo);
  world.add(g); return { g, strips, cargo };
}
function makeCharm(c) {
  const g = new THREE.Group();
  const frame = new THREE.Mesh(new THREE.BoxGeometry(0.95, 1.2, 0.06), new THREE.MeshBasicMaterial({ color: PAL.gold })); g.add(frame);
  const card = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.05, 0.08), new THREE.MeshBasicMaterial({ color: PAL.charmRed })); g.add(card);
  const spr = new THREE.Sprite(haloMat.clone()); spr.material.color.set(PAL.charmRed); spr.scale.set(3, 3, 1); g.add(spr);
  g.position.set(c.pos[0], c.pos[1] + 1.1, c.pos[2]); world.add(g); return { g };
}
function spawnPulse(x, y, z) {
  const m = new THREE.Mesh(new THREE.RingGeometry(0.3, 0.6, 48), new THREE.MeshBasicMaterial({ color: PAL.moteHalo, transparent: true, opacity: 0.9, side: THREE.DoubleSide }));
  m.rotation.x = -Math.PI / 2; m.position.set(x, y + 0.15, z); scene.add(m); pulses.push({ m, t: 0 });
}
// Lá gió (chỉ hiển thị)
const LEAVES = 90, leafGeo = new THREE.BufferGeometry();
const leafPos = new Float32Array(LEAVES * 3); leafGeo.setAttribute('position', new THREE.BufferAttribute(leafPos, 3));
const leaves = new THREE.Points(leafGeo, new THREE.PointsMaterial({ color: 0x9fd68a, size: 0.6, transparent: true, opacity: 0.9 })); leaves.visible = false; leaves.frustumCulled = false; scene.add(leaves);

// ---------- Trạng thái chương trình ----------
const ui = { mode: 'menu', night: 1, total: 0 };
let game = null, acc = 0, last = performance.now(), msgTimer = 0, camYaw = 0, lastCountdown = 99, windSfxDone = false;
const keys = new Set(); const input = newInputState();
let pendingJump = false, pendingDash = false, pauseReq = false;
const fpsInfo = { frames: 0, t0: performance.now(), avg: 0 };

const QUOTES = {
  1: '"Con ơi, sương đen đã nuốt hết ánh đèn của Đảo Bến. Nhặt đom đóm, thắp lại năm ngọn đèn cho ông nhé."',
  2: '"Đảo Cau có hai hòn đảo nối bằng một cây cầu tre. Đừng nhìn xuống, và đừng để Gió Lạc cướp mất đom đóm của con."',
  3: '"Đảo Chuông cao nhất: ba tầng, bảy ngọn đèn. Gió nổi lên thì bám chắc mặt đất — rồi đánh thức tiếng chuông cho ông."',
};
const INFO = { 1: '5 đèn · 4:00 · giữ ≥3 đèn sáng tới bình minh', 2: '6 đèn · 4:30 · giữ ≥4 đèn sáng · cầu tre, bục nhảy, Gió Lạc, Bùa Gió', 3: '7 đèn · 5:00 · giữ ≥5 đèn sáng · 3 tầng, dốc, gió mạnh, Bóng Mực nhanh hơn' };

function show(id) { for (const s of document.querySelectorAll('.screen')) s.classList.toggle('show', s.id === id); }
function say(text) { const m = $('msg'); m.textContent = text; m.style.opacity = 1; msgTimer = 2.2; }

function gotoMenu() { ui.mode = 'menu'; ui.total = 0; ui.night = 1; game = null; stopMusic(); show('menu'); setHud(false); }
function gotoIntro(n) {
  ui.mode = 'intro'; ui.night = n; show('intro'); setHud(false);
  $('inTitle').textContent = `Đêm ${n}`; $('inName').textContent = NIGHTS[n].name; $('inQuote').textContent = QUOTES[n]; $('inInfo').textContent = INFO[n];
}
function setHud(on) { for (const id of ['tl', 'tc', 'tr', 'bc', 'br', 'help']) $(id).style.display = on ? '' : 'none'; if (!on) $('arrow').style.display = 'none'; }
function startNight() {
  ensureAudio(); startMusic();
  const n = ui.night;
  game = createGame({ seed: (Date.now() & 0x7fffffff), night: n });
  Object.assign(input, newInputState()); acc = 0; pendingJump = pendingDash = pauseReq = false; lastCountdown = 99; windSfxDone = false;
  buildWorld(n);
  for (const m of [lanternObjs, moteObjs, shadeObjs, drifterObjs, charmObjs]) m.clear();
  for (const g of guardians.splice(0)) scene.remove(g.m);
  for (const l of game.lanterns) lanternObjs.set(l.id, makeLantern(l));
  for (const c of game.charms) charmObjs.set(c.id, makeCharm(c));
  $('lcount').textContent = game.lanterns.length;
  camYaw = 0; ui.mode = 'play'; show('none'); setHud(true);
  buildSlots();
  say(`Đêm ${n} — ${NIGHTS[n].name}`);
}
let slotCount = 0;
function buildSlots(n = T.carry_capacity) { slotCount = n; $('motes').innerHTML = Array.from({ length: n }, () => '<div class="slot"></div>').join(''); }

// ---------- Nút bấm ----------
$('bPlay').onclick = () => { ensureAudio(); gotoIntro(1); };
$('bMenuSet').onclick = () => openSettings('menu');
$('bGo').onclick = () => startNight();
$('bResume').onclick = () => { pauseReq = true; };
$('bRestart').onclick = () => { game = null; startNight(); };
$('bPauseSet').onclick = () => openSettings('pause');
$('bToMenu').onclick = () => gotoMenu();
$('bResMenu').onclick = () => gotoMenu();
$('bRetry').onclick = () => startNight();
$('bDawnMenu').onclick = () => gotoMenu();
$('bNext').onclick = () => { if (ui.night < 3) gotoIntro(ui.night + 1); };
let settingsFrom = 'menu';
function openSettings(from) { settingsFrom = from; ui.mode = 'settings'; $('sVol').value = settings.volume; $('sSens').value = settings.sens; $('sCb').checked = !!settings.cb; $('sVolV').textContent = Math.round(settings.volume * 100) + '%'; $('sSensV').textContent = settings.sens.toFixed(1); show('settings'); }
$('bSetBack').onclick = () => { if (settingsFrom === 'pause') { ui.mode = 'play'; show('pause'); } else gotoMenu(); };
$('sCb').onchange = (e) => { settings.cb = e.target.checked; applyCb(); saveSettings(); };
$('sVol').oninput = (e) => { setVolume(Number(e.target.value)); $('sVolV').textContent = Math.round(settings.volume * 100) + '%'; };
$('sSens').oninput = (e) => { settings.sens = Number(e.target.value); $('sSensV').textContent = settings.sens.toFixed(1); saveSettings(); };

addEventListener('keydown', (e) => {
  ensureAudio();
  if (e.repeat) return;
  keys.add(e.code);
  if (['Space', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.code)) e.preventDefault();
  if (ui.mode === 'menu' && e.code === 'Enter') { gotoIntro(1); return; }
  if (ui.mode === 'intro' && e.code === 'Enter') { startNight(); return; }
  if (ui.mode === 'play' && game) {
    if (e.code === 'Space') pendingJump = true;
    if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') pendingDash = true;
    if (e.code === 'Escape' || e.code === 'KeyP') pauseReq = true;
    if (e.code === 'KeyR' && game.state !== 'paused') startNight();
  } else if (e.code === 'Escape' && ui.mode === 'settings') $('bSetBack').click();
});
addEventListener('keyup', (e) => keys.delete(e.code));
addEventListener('blur', () => { keys.clear(); if (ui.mode === 'play' && game && game.state === 'playing') pauseReq = true; });
let dragging = false;
addEventListener('mousedown', (e) => { if (ui.mode === 'play') dragging = true; });
addEventListener('mouseup', () => { dragging = false; });
addEventListener('mousemove', (e) => { if (dragging) camYaw -= e.movementX * 0.4 * settings.sens; });
addEventListener('resize', () => { renderer.setSize(innerWidth, innerHeight); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); });

function readInput() {
  const k = (c) => keys.has(c);
  // Camera sau lưng nhìn về (sinθ, cosθ). Phải màn hình = −X tại θ=0 nên D ⇒ x = −1.
  const mx = (k('KeyA') ? 1 : 0) - (k('KeyD') ? 1 : 0);
  const mz = (k('KeyW') ? 1 : 0) - (k('KeyS') ? 1 : 0);
  if (k('ArrowLeft')) camYaw -= 100 * DT * settings.sens;
  if (k('ArrowRight')) camYaw += 100 * DT * settings.sens;
  return [mx, mz];
}

// ---------- Sự kiện game → giao diện/âm thanh ----------
function handleEvent(e) {
  const P = game.player;
  switch (e.name) {
    case 'mote_picked': sfx('pick'); break;
    case 'deposit': say(`🏮 Nạp ${e.data.amount} đom đóm vào ${e.data.lantern_id} (${e.data.deposited}/${T.lantern_cost})`); sfx('pick'); break;
    case 'refuel': say(`⛽ Châm dầu ${e.data.lantern_id}: ${e.data.fuel}/100`); sfx('pick'); break;
    case 'lantern_out': say(`🕯️ Đèn ${e.data.lantern_id} đã cạn dầu và tắt!`); sfx('lose'); break;
    case 'fuel_drain': if (e.data.fuel < 30) say(`Bóng Mực đang hút dầu ${e.data.lantern_id}!`); break;
    case 'lantern_lit': {
      say(`🔥 Đèn ${e.data.lantern_id} ${e.data.relight ? 'được thắp lại' : 'đã sáng'}!`); sfx('light'); buildSlots(capacity(game));
      const l = game.lanterns.find((x) => x.id === e.data.lantern_id);
      for (let i = 0; i < 6; i++) { const m = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), new THREE.MeshBasicMaterial({ color: PAL.lanternCore })); world.add(m); guardians.push({ m, cx: l.pos[0], cy: l.pos[1], cz: l.pos[2], a: i, r: 1.6 + (i % 3) * 0.5 }); }
      break;
    }
    case 'pulse': spawnPulse(P.pos[0], P.pos[1], P.pos[2]); sfx('pulse'); say(e.data.stunned_ids.length ? `Tỏa Sáng! Bóng Mực choáng: ${e.data.stunned_ids.length}` : 'Tỏa Sáng!'); break;
    case 'player_hit': sfx('hit'); say(e.data.by === 'fall' ? `Rơi khỏi đảo! Còn ${e.data.flames} ngọn lửa` : `Bóng Mực chạm bạn! Còn ${e.data.flames} ngọn lửa`); break;
    case 'shade_spawned': sfx('spawn'); break;
    case 'dash': sfx('dash'); break;
    case 'charm_picked': sfx('charm'); say('🌬️ Bùa Gió: chạy nhanh, lướt liên tục!'); break;
    case 'drifter_steal': sfx('steal'); say(`Gió Lạc cướp ${e.data.amount} đom đóm!`); break;
    case 'drifter_drop': say('Gió Lạc làm rơi đom đóm — nhặt lại!'); break;
    case 'paused': show('pause'); break;
    case 'resumed': show('none'); break;
    case 'game_over': endNight(e.data.result, e.data.reason); break;
  }
}
const need = () => Math.ceil(T.win_ratio * game.lanterns.length);
function endNight(result, reason) {
  ui.mode = 'result'; sfx(result === 'won' ? 'win' : 'lose'); stopMusic();
  if (result === 'won') {
    ui.total += game.score;
    if (ui.night === 3) { $('dTotal').textContent = ui.total; setTimeout(() => { if (ui.mode === 'result') show('dawn'); }, 900); return; }
    $('rTitle').textContent = `Đêm ${ui.night} đã sáng! 🏮`; $('rText').textContent = `Bình minh đến! Còn ${game.lanterns.filter((l) => l.lit).length}/${game.lanterns.length} đèn sáng (cần ≥ ${need()}) tại ${NIGHTS[ui.night].name}.`;
    $('rScore').textContent = `Điểm đêm này: ${game.score} · Tổng: ${ui.total}`;
    $('bNext').style.display = ''; $('bNext').textContent = `Sang Đêm ${ui.night + 1} →`;
  } else {
    $('rTitle').textContent = 'Sương đen đã nuốt đảo...';
    $('rText').textContent = reason === 'dawn' ? `Bình minh đến nhưng chỉ còn ${game.lanterns.filter((l) => l.lit).length} đèn sáng — cần ít nhất ${need()}.` : 'Mây đã hết ngọn lửa.';
    $('rScore').textContent = `Điểm đêm này: ${game.score} (không tính vào tổng) · Tổng hiện có: ${ui.total}`;
    $('bNext').style.display = 'none';
  }
  setTimeout(() => { if (ui.mode === 'result') show('result'); }, 700);
}

// ---------- HUD ----------
const v3 = new THREE.Vector3();
function updateHud() {
  const P = game.player, L = game.lanterns;
  $('flames').innerHTML = Array.from({ length: T.flames }, (_, i) => `<span class="${i < P.flames ? '' : 'off'}">🔥</span>`).join('');
  $('lit').textContent = L.filter((l) => l.lit).length; $('lneed').textContent = need();
  $('score').textContent = ui.total + game.score;
  const t = Math.max(0, timeLeftS(game)), tc = $('tc');
  tc.textContent = `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`; tc.classList.toggle('low', t <= 30); if (t <= 30) tc.textContent = '⚠ ' + tc.textContent;
  if (slotCount !== capacity(game)) buildSlots(capacity(game));
  $('capv').textContent = `${P.carried}/${capacity(game)}`;
  const slots = $('motes').children; for (let i = 0; i < slots.length; i++) slots[i].classList.toggle('on', i < P.carried);
  // hồi chiêu
  const dashReady = P.dashTicks === 0 && (P.dashCd === 0 || P.charm > 0), pulseReady = P.pulseCd === 0 && P.carried >= T.pulse_cost;
  $('cdDash').classList.toggle('ready', dashReady); $('cdDash').querySelector('.fill').style.height = (P.charm > 0 ? 0 : P.dashCd / 90 * 100) + '%';
  $('cdPulse').classList.toggle('ready', pulseReady); $('cdPulse').querySelector('.fill').style.height = (P.pulseCd / 180 * 100) + '%';
  $('cdPulse').querySelector('small').textContent = P.carried < T.pulse_cost ? `F · cần ${T.pulse_cost}` : 'F';
  // bùa
  $('charmChip').style.display = P.charm > 0 ? 'block' : 'none'; $('charmS').textContent = Math.ceil(P.charm / 60);
  // gợi ý nạp đèn
  let near = null, nd = 1e9;
  for (const l of L) { if (l.lit && l.fuelU >= T.fuel_max * 60) continue; const d = Math.hypot(l.pos[0] - P.pos[0], l.pos[2] - P.pos[2]); if (d < nd) { nd = d; near = l; } }
  const pr = $('prompt');
  if (near && nd <= T.interact_radius + 1.5) { pr.style.display = 'block'; pr.textContent = near.lit ? `E — Châm dầu (${Math.floor(near.fuelU / 60)}/100)${P.carried === 0 ? ' · cần đom đóm' : ''}` : `E — ${near.ever_lit ? 'Thắp lại' : 'Nạp ánh sáng'} (${near.deposited}/${near.ever_lit ? T.relight_cost : T.lantern_cost})${P.carried === 0 ? ' · cần đom đóm' : ''}`; } else pr.style.display = 'none';
  // mũi tên tới đèn chưa sáng gần nhất khi ngoài màn hình
  const arrow = $('arrow');
  if (near) {
    v3.set(near.pos[0], near.pos[1] + 4, near.pos[2]).project(camera);
    const behind = v3.z > 1, off = behind || Math.abs(v3.x) > 0.92 || Math.abs(v3.y) > 0.88;
    if (off) {
      let x = v3.x, y = v3.y; if (behind) { x = -x; y = -y; }
      const m = Math.max(Math.abs(x) / 0.9, Math.abs(y) / 0.84, 1e-6); x /= m; y /= m;
      arrow.style.display = 'block'; arrow.style.left = ((x + 1) / 2 * innerWidth) + 'px'; arrow.style.top = ((1 - y) / 2 * innerHeight) + 'px';
      arrow.style.transform = `rotate(${Math.atan2(-y, x)}rad)`;
    } else arrow.style.display = 'none';
  } else arrow.style.display = 'none';
  // gió
  $('windwarn').style.display = game.wind.warn ? 'block' : 'none';
  if (game.wind.warn && !windSfxDone) { sfx('wind'); windSfxDone = true; } if (!game.wind.warn && !game.wind.active) windSfxDone = false;
  // đếm ngược 10 giây cuối
  const sec = Math.ceil(t); if (sec <= 10 && sec > 0 && sec < lastCountdown && game.state === 'playing') { sfx('tick'); } lastCountdown = Math.min(lastCountdown, sec);
}

// ---------- Đồng bộ cảnh ----------
let clock = 0;
function syncScene(time) {
  const P = game.player;
  player.position.set(P.pos[0], P.pos[1], P.pos[2]); player.rotation.y = P.heading;
  player.visible = !(P.invuln > 0 && Math.floor(time * 12) % 2 === 0) && P.fallWait === 0;
  player.userData.light.intensity = 1.2 + P.carried * 0.25;
  const lit = game.lanterns.filter((l) => l.lit).length;
  ambient.intensity = ambientIntensity(lit, game.lanterns.length);
  for (const l of game.lanterns) {
    const o = lanternObjs.get(l.id), need_ = l.ever_lit ? T.relight_cost : T.lantern_cost, prog = l.lit ? 1 : l.deposited / need_;
    const fuel = l.fuelU / 60, low = l.lit && fuel < T.low_fuel_threshold, blink = !low || Math.floor(time * 2) % 2 === 0; // 1 Hz: sáng 0,5 s / tối 0,5 s
    o.bar.visible = l.lit; o.bar.quaternion.copy(camera.quaternion);
    o.barFill.scale.x = Math.max(0.01, fuel / T.fuel_max); o.barFill.position.x = -0.85 * (1 - o.barFill.scale.x);
    o.barFill.material.color.set(low ? (settings.cb ? 0xffffff : PAL.danger) : PAL.lanternLit); o.bar.children.forEach((c) => { if (low) c.visible = blink; else c.visible = true; });
    o.box.scale.y = l.lit ? 1 : 0.8; o.box.position.y = l.lit ? 4.0 : 3.9; o.torn.visible = !l.lit;
    o.tank.scale.set(Math.max(0.02, prog), 1, Math.max(0.02, prog));
    o.box.material.color.set(l.lit ? PAL.lanternLit : PAL.lanternOff); o.box.material.emissive.set(l.lit ? PAL.lanternLit : PAL.lanternOff); o.box.material.emissiveIntensity = l.lit ? 0.9 : 0.1 + prog * 0.5;
    o.core.visible = l.lit && blink; o.glow.visible = l.lit && blink; o.glow.scale.setScalar(10 + Math.sin(time * 3 + l.pos[0]) * 0.8);
    o.ring.material.opacity = l.lit && fuel >= T.low_fuel_threshold ? 0.4 : 0;
  }
  syncMap(game.motes, moteObjs, (m) => {
    const g = new THREE.Group(); g.add(new THREE.Mesh(moteGeo, moteMat)); const h = new THREE.Sprite(haloMat); h.scale.set(1.8, 1.8, 1); g.add(h); world.add(g); return { g };
  }, (m, o) => {
    o.g.position.set(m.pos[0], m.pos[1] + 0.9 + Math.sin(time * 2 + m.pos[0]) * 0.2, m.pos[2]);
    o.g.visible = m.ttl === null || m.ttl > 120 || Math.floor(time * 10) % 2 === 0; // đom đóm rơi nhấp nháy khi sắp tắt
  });
  syncMap(game.shades, shadeObjs, makeShade, (s, o) => {
    o.g.position.set(s.pos[0], s.pos[1] + 1 + Math.sin(time * 3 + s.pos[0]) * 0.12, s.pos[2]);
    o.g.lookAt(P.pos[0], s.pos[1] + 1, P.pos[2]);
    const st = s.state === 'stunned', dr = s.state === 'drain';
    const rimC = settings.cb ? 0x00b3ff : PAL.shadeRim; o.rim.material.color.set(dr ? 0xff9a3c : rimC); o.body.material.emissive.set(dr ? 0xff9a3c : rimC);
    o.eyes.forEach((e) => e.material.color.set(settings.cb ? 0x00b3ff : 0xe9d9ff));
    const tl = dr && s.target ? game.lanterns.find((x) => x.id === s.target) : null;
    o.beam.visible = !!tl;
    if (tl) { const a = new THREE.Vector3(s.pos[0], s.pos[1] + 1, s.pos[2]), b = new THREE.Vector3(tl.pos[0], tl.pos[1] + 4, tl.pos[2]); o.beam.position.copy(a).lerp(b, 0.5); o.beam.scale.set(1, a.distanceTo(b), 1); o.beam.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize()); }
    o.body.material.color.set(st ? PAL.shadeStunned : PAL.shadeBody); o.rim.material.opacity = st ? 0.15 : 0.55;
    o.g.scale.setScalar(s.state === 'spawning' ? 0.3 + 0.7 * (1 - s.ticks / WORLD.shade_spawning_ticks) : st ? 0.78 : s.state === 'wander' ? 0.9 : 1);
  });
  syncMap(game.drifters, drifterObjs, makeDrifter, (d, o) => {
    o.g.position.set(d.pos[0], d.pos[1], d.pos[2]); o.g.rotation.y = time * 1.5;
    o.strips.forEach((s, i) => { s.rotation.z = Math.sin(time * 6 + i) * 0.35; s.rotation.x = Math.sin(time * 4 + i * 2) * 0.25; });
    o.cargo.visible = d.stolen > 0;
  });
  for (const c of game.charms) { const o = charmObjs.get(c.id); if (o) { o.g.visible = c.available; o.g.rotation.y = time * 2; } }
  for (const g of guardians) { g.a += 0.02; g.m.position.set(g.cx + Math.sin(g.a) * g.r, g.cy + 1.2 + Math.sin(g.a * 2) * 0.4, g.cz + Math.cos(g.a) * g.r); }
  for (let i = pulses.length - 1; i >= 0; i--) {
    const p = pulses[i]; p.t += 0.03; p.m.scale.setScalar(1 + p.t * T.pulse_radius * 1.6); p.m.material.opacity = Math.max(0, 0.9 - p.t * 1.1);
    if (p.t > 0.85) { scene.remove(p.m); pulses.splice(i, 1); }
  }
  for (const c of clouds) { c.userData.a += c.userData.s * 0.01; c.position.set(Math.sin(c.userData.a) * c.userData.r * 2, -5, Math.cos(c.userData.a) * c.userData.r * 2); }
  // lá gió
  const showLeaves = game.wind.warn || game.wind.active;
  leaves.visible = showLeaves;
  if (showLeaves) {
    const dx = Math.cos(game.wind.dir), dz = Math.sin(game.wind.dir), sp = game.wind.active ? 14 : 4;
    for (let i = 0; i < LEAVES; i++) {
      const ph = (time * sp * 0.15 + i * 0.137) % 1, off = (i * 7.31 % 1 - 0.5) * 60;
      leafPos[i * 3] = P.pos[0] + dx * (ph * 60 - 30) - dz * off; leafPos[i * 3 + 1] = P.pos[1] + 1 + (i % 9) * 0.9 + Math.sin(time * 3 + i) * 0.4; leafPos[i * 3 + 2] = P.pos[2] + dz * (ph * 60 - 30) + dx * off;
    }
    leafGeo.attributes.position.needsUpdate = true;
  }
  // camera
  const th = (camYaw * Math.PI) / 180, fx = Math.sin(th), fz = Math.cos(th);
  camera.position.set(P.pos[0] - fx * 11, P.pos[1] + 7.5, P.pos[2] - fz * 11);
  camera.lookAt(P.pos[0] + fx * 3, P.pos[1] + 1.2, P.pos[2] + fz * 3);
}
function syncMap(list, objs, make, upd) {
  const seen = new Set();
  for (const e of list) { seen.add(e.id); let o = objs.get(e.id); if (!o) { o = make(e); objs.set(e.id, o); } upd(e, o); }
  for (const [id, o] of objs) if (!seen.has(id)) { world.remove(o.g); objs.delete(id); }
}

// ---------- Vòng lặp ----------
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.1, (now - last) / 1000); last = now; clock += dt;
  fpsInfo.frames++; if (now - fpsInfo.t0 >= 1000) { fpsInfo.avg = fpsInfo.frames * 1000 / (now - fpsInfo.t0); fpsInfo.frames = 0; fpsInfo.t0 = now; if (Q.has('fps')) { $('fps').style.display = 'block'; $('fps').textContent = fpsInfo.avg.toFixed(0) + ' FPS'; } }
  if (ui.mode === 'play' && game) {
    acc += dt;
    while (acc >= DT) {
      acc -= DT;
      const [mx, mz] = readInput();
      input.move = [mx, mz]; input.cam_yaw_deg = camYaw;
      if (pendingJump && game.player.grounded && game.state === 'playing') sfx('jump');
      input.jump = pendingJump; pendingJump = false;
      input.dash = pendingDash; pendingDash = false;
      input.pause = pauseReq; pauseReq = false;
      input.interact = keys.has('KeyE'); input.pulse = keys.has('KeyF');
      for (const e of step(game, input)) handleEvent(e);
      if (ui.mode !== 'play') break;
    }
    if (game) { updateHud(); syncScene(clock); }
  } else if (game && ui.mode !== 'menu') { syncScene(clock); }
  if (msgTimer > 0) { msgTimer -= dt; if (msgTimer <= 0) $('msg').style.opacity = 0; }
  renderer.render(scene, camera);
}
setHud(false);
requestAnimationFrame(frame);
window.__game = () => game; window.__ui = ui; window.__fps = () => fpsInfo.avg; window.__settings = settings;
if (Q.has('night')) { const n = Math.min(3, Math.max(1, Number(Q.get('night')) || 1)); gotoIntro(n); if (Q.has('auto')) startNight(); }
