import test from 'node:test';
import assert from 'node:assert/strict';
import { createInitialGame, reduceAction, completePlayerTurn } from '../src/core/gameState.js';
import { locationForTurn, LocationPreview } from '../src/screens/episodes/Episode01/LocationPreview.js';
import { Episode01 } from '../src/screens/episodes/Episode01/index.js';

const started = () => reduceAction(reduceAction(createInitialGame(), { type: 'start-episode', episodeId: 1, seed: 5 }), 'start-challenge');
const introduced = (game, stop) => ({ ...game, locationStopsSeen: [...new Set([...game.locationStopsSeen, stop])] });

test('shared introduction waits for the first question turn, never the preceding arrival', () => {
  let game = started();
  assert.equal(game.locationPreviewStop, 0);
  assert.deepEqual(game.locationStopsSeen, [0]);
  game = completePlayerTurn(game, 5);
  assert.equal(game.activePlayer, 'guide');
  assert.equal(game.players.student.position, 1);
  assert.equal(locationForTurn(game), null); // second player at London skips its video
  game = completePlayerTurn(game, 5);
  assert.equal(game.activePlayer, 'student');
  assert.equal(locationForTurn(game), 1);
  game = introduced(game, 1);
  game = completePlayerTurn(game, 5);
  assert.equal(game.activePlayer, 'guide');
  assert.equal(locationForTurn(game), null); // second player at Manchester skips it
});

test('shared seen locations suppress second-player, retry and setback replays', () => {
  const initial = started();
  for (const player of ['student', 'guide']) {
    for (const stop of [0, 1, 2]) {
      const game = { ...initial, activePlayer: player, locationStopsSeen: [0,1,2], retry: { [player]: true }, players: { ...initial.players, [player]: { ...initial.players[player], position: stop } } };
      assert.equal(locationForTurn(game), null);
      assert.equal(locationForTurn({ ...game, locationStopsSeen: [] }), stop);
      assert.match(LocationPreview(stop), new RegExp('STOP 0' + (stop + 1)));
    }
  }
  assert.deepEqual(reduceAction(initial, { type: 'start-episode', episodeId: 1, seed: 5 }).locationStopsSeen, []);
  assert.equal(locationForTurn({ ...initial, completedPlayers: { student: true }, locationStopsSeen: [] }), null);
});

test('HOST owner and waiting player both render the same shared introduction as SOLO', () => {
  const base = { ...started(), locationPreview: true, locationPreviewStop: 2, playerPreview: false };
  for (const seat of ['student', 'guide', null]) {
    const game = { ...base, net: seat ? { seat } : undefined };
    const html = Episode01({ game, episodes: [] });
    assert.match(html, /glasgow-university.mp4/);
    assert.doesNotMatch(html, /player-preview-identity/);
  }
});

test('Quiz rewards use the next question location and leave skipped cities unseen', () => {
  const base = started();
  const players = { ...base.players, student: { ...base.players.student, position: 1, challengeIndex: 1 }, guide: { ...base.players.guide, position: 2, challengeIndex: 2 } };
  const game = { ...base, players, scores: { student: 5, guide: 10 }, locationStopsSeen: [0] };
  const boosted = completePlayerTurn({ ...game, punish: { type: 'boost', by: 'student' } }, 5);
  assert.equal(boosted.activePlayer, 'guide');
  assert.equal(locationForTurn(boosted), 2); // waiting player's Glasgow turn
  assert.deepEqual(boosted.locationStopsSeen, [0]); // no arrival introductions
  const frozen = completePlayerTurn({ ...game, punish: { type: 'freeze', by: 'student' } }, 5);
  assert.equal(frozen.activePlayer, 'student');
  assert.equal(locationForTurn(frozen), 2);
  const back = completePlayerTurn({ ...game, locationStopsSeen: [0,1], punish: { type: 'back', by: 'student' } }, 5);
  assert.equal(back.activePlayer, 'guide');
  assert.equal(back.players.guide.position, 1);
  assert.equal(locationForTurn(back), null);
});
