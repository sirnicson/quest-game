import test from 'node:test';
import assert from 'node:assert/strict';
import { buildDecks } from '../src/core/deck.js';
import { bankIds, challengeById, checkQuizAnswer, checkReadingAnswer, checkWritingLength, writingVerdicts } from '../src/core/challengeBank.js';
import { createInitialGame, reduceAction, completePlayerTurn, punishOptions, scoreAfterAward, WINNER_BONUS } from '../src/core/gameState.js';
import { currentChallenge } from '../src/core/challengeSelect.js';
import { journey } from '../src/data/episodes/episode01.js';

test('writing verdicts unlock by word count', () => {
  const item = { minWords: 20, maxWords: 30 };
  const words = n => Array(n).fill('word').join(' ');
  assert.deepEqual(writingVerdicts(item, ''), []);
  assert.deepEqual(writingVerdicts(item, words(9)), ['RETRY']);
  assert.deepEqual(writingVerdicts(item, words(10)), ['RETRY', 'FAIR']);
  assert.deepEqual(writingVerdicts(item, words(19)), ['RETRY', 'FAIR']);
  assert.deepEqual(writingVerdicts(item, words(20)), ['RETRY', 'FAIR', 'GOOD']);
  assert.deepEqual(writingVerdicts(item, words(31)), ['RETRY', 'FAIR', 'GOOD']);
});

