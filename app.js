import * as THREE from 'three';
import { OrbitControls } from './vendor/OrbitControls.js';
import { mergeGeometries } from './vendor/BufferGeometryUtils.js';

const $ = (s) => document.querySelector(s);

/* ---------------------------------------------------------------
   데이터: 실제 장소 좌표(위도·경도). 운영시간·요금은 공식 사이트에서 다시 확인하세요.
---------------------------------------------------------------- */
const places = [
  { id: 'shiba', name: '시바공원', en: 'Shiba Park', icon: '🌳', lat: 35.654817, lon: 139.74804, stay: 45,
    category: '공원 · 산책', hours: '공원 산책 구역 · 시설별 운영 시간이 달라요',
    desc: '도쿄타워를 바라보며 초록빛 산책로를 걸어요. 사진을 찍고 천천히 하루를 시작하기 좋은 첫 장소.',
    link: 'https://www.gotokyo.org/en/spot/423/index.html' },
  { id: 'zojoji', name: '조조지', en: 'Zōjō-ji Temple', icon: '⛩️', lat: 35.657348, lon: 139.748157, stay: 50,
    category: '사찰 · 문화', hours: '개방 시간과 행사 일정은 공식 사이트에서 확인',
    desc: '오래된 사찰의 지붕 너머로 도쿄타워가 솟아 있어요. 경내와 산게다쓰몬을 천천히 둘러보세요.',
    link: 'https://www.zojoji.or.jp/map/' },
  { id: 'lunch', name: '공원 옆 카페', en: 'Café near the park', icon: '🥐', lat: 35.65815, lon: 139.750085, stay: 75,
    category: '점심 · 카페', hours: '영업시간은 매장별로 달라요',
    desc: '공원 옆 베이커리 카페에서 빵과 커피로 쉬어가는 점심. 가게는 여행 전에 직접 골라 바꿔도 좋아요.',
    link: 'https://www.google.com/maps/search/?api=1&query=35.65815,139.750085' },
  { id: 'tower', name: '도쿄타워', en: 'Tokyo Tower', icon: '🗼', lat: 35.658581, lon: 139.745438, stay: 120,
    category: '전망대 · 랜드마크', hours: '전망대 운영 시간과 요금은 공식 사이트에서 확인',
    desc: '도쿄를 상징하는 오렌지빛 철탑. 전망대에서 도시를 내려다보고 아래층에서 작은 기념품을 골라보세요.',
    link: 'https://en.tokyotower.co.jp/fee/' },
  { id: 'azabudai', name: '아자부다이 힐즈', en: 'Azabudai Hills', icon: '🛍️', lat: 35.661586, lon: 139.740892, stay: 120,
    category: '쇼핑 · 마켓', hours: '상점별 영업시간은 공식 사이트에서 확인',
    desc: '곡선형 건축과 녹색 광장, 상점과 마켓이 이어지는 마지막 코스. 가미야초역과 연결돼 있어요.',
    link: 'https://www.azabudai-hills.com/information/index.html' },
];
const LAST = places.length - 1;
const CENTER = { lat: 35.658581, lon: 139.745438 }; // 도쿄타워
// 위도·경도 → 장면 좌표(미터). x=동, z=남(북쪽이 -z)
const project = (lat, lon) => new THREE.Vector3((lon - CENTER.lon) * 90500, 0, -(lat - CENTER.lat) * 111200);
places.forEach((p) => { p.pos = project(p.lat, p.lon); });

// 운영 종료 시각(분) 근처에 걸리는지 알려주는 대략적 안내용 값 (정확하지 않음)
const SOFT_CLOSE = { zojoji: 17 * 60 + 30, azabudai: 20 * 60, lunch: 21 * 60, tower: 23 * 60 };

const state = {
  day: 1, selected: 3, pace: 1, start: 600,
  playing: false, progress: 0,
  motion: !matchMedia('(prefers-reduced-motion: reduce)').matches,
  modes: Array(LAST).fill('walk'), minutes: Array(LAST).fill(10), distances: Array(LAST).fill(400),
};

