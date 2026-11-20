// Bản chơi 3D: dùng đúng lõi mô phỏng src/sim.js (60 tick/giây) và vẽ bằng Three.js.
import * as THREE from 'three';
import { createGame, step, newInputState, applyFrame, timeLeftS, DT } from '/src/sim.js';
import { TUNING as T, WORLD } from '/src/tuning.js';

const $ = (id) => document.getElementById(id);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
document.body.prepend(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 300);
const DARK = new THREE.Color(0x241848), WARM = new THREE.Color(0x6a3a3a);
scene.background = DARK.clone();
scene.fog = new THREE.Fog(0x241848, 30, 110);

const ambient = new THREE.AmbientLight(0x8a78c0, 1.05);
scene.add(ambient);
const moon = new THREE.DirectionalLight(0x9aa6ff, 0.35);
moon.position.set(-20, 40, -10);
scene.add(moon);

const mat = (c, e = 0x000000, ei = 0) => new THREE.MeshStandardMaterial({ color: c, emissive: e, emissiveIntensity: ei, roughness: 0.85 });

// Đảo tròn trên biển mây
const island = new THREE.Mesh(new THREE.CylinderGeometry(WORLD.island_radius, WORLD.island_radius - 3, 4, 48), mat(0x4a3d72));
island.position.y = -2;
scene.add(island);
const grass = new THREE.Mesh(new THREE.CircleGeometry(WORLD.island_radius, 48), mat(0x6a5a9c));
grass.rotation.x = -Math.PI / 2; grass.position.y = 0.01;
scene.add(grass);
const sea = new THREE.Mesh(new THREE.CircleGeometry(160, 48), new THREE.MeshBasicMaterial({ color: 0x2a1f48 }));
sea.rotation.x = -Math.PI / 2; sea.position.y = -3;
scene.add(sea);
for (let i = 0; i < 26; i++) { // mây trôi
  const c = new THREE.Mesh(new THREE.SphereGeometry(4 + (i % 5), 10, 8), new THREE.MeshBasicMaterial({ color: 0x3a2d5e, transparent: true, opacity: 0.55 }));
  const a = i * 2.399, r = 48 + (i % 7) * 9;
  c.position.set(Math.sin(a) * r, -2.4, Math.cos(a) * r); c.scale.y = 0.35;
  scene.add(c);
}
const stars = new THREE.Points(
  new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(Array.from({ length: 600 }, (_, i) => { const a = i * 12.9898, b = i * 78.233; const r = 120; return i % 3 === 0 ? Math.sin(a) * r : i % 3 === 1 ? 30 + Math.abs(Math.sin(b)) * 80 : Math.cos(a * b) * r; }), 3)),
  new THREE.PointsMaterial({ color: 0xfff1c9, size: 0.7, fog: false }));
scene.add(stars);

// Nhân vật Mây: thân, đầu, nón lá, đèn lồng nhỏ
const player = new THREE.Group();
const body = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.5, 1.0, 14), mat(0xf4e7c8));
body.position.y = 0.6; player.add(body);
const head = new THREE.Mesh(new THREE.SphereGeometry(0.38, 16, 12), mat(0xf6d9b0));
head.position.y = 1.35; player.add(head);
const hat = new THREE.Mesh(new THREE.ConeGeometry(0.75, 0.45, 20), mat(0xd9b46a));
hat.position.y = 1.72; player.add(hat);
const staff = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.5, 6), mat(0x6b4a2b));
staff.position.set(0.55, 0.9, 0.1); player.add(staff);
const miniLantern = new THREE.Mesh(new THREE.SphereGeometry(0.17, 12, 10), mat(0xffc864, 0xffa63c, 1.4));
miniLantern.position.set(0.55, 1.62, 0.1); player.add(miniLantern);
const pLight = new THREE.PointLight(0xffb45a, 1.2, 14, 1.6);
pLight.position.set(0.55, 1.6, 0.1); player.add(pLight);
scene.add(player);