test('new games start with a 50-minute episode clock', () => {
  assert.equal(createInitialGame().timerSeconds, 3000);
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

test('each player has 15 initial challenges with 3 per skill and a unique-question continuation', () => {
  const { student, guide } = buildDecks(bankIds, 42);
  for (const deck of [student, guide]) {
    assert.equal(deck.length, 43);
    assert.equal(new Set(deck).size, 43);
    for (const skill of ['Quiz', 'Reading', 'Speaking', 'Writing', 'Listening']) {
      assert.equal(deck.slice(0, 15).filter(id => challengeById(id).lane === skill).length, 3);
      assert.equal(deck.filter(id => challengeById(id).lane === skill).length, skill === 'Quiz' ? 3 : 10);
    }
    assert.equal(deck.filter(id => challengeById(id).lane === 'Quiz').length, 3);
    deck.slice(1, 15).forEach((id, i) => assert.notEqual(challengeById(id).lane, challengeById(deck[i]).lane));
  }
  assert.equal(student.slice(0, 15).filter(id => guide.slice(0, 15).includes(id)).length, 0);
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
  const game = { ...base, players: { ...base.players, student: { ...base.players.student, challengeIndex: idx } } };
  const failed = completePlayerTurn(game, 0);
  assert.equal(failed.players.student.challengeIndex, idx);
  assert.equal(failed.retry.student, true);
  assert.equal(failed.moveAnim, null);
  const back = completePlayerTurn(failed, 0);
  assert.equal(currentChallenge(back).id, game.decks.student[idx]);
});

test('a failed Quiz is consumed and its retry uses a non-Quiz question', () => {
  const base = startedGame();
  const idx = base.decks.student.findIndex(id => challengeById(id).lane === 'Quiz');
  const game = atPositions(base, idx, 0);
  const failed = completePlayerTurn(game, 0);
  const retry = currentChallenge({ ...failed, activePlayer: 'student' });
  assert.notEqual(retry.lane, 'Quiz');
  assert.notEqual(retry.id, base.decks.student[idx]);
  assert.equal(failed.rewardsUsed.student.length, 0);
  assert.equal(failed.fails.student.count, 1);
  const successfulRetry = completePlayerTurn({ ...failed, activePlayer: 'student' }, 5);
  assert.equal(successfulRetry.override.student, null);
  assert.equal(successfulRetry.players.student.challengeIndex, idx + 1);
});

test('the first finisher and runner-up celebrate before the completion report', () => {
  let game = reduceAction(createInitialGame(), { type: 'start-episode', episodeId: 1, seed: 5 });
  game = atPositions(game, 14, 3);
  const first = completePlayerTurn(game, 5);
  assert.equal(first.players.student.position, 14);
  assert.equal(first.winner, 'student');
  assert.equal(first.screen, 'challenge');
  assert.deepEqual(first.finishCelebration, { player: 'student', place: 'winner' });
  assert.equal(first.activePlayer, 'guide');
  game = { ...first, scores: { ...first.scores, guide: 70 }, players: { ...first.players, guide: { ...first.players.guide, challengeIndex: 14, position: 14 } } };
  const second = completePlayerTurn(game, 5);
  assert.equal(second.screen, 'challenge');
  assert.deepEqual(second.finishCelebration, { player: 'guide', place: 'runner-up' });
  assert.equal(second.reportPending, true);
  const skipBase = reduceAction(createInitialGame(), { type: 'start-episode', episodeId: 1, seed: 5 });
  game = { ...atPositions(skipBase, 3, 15), activePlayer: 'guide' };
  const skip = completePlayerTurn(game, 0);
  assert.equal(skip.activePlayer, 'student');
  assert.equal(skip.screen, 'challenge');
});

const startedGame = (seed = 5) => reduceAction(createInitialGame(), { type: 'start-episode', episodeId: 1, seed });
const atPositions = (game, student, guide, suppliedScores = null) => {
  const scores = suppliedScores ?? { student: student * 5, guide: guide * 5 };
  return {
    ...game,
    scores,
    players: {
      ...game.players,
      student: { ...game.players.student, challengeIndex: student, position: Math.max(0, Math.min(14, scores.student / 5)) },
      guide: { ...game.players.guide, challengeIndex: guide, position: Math.max(0, Math.min(14, scores.guide / 5)) }
    },
    earnedByStop: {
      student: { ...(game.earnedByStop?.student ?? {}), ...(student > 0 ? { [student]: Math.min(5, scores.student) } : {}) },
      guide: { ...(game.earnedByStop?.guide ?? {}), ...(guide > 0 ? { [guide]: Math.min(5, scores.guide) } : {}) }
    }
  };
};
const firstNonQuizAt = (game, player) => game.decks[player].findIndex(id => challengeById(id).lane !== 'Quiz' && challengeById(id).lane !== 'Listening');

test('failing the same stop twice sends the player one stop back, except at London', () => {
  const base = startedGame();
  const idx = Math.max(1, firstNonQuizAt(base, 'student'));
  let game = atPositions(base, idx, 0, { student: 0, guide: 0 });
  game = completePlayerTurn(game, 0);
  game = completePlayerTurn({ ...game, activePlayer: 'student' }, 0);
  assert.equal(game.players.student.position, Math.max(0, idx - 1));
  assert.match(game.notice, /falls back 1 stop/);
  let london = atPositions(base, 0, 0);
  for (let i = 0; i < 3; i++) london = completePlayerTurn({ ...completePlayerTurn({ ...london, activePlayer: 'student' }, 0), activePlayer: 'student' }, 0);
  assert.equal(london.players.student.position, 0);
});

test('an automatic setback deducts five points and moves one route segment back', () => {
  const base = startedGame();
  const idx = Math.max(1, firstNonQuizAt(base, 'student'));
  let game = { ...atPositions(base, idx, 0, { student: 8, guide: 0 }), earnedByStop: { student: { [idx]: 5 }, guide: {} } };
  game = completePlayerTurn(game, 0);
  const back = completePlayerTurn({ ...game, activePlayer: 'student' }, 0);
  assert.equal(back.players.student.position, 0.6);
  assert.equal(back.scores.student, 3);
  assert.equal(back.earnedByStop.student[idx], 0);
});

test('a retry keeps its reason and awards the full 5, 2, or 0 points', () => {
  const base = startedGame();
  const idx = Math.max(1, firstNonQuizAt(base, 'student'));
  let game = atPositions(base, idx, 0, { student: 0, guide: 0 });
  game = completePlayerTurn({ ...game, verdictReason: 'SHORT' }, 0);
  assert.equal(game.retry.student, true);
  assert.equal(game.retryReason.student, 'SHORT');
  assert.equal(game.verdictReason, null);
  const goodRetry = completePlayerTurn({ ...game, activePlayer: 'student' }, 5);
  assert.equal(goodRetry.scores.student, 5);
  assert.equal(goodRetry.retryReason.student, null);
  const fair = completePlayerTurn({ ...game, activePlayer: 'student' }, 2);
  assert.equal(fair.scores.student, 2);
  const stillRetrying = completePlayerTurn({ ...game, activePlayer: 'student' }, 0);
  assert.equal(stillRetrying.scores.student, 0);
  assert.equal(stillRetrying.players.student.challengeIndex, game.players.student.challengeIndex);
  const dropped = completePlayerTurn({ ...game, activePlayer: 'student', verdictReason: 'UNCLEAR' }, 0);
  assert.equal(dropped.players.student.position, 0);
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
    assert.equal(game.players.student.challengeIndex, 2);
  }
});

test('finishing awards five points and the first finisher gets a further five-point bonus', () => {
  const base = startedGame();
  const first = completePlayerTurn(atPositions(base, 14, 3, { student: 70, guide: 15 }), 5);
  assert.equal(first.winner, 'student');
  assert.equal(WINNER_BONUS, 5);
  assert.equal(first.scores.student, 70 + 5 + WINNER_BONUS);
  assert.equal(first.players.student.position, 14);
  const second = completePlayerTurn({ ...first, activePlayer: 'guide', scores: { ...first.scores, guide: 70 }, players: { ...first.players, guide: { ...first.players.guide, challengeIndex: 14, position: 14 } } }, 5);
  assert.equal(second.scores.guide, 75);
  assert.equal(second.winner, 'student');
  assert.equal(second.players.guide.position, 14);
  assert.equal(scoreAfterAward(second.scores.guide, 0), 75);
});

test('each player gets 3 independently randomized Quiz stops and distinct questions', () => {
  const seen = new Set();
  let schedulesDiffer = false;
  for (let seed = 1; seed <= 40; seed++) {
    const { student, guide, quizStops } = buildDecks(bankIds, seed);
    for (const [player, deck] of [['student', student], ['guide', guide]]) {
      const stops = quizStops[player];
      assert.equal(stops.length, 3);
      stops.forEach((index, i) => {
        assert.ok(index >= 1 && index <= 13);
        if (i) assert.ok(index - stops[i - 1] > 1);
      });
      deck.forEach((id, i) => assert.equal(challengeById(id).lane === 'Quiz', stops.includes(i)));
      seen.add(stops.join());
    }
    schedulesDiffer ||= quizStops.student.join() !== quizStops.guide.join();
    for (let i = 0; i < 15; i++) {
      if (challengeById(student[i]).lane === 'Quiz' && challengeById(guide[i]).lane === 'Quiz') assert.notEqual(student[i], guide[i]);
    }
  }
  assert.ok(schedulesDiffer);
  assert.ok(seen.size > 5);
});

test('Quiz rewards: only unspent, effective ones are offered; each is once per player', () => {
  const base = startedGame();
  assert.deepEqual(punishOptions(atPositions(base, 2, 0, { student: 0, guide: 0 })), ['freeze', 'boost']);
  assert.deepEqual(punishOptions(atPositions(base, 2, 4, { student: 0, guide: 3 })), ['freeze', 'back', 'boost']);
  assert.deepEqual(punishOptions(atPositions(base, 6, 2, { student: 9, guide: 3 })), ['freeze', 'back', 'boost']);
  const spent = { ...atPositions(base, 2, 4, { student: 0, guide: 0 }), rewardsUsed: { student: ['freeze'], guide: [] } };
  assert.deepEqual(punishOptions(spent), ['boost']);
  assert.deepEqual(punishOptions({ ...spent, activePlayer: 'guide' }), ['freeze', 'boost']);
  assert.deepEqual(punishOptions({ ...atPositions(base, 2, 15), completedPlayers: { student: false, guide: true } }), []);
});

test('Quiz Go Back moves the opponent to the previous city checkpoint with aligned score', () => {
  const base = startedGame();
  const g = {
    ...atPositions(base, 4, 5, { student: 0, guide: 12 }),
    earnedByStop: { student: {}, guide: { 5: 1 } }
  };
  assert.deepEqual(punishOptions(g), ['freeze', 'back', 'boost']);
  const back = completePlayerTurn({ ...g, punish: { type: 'back', by: 'student' } }, 5);
  assert.equal(back.players.student.position, 1);
  assert.equal(back.players.guide.position, 2);
  assert.equal(back.scores.student, 5);
  assert.equal(back.scores.guide, 10);
  assert.equal(back.earnedByStop.guide[5], 0);
});

test('Quiz Go Back keeps score and route position aligned', () => {
  const base = startedGame();
  const g = {
    ...atPositions(base, 4, 4, { student: 0, guide: 10 }),
    earnedByStop: { student: {}, guide: { 4: 1 } }
  };
  assert.deepEqual(punishOptions(g), ['freeze', 'back', 'boost']);
  const withBack = completePlayerTurn({ ...g, punish: { type: 'back', by: 'student' } }, 5);
  assert.equal(withBack.players.guide.position, 1);
  assert.equal(withBack.scores.guide, 5);
  assert.equal(withBack.players.guide.position, withBack.scores.guide / 5);
});

test('Quiz Go Back does not create score and path order inversions across close, aligned standings', () => {
  const base = startedGame();
  const hasHigherScoreBehind = game =>
    (game.scores.student > game.scores.guide && game.players.student.position < game.players.guide.position)
    || (game.scores.guide > game.scores.student && game.players.guide.position < game.players.student.position);
  for (let studentPosition = 0; studentPosition < 15; studentPosition++) {
    for (let guidePosition = 1; guidePosition < 15; guidePosition++) {
      if (Math.abs(studentPosition - guidePosition) > 2) continue;
      for (const studentScore of [0, 5, 10, 20, 40]) {
        for (const guideScore of [0, 5, 10, 20, 40]) {
          if ((studentScore > guideScore && studentPosition < guidePosition)
            || (guideScore > studentScore && guidePosition < studentPosition)) continue;
          for (const activePlayer of ['student', 'guide']) {
            const victim = activePlayer === 'student' ? 'guide' : 'student';
            const victimPosition = victim === 'student' ? studentPosition : guidePosition;
            const victimScore = victim === 'student' ? studentScore : guideScore;
            for (const earned of new Set([0, Math.min(1, victimScore), Math.min(5, victimScore)])) {
              const game = {
                ...atPositions(base, studentPosition, guidePosition, { student: studentScore, guide: guideScore }),
                activePlayer,
                earnedByStop: { student: {}, guide: {}, [victim]: { [victimPosition]: earned } }
              };
              const withoutBack = completePlayerTurn(game, 5);
              const result = completePlayerTurn({ ...game, punish: { type: 'back', by: activePlayer } }, 5);
              if (hasHigherScoreBehind(result)) {
                assert.equal(result.players[victim].position, withoutBack.players[victim].position, `${studentPosition}/${guidePosition}, ${studentScore}/${guideScore}, ${activePlayer}, stop points ${earned}`);
                assert.equal(result.scores[victim], withoutBack.scores[victim], `${studentPosition}/${guidePosition}, ${studentScore}/${guideScore}, ${activePlayer}, stop points ${earned}`);
              }
            }
          }
        }
      }
    }
  }
});

test('Quiz Boost always puts its user ahead in both score and route position', () => {
  const base = startedGame();
  for (const studentScore of [0, 2, 5, 12, 20, 30, 40, 60, 65]) {
    for (const guideScore of [0, 2, 5, 12, 20, 30, 40, 60, 65]) {
      const game = atPositions(base, studentScore / 5, guideScore / 5, { student: studentScore, guide: guideScore });
      const result = completePlayerTurn({ ...game, punish: { type: 'boost', by: 'student' } }, 5);
      assert.ok(result.players.student.position > result.players.guide.position, `${studentScore}/${guideScore}`);
      assert.ok(result.scores.student > result.scores.guide, `${studentScore}/${guideScore}`);
      assert.equal(result.players.student.position, Math.min(14, result.scores.student / 5));
      assert.equal(result.players.guide.position, Math.min(14, result.scores.guide / 5));
    }
  }
});

test('Quiz Go Back moves one city checkpoint back and updates score to match', () => {
  const base = startedGame();
  const g = { ...atPositions(base, 2, 4, { student: 0, guide: 12 }), earnedByStop: { student: {}, guide: { 4: 7 } } };
  const back = completePlayerTurn({ ...g, punish: { type: 'back', by: 'student' } }, 5);
  assert.equal(back.players.guide.position, 2);
  assert.equal(back.scores.guide, 10);
  assert.equal(back.earnedByStop.guide[4], 0);
  assert.equal(back.backed.guide, true);
  assert.deepEqual(back.backAnim, { player: 'guide', from: 2.4, to: 2 });
});

test('a failed Quiz opponent is sent back before the Quiz winner score is shown', () => {
  const base = startedGame();
  const quizIndex = base.decks.student.findIndex(id => challengeById(id).lane === 'Quiz');
  const beforeFailure = atPositions(base, quizIndex, 4, { student: quizIndex * 5, guide: 20 });
  const failed = { ...completePlayerTurn(beforeFailure, 0), displayScores: beforeFailure.scores };
  assert.equal(failed.players.student.position, quizIndex);
  assert.equal(failed.activePlayer, 'guide');

  const result = completePlayerTurn({
    ...failed,
    punish: { type: 'back', by: 'guide' }
  }, 5);

  assert.equal(result.players.student.position, quizIndex - 1);
  assert.deepEqual(result.backAnim, { player: 'student', from: quizIndex, to: quizIndex - 1 });
  assert.deepEqual(result.scoreAfterBack, { student: (quizIndex - 1) * 5, guide: 20 });
  assert.deepEqual(result.rewardEffect, { playerId: 'student', type: 'back', pointsLost: 5 });
  assert.deepEqual(result.displayScores, failed.displayScores);
});

test('the GO BACK amount is rendered beneath the affected avatar during its movement', async () => {
  const { mapSvg } = await import('../src/components/GameMap.js');
  const base = startedGame();
  const map = mapSvg({}, {
    ...base,
    routeVisible: true,
    backAnim: { player: 'student', from: 3, to: 2 },
    rewardEffect: { playerId: 'student', type: 'back', pointsLost: 5 }
  });
  assert.match(map, /class="pin-effect-label back" y="28"[^>]*>Player 1 goes behind -5pts<\/text>/);
  assert.match(map, /player-pin student ring-red/);
});

test('Freeze and Boost show reward messages and matching rings beneath the affected avatar', async () => {
  const { mapSvg } = await import('../src/components/GameMap.js');
  const base = startedGame();
  const frozen = mapSvg({}, {
    ...base,
    routeVisible: true,
    rewardEffect: { playerId: 'guide', type: 'freeze', pointsLost: 0 }
  });
  assert.match(frozen, /player-pin guide ring-red/);
  assert.match(frozen, /class="pin-effect-label freeze" y="28"[^>]*>Player 2 misses a turn 0pts<\/text>/);

  const boosted = completePlayerTurn({
    ...base,
    routeVisible: true,
    punish: { type: 'boost', by: 'student' }
  }, 5);
  const boostMap = mapSvg({}, { ...boosted, routeVisible: true });
  assert.match(boostMap, /player-pin student ring-green/);
  assert.match(boostMap, /class="pin-effect-label boost" y="28"[^>]*>Player 1 goes ahead \+5pts<\/text>/);
});

test('Quiz rewards apply at once and are spent: freeze, back, boost', () => {
  const base = startedGame();
  const pick = (type, g) => completePlayerTurn({ ...g, punish: { type, by: 'student' } }, 5);
  const g = { ...atPositions(base, 2, 4, { student: 0, guide: 12 }), earnedByStop: { student: {}, guide: { 4: 2 } } };
  const frozen = pick('freeze', g);
  assert.equal(frozen.activePlayer, 'student');
  assert.deepEqual(frozen.rewardsUsed, { student: ['freeze'], guide: [] });
  assert.match(frozen.notice, /is frozen.*skips a turn/);
  const back = pick('back', g);
  assert.equal(back.players.guide.position, 2);
  assert.equal(back.scores.guide, 10);
  assert.deepEqual(back.backAnim, { player: 'guide', from: 2.4, to: 2 });
  assert.equal(back.activePlayer, 'guide');
  assert.deepEqual(back.rewardsUsed.student, ['back']);
  const boost = pick('boost', g);
  assert.equal(boost.players.student.position, 3.4);
  assert.equal(boost.scores.student, 17);
  assert.deepEqual(boost.rewardsUsed.student, ['boost']);
  assert.deepEqual(boost.moveAnim, { player: 'student', from: 0, to: 3.4 });
  assert.equal(pick('boost', { ...g, rewardsUsed: { student: ['boost'], guide: [] } }).players.student.position, 1);
  const ahead = pick('boost', atPositions(base, 6, 2, { student: 20, guide: 10 }));
  assert.equal(ahead.players.student.position, 6);
  assert.equal(ahead.scores.student, 30);
  assert.match(ahead.notice, /Player 1 is now ahead with 30pts/);
  const farBehind = pick('boost', atPositions(base, 2, 9, { student: 30, guide: 40 }));
  assert.equal(farBehind.players.student.position, 9);
  assert.equal(farBehind.scores.student, 45);
  assert.deepEqual(punishOptions(atPositions(base, 6, 2, { student: 20, guide: 10 })), ['freeze', 'back', 'boost']);
});

test('resolved Quiz reward produces movement-slip feedback before the next preview', () => {
  const base = startedGame();
  const quizIndex = base.decks.student.findIndex(id => challengeById(id).lane === 'Quiz');
  const quiz = challengeById(base.decks.student[quizIndex]);
  const game = {
    ...base,
    selectedAnswer: quiz.correct,
    quiz: { status: 'correct', message: 'Correct answer.', chosen: 'boost' },
    punish: { type: 'boost', by: 'student' },
    players: { ...base.players, student: { ...base.players.student, challengeIndex: quizIndex } }
  };
  const result = completePlayerTurn(game, 5);
  assert.equal(result.playerPreview, true);
  assert.ok(result.moveAnim);
  assert.equal(result.movementFeedback.playerId, 'student');
  assert.equal(result.movementFeedback.message, 'Player 1 goes ahead of Player 2');
});

test('a player sent back onto a Quiz stop gets a skill question there, not a Quiz', () => {
  const base = startedGame();
  const quizAt = base.quizStops?.guide?.[0] ?? base.decks.quizStops.guide[0];
  const g = atPositions(base, 1, quizAt + 1, { student: 0, guide: 5 });
  const back = completePlayerTurn({ ...g, punish: { type: 'back', by: 'student' } }, 5);
  assert.equal(back.players.guide.challengeIndex, quizAt + 1);
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
