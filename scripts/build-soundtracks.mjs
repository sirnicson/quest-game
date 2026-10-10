// Renders QUEST's two original soundtrack loops with a small additive/physical-model synthesiser.
//   assets/audio/soundtrack-intro.wav    - opening screens (heroic, mysterious, folk-orchestral)
//   assets/audio/soundtrack-journey.wav  - the 50-minute game (driving, tension-building)
// Usage: node scripts/build-soundtracks.mjs [intro|journey]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SR = 32000;
const TAIL = 4 * SR;
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, 'assets', 'audio');

const mtof = m => 440 * 2 ** ((m - 69) / 12);
const TWO_PI = Math.PI * 2;

function mulberry(seed) {
  return () => {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
const rand = mulberry(7);
const noise = () => rand() * 2 - 1;
const lpCoef = fc => 1 - Math.exp(-TWO_PI * fc / SR);

// Smooth attack, hold until `dur`, then release.
function env(t, dur, a, r) {
  if (t < a) return Math.sin(t / a * Math.PI / 2);
  if (t < dur) return 1;
  return Math.max(0, 1 - (t - dur) / r);
}

// ---------- voices (all return mono Float32Array) ----------

// Detuned saw stack through a 12 dB/oct low-pass: strings, pads, drones, staccato basses.
function pad(freq, dur, { a = 0.8, r = 1.5, bright = 1400, voices = 5, detune = 7, trem = 0, depth = 0 } = {}) {
  const n = Math.round((dur + r) * SR);
  const out = new Float32Array(n);
  const ph = [];
  const inc = [];
  for (let v = 0; v < voices; v++) {
    ph.push(rand());
    inc.push(freq * 2 ** ((v - (voices - 1) / 2) * detune / 1200) / SR);
  }
  const k = lpCoef(bright);
  let y1 = 0;
  let y2 = 0;
  for (let i = 0; i < n; i++) {
    let s = 0;
    for (let v = 0; v < voices; v++) {
      ph[v] += inc[v];
      if (ph[v] >= 1) ph[v] -= 1;
      s += 2 * ph[v] - 1;
    }
    y1 += k * (s / voices - y1);
    y2 += k * (y1 - y2);
    const t = i / SR;
    const am = trem ? 1 - depth + depth * (0.5 + 0.5 * Math.sin(TWO_PI * trem * t)) : 1;
    out[i] = y2 * env(t, dur, a, r) * am;
  }
  return out;
}

// Soft flute / pipe: sine with a little 2nd/3rd harmonic, late vibrato and breath.
function flute(freq, dur, { a = 0.09, r = 0.4, h2 = 0.22, h3 = 0.08, breath = 0.05 } = {}) {
  const n = Math.round((dur + r) * SR);
  const out = new Float32Array(n);
  const k = lpCoef(3500);
  let p = 0;
  let b = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const vib = 1 + 0.006 * Math.min(1, t / 0.4) * Math.sin(TWO_PI * 5.1 * t);
    p += TWO_PI * freq * vib / SR;
    b += k * (noise() - b);
    const e = env(t, dur, a, r);
    out[i] = (Math.sin(p) + h2 * Math.sin(2 * p) + h3 * Math.sin(3 * p) + breath * b * 6) * e * 0.55;
  }
  return out;
}

// Horn / brass: additive saw whose brightness opens during the note.
function brass(freq, dur, { a = 0.18, r = 0.5, open = 2200, base = 500 } = {}) {
  const n = Math.round((dur + r) * SR);
  const out = new Float32Array(n);
  const harmonics = Math.max(3, Math.min(14, Math.floor(5000 / freq)));
  let p = 0;
  let y = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const vib = 1 + 0.004 * Math.min(1, t / 0.5) * Math.sin(TWO_PI * 5.4 * t);
    p += TWO_PI * freq * vib / SR;
    let s = 0;
    for (let h = 1; h <= harmonics; h++) s += Math.sin(h * p) / h;
    const e = env(t, dur, a, r);
    const k = lpCoef(base + (open - base) * Math.min(1, t / (a * 3 + 0.2)));
    y += k * (s - y);
    out[i] = y * e * 0.5;
  }
  return out;
}

