import { LESSONS } from './content.mjs';
import { freshProgress, normalizeProgress, ProgressStore } from './progress.mjs';
import { getWorld } from './worlds.mjs';

export const PACK_FORMAT = 'quest-lesson-pack';
export const BACKUP_FORMAT = 'quest-library-backup';
export const MAX_IMPORT_BYTES = 25 * 1024 * 1024;
export const MAX_PACKS = 50;
const themes = ['wordwood', 'workshop', 'sky'];
const levels = ['N5', 'N4', 'N3', 'N2', 'N1', 'Mixed'];
const own = (value, key) => Object.prototype.hasOwnProperty.call(value, key);
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);

export class PacketError extends Error {
  constructor(errors) { super(errors[0] || 'This packet could not be imported.'); this.name = 'PacketError'; this.errors = errors.slice(0, 40); }
}

export function validatePacket(value) {
  const errors = [];
  const error = message => { if (errors.length < 40) errors.push(message); };
  function text(value, label, max, required = true) {
    if (value === undefined && !required) return '';
    if (typeof value !== 'string') { error(`${label} must be text.`); return ''; }
    const result = value.trim();
    if (required && !result) error(`${label} is required.`);
    if (result.length > max) error(`${label} must be at most ${max} characters.`);
    if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/u.test(result)) error(`${label} contains unsupported control characters.`);
    return result;
  }
  function localized(value, label, optional = false) {
    if (optional && (value === undefined || value === '')) return undefined;
    if (!object(value)) { error(`${label} must have an English "en" field and an optional Nepalish "ne" field.`); return { en: '' }; }
    if (optional && !value.en && !value.ne) return undefined;
    const result = { en: text(value.en, `${label}: English`, 700) };
    const ne = text(value.ne, `${label}: Nepalish`, 700, false);
    if (ne) result.ne = ne;
    return result;
  }
  if (!object(value)) throw new PacketError(['Paste one JSON object containing a lesson pack.']);
  if (value.format !== PACK_FORMAT) error(`The format must be "${PACK_FORMAT}".`);
  if (value.version !== 1) error('Only lesson packet version 1 is supported.');
  const packet = {
    format: PACK_FORMAT, version: 1,
    title: text(value.title, 'Pack title', 80),
    description: text(value.description, 'Pack description', 600, false),
    level: levels.includes(value.level) ? value.level : 'Mixed',
    lessons: [],
  };
  if (!levels.includes(value.level)) error('Level must be N5, N4, N3, N2, N1, or Mixed.');
  if (!Array.isArray(value.lessons) || value.lessons.length !== 3) error('A pack must contain exactly 3 lessons, one for each trail shrine.');
  const titles = new Set();
  for (const [i, source] of (Array.isArray(value.lessons) ? value.lessons.slice(0, 3) : []).entries()) {
    const label = `Lesson ${i + 1}`;
    if (!object(source)) { error(`${label} must be an object.`); continue; }
    const lesson = {
      kind: source.kind,
      title: text(source.title, `${label}: title`, 80),
      kana: text(source.kana, `${label}: kana reading`, 200),
      romaji: text(source.romaji, `${label}: romaji`, 250),
      meaning: text(source.meaning, `${label}: meaning`, 350),
      hook: localized(source.hook, `${label}: memory note`),
      explanation: text(source.explanation, `${label}: explanation`, 3500),
      examples: [], questions: [],
    };
    if (!['kanji', 'grammar'].includes(lesson.kind)) error(`${label}: kind must be "kanji" or "grammar".`);
    if (titles.has(lesson.title)) error(`${label}: choose a different topic; this title already appears in the pack.`);
    titles.add(lesson.title);
    if (!Array.isArray(source.examples) || source.examples.length < 1 || source.examples.length > 3) error(`${label} needs 1 to 3 worked examples.`);
    for (const [j, example] of (Array.isArray(source.examples) ? source.examples.slice(0, 3) : []).entries()) {
      const ex = object(example) ? example : {};
      lesson.examples.push({
        japanese: text(ex.japanese, `${label}, example ${j + 1}: Japanese`, 600),
        romaji: text(ex.romaji, `${label}, example ${j + 1}: romaji`, 1000),
        english: text(ex.english, `${label}, example ${j + 1}: English`, 1000),
      });
    }
    if (!Array.isArray(source.questions) || source.questions.length !== 3) error(`${label} needs exactly 3 practice questions.`);
    for (const [j, sourceQuestion] of (Array.isArray(source.questions) ? source.questions.slice(0, 3) : []).entries()) {
      const q = object(sourceQuestion) ? sourceQuestion : {}, qlabel = `${label}, question ${j + 1}`;
      const question = {
        prompt: text(q.prompt, `${qlabel}: prompt`, 600),
        context: text(q.context, `${qlabel}: Japanese context`, 600, false),
        romaji: text(q.romaji, `${qlabel}: romaji`, 1000, false),
        choices: [], answer: q.answer,
        why: text(q.why, `${qlabel}: answer explanation`, 1800),
      };
      const support = localized(q.support, `${qlabel}: hint`, true);
      if (support) question.support = support;
      if (!Array.isArray(q.choices) || q.choices.length !== 3) error(`${qlabel} needs exactly 3 answer choices.`);
      for (const [k, choice] of (Array.isArray(q.choices) ? q.choices.slice(0, 3) : []).entries()) {
        const c = object(choice) ? choice : {};
        question.choices.push({ text: text(c.text, `${qlabel}, choice ${k + 1}`, 350), note: text(c.note, `${qlabel}, choice ${k + 1}: note`, 400, false) });
      }
      if (new Set(question.choices.map(c => c.text.normalize('NFKC').toLowerCase())).size !== question.choices.length) error(`${qlabel}: answer choices must be different.`);
      if (!Number.isInteger(q.answer) || q.answer < 0 || q.answer > 2) error(`${qlabel}: answer must be 0, 1, or 2 (the first choice is 0).`);
      lesson.questions.push(question);
    }
    packet.lessons.push(lesson);
  }
  if (errors.length) throw new PacketError(errors);
  return packet;
}

