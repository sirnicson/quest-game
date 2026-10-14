import { buildDecks, mulberry32 } from './deck.js';
import { bankIds, challengeById, QUIZ_POINTS } from './challengeBank.js';
import { currentChallenge, deckFor } from './challengeSelect.js';

export const SCREENS = ['splash','proclamation','mission','setup','episode1Briefing','map','challenge','result','report'];

export const createInitialGame = () => ({
  screen: 'splash',
  history: [],
  previewEpisode: 1,
  previewMode: false,
  timerSeconds: 3000,
  activeStop: 1,
  selectedAnswer: null,
  answerRevealed: false,
  listening: null,
  quiz: null,
  writing: null,
  verdict: null,
  decks: null,
  retry: { student: false, guide: false },
  retryReason: { student: null, guide: null },
  verdictReason: null,
  reasonPick: false,
  moveAnim: null,
  backed: { student: false, guide: false },
  playerPreview: false,
  locationPreview: false,
  locationPreviewStop: 0,
  locationStopsSeen: [],
  locationTransition: false,
  cardExiting: false,
  camera: 'overview',
  lastResult: null,
  fails: {},
  frozen: {},
  winner: null,
  notice: null,
  punish: null,
  movementFeedback: null,
  displayScores: null,
  transitionPhase: null,
  rewardsUsed: { student: [], guide: [] },
  reached: 0,
  backAnim: null,
  activePlayer: 'student',
  completedPlayers: { student: false, guide: false },
  earnedByStop: { student: {}, guide: {} },
  finishCelebration: null,
  reportPending: false,
  routeVisible: false,
  scores: { student: 0, guide: 0 },
  players: {
    student: { position: 0, challengeIndex: 0, name: 'Player 1', avatar: '/assets/avatar%20new/batman.jpg' },
    guide: { position: 0, challengeIndex: 0, name: 'Player 2', avatar: '/assets/avatar%20new/wonder%20woman.jpg' }
  }
});

const goToScreen = (game, screen, updates = {}) => screen === game.screen
  ? { ...game, ...updates }
  : { ...game, ...updates, screen, history: [...(game.history ?? []), game.screen] };

export const advanceScreen = (game) => {
  const i = SCREENS.indexOf(game.screen);
  return goToScreen(game, SCREENS[Math.min(i + 1, SCREENS.length - 1)]);
};

export const FINISHED = 14;
export const routeProgress = score => Math.max(0, Math.min(FINISHED, Number(score ?? 0) / 5));

const MAX_ROUTE_SCORE = FINISHED * 5;
export const FINAL_QUESTION_POINTS = 5;
export const WINNER_BONUS = 5;
const MAX_TOTAL_SCORE = MAX_ROUTE_SCORE + FINAL_QUESTION_POINTS + WINNER_BONUS;
const nextCheckpoint = score => Math.min(MAX_ROUTE_SCORE, (Math.floor(score / 5) + 1) * 5);
export const scoreAfterAward = (score, points) => {
  const current = Math.max(0, Math.min(MAX_TOTAL_SCORE, Number(score) || 0));
  if (points < 0) return Math.max(0, current + points);
  if (!(points > 0) || current >= MAX_ROUTE_SCORE) return current;
  return Math.min(current + points, nextCheckpoint(current));
};

export const applyMovement = (game, player, delta) => {
  const score = scoreAfterAward(game.scores?.[player] ?? 0, delta);
  return {
  ...game,
  scores: { ...game.scores, [player]: score },
  players: {
    ...game.players,
    [player]: {
      ...game.players[player],
      position: routeProgress(score)
    }
  }
  };
};

