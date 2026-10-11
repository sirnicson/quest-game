import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { Finish } from '../src/screens/episodes/Episode01/Finish.js';
import { FinishCelebration } from '../src/screens/episodes/Episode01/FinishCelebration.js';

test('the completion screen follows both finishers and shows historic Istanbul video and places', async () => {
  const game = {
    players: {
      student: { name: 'Player 1', avatar: '/assets/avatar new/batman.jpg', position: 15 },
      guide: { name: 'Player 2', avatar: '/assets/avatar new/wonder woman.jpg', position: 15 }
    },
    scores: { student: 55, guide: 49 },
    winner: 'student'
  };
  const html = Finish(game);
  assert.match(html, /QUEST COMPLETE/);
  assert.match(html, /The road remembers/);
  assert.match(html, /hagia-sophia-drone\.mp4/);
  assert.match(html, /Winner[\s\S]*Player 1[\s\S]*55/);
  assert.match(html, /Runner Up[\s\S]*Player 2[\s\S]*49/);
  assert.match(html, /VIEW ROAD AHEAD/);
  assert.match(html, /REPLAY EPISODE 01/);
  await fs.access('assets/episodes/episode01/hagia-sophia-drone.mp4');
});

test('the finish celebration varies its flair for winner and runner-up', () => {
  const player = { name: 'Player 1', avatar: '🏁', position: 15 };
  const base = { players: { student: player, guide: { ...player, name: 'Player 2' } } };
  const winner = FinishCelebration({ ...base, finishCelebration: { player: 'student', place: 'winner' } });
  const runnerUp = FinishCelebration({ ...base, finishCelebration: { player: 'guide', place: 'runner-up' } });
  assert.match(winner, /finish-celebration-winner/);
  assert.match(runnerUp, /finish-celebration-runner-up/);
  assert.match(winner, /Player 1/);
  assert.match(runnerUp, /Player 2/);
});

test('timer expiry shows QUEST FAILED, ranks by score, and disables the next episode', () => {
  const game = {
    players: {
      student: { name: 'Player 1', avatar: '🏁', position: 8 },
      guide: { name: 'Player 2', avatar: '🚲', position: 7 }
    },
    scores: { student: 25, guide: 30 },
    timerSeconds: 0,
    winner: null
  };
  const html = Finish(game);
  assert.match(html, /TIME UP/);
  assert.match(html, /QUEST FAILED/);
  assert.match(html, /Player 2[\s\S]*30[\s\S]*Player 1[\s\S]*25/);
  assert.doesNotMatch(html, /AHEAD|TRAILING|TIED/);
  assert.match(html, /PLAY AGAIN/);
  assert.match(html, /disabled[^>]*>VIEW EPISODE 02/);
  assert.doesNotMatch(html, /QUEST COMPLETE|finish-celebration/);
});

