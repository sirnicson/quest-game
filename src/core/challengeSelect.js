import { buildDecks, mulberry32 } from './deck.js';
import { bankIds, challengeById } from './challengeBank.js';

let fallbackDecks = null;

export const deckFor = game => {
  if (game.decks) return game.decks;
  fallbackDecks ??= buildDecks(bankIds, 1);
  return fallbackDecks;
};

const hashId = id => [...String(id)].reduce((h, c) => (Math.imul(h, 31) + c.charCodeAt(0)) >>> 0, 7);

// Reading and Quiz options are shuffled per game (same order in both browsers) so the right answer is not always the same letter.
export function shuffledChallenge(item, seed) {
  if (!item?.options || !['Reading', 'Quiz'].includes(item.lane)) return item;
  const key = item.lane === 'Quiz' ? 'correct' : 'answer';
  const random = mulberry32((hashId(item.id) + (Number(seed) || 0)) >>> 0);
  const order = item.options.map((_, i) => i);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return { ...item, options: order.map(i => item.options[i]), [key]: order.indexOf(item[key]) };
}

// Challenge owned by the active player at their current spot; null once they have finished.
export function currentChallenge(game) {
  const player = game.activePlayer || 'student';
  const deck = deckFor(game)[player];
  const id = game.override?.[player] ?? deck[game.players[player].position];
  return id ? shuffledChallenge(challengeById(id), game.optionSeed ?? game.seed) : null;
}
