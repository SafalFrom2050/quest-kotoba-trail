import { IndexedPackRepository, LessonLibrary } from './library-store.mjs';
import { MAX_IMPORT_BYTES, PacketError, parseImport, validatePacket, packLessons, generationPrompt, repairPrompt, examplePacket } from './packs.mjs';
import { practiceStats } from './progress.mjs';
import { WORLDS } from './worlds.mjs';

const $ = id => document.getElementById(id);
const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const slug = title => title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 60).replace(/^-|-$/g, '') || 'quest-lessons';

export function downloadJSON(value, name) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' }));
  const link = document.createElement('a'); link.href = url; link.download = name; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function field(label, name, value, { area = false, choices = null } = {}) {
  const attributes = `data-packet-path="${escape(name)}"`;
  const control = choices
    ? `<select ${attributes}>${choices.map(([key, text]) => `<option value="${escape(key)}" ${String(value) === String(key) ? 'selected' : ''}>${escape(text)}</option>`).join('')}</select>`
    : area ? `<textarea ${attributes} rows="3" maxlength="3500">${escape(value)}</textarea>` : `<input ${attributes} value="${escape(value)}" maxlength="1000">`;
  return `<label class="pack-field"><span>${escape(label)}</span>${control}</label>`;
}

export class LessonLibraryUI {
  constructor({ qa = false, onClose, onPlay, onStudy, onError = () => {} }) {
    this.onClose = onClose; this.onPlay = onPlay; this.onStudy = onStudy; this.onError = onError;
    this.dialog = $('library-dialog'); this.tab = 'saved'; this.errors = []; this.editingId = null; this.draft = null; this.backupDraft = null; this.showRemoved = false;
    this.dialog.innerHTML = `
      <button class="dialog-close" id="close-library-button" aria-label="Close My Lessons">×</button>
      <div class="eyebrow">MAKE THE TRAIL YOURS</div>
      <h2 id="library-heading">My Lessons</h2>
      <p class="pack-intro">Make a pack with any AI chatbot, bring it here, and turn three lessons into an adventure.</p>
      <nav class="pack-tabs" role="tablist" aria-label="Lesson library">
        <button role="tab" id="pack-tab-saved" data-pack-tab="saved" aria-controls="pack-panel-saved">My packs</button>
        <button role="tab" id="pack-tab-create" data-pack-tab="create" aria-controls="pack-panel-create">1 · Create a prompt</button>
        <button role="tab" id="pack-tab-import" data-pack-tab="import" aria-controls="pack-panel-import">2 · Import & review</button>
      </nav>
      <p id="pack-library-message" class="pack-status" role="status"></p>
      <section id="pack-panel-saved" role="tabpanel" aria-labelledby="pack-tab-saved">
        <div class="pack-library-toolbar">
          <label class="pack-field"><span>Practice scenery</span><select id="pack-theme">${WORLDS.map(world => `<option value="${world.id}">${escape(world.name)}</option>`).join('')}</select></label>
          <button class="outline-button" id="pack-backup-button">Back up my library ↓</button>
        </div>
        <p class="pack-small">Saved in this browser. Export packs to share lessons; use a library backup to keep your practice history too.</p>
        <div id="pack-list"></div>
        <button class="quiet-button" id="pack-removed-button">Show removed packs</button>
      </section>
      <section id="pack-panel-create" role="tabpanel" aria-labelledby="pack-tab-create" hidden>
        <form id="pack-prompt-form">
          <div class="pack-grid">
            <label class="pack-field"><span>JLPT level</span><select id="pack-level"><option>N5</option><option>N4</option><option selected>N3</option><option>N2</option><option>N1</option><option>Mixed</option></select></label>
            <label class="pack-field"><span>Lesson focus</span><select id="pack-focus"><option>Mixed</option><option>Kanji</option><option>Grammar</option></select></label>
          </div>
          <label class="pack-field"><span>What would you like to study?</span><textarea id="pack-topic" rows="3" maxlength="600" required>Everyday Japanese at work</textarea></label>
          <label class="pack-check"><input type="checkbox" id="pack-nepalish"> Include Romanized Nepalish memory notes alongside English</label>
          <p class="pack-small">Each pack has three lessons, with examples and three practice questions per lesson.</p>
          <button class="primary-button" type="submit">Generate prompt →</button>
        </form>
        <div id="pack-prompt-result" hidden>
          <label class="pack-field"><span>Copy this into your preferred AI chatbot</span><textarea id="pack-prompt-output" rows="9" readonly></textarea></label>
          <div class="pack-actions"><button class="outline-button" id="pack-copy-prompt">Copy prompt</button><button class="quiet-button" id="pack-go-import">I have my packet →</button></div>
        </div>
      </section>
      <section id="pack-panel-import" role="tabpanel" aria-labelledby="pack-tab-import" hidden>
        <label class="pack-field"><span>Paste your lesson packet or library backup</span><textarea id="pack-json" rows="7" spellcheck="false" maxlength="1048576" placeholder="Paste the complete JSON response from your chatbot"></textarea></label>
        <div class="pack-actions">
          <button class="primary-button" id="pack-review-button">Review packet →</button>
          <label class="pack-file-button">Choose JSON file<input type="file" id="pack-file" accept=".json,application/json"></label>
          <button class="quiet-button" id="pack-example-button">Try an example</button>
        </div>
        <div id="pack-errors" class="pack-errors" role="alert" hidden><strong>Let's fix this packet</strong><ul id="pack-error-list"></ul><button class="outline-button" id="pack-repair-button">Copy repair prompt</button></div>
        <label class="pack-field" id="pack-repair-field" hidden><span>Repair prompt for your chatbot</span><textarea id="pack-repair-output" rows="5" readonly></textarea></label>
        <section id="pack-backup-preview" class="pack-preview" hidden></section>
        <section id="pack-preview" class="pack-preview" hidden>
          <h3 id="pack-preview-heading">Review your lessons</h3>
          <p class="pack-small">Check the Japanese and answer keys. Format checks cannot establish language accuracy. You can edit every field below.</p>
          <p id="pack-revision-note" class="pack-small" hidden>Saving changes starts fresh practice for this revision. Earlier practice stays in your library backup.</p>
          <form id="pack-editor-form"><div id="pack-editor"></div><div class="pack-actions pack-save-actions"><button type="submit" class="primary-button" id="pack-save-button">Save to My Lessons →</button><button type="button" class="outline-button" id="pack-preview-export">Export reviewed pack ↓</button></div></form>
        </section>
      </section>`;
    let indexedDB; try { indexedDB = globalThis.indexedDB; } catch { indexedDB = null; }
    this.library = new LessonLibrary(new IndexedPackRepository(indexedDB, qa ? 'quest-kotoba-trail-packs.qa.v1' : undefined), {
      onChange: () => { this.renderList(); },
      onError: error => { this.message(`Your last practice could not be saved: ${error.message}`, true); this.onError('Custom practice could not be saved. Keep this tab open and export a library backup.'); },
    });
    this.bind(); this.selectTab('saved'); this.message('Opening your lesson library…');
    this.initialized = this.library.open().then(() => {
      this.message(this.library.warning || 'Your packs stay on this device.'); this.renderList();
    }).catch(error => {
      this.message(`Lesson storage is unavailable: ${error.message} You can still create prompts and review or export a packet.`, true);
      this.renderList();
    });
  }
  bind() {
    $('close-library-button').addEventListener('click', this.onClose);
    this.dialog.addEventListener('cancel', event => { event.preventDefault(); this.onClose(); });
    this.dialog.querySelectorAll('[data-pack-tab]').forEach(button => {
      button.addEventListener('click', () => this.selectTab(button.dataset.packTab));
      button.addEventListener('keydown', event => {
        if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
        event.preventDefault();
        const tabs = ['saved', 'create', 'import'], index = tabs.indexOf(this.tab);
        const next = event.key === 'Home' ? 0 : event.key === 'End' ? 2 : (index + (event.key === 'ArrowRight' ? 1 : 2)) % 3;
        this.selectTab(tabs[next]); $(`pack-tab-${tabs[next]}`).focus();
      });
    });
    $('pack-prompt-form').addEventListener('submit', event => {
      event.preventDefault();
      $('pack-prompt-output').value = generationPrompt({ level: $('pack-level').value, focus: $('pack-focus').value, topic: $('pack-topic').value, nepalish: $('pack-nepalish').checked });
      $('pack-prompt-result').hidden = false; this.message('Copy the prompt, use any chatbot, then bring its complete response back here.');
    });
    $('pack-copy-prompt').addEventListener('click', () => this.copy($('pack-prompt-output')));
    $('pack-go-import').addEventListener('click', () => this.selectTab('import'));
    $('pack-review-button').addEventListener('click', () => this.review());
    $('pack-example-button').addEventListener('click', () => { $('pack-json').value = JSON.stringify(examplePacket(), null, 2); this.review(); });
    $('pack-file').addEventListener('change', async event => {
      const file = event.target.files?.[0]; if (!file) return;
      try {
        if (file.size > MAX_IMPORT_BYTES) throw new PacketError(['Choose a file smaller than 25 MB.']);
        $('pack-json').value = await file.text(); this.review();
      } catch (error) { this.showErrors(error); }
      event.target.value = '';
    });
    $('pack-repair-button').addEventListener('click', () => {
      $('pack-repair-output').value = repairPrompt(this.errors); $('pack-repair-field').hidden = false; void this.copy($('pack-repair-output'));
    });
    $('pack-editor-form').addEventListener('submit', event => { event.preventDefault(); void this.savePreview(); });
    $('pack-preview-export').addEventListener('click', () => {
      try { const packet = this.readEditor(); downloadJSON(packet, `${slug(packet.title)}.json`); this.message('Lesson packet exported without personal progress.'); }
      catch (error) { this.showErrors(error); }
    });
    $('pack-backup-button').addEventListener('click', async () => {
      try {
        await this.initialized; if (!this.library.available) throw new Error('The lesson library is unavailable.');
        downloadJSON(await this.library.backup(), 'quest-library-backup.json'); this.message('Library backup exported, including saved packs and their practice history.');
      } catch (error) { this.message(error.message, true); }
    });
    $('pack-removed-button').addEventListener('click', () => { this.showRemoved = !this.showRemoved; this.renderList(); });
    $('pack-list').addEventListener('click', event => {
      const button = event.target.closest('[data-pack-action]'); if (button) void this.action(button);
    });
  }
  selectTab(tab) {
    this.tab = tab;
    for (const name of ['saved', 'create', 'import']) {
      $(`pack-panel-${name}`).hidden = name !== tab;
      const button = $(`pack-tab-${name}`); button.setAttribute('aria-selected', String(name === tab)); button.tabIndex = name === tab ? 0 : -1;
    }
  }
  open() { if (!this.dialog.open) this.dialog.showModal(); this.renderList(); $('close-library-button').focus({ preventScroll: true }); }
  hide() { if (this.dialog.open) this.dialog.close(); }
  message(text, error = false) { $('pack-library-message').textContent = text; $('pack-library-message').classList.toggle('is-error', error); }
  async copy(textarea) {
    try { await navigator.clipboard.writeText(textarea.value); this.message('Copied. Paste it into your preferred chatbot.'); }
    catch { textarea.focus(); textarea.select(); this.message('Select and copy the text below; clipboard access is unavailable in this browser.'); }
  }
  showErrors(error) {
    this.errors = error instanceof PacketError ? error.errors : [error.message || 'This packet could not be saved.'];
    $('pack-error-list').innerHTML = this.errors.map(message => `<li>${escape(message)}</li>`).join('');
    $('pack-errors').hidden = false; $('pack-errors').scrollIntoView({ block: 'nearest' });
  }
  clearErrors() { this.errors = []; $('pack-errors').hidden = true; $('pack-repair-field').hidden = true; }
  review() {
    this.clearErrors(); this.editingId = null; this.draft = null; this.backupDraft = null;
    $('pack-preview').hidden = true; $('pack-backup-preview').hidden = true;
    try {
      const result = parseImport($('pack-json').value);
      if (result.kind === 'backup') this.previewBackup(result.records); else this.preview(result.packet);
    } catch (error) { this.showErrors(error); }
  }
  preview(packet, editingId = null) {
    this.clearErrors(); this.editingId = editingId; this.backupDraft = null; this.draft = structuredClone(packet);
    for (const lesson of this.draft.lessons) { lesson.hook.ne ??= ''; for (const question of lesson.questions) question.support ??= { en: '', ne: '' }; }
    $('pack-backup-preview').hidden = true; $('pack-preview').hidden = false;
    $('pack-preview-heading').textContent = editingId ? 'Edit your lesson pack' : 'Review your lessons';
    $('pack-revision-note').hidden = !editingId;
    $('pack-save-button').textContent = editingId ? 'Save updated pack →' : 'Save to My Lessons →';
    $('pack-save-button').disabled = !this.library.available;
    const draft = this.draft;
    $('pack-editor').innerHTML = field('Pack title', 'title', draft.title) + field('Description', 'description', draft.description, { area: true }) +
      field('Level', 'level', draft.level, { choices: ['N5', 'N4', 'N3', 'N2', 'N1', 'Mixed'].map(level => [level, level]) }) +
      draft.lessons.map((lesson, i) => {
        const prefix = `lessons.${i}`;
        return `<details class="pack-lesson-editor" ${i === 0 ? 'open' : ''}><summary>Lesson ${i + 1} · ${escape(lesson.title)} <small>${escape(lesson.meaning)}</small></summary><div class="pack-editor-body">
          <div class="pack-grid">${field('Topic', `${prefix}.title`, lesson.title)}${field('Kind', `${prefix}.kind`, lesson.kind, { choices: [['kanji', 'Kanji / vocabulary'], ['grammar', 'Grammar']] })}${field('Kana reading', `${prefix}.kana`, lesson.kana)}${field('Romaji', `${prefix}.romaji`, lesson.romaji)}</div>
          ${field('Meaning', `${prefix}.meaning`, lesson.meaning)}${field('English memory note', `${prefix}.hook.en`, lesson.hook.en, { area: true })}${field('Nepalish memory note (optional)', `${prefix}.hook.ne`, lesson.hook.ne, { area: true })}${field('Explanation', `${prefix}.explanation`, lesson.explanation, { area: true })}
          <details class="pack-editor-group"><summary>Worked examples · ${lesson.examples.length}</summary>${lesson.examples.map((example, j) => `<fieldset><legend>Example ${j + 1}</legend>${field('Japanese sentence', `${prefix}.examples.${j}.japanese`, example.japanese)}${field('Sentence romaji', `${prefix}.examples.${j}.romaji`, example.romaji)}${field('English translation', `${prefix}.examples.${j}.english`, example.english)}</fieldset>`).join('')}</details>
          <details class="pack-editor-group"><summary>Practice questions · 3</summary>${lesson.questions.map((question, j) => {
            const qp = `${prefix}.questions.${j}`;
            return `<fieldset><legend>Question ${j + 1}</legend>${field('Question prompt', `${qp}.prompt`, question.prompt, { area: true })}${field('Japanese context (optional)', `${qp}.context`, question.context)}${field('Context romaji (optional)', `${qp}.romaji`, question.romaji)}
              ${field('English hint (optional)', `${qp}.support.en`, question.support.en)}${field('Nepalish hint (optional)', `${qp}.support.ne`, question.support.ne)}
              ${question.choices.map((choice, k) => `<div class="pack-grid">${field(`Choice ${k + 1}`, `${qp}.choices.${k}.text`, choice.text)}${field(`Choice ${k + 1} note (optional)`, `${qp}.choices.${k}.note`, choice.note)}</div>`).join('')}
              ${field('Correct answer', `${qp}.answer`, question.answer, { choices: [[0, 'Choice 1'], [1, 'Choice 2'], [2, 'Choice 3']] })}${field('Why this answer is correct', `${qp}.why`, question.why, { area: true })}</fieldset>`;
          }).join('')}</details></div></details>`;
      }).join('');
    $('pack-preview-heading').scrollIntoView({ block: 'start' });
  }
  readEditor() {
    const packet = structuredClone(this.draft);
    $('pack-editor').querySelectorAll('[data-packet-path]').forEach(input => {
      const parts = input.dataset.packetPath.split('.'), key = parts.pop();
      let target = packet; for (const part of parts) target = target[part];
      target[key] = key === 'answer' ? Number(input.value) : input.value;
    });
    return validatePacket(packet);
  }
  async savePreview() {
    const button = $('pack-save-button'); button.disabled = true;
    try {
      this.clearErrors(); const packet = this.readEditor();
      await this.initialized; await this.library.save(packet, this.editingId);
      this.draft = null; this.editingId = null; $('pack-preview').hidden = true;
      this.selectTab('saved'); this.renderList(); this.dialog.scrollTop = 0; this.message('Saved in this browser. Your lesson pack is ready to study or play.');
    } catch (error) { this.showErrors(error); }
    finally { button.disabled = !this.library.available; }
  }
  previewBackup(records) {
    this.backupDraft = records; this.draft = null; $('pack-preview').hidden = true;
    const preview = $('pack-backup-preview'); preview.hidden = false;
    preview.innerHTML = `<h3>Restore a library backup</h3><p>${records.length} pack(s), including their saved practice history. Existing packs and matching content will be kept as they are.</p><ul>${records.map(record => `<li>${escape(record.packet.title)} · revision ${record.revision}${record.removedAt ? ' · removed' : ''}</li>`).join('')}</ul><button class="primary-button" id="pack-restore-button">Restore missing packs →</button>`;
    $('pack-restore-button').disabled = !this.library.available;
    $('pack-restore-button').addEventListener('click', async () => {
      $('pack-restore-button').disabled = true;
      try {
        const result = await this.library.restore(this.backupDraft); preview.hidden = true; this.selectTab('saved'); this.renderList();
        this.message(`Restored ${result.added} pack(s). Kept ${result.skipped} existing pack(s) unchanged.`);
      } catch (error) { this.showErrors(error); $('pack-restore-button').disabled = !this.library.available; }
    });
  }
  renderList() {
    if (!$('pack-list')) return;
    $('pack-backup-button').disabled = !this.library.available;
    const records = this.showRemoved ? this.library.records.filter(record => record.removedAt) : this.library.active();
    $('pack-removed-button').textContent = this.showRemoved ? 'Back to saved packs' : 'Show removed packs';
    $('pack-list').innerHTML = records.length ? records.map(record => {
      const lessons = packLessons(record), stats = practiceStats(record.history[record.revision] || {});
      return `<article class="pack-card"><div class="pack-card-heading"><div><span class="tiny-label">${escape(record.packet.level)} · 3 LESSONS · REVISION ${record.revision}</span><h3>${escape(record.packet.title)}</h3></div><span class="pack-badge">CUSTOM PACK</span></div><p>${escape(record.packet.description)}</p>
        <p class="pack-small">${stats.discoveries} / 3 practiced · ${stats.correct} / ${stats.tries} practice hits</p>
        ${record.removedAt ? `<div class="pack-actions"><button class="outline-button" data-pack-action="restore" data-pack-id="${record.id}">Restore pack</button><button class="quiet-button" data-pack-action="export" data-pack-id="${record.id}">Export lessons ↓</button></div>` : `
        <div class="pack-lesson-links">${lessons.map((lesson, i) => `<button class="pack-lesson-link" data-pack-action="study" data-pack-id="${record.id}" data-lesson-index="${i}"><strong lang="ja">${escape(lesson.title)}</strong><span>${escape(lesson.romaji)}</span></button>`).join('')}</div>
        <div class="pack-actions"><button class="primary-button" data-pack-action="play" data-pack-id="${record.id}">Play pack →</button><button class="outline-button" data-pack-action="edit" data-pack-id="${record.id}">Edit</button><button class="outline-button" data-pack-action="export" data-pack-id="${record.id}">Export lessons ↓</button><button class="quiet-button" data-pack-action="remove" data-pack-id="${record.id}">Remove</button></div>`}</article>`;
    }).join('') : `<div class="pack-empty"><span>✦</span><h3>${this.showRemoved ? 'No removed packs.' : 'Your next adventure starts with an idea.'}</h3><p>${this.showRemoved ? 'Removed packs stay here so you can restore them.' : 'Create a prompt for your chatbot, or import a lesson packet you already have.'}</p></div>`;
  }
  async action(button) {
    try {
      await this.initialized; await this.library.flush();
      const record = this.library.get(button.dataset.packId); if (!record) throw new Error('This pack could not be found.');
      switch (button.dataset.packAction) {
        case 'study': {
          const lesson = packLessons(record)[Number(button.dataset.lessonIndex)];
          this.onStudy(lesson, this.library.progress(record)); break;
        }
        case 'play': this.onPlay(record, $('pack-theme').value); break;
        case 'edit': this.selectTab('import'); $('pack-json').value = JSON.stringify(record.packet, null, 2); this.preview(record.packet, record.id); break;
        case 'export': downloadJSON(record.packet, `${slug(record.packet.title)}.json`); this.message('Lesson packet exported without personal progress.'); break;
        case 'remove': await this.library.setRemoved(record.id, true); this.message('Pack removed from this list. Restore it from Show removed packs.'); break;
        case 'restore': await this.library.setRemoved(record.id, false); this.showRemoved = false; this.renderList(); this.message('Pack restored with its practice history.'); break;
      }
    } catch (error) { this.message(error.message, true); }
  }
  findLesson(id) { return this.library.lesson(id); }
}
