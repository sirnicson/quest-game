import { avatarHtml } from '../../../data/avatars.js';
import { escapeHtml } from '../../../components/view.js';

export function FinishCelebration(game) {
  const celebration = game.finishCelebration;
  if (!celebration) return '';
  const player = game.players[celebration.player];
  const winner = celebration.place === 'winner';
  return `<div class="finish-celebration ${winner ? 'finish-celebration-winner' : 'finish-celebration-runner-up'}" role="status" aria-live="polite">
    <div class="finish-checkers" aria-hidden="true"></div>
    <p class="finish-place">${winner ? 'EPISODE WINNER' : 'RUNNER UP'}</p>
    <div class="finish-player"><span>${avatarHtml(player.avatar)}</span><strong>${escapeHtml(player.name)}</strong></div>
    <p class="finish-congrats">${winner ? 'A brilliant finish!' : 'A strong finish!'}</p>
    <div class="finish-checkers" aria-hidden="true"></div>
  </div>`;
}
