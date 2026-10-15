import {createTeam,cleanName,CLUBS,random,VERSION} from './data.js';
const clone=x=>structuredClone(x);
const rounds=[[[0,1],[2,3]],[[0,2],[3,1]],[[0,3],[1,2]],[[1,0],[3,2]],[[2,0],[1,3]],[[3,0],[2,1]]];
const freshTable=()=>Array.from({length:4},(_,id)=>({id,played:0,wins:0,draws:0,losses:0,gf:0,ga:0,points:0}));
export function createCareer(name,seed=Date.now()>>>0){return {schema:1,version:VERSION,seed:seed>>>0,team:createTeam(cleanName(name,'Искра'),seed,48),division:0,season:1,round:0,standings:freshTable(),clubs:clone(CLUBS),leagueNames:['Третий дивизион','Второй дивизион','Первый дивизион','Высшая лига'],country:'Астерия',cupNames:['Кубок Астерии','Кубок созвездий'],cups:[],cupIndex:0,trophies:[],history:[],processed:[],lastResult:null};}
export function table(c){return c.standings.map(s=>({...s,name:s.id===0?c.team.name:c.clubs[c.division][s.id-1]})).sort((a,b)=>b.points-a.points||(b.gf-b.ga)-(a.gf-a.ga)||b.gf-a.gf||a.id-b.id);}
export function nextFixture(c){
 if(c.round<6){
  const pair=rounds[c.round].find(p=>p.includes(0)),opponent=pair.find(id=>id!==0),seed=(c.seed+c.season*7919+c.division*317+c.round*113)>>>0;
  return {id:`s${c.season}d${c.division}r${c.round}`,seed,kind:'league',title:`Тур ${c.round+1} · ${c.leagueNames[c.division]}`,opponent,team:createTeam(c.clubs[c.division][opponent-1],c.seed+c.division*123+opponent,44+c.division*8+opponent)};
 }
 const cup=c.cups[c.cupIndex];if(!cup)return null;
 const seed=(c.seed+c.season*3037+c.cupIndex*713)>>>0;
 return {id:`s${c.season}cup${c.cupIndex}`,seed,kind:'cup',title:`${c.cupNames[cup.cup]} · ${cup.stage===0?'Полуфинал':'Финал'}`,team:createTeam(cup.name,seed,66+cup.cup*7+cup.stage*3)};
}
function record(t,a,b,ga,gb){
 const x=t[a],y=t[b];x.played++;y.played++;x.gf+=ga;x.ga+=gb;y.gf+=gb;y.ga+=ga;
 if(ga===gb){x.draws++;y.draws++;x.points++;y.points++;}else{const winner=ga>gb?x:y,loser=ga>gb?y:x;winner.wins++;winner.points+=3;loser.losses++;}
}
export function finishMatch(input,match){
 const fixture=nextFixture(input);
 if(!fixture||!match||match.status!=='finished'||match.minute!==90||match.fixtureId!==fixture.id||input.processed.includes(fixture.id))return input;
 const c=clone(input),[a,b]=match.score,rng=random(fixture.seed+999);let won=a>b,penalties=null;
 if(fixture.kind==='cup'&&a===b){won=rng()>.5;penalties=won?[4,3]:[3,4];}
 c.processed.push(fixture.id);const gained=won?55:a===b?45:40;
 for(const p of c.team.players){const old=p.level;p.xp+=gained;p.level=Math.min(10,1+Math.floor(p.xp/100));for(let l=old+1;l<=p.level;l++){if(l%2===0&&l<=6)p.points++;for(const key of Object.keys(p.stats))p.stats[key]=Math.min(99,p.stats[key]+1);}p.energy=100;}
 c.lastResult={id:fixture.id,title:fixture.title,opponent:fixture.team.name,score:[a,b],won,penalties,xp:gained};
 c.history.unshift(c.lastResult);c.history=c.history.slice(0,30);
 if(fixture.kind==='league'){
  record(c.standings,0,fixture.opponent,a,b);
  const other=rounds[c.round].find(p=>!p.includes(0));record(c.standings,...other,Math.floor(rng()*4),Math.floor(rng()*4));c.round++;
  if(c.round===6&&c.division===3){
   const place=table(c).findIndex(r=>r.id===0);
   if(place===0)c.trophies.push({season:c.season,name:'Чемпион высшей лиги'});
   c.cups=[{cup:0,stage:0,name:'Багровые соколы'},{cup:0,stage:1,name:'Стальные львы'}];
   if(place<2)c.cups.push({cup:1,stage:0,name:'Лунный атлетик'},{cup:1,stage:1,name:'Солнечная корона'});
  }
 }else{
  const cup=c.cups[c.cupIndex];if(won&&cup.stage===1)c.trophies.push({season:c.season,name:c.cupNames[cup.cup]});
  c.cupIndex++;if(!won&&cup.stage===0)c.cupIndex++;
 }
 return c;
}
export function advanceSeason(input){
 if(nextFixture(input))return input;
 const c=clone(input),rank=table(c).findIndex(r=>r.id===0);
 if(rank<2&&c.division<3)c.division++;else if(rank>=2&&c.division>0)c.division--;
 c.season++;c.round=0;c.standings=freshTable();c.cups=[];c.cupIndex=0;c.lastResult=null;return c;
}
export function upgradePlayer(input,id,branch){
 const p=input.team.players[id];if(!p||!['finisher','conductor','guardian'].includes(branch)||p.points<1)return input;
 const rank=p.talents[branch];if(rank>=3||p.level<(rank+1)*2)return input;
 const c=clone(input),q=c.team.players[id];q.points--;q.talents[branch]++;
 const additions=branch==='finisher'?{shot:7,control:3}:branch==='conductor'?{pass:7,control:3}:{aerial:6,jump:5,block:4,keeping:4};
 for(const [key,value]of Object.entries(additions))q.stats[key]=Math.min(99,q.stats[key]+value);
 return c;
}