const hhmm = (n) => `${String(Math.floor(n / 60) % 24).padStart(2, '0')}:${String(n % 60).padStart(2, '0')}`;

function toast(msg) {
  const el = $('#toast');
  el.textContent = msg; el.style.display = 'block';
  clearTimeout(toast.t); toast.t = setTimeout(() => { el.style.display = 'none'; }, 3600);
}

/* ---------------------------------------------------------------
   일정 계산과 왼쪽 패널
---------------------------------------------------------------- */
function schedule() {
  let t = state.start;
  places.forEach((p, i) => {
    p.from = t;
    p.spent = Math.round((p.stay * state.pace) / 5) * 5;
    t += p.spent;
    p.to = t;
    if (i < LAST) t += state.minutes[i];
  });
  return t - state.start;
}

function legMinutes(i) {
  const d = state.distances[i];
  return state.modes[i] === 'taxi' ? Math.max(5, Math.ceil(d / 220) + 3) : Math.ceil(d / 75) + 1;
}

function renderUI() {
  for (let i = 0; i < LAST; i++) state.minutes[i] = legMinutes(i);
  const total = schedule();
  const km = state.distances.reduce((a, b) => a + b, 0) / 1000;
  $('#distance').innerHTML = `${km.toFixed(1)} <small>km</small>`;
  $('#duration').innerHTML = `${Math.floor(total / 60)}<small>시간</small>${total % 60}<small>분</small>`;
  $('#cards').innerHTML = places.map((p, i) => `
    <button class="stop ${state.selected === i ? 'selected' : ''}" data-stop="${i}">
      <div class="stop-top">
        <span class="stop-number">${i + 1}</span>
        <div><time>${hhmm(p.from)} — ${hhmm(p.to)}</time><h3>${p.name}</h3>
        <div class="meta">${p.category} · ${p.spent}분</div></div>
        <div class="thumb t${i}" aria-hidden="true">${p.icon}</div>
      </div>
    </button>
    ${i < LAST ? `<div class="leg">${state.modes[i] === 'taxi' ? '▰ 택시' : '⌁ 도보'} ${state.minutes[i]}분 · ${(state.distances[i] / 1000).toFixed(2)}km <span>예상</span></div>` : ''}`).join('');
  $('#cards').querySelectorAll('[data-stop]').forEach((el) => { el.onclick = () => select(+el.dataset.stop); });
  pinEls.forEach((el, i) => el.classList.toggle('selected', state.selected === i));
  if (!$('#details').hidden) renderDetails();
}

function select(i, focus = true) {
  state.selected = i;
  renderUI();
  renderDetails();
  if (focus && controls) {
    controls.target.copy(places[i].pos).add(new THREE.Vector3(0, 20, 0));
    camera.zoom = Math.max(camera.zoom, 1.12);
    camera.updateProjectionMatrix();
    controls.update();
  }
}

