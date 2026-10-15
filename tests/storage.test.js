import test from 'node:test';
import assert from 'node:assert/strict';
import {createCareer,nextFixture,finishMatch} from '../src/career.js';
import {createMatch,stepMatch,chooseAIAction,holder} from '../src/engine.js';
import {encodeSave,decodeSave,SAVE_KEY} from '../src/storage.js';

function game(){
 const career=createCareer('Искра',77),fixture=nextFixture(career);
 const match=createMatch(career.team,fixture.team,1);match.fixtureId=fixture.id;
 return {career,match};
}
const restore=value=>decodeSave(encodeSave(value));

test('свободный навес переживает экспорт и загрузку',()=>{
 const value=game();value.match=stepMatch(stepMatch(value.match,{type:'commands'}),{type:'cross',target:1});
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
 const original=game();original.match=stepMatch(stepMatch(original.match,{type:'commands'}),{type:'recover'});
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
  m=>m.minute=2.5,m=>m.status='finished',m=>m.status='halftime',
  m=>m.half=2,m=>{m.minute=45;m.status='playing';},
  m=>{m.air={side:0,attacker:8,defender:null};}
 ]){const value=game();mutate(value.match);assert.equal(restore(value),null);}
});

test('все естественные этапы матча и начисленный результат загружаются',()=>{
 const value=game();
 let actions=0;
 while(value.match.status!=='finished'&&actions++<600){
  assertRoundTrip(value);
  const m=value.match;
  value.match=stepMatch(m,chooseAIAction(m));assert.notEqual(value.match,m);
 }
 assert.equal(value.match.status,'finished');assertRoundTrip(value);
 value.career=finishMatch(value.career,value.match);value.match=null;
 assert.deepEqual(restore(value),value);
});

function assertRoundTrip(value){const restored=restore(value);assert.ok(restored,'Состояние должно загружаться');assert.deepEqual(restored,value);return restored;}
function rejectVariants(original,variants){for(const [label,mutate] of variants){const value=structuredClone(original);mutate(value);assert.ok(restore(value)===null,label);}}
function meeting(side=0){
 const value=game(),m=value.match;m.turn={side,player:9};holder(m).x=10;holder(m).y=7;
 for(const p of m.teams[1-side].players){p.x=23;p.y=14;}
 [1,2,3].forEach((id,i)=>Object.assign(m.teams[1-side].players[id],{x:11,y:6+i}));
 value.match=stepMatch(m,side===0?{type:'step',direction:'right'}:{type:'advance'});
 assert.equal(value.match.phase,'encounter');assert.equal(value.match.encounter.defenders.length,3);return value;
}
function airborne(minute=0,half=1){
 const value=game();value.match.minute=minute;value.match.tick=minute;value.match.half=half;
 value.match=stepMatch(stepMatch(value.match,{type:'commands'}),{type:'cross',target:1});
 assert.equal(value.match.phase,'air');assert.equal(value.match.air.defender,null);return value;
}
function keeper(){
 const value=game(),m=value.match;m.turn={side:1,player:9};Object.assign(holder(m),{x:3,y:7});
 for(const p of m.teams[0].players)if(p.id)Object.assign(p,{x:20,y:14});
 value.match=stepMatch(m,{type:'advance'});assert.equal(value.match.phase,'keeper');return value;
}
function legacyGame(){
 const value=game();value.career.version='0.0.0.0';
 value.match.status='finished';value.match.minute=90;value.match.half=2;value.match.score=[3,0];
 value.career=finishMatch(value.career,value.match);
 const f=nextFixture(value.career),teams=structuredClone([value.career.team,f.team]);teams[1].players.forEach(p=>p.x=11-p.x);
 value.match={id:'legacy-match',fixtureId:f.id,teams,score:[2,1],minute:36,half:1,status:'playing',rng:12345,turn:{side:1,player:8},air:null,aiPlan:{type:'pass',target:9},stats:{shots:[4,3],passes:[5,4]},log:[],lastEvent:null};
 const e={minute:36,side:1,actor:teams[1].players[8].name,kind:'pass',text:'Передача.',checks:[{label:'Передача',chance:70,roll:20,success:true}],details:['Пас 60'],skill:'Передача'};
 value.match.log=[e];value.match.lastEvent=e;return value;
}

