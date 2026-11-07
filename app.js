import * as THREE from 'three';
import { OrbitControls } from './vendor/OrbitControls.js';
import { mergeGeometries } from './vendor/BufferGeometryUtils.js';
import { DAYS, SOFT_CLOSE } from './days.js';
import { FOOD, FOOD_CHANNEL } from './food.js';

const $ = (s) => document.querySelector(s);

/* ---------------------------------------------------------------
   데이터: 실제 장소 좌표. 운영시간·요금은 공식 사이트에서 다시 확인하세요.
---------------------------------------------------------------- */
// 장소 데이터는 days.js에 날짜별로 있어요. loadDay()가 날짜마다 아래 값을 바꿔 끼워요.
let places = [], LAST = 0, CENTER = DAYS[0].center;
const project = (lat, lon) => new THREE.Vector3((lon - CENTER.lon) * 90500, 0, -(lat - CENTER.lat) * 111200);

const state = {
  day: 1, selected: 0, pace: 1, start: 720,
  playing: false, progress: 0, goal: 0, dragging: false,
  modes: [], minutes: [], distances: [],
};
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

function setPlaces(i) {
  const d = DAYS[i];
  places = d.places; LAST = places.length - 1;
  if (d.center) CENTER = d.center;
  else {
    const la = places.map((p) => p.lat), lo = places.map((p) => p.lon);
    CENTER = { lat: (Math.min(...la) + Math.max(...la)) / 2, lon: (Math.min(...lo) + Math.max(...lo)) / 2 };
  }
  places.forEach((p) => { p.pos = project(p.lat, p.lon); });
  state.day = d.day; state.selected = 0; state.progress = 0; state.goal = 0; state.playing = false;
  state.modes = Array(LAST).fill('walk'); state.minutes = Array(LAST).fill(10); state.distances = Array(LAST).fill(400);
}
setPlaces(0);

// 구글 지도 링크: 장소 보기, 구간 길찾기, 하루 전체 동선
const gmapPlace = (p) => `https://www.google.com/maps/search/?api=1&query=${p.lat},${p.lon}`;
const gmapDir = (a, b, mode) => `https://www.google.com/maps/dir/?api=1&origin=${a.lat},${a.lon}&destination=${b.lat},${b.lon}&travelmode=${mode}`;
function gmapDay() {
  const mid = places.slice(1, -1).map((p) => `${p.lat},${p.lon}`).join('%7C');
  return `https://www.google.com/maps/dir/?api=1&origin=${places[0].lat},${places[0].lon}&destination=${places[LAST].lat},${places[LAST].lon}${mid ? `&waypoints=${mid}` : ''}&travelmode=walking`;
}

// 수집 카드: 장소에 도착(선택)하면 그 장소의 카드를 얻어요. 이 브라우저에만 저장돼요.
const CARD_KEY = 'tmt-cards-v1';
const cards = new Set();
try { JSON.parse(localStorage.getItem(CARD_KEY) || '[]').forEach((k) => cards.add(k)); } catch { /* 저장소를 못 쓰면 이번 방문에만 기억해요 */ }
const cardKey = (p) => `${state.day}:${p.id}`;
const hasCard = (p) => cards.has(cardKey(p));
const TOTAL_CARDS = DAYS.reduce((n, d) => n + d.places.length, 0);
function saveCards() { try { localStorage.setItem(CARD_KEY, JSON.stringify([...cards])); } catch { /* 무시 */ } }
function collect(p) {
  if (hasCard(p)) return;
  cards.add(cardKey(p)); saveCards();
  const got = places.filter(hasCard).length;
  toast(got === places.length ? `Day ${state.day} 카드를 모두 모았어요 · ${got}/${places.length}` : `카드를 얻었어요 · ${p.name} (${got}/${places.length})`);
}

const hhmm = (n) => { n = Math.round(n); return `${String(Math.floor(n / 60) % 24).padStart(2, '0')}:${String(n % 60).padStart(2, '0')}`; };
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function toast(msg) {
  const el = $('#toast'); el.textContent = msg; el.style.display = 'block';
  clearTimeout(toast.t); toast.t = setTimeout(() => { el.style.display = 'none'; }, 3600);
}

/* ---------------------------------------------------------------
   일정 계산
---------------------------------------------------------------- */
function legMinutes(i) {
  const d = state.distances[i];
  return state.modes[i] === 'taxi' ? Math.max(5, Math.ceil(d / 220) + 3) : Math.ceil(d / 75) + 1;
}
function schedule() {
  for (let i = 0; i < LAST; i++) state.minutes[i] = legMinutes(i);
  let t = state.start;
  places.forEach((p, i) => {
    p.from = t; p.spent = Math.round((p.stay * state.pace) / 5) * 5; t += p.spent; p.to = t;
    if (i < LAST) t += state.minutes[i];
  });
}
// 진행도(0~1) → 시계(분). 각 장소 체류 시간의 가운데를 이어서 계산
function clockAt(p) {
  const mids = places.map((q) => (q.from + q.to) / 2);
  const x = Math.min(LAST - 1e-9, Math.max(0, p) * LAST), i = Math.floor(x), f = x - i;
  return mids[i] + (mids[i + 1] - mids[i]) * f;
}

/* ---------------------------------------------------------------
   UI 그리기
---------------------------------------------------------------- */
function renderCard() {
  const i = state.selected, p = places[i], last = i === LAST;
  const next = last ? null : places[i + 1];
  $('#card').innerHTML = `
    <div class="eyebrow">Day ${state.day} · Chapter ${String(i + 1).padStart(2, '0')} / ${String(places.length).padStart(2, '0')}${hasCard(p) ? '<span class="got">카드 획득 ✓</span>' : ''}</div>
    <div class="clock">${hhmm(p.from)}<span>– ${hhmm(p.to)}</span></div>
    <h2>${esc(p.name)}</h2>
    <p class="sub">${esc(p.en)} · ${esc(p.category)}</p>
    <p class="desc">${esc(p.desc)}</p>
    <div class="chips">
      <span>${p.spent}분 머무르기</span><span>${esc(p.hours)}</span>
      <a href="${p.link}" target="_blank" rel="noopener">공식 정보 ↗</a>
      <a href="${gmapPlace(p)}" target="_blank" rel="noopener">구글 지도 ↗</a>
      ${last ? '' : `<a href="${gmapDir(p, next, 'walking')}" target="_blank" rel="noopener">도보 길찾기 ↗</a>
      <a href="${gmapDir(p, next, 'transit')}" target="_blank" rel="noopener">대중교통 ↗</a>`}
      <a href="${gmapDay()}" target="_blank" rel="noopener">오늘 동선 ↗</a>
    </div>
    ${last ? '<div class="leg"><span>여정의 끝이에요. 처음부터 다시 걸어볼까요?</span></div>' : `
    <div class="leg">
      <span>다음 <b>${esc(next.name)}</b> · ${state.minutes[i]}분 · ${(state.distances[i] / 1000).toFixed(2)}km</span>
      <span class="seg" role="group" aria-label="이동 수단">
        <button data-mode="walk" class="${state.modes[i] === 'walk' ? 'on' : ''}">도보</button>
        <button data-mode="taxi" class="${state.modes[i] === 'taxi' ? 'on' : ''}">택시</button>
      </span>
    </div>`}
    <div class="nav">
      <button id="prev" ${i === 0 ? 'disabled' : ''} aria-label="이전 장소">← 이전</button>
      <button id="next" class="next" aria-label="${last ? '처음으로' : '다음 장소'}">${last ? '↺ 처음으로' : '다음 →'}</button>
    </div>`;
  $('#prev').onclick = () => go(i - 1);
  $('#next').onclick = () => go(last ? 0 : i + 1);
  $('#card').querySelectorAll('[data-mode]').forEach((b) => {
    b.onclick = () => { state.modes[i] = b.dataset.mode; drawRoutes(); refresh(); };
  });
}

