import { avatarSvg } from '../data/avatars.js';
import { escapeHtml } from './view.js';
import { journey } from '../data/episodes/episode01.js';

const mapImagePoint = (x, y) => ({
  x: x * 1600 / 1602,
  y: y * 920 / 982
});
const points = journey.map(place => mapImagePoint(place.x, place.y));
const LAST = points.length - 1;
const mapCenter = { x: 800, y: 460 };

const fmt = n => n.toFixed(1);
const routePoint = (x, y) => {
  const point = mapImagePoint(x, y);
  return `${fmt(point.x)} ${fmt(point.y)}`;
};

// Hand-drawn London -> Manchester leg; other legs are gentle curves between stops.
const londonToManchester = `M ${routePoint(371.4, 334.7)}
    C ${routePoint(365, 329)}, ${routePoint(370, 326)}, ${routePoint(358, 320)}
    C ${routePoint(348, 315)}, ${routePoint(362, 310)}, ${routePoint(354, 303)}
    C ${routePoint(347, 296)}, ${routePoint(336, 300)}, ${routePoint(340, 291)}
    C ${routePoint(344, 282)}, ${routePoint(328, 286)}, ${routePoint(331, 277)}
    C ${routePoint(334, 269)}, ${routePoint(319, 270)}, ${routePoint(319, 264)}
    C ${routePoint(318, 258)}, ${routePoint(311, 261)}, ${routePoint(308, 255)}`;

// Sea legs (stop index -> bow as a fraction of the leg length; the sign picks which side stays over water).
const SEA_LEGS = { 2: -0.1, 10: 0.07, 12: 0.15 };

export function legPath(index) {
  if (index === 0) return londonToManchester;
  const a = points[index];
  const b = points[index + 1];
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  if (index in SEA_LEGS) {
    // A boat's course: one smooth, unhurried arc.
    const bow = len * SEA_LEGS[index];
    return `M ${fmt(a.x)} ${fmt(a.y)} C ${fmt(a.x + dx * 0.3 + nx * bow)} ${fmt(a.y + dy * 0.3 + ny * bow)}, ${fmt(a.x + dx * 0.7 + nx * bow)} ${fmt(a.y + dy * 0.7 + ny * bow)}, ${fmt(b.x)} ${fmt(b.y)}`;
  }
  // Land legs: a road that bends, then straightens, then bends again, joined by a smooth spline.
  const bends = Math.max(3, Math.min(8, Math.round(len / 55)));
  const amp = Math.min(24, len * 0.1);
  const way = [a];
  for (let k = 1; k <= bends; k++) {
    const t = Math.min(0.95, Math.max(0.05, k / (bends + 1) + 0.06 * Math.sin(index * 3.1 + k * 2.2)));
    const wave = Math.sin(index * 2.3 + k * 1.7);
    const strength = Math.abs(wave) < 0.3 ? 0 : wave;
    way.push({ x: a.x + dx * t + nx * amp * strength, y: a.y + dy * t + ny * amp * strength });
  }
  way.push(b);
  let d = `M ${fmt(a.x)} ${fmt(a.y)}`;
  for (let i = 0; i < way.length - 1; i++) {
    const p0 = way[i - 1] ?? way[i];
    const p1 = way[i];
    const p2 = way[i + 1];
    const p3 = way[i + 2] ?? p2;
    d += ` C ${fmt(p1.x + (p2.x - p0.x) / 6)} ${fmt(p1.y + (p2.y - p0.y) / 6)}, ${fmt(p2.x - (p3.x - p1.x) / 6)} ${fmt(p2.y - (p3.y - p1.y) / 6)}, ${fmt(p2.x)} ${fmt(p2.y)}`;
  }
  return d;
}

// A stop index is clamped to the map: position 15 (finished) is shown at Istanbul.
export const stopIndex = position => Math.max(0, Math.min(LAST, position));

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

