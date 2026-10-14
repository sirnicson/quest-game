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

function boundaryReplacement(game, player, index) {
  const decks = deckFor(game);
  const scheduled = new Set([...decks.student, ...decks.guide]);
  const alreadyUsed = new Set([
    ...Object.values(game.override ?? {}).filter(Boolean),
    ...(game.seenQuizzes ?? [])
  ]);
  const pool = Object.values(bankIds).flat().filter(candidate =>
    challengeById(candidate)?.lane !== 'Quiz' && !scheduled.has(candidate) && !alreadyUsed.has(candidate)
  );
  if (!pool.length) return null;
  const random = mulberry32((Number(game.seed ?? game.optionSeed ?? 0) + hashId(`${player}:route-boundary:${index}`)) >>> 0);
  return pool[Math.floor(random() * pool.length)];
}

// Challenge owned by the active player at their current spot; null once they have finished.
export function currentChallenge(game) {
  const player = game.activePlayer || 'student';
  const deck = deckFor(game)[player];
  const index = game.players[player].challengeIndex ?? game.players[player].position;
  let id = game.override?.[player] ?? deck[index];
  if (!id && index >= deck.length) {
    const previous = challengeById(deck.at(-1))?.lane;
    const pool = Object.values(bankIds).flat()
      .filter(candidate => challengeById(candidate)?.lane !== 'Quiz'
        && challengeById(candidate)?.lane !== previous);
    const random = mulberry32((Number(game.seed ?? game.optionSeed ?? 0) + hashId(`${player}:${index}`)) >>> 0);
    id = pool[Math.floor(random() * pool.length)];
  }
  let challenge = id ? challengeById(id) : null;
  const position = Number(game.players[player].position ?? 0);
  // Quiz slots are scheduled by question index, but Boost and Go Back move the
  // score-based avatar independently. Keep the first and final map stops non-Quiz.
  if (challenge?.lane === 'Quiz' && (position <= 0 || position >= 14)) {
    id = boundaryReplacement(game, player, index);
    challenge = id ? challengeById(id) : null;
  }
  return challenge ? shuffledChallenge(challenge, game.optionSeed ?? game.seed) : null;
}
