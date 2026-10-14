import { avatarHtml } from '../../../data/avatars.js';
import { mapSvg, episode01PreviewMapSvg } from '../../../components/GameMap.js';
import { episode01 } from '../../../data/episodes/index.js';
import { escapeHtml } from '../../../components/view.js';

export function Map(game, allEpisodes, { overlay='' }={}) {
  const episode=episode01;
  const displayedScores=game.displayScores ?? game.scores ?? {};
  const gameplay = !game.previewMode && ['map','challenge','result'].includes(game.screen);
  const mapClass = gameplay ? `map-stage camera-${String(game.camera).replace(/\W+/g, '-')}` : 'map-stage';
  const routeVisible = Boolean(game.routeVisible || game.players.student.position > 0 || game.players.guide.position > 0);
  const routeMilestones = !gameplay ? `<ol class="route-milestones preview" aria-label="Episode 01 route milestones">${[episode.start,...episode.stops].map((place,i)=>`<li><div class="route-milestone preview"><span>${String(i+1).padStart(2,'0')}</span><span class="milestone-name">${escapeHtml(place.name)}</span></div></li>`).join('')}</ol>` : '';
  return `<div class="map-wrap ${gameplay?'gameplay-map':''}">
    ${gameplay ? '' : `<nav class="episode-tabs" aria-label="Episode routes">${allEpisodes.map(item=>`<button type="button" class="episode-tab ${item.id===episode.id?'active':''}" data-action="episode" data-stop="${item.id}" aria-current="${item.id===episode.id?'page':'false'}"><span>0${item.id}</span><b>${item.title}</b></button>`).join('')}</nav>`}
    ${gameplay ? `<div class="gameplay-title"><span>${escapeHtml(episode.title)}</span><b>EPISODE 01 · ${escapeHtml(episode.start.name.split(',')[0])} → ${escapeHtml(episode.stops.at(-1).name.split(',')[0])}</b></div>` : `<div class="map-heading"><span>CHAPTER 01 · 1 OF 05</span><h1>EPISODE 01 <i>·</i> ${escapeHtml(episode.title)}</h1><p>${episode.start.name} <b>→</b> ${episode.stops.at(-1).name}</p></div>`}
    <div class="${mapClass}">${gameplay ? mapSvg({...episode, routeVisible},game) : episode01PreviewMapSvg()}${overlay}</div>
    ${gameplay && game.screen==='map' && !routeVisible ? `<div class="start-callout"><span>STOP 01</span><strong>${escapeHtml(episode.start.name)}</strong></div>` : ''}
    ${gameplay ? `<aside class="journey-scoreboard" aria-label="Journey scoreboard"><div><span><i aria-hidden="true">${avatarHtml(game.players.student.avatar)}</i>${escapeHtml(game.players.student.name)}</span><strong>${displayedScores.student ?? 0}</strong></div><div><span><i aria-hidden="true">${avatarHtml(game.players.guide.avatar)}</i>${escapeHtml(game.players.guide.name)}</span><strong>${displayedScores.guide ?? 0}</strong></div></aside>` : routeMilestones}
  </div>`;
}
