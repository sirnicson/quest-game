import { avatarHtml } from '../../../data/avatars.js';
import { button, escapeHtml, laneClass } from '../../../components/view.js';
import { currentChallenge } from '../../../core/challengeSelect.js';
import { punishOptions, rewardsUsed, isCappedRetry, RETRY_CAP } from '../../../core/gameState.js';
import { checkWritingLength, writingVerdicts, POINTS } from '../../../core/challengeBank.js';

const OTHER = { student: 'guide', guide: 'student' };
const REASON_LABELS = { SHORT: 'TOO SHORT', OFFTOPIC: 'OFF TOPIC', UNCLEAR: 'UNCLEAR' };

const retryChip = (game, retry) => {
  if (!retry) return '';
  const who = game.activePlayer || 'student';
  const reason = REASON_LABELS[game.retryReason?.[who]];
  const parts = ['RETRY', reason, isCappedRetry(game, who) ? `MAX ${RETRY_CAP} PTS` : null].filter(Boolean);
  return `<span class="retry-chip">${parts.join(' · ')}</span>`;
};

const header = (stop, game, player, retry) => `<div class="challenge-top"><span class="stop-chip ${laneClass(stop.lane)}">${stop.icon} ${escapeHtml(stop.lane.toUpperCase())}</span>${retryChip(game, retry)}<span class="challenge-player"><span aria-hidden="true">${avatarHtml(player.avatar)}</span> ${escapeHtml(player.name)}</span></div>`;

const role = game => {
  const online = Boolean(game.net);
  const owner = !online || game.net.seat === (game.activePlayer || 'student');
  return { online, owner, judge: online && !owner };
};

const judgeButtons = (game, disabled = false, allowed = ['GOOD', 'FAIR', 'RETRY'], chosen = null) => {
  const off = v => disabled || !allowed.includes(v) ? 'disabled' : '';
  const pick = v => chosen === v ? ' chosen' : '';
  if (game.reasonPick && !chosen && !disabled) {
    const reasons = Object.entries(REASON_LABELS).map(([code, label]) => `<button type="button" class="btn danger" data-action="judge" data-points="RETRY:${code}">${label}</button>`).join('');
    return `<div class="teacher-tools speaking-scores retry-reasons" aria-label="Why retry?">${reasons}<button type="button" class="btn" data-action="judge-back" aria-label="Back to scores">←</button></div>`;
  }
  const capped = isCappedRetry(game, game.activePlayer || 'student');
  const pts = v => capped ? Math.min(POINTS[v], RETRY_CAP) : POINTS[v];
  return `<div class="teacher-tools speaking-scores" aria-label="Judge the response">
  <button type="button" class="btn success${pick('GOOD')}" data-action="judge" data-points="GOOD" ${off('GOOD')}>GOOD <span>${pts('GOOD')} PTS</span></button>
  <button type="button" class="btn fair${pick('FAIR')}" data-action="judge" data-points="FAIR" ${off('FAIR')}>FAIR <span>${pts('FAIR')} PTS</span></button>
  <button type="button" class="btn danger${pick('RETRY')}" data-action="judge" data-points="RETRY" ${off('RETRY')}>RETRY <span>${POINTS.RETRY} PTS</span></button>
</div>`;
};

const verdictLine = (game, who = null) => {
  const verdict = game.verdict;
  if (!verdict) return '';
  const capped = isCappedRetry(game, game.activePlayer || 'student');
  const pts = capped ? Math.min(POINTS[verdict], RETRY_CAP) : POINTS[verdict];
  const reason = verdict === 'RETRY' && REASON_LABELS[game.verdictReason] ? ` · ${REASON_LABELS[game.verdictReason]}` : '';
  return `<p class="verdict-line ${verdict.toLowerCase()}" role="status">${who ? `${escapeHtml(who)} scored you ${verdict}` : verdict}${reason} · +${pts} PTS</p>`;
};