function renderStations() {
  $('#stations').innerHTML = places.map((p, i) => `
    <button class="st" style="left:${(i / LAST) * 100}%" data-i="${i}" aria-label="${esc(p.name)} ${hhmm(p.from)}">
      <i></i><b>${hhmm((p.from + p.to) / 2)}</b><em>${esc(p.name)}</em>
    </button>`).join('');
  $('#stations').querySelectorAll('.st').forEach((el) => { el.onclick = () => go(+el.dataset.i); });
  markStations();
}
function markStations() {
  $('#stations').querySelectorAll('.st').forEach((el, i) => {
    el.classList.toggle('on', i === state.selected);
    el.classList.toggle('past', i < state.selected);
  });
  pinEls.forEach((el, i) => el.classList.toggle('new', !hasCard(places[i])));
  const mine = places.filter(hasCard).length, all = [...cards].filter((k) => DAYS.some((d) => d.places.some((p) => `${d.day}:${p.id}` === k))).length;
  $('#deck-n').textContent = all;
  $('#deck-bar').style.width = `${(all / TOTAL_CARDS) * 100}%`;
  $('#deck-btn').setAttribute('aria-label', `수집 카드 ${all}/${TOTAL_CARDS}, 오늘 ${mine}/${places.length}`);
}
function renderDeck() {
  $('#deck-list').innerHTML = DAYS.map((d) => {
    const have = d.places.filter((p) => cards.has(`${d.day}:${p.id}`)).length;
    return `<section><h4>Day ${d.day} · ${esc(d.label)} <em>${have}/${d.places.length}</em></h4><ul>${d.places.map((p) => {
      const on = cards.has(`${d.day}:${p.id}`);
      return `<li class="${on ? 'on' : ''}"><b>${on ? esc(p.name) : '?'}</b><span>${on ? esc(p.category) : '아직 만나지 못한 곳'}</span></li>`;
    }).join('')}</ul></section>`;
  }).join('');
}

function refresh() {
  schedule();
  renderCard();
  renderStations();
  pinEls.forEach((el, i) => el.classList.toggle('selected', i === state.selected));
}

// i번째 장소로 이동(타임라인과 카메라가 함께 따라감)
function go(i, getCard = true) {
  state.selected = Math.max(0, Math.min(LAST, i));
  state.goal = state.selected / LAST; state.playing = false;
  focusOn(places[state.selected].pos);
  if (getCard) collect(places[state.selected]);
  renderCard(); markStations();
  pinEls.forEach((el, k) => el.classList.toggle('selected', k === state.selected));
  $('#play').textContent = '▶';
}

let ready = false;
function setDay(n) { if (ready && n !== state.day) loadDay(n); }
document.querySelectorAll('.day').forEach((b) => { b.onclick = () => setDay(+b.dataset.day); });
$('#back-day').onclick = () => setDay(1);
function renderFood() {
  const maps = (it) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${it.en || it.name} ${it.address || '도쿄'}`.trim())}`;
  $('#food-list').innerHTML = FOOD.map((g) => `<section><h4>${esc(g.area)}</h4>${g.items.map((it) => `
    <article class="food-item">
      <div class="food-head"><b>${esc(it.name)}</b><span class="tv">${esc(FOOD_CHANNEL)}</span></div>
      ${it.en ? `<p class="food-en">${esc(it.en)}</p>` : ''}
      <p class="food-addr">${it.address ? esc(it.address) : esc(it.note)}</p>
      <div class="food-links">
        <a href="https://www.youtube.com/watch?v=${it.video.id}" target="_blank" rel="noopener">영상 보기 ▶ ${esc(it.video.title)}</a>
        <a href="${maps(it)}" target="_blank" rel="noopener">구글 지도 ↗</a>
      </div>
    </article>`).join('')}</section>`).join('');
}
$('#food-btn').onclick = () => { renderFood(); $('#food').hidden = false; };
$('#food-close').onclick = () => { $('#food').hidden = true; };
$('#food').onclick = (e) => { if (e.target.id === 'food') $('#food').hidden = true; };
$('#deck-btn').onclick = () => { renderDeck(); $('#deck').hidden = false; };
$('#deck-close').onclick = () => { $('#deck').hidden = true; };
$('#deck').onclick = (e) => { if (e.target.id === 'deck') $('#deck').hidden = true; };

$('#open-plan').onclick = () => { $('#sheet').hidden = false; };
$('#sheet-cancel').onclick = () => { $('#sheet').hidden = true; };
$('#sheet').onclick = (e) => { if (e.target.id === 'sheet') $('#sheet').hidden = true; };
$('#sheet-apply').onclick = () => {
  const [h, m] = $('#start').value.split(':').map(Number);
  if (!Number.isFinite(h + m)) { toast('출발 시간을 입력해 주세요.'); return; }
  state.start = h * 60 + m; state.pace = +document.querySelector('input[name=pace]:checked').value;
  $('#sheet').hidden = true;
  refresh(); go(0, false);
  const late = places.filter((p) => SOFT_CLOSE[p.id] && p.to > SOFT_CLOSE[p.id]);
  toast(late.length ? `일정을 갱신했어요. ${late.map((p) => p.name).join(', ')}의 운영시간을 확인해 주세요.` : '일정을 다시 계획했어요.');
};

$('#play').onclick = () => {
  if (state.progress >= 0.999) { state.progress = 0; state.goal = 0; }
  state.playing = !state.playing;
  $('#play').textContent = state.playing ? 'Ⅱ' : '▶';
};
$('#progress').addEventListener('input', (e) => {
  state.dragging = true; state.playing = false; $('#play').textContent = '▶';
  state.progress = state.goal = +e.target.value / 1000;
  syncSelectedFromProgress();
});
$('#progress').addEventListener('change', () => {
  state.dragging = false;
  go(Math.round(state.progress * LAST));
});
addEventListener('keydown', (e) => {
  if (e.target.closest('input,textarea') || !$('#sheet').hidden || !$('#deck').hidden || !$('#food').hidden) return;
  if (e.key === 'ArrowRight') go(state.selected + 1);
  if (e.key === 'ArrowLeft') go(state.selected - 1);
  if (e.key === ' ' && e.target.tagName !== 'BUTTON') { e.preventDefault(); $('#play').click(); }
});