// Đèn lồng lớn
const lanternObjs = new Map();
function makeLantern(l) {
  const g = new THREE.Group();
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.2, 3.4, 8), mat(0x4a3868));
  pole.position.y = 1.7; g.add(pole);
  const box = new THREE.Mesh(new THREE.BoxGeometry(1.3, 1.5, 1.3), mat(0x8a72c0, 0x5a3a8a, 0.35));
  box.position.y = 4.0; g.add(box);
  const cap = new THREE.Mesh(new THREE.ConeGeometry(1.1, 0.7, 4), mat(0x3b2a58));
  cap.position.y = 5.1; cap.rotation.y = Math.PI / 4; g.add(cap);
  const light = new THREE.PointLight(0xffa84a, 0, 40, 1.4);
  light.position.y = 4; g.add(light);
  const ring = new THREE.Mesh(new THREE.RingGeometry(T.safe_radius - 0.12, T.safe_radius, 48), new THREE.MeshBasicMaterial({ color: 0xffc864, transparent: true, opacity: 0, side: THREE.DoubleSide }));
  ring.rotation.x = -Math.PI / 2; ring.position.y = 0.05; g.add(ring);
  const tank = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.12, 0.9), mat(0xffc864, 0xffa63c, 0.9)); // thanh tiến độ nạp
  tank.position.y = 2.2; g.add(tank);
  g.position.set(l.pos[0], 0, l.pos[2]);
  scene.add(g);
  return { g, box, light, ring, tank, cap };
}

const moteObjs = new Map(), shadeObjs = new Map();
const moteGeo = new THREE.SphereGeometry(0.22, 10, 8);
const moteMat = new THREE.MeshBasicMaterial({ color: 0xffd36e });
function makeShade() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.9, 16, 12), new THREE.MeshStandardMaterial({ color: 0x2b0f3f, emissive: 0x3a1060, emissiveIntensity: 0.6, roughness: 1 }));
  g.add(body);
  for (const x of [-0.3, 0.3]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), new THREE.MeshBasicMaterial({ color: 0xe9d9ff })); e.position.set(x, 0.15, 0.78); g.add(e); }
  const drip = new THREE.Mesh(new THREE.ConeGeometry(0.5, 0.9, 10), new THREE.MeshStandardMaterial({ color: 0x24093a }));
  drip.position.y = -0.8; drip.rotation.x = Math.PI; g.add(drip);
  scene.add(g);
  return { g, body };
}

// Hiệu ứng tỏa sáng
const pulses = [];
function spawnPulse(x, z) {
  const m = new THREE.Mesh(new THREE.RingGeometry(0.3, 0.6, 40), new THREE.MeshBasicMaterial({ color: 0xffd98a, transparent: true, opacity: 0.9, side: THREE.DoubleSide }));
  m.rotation.x = -Math.PI / 2; m.position.set(x, 0.1, z); scene.add(m);
  pulses.push({ m, t: 0 });
}
// Sáng tạo của tôi: đom đóm hộ đèn (chỉ hiển thị) bay quanh đèn đã thắp
const guardians = [];

// ---- Điều khiển ----
const keys = new Set();
let camYaw = 0, pendingJump = false;
const input = newInputState();
let game, acc = 0, last = performance.now(), msgTimer = 0, started = false;

addEventListener('keydown', (e) => {
  if (e.repeat) return;
  keys.add(e.code);
  if (e.code === 'Space') { pendingJump = true; e.preventDefault(); }
  if (e.code === 'KeyR') restart();
  if (e.code === 'Enter' && !started) begin();
});
addEventListener('keyup', (e) => keys.delete(e.code));
let dragging = false;
addEventListener('mousedown', () => { dragging = true; });
addEventListener('mouseup', () => { dragging = false; });
addEventListener('mousemove', (e) => { if (dragging) camYaw -= e.movementX * 0.4; });
addEventListener('resize', () => { renderer.setSize(innerWidth, innerHeight); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); });

