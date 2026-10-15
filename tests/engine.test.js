import test from 'node:test';
import assert from 'node:assert/strict';
import { createTeam } from '../src/data.js';
import { createMatch, previewAction, stepMatch, chooseAIAction, aerialChance, airCandidates } from '../src/engine.js';

function fixture(seed=42) {
  const home=createTeam('Искра',11,48), away=createTeam('Вихрь',22,48);
  assert.ok(home?.players?.length===11,'Команда должна иметь 11 игроков');
  const m=createMatch(home,away,seed);
  assert.ok(m?.turn,'Матч должен предоставлять ход');
  return m;
}
test('матч создаёт две полные команды и исходные счёт и время',()=>{
  const m=fixture();assert.deepEqual(m.score,[0,0]);assert.equal(m.minute,0);assert.equal(m.status,'playing');
});
test('ближний удар имеет больший шанс, а усталость снижает шанс',()=>{
  const m=fixture(), p=m.teams[0].players[m.turn.player];
  p.x=9;p.y=3;const close=previewAction(m,{type:'shoot'});
  p.x=3;const far=previewAction(m,{type:'shoot'});
  assert.ok(close.chance>far.chance+20);
  p.x=9;p.energy=25;assert.ok(previewAction(m,{type:'shoot'}).chance<close.chance);
  assert.ok(far.chance>=3 && close.chance<=95);
});
test('недоступное действие не расходует время или энергию',()=>{
  const m=fixture();m.teams[0].players[m.turn.player].energy=1;
  const before=JSON.stringify(m);assert.equal(previewAction(m,{type:'special'}).allowed,false);
  const n=stepMatch(m,{type:'special'});assert.equal(JSON.stringify(n),before);
});
test('нельзя пасовать самому себе, вратарю соперника или за поле',()=>{
  const m=fixture();assert.equal(previewAction(m,{type:'pass',target:m.turn.player}).allowed,false);
  assert.equal(previewAction(m,{type:'pass',target:99}).allowed,false);
  assert.equal(previewAction(m,{type:'move',x:20,y:3}).allowed,false);
});
test('одинаковый seed и выборы дают одинаковый ход, вход не мутируется',()=>{
  const m=fixture(), before=JSON.stringify(m);
  assert.deepEqual(stepMatch(m,{type:'shoot'}),stepMatch(m,{type:'shoot'}));assert.equal(JSON.stringify(m),before);
});
test('совместный приём требует открытия и двух доступных партнёров',()=>{
  const m=fixture(), p=m.teams[0].players[m.turn.player];
  assert.equal(previewAction(m,{type:'combo3'}).allowed,false);
  p.talents.conductor=2;p.x=8;p.y=3;
  m.teams[0].players[8].x=8;m.teams[0].players[8].y=2;
  m.teams[0].players[10].x=8;m.teams[0].players[10].y=4;
  const preview=previewAction(m,{type:'combo3'});assert.equal(preview.allowed,true);assert.equal(preview.partners.length,2);
  const n=stepMatch(m,{type:'combo3'});
  for(const id of preview.partners)assert.ok(n.teams[0].players[id].energy<100);
});
test('перерыв наступает один раз и завершение матча запрещает дальнейшие ходы',()=>{
  let m=fixture();m.minute=42;m.teams[0].players[3].energy=30;
  m=stepMatch(m,{type:'recover'});assert.equal(m.minute,45);assert.equal(m.status,'halftime');assert.ok(m.teams[0].players[3].energy>30);
  m=stepMatch(m,{type:'continue'});assert.equal(m.status,'playing');assert.equal(m.half,2);
  m.minute=87;m=stepMatch(m,{type:'recover'});assert.equal(m.status,'finished');assert.equal(m.minute,90);
  assert.deepEqual(stepMatch(m,{type:'shoot'}),m);
});
test('неизвестная защита и тип действия отклоняются',()=>{
  const m=fixture();assert.deepEqual(stepMatch(m,{type:'teleport'}),m);
  m.turn.side=1;assert.deepEqual(stepMatch(m,{type:'defend',style:'magic'}),m);
});
test('300 разных матчей завершаются без зависаний, отрицательной энергии и NaN',()=>{
  const outcomes=new Set();
  for(let seed=1;seed<=300;seed++){
    let m=fixture(seed), steps=0;
    while(m.status!=='finished' && steps++<100){
      const action=m.status==='halftime'?{type:'continue'}:m.turn.side===0?chooseAIAction(m):{type:'defend',style:['tackle','intercept','block','hold'][seed%4]};
      m=stepMatch(m,action);
      assert.ok(Number.isFinite(m.minute));
      for(const t of m.teams)for(const p of t.players)assert.ok(p.energy>=0 && p.energy<=100);
    }
    assert.equal(m.status,'finished',`seed ${seed}`);assert.equal(m.minute,90);
    outcomes.add(Math.sign(m.score[0]-m.score[1]));
  }
  assert.ok(outcomes.has(1) && outcomes.has(-1),'В игре должны быть возможны и победа, и поражение');
});

