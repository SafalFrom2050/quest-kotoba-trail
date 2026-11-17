export const SENTENCE_STAMP = 'sentence-stamp';

// The bank and pickup positions belong to the optional Sunset Shrine route.
// Keep the Japanese phrases in trail order here, and the answer order below.
export const SENTENCE_BRIDGE_SITE = {
  x: 822,
  meaning: 'I take notes so that I won’t forget.',
  order: ['not-forget', 'so-that', 'notes', 'take'],
  hint: {
    en: 'Start with the outcome you want: 忘れない (wasurenai, “not forget”). Put ように right after it. Then say what you do to make that happen.',
    ne: 'Pahila birsinna bhanne outcome 忘れない (wasurenai) rakha, tesko pachhi ように. Ani nabirsina k garchhau, tyo rakha.',
  },
  tiles: [
    { id: 'notes', text: 'メモを', romaji: 'memo o', x: 175, y: 549, w: 68, h: 38 },
    { id: 'take', text: '取ります', romaji: 'torimasu', x: 383, y: 459, w: 84, h: 38 },
    { id: 'not-forget', text: '忘れない', romaji: 'wasurenai', x: 565, y: 549, w: 84, h: 38 },
    { id: 'so-that', text: 'ように', romaji: 'you ni', pauseAfter: true, x: 746, y: 462, w: 68, h: 38 },
  ],
  deck: { id: 'sky-sentence-deck', type: 'bridge', x: 860, y: 600, w: 130, h: 24 },
  prize: { x: 1001, y: 553, w: 52, h: 46 },
};

export function createSentenceBridge(site) {
  return site ? { site, found: new Set(), built: false, collected: false } : null;
}

export function checkSentenceBridge(state, order) {
  if (!state || state.built || state.found.size !== state.site.tiles.length) return null;
  const { site, found } = state;
  if (!Array.isArray(order) || order.length !== site.order.length ||
      new Set(order).size !== site.order.length || !order.every(id => found.has(id))) return null;
  if (!site.order.every((id, index) => order[index] === id)) return 'retry';
  state.built = true;
  return 'built';
}
