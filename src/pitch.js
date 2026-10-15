// All artwork is original vector/canvas drawing; no image or font downloads.
import { previewAction } from './engine.js';

const MINT = '#73f5c2';
const CORAL = '#ff8b7b';
const activePitches = new WeakMap();
const activeCutscenes = new WeakMap();
const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

/** A compact, original sports-anime portrait, safe to insert as inline SVG. */
export function portrait(player = {}, size = 96) {
  const seed = Math.abs(Number(player.look) || 0) >>> 0;
  const dimension = clamp(Number(size) || 96, 24, 600);
  const skin = ['#edb99b', '#e4a582', '#b77a5c', '#f4cdb3'][seed % 4];
  const hair = ['#1e253b', '#d9e9e4', '#a96b45', '#343b5a', '#e2b565', '#832f50'][Math.floor(seed / 4) % 6];
  const accent = seed % 3 === 0 ? CORAL : MINT;
  const id = `portrait-${seed}-${dimension}`;
  const hairstyles = [
    'M24 57 18 30 30 35 34 12 47 26 57 9 65 27 82 20 81 39 89 47 80 65 72 43 62 50 58 31 46 48 40 37 31 59Z',
    'M23 63 18 42 25 26 38 18 58 16 74 24 83 41 81 65 73 46 62 49 58 34 47 47 40 33 31 46 30 64Z',
    'M22 59 21 37 32 23 58 14 79 25 87 41 79 66 72 44 66 33 55 39 39 37 29 51 30 64Z',
    'M22 61 20 35 27 20 45 17 50 10 62 19 74 19 84 35 81 64 73 49 70 31 59 46 54 30 43 49 35 36 29 65Z',
    'M22 65 17 46 24 28 38 17 62 15 79 27 87 48 80 70 73 43 65 39 57 56 54 31 45 47 38 35 30 51 30 68Z',
    'M21 60 16 38 24 41 25 24 37 30 43 11 54 26 69 13 72 32 85 29 80 61 73 44 62 42 55 34 47 47 39 40 30 62Z'
  ];
  const number = clamp(Math.floor(Number(player.number) || 10), 1, 99);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${dimension}" height="${dimension}" viewBox="0 0 108 108" role="img" aria-label="Портрет игрока"><defs><linearGradient id="${id}" x2="1" y2="1"><stop stop-color="#293b52"/><stop offset="1" stop-color="#102c2c"/></linearGradient><clipPath id="${id}-clip"><rect width="108" height="108" rx="15"/></clipPath></defs><g clip-path="url(#${id}-clip)"><path fill="url(#${id})" d="M0 0h108v108H0z"/><path fill="${accent}" opacity=".16" d="M66 0h28L40 108H12zM102 0h9L57 108h-9z"/><path stroke="${accent}" stroke-width="1" opacity=".35" d="M0 82 108 23M0 97 108 38"/><path fill="#121e2c" d="M7 108 12 91 35 81h38l23 10 8 17"/><path fill="${accent}" d="m13 94 22-11 19 12 19-12 22 11 8 14H6z"/><path fill="#122e34" d="m35 83 19 12 19-12-5 25H40z"/><path fill="${skin}" stroke="#322932" stroke-width="1.3" d="M43 71h22v15L54 94 43 86z"/><path fill="#a36959" opacity=".5" d="m43 74 22-1-4 10-18 3z"/><path fill="${skin}" stroke="#322932" stroke-width="1.5" d="M27 47q-8-3-6 8 1 9 9 8M78 47q8-3 6 8-1 9-9 8M28 38q26-24 51 0l-3 25-8 14-14 8-14-8-9-13z"/><path fill="#d48d74" opacity=".4" d="m71 42 6 1-3 21-8 12-11 6 8-17z"/><path fill="${hair}" stroke="#15202e" stroke-width="1.5" stroke-linejoin="round" d="${hairstyles[seed % hairstyles.length]}"/><path fill="none" stroke="#ffffff" opacity=".12" stroke-width="3" d="m34 30 9-7m18 0 9 9"/><path fill="white" d="m33 54 15 2-4 6-8-1zM60 56l15-2-3 7-8 1z"/><path fill="${accent}" d="m39 55 6 1-1 6-5-1zM64 56l6-1v6l-6 1z"/><path fill="#192637" d="m41 55 2 1v5h-2zM66 56l2-1v6h-2z"/><path fill="none" stroke="#202432" stroke-width="2.4" stroke-linecap="round" d="m32 51 15 3m14 0 14-3"/><path fill="none" stroke="#a66c5e" stroke-width="1.2" d="m54 57-3 9 5 1"/><path fill="none" stroke="#623f41" stroke-width="1.7" stroke-linecap="round" d="m46 73 14-1"/><path fill="white" opacity=".6" d="m47 72 10-.7-4 2z"/><path fill="none" stroke="#fff" stroke-width="2" opacity=".65" d="m18 95 8-4m55 0 8 4"/><text x="54" y="107" text-anchor="middle" font-family="Arial,sans-serif" font-size="10" font-weight="900" fill="${accent}">${number}</text></g></svg>`;
}