function listeningCard(stop, game, player, retry) {
  const state = game.listening ?? {};
  const status = state.status;
  const locked = status === 'correct' || status === 'incorrect';
  const feedback = state.message && status !== 'correct' && status !== 'incorrect' ? `<p class="listening-feedback ${status}" role="status">${escapeHtml(state.message)}</p>` : '';
  const playLabel = state.played ? '▶ REPLAY' : '▶ PLAY AUDIO';
  const prompt = stop.listening.gaps.map((gap, index) => {
    const part = stop.listening.promptParts[index] ?? '';
    const value = state.values?.[index] ?? '';
    const gapStatus = state.gapStatuses?.[index] ?? '';
    const answerLength = Math.max(5, Math.min(20, Math.max(...gap.accepted.map(answer => answer.length))));
    return `${escapeHtml(part)}<input id="listening-answer-${index}" class="listening-answer ${gapStatus}" type="text" data-listening-gap="${index}" data-gap="${index + 1}" size="${answerLength}" autocomplete="off" spellcheck="false" maxlength="40" aria-label="Answer ${index + 1}" value="${escapeHtml(value)}" ${state.played && !locked ? '' : 'disabled'}>`;
  }).join('') + escapeHtml(stop.listening.promptParts.at(-1) ?? '');
  const { online, owner } = role(game);
  const watching = online && !owner;
  return `<aside class="challenge-card long-question listening-question">
    ${header(stop, game, player, retry)}
    <p class="prompt listening-prompt">${prompt}</p>
    <div class="listening-player">
      <audio id="listening-audio" preload="auto" src="/${escapeHtml(stop.listening.audio)}"></audio>
      ${watching ? '' : `<button type="button" class="btn primary" data-action="play-listening" ${locked ? 'disabled' : ''}>${playLabel}</button>`}
      <span class="listening-hint">${watching ? `${escapeHtml(player.name)} is listening…` : state.played ? 'Type an answer in each blank.' : 'Play the audio first.'}</span>
    </div>
    ${feedback}
    ${watching ? '' : `<div class="teacher-tools"><span>${locked ? '' : 'Missing word(s) only.'}</span>${button('CHECK ANSWER','check-listening','success').replace('class="btn', `${state.played && !locked ? '' : 'disabled '}class="btn`)}</div>`}
  </aside>`;
}

const PUNISH_LABELS = { freeze: '❄ FREEZE', back: '⏪ GO BACK', boost: '🚀 BOOST' };
const quizCard = (stop, game, player, retry) => readingCard(stop, game, player, retry);

function readingCard(stop, game, player, retry) {
  const isQuiz = stop.lane === 'Quiz';
  const photoQuiz = isQuiz && Boolean(stop.image);
  const state = game.quiz ?? {};
  const { online, owner } = role(game);
  const locked = state.status === 'correct' || state.status === 'incorrect' || (online && !owner);
  const selected = game.selectedAnswer;
  const optionClass = i => {
    if (selected !== i) return '';
    if (state.status === 'correct') return 'selected correct';
    if (state.status === 'incorrect') return 'selected wrong';
    return 'selected';
  };
  const feedback = state.message && state.status !== 'correct' && state.status !== 'incorrect' ? `<p class="reading-feedback ${state.status}" role="status">${escapeHtml(state.message)}</p>` : '';
  const victim = game.players[OTHER[game.activePlayer || 'student']];
  const available = isQuiz && state.choosing ? punishOptions(game) : [];
  const spent = rewardsUsed(game, game.activePlayer || 'student');
  const REWARD_ICON = { freeze: '\u2744', back: '\u23EA', boost: '\u{1F680}' };
  const punishBtn = (kind, label) => `<button type="button" class="reward-tile ${spent.includes(kind) ? 'spent' : ''}" data-action="quiz-punish" data-points="${kind}" ${available.includes(kind) ? '' : 'disabled'}><i>${REWARD_ICON[kind]}</i><b>${label}</b>${spent.includes(kind) ? '<small>USED</small>' : ''}</button>`;
  const chosenLabel = PUNISH_LABELS[state.chosen];
  const footer = isQuiz && state.chosen
    ? `<p class="judge-note quiz-verdict"><b>${chosenLabel}</b></p>`
    : isQuiz && state.choosing
    ? (online && !owner
      ? `<p class="judge-note">${escapeHtml(player.name)} is choosing…</p>`
      : `<p class="reward-title">CHOOSE YOUR REWARD</p>
    <div class="quiz-punish">${punishBtn('freeze', 'FREEZE')}${punishBtn('back', 'GO BACK')}${punishBtn('boost', 'BOOST')}</div>`)
    : online && !owner
      ? (state.status === 'correct' || state.status === 'incorrect' ? '' : `<p class="judge-note">${escapeHtml(player.name)} is answering…</p>`)
      : `<div class="teacher-tools">${button('CHECK ANSWER','check-reading','success').replace('class="btn', `${locked || selected === null ? 'disabled ' : ''}class="btn`)}</div>`;
  const quizContent = `<div class="quiz-photo-content">
    <div class="quiz-question-content">
      <p class="prompt">${escapeHtml(stop.prompt)}</p>
      <div class="options" role="group" aria-label="Answer options">${stop.options.map((o, i) => `<button type="button" class="option ${optionClass(i)}" data-answer="${i}" ${locked ? 'disabled' : ''}><b>${String.fromCharCode(65 + i)}</b>${escapeHtml(o)}</button>`).join('')}</div>
      ${feedback}
    </div>
    <img class="quiz-photo" src="${escapeHtml(stop.image)}" alt="" loading="lazy" onerror="this.remove()">
  </div>
  <div class="quiz-photo-actions">${footer}</div>`;
  return `<aside class="challenge-card long-question reading-question ${isQuiz ? 'quiz-mcq ' : ''}${photoQuiz ? 'quiz-photo-card ' : ''}${state.status ?? ''}">
    ${header(stop, game, player, retry)}
    ${isQuiz ? '' : `<p class="reading-passage">${escapeHtml(stop.passage)}</p>`}
    ${photoQuiz ? quizContent : `
    <p class="prompt">${escapeHtml(stop.prompt)}</p>
    <div class="options" role="group" aria-label="Answer options">${stop.options.map((o, i) => `<button type="button" class="option ${optionClass(i)}" data-answer="${i}" ${locked ? 'disabled' : ''}><b>${String.fromCharCode(65 + i)}</b>${escapeHtml(o)}</button>`).join('')}</div>
    ${feedback}
    ${footer}`}
  </aside>`;
}