function renderDetails() {
  const i = state.selected, p = places[i];
  const box = $('#details');
  box.hidden = false;
  const modeRow = i < LAST ? `
    <div class="mode-row">
      <button data-mode="walk" class="${state.modes[i] === 'walk' ? 'active' : ''}">도보</button>
      <button data-mode="taxi" class="${state.modes[i] === 'taxi' ? 'active' : ''}">택시</button>
      <button data-mode="subway">지하철</button>
    </div>
    <p>다음 장소까지 약 ${state.minutes[i]}분 · ${state.modes[i] === 'taxi' ? '주행 추정, 배차 시간 별도' : '도보 추정'}</p>` : '';
  box.innerHTML = `
    <div class="thumb detail-img t${i}" aria-hidden="true">${p.icon}</div>
    <button class="detail-close" aria-label="장소 상세 닫기">×</button>
    <div class="detail-body">
      <span class="eyebrow">${String(i + 1).padStart(2, '0')} / ${p.en}</span>
      <h3>${p.name}</h3>
      <div class="info">${hhmm(p.from)}–${hhmm(p.to)} · ${p.spent}분 머무르기</div>
      <p>${p.desc}</p>
      <p>${p.hours}</p>
      ${modeRow}
      <a href="${p.link}" target="_blank" rel="noopener">영업정보 확인 ↗</a> ·
      <a href="https://www.google.com/maps/search/?api=1&query=${p.lat},${p.lon}" target="_blank" rel="noopener">실제 지도 ↗</a>
      <p class="photo-note">아이콘은 장식이에요 · 실제 사진 아님</p>
      <button class="go">${i < LAST ? '여기서 다음 장소로 이동 ▶' : '오늘의 동선 다시 보기 ↺'}</button>
    </div>`;
  box.querySelector('.detail-close').onclick = () => { box.hidden = true; };
  box.querySelectorAll('[data-mode]').forEach((b) => {
    b.onclick = () => {
      if (b.dataset.mode === 'subway') { toast('이 구간은 가까워 도보를 권장해요. 지하철 경로는 실제 지도에서 확인해 주세요.'); return; }
      state.modes[i] = b.dataset.mode;
      drawRoutes(); renderUI();
    };
  });
  box.querySelector('.go').onclick = () => {
    state.progress = (i < LAST ? i : 0) / LAST;
    state.playing = true;
    box.hidden = true;
    updatePlayer();
  };
}

function setDay(n) {
  state.day = n; state.playing = false;
  $('#empty-day').hidden = n === 1;
  $('#empty-title').textContent = `Day ${n}`;
  document.querySelectorAll('.day').forEach((b) => b.classList.toggle('active', +b.dataset.day === n));
  $('#itinerary').style.opacity = n === 1 ? '1' : '.4';
  $('#itinerary').inert = n !== 1;
  updatePlayer();
}
document.querySelectorAll('.day').forEach((b) => { b.onclick = () => setDay(+b.dataset.day); });
$('#back-day').onclick = () => setDay(1);

$('#plan').onclick = () => {
  const [h, m] = $('#start').value.split(':').map(Number);
  if (!Number.isFinite(h + m)) { toast('출발 시간을 입력해 주세요.'); return; }
  state.start = h * 60 + m; state.pace = +$('#pace').value;
  state.progress = 0; state.playing = false;
  renderUI(); updatePlayer();
  const late = places.filter((p) => SOFT_CLOSE[p.id] && p.to > SOFT_CLOSE[p.id]);
  toast(late.length ? `일정을 갱신했어요. ${late.map((p) => p.name).join(', ')}의 운영시간을 확인해 주세요.` : '일정을 다시 계획했어요.');
};

$('#play').onclick = () => { if (state.progress >= 1) state.progress = 0; state.playing = !state.playing; updatePlayer(); };
$('#next').onclick = () => {
  state.progress = Math.min(1, (Math.floor(state.progress * LAST + 1e-6) + 1) / LAST);
  state.selected = Math.min(LAST, Math.round(state.progress * LAST));
  renderUI(); updatePlayer();
};
$('#progress').oninput = (e) => { state.progress = +e.target.value / 1000; state.playing = false; updatePlayer(); };

function updatePlayer() {
  const leg = Math.min(LAST - 1, Math.floor(state.progress * LAST));
  $('#play').textContent = state.playing ? 'Ⅱ' : '▶';
  $('#progress').value = state.progress * 1000;
  $('#play-label').textContent = state.progress >= 1 ? '오늘의 여행을 마쳤어요'
    : state.progress === 0 && !state.playing ? '오늘의 동선을 미리 걸어보세요'
    : `${places[leg].name} → ${places[leg + 1].name}`;
  $('#play-sub').textContent = state.progress >= 1 ? '5곳의 작은 발견 · 다시 재생할 수 있어요'
    : `${state.modes[leg] === 'taxi' ? '택시' : '도보'} ${state.minutes[leg]}분 예상 · 동선 미리보기`;
}

