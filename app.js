import * as THREE from 'three';
import { OrbitControls } from './vendor/OrbitControls.js';
import { mergeGeometries } from './vendor/BufferGeometryUtils.js';

const $ = (s) => document.querySelector(s);

/* ---------------------------------------------------------------
   데이터: 실제 장소 좌표(OpenStreetMap 기준). 운영시간·요금은 공식 사이트에서 다시 확인하세요.
   날짜마다 중심 좌표·지도 데이터·기본 출발 시각이 달라요.
---------------------------------------------------------------- */
const mapLink = (lat, lon) => `https://www.google.com/maps/search/?api=1&query=${lat},${lon}`;
const DAYS = {
  1: {
    area: 'Minato', start: 720, osm: 'osm.json', hx: 660, hz: 725,
    center: { lat: 35.658581, lon: 139.745438 },
    softClose: { zojoji: 17 * 60 + 30, azabudai: 20 * 60, lunch: 21 * 60, tower: 23 * 60 },
    places: [
      { id: 'shiba', name: '시바공원', en: 'Shiba Park', lat: 35.654817, lon: 139.74804, stay: 45,
        category: '공원 · 산책', hours: '시설별 운영 시간이 달라요',
        desc: '도쿄타워를 올려다보며 초록빛 산책로를 걸어요. 사진을 찍고 천천히 하루를 시작하기 좋은 첫 장소.',
        link: 'https://www.gotokyo.org/en/spot/423/index.html' },
      { id: 'zojoji', name: '조조지', en: 'Zōjō-ji Temple', lat: 35.657348, lon: 139.748157, stay: 50,
        category: '사찰 · 문화', hours: '개방 시간과 행사 일정은 공식 사이트에서 확인',
        desc: '오래된 사찰의 지붕 너머로 도쿄타워가 솟아 있어요. 경내와 산게다쓰몬을 천천히 둘러보세요.',
        link: 'https://www.zojoji.or.jp/map/' },
      { id: 'lunch', name: '공원 옆 카페', en: 'Café by the park', lat: 35.65815, lon: 139.750085, stay: 75,
        category: '점심 · 카페', hours: '영업시간은 매장별로 달라요',
        desc: '공원 옆 베이커리 카페에서 빵과 커피로 쉬어가는 점심. 가게는 여행 전에 직접 골라 바꿔도 좋아요.',
        link: mapLink(35.65815, 139.750085) },
      { id: 'tower', name: '도쿄타워', en: 'Tokyo Tower', lat: 35.658581, lon: 139.745438, stay: 120, pinY: 215,
        category: '전망대 · 랜드마크', hours: '전망대 운영 시간과 요금은 공식 사이트에서 확인',
        desc: '도쿄를 상징하는 주황빛 철탑. 해 질 무렵 전망대에서 도시에 불이 켜지는 순간을 기다려 보세요.',
        link: 'https://en.tokyotower.co.jp/fee/' },
      { id: 'azabudai', name: '아자부다이 힐즈', en: 'Azabudai Hills', lat: 35.661586, lon: 139.740892, stay: 120,
        category: '쇼핑 · 마켓', hours: '상점별 영업시간은 공식 사이트에서 확인',
        desc: '곡선형 건축과 녹색 광장, 상점과 마켓이 이어지는 마지막 코스. 가미야초역과 연결돼 있어요.',
        link: 'https://www.azabudai-hills.com/information/index.html' },
    ],
  },
  2: {
    area: 'Asakusa', start: 930, osm: 'osm2.json', hx: 800, hz: 520,
    center: { lat: 35.7127, lon: 139.8035 },
    softClose: { sensoji: 17 * 60 },
    places: [
      { id: 'kaminari', name: '가미나리몬', en: 'Kaminarimon Gate', lat: 35.71087, lon: 139.79623, stay: 20, clear: 40,
        category: '문 · 랜드마크', hours: '문 앞은 늘 열려 있어요',
        desc: '커다란 붉은 초롱이 걸린 아사쿠사의 관문. 여기서부터 나카미세 상점가가 센소지까지 이어져요.',
        link: 'https://www.senso-ji.jp/' },
      { id: 'sensoji', name: '센소지', en: 'Sensō-ji Temple', lat: 35.7134, lon: 139.79553, stay: 60, clear: 70,
        category: '사찰 · 문화', hours: '본당 개방 시간은 계절마다 달라요',
        desc: '도쿄에서 가장 오래된 사찰. 본당과 오층탑, 향 연기가 오르는 경내를 천천히 걸어 보세요.',
        link: 'https://www.senso-ji.jp/' },
      { id: 'sumida', name: '스미다 공원', en: 'Sumida Park', lat: 35.71551, lon: 139.80314, stay: 50, clear: 60,
        category: '공원 · 강변', hours: '공원은 늘 열려 있어요',
        desc: '스미다강을 따라 걷는 강변 산책로. 건너편으로 스카이트리가 점점 크게 다가와요.',
        link: mapLink(35.71551, 139.80314) },
      { id: 'skytree', name: '도쿄 스카이트리', en: 'Tokyo Skytree', lat: 35.71005, lon: 139.81071, stay: 180, pinY: 330, clear: 80,
        category: '전망대 · 랜드마크', hours: '전망대 운영 시간과 요금은 공식 사이트에서 확인',
        desc: '높이 634m, 세계에서 가장 높은 전파탑. 해가 지면 푸른 조명이 켜지고, 아래 소라마치에서 저녁을 먹을 수 있어요.',
        link: 'https://www.tokyo-skytree.jp/en/' },
    ],
  },
  3: {
    area: 'Shibuya', start: 810, osm: 'osm3.json', hx: 760, hz: 1000,
    center: { lat: 35.667, lon: 139.704 },
    softClose: { meiji: 17 * 60 },
    places: [
      { id: 'meiji', name: '메이지 신궁', en: 'Meiji Jingu', lat: 35.67484, lon: 139.69963, stay: 60, clear: 90,
        category: '신사 · 숲', hours: '개방 시간은 일몰에 맞춰 달라져요',
        desc: '도심 한가운데 울창한 숲속으로 이어지는 참배길. 큰 도리이를 지나면 소음이 멀어져요.',
        link: 'https://www.meijijingu.or.jp/en/' },
      { id: 'takeshita', name: '다케시타 거리', en: 'Takeshita Street', lat: 35.67116, lon: 139.70496, stay: 50, clear: 30,
        category: '거리 · 쇼핑', hours: '가게마다 영업시간이 달라요',
        desc: '크레페와 패션 가게가 빼곡한 하라주쿠의 좁은 골목. 유행이 가장 빨리 지나가는 거리예요.',
        link: mapLink(35.67116, 139.70496) },
      { id: 'omotesando', name: '오모테산도 힐즈', en: 'Omotesandō Hills', lat: 35.66721, lon: 139.7089, stay: 60, clear: 50,
        category: '쇼핑 · 건축', hours: '상점별 영업시간은 공식 사이트에서 확인',
        desc: '느티나무 가로수길을 따라 길게 이어진 쇼핑 공간. 나선형 경사로를 따라 천천히 내려오며 구경해요.',
        link: 'https://www.omotesandohills.com/' },
      { id: 'crossing', name: '시부야 스크램블 교차로', en: 'Shibuya Scramble Crossing', lat: 35.6595, lon: 139.7005, stay: 30, clear: 45,
        category: '교차로 · 랜드마크', hours: '24시간',
        desc: '신호가 바뀌면 사방에서 사람들이 한꺼번에 건너는 도쿄의 상징. 해 질 녘 전광판이 켜질 때가 가장 좋아요.',
        link: mapLink(35.6595, 139.7005) },
      { id: 'sky', name: '시부야 스카이', en: 'Shibuya Sky', lat: 35.65838, lon: 139.70222, stay: 120, pinY: 190, clear: 55,
        category: '전망대', hours: '운영 시간과 예약은 공식 사이트에서 확인',
        desc: '시부야 스크램블 스퀘어 꼭대기의 야외 전망대. 노을에서 야경으로 넘어가는 시간에 맞춰 올라가 보세요.',
        link: 'https://www.shibuya-scramble-square.com/' },
    ],
  },
  4: {
    area: 'Ginza · Marunouchi', start: 600, osm: 'osm4.json', hx: 850, hz: 1000,
    center: { lat: 35.6735, lon: 139.762 },
    softClose: { tsukiji: 14 * 60 },
    places: [
      { id: 'tsukiji', name: '쓰키지 장외시장', en: 'Tsukiji Outer Market', lat: 35.66539, lon: 139.77047, stay: 70, clear: 60,
        category: '시장 · 먹거리', hours: '가게 대부분이 오후 이른 시간에 문을 닫아요',
        desc: '계란말이, 해산물 덮밥, 꼬치를 먹으며 걷는 시장 골목. 아침에 가야 가장 활기차요.',
        link: 'https://www.tsukiji.or.jp/english/' },
      { id: 'wako', name: '긴자 와코', en: 'Ginza Wako', lat: 35.67174, lon: 139.76501, stay: 70, clear: 32,
        category: '거리 · 쇼핑', hours: '상점별 영업시간은 공식 사이트에서 확인',
        desc: '긴자 4초메 교차로를 지키는 시계탑 건물. 백화점과 편집숍, 찻집이 모여 있는 거리예요.',
        link: 'https://www.wako.co.jp/' },
      { id: 'station', name: '도쿄역 마루노우치 역사', en: 'Tokyo Station Marunouchi', lat: 35.68115, lon: 139.76598, stay: 60, clear: 70,
        category: '역사 · 건축', hours: '역사 외관은 늘 볼 수 있어요',
        desc: '붉은 벽돌과 둥근 돔이 100년 넘게 서 있는 역사. 해가 지면 조명이 켜지는 모습이 특히 아름다워요.',
        link: 'https://www.tokyostationcity.com/en/' },
      { id: 'nijubashi', name: '황거 외원 · 니주바시', en: 'Imperial Palace Outer Garden', lat: 35.68022, lon: 139.7536, stay: 60, clear: 60,
        category: '정원 · 역사', hours: '외원은 개방되지만 안쪽은 제한돼 있어요',
        desc: '해자와 소나무, 돌다리가 어우러진 옛 에도성 터. 도심 속에서 가장 고요한 산책이 가능해요.',
        link: 'https://www.kunaicho.go.jp/' },
    ],
  },
};
DAYS[1].roadLines = [ // 지도 데이터를 못 받았을 때만 쓰는 대체 도로
  [[139.739, 35.660], [139.743, 35.6603], [139.746, 35.6605], [139.751, 35.6608]],
  [[139.7501, 35.653], [139.7501, 35.662]], [[139.743, 35.653], [139.7436, 35.657], [139.746, 35.6605]],
  [[139.739, 35.6552], [139.743, 35.6552], [139.7501, 35.6552]], [[139.7435, 35.6588], [139.7501, 35.6588]],
  [[139.7395, 35.663], [139.7395, 35.657]],
];
let DAY = DAYS[1], places = DAY.places, LAST = places.length - 1;
let CENTER = DAY.center, P = {};
const project = (lat, lon) => new THREE.Vector3((lon - CENTER.lon) * 90500, 0, -(lat - CENTER.lat) * 111200);

