import { Briefing } from './Briefing.js';
import { Map } from './Map.js';
import { Challenge } from './Challenge.js';
import { Result } from './Result.js';
import { Finish } from './Finish.js';
import { FinishCelebration } from './FinishCelebration.js';
import { HUD } from '../../../components/HUD.js';
import { escapeHtml } from '../../../components/view.js';
import { episode01 } from '../../../data/episodes/index.js';

export function Episode01({game, episodes}) {
  if (game.screen === 'episode1Briefing') return Briefing(game);
  if (game.screen === 'report') return Finish(game);
  const movingIntoPreview = game.playerPreview && (game.moveAnim || game.backAnim || game.movementFeedback || game.transitionPhase === 'score');
  const movingIntoFinish = game.finishCelebration && (game.moveAnim || game.backAnim);
  const showMovementFeedback = game.movementFeedback && (game.moveAnim || game.backAnim || game.transitionPhase === 'score' || game.playerPreview);
  const overlay = game.screen === 'challenge' && showMovementFeedback
    ? `<div class="movement-feedback-overlay"><aside class="movement-feedback-slip" role="status">${escapeHtml(game.movementFeedback.message)}</aside></div>`
    : game.screen === 'challenge' && movingIntoFinish
      ? `<div class="challenge-overlay finish-overlay">${FinishCelebration(game)}</div>`
      : game.screen === 'challenge' && movingIntoPreview
        ? ''
        : game.screen === 'challenge'
          ? `<div class="challenge-overlay">${game.finishCelebration ? FinishCelebration(game) : Challenge(game)}</div>`
          : game.screen === 'result' ? `<div class="challenge-overlay result-overlay">${Result(game)}</div>` : '';
  return `<section class="game screen episode01-gameplay">${HUD(game,episode01)}<div class="game-body">${Map(game,episodes,{overlay})}</div></section>`;
}
export { Briefing, Map, Challenge, Result, Finish };
