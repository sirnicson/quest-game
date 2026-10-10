import { Briefing } from './Briefing.js';
import { Map } from './Map.js';
import { Challenge } from './Challenge.js';
import { Result } from './Result.js';
import { Finish } from './Finish.js';
import { HUD } from '../../../components/HUD.js';
import { episode01 } from '../../../data/episodes/index.js';

export function Episode01({game, episodes}) {
  if (game.screen === 'episode1Briefing') return Briefing(game);
  if (game.screen === 'report') return Finish(game);
  const overlay = game.screen === 'challenge' ? `<div class="challenge-overlay">${Challenge(game)}</div>` : game.screen === 'result' ? `<div class="challenge-overlay result-overlay">${Result(game)}</div>` : '';
  return `<section class="game screen episode01-gameplay">${HUD(game,episode01)}<div class="game-body">${Map(game,episodes,{overlay})}</div></section>`;
}
export { Briefing, Map, Challenge, Result, Finish };
