import {STAT_LABELS,cleanName} from './data.js';
import {nextFixture} from './career.js';
const finite=(x,min,max)=>typeof x==='number'&&Number.isFinite(x)&&x>=min&&x<=max;
const integer=(x,min,max)=>Number.isInteger(x)&&finite(x,min,max);
const text=(x,max)=>typeof x==='string'&&x.length<=max;
const score=x=>Array.isArray(x)&&x.length===2&&x.every(n=>integer(n,0,1000));
const validResult=r=>r&&text(r.id,80)&&text(r.title,160)&&text(r.opponent,28)&&score(r.score)&&typeof r.won==='boolean'&&(r.penalties===null||score(r.penalties))&&integer(r.xp,0,100);
const validCheck=c=>c&&text(c.label,80)&&finite(c.chance,0,100)&&integer(c.roll,0,100)&&typeof c.success==='boolean';
const validEvent=e=>e&&integer(e.minute,0,90)&&integer(e.side,0,1)&&text(e.actor,28)&&text(e.kind,64)&&text(e.text,512)&&text(e.skill,80)&&Array.isArray(e.checks)&&e.checks.length<=10&&e.checks.every(validCheck)&&Array.isArray(e.details)&&e.details.length<=20&&e.details.every(s=>text(s,512));
const validPlayer=(p,i)=>p&&p.id===i&&typeof p.name==='string'&&p.name.length<=28&&['ВР','ЗЩ','ПЗ','НП'].includes(p.role)&&finite(p.height,140,220)&&finite(p.energy,0,100)&&integer(p.level,1,10)&&integer(p.xp,0,1000000)&&integer(p.points,0,20)&&finite(p.x,0,11)&&finite(p.y,0,6)&&Object.keys(STAT_LABELS).every(k=>finite(p.stats?.[k],1,99))&&['finisher','conductor','guardian'].every(k=>integer(p.talents?.[k],0,3));
const validTeam=t=>t&&typeof t.name==='string'&&t.name.length<=28&&Array.isArray(t.players)&&t.players.length===11&&t.players.every(validPlayer);
export function encodeSave(value){return JSON.stringify({schema:1,...value});}
export function decodeSave(serialized){
 try{
  if(typeof serialized!=='string'||serialized.length>2000000)return null;
  const v=JSON.parse(serialized),c=v.career,m=v.match;
  if(v.schema!==1||!c||c.schema!==1||!validTeam(c.team)||!integer(c.division,0,3)||!integer(c.round,0,6)||!integer(c.season,1,100000)||!integer(c.seed,0,4294967295))return null;
  if(!Array.isArray(c.standings)||c.standings.length!==4||!c.standings.every((r,i)=>r.id===i&&['played','wins','draws','losses','gf','ga','points'].every(k=>integer(r[k],0,1000))))return null;
  if(!Array.isArray(c.clubs)||c.clubs.length!==4||!c.clubs.every(a=>Array.isArray(a)&&a.length===3&&a.every(n=>typeof n==='string'&&n.length<=28)))return null;
  if(!Array.isArray(c.leagueNames)||c.leagueNames.length!==4||!c.leagueNames.every(n=>typeof n==='string'&&n.length<=28)||!Array.isArray(c.cupNames)||c.cupNames.length!==2||!c.cupNames.every(n=>typeof n==='string'&&n.length<=28))return null;
  if(!text(c.country,28)||!Array.isArray(c.cups)||c.cups.length>4||!c.cups.every(x=>x&&integer(x.cup,0,1)&&integer(x.stage,0,1)&&text(x.name,28))||!integer(c.cupIndex,0,c.cups.length)||!Array.isArray(c.processed)||!c.processed.every(x=>text(x,80)))return null;
  if((c.lastResult!==null&&!validResult(c.lastResult))||!Array.isArray(c.history)||c.history.length>30||!c.history.every(validResult)||!Array.isArray(c.trophies)||!c.trophies.every(t=>t&&text(t.name,28)&&integer(t.season,1,c.season)))return null;
  if(m!==null){
   if(!m||!Array.isArray(m.teams)||m.teams.length!==2||!m.teams.every(validTeam)||!['playing','halftime','finished'].includes(m.status)||!finite(m.minute,0,90)||![1,2].includes(m.half)||!integer(m.rng,0,4294967295)||!integer(m.turn?.side,0,1)||!integer(m.turn?.player,0,10)||!Array.isArray(m.score)||m.score.length!==2||!m.score.every(x=>integer(x,0,1000)))return null;
   if(!m.stats||!['shots','passes'].every(k=>score(m.stats[k]))||!Array.isArray(m.log)||m.log.length>40||!m.log.every(validEvent)||(m.lastEvent!==null&&!validEvent(m.lastEvent)))return null;
   const fixture=nextFixture(c);
   if(!fixture||m.fixtureId!==fixture.id||c.processed.includes(m.fixtureId))return null;
   if(!integer(m.minute,0,90)||m.minute%3!==0)return null;
   if(m.status==='halftime'&&(m.minute!==45||m.half!==1))return null;
   if(m.status==='finished'&&(m.minute!==90||m.half!==2))return null;
   if(m.status==='playing'&&(m.minute>=90||m.half!==(m.minute<45?1:2)))return null;
   if(m.air!==null){
    if(!m.air||m.status!=='playing'||m.air.side!==m.turn.side||m.air.attacker!==m.turn.player||!integer(m.air.attacker,1,10)||(m.air.defender!==null&&!integer(m.air.defender,1,10)))return null;
    if(!m.air.landing||!integer(m.air.landing.x,1,10)||!integer(m.air.landing.y,0,6))return null;
    if(!['header','volley','trap','through'].includes(m.air.attackPlan)||!['air-clear','air-contest','air-block','air-intercept'].includes(m.air.defensePlan))return null;
   }
  }
  c.team.name=cleanName(c.team.name);c.team.players.forEach(p=>p.name=cleanName(p.name));
  return {career:c,match:m};
 }catch{return null;}
}
export const SAVE_KEY='tmgf-career-v1';
export function loadGame(){try{return decodeSave(localStorage.getItem(SAVE_KEY));}catch{return null;}}
export function saveGame(value){try{localStorage.setItem(SAVE_KEY,encodeSave(value));return true;}catch{return false;}}