/* ---------------------------------------------------------------
   3D 미니어처 지도 (레고 느낌의 상자 도시, 절차적으로 생성)
---------------------------------------------------------------- */
let camera, renderer, controls, scene, staticGroup, routeGroup, traveler;
let routes = [], people = [], cars = [], pinEls = [];

const mats = new Map();
const mat = (c) => { if (!mats.has(c)) mats.set(c, new THREE.MeshStandardMaterial({ color: c, roughness: 0.85 })); return mats.get(c); };
const boxGeo = new THREE.BoxGeometry(1, 1, 1);
const cylGeo = new THREE.CylinderGeometry(1, 1, 1, 12);
const blobGeo = new THREE.IcosahedronGeometry(1, 0);

function box(parent, x, y, z, w, h, d, color) {
  const m = new THREE.Mesh(boxGeo, mat(color));
  m.position.set(x, y, z); m.scale.set(w, h, d);
  parent.add(m); return m;
}
function cyl(parent, x, y, z, r, h, color) {
  const m = new THREE.Mesh(cylGeo, mat(color));
  m.position.set(x, y, z); m.scale.set(r, h, r);
  parent.add(m); return m;
}
function beam(parent, a, b, r, color) {
  const v = new THREE.Vector3().subVectors(b, a);
  const m = cyl(parent, ...a.clone().add(b).multiplyScalar(0.5).toArray(), r, v.length(), color);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), v.normalize());
  return m;
}
const stud = (parent, x, y, z, r = 1.3, color = '#d6d4c4') => cyl(parent, x, y, z, r, 0.8, color);

let seed = 829;
const rand = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };

function tree(parent, x, z, s = 1) {
  cyl(parent, x, 5 * s, z, 1.4 * s, 10 * s, '#806647');
  const greens = ['#76966c', '#91aa7e', '#678a64'];
  for (let i = 0; i < 5; i++) {
    const m = new THREE.Mesh(blobGeo, mat(greens[i % 3]));
    m.position.set(x + (i ? Math.sin(i * 2) * 3 : 0) * s, (12 + (i % 2) * 4) * s, z + (i ? Math.cos(i * 2) * 3 : 0) * s);
    m.scale.set(5 * s, 4 * s, 5 * s);
    parent.add(m);
  }
}

function building(parent, x, z, w, d, h, color, windows = true) {
  box(parent, x, h / 2, z, w, h, d, color);
  box(parent, x, h + 0.8, z, w + 1, 1.6, d + 1, '#dddaca');
  if (windows) {
    for (let y = 5; y < h - 2; y += 5) {
      for (let xx = x - w / 2 + 3; xx < x + w / 2 - 1; xx += 5) {
        box(parent, xx, y, z + d / 2 + 0.13, 2.5, 2.5, 0.2, '#8ea8a6');
        box(parent, xx, y, z - d / 2 - 0.13, 2.5, 2.5, 0.2, '#8ea8a6');
      }
    }
    for (let xx = x - w / 2 + 3; xx < x + w / 2; xx += 6) for (let zz = z - d / 2 + 3; zz < z + d / 2; zz += 6) stud(parent, xx, h + 2, zz, 1.1);
  }
}

function tokyoTower(parent) {
  const g = new THREE.Group(); g.position.copy(places[3].pos);
  box(g, 0, 5, 0, 47, 10, 35, '#d3c6ae'); // 아래 건물
  const lv = [[0, 38], [28, 28], [55, 20], [82, 13], [107, 9], [134, 6], [158, 3.7], [187, 2.3]];
  for (let k = 0; k < lv.length - 1; k++) {
    const [y, w] = lv[k], [y2, w2] = lv[k + 1];
    const c = k >= 4 && k % 2 === 0 ? '#efede1' : '#de6439';
    for (const s of [-1, 1]) for (const t of [-1, 1]) beam(g, new THREE.Vector3(s * w, y, t * w), new THREE.Vector3(s * w2, y2, t * w2), k < 3 ? 1.6 : 1, c);
    for (const s of [-1, 1]) {
      beam(g, new THREE.Vector3(-w, y, s * w), new THREE.Vector3(w2, y2, s * w2), 0.8, c);
      beam(g, new THREE.Vector3(w, y, s * w), new THREE.Vector3(-w2, y2, s * w2), 0.8, c);
      beam(g, new THREE.Vector3(s * w, y, -w), new THREE.Vector3(s * w2, y2, w2), 0.8, c);
      beam(g, new THREE.Vector3(s * w, y, w), new THREE.Vector3(s * w2, y2, -w2), 0.8, c);
    }
  }
  for (const [y, w] of [[93, 30], [165, 13]]) box(g, 0, y, 0, w, 7, w, '#eee9d7'); // 전망대
  cyl(g, 0, 196, 0, 1.8, 25, '#eae6d9');
  cyl(g, 0, 214, 0, 0.9, 17, '#db663c');
  parent.add(g);
}

