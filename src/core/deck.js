// Seeded RNG so decks are reproducible in tests.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const SKILLS = ['Quiz', 'Reading', 'Speaking', 'Writing', 'Listening'];
export const PER_SKILL = 3;

export function shuffle(list, random) {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// Orders a deck so the same skill never repeats back-to-back (retrying until it fits).
function orderDeck(entries, random) {
  for (let attempt = 0; attempt < 200; attempt++) {
    const order = shuffle(entries, random);
    if (order.every((entry, i) => i === 0 || entry.skill !== order[i - 1].skill)) return order;
  }
  return shuffle(entries, random);
}

export const QUIZ_STOPS = 3;

// Quiz stops are random per game: stops 2-14 (never the first or last), never next to each other.
// Returned as 0-based deck indices, shared by both players.
export function pickQuizStops(random, count = QUIZ_STOPS) {
  const candidates = Array.from({ length: 13 }, (_, i) => i + 1);
  for (let attempt = 0; attempt < 200; attempt++) {
    const picked = shuffle(candidates, random).slice(0, count).sort((a, b) => a - b);
    if (picked.every((index, i) => i === 0 || index - picked[i - 1] > 1)) return picked;
  }
  return [2, 6, 10].slice(0, count);
}

// bank: { Skill: [ids] }. Each player draws 3 per skill; the two decks never share a question.
// Both decks put their Quiz on the same random stops; every other stop holds a Reading/Speaking/Writing/Listening question.
export function buildDecks(bank, seed = Date.now()) {
  const random = mulberry32(seed);
  const pools = Object.fromEntries(SKILLS.map(skill => [skill, shuffle(bank[skill], random)]));
  const quizStops = pickQuizStops(random);
  const draw = offset => {
    const rest = orderDeck(
      SKILLS.filter(skill => skill !== 'Quiz').flatMap(skill => pools[skill].slice(offset, offset + PER_SKILL).map(id => ({ id, skill }))),
      random
    ).map(entry => entry.id);
    const quizzes = pools.Quiz.slice(offset, offset + PER_SKILL);
    const deck = [];
    for (let i = 0; i < 15; i++) deck.push(quizStops.includes(i) ? quizzes[quizStops.indexOf(i)] : rest.shift());
    return deck;
  };
  return { student: draw(0), guide: draw(PER_SKILL), quizStops };
}
