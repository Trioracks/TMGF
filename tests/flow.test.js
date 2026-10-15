import test from 'node:test';
import assert from 'node:assert/strict';
import {createTeam} from '../src/data.js';
import {createMatch,stepMatch,previewAction,chooseAIAction,holder} from '../src/engine.js';
function fixture(seed=42){return createMatch(createTeam('Искра',11),createTeam('Вихрь',22),seed);}
function empty(m){for(const p of m.teams[1].players){p.x=23;p.y=14;}return m;}
function encounter(side=0,count=2,seed=42){const m=fixture(seed);m.turn={side,player:9};m.phase='encounter';holder(m).x=12;holder(m).y=7;const ids=[1,2,3].slice(0,count);ids.forEach((id,i)=>Object.assign(m.teams[1-side].players[id],{x:13,y:6+i}));m.encounter={side,attacker:9,defenders:ids,index:0,choices:[],attackChoices:[],plans:ids.map(()=> 'tackle'),attackPlan:{type:'pass',target:8}};return m;}
test('стрелки двигают ровно на один шаг без броска дриблинга',()=>{
 for(const [direction,dx,dy] of [['right',1,0],['left',-1,0],['up',0,-1],['down',0,1]]){const m=empty(fixture()),p={...holder(m)},n=stepMatch(m,{type:'step',direction});assert.equal(holder(n).x,p.x+dx);assert.equal(holder(n).y,p.y+dy);assert.equal(n.minute,1);assert.deepEqual(n.lastEvent.checks,[]);}
});
test('пробел-меню, прицеливание и курсор не расходуют время, RNG и энергию',()=>{
 let m=fixture(),original=structuredClone(m);m=stepMatch(m,{type:'commands'});assert.equal(m.phase,'command');m=stepMatch(m,{type:'aim',kind:'pass'});assert.equal(m.phase,'target');m=stepMatch(m,{type:'cursor',x:17,y:4});assert.deepEqual(m.targeting.cursor,{x:17,y:4});assert.equal(m.minute,original.minute);assert.equal(m.rng,original.rng);assert.deepEqual(m.teams,original.teams);m=stepMatch(m,{type:'cancel'});assert.equal(m.phase,'command');m=stepMatch(m,{type:'cancel'});assert.equal(m.phase,'field');
});
test('два близких противника открывают сцену с обоими, дальние не добавляются',()=>{
 const m=empty(fixture());holder(m).x=10;holder(m).y=7;Object.assign(m.teams[1].players[1],{x:12,y:7});Object.assign(m.teams[1].players[2],{x:11,y:8});const n=stepMatch(m,{type:'step',direction:'right'});assert.equal(n.phase,'encounter');assert.deepEqual(n.encounter.defenders.slice().sort(),[1,2]);assert.equal(n.encounter.index,0);
});
test('защитники получают индивидуальные намерения до разрешения',()=>{
 const m=encounter(1,2),rng=m.rng;const n=stepMatch(m,{type:'defend',style:'tackle'});assert.equal(n.minute,0);assert.equal(n.rng,rng);assert.equal(n.encounter.index,1);assert.deepEqual(n.encounter.choices,['tackle']);assert.equal(n.lastEvent,null);const z=stepMatch(n,{type:'defend',style:'intercept'});assert.equal(z.minute,1);assert.ok(z.lastEvent.duels.length>=1);assert.equal(z.lastEvent.duels[0].style,'tackle');
});
test('дриблинг против первого планируется, пас второму открывает карту до анимаций',()=>{
 let m=encounter(0,3);m=stepMatch(m,{type:'dribble'});assert.equal(m.phase,'encounter');assert.equal(m.encounter.index,1);assert.equal(m.minute,0);assert.equal(m.lastEvent,null);m=stepMatch(m,{type:'aim',kind:'pass'});assert.equal(m.phase,'target');assert.equal(m.minute,0);m=stepMatch(m,{type:'confirm'});assert.equal(m.minute,1);assert.equal(m.lastEvent.duels[0].action,'dribble');
});
test('перехват сильнее против паса, подкат сильнее против дриблинга',()=>{
 const m=encounter(1,1);m.encounter.attackPlan={type:'pass',target:8};const passT=stepMatch(m,{type:'defend',style:'tackle'}),passI=stepMatch(m,{type:'defend',style:'intercept'});assert.ok(passI.lastEvent.duels[0].chance>passT.lastEvent.duels[0].chance+20);
 m.encounter.attackPlan={type:'dribble'};const drT=stepMatch(m,{type:'defend',style:'tackle'}),drI=stepMatch(m,{type:'defend',style:'intercept'});assert.ok(drT.lastEvent.duels[0].chance>drI.lastEvent.duels[0].chance+20);
});
test('неподходящий первый защитник может пропустить пас, второй его перехватывает',()=>{
 let found=false;for(let seed=1;seed<200;seed++){let m=encounter(1,2,seed);m.teams[0].players[1].stats.tackle=10;m.teams[0].players[2].stats.intercept=99;m=stepMatch(m,{type:'defend',style:'tackle'});m=stepMatch(m,{type:'defend',style:'intercept'});const d=m.lastEvent.duels;if(d.length===2&&!d[0].success&&d[1].success){assert.equal(m.turn.side,0);assert.equal(m.turn.player,2);found=true;break;}}assert.ok(found);
});
test('в меню и прицеливании бег и автоматический ход бота отклоняются',()=>{
 let m=stepMatch(fixture(),{type:'commands'});assert.equal(stepMatch(m,{type:'step',direction:'right'}),m);assert.equal(stepMatch(m,{type:'advance'}),m);m=stepMatch(m,{type:'aim',kind:'pass'});assert.equal(stepMatch(m,{type:'step',direction:'right'}),m);
});
test('ожидание не отбирает мяч даже у слабого нападающего, истощение не даёт бесплатную защиту',()=>{
 for(const exhausted of [false,true]){let m=encounter(1,1,1);holder(m).stats.dribble=1;holder(m).stats.strength=1;const d=m.teams[0].players[1];d.stats.strength=99;d.energy=exhausted?0:100;m.encounter.attackPlan={type:'dribble'};m=stepMatch(m,{type:'defend',style:exhausted?'tackle':'hold'});assert.equal(m.turn.side,1);assert.equal(m.lastEvent.duels[0].style,'hold');assert.equal(m.lastEvent.duels[0].success,false);assert.equal(m.lastEvent.checks.length,0);}
});
test('боту требуется энергия на обводку всех защитников',()=>{
 let m=encounter(1,3,1);holder(m).energy=8;holder(m).stats.dribble=99;m.encounter.attackPlan={type:'dribble'};for(let i=0;i<3;i++)m=stepMatch(m,{type:'defend',style:'hold'});assert.equal(m.lastEvent.kind,'recover');assert.equal(m.lastEvent.duels.length,0);assert.equal(m.turn.side,0);
});
test('передача в точку имеет окончание и не оставляет мяч без игрока',()=>{
 let m=empty(fixture(1));m=stepMatch(m,{type:'commands'});m=stepMatch(m,{type:'aim',kind:'pass'});m=stepMatch(m,{type:'cursor',x:8,y:4});m=stepMatch(m,{type:'confirm'});assert.equal(m.minute,1);assert.ok(holder(m));assert.ok(m.lastEvent.scenes.includes('pass'));
});
test('новый цикл завершается для 200 различных seed без невозможной энергии и фаз',()=>{
 const outcomes=new Set();for(let seed=1;seed<=200;seed++){let m=fixture(seed);let actions=0;while(m.status!=='finished'&&actions++<600){const old=m;m=stepMatch(m,chooseAIAction(m));assert.notEqual(m,old,`не сдвинулись seed${seed} phase${m.phase} status${m.status}`);for(const t of m.teams)for(const p of t.players)assert.ok(p.energy>=0&&p.energy<=100);}assert.equal(m.status,'finished',`seed${seed}`);assert.equal(m.minute,90);outcomes.add(Math.sign(m.score[0]-m.score[1]));}assert.ok(outcomes.has(1)&&outcomes.has(-1));
});
