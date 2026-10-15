import {STAT_LABELS,cleanName} from './data.js';
import {nextFixture} from './career.js';
import {migrateMatch} from './engine.js';

const finite=(x,min,max)=>typeof x==='number'&&Number.isFinite(x)&&x>=min&&x<=max;
const integer=(x,min,max)=>Number.isInteger(x)&&finite(x,min,max);
const text=(x,max)=>typeof x==='string'&&x.length<=max;
const object=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const list=(x,max,valid)=>Array.isArray(x)&&x.length<=max&&x.every(valid);
const score=x=>Array.isArray(x)&&x.length===2&&x.every(n=>integer(n,0,1000));
const DEFENSES=['tackle','intercept','block','hold'];
const ATTACKS=['dribble','recover','pass','cross','shoot','special','combo2','combo3'];
const AIR_ATTACKS=['header','volley','trap','through'];
const AIR_DEFENSES=['air-clear','air-contest','air-block','air-intercept','air-hold'];
const point=(p,width,height)=>object(p)&&integer(p.x,0,width-1)&&integer(p.y,0,height-1);
const validResult=r=>object(r)&&text(r.id,80)&&text(r.title,160)&&text(r.opponent,28)&&score(r.score)&&typeof r.won==='boolean'&&(r.penalties===null||score(r.penalties))&&integer(r.xp,0,100);
const validCheck=c=>object(c)&&text(c.label,80)&&finite(c.chance,0,100)&&integer(c.roll,0,100)&&typeof c.success==='boolean';