test('v2 поле, меню и обе карты прицеливания сохраняются без изменения',()=>{
 const value=game();assertRoundTrip(value);value.match=stepMatch(value.match,{type:'step',direction:'up'});assertRoundTrip(value);
 value.match=stepMatch(value.match,{type:'commands'});assertRoundTrip(value);
 for(const kind of ['pass','cross']){value.match=stepMatch(value.match,{type:'aim',kind});value.match=stepMatch(value.match,{type:'cursor',x:24,y:14});assertRoundTrip(value);value.match=stepMatch(value.match,{type:'cancel'});}
});
test('v2 сохраняет частичные планы трёх атакующих и защитных встреч',()=>{
 for(const side of [0,1]){
  const value=meeting(side);assertRoundTrip(value);
  for(let i=0;i<2;i++){value.match=stepMatch(value.match,side===0?{type:'dribble'}:{type:'defend',style:i?'intercept':'tackle'});assertRoundTrip(value);}
  if(side===0){value.match=stepMatch(value.match,{type:'aim',kind:'pass'});assertRoundTrip(value);}
  const restored=restore(value),action=side===0?{type:'confirm'}:{type:'defend',style:'block'};
  assert.deepEqual(stepMatch(restored.match,action),stepMatch(value.match,action),'Загрузка не меняет планы или броски');
 }
});
test('v2 воздух и вратарь сохраняются до разрешения, включая границы таймов',()=>{
 for(const [minute,half] of [[0,1],[44,1],[89,2]]){const value=airborne(minute,half);assertRoundTrip(value);value.match=stepMatch(value.match,{type:'trap'});assertRoundTrip(value);if(minute===44)assert.equal(value.match.status,'halftime');if(minute===89)assert.equal(value.match.status,'finished');}
 for(const [minute,half] of [[0,1],[45,1],[90,2]]){const value=keeper();value.match.minute=minute;value.match.tick=minute;value.match.half=half;assertRoundTrip(value);value.match=stepMatch(value.match,{type:'catch'});assertRoundTrip(value);}
});
test('старые карьера и матч переносятся на v2 с сохранением результата и RNG',()=>{
 const value=legacyGame(),restored=restore(value);assert.ok(restored);assert.deepEqual(restored.career,value.career);
 assert.equal(restored.match.rulesVersion,2);assert.deepEqual(restored.match.field,{width:25,height:15});assert.equal(restored.match.phase,'field');
 for(const key of ['minute','half','status','rng','fixtureId'])assert.equal(restored.match[key],value.match[key]);
 for(const key of ['score','stats','log'])assert.deepEqual(restored.match[key],value.match[key]);
 assert.equal(restored.match.turn.side,value.match.turn.side);assertRoundTrip(restored);assert.equal(SAVE_KEY,'tmgf-career-v1');value.match=null;assertRoundTrip(value);
});
test('старые перерыв, финал и свободный навес мигрируют только после проверки',()=>{
 for(const status of ['halftime','finished','playing']){
  const value=legacyGame(),m=value.match;m.status=status;if(status==='halftime'){m.minute=45;m.half=1;}if(status==='finished'){m.minute=90;m.half=2;}
  if(status==='playing')m.air={side:1,attacker:8,defender:null,landing:{x:5,y:3},candidates:[],attackPlan:'trap',defensePlan:'air-block'};
  const restored=restore(value);assert.ok(restored);assert.equal(restored.match.status,status);assert.equal(restored.match.air,null);assertRoundTrip(restored);
 }
 rejectVariants(legacyGame(),[['Старые координаты',v=>v.match.teams[1].players[2].x=24],['Старый шаг времени',v=>v.match.minute=37],['Старый план бота',v=>v.match.aiPlan={type:'teleport'}],['Старый журнал',v=>v.match.log=[{checks:[null]}]],['Неизвестная версия правил',v=>v.match.rulesVersion=3]]);
});
test('повреждённые события, дуэли и снимки игроков отклоняются',()=>{
 const value=meeting();value.match=stepMatch(value.match,{type:'shoot'});assert.ok(value.match.lastEvent.duels.length);
 rejectVariants(value,[['Сцены',v=>v.match.lastEvent.scenes=[{}]],['Дуэль',v=>v.match.lastEvent.duels=[null]],['Участник дуэли',v=>v.match.lastEvent.duels[0].defender=22],['Действие дуэли',v=>v.match.lastEvent.duels[0].action='teleport'],['Исполнитель',v=>v.match.lastEvent.performer.stats.shot='99'],['Соперник',v=>v.match.lastEvent.opponents=[null]],['Лицо',v=>v.match.lastEvent.performer.look={}]]);
});
test('невозможные фазы, координаты и вложенные планы отклоняются',()=>{
 rejectVariants(game(),[['Размер поля',v=>v.match.field.width=12],['Фаза',v=>v.match.phase='teleport'],['Координаты',v=>v.match.teams[0].players[1].x=25],['Исключённый игрок',v=>v.match.suppressed=[{side:1,id:22,until:4}]]]);
 const target=game();target.match=stepMatch(stepMatch(target.match,{type:'commands'}),{type:'aim',kind:'pass'});
 rejectVariants(target,[['Курсор',v=>v.match.targeting.cursor.x=25],['Меню возврата',v=>v.match.targeting.returnPhase='air'],['Нет встречи',v=>v.match.targeting.returnPhase='encounter']]);
 rejectVariants(meeting(1),[['Пустая встреча',v=>v.match.encounter.defenders=[]],['Повторный защитник',v=>v.match.encounter.defenders=[1,1,2]],['Индекс',v=>v.match.encounter.index=3],['Очередь',v=>v.match.encounter.choices=['tackle']],['План защиты',v=>v.match.encounter.plans[0]='magic'],['План атаки',v=>v.match.encounter.attackPlan={type:'pass',target:99}],['Нет плана бота',v=>v.match.encounter.attackPlan=null],['Чужой атакующий',v=>v.match.encounter.attacker=8]]);
 rejectVariants(airborne(),[['Область навеса',v=>v.match.air.landing.y=15],['Намерение',v=>v.match.air.defensePlan='magic'],['Кандидат',v=>v.match.air.candidates=[{id:99}]]]);
 rejectVariants(keeper(),[['Шанс вратаря',v=>v.match.keeper.chance=null],['Атакующий вратаря',v=>v.match.keeper.attacker=8],['Владение',v=>v.match.keeper.side=0]]);
});
