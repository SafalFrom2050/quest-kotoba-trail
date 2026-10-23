import { GameEngine } from './engine.mjs';
import { SpriteAtlas } from './sprites.mjs';
import { SoundEngine } from './audio.mjs';
import { ProgressStore, practiceStats } from './progress.mjs';
import { LESSONS, WORLD_LESSONS, findLesson, learningText } from './content.mjs';
import { WORLDS, getWorld } from './worlds.mjs';
import { LessonLibraryUI } from './library-ui.mjs';
import { makePracticeWorld, packLessons } from './packs.mjs';

const $ = id => document.getElementById(id);
const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const campaignIds = Object.values(WORLD_LESSONS).flat();

export class QuestApp {
  constructor() {
    let storage; try { storage = globalThis.localStorage; } catch { storage = null; }
    this.qa = new URLSearchParams(location.search).get('qa') === '1';
    this.store = new ProgressStore(storage, this.qa ? 'quest-kotoba-trail.qa.v1' : undefined); this.audio = new SoundEngine(this.store.value.preferences);
    this.image = new Image(); this.image.src = new URL('../assets/quest-spritesheet.png',import.meta.url).href;
    this.atlas = new SpriteAtlas(this.image); this.phase = 'title'; this.guideFilter = 'all'; this.selectedWorld = this.store.value.lastWorld;
    this.motionQuery = matchMedia('(prefers-reduced-motion: reduce)');
    this.engine = new GameEngine($('game-canvas'),this.atlas,{ onEvent:(type,data)=>this.engineEvent(type,data),pulse:()=>this.audio.pulse(),effects:this.store.value.preferences.effects && !this.motionQuery.matches,lookupLesson:id=>this.findLesson(id) });
    this.lastHUD = 0; this.voice = null; this.lesson = null; this.lessonSource = 'shrine'; this.lessonReturn = 'playing'; this.question = null; this.quizState = 'teach';
    this.customRun = null; this.lessonStore = this.store;
    this.libraryUI = new LessonLibraryUI({
      qa:this.qa,onClose:()=>this.closeLibrary(),onPlay:(record,theme)=>this.startPack(record,theme),
      onStudy:(lesson,store)=>{this.libraryUI.hide();this.openLesson(lesson.id,{source:'library',store});},
      onError:message=>this.toast(message),
    });
    this.bindUI(); this.renderTrails(); this.renderPreferences(); this.updateHUD(); this.renderDiscoveries(); this.findVoice();
    if (globalThis.speechSynthesis) speechSynthesis.addEventListener('voiceschanged',()=>this.findVoice());
    this.motionQuery.addEventListener?.('change',()=>this.renderPreferences());
    this.engine.load(this.selectedWorld); this.setPhase('title');
    this.frame = this.frame.bind(this); requestAnimationFrame(this.frame);
  }
  bindUI() {
    for(const id of ['library-button','guide-library-button'])$(id).addEventListener('click',()=>this.openLibrary());
    $('start-button').addEventListener('click',()=>this.start(this.selectedWorld));
    $('home-button').addEventListener('click',e=>{e.preventDefault();this.home();});
    for(const id of ['guide-button','title-guide-button','notes-guide-button','win-guide-button'])$(id).addEventListener('click',()=>this.openGuide());
    document.querySelectorAll('[data-language-toggle]').forEach(button=>button.addEventListener('click',()=>this.toggleLanguage()));
    $('music-button').addEventListener('click',()=>this.togglePreference('music'));
    $('sound-button').addEventListener('click',()=>this.togglePreference('sound'));
    $('fx-button').addEventListener('click',()=>this.togglePreference('effects'));
    $('pause-button').addEventListener('click',()=>this.phase==='pause'?this.resume():this.pause());
    $('resume-button').addEventListener('click',()=>this.resume());
    $('restart-button').addEventListener('click',()=>this.restartCurrent());
    $('pause-home-button').addEventListener('click',()=>this.home());
    $('win-home-button').addEventListener('click',()=>this.home());
    $('next-button').addEventListener('click',()=>this.nextAdventure());
    $('interact-button').addEventListener('click',()=>this.engine.interact());
    $('close-lesson-button').addEventListener('click',()=>this.closeLesson());
    $('lesson-dialog').addEventListener('cancel',e=>{e.preventDefault();this.closeLesson();});
    $('ready-button').addEventListener('click',()=>this.showQuestion());
    $('continue-button').addEventListener('click',()=>this.continueLesson());
    $('hint-button').addEventListener('click',()=>{$('quiz-hint').textContent=this.learningText(this.lesson.hook);$('quiz-hint').hidden=false;this.hinted=true;this.audio.cue('click');});
    $('listen-button').addEventListener('click',()=>this.listen());
    $('close-guide-button').addEventListener('click',()=>this.closeGuide());
    $('guide-dialog').addEventListener('cancel',e=>{e.preventDefault();this.closeGuide();});
    $('guide-filters').addEventListener('click',e=>{const button=e.target.closest('[data-filter]');if(!button)return;this.guideFilter=button.dataset.filter;this.renderGuide();this.audio.cue('click');});
    $('guide-grid').addEventListener('click',e=>{const button=e.target.closest('[data-lesson]');if(button)this.openLesson(button.dataset.lesson,{source:'guide'});});
    $('export-button').addEventListener('click',()=>this.exportPractice());
    $('trail-picker').addEventListener('click',e=>{const button=e.target.closest('[data-world]');if(!button)return;this.selectedWorld=button.dataset.world;this.engine.load(this.selectedWorld);this.engine.setPhase('title');this.renderTrails();this.audio.setMode('title',this.selectedWorld);this.audio.cue('click');});
    document.addEventListener('keydown',e=>this.keyDown(e));
    document.addEventListener('keyup',e=>this.keyUp(e));
    window.addEventListener('blur',()=>this.clearControls());
    document.addEventListener('visibilitychange',()=>{this.audio.setHidden(document.hidden);if(document.hidden&&this.phase==='playing')this.pause();this.clearControls();});
    document.querySelectorAll('[data-control]').forEach(button=>{
      const control=button.dataset.control;
      button.addEventListener('pointerdown',e=>{e.preventDefault();if(this.phase!=='playing')return;button.setPointerCapture(e.pointerId);button.classList.add('pressed');if(control==='left'||control==='right')this.engine.input[control]=true;else this.engine.input[control==='jump'?'jumpPressed':'dashPressed']=true;});
      const release=()=>{button.classList.remove('pressed');if(control==='left'||control==='right')this.engine.input[control]=false;};
      button.addEventListener('pointerup',release);button.addEventListener('pointercancel',release);button.addEventListener('lostpointercapture',release);
    });
  }
  keyDown(e) {
    if(this.phase==='library')return;
    if(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement || e.target.isContentEditable)return;
    if(e.target instanceof HTMLButtonElement&&['Enter',' '].includes(e.key))return;
    const key=e.key.toLowerCase();
    if(key==='escape'){e.preventDefault();if(this.phase==='lesson')this.closeLesson();else if(this.phase==='guide')this.closeGuide();else if(this.phase==='playing')this.pause();else if(this.phase==='pause')this.resume();return;}
    if(this.phase==='lesson'){
      if(['1','2','3'].includes(key)&&this.quizState==='question'){e.preventDefault();this.answer(Number(key)-1);}
      if(key==='enter'&&!e.repeat){e.preventDefault();if(this.quizState==='teach')this.showQuestion();else if(['correct','wrong'].includes(this.quizState))this.continueLesson();}
      return;
    }
    if(this.phase==='guide')return;
    if(key==='m'&&!e.repeat){e.preventDefault();this.togglePreference('music');return;}
    if(this.phase==='title'&&key==='enter'&&!e.repeat){e.preventDefault();this.start(this.selectedWorld);return;}
    if(this.phase!=='playing')return;
    if(['arrowleft','arrowright','arrowup','arrowdown',' ','a','d','w','e','k','shift'].includes(key))e.preventDefault();
    if(key==='a'||key==='arrowleft')this.engine.input.left=true;
    if(key==='d'||key==='arrowright')this.engine.input.right=true;
    if(!e.repeat&&[' ','w'].includes(key))this.engine.input.jumpPressed=true;
    if(!e.repeat&&key==='arrowup'){if(this.engine.nearby())this.engine.interact();else this.engine.input.jumpPressed=true;}
    if(!e.repeat&&['k','shift'].includes(key))this.engine.input.dashPressed=true;
    if(!e.repeat&&key==='e')this.engine.interact();
  }
  keyUp(e) { const key=e.key.toLowerCase();if(key==='a'||key==='arrowleft')this.engine.input.left=false;if(key==='d'||key==='arrowright')this.engine.input.right=false; }
  clearControls(){this.engine.clearInput();document.querySelectorAll('[data-control]').forEach(b=>b.classList.remove('pressed'));}
  setPhase(phase) {
    this.phase=phase;this.engine.setPhase(phase);this.clearControls();document.body.classList.toggle('is-title',phase==='title');
    $('title-screen').hidden=phase!=='title';$('pause-screen').hidden=phase!=='pause';$('win-screen').hidden=phase!=='win';$('hud').hidden=phase==='title';
    $('pause-button').disabled=!['playing','pause'].includes(phase);$('interact-button').hidden=true;
    this.audio.setMode(phase,this.engine.world.id);this.updateHUD();
  }
  async start(id) {
    this.customRun=null;this.lessonStore=this.store;
    this.selectedWorld=id;this.engine.start(id);this.store.value.lastWorld=id;this.store.save();this.setPhase('playing');
    $('game-canvas').focus({preventScroll:true});this.showWorldBanner();this.setFeature(findLesson(WORLD_LESSONS[id][0]));
    await this.audio.unlock();this.audio.setMode('playing',id);this.audio.cue('shrine');
    this.announce(`${this.engine.world.name}. Move, double jump, and visit three lesson shrines.`);
    if(!this.store.available)this.toast('Practice will stay for this session; browser storage is unavailable.');
  }
  findLesson(id){return findLesson(id)||this.libraryUI?.findLesson(id)|| (this.customRun ? packLessons(this.customRun.record).find(lesson=>lesson.id===id) : null);}
  async startPack(record,theme){
    this.libraryUI.hide();if($('guide-dialog').open)$('guide-dialog').close();
    this.customRun={record,theme,store:this.libraryUI.library.progress(record)};this.lessonStore=this.customRun.store;
    this.engine.start(makePracticeWorld(record,theme));this.setPhase('playing');this.renderDiscoveries();
    $('game-canvas').focus({preventScroll:true});this.showWorldBanner();this.setFeature(packLessons(record)[0]);
    await this.audio.unlock();this.audio.setMode('playing',theme);this.audio.cue('shrine');
    this.announce(`${record.packet.title}. Custom practice. Visit three lesson shrines.`);
  }
  async restartCurrent(){
    if(!this.customRun){void this.start(this.engine.world.id);return;}
    await this.libraryUI.library.flush();
    const record=this.libraryUI.library.get(this.customRun.record.id);
    if(record)void this.startPack(record,this.customRun.theme);
  }
  nextAdventure(){if(this.customRun){this.openLibrary();return;}const i=WORLDS.findIndex(w=>w.id===this.engine.world.id);void this.start(WORLDS[(i+1)%WORLDS.length].id);}
  openLibrary(){
    if(this.phase==='lesson'||this.phase==='library')return;
    this.phaseBeforeLibrary=this.phase==='guide'?(this.phaseBeforeGuide||'title'):this.phase;
    if($('guide-dialog').open)$('guide-dialog').close();
    this.setPhase('library');this.libraryUI.open();this.audio.cue('click');
  }
  closeLibrary(){this.libraryUI.hide();this.setPhase(this.phaseBeforeLibrary||'title');(this.phase==='playing'?$('game-canvas'):$('library-button')).focus({preventScroll:true});}
  home(){if($('lesson-dialog').open)$('lesson-dialog').close();if($('guide-dialog').open)$('guide-dialog').close();this.libraryUI.hide();this.lesson=null;this.customRun=null;this.lessonStore=this.store;this.selectedWorld=this.store.value.lastWorld;this.engine.load(this.selectedWorld);this.setPhase('title');this.renderTrails();this.renderDiscoveries();this.setFeature(findLesson(WORLD_LESSONS[this.selectedWorld][0]));$('start-button').focus({preventScroll:true});}
  pause(){if(this.phase!=='playing')return;this.setPhase('pause');$('resume-button').focus({preventScroll:true});this.audio.cue('click');}
  resume(){if(this.phase!=='pause')return;this.setPhase('playing');$('game-canvas').focus({preventScroll:true});void this.audio.unlock();}
  showWorldBanner(){const w=this.engine.world;$('banner-kicker').textContent=w.kicker;$('banner-title').textContent=w.name;$('banner-subtitle').textContent=w.subtitle;const el=$('world-banner');el.hidden=true;void el.offsetWidth;el.hidden=false;clearTimeout(this.bannerTimer);this.bannerTimer=setTimeout(()=>el.hidden=true,3300);}
  renderTrails(){
    $('trail-picker').innerHTML=WORLDS.map((world,i)=>`<button class="trail-option ${world.id===this.selectedWorld?'selected':''}" data-world="${world.id}" aria-pressed="${world.id===this.selectedWorld}"><span class="trail-number">0${i+1}</span><span><strong>${escapeHTML(world.name)}</strong><small>${escapeHTML(world.kicker.toLowerCase())}</small></span><span class="trail-check">${this.store.value.worlds[world.id]?.completed?'✦':'↗'}</span></button>`).join('');
  }
  learningText(text){return learningText(text,this.store.value.preferences.language);}
  toggleLanguage(){
    this.store.setPreference('language',this.store.value.preferences.language==='en'?'ne':'en');
    this.renderLanguage();this.audio.cue('click');
    if(this.phase==='playing')$('game-canvas').focus({preventScroll:true});
    this.announce(`Learning hints switched to ${this.store.value.preferences.language==='en'?'English':'Nepalish'}.`);
  }
  renderLanguage(){
    const ne=this.store.value.preferences.language==='ne',name=ne?'Nepalish':'English',next=ne?'English':'Nepalish';
    document.querySelectorAll('[data-language-toggle]').forEach(button=>{
      button.textContent=button.dataset.compact?(ne?'NE':'EN'):`Hints: ${name} ⇄`;
      button.setAttribute('aria-label',`Learning hints: ${name}. Switch to ${next}.`);button.title=`Learning hints: ${name}. Switch to ${next}.`;
    });
    for(const id of ['notes-description','lesson-hook','quiz-hint','question-support'])$(id).lang=ne?'ne-Latn':'en';
    if(this.featureLesson){$('notes-description').textContent=this.learningText(this.featureLesson.hook);$('notes-description').lang=ne&&this.featureLesson.hook.ne?'ne-Latn':'en';}
    $('lesson-language-note').hidden=!this.lesson||!ne||Boolean(this.lesson.hook.ne);
    if(this.lesson){
      $('lesson-hook').textContent=this.learningText(this.lesson.hook);$('quiz-hint').textContent=this.learningText(this.lesson.hook);
      $('lesson-hook').lang=$('quiz-hint').lang=ne&&this.lesson.hook.ne?'ne-Latn':'en';
      const support=this.learningText(this.question?.support);$('question-support').textContent=support;$('question-support').hidden=!support;
      $('question-support').lang=ne&&this.question?.support?.ne?'ne-Latn':'en';
    }
  }
  togglePreference(key){const value=!this.store.value.preferences[key];this.store.setPreference(key,value);this.renderPreferences();void this.audio.unlock();if(key!=='sound'||value)this.audio.cue('click');}
  renderPreferences(){
    this.renderLanguage();
    const p=this.store.value.preferences;this.audio.configure(p);this.engine.effects=p.effects&&!this.motionQuery.matches;
    document.body.classList.toggle('reduced-motion',!this.engine.effects);
    for(const [key,label] of [['music','music'],['sound','sound effects'],['effects','visual effects']]){const el=$(key==='effects'?'fx-button':`${key}-button`);const enabled=key==='effects'?this.engine.effects:p[key];el.setAttribute('aria-pressed',String(enabled));el.setAttribute('aria-label',`${enabled?'Turn off':'Turn on'} ${label}`);}
    $('fx-button').disabled=this.motionQuery.matches;$('fx-button').title=this.motionQuery.matches?'Reduced motion follows your system setting':'Visual effects';
  }
  engineEvent(type,data){
    if(!this.engine)return;
    if(type==='lesson'){this.openLesson(data.lessonId,{source:'shrine'});return;}
    if(type==='toast'){this.toast(data.message);return;}
    if(type==='win'){this.showWin(data);this.audio.cue('win');return;}
    if(type==='jump')this.audio.cue(data.double?'double':'jump');
    else if(type==='bounce'){this.audio.cue('double');this.toast('Spring boost! Tap jump again to reach the high sparks.');}
    else if(['dash','coin','hurt','stomp'].includes(type))this.audio.cue(type);
    else if(type==='learned'){this.renderDiscoveries();this.toast(data.fresh?'Path open! Memory boost doubles your word sparks.':'Memory refreshed. Enjoy a little boost.');}
    this.updateHUD();
  }
  updateHUD(){
    const s=this.engine.snapshot();const w=this.engine.world;
    $('hud-kicker').textContent=this.customRun?'CUSTOM PACK':`TRAIL 0${WORLDS.findIndex(world=>world.id===w.id)+1} · ${w.kicker}`;$('hud-world').textContent=w.name;
    $('hearts').textContent=Array.from({length:3},(_,i)=>i<s.health?'♥':'♡').join(' ');$('hearts').setAttribute('aria-label',`${s.health} hearts`);
    $('shrines-count').textContent=`${s.shrines} / ${w.shrines.length} shrines`;$('score').textContent=String(s.score).padStart(6,'0');$('coins-count').textContent=s.coins;$('combo').textContent=s.combo>=3?`×${s.combo}`:'';$('boost-indicator').hidden=s.boost<=0||this.phase!=='playing';
    const target=this.phase==='playing'?this.engine.nearby():null;
    $('interact-button').hidden=!target;
    if(target)$('interact-button').querySelector('span').textContent=target.type==='portal'?(target.ready?'Enter the next adventure':'Find all the shrines'):`${target.solved?'Review':'Explore'} ${this.findLesson(target.lessonId)?.title||'lesson'}`;
    if(this.phase==='playing')$('status-line').textContent=target?.type==='shrine'?`A little discovery is waiting. Press E or tap the shrine button.`:s.shrines===w.shrines.length?'The exit portal is glowing. Follow the golden light.':'A / D move · Space double jump · Shift dash · E learn · Esc pause';
    else if(this.phase==='title')$('status-line').textContent='Pick a trail. Follow the sparks.';
    else if(['lesson','guide','library','pause'].includes(this.phase))$('status-line').textContent='Trail paused. A little understanding goes a long way.';
  }
  setFeature(lesson){if(!lesson)return;this.featureLesson=lesson;$('feature-glyph').textContent=lesson.title.length>6?'文':lesson.title;$('feature-kind').textContent=lesson.kind==='grammar'?'GRAMMAR · CONNECTIONS':'KANJI · A SMALL IDEA';$('feature-reading').textContent=lesson.romaji;$('feature-meaning').textContent=lesson.meaning;$('notes-title').textContent=lesson.kind==='grammar'?'Make ideas connect.':'A word opens a path.';$('notes-description').textContent=this.learningText(lesson.hook);$('notes-tip').textContent='A good guess is a start. Read the explanation, try a sentence, then let Quest carry it into the world.';}
  renderDiscoveries(){const ids=this.customRun?packLessons(this.customRun.record).map(lesson=>lesson.id):campaignIds;const progress=this.customRun?this.customRun.store.value:this.store.value;const count=progress.discovered.filter(id=>ids.includes(id)).length;$('discovery-count').textContent=`${count} / ${ids.length}`;$('discovery-meter').style.width=`${count/ids.length*100}%`;}
  openLesson(id,{source='shrine',store=null}={}) {
    const lesson=this.findLesson(id);if(!lesson)return;
    this.lessonStore=store||(source==='shrine'&&this.customRun?this.customRun.store:this.store);
    this.lessonReturn=source==='library'?'library':source==='guide'?'guide':this.phase;this.lessonSource=source;this.lesson=lesson;this.question=null;this.hinted=true;this.quizState='teach';
    if($('guide-dialog').open)$('guide-dialog').close();this.setPhase('lesson');this.setFeature(lesson);
    $('lesson-kind').textContent=lesson.kind==='grammar'?'GRAMMAR SHRINE':'KANJI SHRINE';$('lesson-title').textContent=lesson.title;$('lesson-kana').textContent=lesson.kana;$('lesson-romaji').textContent=lesson.romaji;$('lesson-meaning').textContent=lesson.meaning;
    $('lesson-hook').textContent=this.learningText(lesson.hook);$('lesson-explanation').textContent=lesson.explanation;const example=lesson.examples[0];$('example-japanese').textContent=example.japanese;$('example-romaji').textContent=example.romaji;$('example-english').textContent=example.english;
    $('lesson-teach').hidden=false;$('lesson-quiz').hidden=true;$('listen-button').hidden=!this.voice;
    this.renderLanguage();$('lesson-dialog').showModal();$('lesson-dialog').scrollTop=0;$('close-lesson-button').focus({preventScroll:true});
    this.audio.cue('shrine');this.announce(`${lesson.title}, ${lesson.romaji}. ${lesson.meaning}.`);
  }
  showQuestion(){
    const attempts=this.lessonStore.value.attempts.filter(a=>a.lessonId===this.lesson.id).length;this.question=this.lesson.questions[attempts%this.lesson.questions.length];this.quizState='question';
    $('lesson-teach').hidden=true;$('lesson-quiz').hidden=false;$('question-prompt').textContent=this.question.prompt;
    $('question-context').textContent=this.question.context||'';$('question-context').hidden=!this.question.context;$('question-romaji').textContent=this.question.romaji||'';$('question-romaji').hidden=!this.question.romaji;const support=this.learningText(this.question.support);$('question-support').textContent=support;$('question-support').hidden=!support;
    this.renderLanguage();$('answer-feedback').hidden=true;$('continue-button').hidden=true;$('quiz-hint').hidden=true;$('hint-button').hidden=false;
    $('answer-choices').innerHTML=this.question.choices.map((choice,i)=>`<button class="answer-choice" data-answer="${i}"><span class="choice-key">${i+1}</span><span>${escapeHTML(choice.text)}${choice.note?`<small>${escapeHTML(choice.note)}</small>`:''}</span></button>`).join('');
    $('answer-choices').querySelectorAll('button').forEach((button,i)=>button.addEventListener('click',()=>this.answer(i)));
    $('lesson-dialog').scrollTop=0;$('answer-choices').querySelector('button').focus({preventScroll:true});this.audio.cue('click');
  }
  answer(index){
    if(this.quizState!=='question'||index<0||index>=this.question.choices.length)return;
    const correct=index===this.question.answer;this.quizState=correct?'correct':'wrong';
    this.lessonStore.attempt({lessonId:this.lesson.id,questionId:this.question.id,selected:index,correct,hinted:this.hinted});
    const buttons=$('answer-choices').querySelectorAll('button');buttons.forEach((button,i)=>{button.disabled=true;if(i===this.question.answer)button.classList.add('correct');if(i===index&&!correct)button.classList.add('wrong');});
    const feedback=$('answer-feedback');feedback.hidden=false;feedback.className=`answer-feedback pop${correct?'':' is-wrong'}`;feedback.innerHTML=`<strong>${correct?'✦ That connection is yours.':'↳ Almost. Here is the useful distinction.'}</strong>${escapeHTML(this.question.why)}`;
    $('hint-button').hidden=true;$('continue-button').hidden=false;$('continue-button').innerHTML=correct?`Got it. ${this.lessonSource==='shrine'?"Let's jump!":this.lessonSource==='library'?'Back to My Lessons':"Back to the guide"} <span>→</span>`:'Try a fresh question <span>↻</span>';
    this.audio.cue(correct?'correct':'wrong');this.renderDiscoveries();
    if(correct&&this.lessonSource==='shrine')this.engine.learn(this.lesson.id);
    if(correct)this.engine.burst(this.engine.player.x+17,this.engine.player.y,35,['#7af5cf','#ffe49b']);
    this.announce(correct?`Correct. ${this.question.why}`:`Let's review. ${this.question.why}`);
    $('continue-button').focus({preventScroll:true});feedback.scrollIntoView({block:'nearest',behavior:this.engine.effects?'smooth':'instant'});
  }
  continueLesson(){if(this.quizState==='wrong'){this.hinted=true;this.showQuestion();return;}if(this.quizState==='correct')this.closeLesson();}
  closeLesson(){if(!$('lesson-dialog').open)return;$('lesson-dialog').close();if(globalThis.speechSynthesis)speechSynthesis.cancel();const destination=this.lessonReturn;this.lesson=null;if(destination==='library'){this.setPhase('library');this.libraryUI.open();}else if(destination==='guide'){this.setPhase('guide');this.renderGuide();$('guide-dialog').showModal();$('close-guide-button').focus({preventScroll:true});}else{this.setPhase(destination==='win'?'win':destination==='title'?'title':'playing');$('game-canvas').focus({preventScroll:true});}}
  openGuide(){if(this.phase==='lesson')return;this.phaseBeforeGuide=this.phase;this.setPhase('guide');this.renderGuide();$('guide-dialog').showModal();$('close-guide-button').focus({preventScroll:true});this.audio.cue('click');}
  closeGuide(){if(!$('guide-dialog').open)return;$('guide-dialog').close();this.setPhase(this.phaseBeforeGuide||'title');if(this.phase==='playing')$('game-canvas').focus({preventScroll:true});else if(this.phase==='title')$('start-button').focus({preventScroll:true});}
  renderGuide(){
    const stats=practiceStats(this.store.value);$('guide-summary').innerHTML=`<div class="guide-stat"><strong>${stats.discoveries}</strong><span>practice discoveries</span></div><div class="guide-stat"><strong>${stats.correct} / ${stats.tries}</strong><span>practice hits</span></div><div class="guide-stat"><strong>${Object.values(this.store.value.worlds).filter(w=>w.completed).length} / 3</strong><span>trails cleared</span></div>`;
    $('guide-filters').querySelectorAll('button').forEach(b=>b.classList.toggle('active',b.dataset.filter===this.guideFilter));
    const lessons=LESSONS.filter(l=>this.guideFilter==='all'||this.guideFilter===l.kind||(this.guideFilter==='discovered'&&this.store.value.discovered.includes(l.id)));
    $('guide-grid').innerHTML=lessons.length?lessons.map(lesson=>{const discovered=this.store.value.discovered.includes(lesson.id);const tries=this.store.value.attempts.filter(a=>a.lessonId===lesson.id).length;return `<button class="guide-entry" data-lesson="${lesson.id}"><div class="guide-word" lang="ja">${escapeHTML(lesson.title)}</div><div class="guide-romaji">${escapeHTML(lesson.romaji)}</div><div class="guide-meaning">${escapeHTML(lesson.meaning)}</div><span class="entry-badge ${discovered?'':'locked'}">${discovered?`✦ PRACTICED · ${tries} ${tries===1?'TRY':'TRIES'}`:'↗ READY TO EXPLORE'}</span></button>`;}).join(''):'<p class="guide-intro">A glowing shrine is a good place to begin. Your discoveries will appear here.</p>';
  }
  showWin(summary){
    (this.customRun?.store||this.store).complete(this.engine.world.id,summary);this.setPhase('win');const w=this.engine.world,index=WORLDS.findIndex(world=>world.id===w.id);
    $('win-kicker').textContent=`${w.name.toUpperCase()} · CLEARED`;$('win-heading').textContent=index===2?'You lit up the grammar sky.':'Words became a path.';
    $('win-message').textContent=`Three useful ideas, a little courage, and ${summary.coins} word sparks. Carry those connections into your next adventure.`;
    $('win-stats').innerHTML=`<div><strong>${summary.score}</strong><span>TRAIL SCORE</span></div><div><strong>3 / 3</strong><span>SHRINES</span></div><div><strong>${summary.bestCombo}×</strong><span>BEST COMBO</span></div>`;
    if(this.customRun){$('win-heading').textContent='Your lessons became a path.';$('win-message').textContent=`Three personal discoveries and ${summary.coins} word sparks. Your pack practice is saved separately from the campaign.`;}
    $('next-button').textContent=this.customRun?'My lesson packs →':index===WORLDS.length-1?'Adventure again ↻':'Next adventure →';$('next-button').focus({preventScroll:true});this.renderTrails();this.announce(`${w.name} cleared. All lesson shrines discovered.`);
  }
  findVoice(){this.voice=globalThis.speechSynthesis?.getVoices().find(v=>v.lang.toLowerCase().startsWith('ja'))||null;if(this.lesson)$('listen-button').hidden=!this.voice;}
  listen(){if(!this.voice||!this.lesson)return;speechSynthesis.cancel();const utterance=new SpeechSynthesisUtterance(this.lesson.examples[0].japanese);utterance.voice=this.voice;utterance.lang='ja-JP';utterance.rate=.82;utterance.volume=.8;speechSynthesis.speak(utterance);}
  exportPractice(){const payload={game:'Quest: Kotoba Trail',sessionKind:this.qa?'automated-qa':'player-practice',exportedAt:new Date().toISOString(),evidenceNote:'Game practice follows teaching. Discoveries are practice milestones, not proof of unaided mastery. This file records game practice only and does not update an external study log.',...this.store.value};const url=URL.createObjectURL(new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}));const anchor=document.createElement('a');anchor.href=url;anchor.download=`quest-practice-${new Date().toISOString().slice(0,10)}.json`;anchor.click();setTimeout(()=>URL.revokeObjectURL(url),1000);this.audio.cue('click');}
  toast(message){$('toast').textContent=message;$('toast').hidden=false;clearTimeout(this.toastTimer);this.toastTimer=setTimeout(()=>$('toast').hidden=true,3400);}
  announce(message){$('announcer').textContent=message;}
  frame(time){this.engine.tick(time);if(time-this.lastHUD>90){this.updateHUD();this.lastHUD=time;}if(this.phase==='title'){const ctx=$('title-character').getContext('2d');ctx.clearRect(0,0,200,210);this.atlas.draw(ctx,{x:82,y:31,width:36,height:144,state:'idle',time:this.engine.time});}requestAnimationFrame(this.frame);}
}

export const app = new QuestApp();