function validPlayer(p,id,width=25,height=15){
 return object(p)&&p.id===id&&integer(p.id,0,10)&&text(p.name,28)&&integer(p.number,1,99)&&integer(p.look,0,4294967295)&&typeof p.signature==='boolean'
  &&['ВР','ЗЩ','ПЗ','НП'].includes(p.role)&&finite(p.height,140,220)&&finite(p.energy,0,100)&&integer(p.level,1,10)&&integer(p.xp,0,1000000)&&integer(p.points,0,20)&&point(p,width,height)
  &&object(p.stats)&&Object.keys(p.stats).length===Object.keys(STAT_LABELS).length&&Object.keys(STAT_LABELS).every(k=>finite(p.stats[k],1,99))
  &&object(p.talents)&&['finisher','conductor','guardian'].every(k=>integer(p.talents[k],0,3));
}
const validTeam=(t,width=25,height=15)=>object(t)&&text(t.name,28)&&Array.isArray(t.players)&&t.players.length===11&&t.players.every((p,i)=>validPlayer(p,i,width,height));
const validDuel=d=>object(d)&&integer(d.defender,1,10)&&integer(d.side,0,1)&&DEFENSES.includes(d.style)&&ATTACKS.includes(d.action)&&finite(d.chance,0,100)&&integer(d.roll,0,100)&&typeof d.success==='boolean'&&text(d.actorName,28)&&text(d.defenderName,28);
function validEvent(e,width,height){
 if(!object(e)||!integer(e.minute,0,90)||!integer(e.side,0,1)||!text(e.actor,28)||!text(e.kind,64)||!text(e.text,512)||!text(e.skill,80)||!list(e.checks,10,validCheck)||!list(e.details,20,s=>text(s,512)))return false;
 // Migrated journals retain legacy entries without animation snapshots.
 if(e.scenes!==undefined&&!list(e.scenes,32,s=>text(s,64)))return false;
 if(e.duels!==undefined&&!list(e.duels,3,validDuel))return false;
 if(e.performer!==undefined&&!validPlayer(e.performer,e.performer?.id,width,height))return false;
 if(e.opponents!==undefined&&!list(e.opponents,3,p=>validPlayer(p,p?.id,width,height)))return false;
 return true;
}
function validCareer(c){
 if(!object(c)||c.schema!==1||!validTeam(c.team)||!integer(c.division,0,3)||!integer(c.round,0,6)||!integer(c.season,1,100000)||!integer(c.seed,0,4294967295))return false;
 if(!Array.isArray(c.standings)||c.standings.length!==4||!c.standings.every((r,i)=>object(r)&&r.id===i&&['played','wins','draws','losses','gf','ga','points'].every(k=>integer(r[k],0,1000))))return false;
 if(!Array.isArray(c.clubs)||c.clubs.length!==4||!c.clubs.every(a=>Array.isArray(a)&&a.length===3&&a.every(n=>text(n,28))))return false;
 if(!Array.isArray(c.leagueNames)||c.leagueNames.length!==4||!c.leagueNames.every(n=>text(n,28))||!Array.isArray(c.cupNames)||c.cupNames.length!==2||!c.cupNames.every(n=>text(n,28)))return false;
 if(!text(c.country,28)||!list(c.cups,4,x=>object(x)&&integer(x.cup,0,1)&&integer(x.stage,0,1)&&text(x.name,28))||!integer(c.cupIndex,0,c.cups.length)||!list(c.processed,100000,x=>text(x,80)))return false;
 return (c.lastResult===null||validResult(c.lastResult))&&list(c.history,30,validResult)&&list(c.trophies,100000,t=>object(t)&&text(t.name,28)&&integer(t.season,1,c.season));
}
function validPlan(a,attacker,width=25,height=15,legacy=false){
 if(!object(a)||!(legacy?['move',...ATTACKS]:ATTACKS).includes(a.type))return false;
 if(a.type==='move')return point(a,width,height)&&a.x>=1&&a.x<width-1;
 if(a.type!=='pass'&&a.type!=='cross')return true;
 if(a.target!==undefined&&(!integer(a.target,0,10)||a.target===attacker))return false;
 if((a.x!==undefined||a.y!==undefined)&&!point(a,width,height))return false;
 return a.target!==undefined||point(a,width,height);
}
function validAir(m,width,height,legacy=false){
 const a=m.air;
 if(!object(a)||a.side!==m.turn.side||a.attacker!==m.turn.player||!integer(a.attacker,1,10)||(a.defender!==null&&!integer(a.defender,1,10))||!point(a.landing,width,height))return false;
 if(legacy&&(a.landing.x<1||a.landing.x>=width-1))return false;
 if(!AIR_ATTACKS.includes(a.attackPlan)||!(legacy?AIR_DEFENSES.slice(0,4):AIR_DEFENSES).includes(a.defensePlan))return false;
 return list(a.candidates,20,c=>object(c)&&integer(c.id,1,10)&&integer(c.side,0,1)&&finite(c.distance,0,legacy?3:4)&&finite(c.arrivalScore,-1000,1000));
}
function validCommonMatch(m,c,width,height){
 if(!object(m)||!text(m.id,256)||!Array.isArray(m.teams)||m.teams.length!==2||!m.teams.every(t=>validTeam(t,width,height))||!['playing','halftime','finished'].includes(m.status)||!integer(m.minute,0,90)||![1,2].includes(m.half)||!integer(m.rng,0,4294967295)||!object(m.turn)||!integer(m.turn.side,0,1)||!integer(m.turn.player,0,10)||!score(m.score))return false;
 if(!object(m.stats)||!['shots','passes'].every(k=>score(m.stats[k]))||!list(m.log,40,e=>validEvent(e,width,height))||(m.lastEvent!==null&&!validEvent(m.lastEvent,width,height)))return false;
 const fixture=nextFixture(c);return !!fixture&&m.fixtureId===fixture.id&&!c.processed.includes(m.fixtureId);
}
function validLegacyMatch(m,c){
 if(m.rulesVersion!==undefined&&m.rulesVersion!==1)return false;
 if(!validCommonMatch(m,c,12,7)||m.minute%3!==0)return false;
 if(m.status==='halftime'&&(m.minute!==45||m.half!==1))return false;
 if(m.status==='finished'&&(m.minute!==90||m.half!==2))return false;
 if(m.status==='playing'&&(m.minute>=90||m.half!==(m.minute<45?1:2)))return false;
 if(m.aiPlan!==null&&!validPlan(m.aiPlan,m.turn.player,12,7,true))return false;
 return m.air===null||(m.status==='playing'&&validAir(m,12,7,true));
}
function validEncounter(m){
 const e=m.encounter;
 if(!object(e)||e.side!==m.turn.side||e.attacker!==m.turn.player||!list(e.defenders,3,id=>integer(id,1,10))||e.defenders.length<1||new Set(e.defenders).size!==e.defenders.length||!integer(e.index,0,e.defenders.length-1))return false;
 if(!list(e.plans,3,p=>DEFENSES.includes(p))||e.plans.length!==e.defenders.length||!list(e.choices,3,p=>DEFENSES.includes(p))||!list(e.attackChoices,3,a=>object(a)&&a.type==='dribble'))return false;
 if(e.side===0)return e.choices.length===0&&e.attackChoices.length===e.index&&e.attackPlan===null;
 return e.attackChoices.length===0&&e.choices.length===e.index&&validPlan(e.attackPlan,e.attacker);
}
function validV2Match(m,c){
 if(!validCommonMatch(m,c,25,15)||m.rulesVersion!==2||!object(m.field)||m.field.width!==25||m.field.height!==15||!integer(m.tick,m.minute,1000000)||m.aiPlan!==null)return false;
 if(!['field','command','target','encounter','air','keeper'].includes(m.phase))return false;
 if(!list(m.suppressed,256,s=>object(s)&&integer(s.side,0,1)&&integer(s.id,0,10)&&integer(s.until,m.tick+1,m.tick+4)))return false;
 const pending=m.phase==='air'||m.phase==='keeper';
 if(m.status==='halftime'&&(m.minute!==45||m.half!==1||m.phase!=='field'))return false;
 if(m.status==='finished'&&(m.minute!==90||m.half!==2||m.phase!=='field'))return false;
 if(m.status==='playing'){
  if(m.half===1&&(m.minute>45||(m.minute===45&&!pending)))return false;
  if(m.half===2&&(m.minute<45||(m.minute===90&&!pending)))return false;
 }
 if(m.phase==='command'&&m.turn.side!==0)return false;
 if(m.phase==='target'){
  const t=m.targeting;
  if(m.turn.side!==0||!object(t)||!['pass','cross'].includes(t.kind)||!['command','encounter'].includes(t.returnPhase)||!point(t.cursor,25,15))return false;
 }else if(m.targeting!==null)return false;
 const hasEncounter=m.phase==='encounter'||(m.phase==='target'&&m.targeting.returnPhase==='encounter');
 if(hasEncounter?!validEncounter(m):m.encounter!==null)return false;
 if(m.phase==='air'){if(!validAir(m,25,15))return false;}else if(m.air!==null)return false;
 if(m.phase==='keeper'){
  const k=m.keeper;
  if(m.turn.side!==1||!object(k)||k.side!==1||k.attacker!==m.turn.player||!finite(k.chance,3,95)||!text(k.label,80))return false;
 }else if(m.keeper!==null)return false;
 return m.status==='playing'||!pending;
}

export function encodeSave(value){return JSON.stringify({schema:1,...value});}
export function decodeSave(serialized){
 try{
  if(typeof serialized!=='string'||serialized.length>2000000)return null;
  const v=JSON.parse(serialized),c=v.career;let m=v.match;
  if(v.schema!==1||!validCareer(c))return null;
  if(m!==null){
   if(!object(m))return null;
   if(m.rulesVersion===2){if(!validV2Match(m,c))return null;}
   else{
    // Never let migration reset malformed input into an apparently valid match.
    if(!validLegacyMatch(m,c))return null;
    m=migrateMatch(m);if(!validV2Match(m,c))return null;
   }
  }
  c.team.name=cleanName(c.team.name);c.team.players.forEach(p=>p.name=cleanName(p.name));
  return {career:c,match:m};
 }catch{return null;}
}
export const SAVE_KEY='tmgf-career-v1';
export function loadGame(){try{return decodeSave(localStorage.getItem(SAVE_KEY));}catch{return null;}}
export function saveGame(value){try{localStorage.setItem(SAVE_KEY,encodeSave(value));return true;}catch{return false;}}
