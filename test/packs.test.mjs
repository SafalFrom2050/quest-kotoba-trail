import test from 'node:test';
import assert from 'node:assert/strict';
import { LESSONS, learningText } from '../src/content.mjs';
import { WORLDS } from '../src/worlds.mjs';
import { GameEngine } from '../src/engine.mjs';
import { ProgressStore } from '../src/progress.mjs';
import { PacketError, BACKUP_FORMAT, validatePacket, parseImport, newPack, revisePack, validateStoredPack, validateBackup, packLessons, makePracticeWorld, examplePacket, generationPrompt, repairPrompt } from '../src/packs.mjs';
import { IndexedPackRepository, LessonLibrary } from '../src/library-store.mjs';

class MemoryRepository {
  constructor(records = []) { this.records = structuredClone(records); this.fail = false; }
  async open() {}
  async all() { return structuredClone(this.records); }
  async put(record) { if (this.fail) throw new Error('quota exceeded'); this.records = [...this.records.filter(value => value.id !== record.id), structuredClone(record)]; }
  async putMany(records) { if (this.fail) throw new Error('quota exceeded'); this.records = [...this.records, ...structuredClone(records)]; }
}
const edited = (title = 'Custom workplace practice') => ({ ...examplePacket(), title });
const attempt = record => { const lesson = packLessons(record)[0]; return { lessonId: lesson.id, questionId: lesson.questions[0].id, selected: lesson.questions[0].answer, correct: true, hinted: true }; };
const openLibrary = async (repository = new MemoryRepository(), options) => { const library = new LessonLibrary(repository, options); await library.open(); return library; };

