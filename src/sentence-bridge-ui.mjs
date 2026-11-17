import { learningText } from './content.mjs';

const $ = id => document.getElementById(id);

export class SentenceBridgeUI {
  constructor({ onClose, onCheck, language, cue }) {
    this.dialog = $('sentence-bridge-dialog');
    this.onClose = onClose; this.onCheck = onCheck; this.language = language; this.cue = cue;
    $('close-sentence-bridge').addEventListener('click', onClose);
    $('sentence-bridge-continue').addEventListener('click', onClose);
    this.dialog.addEventListener('cancel', event => { event.preventDefault(); onClose(); });
    $('sentence-tile-bank').addEventListener('click', event => {
      const tile = event.target.closest('[data-pick-tile]');
      if (!tile || this.order.includes(tile.dataset.pickTile)) return;
      this.order.push(tile.dataset.pickTile);
      this.cue('click'); this.clearFeedback(); this.render();
      const nextTile = $('sentence-tile-bank').querySelector('button:not([disabled])');
      (nextTile || $('sentence-check')).focus({ preventScroll: true });
    });
    $('sentence-order').addEventListener('click', event => {
      const tile = event.target.closest('[data-remove-tile]');
      if (!tile) return;
      this.order = this.order.filter(id => id !== tile.dataset.removeTile);
      this.cue('click'); this.clearFeedback(); this.render();
      $('sentence-tile-bank').querySelector(`[data-pick-tile="${tile.dataset.removeTile}"]`).focus({ preventScroll: true });
    });
    $('sentence-reset').addEventListener('click', () => {
      this.order = []; this.cue('click'); this.clearFeedback(); this.render();
      $('sentence-tile-bank').querySelector('button').focus({ preventScroll: true });
    });
    $('sentence-hint-button').addEventListener('click', () => {
      $('sentence-hint').hidden = !$('sentence-hint').hidden;
      $('sentence-hint-button').setAttribute('aria-expanded', String(!$('sentence-hint').hidden));
      this.renderHint();
    });
    $('sentence-check').addEventListener('click', () => this.check());
  }

  open(site) {
    this.site = site;
    this.order = [];
    $('sentence-builder').hidden = false; $('sentence-bridge-success').hidden = true;
    $('sentence-meaning').textContent = site.meaning;
    $('sentence-hint').hidden = true;
    $('sentence-hint-button').setAttribute('aria-expanded', 'false');
    this.clearFeedback(); this.render();
    this.dialog.showModal();
    $('sentence-bridge-title').focus({ preventScroll: true });
  }

  close() { if (this.dialog.open) this.dialog.close(); }

  clearFeedback() { $('sentence-feedback').textContent = ''; }

  renderHint() {
    if (!this.dialog.open || $('sentence-hint').hidden) return;
    const lang = this.language();
    $('sentence-hint').lang = lang === 'ne' ? 'ne-Latn' : 'en';
    $('sentence-hint').textContent = learningText(this.site.hint, lang);
  }

  render() {
    const { tiles } = this.site;
    const bank = $('sentence-tile-bank');
    const options = tiles.map(tile => {
      const button = document.createElement('button');
      button.className = 'sentence-tile'; button.type = 'button'; button.dataset.pickTile = tile.id;
      const japanese = document.createElement('strong'); japanese.lang = 'ja'; japanese.textContent = tile.text;
      const reading = document.createElement('small'); reading.textContent = tile.romaji;
      button.append(japanese, reading);
      button.disabled = this.order.includes(tile.id);
      return button;
    });
    bank.replaceChildren(...options);
    $('sentence-order').replaceChildren(...tiles.map((_, index) => {
      const item = document.createElement('li');
      const tile = tiles.find(candidate => candidate.id === this.order[index]);
      const position = document.createElement('span'); position.className = 'sentence-position';
      position.textContent = index + 1; position.setAttribute('aria-hidden', 'true');
      item.append(position);
      if (!tile) {
        const empty = document.createElement('span'); empty.className = 'sentence-empty';
        empty.textContent = 'Empty'; item.append(empty);
      } else {
        const button = document.createElement('button'); button.type = 'button';
        button.className = 'sentence-placed'; button.dataset.removeTile = tile.id;
        button.setAttribute('aria-label', `Remove tile ${index + 1}: ${tile.text} (${tile.romaji})`);
        const text = document.createElement('span'); text.lang = 'ja'; text.textContent = tile.text;
        button.append(text); item.append(button);
      }
      return item;
    }));
    $('sentence-check').disabled = this.order.length !== tiles.length;
    $('sentence-reset').disabled = !this.order.length;
  }

  check() {
    const result = this.onCheck(this.order);
    if (result === 'retry') {
      this.cue('wrong');
      $('sentence-feedback').textContent = 'The order doesn’t match the clue yet. Tap a placed tile to move it back to the bank.';
      $('sentence-hint').hidden = false;
      $('sentence-hint-button').setAttribute('aria-expanded', 'true');
      this.renderHint();
    } else if (result === 'built') {
      this.cue('correct');
      const ordered = this.order.map(id => this.site.tiles.find(tile => tile.id === id));
      $('sentence-result-japanese').textContent = ordered.map(tile => tile.text + (tile.pauseAfter ? '、' : '')).join('') + '。';
      $('sentence-result-reading').textContent = ordered.map(tile => tile.romaji + (tile.pauseAfter ? ',' : '')).join(' ') + '.';
      $('sentence-builder').hidden = true; $('sentence-bridge-success').hidden = false;
      $('sentence-bridge-continue').focus({ preventScroll: true });
    }
  }
}