function temple(parent) {
  const g = new THREE.Group(); g.position.copy(places[1].pos);
  box(g, 0, 0.5, 0, 87, 1, 72, '#cfcbbb');
  box(g, 0, 12, 0, 54, 21, 33, '#dfd2b6');
  for (let x = -25; x <= 25; x += 8) box(g, x, 12, 18, 2, 22, 2, '#765544');
  for (let k = 0; k < 8; k++) box(g, 0, 24 + k * 1.2, 0, 66 - k * 4, 1.6, 45 - k * 4.4, '#485350');
  for (const x of [-29, 29]) for (const z of [-25, 25]) tree(g, x, z, 0.8);
  box(g, 65, 9, 0, 3, 18, 3, '#934c37'); box(g, 79, 9, 0, 3, 18, 3, '#934c37'); box(g, 72, 15, 0, 24, 6, 9, '#9d4d39'); // 산문
  parent.add(g);
}

function road(parent, a, b, width, color) {
  const len = a.distanceTo(b);
  if (len < 0.01) return;
  const m = box(parent, (a.x + b.x) / 2, 0.18, (a.z + b.z) / 2, width, 0.35, len, color);
  m.rotation.y = Math.atan2(b.x - a.x, b.z - a.z);
}

// 큰 길 몇 개 (대략적인 위치, 실제 도로망과 다름)
const roadLines = [
  [[139.739, 35.660], [139.743, 35.6603], [139.746, 35.6605], [139.751, 35.6608]],
  [[139.7501, 35.653], [139.7501, 35.662]],
  [[139.743, 35.653], [139.7436, 35.657], [139.746, 35.6605]],
  [[139.739, 35.6552], [139.743, 35.6552], [139.7501, 35.6552]],
  [[139.7435, 35.6588], [139.7501, 35.6588]],
  [[139.7395, 35.663], [139.7395, 35.657]],
];

function buildCity() {
  staticGroup = new THREE.Group(); scene.add(staticGroup);
  box(staticGroup, 0, -6, 0, 1320, 10, 1450, '#c6d0b6');
  box(staticGroup, 0, -0.5, 0, 1320, 1, 1450, '#bac5a7');
  for (let x = -640; x < 650; x += 35) for (let z = -700; z < 700; z += 35) stud(staticGroup, x, 0.1, z, 2.2, '#adbb99');

  const lines = roadLines.map((r) => r.map(([lon, lat]) => project(lat, lon)));
  lines.forEach((pts) => { for (let i = 1; i < pts.length; i++) road(staticGroup, pts[i - 1], pts[i], 12, '#66747b'); });

  const palette = ['#e0d6bd', '#d1d2c2', '#bfc9bc', '#ece5d3'];
  for (let i = 0; i < 130; i++) {
    const x = (rand() - 0.5) * 1050, z = (rand() - 0.5) * 1100;
    if (places.some((p) => Math.hypot(x - p.pos.x, z - p.pos.z) < 95)) continue;
    building(staticGroup, x, z, 15 + rand() * 20, 14 + rand() * 18, 14 + rand() * 48, palette[i % 4], i < 60);
  }
  tokyoTower(staticGroup);
  temple(staticGroup);

  const lp = places[2].pos; // 카페
  box(staticGroup, lp.x, 6, lp.z, 25, 12, 14, '#a57c52');
  box(staticGroup, lp.x, 12.7, lp.z, 28, 1.4, 17, '#b4916b');
  const sp = places[0].pos; // 공원
  box(staticGroup, sp.x, 0.6, sp.z, 120, 1.2, 90, '#a9bf92');
  for (let i = 0; i < 18; i++) tree(staticGroup, sp.x + (rand() - 0.5) * 110, sp.z + (rand() - 0.5) * 80, 0.8);
  const az = places[4].pos; // 아자부다이
  box(staticGroup, az.x, 0.6, az.z, 85, 1.2, 68, '#bac8a4');
  building(staticGroup, az.x - 50, az.z - 30, 55, 48, 160, '#9db4b2', true);
  for (let i = 0; i < 14; i++) tree(staticGroup, az.x + (rand() - 0.5) * 90, az.z + (rand() - 0.5) * 60, 0.75);
  mergeStatic();
  return lines;
}

