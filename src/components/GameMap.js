import { avatarSvg } from '../data/avatars.js';
import { escapeHtml } from './view.js';
import { journey } from '../data/episodes/episode01.js';

const mapImagePoint = (x, y) => ({
  x: x * 1600 / 1602,
  y: y * 920 / 982
});
const points = journey.map(place => mapImagePoint(place.x, place.y));
const LAST = points.length - 1;
const FINISHED = LAST;
export const ROUTE_LEGS = LAST;
const mapCenter = { x: 800, y: 460 };

const fmt = n => n.toFixed(1);
const ROUTE_PIN_OFFSET = { student: -20, guide: 20 };
const CITY_LOCATOR_RADIUS = 15;
const AVATAR_RADIUS = 12.6;
const CITY_PIN_GAP = 14;
const CITY_PIN_OFFSET = CITY_LOCATOR_RADIUS + AVATAR_RADIUS + CITY_PIN_GAP;

// Player roads are independently shaped, but share city endpoints and stay side by side.
const SEA_LEGS = { 2: 0.1, 10: -0.07, 12: -0.15 };
const ROUTE_SAMPLES = 36;

const cubic = (p0, p1, p2, p3, t) => {
  const u = 1 - t;
  return {
    x: u ** 3 * p0.x + 3 * u ** 2 * t * p1.x + 3 * u * t ** 2 * p2.x + t ** 3 * p3.x,
    y: u ** 3 * p0.y + 3 * u ** 2 * t * p1.y + 3 * u * t ** 2 * p2.y + t ** 3 * p3.y
  };
};

function centerRoute(index, player, samples) {
  const a = points[index];
  const b = points[index + 1];
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  const sign = player === 'guide' ? 1 : -1;
  const phase = player === 'guide' ? 1.35 : -0.45;
  if (index in SEA_LEGS) {
    const bow = len * (SEA_LEGS[index] + sign * 0.035);
    const p1 = { x: a.x + dx * 0.3 + nx * bow, y: a.y + dy * 0.3 + ny * bow };
    const p2 = { x: a.x + dx * 0.7 + nx * bow, y: a.y + dy * 0.7 + ny * bow };
    return Array.from({ length: samples + 1 }, (_, step) => cubic(a, p1, p2, b, step / samples));
  }

  const bends = Math.max(3, Math.min(8, Math.round(len / 55)));
  const amp = Math.min(22, len * 0.095);
  const lane = Math.min(10, len * 0.045) * sign;
  const way = [a];
  for (let k = 1; k <= bends; k++) {
    const t = Math.min(0.94, Math.max(0.06, k / (bends + 1) + 0.055 * Math.sin(index * 2.8 + k * 1.9 + phase)));
    const wave = Math.sin(index * 2.15 + k * 1.65 + phase) * 0.62
      + Math.sin(k * 2.7 + index * 0.8 - phase) * 0.24;
    const side = lane + amp * wave;
    way.push({ x: a.x + dx * t + nx * side, y: a.y + dy * t + ny * side });
  }
  way.push(b);
  const segments = way.slice(0, -1).map((p1, i) => {
    const p0 = way[i - 1] ?? p1;
    const p2 = way[i + 1];
    const p3 = way[i + 2] ?? p2;
    return [p1, { x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6 },
      { x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6 }, p2];
  });
  return Array.from({ length: samples + 1 }, (_, step) => {
    const value = step / samples * segments.length;
    const segment = Math.min(segments.length - 1, Math.floor(value));
    return cubic(...segments[segment], Math.min(1, value - segment));
  });
}

export function routeLegPoints(index, player = 'student', samples = ROUTE_SAMPLES) {
  return centerRoute(index, player, samples);
}

export function legPath(index, player = 'student') {
  const path = routeLegPoints(index, player);
  return path.map((point, i) => `${i ? 'L' : 'M'} ${fmt(point.x)} ${fmt(point.y)}`).join(' ');
}

// Each five points are one city leg, matching the 14 physical legs from London to Istanbul.
export const routeDistance = progress => {
  const distance = Math.max(0, Math.min(LAST, Number(progress) || 0));
  const nearestLeg = Math.round(distance);
  return Math.abs(distance - nearestLeg) < 1e-10 ? nearestLeg : distance;
};

// The finish position (14) is shown at Istanbul.
export const stopIndex = position => Math.max(0, Math.min(LAST, position));