test('the sample and fenced chatbot response round-trip through the actual packet validator', () => {
  const packet = examplePacket();
  assert.deepEqual(parseImport(JSON.stringify(packet)).packet, packet);
  assert.deepEqual(parseImport('```json\n' + JSON.stringify(packet) + '\n```').packet, packet);
  assert.equal(packet.lessons.length, 3);
  for (const lesson of packet.lessons) assert.equal(learningText(lesson.hook, 'ne'), lesson.hook.en);
});
test('imports report useful errors for bad JSON, unsupported formats, versions, and lesson counts', () => {
  assert.throws(() => parseImport('Here are your lessons'), error => error instanceof PacketError && /valid JSON/.test(error.message));
  for (const patch of [{ version: 2 }, { format: 'javascript' }, { lessons: [] }]) assert.throws(() => validatePacket({ ...examplePacket(), ...patch }), PacketError);
});
test('questions reject ambiguous duplicate choices and invalid zero-based answer keys', () => {
  for (const answer of [-1, 3, true, '0']) {
    const packet = examplePacket(); packet.lessons[1].questions[2].answer = answer;
    assert.throws(() => validatePacket(packet), error => error.errors.some(message => message.includes('Lesson 2, question 3: answer')));
  }
  const duplicate = examplePacket(); duplicate.lessons[0].questions[0].choices[1].text = duplicate.lessons[0].questions[0].choices[0].text;
  assert.throws(() => validatePacket(duplicate), error => error.errors.some(message => message.includes('choices must be different')));
});
test('text bounds, distinct topics, and worked-example fields are validated', () => {
  const packet = examplePacket(); packet.lessons[1].title = packet.lessons[0].title; packet.lessons[0].examples[0].romaji = ''; packet.title = 'x'.repeat(81);
  assert.throws(() => validatePacket(packet), error => error.errors.length >= 3);
});
test('imports retain plain lesson text and discard unexpected executable or identity fields', () => {
  const packet = examplePacket(); packet.id = 'gi'; packet.history = { forged: true }; packet.script = 'throw new Error()';
  packet.lessons[0].id = 'gi'; packet.lessons[0].title = '<img src=x onerror=alert(1)>';
  const normalized = validatePacket(packet);
  assert.equal(normalized.lessons[0].title, packet.lessons[0].title);
  for (const key of ['id', 'history', 'script']) assert.equal(key in normalized, false);
  assert.equal('id' in normalized.lessons[0], false);
});
test('generated prompts include selected conditions, the versioned format, and a complete valid example', () => {
  const prompt = generationPrompt({ level: 'N4', focus: 'Grammar', topic: 'Buying train tickets', nepalish: true });
  assert.ok(prompt.includes('Buying train tickets')); assert.ok(prompt.includes('"level": "N4"')); assert.ok(prompt.includes('hook.ne'));
  assert.ok(prompt.includes(JSON.stringify(examplePacket(), null, 2)));
  assert.ok(repairPrompt(['Lesson 2 needs an answer.']).includes('Lesson 2 needs an answer.'));
});
test('generated pack and question IDs do not collide with built-ins or another imported pack', () => {
  const a = newPack(examplePacket(), 'a'), b = newPack(examplePacket(), 'b');
  const ids = [...packLessons(a), ...packLessons(b)].map(lesson => lesson.id);
  assert.equal(new Set(ids).size, 6); assert.ok(ids.every(id => !LESSONS.some(lesson => lesson.id === id)));
  assert.notEqual(packLessons(a)[0].questions[0].id, packLessons(b)[0].questions[0].id);
});
test('revisions get fresh practice while retaining earlier attempts for backups', () => {
  const record = newPack(examplePacket(), 'revision'); record.history[1].attempts.push(attempt(record));
  const next = revisePack(record, edited());
  assert.equal(next.revision, 2); assert.equal(next.history[2].attempts.length, 0); assert.equal(next.history[1].attempts.length, 1);
  assert.notEqual(packLessons(record)[0].id, packLessons(next)[0].id);
  assert.equal(record.revision, 1);
});
test('each custom trail remaps every shrine and bridge without changing the built-in maps', () => {
  const record = newPack(examplePacket(), 'maps'), before = structuredClone(WORLDS);
  const lessons = packLessons(record), ids = lessons.map(lesson => lesson.id);
  for (const template of WORLDS) {
    const world = makePracticeWorld(record, template.id);
    assert.deepEqual(world.shrines.map(shrine => shrine.lessonId), ids);
    assert.ok(world.platforms.filter(platform => platform.gate).every(platform => ids.includes(platform.gate)));
    const events = [], engine = new GameEngine({ getContext: () => ({}) }, {}, { effects: false, lookupLesson: id => lessons.find(lesson => lesson.id === id), onEvent: type => events.push(type) });
    engine.start(world); engine.learn('gi'); assert.equal(engine.learned.size, 0);
    for (const id of ids) engine.learn(id);
    assert.equal(engine.activePlatforms().filter(platform => platform.gate).length, 3);
    assert.equal(engine.lessonLookup(ids[0]).title, record.packet.lessons[0].title);
    engine.player.x = world.portal.x; engine.player.y = 544; engine.update(1 / 120); engine.update(1 / 120);
    assert.equal(events.filter(type => type === 'win').length, 1);
  }
  assert.deepEqual(WORLDS, before);
});
test('duplicate imports do not create packs or reset saved practice', async () => {
  const library = await openLibrary(), record = await library.save(examplePacket()), progress = library.progress(record);
  progress.attempt(attempt(record)); await progress.pending;
  await assert.rejects(library.save(examplePacket()), PacketError);
  assert.equal(library.records.length, 1); assert.equal(library.get(record.id).history[1].attempts.length, 1);
});
test('rapid practice saves survive reload and never alter the campaign store', async () => {
  const repository = new MemoryRepository(), library = await openLibrary(repository), record = await library.save(examplePacket());
  let campaignJSON = null; const campaign = new ProgressStore({ getItem: () => campaignJSON, setItem: (_, value) => { campaignJSON = value; } }); campaign.setPreference('language', 'ne'); const before = campaignJSON;
  const progress = library.progress(record); progress.attempt(attempt(record)); progress.attempt(attempt(record));
  const backup = await library.backup();
  assert.equal(backup.packs[0].history[1].attempts.length, 2);
  const reloaded = await openLibrary(repository); assert.equal(reloaded.get(record.id).history[1].attempts.length, 2);
  assert.equal(campaignJSON, before);
});
test('late practice from an earlier revision does not overwrite an edited packet', async () => {
  const library = await openLibrary(), original = await library.save(examplePacket()), oldPractice = library.progress(original);
  oldPractice.attempt(attempt(original)); await oldPractice.pending;
  const revised = await library.save(edited('Updated pack'), original.id);
  oldPractice.attempt(attempt(original)); await oldPractice.pending;
  const current = library.get(original.id);
  assert.equal(current.packet.title, 'Updated pack'); assert.equal(current.revision, revised.revision);
  assert.equal(current.history[1].attempts.length, 2); assert.equal(current.history[2].attempts.length, 0);
});
test('failed database writes do not claim a pack was saved and do not change the library', async () => {
  const repository = new MemoryRepository(), library = await openLibrary(repository); repository.fail = true;
  await assert.rejects(library.save(examplePacket()), /quota/);
  assert.equal(library.records.length, 0); assert.equal(repository.records.length, 0);
});
test('failed practice writes remain recoverable in a library backup', async () => {
  const repository = new MemoryRepository(), errors = [], library = await openLibrary(repository, { onError: error => errors.push(error) });
  const record = await library.save(examplePacket()), progress = library.progress(record); repository.fail = true;
  progress.attempt(attempt(record)); await progress.pending;
  assert.equal(progress.available, false); assert.equal(errors.length, 1); assert.equal(library.get(record.id).history[1].attempts.length, 0);
  assert.equal((await library.backup()).packs[0].history[1].attempts.length, 1);
});
test('removal can be reversed after reopening the browser library', async () => {
  const repository = new MemoryRepository(), library = await openLibrary(repository), record = await library.save(examplePacket());
  await library.setRemoved(record.id, true); assert.equal(library.active().length, 0);
  const reloaded = await openLibrary(repository); assert.ok(reloaded.get(record.id).removedAt);
  await reloaded.setRemoved(record.id, false); assert.equal(reloaded.active().length, 1);
});
test('backup restoration retains practice and never overwrites an existing pack', async () => {
  const source = await openLibrary(), record = await source.save(examplePacket()), progress = source.progress(record);
  progress.attempt(attempt(record)); const backup = await source.backup();
  const parsed = parseImport(JSON.stringify(backup)); assert.equal(parsed.kind, 'backup');
  const target = await openLibrary(); assert.deepEqual(await target.restore(parsed.records), { added: 1, skipped: 0 });
  assert.equal(target.get(record.id).history[1].attempts.length, 1);
  const altered = structuredClone(parsed.records); altered[0].packet.title = 'Do not overwrite me';
  assert.deepEqual(await target.restore(altered), { added: 0, skipped: 1 });
  assert.equal(target.get(record.id).packet.title, record.packet.title);
});
test('invalid backups and foreign progress IDs are handled without trusting imported identities', () => {
  assert.throws(() => validateBackup({ format: BACKUP_FORMAT, version: 2, packs: [] }), PacketError);
  const record = newPack(examplePacket(), 'valid');
  record.history[1].discovered = ['gi', ...packLessons(record).map(lesson => lesson.id)];
  record.history[1].attempts = [{ lessonId: 'gi', questionId: 'gi-1', correct: true, selected: 0 }];
  const normalized = validateStoredPack(record);
  assert.equal(normalized.history[1].discovered.length, 3); assert.equal(normalized.history[1].attempts.length, 0);
  assert.throws(() => validateStoredPack({ ...record, id: '__proto__' }), PacketError);
});
test('IndexedDB saves resolve only after commit, and transaction aborts are reported', async () => {
  const repository = new IndexedPackRepository(null), request = {}, transaction = { objectStore: () => ({ put: () => request }) };
  repository.connection = { transaction: () => transaction };
  let committed = false; const saving = repository.put({ id: 'test' }).then(() => { committed = true; });
  await Promise.resolve(); assert.equal(committed, false); transaction.oncomplete(); await saving; assert.equal(committed, true);
  const failing = repository.put({ id: 'test' }); transaction.error = new Error('disk full'); transaction.onabort();
  await assert.rejects(failing, /disk full/);
});