// 같은 재질의 정적 메시를 합쳐 그리기 비용을 줄임
function mergeStatic() {
  staticGroup.updateMatrixWorld(true);
  const byMat = new Map();
  staticGroup.traverse((o) => {
    if (!o.isMesh) return;
    let g = o.geometry.clone(); g.applyMatrix4(o.matrixWorld);
    if (g.index) g = g.toNonIndexed();
    const list = byMat.get(o.material) || []; list.push(g); byMat.set(o.material, list);
  });
  staticGroup.clear();
  for (const [m, gs] of byMat) {
    const merged = mergeGeometries(gs, false);
    if (merged) { const mesh = new THREE.Mesh(merged, m); mesh.castShadow = true; mesh.receiveShadow = true; staticGroup.add(mesh); }
    gs.forEach((g) => g.dispose());
  }
}

function person(color = '#d8cba9', main = false) {
  const g = new THREE.Group();
  box(g, 0, 4.3, 0, 2.6, 3, 1.6, color);
  cyl(g, 0, 6.7, 0, 1.15, 1.8, '#dfbe86');
  box(g, 0, 7.5, 0, 2.2, 0.8, 2, '#48443c');
  const legs = [], arms = [];
  for (const s of [-1, 1]) {
    const l = new THREE.Group(); l.position.set(s * 0.7, 2.9, 0);
    box(l, 0, -1.3, 0, 1.15, 2.6, 1.3, main ? '#7b8f69' : '#4a6056'); g.add(l); legs.push(l);
    const a = new THREE.Group(); a.position.set(s * 1.75, 5.4, 0);
    box(a, 0, -1, 0, 0.8, 2, 1, color); g.add(a); arms.push(a);
  }
  if (main) box(g, 0, 4.3, -1.3, 2.2, 2.7, 1, '#e47b42');
  g.userData = { legs, arms };
  return g;
}

function vehicle(taxi) {
  const g = new THREE.Group(), c = taxi ? '#2e3838' : '#d6ceb5';
  box(g, 0, 2.5, 0, 6, 3, 11, c);
  box(g, 0, 5, -0.2, 5, 2.7, 6, c);
  for (const x of [-3, 3]) for (const z of [-3.5, 3.5]) { const w = cyl(g, x, 1.8, z, 1.6, 1, '#373a35'); w.rotation.z = Math.PI / 2; }
  if (taxi) box(g, 0, 7, 0, 2, 0.9, 1.3, '#f4e4bc');
  return g;
}

const pathOf = (pts) => {
  const c = new THREE.CurvePath();
  for (let i = 1; i < pts.length; i++) if (pts[i].distanceTo(pts[i - 1]) > 0.01) c.add(new THREE.LineCurve3(pts[i - 1], pts[i]));
  return c;
};

