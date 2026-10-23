const NOTES = [261.63, 293.66, 329.63, 392.00, 440.00, 523.25, 587.33, 659.25];
export class SoundEngine {
  constructor(preferences = {}) { this.music = preferences.music !== false; this.sound = preferences.sound !== false; this.context = null; this.timer = null; this.step = 0; this.nextTime = 0; this.startTime = 0; this.mode = 'title'; this.world = 'wordwood'; this.scheduledBeats = 0; this.mutedByVisibility = false; }
  async unlock() {
    const Audio = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (!Audio) return false;
    if (!this.context) {
      this.context = new Audio({ latencyHint: 'interactive' });
      this.master = this.context.createGain(); this.master.gain.value = .65;
      const compressor = this.context.createDynamicsCompressor(); compressor.threshold.value = -15; compressor.ratio.value = 4;
      this.musicBus = this.context.createGain(); this.musicBus.gain.value = this.music ? .12 : 0;
      this.fxBus = this.context.createGain(); this.fxBus.gain.value = this.sound ? .26 : 0;
      this.musicBus.connect(this.master); this.fxBus.connect(this.master); this.master.connect(compressor); compressor.connect(this.context.destination);
      this.startTime = this.context.currentTime; this.nextTime = this.context.currentTime + .06;
      this.timer = setInterval(() => this.scheduleMusic(), 30);
    }
    try { await this.context.resume(); return this.context.state === 'running'; } catch { return false; }
  }
  note(freq, time, duration, type = 'triangle', volume = .3, bus = this.fxBus, slide = 0) {
    if (!this.context || !bus || freq <= 0) return;
    const osc = this.context.createOscillator(); const gain = this.context.createGain();
    osc.type = type; osc.frequency.setValueAtTime(freq, time);
    if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(20, freq + slide), time + duration);
    gain.gain.setValueAtTime(.0001, time); gain.gain.exponentialRampToValueAtTime(Math.max(.0002, volume), time + .008); gain.gain.exponentialRampToValueAtTime(.0001, time + duration);
    osc.connect(gain); gain.connect(bus); osc.start(time); osc.stop(time + duration + .02);
  }
  noise(time, duration, volume, bus = this.musicBus) {
    if (!this.context) return;
    const count = Math.ceil(this.context.sampleRate * duration); const buffer = this.context.createBuffer(1, count, this.context.sampleRate);
    const values = buffer.getChannelData(0); for (let i = 0; i < count; i++) values[i] = (Math.random() * 2 - 1) * (1 - i / count);
    const source = this.context.createBufferSource(); const gain = this.context.createGain(); const filter = this.context.createBiquadFilter(); filter.type = 'highpass'; filter.frequency.value = 3500;
    gain.gain.value = volume; source.buffer = buffer; source.connect(filter); filter.connect(gain); gain.connect(bus); source.start(time); source.stop(time + duration);
  }
  scheduleMusic() {
    if (!this.context || this.context.state !== 'running' || !this.music || this.mutedByVisibility) { if (this.context) this.nextTime = this.context.currentTime + .04; return; }
    const stepLength = 60 / 148 / 2;
    while (this.nextTime < this.context.currentTime + .13) {
      const i = this.step % 16; const t = this.nextTime;
      const melody = this.world === 'sky' ? [0,4,5,7,5,4,3,2,0,3,4,5,7,5,4,3] : this.world === 'workshop' ? [0,0,3,4,5,3,2,3,0,3,5,7,5,4,3,2] : [0,2,3,5,3,2,0,2,1,3,4,5,4,3,2,1];
      const shift = Math.floor(this.step / 32) % 2 ? .75 : 1;
      if (i % 2 === 0) this.note(NOTES[melody[i]] * shift, t, .15, 'square', .085, this.musicBus);
      if (i % 4 === 0) { this.note(110 * shift, t, .17, 'triangle', .36, this.musicBus); this.note(120, t, .1, 'sine', .55, this.musicBus, -86); }
      if (i % 8 === 4) this.noise(t, .085, .14);
      if (i % 2 === 1) this.noise(t, .028, .04);
      this.step++; this.scheduledBeats++; this.nextTime += stepLength;
    }
  }
  cue(kind) {
    if (!this.context || !this.sound || this.context.state !== 'running') return;
    const t = this.context.currentTime + .008;
    if (kind === 'jump') this.note(340, t, .13, 'square', .14, this.fxBus, 430);
    else if (kind === 'double') { this.note(560, t, .13, 'triangle', .23, this.fxBus, 560); this.note(840, t + .03, .15, 'triangle', .1); }
    else if (kind === 'dash') this.note(680, t, .12, 'sawtooth', .09, this.fxBus, -590);
    else if (kind === 'coin') { this.note(880, t, .075, 'triangle', .3); this.note(1320, t + .035, .11, 'sine', .2); }
    else if (kind === 'stomp') { this.note(220, t, .13, 'square', .16, this.fxBus, 220); this.note(660, t + .05, .12, 'triangle', .13); }
    else if (kind === 'hurt') this.note(180, t, .21, 'triangle', .2, this.fxBus, -100);
    else if (kind === 'wrong') { this.note(294, t, .11, 'triangle', .14); this.note(261, t + .09, .17, 'triangle', .13); }
    else if (kind === 'correct' || kind === 'win') [0,2,4,5,7].forEach((index, i) => this.note(NOTES[index] * (kind === 'win' ? 2 : 1), t + i * .085, .25, 'triangle', .23));
    else if (kind === 'shrine') [0,3,5].forEach((index,i) => this.note(NOTES[index] * 2, t + i * .045, .2, 'sine', .14));
    else this.note(560, t, .07, 'triangle', .12);
  }
  configure({ music = this.music, sound = this.sound } = {}) { this.music = music; this.sound = sound; this.applyGains(); }
  setMode(mode, world = this.world) { this.mode = mode; this.world = world; this.applyGains(); }
  applyGains() { if (!this.context) return; const at = this.context.currentTime; const quiet = ['lesson','guide','pause'].includes(this.mode); this.musicBus.gain.setTargetAtTime(this.music && !this.mutedByVisibility ? (quiet ? .04 : .12) : 0, at, .1); this.fxBus.gain.setTargetAtTime(this.sound && !this.mutedByVisibility ? .26 : 0, at, .05); }
  setHidden(hidden) { this.mutedByVisibility = hidden; this.applyGains(); }
  pulse() { if (!this.context || !this.music || this.mutedByVisibility) return 0; const phase = ((this.context.currentTime - this.startTime) * 148 / 120) % 1; return Math.exp(-phase * 7); }
  dispose() { clearInterval(this.timer); this.timer = null; this.context?.close(); }
}
