import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { currentChallenge } from '../src/core/challengeSelect.js';
import { challengeById } from '../src/core/challengeBank.js';

test('score maps to exact city checkpoints with five points per city leg', async () => {
  const { routeProgress } = await import('../src/core/gameState.js');
  assert.equal(routeProgress(0), 0);
  assert.equal(routeProgress(2), 0.4);
  assert.equal(routeProgress(5), 1);
  assert.equal(routeProgress(73), 14);
  assert.equal(routeProgress(80), 14);
  assert.equal(routeProgress(-5), 0);
});

test('each city checkpoint maps to its exact physical map location', async () => {
  const { routePosition, routeDistance } = await import('../src/components/GameMap.js');
  assert.equal(routeDistance(14), 14);
  assert.equal(routeDistance(13), 13);
  assert.notDeepEqual(routePosition(13, 'student'), routePosition(14, 'student'));
  assert.deepEqual(routePosition(14, 'student'), routePosition(14, 'guide'));
});

test('fractional route progress does not select a fractional question index', () => {
  const game = {
    decks: { student: ['QZ01', 'QZ02'], guide: ['QZ03'] },
    activePlayer: 'student',
    players: { student: { position: 0.4, challengeIndex: 1 }, guide: { position: 0 } },
    optionSeed: 1
  };
  assert.equal(currentChallenge(game).id, 'QZ02');
});

test('a two-point award advances the avatar without coupling question choice to distance', async () => {
  const { createInitialGame, reduceAction, completePlayerTurn } = await import('../src/core/gameState.js');
  const base = reduceAction(createInitialGame(), { type: 'start-episode', episodeId: 1, seed: 19 });
  const moved = completePlayerTurn(base, 2);
  assert.equal(moved.players.student.position, 0.4);
  assert.equal(moved.players.student.challengeIndex, 1);
  assert.equal(currentChallenge(moved).id, base.decks.guide[0]);
  assert.equal(currentChallenge({ ...moved, activePlayer: 'student' }).id, base.decks.student[1]);
});

test('ordinary awards stop at the next city and discard overflow points', async () => {
  const { createInitialGame, reduceAction, completePlayerTurn } = await import('../src/core/gameState.js');
  let game = reduceAction(createInitialGame(), { type: 'start-episode', episodeId: 1, seed: 19 });
  game = completePlayerTurn(game, 2);
  assert.equal(game.scores.student, 2);
  game = completePlayerTurn({ ...game, activePlayer: 'student' }, 5);
  assert.equal(game.scores.student, 5);
  assert.equal(game.players.student.position, 1);
  game = completePlayerTurn({ ...game, activePlayer: 'student' }, 5);
  assert.equal(game.scores.student, 10);
  assert.equal(game.players.student.position, 2);
});

test('each generated initial deck has exactly three quizzes for each player', async () => {
  const { buildDecks } = await import('../src/core/deck.js');
  const { bankIds } = await import('../src/core/challengeBank.js');
  const decks = buildDecks(bankIds, 27);
  for (const player of ['student', 'guide']) {
    assert.equal(decks[player].filter(id => challengeById(id).lane === 'Quiz').length, 3);
  }
});

test('player routes diverge between cities, share city endpoints, and interpolate fractional progress', async () => {
  const { routePosition, routeLegPoints } = await import('../src/components/GameMap.js');
  assert.equal(typeof routePosition, 'function');
  assert.deepEqual(routePosition(0, 'student'), routePosition(0, 'guide'));
  assert.deepEqual(routePosition(1, 'student'), routePosition(1, 'guide'));
  const studentMidpoint = routePosition(0.5, 'student');
  const guideMidpoint = routePosition(0.5, 'guide');
  assert.notDeepEqual(studentMidpoint, guideMidpoint);
  const meander = routeLegPoints(0, 'student');
  const lineX = meander.at(-1).x - meander[0].x;
  const lineY = meander.at(-1).y - meander[0].y;
  const lineLength = Math.hypot(lineX, lineY);
  assert.ok(meander.some((point, i) => i > 0 && i < meander.length - 1
    && Math.abs(lineX * (meander[0].y - point.y) - (meander[0].x - point.x) * lineY) / lineLength > 3));
  for (let city = 0; city <= 14; city++) {
    const progressAtCity = city;
    assert.deepEqual(routePosition(progressAtCity, 'student'), routePosition(progressAtCity, 'guide'));
    if (city < 14) {
      const halfway = city + 0.5;
      assert.notDeepEqual(routePosition(halfway, 'student'), routePosition(halfway, 'guide'));
    }
  }
  assert.deepEqual(routePosition(14, 'student'), routePosition(14, 'student'));
});

