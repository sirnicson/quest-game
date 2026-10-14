import test from 'node:test';
import assert from 'node:assert/strict';
import { createInitialGame, reduceAction, completePlayerTurn } from '../src/core/gameState.js';
import { locationForTurn, LocationPreview } from '../src/screens/episodes/Episode01/LocationPreview.js';

test('location video follows the next answering player, not the previous arrival', () => {
  let game = reduceAction(createInitialGame(), { type: 'start-episode', episodeId: 1, seed: 5 });
  assert.equal(locationForTurn(game), 0);
  game = completePlayerTurn(game, 5);
  assert.equal(game.activePlayer, 'guide');
  assert.equal(game.players.student.position, 1);
  assert.equal(locationForTurn(game), 0);
  game = completePlayerTurn(game, 5);
  assert.equal(game.activePlayer, 'student');
  assert.equal(locationForTurn(game), 1);
});

test('each player and retry can replay their location video regardless of seen flags', () => {
  const initial = createInitialGame();
  for (const player of ['student', 'guide']) {
    for (const stop of [0, 1, 2]) {
      const game = { ...initial, activePlayer: player, locationStopsSeen: [0,1,2], retry: { [player]: true }, players: { ...initial.players, [player]: { ...initial.players[player], position: stop } } };
      assert.equal(locationForTurn(game), stop);
      assert.match(LocationPreview(stop), new RegExp('STOP 0' + (stop + 1)));
    }
  }
  const unsupported = { ...initial, players: { ...initial.players, student: { ...initial.players.student, position: 3 } } };
  assert.equal(locationForTurn(unsupported), null);
  assert.equal(locationForTurn({ ...initial, completedPlayers: { student: true } }), null);
});