function readInput() {
  const k = (c) => keys.has(c);
  // Camera đứng sau lưng, nhìn về hướng (sinθ,cosθ). Phải màn hình = -X tại θ=0, nên D => x = -1.
  const mx = (k('KeyA') ? 1 : 0) - (k('KeyD') ? 1 : 0);
  const mz = (k('KeyW') ? 1 : 0) - (k('KeyS') ? 1 : 0);
  if (k('ArrowLeft')) camYaw -= 100 * DT; // ← / → xoay camera
  if (k('ArrowRight')) camYaw += 100 * DT;
  return { mx, mz };
}

function say(text) { const m = $('msg'); m.textContent = text; m.style.opacity = 1; msgTimer = 2.2; }

function begin() { started = true; $('start').style.display = 'none'; restart(); }
$('startBtn').onclick = begin;
$('again').onclick = () => restart();

function restart() {
  if (!started) return;
  game = createGame({ seed: (Date.now() & 0x7fffffff) });
  Object.assign(input, newInputState());
  acc = 0; $('overlay').style.display = 'none';
  for (const o of moteObjs.values()) scene.remove(o); moteObjs.clear();
  for (const o of shadeObjs.values()) scene.remove(o.g); shadeObjs.clear();
  for (const o of lanternObjs.values()) scene.remove(o.g); lanternObjs.clear();
  for (const g of guardians.splice(0)) scene.remove(g.m);
  for (const l of game.lanterns) lanternObjs.set(l.id, makeLantern(l));
  $('cap').textContent = T.carry_capacity; $('lcount').textContent = T.lantern_count_night1;
  say('Nhặt đom đóm, mang về thắp đèn!');
}

function handleEvent(e) {
  const P = game.player;
  if (e.name === 'mote_picked') say('✨ Nhặt được đom đóm');
  if (e.name === 'deposit') say(`🏮 Nạp ${e.data.amount} đom đóm vào ${e.data.lantern_id} (${e.data.deposited}/${T.lantern_cost})`);
  if (e.name === 'lantern_lit') { say(`🔥 Đèn ${e.data.lantern_id} đã sáng!`); const l = game.lanterns.find((x) => x.id === e.data.lantern_id); for (let i = 0; i < 6; i++) { const m = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffe3a0 })); scene.add(m); guardians.push({ m, cx: l.pos[0], cz: l.pos[2], a: i, r: 1.6 + (i % 3) * 0.5 }); } }
  if (e.name === 'pulse') { spawnPulse(P.pos[0], P.pos[2]); say(e.data.stunned_ids.length ? `Tỏa sáng! Bóng Mực choáng: ${e.data.stunned_ids.length}` : 'Tỏa sáng!'); }
  if (e.name === 'player_hit') say(`Bóng Mực chạm bạn! Còn ${e.data.flames} ngọn lửa`);
  if (e.name === 'shade_spawned') say('Một Bóng Mực xuất hiện trong sương...');
  if (e.name === 'game_over') showOver(e.data.result, e.data.reason);
}

function showOver(result, reason) {
  $('overlay').style.display = 'flex';
  $('ovTitle').textContent = result === 'won' ? 'Đảo đã sáng rực! 🏮' : 'Sương đen đã nuốt đảo...';
  $('ovText').textContent = result === 'won' ? 'Bạn đã thắp lại cả 5 Đèn Lồng Lớn.' : reason === 'dawn' ? 'Trời sáng mà đèn chưa thắp hết.' : 'Mây đã hết ngọn lửa.';
  $('ovScore').textContent = 'Điểm: ' + game.score;
}

