import test from 'node:test';
import assert from 'node:assert/strict';
import { buildDecks } from '../src/core/deck.js';
import { bankIds, challengeById, checkQuizAnswer, checkReadingAnswer, checkWritingLength, writingVerdicts } from '../src/core/challengeBank.js';
import { createInitialGame, reduceAction, completePlayerTurn, punishOptions } from '../src/core/gameState.js';
import { currentChallenge } from '../src/core/challengeSelect.js';
import { journey } from '../src/data/episodes/episode01.js';

test('writing verdicts unlock by word count', () => {
  const item = { minWords: 25 };
  const words = n => Array(n).fill('word').join(' ');
  assert.deepEqual(writingVerdicts(item, ''), []);
  assert.deepEqual(writingVerdicts(item, words(1)), ['RETRY']);
  assert.deepEqual(writingVerdicts(item, words(10)), ['RETRY']);
  assert.deepEqual(writingVerdicts(item, words(11)), ['RETRY', 'FAIR']);
  assert.deepEqual(writingVerdicts(item, words(24)), ['RETRY', 'FAIR']);
  assert.deepEqual(writingVerdicts(item, words(25)), ['RETRY', 'FAIR', 'GOOD']);
});

test('bank has 10 items per episode skill and a central quiz bank of 30 general-knowledge items', () => {
  for (const skill of ['Reading', 'Speaking', 'Writing', 'Listening']) assert.equal(bankIds[skill].length, 10, skill);
  assert.equal(bankIds.Quiz.length, 30);
  for (const ids of Object.values(bankIds)) for (const id of ids) assert.ok(challengeById(id), id);
  for (const id of bankIds.Quiz) {
    const q = challengeById(id);
    assert.equal(q.options.length, 4, id);
    assert.equal(new Set(q.options).size, 4, id);
    assert.equal(q.options[q.correct], q.answer, id);
  }
});

test('each player gets an independent 15-challenge deck: 3 per skill, no repeats, no shared questions', () => {
  const { student, guide } = buildDecks(bankIds, 42);
  for (const deck of [student, guide]) {
    assert.equal(deck.length, 15);
    assert.equal(new Set(deck).size, 15);
    for (const skill of ['Quiz', 'Reading', 'Speaking', 'Writing', 'Listening']) {
      assert.equal(deck.filter(id => challengeById(id).lane === skill).length, 3);
    }
    deck.slice(1).forEach((id, i) => assert.notEqual(challengeById(id).lane, challengeById(deck[i]).lane));
  }
  assert.equal(student.filter(id => guide.includes(id)).length, 0);
  assert.notDeepEqual(student, guide);
});

test('decks are reproducible for a seed and differ between seeds', () => {
  assert.deepEqual(buildDecks(bankIds, 7), buildDecks(bankIds, 7));
  assert.notDeepEqual(buildDecks(bankIds, 7).student, buildDecks(bankIds, 8).student);
});

test('the route has 15 stops from London to Istanbul', () => {
  assert.equal(journey.length, 15);
  assert.match(journey[0].name, /London/);
  assert.match(journey.at(-1).name, /Istanbul/);
});

test('quiz answers accept spoken variants and reject wrong ones', () => {
  const imf = challengeById('QZ25');
  assert.equal(checkQuizAnswer(imf, imf.accepted[0]).status, 'correct');
  assert.equal(checkQuizAnswer(imf, `  ${imf.accepted[0].toUpperCase()}. `).status, 'correct');
  assert.equal(checkQuizAnswer(imf, `I think it is ${imf.accepted[0]}`).status, 'correct');
  assert.equal(checkQuizAnswer(imf, 'banana').status, 'incorrect');
  assert.equal(checkQuizAnswer(imf, '  ').status, 'empty');
});

test('reading and writing checks', () => {
  const rd = challengeById('RD01');
  assert.equal(checkReadingAnswer(rd, rd.answer).status, 'correct');
  assert.equal(checkReadingAnswer(rd, (rd.answer + 1) % 4).status, 'incorrect');
  assert.equal(checkReadingAnswer(rd, null).status, 'empty');
  const wr = challengeById('WR01');
  assert.equal(checkWritingLength(wr, 'word '.repeat(wr.minWords - 1)).ok, false);
  assert.equal(checkWritingLength(wr, 'word '.repeat(wr.minWords)).ok, true);
  assert.equal(checkWritingLength(wr, 'word '.repeat(wr.maxWords + 1)).ok, false);
});