const PIN_OFFSET = { student: -42, guide: 42 };

export function mapSvg(episode, game) {
  const { student, guide } = game.players;
  const furthest = Math.max(student.position, guide.position);
  const routeVisible = Boolean(game.routeVisible || (game.reached ?? 0) > 0 || furthest > 0);
  const view = game.mapView || mapCameraPose(game.camera);
  const activeIndex = stopIndex(game.players[game.activePlayer || 'student'].position);
  const activeStop = points[activeIndex];
  const canStart = game.screen === 'map' && !routeVisible;
  const anim = game.moveAnim;
  const back = game.backAnim;
  const legCount = Math.min(LAST, Math.max(furthest, back ? back.from : 0));

  const legs = Array.from({ length: legCount }, (_, i) => {
    const d = legPath(i);
    const drawing = Boolean(anim) && i >= anim.from && i < anim.to;
    const undrawing = Boolean(back) && i >= furthest && i < back.from;
    return `<mask id="route-mask-${i}" mask-type="alpha"><path class="route-reveal-mask ${drawing ? 'drawing' : undrawing ? 'undrawing' : 'drawn'}" style="${drawing ? `animation-delay:${(i - anim.from) * 4200}ms` : ''}" d="${d}" pathLength="100"></path></mask>
      <path id="leg-${i}" class="journey-route" d="${d}" mask="url(#route-mask-${i})"></path>`;
  }).join('');

  const arrivals = Array.from({ length: Math.min(LAST, furthest) }, (_, i) => i + 1).map(i => `<g class="arrival-marker" transform="translate(${fmt(points[i].x)} ${fmt(points[i].y)})" aria-label="Reached ${escapeHtml(journey[i].name)}">
      <circle r="19"></circle><text y="4" text-anchor="middle">${String(i + 1).padStart(2, '0')}</text>
    </g>`).join('');

  const pins = ['student', 'guide'].map(key => {
    const player = game.players[key];
    const moving = anim && anim.player === key;
    const falling = game.backAnim && game.backAnim.player === key;
    const at = points[stopIndex(moving ? anim.from : falling ? game.backAnim.from : player.position)];
    const ring = game.retry?.[key] ? 'ring-red' : player.position > 0 ? 'ring-green' : 'ring-yellow';
    return `<g class="player-pin ${key} ${ring}" data-pin="${key}" data-offset="${PIN_OFFSET[key]}" transform="translate(${fmt(at.x + PIN_OFFSET[key])} ${fmt(at.y + 12)})" aria-label="${escapeHtml(player.name)}">
      <circle r="12.6"></circle>
      ${avatarSvg(player.avatar, key)}
    </g>`;
  }).join('');

  return `<div class="map">
    <svg viewBox="0 0 1600 920" preserveAspectRatio="xMidYMid slice" aria-label="Europe expedition map from London to Istanbul. Drag to pan and use the mouse wheel to zoom.">
      <g class="map-world" transform="${mapTransform(view)}">
        <image class="map-base" href="/assets/episodes/episode01/europe%20locations.png" x="0" y="0" width="1600" height="920" preserveAspectRatio="none"></image>
        ${routeVisible ? `${legs}` : ''}
        ${routeVisible ? `<circle class="city-focus complete" cx="${fmt(activeStop.x)}" cy="${fmt(activeStop.y)}" r="23"></circle>` : ''}
        ${!routeVisible ? `<g class="start-hit-target ${canStart ? 'interactive' : ''}" transform="translate(${fmt(points[0].x)} ${fmt(points[0].y)})" ${canStart ? 'data-action="start-challenge" tabindex="0" role="button" aria-label="Start in London"' : ''}>
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
    ${routeVisible ? `<div class="map-arrival"><span>STOP ${String(activeIndex + 1).padStart(2, '0')}</span><strong>${escapeHtml(journey[activeIndex].name)}</strong></div>` : ''}
  </div>`;
}