export function parseImport(text) {
  if (typeof text !== 'string' || new TextEncoder().encode(text).length > MAX_IMPORT_BYTES) throw new PacketError(['Choose a JSON packet or backup smaller than 25 MB.']);
  let source = text.trim().replace(/^\uFEFF/u, '');
  const fence = source.match(/^```(?:json)?\s*\n([\s\S]*?)\n```$/i);
  if (fence) source = fence[1].trim();
  let value;
  try { value = JSON.parse(source); }
  catch { throw new PacketError(['This is not valid JSON. Paste the complete packet from your chatbot, or use Copy repair prompt.']); }
  if (value?.format === BACKUP_FORMAT) return { kind: 'backup', records: validateBackup(value) };
  if (new TextEncoder().encode(text).length > 1024 * 1024) throw new PacketError(['An individual lesson packet must be smaller than 1 MB.']);
  return { kind: 'pack', packet: validatePacket(value) };
}

export const packKey = record => `${record.id}@${record.revision}`;
export function packLessons(record) {
  return record.packet.lessons.map((lesson, i) => ({
    ...lesson, id: `${packKey(record)}:l${i + 1}`,
    questions: lesson.questions.map((question, j) => ({ ...question, id: `${packKey(record)}:l${i + 1}:q${j + 1}` })),
  }));
}
export function newPack(packet, uuid = globalThis.crypto.randomUUID(), now = new Date().toISOString()) {
  return { id: `pack_${uuid}`, revision: 1, createdAt: now, updatedAt: now, packet: validatePacket(packet), history: { 1: freshProgress() } };
}
export function revisePack(record, packet, now = new Date().toISOString()) {
  if (record.revision >= 100) throw new PacketError(['This pack has 100 revisions. Export its lessons and import a new copy to continue editing.']);
  const revision = record.revision + 1;
  return { ...record, packet: validatePacket(packet), revision, updatedAt: now, history: { ...record.history, [revision]: freshProgress() } };
}
export function validateStoredPack(value) {
  if (!object(value) || typeof value.id !== 'string' || !/^pack_[a-zA-Z0-9-]{1,80}$/.test(value.id)) throw new PacketError(['A saved pack has an invalid ID.']);
  if (!Number.isInteger(value.revision) || value.revision < 1 || value.revision > 100) throw new PacketError(['A saved pack has an unsupported revision.']);
  const result = {
    id: value.id, revision: value.revision, packet: validatePacket(value.packet),
    createdAt: typeof value.createdAt === 'string' ? value.createdAt.slice(0, 50) : '',
    updatedAt: typeof value.updatedAt === 'string' ? value.updatedAt.slice(0, 50) : '', history: {},
  };
  if (typeof value.removedAt === 'string') result.removedAt = value.removedAt.slice(0, 50);
  for (let revision = 1; revision <= value.revision; revision++) {
    if (!own(value.history || {}, revision) && revision !== value.revision) continue;
    const progress = normalizeProgress(value.history?.[revision]);
    const prefix = `${value.id}@${revision}:l`;
    const ids = [1, 2, 3].map(i => prefix + i);
    progress.discovered = progress.discovered.filter(id => ids.includes(id));
    progress.attempts = progress.attempts.filter(a => ids.includes(a.lessonId) && [1, 2, 3].some(i => a.questionId === `${a.lessonId}:q${i}`) && Number.isInteger(a.selected) && a.selected >= 0 && a.selected < 3);
    progress.worlds = Object.fromEntries(themes.filter(theme => object(progress.worlds[theme])).map(theme => {
      const world = progress.worlds[theme];
      return [theme, { completed: world.completed === true, bestScore: Math.max(0, Math.min(100000000, Number(world.bestScore) || 0)), bestTime: Number.isFinite(world.bestTime) ? Math.max(0, world.bestTime) : 0, runs: Math.max(0, Math.min(1000000, Number(world.runs) || 0)) }];
    }));
    result.history[revision] = progress;
  }
  return result;
}
export function validateBackup(value) {
  if (!object(value) || value.format !== BACKUP_FORMAT || value.version !== 1) throw new PacketError(['Only Quest library backup version 1 is supported.']);
  if (!Array.isArray(value.packs) || value.packs.length > MAX_PACKS) throw new PacketError([`A backup can contain at most ${MAX_PACKS} packs.`]);
  const records = value.packs.map(validateStoredPack);
  if (new Set(records.map(r => r.id)).size !== records.length) throw new PacketError(['The backup repeats a pack ID.']);
  return records;
}

