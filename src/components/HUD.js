import { formatTime } from './view.js';
import { isSoundEnabled } from '../core/audio.js';

export function HUD(game, episode) {
  const soundEnabled=isSoundEnabled();
  return `<header class="hud">
    <div class="hud-brand"><div class="hud-wordmark"><img src="${new URL('../../assets/favicon.svg',import.meta.url).href}" alt=""><strong>QUEST</strong></div><small>EPISODE 0${episode.id} · ${episode.title}</small></div>
    <div class="hud-center"><span>${game.players.student.name}</span><b>${game.players.student.position}/15</b><i></i><span>${game.players.guide.name}</span><b>${game.players.guide.position}/15</b></div>
    <div class="hud-clock"><button type="button" class="hud-sound" data-action="toggle-sound" aria-pressed="${soundEnabled}" aria-label="Sound ${soundEnabled ? 'on' : 'off'}">${soundEnabled ? '🔊' : '🔇'} SOUND ${soundEnabled ? 'ON' : 'OFF'}</button><strong>${formatTime(game.timerSeconds)}</strong></div>
  </header>`;
}
