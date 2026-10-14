import { escapeHtml } from './view.js';

export function EpisodeMapPending({ episode }) {
  return `<div class="map episode-map-pending" role="img" aria-label="Route overview for Episode 0${episode.id}: ${escapeHtml(episode.start.name)} to ${escapeHtml(episode.stops.at(-1).name)}">
    <div><span>EXPEDITION ROUTE</span><strong>${escapeHtml(episode.start.name)} <i>→</i> ${escapeHtml(episode.stops.at(-1).name)}</strong><small>Map preview artwork will be added for this leg.</small></div>
  </div>`;
}