// 구간별 경로: 직선 대신 직각으로 꺾어 도로처럼 보이게(실제 도로 경로 아님)
function drawRoutes() {
  if (!scene) return;
  if (routeGroup) { routeGroup.traverse((o) => { if (o.geometry && o.geometry !== blobGeo) o.geometry.dispose(); }); scene.remove(routeGroup); }
  routeGroup = new THREE.Group(); scene.add(routeGroup);
  const dotGeo = new THREE.SphereGeometry(1, 6, 4);
  routes = places.slice(0, LAST).map((p, i) => {
    const a = p.pos.clone().setY(2), b = places[i + 1].pos.clone().setY(2);
    const taxi = state.modes[i] === 'taxi';
    const mid = taxi ? new THREE.Vector3(a.x, 2, b.z) : new THREE.Vector3(b.x, 2, a.z);
    const curve = pathOf([a, mid, b]);
    const length = curve.getLength();
    state.distances[i] = Math.max(50, Math.round((length * 1.08) / 10) * 10); // 도로 굴곡 보정(추정)
    const color = taxi ? '#6486b2' : '#e77543';
    for (let s = 0; s < length; s += 8) {
      const m = new THREE.Mesh(dotGeo, mat(color));
      m.position.copy(curve.getPoint(Math.min(0.999, s / length))); m.scale.setScalar(taxi ? 1.7 : 1.45);
      routeGroup.add(m);
    }
    return curve;
  });
  for (let i = 0; i < LAST; i++) state.minutes[i] = legMinutes(i);
}