// Karplus-Strong plucked string (harp / lute) with a fractional delay line for accurate pitch.
function pluck(freq, dur = 2.6, { decay = 0.9965, level = 0.7 } = {}) {
  const n = Math.round(dur * SR);
  const y = new Float32Array(n + 8);
  const D = SR / freq - 0.5;
  const burst = Math.ceil(D) + 2;
  let lp = 0;
  for (let i = 0; i < burst; i++) {
    lp += 0.55 * (noise() - lp);
    y[i] = lp * 1.6;
  }
  for (let i = burst; i < n; i++) {
    const p = i - D;
    const i0 = Math.floor(p);
    const f = p - i0;
    const q = p - 1;
    const j0 = Math.floor(q);
    const g = q - j0;
    const a1 = y[i0] * (1 - f) + y[i0 + 1] * f;
    const b1 = y[j0] * (1 - g) + y[j0 + 1] * g;
    y[i] = decay * 0.5 * (a1 + b1);
  }
  const out = y.subarray(0, n);
  const fade = Math.round(0.25 * SR);
  for (let i = 0; i < n; i++) out[i] *= level * (i > n - fade ? (n - i) / fade : 1);
  return out;
}

// Pitched drum: sine with a fast pitch drop plus a burst of noise.
function drum(f0, f1, dur, { decay = 5, grit = 0.3 } = {}) {
  const n = Math.round(dur * SR);
  const out = new Float32Array(n);
  const k = lpCoef(1800);
  let p = 0;
  let nz = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    p += TWO_PI * (f1 + (f0 - f1) * Math.exp(-t * 28)) / SR;
    nz += k * (noise() - nz);
    const click = Math.min(1, t / 0.002);
    out[i] = (Math.sin(p) * Math.exp(-t * decay) + grit * nz * Math.exp(-t * decay * 2.2)) * click;
  }
  return out;
}

const shaker = () => {
  const n = Math.round(0.09 * SR);
  const out = new Float32Array(n);
  let lp = 0;
  const k = lpCoef(2500);
  for (let i = 0; i < n; i++) {
    const x = noise();
    lp += k * (x - lp);
    out[i] = (x - lp) * Math.exp(-i / SR * 45);
  }
  return out;
};

// Rising noise swell: the low-pass opens from 300 Hz to 9 kHz while the level climbs.
function riser(dur) {
  const n = Math.round(dur * SR);
  const out = new Float32Array(n);
  let y = 0;
  for (let i = 0; i < n; i++) {
    const x = i / n;
    y += lpCoef(300 * 30 ** x) * (noise() - y);
    out[i] = y * x ** 2.2 * 1.4;
  }
  return out;
}

// ---------- mixing ----------

class Mix {
  constructor(seconds) {
    this.loopLen = Math.round(seconds * SR);
    this.len = this.loopLen + TAIL;
    this.dryL = new Float32Array(this.len);
    this.dryR = new Float32Array(this.len);
    this.wetL = new Float32Array(this.len);
    this.wetR = new Float32Array(this.len);
  }

  put(sig, start, { pan = 0, gain = 1, wet = 0.5 } = {}) {
    const s0 = Math.round(start * SR);
    const ang = (pan + 1) * Math.PI / 4;
    const gl = Math.cos(ang) * gain;
    const gr = Math.sin(ang) * gain;
    for (let i = 0; i < sig.length; i++) {
      const k = s0 + i;
      if (k >= this.len) break;
      const v = sig[i];
      this.dryL[k] += v * gl;
      this.dryR[k] += v * gr;
      this.wetL[k] += v * gl * wet;
      this.wetR[k] += v * gr * wet;
    }
  }
}

function reverbChannel(input, spread) {
  const scale = SR / 44100;
  const combDelays = [1557, 1617, 1491, 1422, 1277, 1356, 1188, 1116].map(d => Math.round((d + spread) * scale));
  const apDelays = [556, 441, 341, 225].map(d => Math.round((d + spread) * scale));
  const combs = combDelays.map(d => ({ buf: new Float32Array(d), i: 0, store: 0 }));
  const aps = apDelays.map(d => ({ buf: new Float32Array(d), i: 0 }));
  const out = new Float32Array(input.length);
  const fb = 0.86;
  const damp = 0.3;
  for (let n = 0; n < input.length; n++) {
    const x = input[n] * 0.1;
    let s = 0;
    for (const c of combs) {
      const o = c.buf[c.i];
      c.store = o * (1 - damp) + c.store * damp;
      c.buf[c.i] = x + c.store * fb;
      if (++c.i >= c.buf.length) c.i = 0;
      s += o;
    }
    for (const a of aps) {
      const bo = a.buf[a.i];
      const o = -s + bo;
      a.buf[a.i] = s + bo * 0.5;
      if (++a.i >= a.buf.length) a.i = 0;
      s = o;
    }
    out[n] = s;
  }
  return out;
}

