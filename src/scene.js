// Original 16-bit art. Sprites are pixel matrices and integer rectangle strokes,
// rendered at 320×180 before nearest-neighbour display. No ROM artwork is used.
const WIDTH = 320, HEIGHT = 180;
const active = new WeakMap(), sequences = new WeakMap(), sprites = new Map();
const MINT = '#7ce8bd', CORAL = '#ed8583';
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const faceRows = [
  '    hhhhhhh     ', '  hhhhhhhhhh    ', ' hhhHhhhhhhhhh  ', ' hhhhhhhhhhHhh  ',
  ' hhhhhhshhhhhh  ', ' hhhssshssshhh  ', ' hhssssssssshh  ', ' hhssKKsssKKss  ',
  ' hssswessswess  ', ' hssswKssswKsss ', '  dsssssssssss  ', '  ddssssdsssss  ',
  '   dssssssdss   ', '   ddssKKsss    ', '    ddsssss     ', '     dssss      '
];
function palette(player = {}, side = 0, keeper = false) {
  const seed = Math.abs(Number(player.look) || 0) >>> 0;
  return {
    K: '#111b30', s: ['#edbd95', '#d69d77', '#b77c55', '#f3cea5'][seed % 4],
    d: ['#b97e66', '#a96850', '#87513e', '#c38f73'][seed % 4],
    h: ['#25314b', '#d1ded7', '#a5623f', '#543345', '#e0b34f', '#963e4f'][Math.floor(seed / 4) % 6],
    H: ['#4a5871', '#f4f0c8', '#cf8950', '#82627b', '#f3d586', '#ca6971'][Math.floor(seed / 4) % 6],
    w: '#f9f5dc', e: seed % 2 ? '#4d9fbe' : '#69c9a5',
    j: keeper ? '#e9b85b' : side ? '#df727b' : '#e4eddd',
    q: keeper ? '#b78042' : side ? '#a3435a' : '#9eb9b2',
    t: keeper ? '#283f57' : side ? '#f0caa2' : '#488d9d',
    n: '#253853', b: '#18263e', z: side ? '#e98c8b' : '#dce9d9', Z: side ? '#b45c72' : '#95b4ac'
  };
}
function matrix(c, rows, x, y, colors, scale = 1, flip = false) {
  rows.forEach((row, ry) => [...row].forEach((p, rx) => {
    if (!colors[p]) return;
    c.fillStyle = colors[p]; c.fillRect(Math.round(x + (flip ? row.length - rx - 1 : rx) * scale), Math.round(y + ry * scale), scale, scale);
  }));
}
function rect(c, x, y, w, h, color) { c.fillStyle = color; c.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); }
function pixelLine(c, a, b, color, width = 1) {
  const dx = b[0] - a[0], dy = b[1] - a[1], steps = Math.max(Math.abs(dx), Math.abs(dy), 1);
  c.fillStyle = color;
  for (let i = 0; i <= steps; i++) c.fillRect(Math.round(a[0] + dx * i / steps - width / 2), Math.round(a[1] + dy * i / steps - width / 2), width, width);
}
function segment(c, a, b, widthA, widthB, fill, shade) {
  const steps = Math.max(Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1]), 1);
  for (let layer = 0; layer < 2; layer++) for (let i = 0; i <= steps; i++) {
    const w = Math.round(widthA + (widthB - widthA) * i / steps) + (layer ? 0 : 2);
    const x = Math.round(a[0] + (b[0] - a[0]) * i / steps - w / 2), y = Math.round(a[1] + (b[1] - a[1]) * i / steps - w / 2);
    rect(c, x, y, w, w, layer ? fill : '#111b30');
    if (layer && shade) rect(c, x, y + w - 1, w, 1, shade);
  }
}
const bodyRows = [
  '    KKKKKKKKK      ', '  KKjjjtjjjjjKK    ', ' KjjjjttjjjjjjjK   ', 'KjjjjjttjjjjjjjjK  ',
  'KjjjjjttjjjjjjjjK  ', ' KqjjjttjjjjjjjK   ', ' KqqjjttjjjjjjjK   ', '  KqjjttjjjjjjK    ',
  '  KqqjttjjjjjjK    ', '  KqqjttjjjjjK     ', '   KqjttjjjjjK     ', '   KqqttjjjjjK     ',
  '   KqqttjjjjjK     ', '   KqqttjjjjjK     ', '   KqqttjjjjjK     ', '  KqqqjjjjjjjK     ',
  '  KqqqqqqjjjjK     ', '  KKKKKKKKKKKK     '
];
function face(c, x, y, player, p, flip = false) {
  const seed = Math.abs(Number(player.look) || 0) >>> 0;
  matrix(c, faceRows, x, y, p, 1, flip);
  // Stable hair silhouettes: spikes, high sweep or close crop, shared with portraits.
  if (seed % 3 === 0) { rect(c, x + 4, y - 3, 3, 4, p.h); rect(c, x + 9, y - 2, 2, 3, p.h); rect(c, x + 2, y - 1, 2, 3, p.h); }
  if (seed % 3 === 1) { rect(c, x + 2, y - 1, 10, 3, p.h); rect(c, x + 3, y - 2, 6, 2, p.H); }
  if (seed % 3 === 2) rect(c, x + 5, y, 5, 2, p.H);
}