test('episode start deals decks; challenge owner follows the active player and position', () => {
  const game = reduceAction(createInitialGame(), { type: 'start-episode', episodeId: 1, seed: 5 });
  const { student, guide } = game.decks;
  assert.equal(currentChallenge(game).id, student[0]);
  const afterP1 = completePlayerTurn(game, 5);
  assert.equal(afterP1.activePlayer, 'guide');
  assert.equal(currentChallenge(afterP1).id, guide[0]);
  const afterP2 = completePlayerTurn(afterP1, 5);
  assert.equal(afterP2.activePlayer, 'student');
  assert.equal(currentChallenge(afterP2).id, student[1]);
  assert.equal(afterP2.activeStop, 2);
});

test('a failed non-quiz challenge keeps the same question, marks RETRY, and the other player continues', () => {
  const base = reduceAction(createInitialGame(), { type: 'start-episode', episodeId: 1, seed: 5 });
  const nonQuiz = id => challengeById(id).lane !== 'Quiz';
  const idx = base.decks.student.findIndex(nonQuiz);
  const game = { ...base, players: { ...base.players, student: { ...base.players.student, position: idx } } };
  const failed = completePlayerTurn(game, 0);
  assert.equal(failed.players.student.position, idx);
  assert.equal(failed.retry.student, true);
  assert.equal(failed.moveAnim, null);
  const back = completePlayerTurn(failed, 0);
  assert.equal(currentChallenge(back).id, game.decks.student[idx]);
});

test('a failed quiz retries with a different, unseen question that is not in either deck', () => {
  const base = reduceAction(createInitialGame(), { type: 'start-episode', episodeId: 1, seed: 5 });
  const idx = base.decks.student.findIndex(id => challengeById(id).lane === 'Quiz');
  const quizId = base.decks.student[idx];
  let game = { ...base, players: { ...base.players, student: { ...base.players.student, position: idx } } };
  const inDecks = new Set([...base.decks.student, ...base.decks.guide]);
  const seen = new Set([quizId]);
  for (let i = 0; i < 4; i++) {
    game = completePlayerTurn(game, 0);
    game = completePlayerTurn({ ...game, activePlayer: 'guide' }, 0);
    game = { ...game, activePlayer: 'student' };
    const next = currentChallenge(game);
    assert.ok(!inDecks.has(next.id) && !seen.has(next.id));
    if (next.lane !== 'Quiz') break;
    seen.add(next.id);
  }
  const ok = completePlayerTurn(game, 5);
  assert.equal(ok.override.student, null);
  assert.equal(currentChallenge({ ...ok, activePlayer: 'student' }).id, base.decks.student[idx + 1]);
});

test('a finished player is skipped; both finished goes to the report', () => {
  let game = reduceAction(createInitialGame(), { type: 'start-episode', episodeId: 1, seed: 5 });
  game = { ...game, players: { ...game.players, student: { ...game.players.student, position: 14 }, guide: { ...game.players.guide, position: 15 } } };
  const done = completePlayerTurn(game, 5);
  assert.equal(done.players.student.position, 15);
  assert.equal(done.screen, 'report');
  game = { ...game, players: { ...game.players, student: { ...game.players.student, position: 3 } } };
  const skip = completePlayerTurn(game, 0);
  assert.equal(skip.activePlayer, 'student');
  assert.equal(skip.screen, 'challenge');
});

const startedGame = (seed = 5) => reduceAction(createInitialGame(), { type: 'start-episode', episodeId: 1, seed });
const atPositions = (game, student, guide, scores = game.scores) => ({
  ...game, scores,
  players: { ...game.players, student: { ...game.players.student, position: student }, guide: { ...game.players.guide, position: guide } }
});
const firstNonQuizAt = (game, player) => game.decks[player].findIndex(id => challengeById(id).lane !== 'Quiz' && challengeById(id).lane !== 'Listening');