const rms = (arr, from = 0, to = arr.length) => {
  let s = 0;
  for (let i = from; i < to; i++) s += arr[i] * arr[i];
  return Math.sqrt(s / Math.max(1, to - from));
};

function render(mix, { wetRatio }) {
  const wl = reverbChannel(mix.wetL, 0);
  const wr = reverbChannel(mix.wetR, 23);
  const dry = Math.max(rms(mix.dryL), rms(mix.dryR));
  const wetRms = Math.max(rms(wl), rms(wr)) || 1;
  const wg = wetRatio * dry / wetRms;
  const L = new Float32Array(mix.len);
  const R = new Float32Array(mix.len);
  for (let i = 0; i < mix.len; i++) {
    L[i] = mix.dryL[i] + wl[i] * wg;
    R[i] = mix.dryR[i] + wr[i] * wg;
  }
  // Fold the tail back onto the start so the loop has no gap.
  const outL = L.slice(0, mix.loopLen);
  const outR = R.slice(0, mix.loopLen);
  for (let i = 0; i < TAIL && i < mix.loopLen; i++) {
    outL[i] += L[mix.loopLen + i];
    outR[i] += R[mix.loopLen + i];
  }
  let peak = 0;
  for (let i = 0; i < mix.loopLen; i++) {
    outL[i] = Math.tanh(outL[i] * 1.25);
    outR[i] = Math.tanh(outR[i] * 1.25);
    peak = Math.max(peak, Math.abs(outL[i]), Math.abs(outR[i]));
  }
  const norm = 0.9 / peak;
  for (let i = 0; i < mix.loopLen; i++) { outL[i] *= norm; outR[i] *= norm; }
  return [outL, outR];
}

function writeWav(file, L, R) {
  const n = L.length;
  const buf = Buffer.alloc(44 + n * 4);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + n * 4, 4); buf.write('WAVEfmt ', 8);
  buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22);
  buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34);
  buf.write('data', 36); buf.writeUInt32LE(n * 4, 40);
  for (let i = 0; i < n; i++) {
    buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, L[i])) * 32767), 44 + i * 4);
    buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, R[i])) * 32767), 46 + i * 4);
  }
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, buf);
}

function report(name, L, R, bars, seconds) {
  const per = Math.floor(L.length / bars);
  const levels = Array.from({ length: bars }, (_, b) => rms(L, b * per, (b + 1) * per).toFixed(2)).join(' ');
  console.log(`${name}: ${seconds.toFixed(1)}s, loop seam |L0-Ln| = ${Math.abs(L[0] - L[L.length - 1]).toFixed(4)}`);
  console.log(`  RMS by bar: ${levels}`);
}

// ---------- theme 1: the road opens (A minor, 90 bpm, 24 bars) ----------

