import { avatarHtml } from '../../../data/avatars.js';
import { escapeHtml } from '../../../components/view.js';
import { button } from '../../../components/view.js';

const other = player => player === 'student' ? 'guide' : 'student';

export function Finish(game) {
  const bothFinished = game.players.student.position >= 15 && game.players.guide.position >= 15;
  if (!bothFinished) {
    const studentScore = game.scores?.student ?? 0;
    const guideScore = game.scores?.guide ?? 0;
    const timeoutPlayers = [
      { id: 'student', score: studentScore },
      { id: 'guide', score: guideScore }
    ].sort((a, b) => b.score - a.score);
    return `<section class="report screen timeout-report">
      <video class="report-video" autoplay muted loop playsinline aria-hidden="true">
        <source src="/assets/episodes/episode01/hagia-sophia-drone.mp4" type="video/mp4">
      </video>
      <div class="report-art" aria-hidden="true"></div>
      <div class="report-content">
        <div class="timeout-clock">TIME UP</div>
        <div class="eyebrow">EPISODE 01 · JOURNEY REPORT</div>
        <h1>QUEST FAILED</h1>
        <p>The 60-minute journey ended before both players reached Istanbul.</p>
        <div class="report-card">
          ${timeoutPlayers.map(({ id, score }) => `<article class="report-rank"><span class="report-avatar">${avatarHtml(game.players[id].avatar)}</span><strong>${escapeHtml(game.players[id].name)}</strong><b>${score}<small>pts</small></b></article>`).join('')}
        </div>
        <div class="report-actions">${button('PLAY AGAIN', 'replay-episode', 'primary')}<button type="button" class="btn ghost" disabled aria-disabled="true">VIEW EPISODE 02</button></div>
      </div>
    </section>`;
  }
  const winner = game.winner || 'student';
  const runnerUp = other(winner);
  const rankCard = (place, player, modifier) => `<article class="report-rank ${modifier}">
    <small>${place}</small>
    <span class="report-avatar">${avatarHtml(game.players[player].avatar)}</span>
    <strong>${escapeHtml(game.players[player].name)}</strong>
    <b>${game.scores?.[player] ?? 0}<small>pts</small></b>
  </article>`;
  return `<section class="report screen">
    <video class="report-video" autoplay muted loop playsinline aria-hidden="true">
      <source src="/assets/episodes/episode01/hagia-sophia-drone.mp4" type="video/mp4">
    </video>
    <div class="report-art" aria-hidden="true"></div>
    <div class="report-content">
      <div class="eyebrow">QUEST COMPLETE</div>
      <h1>The road remembers</h1>
      <p>Your expedition has ended. The journey continues in the next episode.</p>
      <div class="report-card">
        ${rankCard('Winner', winner, 'report-winner')}
        ${rankCard('Runner Up', runnerUp, 'report-runner-up')}
      </div>
      <div class="report-actions">
        <button type="button" class="btn primary" data-action="episode" data-stop="2">VIEW ROAD AHEAD</button>
        ${button('REPLAY EPISODE 01', 'replay-episode', 'ghost')}
      </div>
    </div>
  </section>`;
}