function syncSelectedFromProgress() {
  const s = Math.round(state.progress * LAST);
  if (s !== state.selected) {
    state.selected = s; collect(places[s]); renderCard(); markStations();
    pinEls.forEach((el, k) => el.classList.toggle('selected', k === s));
  }
}

/* ---------------------------------------------------------------
   하늘과 조명: 시계(분)에 따라 아침 → 노을 → 밤
---------------------------------------------------------------- */
const C = (h) => new THREE.Color(h);
const SKY = [ // [분, 하늘색, 태양색, 태양 세기, 반구 하늘, 반구 땅, 반구 세기, 밤(0~1)]
  [330, C('#f4cdb0'), C('#ffd9b0'), 1.1, C('#ffe9d8'), C('#8a8f7a'), 1.0, 0.35],
  [480, C('#d3e6f3'), C('#fff3dc'), 1.9, C('#f6f8ff'), C('#778d76'), 1.5, 0],
  [780, C('#bddcf1'), C('#ffffff'), 2.2, C('#f4f8ff'), C('#80937a'), 1.7, 0],
  [930, C('#dbe7ec'), C('#fff0d6'), 2.0, C('#fbf6ec'), C('#85926f'), 1.6, 0],
  [1000, C('#f5cfa0'), C('#ffc78a'), 1.7, C('#ffe6c9'), C('#8a8466'), 1.3, 0.05],
  [1060, C('#ee8d66'), C('#ff9a6a'), 1.2, C('#f3b9a0'), C('#6f6a66'), 1.0, 0.3],
  [1110, C('#6a5f93'), C('#8f86c9'), 0.7, C('#8c86bd'), C('#4c4d63'), 0.9, 0.7],
  [1190, C('#242a52'), C('#7f93d6'), 0.45, C('#4a5390'), C('#2a2f4d'), 0.8, 1],
  [1440, C('#12163a'), C('#6f84c8'), 0.4, C('#3a4380'), C('#20243f'), 0.75, 1],
];
const tmpC = new THREE.Color();
let sunLight, hemi, lastTone = '', lastSkyHex = '';
const glowTower = [], glowLamps = [];

function applySky(clock) {
  clock = Math.min(1440, Math.max(330, clock));
  let k = 0; while (k < SKY.length - 2 && clock > SKY[k + 1][0]) k++;
  const a = SKY[k], b = SKY[k + 1], f = (clock - a[0]) / (b[0] - a[0]);
  const lerp = (x, y) => x + (y - x) * f;
  tmpC.copy(a[1]).lerp(b[1], f);
  scene.background.copy(tmpC); scene.fog.color.copy(tmpC);
  sunLight.color.copy(a[2]).lerp(b[2], f); sunLight.intensity = lerp(a[3], b[3]);
  hemi.color.copy(a[4]).lerp(b[4], f); hemi.groundColor.copy(a[5]).lerp(b[5], f); hemi.intensity = lerp(a[6], b[6]);
  const night = lerp(a[7], b[7]);
  const ang = Math.min(1, Math.max(0, (clock - 380) / 700)) * Math.PI;
  sunLight.position.set(-Math.cos(ang) * 700, Math.max(140, Math.sin(ang) * 900), 350);
  glowTower.forEach((m) => { m.emissiveIntensity = 0.05 + Math.min(1, night * 1.5) * 1.1; });
  glowLamps.forEach((m) => { m.emissiveIntensity = night * 1.3; });
  const tone = night > 0.5 ? 'night' : 'day';
  if (tone !== lastTone) { document.body.dataset.tone = tone; lastTone = tone; }
  const hex = `#${tmpC.getHexString()}`;
  if (hex !== lastSkyHex) {
    document.documentElement.style.setProperty('--sky', hex); lastSkyHex = hex;
    document.querySelector('meta[name=theme-color]').setAttribute('content', hex);
  }
  $('#clock').textContent = hhmm(clock);
  $('#phase').textContent = clock < 660 ? '아침' : clock < 900 ? '낮' : clock < 1000 ? '오후' : clock < 1110 ? '노을' : clock < 1190 ? '저녁' : '밤';
}

/* ---------------------------------------------------------------
   3D 도시
---------------------------------------------------------------- */
let camera, renderer, controls, scene, staticGroup, routeGroup, traveler;
let routes = [], people = [], cars = [], pinEls = [];
let camGoal = null; // {target: Vector3, zoom}

const mats = new Map();
const mat = (c) => { if (!mats.has(c)) mats.set(c, new THREE.MeshStandardMaterial({ color: c, roughness: 0.9 })); return mats.get(c); };
const emat = (c, list) => { const m = new THREE.MeshStandardMaterial({ color: c, roughness: 0.6, emissive: c, emissiveIntensity: 0 }); list.push(m); return m; };
const boxGeo = new THREE.BoxGeometry(1, 1, 1);
const cylGeo = new THREE.CylinderGeometry(1, 1, 1, 12);
const blobGeo = new THREE.IcosahedronGeometry(1, 0);
const asMat = (c) => (typeof c === 'string' ? mat(c) : c);

function box(parent, x, y, z, w, h, d, color) {
  const m = new THREE.Mesh(boxGeo, asMat(color)); m.position.set(x, y, z); m.scale.set(w, h, d); parent.add(m); return m;
}
function cyl(parent, x, y, z, r, h, color) {
  const m = new THREE.Mesh(cylGeo, asMat(color)); m.position.set(x, y, z); m.scale.set(r, h, r); parent.add(m); return m;
}
function beam(parent, a, b, r, color) {
  const v = new THREE.Vector3().subVectors(b, a);
  const m = cyl(parent, ...a.clone().add(b).multiplyScalar(0.5).toArray(), r, v.length(), color);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), v.normalize());
  return m;
}
let seed = 829;
const rand = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };

function tree(parent, x, z, s = 1) {
  cyl(parent, x, 5 * s, z, 1.4 * s, 10 * s, '#7a6650');
  const greens = ['#8aa37c', '#9db78c', '#7a966f'];
  for (let i = 0; i < 5; i++) {
    const m = new THREE.Mesh(blobGeo, mat(greens[i % 3]));
    m.position.set(x + (i ? Math.sin(i * 2) * 3 : 0) * s, (12 + (i % 2) * 4) * s, z + (i ? Math.cos(i * 2) * 3 : 0) * s);
    m.scale.set(5 * s, 4 * s, 5 * s); parent.add(m);
  }
}
function building(parent, x, z, w, d, h, color) {
  box(parent, x, h / 2, z, w, h, d, color);
  box(parent, x, h + 0.8, z, w + 1, 1.6, d + 1, '#e7e2d6');
}

