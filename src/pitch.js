import { pixelPortrait, playSequence } from './scene.js';

const active = new WeakMap();
const HOME = '#8ae3c0', AWAY = '#ed8583';
export const portrait = (player = {}, size = 96) => pixelPortrait(player, size);
export const playCutscene = (container, event, player, options) => playSequence(container, event, player, options);

/** Secondary pixel tactical view, using exact engine grid dimensions. */
export function drawPitch(canvas, match, options = {}) {
  active.get(canvas)?.();
  const ctx = canvas.getContext('2d'); if (!ctx) return () => {};
  const cols = Math.max(2, Number(match.field?.width) || 25), rows = Math.max(2, Number(match.field?.height) || 15);
  const interactive = options.interactive !== false;
  const buffer = document.createElement('canvas'); buffer.width = 320; buffer.height = 180;
  const c = buffer.getContext('2d'); c.imageSmoothingEnabled = false;
  const field = { x: 12, y: 15, w: 296, h: 150 };
  const cw = field.w / cols, ch = field.h / rows;
  const cx = col => Math.round(field.x + (col + .5) * cw), cy = row => Math.round(field.y + (row + .5) * ch);
  let tokens = [], disposed = false;
  canvas.style.imageRendering = 'pixelated';
  const box = (x, y, w, h, color) => { c.fillStyle = color; c.fillRect(Math.round(x), Math.round(y), Math.max(1, Math.round(w)), Math.max(1, Math.round(h))); };
  const frame = (x, y, w, h, color) => { box(x, y, w, 1, color); box(x, y + h, w, 1, color); box(x, y, 1, h, color); box(x + w, y, 1, h + 1, color); };
  function render() {
    if (disposed) return;
    box(0, 0, 320, 180, '#10283a'); box(field.x, field.y, field.w, field.h, '#2d624f');
    for (let col = 0; col < cols; col++) if (col % 2 === 0) box(field.x + col * cw, field.y, cw, field.h, '#326b56');
    if (interactive) {
      for (let col = 1; col < cols; col++) box(field.x + col * cw, field.y, 1, field.h, '#38735c');
      for (let row = 1; row < rows; row++) box(field.x, field.y + row * ch, field.w, 1, '#38735c');
    }
    frame(field.x, field.y, field.w, field.h, '#b7cc9b'); box(160, field.y, 1, field.h, '#b7cc9b');
    frame(145, 76, 30, 28, '#97ba8d'); box(159, 88, 3, 3, '#c5d4a1');
    for (const right of [false, true]) {
      frame(right ? field.x + field.w - 40 : field.x, field.y + 35, 40, 80, '#a2bf91');
      frame(right ? field.x + field.w - 14 : field.x, field.y + 53, 14, 44, '#a2bf91');
      frame(right ? field.x + field.w : field.x - 5, field.y + 61, 5, 28, '#d9dbc0');
    }
    if (match.air) {
      const attacker = match.teams?.[match.air.side]?.players?.[match.air.attacker];
      const landing = match.air.landing || attacker;
      if (landing) {
        const lx = cx(landing.x), ly = cy(landing.y), left = Math.max(field.x, lx - cw * 3), top = Math.max(field.y, ly - ch * 3);
        frame(left, top, Math.min(cw * 6, field.x + field.w - left), Math.min(ch * 6, field.y + field.h - top), '#c7b26b');
        box(lx - 3, ly, 7, 1, '#f6d88b'); box(lx, ly - 3, 1, 7, '#f6d88b');
      }
    }
    if (options.targetCell) {
      const t = options.targetCell;
      if (Number.isFinite(t.x) && Number.isFinite(t.y)) {
        frame(field.x + t.x * cw, field.y + t.y * ch, cw, ch, '#f4d88b'); box(cx(t.x) - 1, cy(t.y) - 1, 3, 3, '#eac87f');
      }
    }
    tokens = [];
    const buckets = new Map();
    match.teams.forEach((team, side) => team.players.forEach(player => {
      const key = `${player.x},${player.y}`; if (!buckets.has(key)) buckets.set(key, []); buckets.get(key).push({ player, side });
    }));
    for (const group of buckets.values()) group.forEach(({ player, side }, index) => {
      const tx = cx(player.x) + (group.length > 1 ? (index % 2 ? 2 : -2) : 0), ty = cy(player.y) + (group.length > 2 ? Math.floor(index / 2) * 3 - 1 : 0);
      const selected = side === 0 && player.id === options.selectedPlayer, owns = side === match.turn.side && player.id === match.turn.player;
      if (selected && interactive) frame(tx - 4, ty - 4, 8, 8, '#ece7ae');
      box(tx - 3, ty - 3, 7, 7, '#14283a'); box(tx - 2, ty - 2, 5, 5, side ? AWAY : HOME);
      if (player.id === 0) box(tx - 1, ty - 1, 3, 3, '#e9c37d');
      if (owns) { box(tx + 3, ty + 2, 3, 3, '#f3e7be'); box(tx + 4, ty + 3, 1, 1, '#233e49'); }
      if (interactive && cw >= 10) { c.font = 'bold 5px monospace'; c.textAlign = 'center'; c.fillStyle = '#13283a'; c.fillText(String(player.number), tx + .3, ty + 2); }
      tokens.push({ x: tx, y: ty, player, side });
    });
    c.font = 'bold 6px monospace'; c.textAlign = 'left'; c.fillStyle = HOME; c.fillText('МЫ', 13, 10);
    c.textAlign = 'right'; c.fillStyle = AWAY; c.fillText('СОПЕРНИК', 307, 10);
    c.textAlign = 'center'; c.fillStyle = '#a7bba6'; c.fillText(interactive ? 'ВЫБЕРИ ИГРОКА ИЛИ ТОЧКУ ПОЛЯ' : `${cols} × ${rows}`, 160, 175);
    const b = canvas.getBoundingClientRect(), ratio = Math.min(globalThis.devicePixelRatio || 1, 2);
    const width = Math.max(1, Math.round((b.width || 640) * ratio)), height = Math.max(1, Math.round((b.height || (b.width || 640) * 9 / 16) * ratio));
    if (canvas.width !== width || canvas.height !== height) { canvas.width = width; canvas.height = height; }
    ctx.imageSmoothingEnabled = false; ctx.drawImage(buffer, 0, 0, width, height);
  }
  function select(event) {
    const b = canvas.getBoundingClientRect(); if (!b.width || !b.height) return;
    const x = (event.clientX - b.left) / b.width * 320, y = (event.clientY - b.top) / b.height * 180;
    const token = tokens.map(t => ({ ...t, distance: Math.hypot(t.x - x, t.y - y) })).filter(t => t.distance <= 4.5).sort((a, b) => a.distance - b.distance)[0];
    if (token) { options.onSelectPlayer?.(token.player.id, token.side); return; }
    const col = Math.floor((x - field.x) / cw), row = Math.floor((y - field.y) / ch);
    if (col >= 0 && col < cols && row >= 0 && row < rows) options.onSelectCell?.({ x: col, y: row });
  }
  if (interactive) canvas.addEventListener('pointerup', select);
  const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(render); observer?.observe(canvas); render();
  function cleanup() { disposed = true; if (interactive) canvas.removeEventListener('pointerup', select); observer?.disconnect(); if (active.get(canvas) === cleanup) active.delete(canvas); }
  active.set(canvas, cleanup); return cleanup;
}
