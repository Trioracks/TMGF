export const VERSION='0.0.0.0';
export const STAT_LABELS={shot:'Удар',pass:'Пас',dribble:'Дриблинг',control:'Контроль мяча',tackle:'Отбор',intercept:'Перехват',block:'Блок',aerial:'Игра в воздухе',jump:'Прыжок',strength:'Сила',speed:'Скорость',stamina:'Выносливость',keeping:'Реакция'};
export const BRANCHES={
 finisher:{name:'Завершитель',icon:'✦',description:'Удар +7, контроль +3 за ранг. «Дуга сокола» → «Комета» → «Сверхновая».',skills:['Дуга сокола','Комета','Сверхновая']},
 conductor:{name:'Связующий',icon:'∞',description:'Пас +7, контроль +3. Первый ранг открывает дуэт, второй — трио. Партнёры должны быть рядом и иметь силы.',skills:['Двойная орбита','Тройное созвездие','Идеальная гармония']},
 guardian:{name:'Страж неба',icon:'◇',description:'Игра в воздухе +6, прыжок +5, блок +4, реакция +4. Сильнее в борьбе за верх и защите ворот.',skills:['Воздушный дозор','Небесная стена','Хранитель высоты']}
};
export const SKILL_CATALOG=[
 ['Splender DRIB','Танец искр','Обводка'],['Heel Lift','Радужный подброс','Обводка'],['Power DRIB','Стальной прорыв','Обводка'],['Stealth DRIB','Шаг тени','Обводка'],['Illusion DRIB','Зеркальный мираж','Обводка'],['Golden Combo','Золотая связка','Комбинация'],
 ['BoneCrash TCK','Сокрушительный отбор','Отбор'],['Great TCK','Точный выпад','Отбор'],['Tornado TCK','Вихревой подкат','Отбор'],['Power TCK','Силовой заслон','Отбор'],['Thunder TCK','Громовой выпад','Отбор'],['Buster TCK','Разрушитель','Отбор'],['Lighting TCK','Вспышка молнии','Отбор'],['Kaiser TCK','Императорский заслон','Отбор'],
 ['Rolling Sobat','Круговой щит','Вратарь'],['Dragon catch','Хватка дракона','Вратарь'],['Patriot catch','Страж ворот','Вратарь'],
 ['Drive shot','Дуга сокола','Удар'],['Great shot','Точный выстрел','Удар'],['Tornado shot','Удар вихря','Удар'],['Atomic shot','Атомный импульс','Удар'],['Meteo shot','Метеор','Удар'],['GigaDrive SHT','Сверхновая','Удар'],['MegaDrive SHT','Комета','Удар'],['Big Bang shot','Большой взрыв','Удар'],['Diablo shot','Алое пламя','Удар'],['Phantom shot','Призрачный мяч','Удар'],['Slider shot','Скользящая стрела','Удар'],['Tomahawk shot','Небесный топор','Удар'],['Diamond Dust','Алмазная буря','Удар'],['Banana shot','Лунный серп','Удар'],['Flare shot','Солнечная вспышка','Удар'],['MegaFlare SHT','Солнечная корона','Удар'],['Bicycle shot','Удар через себя','Воздух'],['Hurricane SHT','Двойной ураган','Комбинация'],['Acrobat shot','Воздушный кульбит','Воздух'],['Twin shot','Двойная орбита','Комбинация'],['Heading shot','Удар головой','Воздух'],['Volley shot','Удар с лёта','Воздух'],['Hyper volley','Небесная молния','Воздух']
].map(([original,name,category])=>({original,name,category}));
export const DIVISIONS=['Третий дивизион','Второй дивизион','Первый дивизион','Высшая лига'];
export const CLUBS=[['Маяк','Кварц','Тайфун'],['Атлас','Полярис','Феникс'],['Орион','Зенитра','Сапфир'],['Астра','Корона','Небесный флот']];
export const POSITIONS=[[0,3],[2,1],[2,3],[2,5],[4,0],[4,2],[4,4],[4,6],[6,1],[6,3],[6,5]];
const FIRST=['Рэй','Акира','Лев','Кай','Марк','Рен','Ник','Юки','Алан','Тим','Шин','Алекс','Дан','Сэм','Эрик','Рой'];
const LAST=['Соколов','Мори','Ветров','Араи','Север','Кросс','Ито','Белов','Хаято','Ли','Рэйвен','Лайт'];
export function cleanName(value,fallback='Без названия'){return String(value??'').replace(/[\u0000-\u001f<>]/g,'').trim().slice(0,28)||fallback;}
export function random(seed){let n=seed>>>0;return()=>{n=(Math.imul(n,1664525)+1013904223)>>>0;return n/4294967296;};}
export function createTeam(name,seed=1,strength=48){
 const rng=random(seed);
 const players=POSITIONS.map(([x,y],i)=>{
  const role=i===0?'ВР':i<4?'ЗЩ':i<8?'ПЗ':'НП';
  const stats=Object.fromEntries(Object.keys(STAT_LABELS).map(key=>[key,Math.max(12,Math.min(90,Math.round(strength+(rng()-.5)*18)))]));
  if(role==='ЗЩ'){stats.aerial+=10;stats.block+=9;stats.tackle+=8;stats.shot-=8;}
  if(role==='НП'){stats.shot+=10;stats.dribble+=6;stats.block-=8;}
  if(role==='ПЗ'){stats.pass+=9;stats.control+=6;}
  if(role==='ВР'){stats.keeping+=12;stats.aerial+=6;}
  for(const key of Object.keys(stats))stats[key]=Math.max(1,Math.min(99,stats[key]));
  return {id:i,number:i+1,name:`${FIRST[Math.floor(rng()*FIRST.length)]} ${LAST[Math.floor(rng()*LAST.length)]}`,role,x,y,stats,height:Math.round((role==='ЗЩ'||role==='ВР'?184:173)+rng()*12),energy:100,level:1,xp:0,points:0,talents:{finisher:0,conductor:0,guardian:0},signature:i===9,look:Math.floor(rng()*10000)};
 });
 return {name:cleanName(name),color:'#73f5c2',players,seed};
}