function tokyoTower(parent, p) {
  const g = new THREE.Group(); g.position.copy(p.pos);
  const orange = emat('#ec4a2a', glowTower), white = emat('#f3efe4', glowTower), deck = emat('#f0ebdc', glowTower);
  box(g, 0, 5, 0, 47, 10, 35, '#d9d2c3');
  const lv = [[0, 38], [28, 28], [55, 20], [82, 13], [107, 9], [134, 6], [158, 3.7], [187, 2.3]];
  for (let k = 0; k < lv.length - 1; k++) {
    const [y, w] = lv[k], [y2, w2] = lv[k + 1];
    const c = k >= 4 && k % 2 === 0 ? white : orange;
    for (const s of [-1, 1]) for (const t of [-1, 1]) beam(g, new THREE.Vector3(s * w, y, t * w), new THREE.Vector3(s * w2, y2, t * w2), k < 3 ? 1.6 : 1, c);
    for (const s of [-1, 1]) {
      beam(g, new THREE.Vector3(-w, y, s * w), new THREE.Vector3(w2, y2, s * w2), 0.8, c);
      beam(g, new THREE.Vector3(w, y, s * w), new THREE.Vector3(-w2, y2, s * w2), 0.8, c);
      beam(g, new THREE.Vector3(s * w, y, -w), new THREE.Vector3(s * w2, y2, w2), 0.8, c);
      beam(g, new THREE.Vector3(s * w, y, w), new THREE.Vector3(s * w2, y2, -w2), 0.8, c);
    }
  }
  for (const [y, w] of [[93, 30], [165, 13]]) box(g, 0, y, 0, w, 7, w, deck);
  cyl(g, 0, 196, 0, 1.8, 25, white); cyl(g, 0, 214, 0, 0.9, 17, orange);
  parent.add(g);
}
function temple(parent, p) {
  const g = new THREE.Group(); g.position.copy(p.pos);
  box(g, 0, 0.5, 0, 87, 1, 72, '#d6d1c3');
  box(g, 0, 12, 0, 54, 21, 33, '#e6dbc2');
  for (let x = -25; x <= 25; x += 8) box(g, x, 12, 18, 2, 22, 2, '#7b5a48');
  for (let k = 0; k < 8; k++) box(g, 0, 24 + k * 1.2, 0, 66 - k * 4, 1.6, 45 - k * 4.4, '#4d5754');
  for (const x of [-29, 29]) for (const z of [-25, 25]) tree(g, x, z, 0.8);
  box(g, 65, 9, 0, 3, 18, 3, '#9a503a'); box(g, 79, 9, 0, 3, 18, 3, '#9a503a'); box(g, 72, 15, 0, 24, 6, 9, '#a5523c');
  parent.add(g);
}
function skytree(parent, p) {
  const g = new THREE.Group(); g.position.copy(p.pos);
  box(g, 0, 4, 0, 74, 8, 64, '#d9d2c3');
  for (let k = 0; k < 3; k++) {
    const a = (k * Math.PI * 2) / 3;
    beam(g, new THREE.Vector3(Math.cos(a) * 30, 6, Math.sin(a) * 30), new THREE.Vector3(Math.cos(a) * 5, 130, Math.sin(a) * 5), 3, '#e3e7e9');
  }
  cyl(g, 0, 235, 0, 5.5, 210, '#e8ebec');
  box(g, 0, 250, 0, 24, 9, 24, '#ccd4d8'); box(g, 0, 300, 0, 16, 6, 16, '#ccd4d8');
  cyl(g, 0, 345, 0, 2.2, 90, '#dde1e3'); cyl(g, 0, 405, 0, 0.9, 40, '#d3d8da');
  parent.add(g);
}
function gate(parent, p) {
  const g = new THREE.Group(); g.position.copy(p.pos);
  for (const x of [-16, 16]) { box(g, x, 10, 0, 6, 20, 6, '#c9503a'); box(g, x, 1, 0, 9, 2, 9, '#938d80'); }
  box(g, 0, 22, 0, 52, 5, 12, '#bb4531');
  for (let k = 0; k < 5; k++) box(g, 0, 26 + k * 1.3, 0, 62 - k * 6, 1.6, 20 - k * 2, '#4d5754');
  cyl(g, 0, 11, 0, 5, 13, '#d9462f');
  for (let k = 0; k < 8; k++) { // 나카미세 거리의 작은 가게들
    box(g, -14, 5, 28 + k * 16, 9, 10, 12, k % 2 ? '#dcbb92' : '#d29571');
    box(g, 14, 5, 28 + k * 16, 9, 10, 12, k % 2 ? '#d29571' : '#dcbb92');
  }
  parent.add(g);
}
function forest(parent, p) {
  const { x, z } = p.pos;
  box(parent, x, 0.6, z, 190, 1.2, 150, '#a6bd93');
  for (let i = 0; i < 48; i++) tree(parent, x + (rand() - 0.5) * 180, z + (rand() - 0.5) * 140, 0.9 + rand() * 0.5);
  const g = new THREE.Group(); g.position.set(x, 0, z + 62); // 도리이
  box(g, -14, 12, 0, 4, 24, 4, '#74503f'); box(g, 14, 12, 0, 4, 24, 4, '#74503f');
  box(g, 0, 25, 0, 40, 4, 5, '#4f3e37'); box(g, 0, 20, 0, 32, 2.4, 3, '#4f3e37');
  parent.add(g);
}
function skyscraper(parent, p) {
  const { x, z } = p.pos;
  building(parent, x, z, 52, 40, 150, '#b7c8c6');
  box(parent, x, 156, z, 40, 6, 28, '#d3dcd9'); // 옥상 전망대
}
function museum(parent, p) {
  const { x, z } = p.pos;
  box(parent, x, 0.6, z, 140, 1.2, 100, '#d6d1c3');
  box(parent, x, 13, z, 92, 24, 34, '#cbbd9d');
  for (let k = 0; k < 6; k++) box(parent, x, 26 + k * 1.4, z, 100 - k * 8, 1.6, 42 - k * 5, '#66816f');
  for (let k = -3; k <= 3; k++) box(parent, x + k * 12, 10, z + 18, 2.4, 18, 2.4, '#ece6d3');
}
function mall(parent, p) {
  const { x, z } = p.pos;
  box(parent, x, 14, z, 78, 28, 54, '#ece6d6'); box(parent, x, 29, z, 82, 2, 58, '#bdb5a0');
  for (let k = -3; k <= 3; k++) box(parent, x + k * 11, 12, z + 27.2, 7, 12, 0.3, '#94adab');
}
function crossing(parent, p) {
  const { x, z } = p.pos;
  box(parent, x, 0.5, z, 110, 0.6, 110, '#8d949a');
  for (let k = -4; k <= 4; k++) { // 횡단보도
    box(parent, x + k * 5.5, 1, z + 33, 2.4, 0.4, 24, '#f5f2e8'); box(parent, x + k * 5.5, 1, z - 33, 2.4, 0.4, 24, '#f5f2e8');
    box(parent, x + 33, 1, z + k * 5.5, 24, 0.4, 2.4, '#f5f2e8'); box(parent, x - 33, 1, z + k * 5.5, 24, 0.4, 2.4, '#f5f2e8');
  }
  for (let k = 0; k < 16; k++) {
    const a = rand() * Math.PI * 2, r = 20 + rand() * 24;
    box(parent, x + Math.cos(a) * r, 2, z + Math.sin(a) * r, 2, 4, 2, ['#c4ad84', '#54665d', '#bd8158'][k % 3]);
  }
  for (const [dx, dz, h] of [[-80, -80, 70], [80, -80, 50], [-80, 80, 60], [80, 80, 90]]) building(parent, x + dx, z + dz, 46, 42, h, '#d6dcd0');
}
function street(parent, p) {
  const { x, z } = p.pos;
  box(parent, x, 0.5, z, 150, 0.7, 14, '#c0b8a4');
  const pal = ['#e5aca6', '#a8c9bc', '#ecd484', '#a2b4d6', '#e8bf9a', '#bdaed0'];
  for (let k = -4; k <= 4; k++) for (const s of [-1, 1]) building(parent, x + k * 16, z + s * 18, 14, 16, 12 + ((k * 7 + 40) % 5) * 5, pal[(k + 8 + (s > 0 ? 2 : 0)) % 6]);
}
function avenue(parent, p) {
  const { x, z } = p.pos;
  box(parent, x, 0.5, z, 160, 0.7, 26, '#98a39c');
  for (let k = -5; k <= 5; k++) for (const s of [-1, 1]) tree(parent, x + k * 14, z + s * 16, 0.85);
  for (let k = -3; k <= 3; k += 2) building(parent, x + k * 22, z + 40, 18, 20, 18 + (k + 3) * 4, '#e2dccd');
}
function landmark(parent, p) {
  const { x, z } = p.pos;
  switch (p.lm) {
    case 'tower': tokyoTower(parent, p); break;
    case 'temple': temple(parent, p); break;
    case 'cafe':
      box(parent, x, 6, z, 25, 12, 14, '#b88f62'); box(parent, x, 12.7, z, 28, 1.4, 17, '#c6a37d');
      break;
    case 'park':
      box(parent, x, 0.6, z, 120, 1.2, 90, '#b4c79e');
      for (let i = 0; i < 18; i++) tree(parent, x + (rand() - 0.5) * 110, z + (rand() - 0.5) * 80, 0.8);
      break;
    case 'hills':
      box(parent, x, 0.6, z, 85, 1.2, 68, '#c3cfae');
      building(parent, x - 50, z - 30, 55, 48, 160, '#b7c8c6');
      for (let i = 0; i < 14; i++) tree(parent, x + (rand() - 0.5) * 90, z + (rand() - 0.5) * 60, 0.75);
      break;
    case 'skytree': skytree(parent, p); break;
    case 'gate': gate(parent, p); break;
    case 'forest': forest(parent, p); break;
    case 'skyscraper': skyscraper(parent, p); break;
    case 'museum': museum(parent, p); break;
    case 'mall': mall(parent, p); break;
    case 'crossing': crossing(parent, p); break;
    case 'street': street(parent, p); break;
    case 'avenue': avenue(parent, p); break;
    default: break;
  }
}
function road(parent, a, b, width, color) {
  const len = a.distanceTo(b); if (len < 0.01) return;
  const m = box(parent, (a.x + b.x) / 2, 0.18, (a.z + b.z) / 2, width, 0.35, len, color);
  m.rotation.y = Math.atan2(b.x - a.x, b.z - a.z);
}

