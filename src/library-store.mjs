import { BACKUP_FORMAT, MAX_PACKS, PacketError, newPack, revisePack, validatePacket, validateStoredPack, packLessons, PackProgressStore } from './packs.mjs';

export class IndexedPackRepository {
  constructor(indexedDB, name = 'quest-kotoba-trail-packs.v1') { this.indexedDB = indexedDB; this.name = name; this.connection = null; }
  async open() {
    if (!this.indexedDB) throw new Error('This browser does not provide lesson storage.');
    this.connection = await new Promise((resolve, reject) => {
      const request = this.indexedDB.open(this.name, 1); let blocked = false;
      request.onupgradeneeded = () => request.result.createObjectStore('packs', { keyPath: 'id' });
      request.onsuccess = () => { if (blocked) request.result.close(); else resolve(request.result); };
      request.onerror = () => reject(request.error || new Error('Lesson storage could not be opened.'));
      request.onblocked = () => { blocked = true; reject(new Error('Close other Quest tabs and try opening My Lessons again.')); };
    });
    this.connection.onversionchange = () => { this.connection.close(); this.connection = null; };
  }
  transaction(mode, operation) {
    return new Promise((resolve, reject) => {
      if (!this.connection) { reject(new Error('Lesson storage is unavailable. Reload and try again.')); return; }
      let transaction, result;
      try {
        transaction = this.connection.transaction('packs', mode);
        const request = operation(transaction.objectStore('packs'));
        if (request) request.onsuccess = () => { result = request.result; };
        transaction.oncomplete = () => resolve(result);
        transaction.onabort = transaction.onerror = () => reject(transaction.error || new Error('The lesson library could not be saved. Your device may be out of space.'));
      } catch (error) { if (transaction) { try { transaction.abort(); } catch {} } reject(error); }
    });
  }
  all() { return this.transaction('readonly', store => store.getAll()); }
  put(record) { return this.transaction('readwrite', store => store.put(record)); }
  putMany(records) { return this.transaction('readwrite', store => { for (const record of records) store.put(record); }); }
}

export class LessonLibrary {
  constructor(repository, { onChange = () => {}, onError = () => {} } = {}) {
    this.repository = repository; this.records = []; this.available = false; this.warning = ''; this.onChange = onChange; this.onError = onError; this.queue = Promise.resolve(); this.progressStores = new Map();
  }
  async open() {
    await this.repository.open();
    const records = await this.repository.all();
    let skipped = 0;
    this.records = records.flatMap(value => { try { return [validateStoredPack(value)]; } catch { skipped++; return []; } });
    this.warning = skipped ? `${skipped} saved pack(s) could not be read. Their stored data has been left untouched.` : '';
    this.available = true; this.onChange(); return this;
  }
  get(id) { return this.records.find(record => record.id === id); }
  active() { return this.records.filter(record => !record.removedAt).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)); }
  lesson(id) { for (const record of this.records) { const lesson = packLessons(record).find(lesson => lesson.id === id); if (lesson) return lesson; } return null; }
  enqueue(operation) {
    const result = this.queue.then(operation);
    this.queue = result.catch(() => {});
    return result;
  }
  async save(packet, editingId = null) {
    packet = validatePacket(packet);
    return this.enqueue(async () => {
      if (!this.available) throw new Error('Lesson storage is unavailable. Export this packet to keep a copy, then try another browser.');
      const duplicate = this.records.find(record => !record.removedAt && record.id !== editingId && JSON.stringify(record.packet) === JSON.stringify(packet));
      if (duplicate) throw new PacketError([`This pack is already saved as "${duplicate.packet.title}". Open it from My Lessons.`]);
      const old = editingId ? this.get(editingId) : null;
      if (editingId && (!old || old.removedAt)) throw new Error('This pack is no longer available for editing. Import it as a new pack.');
      if (!old && this.records.length >= MAX_PACKS) throw new Error(`This library already contains ${MAX_PACKS} packs, including removed packs. Export a backup before starting another library.`);
      if (old && JSON.stringify(old.packet) === JSON.stringify(packet)) return old;
      const record = old ? revisePack(old, packet) : newPack(packet);
      await this.repository.put(record);
      this.records = [...this.records.filter(item => item.id !== record.id), record]; this.onChange(); return record;
    });
  }
  async setRemoved(id, removed) {
    return this.enqueue(async () => {
      const old = this.get(id); if (!old) throw new Error('This lesson pack could not be found.');
      const record = { ...old, updatedAt: new Date().toISOString() };
      if (removed) record.removedAt = record.updatedAt; else delete record.removedAt;
      await this.repository.put(record);
      this.records = this.records.map(item => item.id === id ? record : item); this.onChange();
    });
  }
  progress(record) {
    const key = `${record.id}@${record.revision}`;
    if (this.progressStores.has(key)) return this.progressStores.get(key).store;
    const store = new PackProgressStore(record.history[record.revision], progress => this.enqueue(async () => {
      const current = this.get(record.id);
      if (!current) throw new Error('This pack is no longer in your library.');
      const next = { ...current, history: { ...current.history, [record.revision]: progress } };
      await this.repository.put(next);
      this.records = this.records.map(item => item.id === next.id ? next : item); this.onChange();
    }), this.onError);
    this.progressStores.set(key, { store, id: record.id, revision: record.revision }); return store;
  }
  async flush() { await Promise.all([...this.progressStores.values()].map(value => value.store.pending)); await this.queue; }
  async backup() {
    await this.flush();
    const records = structuredClone(this.records);
    for (const { store, id, revision } of this.progressStores.values()) {
      const record = records.find(record => record.id === id);
      if (record) record.history[revision] = structuredClone(store.value);
    }
    return { format: BACKUP_FORMAT, version: 1, exportedAt: new Date().toISOString(), packs: records };
  }
  async restore(records) {
    records = records.map(validateStoredPack);
    return this.enqueue(async () => {
      const additions = [];
      for (const record of records) {
        if ([...this.records, ...additions].some(current => current.id === record.id || JSON.stringify(current.packet) === JSON.stringify(record.packet))) continue;
        additions.push(record);
      }
      if (this.records.length + additions.length > MAX_PACKS) throw new Error(`The restored library would exceed ${MAX_PACKS} saved packs.`);
      await this.repository.putMany(additions);
      this.records = [...this.records, ...additions]; this.onChange();
      return { added: additions.length, skipped: records.length - additions.length };
    });
  }
}