export function makePracticeWorld(record, theme = 'wordwood') {
  const template = getWorld(theme);
  if (!template) throw new PacketError(['Choose a valid practice trail.']);
  const world = structuredClone(template), lessons = packLessons(record);
  const remap = new Map(template.shrines.map((shrine, i) => [shrine.lessonId, lessons[i].id]));
  world.name = record.packet.title; world.kicker = 'MY LESSONS';
  world.subtitle = `${record.packet.level} · Your lesson pack on ${template.name}.`;
  world.shrines = world.shrines.map((shrine, i) => ({ ...shrine, lessonId: lessons[i].id }));
  world.platforms = world.platforms.map(platform => platform.gate ? { ...platform, gate: remap.get(platform.gate) } : platform);
  const glyphs = lessons.map(l => [...l.title.replace(/^[～~\s]+/u, '')][0] || '学');
  world.coins = world.coins.map((coin, i) => ({ ...coin, glyph: glyphs[i % glyphs.length] }));
  return world;
}

export class PackProgressStore extends ProgressStore {
  constructor(progress, saveProgress, onError = () => {}) {
    super(null); this.value = normalizeProgress(progress); this.available = true; this.write = saveProgress; this.onError = onError; this.pending = Promise.resolve();
  }
  save() {
    const snapshot = structuredClone(this.value);
    this.pending = this.pending.then(() => this.write(snapshot)).then(() => { this.available = true; }).catch(error => { this.available = false; this.onError(error); });
    return this.value;
  }
}

export function examplePacket() {
  return validatePacket({
    format: PACK_FORMAT, version: 1, title: 'Workplace word connections', description: 'A sample pack about discussion and connections at work.', level: 'N3',
    lessons: LESSONS.slice(0, 3).map(({ kind, title, kana, romaji, meaning, hook, explanation, examples, questions }) => ({
      kind, title, kana, romaji, meaning, hook: { en: hook.en }, explanation, examples: examples.slice(0, 1),
      questions: questions.map(({ prompt, context, romaji, support, choices, answer, why }) => ({ prompt, context, romaji, ...(support ? { support: { en: support.en } } : {}), choices, answer, why })),
    })),
  });
}
export function generationPrompt({ level = 'N3', focus = 'Mixed', topic = 'Everyday Japanese at work', nepalish = false } = {}) {
  const conditions = { level: levels.includes(level) ? level : 'N3', focus: String(focus).slice(0, 40), topic: String(topic).trim().slice(0, 600), nepalishMemoryNotes: Boolean(nepalish) };
  return `Create a Japanese learning pack for Quest: Kotoba Trail.
Requested conditions:
${JSON.stringify(conditions, null, 2)}

Return ONLY one valid JSON object. Use format "quest-lesson-pack" and version 1.
Create exactly 3 distinct lessons, each with exactly 3 contextual multiple-choice questions and exactly 3 choices per question.
Use kind "kanji" or "grammar". Every lesson needs title, kana, romaji, meaning, hook.en, explanation, 1-3 examples, and questions.
Explanations, meanings, question prompts, feedback, and example translations must be English. Include accurate Japanese and romaji.
${nepalish ? 'Also include hook.ne in casual Romanized Nepalish for every lesson, and support.ne wherever a question has support.en.' : 'English memory notes are sufficient. Omit optional Nepalish fields.'}
Each question needs one unambiguously correct answer. "answer" is a zero-based integer: 0, 1, or 2. Explain why it is correct in "why".
Optional question fields: context (Japanese), romaji, and support with an English en field and optional Nepalish ne field.
Use a short pack title and description. Level must be N5, N4, N3, N2, N1, or Mixed.
Memory stories must be labelled as memory aids, not historical kanji etymology. Check readings, long vowels, particles, transitivity, and all answer keys.
Do not include HTML, JavaScript, links, images, IDs, or player progress. All fields are plain lesson text.
The following is a complete FORMAT EXAMPLE. Replace its topic and lesson content with the requested conditions; keep the same structure:

${JSON.stringify(examplePacket(), null, 2)}`;
}
export function repairPrompt(errors) {
  return `Fix the lesson packet from your previous response for Quest: Kotoba Trail. Keep its intended topic and return only the complete corrected JSON.
The importer reported:
${errors.map((error, i) => `${i + 1}. ${error}`).join('\n')}

Required: format "quest-lesson-pack", version 1, title, description, level, exactly 3 lessons. Each lesson needs kind, title, kana, romaji, meaning, hook.en, explanation, 1-3 examples (japanese/romaji/english), and exactly 3 questions. Each question needs prompt, 3 distinct choices with text, answer as 0/1/2, and why. Nepalish fields are optional. No markdown or code fences.`;
}