function makeSprite(player, side, pose, frame, keeper = false) {
  const key = `${player.look || 0}-${player.number || 10}-${side}-${pose}-${frame}-${keeper}`;
  if (sprites.has(key)) return sprites.get(key);
  const canvas = document.createElement('canvas'); canvas.width = 80; canvas.height = 96;
  const c = canvas.getContext('2d'), p = palette(player, side, keeper);
  let hip = [35, 55], chest = [37, 34], head = [36, 13], knees = [[22, 68], [49, 67]], feet = [[12, 84], [59, 87]], elbows = [[21, 40], [53, 44]], hands = [[17, 29], [47, 54]];
  if (pose === 'run') {
    const frames = [
      { k: [[18, 66], [48, 64]], f: [[7, 71], [57, 86]], e: [[24, 46], [54, 39]], h: [[15, 35], [48, 26]] },
      { k: [[29, 69], [42, 72]], f: [[22, 88], [52, 80]], e: [[22, 39], [49, 47]], h: [[17, 29], [44, 57]] },
      { k: [[47, 66], [23, 65]], f: [[59, 73], [12, 87]], e: [[21, 35], [51, 48]], h: [[31, 27], [46, 59]] },
      { k: [[39, 73], [27, 70]], f: [[45, 88], [19, 79]], e: [[22, 40], [52, 45]], h: [[24, 28], [47, 56]] }
    ][frame % 4];
    knees = frames.k; feet = frames.f; elbows = frames.e; hands = frames.h;
    head[1] += frame % 2; chest[1] += frame % 2;
  } else if (pose === 'ready' || pose === 'defend') {
    head = [30, 12]; chest = [31, 34]; knees = [[20, 70], [49, 70]]; feet = [[12, 88], [58, 88]];
    elbows = [[14, 46], [53, 46]]; hands = [[9, 58], [62, 57]];
  } else if (pose === 'kick') {
    head = [26, 10]; chest = [27, 33]; knees = [[26, 73], [56, 52]]; feet = [[21, 88], [74, 48]];
    elbows = [[14, 32], [46, 35]]; hands = [[5, 22], [57, 22]];
  } else if (pose === 'windup') {
    head = [35, 11]; knees = [[25, 71], [51, 58]]; feet = [[20, 88], [65, 69]];
    elbows = [[17, 41], [54, 34]]; hands = [[7, 32], [64, 24]];
  } else if (['jump', 'header', 'volley'].includes(pose)) {
    head = [pose === 'header' ? 41 : 33, 10]; chest = [34, 33]; knees = [[23, 71], [51, 64]]; feet = [[10, 70], [62, 78]];
    elbows = [[17, 31], [55, 30]]; hands = [[16, 15], [58, 13]];
    if (pose === 'volley') { knees[1] = [56, 48]; feet[1] = [72, 28]; head = [21, 14]; chest = [26, 35]; }
  } else if (pose === 'tackle') {
    head = [23, 29]; chest = [26, 49]; hip = [37, 65]; knees = [[23, 76], [56, 73]]; feet = [[10, 76], [75, 76]];
    elbows = [[12, 57], [47, 57]]; hands = [[4, 69], [59, 64]];
  } else if (pose === 'dive' || pose === 'punch') {
    head = [44, 16]; chest = [36, 38]; knees = [[17, 70], [40, 74]]; feet = [[5, 79], [48, 88]];
    elbows = [[42, 20], [60, 25]]; hands = [[59, 6], [72, 12]];
  } else if (pose === 'celebrate') {
    head = [29, 12]; chest = [30, 33]; elbows = [[14, 23], [54, 22]]; hands = [[12, 6], [60, 4]];
    knees = [[25, 72], [47, 71]]; feet = [[20, 88], [55, 88]];
  }
  const arm = i => {
    const shoulder = [chest[0] + (i ? 9 : -7), chest[1] + 3];
    segment(c, shoulder, elbows[i], 7, 5, p.j, p.q);
    const mid = [Math.round((shoulder[0] + elbows[i][0]) / 2), Math.round((shoulder[1] + elbows[i][1]) / 2)];
    segment(c, mid, elbows[i], 5, 4, p.s, p.d); segment(c, elbows[i], hands[i], 4, 3, p.s, p.d);
    rect(c, hands[i][0] - 2, hands[i][1] - 2, keeper ? 5 : 4, keeper ? 6 : 4, keeper ? p.w : p.s);
  };
  const leg = i => {
    const start = [hip[0] + (i ? 5 : -5), hip[1]], knee = knees[i], foot = feet[i];
    const hem = [Math.round(start[0] + (knee[0] - start[0]) * .44), Math.round(start[1] + (knee[1] - start[1]) * .44)];
    segment(c, start, hem, 9, 8, p.n, p.b); segment(c, hem, knee, 6, 5, p.s, p.d);
    segment(c, knee, foot, 5, 3, p.s, p.d);
    const sock = [Math.round(knee[0] + (foot[0] - knee[0]) * .34), Math.round(knee[1] + (foot[1] - knee[1]) * .34)];
    segment(c, sock, foot, 5, 3, p.z, p.Z); rect(c, sock[0] - 2, sock[1], 5, 2, p.t);
    matrix(c, [' KKKKK    ', 'KbbbbbKK  ', 'KbbbtbbbK ', ' KKKKKKKK ', '  w   w   '], foot[0] - 4, foot[1] - 1, p);
  };
  arm(0); leg(0);
  matrix(c, bodyRows, chest[0] - 9, chest[1] - 6, p);
  rect(c, hip[0] - 8, hip[1] - 2, 16, 7, p.n); rect(c, hip[0] - 8, hip[1] - 2, 16, 1, p.w);
  leg(1);
  segment(c, [head[0] + 6, head[1] + 13], [chest[0] + 2, chest[1] - 4], 4, 5, p.s, p.d);
  face(c, head[0], head[1], player, p);
  c.font = 'bold 8px monospace'; c.textAlign = 'center'; c.fillStyle = p.b; c.fillText(String(player.number || 10), chest[0] + 4, chest[1] + 9);
  arm(1);
  sprites.set(key, canvas);
  // Avoid unbounded caches when browsing many seasons and generated clubs.
  if (sprites.size > 550) sprites.delete(sprites.keys().next().value);
  return canvas;
}

