// 날짜별 여행 데이터. 좌표는 OpenStreetMap(Nominatim, © OpenStreetMap contributors, ODbL)에서 확인했어요.
// 운영시간·요금은 바뀌므로 적지 않고 공식 사이트에서 다시 확인하도록 안내해요.
const day1Places = [
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
    link: 'https://www.google.com/maps/search/?api=1&query=35.65815,139.750085' },
  { id: 'tower', name: '도쿄타워', en: 'Tokyo Tower', lat: 35.658581, lon: 139.745438, stay: 120,
    category: '전망대 · 랜드마크', hours: '전망대 운영 시간과 요금은 공식 사이트에서 확인',
    desc: '도쿄를 상징하는 주황빛 철탑. 해 질 무렵 전망대에서 도시에 불이 켜지는 순간을 기다려 보세요.',
    link: 'https://en.tokyotower.co.jp/fee/' },
  { id: 'azabudai', name: '아자부다이 힐즈', en: 'Azabudai Hills', lat: 35.661586, lon: 139.740892, stay: 120,
    category: '쇼핑 · 마켓', hours: '상점별 영업시간은 공식 사이트에서 확인',
    desc: '곡선형 건축과 녹색 광장, 상점과 마켓이 이어지는 마지막 코스. 가미야초역과 연결돼 있어요.',
    link: 'https://www.azabudai-hills.com/information/index.html' },
];
const lm1 = { shiba: 'park', zojoji: 'temple', lunch: 'cafe', tower: 'tower', azabudai: 'hills' };
day1Places.forEach((p) => { p.lm = lm1[p.id]; if (p.id === 'tower') p.pinH = 215; });

const day2Places = [
  { id: 'kaminarimon', name: '가미나리몬', en: 'Kaminarimon Gate', lat: 35.7089564, lon: 139.796605, stay: 30, lm: 'gate',
    category: '문 · 랜드마크', hours: '센소지 경내 입구에 있는 문이에요 · 점등 여부는 공식 사이트에서 확인',
    desc: '아사쿠사 여행의 첫 관문. 커다란 붉은 등롱이 걸린 문 앞에서 사진을 찍고 나카미세 거리로 들어가요.',
    link: 'https://www.senso-ji.jp/' },
  { id: 'sensoji', name: '센소지', en: 'Sensō-ji Temple', lat: 35.7134032, lon: 139.7955265, stay: 60, lm: 'temple',
    category: '사찰 · 문화', hours: '참배 시간과 행사 일정은 공식 사이트에서 확인',
    desc: '도쿄에서 가장 오래된 사찰로 알려져 있어요. 나카미세 거리에서 간식을 사 먹으며 본당까지 천천히 걸어 보세요.',
    link: 'https://www.senso-ji.jp/' },
  { id: 'sumida', name: '스미다 공원', en: 'Sumida Park', lat: 35.716413, lon: 139.8028225, stay: 45, lm: 'park',
    category: '공원 · 강변 산책', hours: '열려 있는 구역이 많지만 시설별 시간은 확인이 필요해요',
    desc: '스미다강변을 따라 걷는 산책로. 강 건너로 스카이트리가 보여서 아사쿠사에서 스카이트리로 넘어가는 길에 쉬어가기 좋아요.',
    link: 'https://www.gotokyo.org/en/destinations/eastern-tokyo/asakusa/index.html' },
  { id: 'skytree', name: '도쿄 스카이트리', en: 'Tokyo Skytree', lat: 35.7100543, lon: 139.8107141, stay: 90, lm: 'skytree', pinH: 150,
    category: '전망대 · 랜드마크', hours: '전망대 운영 시간과 요금은 공식 사이트에서 확인',
    desc: '높이 634m의 전파탑. 전망대에서 스미다강과 도심을 한눈에 내려다볼 수 있어요. 맑은 날 해 질 무렵을 노려 보세요.',
    link: 'https://www.tokyo-skytree.jp/en/' },
  { id: 'solamachi', name: '도쿄 소라마치', en: 'Tokyo Solamachi', lat: 35.7102358, lon: 139.8119453, stay: 75, lm: 'mall',
    category: '쇼핑 · 식사', hours: '매장별 영업시간은 공식 사이트에서 확인',
    desc: '스카이트리 바로 아래 복합 상업시설. 기념품과 식사, 쇼핑을 한곳에서 해결하는 마지막 코스예요.',
    link: 'https://www.tokyo-solamachi.jp/' },
];

