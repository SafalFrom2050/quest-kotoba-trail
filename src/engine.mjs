import { createPlayer, stepPlayer, overlaps, clamp } from './physics.mjs';
import { getWorld } from './worlds.mjs';
import { findLesson } from './content.mjs';
import { drawCountryside, drawCountryWater, drawCountryPlatform, drawCountryShrine, drawCountryPortal } from './countryside.mjs';

const rand = (min, max) => min + Math.random() * (max - min);
const pixelFont = '"Yu Gothic", "Noto Sans JP", sans-serif';
const UI_FONT = '"Segoe UI", sans-serif';

export class GameEngine {
  constructor(canvas, atlas, { onEvent = () => {}, pulse = () => 0, effects = true, lookupLesson = findLesson } = {}) {
    this.canvas = canvas; this.ctx = canvas.getContext('2d'); this.atlas = atlas; this.onEvent = onEvent; this.pulse = pulse; this.effects = effects;
    this.lookupLesson = lookupLesson;
    this.phase = 'title'; this.input = { left: false, right: false, jumpPressed: false, dashPressed: false };
    this.time = 0; this.lastFrame = 0; this.accumulator = 0; this.camera = { x: 0, y: 0 }; this.view = { w: 1280, h: 800 };
    this.particles = []; this.floaters = []; this.ghosts = []; this.shake = 0; this.hitStop = 0; this.flash = 0;
    this.animation = 'idle'; this.animationTime = 0; this.load('wordwood');
  }
  load(id) {
    this.world = typeof id === 'object' && id ? id : getWorld(id) || getWorld('wordwood'); this.player = createPlayer(this.world.spawn); this.player.y = 544;
    this.learned = new Set(); this.collected = new Set(); this.enemies = this.world.enemies.map((e,i) => ({ ...e, w: 38, h: 30, direction: i % 2 ? -1 : 1, alive: true }));
    this.score = 0; this.health = 3; this.combo = 0; this.bestCombo = 0; this.comboTime = 0; this.elapsed = 0; this.boost = 0;
    this.checkpoint = { x: this.world.spawn.x, y: 544 }; this.camera = { x: 0, y: 0 }; this.particles = []; this.floaters = []; this.ghosts = [];
    this.animation = 'idle'; this.animationTime = 0; this.input.jumpPressed = false; this.input.dashPressed = false; this.onEvent('state', this.snapshot());
  }
  start(id) { this.load(id); this.phase = 'playing'; this.onEvent('start', this.snapshot()); }
  setPhase(phase) { this.phase = phase; this.clearInput(); }
  clearInput() { this.input.left = this.input.right = this.input.jumpPressed = this.input.dashPressed = false; }
  snapshot() { return { world: this.world.id, score: this.score, health: this.health, coins: this.collected.size, totalCoins: this.world.coins.length, shrines: this.learned.size, combo: this.combo, bestCombo: this.bestCombo, time: this.elapsed, boost: this.boost }; }
  activePlatforms() { return this.world.platforms.filter(p => !p.gate || this.learned.has(p.gate)); }
  lessonLookup(id) { return this.lookupLesson(id); }
  nearby() {
    const p = this.player; const center = p.x + p.w / 2;
    const shrine = this.world.shrines.find(s => Math.abs(center - s.x) < 95 && Math.abs(p.y + p.h - 600) < 155);
    if (shrine) return { type: 'shrine', ...shrine, solved: this.learned.has(shrine.lessonId) };
    if (Math.abs(center - (this.world.portal.x + 46)) < 110) return { type: 'portal', ready: this.learned.size === this.world.shrines.length };
    return null;
  }
  interact() {
    if (this.phase !== 'playing') return;
    const target = this.nearby(); if (!target) return;
    if (target.type === 'shrine') this.onEvent('lesson', target);
    else if (target.ready) this.win();
    else { const remaining = this.world.shrines.length - this.learned.size; this.onEvent('toast', { message: `${remaining} lesson shrine${remaining === 1 ? '' : 's'} still glowing. Follow their light!` }); }
  }
  learn(id) {
    const shrine = this.world.shrines.find(s => s.lessonId === id); if (!shrine) return;
    const fresh = !this.learned.has(id); this.learned.add(id); this.boost = 8;
    if (fresh) { this.score += 250; this.checkpoint = { x: shrine.x - 45, y: 544 }; }
    this.burst(shrine.x, shrine.y + 30, 65, [this.world.accent, '#ffe497', '#effffd']);
    this.float(shrine.x, shrine.y - 5, fresh ? '+250 · PATH OPEN' : 'MEMORY REFRESHED', '#b9ffdb', 1.8);
    this.flash = this.effects ? .1 : 0; this.shake = this.effects ? .15 : 0;
    this.onEvent('learned', { id, fresh, ...this.snapshot() });
  }
  win() { if (this.phase !== 'playing' || this.learned.size !== this.world.shrines.length) return; this.phase = 'win'; this.clearInput(); this.burst(this.player.x, this.player.y - 20, 140, ['#7af5cf','#ffe49b','#9ac4ff','#ffffff']); this.onEvent('win', this.snapshot()); }
  damage(reason = 'slime', fromX = this.player.x) {
    const p = this.player; if (p.invulnerable > 0 && reason !== 'fall') return;
    this.health--; this.combo = 0; this.comboTime = 0; this.boost = 0;
    p.invulnerable = 1.5; p.vx = p.x < fromX ? -290 : 290; p.vy = -380;
    this.shake = this.effects ? .22 : 0; this.burst(p.x + 17, p.y + 25, 14, ['#ffa8bc','#ffc875']);
    if (reason === 'fall' || this.health <= 0) { p.x = this.checkpoint.x; p.y = this.checkpoint.y; p.vx = 0; p.vy = 0; p.dashTimer = 0; p.jumps = 0; this.score = Math.max(0, this.score - 50); if (this.health <= 0) this.health = 3; this.camera.x = clamp(p.x - this.view.w * .3, 0, this.world.width - this.view.w); this.onEvent('toast', { message: 'A small reset. Your discoveries stay lit—try that jump again.' }); }
    this.onEvent('hurt', this.snapshot());
  }
  float(x, y, text, color = '#fff4b7', duration = 1.05) { this.floaters.push({ x, y, text, color, life: duration, max: duration }); }
  burst(x, y, count, colors = ['#7af5cf','#ffd578']) {
    count = this.effects ? count : Math.min(6, count);
    for (let i = 0; i < count; i++) { const angle = rand(0, Math.PI * 2); const speed = rand(45, 260); this.particles.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed - 40, life: rand(.3, .85), max: .85, size: rand(2, 6), color: colors[i % colors.length] }); }
    if (this.particles.length > 350) this.particles.splice(0, this.particles.length - 350);
  }
  update(dt) {
    this.time += dt; this.animationTime += dt; this.shake = Math.max(0, this.shake - dt); this.flash = Math.max(0, this.flash - dt);
    for (const particle of this.particles) { particle.life -= dt; particle.x += particle.vx * dt; particle.y += particle.vy * dt; particle.vy += 330 * dt; }
    this.particles = this.particles.filter(p => p.life > 0);
    for (const f of this.floaters) { f.life -= dt; f.y -= 35 * dt; } this.floaters = this.floaters.filter(f => f.life > 0);
    for (const ghost of this.ghosts) ghost.life -= dt; this.ghosts = this.ghosts.filter(g => g.life > 0);
    if (this.phase !== 'playing') return;
    this.elapsed += dt; this.comboTime = Math.max(0, this.comboTime - dt); this.boost = Math.max(0, this.boost - dt);
    if (!this.comboTime) this.combo = 0;
    if (this.hitStop > 0) { this.hitStop -= dt; return; }
    const p = this.player;
    const events = stepPlayer(p, this.input, this.activePlatforms(), dt); this.input.jumpPressed = this.input.dashPressed = false;
    p.x = clamp(p.x, 0, this.world.width - p.w);
    for (const event of events) {
      if (event.type === 'jump' || event.type === 'bounce') this.burst(p.x + p.w / 2, p.y + p.h, event.double || event.type === 'bounce' ? 20 : 10, ['#b8f9e4','#79dad4']);
      if (event.type === 'dash') this.burst(p.x + 17, p.y + 35, 18, ['#78eaf7','#caffff']);
      this.onEvent(event.type, event);
    }
    if (p.dashTimer > 0 && this.effects && Math.random() < .55) this.ghosts.push({ x:p.x, y:p.y, direction:p.direction, time:this.animationTime, life:.19 });
    if (p.y > 900) this.damage('fall');
    for (const coin of this.world.coins) {
      if (this.collected.has(coin.id) || !overlaps(p, { x: coin.x - 12, y: coin.y - 12, w: 24, h: 24 })) continue;
      this.collected.add(coin.id); this.combo = this.comboTime > 0 ? this.combo + 1 : 1; this.comboTime = 2.2; this.bestCombo = Math.max(this.bestCombo, this.combo);
      const points = (25 + Math.min(15, this.combo) * 2) * (this.boost > 0 ? 2 : 1); this.score += points;
      this.burst(coin.x, coin.y, 12, ['#ffe6a0','#ffc85f','#e9ffc7']); this.float(coin.x, coin.y - 8, coin.glyph, '#795b30');
      this.onEvent('coin', { glyph: coin.glyph, points, ...this.snapshot() });
    }
    for (const e of this.enemies) {
      if (!e.alive) continue; e.x += e.direction * 48 * dt;
      if (e.x >= e.max) { e.x = e.max; e.direction = -1; } if (e.x <= e.min) { e.x = e.min; e.direction = 1; }
      if (!overlaps(p,e)) continue;
      if (p.dashTimer > 0 || (p.vy > 60 && p.previousY + p.h <= e.y + 16)) { e.alive = false; p.vy = p.dashTimer > 0 ? p.vy : -465; p.jumps = 1; this.score += 100; this.burst(e.x + 19,e.y + 15,24,['#c6a5ff','#b2ffdb']); this.float(e.x,e.y - 12,'+100','#755e87'); this.hitStop = this.effects ? .04 : 0; this.onEvent('stomp', this.snapshot()); }
      else this.damage('slime', e.x + 19);
    }
    for (const h of this.world.hazards) if (overlaps(p,h)) this.damage('hazard',h.x + h.w / 2);
    if (this.learned.size === this.world.shrines.length && overlaps(p,this.world.portal)) this.win();
    const desired = clamp(p.x - this.view.w * (p.direction < 0 ? .53 : .34), 0, Math.max(0,this.world.width - this.view.w));
    this.camera.x += (desired - this.camera.x) * Math.min(1,dt * 7);
    this.camera.y += (clamp(p.y + 20 - this.view.h * .6,0,Math.max(0,780-this.view.h)) - this.camera.y) * Math.min(1,dt * 6);
    const animation = p.invulnerable > 1.2 ? 'hurt' : p.dashTimer > 0 ? 'dash' : !p.grounded ? p.vy < 0 ? 'jump' : 'fall' : Math.abs(p.vx) > 25 ? 'run' : 'idle';
    if (animation !== this.animation) { this.animation = animation; this.animationTime = 0; }
  }
  tick(timestamp) {
    const dt = this.lastFrame ? Math.min(.06, (timestamp - this.lastFrame) / 1000) : 1/60; this.lastFrame = timestamp;
    this.accumulator += dt; while (this.accumulator >= 1/120) { this.update(1/120); this.accumulator -= 1/120; }
    this.render();
  }
  resize() {
    const rect = this.canvas.getBoundingClientRect(); const dpr = Math.min(2,globalThis.devicePixelRatio || 1);
    const width = Math.max(1,Math.round(rect.width*dpr)); const height = Math.max(1,Math.round(rect.height*dpr));
    if (this.canvas.width !== width || this.canvas.height !== height) { this.canvas.width = width; this.canvas.height = height; }
    this.screenW = rect.width; this.screenH = rect.height; this.view.w = rect.width < 650 ? 720 : 1280; this.view.h = this.view.w * rect.height / Math.max(1,rect.width);
    this.ctx.setTransform(width / this.view.w,0,0,height / this.view.h,0,0);
    this.ctx.imageSmoothingEnabled = false;
  }
  render() {
    this.resize(); const ctx = this.ctx, W = this.view.w, H = this.view.h; ctx.clearRect(0,0,W,H);
    this.background(ctx,W,H);
    ctx.save();
    const jitter = this.effects && this.shake > 0 ? this.shake * 14 : 0;
    ctx.translate(-Math.round(this.camera.x) + rand(-jitter,jitter), -Math.round(this.camera.y) + rand(-jitter,jitter));
    this.drawWater(ctx,W,H);
    for (const platform of this.world.platforms) this.drawPlatform(ctx,platform);
    for (const coin of this.world.coins) if (!this.collected.has(coin.id) && this.visible(coin.x,24)) this.drawCoin(ctx,coin);
    for (const shrine of this.world.shrines) this.drawShrine(ctx,shrine);
    this.drawPortal(ctx);
    for (const hazard of this.world.hazards) this.drawHazard(ctx,hazard);
    for (const enemy of this.enemies) if (enemy.alive && this.visible(enemy.x,40)) this.drawEnemy(ctx,enemy);
    const p = this.player;
    ctx.fillStyle = '#4d624738'; ctx.beginPath(); ctx.ellipse(p.x+17, Math.min(603,p.y+p.h+2),24,5,0,0,Math.PI*2); ctx.fill();
    if (this.boost > 0) { ctx.save(); ctx.strokeStyle = '#a4ffdd'; ctx.globalAlpha = .13 + (this.effects ? this.pulse()*.16 : 0); ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(p.x+17,p.y+26,40,48,0,0,Math.PI*2); ctx.stroke(); ctx.restore(); }
    for (const ghost of this.ghosts) this.atlas.draw(ctx,{x:ghost.x,y:ghost.y-20,width:p.w,height:p.h+20,direction:ghost.direction,state:'dash',time:ghost.time,alpha:ghost.life*1.1});
    this.atlas.draw(ctx,{x:p.x,y:p.y-20,width:p.w,height:p.h+20,direction:p.direction,state:this.phase==='win'?'celebrate':this.phase==='title'?'idle':this.animation,time:this.animationTime,alpha:p.invulnerable>0?.62:1});
    if (p.dashTimer>0 && this.effects) { ctx.strokeStyle='#a6ffff';ctx.lineWidth=5;ctx.globalAlpha=.5;ctx.beginPath();ctx.moveTo(p.x+17-p.direction*45,p.y+27);ctx.lineTo(p.x+17-p.direction*18,p.y+27);ctx.stroke();ctx.globalAlpha=1; }
    for(const particle of this.particles){ctx.globalAlpha=Math.max(0,particle.life/particle.max);ctx.fillStyle=particle.color;ctx.fillRect(Math.round(particle.x),Math.round(particle.y),particle.size,particle.size);}ctx.globalAlpha=1;
    for(const f of this.floaters){ctx.globalAlpha=Math.min(1,f.life*3);ctx.font=f.text.length<3?`600 26px ${pixelFont}`:`700 13px ${UI_FONT}`;ctx.textAlign='center';ctx.fillStyle=f.color;ctx.fillText(f.text,f.x,f.y);}ctx.globalAlpha=1;
    ctx.restore();
    if(this.flash>0){ctx.globalAlpha=this.flash*.75;ctx.fillStyle='#d1ffe7';ctx.fillRect(0,0,W,H);ctx.globalAlpha=1;}
    if(this.phase==='playing')this.drawWaypoint(ctx,W,H);
  }
  visible(x,w=80){return x+w>this.camera.x-80&&x<this.camera.x+this.view.w+80;}
  background(ctx,W,H){drawCountryside(ctx,{worldId:this.world.id,W,H,camera:this.camera,time:this.time,motion:this.effects,pulse:this.pulse()});}
  drawWater(ctx){drawCountryWater(ctx,this);}
  drawPlatform(ctx,p){drawCountryPlatform(ctx,p,this);}
  drawCoin(ctx,coin){const y=coin.y+Math.sin(this.time*3+coin.x)*3;ctx.save();ctx.translate(coin.x,y);ctx.fillStyle='#f9d478';ctx.beginPath();ctx.moveTo(0,-12);ctx.lineTo(9,-6);ctx.lineTo(12,3);ctx.lineTo(0,13);ctx.lineTo(-12,3);ctx.lineTo(-9,-6);ctx.closePath();ctx.fill();ctx.fillStyle='#694f29';ctx.font=`600 13px ${pixelFont}`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(coin.glyph,0,1);ctx.restore();}
  drawShrine(ctx,s){drawCountryShrine(ctx,s,this);}
  drawPortal(ctx){drawCountryPortal(ctx,this);}
  drawHazard(ctx,h){if(!this.visible(h.x,h.w))return;ctx.fillStyle='#ff9bb0';ctx.beginPath();for(let x=h.x;x<h.x+h.w;x+=16){ctx.moveTo(x,h.y+h.h);ctx.lineTo(x+8,h.y);ctx.lineTo(x+16,h.y+h.h);}ctx.fill();ctx.fillStyle='#553b50';ctx.fillRect(h.x,h.y+h.h-4,h.w,4);}
  drawEnemy(ctx,e){ctx.save();ctx.translate(Math.round(e.x),Math.round(e.y+Math.sin(this.time*4+e.min)*1.5));ctx.fillStyle='#151e3550';ctx.fillRect(-2,27,42,4);ctx.fillStyle='#74639b';ctx.fillRect(3,7,32,22);ctx.fillRect(7,2,24,27);ctx.fillStyle='#a58bbd';ctx.fillRect(8,7,24,8);ctx.fillStyle='#f2e6f7';ctx.fillRect(e.direction>0?15:8,13,6,7);ctx.fillRect(e.direction>0?27:20,13,6,7);ctx.fillStyle='#243246';ctx.fillRect(e.direction>0?18:8,16,3,4);ctx.fillRect(e.direction>0?30:20,16,3,4);ctx.restore();}
  drawWaypoint(ctx,W,H){const next=this.world.shrines.find(s=>!this.learned.has(s.lessonId));if(!next)return;const sx=next.x-this.camera.x;if(sx>80&&sx<W-80)return;const right=sx>W/2;const x=right?W-24:24,y=H*.53;ctx.fillStyle=this.world.accent;ctx.globalAlpha=.65;ctx.beginPath();ctx.moveTo(x+(right?7:-7),y);ctx.lineTo(x+(right?-5:5),y-7);ctx.lineTo(x+(right?-5:5),y+7);ctx.closePath();ctx.fill();ctx.globalAlpha=1;}
}