function player(c, p, x, y, side, pose = 'ready', frame = 0, scale = 1, flip = false, keeper = false) {
  c.save(); c.translate(Math.round(x), Math.round(y));
  if (flip) c.scale(-1, 1);
  c.drawImage(makeSprite(p || {}, side, pose, frame, keeper), -Math.round(40 * scale), -Math.round(96 * scale), Math.round(80 * scale), Math.round(96 * scale)); c.restore();
}
function text(c, value, x, y, color = '#eff2d9', size = 8, align = 'left') {
  c.font = `bold ${size}px monospace`; c.textAlign = align; c.textBaseline = 'alphabetic';
  c.fillStyle = '#101b30'; c.fillText(String(value), x + 1, y + 1); c.fillStyle = color; c.fillText(String(value), x, y);
}
function shadow(c, x, y, width = 38) { rect(c, x - width / 2 + 3, y - 2, width - 6, 5, '#173c40'); rect(c, x - width / 2, y, width, 2, '#173c40'); }
function ball(c, x, y, angle = 0, large = false) {
  const rows = angle % 2 ? ['  www  ', ' wwwKw ', 'wKKwwwK', 'wKKwwwK', 'wwwwKKw', ' wwwwK ', '  www  '] : ['  www  ', ' wwwww ', 'wwKKKww', 'wwKKKww', 'wKwwwKw', ' wwwwK ', '  www  '];
  matrix(c, rows, Math.round(x - (large ? 7 : 3)), Math.round(y - (large ? 7 : 3)), { w: '#f8f2d8', K: '#1b2e49' }, large ? 2 : 1);
}
function stadium(c, tick, running = false, keeper = false) {
  rect(c, 0, 0, 320, 180, '#14233d'); rect(c, 0, 26, 320, 25, '#283d59'); rect(c, 0, 51, 320, 20, '#4d677a');
  // Distant city and roofline, composed entirely of pixel rectangles.
  for (let i = 0; i < 18; i++) { rect(c, i * 21, 51 - i % 3 * 5, 15, 17 + i % 3 * 5, '#263b57'); rect(c, i * 21 + 3, 52, 2, 2, '#748b8c'); }
  rect(c, 0, 65, 320, 7, '#142940'); rect(c, 0, 65, 320, 1, '#789197');
  for (let i = 0; i < 16; i++) pixelLine(c, [i * 22, 65], [i * 22 + 6, 76], '#38526a', 1);
  for (const x of [33, 283]) {
    rect(c, x, 21, 2, 46, '#698291'); rect(c, x - 14, 17, 30, 12, '#17283e');
    for (let row = 0; row < 2; row++) for (let col = 0; col < 6; col++) rect(c, x - 12 + col * 5, 19 + row * 5, 3, 3, '#eee8be');
    rect(c, x - 17, 16, 36, 1, '#64828b');
  }
  rect(c, 0, 74, 320, 26, '#243c53');
  const crowd = ['#829d9b', '#c7bb8d', '#a78681', '#54788a', '#d7d7b6'];
  for (let row = 0; row < 6; row++) {
    rect(c, 0, 76 + row * 4, 320, 1, '#162c43');
    for (let i = 0; i < 106; i++) { rect(c, i * 3 + row % 2, 75 + row * 4, 1, 1, crowd[(i * 7 + row * 3) % 5]); rect(c, i * 3 + row % 2, 76 + row * 4, 2, 2, crowd[(i * 3 + row * 13) % 5]); }
  }
  rect(c, 0, 99, 320, 8, '#12263b');
  for (let i = -1; i < 7; i++) { const x = i * 56 - (running ? tick * 2 % 56 : 0); rect(c, x, 101, 47, 4, i % 2 ? '#e1be81' : '#7eb7aa'); }
  rect(c, 0, 107, 320, 73, '#387462'); rect(c, 0, 115, 320, 25, '#316b59'); rect(c, 0, 140, 320, 23, '#285d51'); rect(c, 0, 163, 320, 17, '#204b48');
  pixelLine(c, [0, 119], [320, 119], '#a4bc92', 1);
  pixelLine(c, [0, 171], [320, 152], '#aec6a0', 2);
  if (!keeper) pixelLine(c, [293, 107], [233, 180], '#779a7b', 1);
  for (let i = 0; i < 100; i++) { const x = ((i * 41 + 13 - (running ? tick * 3 : 0)) % 323 + 323) % 323; const y = 125 + i * 17 % 55; rect(c, x, y, i % 4 === 0 ? 3 : 1, 1, i % 2 ? '#4e8466' : '#224f4a'); }
}
function goal(c, near = false) {
  const x = near ? 70 : 245, y = near ? 56 : 97, w = near ? 219 : 68, h = near ? 101 : 41;
  rect(c, x, y, w, h, '#2a5659');
  for (let gx = x; gx < x + w; gx += near ? 10 : 5) pixelLine(c, [gx, y], [gx - (near ? 16 : 7), y + h], '#6b9992', 1);
  for (let gy = y; gy < y + h; gy += near ? 9 : 4) rect(c, x, gy, w, 1, '#7da59b');
  rect(c, x - 2, y, 3, h + 2, '#e4e7d3'); rect(c, x + w - 2, y, 3, h + 2, '#e4e7d3'); rect(c, x - 2, y - 2, w + 3, 3, '#f1eed2');
  pixelLine(c, [x - 2, y - 2], [x - 15, y + 12], '#a3b5ad', 2); pixelLine(c, [x - 15, y + 12], [x - 15, y + h], '#a3b5ad', 1);
}
function streaks(c, tick, power = false) {
  for (let i = 0; i < (power ? 16 : 8); i++) {
    const x = ((i * 47 - tick * 13) % 350 + 350) % 350, y = 44 + i * 19 % 115;
    rect(c, x, y, power ? 32 : 16, 1, power ? '#c1d5b8' : '#739f89');
  }
}
function defenderList(match) {
  const side = match.encounter?.side ?? match.turn?.side ?? 0;
  return (match.encounter?.defenders || []).map(id => match.teams?.[1 - side]?.players?.[typeof id === 'object' ? id.id : id]).filter(Boolean);
}
function shortName(p) { return String(p?.name || 'ИГРОК').split(' ')[0].toUpperCase().slice(0, 11); }
function frameScene(c, match, options, elapsed) {
  const tick = options.reducedMotion ? 1 : Math.floor(elapsed * 8), anim = tick % 4;
  let mode = options.mode || match.phase || 'field';
  const replaying = mode === 'result' || Boolean(options.event);
  const e = options.event || (replaying ? match.lastEvent : null) || {}, side = e.side ?? match.turn?.side ?? 0;
  const carrier = e.performer || match.teams?.[match.turn?.side ?? 0]?.players?.[match.turn?.player ?? 9] || {};
  const opponents = e.opponents?.length ? e.opponents : defenderList(match);
  const duel = options.duel;
  const opponent = (duel ? opponents.find(p => p.id === duel.defender) : opponents[0]) || match.teams?.[1 - side]?.players?.[2] || {};
  let label = '';
  if (mode === 'result') mode = options.scene || e.scenes?.[0] || e.kind || 'receive';
  if (mode === 'running') mode = 'field';
  if (mode === 'air' || /^(aerial|header|volley|clear)$/.test(mode)) {
    stadium(c, tick);
    const a = match.air;
    const attacker = a ? match.teams?.[a.side]?.players?.[a.attacker] || carrier : carrier;
    const defender = a
      ? a.defender != null ? match.teams?.[1 - a.side]?.players?.[a.defender] || e.opponents?.find(p => p.id === a.defender) || null : null
      : replaying ? e.opponents?.[0] || null : null;
    shadow(c, 142, 163, 40);
    if (defender) { shadow(c, 210, 161, 35); player(c, defender, 211, 133, 1 - side, 'jump', anim, .95, true); }
    player(c, attacker, 136, 126 - tick % 2, side, mode === 'volley' ? 'volley' : 'header', anim, 1.15);
    ball(c, 169, 32 + tick % 2, anim); pixelLine(c, [174, 10], [171, 23], '#d9dfa7', 1);
    label = mode === 'volley' ? 'УДАР С ЛЁТА!' : mode === 'header' ? 'УДАР ГОЛОВОЙ!' : defender ? 'БОРЬБА В ВОЗДУХЕ' : 'СВОБОДНЫЙ ВЕРХ';
    text(c, `${attacker.height || 184}СМ`, 107, 166, side ? CORAL : MINT, 7);
    if (defender) text(c, `${defender.height || 186}СМ`, 198, 166, side ? MINT : CORAL, 7);
  } else if (['keeper', 'save', 'punch', 'goal', 'miss', 'rebound'].includes(mode)) {
    stadium(c, tick, false, true); goal(c, true);
    const gk = match.teams?.[1 - side]?.players?.[0] || {};
    shadow(c, 190, 160, 52);
    const pose = mode === 'keeper' ? 'defend' : mode === 'punch' ? 'punch' : 'dive';
    if (mode !== 'keeper') {
      c.save(); c.translate(mode === 'goal' ? 169 : 184, 125); c.rotate(mode === 'goal' ? -.52 : .6);
      player(c, gk, 0, 20, 1 - side, pose, anim, 1.05, mode === 'goal', true); c.restore();
    } else player(c, gk, 189, 163, 1 - side, pose, anim, 1.05, false, true);
    const bx = mode === 'keeper' ? 124 : mode === 'goal' ? 259 : mode === 'miss' ? 302 : 225;
    const by = mode === 'keeper' ? 106 : mode === 'goal' ? 105 : mode === 'miss' ? 44 : 81;
    for (let i = 0; i < 4; i++) pixelLine(c, [bx - 43 - i * 4, by + 21 + i * 2], [bx - 10, by + 4], '#b6d9bf', 1);
    ball(c, bx, by, anim, mode === 'keeper');
    label = ({ keeper: 'ПОСЛЕДНИЙ РУБЕЖ', save: 'МЯЧ В РУКАХ!', punch: 'ВРАТАРЬ ОТБИВАЕТ!', goal: 'ГОООЛ!', miss: 'МИМО ВОРОТ', rebound: 'МЯЧ ЕЩЁ В ИГРЕ!' })[mode];
    if (mode === 'goal') { rect(c, 6, 52, 114, 34, '#14233d'); text(c, 'ГОООЛ!', 12, 76, '#e9db88', 23); }
  } else if (mode === 'encounter' || mode === 'command') {
    stadium(c, tick); goal(c);
    const defenders = opponents.length ? opponents : mode === 'encounter' ? [opponent] : [];
    shadow(c, 108, 162, 49); player(c, carrier, 108, 163, side, 'ready', anim, 1.13);
    ball(c, 144, 158, anim);
    defenders.slice(0, 3).forEach((p, index) => {
      const x = defenders.length === 1 ? 237 : 191 + index * 48;
      const current = index === (match.encounter?.index || 0);
      shadow(c, x, 161, 35); player(c, p, x, 162, 1 - side, 'defend', anim, .91, true);
      text(c, `${p.number || p.id + 1} ${shortName(p)}`, x, 175, current ? '#ffe7a2' : '#c3c8b7', 6, 'center');
      if (current) { rect(c, x - 2, 63, 5, 2, '#efd68b'); rect(c, x - 1, 65, 3, 2, '#efd68b'); rect(c, x, 67, 1, 1, '#efd68b'); }
    });
    label = mode === 'encounter' ? `НАВСТРЕЧУ ${defenders.length} СОПЕРНИК${defenders.length === 1 ? '' : 'А'}` : 'ВЫБЕРИ ПРОДОЛЖЕНИЕ';
  } else if (['tackle', 'intercept', 'block', 'dribble', 'breakthrough'].includes(mode)) {
    stadium(c, tick); streaks(c, tick);
    const progress = options.reducedMotion ? .5 : clamp(options.progress || .5, 0, 1);
    const defenderX = mode === 'tackle' ? 230 - progress * 105 : 222;
    shadow(c, 118, 163, 47); shadow(c, defenderX, 165, 44);
    const attack = String(typeof duel?.action === 'object' ? duel.action.type : duel?.action || 'dribble');
    const releasesBall = /pass|cross|shoot|special|combo/.test(attack);
    const jumps = !releasesBall && ['dribble', 'breakthrough'].includes(mode);
    player(c, carrier, 111 + (duel?.success || releasesBall ? 0 : progress * 30), jumps ? 151 : 162, side, releasesBall ? 'kick' : jumps ? 'jump' : 'run', anim, 1.1);
    player(c, opponent, defenderX, 168, 1 - side, mode === 'tackle' ? 'tackle' : mode === 'block' ? 'jump' : 'defend', anim, 1.05, true);
    const ballX = mode === 'intercept' && duel?.success ? 198 : mode === 'tackle' && duel?.success ? 168 : releasesBall ? 147 + progress * 134 : 147 + progress * 21;
    ball(c, ballX, releasesBall && !duel?.success ? 135 - progress * 9 : 156, anim);
    label = duel?.style === 'hold' ? `${shortName(opponent)}: ПРОПУСКАЕТ` : `${shortName(opponent)}: ${mode === 'tackle' ? 'ПОДКАТ!' : mode === 'intercept' ? 'ПЕРЕХВАТ!' : mode === 'block' ? 'БЛОК!' : 'ПРОРЫВ!'}`;
    if (duel) {
      const winnerSide = duel.success ? duel.side ?? 1 - side : side;
      const defenderName = shortName(duel.defenderName ? { name: duel.defenderName } : opponent);
      const actorName = shortName(duel.actorName ? { name: duel.actorName } : carrier);
      const stopLabel = mode === 'intercept' ? 'ПЕРЕХВАТ!' : mode === 'block' ? 'БЛОК!' : 'ОТБОР!';
      text(c, duel.success ? `${defenderName}: ${stopLabel}` : `${actorName} ПРОХОДИТ!`, 160, 49, winnerSide ? CORAL : MINT, 7, 'center');
    }
  } else if (['shot', 'windup', 'pass', 'cross', 'flight'].includes(mode)) {
    stadium(c, tick); goal(c); streaks(c, tick, ['shot', 'flight'].includes(mode));
    shadow(c, 120, 166, 48);
    player(c, carrier, 116, 164, side, mode === 'windup' ? 'windup' : 'kick', anim, 1.2);
    const bx = mode === 'windup' ? 151 : 176 + Math.floor((options.progress || .5) * 113), by = mode === 'cross' || mode === 'flight' ? 72 : 131;
    for (let i = 0; i < 4; i++) rect(c, bx - 18 - i * 8, by + i % 2, 8, 1, '#d5e2ad');
    ball(c, bx, by, anim, mode === 'shot');
    label = mode === 'pass' ? 'ТОЧНЫЙ ПАС!' : mode === 'cross' ? 'ВЫСОКИЙ НАВЕС!' : mode === 'flight' ? 'МЯЧ ЛЕТИТ!' : mode === 'windup' ? String(e.skill || 'ЗАМАХ!').toUpperCase() : String(e.skill || 'УДАР ПО ВОРОТАМ!').toUpperCase();
  } else {
    const moving = !['halftime', 'finished'].includes(match.status);
    stadium(c, tick, moving); goal(c);
    player(c, match.teams?.[1 - side]?.players?.[3] || {}, 271, 132, 1 - side, 'run', anim, .4, true);
    player(c, match.teams?.[side]?.players?.[7] || {}, 60, 133, side, 'run', (anim + 2) % 4, .4);
    shadow(c, 149, 165, 51); player(c, carrier, 144, 164, side, moving ? 'run' : 'ready', anim, 1.17);
    const bx = 183 + (moving ? [0, 2, 5, 2][anim] : 0); shadow(c, bx, 166, 10); ball(c, bx, 157 - [0, 2, 0, 1][anim], anim);
    label = match.status === 'halftime' ? 'ПЕРЕРЫВ' : match.status === 'finished' ? 'ФИНАЛЬНЫЙ СВИСТОК' : mode === 'target' || mode === 'pass' ? 'НАЙДИ АДРЕСАТА' : 'ВПЕРЁД К ВОРОТАМ';
  }
  rect(c, 0, 0, WIDTH, 2, '#0c182e'); rect(c, 0, 178, WIDTH, 2, '#0c182e');
  text(c, label.slice(0, 39), 9, 14, '#e9d5a2', 8);
  text(c, `№${carrier.number || 10} ${shortName(carrier)}`, 9, 27, side ? CORAL : MINT, 7);
  if (mode !== 'encounter') text(c, 'TMGF', 310, 174, '#93afac', 6, 'right');
}

