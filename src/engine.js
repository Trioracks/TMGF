import { POSITIONS, BRANCHES } from './data.js';
export const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
export const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const roundChance=v=>Math.round(clamp(v,3,95));
const clone=v=>structuredClone(v);
export const holder=m=>m.teams[m.turn.side].players[m.turn.player];
const fatigue=p=>(100-p.energy)*.2;
export function goalDistance(p,side){return distance(p,{x:side===0?11:0,y:3});}
function random(m){m.rng=(Math.imul(m.rng,1664525)+1013904223)>>>0;return m.rng/4294967296;}
function check(m,label,chance){const roll=1+Math.floor(random(m)*100);return {label,chance:Math.round(chance),roll,success:roll<=chance};}
function resetPositions(m){m.teams.forEach((t,s)=>t.players.forEach((p,i)=>{p.x=s===0?POSITIONS[i][0]:11-POSITIONS[i][0];p.y=POSITIONS[i][1];}));}
function kickoff(m,side){resetPositions(m);m.turn={side,player:9};holder(m).x=side===0?5:6;m.air=null;}
function nearest(m,side,p,excludeGK=true){return m.teams[side].players.filter(q=>!excludeGK||q.id!==0).sort((a,b)=>distance(a,p)-distance(b,p))[0];}
function changePossession(m,player){const side=1-m.turn.side;const target=player??nearest(m,side,holder(m)).id;m.turn={side,player:target};m.air=null;}
function spend(p,cost){p.energy=clamp(p.energy-cost,0,100);}
export function createMatch(home,away,seed=42){
 const m={id:`${seed}-${home.seed}-${away.seed}`,teams:clone([home,away]),score:[0,0],minute:0,half:1,status:'playing',rng:seed>>>0,turn:{side:0,player:9},air:null,aiPlan:null,stats:{shots:[0,0],passes:[0,0]},log:[],lastEvent:null};
 m.teams.forEach(t=>t.players.forEach(p=>{p.energy=100;}));kickoff(m,0);return m;
}
export function airCandidates(m,side,landing,excludeId){
 return m.teams[side].players.filter(p=>p.id!==0&&p.id!==excludeId&&distance(p,landing)<=3)
 .map(p=>({id:p.id,side,distance:distance(p,landing),arrivalScore:p.stats.speed-fatigue(p)-distance(p,landing)*22}))
 .sort((a,b)=>b.arrivalScore-a.arrivalScore||a.id-b.id);
}
export function aerialChance(a,d,style='header',defense='air-contest',arrival=0){
 if(!d)return 95;
 // Reach and timing are resolved before the finishing skill is considered.
 const reach=p=>(p.height-170)*.55+p.stats.jump*.6+p.stats.aerial*.7+p.stats.strength*.15-fatigue(p);
 const timing=style==='volley'?-10:style==='trap'?-5:0;
 const position=clamp(distance(d,a)*5,0,16);
 const matchup={header:{'air-block':-13,'air-intercept':10,'air-clear':-7,'air-contest':0},volley:{'air-block':-16,'air-intercept':12,'air-clear':-7,'air-contest':0},trap:{'air-block':22,'air-intercept':-12,'air-clear':-5,'air-contest':-6},through:{'air-block':20,'air-intercept':-16,'air-clear':-8,'air-contest':0}};
 return roundChance(50+(reach(a)-reach(d))*.8+position+timing+(defense==='air-hold'?18:(matchup[style]?.[defense]??0))+arrival);
}
export function previewAction(m,action){
 const p=holder(m),side=m.turn.side,type=action.type;
 const result={allowed:false,cost:0,chance:null,reason:'Действие недоступно',partners:[],label:'',factors:[]};
 if(m.status==='finished')return result;
 if(m.status==='halftime')return {...result,allowed:type==='continue',label:'Второй тайм'};
 if(type==='defend')return {...result,allowed:side===1&&['tackle','intercept','block','hold'].includes(action.style),label:'Защита'};
 if(m.air){
  if(!['header','volley','trap','through','air-clear','air-contest','air-block','air-intercept','air-hold'].includes(type))return {...result,reason:'Сначала разыграйте верховой мяч'};
  if(side===0&&!['header','volley','trap','through'].includes(type))return result;
  if(side===1&&!['air-clear','air-contest','air-block','air-intercept','air-hold'].includes(type))return result;
  const a=m.teams[side].players[m.air.attacker],d=m.teams[1-side].players[m.air.defender];
  const cost=side===0?(type==='trap'?8:type==='through'?0:12):(type==='air-hold'||!d?0:9),actor=side===0?a:d;
  if(actor&&actor.energy<cost)return {...result,cost,reason:`Нужно ${cost} энергии, осталось ${Math.floor(actor.energy)}`};
  // Hidden opposing choices cannot be inferred from the preview percentage.
  return {...result,allowed:true,cost,chance:null,label:({header:'Удар головой',volley:'Удар с лёта',trap:'Принять мяч',through:'Пропустить дальше','air-clear':'Вынести головой','air-contest':'Силовая борьба','air-block':'Помешать удару','air-intercept':'Перехватить приём','air-hold':'Остаться на земле'})[type],factors:d?[`Рост ${a.height} / ${d.height} см`,`Прыжок ${a.stats.jump} / ${d.stats.jump}`,`Воздух ${a.stats.aerial} / ${d.stats.aerial}`,'Исход зависит от встречного выбора']:['Рядом нет защитника: свободный приём']};
 }
 if(!['move','pass','cross','shoot','special','combo2','combo3','recover'].includes(type))return result;
 const defender=nearest(m,1-side,p),pressure=m.teams[1-side].players.filter(q=>q.id&&distance(q,p)<2).length;
 result.allowed=true;result.reason='';
 if(type==='recover')return {...result,label:'Перестроиться',chance:100};
 if(type==='move'){
  const target={x:action.x??clamp(p.x+(side===0?2:-2),1,10),y:action.y??p.y};
  if(!Number.isInteger(target.x)||!Number.isInteger(target.y)||target.x<1||target.x>10||target.y<0||target.y>6||distance(p,target)>2.85||distance(p,target)===0)return {...result,allowed:false,reason:'Выберите клетку в пределах двух шагов'};
  result.target=target;result.cost=Math.round(8+distance(p,target)*2);
  const nearby=distance(defender,target)<2.3;
  result.chance=nearby?roundChance(67+(p.stats.dribble-defender.stats.tackle)*.6+(p.stats.speed-defender.stats.speed)*.2-fatigue(p)):95;
  result.label='Прорыв';result.factors=[`Дриблинг ${p.stats.dribble} против отбора ${defender.stats.tackle}`,`Скорость ${p.stats.speed}`,`Усталость −${Math.round(fatigue(p))}`];
 }else if(type==='pass'||type==='cross'){
  let t=m.teams[side].players[action.target];
  if(type==='cross'){
   const landing=Number.isInteger(action.x)&&Number.isInteger(action.y)?{x:action.x,y:action.y}:t?{x:t.x,y:t.y}:null;
   if(!landing||landing.x<1||landing.x>10||landing.y<0||landing.y>6)return {...result,allowed:false,reason:'Выберите область навеса на поле'};
   const attackers=airCandidates(m,side,landing,p.id),defenders=airCandidates(m,1-side,landing);
   if(!attackers.length)return {...result,allowed:false,reason:'В радиусе 3 клеток нет партнёра для навеса'};
   t=m.teams[side].players[attackers[0].id];result.landing=landing;result.candidates=[...attackers,...defenders];result.receiver=t.id;result.defender=defenders[0]?.id??null;
  }else if(!t||t.id===p.id)return {...result,allowed:false,reason:'Выберите другого партнёра на поле'};
  result.cost=type==='cross'?14:8;result.label=type==='cross'?'Навес':'Передача';
  const intercept=nearest(m,1-side,t).stats.intercept;
  result.chance=roundChance(88+(p.stats.pass-intercept)*.35-distance(p,t)*3-pressure*3-fatigue(p)-(type==='cross'?6:0));
  result.factors=[`Пас ${p.stats.pass}`,`Перехват соперника ${intercept}`,`Дальность ${distance(p,t).toFixed(1)} кл.`];
 }else{
  result.cost=type==='shoot'?18:type==='special'?30:type==='combo2'?26:34;
  if(type==='special'&&!p.signature&&!p.talents.finisher)return {...result,allowed:false,reason:'Откройте ветку «Завершитель»'};
  let bonus=type==='special'?14+p.talents.finisher*5:type==='combo2'?24:type==='combo3'?34:0;
  if(type.startsWith('combo')){
   const required=type==='combo2'?1:2;
   if(p.talents.conductor<required)return {...result,allowed:false,reason:`Нужен ${required}-й ранг «Связующего»`};
   result.partners=m.teams[side].players.filter(q=>q.id!==p.id&&q.id!==0&&q.energy>=18&&distance(q,p)<=4).sort((a,b)=>distance(p,a)-distance(p,b)).slice(0,required).map(q=>q.id);
   if(result.partners.length<required)return {...result,allowed:false,reason:`Нужно ${required} партнёра в радиусе 4 клеток с энергией ≥18`};
  }
  const goalkeeper=m.teams[1-side].players[0],dist=goalDistance(p,side),angle=Math.abs(p.y-3)*3;
  const blocking=distance(defender,p)<2.5?defender.stats.block*.1:0;
  result.chance=roundChance(78+(p.stats.shot-goalkeeper.stats.keeping)*.6-dist*7-angle-pressure*5-blocking-fatigue(p)+bonus);
  result.label=type==='shoot'?'Удар':type==='special'?BRANCHES.finisher.skills[Math.max(0,p.talents.finisher-1)]:type==='combo2'?'Двойная орбита':'Тройное созвездие';
  result.factors=[`Удар ${p.stats.shot} / реакция ${goalkeeper.stats.keeping}`,`Расстояние ${dist.toFixed(1)} кл. (−${Math.round(dist*7)})`,`Угол −${angle}; давление −${pressure*5}; блок −${Math.round(blocking)}`,`Приём +${bonus}; усталость −${Math.round(fatigue(p))}`];
 }
 if(p.energy<result.cost)return {...result,allowed:false,reason:`Нужно ${result.cost} энергии, осталось ${Math.floor(p.energy)}`};
 return result;
}
export function chooseAIAction(m){
 if(m.status==='halftime')return {type:'continue'};
 if(m.air){const a={type:m.turn.side===0?(holder(m).stats.aerial>=holder(m).stats.control?'header':'trap'):'air-contest'};return previewAction(m,a).allowed?a:{type:m.turn.side===0?'through':'air-hold'};}
 const p=holder(m),side=m.turn.side,dist=goalDistance(p,side);
 const next={type:'move',x:clamp(p.x+(side===0?2:-2),1,10),y:p.y};
 if(p.energy<20)return {type:'recover'};
 if(dist<4.7){const special={type:'special'};return previewAction(m,special).allowed&&p.energy>45?special:{type:'shoot'};}
 const options=m.teams[side].players.filter(q=>q.id!==p.id&&q.id&&goalDistance(q,side)<dist-1);
 if(options.length && (p.id===0||p.y===0||p.y===6||p.stats.pass>p.stats.dribble+7)){
  const t=options.sort((a,b)=>goalDistance(a,side)-goalDistance(b,side))[0];
  return {type:dist<7&&t.stats.aerial>t.stats.dribble?'cross':'pass',target:t.id};
 }
 return previewAction(m,next).allowed?next:{type:'shoot'};
}
function progressPositions(m,side){
 const ball=holder(m);
 for(const p of m.teams[side].players){if(p.id===ball.id||!p.id)continue;const target=clamp(ball.x+(p.role==='НП'?(side===0?1:-1):-1),1,10);p.x=clamp(p.x+Math.sign(target-p.x),1,10);}
 for(const p of m.teams[1-side].players){if(!p.id)continue;if(distance(p,ball)<4){p.x=clamp(p.x+Math.sign(ball.x-p.x),1,10);p.y=clamp(p.y+Math.sign(ball.y-p.y),0,6);}}
}
function finishShot(m,event,chance){
 const side=m.turn.side,p=holder(m);m.stats.shots[side]++;
 const shot=check(m,'Удар против вратаря',chance);event.checks.push(shot);
 if(shot.success){m.score[side]++;event.kind='goal';event.text=`ГОЛ! ${p.name} — ${m.score[0]}:${m.score[1]}`;kickoff(m,1-side);}
 else if(shot.roll>chance+30 && shot.roll<94){event.kind='save';event.text='Вратарь ловит мяч и начинает контратаку.';changePossession(m,0);}
 else if(shot.roll>=94){event.kind='miss';event.text='Мяч проходит мимо ворот. Удар от ворот.';changePossession(m,0);}
 else{event.kind='rebound';event.text='Вратарь отбивает! Мяч остаётся в игре.';const same=random(m)<.45;if(same){const t=m.teams[side].players.filter(q=>q.id&&q.id!==p.id).sort((a,b)=>goalDistance(a,side)-goalDistance(b,side))[0];m.turn.player=t.id;}else changePossession(m);}
}
function resolveAir(m,action,event){
 const air=m.air,side=air.side,a=m.teams[side].players[air.attacker],d=m.teams[1-side].players[air.defender];
 let style=side===0?action.type:(air.attackPlan??'header');
 if(a.energy<(style==='through'?0:style==='trap'?8:12))style='through';
 let defense=side===0?(air.defensePlan??'air-contest'):action.type;
 if(d&&d.energy<9)defense='air-hold';
 const landing=air.landing??{x:a.x,y:a.y};
 let advantage=0;
 if(d){
  const arrival=check(m,'Выход к мячу',roundChance(50+(a.stats.speed-d.stats.speed)*.35+(distance(d,landing)-distance(a,landing))*12+(fatigue(d)-fatigue(a))*.5));
  event.checks.push(arrival);advantage=arrival.success?10:-10;
 }
 const chance=aerialChance(a,d,style,defense,advantage);
 const duel=d?check(m,'Борьба за верх',chance):{label:'Свободный мяч',chance:100,roll:0,success:true};event.checks.push(duel);
 const names={header:'удар головой',volley:'удар с лёта',trap:'приём',through:'пропуск','air-block':'блок удара','air-contest':'борьба','air-clear':'вынос','air-intercept':'перехват приёма','air-hold':'остаётся на земле'};
 event.details=d?[`Атака: ${names[style]}; защита: ${names[defense]}`,`Рост ${a.height} / ${d.height} см`,`Прыжок ${a.stats.jump} / ${d.stats.jump}`,`Воздух ${a.stats.aerial} / ${d.stats.aerial}`,`Энергия ${Math.round(a.energy)} / ${Math.round(d.energy)}`]:['В области навеса нет защитника'];
 spend(a,style==='trap'?8:style==='through'?0:12);if(d&&defense!=='air-hold')spend(d,9);m.air=null;
 if(!duel.success){d.x=landing.x;d.y=landing.y;event.kind='aerial-lost';event.text=`${d.name} выигрывает верх. До удара дело не дошло.`;changePossession(m,d.id);return;}
 a.x=landing.x;a.y=landing.y;
 m.turn.player=a.id;
 if(style==='through'){
  const partner=m.teams[side].players.filter(p=>p.id&&p.id!==a.id&&distance(p,landing)<=3).sort((x,y)=>distance(x,landing)-distance(y,landing))[0];
  if(partner){m.turn.player=partner.id;event.kind='pass';event.text=`${a.name} пропускает мяч. ${partner.name} подхватывает его за спиной соперника.`;}
  else{event.kind='lost';event.text='За спиной нет партнёра. Мяч уходит сопернику.';changePossession(m,d?.id);}
  return;
 }
 if(style==='trap'){
  const control=check(m,'Приём мяча',roundChance(58+a.stats.control*.45-fatigue(a)));event.checks.push(control);
  event.kind=control.success?'control':'lost';event.text=control.success?`${a.name} укрощает мяч.`:'Мяч отскакивает от ноги. Потеря.';if(!control.success)changePossession(m,d?.id);return;
 }
 const goalkeeper=m.teams[1-side].players[0];
 const execution=style==='header'?a.stats.aerial*.65+a.stats.shot*.35:a.stats.shot*.65+a.stats.control*.35-8;
 const chanceShot=roundChance(80+(execution-goalkeeper.stats.keeping)*.6-goalDistance(a,side)*6-fatigue(a)-(d&&defense==='air-block'?8+d.stats.block*.1:0));
 event.text=style==='header'?'Удар головой!':'Удар с лёта!';finishShot(m,event,chanceShot);
}
export function stepMatch(input,requested){
 if(!input||input.status==='finished')return input;
 if(!previewAction(input,requested).allowed)return input;
 const m=clone(input);
 if(m.status==='halftime'){m.status='playing';m.half=2;kickoff(m,1);m.aiPlan=chooseAIAction(m);return m;}
 const defense=requested.type==='defend'?requested.style:null;
 const action=defense?(m.air?{type:({tackle:'air-contest',intercept:'air-intercept',block:'air-block',hold:'air-clear'})[defense]}:(m.aiPlan??chooseAIAction(m))):requested;
 const p=holder(m),side=m.turn.side;
 const event={minute:m.minute,side,actor:p.name,kind:action.type,text:'',checks:[],details:[],skill:''};
 if(m.air){resolveAir(m,action,event);}
 else{
  const preview=previewAction(m,action);
  if(!preview.allowed)return stepMatch(m,{type:'recover'});
  event.details=preview.factors;event.skill=preview.label;spend(p,preview.cost);preview.partners.forEach(id=>spend(m.teams[side].players[id],18));
  const counters={move:'tackle',pass:'intercept',cross:'intercept',shoot:'block',special:'block',combo2:'block',combo3:'block'};
  const def=nearest(m,1-side,p);
  const relevant=def.stats[defense==='tackle'?'tackle':defense==='intercept'?'intercept':'block'];
  const penalty=defense&&defense===counters[action.type]?8+relevant*.08:0;
  if(defense&&defense!=='hold')spend(def,5);
  const chance=roundChance((preview.chance??100)-penalty);
  if(penalty)event.details.push(`Верный выбор защиты −${Math.round(penalty)}`);
  if(action.type==='recover'){
   m.teams[side].players.forEach(q=>q.energy=clamp(q.energy+10+q.stats.stamina*.05,0,100));
   event.kind='recover';event.text='Команда восстанавливает силы и перестраивается. Соперник получает мяч.';changePossession(m);
  }else if(action.type==='move'){
   const attempt=check(m,'Обводка',chance);event.checks.push(attempt);
   if(attempt.success){p.x=preview.target.x;p.y=preview.target.y;event.text=`${p.name} проходит вперёд.`;progressPositions(m,side);}else{event.kind='lost';event.text=`${def.name} чисто отбирает мяч.`;changePossession(m,def.id);}
  }else if(action.type==='pass'||action.type==='cross'){
   const attempt=check(m,action.type==='cross'?'Доставка навеса':'Передача',chance);event.checks.push(attempt);
   if(attempt.success){m.stats.passes[side]++;m.turn.player=action.type==='cross'?preview.receiver:action.target;const receiver=holder(m);event.text=`${p.name} → ${receiver.name}.`;
    if(action.type==='cross'){
     const styles=['header','volley','trap','through'],defenses=['air-clear','air-contest','air-block','air-intercept'];
     // Both plans are committed before the player's next choice; no reactive cheating.
     const attackPlan=goalDistance(preview.landing,side)<5?styles[Math.floor(random(m)*3)]:styles[2+Math.floor(random(m)*2)];
     const defensePlan=defenses[Math.floor(random(m)*defenses.length)];
     m.air={side,attacker:receiver.id,defender:preview.defender,landing:preview.landing,candidates:preview.candidates,attackPlan,defensePlan};event.text+=' Верховой мяч: решите, как сыграть.';
    }else progressPositions(m,side);
   }else{event.kind='intercept';event.text='Передача перехвачена. Переход владения.';changePossession(m);}
  }else finishShot(m,event,chance);
 }
 m.minute=Math.min(90,m.minute+3);event.minute=m.minute;m.lastEvent=event;m.log.unshift(event);m.log=m.log.slice(0,40);
 if(m.minute===45&&m.half===1){m.status='halftime';m.air=null;m.teams.forEach(t=>t.players.forEach(q=>q.energy=clamp(q.energy+25,0,100)));}
 if(m.minute===90){m.status='finished';m.air=null;}
 m.aiPlan=m.status==='playing'&&m.turn.side===1&&!m.air?chooseAIAction(m):null;
 return m;
}