test('failing the same stop twice sends the player one stop back, except at London', () => {
  const base = startedGame();
  const idx = Math.max(1, firstNonQuizAt(base, 'student'));
  let game = atPositions(base, idx, 0);
  game = completePlayerTurn(game, 0);
  game = completePlayerTurn({ ...game, activePlayer: 'student' }, 0);
  assert.equal(game.players.student.position, idx - 1);
  assert.match(game.notice, /falls back 1 stop/);
  let london = atPositions(base, 0, 0);
  for (let i = 0; i < 3; i++) london = completePlayerTurn({ ...completePlayerTurn({ ...london, activePlayer: 'student' }, 0), activePlayer: 'student' }, 0);
  assert.equal(london.players.student.position, 0);
});

test('a retry is capped at 3 pts, keeps its reason, and both reset after a drop', () => {
  const base = startedGame();
  const idx = Math.max(1, firstNonQuizAt(base, 'student'));
  let game = atPositions(base, idx, 0);
  game = completePlayerTurn({ ...game, verdictReason: 'SHORT' }, 0);
  assert.equal(game.retry.student, true);
  assert.equal(game.retryReason.student, 'SHORT');
  assert.equal(game.verdictReason, null);
  const capped = completePlayerTurn({ ...game, activePlayer: 'student' }, 5);
  assert.equal(capped.scores.student, 3);
  assert.equal(capped.retryReason.student, null);
  const fair = completePlayerTurn({ ...game, activePlayer: 'student' }, 2);
  assert.equal(fair.scores.student, 2);
  const dropped = completePlayerTurn({ ...game, activePlayer: 'student', verdictReason: 'UNCLEAR' }, 0);
  assert.equal(dropped.players.student.position, idx - 1);
  assert.equal(dropped.retry.student, false);
  assert.equal(dropped.retryReason.student, null);
  const fresh = completePlayerTurn({ ...dropped, activePlayer: 'student' }, 5);
  assert.equal(fresh.scores.student, 5);
});

test('listening accepts digits, number words and unit variants', async () => {
  const { getListeningItem, checkListeningAnswer } = await import('../src/core/listeningEngine.js');
  const ninety = getListeningItem(bankIds.Listening[5]);
  for (const a of ['90 minutes', '90 mins', '90mins', 'ninety minutes', 'Ninety Mins', 'ninety']) assert.equal(checkListeningAnswer(ninety, a).status, 'correct', a);
  assert.equal(checkListeningAnswer(ninety, '9 minutes').status, 'incorrect');
  const nine = getListeningItem(bankIds.Listening[7]);
  for (const a of ['9', 'nine', '9 mins', '9mins', 'nine minutes', '9 minutes', "nine o'clock"]) assert.equal(checkListeningAnswer(nine, a).status, 'correct', a);
});

test('Reading and Quiz options are shuffled per game and keep the right answer', async () => {
  const { shuffledChallenge } = await import('../src/core/challengeSelect.js');
  const positions = new Set();
  for (let seed = 1; seed <= 20; seed++) {
    for (const id of [...bankIds.Reading, ...bankIds.Quiz]) {
      const raw = challengeById(id);
      const key = raw.lane === 'Quiz' ? 'correct' : 'answer';
      const shuffled = shuffledChallenge(raw, seed);
      assert.equal(shuffled.options[shuffled[key]], raw.options[raw[key]]);
      positions.add(shuffled[key]);
    }
  }
  assert.equal(positions.size, 4);
  assert.deepEqual(shuffledChallenge(challengeById('RD01'), 7), shuffledChallenge(challengeById('RD01'), 7));
});

test('a failed Quiz never counts toward the two-fail drop', () => {
  const base = startedGame();
  const quizId = base.decks.student.find(id => challengeById(id).lane === 'Quiz');
  const decks = { ...base.decks, student: base.decks.student.map((id, i) => i === 2 ? quizId : id) };
  let game = atPositions({ ...base, decks }, 2, 0);
  for (let i = 0; i < 2; i++) {
    game = completePlayerTurn({ ...game, activePlayer: 'student', override: { student: null, guide: null } }, 0);
    assert.equal(game.players.student.position, 2);
  }
});

test('the first player to finish stop 15 gets +10 once', () => {
  const base = startedGame();
  const first = completePlayerTurn(atPositions(base, 14, 3, { student: 5, guide: 0 }), 5);
  assert.equal(first.winner, 'student');
  assert.equal(first.scores.student, 20);
  const second = completePlayerTurn({ ...first, activePlayer: 'guide', players: { ...first.players, guide: { ...first.players.guide, position: 14 } } }, 5);
  assert.equal(second.scores.guide, 5);
  assert.equal(second.winner, 'student');
});

