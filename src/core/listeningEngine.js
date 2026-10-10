import { listeningBank } from '../data/episodes/listeningBank.js';

// Maximum number of typed words allowed for each answer type.
export const WORD_LIMITS = {
  one_word: 1,
  number: 1,
  one_word_or_number: 1,
  short_phrase: 3,
  time: 3
};

export const getListeningItem = id => listeningBank.find(entry => entry.id === id) ?? null;

export const normalizeAnswer = value => String(value ?? '')
  .toLowerCase()
  .replace(/[’‘]/g, "'")
  .replace(/(\d)\s*(am|pm)\b/g, '$1 $2')
  .replace(/[^a-z0-9:.' ]+/g, ' ')
  .replace(/\s+/g, ' ')
  .replace(/^[.\s]+|[.\s]+$/g, '');

const ONES = { zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19 };
const TENS = { twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90 };
const UNITS = { min: 'minutes', mins: 'minutes', minute: 'minutes', minutes: 'minutes', hr: 'hours', hrs: 'hours', hour: 'hours', hours: 'hours' };

// "9mins", "nine minutes" and "9 minutes" all reduce to the same tokens ("9", "minutes").
function canonicalTokens(value) {
  const raw = normalizeAnswer(value).replace(/(\d)([a-z])/g, '$1 $2').replace(/([a-z])(\d)/g, '$1 $2').split(' ').filter(Boolean);
  const tokens = [];
  for (const word of raw) {
    const w = word.replace(/-/g, '');
    if (w in TENS) tokens.push(String(TENS[w]));
    else if (w in ONES) {
      const last = tokens[tokens.length - 1];
      if (ONES[w] < 10 && last && /^[2-9]0$/.test(last)) tokens[tokens.length - 1] = String(Number(last) + ONES[w]);
      else tokens.push(String(ONES[w]));
    } else tokens.push(UNITS[w] ?? w);
  }
  return tokens;
}
const isUnit = token => token === 'minutes' || token === 'hours';
const withoutUnits = tokens => tokens.filter(token => !isUnit(token));

// Unit words ("minutes", "hours") are not counted against the word limit.
export const countWords = value => withoutUnits(canonicalTokens(value)).length || (canonicalTokens(value).length ? 1 : 0);

// status: empty | over-limit | correct | incorrect. Only correct/incorrect finish the player's turn.
export function checkListeningAnswer(item, input) {
  const limit = WORD_LIMITS[item.answerType] ?? 1;
  const words = countWords(input);
  if (!words) return { status: 'empty', words, limit, message: 'Type your answer first.' };
  if (words > limit) {
    return { status: 'over-limit', words, limit, message: `Too many words — use no more than ${limit}.` };
  }
  const given = canonicalTokens(input);
  const same = (a, b) => a.length === b.length && a.every((token, i) => token === b[i]);
  const correct = item.accepted.some(answer => {
    const target = canonicalTokens(answer);
    return same(target, given) || same(withoutUnits(target), withoutUnits(given));
  });
  return correct
    ? { status: 'correct', words, limit, message: 'Correct!' }
    : { status: 'incorrect', words, limit, message: 'Not quite. Try again on your next turn.' };
}

// Builds a challenge object for the path, in the same shape as the other lanes.
export function listeningChallenge(id) {
  const entry = getListeningItem(id);
  if (!entry) throw new Error(`Unknown listening item: ${id}`);
  return { id: entry.id, lane: 'Listening', icon: '🎧', title: entry.topic, prompt: entry.prompt, listening: entry, move: 1 };
}

// Picks a random unused item so repeat games do not replay the same clips.
export function pickListeningItem(usedIds = [], random = Math.random) {
  const pool = listeningBank.filter(entry => !usedIds.includes(entry.id));
  const source = pool.length ? pool : listeningBank;
  return source[Math.floor(random() * source.length)];
}

export const LISTENING_POINTS = 5;