const day3Places = [
  { id: 'meiji', name: '메이지 신궁', en: 'Meiji Jingu', lat: 35.6748417, lon: 139.6996266, stay: 70, lm: 'forest',
    category: '신사 · 숲 산책', hours: '개문 시간은 계절마다 달라서 공식 사이트에서 확인',
    desc: '메이지 천황과 쇼켄 황후를 모신 신사. 번화한 시부야 한가운데에서 숲길을 걸으며 하루를 조용히 시작해요.',
    link: 'https://www.meijijingu.or.jp/' },
  { id: 'takeshita', name: '다케시타 거리', en: 'Takeshita Street', lat: 35.6703192, lon: 139.7060629, stay: 60, lm: 'street',
    category: '거리 · 간식 · 쇼핑', hours: '가게마다 영업시간이 달라요',
    desc: '하라주쿠의 젊은 패션과 간식 거리. 폭이 좁고 사람이 많아서 느긋하게 구경하며 걷기 좋아요.',
    link: 'https://www.takeshita-street.com/' },
  { id: 'omotesando', name: '오모테산도', en: 'Omotesandō', lat: 35.6656861, lon: 139.7115672, stay: 60, lm: 'avenue',
    category: '거리 · 카페 · 건축', hours: '상점·카페는 가게별 영업시간을 확인',
    desc: '가로수가 늘어선 넓은 거리와 개성 있는 건축물이 이어져요. 카페에서 한숨 돌리며 하라주쿠와 시부야 사이를 이어 줘요.',
    link: 'https://www.gotokyo.org/en/destinations/western-tokyo/harajuku/index.html' },
  { id: 'scramble', name: '시부야 스크램블 교차로', en: 'Shibuya Crossing', lat: 35.6594951, lon: 139.7004982, stay: 40, lm: 'crossing',
    category: '교차로 · 랜드마크', hours: '교차로는 항상 열려 있어요 · 주변 상점 시간은 별도',
    desc: '신호가 바뀌면 사방에서 사람들이 한꺼번에 건너는 도쿄의 상징적 풍경. 높은 곳에서 내려다보는 것도 좋아요.',
    link: 'https://www.gotokyo.org/en/destinations/western-tokyo/shibuya/index.html' },
  { id: 'shibuyasky', name: '시부야 스카이', en: 'Shibuya Sky', lat: 35.6583792, lon: 139.7022161, stay: 90, lm: 'skyscraper', pinH: 190,
    category: '전망대 · 야경', hours: '예약·입장 시간과 요금은 공식 사이트에서 확인',
    desc: '시부야 스크램블 스퀘어 옥상의 전망 시설. 스크램블 교차로와 도심 스카이라인을 내려다보는 마지막 코스예요.',
    link: 'https://www.shibuya-scramble-square.com/sky/' },
];

const day4Places = [
  { id: 'tnm', name: '도쿄국립박물관', en: 'Tokyo National Museum', lat: 35.7190448, lon: 139.7759676, stay: 100, lm: 'museum',
    category: '박물관 · 문화', hours: '휴관일과 개관 시간, 특별전은 공식 사이트에서 확인',
    desc: '일본 미술과 고고 자료를 소장한 우에노공원 안의 박물관. 출국일이라 시간이 빠듯하면 보고 싶은 전시관만 골라 보세요.',
    link: 'https://www.tnm.jp/?lang=en' },
  { id: 'ueno', name: '우에노 온시공원', en: 'Ueno Park', lat: 35.7140191, lon: 139.7739291, stay: 50, lm: 'park',
    category: '공원 · 산책', hours: '열려 있는 구역이 많지만 시설별 시간은 확인이 필요해요',
    desc: '박물관과 미술관, 연못이 모여 있는 넓은 공원. 박물관 관람 뒤 걸으며 쉬어가기 좋아요.',
    link: 'https://www.kensetsu.metro.tokyo.lg.jp/jimusho/toubuk/ueno/' },
  { id: 'ameyoko', name: '아메요코 시장', en: 'Ameya-Yokochō', lat: 35.7100241, lon: 139.7745414, stay: 60, lm: 'street',
    category: '시장 · 먹거리', hours: '가게마다 영업시간이 달라요',
    desc: '우에노역 옆 활기찬 시장 거리. 길거리 음식과 식료품, 잡화를 구경하며 점심을 해결하기 좋아요.',
    link: 'https://www.gotokyo.org/en/destinations/northern-tokyo/ueno/index.html' },
  { id: 'akihabara', name: '아키하바라', en: 'Akihabara', lat: 35.6984003, lon: 139.772618, stay: 90, lm: 'street',
    category: '전자제품 · 서브컬처', hours: '매장별 영업시간은 가게 공식 정보에서 확인',
    desc: '전자제품 상가에서 애니메이션·게임 문화의 중심지로 알려진 거리. 마지막 쇼핑과 기념품을 챙기기 좋아요.',
    link: 'https://www.gotokyo.org/en/destinations/central-tokyo/akihabara/index.html' },
];

export const DAYS = [
  { day: 1, label: '도쿄타워', center: { lat: 35.658581, lon: 139.745438 }, osm: 'osm.json', places: day1Places,
    eyebrow: 'DAY 01 / MINATO, TOKYO', title: '도쿄타워를<br>따라 걷는 하루', sub: '공원에서 커피 한 잔, 그리고 도쿄의 하늘.', mapTitle: 'Tokyo Tower & around' },
  { day: 2, label: '아사쿠사', osm: 'osm2.json', places: day2Places,
    eyebrow: 'DAY 02 / TAITO · SUMIDA', title: '아사쿠사에서<br>스카이트리까지', sub: '옛 도쿄의 사찰 거리와 강변, 그리고 가장 높은 전망대.', mapTitle: 'Asakusa & Skytree' },
  { day: 3, label: '시부야', osm: 'osm3.json', places: day3Places,
    eyebrow: 'DAY 03 / SHIBUYA · HARAJUKU', title: '숲에서 교차로까지,<br>시부야 하루', sub: '신사의 숲, 하라주쿠 거리, 그리고 스크램블 교차로.', mapTitle: 'Harajuku & Shibuya' },
  { day: 4, label: '우에노', osm: 'osm4.json', places: day4Places,
    eyebrow: 'DAY 04 / UENO · AKIHABARA', title: '우에노에서<br>아키하바라까지', sub: '박물관과 공원, 시장 거리, 마지막 쇼핑까지.', mapTitle: 'Ueno & Akihabara' },
];

// 운영 종료 시각(분) 근처에 걸리는지 알려주는 대략적 안내용 값 (정확하지 않음, 1일차만)
export const SOFT_CLOSE = { zojoji: 17 * 60 + 30, azabudai: 20 * 60, lunch: 21 * 60, tower: 23 * 60 };