export function routePosition(progress, player = 'student') {
  const position = routeDistance(progress);
  if (position >= LAST) return points[LAST];
  const index = Math.floor(position);
  const fraction = position - index;
  const samples = routeLegPoints(index, player);
  const sample = fraction * (samples.length - 1);
  const lo = Math.floor(sample);
  const t = sample - lo;
  const a = samples[lo];
  const b = samples[Math.min(samples.length - 1, lo + 1)];
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

export function avatarPosition(progress, player = 'student') {
  const position = routeDistance(progress);
  const route = routePosition(progress, player);
  const routeOffset = ROUTE_PIN_OFFSET[player];
  const routed = {
    x: route.x + routeOffset,
    y: route.y
  };
  // The wide, level spacing is only for the London start. After the first movement,
  // keep avatars offset from their own route even when they reach a city center.
  const cityOffset = Math.max(0, 1 - position / 0.14);
  const cityX = route.x + (player === 'guide' ? CITY_PIN_OFFSET : -CITY_PIN_OFFSET);
  return {
    x: routed.x + (cityX - routed.x) * cityOffset,
    y: routed.y + (route.y - routed.y) * cityOffset
  };
}

// camera: 'overview' | 'london' | 'stop:N'
export function mapCameraPose(camera = 'overview') {
  const match = /^stop:(\d+)$/.exec(camera);
  const index = match ? stopIndex(Number(match[1])) : camera === 'london' ? 0 : camera === 'manchester' ? 1 : null;
  if (index === null) return { scale: 1, x: 0, y: 0 };
  const scale = index === 1 ? 2.4 : 2.2;
  const point = points[index];
  return { scale, x: mapCenter.x - point.x * scale, y: mapCenter.y - point.y * scale };
}

function mapTransform(view) {
  return `translate(${view.x.toFixed(1)} ${view.y.toFixed(1)}) scale(${view.scale.toFixed(2)})`;
}

export function mapSvg(episode, game) {
  const { student, guide } = game.players;
  const routeVisible = Boolean(game.routeVisible || student.position > 0 || guide.position > 0);
  const view = game.mapView || mapCameraPose(game.camera);
  const activeProgress = routeDistance(game.players[game.activePlayer || 'student'].position);
  const activeIndex = stopIndex(Math.floor(activeProgress));
  const betweenStops = activeProgress % 1 > 0.0001 && activeProgress < FINISHED;
  const arrivalIndex = Math.min(LAST, activeIndex + (betweenStops ? 1 : 0));
  const activeStop = points[arrivalIndex];
  const showCityFocus = routeVisible && activeProgress > 0;
  const canStart = game.screen === 'map' && !routeVisible;
  const anim = game.moveAnim;
  const back = game.backAnim;
  const legs = ['student', 'guide'].flatMap(player => Array.from({ length: LAST }, (_, i) => {
    const d = legPath(i, player);
    const progress = routeDistance(anim?.player === player ? anim.from : back?.player === player ? back.from : game.players[player].position);
    const fraction = Math.max(0, Math.min(1, progress - i));
    const offset = i + 1 <= progress ? 0 : i >= progress ? 100 : (1 - fraction) * 100;
    const revealClass = i + 1 <= progress ? 'drawn' : 'partial';
    return `<mask id="route-mask-${player}-${i}" mask-type="alpha"><path class="route-reveal-mask ${revealClass}" style="stroke-dashoffset:${offset}" d="${d}" pathLength="100"></path></mask>
      <path id="leg-${player}-${i}" class="journey-route ${player}" d="${d}" mask="url(#route-mask-${player}-${i})"></path>`;
  })).join('');

  const furthest = routeDistance(Math.max(student.position, guide.position));
  const arrivals = Array.from({ length: Math.min(LAST, Math.floor(furthest)) }, (_, i) => i + 1).map(i => `<g class="arrival-marker" transform="translate(${fmt(points[i].x)} ${fmt(points[i].y)})" aria-label="Reached ${escapeHtml(journey[i].name)}">
      <circle r="19"></circle><text y="4" text-anchor="middle">${String(i + 1).padStart(2, '0')}</text>
    </g>`).join('');

  const pins = ['student', 'guide'].map(key => {
    const player = game.players[key];
    const moving = anim && anim.player === key;
    const falling = game.backAnim && game.backAnim.player === key;
    const at = avatarPosition(moving ? anim.from : falling ? game.backAnim.from : player.position, key);
    const ring = game.retry?.[key] || game.backed?.[key] || game.backAnim?.player === key
      ? 'ring-red'
      : player.position > 0 ? 'ring-green' : 'ring-none';
    return `<g class="player-pin ${key} ${ring}" data-pin="${key}" transform="translate(${fmt(at.x)} ${fmt(at.y)})" aria-label="${escapeHtml(player.name)}">
      <circle r="12.6"></circle>
      ${avatarSvg(player.avatar, key)}
    </g>`;
  }).join('');

  return `<div class="map">
    <svg viewBox="0 0 1600 920" preserveAspectRatio="xMidYMid slice" aria-label="Europe expedition map from London to Istanbul. Drag to pan and use the mouse wheel to zoom.">
      <g class="map-world" transform="${mapTransform(view)}">
        <image class="map-base" href="/assets/episodes/episode01/europe%20locations.png" x="0" y="0" width="1600" height="920" preserveAspectRatio="none"></image>
        ${routeVisible ? `${legs}` : ''}
        ${showCityFocus ? `<circle class="city-focus complete" cx="${fmt(activeStop.x)}" cy="${fmt(activeStop.y)}" r="23"></circle>` : ''}
        ${canStart ? `<g class="start-hit-target interactive" transform="translate(${fmt(points[0].x)} ${fmt(points[0].y)})" data-action="start-challenge" tabindex="0" role="button" aria-label="Start in London">
          <circle class="start-hit-ring" r="24"></circle><circle class="start-hit-center" r="17"></circle>
          <text class="start-label" y="4" text-anchor="middle">START</text>
        </g>` : ''}
        ${arrivals}
        ${pins}
      </g>
    </svg>
    <div class="map-camera-tools" aria-label="Map controls">
      <button type="button" data-action="map-zoom-in" aria-label="Zoom in">+</button>
      <button type="button" data-action="map-zoom-out" aria-label="Zoom out">&minus;</button>
      <button type="button" data-action="map-overview" aria-label="Show all Europe">EUROPE</button>
    </div>
    ${routeVisible ? `<div class="map-arrival"><span>${betweenStops ? 'EN ROUTE TO' : `STOP ${String(arrivalIndex + 1).padStart(2, '0')}`}</span><strong>${escapeHtml(journey[arrivalIndex].name)}</strong></div>` : ''}
  </div>`;
}
