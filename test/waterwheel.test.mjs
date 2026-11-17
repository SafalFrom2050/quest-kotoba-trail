import test from 'node:test';
import assert from 'node:assert/strict';
import { GameEngine } from '../src/engine.mjs';
import { createPlayer, stepPlayer, PHYSICS } from '../src/physics.mjs';
import { examplePacket, makePracticeWorld, newPack } from '../src/packs.mjs';
import { ProgressStore } from '../src/progress.mjs';
import { getWorld, WORLDS } from '../src/worlds.mjs';
import { MILL_STAMP, WATERWHEEL_SITE } from '../src/waterwheel.mjs';

const DT = 1 / 120;
const simulate = (engine, frames) => { for (let i = 0; i < frames; i++) engine.update(DT); };
const fixture = (world = 'workshop', effects = false) => {
  const events = [];
  const engine = new GameEngine({ getContext: () => ({}) }, {}, { effects, onEvent: (type, data) => events.push({ type, data }) });
  engine.start(world);
  return { engine, events };
};
function repair(engine) {
  engine.player.x = WATERWHEEL_SITE.x - engine.player.w / 2;
  simulate(engine, 1);
  engine.interact();
  engine.setPhase('side-quest');
  assert.equal(engine.chooseWaterwheelTool('wrench'), 'repaired');
  engine.setPhase('playing');
}
function boardLift(engine) {
  const { lift } = engine.waterwheel;
  engine.player.x = lift.x + 26;
  simulate(engine, 1);
  engine.input.jumpPressed = true;
  for (let i = 0; i < 120 && engine.player.support !== lift; i++) simulate(engine, 1);
  assert.equal(engine.player.support, lift, 'jumped through the plank and landed on it');
}

test('a fast fall lands on the earliest ledge regardless of platform order', () => {
  const ledge = { x: 0, y: 505, w: 100, h: 10, type: 'stone' };
  const spring = { x: 0, y: 525, w: 100, h: 15, type: 'bounce' };
  for (const order of [[spring, ledge], [ledge, spring]]) {
    const p = createPlayer({ x: 20, y: 444 });
    p.vy = PHYSICS.maxFall;
    assert.deepEqual(stepPlayer(p, {}, order, 1 / 30), []);
    assert.equal(p.support, ledge);
    assert.equal(p.y + p.h, ledge.y);
  }
});

test('a spring launched by walking still leaves a usable double jump', () => {
  const ground = { x: 0, y: 600, w: 100, h: 180, type: 'ground' };
  const spring = { x: 20, y: 585, w: 60, h: 15, type: 'bounce' };
  const p = createPlayer({ x: 30, y: 544 });
  p.grounded = true;
  assert.equal(stepPlayer(p, {}, [ground, spring], DT)[0].type, 'bounce');
  assert.deepEqual(stepPlayer(p, { jumpPressed: true }, [ground, spring], DT)[0], { type: 'jump', double: true });
});

test('a lift catches an approaching player using both surfaces’ motion', () => {
  const rising = { x: 0, previousY: 500, y: 495, w: 90, h: 20, type: 'lift' };
  const p = createPlayer({ x: 25, y: 442 });
  stepPlayer(p, {}, [rising], 1 / 30);
  assert.equal(p.support, rising);
  assert.equal(p.y + p.h, 495);
  const descending = { ...rising, previousY: 495, y: 500 };
  const falling = createPlayer({ x: 25, y: 430 }); falling.vy = 650;
  stepPlayer(falling, {}, [descending], 1 / 30);
  assert.equal(falling.support, descending);
  assert.equal(falling.y + falling.h, 500);
});

test('walking off or jumping off a moving lift releases the rider', () => {
  const lift = { x: 0, previousY: 500, y: 499, w: 90, h: 20, type: 'lift' };
  const walker = createPlayer({ x: 88, y: 444 });
  Object.assign(walker, { vx: PHYSICS.speed, grounded: true, support: lift });
  stepPlayer(walker, { right: true }, [lift], DT);
  assert.equal(walker.support, null);
  assert.ok(walker.y + walker.h > lift.previousY, 'did not get dragged up when walking off the edge');
  const jumper = createPlayer({ x: 30, y: 444 });
  Object.assign(jumper, { grounded: true, support: lift });
  assert.deepEqual(stepPlayer(jumper, { jumpPressed: true }, [lift], DT)[0], { type: 'jump', double: false });
  assert.equal(jumper.support, null);
  assert.ok(jumper.y + jumper.h < lift.y);
});

test('dash still stops at the solid side of ground below the top', () => {
  const bank = { x: 100, y: 600, w: 90, h: 180, type: 'ground' };
  for (const p of [createPlayer({ x: 60, y: 570 }), createPlayer({ x: 196, y: 570 })]) {
    const fromLeft = p.x < bank.x;
    stepPlayer(p, { right: fromLeft, left: !fromLeft, dashPressed: true }, [bank], 1 / 30);
    assert.equal(p.x, fromLeft ? bank.x - p.w : bank.x + bank.w);
    assert.equal(p.vx, 0);
  }
});

