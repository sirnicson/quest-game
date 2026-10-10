import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { listeningBank } from '../src/data/episodes/listeningBank.js';
import { checkListeningAnswer, countWords, getListeningItem, listeningChallenge, pickListeningItem } from '../src/core/listeningEngine.js';
import { challenges } from '../src/data/episodes/episode01Challenges.js';

test('Listening bank has LS01–LS10 with transcript, accepted answers, type and clip', () => {
  assert.deepEqual(listeningBank.map(entry => entry.id), Array.from({ length: 10 }, (_, i) => `LS${String(i + 1).padStart(2, '0')}`));
  for (const entry of listeningBank) {
    assert.ok(entry.audioText.length > 40, entry.id);
    assert.ok(entry.accepted.length > 0, entry.id);
    assert.ok(entry.answerType, entry.id);
    assert.match(entry.prompt, /____/, entry.id);
    assert.ok(['en-GB', 'en-US', 'en-AU', 'en-IN'].includes(entry.accent), entry.id);
  }
  assert.equal(new Set(listeningBank.map(entry => entry.accent)).size, 4);
});

test('every Listening item has a bundled audio clip', () => {
  for (const entry of listeningBank) {
    assert.ok(fs.existsSync(new URL(`../${entry.audio}`, import.meta.url)), `${entry.id} clip missing`);
  }
});

test('accepted answers are graded correct, ignoring case, punctuation and spacing', () => {
  const ls01 = getListeningItem('LS01');
  for (const typed of ['3', 'three', ' Three. ', 'THREE']) assert.equal(checkListeningAnswer(ls01, typed).status, 'correct', typed);
  const ls10 = getListeningItem('LS10');
  for (const typed of ['6:30', '6.30', 'half past six', 'Six thirty', '6:30pm', '6.30 PM']) assert.equal(checkListeningAnswer(ls10, typed).status, 'correct', typed);
  assert.equal(checkListeningAnswer(getListeningItem('LS07'), 'Winds').status, 'correct');
  assert.equal(checkListeningAnswer(getListeningItem('LS09'), 'travel documents').status, 'correct');
  assert.equal(checkListeningAnswer(getListeningItem('LS06'), '90 minutes').status, 'correct');
});

test('wrong answers are incorrect and empty answers are not graded', () => {
  assert.equal(checkListeningAnswer(getListeningItem('LS01'), 'four').status, 'incorrect');
  assert.equal(checkListeningAnswer(getListeningItem('LS05'), 'London').status, 'incorrect');
  assert.equal(checkListeningAnswer(getListeningItem('LS01'), '   ').status, 'empty');
});

test('word limits stop over-long answers before grading', () => {
  const one = checkListeningAnswer(getListeningItem('LS05'), 'in Paris');
  assert.equal(one.status, 'over-limit');
  assert.equal(one.limit, 1);
  assert.equal(checkListeningAnswer(getListeningItem('LS09'), 'their travel documents please').status, 'over-limit');
  assert.equal(checkListeningAnswer(getListeningItem('LS09'), 'travel documents').status, 'correct');
  assert.equal(countWords("nine o'clock"), 2);
});

test('listening challenges plug into the path and random picks avoid repeats', () => {
  const challenge = listeningChallenge('LS03');
  assert.equal(challenge.lane, 'Listening');
  assert.equal(challenge.listening.id, 'LS03');
  assert.deepEqual(challenges.filter(entry => entry.lane === 'Listening').map(entry => entry.listening.id), ['LS01', 'LS06', 'LS02']);
  const used = listeningBank.slice(1).map(entry => entry.id);
  assert.equal(pickListeningItem(used).id, 'LS01');
});