function updateHud() {
  const P = game.player;
  $('flames').textContent = P.flames; $('carried').textContent = P.carried;
  $('lit').textContent = game.lanterns.filter((l) => l.lit).length;
  const t = Math.max(0, timeLeftS(game));
  $('time').textContent = `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;
  $('score').textContent = game.score;
}

function syncScene(time) {
  const P = game.player;
  player.position.set(P.pos[0], P.pos[1], P.pos[2]);
  player.rotation.y = P.heading;
  player.visible = !(P.invulnTicks > 0 && Math.floor(time * 12) % 2 === 0);
  pLight.intensity = 0.9 + P.carried * 0.35;
  miniLantern.material.emissiveIntensity = 1 + P.carried * 0.3;

  const litCount = game.lanterns.filter((l) => l.lit).length;
  const k = litCount / game.lanterns.length;
  ambient.intensity = 0.95 + k * 0.9;
  scene.background.copy(DARK).lerp(WARM, k);
  scene.fog.color.copy(scene.background);

  for (const l of game.lanterns) {
    const o = lanternObjs.get(l.id);
    const prog = l.lit ? 1 : l.deposited / T.lantern_cost;
    o.tank.scale.x = Math.max(0.02, prog); o.tank.scale.z = Math.max(0.02, prog);
    o.box.material.emissive.set(l.lit ? 0xffa63c : 0xb06a30);
    o.box.material.emissiveIntensity = l.lit ? 1.6 : 0.3 + prog * 0.9;
    o.light.intensity = l.lit ? 3.2 + Math.sin(time * 3 + l.pos[0]) * 0.4 : prog * 0.9;
    o.ring.material.opacity = l.lit ? 0.35 : 0;
  }
  const seen = new Set();
  for (const m of game.motes) {
    seen.add(m.id);
    let o = moteObjs.get(m.id);
    if (!o) { o = new THREE.Mesh(moteGeo, moteMat); scene.add(o); moteObjs.set(m.id, o); }
    o.position.set(m.pos[0], 0.9 + Math.sin(time * 2 + m.pos[0]) * 0.25, m.pos[2]);
  }
  for (const [id, o] of moteObjs) if (!seen.has(id)) { scene.remove(o); moteObjs.delete(id); }
  const seenS = new Set();
  for (const s of game.shades) {
    seenS.add(s.id);
    let o = shadeObjs.get(s.id);
    if (!o) { o = makeShade(); shadeObjs.set(s.id, o); }
    o.g.position.set(s.pos[0], s.pos[1] + Math.sin(time * 3) * 0.12, s.pos[2]);
    o.g.lookAt(P.pos[0], s.pos[1], P.pos[2]);
    const stunned = s.state === 'stunned';
    o.body.material.color.set(stunned ? 0x7a5aa8 : 0x2b0f3f);
    o.g.scale.setScalar(stunned ? 0.75 + Math.sin(time * 30) * 0.03 : 1);
  }
  for (const [id, o] of shadeObjs) if (!seenS.has(id)) { scene.remove(o.g); shadeObjs.delete(id); }
  for (const g of guardians) { g.a += 0.02; g.m.position.set(g.cx + Math.sin(g.a) * g.r, 1.2 + Math.sin(g.a * 2) * 0.4, g.cz + Math.cos(g.a) * g.r); }
  for (let i = pulses.length - 1; i >= 0; i--) {
    const p = pulses[i]; p.t += 0.03;
    p.m.scale.setScalar(1 + p.t * T.pulse_radius * 1.6); p.m.material.opacity = Math.max(0, 0.9 - p.t * 1.1);
    if (p.t > 0.85) { scene.remove(p.m); pulses.splice(i, 1); }
  }
  // camera sau lưng, nhìn về hướng camYaw
  const th = (camYaw * Math.PI) / 180;
  const fx = Math.sin(th), fz = Math.cos(th);
  camera.position.set(P.pos[0] - fx * 11, 7.5 + P.pos[1] * 0.5, P.pos[2] - fz * 11);
  camera.lookAt(P.pos[0] + fx * 3, 1.2, P.pos[2] + fz * 3);
}

function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.1, (now - last) / 1000); last = now;
  if (started && game) {
    acc += dt;
    while (acc >= DT) {
      acc -= DT;
      const { mx, mz } = readInput();
      input.move = [mx, mz]; input.cam_yaw_deg = camYaw;
      input.jump = pendingJump; pendingJump = false;
      input.interact = keys.has('KeyE'); input.pulse = keys.has('KeyF');
      for (const e of step(game, input)) handleEvent(e);
    }
    updateHud(); syncScene(now / 1000);
  }
  if (msgTimer > 0) { msgTimer -= dt; if (msgTimer <= 0) $('msg').style.opacity = 0; }
  renderer.render(scene, camera);
}
requestAnimationFrame(frame);
window.__game = () => game; // phục vụ kiểm thử trên trình duyệt