function speakingCard(stop, game, player, retry) {
  const judge = game.players[OTHER[game.activePlayer || 'student']];
  const { online, owner } = role(game);
  const note = !online ? `${player.name} speaks. ${judge.name} judges.`
    : owner ? `You speak. ${judge.name} scores your answer${game.verdict ? '.' : '…'}`
      : `${player.name} is answering…`;
  return `<aside class="challenge-card speaking-question verdict-${(game.verdict ?? '').toLowerCase()}">
    ${header(stop, game, player, retry)}
    <p class="prompt">${escapeHtml(stop.prompt)}</p>
    <p class="judge-note">${escapeHtml(note)}</p>
    ${judgeButtons(game, Boolean(game.verdict) || (online && owner), ['GOOD', 'FAIR', 'RETRY'], game.verdict)}
    ${verdictLine(game, online && owner ? judge.name : null)}
  </aside>`;
}

function writingCard(stop, game, player, retry) {
  const state = game.writing ?? {};
  const judge = game.players[OTHER[game.activePlayer || 'student']];
  const { online, owner } = role(game);
  const value = state.value ?? '';
  const { words, ok } = checkWritingLength(stop, value);
  const submitted = Boolean(state.submitted);
  const typing = online ? owner && !submitted && !game.verdict : !game.verdict;
  const note = !online ? `${judge.name} judges.`
    : owner ? (submitted ? `${judge.name} is scoring your writing${game.verdict ? '.' : '…'}` : `Write your answer, then send it to ${judge.name}.`)
      : (submitted ? `Score ${player.name}'s writing.` : `${player.name} is writing…`);
  const submit = online && owner && !submitted
    ? `<div class="teacher-tools">${button(`SEND TO ${judge.name.toUpperCase()}`, 'submit-writing', 'primary').replace('class="btn', `${value.trim() ? '' : 'disabled '}class="btn`)}</div>`
    : '';
  const scoring = !online ? judgeButtons(game, Boolean(game.verdict), writingVerdicts(stop, value), game.verdict)
    : owner ? judgeButtons(game, true, [], game.verdict)
      : judgeButtons(game, !submitted || Boolean(game.verdict), writingVerdicts(stop, value), game.verdict);
  return `<aside class="challenge-card long-question writing-question verdict-${(game.verdict ?? '').toLowerCase()}">
    ${header(stop, game, player, retry)}
    <p class="prompt">${escapeHtml(stop.prompt)}</p>
    <p class="writing-rules"><b>${escapeHtml(stop.requirement)}</b> · ${escapeHtml(stop.control)}</p>
    <textarea id="writing-text" class="writing-text" aria-label="Your writing" placeholder="${typing ? 'Write here…' : ''}" ${typing ? '' : 'disabled'}>${escapeHtml(value)}</textarea>
    <div class="writing-meta"><span id="writing-count" class="${ok ? 'ok' : ''}">${words} words · ${stop.minWords}–${stop.maxWords}</span></div>
    <p class="judge-note">${escapeHtml(note)}</p>
    ${submit}
    ${scoring}
    ${verdictLine(game, online && owner ? judge.name : null)}
  </aside>`;
}

export function Challenge(game) {
  const currentPlayer = game.activePlayer || 'student';
  const player = game.players[currentPlayer];
  const retry = Boolean(game.retry?.[currentPlayer]);
  if (game.playerPreview) {
    return `<aside class="challenge-card player-preview"><div class="player-preview-identity"><span aria-hidden="true">${avatarHtml(player.avatar)}</span><strong>${escapeHtml(player.name.toUpperCase())}</strong></div>${game.notice ? `<p class="player-preview-notice">${escapeHtml(game.notice)}</p>` : ''}</aside>`;
  }
  const stop = currentChallenge(game);
  if (!stop) return '';
  if (stop.listening) return listeningCard(stop, game, player, retry);
  if (stop.lane === 'Quiz') return quizCard(stop, game, player, retry);
  if (stop.lane === 'Reading') return readingCard(stop, game, player, retry);
  if (stop.lane === 'Speaking') return speakingCard(stop, game, player, retry);
  return writingCard(stop, game, player, retry);
}
