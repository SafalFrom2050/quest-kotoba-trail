import test from 'node:test';
import assert from 'node:assert/strict';
import { LESSONS, learningText } from '../src/content.mjs';
import { freshProgress, normalizeProgress, ProgressStore } from '../src/progress.mjs';

test('old saves default to English without losing existing practice and settings',()=>{
  const old={version:1,attempts:[{lessonId:'gi',correct:true}],discovered:['gi'],worlds:{wordwood:{completed:true}},preferences:{music:false,sound:false,effects:false},lastWorld:'workshop'};
  const restored=normalizeProgress(old);
  assert.equal(freshProgress().preferences.language,'en');
  assert.equal(restored.preferences.language,'en');
  assert.deepEqual(restored.attempts,old.attempts);assert.deepEqual(restored.discovered,old.discovered);
  assert.deepEqual(restored.worlds,old.worlds);assert.equal(restored.lastWorld,'workshop');
  assert.equal(restored.preferences.music,false);assert.equal(restored.preferences.sound,false);assert.equal(restored.preferences.effects,false);
});

test('only supported saved languages are accepted, including after recording an answer',()=>{
  for(const invalid of [true,false,1,'fr',{},null])assert.equal(normalizeProgress({version:1,preferences:{language:invalid}}).preferences.language,'en');
  let saved=null;
  const storage={getItem:()=>saved,setItem:(_,value)=>{saved=value;}};
  const store=new ProgressStore(storage);store.setPreference('language','ne');
  store.attempt({lessonId:'gi',questionId:'gi-1',selected:0,correct:true,hinted:true});
  const reloaded=new ProgressStore(storage);
  assert.equal(reloaded.value.preferences.language,'ne');assert.equal(reloaded.value.attempts.length,1);
  reloaded.setPreference('language','en');
  assert.equal(new ProgressStore(storage).value.preferences.language,'en');
  reloaded.setPreference('language','invalid');assert.equal(reloaded.value.preferences.language,'en');
});

test('language switching remains usable when browser storage is blocked',()=>{
  const store=new ProgressStore({getItem(){throw new Error('blocked');},setItem(){throw new Error('blocked');}});
  store.setPreference('language','ne');assert.equal(store.value.preferences.language,'ne');assert.equal(store.available,false);
  store.setPreference('language','en');assert.equal(store.value.preferences.language,'en');
});

test('every lesson and language-specific practice hint has both translations',()=>{
  for(const lesson of LESSONS){
    assert.ok(lesson.hook.en.length>20,lesson.id);assert.ok(lesson.hook.ne.length>20,lesson.id);
    assert.notEqual(lesson.hook.en,lesson.hook.ne,lesson.id);
    assert.equal(learningText(lesson.hook),lesson.hook.en);
    assert.equal(learningText(lesson.hook,'ne'),lesson.hook.ne);
    for(const question of lesson.questions)if(question.support){assert.ok(question.support.en);assert.ok(question.support.ne);}
  }
  assert.equal(learningText({en:'English only'},'ne'),'English only');
  assert.equal(learningText({en:'English',ne:'Nepalish'},'unsupported'),'English');
  assert.equal(learningText('Shared text','ne'),'Shared text');assert.equal(learningText(undefined),'');
});