test('map routes reveal only to each avatar and keep start rings uncolored', async () => {
  const { mapSvg, routeDistance, routePosition, avatarPosition } = await import('../src/components/GameMap.js');
  const { createInitialGame, reduceAction } = await import('../src/core/gameState.js');
  const base = reduceAction(createInitialGame(), { type: 'start-episode', episodeId: 1, seed: 23 });
  const progress = 2 / 5;
  const game = {
    ...base,
    screen: 'challenge',
    routeVisible: true,
    players: {
      ...base.players,
      student: { ...base.players.student, position: progress },
      guide: { ...base.players.guide, position: 0 }
    }
  };
  const html = mapSvg(null, game);
  const reveal = 100 * (1 - (routeDistance(progress) % 1));
  const revealedRoute = html.match(/id="route-mask-student-0"[^>]*><path[^>]*stroke-dashoffset:([0-9.]+)/);
  assert.ok(revealedRoute);
  assert.ok(Math.abs(Number(revealedRoute[1]) - reveal) < 1e-9);
  const pin = avatarPosition(progress, 'student');
  assert.ok(html.includes(`translate(${pin.x.toFixed(1)} ${pin.y.toFixed(1)})`));
  assert.match(html, /player-pin student ring-green/);
  assert.match(html, /player-pin guide ring-none/);
  const studentStart = avatarPosition(0, 'student');
  const guideStart = avatarPosition(0, 'guide');
  const city = routePosition(0, 'student');
  const expectedCenterOffset = 15 + 12.6 + 14;
  assert.equal(studentStart.y, guideStart.y);
  assert.ok(Math.abs((city.x - studentStart.x) - expectedCenterOffset) < 1e-9);
  assert.ok(Math.abs((guideStart.x - city.x) - expectedCenterOffset) < 1e-9);
  assert.ok(studentStart.x < routePosition(0, 'student').x);
  assert.ok(guideStart.x > routePosition(0, 'guide').x);
  for (const stop of [1, 7, 14]) {
    for (const player of ['student', 'guide']) {
      const avatar = avatarPosition(stop, player);
      const route = routePosition(stop, player);
      assert.ok(Math.abs(Math.hypot(avatar.x - route.x, avatar.y - route.y) - 20) < 1e-9);
    }
  }
  const guideAtStart = mapSvg(null, { ...game, activePlayer: 'guide', players: { ...game.players, student: { ...game.players.student, position: 0 }, guide: { ...game.players.guide, position: 0 } } });
  assert.doesNotMatch(guideAtStart, /class="city-focus complete"/);
  assert.doesNotMatch(guideAtStart, /start-hit-target/);
  const retryMarkup = mapSvg(null, { ...game, retry: { student: true, guide: false } });
  assert.match(retryMarkup, /player-pin student ring-red/);
});

test('avatar ring colors follow progress state rather than player identity', () => {
  const css = readFileSync(new URL('../src/styles.css', import.meta.url), 'utf8');
  assert.doesNotMatch(css, /\.player-pin\.(?:student|guide)\s+circle:first-of-type\s*\{\s*stroke:/);
  assert.match(css, /\.player-pin\.ring-none\s+circle:first-of-type\s*\{\s*stroke:/);
  assert.match(css, /\.player-pin\.ring-green\s+circle:first-of-type\s*\{\s*stroke:/);
  assert.match(css, /\.player-pin\.ring-red\s+circle:first-of-type\s*\{\s*stroke:/);
});

test('avatars stay west and east of their own routes through every bend and at the finish', async () => {
  const { avatarPosition, routePosition } = await import('../src/components/GameMap.js');
  for (const progress of [0.5, 1.5, 4.5, 7.5, 11.5, 13.5, 14]) {
    const route = routePosition(progress, 'student');
    const student = avatarPosition(progress, 'student');
    const guideRoute = routePosition(progress, 'guide');
    const guide = avatarPosition(progress, 'guide');
    assert.equal(student.x, route.x - 20);
    assert.equal(student.y, route.y);
    assert.equal(guide.x, guideRoute.x + 20);
    assert.equal(guide.y, guideRoute.y);
  }
});

test('Player 1 dotted route uses midnight orange', () => {
  const css = readFileSync(new URL('../src/styles.css', import.meta.url), 'utf8');
  assert.match(css, /\.journey-route\.student\s*\{\s*stroke:#e65100\s*\}/i);
});