/* ---- 도로 그래프 (경로 찾기) ---- */
const graph = new Map();
const linked = { walk: null, taxi: null };
const gkey = (x, z) => `${x},${z}`;
function addEdge(a, b, drive) {
  const d = Math.hypot(a[0] - b[0], a[1] - b[1]), ka = gkey(...a), kb = gkey(...b);
  if (!graph.has(ka)) graph.set(ka, { x: a[0], z: a[1], edges: [] });
  if (!graph.has(kb)) graph.set(kb, { x: b[0], z: b[1], edges: [] });
  graph.get(ka).edges.push([kb, d, drive]); graph.get(kb).edges.push([ka, d, drive]);
}
function largestComponent(mode) {
  const seen = new Set(); let best = new Set();
  for (const [id] of graph) {
    if (seen.has(id)) continue;
    const comp = new Set(), stack = [id]; seen.add(id);
    while (stack.length) {
      const k = stack.pop(); comp.add(k);
      for (const [n, , drive] of graph.get(k).edges) { if (mode === 'taxi' && !drive) continue; if (!seen.has(n)) { seen.add(n); stack.push(n); } }
    }
    if (comp.size > best.size) best = comp;
  }
  return best;
}
function nearestNode(p, mode) {
  let bk = null, bd = Infinity;
  for (const [k, n] of graph) {
    if (!linked[mode].has(k)) continue;
    if (mode === 'taxi' && !n.edges.some((e) => e[2])) continue;
    const d = Math.hypot(n.x - p.x, n.z - p.z); if (d < bd) { bd = d; bk = k; }
  }
  return bk;
}
function shortest(a, b, mode) {
  if (!graph.size) return null;
  const s = nearestNode(a, mode), t = nearestNode(b, mode); if (!s || !t) return null;
  const dist = new Map([[s, 0]]), prev = new Map(), heap = [[0, s]];
  const push = (it) => { heap.push(it); let i = heap.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (heap[p][0] <= heap[i][0]) break; [heap[p], heap[i]] = [heap[i], heap[p]]; i = p; } };
  const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let i = 0; for (;;) { const l = 2 * i + 1, r = l + 1; let m = i; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === i) break; [heap[m], heap[i]] = [heap[i], heap[m]]; i = m; } } return top; };
  while (heap.length) {
    const [d, k] = pop();
    if (d > (dist.get(k) ?? Infinity)) continue;
    if (k === t) break;
    for (const [n, w, drive] of graph.get(k).edges) {
      if (mode === 'taxi' && !drive) continue;
      const nd = d + w; if (nd < (dist.get(n) ?? Infinity)) { dist.set(n, nd); prev.set(n, k); push([nd, n]); }
    }
  }
  if (!dist.has(t)) return null;
  const pts = []; for (let k = t; k; k = prev.get(k)) { const n = graph.get(k); pts.push(new THREE.Vector3(n.x, 2.5, n.z)); }
  pts.reverse();
  return [a.clone().setY(2.5), ...pts, b.clone().setY(2.5)];
}

