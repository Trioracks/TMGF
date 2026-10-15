import test from 'node:test';
import assert from 'node:assert/strict';
import {createCareer,nextFixture,finishMatch} from '../src/career.js';
import {createMatch,stepMatch,chooseAIAction} from '../src/engine.js';
import {encodeSave,decodeSave} from '../src/storage.js';

function game(){
 const career=createCareer('Искра',77),fixture=nextFixture(career);
 const match=createMatch(career.team,fixture.team,1);match.fixtureId=fixture.id;
 return {career,match};
}
const restore=value=>decodeSave(encodeSave(value));

test('свободный навес переживает экспорт и загрузку',()=>{
 const value=game();value.match=stepMatch(value.match,{type:'cross',x:1,y:0});
 assert.equal(value.match.air?.defender,null);
 assert.deepEqual(restore(value),value);
});

test('повреждённые результаты и трофеи отклоняются до импорта',()=>{
 for(const mutate of [
  c=>c.lastResult={},c=>c.history=[null],c=>c.history=[{score:'1:0'}],
  c=>c.trophies=[null],c=>c.trophies=[{name:'Кубок',season:'первый'}]
 ]){const value=game();mutate(value.career);assert.equal(restore(value),null);}
});

test('повреждённые записи журнала и проверки отклоняются',()=>{
 const original=game();original.match=stepMatch(original.match,{type:'recover'});
 for(const mutate of [
  m=>m.log=[null],m=>m.lastEvent={},m=>m.lastEvent.checks=[null],
  m=>m.lastEvent.details='текст',m=>m.lastEvent.checks=[{label:'Удар',chance:50,roll:20,success:'да'}]
 ]){const value=structuredClone(original);mutate(value.match);assert.equal(restore(value),null);}
});

test('матч должен соответствовать следующему незасчитанному событию',()=>{
 for(const mutate of [
  v=>delete v.match.fixtureId,v=>v.match.fixtureId='другой матч',
  v=>v.career.processed.push(v.match.fixtureId)
 ]){const value=game();mutate(value);assert.equal(restore(value),null);}
});

test('невозможные время и фаза матча не загружаются',()=>{
 for(const mutate of [
  m=>m.minute=2,m=>m.status='finished',m=>m.status='halftime',
  m=>m.half=2,m=>{m.minute=45;m.status='playing';},
  m=>{m.air={side:0,attacker:8,defender:null};}
 ]){const value=game();mutate(value.match);assert.equal(restore(value),null);}
});

test('все естественные этапы матча и начисленный результат загружаются',()=>{
 const value=game();
 while(value.match.status!=='finished'){
  assert.deepEqual(restore(value),value);
  const m=value.match;
  value.match=stepMatch(m,m.status==='halftime'?{type:'continue'}:m.turn.side===0?chooseAIAction(m):{type:'defend',style:'block'});
 }
 assert.deepEqual(restore(value),value);
 value.career=finishMatch(value.career,value.match);value.match=null;
 assert.deepEqual(restore(value),value);
});