async function init() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color('#e8ecdf');
  renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.7));
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  $('#canvas').appendChild(renderer.domElement);

  camera = new THREE.OrthographicCamera(-700, 700, 600, -600, 0.1, 4000);
  camera.position.set(780, 930, 970);
  controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 35, 0);
  controls.enableDamping = true; controls.dampingFactor = 0.08;
  controls.minZoom = 0.55; controls.maxZoom = 5;
  controls.maxPolarAngle = Math.PI * 0.46; controls.minPolarAngle = 0.22;
  controls.mouseButtons = { LEFT: THREE.MOUSE.PAN, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.ROTATE };
  controls.touches = { ONE: THREE.TOUCH.PAN, TWO: THREE.TOUCH.DOLLY_ROTATE };
  controls.update();

  scene.add(new THREE.HemisphereLight('#f6f8ff', '#778d76', 1.65));
  const sun = new THREE.DirectionalLight('#fff6e9', 2.1);
  sun.position.set(-400, 850, 300); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -800, right: 800, top: 800, bottom: -800, far: 2000 });
  sun.shadow.bias = -0.001;
  scene.add(sun);

  const lines = buildCity();

  // 걷는 사람과 차량
  lines.forEach((pts, i) => {
    const curve = pathOf(pts);
    for (let k = 0; k < 3; k++) {
      const g = person(['#c4ad84', '#54665d', '#bd8158', '#ded3b8'][(i + k) % 4]); g.scale.setScalar(0.85); scene.add(g);
      people.push({ g, curve, side: 6, offset: rand() });
    }
    const car = vehicle((i + 1) % 3 === 0); scene.add(car);
    cars.push({ g: car, curve, offset: rand() });
  });

  traveler = person('#e7dabb', true); traveler.scale.setScalar(1.7); scene.add(traveler);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(7, 0.7, 6, 32), mat('#e97541'));
  ring.rotation.x = Math.PI / 2; ring.position.y = 0.7; traveler.add(ring);

  places.forEach((p, i) => {
    const el = document.createElement('button');
    el.className = 'pin'; el.innerHTML = `<b>${i + 1}</b>${p.name}`;
    el.onclick = () => select(i);
    $('#pins').appendChild(el); pinEls.push(el);
  });
  drawRoutes();
  $('#map-status').hidden = true;

  const zoom = (f) => { camera.zoom = THREE.MathUtils.clamp(camera.zoom * f, 0.55, 5); camera.updateProjectionMatrix(); };
  $('#zoom-in').onclick = () => zoom(1.25);
  $('#zoom-out').onclick = () => zoom(0.8);
  $('#reset').onclick = () => {
    camera.zoom = 1; camera.position.set(780, 930, 970); controls.target.set(0, 35, 0);
    camera.updateProjectionMatrix(); controls.update(); $('#details').hidden = true;
  };
  $('#north').onclick = () => { camera.position.copy(controls.target).add(new THREE.Vector3(0, 1000, 1000)); controls.update(); };
  $('#motion').onclick = () => {
    state.motion = !state.motion;
    $('#motion').textContent = state.motion ? 'Ⅱ' : '▷';
    $('#motion').setAttribute('aria-label', state.motion ? '도시 움직임 일시정지' : '도시 움직임 재생');
  };

  const resize = () => {
    const w = $('#map').clientWidth, h = $('#map').clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h);
    const view = innerWidth < 700 ? 710 : 640;
    camera.left = (-view * w) / h; camera.right = (view * w) / h; camera.top = view; camera.bottom = -view;
    camera.updateProjectionMatrix();
  };
  new ResizeObserver(resize).observe($('#map'));
  resize(); renderUI(); updatePlayer();

  let elapsed = 0, last = performance.now();
  const tmp = new THREE.Vector3();
  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (state.motion) elapsed += dt;
    if (state.playing && state.day === 1) {
      state.progress = Math.min(1, state.progress + dt / 65);
      if (state.progress === 1) state.playing = false;
      updatePlayer();
    }
    people.forEach(({ g, curve, side, offset }, i) => {
      const phase = (elapsed * 0.03 + offset) % 2, t = phase < 1 ? phase : 2 - phase;
      g.position.copy(curve.getPoint(t));
      const dir = curve.getTangent(Math.min(0.999, t));
      g.position.add(tmp.set(dir.z * side, 0, -dir.x * side));
      g.rotation.y = Math.atan2(dir.x, dir.z) + (phase > 1 ? Math.PI : 0);
      g.userData.legs.forEach((l, j) => { l.rotation.x = Math.sin(elapsed * 6 + i + j * Math.PI) * 0.42; });
      g.userData.arms.forEach((a, j) => { a.rotation.x = -Math.sin(elapsed * 6 + i + j * Math.PI) * 0.4; });
    });
    cars.forEach(({ g, curve, offset }) => {
      const t = (elapsed * 0.035 + offset) % 1;
      g.position.copy(curve.getPoint(t));
      const dir = curve.getTangent(t);
      g.position.add(tmp.set(-dir.z * 3, 0, dir.x * 3));
      g.rotation.y = Math.atan2(dir.x, dir.z);
    });
    if (routes.length) {
      const i = Math.min(LAST - 1, Math.floor(state.progress * LAST));
      const t = state.progress === 1 ? 1 : (state.progress * LAST) % 1;
      traveler.position.copy(routes[i].getPoint(t));
      const dir = routes[i].getTangent(Math.min(0.999, t));
      traveler.rotation.y = Math.atan2(dir.x, dir.z);
      traveler.userData.legs.forEach((l, j) => { l.rotation.x = state.playing ? Math.sin(now * 0.008 + j * Math.PI) * 0.4 : 0; });
    }
    controls.update();
    const w = $('#map').clientWidth, h = $('#map').clientHeight;
    places.forEach((p, i) => {
      const v = p.pos.clone().add(new THREE.Vector3(0, i === 3 ? 110 : 25, 0)).project(camera);
      pinEls[i].style.left = `${(v.x * 0.5 + 0.5) * w}px`;
      pinEls[i].style.top = `${(-v.y * 0.5 + 0.5) * h}px`;
      pinEls[i].style.display = Math.abs(v.x) > 1.2 || Math.abs(v.y) > 1.2 ? 'none' : '';
    });
    renderer.render(scene, camera);
  }
  requestAnimationFrame(frame);
}

renderUI();
init().catch((e) => {
  $('#map-status').innerHTML = '3D 지도를 열지 못했어요. WebGL을 지원하는 브라우저에서 다시 열어주세요.<br><button onclick="location.reload()">다시 시도</button>';
  console.error(e);
});