const roadLines = [
  [[139.739, 35.660], [139.743, 35.6603], [139.746, 35.6605], [139.751, 35.6608]],
  [[139.7501, 35.653], [139.7501, 35.662]], [[139.743, 35.653], [139.7436, 35.657], [139.746, 35.6605]],
  [[139.739, 35.6552], [139.743, 35.6552], [139.7501, 35.6552]], [[139.7435, 35.6588], [139.7501, 35.6588]],
  [[139.7395, 35.663], [139.7395, 35.657]],
];

function osmCity(osm) {
  const lines = [];
  // 건물은 차분한 웜그레이 계열, 몇 채만 따뜻한 포인트
  const palette = ['#ebe6dc', '#e2dccf', '#d8d1c3', '#e7e0d2', '#dcd5c8', '#cfc8ba', '#ece7de', '#d4ccbd'];
  const accent = ['#e5c9a8', '#d9b9a0', '#c9d1c8'];
  const lamp = emat('#ffd08a', glowLamps);
  for (const [cls, flat] of osm.r) {
    const pts = []; for (let i = 0; i < flat.length; i += 2) pts.push(new THREE.Vector3(flat[i], 0, flat[i + 1]));
    const drive = cls > 0;
    for (let i = 1; i < pts.length; i++) {
      road(staticGroup, pts[i - 1], pts[i], cls === 0 ? 3 : cls === 2 ? 14 : 7, cls === 0 ? '#d4cbb8' : '#8d949a');
      addEdge([flat[2 * i - 2], flat[2 * i - 1]], [flat[2 * i], flat[2 * i + 1]], drive);
    }
    pts.drive = drive; lines.push(pts);
  }
  linked.walk = largestComponent('walk'); linked.taxi = largestComponent('taxi');
  for (const [h0, flat] of osm.b) {
    const xs = [], zs = []; for (let i = 0; i < flat.length; i += 2) { xs.push(flat[i]); zs.push(flat[i + 1]); }
    const minx = Math.min(...xs), maxx = Math.max(...xs), minz = Math.min(...zs), maxz = Math.max(...zs);
    const cx = (minx + maxx) / 2, cz = (minz + maxz) / 2;
    if (places.some((p) => Math.hypot(cx - p.pos.x, cz - p.pos.z) < 65) || maxx - minx > 170 || maxz - minz > 170) continue;
    const shape = new THREE.Shape(xs.map((x, i) => new THREE.Vector2(x, -zs[i])));
    const h = Math.min(170, Math.max(8, h0 || 12 + rand() * 22));
    const geo = new THREE.ExtrudeGeometry(shape, { depth: h, bevelEnabled: false }); geo.rotateX(-Math.PI / 2);
    const col = rand() > 0.9 ? accent[Math.floor(rand() * accent.length)] : palette[Math.floor(rand() * palette.length)];
    staticGroup.add(new THREE.Mesh(geo, mat(col)));
    if (maxx - minx > 10 && maxz - minz > 10 && rand() > 0.5) box(staticGroup, cx, h + 0.6, cz, Math.min(7, (maxx - minx) / 2), 1.2, Math.min(5, (maxz - minz) / 2), lamp);
  }
  return lines;
}

// OSM 데이터가 없는 날짜용 대체 도시: 격자 도로와 상자 건물(실제 도로·건물 아님)
function gridCity(hx, hz) {
  const step = 120, lines = [], xs = [], zs = [];
  for (let x = -Math.floor((hx - 60) / step) * step; x <= hx - 60; x += step) xs.push(x);
  for (let z = -Math.floor((hz - 60) / step) * step; z <= hz - 60; z += step) zs.push(z);
  for (const x of xs) { const a = new THREE.Vector3(x, 0, zs[0]), b = new THREE.Vector3(x, 0, zs[zs.length - 1]); road(staticGroup, a, b, 12, '#8d949a'); const l = [a, b]; l.drive = true; lines.push(l); }
  for (const z of zs) { const a = new THREE.Vector3(xs[0], 0, z), b = new THREE.Vector3(xs[xs.length - 1], 0, z); road(staticGroup, a, b, 12, '#8d949a'); const l = [a, b]; l.drive = true; lines.push(l); }
  for (let i = 0; i < xs.length - 1; i++) {
    for (let j = 0; j < zs.length - 1; j++) {
      const cx = (xs[i] + xs[i + 1]) / 2, cz = (zs[j] + zs[j + 1]) / 2;
      if (rand() < 0.22 || places.some((p) => Math.hypot(cx - p.pos.x, cz - p.pos.z) < 110)) continue;
      building(staticGroup, cx, cz, 46 + rand() * 30, 46 + rand() * 30, 14 + rand() * 48, ['#ebe6dc', '#e2dccf', '#d8d1c3'][(i + j) % 3]);
    }
  }
  return lines;
}