function intro() {
  const bpm = 90;
  const beat = 60 / bpm;
  const bars = 24;
  const seconds = bars * 4 * beat;
  const mix = new Mix(seconds);
  const triads = { Am: [57, 60, 64, 69], F: [53, 57, 60, 65], C: [48, 55, 60, 64], G: [55, 59, 62, 67], Em: [52, 55, 59, 64] };
  const roots = { Am: 45, F: 41, C: 36, G: 43, Em: 40 };
  const spans = [['Am', 2], ['F', 2], ['C', 2], ['G', 1], ['Em', 1]];
  const phrase = [
    [76, 0, 3], [74, 3, 1], [72, 4, 2], [69, 6, 2],
    [72, 8, 3], [74, 11, 1], [77, 12, 4],
    [76, 16, 3], [72, 19, 1], [79, 20, 2], [76, 22, 2],
    [74, 24, 3], [71, 27, 1], [71, 28, 2], [67, 30, 2]
  ];
  const pans = [-0.6, -0.2, 0.2, 0.6];

  for (let sec = 0; sec < 3; sec++) {
    const secStart = sec * 8 * 4 * beat;
    let bar = 0;
    for (const [name, len] of spans) {
      const t0 = secStart + bar * 4 * beat;
      const dur = len * 4 * beat;
      triads[name].forEach((n, i) => {
        mix.put(pad(mtof(n), dur, { a: 1.0, r: 1.8, bright: 800 + sec * 450 }), t0, { pan: pans[i], gain: 0.2 + sec * 0.03, wet: 0.6 });
      });
      mix.put(pad(mtof(roots[name]), dur, { a: 0.4, r: 1.4, bright: 260, voices: 3 }), t0, { gain: 0.34, wet: 0.2 });
      for (let b = 0; b < len; b++) {
        const tb = t0 + b * 4 * beat;
        const tones = triads[name].map(n => n + 12);
        if (sec === 0) {
          mix.put(pluck(mtof(tones[0])), tb, { pan: -0.3, gain: 0.45, wet: 0.7 });
          mix.put(pluck(mtof(tones[2])), tb + 2 * beat, { pan: 0.3, gain: 0.35, wet: 0.7 });
        } else {
          [0, 1, 2, 3, 2, 1, 2, 1].forEach((idx, k) => {
            mix.put(pluck(mtof(tones[idx])), tb + k * beat / 2, { pan: -0.5 + idx * 0.33, gain: sec === 1 ? 0.42 : 0.55, wet: 0.7 });
          });
        }
        if (sec >= 1) {
          mix.put(drum(150, 80, 0.6, { decay: 8 }), tb, { gain: 0.5, wet: 0.3 });
          mix.put(drum(150, 80, 0.6, { decay: 8 }), tb + 2 * beat, { gain: 0.4, wet: 0.3 });
        }
        if (sec === 2) {
          mix.put(drum(110, 48, 1.0, { decay: 4.5 }), tb, { gain: 0.8, wet: 0.35 });
          mix.put(drum(110, 48, 1.0, { decay: 4.5 }), tb + 2 * beat, { gain: 0.6, wet: 0.35 });
          mix.put(drum(150, 80, 0.5, { decay: 8 }), tb + beat, { gain: 0.3, wet: 0.3 });
          mix.put(drum(150, 80, 0.5, { decay: 8 }), tb + 3 * beat, { gain: 0.3, wet: 0.3 });
        }
      }
      bar += len;
    }
    for (const [note, b, d] of phrase) {
      const t = secStart + b * beat;
      mix.put(flute(mtof(note), d * beat), t, { pan: 0.1, gain: 0.5, wet: 0.65 });
      if (sec >= 1) mix.put(brass(mtof(note - 12), d * beat, { open: 1400 }), t, { pan: -0.1, gain: 0.26, wet: 0.5 });
      if (sec === 2) mix.put(flute(mtof(note + 12), d * beat), t, { pan: 0.3, gain: 0.18, wet: 0.7 });
    }
  }
  const [L, R] = render(mix, { wetRatio: 0.55 });
  report('intro', L, R, bars, seconds);
  writeWav(path.join(outDir, 'soundtrack-intro.wav'), L, R);
}

// ---------- theme 2: the long road (D minor, 96 bpm, 24 bars, rising tension) ----------