test('application entrypoint bootstraps App.js instead of owning the game UI', async () => {
  const main = await fs.readFile('src/main.js', 'utf8');
  assert.match(main, /from ['"]\.\/App\.js['"]/);
  assert.doesNotMatch(main, /function splash\(/);
  assert.doesNotMatch(main, /function episode1Briefing\(/);
  assert.doesNotMatch(main, /root\.innerHTML/);
});

test('App.js exposes the application outlet and opening/episode flows', async () => {
  const app = await fs.readFile('src/App.js', 'utf8');
  assert.match(app, /Splash/);
  assert.match(app, /Episode01/);
  assert.match(app, /render/);
});

test('core responsibilities have dedicated modules', async () => {
  for (const file of ['src/core/gameState.js','src/core/router.js','src/core/audio.js','src/core/storage.js']) {
    await fs.access(file);
  }
});

test('gameplay HUD uses the QUEST logo wordmark and omits the clock label', async () => {
  const hud = await fs.readFile('src/components/HUD.js', 'utf8');
  assert.match(hud, /hud-wordmark/);
  assert.match(hud, /favicon\.svg/);
  assert.match(hud, /<strong>QUEST<\/strong>/);
  assert.doesNotMatch(hud, /QUEST CLOCK/);
  assert.match(hud, /formatTime\(game\.timerSeconds\)/);
});

test('opening screens and Episode 01 have dedicated modules', async () => {
  for (const file of [
    'src/screens/opening/Splash.js',
    'src/screens/opening/Proclamation.js',
    'src/screens/opening/Skills.js',
    'src/screens/opening/TravellerSetup.js',
    'src/screens/episodes/Episode01/index.js',
    'src/screens/episodes/Episode01/Briefing.js',
    'src/screens/episodes/Episode01/Map.js',
    'src/screens/episodes/Episode01/Challenge.js',
    'src/screens/episodes/Episode01/Result.js',
    'src/screens/episodes/Episode01/Finish.js'
  ]) {
    await fs.access(file);
  }
});

test('episode data has one authoritative Episode 01 source', async () => {
  const episode = await fs.readFile('src/data/episodes/episode01.js', 'utf8');
  assert.match(episode, /id:\s*1/);
  assert.match(episode, /EUROPE/);
  assert.match(episode, /London/);
  assert.match(episode, /Istanbul/);
  assert.doesNotMatch(episode, /TODO|placeholder/i);
});

test('canonical episode journey records all five episode titles and route arcs', async () => {
  const { episodeJourney } = await import('../src/data/episodes/index.js');
  assert.deepEqual(episodeJourney, [
    { id: 1, title: 'The West: Europe', route: ['London', 'Istanbul'] },
    { id: 2, title: 'The East: Asia', route: ['Istanbul', 'Central Asia', 'China'] },
    { id: 3, title: 'The Pacific: Islands', route: ['China', 'Japan', 'Philippines', 'California'] },
    { id: 4, title: 'The New World: America', route: ['California', 'Texas', 'Mexico', 'Central America', 'Brazil'] },
    { id: 5, title: 'The Old World: Africa', route: ['Brazil', 'West Africa', 'Morocco', 'Spain', 'Portugal', 'England'] }
  ]);
});

test('App.js imports successfully as the browser entry dependency graph', async () => {
  globalThis.Audio = class {
    constructor() { this.loop = false; this.volume = 1; this.paused = true; }
    play() { this.paused = false; return Promise.resolve(); }
    pause() { this.paused = true; }
    addEventListener() {}
  };
  await import('../src/App.js');
});


test('europe-map.svg contains an SVG namespace so browser image rendering is reliable', async () => {
  const fs = await import('node:fs/promises');
  const svg = await fs.readFile(new URL('../assets/episodes/episode01/europe-map.svg', import.meta.url), 'utf8');
  assert.ok(svg.includes('xmlns="http://www.w3.org/2000/svg"'));
});

test('IT2.02 living cinematic environment is wired through opening screens', async () => {
  const splash = await fs.readFile('src/screens/opening/Splash.js', 'utf8');
  const proclamation = await fs.readFile('src/screens/opening/Proclamation.js', 'utf8');
  const skills = await fs.readFile('src/screens/opening/Skills.js', 'utf8');
  const setup = await fs.readFile('src/screens/opening/TravellerSetup.js', 'utf8');
  const forest = await fs.readFile('src/components/ForestAtmosphere.js', 'utf8');
  const mountain = await fs.readFile('src/components/LivingMountain.js', 'utf8');
  assert.match(splash, /livingMountain/);
  assert.match(splash, /sound-toggle/);
  assert.match(proclamation, /forestAtmosphere/);
  assert.match(skills, /forestAtmosphere/);
  assert.match(setup, /forestAtmosphere/);
  assert.match(forest, /<video class="forest-atmosphere__video"/);
  assert.match(mountain, /<video class="living-mountain__video"/);
});

test('IT2.02 proclamation uses the shared forest atmosphere with a centered cinematic box', async () => {
  const proclamation = await fs.readFile('src/screens/opening/Proclamation.js', 'utf8');
  const styles = await fs.readFile('src/styles.css', 'utf8');
  const map = await fs.readFile('src/screens/episodes/Episode01/Map.js', 'utf8');
  assert.match(proclamation, /forestAtmosphere/);
  assert.match(proclamation, /proclamation-card/);
  assert.doesNotMatch(proclamation, /cinematic-copy/);
  assert.match(styles, /\.proclamation-card\{[^}]*margin:auto/);
});

test('IT2.02 landing mountain contains no moving animal', async () => {
  const mountain = await fs.readFile('src/components/LivingMountain.js', 'utf8');
  assert.doesNotMatch(mountain, /mountain-animal/);
  assert.doesNotMatch(mountain, /♞/);
});

test('IT2.02 audio flow fades ambient sound before gameplay and provides gameplay sounds', async () => {
  const audio = await fs.readFile('src/core/audio.js', 'utf8');
  const app = await fs.readFile('src/App.js', 'utf8');
  assert.match(audio, /export function fadeAmbient/);
  assert.match(audio, /export function startGameplay/);
  assert.match(audio, /export function playGameMove/);
  assert.match(app, /fadeAmbient\(1200\)\.then\(\(\)=>startGameplay\(\)\)/);
});



test('Episode 01 uses the supplied Europe base map with an interactive London start and route overlay', async () => {
  const fs = await import('node:fs/promises');
  const map = await fs.readFile('src/screens/episodes/Episode01/Map.js', 'utf8');
  const episode = await fs.readFile('src/screens/episodes/Episode01/index.js', 'utf8');
  const gameMap = await fs.readFile('src/components/GameMap.js', 'utf8');
  const styles = await fs.readFile('src/styles.css', 'utf8');
  const app = await fs.readFile('src/App.js', 'utf8');
  assert.match(map, /map-stage/);
  assert.match(map, /camera-\$\{String\(game\.camera\)/);
  assert.match(episode, /challenge-overlay/);
  assert.match(gameMap, /europe%20locations\.png/);
  assert.match(gameMap, /preserveAspectRatio="xMidYMid slice"/);
  assert.match(gameMap, /start-hit-target/);
  assert.match(gameMap, /start-challenge/);
  assert.match(gameMap, /journey-route/);
  assert.match(gameMap, /mapImagePoint = \(x, y\)/);
  assert.match(gameMap, /routeLegPoints\(index, player/);
  assert.match(gameMap, /export function routePosition\(progress, player/);
  assert.match(episode, /episode01-gameplay/);
  assert.match(styles, /\.episode01-gameplay \.game-body\{display:block/);
  assert.match(styles, /\.episode01-gameplay \.journey-scoreboard\{top:50%/);
  assert.match(gameMap, /mapCameraPose/);
  assert.match(gameMap, /class="journey-route \$\{player\}"/);
  assert.match(styles, /\.journey-scoreboard span\{display:flex;align-items:center;gap:7px;font-size:15px/);
  assert.match(styles, /\.episode01-gameplay \.journey-scoreboard\{[^}]*border-radius:16px/);
  assert.match(app, /addEventListener\('wheel'/);
  assert.match(app, /addEventListener\('pointerdown'/);
});

test('Challenge cards cover Quiz, Reading, Speaking and Writing with in-card feedback', async () => {
  const challenge = await fs.readFile('src/screens/episodes/Episode01/Challenge.js', 'utf8');
  const styles = await fs.readFile('src/styles.css', 'utf8');
  const map = await fs.readFile('src/screens/episodes/Episode01/Map.js', 'utf8');
  assert.match(challenge, /data-action="quiz-punish"/);
  assert.match(challenge, /punishOptions/);
  assert.match(challenge, /'check-reading'/);
  assert.match(challenge, /writingVerdicts/);
  assert.match(challenge, /data-action="judge"/);
  assert.match(challenge, /reading-passage/);
  assert.match(challenge, /retry-chip/);
  assert.match(challenge, /challenge-player/);
  assert.match(challenge, /speaking-scores/);
  assert.doesNotMatch(challenge, /TURN ·|stop\.title/);
  assert.match(styles, /\.journey-route\.student\{stroke:#e65100/);
  assert.match(styles, /\.journey-route\.guide\{stroke:#123b78/);
  const mapMarkup = await fs.readFile('src/components/GameMap.js', 'utf8');
  assert.match(mapMarkup, /betweenStops \? 'EN ROUTE TO' : `STOP/);
  assert.doesNotMatch(mapMarkup, /Route revealed from London/);
  assert.match(map, /STOP 01<\/span><strong>\$\{escapeHtml\(episode\.start\.name\)\}<\/strong><\/div>/);
  assert.doesNotMatch(map, /Click the START marker to begin/);
});


test('player preview card shows the active avatar and name before its question', async () => {
  const { Challenge } = await import('../src/screens/episodes/Episode01/Challenge.js');
  const { createInitialGame } = await import('../src/core/gameState.js');
  const game = {
    ...createInitialGame(),
    screen: 'challenge',
    playerPreview: true,
    notice: 'The previous player used BOOST.',
    players: {
      ...createInitialGame().players,
      student: { position: 0, name: 'Ada', avatar: '🧗' }
    }
  };
  const preview = Challenge(game);
  assert.match(preview, /player-preview-identity/);
  assert.match(preview, /🧗/);
  assert.match(preview, /ADA/);
  assert.doesNotMatch(preview, /previous player|player-preview-notice/i);
  assert.doesNotMatch(preview, /What does IMF stand for/);
});

test('turn feedback slip replaces the Quiz card during movement, then scores and preview update', async () => {
  const { Episode01 } = await import('../src/screens/episodes/Episode01/index.js');
  const { createInitialGame } = await import('../src/core/gameState.js');
  const game = createInitialGame();
  const moving = Episode01({ game: {
    ...game,
    screen: 'challenge',
    playerPreview: true,
    activePlayer: 'guide',
    moveAnim: { player: 'student', from: 0, to: 1 },
    movementFeedback: { playerId: 'student', message: 'Player 2 is frozen and skips their next turn.' },
    displayScores: { student: 0, guide: 0 },
    scores: { student: 5, guide: 0 }
  }, episodes: [] });
  assert.match(moving, /movement-feedback-slip/);
  assert.match(moving, /Player 2 is frozen and skips their next turn/);
  assert.doesNotMatch(moving, /quiz-photo-content|player-preview-identity/);
  assert.match(moving, /<strong>0<\/strong>/);

  const scoreUpdate = Episode01({ game: {
    ...game, screen: 'challenge', playerPreview: true, activePlayer: 'guide',
    movementFeedback: null, transitionPhase: 'score', displayScores: null, scores: { student: 5, guide: 0 }
  }, episodes: [] });
  assert.doesNotMatch(scoreUpdate, /movement-feedback-slip|player-preview-identity/);
  assert.match(scoreUpdate, /<strong>5<\/strong>/);
  const preview = Episode01({ game: {
    ...game, screen: 'challenge', playerPreview: true, activePlayer: 'guide',
    movementFeedback: null, transitionPhase: null, displayScores: null, scores: { student: 5, guide: 0 }
  }, episodes: [] });
  assert.match(preview, /player-preview-identity/);
  assert.match(preview, /PLAYER 2/);
});

test('next-player preview waits until avatar movement ends for every question type', async () => {
  const { Episode01 } = await import('../src/screens/episodes/Episode01/index.js');
  const { createInitialGame } = await import('../src/core/gameState.js');
  const game = {
    ...createInitialGame(),
    screen: 'challenge',
    playerPreview: true,
    activePlayer: 'guide',
    moveAnim: { player: 'student', from: 0, to: 1 }
  };
  const whileMoving = Episode01({ game, episodes: [] });
  assert.doesNotMatch(whileMoving, /player-preview-identity/);
  const afterMovement = Episode01({ game: { ...game, moveAnim: null }, episodes: [] });
  assert.match(afterMovement, /player-preview-identity/);
  assert.match(afterMovement, /PLAYER 2/);
});

test('finish celebration follows the movement feedback slip after the final move', async () => {
  const { Episode01 } = await import('../src/screens/episodes/Episode01/index.js');
  const { createInitialGame } = await import('../src/core/gameState.js');
  const game = {
    ...createInitialGame(), screen: 'challenge', playerPreview: false,
    finishCelebration: { player: 'student', place: 'winner' },
    moveAnim: { player: 'student', from: 13, to: 14 },
    movementFeedback: { playerId: 'student', message: 'Player 1 earns 5 points.' }
  };
  const moving = Episode01({ game, episodes: [] });
  assert.match(moving, /movement-feedback-slip/);
  assert.doesNotMatch(moving, /finish-celebration-winner/);
  const finished = Episode01({ game: { ...game, moveAnim: null, movementFeedback: null }, episodes: [] });
  assert.match(finished, /finish-celebration-winner/);
});

test('V3.02 Episode 01 gameplay slice validates answers per skill', async () => {
  const app = await fs.readFile('src/App.js', 'utf8');
  const state = await fs.readFile('src/core/gameState.js', 'utf8');
  assert.match(app, /checkQuizAnswer/);
  assert.match(app, /checkReadingAnswer/);
  assert.match(app, /checkWritingLength/);
  assert.match(app, /selectedAnswer/);
  assert.match(state, /activeStop/);
});

test('a successful challenge advances its question index and caps score at city checkpoints', async () => {
  const state = await fs.readFile('src/core/gameState.js', 'utf8');
  assert.match(state, /const scoreAfterTurnAward = scoreAfterAward\(scoreBeforeTurn, points\)/);
  assert.match(state, /const appliedPoints = scoreAfterTurnAward - scoreBeforeTurn/);
  assert.match(state, /challengeIndex: fromIndex \+ \(advanced \? 1 : 0\)/);
  assert.match(state, /position: routeProgress\(scores\[currentPlayer\]\)/);
  assert.match(state, /scores\[currentPlayer\] = scoreAfterTurnAward/);
  assert.match(state, /activePlayer: nextPlayer/);
  assert.match(state, /routeVisible,/);
});

test('speaking and writing are judged GOOD 5, FAIR 2, RETRY 0 by the other player', async () => {
  const state = await fs.readFile('src/core/gameState.js', 'utf8');
  const bank = await fs.readFile('src/core/challengeBank.js', 'utf8');
  assert.match(state, /scoreAfterAward\(scoreBeforeTurn, points\)/);
  assert.match(bank, /GOOD: 5, FAIR: 2, RETRY: 0/);
  const challenge = await fs.readFile('src/screens/episodes/Episode01/Challenge.js', 'utf8');
  assert.match(challenge, /GOOD <span>\$\{pts\('GOOD'\)\} PTS<\/span>/);
  assert.match(challenge, /FAIR <span>\$\{pts\('FAIR'\)\} PTS<\/span>/);
  assert.match(challenge, /RETRY <span>\$\{POINTS\.RETRY\} PTS<\/span>/);
  const map = await fs.readFile('src/screens/episodes/Episode01/Map.js', 'utf8');
  assert.match(map, /game\.players\.student\.avatar/);
  assert.match(map, /game\.players\.guide\.avatar/);
});