function buildCity(osm) {
  staticGroup = new THREE.Group(); scene.add(staticGroup);
  const hx = Math.max(660, Math.max(...places.map((p) => Math.abs(p.pos.x))) + 450);
  const hz = Math.max(725, Math.max(...places.map((p) => Math.abs(p.pos.z))) + 450);
  box(staticGroup, 0, -6, 0, hx * 2, 10, hz * 2, '#c9cbbc');
  box(staticGroup, 0, -0.5, 0, hx * 2, 1, hz * 2, '#d2d3c4');
  let lines;
  if (osm) lines = osmCity(osm);
  else if (state.day === 1) {
    lines = roadLines.map((r) => r.map(([lon, lat]) => project(lat, lon)));
    lines.forEach((pts) => { for (let i = 1; i < pts.length; i++) road(staticGroup, pts[i - 1], pts[i], 12, '#8d949a'); });
    for (let i = 0; i < 130; i++) {
      const x = (rand() - 0.5) * 1050, z = (rand() - 0.5) * 1100;
      if (places.some((p) => Math.hypot(x - p.pos.x, z - p.pos.z) < 95)) continue;
      building(staticGroup, x, z, 15 + rand() * 20, 14 + rand() * 18, 14 + rand() * 48, ['#ebe6dc', '#e2dccf', '#d8d1c3'][i % 3]);
    }
  } else lines = gridCity(hx, hz);
  places.forEach((p) => landmark(staticGroup, p));
  mergeStatic();
  staticGroup.userData.half = Math.max(hx, hz);
  return lines;
}
function mergeStatic() {
  staticGroup.updateMatrixWorld(true);
  const byMat = new Map();
  staticGroup.traverse((o) => {
    if (!o.isMesh) return;
    let g = o.geometry.clone(); g.applyMatrix4(o.matrixWorld); if (g.index) g = g.toNonIndexed();
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
  box(g, 0, 4.3, 0, 2.6, 3, 1.6, color); cyl(g, 0, 6.7, 0, 1.15, 1.8, '#dfbe86'); box(g, 0, 7.5, 0, 2.2, 0.8, 2, '#48443c');
  const legs = [], arms = [];
  for (const s of [-1, 1]) {
    const l = new THREE.Group(); l.position.set(s * 0.7, 2.9, 0); box(l, 0, -1.3, 0, 1.15, 2.6, 1.3, main ? '#2f3a4a' : '#4a6056'); g.add(l); legs.push(l);
    const a = new THREE.Group(); a.position.set(s * 1.75, 5.4, 0); box(a, 0, -1, 0, 0.8, 2, 1, color); g.add(a); arms.push(a);
  }
  if (main) box(g, 0, 4.3, -1.3, 2.2, 2.7, 1, '#e2452b');
  g.userData = { legs, arms }; return g;
}
function vehicle(taxi) {
  const g = new THREE.Group(), c = taxi ? '#2e3838' : '#d9d2c0';
  box(g, 0, 2.5, 0, 6, 3, 11, c); box(g, 0, 5, -0.2, 5, 2.7, 6, c);
  for (const x of [-3, 3]) for (const z of [-3.5, 3.5]) { const w = cyl(g, x, 1.8, z, 1.6, 1, '#373a35'); w.rotation.z = Math.PI / 2; }
  if (taxi) box(g, 0, 7, 0, 2, 0.9, 1.3, '#f4e4bc');
  return g;
}
const pathOf = (pts) => { const c = new THREE.CurvePath(); for (let i = 1; i < pts.length; i++) if (pts[i].distanceTo(pts[i - 1]) > 0.01) c.add(new THREE.LineCurve3(pts[i - 1], pts[i])); return c; };

function drawRoutes() {
  if (!scene) return;
  if (routeGroup) { routeGroup.traverse((o) => { if (o.geometry) o.geometry.dispose(); }); scene.remove(routeGroup); }
  routeGroup = new THREE.Group(); scene.add(routeGroup);
  routes = places.slice(0, LAST).map((p, i) => {
    const a = p.pos.clone().setY(2.5), b = places[i + 1].pos.clone().setY(2.5), taxi = state.modes[i] === 'taxi';
    let pts = shortest(a, b, taxi ? 'taxi' : 'walk');
    if (!pts || pts.length < 2) pts = [a, taxi ? new THREE.Vector3(a.x, 2.5, b.z) : new THREE.Vector3(b.x, 2.5, a.z), b];
    const curve = pathOf(pts), length = curve.getLength();
    state.distances[i] = Math.max(50, Math.round((length * 1.08) / 10) * 10);
    const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, Math.max(8, Math.ceil(length / 5)), 1.7, 5, false),
      new THREE.MeshBasicMaterial({ color: taxi ? '#3b6fd4' : '#e2452b' }));
    routeGroup.add(tube);
    return curve;
  });
  schedule();
}

/* ---- 카메라 이동 ---- */
function focusOn(pos, zoom = 1.7) {
  if (!controls) return;
  camGoal = { target: pos.clone().add(new THREE.Vector3(0, 25, 0)), zoom: reduced ? zoom : zoom };
}
function overview() { camGoal = { target: new THREE.Vector3(0, 35, 0), zoom: 0.95 * fitZoom }; }

const ATTR_OSM = $('.attribution').innerHTML;
const ATTR_GRID = '장소 좌표 <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">© OpenStreetMap contributors</a> · 도로·건물은 임의 배치 · 경로·시간은 추정';
let osmData = null, fitZoom = 1;

// 날짜를 바꾸면 도시, 동선, 핀, 안내 문구를 그 날짜 것으로 다시 만들어요
function loadDay(n) {
  const d = DAYS[n - 1];
  setPlaces(n - 1);
  if (staticGroup) { staticGroup.traverse((o) => { if (o.geometry) o.geometry.dispose(); }); scene.remove(staticGroup); }
  people.forEach((o) => scene.remove(o.g)); cars.forEach((o) => scene.remove(o.g)); people = []; cars = [];
  graph.clear(); linked.walk = null; linked.taxi = null;
  seed = n === 1 ? 829 : 829 + n * 7919;

  let osm = d.osm ? osmData : null, lines;
  try { lines = buildCity(osm); } catch (e) { console.warn('OSM 도시 생성 실패, 대체 도시 사용', e); scene.remove(staticGroup); graph.clear(); osm = null; lines = buildCity(null); }
  $('.attribution').innerHTML = osm ? ATTR_OSM : ATTR_GRID;

  const long = lines.filter((pts) => pts.length >= 2 && pts[0].distanceTo(pts[pts.length - 1]) > 70);
  const walkLines = long.filter((p) => p.drive !== true), driveLines = long.filter((p) => p.drive !== false);
  const pick = (arr, k) => Array.from({ length: Math.min(k, arr.length) }, (_, i) => arr[Math.floor(((i + 0.5) * arr.length) / k)]);
  pick(walkLines.length ? walkLines : long, 20).forEach((pts, i) => {
    const g = person(['#c4ad84', '#54665d', '#bd8158', '#ded3b8'][i % 4]); g.scale.setScalar(0.85); scene.add(g);
    people.push({ g, curve: pathOf(pts), side: pts.drive === false ? 0 : 5, offset: rand() });
  });
  pick(driveLines.length ? driveLines : long, 10).forEach((pts, i) => { const car = vehicle(i % 3 === 0); scene.add(car); cars.push({ g: car, curve: pathOf(pts), offset: rand() }); });

  $('#pins').innerHTML = ''; pinEls = [];
  places.forEach((p, i) => {
    const el = document.createElement('button');
    el.className = 'pin'; el.innerHTML = `<i>${i + 1}</i><span>${esc(p.name)}</span>`; el.setAttribute('aria-label', `${i + 1}번 ${p.name}`);
    el.onclick = () => go(i); $('#pins').appendChild(el); pinEls.push(el);
  });
  drawRoutes();

  const half = staticGroup.userData.half;
  Object.assign(sunLight.shadow.camera, { left: -half, right: half, top: half, bottom: -half, far: half * 3 });
  sunLight.shadow.camera.updateProjectionMatrix();
  const xs = places.map((p) => p.pos.x), zs = places.map((p) => p.pos.z);
  const span = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...zs) - Math.min(...zs));
  fitZoom = n === 1 ? 1 : THREE.MathUtils.clamp(1000 / (span + 200), 0.3, 1.1);

  document.querySelectorAll('.day').forEach((b) => { const on = +b.dataset.day === n; b.classList.toggle('active', on); b.toggleAttribute('aria-current', on); });
  camGoal = null; controls.target.set(0, 35, 0); camera.zoom = 1.3 * fitZoom; camera.updateProjectionMatrix();
  refresh(); go(0, false);
}

