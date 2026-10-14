import test from 'node:test';
import assert from 'node:assert/strict';
import { createInitialGame, applyMovement, advanceScreen, completePlayerTurn, reduceAction } from '../src/game/state.js';

test('starts on splash with two players at START', () => {
  const game = createInitialGame();
  assert.equal(game.screen, 'splash');
  assert.equal(game.timerSeconds, 3000);
  assert.equal(game.players.student.position, 0);
  assert.equal(game.players.guide.position, 0);
});

test('advances opening sequence in order', () => {
  let game = createInitialGame();
  for (const expected of ['proclamation','mission','setup','episode1Briefing','map']) {
    game = advanceScreen(game);
    assert.equal(game.screen, expected);
  }
});



test('episode start establishes the London camera gameplay phase', () => {
  let game = createInitialGame();
  game = reduceAction(game, { type: 'start-episode', episodeId: 1 });
  assert.equal(game.screen, 'map');
  assert.equal(game.previewEpisode, 1);
  assert.equal(game.camera, 'london');
  assert.equal(game.activeStop, 1);
  assert.deepEqual(game.mapView, { scale: 1, x: 0, y: 0 });
  assert.deepEqual(game.completedPlayers, { student: false, guide: false });
  assert.equal(game.routeVisible, false);
  assert.equal(game.playerPreview, false);
});

test('each player turn starts with a preview before the challenge', () => {
  let game = reduceAction(createInitialGame(), 'start-challenge');
  assert.equal(game.playerPreview, true);

  game = completePlayerTurn(game, 0);
  assert.equal(game.activePlayer, 'guide');
  assert.equal(game.playerPreview, true);
});

test('movement uses point awards and clamps at the next city and FINISH', () => {
  let game = createInitialGame();
  game = applyMovement(game, 'student', 2);
  assert.equal(game.players.student.position, 0.4);
  game = applyMovement(game, 'student', -5);
  assert.equal(game.players.student.position, 0);
  for (let city = 0; city < 14; city++) game = applyMovement(game, 'student', 5);
  assert.equal(game.players.student.position, 14);
});

test('a failed player stays at their own stop while the other player can advance', () => {
  let game = { ...createInitialGame(), screen: 'challenge' };

  game = completePlayerTurn(game, 0);
  assert.equal(game.players.student.position, 0);
  assert.equal(game.activePlayer, 'guide');

  game = completePlayerTurn(game, 1);
  assert.equal(game.players.guide.position, 0.2);
  assert.equal(game.activePlayer, 'student');

  game = completePlayerTurn(game, 0);
  assert.equal(game.players.student.position, 0);
  assert.equal(game.players.guide.position, 0.2);
  assert.equal(game.activePlayer, 'guide');
  assert.equal(game.activeStop, 1);

  game = completePlayerTurn(game, 0);
  assert.equal(game.players.student.position, 0);
  assert.equal(game.players.guide.position, 0.2);
  assert.equal(game.activePlayer, 'student');

  game = completePlayerTurn(game, 5);
  assert.equal(game.players.student.position, 1);
  assert.equal(game.players.guide.position, 0.2);
  assert.equal(game.activePlayer, 'guide');
});

test('entry point references the actual application module', async () => {
  const fs = await import('node:fs/promises');
  const html = await fs.readFile('index.html', 'utf8');
  assert.match(html, /src="(?:\.\/)?src\/main\.js"/);
});


test('finishing the final stop produces a finish-line state', () => {
  let game = createInitialGame();
  for (let city = 0; city < 14; city++) game = applyMovement(game, 'student', 5);
  assert.equal(game.players.student.position, 14);
  assert.equal(game.players.student.position === 14, true);
});

test('ENTER QUEST advances the splash into the proclamation', () => {
  let game = createInitialGame();
  game = reduceAction(game, 'next');
  assert.equal(game.screen, 'proclamation');
});

test('player profiles can be edited independently', () => {
  let game = createInitialGame();
  game = reduceAction(game, { type: 'set-player', player: 'student', name: 'Ada', avatar: '🧗' });
  game = reduceAction(game, { type: 'set-player', player: 'guide', name: 'Sam', avatar: '🧭' });
  assert.deepEqual(game.players.student, { position: 0, challengeIndex: 0, name: 'Ada', avatar: '🧗' });
  assert.deepEqual(game.players.guide, { position: 0, challengeIndex: 0, name: 'Sam', avatar: '🧭' });
});

test('skills screen cards match challenge lanes without descriptive subtext', async () => {
  const fs = await import('node:fs/promises');
  const app = await fs.readFile('src/screens/opening/Skills.js', 'utf8');
  assert.match(app, /SKILLS FOR THE ROAD/);
  assert.doesNotMatch(app, /Every challenge leaves you|The journey is not just about reaching the end|Mistakes are not the end of the journey/);
  assert.match(app, /ACCEPT THE QUEST/);
  assert.match(app, /QUIZ/);
  assert.doesNotMatch(app, /THINK|<p>\$\{desc\}<\/p>/);
});

test('player setup screen omits the explanatory subtext', async () => {
  const fs = await import('node:fs/promises');
  const app = await fs.readFile('src/main.js', 'utf8');
  const setupSource = await fs.readFile('src/screens/opening/TravellerSetup.js', 'utf8');
  assert.doesNotMatch(setupSource, /teacher-note|Two travellers\. One road/);
  assert.match(setupSource, /START THE JOURNEY/);
});

test('back returns to the previous screen and home reset clears the session', () => {
  let game = createInitialGame();
  game = reduceAction(game, 'next');
  game = reduceAction(game, 'next');
  assert.equal(game.screen, 'mission');
  game = reduceAction(game, 'back');
  assert.equal(game.screen, 'proclamation');
  game = reduceAction(game, { type:'set-player', player:'student', name:'Ada', avatar:'🧗' });
  game = applyMovement(game, 'student', 4);
  game = reduceAction(game, 'home-reset');
  assert.equal(game.screen, 'splash');
  assert.equal(game.players.student.name, 'Player 1');
  assert.equal(game.players.student.position, 0);
  assert.equal(game.timerSeconds, 3000);
  assert.deepEqual(game.history, []);
});

test('Quest branding omits the Means Business tagline', async () => {
  const fs = await import('node:fs/promises');
  const app = await fs.readFile('src/screens/opening/Splash.js', 'utf8');
  const splashSource = app;
  assert.match(splashSource, /<h1>QUEST<\/h1>/);
  assert.doesNotMatch(app, /MEANS BUSINESS/);
  assert.doesNotMatch(splashSource, /quest-logo|quest-letter-q|quest-emblem/);
});
