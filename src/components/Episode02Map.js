import { escapeHtml } from './view.js';

const WIDTH = 1536;
const HEIGHT = 1024;
const format = value => Number(value).toFixed(1);

function project(place, bounds) {
  const x = (place.lon - bounds.west) / (bounds.east - bounds.west) * WIDTH;
  // Match the base map's Mercator projection so latitude positions don't drift
  // between the Middle East, South Asia and East Asia.
  const mercatorY = latitude => Math.log(Math.tan(Math.PI / 4 + latitude * Math.PI / 360));
  const north = mercatorY(bounds.north);
  const south = mercatorY(bounds.south);
  const y = (north - mercatorY(place.lat)) / (north - south) * HEIGHT;
  return { x, y };
}

function routePath(from, to, index) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.hypot(dx, dy) || 1;
  const nx = -dy / length;
  const ny = dx / length;
  const offset = Math.min(30, length * 0.13) * (index % 2 ? -1 : 1);
  const c1x = from.x + dx * 0.3 + nx * offset;
  const c1y = from.y + dy * 0.3 + ny * offset;
  const c2x = from.x + dx * 0.7 + nx * offset;
  const c2y = from.y + dy * 0.7 + ny * offset;
  return `M ${format(from.x)} ${format(from.y)} C ${format(c1x)} ${format(c1y)}, ${format(c2x)} ${format(c2y)}, ${format(to.x)} ${format(to.y)}`;
}

function cityLabel(name) {
  return name.split(',')[0];
}

export function Episode02Map({ episode }) {
  const places = [episode.start, ...episode.stops];
  const points = places.map(place => project(place, episode.bounds));
  const route = places.slice(0, -1).map((_, index) =>
    `<path class="episode-preview-route" d="${routePath(points[index], points[index + 1], index)}"/>`
  ).join('');
  const markers = places.map((place, index) => {
    const point = points[index];
    const label = [
      [22, -23, 'start'], [-18, -19, 'end'], [20, 22, 'start'], [-18, -20, 'end'],
      [20, -16, 'start'], [-18, 21, 'end'], [-19, 23, 'end'], [20, -19, 'start'],
      [-19, 22, 'end'], [-18, 22, 'end'], [19, -19, 'start'], [-19, 22, 'end'],
      [19, -19, 'start'], [19, -20, 'start'], [19, -20, 'start']
    ][index];
    return `<g class="episode02-stop-marker" transform="translate(${format(point.x)} ${format(point.y)})" role="group" aria-label="Stop ${String(index + 1).padStart(2, '0')}: ${escapeHtml(place.name)}"><circle class="episode02-marker-ring" r="19"/><circle class="episode02-marker-core" r="14"/><text class="episode02-marker-number" y="4">${String(index + 1).padStart(2, '0')}</text><text class="episode02-city-label" x="${label[0]}" y="${label[1]}" text-anchor="${label[2]}">${escapeHtml(cityLabel(place.name))}</text></g>`;
  }).join('');

  return `<svg class="episode02-route-map" viewBox="0 0 ${WIDTH} ${HEIGHT}" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Route map from Istanbul to Beijing with one dashed route through all 15 city stops"><g class="episode-preview-routes">${route}</g><g class="episode02-markers">${markers}</g></svg>`;
}