const state = {
  day: 1, selected: 0, pace: 1, start: DAY.start, userStart: false,
  playing: false, progress: 0, goal: 0, dragging: false,
  modes: [], minutes: [], distances: [],
};
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

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
    <div class="eyebrow">Day ${state.day} · ${esc(DAY.area)} · ${String(i + 1).padStart(2, '0')} / ${String(places.length).padStart(2, '0')}</div>
    <div class="clock">${hhmm(p.from)}<span>– ${hhmm(p.to)}</span></div>
    <h2>${esc(p.name)}</h2>
    <p class="sub">${esc(p.en)} · ${esc(p.category)}</p>
    <p class="desc">${esc(p.desc)}</p>
    <div class="chips">
      <span>${p.spent}분 머무르기</span><span>${esc(p.hours)}</span>
      <a href="${p.link}" target="_blank" rel="noopener">영업정보 ↗</a>
      <a href="https://www.google.com/maps/search/?api=1&query=${p.lat},${p.lon}" target="_blank" rel="noopener">지도 ↗</a>
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
}

function refresh() {
  schedule();
  renderCard();
  renderStations();
  pinEls.forEach((el, i) => el.classList.toggle('selected', i === state.selected));
}

// i번째 장소로 이동(타임라인과 카메라가 함께 따라감)
function go(i) {
  state.selected = Math.max(0, Math.min(LAST, i));
  state.goal = state.selected / LAST; state.playing = false;
  focusOn(places[state.selected].pos);
  renderCard(); markStations();
  pinEls.forEach((el, k) => el.classList.toggle('selected', k === state.selected));
  $('#play').textContent = '▶';
}

