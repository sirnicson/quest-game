import { buildDecks, mulberry32 } from './deck.js';
import { bankIds, challengeById, QUIZ_POINTS } from './challengeBank.js';
import { currentChallenge, deckFor } from './challengeSelect.js';

export const SCREENS = ['splash','proclamation','mission','setup','episode1Briefing','map','challenge','result','report'];

export const createInitialGame = () => ({
  screen: 'splash',
  history: [],
  previewEpisode: 1,
  timerSeconds: 3600,
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
const nextCheckpoint = score => Math.min(MAX_ROUTE_SCORE, (Math.floor(score / 5) + 1) * 5);
export const scoreAfterAward = (score, points) => {
  const current = Math.max(0, Math.min(MAX_ROUTE_SCORE, Number(score) || 0));
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

// A failed Quiz has already revealed its answer, so the retry is a fresh question of any skill
// that is not in either deck and has not been used as a replacement yet.
// With a room seed the pick is deterministic, so both browsers choose the same replacement question.
function quizRetry(game, player, random = seededRandom(game, player)) {
  const seen = new Set(game.seenQuizzes ?? []);
  const shown = currentChallenge(game);
  if (!shown || shown.lane !== 'Quiz') return { seen: [...seen], id: game.override?.[player] ?? null };
  seen.add(shown.id);
  const inDecks = new Set([...deckFor(game).student, ...deckFor(game).guide]);
  const used = new Set(Object.values(game.override ?? {}).filter(Boolean));
  const pool = Object.values(bankIds).flat().filter(id => !inDecks.has(id) && !seen.has(id) && !used.has(id) && id !== shown.id);
  return { seen: [...seen], id: pool.length ? pool[Math.floor(random() * pool.length)] : null };
}
const other = player => player === 'student' ? 'guide' : 'student';
function seededRandom(game, player) {
  if (game.seed == null) return Math.random;
  const progress = game.players.student.position * 31 + game.players.guide.position * 17 + (game.seenQuizzes ?? []).length * 7919;
  return mulberry32((game.seed + progress + (player === 'student' ? 1 : 2)) >>> 0);
}

export const WINNER_BONUS = 10;
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
  const effective = {
    freeze: position < FINISHED,
    back: position > 0 && position < FINISHED && !quizBackWouldCreateScoreOrderInversion(game),
    boost: position < FINISHED
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
  const shown = currentChallenge(game);
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
  const advanced = appliedPoints > 0;
  const players = {
    ...game.players,
    [currentPlayer]: {
      ...game.players[currentPlayer],
      challengeIndex: fromIndex + (advanced ? 1 : 0)
    }
  };
  const earnedByStop = {
    student: { ...(game.earnedByStop?.student ?? {}) },
    guide: { ...(game.earnedByStop?.guide ?? {}) }
  };
  const fails = { ...(game.fails ?? {}) };
  const frozen = { ...(game.frozen ?? {}) };
  const backed = { ...(game.backed ?? { student: false, guide: false }) };
  const done = player => players[player].position >= FINISHED;
  let backAnim = null;
  const rewardsSpent = { student: [...rewardsUsed(game, 'student')], guide: [...rewardsUsed(game, 'guide')] };
  const sendBack = player => {
    const at = players[player].position;
    const lastAwardIndex = Math.max(0, (players[player].challengeIndex ?? 0));
    const currentScore = Math.max(0, scores[player] ?? 0);
    const previousCheckpoint = Math.max(0, (Math.ceil(currentScore / 5 - 1e-10) - 1) * 5);
    const lost = currentScore - previousCheckpoint;
    scores[player] = previousCheckpoint;
    players[player] = { ...players[player], position: routeProgress(scores[player]) };
    backAnim = { player, from: at, to: players[player].position };
    backed[player] = true;
    earnedByStop[player][lastAwardIndex] = 0;
    return lost;
  };

  if (advanced) {
    fails[currentPlayer] = { stop: from, count: 0 };
    backed[currentPlayer] = false;
      earnedByStop[currentPlayer][fromIndex + 1] = appliedPoints;
  } else if (shown?.lane !== 'Quiz') {
    const previous = fails[currentPlayer];
    const count = previous && previous.stop === fromIndex ? previous.count + 1 : 1;
    if (count >= 2 && fromIndex > 0) {
      const lost = sendBack(currentPlayer);
      fails[currentPlayer] = { stop: fromIndex, count: 0 };
      notices.push(`${name(currentPlayer)} falls back 1 stop (−${lost})`);
    } else {
      fails[currentPlayer] = { stop: fromIndex, count };
    }
  }

  const punish = advanced && game.punish?.by === currentPlayer ? game.punish.type : null;
  if (punish && !done(waiting)) {
    if (punish === 'freeze') {
      frozen[waiting] = true;
      quizEffectNotice = `${name(currentPlayer)} freezes ${name(waiting)}.\n${name(waiting)} skips their next turn.`;
      notices.push(`❄ ${name(waiting)} is frozen`);
      rewardsSpent[currentPlayer].push(punish);
    } else if (punish === 'back' && players[waiting].position > 0 && !quizBackWouldCreateScoreOrderInversion(game, points)) {
      const lost = sendBack(waiting);
      quizEffectNotice = `${name(currentPlayer)} sends ${name(waiting)} back.\n${name(waiting)} loses ${lost} points.`;
      notices.push(`${name(waiting)} goes back 1 stop (−${lost})`);
      rewardsSpent[currentPlayer].push(punish);
    } else if (punish === 'back') {
      notices.push('Go Back is unavailable because it would put the higher-scoring player behind');
    }
  }

  let winner = game.winner ?? null;
  if (backAnim?.player !== currentPlayer) scores[currentPlayer] = scoreAfterTurnAward;
  players[currentPlayer] = { ...players[currentPlayer], position: routeProgress(scores[currentPlayer]) };

  if (punish === 'boost' && advanced && !rewardsSpent[currentPlayer].includes('boost')) {
    rewardsSpent[currentPlayer].push('boost');
    const beforeBoost = scores[currentPlayer] ?? 0;
    const leadingScore = Math.max(beforeBoost, scores[waiting] ?? 0);
    const boostDestination = Math.min(MAX_ROUTE_SCORE, (Math.ceil(leadingScore / BOOST_POINTS) + 1) * BOOST_POINTS);
    scores[currentPlayer] = Math.max(beforeBoost, boostDestination);
    players[currentPlayer] = { ...players[currentPlayer], position: routeProgress(scores[currentPlayer]) };
    const boostPoints = scores[currentPlayer] - beforeBoost;
    earnedByStop[currentPlayer][fromIndex + 1] = appliedPoints + boostPoints;
    quizEffectNotice = `${name(currentPlayer)} boosts ahead.\n${name(currentPlayer)} now has ${scores[currentPlayer]} points.`;
    notices.push(`${name(currentPlayer)} is now ahead with ${scores[currentPlayer]}pts`);
  }

  if (!winner && done(currentPlayer)) {
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
  const finishCelebration = done(currentPlayer)
    ? { player: currentPlayer, place: winner === currentPlayer && game.winner !== currentPlayer ? 'winner' : 'runner-up' }
    : null;
  const completedPlayers = { student: done('student'), guide: done('guide') };
  const reached = Math.max(game.reached ?? 0, players.student.position, players.guide.position);
  const routeVisible = Boolean(game.routeVisible || reached > 0);
  const resultSummary = appliedPoints > 0
    ? `${name(currentPlayer)} earns ${appliedPoints} ${appliedPoints === 1 ? 'point' : 'points'}.`
    : `${name(currentPlayer)} retries with no points.`;
  const movementFeedback = quizEffectNotice || resultSummary;
  const retryPick = advanced ? { seen: game.seenQuizzes ?? [], id: null } : quizRetry(game, currentPlayer);
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
    punish: null,
    movementFeedback: { playerId: currentPlayer, message: movementFeedback },
    notice: notices.join(' ') || null,
    retry: { ...(game.retry ?? {}), [currentPlayer]: !advanced && backAnim?.player !== currentPlayer, ...(backAnim ? { [backAnim.player]: false } : {}) },
    retryReason: {
      ...(game.retryReason ?? {}),
      [currentPlayer]: !advanced && backAnim?.player !== currentPlayer ? (game.verdictReason ?? null) : null,
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
    lastResult: advanced ? 'correct' : 'incorrect',
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
      timerSeconds: 3600,
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
