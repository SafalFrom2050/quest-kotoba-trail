import test from 'node:test';
import assert from 'node:assert/strict';
import { GameEngine } from '../src/engine.mjs';
import { examplePacket, makePracticeWorld, newPack } from '../src/packs.mjs';
import { ProgressStore } from '../src/progress.mjs';
import { SENTENCE_STAMP } from '../src/sentence-bridge.mjs';
import { MILL_STAMP } from '../src/waterwheel.mjs';

const STEP = 1 / 120;
const fixture = (world = 'sky') => {
  const events = [];
  const engine = new GameEngine({ getContext: () => ({}) }, {}, {
    effects: false, onEvent: (type, data) => events.push({ type, data }),
  });
  engine.start(world);
  return { engine, events };
};
function run(engine, frames, input = {}) {
  Object.assign(engine.input, { left: false, right: false, jumpPressed: false, dashPressed: false }, input);
  for (let i = 0; i < frames; i++) engine.update(STEP);
}
function approachBridge(engine, collectLast = true) {
  // Walk over the spring, land on the first ledge, then follow the bank.
  run(engine, 112, { right: true }); run(engine, 56);
  run(engine, 69, { right: true }); run(engine, 24);
  run(engine, 59, { right: true }); run(engine, 8);
  if (collectLast) run(engine, 100, { jumpPressed: true });
}

test('the spring, a ledge, and a normal jump reach all four tiles from the spawn', () => {
  const { engine, events } = fixture();
  approachBridge(engine);
  const pickups = events.filter(event => event.type === 'sentence-tile');
  assert.equal(pickups.length, 4);
  assert.deepEqual(pickups.map(event => event.data.count), [1, 2, 3, 4]);
  assert.ok(events.some(event => event.type === 'bounce'));
  assert.deepEqual(engine.nearby(), { type: 'sentence-bridge', remaining: 0 });
  assert.equal(engine.health, 3);
  assert.equal(engine.learned.size, 0);
});

test('the sign reports missing tiles, and malformed orders cannot open the crossing', () => {
  const { engine, events } = fixture();
  approachBridge(engine, false);
  const { deck, order } = engine.sentenceBridge.site;
  engine.interact();
  assert.deepEqual(events.at(-1), { type: 'sentence-bridge', data: { type: 'sentence-bridge', remaining: 1 } });
  engine.setPhase('bridge-puzzle');
  assert.equal(engine.submitSentenceBridge(order), null);
  assert.ok(!engine.activePlatforms().includes(deck));
  engine.setPhase('playing');
  run(engine, 100, { jumpPressed: true });
  assert.equal(engine.submitSentenceBridge(order), null, 'must be in the builder');
  engine.setPhase('bridge-puzzle');
  assert.equal(engine.submitSentenceBridge(order.slice(0, -1)), null);
  assert.equal(engine.submitSentenceBridge(Array(4).fill(order[0])), null);
  assert.equal(engine.submitSentenceBridge([...order.slice(0, -1), 'unknown']), null);
  assert.ok(!engine.activePlatforms().includes(deck));
});

test('a wrong arrangement is harmless; a corrected order adds exactly one deck', () => {
  const { engine } = fixture();
  approachBridge(engine);
  engine.setPhase('bridge-puzzle');
  const { deck, order } = engine.sentenceBridge.site;
  const before = engine.activePlatforms();
  const snapshot = engine.snapshot();
  assert.equal(engine.submitSentenceBridge([...order].reverse()), 'retry');
  assert.deepEqual(engine.activePlatforms(), before);
  assert.deepEqual(engine.snapshot(), snapshot);
  assert.equal(engine.sentenceBridge.found.size, 4);
  assert.equal(engine.submitSentenceBridge(order), 'built');
  assert.deepEqual(engine.activePlatforms(), [...before, deck]);
  assert.equal(engine.submitSentenceBridge(order), null);
});