// A failed Quiz is replaced in its current deck slot by a non-Quiz question.
// Prefer an unscheduled question; if the bank has no spare cards, reuse a scheduled
// non-Quiz question rather than exposing the failed Quiz again.
// With a room seed the pick is deterministic, so both browsers choose the same replacement.
function quizRetry(game, player, random = seededRandom(game, player)) {
  const seen = new Set(game.seenQuizzes ?? []);
  const shown = currentChallenge(game);
  if (!shown || shown.lane !== 'Quiz') return { seen: [...seen], id: game.override?.[player] ?? null };
  seen.add(shown.id);
  const inDecks = new Set([...deckFor(game).student, ...deckFor(game).guide]);
  const used = new Set(Object.values(game.override ?? {}).filter(Boolean));
  const questions = Object.values(bankIds).flat().filter(id => challengeById(id)?.lane !== 'Quiz'
    && !seen.has(id) && !used.has(id) && id !== shown.id);
  const spareQuestions = questions.filter(id => !inDecks.has(id));
  const pool = spareQuestions.length ? spareQuestions : questions;
  return { seen: [...seen], id: pool.length ? pool[Math.floor(random() * pool.length)] : null };
}
const other = player => player === 'student' ? 'guide' : 'student';
function seededRandom(game, player) {
  if (game.seed == null) return Math.random;
  const progress = game.players.student.position * 31 + game.players.guide.position * 17 + (game.seenQuizzes ?? []).length * 7919;
  return mulberry32((game.seed + progress + (player === 'student' ? 1 : 2)) >>> 0);
}

export const RETRY_REASONS = ['SHORT', 'OFFTOPIC', 'UNCLEAR'];
export const BOOST_POINTS = 5;
export const REWARDS = ['freeze', 'back', 'boost'];

// Rewards a player has already spent (each of the 3 can be used once per player per game).
export const rewardsUsed = (game, player) => game.rewardsUsed?.[player] ?? [];

function quizBackWouldCreateScoreOrderInversion(game, points = QUIZ_POINTS) {
  // Position is derived from score, so a score lead cannot be behind on the route.
  return false;
}

// Rewards the Quiz winner can use now: unspent and actually effective. Unusable ones stay banked for a later Quiz.
export function punishOptions(game) {
  const me = game.activePlayer || 'student';
  const victim = other(me);
  const { position } = game.players[victim];
  const spent = rewardsUsed(game, me);
  const meAtFinalStop = game.players[me].position >= FINISHED;
  const victimFinished = Boolean(game.completedPlayers?.[victim]);
  const effective = {
    freeze: !victimFinished && !meAtFinalStop,
    back: position > 0 && !victimFinished && !quizBackWouldCreateScoreOrderInversion(game),
    boost: position < FINISHED && !meAtFinalStop
  };
  return REWARDS.filter(kind => !spent.includes(kind) && effective[kind]);
}
// A player sent back onto a Quiz stop gets a skill question there instead (no Quiz punishments on a replay).
function skillReplacement(game, player, seen) {
  const inDecks = new Set([...deckFor(game).student, ...deckFor(game).guide]);
  const used = new Set(Object.values(game.override ?? {}).filter(Boolean));
  const pool = ['Reading', 'Speaking', 'Writing', 'Listening'].flatMap(skill => bankIds[skill])
    .filter(id => !inDecks.has(id) && !seen.has(id) && !used.has(id));
  return pool.length ? pool[Math.floor(seededRandom(game, player)() * pool.length)] : null;
}

