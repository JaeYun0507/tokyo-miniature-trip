// 미쉐린 가이드 빕 구르망과 타베로그(일본 현지 평가) 기준으로 고른 식당 중, 구글 지도 평점 4.0 이상이고 리뷰 100개 이상인 곳만 담았어요.
// - 미쉐린: guide.michelin.com 빕 구르망 목록(도쿄)과 식당 페이지에서 2026-11-07에 확인
// - 타베로그: 지역 평점순 목록에서 라멘·야키토리·돈카츠·소바 같은 캐주얼한 곳만 골랐고, 점수는 그날 값
// - 구글 평점·리뷰 수: 2026-11-07에 구글 지도에서 직접 확인한 값이에요. 시간이 지나면 달라질 수 있어요.
// '현지인 맛집'은 일본 사람들이 쓰는 평가 사이트(타베로그) 점수가 높은 곳이라는 뜻이고, 현지인이 실제로 많이 간다는 증거는 아니에요.
export const PICKS_DATE = '2026-11-07';
const M = (slug) => `https://guide.michelin.com/kr/ko/tokyo-region/tokyo/restaurant/${slug}`;
export const PICKS = [
  { day: 1, label: 'Day 1 · 도쿄타워·시바공원 근처', items: [
    { name: '템푸라 카키아게 유키무라', en: 'Tempura Kakiage Yukimura', cuisine: '튀김(템푸라)', address: '6-13-13 Shimbashi, Minato-ku', src: 'michelin', url: M('tempura-kakiage-yukimura'), g: [4.3, 811] },
    { name: '이루카 도쿄', en: 'IRUCA TOKYO', cuisine: '라멘', address: '4-12-12 Roppongi, Minato-ku', src: 'michelin', url: M('iruca-tokyo'), g: [4.0, 1751] },
    { name: '타치구이 스시 토나리', en: 'Tachigui Sushi Tonari', cuisine: '서서 먹는 스시', address: '2F, 2-8-7 Azabujuban, Minato-ku', src: 'michelin', url: M('tachigui-sushi-tonari'), g: [4.2, 211] },
    { name: '돈카츠 이와이', en: 'Tonkatsu Iwai', cuisine: '돈카츠', address: '東京都港区芝公園2-3-7 玉川ビル 2F', src: 'tabelog', score: '3.78', url: 'https://tabelog.com/en/tokyo/A1314/A131401/13170377/', g: [4.3, 861] },
  ] },
  { day: 2, label: 'Day 2 · 아사쿠사·스카이트리 근처', items: [
    { name: '하츠오가와', en: 'Hatsuogawa', cuisine: '장어', address: '2-8-4 Kaminarimon, Taito-ku', src: 'michelin', url: M('hatsuogawa'), g: [4.1, 415] },
    { name: '오니기리 아사쿠사 야도로쿠', en: 'Onigiri Asakusa Yadoroku', cuisine: '오니기리', address: '3-9-10 Asakusa, Taito-ku', src: 'michelin', url: M('onigiri-asakusa-yadoroku'), g: [4.2, 1046] },
    { name: '스기타', en: 'Sugita', cuisine: '돈카츠', address: '3-8-3 Kotobuki, Taito-ku', src: 'michelin', url: M('sugita'), g: [4.0, 960] },
    { name: '아사쿠사 히라야마', en: 'Asakusa Hirayama', cuisine: '소바', address: '1-3-14 Nishiasakusa, Taito-ku', src: 'michelin', url: M('asakusa-hirayama'), g: [4.4, 215] },
    { name: '그릴 그랜드', en: 'grill GRAND', cuisine: '일본식 양식(요쇼쿠)', address: '3-24-6 Asakusa, Taito-ku', src: 'michelin', url: M('grill-grand'), g: [4.1, 622] },
    { name: '멘 미츠이', en: 'Men Mitsui', cuisine: '라멘·덮밥', address: '東京都台東区寿2-9-15', src: 'tabelog', score: '3.83', url: 'https://tabelog.com/en/tokyo/A1311/A131102/13284327/', g: [4.4, 1459] },
    { name: '주로쿠', en: 'Asakusa Juroku', cuisine: '소바', address: '東京都台東区浅草4-37-8 小田井ビル 1F', src: 'tabelog', score: '3.84', url: 'https://tabelog.com/en/tokyo/A1311/A131102/13185027/', g: [4.3, 243] },
    { name: '야키토리 오미노', en: 'Yakitori Omino', cuisine: '야키토리', address: '東京都墨田区押上1-38-4 清流ビル 1F', src: 'tabelog', score: '4.00', url: 'https://tabelog.com/en/tokyo/A1312/A131203/13206654/', g: [4.4, 477] },
  ] },
  { day: 3, label: 'Day 3 · 시부야·하라주쿠 근처', items: [
    { name: '카츠오 식당', en: 'Katsuo Shokudo', cuisine: '일식', address: 'B1F, 7-12 Uguisudanicho, Shibuya-ku', src: 'michelin', url: M('katsuo-shokudo'), g: [4.1, 786] },
    { name: '코료리 쿠하라', en: 'Koryori Kuhara', cuisine: '일식(코료리)', address: '2-25-38 Higashi, Shibuya-ku', src: 'michelin', url: M('koryori-kuhara'), g: [4.3, 130] },
    { name: '돈카츠 나나이도', en: 'Tonkatsu Nanaido', cuisine: '돈카츠', address: '東京都渋谷区神宮前3-42-11 ローザビアンカ 104', src: 'tabelog', score: '3.98', url: 'https://tabelog.com/en/tokyo/A1306/A130603/13229075/', g: [4.6, 474] },
    { name: '토리 차타로', en: 'Tori Chataro', cuisine: '야키토리', address: '東京都渋谷区鶯谷町7-12 TAKビル 1F', src: 'tabelog', score: '4.44', url: 'https://tabelog.com/en/tokyo/A1303/A130301/13157208/', g: [4.6, 228] },
  ] },
  { day: 4, label: 'Day 4 · 우에노·아키하바라 근처', items: [
    { name: '톤파치테이', en: 'Tompachitei', cuisine: '돈카츠', address: '4-3-4 Ueno, Taito-ku', src: 'michelin', url: M('tompachitei'), g: [4.2, 612] },
    { name: '폰타 혼케', en: 'Ponta Honke', cuisine: '일본식 양식(요쇼쿠)', address: '3-23-3 Ueno, Taito-ku', src: 'michelin', url: M('ponta-honke'), g: [4.2, 1228] },
    { name: '비리야니 오사와', en: 'Biriyani Osawa', cuisine: '인도 요리', address: 'B1F, 1-15-12 Uchikanda, Chiyoda-ku', src: 'michelin', url: M('biriyani-osawa'), g: [4.4, 311] },
  ] },
];