test('the assembled deck carries Quest across at ground height and the stamp awards once', () => {
  const { engine, events } = fixture();
  approachBridge(engine);
  const { deck, order } = engine.sentenceBridge.site;
  engine.setPhase('bridge-puzzle');
  assert.equal(engine.submitSentenceBridge(order), 'built');
  engine.setPhase('playing');
  let touchedDeck = false;
  for (let i = 0; i < 96; i++) {
    run(engine, 1, { right: true });
    touchedDeck ||= engine.player.support === deck;
    assert.ok(engine.player.grounded);
    assert.equal(engine.player.y + engine.player.h, deck.y);
  }
  assert.ok(touchedDeck);
  assert.ok(engine.player.x >= deck.x + deck.w);
  assert.deepEqual(events.filter(event => event.type === 'stamp'), [{ type: 'stamp', data: { id: SENTENCE_STAMP } }]);
  run(engine, 20);
  assert.equal(events.filter(event => event.type === 'stamp').length, 1);
  assert.equal(engine.learned.size, 0);
});

test('the original jump works without the deck and does not award the stamp', () => {
  const { engine, events } = fixture();
  approachBridge(engine, false);
  run(engine, 30, { right: true });
  run(engine, 81, { right: true, jumpPressed: true });
  run(engine, 24);
  // Stop before the first campaign gate. A wide jump must reach the far bank
  // without opening either the optional bridge or that separate gate.
  assert.equal(engine.player.support?.id, 'sky-floor-2');
  assert.equal(engine.sentenceBridge.built, false);
  assert.ok(!events.some(event => event.type === 'stamp'));
  for (const shrine of engine.world.shrines) engine.learn(shrine.lessonId);
  engine.player.x = engine.world.portal.x;
  engine.player.y = 544; engine.player.vx = 0;
  run(engine, 1);
  assert.equal(engine.phase, 'win');
});

test('falling retains tiles and the deck for the run; a restart clears them', () => {
  const { engine } = fixture();
  approachBridge(engine);
  engine.setPhase('bridge-puzzle');
  assert.equal(engine.submitSentenceBridge(engine.sentenceBridge.site.order), 'built');
  engine.setPhase('playing');
  engine.player.y = 950;
  run(engine, 1);
  assert.equal(engine.player.x, engine.checkpoint.x);
  assert.equal(engine.sentenceBridge.found.size, 4);
  assert.ok(engine.activePlatforms().includes(engine.sentenceBridge.site.deck));
  engine.start('sky');
  assert.equal(engine.sentenceBridge.found.size, 0);
  assert.ok(!engine.activePlatforms().includes(engine.sentenceBridge.site.deck));
});

test('a custom Sunset Shrine run has its own lessons and no campaign bridge or prize', () => {
  const world = makePracticeWorld(newPack(examplePacket(), 'sentence-test'), 'sky');
  const { engine } = fixture(world);
  assert.equal(engine.sentenceBridge, null);
  assert.equal(engine.waterwheel, null);
  assert.ok(!engine.activePlatforms().some(platform => platform.id === 'sky-sentence-deck'));
});

test('the new stamp and existing Mill Stamp survive reload without modifying saved lessons', () => {
  let saved = JSON.stringify({ version: 1, stamps: [MILL_STAMP], discovered: ['youni'], preferences: { language: 'ne' } });
  const storage = { getItem: () => saved, setItem: (_key, value) => { saved = value; } };
  const store = new ProgressStore(storage);
  store.awardStamp(SENTENCE_STAMP); store.awardStamp(SENTENCE_STAMP); store.awardStamp('unknown');
  const { stamps, discovered, attempts, preferences } = new ProgressStore(storage).value;
  assert.deepEqual(stamps, [MILL_STAMP, SENTENCE_STAMP]);
  assert.deepEqual(discovered, ['youni']); assert.deepEqual(attempts, []); assert.equal(preferences.language, 'ne');
});