// Resolves one turn: ACTIVE PLAYER (challenge owner) gets RESULT; the NEXT TURN goes to the waiting player unless they finished or are frozen.
// Also applies at once: two straight fails on a stop send the player one stop back, a won Quiz punishment/boost, and the first-finisher bonus.
export const completePlayerTurn = (game, rawPoints) => {
  const currentPlayer = game.activePlayer || 'student';
  const waiting = other(currentPlayer);
  const points = Math.max(0, Number(rawPoints) || 0);
  const name = player => game.players[player].name;
  const notices = [];
  let quizEffectNotice = null;
  const from = game.players[currentPlayer].position;
  const fromIndex = game.players[currentPlayer].challengeIndex ?? Math.floor(from);
  const scores = { ...game.scores };
  const scoreBeforeTurn = scores[currentPlayer] ?? 0;
  const scoreAfterTurnAward = scoreAfterAward(scoreBeforeTurn, points);
  const appliedPoints = scoreAfterTurnAward - scoreBeforeTurn;
  const succeeded = points > 0;
  const advanced = appliedPoints > 0;
  const players = {
    ...game.players,
    [currentPlayer]: {
      ...game.players[currentPlayer],
      challengeIndex: fromIndex + (succeeded ? 1 : 0)
    }
  };
  const earnedByStop = {
    student: { ...(game.earnedByStop?.student ?? {}) },
    guide: { ...(game.earnedByStop?.guide ?? {}) }
  };
  const fails = { ...(game.fails ?? {}) };
  const frozen = { ...(game.frozen ?? {}) };
  const backed = { ...(game.backed ?? { student: false, guide: false }) };
  const completedPlayers = { ...(game.completedPlayers ?? { student: false, guide: false }) };
  const done = player => Boolean(completedPlayers[player]);
  let backAnim = null;
  let scoreAfterBack = null;
  let retryRegression = false;
  let retryPointsLost = 0;
  let rewardEffect = null;
  const rewardsSpent = { student: [...rewardsUsed(game, 'student')], guide: [...rewardsUsed(game, 'guide')] };
  const sendBack = (player, oneStop = false) => {
    const at = players[player].position;
    const lastAwardIndex = Math.max(0, (players[player].challengeIndex ?? 0));
    const currentScore = Math.max(0, scores[player] ?? 0);
    const previousCheckpoint = oneStop
      ? Math.max(0, currentScore - 5)
      : Math.max(0, (Math.ceil(currentScore / 5 - 1e-10) - 1) * 5);
    const lost = currentScore - previousCheckpoint;
    scores[player] = previousCheckpoint;
    players[player] = { ...players[player], position: routeProgress(scores[player]) };
    backAnim = { player, from: at, to: players[player].position };
    backed[player] = true;
    earnedByStop[player][lastAwardIndex] = 0;
    return lost;
  };

  if (succeeded) {
    fails[currentPlayer] = { stop: from, count: 0 };
    backed[currentPlayer] = false;
    if (appliedPoints > 0) earnedByStop[currentPlayer][fromIndex + 1] = appliedPoints;
  } else {
    const previous = fails[currentPlayer];
    const count = previous && previous.stop === fromIndex ? previous.count + 1 : 1;
    if (count >= 2 && fromIndex > 0) {
      retryRegression = true;
      retryPointsLost = sendBack(currentPlayer, true);
      fails[currentPlayer] = { stop: fromIndex, count: 0 };
      notices.push(`${name(currentPlayer)} falls back 1 stop (−${retryPointsLost})`);
    } else {
      fails[currentPlayer] = { stop: fromIndex, count };
    }
  }

  const punish = succeeded && game.punish?.by === currentPlayer ? game.punish.type : null;
  if (punish && !done(waiting)) {
    if (punish === 'freeze') {
      frozen[waiting] = true;
      rewardEffect = { playerId: waiting, type: 'freeze', pointsLost: 0 };
      scoreAfterBack = { ...scores };
      quizEffectNotice = `${name(currentPlayer)} freezes ${name(waiting)}`;
      notices.push(`❄ ${name(waiting)} is frozen`);
      rewardsSpent[currentPlayer].push(punish);
    } else if (punish === 'back' && players[waiting].position > 0 && !quizBackWouldCreateScoreOrderInversion(game, points)) {
      const lost = sendBack(waiting);
      rewardEffect = { playerId: waiting, type: 'back', pointsLost: lost };
      scoreAfterBack = { ...scores };
      quizEffectNotice = `${name(currentPlayer)} sends ${name(waiting)} back`;
      notices.push(`${name(waiting)} goes back 1 stop (−${lost})`);
      rewardsSpent[currentPlayer].push(punish);
    } else if (punish === 'back') {
      notices.push('Go Back is unavailable because it would put the higher-scoring player behind');
    }
  }

  let winner = game.winner ?? null;
  if (backAnim?.player !== currentPlayer) scores[currentPlayer] = scoreAfterTurnAward;
  players[currentPlayer] = { ...players[currentPlayer], position: routeProgress(scores[currentPlayer]) };

  if (punish === 'boost' && succeeded && !rewardsSpent[currentPlayer].includes('boost')) {
    rewardsSpent[currentPlayer].push('boost');
    const beforeBoost = scores[currentPlayer] ?? 0;
    const wasAhead = scoreBeforeTurn > (game.scores[waiting] ?? 0);
    const boostTarget = wasAhead ? beforeBoost + BOOST_POINTS : (scores[waiting] ?? 0) + BOOST_POINTS;
    const boostDestination = Math.min(MAX_ROUTE_SCORE, boostTarget);
    scores[currentPlayer] = Math.max(beforeBoost, boostDestination);
    players[currentPlayer] = { ...players[currentPlayer], position: routeProgress(scores[currentPlayer]) };
    const boostPoints = scores[currentPlayer] - beforeBoost;
    rewardEffect = { playerId: currentPlayer, type: 'boost', pointsGained: boostPoints };
    earnedByStop[currentPlayer][fromIndex + 1] = appliedPoints + boostPoints;
    quizEffectNotice = `${name(currentPlayer)} goes ahead of ${name(waiting)}`;
    notices.push(`${name(currentPlayer)} is now ahead with ${scores[currentPlayer]}pts`);
  }

  const finishedAtTurnStart = from >= FINISHED && succeeded && Number(game.timerSeconds ?? 1) > 0 && game.screen !== 'report';
  if (finishedAtTurnStart) {
    completedPlayers[currentPlayer] = true;
    scores[currentPlayer] += FINAL_QUESTION_POINTS;
    earnedByStop[currentPlayer][FINISHED + 1] = FINAL_QUESTION_POINTS;
  }
  const firstFinisher = finishedAtTurnStart && !winner;
  if (firstFinisher) {
    winner = currentPlayer;
    scores[currentPlayer] += WINNER_BONUS;
    notices.push(`🏁 ${name(currentPlayer)} finishes first +${WINNER_BONUS}`);
  }

  let nextPlayer = done(waiting) ? currentPlayer : waiting;
  if (nextPlayer === waiting && frozen[waiting]) {
    frozen[waiting] = false;
    nextPlayer = currentPlayer;
    notices.push(`${name(waiting)} skips a turn`);
  }
  const bothDone = done('student') && done('guide');
  const finishCelebration = finishedAtTurnStart
    ? { player: currentPlayer, place: firstFinisher ? 'winner' : 'runner-up' }
    : null;
  const reached = Math.max(game.reached ?? 0, players.student.position, players.guide.position);
  const routeVisible = Boolean(game.routeVisible || reached > 0);
  const resultSummary = appliedPoints > 0
    ? `${name(currentPlayer)} earns ${appliedPoints} ${appliedPoints === 1 ? 'point' : 'points'}.`
    : finishedAtTurnStart
      ? `${name(currentPlayer)} completes the final question.`
      : `${name(currentPlayer)} retries with no points.`;
  const movementFeedback = retryRegression
    ? `Retry failed. Goes back 1 spot - ${retryPointsLost}pts`
    : quizEffectNotice || resultSummary;
  const retryPick = succeeded ? { seen: game.seenQuizzes ?? [], id: null } : quizRetry(game, currentPlayer);
  const override = { ...(game.override ?? {}), [currentPlayer]: retryPick.id };
  const seen = new Set(retryPick.seen);
  if (backAnim) {
    const moved = backAnim.player;
      const deckId = deckFor(game)[moved][players[moved].challengeIndex];
    override[moved] = null;
    if (deckId && challengeById(deckId)?.lane === 'Quiz') {
      const id = skillReplacement({ ...game, override }, moved, seen);
      override[moved] = id;
      if (id) seen.add(id);
    }
  }

  return {
    ...game,
    override,
    seenQuizzes: [...seen],
    scores,
    players,
    fails,
    frozen,
    backed,
    winner,
    completedPlayers,
    earnedByStop,
    finishCelebration,
    reportPending: bothDone,
    rewardsUsed: rewardsSpent,
    reached,
    backAnim,
    scoreAfterBack,
    rewardEffect,
    punish: null,
    movementFeedback: { playerId: currentPlayer, message: movementFeedback },
    notice: notices.join(' ') || null,
    retry: { ...(game.retry ?? {}), [currentPlayer]: !succeeded && backAnim?.player !== currentPlayer, ...(backAnim ? { [backAnim.player]: false } : {}) },
    retryReason: {
      ...(game.retryReason ?? {}),
      [currentPlayer]: !succeeded && backAnim?.player !== currentPlayer ? (game.verdictReason ?? null) : null,
      ...(backAnim ? { [backAnim.player]: null } : {})
    },
    verdictReason: null,
    reasonPick: false,
    moveAnim: advanced ? { player: currentPlayer, from, to: players[currentPlayer].position } : null,
    selectedAnswer: null,
    answerRevealed: false,
    listening: null,
    quiz: null,
    writing: null,
    verdict: null,
    playerPreview: !bothDone && !finishCelebration,
    lastResult: succeeded ? 'correct' : 'incorrect',
    activePlayer: nextPlayer,
    routeVisible,
    screen: 'challenge',
      activeStop: Math.min(FINISHED, Math.floor(players[nextPlayer].position) + 1),
    camera: `stop:${Math.min(14, Math.floor(advanced ? players[currentPlayer].position : players[nextPlayer].position))}`
  };
};
export const reduceAction = (game, action) => {
  if (typeof action === 'object' && action?.type === 'set-player') {
    const { player, name, avatar } = action;
    if (!['student', 'guide'].includes(player)) return game;
    return { ...game, players: { ...game.players, [player]: { ...game.players[player], name: String(name).trim() || game.players[player].name, avatar: avatar || game.players[player].avatar } } };
  }
  if (action === 'back') {
    const history = game.history ?? [];
    if (!history.length) return game;
    return { ...game, screen: history[history.length - 1], history: history.slice(0, -1) };
  }
  if (action === 'home-reset' || action === 'reset') return createInitialGame();
  if (typeof action === 'object' && action?.type === 'navigate') return goToScreen(game, action.screen);
  if (typeof action === 'object' && action?.type === 'start-episode') {
    if (Number(action.episodeId) !== 1) return game;
    return goToScreen(game, 'map', {
      timerSeconds: 3000,
      previewMode: false,
      players: {
        student: { ...game.players.student, position: 0, challengeIndex: 0 },
        guide: { ...game.players.guide, position: 0, challengeIndex: 0 }
      },
      previewEpisode: 1,
      activeStop: 1,
      selectedAnswer: null,
      answerRevealed: false,
      listening: null,
      quiz: null,
      writing: null,
      verdict: null,
      moveAnim: null,
      backed: { student: false, guide: false },
      retry: { student: false, guide: false },
      retryReason: { student: null, guide: null },
      verdictReason: null,
      reasonPick: false,
      seed: action.seed ?? null,
      optionSeed: action.seed ?? Date.now(),
      decks: buildDecks(bankIds, action.seed ?? Date.now()),
      override: { student: null, guide: null },
      seenQuizzes: [],
      fails: {},
      frozen: {},
      winner: null,
      notice: null,
      punish: null,
      rewardsUsed: { student: [], guide: [] },
      reached: 0,
      backAnim: null,
      playerPreview: false,
      locationPreview: false,
      locationPreviewStop: 0,
      locationStopsSeen: [],
      locationTransition: false,
      cardExiting: false,
      lastResult: null,
      camera: 'london',
      mapView: { scale: 1, x: 0, y: 0 },
      activePlayer: 'student',
      completedPlayers: { student: false, guide: false },
      earnedByStop: { student: {}, guide: {} },
      finishCelebration: null,
      reportPending: false,
      routeVisible: false,
      scores: { student: 0, guide: 0 }
    });
  }
  if (action === 'start-challenge') return goToScreen(game, 'challenge', {
    activeStop: 1,
    selectedAnswer: null,
    answerRevealed: false,
    playerPreview: true,
    locationPreview: true,
    locationPreviewStop: 0,
    locationStopsSeen: [0],
    locationTransition: false,
    cardExiting: false,
    camera: 'london',
    activePlayer: game.activePlayer || 'student',
    completedPlayers: game.completedPlayers || { student: false, guide: false },
    lastResult: null,
    notice: null,
    routeVisible: false
  });
  if (action === 'next') return advanceScreen(game);
  if (action === 'reveal-answer') return { ...game, answerRevealed: true };
  if (action === 'challenge') return goToScreen(game, 'challenge');
  if (action === 'map') return goToScreen(game, 'map', { activeStop: Math.min(15, game.activeStop + 1) });
  if (action === 'next-stop') return { ...game, activeStop: game.activeStop % 15 + 1 };
  if (action === 'set-player') {
    const { player, name, avatar } = action;
    if (!['student', 'guide'].includes(player)) return game;
    return { ...game, players: { ...game.players, [player]: { ...game.players[player], name: String(name).trim() || game.players[player].name, avatar: avatar || game.players[player].avatar } } };
  }
  return game;
};
