import { avatarHtml } from '../../../data/avatars.js';
import { escapeHtml } from '../../../components/view.js';

export function FinishCelebration(game) {
  const celebration = game.finishCelebration;
  if (!celebration) return '';
  const player = game.players[celebration.player];
  const winner = celebration.place === 'winner';
  const confetti = winner ? ['left', 'right'].map(side => `<div class="finish-confetti-burst ${side}" aria-hidden="true">${Array.from({ length: 12 }, (_, i) => {
    const spread = 24 + (i * 19) % 88;
    const rise = 38 + (i * 31) % 105;
    const direction = side === 'left' ? 1 : -1;
    const rotation = (i * 47) % 260 - 130;
    return `<i style="--dx:${direction * spread}px;--dy:${-rise}px;--delay:${(i % 5) * 55}ms;--rotation:${rotation}deg"></i>`;
  }).join('')}</div>`).join('') : '';
  return `<div class="finish-celebration ${winner ? 'finish-celebration-winner' : 'finish-celebration-runner-up'}" role="status" aria-live="polite">
    ${confetti}
    <div class="finish-checkers" aria-hidden="true"></div>
    <p class="finish-place">${winner ? 'EPISODE WINNER' : 'RUNNER UP'}</p>
    <div class="finish-player"><span>${avatarHtml(player.avatar)}</span><strong>${escapeHtml(player.name)}</strong></div>
    <p class="finish-congrats">${winner ? 'A brilliant finish!' : 'Well done!'}</p>
    <div class="finish-checkers" aria-hidden="true"></div>
  </div>`;
}