function journey() {
  const bpm = 96;
  const beat = 60 / bpm;
  const bars = 24;
  const seconds = bars * 4 * beat;
  const mix = new Mix(seconds);
  const prog = ['Dm', 'Dm', 'Bb', 'C', 'Dm', 'Dm', 'Gm', 'A'];
  const pads = { Dm: [50, 57, 62, 65], Bb: [46, 53, 58, 62], C: [48, 55, 60, 64], Gm: [43, 50, 55, 58], A: [45, 52, 57, 61] };
  const ostinatoRoot = { Dm: 38, Bb: 34, C: 36, Gm: 43, A: 45 };
  const stringTop = { Dm: 77, Bb: 74, C: 76, Gm: 74, A: 73 };
  const theme = [
    [62, 0, 1.5], [65, 1.5, 0.5], [69, 2, 2],
    [67, 4, 1], [65, 5, 1], [62, 6, 2],
    [70, 8, 1.5], [69, 9.5, 0.5], [65, 10, 2],
    [67, 12, 2], [64, 14, 2],
    [62, 16, 1.5], [65, 17.5, 0.5], [69, 18, 1], [72, 19, 1],
    [74, 20, 2], [72, 22, 1], [69, 23, 1],
    [70, 24, 2], [67, 26, 2],
    [69, 28, 1], [73, 29, 3]
  ];
  const accents = [1, 0.55, 0.7, 0.55, 0.9, 0.55, 0.75, 0.55];

  for (let bar = 0; bar < bars; bar++) {
    const sec = Math.floor(bar / 8);
    const name = prog[bar % 8];
    const t0 = bar * 4 * beat;
    const last = bar === bars - 1;

    // Driving staccato ostinato on 8th notes
    for (let k = 0; k < 8; k++) {
      const note = ostinatoRoot[name] + (k === 2 ? 12 : k === 6 ? 7 : 0);
      mix.put(pad(mtof(note), 0.1, { a: 0.004, r: 0.14, bright: 650 + sec * 250, voices: 3, detune: 9 }), t0 + k * beat / 2, { gain: 0.5 * accents[k] * (0.85 + sec * 0.1), wet: 0.12 });
    }

    // Dark sustained pad, one swell per bar
    pads[name].forEach((n, i) => {
      mix.put(pad(mtof(n), 4 * beat, { a: 0.5, r: 1.2, bright: 500 + sec * 250 }), t0, { pan: -0.5 + i * 0.33, gain: 0.13, wet: 0.5 });
    });

    // Taiko pulse builds across sections
    mix.put(drum(100, 44, 1.2, { decay: 3.8 }), t0, { gain: 0.9, wet: 0.35 });
    if (sec >= 1) {
      mix.put(drum(100, 44, 1.0, { decay: 4.5 }), t0 + 2 * beat, { gain: 0.65, wet: 0.35 });
      mix.put(drum(100, 44, 0.8, { decay: 5.5 }), t0 + 3.5 * beat, { gain: 0.45, wet: 0.35 });
      for (let k = 0; k < 8; k++) mix.put(shaker(), t0 + k * beat / 2 + beat / 4, { pan: k % 2 ? 0.5 : -0.5, gain: 0.2, wet: 0.2 });
    }
    if (sec === 2 || bar === 15) {
      for (let k = 0; k < 4; k++) mix.put(drum(100, 44, 0.7, { decay: 6 }), t0 + k * beat + beat / 2, { gain: 0.35, wet: 0.3 });
    }
    if (last) {
      for (let k = 0; k < 8; k++) mix.put(drum(110, 50, 0.6, { decay: 6 }), t0 + 2 * beat + k * beat / 4, { gain: 0.3 + k * 0.07, wet: 0.3 });
    }

    // Tremolo strings from the second section
    if (sec >= 1) {
      [stringTop[name], stringTop[name] - 5].forEach((n, i) => {
        mix.put(pad(mtof(n), 4 * beat, { a: 0.9, r: 1.0, bright: 2600, voices: 4, trem: 13 + i, depth: 0.55 }), t0, { pan: i ? 0.5 : -0.5, gain: 0.09 + (sec - 1) * 0.035, wet: 0.6 });
      });
    }
  }

  // Horn theme in the final section, doubled by a low brass line
  const sec3 = 16 * 4 * beat;
  for (const [note, b, d] of theme) {
    const t = sec3 + b * beat;
    mix.put(brass(mtof(note), d * beat, { open: 2400, base: 450 }), t, { pan: 0.1, gain: 0.34, wet: 0.5 });
    mix.put(brass(mtof(note - 12), d * beat, { open: 1300, base: 350 }), t, { pan: -0.15, gain: 0.24, wet: 0.4 });
  }

  // The riser leads back round to the sparse opening
  mix.put(riser(4 * 4 * beat), (bars - 4) * 4 * beat, { gain: 0.28, wet: 0.3 });

  const [L, R] = render(mix, { wetRatio: 0.4 });
  report('journey', L, R, bars, seconds);
  writeWav(path.join(outDir, 'soundtrack-journey.wav'), L, R);
}

const which = process.argv[2];
if (!which || which === 'intro') intro();
if (!which || which === 'journey') journey();