test('Quiz sits on the same 3 random stops (2-14, never adjacent) in both decks and changes with the seed', () => {
  const seen = new Set();
  for (let seed = 1; seed <= 40; seed++) {
    const { student, guide, quizStops } = buildDecks(bankIds, seed);
    assert.equal(quizStops.length, 3);
    quizStops.forEach((index, i) => {
      assert.ok(index >= 1 && index <= 13);
      if (i) assert.ok(index - quizStops[i - 1] > 1);
    });
    for (const deck of [student, guide]) deck.forEach((id, i) => assert.equal(challengeById(id).lane === 'Quiz', quizStops.includes(i)));
    seen.add(quizStops.join());
  }
  assert.ok(seen.size > 5);
});

test('Quiz rewards: only unspent, effective ones are offered; each is once per player', () => {
  const base = startedGame();
  assert.deepEqual(punishOptions(atPositions(base, 2, 0, { student: 0, guide: 0 })), ['freeze', 'boost']);
  assert.deepEqual(punishOptions(atPositions(base, 2, 4, { student: 0, guide: 3 })), ['freeze', 'back', 'boost']);
  assert.deepEqual(punishOptions(atPositions(base, 6, 2, { student: 9, guide: 3 })), ['freeze', 'back']);
  const spent = { ...atPositions(base, 2, 4, { student: 0, guide: 0 }), rewardsUsed: { student: ['freeze'], guide: [] } };
  assert.deepEqual(punishOptions(spent), ['back', 'boost']);
  assert.deepEqual(punishOptions({ ...spent, activePlayer: 'guide' }), ['freeze', 'back', 'boost']);
  assert.deepEqual(punishOptions(atPositions(base, 2, 15)), []);
});

test('Quiz rewards apply at once and are spent: freeze, back (-2 PTS), boost (max 2 stops)', () => {
  const base = startedGame();
  const pick = (type, g) => completePlayerTurn({ ...g, punish: { type, by: 'student' } }, 5);
  const g = atPositions(base, 2, 4, { student: 0, guide: 12 });
  const frozen = pick('freeze', g);
  assert.equal(frozen.activePlayer, 'student');
  assert.deepEqual(frozen.rewardsUsed, { student: ['freeze'], guide: [] });
  assert.match(frozen.notice, /is frozen.*skips a turn/);
  const back = pick('back', g);
  assert.equal(back.players.guide.position, 3);
  assert.equal(back.scores.guide, 10);
  assert.deepEqual(back.backAnim, { player: 'guide', from: 4, to: 3 });
  assert.equal(back.activePlayer, 'guide');
  assert.deepEqual(back.rewardsUsed.student, ['back']);
  const boost = pick('boost', g);
  assert.equal(boost.players.student.position, 5);
  assert.equal(boost.scores.student, 17);
  assert.deepEqual(boost.rewardsUsed.student, ['boost']);
  assert.deepEqual(boost.moveAnim, { player: 'student', from: 2, to: 5 });
  assert.equal(pick('boost', { ...g, rewardsUsed: { student: ['boost'], guide: [] } }).players.student.position, 3);
});
test('a player sent back onto a Quiz stop gets a skill question there, not a Quiz', () => {
  const base = startedGame();
  const quizAt = base.quizStops?.[0] ?? base.decks.quizStops[0];
  const g = atPositions(base, 1, quizAt + 1, { student: 0, guide: 5 });
  const back = completePlayerTurn({ ...g, punish: { type: 'back', by: 'student' } }, 5);
  assert.equal(back.players.guide.position, quizAt);
  const shown = currentChallenge({ ...back, activePlayer: 'guide' });
  assert.notEqual(shown.lane, 'Quiz');
});
test('quiz pictures, when set, exist on disk', async () => {
  const { existsSync } = await import('node:fs');
  const { quizBank } = await import('../src/data/quizBank.js');
  const withPic = quizBank.filter(q => q.image);
  assert.ok(withPic.length >= 10);
  for (const q of withPic) assert.ok(existsSync(new URL(`../${q.image}`, import.meta.url)), q.id);
});
test('only Quiz challenges carry a picture', () => {
  for (const lane of Object.keys(bankIds)) {
    if (lane === 'Quiz') continue;
    for (const id of bankIds[lane]) assert.equal(challengeById(id).image ?? null, null, `${lane} ${id}`);
  }
});