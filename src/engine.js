import {BRANCHES} from './data.js';
export const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
export const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
export const holder=m=>m.teams[m.turn.side].players[m.turn.player];
export const FIELD={width:25,height:15};
const FORMATION=[[1,7],[4,3],[4,7],[4,11],[8,2],[8,5],[8,9],[8,12],[11,3],[10,7],[11,11]];
const DIRS={up:[0,-1],down:[0,1],left:[-1,0],right:[1,0]},DEF=['tackle','intercept','block','hold'];
const AIR_A=['header','volley','trap','through'],AIR_D=['air-clear','air-contest','air-block','air-intercept','air-hold'];
const clone=x=>structuredClone(x),chance=v=>Math.round(clamp(v,3,95)),fatigue=p=>(100-p.energy)*.2;
const spend=(p,n)=>{p.energy=clamp(p.energy-n,0,100);};
const inField=p=>Number.isInteger(p.x)&&Number.isInteger(p.y)&&p.x>=0&&p.x<25&&p.y>=0&&p.y<15;
export const goalDistance=(p,s)=>distance(p,{x:s===0?24:0,y:7});
function random(m){m.rng=(Math.imul(m.rng,1664525)+1013904223)>>>0;return m.rng/4294967296;}
function check(m,label,probability){const roll=1+Math.floor(random(m)*100);return {label,chance:Math.round(probability),roll,success:roll<=probability};}
function nearest(m,s,p,exclude=[]){return m.teams[s].players.filter(q=>!exclude.includes(q.id)).sort((a,b)=>distance(a,p)-distance(b,p)||a.id-b.id)[0];}
function clear(m){m.phase='field';m.encounter=null;m.targeting=null;m.air=null;m.keeper=null;}
function kickoff(m,s){clear(m);m.suppressed=[];m.teams.forEach((t,side)=>t.players.forEach((p,i)=>{p.x=side?24-FORMATION[i][0]:FORMATION[i][0];p.y=FORMATION[i][1];}));m.turn={side:s,player:9};holder(m).x=s?15:9;}
export function createMatch(home,away,seed=42){const m={rulesVersion:2,field:{...FIELD},id:`${seed}-${home.seed}-${away.seed}`,teams:clone([home,away]),score:[0,0],minute:0,tick:0,half:1,status:'playing',rng:seed>>>0,turn:{side:0,player:9},phase:'field',encounter:null,targeting:null,air:null,keeper:null,suppressed:[],aiPlan:null,stats:{shots:[0,0],passes:[0,0]},log:[],lastEvent:null};m.teams.forEach(t=>t.players.forEach(p=>p.energy=100));kickoff(m,0);return m;}
export function migrateMatch(old){if(old.rulesVersion===2)return old;const m=createMatch(old.teams[0],old.teams[1],old.rng);m.fixtureId=old.fixtureId;m.score=clone(old.score);m.minute=old.minute;m.tick=old.minute;m.half=old.half;m.status=old.status;m.stats=clone(old.stats);m.log=clone(old.log??[]);kickoff(m,old.turn.side);return m;}
function eventFor(m,kind){const p=holder(m);return {minute:m.minute,side:m.turn.side,actor:p.name,kind,text:'',checks:[],details:[],skill:'',scenes:[],duels:[],performer:clone(p),opponents:[]};}
function possess(m,s,id){clear(m);m.turn={side:s,player:id};}
function takeBall(m,d,e,kind='lost'){const s=m.turn.side,p=holder(m);d.x=p.x;d.y=p.y;m.suppressed.push({side:s,id:p.id,until:m.tick+3});possess(m,1-s,d.id);e.kind=kind;e.text=`${d.name} забирает мяч у ${p.name}.`;}
function finish(m,e,advance=true){
 if(advance){m.tick++;m.minute=Math.min(m.half===1?45:90,m.minute+1);}e.minute=m.minute;m.lastEvent=e;m.log.unshift(e);m.log=m.log.slice(0,40);m.suppressed=m.suppressed.filter(s=>s.until>m.tick);
 const pending=m.phase==='keeper'||m.phase==='air';
 if(m.minute>=45&&m.half===1&&!pending){m.minute=45;m.status='halftime';clear(m);m.teams.forEach(t=>t.players.forEach(p=>p.energy=clamp(p.energy+25,0,100)));}
 if(m.minute>=90&&!pending){m.minute=90;m.status='finished';clear(m);}return m;
}
function botIntent(m){
 const p=holder(m),s=m.turn.side,dist=goalDistance(p,s);if(p.energy<8)return {type:'recover'};
 if(dist<8&&p.energy>=18)return {type:p.signature&&p.energy>=30?'special':'shoot'};
 const ts=m.teams[s].players.filter(q=>q.id&&q.id!==p.id&&goalDistance(q,s)<dist-2).sort((a,b)=>goalDistance(a,s)-goalDistance(b,s));
 if(ts.length&&(p.id===0||p.energy<20||p.y<3||p.y>11||random(m)<.35))return {type:dist<13&&p.energy>=14&&Math.abs(p.y-7)>3?'cross':'pass',target:ts[0].id};return {type:'dribble'};
}
function triggerEncounter(m){
 const p=holder(m),s=m.turn.side;const ids=m.teams[1-s].players.filter(q=>q.id&&distance(q,p)<=1.65&&!m.suppressed.some(x=>x.side===1-s&&x.id===q.id&&x.until>m.tick)).sort((a,b)=>distance(a,p)-distance(b,p)||a.id-b.id).slice(0,3).map(q=>q.id);
 if(!ids.length)return false;m.encounter={side:s,attacker:p.id,defenders:ids,index:0,choices:[],attackChoices:[],plans:ids.map(()=>DEF[Math.floor(random(m)*3)]),attackPlan:s===1?botIntent(m):null};m.phase='encounter';return true;
}
function advanceOthers(m){
 const p=holder(m),s=m.turn.side;
 if(m.tick%2===0){const ds=m.teams[1-s].players.filter(q=>q.id&&distance(q,p)<8&&!m.suppressed.some(x=>x.side===1-s&&x.id===q.id&&x.until>m.tick)).sort((a,b)=>distance(a,p)-distance(b,p)).slice(0,2);for(const q of ds){const dx=p.x-q.x,dy=p.y-q.y;if(Math.abs(dx)>=Math.abs(dy))q.x+=Math.sign(dx);else q.y+=Math.sign(dy);}}
 for(const q of m.teams[s].players){if(!q.id||q.id===p.id)continue;const base=s?24-FORMATION[q.id][0]:FORMATION[q.id][0],tx=clamp(Math.round(base+(p.x-(s?15:9))*.45),2,22);if(m.tick%3===0)q.x+=Math.sign(tx-q.x);}
}
function doStep(m,dir){const e=eventFor(m,'run'),p=holder(m),[dx,dy]=DIRS[dir];p.x+=dx;p.y+=dy;spend(p,.8);advanceOthers(m);e.text=`${p.name} ведёт мяч.`;e.scenes=['run'];if(triggerEncounter(m)){e.kind='encounter';e.opponents=m.encounter.defenders.map(id=>clone(m.teams[1-m.turn.side].players[id]));e.text=`${e.opponents.map(q=>q.name).join(', ')} преграждают путь.`;e.scenes=['encounter'];}return finish(m,e);}
export function airCandidates(m,s,landing,excludeId){return m.teams[s].players.filter(p=>p.id&&p.id!==excludeId&&distance(p,landing)<=4).map(p=>({id:p.id,side:s,distance:distance(p,landing),arrivalScore:p.stats.speed-fatigue(p)-distance(p,landing)*15})).sort((a,b)=>b.arrivalScore-a.arrivalScore||a.id-b.id);}
export function aerialChance(a,d,style='header',defense='air-contest',arrival=0){
 if(!d||defense==='air-hold')return 100;const reach=p=>(p.height-170)*.55+p.stats.jump*.6+p.stats.aerial*.7+p.stats.strength*.15-fatigue(p);
 const matrix={header:{'air-block':-13,'air-intercept':10,'air-clear':-7,'air-contest':0},volley:{'air-block':-16,'air-intercept':12,'air-clear':-7,'air-contest':0},trap:{'air-block':22,'air-intercept':-12,'air-clear':-5,'air-contest':-6},through:{'air-block':20,'air-intercept':-16,'air-clear':-8,'air-contest':0}};
 return chance(50+(reach(a)-reach(d))*.8+(style==='volley'?-10:style==='trap'?-5:0)+(defense==='air-hold'?18:(matrix[style]?.[defense]??0))+arrival);
}
const category=t=>t==='dribble'?'dribble':['pass','cross'].includes(t)?'pass':'shot';
export function defenseChance(a,d,action,style){if(style==='hold')return 0;const cat=category(action),key={tackle:'tackle',intercept:'intercept',block:'block'}[style],correct={dribble:'tackle',pass:'intercept',shot:'block'}[cat]===style;return chance(43+(d.stats[key]-a.stats[cat])*.7+(cat==='dribble'?(d.stats.strength-a.stats.strength)*.12:0)+fatigue(a)-fatigue(d)+(correct?20:-28));}
function groundPreview(m,a){
 const p=holder(m),s=m.turn.side,t=a.type,r={allowed:true,cost:0,chance:null,reason:'',partners:[],label:'',factors:[]};
 if(t==='recover')return {...r,label:'Отдать мяч и восстановиться'};if(t==='dribble')return {...r,cost:8,label:'Дриблинг'};
 if(t==='pass'||t==='cross'){
  const to=m.teams[s].players[a.target],landing=inField(a)?{x:a.x,y:a.y}:to?{x:to.x,y:to.y}:null;if(!landing||a.target===p.id)return {...r,allowed:false,reason:'Выберите точку или другого игрока'};
  r.landing=landing;r.cost=t==='pass'?8:14;r.label=t==='pass'?'Пас':'Навес';r.receiver=nearest(m,s,landing,[p.id]).id;
  if(t==='cross'){const own=airCandidates(m,s,landing,p.id),foes=airCandidates(m,1-s,landing);if(!own.length)return {...r,allowed:false,reason:'В радиусе 4 шагов нет партнёра'};r.receiver=own[0].id;r.defender=foes[0]?.id??null;r.candidates=[...own,...foes];}
  r.chance=chance(92+(p.stats.pass-50)*.35-distance(p,landing)*1.8-fatigue(p)-(t==='cross'?6:0));r.factors=[`Пас ${p.stats.pass}`,`Дальность ${distance(p,landing).toFixed(1)}`,`Усталость −${Math.round(fatigue(p))}`];return r;
 }
 r.cost=t==='shoot'?18:t==='special'?30:t==='combo2'?26:34;
 if(t==='special'&&!p.signature&&!p.talents.finisher)return {...r,allowed:false,reason:'Нужна ветка «Завершитель»'};
 const bonus=t==='special'?14+p.talents.finisher*5:t==='combo2'?24:t==='combo3'?34:0;
 if(t==='combo2'||t==='combo3'){const n=t==='combo2'?1:2;if(p.talents.conductor<n)return {...r,allowed:false,reason:`Нужен ранг ${n} «Связующего»`};r.partners=m.teams[s].players.filter(q=>q.id&&q.id!==p.id&&q.energy>=18&&distance(q,p)<=7).sort((a,b)=>distance(a,p)-distance(b,p)).slice(0,n).map(q=>q.id);if(r.partners.length<n)return {...r,allowed:false,reason:`Нужно ${n} партнёра в радиусе 7 шагов с энергией ≥18`};}
 const g=m.teams[1-s].players[0],dist=goalDistance(p,s);r.chance=chance(83+(p.stats.shot-g.stats.keeping)*.65-dist*3.5-Math.abs(p.y-7)*1.2-fatigue(p)+bonus);
 r.label=t==='shoot'?'Удар':t==='special'?BRANCHES.finisher.skills[Math.max(0,p.talents.finisher-1)]:t==='combo2'?'Двойная орбита':'Тройное созвездие';r.factors=[`Удар ${p.stats.shot} / реакция ${g.stats.keeping}`,`Расстояние ${dist.toFixed(1)}`,`Приём +${bonus}`,`Усталость −${Math.round(fatigue(p))}`];return r;
}
export function previewAction(m,a){
 const no={allowed:false,cost:0,chance:null,reason:'Сейчас это действие недоступно',partners:[],label:'',factors:[]};if(!m||!a||m.status==='finished')return no;if(m.status==='halftime')return {...no,allowed:a.type==='continue',label:'Второй тайм'};
 const p=holder(m),s=m.turn.side,t=a.type,ok={...no,allowed:true,reason:''};
 if(t==='commands')return {...ok,allowed:m.phase==='field'&&s===0};if(t==='advance')return {...ok,allowed:m.phase==='field'&&s===1};if(t==='cancel')return {...ok,allowed:['command','target'].includes(m.phase)};
 if(t==='step'){if(m.phase!=='field'||s!==0||!DIRS[a.direction])return no;const [dx,dy]=DIRS[a.direction],target={x:p.x+dx,y:p.y+dy};return {...ok,allowed:inField(target)&&target.x>0&&target.x<24,cost:.8,target,label:'Шаг',reason:inField(target)&&target.x>0&&target.x<24?'':'Край поля'};}
 if(t==='aim')return {...ok,allowed:s===0&&['command','encounter'].includes(m.phase)&&['pass','cross'].includes(a.kind)};
 if(t==='cursor')return {...ok,allowed:m.phase==='target'&&inField(a)};
 if(t==='confirm')return m.phase==='target'?previewAction(m,{type:m.targeting.kind,...m.targeting.cursor}):no;
 if(t==='defend')return {...ok,allowed:m.phase==='encounter'&&s===1&&DEF.includes(a.style),label:'Назначить действие'};
 if(m.phase==='keeper')return {...ok,allowed:['catch','punch'].includes(t)&&(t!=='catch'||m.teams[0].players[0].energy>=5),cost:t==='catch'?5:0,label:t==='catch'?'Поймать':'Отбить',reason:t==='catch'&&m.teams[0].players[0].energy<5?'Не хватает энергии: можно отбить':''};
 if(m.phase==='air'){if(!(s===0?AIR_A:AIR_D).includes(t))return no;const attack=m.teams[s].players[m.air.attacker],d=m.teams[1-s].players[m.air.defender],actor=s===0?attack:d,cost=s===0?(t==='trap'?8:t==='through'?0:12):(t==='air-hold'||!d?0:9);return {...ok,cost,allowed:!actor||actor.energy>=cost,reason:actor&&actor.energy<cost?'Не хватает энергии':'',label:t,factors:d?[`Рост ${attack.height}/${d.height}`,`Прыжок ${attack.stats.jump}/${d.stats.jump}`,`Воздух ${attack.stats.aerial}/${d.stats.aerial}`]:['Свободный верховой мяч']};}
 if(s!==0||!['command','encounter','target'].includes(m.phase)||!['pass','cross','shoot','special','combo2','combo3','dribble','recover'].includes(t))return no;
 if(t==='dribble'&&m.phase!=='encounter'||m.phase==='target'&&t!==m.targeting.kind)return no;
 const r=groundPreview(m,a),reserved=(m.encounter?.attackChoices?.length??0)*8;if(p.energy<r.cost+reserved)return {...r,allowed:false,reason:`Нужно ${r.cost+reserved} энергии, осталось ${Math.floor(p.energy)}`};return m.encounter?{...r,chance:null}:r;
}
function duel(m,e,d,action,style){
 if(style==='hold'||d.energy<4){const s=m.turn.side;d.energy=clamp(d.energy+4,0,100);e.duels.push({defender:d.id,side:1-s,style:'hold',action,chance:0,roll:0,success:false,actorName:holder(m).name,defenderName:d.name});e.scenes.push('run');m.suppressed.push({side:1-s,id:d.id,until:m.tick+4});return true;}
 const p=holder(m),s=m.turn.side,effective=d.energy<4?'hold':style,c=check(m,`${d.name}: ${effective==='tackle'?'подкат':effective==='intercept'?'перехват':effective==='block'?'блок':'ожидание'}`,defenseChance(p,d,action,effective));
 if(effective==='hold')d.energy=clamp(d.energy+4,0,100);else spend(d,4);e.checks.push(c);e.duels.push({defender:d.id,side:1-s,style:effective,action,chance:c.chance,roll:c.roll,success:c.success,actorName:p.name,defenderName:d.name});e.scenes.push(effective==='intercept'?'intercept':effective==='block'?'block':effective==='tackle'?'tackle':'run');
 if(c.success){takeBall(m,d,e,effective==='intercept'?'intercept':'lost');return false;}m.suppressed.push({side:1-s,id:d.id,until:m.tick+4});return true;
}
function shotResult(m,e,prob,style='catch'){
 const s=m.turn.side,p=holder(m),g=m.teams[1-s].players[0],c=check(m,'Удар против вратаря',chance(prob+(style==='punch'?-8:fatigue(g)*.3)));e.checks.push(c);e.scenes.push('flight','keeper');
 if(c.success){m.score[s]++;e.kind='goal';e.text=`ГОЛ! ${p.name}. ${m.score[0]}:${m.score[1]}`;e.scenes.push('goal');kickoff(m,1-s);return;}
 if(c.roll>=97){e.kind='miss';e.text='Мяч проходит мимо ворот.';e.scenes.push('miss');possess(m,1-s,0);return;}
 if(style==='punch'||c.roll<c.chance+20){const winSide=random(m)<.35?s:1-s,q=nearest(m,winSide,{x:s===0?20:4,y:clamp(p.y,2,12)},[0]);possess(m,winSide,q.id);e.kind='rebound';e.text=`Вратарь отбивает! ${q.name} подбирает мяч.`;e.scenes.push('punch','rebound');}else{possess(m,1-s,0);e.kind='save';e.text=`${g.name} ловит мяч.`;e.scenes.push('save');}
}
function launchShot(m,e,prob,label){m.stats.shots[m.turn.side]++;e.skill=label;e.scenes.push('windup','shot');if(m.turn.side===1){m.phase='keeper';m.keeper={side:1,attacker:m.turn.player,chance:prob,label};m.encounter=null;m.targeting=null;m.air=null;e.kind='shot-flight';e.text='Удар идёт в наши ворота! Вратарь готовится к прыжку.';}else shotResult(m,e,prob);}
function deliverPass(m,e,a,r){
 const s=m.turn.side,p=holder(m),landing=r.landing;e.scenes.push('pass','flight');const delivery=check(m,a.type==='cross'?'Доставка навеса':'Точность передачи',r.chance);e.checks.push(delivery);
 if(!delivery.success){const d=nearest(m,1-s,landing,[0]);possess(m,1-s,d.id);e.kind='intercept';e.text=`Неточная передача. ${d.name} подбирает мяч.`;e.scenes.push('intercept');return;}
 m.stats.passes[s]++;
 if(a.type==='cross'){const q=m.teams[s].players[r.receiver];m.turn.player=q.id;m.phase='air';m.encounter=null;m.targeting=null;m.air={side:s,attacker:q.id,defender:r.defender,landing,candidates:r.candidates,attackPlan:AIR_A[Math.floor(random(m)*3)],defensePlan:AIR_D[Math.floor(random(m)*4)]};e.kind='cross';e.text=`${p.name} навешивает в область. ${q.name} выходит к мячу.`;e.scenes.push('aerial');return;}
 const q=m.teams[s].players[r.receiver],d=nearest(m,1-s,landing,[0]),c=check(m,'Первым к передаче',chance(70+(q.stats.speed-d.stats.speed)*.3+(distance(d,landing)-distance(q,landing))*9));e.checks.push(c);
 if(!c.success){d.x=landing.x;d.y=landing.y;possess(m,1-s,d.id);e.kind='intercept';e.text=`${d.name} опережает адресата и перехватывает пас.`;e.scenes.push('intercept');}else{q.x=landing.x;q.y=landing.y;possess(m,s,q.id);e.kind='pass';e.text=`${p.name} → ${q.name}. Мяч принят.`;e.scenes.push('receive');triggerEncounter(m);}
}
function executeAttack(m,a,defenseChoices=null){
 const e=eventFor(m,a.type),p=holder(m),s=m.turn.side,enc=m.encounter,queued=enc?.attackChoices??[],ids=enc?.defenders??[],plans=defenseChoices??enc?.plans??[],r=groundPreview(m,a);e.opponents=ids.map(id=>clone(m.teams[1-s].players[id]));e.details=r.factors;e.skill=r.label;let offset=0;
 for(const planned of queued){spend(p,8);e.scenes.push('dribble');if(!duel(m,e,m.teams[1-s].players[ids[offset]],planned.type,plans[offset]??'tackle'))return finish(m,e);offset++;}
 if(a.type==='dribble'){for(let i=offset;i<ids.length;i++){spend(p,8);e.scenes.push('dribble');if(!duel(m,e,m.teams[1-s].players[ids[i]],'dribble',plans[i]??'tackle'))return finish(m,e);}clear(m);p.x=clamp(p.x+(s===0?1:-1),1,23);e.kind='breakthrough';e.text=`${p.name} проходит всех защитников!`;e.scenes.push('breakthrough');return finish(m,e);}
 if(a.type==='recover'){m.teams[s].players.forEach(q=>q.energy=clamp(q.energy+18+q.stats.stamina*.05,0,100));const d=nearest(m,1-s,p,[0]);possess(m,1-s,d.id);e.text='Команда восстанавливает силы. Мяч у соперника.';e.scenes.push('receive');return finish(m,e);}
 spend(p,r.cost);r.partners.forEach(id=>spend(m.teams[s].players[id],18));for(let i=offset;i<ids.length;i++)if(!duel(m,e,m.teams[1-s].players[ids[i]],a.type,plans[i]??'tackle'))return finish(m,e);
 clear(m);if(a.type==='pass'||a.type==='cross')deliverPass(m,e,a,r);else launchShot(m,e,r.chance,r.label);return finish(m,e,m.phase!=='keeper');
}
function resolveAir(m,a){
 const e=eventFor(m,a.type),air=m.air,s=air.side,p=holder(m),d=m.teams[1-s].players[air.defender];e.opponents=d?[clone(d)]:[];let style=s===0?a.type:air.attackPlan,defense=s===0?air.defensePlan:a.type;
 if(p.energy<(style==='through'?0:style==='trap'?8:12))style='through';if(d&&d.energy<9)defense='air-hold';let advantage=0;e.scenes=['flight','aerial'];
 const contesting=d&&defense!=='air-hold';if(!contesting)e.opponents=[];if(contesting){const c=check(m,'Выход к мячу',chance(50+(p.stats.speed-d.stats.speed)*.35+(distance(d,air.landing)-distance(p,air.landing))*10));e.checks.push(c);advantage=c.success?10:-10;}
 const c=contesting?check(m,'Борьба за верх',aerialChance(p,d,style,defense,advantage)):{label:'Свободный мяч',chance:100,roll:0,success:true};e.checks.push(c);
 const names={header:'удар головой',volley:'удар с лёта',trap:'приём',through:'пропуск','air-block':'блок','air-contest':'борьба','air-clear':'вынос','air-intercept':'перехват','air-hold':'ожидание'};
 e.details=[`Атака: ${names[style]}; защита: ${names[defense]}`,`Рост ${p.height}${d?'/'+d.height:''}`,`Прыжок ${p.stats.jump}${d?'/'+d.stats.jump:''}`,`Воздух ${p.stats.aerial}${d?'/'+d.stats.aerial:''}`];spend(p,style==='through'?0:style==='trap'?8:12);if(d&&defense!=='air-hold')spend(d,9);clear(m);
 if(!c.success){d.x=air.landing.x;d.y=air.landing.y;possess(m,1-s,d.id);e.kind='aerial-lost';e.text=`${d.name} выигрывает верх. Удара не было.`;e.scenes.push('clear');return finish(m,e);}
 p.x=air.landing.x;p.y=air.landing.y;
 if(style==='through'){const q=m.teams[s].players.filter(q=>q.id&&q.id!==p.id&&distance(q,p)<=4).sort((a,b)=>distance(a,p)-distance(b,p))[0];if(q){possess(m,s,q.id);e.kind='pass';e.text=`${p.name} пропускает мяч к ${q.name}.`;}else{const d=nearest(m,1-s,p,[0]);possess(m,1-s,d.id);e.kind='lost';e.text='За спиной нет партнёра. Потеря.';}e.scenes.push('receive');}
 else if(style==='trap'){const c=check(m,'Приём мяча',chance(58+p.stats.control*.45-fatigue(p)));e.checks.push(c);e.kind=c.success?'control':'lost';e.text=c.success?`${p.name} принимает мяч.`:'Неудачный приём. Мяч у соперника.';if(!c.success)possess(m,1-s,d?.id??nearest(m,1-s,p,[0]).id);e.scenes.push('receive');}
 else{const execution=style==='header'?p.stats.aerial*.65+p.stats.shot*.35:p.stats.shot*.65+p.stats.control*.35-8,g=m.teams[1-s].players[0],prob=chance(83+(execution-g.stats.keeping)*.65-goalDistance(p,s)*3.3-fatigue(p)-(d&&defense==='air-block'?d.stats.block*.15:0));e.scenes.push(style);launchShot(m,e,prob,style==='header'?'Удар головой':'Удар с лёта');}return finish(m,e,m.phase!=='keeper');
}
export function chooseAIAction(m){
 if(m.status==='halftime')return {type:'continue'};if(m.phase==='keeper')return {type:m.teams[0].players[0].energy>=5?'catch':'punch'};
 if(m.phase==='air'){const a={type:m.turn.side===0?(holder(m).stats.aerial>=holder(m).stats.control?'header':'trap'):'air-contest'};return previewAction(m,a).allowed?a:{type:m.turn.side===0?'through':'air-hold'};}
 if(m.phase==='target')return {type:'confirm'};
 if(m.phase==='encounter'){if(m.turn.side===1)return {type:'defend',style:['tackle','intercept','block'][(m.tick+m.encounter.index)%3]};if(goalDistance(holder(m),0)<8&&previewAction(m,{type:'shoot'}).allowed)return {type:'shoot'};return previewAction(m,{type:'dribble'}).allowed?{type:'dribble'}:{type:'recover'};}
 if(m.phase==='command'){const p=holder(m);if(p.energy<18)return {type:'recover'};return previewAction(m,{type:'special'}).allowed?{type:'special'}:{type:'shoot'};}
 if(m.turn.side===1)return {type:'advance'};const p=holder(m);if(goalDistance(p,0)<8||p.energy<10||p.id===0)return {type:'commands'};return {type:'step',direction:p.x<23?'right':p.y<7?'down':'up'};
}
export function stepMatch(input,a){
 if(!previewAction(input,a).allowed)return input;const m=clone(input),t=a.type;m.lastEvent=input.lastEvent;
 if(m.status==='halftime'){m.status='playing';m.half=2;kickoff(m,1);m.lastEvent=null;return m;}
 if(t==='commands'){m.phase='command';return m;}
 if(t==='aim'){m.targeting={kind:a.kind,returnPhase:m.phase,cursor:{x:clamp(holder(m).x+(m.turn.side===0?5:-5),0,24),y:holder(m).y}};m.phase='target';return m;}
 if(t==='cursor'){m.targeting.cursor={x:a.x,y:a.y};return m;}
 if(t==='cancel'){if(m.phase==='target'){m.phase=m.targeting.returnPhase;m.targeting=null;}else m.phase='field';return m;}
 if(t==='confirm'){const action={type:m.targeting.kind,...m.targeting.cursor};m.phase=m.targeting.returnPhase;m.targeting=null;return executeAttack(m,action);}
 if(t==='step')return doStep(m,a.direction);
 if(t==='advance'){if(triggerEncounter(m)){const e=eventFor(m,'encounter');e.text='Наши защитники встречают соперника. Назначь каждому действие.';e.scenes=['encounter'];e.opponents=m.encounter.defenders.map(id=>clone(m.teams[0].players[id]));return finish(m,e,false);}const next=botIntent(m),p=holder(m);if(next.type!=='dribble'){const r=groundPreview(m,next);if(r.allowed&&p.energy>=r.cost)return executeAttack(m,next);}return doStep(m,p.x>1?'left':p.y<7?'down':'up');}
 if(t==='defend'){m.encounter.choices.push(a.style);m.encounter.index++;if(m.encounter.index<m.encounter.defenders.length)return m;let action=m.encounter.attackPlan??{type:'dribble'},r=groundPreview(m,action),cost=action.type==='dribble'?8*m.encounter.defenders.length:r.cost;if(!r.allowed||holder(m).energy<cost)action={type:'recover'};return executeAttack(m,action,m.encounter.choices);}
 if(m.phase==='keeper'){const e=eventFor(m,t),k=m.keeper;e.opponents=[clone(m.teams[0].players[0])];e.scenes=['shot'];if(t==='catch')spend(m.teams[0].players[0],5);clear(m);shotResult(m,e,k.chance,t);return finish(m,e);}
 if(m.phase==='air')return resolveAir(m,a);
 if(t==='dribble'){m.encounter.attackChoices.push({type:'dribble'});m.encounter.index++;if(m.encounter.index<m.encounter.defenders.length)return m;return executeAttack(m,{type:'dribble'});}
 return executeAttack(m,a);
}