export function drawScene(canvas, match, { reducedMotion = false, mode = null, event = null, scene = null, duel = null, progress = null } = {}) {
  active.get(canvas)?.();
  const c = canvas.getContext('2d'); if (!c) return () => {};
  const buffer = document.createElement('canvas'); buffer.width = WIDTH; buffer.height = HEIGHT;
  const bc = buffer.getContext('2d'); bc.imageSmoothingEnabled = false;
  canvas.style.imageRendering = 'pixelated';
  let alive = true, raf = 0, last = -Infinity;
  const start = performance.now();
  const opts = { reducedMotion: reducedMotion || Boolean(globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches), mode, event, scene, duel, progress };
  function frame(now) {
    if (!alive) return;
    if (opts.reducedMotion || now - last >= 1000 / 24) {
      const elapsed = (now - start) / 1000;
      opts.progress = progress ?? clamp(elapsed / .32, 0, 1);
      frameScene(bc, match, opts, elapsed);
      const bounds = canvas.getBoundingClientRect(), dpr = Math.min(globalThis.devicePixelRatio || 1, 2);
      const width = Math.max(1, Math.round((bounds.width || 960) * dpr)), height = Math.max(1, Math.round((bounds.height || (bounds.width || 960) * 9 / 16) * dpr));
      if (canvas.width !== width || canvas.height !== height) { canvas.width = width; canvas.height = height; }
      const fit = Math.min(width / WIDTH, height / HEIGHT), drawWidth = Math.round(WIDTH * fit), drawHeight = Math.round(HEIGHT * fit);
      c.imageSmoothingEnabled = false; c.fillStyle = '#111b30'; c.fillRect(0, 0, width, height);
      c.drawImage(buffer, Math.floor((width - drawWidth) / 2), Math.floor((height - drawHeight) / 2), drawWidth, drawHeight); last = now;
    }
    if (!opts.reducedMotion) raf = requestAnimationFrame(frame);
  }
  const resize = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(() => { last = -Infinity; if (opts.reducedMotion) frame(performance.now()); });
  resize?.observe(canvas); frame(start);
  function cleanup() { alive = false; cancelAnimationFrame(raf); resize?.disconnect(); if (active.get(canvas) === cleanup) active.delete(canvas); }
  active.set(canvas, cleanup); return cleanup;
}

