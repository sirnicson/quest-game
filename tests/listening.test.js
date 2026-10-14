import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { listeningBank } from '../src/data/episodes/listeningBank.js';
import { checkListeningAnswer, countWords, getListeningItem, listeningChallenge, pickListeningItem } from '../src/core/listeningEngine.js';
import { challenges } from '../src/data/episodes/episode01Challenges.js';

test('Listening bank has LS01–LS10 with transcripts, ordered prompt gaps, and clips', () => {
  assert.deepEqual(listeningBank.map(entry => entry.id), Array.from({ length: 10 }, (_, i) => `LS${String(i + 1).padStart(2, '0')}`));
  for (const entry of listeningBank) {
    assert.ok(entry.audioText.length > 40, entry.id);
    assert.equal(entry.promptParts.length, entry.gaps.length + 1, entry.id);
    assert.ok(entry.gaps.length > 0, entry.id);
    assert.ok(entry.gaps.every(gap => gap.accepted.length > 0 && gap.answerType), entry.id);
    assert.ok(['en-GB', 'en-US', 'en-AU', 'en-IN'].includes(entry.accent), entry.id);
  }
  assert.deepEqual(listeningBank.map(entry => entry.gaps.length), [2, 2, 3, 2, 3, 1, 1, 1, 1, 1]);
  assert.equal(new Set(listeningBank.map(entry => entry.accent)).size, 4);
});

test('every Listening item has a bundled audio clip', () => {
  for (const entry of listeningBank) {
    assert.ok(fs.existsSync(new URL(`../${entry.audio}`, import.meta.url)), `${entry.id} clip missing`);
  }
});

test('all gap answers are graded correct, ignoring case, punctuation and spacing', () => {
  const ls01 = getListeningItem('LS01');
  for (const values of [['3', 'ten twenty'], ['three', '10.20'], [' Three. ', 'TEN TWENTY']]) {
    assert.equal(checkListeningAnswer(ls01, values).status, 'correct', values.join(' / '));
  }
  assert.equal(checkListeningAnswer(getListeningItem('LS02'), ['three', 'waterproof']).status, 'correct');
  assert.equal(checkListeningAnswer(getListeningItem('LS03'), ['15', 'foot', '6']).status, 'correct');
  assert.equal(checkListeningAnswer(getListeningItem('LS04'), ['ten', 'dining room']).status, 'correct');
  assert.equal(checkListeningAnswer(getListeningItem('LS05'), ['Paris', 'southeast', 'Switzerland']).status, 'correct');
  const ls10 = getListeningItem('LS10');
  for (const typed of ['6:30', '6.30', 'half past six', 'Six thirty', '6:30pm', '6.30 PM']) assert.equal(checkListeningAnswer(ls10, [typed]).status, 'correct', typed);
  assert.equal(checkListeningAnswer(getListeningItem('LS07'), ['Winds']).status, 'correct');
  assert.equal(checkListeningAnswer(getListeningItem('LS09'), ['travel documents']).status, 'correct');
  assert.equal(checkListeningAnswer(getListeningItem('LS06'), ['90 minutes']).status, 'correct');
});

test('wrong gaps are marked incorrect and missing gaps stay retryable', () => {
  const wrong = checkListeningAnswer(getListeningItem('LS01'), ['three', 'ten thirty']);
  assert.equal(wrong.status, 'incorrect');
  assert.deepEqual(wrong.gapStatuses, ['correct', 'incorrect']);
  assert.equal(checkListeningAnswer(getListeningItem('LS05'), ['London', 'south-east', 'Switzerland']).status, 'incorrect');
  const missing = checkListeningAnswer(getListeningItem('LS01'), ['3', '   ']);
  assert.equal(missing.status, 'empty');
  assert.deepEqual(missing.gapStatuses, ['correct', 'empty']);
});

test('word limits stop over-long answers before grading', () => {
  const one = checkListeningAnswer(getListeningItem('LS05'), ['in Paris', 'south-east', 'Switzerland']);
  assert.equal(one.status, 'over-limit');
  assert.equal(one.gapStatuses[0], 'over-limit');
  assert.equal(checkListeningAnswer(getListeningItem('LS09'), ['their travel documents please']).status, 'over-limit');
  assert.equal(checkListeningAnswer(getListeningItem('LS09'), ['travel documents']).status, 'correct');
  assert.equal(countWords("nine o'clock"), 2);
});

test('listening challenges plug into the path and random picks avoid repeats', () => {
  const challenge = listeningChallenge('LS03');
  assert.equal(challenge.lane, 'Listening');
  assert.equal(challenge.listening.id, 'LS03');
  assert.equal(challenge.promptParts.length, 4);
  assert.deepEqual(challenges.filter(entry => entry.lane === 'Listening').map(entry => entry.listening.id), ['LS01', 'LS06', 'LS02']);
  const used = listeningBank.slice(1).map(entry => entry.id);
  assert.equal(pickListeningItem(used).id, 'LS01');
});