/** Replaces any previous renderer attached to this canvas and returns its cleanup. */
export function drawPitch(canvas, match, options = {}) {
  activePitches.get(canvas)?.();
  const ctx = canvas.getContext('2d');
  if (!ctx) return () => {};
  let geometry;
  let tokens = [];
  let disposed = false;
  const circle = (x, y, radius, fill, stroke, width = 1) => {
    ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2);
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = width; ctx.stroke(); }
  };
  function render() {
    if (disposed) return;
    const bounds = canvas.getBoundingClientRect();
    const width = Math.max(280, bounds.width || canvas.clientWidth || 900);
    const height = Math.max(190, bounds.height || width * .61);
    const dpr = Math.min(globalThis.devicePixelRatio || 1, 2.5);
    canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const padX = width < 500 ? 22 : 41;
    const padY = height < 300 ? 25 : 39;
    const field = { x: padX, y: padY, w: width - padX * 2, h: height - padY * 2 };
    geometry = { ...field, width, height, cw: field.w / 12, ch: field.h / 7 };
    const { x, y, w, h } = field;
    const cx = col => x + (col + .5) * w / 12;
    const cy = row => y + (row + .5) * h / 7;
    const radius = clamp(Math.min(w / 12, h / 7) * .29, 8.5, 17);
    const stadium = ctx.createLinearGradient(0, 0, width, height);
    stadium.addColorStop(0, '#12232b'); stadium.addColorStop(.5, '#0c1922'); stadium.addColorStop(1, '#17232e');
    ctx.fillStyle = stadium; ctx.fillRect(0, 0, width, height);

    // Tiny crowd lights and four broad beams give depth without moving every frame.
    for (let i = 0; i < 95; i++) {
      const px = ((i * 73 + 19) % 997) / 997 * width;
      const py = i % 2 ? 9 + (i % 9) : height - 9 - (i % 9);
      ctx.fillStyle = i % 4 === 0 ? '#ffbe8b66' : '#87d7d544';
      ctx.fillRect(px, py, i % 3 === 0 ? 3 : 2, 2);
    }
    for (const bx of [width * .13, width * .87]) {
      for (const by of [0, height]) {
        const glow = ctx.createRadialGradient(bx, by, 1, bx, by, width * .34);
        glow.addColorStop(0, '#cbffe61c'); glow.addColorStop(1, '#cbffe600');
        ctx.fillStyle = glow; ctx.fillRect(0, 0, width, height);
        ctx.fillStyle = '#d4f7ee'; ctx.fillRect(bx - 13, by === 0 ? 3 : height - 7, 26, 3);
      }
    }
    ctx.shadowBlur = 25; ctx.shadowColor = '#000a';
    ctx.fillStyle = '#183e35'; ctx.fillRect(x, y, w, h); ctx.shadowBlur = 0;
    const turf = ctx.createLinearGradient(0, y, 0, y + h);
    turf.addColorStop(0, '#225647'); turf.addColorStop(1, '#153d35');
    ctx.fillStyle = turf; ctx.fillRect(x, y, w, h);
    for (let col = 0; col < 12; col++) {
      if (col % 2 === 0) { ctx.fillStyle = '#ccffe805'; ctx.fillRect(x + col * w / 12, y, w / 12, h); }
    }
    // Tactical hints use the same rule as the engine preview, so markers are actionable.
    const actor = match.teams[match.turn.side].players[match.turn.player];
    if (match.turn.side === 0 && !match.air && match.status === 'playing') {
      for (let row = 0; row < 7; row++) for (let col = 1; col < 11; col++) {
        if (previewAction(match, { type: 'move', x: col, y: row }).allowed) {
          circle(cx(col), cy(row), 2.4, '#9bffcc48');
        }
      }
    }
    ctx.lineWidth = 1; ctx.strokeStyle = '#c7fbe90c';
    ctx.beginPath();
    for (let col = 1; col < 12; col++) { ctx.moveTo(x + col * w / 12, y); ctx.lineTo(x + col * w / 12, y + h); }
    for (let row = 1; row < 7; row++) { ctx.moveTo(x, y + row * h / 7); ctx.lineTo(x + w, y + row * h / 7); }
    ctx.stroke();
    ctx.strokeStyle = '#bfeada80'; ctx.lineWidth = 1.35;
    ctx.strokeRect(x, y, w, h);
    ctx.beginPath(); ctx.moveTo(x + w / 2, y); ctx.lineTo(x + w / 2, y + h); ctx.stroke();
    ctx.save(); ctx.translate(x + w / 2, y + h / 2); ctx.scale(1, h / w * 1.65);
    circle(0, 0, w * .107, null, '#bfeada80', 1.35); ctx.restore();
    circle(x + w / 2, y + h / 2, 2, '#c9f2df');
    for (const side of [0, 1]) {
      const goalX = side === 0 ? x : x + w;
      const sign = side === 0 ? 1 : -1;
      ctx.strokeStyle = '#bfeada75';
      ctx.strokeRect(side === 0 ? x : x + w - w * .145, y + h * .21, w * .145, h * .58);
      ctx.strokeRect(side === 0 ? x : x + w - w * .055, y + h * .35, w * .055, h * .3);
      circle(goalX + sign * w * .104, y + h / 2, 1.8, '#c9f2df');
      // Netting sits outside the touchline.
      const netW = Math.min(padX - 6, 19), netY = y + h * .365, netH = h * .27;
      const netX = side === 0 ? x - netW : x + w;
      ctx.fillStyle = '#d5f2e50b'; ctx.fillRect(netX, netY, netW, netH);
      ctx.strokeStyle = '#cdeade44'; ctx.lineWidth = .65;
      for (let ny = netY; ny <= netY + netH; ny += 5) { ctx.beginPath(); ctx.moveTo(netX, ny); ctx.lineTo(netX + netW, ny); ctx.stroke(); }
      for (let nx = netX; nx <= netX + netW; nx += 5) { ctx.beginPath(); ctx.moveTo(nx, netY); ctx.lineTo(nx, netY + netH); ctx.stroke(); }
      ctx.strokeStyle = '#e8fff0aa'; ctx.lineWidth = 2; ctx.strokeRect(netX, netY, netW, netH);
    }
    if (options.targetCell) {
      const target = options.targetCell;
      if (Number.isFinite(target.x) && Number.isFinite(target.y)) {
        ctx.setLineDash([5, 5]); ctx.strokeStyle = '#ceffe2bb'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(cx(actor.x), cy(actor.y)); ctx.lineTo(cx(target.x), cy(target.y)); ctx.stroke(); ctx.setLineDash([]);
        circle(cx(target.x), cy(target.y), radius + 5, '#bdffcf19', '#d7f9bf', 1.5);
      }
    }
    if (match.air) {
      const attacker = match.teams[match.air.side].players[match.air.attacker];
      const ax = cx(attacker.x), ay = cy(attacker.y);
      ctx.setLineDash([4, 4]); circle(ax, ay, radius * 2.15, '#eec97c12', '#f7cf83cc', 1.4); ctx.setLineDash([]);
      ctx.font = `700 ${width < 500 ? 8 : 10}px Arial,sans-serif`; ctx.textAlign = 'center'; ctx.fillStyle = '#ffe1a3';
      ctx.fillText('ВЕРХОВОЙ МЯЧ', ax, Math.max(y + 12, ay - radius * 2.5));
    }
    tokens = [];
    const occupied = new Map();
    match.teams.forEach((team, side) => team.players.forEach(player => {
      const key = `${player.x},${player.y}`;
      if (!occupied.has(key)) occupied.set(key, []);
      occupied.get(key).push({ player, side });
    }));
    for (const group of occupied.values()) group.forEach(({ player, side }, index) => {
      // Teams can converge on one cell. Keep every number visible and selectable.
      const angle = group.length === 2 ? index * Math.PI - Math.PI * .85 : index * Math.PI * 2 / group.length - Math.PI / 2;
      const spread = group.length < 2 ? 0 : radius * (group.length === 2 ? .65 : group.length < 5 ? 1.05 : 1.45);
      tokens.push({ player, side, x: cx(player.x) + Math.cos(angle) * spread, y: cy(player.y) + Math.sin(angle) * spread, radius });
    });
    // Selected/possessing players sit on top of a crowded cell.
    tokens.sort((a, b) => Number(a.side === 0 && a.player.id === options.selectedPlayer) - Number(b.side === 0 && b.player.id === options.selectedPlayer));
    for (const token of tokens) {
      const { player, side, x: tx, y: ty } = token;
      const color = side === 0 ? MINT : CORAL;
      const hasBall = match.turn.side === side && match.turn.player === player.id;
      const selected = side === 0 && player.id === options.selectedPlayer;
      if (hasBall) {
        const halo = ctx.createRadialGradient(tx, ty, radius, tx, ty, radius * 2.3);
        halo.addColorStop(0, `${color}40`); halo.addColorStop(1, `${color}00`);
        ctx.fillStyle = halo; ctx.fillRect(tx - radius * 2.5, ty - radius * 2.5, radius * 5, radius * 5);
      }
      if (selected) circle(tx, ty, radius + 5, null, '#effff5', 1.5);
      ctx.shadowColor = '#0009'; ctx.shadowBlur = 7; ctx.shadowOffsetY = 3;
      circle(tx, ty, radius, side === 0 ? '#153f38' : '#442f34', color, hasBall ? 2.5 : 1.5);
      ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
      // Shirt shoulders and a contrasting captain slash make tokens read as players.
      ctx.fillStyle = `${color}28`; ctx.beginPath(); ctx.arc(tx, ty, radius - 2, 0, Math.PI); ctx.fill();
      ctx.font = `800 ${Math.round(radius * .87)}px Arial,sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = '#f0fff6'; ctx.fillText(String(player.number), tx, ty + .5);
      if (player.id === 0) { ctx.fillStyle = '#ffdb8f'; ctx.fillRect(tx - radius * .42, ty + radius - 2, radius * .84, 2); }
      if (player.energy < 35) circle(tx + radius * .8, ty - radius * .65, 2.5, '#ffc16e', '#182a2a');
      if (hasBall) {
        const bx = tx + radius * .88, by = ty + radius * .88;
        circle(bx, by, radius * .36, '#fff8de', '#142b2b', 1.1);
        circle(bx, by, radius * .12, '#25353a');
        ctx.strokeStyle = '#25353a'; ctx.lineWidth = .7;
        for (let i = 0; i < 5; i++) {
          const angle = i * Math.PI * .4;
          ctx.beginPath(); ctx.moveTo(bx + Math.cos(angle) * radius * .13, by + Math.sin(angle) * radius * .13);
          ctx.lineTo(bx + Math.cos(angle) * radius * .3, by + Math.sin(angle) * radius * .3); ctx.stroke();
        }
      }
    }
    ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left';
    ctx.font = `600 ${width < 500 ? 8 : 9}px Arial,sans-serif`; ctx.fillStyle = '#b5dac78c';
    ctx.fillText('МАЯК АРЕНА  /  НОЧНОЙ МАТЧ', x, height - 10);
    ctx.textAlign = 'right'; ctx.fillStyle = MINT; ctx.fillText('АТАКА →', x + w, height - 10);
  }
  function select(event) {
    if (!geometry || disposed) return;
    const bounds = canvas.getBoundingClientRect();
    const px = (event.clientX - bounds.left) * geometry.width / bounds.width;
    const py = (event.clientY - bounds.top) * geometry.height / bounds.height;
    const token = tokens.map(t => ({ ...t, d: Math.hypot(t.x - px, t.y - py) })).filter(t => t.d <= t.radius + 5).sort((a, b) => a.d - b.d)[0];
    if (token) { options.onSelectPlayer?.(token.player.id, token.side); return; }
    const col = Math.floor((px - geometry.x) / geometry.cw);
    const row = Math.floor((py - geometry.y) / geometry.ch);
    if (col >= 0 && col < 12 && row >= 0 && row < 7) options.onSelectCell?.({ x: col, y: row });
  }
  canvas.addEventListener('pointerup', select);
  const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(render) : null;
  observer?.observe(canvas);
  render();
  function cleanup() {
    disposed = true; canvas.removeEventListener('pointerup', select); observer?.disconnect();
    if (activePitches.get(canvas) === cleanup) activePitches.delete(canvas);
  }
  activePitches.set(canvas, cleanup);
  return cleanup;
}

function ensureCutsceneStyles() {
  if (document.getElementById('tmgf-cutin-styles')) return;
  const style = document.createElement('style'); style.id = 'tmgf-cutin-styles';
  style.textContent = `
  .tmgf-cutin{position:absolute;inset:0;z-index:30;overflow:hidden;pointer-events:none;display:flex;align-items:center;justify-content:center;background:linear-gradient(110deg,#08171ce8,#173939b8 55%,#07171bea);animation:tmgf-cutin-in .18s ease-out both;color:#f2fff7;isolation:isolate}
  .tmgf-cutin:before{content:'';position:absolute;inset:-70%;z-index:-1;background:repeating-conic-gradient(from 35deg at 35% 48%,transparent 0deg 7deg,#a7f7dd18 7.2deg 7.7deg,transparent 8deg 15deg);transform:scaleX(2);animation:tmgf-streak .8s ease-out both}
  .tmgf-cutin:after{content:'';position:absolute;width:125%;height:69%;border-block:2px solid var(--cutin-accent);background:linear-gradient(100deg,#0c242d,transparent);transform:rotate(-7deg);z-index:-1;box-shadow:0 0 60px #73f5c221}
  .tmgf-cutin-art{width:clamp(140px,29%,255px);transform:rotate(-6deg) scale(1.15);filter:drop-shadow(10px 12px 0 #061619aa);animation:tmgf-portrait .5s cubic-bezier(.15,.8,.2,1) both}
  .tmgf-cutin-art svg{width:100%;height:auto;display:block;border-radius:18px}
  .tmgf-cutin-copy{position:relative;max-width:53%;margin-left:3%;transform:rotate(-5deg);text-align:left;animation:tmgf-title .3s .07s ease-out both}
  .tmgf-cutin-kicker{font:800 10px/1.4 Arial,sans-serif;letter-spacing:3px;color:var(--cutin-accent);margin-bottom:9px;text-transform:uppercase}
  .tmgf-cutin-title{font:1000 clamp(23px,5vw,66px)/.95 Arial,sans-serif;letter-spacing:-2px;font-style:italic;text-transform:uppercase;text-shadow:4px 4px 0 #07181d,0 0 35px #73f5c235;overflow-wrap:anywhere}
  .tmgf-cutin-detail{font:600 clamp(10px,1.3vw,14px)/1.4 Arial,sans-serif;color:#d2e4dc;margin-top:12px;max-width:340px}
  .tmgf-cutin-ball{position:absolute;right:12%;bottom:10%;width:39px;height:39px;border-radius:50%;background:radial-gradient(circle at 45% 42%,#24383a 0 17%,#ffffed 19% 60%,#b8d6c4 65%);box-shadow:0 0 25px #ccffe7,90px -18px 0 -16px #fff8;animation:tmgf-ball .7s ease-out both}
  .tmgf-cutin-goal .tmgf-cutin-title{color:#d7ffad;font-size:clamp(42px,10vw,114px);letter-spacing:-6px}.tmgf-cutin-goal:after{border-color:#dbff9f}
  .tmgf-cutin-still,.tmgf-cutin-still *,.tmgf-cutin-still:before{animation:none!important}
  @keyframes tmgf-cutin-in{from{opacity:0}to{opacity:1}}@keyframes tmgf-streak{from{translate:8% 0}to{translate:-6% 0}}
  @keyframes tmgf-portrait{from{opacity:0;translate:-45px 7px}to{opacity:1;translate:0 0}}@keyframes tmgf-title{from{opacity:0;translate:50px 0}to{opacity:1;translate:0 0}}
  @keyframes tmgf-ball{0%{opacity:0;translate:250px 60px;scale:.5}35%{opacity:1}100%{opacity:0;translate:-250px -40px;scale:1.6}}
  @media(prefers-reduced-motion:reduce){.tmgf-cutin,.tmgf-cutin *,.tmgf-cutin:before{animation:none!important}}
  `;
  document.head.append(style);
}

/** Short, non-blocking cut-ins: text enters through textContent, never HTML. */
export function playCutscene(container, event = {}, player = {}, { reducedMotion = false } = {}) {
  if (!container) return Promise.resolve();
  activeCutscenes.get(container)?.();
  ensureCutsceneStyles();
  const kind = String(event.kind || 'move');
  const titles = { goal: 'Го-о-ол!', save: 'Страж ворот', intercept: 'Перехват!', 'aerial-lost': 'Небесный заслон', cross: 'Взлёт мяча', rebound: 'Второй шанс', miss: 'Выше ворот', lost: 'Чистый отбор', recover: 'Второе дыхание', control: 'Идеальный приём', pass: 'Точная связь', move: 'На прорыв!', header: 'Удар головой', volley: 'Небесная молния' };
  const root = document.createElement('div');
  root.className = `tmgf-cutin${kind === 'goal' ? ' tmgf-cutin-goal' : ''}${reducedMotion ? ' tmgf-cutin-still' : ''}`;
  root.style.setProperty('--cutin-accent', event.side === 1 ? CORAL : MINT);
  root.setAttribute('role', 'status'); root.setAttribute('aria-live', 'polite');
  const art = document.createElement('div'); art.className = 'tmgf-cutin-art'; art.setAttribute('aria-hidden', 'true'); art.innerHTML = portrait(player, 240);
  const copy = document.createElement('div'); copy.className = 'tmgf-cutin-copy';
  const kicker = document.createElement('div'); kicker.className = 'tmgf-cutin-kicker'; kicker.textContent = kind === 'goal' ? 'МОМЕНТ ТРИУМФА' : 'TACTIC MEGADRIVE FOOTBALL';
  const title = document.createElement('div'); title.className = 'tmgf-cutin-title';
  title.textContent = String(titles[kind] || event.skill || 'Решающий момент').slice(0, 42);
  const detail = document.createElement('div'); detail.className = 'tmgf-cutin-detail'; detail.textContent = String(event.text || player.name || '').slice(0, 100);
  copy.append(kicker, title, detail); root.append(art, copy);
  const ball = document.createElement('div'); ball.className = 'tmgf-cutin-ball'; ball.setAttribute('aria-hidden', 'true'); root.append(ball);
  // The caller normally supplies an already positioned arena. Standalone usage also works.
  if (getComputedStyle(container).position === 'static') container.style.position = 'relative';
  container.append(root);
  return new Promise(resolve => {
    let timer;
    const finish = () => {
      clearTimeout(timer); root.remove();
      if (activeCutscenes.get(container) === finish) activeCutscenes.delete(container);
      resolve();
    };
    activeCutscenes.set(container, finish);
    timer = setTimeout(finish, reducedMotion ? 300 : 820);
  });
}