export function playSequence(container, event, performer = {}, { match, reducedMotion = false } = {}) {
  if (!container || !event) return Promise.resolve();
  sequences.get(container)?.();
  const canvas = document.createElement('canvas'); canvas.setAttribute('aria-label', 'Повтор игрового эпизода');
  Object.assign(canvas.style, { position: 'absolute', inset: '0', width: '100%', height: '100%', pointerEvents: 'none', zIndex: '25', imageRendering: 'pixelated' });
  if (getComputedStyle(container).position === 'static') container.style.position = 'relative';
  container.append(canvas);
  const dummy = event.performer || performer;
  const source = match || { status: 'playing', teams: [{ players: Array.from({ length: 11 }, () => dummy) }, { players: Array.from({ length: 11 }, () => ({ ...dummy, look: 26 })) }], turn: { side: event.side || 0, player: 0 } };
  const replay = { ...source, phase: 'result', air: source.air, lastEvent: { ...event, performer: dummy } };
  const duels = event.duels || [];
  const stopped = duels.length > 0 && duels.at(-1).success;
  const duelScenes = ['dribble', 'tackle', 'intercept', 'block', 'breakthrough'];
  const shots = stopped ? [] : (event.scenes || [event.kind]).filter(s => s && !['run', 'encounter'].includes(s) && (!duels.length || !duelScenes.includes(s)));
  const scenes = [...duels.map(d => ({ scene: d.style === 'hold' ? 'breakthrough' : d.style || 'tackle', duel: d })), ...shots.map(s => ({ scene: s }))];
  if (!scenes.length) scenes.push({ scene: event.kind || 'receive' });
  const duration = reducedMotion ? 360 : Math.min(2000, Math.max(750, scenes.length * 220));
  let cleanup = () => {}, timer = 0, cancelled = false;
  return new Promise(resolve => {
    function finish() { if (cancelled) return; cancelled = true; clearTimeout(timer); cleanup(); canvas.remove(); if (sequences.get(container) === finish) sequences.delete(container); resolve(); }
    sequences.set(container, finish);
    let index = 0;
    function next() {
      if (cancelled) return;
      cleanup();
      if (index >= scenes.length) { finish(); return; }
      const item = scenes[index++];
      cleanup = drawScene(canvas, replay, { mode: 'result', event: replay.lastEvent, scene: item.scene, duel: item.duel, reducedMotion, progress: reducedMotion ? .75 : null });
      timer = setTimeout(next, duration / scenes.length);
    }
    next();
  });
}

