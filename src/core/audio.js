let soundEnabled = true;
let audioContext = null;
let mode = 'none';
let token = 0;
let volumeScale = 1;
let current = null;

const TRACKS = {
  intro: { url: new URL('../../assets/audio/soundtrack-intro.wav', import.meta.url).href, gain: 0.5 },
  journey: { url: new URL('../../assets/audio/soundtrack-journey.wav', import.meta.url).href, gain: 0.55 }
};
const buffers = {};
const loading = {};

function ensureContext(){
  audioContext = audioContext || new (window.AudioContext || window.webkitAudioContext)();
  audioContext.resume?.();
  return audioContext;
}

function loadTrack(name){
  if (buffers[name]) return Promise.resolve(buffers[name]);
  loading[name] = loading[name] || fetch(TRACKS[name].url)
    .then(r => r.arrayBuffer())
    .then(data => ensureContext().decodeAudioData(data))
    .then(buf => (buffers[name] = buf))
    .catch(() => { delete loading[name]; return null; });
  return loading[name];
}

function killCurrent(fadeSeconds = 0){
  const node = current;
  current = null;
  if (!node) return;
  const ctx = audioContext;
  const now = ctx.currentTime;
  node.gain.gain.cancelScheduledValues(now);
  node.gain.gain.setValueAtTime(node.gain.gain.value, now);
  node.gain.gain.linearRampToValueAtTime(0, now + Math.max(0.02, fadeSeconds));
  try { node.source.stop(now + Math.max(0.02, fadeSeconds) + 0.05); } catch {}
}

async function playTrack(name, fadeInSeconds = 1.5, offset = 0){
  if (!soundEnabled) return;
  const myToken = ++token;
  mode = name;
  killCurrent(0.4);
  const buf = await loadTrack(name);
  if (!buf || myToken !== token || !soundEnabled) return;
  const ctx = ensureContext();
  const source = ctx.createBufferSource();
  const gain = ctx.createGain();
  source.buffer = buf;
  source.loop = true;
  gain.gain.setValueAtTime(0.0001, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(TRACKS[name].gain * volumeScale, ctx.currentTime + fadeInSeconds);
  source.connect(gain).connect(ctx.destination);
  source.start(0, offset % buf.duration);
  current = { source, gain, name, startedAt: ctx.currentTime - offset };
}

export function playGameMove(kind='move'){
  if(!soundEnabled) return;
  const ctx=ensureContext();
  const now=ctx.currentTime;
  const osc=ctx.createOscillator();
  const gain=ctx.createGain();
  osc.type=kind==='correct'?'sine':kind==='incorrect'?'sawtooth':'triangle';
  const start=kind==='correct'?420:kind==='incorrect'?180:260;
  const end=kind==='correct'?760:kind==='incorrect'?100:330;
  osc.frequency.setValueAtTime(start,now);
  osc.frequency.exponentialRampToValueAtTime(end,now+0.16);
  gain.gain.setValueAtTime(0.0001,now);
  gain.gain.exponentialRampToValueAtTime(kind==='incorrect'?0.045:0.028,now+0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001,now+0.22);
  osc.connect(gain).connect(ctx.destination);
  osc.start(now);
  osc.stop(now+0.25);
}

export function preloadSoundtracks(){
  return Promise.all(Object.keys(TRACKS).map(loadTrack));
}

export function startAmbient(){
  if (current?.name === 'intro' && mode === 'intro') return;
  playTrack('intro');
}

// Starts the intro track at page load; if the browser blocks autoplay, the first user gesture unlocks it.
export function armAutoplay(){
  startAmbient();
  const events = ['pointerdown', 'keydown', 'touchstart'];
  const unlock = () => {
    events.forEach(e => window.removeEventListener(e, unlock, true));
    if (audioContext?.state === 'suspended') audioContext.resume?.();
    if (mode === 'none' && soundEnabled && !current) startAmbient();
  };
  events.forEach(e => window.addEventListener(e, unlock, true));
}

export function fadeAmbient(duration=1400){
  token++;
  killCurrent(duration / 1000);
  mode = 'none';
  return new Promise(resolve => setTimeout(resolve, duration));
}

export function stopAmbient(){
  pausedAt = null;
  token++;
  killCurrent(0.3);
  mode = 'none';
}

export function startGameplay(){
  if (current?.name === 'journey' && mode === 'journey') return;
  playTrack('journey', 2.5);
}

let pausedAt = null;

export function pauseGameplay(){
  if (mode !== 'journey' || !current || pausedAt !== null) return;
  pausedAt = (audioContext.currentTime - current.startedAt) % current.source.buffer.duration;
  token++;
  killCurrent(0.4);
}

export function resumeGameplay(){
  if (pausedAt === null) return;
  const offset = pausedAt;
  pausedAt = null;
  if (mode === 'journey') playTrack('journey', 1.2, offset);
}

export function stopGameplay(){
  pausedAt = null;
  if (mode === 'journey') stopAmbient();
}

export function toggleAmbient(){
  const resume = mode;
  soundEnabled=!soundEnabled;
  if(soundEnabled && pausedAt === null) playTrack(resume === 'journey' ? 'journey' : 'intro');
  else { token++; killCurrent(0.3); }
  return soundEnabled;
}

export function isSoundEnabled(){return soundEnabled;}
export function setVolume(value){
  volumeScale=Math.max(0,Math.min(1,Number(value)));
  if(current) current.gain.gain.value=TRACKS[current.name].gain*volumeScale;
}