let loading = false;
async function setDay(n) {
  if (loading || !scene || n === state.day) return;
  loading = true; state.playing = false; $('#play').textContent = '▶';
  document.querySelectorAll('.day').forEach((b) => { const on = +b.dataset.day === n; b.classList.toggle('active', on); b.toggleAttribute('aria-current', on); });
  try { await loadDay(n); } finally { loading = false; }
}
document.querySelectorAll('.day').forEach((b) => { b.onclick = () => setDay(+b.dataset.day); });

$('#open-plan').onclick = () => { $('#sheet').hidden = false; };
$('#sheet-cancel').onclick = () => { $('#sheet').hidden = true; };
$('#sheet').onclick = (e) => { if (e.target.id === 'sheet') $('#sheet').hidden = true; };
$('#sheet-apply').onclick = () => {
  const [h, m] = $('#start').value.split(':').map(Number);
  if (!Number.isFinite(h + m)) { toast('출발 시간을 입력해 주세요.'); return; }
  state.start = h * 60 + m; state.userStart = true; state.pace = +document.querySelector('input[name=pace]:checked').value;
  $('#sheet').hidden = true;
  refresh(); go(0);
  const late = places.filter((p) => DAY.softClose[p.id] && p.to > DAY.softClose[p.id]);
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
  if (e.target.closest('input,textarea') || !$('#sheet').hidden) return;
  if (e.key === 'ArrowRight') go(state.selected + 1);
  if (e.key === 'ArrowLeft') go(state.selected - 1);
  if (e.key === ' ' && e.target.tagName !== 'BUTTON') { e.preventDefault(); $('#play').click(); }
});