/** The club portrait shares precisely the match sprite's skin, eyes and hair palette. */
export function pixelPortrait(player = {}, size = 96) {
  const p = palette(player), pixels = [];
  const plot = (x, y, w, h, color) => pixels.push(`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${color}"/>`);
  plot(0, 0, 32, 32, '#233951'); plot(1, 1, 30, 30, '#314e61');
  for (let i = 0; i < 4; i++) plot(3 + i * 8, 0, 2, 32, '#3e6170');
  plot(2, 28, 28, 4, p.K); plot(5, 25, 22, 7, p.j); plot(10, 23, 13, 9, p.j); plot(14, 24, 4, 8, p.t); plot(13, 22, 6, 4, p.s);
  faceRows.forEach((row, y) => [...row].forEach((ch, x) => { if (p[ch]) plot(x + 7, y + 6, 1, 1, p[ch]); }));
  const seed = Math.abs(Number(player.look) || 0) >>> 0;
  if (seed % 3 === 0) { plot(11, 3, 3, 4, p.h); plot(16, 4, 2, 3, p.h); plot(9, 5, 2, 3, p.h); }
  if (seed % 3 === 1) { plot(9, 5, 10, 3, p.h); plot(10, 4, 6, 2, p.H); }
  if (seed % 3 === 2) plot(12, 6, 5, 2, p.H);
  const dimension = clamp(Number(size) || 96, 24, 600);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${dimension}" height="${dimension}" viewBox="0 0 32 32" shape-rendering="crispEdges" role="img" aria-label="Пиксельный портрет игрока">${pixels.join('')}</svg>`;
}
