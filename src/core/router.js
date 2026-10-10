import { advanceScreen, reduceAction } from './gameState.js';

export function navigate(game, screen) {
  return reduceAction(game, { type: 'navigate', screen });
}

export function back(game) {
  return reduceAction(game, 'back');
}

export function home(game) {
  return reduceAction(game, 'home-reset');
}

export { advanceScreen };
