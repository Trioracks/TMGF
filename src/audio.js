// Original procedural soundtrack. AudioContext is created only by the user's toggle.
let context = null;
let master = null;
let enabled = false;
let timer = null;
let generation = 0;
let nextBeat = 0;
let step = 0;
const voices = new Set();
const beatLength = 60 / 124 / 2;
const midi = n => 440 * 2 ** ((n - 69) / 12);
// A newly composed 16-bar pulse motif, deliberately independent of game ROM music.
const melody = [76, null, 79, 83, 81, null, 79, 74, 76, 79, null, 86, 83, null, 81, 79,
  74, null, 78, 81, 83, 81, 78, null, 74, 78, 81, 86, 85, null, 81, 78,
  72, null, 76, 79, 83, null, 79, 76, 72, 76, null, 84, 83, 79, 76, null,
  74, 78, 81, null, 86, 85, 81, 78, 74, null, 78, 81, 83, 81, 78, null];
const bass = [40, 40, 40, 47, 38, 38, 38, 45, 36, 36, 36, 43, 38, 38, 45, 47];

function voice(frequency, when, duration = .12, volume = .06, type = 'triangle', bend = null) {
  if (!context || !master || context.state !== 'running') return;
  const oscillator = context.createOscillator();
  const envelope = context.createGain();
  oscillator.type = type; oscillator.frequency.setValueAtTime(frequency, when);
  if (bend) oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, bend), when + duration);
  envelope.gain.setValueAtTime(.0001, when);
  envelope.gain.exponentialRampToValueAtTime(Math.max(.0002, volume), when + .008);
  envelope.gain.exponentialRampToValueAtTime(.0001, when + duration);
  oscillator.connect(envelope); envelope.connect(master);
  voices.add(oscillator);
  oscillator.onended = () => { voices.delete(oscillator); oscillator.disconnect(); envelope.disconnect(); };
  oscillator.start(when); oscillator.stop(when + duration + .025);
}

function percussion(when, accent = false) {
  voice(accent ? 140 : 85, when, accent ? .11 : .075, accent ? .095 : .045, 'sine', 35);
  if (!accent) voice(3600, when, .026, .012, 'square', 1700);
}

function schedule() {
  if (!enabled || !context || context.state !== 'running' || document.hidden) return;
  // Schedule a short horizon, avoiding a backlog after tab suspension.
  if (nextBeat < context.currentTime) nextBeat = context.currentTime + .025;
  while (nextBeat < context.currentTime + .3) {
    const note = melody[step % melody.length];
    if (note !== null) voice(midi(note), nextBeat, beatLength * .63, .032, 'triangle');
    if (step % 2 === 0) voice(midi(bass[Math.floor(step / 4) % bass.length]), nextBeat, beatLength * 1.3, .055, 'triangle');
    percussion(nextBeat, step % 4 === 0);
    nextBeat += beatLength; step++;
  }
}

function stopVoices() {
  for (const oscillator of voices) { try { oscillator.stop(); } catch { /* Already ended. */ } }
  voices.clear();
}

function startScheduler() {
  clearInterval(timer); timer = null;
  if (!enabled || document.hidden || !context || context.state !== 'running') return;
  nextBeat = context.currentTime + .04;
  schedule(); timer = setInterval(schedule, 120);
}

export async function setAudioEnabled(value) {
  if (!value) { stopAudio(); return false; }
  if (enabled && context?.state === 'running') return true;
  const AudioContext = globalThis.AudioContext || globalThis.webkitAudioContext;
  if (!AudioContext) return false;
  const token = ++generation;
  try {
    if (!context || context.state === 'closed') {
      context = new AudioContext(); master = context.createGain(); master.gain.value = .3; master.connect(context.destination); step = 0;
    }
    await context.resume();
    if (token !== generation) return false;
    enabled = true; startScheduler(); return true;
  } catch {
    if (token === generation) stopAudio();
    return false;
  }
}

export function playSound(kind = 'ui') {
  if (!enabled || !context || context.state !== 'running' || document.hidden) return;
  const t = context.currentTime + .008;
  if (kind === 'goal') {
    [72, 76, 79, 84, 88].forEach((note, i) => voice(midi(note), t + i * .075, .32, .2 - i * .017, 'triangle'));
    percussion(t, true);
  } else if (['halftime', 'finish', 'finished', 'whistle'].includes(kind)) {
    voice(2400, t, .14, .065, 'sine', 2900); voice(2650, t + .2, .3, .065, 'sine', 2500);
  } else if (['save', 'intercept', 'lost', 'aerial-lost', 'tackle', 'block'].includes(kind)) {
    voice(220, t, .15, .17, 'triangle', 90); voice(110, t + .05, .16, .08, 'square', 55);
  } else if (['cross', 'aerial', 'header', 'volley'].includes(kind)) {
    voice(260, t, .25, .1, 'triangle', 920); voice(1560, t + .13, .16, .04, 'sine');
  } else if (['pass', 'kick', 'shoot', 'special', 'combo2', 'combo3', 'move', 'rebound', 'miss'].includes(kind)) {
    voice(165, t, .095, .17, 'sine', 45); voice(800, t, .045, .03, 'triangle', 240);
  } else if (['recover', 'control'].includes(kind)) {
    [64, 69, 76].forEach((note, i) => voice(midi(note), t + i * .065, .15, .075, 'sine'));
  } else voice(880, t, .045, .045, 'sine', 620);
}

export function stopAudio() {
  generation++; enabled = false;
  clearInterval(timer); timer = null;
  stopVoices();
  const previous = context; context = null; master = null;
  if (previous && previous.state !== 'closed') previous.close().catch(() => {});
}

if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', async () => {
    if (!context || !enabled) return;
    const current = context;
    clearInterval(timer); timer = null;
    if (document.hidden) {
      stopVoices();
      if (current.state === 'running') await current.suspend().catch(() => {});
    } else {
      await current.resume().catch(() => {});
      if (current === context && enabled) startScheduler();
    }
  });
  globalThis.addEventListener?.('pagehide', stopAudio);
}