function syncSelectedFromProgress() {
  const s = Math.round(state.progress * LAST);
  if (s !== state.selected) {
    state.selected = s; renderCard(); markStations();
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
let routes = [], people = [], cars = [], pinEls = [], dyn = null;
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

function tokyoTower(parent) {
  const g = new THREE.Group(); g.position.copy(P.tower.pos);
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
function temple(parent) {
  const g = new THREE.Group(); g.position.copy(P.zojoji.pos);
  box(g, 0, 0.5, 0, 87, 1, 72, '#d6d1c3');
  box(g, 0, 12, 0, 54, 21, 33, '#e6dbc2');
  for (let x = -25; x <= 25; x += 8) box(g, x, 12, 18, 2, 22, 2, '#7b5a48');
  for (let k = 0; k < 8; k++) box(g, 0, 24 + k * 1.2, 0, 66 - k * 4, 1.6, 45 - k * 4.4, '#4d5754');
  for (const x of [-29, 29]) for (const z of [-25, 25]) tree(g, x, z, 0.8);
  box(g, 65, 9, 0, 3, 18, 3, '#9a503a'); box(g, 79, 9, 0, 3, 18, 3, '#9a503a'); box(g, 72, 15, 0, 24, 6, 9, '#a5523c');
  parent.add(g);
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
  const flatArea = (list, y, color) => {
    for (const flat of list || []) {
      const v = []; for (let i = 0; i < flat.length; i += 2) v.push(new THREE.Vector2(flat[i], -flat[i + 1]));
      if (v.length < 3) continue;
      try {
        const geo = new THREE.ShapeGeometry(new THREE.Shape(v)); geo.rotateX(-Math.PI / 2); geo.translate(0, y, 0);
        staticGroup.add(new THREE.Mesh(geo, mat(color)));
      } catch { /* 잘못된 다각형은 건너뜀 */ }
    }
  };
  flatArea(osm.g, 0.08, '#c4d4ab'); flatArea(osm.w, 0.14, '#a9c6d6');
  for (const [h0, flat] of osm.b) {
    const xs = [], zs = []; for (let i = 0; i < flat.length; i += 2) { xs.push(flat[i]); zs.push(flat[i + 1]); }
    const minx = Math.min(...xs), maxx = Math.max(...xs), minz = Math.min(...zs), maxz = Math.max(...zs);
    const cx = (minx + maxx) / 2, cz = (minz + maxz) / 2;
    if (places.some((p) => Math.hypot(cx - p.pos.x, cz - p.pos.z) < (p.clear || 65)) || maxx - minx > 170 || maxz - minz > 170) continue;
    const shape = new THREE.Shape(xs.map((x, i) => new THREE.Vector2(x, -zs[i])));
    const h = Math.min(170, Math.max(8, h0 || 12 + rand() * 22));
    const geo = new THREE.ExtrudeGeometry(shape, { depth: h, bevelEnabled: false }); geo.rotateX(-Math.PI / 2);
    const col = rand() > 0.9 ? accent[Math.floor(rand() * accent.length)] : palette[Math.floor(rand() * palette.length)];
    staticGroup.add(new THREE.Mesh(geo, mat(col)));
    if (maxx - minx > 10 && maxz - minz > 10 && rand() > 0.5) box(staticGroup, cx, h + 0.6, cz, Math.min(7, (maxx - minx) / 2), 1.2, Math.min(5, (maxz - minz) / 2), lamp);
  }
  return lines;
}

/* ---- 날짜별 랜드마크 ---- */
function parkPatch(parent, pos, w, d, trees, color = '#b4c79e', s = 0.8) {
  box(parent, pos.x, 0.6, pos.z, w, 1.2, d, color);
  for (let i = 0; i < trees; i++) tree(parent, pos.x + (rand() - 0.5) * (w - 10), pos.z + (rand() - 0.5) * (d - 10), s);
}
function group(parent, pos) { const g = new THREE.Group(); g.position.copy(pos); parent.add(g); return g; }
function pagoda(g, x, z, floors, wall, roof) {
  for (let k = 0; k < floors; k++) {
    const w = 15 - k * 1.8;
    box(g, x, 6 + k * 9, z, w - 3, 8, w - 3, wall);
    box(g, x, 11 + k * 9, z, w + 4, 1.6, w + 4, roof);
  }
  cyl(g, x, 6 + floors * 9 + 4, z, 0.8, 9, '#d6b25e');
}

const LANDMARKS = {
  1(parent) {
    tokyoTower(parent); temple(parent);
    const lp = P.lunch.pos;
    box(parent, lp.x, 6, lp.z, 25, 12, 14, '#b88f62'); box(parent, lp.x, 12.7, lp.z, 28, 1.4, 17, '#c6a37d');
    parkPatch(parent, P.shiba.pos, 120, 90, 18);
    const az = P.azabudai.pos;
    box(parent, az.x, 0.6, az.z, 85, 1.2, 68, '#c3cfae');
    building(parent, az.x - 50, az.z - 30, 55, 48, 160, '#b7c8c6');
    for (let i = 0; i < 14; i++) tree(parent, az.x + (rand() - 0.5) * 90, az.z + (rand() - 0.5) * 60, 0.75);
  },
  2(parent) {
    // 가미나리몬: 붉은 문과 커다란 초롱
    const k = group(parent, P.kaminari.pos);
    for (const x of [-15, 15]) box(k, x, 12, 0, 6, 24, 7, '#c8402f');
    box(k, 0, 26, 0, 42, 9, 13, '#c8402f'); box(k, 0, 32.5, 0, 52, 3, 19, '#4d5754'); box(k, 0, 35, 0, 36, 3, 14, '#4d5754');
    cyl(k, 0, 15, 0, 5, 13, '#d94a38');
    // 센소지: 본당 + 오층탑
    const s = group(parent, P.sensoji.pos);
    box(s, 0, 0.5, 0, 110, 1, 90, '#d6d1c3');
    box(s, 0, 11, 0, 46, 20, 30, '#b9503a');
    for (let q = 0; q < 6; q++) box(s, 0, 23 + q * 1.3, 0, 58 - q * 5, 1.8, 40 - q * 4.5, '#4d5754');
    pagoda(s, -52, 20, 5, '#b9503a', '#4d5754');
    for (const x of [-42, 42]) tree(s, x, -34, 0.8);
    // 스미다 공원
    parkPatch(parent, P.sumida.pos, 150, 55, 16);
    // 스카이트리: 가늘게 좁아지는 흰 탑
    const t = group(parent, P.skytree.pos);
    const body = emat('#dfe9ef', glowTower), deck = emat('#8fd0ef', glowTower);
    box(t, 0, 3, 0, 70, 6, 70, '#d9d2c3');
    for (let y = 0; y < 300; y += 30) cyl(t, 0, y + 15, 0, 14 - (y / 300) * 8.5, 31, body);
    cyl(t, 0, 305, 0, 11, 12, deck); cyl(t, 0, 322, 0, 8, 10, deck);
    for (let y = 330; y < 440; y += 22) cyl(t, 0, y + 11, 0, 3.6 - (y - 330) / 70, 23, body);
  },
  3(parent) {
    // 메이지 신궁: 숲과 도리이
    const m = P.meiji.pos;
    parkPatch(parent, m, 180, 180, 46, '#a9c08e', 0.95);
    const tg = group(parent, new THREE.Vector3(m.x, 0, m.z + 78));
    for (const x of [-12, 12]) box(tg, x, 14, 0, 4.5, 28, 4.5, '#6b2f26');
    box(tg, 0, 30, 0, 42, 4, 6, '#2f2a28'); box(tg, 0, 24, 0, 34, 2.4, 4, '#6b2f26');
    box(parent, m.x, 8, m.z - 10, 36, 14, 22, '#e6dbc2'); box(parent, m.x, 17, m.z - 10, 46, 3, 30, '#4d5754');
    // 다케시타 거리: 알록달록한 작은 가게들
    const tk = P.takeshita.pos, pop = ['#f0a8b8', '#a8d0f0', '#f4d58a', '#b8e0b4', '#d9b9e8'];
    for (let i = 0; i < 9; i++) box(parent, tk.x + (i - 4) * 9, 7, tk.z + (i - 4) * 5 + (i % 2 ? 10 : -10), 8, 14, 9, pop[i % 5]);
    // 오모테산도 힐즈: 길게 낮은 건물 + 가로수
    const o = P.omotesando.pos;
    building(parent, o.x, o.z, 78, 22, 24, '#d8d1c3'); box(parent, o.x, 12, o.z + 12, 74, 5, 2, '#b7c8c6');
    for (let i = -4; i <= 4; i++) tree(parent, o.x + i * 16, o.z + 24, 0.7);
    // 시부야 스크램블: 횡단보도와 전광판
    const c = P.crossing.pos;
    box(parent, c.x, 0.4, c.z, 64, 0.8, 64, '#8d949a');
    for (let i = -3; i <= 3; i++) { box(parent, c.x + i * 7, 1, c.z, 3.2, 0.3, 60, '#f3efe4'); box(parent, c.x, 1.05, c.z + i * 7, 60, 0.3, 3.2, '#f3efe4'); }
    const scr = [emat('#7fd0ff', glowLamps), emat('#ff9ac8', glowLamps), emat('#ffe38a', glowLamps)];
    [[-42, -40], [42, -40], [-42, 42]].forEach(([dx, dz], i) => { building(parent, c.x + dx, c.z + dz, 26, 26, 38 + i * 9, '#cfc8ba'); box(parent, c.x + dx * 0.82, 30, c.z + dz * 0.82, 14, 9, 1.4, scr[i]); });
    // 시부야 스카이: 높은 유리 타워
    const sk = P.sky.pos;
    box(parent, sk.x, 75, sk.z, 44, 150, 40, '#b7c4c9'); box(parent, sk.x, 152, sk.z, 48, 4, 44, '#e7e2d6');
    box(parent, sk.x, 158, sk.z, 36, 6, 32, emat('#cfeaff', glowLamps));
  },
  4(parent) {
    // 쓰키지 장외시장: 낮은 지붕의 가게 줄
    const t = P.tsukiji.pos, awn = ['#d96a4a', '#4a8fb0', '#e0b24a'];
    for (let r = 0; r < 2; r++) for (let i = -3; i <= 3; i++) {
      box(parent, t.x + i * 15, 5, t.z + r * 22 - 11, 12, 10, 14, '#e0d6bf'); box(parent, t.x + i * 15, 10.5, t.z + r * 22 - 11, 13, 1.4, 15, awn[(i + r + 6) % 3]);
    }
    // 긴자 와코: 시계탑 건물
    const w = P.wako.pos;
    building(parent, w.x, w.z, 34, 28, 30, '#e7dfd0');
    box(parent, w.x, 40, w.z, 14, 20, 14, '#e7dfd0'); cyl(parent, w.x, 54, w.z, 7, 7, '#4d5754');
    box(parent, w.x, 41, w.z + 7.2, 8, 8, 0.8, emat('#fff2c0', glowLamps));
    // 도쿄역: 붉은 벽돌 역사 + 양끝 돔
    const s = P.station.pos;
    box(parent, s.x, 12, s.z, 190, 24, 26, '#b4604a'); box(parent, s.x, 25.5, s.z, 194, 3, 30, '#4d5754');
    box(parent, s.x, 14, s.z + 13.2, 180, 3, 0.8, emat('#ffd08a', glowLamps));
    for (const x of [-82, 82]) { cyl(parent, s.x + x, 30, s.z, 11, 12, '#b4604a'); cyl(parent, s.x + x, 40, s.z, 9, 8, '#4d5754'); }
    box(parent, s.x, 32, s.z, 30, 14, 26, '#b4604a');
    // 황거 외원: 잔디, 소나무, 돌다리
    const n = P.nijubashi.pos;
    box(parent, n.x, 0.6, n.z, 130, 1.2, 100, '#c3cfae');
    for (let i = 0; i < 16; i++) tree(parent, n.x + (rand() - 0.5) * 120, n.z + (rand() - 0.5) * 90, 0.8);
    box(parent, n.x + 40, 2.5, n.z - 4, 30, 5, 10, '#d6d1c3'); box(parent, n.x + 40, 6, n.z - 4, 30, 1.2, 12, '#cfc8ba');
  },
};

function buildCity(osm) {
  staticGroup = new THREE.Group(); scene.add(staticGroup);
  box(staticGroup, 0, -6, 0, DAY.hx * 2, 10, DAY.hz * 2, '#c9cbbc');
  box(staticGroup, 0, -0.5, 0, DAY.hx * 2, 1, DAY.hz * 2, '#d2d3c4');
  let lines;
  if (osm) lines = osmCity(osm);
  else {
    // 지도 데이터를 못 받았을 때: 장소를 잇는 직선 도로와 임의의 건물로 대신 채움
    lines = DAY.roadLines ? DAY.roadLines.map((r) => r.map(([lon, lat]) => project(lat, lon)))
      : places.slice(0, -1).map((p, i) => [p.pos, new THREE.Vector3(places[i + 1].pos.x, 0, p.pos.z), places[i + 1].pos]);
    lines.forEach((pts) => { for (let i = 1; i < pts.length; i++) road(staticGroup, pts[i - 1], pts[i], 12, '#8d949a'); });
    for (let i = 0; i < 130; i++) {
      const x = (rand() - 0.5) * DAY.hx * 1.6, z = (rand() - 0.5) * DAY.hz * 1.6;
      if (places.some((p) => Math.hypot(x - p.pos.x, z - p.pos.z) < 95)) continue;
      building(staticGroup, x, z, 15 + rand() * 20, 14 + rand() * 18, 14 + rand() * 48, ['#ebe6dc', '#e2dccf', '#d8d1c3'][i % 3]);
    }
  }
  LANDMARKS[state.day](staticGroup);
  mergeStatic();
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
function overview() { camGoal = { target: new THREE.Vector3(0, 35, 0), zoom: Math.max(0.58, (0.95 * 725) / Math.max(DAY.hx, DAY.hz)) }; }

/* ---- 날짜 불러오기: 지도 데이터를 받고 도시를 새로 짓는다 ---- */
const osmCache = {};
async function loadDay(n) {
  const cfg = DAYS[n];
  $('#map-status').textContent = `${n}일째 거리를 준비하고 있어요…`; $('#map-status').hidden = false;
  let osm = osmCache[n];
  if (osm === undefined) {
    osm = null;
    try { const res = await fetch(`./${cfg.osm}`); if (res.ok) osm = await res.json(); } catch { /* 대체 도시 */ }
    osmCache[n] = osm;
  }
  // 이전 날짜 정리
  for (const g of [staticGroup, routeGroup, dyn]) {
    if (!g) continue;
    g.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
    scene.remove(g);
  }
  graph.clear(); linked.walk = linked.taxi = null;
  glowTower.length = 0; glowLamps.length = 0; people = []; cars = []; routes = [];
  $('#pins').innerHTML = ''; pinEls = [];
  // 새 날짜 설정
  state.day = n; DAY = cfg; places = cfg.places; LAST = places.length - 1; CENTER = cfg.center;
  places.forEach((p) => { p.pos = project(p.lat, p.lon); }); P = Object.fromEntries(places.map((p) => [p.id, p]));
  state.selected = 0; state.progress = 0; state.goal = 0; state.playing = false;
  state.modes = Array(LAST).fill('walk'); state.minutes = Array(LAST).fill(10); state.distances = Array(LAST).fill(400);
  if (!state.userStart) { state.start = cfg.start; $('#start').value = hhmm(cfg.start); }
  const s = Math.max(cfg.hx, cfg.hz) * 1.15;
  Object.assign(sunLight.shadow.camera, { left: -s, right: s, top: s, bottom: -s }); sunLight.shadow.camera.updateProjectionMatrix();

  seed = 829 + n * 17;
  let lines;
  try { lines = buildCity(osm); } catch (e) {
    console.warn('OSM 도시 생성 실패, 대체 도시 사용', e);
    scene.remove(staticGroup); graph.clear(); glowTower.length = 0; glowLamps.length = 0; lines = buildCity(null);
  }
  dyn = new THREE.Group(); scene.add(dyn);
  const long = lines.filter((pts) => pts.length >= 2 && pts[0].distanceTo(pts[pts.length - 1]) > 70);
  const walkLines = long.filter((p) => p.drive !== true), driveLines = long.filter((p) => p.drive !== false);
  const pick = (arr, k) => Array.from({ length: Math.min(k, arr.length) }, (_, i) => arr[Math.floor(((i + 0.5) * arr.length) / k)]);
  pick(walkLines.length ? walkLines : long, 20).forEach((pts, i) => {
    const g = person(['#c4ad84', '#54665d', '#bd8158', '#ded3b8'][i % 4]); g.scale.setScalar(0.85); dyn.add(g);
    people.push({ g, curve: pathOf(pts), side: pts.drive === false ? 0 : 5, offset: rand() });
  });
  pick(driveLines.length ? driveLines : long, 10).forEach((pts, i) => { const car = vehicle(i % 3 === 0); dyn.add(car); cars.push({ g: car, curve: pathOf(pts), offset: rand() }); });

  places.forEach((p, i) => {
    const el = document.createElement('button');
    el.className = 'pin'; el.innerHTML = `<i>${i + 1}</i><span>${esc(p.name)}</span>`; el.setAttribute('aria-label', `${i + 1}번 ${p.name}`);
    el.onclick = () => go(i); $('#pins').appendChild(el); pinEls.push(el);
  });
  drawRoutes(); refresh(); go(0);
  $('#map-status').hidden = true;
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
  controls.minZoom = 0.55; controls.maxZoom = 5; controls.maxPolarAngle = Math.PI * 0.46; controls.minPolarAngle = 0.22;
  controls.mouseButtons = { LEFT: THREE.MOUSE.PAN, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.ROTATE };
  controls.touches = { ONE: THREE.TOUCH.PAN, TWO: THREE.TOUCH.DOLLY_ROTATE };
  controls.update();
  controls.addEventListener('start', () => { camGoal = null; });

  hemi = new THREE.HemisphereLight('#f6f8ff', '#778d76', 1.6); scene.add(hemi);
  sunLight = new THREE.DirectionalLight('#fff6e9', 2.0);
  sunLight.position.set(-400, 850, 300); sunLight.castShadow = true; sunLight.shadow.mapSize.set(2048, 2048);
  Object.assign(sunLight.shadow.camera, { left: -800, right: 800, top: 800, bottom: -800, far: 2400 }); sunLight.shadow.bias = -0.001;
  scene.add(sunLight);

  traveler = person('#f0e6cf', true); traveler.scale.setScalar(1.9); scene.add(traveler);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(7, 0.8, 6, 32), new THREE.MeshBasicMaterial({ color: '#e2452b' }));
  ring.rotation.x = Math.PI / 2; ring.position.y = 0.7; traveler.add(ring);

  await loadDay(1);
  camera.zoom = 1.3; camera.updateProjectionMatrix();
  const zoom = (f) => { camGoal = null; camera.zoom = THREE.MathUtils.clamp(camera.zoom * f, 0.55, 5); camera.updateProjectionMatrix(); };
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
      const v = p.pos.clone().add(new THREE.Vector3(0, p.pinY || 28, 0)).project(camera);
      if (!pinEls[i]) return;
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
