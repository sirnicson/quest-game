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
function orderDeck(entries, random, previousSkill = null) {
  for (let attempt = 0; attempt < 200; attempt++) {
    const order = shuffle(entries, random);
    if ((previousSkill == null || order[0]?.skill !== previousSkill)
      && order.every((entry, i) => i === 0 || entry.skill !== order[i - 1].skill)) return order;
  }
  return shuffle(entries, random);
}

export const QUIZ_STOPS = 3;

// Quiz stops are randomized independently for each player: deck stops 2-14,
// never the first or last, and never next to each other. Indices are 0-based.
export function pickQuizStops(random, count = QUIZ_STOPS) {
  const candidates = Array.from({ length: 13 }, (_, i) => i + 1);
  for (let attempt = 0; attempt < 200; attempt++) {
    const picked = shuffle(candidates, random).slice(0, count).sort((a, b) => a - b);
    if (picked.every((index, i) => i === 0 || index - picked[i - 1] > 1)) return picked;
  }
  return [2, 6, 10].slice(0, count);
}

// bank: { Skill: [ids] }. The first 15 challenges have exactly 3 per skill;
// remaining non-Quiz questions are split between players for longer score-based journeys.
export function buildDecks(bank, seed = Date.now()) {
  const random = mulberry32(seed);
  const pools = Object.fromEntries(SKILLS.map(skill => [skill, shuffle(bank[skill], random)]));
  const quizStops = {
    student: pickQuizStops(random),
    guide: pickQuizStops(random)
  };
  const draw = (offset, player) => {
    const rest = orderDeck(
      SKILLS.filter(skill => skill !== 'Quiz').flatMap(skill => pools[skill].slice(offset, offset + PER_SKILL).map(id => ({ id, skill }))),
      random
    ).map(entry => entry.id);
    const quizzes = pools.Quiz.slice(offset, offset + PER_SKILL);
    const deck = [];
    const stops = quizStops[player];
    for (let i = 0; i < 15; i++) deck.push(stops.includes(i) ? quizzes[stops.indexOf(i)] : rest.shift());
    const used = new Set(deck);
    const continuation = SKILLS.filter(skill => skill !== 'Quiz')
      .flatMap(skill => pools[skill].filter(id => !used.has(id)).map(id => ({ id, skill })));
    return [...deck, ...orderDeck(continuation, random, challengeByLane(deck.at(-1))).map(entry => entry.id)];
  };
  return { student: draw(0, 'student'), guide: draw(PER_SKILL, 'guide'), quizStops };
}

function challengeByLane(id) {
  return id == null ? null : id.slice(0, 2) === 'QZ' ? 'Quiz'
    : id.slice(0, 2) === 'RD' ? 'Reading'
      : id.slice(0, 2) === 'SP' ? 'Speaking'
        : id.slice(0, 2) === 'WR' ? 'Writing' : id.slice(0, 2) === 'LS' ? 'Listening' : null;
}