test('рост, прыжок и игра в воздухе имеют отдельное влияние на верховую борьбу',()=>{
 const m=fixture(), a=m.teams[0].players[9],d=m.teams[1].players[2];
 a.x=d.x=8;a.y=d.y=3;a.height=175;d.height=195;
 a.stats.aerial=35;a.stats.jump=40;d.stats.aerial=80;d.stats.jump=80;
 const disadvantaged=aerialChance(a,d,'header');assert.ok(disadvantaged<30);
 a.height=200;a.stats.aerial=90;a.stats.jump=90;
 assert.ok(aerialChance(a,d,'header')>disadvantaged+30);
 a.energy=5;assert.ok(aerialChance(a,d,'header')<60);
});
test('проигранный верховой мяч не запускает проверку удара по воротам',()=>{
 let m=fixture(3);const a=m.teams[0].players[9],d=m.teams[1].players[2];
 a.height=160;a.stats.aerial=1;a.stats.jump=1;d.height=205;d.stats.aerial=99;d.stats.jump=99;
 a.x=d.x=9;a.y=d.y=3;
 m.air={side:0,attacker:9,defender:2};m.turn={side:0,player:9};
 m=stepMatch(m,{type:'header'});
 assert.equal(m.lastEvent.kind,'aerial-lost');assert.equal(m.stats.shots[0],0);assert.equal(m.air,null);
  assert.ok(!m.lastEvent.checks.some(c=>c.label==='Удар против вратаря'));
});

test('ожидание удара уязвимо к приёму, а борьба мешает приёму',()=>{
 const m=fixture(),a=m.teams[0].players[9],d=m.teams[1].players[2];
 assert.ok(aerialChance(a,d,'trap','air-block')>aerialChance(a,d,'trap','air-contest')+15);
 assert.ok(aerialChance(a,d,'header','air-block')<aerialChance(a,d,'header','air-intercept'));
});
test('на навес в область выходят только близкие игроки, скорость влияет на выход',()=>{
 const m=fixture(), landing={x:9,y:3};
 for(const t of m.teams)for(const p of t.players){p.x=1;p.y=0;}
 const a=m.teams[0].players[8],b=m.teams[0].players[10];
 a.x=b.x=8;a.y=b.y=3;a.stats.speed=90;b.stats.speed=30;
 const candidates=airCandidates(m,0,landing,9);
 assert.deepEqual(candidates.map(p=>p.id),[8,10]);
 assert.ok(candidates[0].arrivalScore>candidates[1].arrivalScore);
 assert.equal(previewAction(m,{type:'cross',x:9,y:3}).allowed,true);
 assert.equal(previewAction(m,{type:'cross',x:11,y:7}).allowed,false);
});
test('успешный навес сохраняет область и фиксирует выбор защитника до решения игрока',()=>{
 let m=fixture(42);m.teams[0].players[8].x=8;m.teams[0].players[8].y=3;
 for(let seed=1;seed<20&&!m.air;seed++){const x=fixture(seed);x.teams[0].players[8].x=8;x.teams[0].players[8].y=3;m=stepMatch(x,{type:'cross',x:8,y:3});}
 assert.ok(m.air);assert.deepEqual(m.air.landing,{x:8,y:3});
 assert.ok(['air-clear','air-contest','air-block','air-intercept'].includes(m.air.defensePlan));
 assert.ok(m.air.candidates.length>0);
 const before=JSON.stringify(m);previewAction(m,{type:'trap'});assert.equal(JSON.stringify(m),before);
});
test('свободный верховой мяч можно принять без несуществующего защитника',()=>{
 let m=fixture(42);m.air={side:0,attacker:9,defender:null,landing:{x:8,y:3},candidates:[],defensePlan:'air-block'};
 m=stepMatch(m,{type:'trap'});assert.equal(m.air,null);assert.ok(Number.isFinite(m.minute));
});
test('блок защитника влияет на удар из зоны давления',()=>{
 const m=fixture(),a=m.teams[0].players[9],d=m.teams[1].players[2];a.x=d.x=9;a.y=d.y=3;
 d.stats.block=10;const low=previewAction(m,{type:'shoot'}).chance;
 d.stats.block=99;assert.ok(previewAction(m,{type:'shoot'}).chance<low);
});
test('истощённый игрок не бьёт верховой мяч бесплатно, пропуск остаётся доступным',()=>{
 const m=fixture();m.air={side:0,attacker:9,defender:2};m.teams[0].players[9].energy=0;
 assert.equal(previewAction(m,{type:'header'}).allowed,false);
 assert.equal(previewAction(m,{type:'trap'}).allowed,false);
 assert.equal(previewAction(m,{type:'through'}).allowed,true);
 assert.equal(stepMatch(m,{type:'through'}).minute,3);
});
