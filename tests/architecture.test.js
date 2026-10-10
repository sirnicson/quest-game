import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

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
  assert.match(gameMap, /routePoint\(371\.4, 334\.7\)/);
  assert.match(gameMap, /routePoint\(308, 255\)/);
  assert.match(episode, /episode01-gameplay/);
  assert.match(styles, /\.episode01-gameplay \.game-body\{display:block/);
  assert.match(styles, /\.episode01-gameplay \.journey-scoreboard\{top:50%/);
  assert.match(gameMap, /mapCameraPose/);
  assert.match(gameMap, /PIN_OFFSET = \{ student: -42, guide: 42 \}/);
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
  assert.match(styles, /\.journey-route\{[^}]*stroke:#8f0b18;stroke-width:1\.5;[^}]*stroke-dasharray:0\.6 2\.8/);
  const mapMarkup = await fs.readFile('src/components/GameMap.js', 'utf8');
  assert.match(mapMarkup, /STOP \$\{String\(activeIndex \+ 1\)\.padStart\(2, '0'\)\}/);
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
    players: {
      ...createInitialGame().players,
      student: { position: 0, name: 'Ada', avatar: '🧗' }
    }
  };
  const preview = Challenge(game);
  assert.match(preview, /player-preview-identity/);
  assert.match(preview, /🧗/);
  assert.match(preview, /ADA/);
  assert.doesNotMatch(preview, /What does IMF stand for/);
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

test('a successful challenge advances the owner; the turn passes to the waiting player', async () => {
  const state = await fs.readFile('src/core/gameState.js', 'utf8');
  assert.match(state, /const advanced = points > 0/);
  assert.match(state, /Math\.min\(FINISHED, from \+ \(advanced \? 1 : 0\)\)/);
  assert.match(state, /activePlayer: nextPlayer/);
  assert.match(state, /routeVisible,/);
});

test('speaking and writing are judged GOOD 5, FAIR 2, RETRY 0 by the other player', async () => {
  const state = await fs.readFile('src/core/gameState.js', 'utf8');
  const bank = await fs.readFile('src/core/challengeBank.js', 'utf8');
  assert.match(state, /\(scores\[currentPlayer\] \?\? 0\) \+ points/);
  assert.match(bank, /GOOD: 5, FAIR: 2, RETRY: 0/);
  const challenge = await fs.readFile('src/screens/episodes/Episode01/Challenge.js', 'utf8');
  assert.match(challenge, /GOOD <span>\$\{pts\('GOOD'\)\} PTS<\/span>/);
  assert.match(challenge, /FAIR <span>\$\{pts\('FAIR'\)\} PTS<\/span>/);
  assert.match(challenge, /RETRY <span>\$\{POINTS\.RETRY\} PTS<\/span>/);
  const map = await fs.readFile('src/screens/episodes/Episode01/Map.js', 'utf8');
  assert.match(map, /game\.players\.student\.avatar/);
  assert.match(map, /game\.players\.guide\.avatar/);
});

