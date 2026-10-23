export const STORAGE_KEY = 'quest-kotoba-trail.v1';
export const DEFAULT_PREFERENCES = Object.freeze({ music: true, sound: true, effects: true, language: 'en' });
export function freshProgress() { return { version: 1, attempts: [], discovered: [], worlds: {}, preferences: { ...DEFAULT_PREFERENCES }, lastWorld: 'wordwood' }; }
export function normalizeProgress(value) {
  const result = freshProgress();
  if (!value || value.version !== 1) return result;
  result.attempts = Array.isArray(value.attempts) ? value.attempts.filter(a => a && typeof a.lessonId === 'string' && typeof a.correct === 'boolean').slice(-2000) : [];
  result.discovered = Array.isArray(value.discovered) ? [...new Set(value.discovered.filter(id => typeof id === 'string'))] : [];
  result.worlds = value.worlds && typeof value.worlds === 'object' && !Array.isArray(value.worlds) ? { ...value.worlds } : {};
  for (const key of ['music', 'sound', 'effects']) if (typeof value.preferences?.[key] === 'boolean') result.preferences[key] = value.preferences[key];
  if (['en', 'ne'].includes(value.preferences?.language)) result.preferences.language = value.preferences.language;
  if (['wordwood', 'workshop', 'sky'].includes(value.lastWorld)) result.lastWorld = value.lastWorld;
  return result;
}
export function recordAttempt(progress, attempt, now = new Date().toISOString()) {
  const next = normalizeProgress(progress);
  next.attempts.push({ lessonId: attempt.lessonId, questionId: attempt.questionId, selected: attempt.selected, correct: Boolean(attempt.correct), hinted: Boolean(attempt.hinted), support: attempt.hinted ? 'after-review-or-hint' : 'without-in-game-hint', at: now });
  next.attempts = next.attempts.slice(-2000);
  if (attempt.correct && !next.discovered.includes(attempt.lessonId)) next.discovered.push(attempt.lessonId);
  return next;
}
export function practiceStats(progress) {
  const attempts = progress.attempts || [];
  return { tries: attempts.length, correct: attempts.filter(a => a.correct).length, discoveries: (progress.discovered || []).length, supported: attempts.filter(a => a.correct && a.hinted).length };
}
export class ProgressStore {
  constructor(storage, key = STORAGE_KEY) { this.storage = storage; this.key = key; this.available = Boolean(storage); this.value = freshProgress(); try { this.value = normalizeProgress(JSON.parse(storage?.getItem(this.key) || 'null')); } catch { this.available = false; } }
  save() { try { this.storage?.setItem(this.key, JSON.stringify(this.value)); } catch { this.available = false; } return this.value; }
  attempt(value) { this.value = recordAttempt(this.value, value); return this.save(); }
  setPreference(key, value) {
    if (key === 'language') {
      if (value === 'en' || value === 'ne') this.value.preferences.language = value;
    } else if (Object.hasOwn(DEFAULT_PREFERENCES, key)) this.value.preferences[key] = Boolean(value);
    this.save();
  }
  complete(worldId, summary) { const old = this.value.worlds[worldId] || {}; this.value.worlds[worldId] = { completed: true, bestScore: Math.max(Number(old.bestScore) || 0, summary.score), bestTime: Math.min(Number(old.bestTime) || Infinity, summary.time), runs: (Number(old.runs) || 0) + 1 }; this.save(); }
}