async function init() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color('#cfe4f2'); scene.fog = new THREE.Fog('#cfe4f2', 1600, 3400);
  renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.7));
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  $('#canvas').appendChild(renderer.domElement);

  camera = new THREE.OrthographicCamera(-700, 700, 600, -600, 0.1, 4000);
  camera.position.set(780, 930, 970);
  controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 35, 0); controls.enableDamping = true; controls.dampingFactor = 0.08;
  controls.minZoom = 0.3; controls.maxZoom = 5; controls.maxPolarAngle = Math.PI * 0.46; controls.minPolarAngle = 0.22;
  controls.mouseButtons = { LEFT: THREE.MOUSE.PAN, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.ROTATE };
  controls.touches = { ONE: THREE.TOUCH.PAN, TWO: THREE.TOUCH.DOLLY_ROTATE };
  controls.update();
  controls.addEventListener('start', () => { camGoal = null; });

  hemi = new THREE.HemisphereLight('#f6f8ff', '#778d76', 1.6); scene.add(hemi);
  sunLight = new THREE.DirectionalLight('#fff6e9', 2.0);
  sunLight.position.set(-400, 850, 300); sunLight.castShadow = true; sunLight.shadow.mapSize.set(2048, 2048);
  Object.assign(sunLight.shadow.camera, { left: -800, right: 800, top: 800, bottom: -800, far: 2400 }); sunLight.shadow.bias = -0.001;
  scene.add(sunLight);

  try { const res = await fetch('./osm.json'); if (res.ok) osmData = await res.json(); } catch { /* 대체 도시 */ }

  traveler = person('#f0e6cf', true); traveler.scale.setScalar(1.9); scene.add(traveler);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(7, 0.8, 6, 32), new THREE.MeshBasicMaterial({ color: '#e2452b' }));
  ring.rotation.x = Math.PI / 2; ring.position.y = 0.7; traveler.add(ring);

  loadDay(1);
  ready = true;
  $('#map-status').hidden = true;

  const zoom = (f) => { camGoal = null; camera.zoom = THREE.MathUtils.clamp(camera.zoom * f, 0.3, 5); camera.updateProjectionMatrix(); };
  $('#zoom-in').onclick = () => zoom(1.25); $('#zoom-out').onclick = () => zoom(0.8);
  $('#overview').onclick = overview;

  const resize = () => {
    const w = innerWidth, h = innerHeight; renderer.setSize(w, h);
    const view = w < 760 ? 760 : 640;
    camera.left = (-view * w) / h; camera.right = (view * w) / h; camera.top = view; camera.bottom = -view;
    // 카드가 가리지 않는 쪽으로 도시를 밀어 둠: 모바일은 위쪽, 데스크톱은 오른쪽
    if (w < 760) camera.setViewOffset(w, h, 0, h * 0.18, w, h); else camera.setViewOffset(w, h, -w * 0.09, 0, w, h);
    camera.updateProjectionMatrix();
  };
  addEventListener('resize', resize); resize();

  let elapsed = 0, last = performance.now();
  const tmp = new THREE.Vector3(), eps = 1e-4;
  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (!reduced) elapsed += dt;

    // 진행도: 재생 중이면 흐르고, 아니면 목표로 부드럽게 수렴
    if (state.playing) {
      state.progress = Math.min(1, state.progress + dt / 60); state.goal = state.progress;
      if (state.progress >= 1) { state.playing = false; $('#play').textContent = '▶'; }
      syncSelectedFromProgress();
    } else if (!state.dragging && Math.abs(state.goal - state.progress) > eps) {
      state.progress += (state.goal - state.progress) * Math.min(1, dt * (reduced ? 30 : 4));
    }
    const pv = state.progress * 1000;
    $('#progress').value = pv; $('#progress').style.setProperty('--fill', `${state.progress * 100}%`);
    applySky(clockAt(state.progress));

    people.forEach(({ g, curve, side, offset }, i) => {
      const phase = (elapsed * 0.03 + offset) % 2, t = phase < 1 ? phase : 2 - phase;
      g.position.copy(curve.getPoint(t)); const dir = curve.getTangent(Math.min(0.999, t));
      g.position.add(tmp.set(dir.z * side, 0, -dir.x * side)); g.rotation.y = Math.atan2(dir.x, dir.z) + (phase > 1 ? Math.PI : 0);
      g.userData.legs.forEach((l, j) => { l.rotation.x = Math.sin(elapsed * 6 + i + j * Math.PI) * 0.42; });
      g.userData.arms.forEach((a, j) => { a.rotation.x = -Math.sin(elapsed * 6 + i + j * Math.PI) * 0.4; });
    });
    cars.forEach(({ g, curve, offset }) => {
      const t = (elapsed * 0.035 + offset) % 1; g.position.copy(curve.getPoint(t));
      const dir = curve.getTangent(t); g.position.add(tmp.set(-dir.z * 3, 0, dir.x * 3)); g.rotation.y = Math.atan2(dir.x, dir.z);
    });
    if (routes.length) {
      const i = Math.min(LAST - 1, Math.floor(state.progress * LAST)), t = state.progress >= 1 ? 1 : (state.progress * LAST) % 1;
      traveler.position.copy(routes[i].getPoint(t)); const dir = routes[i].getTangent(Math.min(0.999, t));
      traveler.rotation.y = Math.atan2(dir.x, dir.z);
      const moving = state.playing || Math.abs(state.goal - state.progress) > 0.002;
      traveler.userData.legs.forEach((l, j) => { l.rotation.x = moving ? Math.sin(now * 0.008 + j * Math.PI) * 0.4 : 0; });
      if (state.playing) { controls.target.lerp(tmp.copy(traveler.position).setY(25), Math.min(1, dt * 2)); }
    }
    if (camGoal) {
      const k = Math.min(1, dt * 3.2);
      controls.target.lerp(camGoal.target, k); camera.zoom += (camGoal.zoom - camera.zoom) * k; camera.updateProjectionMatrix();
      if (controls.target.distanceTo(camGoal.target) < 0.5 && Math.abs(camGoal.zoom - camera.zoom) < 0.01) camGoal = null;
    }
    controls.update();
    const w = innerWidth, h = innerHeight;
    places.forEach((p, i) => {
      const v = p.pos.clone().add(new THREE.Vector3(0, p.pinH ?? 28, 0)).project(camera);
      pinEls[i].style.left = `${(v.x * 0.5 + 0.5) * w}px`; pinEls[i].style.top = `${(-v.y * 0.5 + 0.5) * h}px`;
      pinEls[i].style.display = Math.abs(v.x) > 1.2 || Math.abs(v.y) > 1.2 ? 'none' : '';
    });
    renderer.render(scene, camera);
  }
  requestAnimationFrame(frame);
}

init().catch((e) => {
  $('#map-status').innerHTML = '3D 지도를 열지 못했어요. WebGL을 지원하는 브라우저에서 다시 열어주세요.<br><button onclick="location.reload()">다시 시도</button>';
  console.error(e);
});
