import { avatarHtml } from '../../../data/avatars.js';
import { button, escapeHtml } from '../../../components/view.js';
import { episode01 } from '../../../data/episodes/index.js';
import { isSoundEnabled } from '../../../core/audio.js';
import { episode01PreviewMapSvg } from '../../../components/GameMap.js';

// In a two-player room the episode starts only once both players have pressed PLAY.
function playButton(game){
  if(!game.net?.seat) return button('PLAY EPISODE 01','episode-start','primary');
  if(!game.net.meReady) return button('PLAY EPISODE 01','episode-ready','primary');
  const other=game.players[game.net.seat==='student' ? 'guide' : 'student'].name;
  return `<button type="button" class="btn primary" disabled>WAITING FOR ${escapeHtml(other.toUpperCase())}…</button>`;
}
export function Briefing(game){const route=episode01;const soundEnabled=isSoundEnabled();return `<section class="episode-briefing screen"><div class="episode-map-art" aria-hidden="true">${episode01PreviewMapSvg()}<div class="episode-map-vignette"></div></div><header class="episode-briefing-top"><div class="briefing-brand"><img src="${new URL('../../../../assets/favicon.svg',import.meta.url).href}" alt=""><span>QUEST</span></div></header><div class="episode-briefing-copy"><div class="eyebrow">EPISODE 01</div><h2>${escapeHtml(route.title)}</h2><div class="episode-route-title">${escapeHtml(route.start.name.split(',')[0])} <b>→</b> ${escapeHtml(route.stops.at(-1).name.split(',')[0])}</div><p>Our journey begins in London. We go to the north to cross the English Sea and leave familiar roads behind. For east we must go, to reach Constantinopol.</p><div class="episode-stats"><div><strong>15</strong><span>STOPS</span></div><div><strong>50:00</strong><span>TIME</span></div></div><div class="briefing-players"><span>${avatarHtml(game.players.student.avatar)} ${escapeHtml(game.players.student.name)}</span><span>${avatarHtml(game.players.guide.avatar)} ${escapeHtml(game.players.guide.name)}</span></div>${playButton(game)}</div><button type="button" class="sound-toggle" data-action="toggle-sound" aria-pressed="${soundEnabled}" aria-label="Sound ${soundEnabled ? 'on' : 'off'}"><span aria-hidden="true">${soundEnabled ? '🔊' : '🔇'}</span> SOUND ${soundEnabled ? 'ON' : 'OFF'}</button></section>`;}