test('Quest can dash over every unlocked campaign bridge without losing their footing', () => {
  for (const world of WORLDS) {
    const { engine } = fixture(world.id);
    for (const shrine of world.shrines) engine.learn(shrine.lessonId);
    const decks = engine.activePlatforms().filter(platform => platform.gate);
    for (const bridge of decks) {
      const p = createPlayer({ x: bridge.x - 12, y: bridge.y - engine.player.h });
      p.grounded = true;
      for (let i = 0; p.x < bridge.x + bridge.w && i < 80; i++) {
        stepPlayer(p, { right: true, dashPressed: i === 0 }, engine.activePlatforms(), DT);
        assert.ok(p.grounded, `${bridge.id} lost support at x=${p.x}`);
        assert.equal(p.y + p.h, bridge.y);
      }
      assert.ok(p.x >= bridge.x + bridge.w, `${bridge.id} was not crossed`);
    }
  }
});

test('the wrong tool keeps the wheel stopped and never costs health or opens a bridge', () => {
  const { engine, events } = fixture();
  engine.player.x = WATERWHEEL_SITE.x - engine.player.w / 2;
  engine.interact();
  assert.equal(events.at(-1).type, 'waterwheel');
  engine.setPhase('side-quest');
  const platforms = engine.activePlatforms(), health = engine.health, score = engine.score;
  assert.equal(engine.chooseWaterwheelTool('medicine'), 'retry');
  assert.equal(engine.waterwheel.repaired, false);
  assert.deepEqual(engine.activePlatforms(), platforms);
  assert.equal(engine.health, health); assert.equal(engine.score, score);
  assert.equal(engine.learned.size, 0);
  assert.equal(engine.chooseWaterwheelTool('wrench'), 'repaired');
  assert.equal(engine.chooseWaterwheelTool('wrench'), null);
  assert.equal(engine.activePlatforms().length, platforms.length + 2);
  assert.equal(engine.learned.size, 0);
});

test('the real village lift waits, carries Quest through a full cycle, and pauses in midair', () => {
  const { engine } = fixture();
  repair(engine);
  const state = engine.waterwheel;
  simulate(engine, 60);
  assert.equal(state.lift.y, state.site.lift.y);
  boardLift(engine); simulate(engine, 90);
  const height = state.lift.y;
  assert.ok(height < state.site.lift.y && height > state.site.top);
  engine.setPhase('pause'); simulate(engine, 240);
  assert.equal(state.lift.y, height);
  assert.equal(engine.player.y + engine.player.h, height);
  engine.setPhase('playing');
  let sawTop = false, sawReturn = false, sawBottom = false;
  for (let frame = 0; frame < 850; frame++) {
    simulate(engine, 1);
    assert.equal(engine.player.support, state.lift);
    assert.ok(Math.abs(engine.player.y + engine.player.h - state.lift.y) < 1e-7);
    sawTop ||= state.phase === 'at-top';
    sawReturn ||= state.phase === 'returning';
    sawBottom ||= state.phase === 'at-bottom';
  }
  assert.ok(sawTop && sawReturn && sawBottom);
});

test('the loft is reachable with normal movement and awards the stamp once', () => {
  const { engine, events } = fixture('workshop', true);
  repair(engine); boardLift(engine);
  const { site } = engine.waterwheel;
  for (let i = 0; i < 330 && engine.waterwheel.phase !== 'at-top'; i++) simulate(engine, 1);
  assert.equal(engine.waterwheel.phase, 'at-top');
  engine.input.right = true; engine.input.jumpPressed = true;
  for (let i = 0; i < 100 && engine.player.x < site.prize.x; i++) simulate(engine, 1);
  engine.input.right = false;
  simulate(engine, 150);
  assert.equal(engine.player.support, site.loft);
  assert.ok(engine.waterwheel.collected);
  assert.deepEqual(events.filter(event => event.type === 'stamp'), [{ type: 'stamp', data: { id: MILL_STAMP } }]);
  assert.equal(engine.learned.size, 0);
});

test('the quest is optional for campaign victory and absent in custom runs', () => {
  const { engine } = fixture();
  for (const shrine of engine.world.shrines) engine.learn(shrine.lessonId);
  engine.player.x = engine.world.portal.x; engine.player.y = 544;
  simulate(engine, 1);
  assert.equal(engine.phase, 'win'); assert.equal(engine.waterwheel.repaired, false);
  const custom = makePracticeWorld(newPack(examplePacket(), 'waterwheel-test'), 'workshop');
  assert.deepEqual(custom.platforms.map(p => ({ x: p.x, y: p.y, w: p.w, h: p.h })),
    getWorld('workshop').platforms.map(p => ({ x: p.x, y: p.y, w: p.w, h: p.h })));
  engine.start(custom);
  assert.equal(engine.waterwheel, null);
  engine.player.x = WATERWHEEL_SITE.x;
  assert.notEqual(engine.nearby()?.type, 'waterwheel');
});

test('the stamp survives reload without changing old campaign progress or practice', () => {
  let saved = JSON.stringify({ version: 1, worlds: { workshop: { completed: true, bestScore: 1500 } }, discovered: ['naosu'], preferences: { language: 'ne' } });
  const storage = { getItem: () => saved, setItem: (_key, value) => { saved = value; } };
  const first = new ProgressStore(storage);
  first.awardStamp(MILL_STAMP); first.awardStamp(MILL_STAMP);
  const reloaded = new ProgressStore(storage);
  assert.deepEqual(reloaded.value.stamps, [MILL_STAMP]);
  assert.equal(reloaded.value.worlds.workshop.bestScore, 1500);
  assert.deepEqual(reloaded.value.discovered, ['naosu']);
  assert.deepEqual(reloaded.value.attempts, []);
  assert.equal(reloaded.value.preferences.language, 'ne');
});
