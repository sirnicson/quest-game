import { readingBank, speakingBank, writingBank } from '../data/episodes/episode01Bank.js';
import { quizBank } from '../data/quizBank.js';
import { listeningBank } from '../data/episodes/listeningBank.js';
import { listeningChallenge, normalizeAnswer, LISTENING_POINTS } from './listeningEngine.js';

export const POINTS = { correct: LISTENING_POINTS, GOOD: 5, FAIR: 2, RETRY: 0 };

export const bankIds = {
  Quiz: quizBank.map(q => q.id),
  Reading: readingBank.map(q => q.id),
  Speaking: speakingBank.map(q => q.id),
  Writing: writingBank.map(q => q.id),
  Listening: listeningBank.map(q => q.id)
};

const find = (list, id) => list.find(item => item.id === id);

// Normalised challenge object for any bank id (QZ, RD, SP, WR, LS).
export function challengeById(id) {
  const prefix = String(id).slice(0, 2);
  if (prefix === 'LS') return listeningChallenge(id);
  if (prefix === 'QZ') {
    const q = find(quizBank, id);
        return q && { ...q, lane: 'Quiz', icon: '\ud83e\udde0', title: q.topic };
  }
  if (prefix === 'RD') {
    const q = find(readingBank, id);
    return q && { ...q, lane: 'Reading', icon: '\u{1F4D6}', title: q.topic };
  }
  if (prefix === 'SP') {
    const q = find(speakingBank, id);
    return q && { ...q, lane: 'Speaking', icon: '\u{1F3A4}', title: q.topic };
  }
  if (prefix === 'WR') {
    const q = find(writingBank, id);
    return q && { ...q, lane: 'Writing', icon: '\u270D\uFE0F', title: q.topic };
  }
  return null;
}

const quizForm = value => String(value ?? '')
  .toLowerCase()
  .replace(/&/g, ' and ')
  .replace(/[^a-z0-9 ]+/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()
  .replace(/^(the|a|an) /, '');

// Spoken or typed answer. Exact match on any accepted form, or the accepted form as whole words inside a short reply.
export function checkQuizAnswer(item, input) {
  const given = quizForm(input);
  if (!given) return { status: 'empty', message: 'Say or type your answer first.' };
  const accepted = item.accepted.map(quizForm).filter(Boolean);
  const givenWords = given.split(' ');
  const correct = accepted.some(answer => {
    if (answer === given) return true;
    const words = answer.split(' ');
    if (givenWords.length > words.length + 5) return false;
    return ` ${given} `.includes(` ${answer} `);
  });
  return correct
    ? { status: 'correct', message: 'CORRECT' }
    : { status: 'incorrect', message: 'WRONG' };
}

export function checkReadingAnswer(item, selected) {
  if (selected === null || selected === undefined) return { status: 'empty', message: 'Choose an answer first.' };
  return selected === item.answer
    ? { status: 'correct', message: 'Correct!' }
    : { status: 'incorrect', message: 'Not quite.' };
}

export const wordCount = text => (String(text ?? '').trim().match(/\S+/g) ?? []).length;

export function checkWritingLength(item, text) {
  const words = wordCount(text);
  return { words, ok: words >= item.minWords && words <= item.maxWords };
}

// Which verdicts the judge may give: 1-10 words RETRY, 11 to below the minimum RETRY/FAIR, minimum or more all three.
export function writingVerdicts(item, text) {
  const words = wordCount(text);
  if (words === 0) return [];
  if (words <= 10) return ['RETRY'];
  if (words < item.minWords) return ['RETRY', 'FAIR'];
  return ['RETRY', 'FAIR', 'GOOD'];
}

export const QUIZ_POINTS = POINTS.correct;
