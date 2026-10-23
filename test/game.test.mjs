import test from 'node:test';
import assert from 'node:assert/strict';
import { createPlayer, stepPlayer, PHYSICS, overlaps } from '../src/physics.mjs';
import { freshProgress, normalizeProgress, recordAttempt, practiceStats, ProgressStore, STORAGE_KEY } from '../src/progress.mjs';
import { LESSONS, WORLD_LESSONS, findLesson } from '../src/content.mjs';
import { WORLDS } from '../src/worlds.mjs';
import { GameEngine } from '../src/engine.mjs';

const floor = { x:0, y:600, w:800, h:180, type:'ground' };
const emptyInput = () => ({ left:false,right:false,jumpPressed:false,dashPressed:false });

test('falling lands on the platform surface without sinking or tunneling',()=>{
  const p=createPlayer({x:30,y:200});for(let i=0;i<180;i++)stepPlayer(p,emptyInput(),[floor],1/120);
  assert.equal(p.y+p.h,600);assert.equal(p.grounded,true);assert.equal(p.vy,0);
});
test('a second jump works in the air, but a third press cannot reset the jump',()=>{
  const p=createPlayer({x:50,y:544});p.grounded=true;
  let events=stepPlayer(p,{...emptyInput(),jumpPressed:true},[floor],1/120);assert.equal(events[0].double,false);
  for(let i=0;i<10;i++)stepPlayer(p,emptyInput(),[floor],1/120);
  events=stepPlayer(p,{...emptyInput(),jumpPressed:true},[floor],1/120);assert.equal(events[0].double,true);assert.equal(p.jumps,2);
  events=stepPlayer(p,{...emptyInput(),jumpPressed:true},[floor],1/120);assert.equal(events.some(e=>e.type==='jump'),false);
});
test('coyote time allows a forgiving jump after leaving an edge',()=>{
  const p=createPlayer({x:400,y:546});p.coyote=.07;p.jumps=0;
  const events=stepPlayer(p,{...emptyInput(),jumpPressed:true},[],1/120);
  assert.equal(events[0].type,'jump');assert.ok(p.vy<0);
});
test('dash has a cooldown and does not retrigger on every press',()=>{
  const p=createPlayer({x:20,y:544});p.grounded=true;
  let events=stepPlayer(p,{...emptyInput(),dashPressed:true,right:true},[floor],1/120);
  assert.equal(events.some(e=>e.type==='dash'),true);assert.equal(p.vx,PHYSICS.dashSpeed);
  events=stepPlayer(p,{...emptyInput(),dashPressed:true},[floor],1/120);assert.equal(events.some(e=>e.type==='dash'),false);
});
test('one-way elevated platforms allow rising through and catch a falling player',()=>{
  const ledge={x:0,y:350,w:200,h:20,type:'stone'};const p=createPlayer({x:40,y:375});p.vy=-600;p.jumps=1;
  stepPlayer(p,emptyInput(),[ledge],1/120);assert.ok(p.vy<0);assert.ok(p.y<375);
  p.y=290;p.vy=500;for(let i=0;i<8;i++)stepPlayer(p,emptyInput(),[ledge],1/120);
  assert.equal(p.y+p.h,350);assert.equal(p.grounded,true);
});
test('a spring pad boosts both a landing and walking across its surface',()=>{
  const spring={x:50,y:585,w:64,h:15,type:'bounce'};const p=createPlayer({x:55,y:544});p.grounded=true;
  const events=stepPlayer(p,emptyInput(),[floor,spring],1/120);assert.equal(events.some(e=>e.type==='bounce'),true);assert.equal(p.vy,-920);assert.equal(p.grounded,false);
});
test('corrupt progress cannot invent preferences or duplicate discoveries',()=>{
  const p=normalizeProgress({version:1,discovered:['gi','gi',4],attempts:[null,{lessonId:'gi',correct:true},{lessonId:4,correct:'yes'}],preferences:{music:'true',sound:false},worlds:[],lastWorld:'missing'});
  assert.deepEqual(p.discovered,['gi']);assert.equal(p.attempts.length,1);assert.equal(p.preferences.music,true);assert.equal(p.preferences.sound,false);assert.equal(p.lastWorld,'wordwood');
});
test('practice records hints and actual attempts, not study mastery',()=>{
  let p=freshProgress();p=recordAttempt(p,{lessonId:'naosu',questionId:'naosu-1',selected:1,correct:false,hinted:true},'2026-10-13T00:00:00Z');
  assert.equal(p.discovered.length,0);p=recordAttempt(p,{lessonId:'naosu',questionId:'naosu-2',selected:0,correct:true,hinted:true});p=recordAttempt(p,{lessonId:'naosu',questionId:'naosu-3',selected:2,correct:true,hinted:true});
  assert.deepEqual(p.discovered,['naosu']);assert.deepEqual(practiceStats(p),{tries:3,correct:2,discoveries:1,supported:2});assert.equal('mastered' in p,false);assert.equal(p.attempts[1].support,'after-review-or-hint');
});
test('unavailable browser storage keeps the game playable in memory',()=>{
  const store=new ProgressStore({getItem(){throw new Error('blocked');},setItem(){throw new Error('blocked');}});
  store.attempt({lessonId:'gi',questionId:'gi-1',selected:0,correct:true,hinted:true});assert.equal(store.available,false);assert.deepEqual(store.value.discovered,['gi']);
  const calls=[];const working=new ProgressStore({getItem:()=>null,setItem:(key,value)=>calls.push([key,value])});working.setPreference('music',false);assert.equal(calls[0][0],STORAGE_KEY);
});
test('every campaign shrine maps to valid, varied learning content',()=>{
  const ids=new Set();for(const l of LESSONS){assert.ok(!ids.has(l.id));ids.add(l.id);assert.equal(l.questions.length,3);assert.ok(l.examples.length>=1);for(const q of l.questions){assert.equal(q.choices.length,3);assert.ok(q.answer>=0&&q.answer<3);assert.ok(q.why.length>20);assert.equal(new Set(q.choices.map(c=>c.text)).size,3);}}
  assert.equal(LESSONS.length,13);for(const [world,lessons]of Object.entries(WORLD_LESSONS)){assert.equal(lessons.length,3);assert.ok(WORLDS.some(w=>w.id===world));for(const id of lessons)assert.ok(findLesson(id));}
});
test('QA practice uses a separate storage namespace from player practice',()=>{
  const calls=[];const storage={getItem:key=>{calls.push(['read',key]);return null;},setItem:(key,value)=>calls.push(['write',key,value])};
  const qa=new ProgressStore(storage,'quest-kotoba-trail.qa.v1');qa.attempt({lessonId:'gi',questionId:'gi-1',selected:0,correct:true,hinted:true});
  assert.equal(calls[0][1],'quest-kotoba-trail.qa.v1');assert.equal(calls[1][1],'quest-kotoba-trail.qa.v1');assert.ok(calls.every(c=>c[1]!==STORAGE_KEY));
});
test('all routes have safe shrine ground and bounded gap geometry',()=>{
  for(const world of WORLDS){const ids=new Set();for(const item of [...world.platforms,...world.coins,...world.enemies,...world.hazards,...world.shrines]){assert.ok(!ids.has(item.id),item.id);ids.add(item.id);assert.ok(item.x>=0&&item.x<=world.width);}
    assert.deepEqual(world.shrines.map(s=>s.lessonId),WORLD_LESSONS[world.id]);
    for(const s of world.shrines){assert.ok(world.platforms.some(p=>p.type==='ground'&&s.x>=p.x&&s.x<=p.x+p.w));assert.ok(!world.hazards.some(h=>s.x>=h.x-50&&s.x<=h.x+h.w+50));}
    for(const bridge of world.platforms.filter(p=>p.gate)){assert.ok(bridge.w<=170);assert.ok(findLesson(bridge.gate));}
  }
});
test('portal stays locked until all shrines are solved and emits victory once',()=>{
  const events=[];const engine=new GameEngine({getContext:()=>({})},{},{onEvent:(type)=>events.push(type),effects:false});engine.start('wordwood');engine.player.x=4010;engine.player.y=544;engine.update(1/120);assert.equal(engine.phase,'playing');
  for(const id of WORLD_LESSONS.wordwood)engine.learn(id);engine.player.x=4010;engine.player.y=544;engine.update(1/120);assert.equal(engine.phase,'win');engine.update(1/120);assert.equal(events.filter(e=>e==='win').length,1);
});
test('falling respawns safely while retaining solved learning bridges',()=>{
  const engine=new GameEngine({getContext:()=>({})},{},{effects:false});engine.start('workshop');engine.learn('naosu');const checkpoint={...engine.checkpoint};engine.player.y=940;engine.update(1/120);
  assert.ok(engine.learned.has('naosu'));assert.equal(engine.player.x,checkpoint.x);assert.equal(engine.player.y,checkpoint.y);assert.ok(engine.activePlatforms().some(p=>p.gate==='naosu'));assert.ok(!overlaps(engine.player,engine.world.hazards[0]));
});
