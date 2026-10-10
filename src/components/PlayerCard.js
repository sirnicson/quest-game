import { escapeHtml } from './view.js';

import { avatarFiles, avatarHtml } from '../data/avatars.js';

export function playerCard(game, key, { taken = null, you = false } = {}) {
  const player = game.players[key];
  const label = key === 'student' ? 'PLAYER 1' : 'PLAYER 2';
  return `<article class="player-card ${key === 'student' ? 'active' : ''}">
    <div class="player-card-top"><span class="player-index">${label}${you ? ' · YOU' : ''}</span></div>
    <div class="avatar big">${avatarHtml(player.avatar, 'avatar-img big-img')}</div>
    <label for="${key}-name">NAME</label>
    <input id="${key}-name" class="player-name" data-name-for="${key}" value="${escapeHtml(player.name)}" maxlength="24" aria-label="${label} name">
    <div class="avatar-label">CHOOSE AVATAR</div>
    <div class="avatar-grid">${avatarFiles.map(({ label: avatarLabel, src }) => `<button type="button" class="avatar-choice ${player.avatar === src ? 'selected' : ''} ${taken === src ? 'taken' : ''}" data-action="avatar" data-player="${key}" data-avatar="${escapeHtml(src)}" aria-label="Choose avatar ${escapeHtml(avatarLabel)}" title="${escapeHtml(avatarLabel)}" ${taken === src ? 'disabled' : ''}>${avatarHtml(src)}</button>`).join('')}</div>
  </article>`;
}

// Read-only card for the other player's seat in a two-player room.
export function otherSeatCard(game, key, ready = false) {
  const player = game.players[key];
  return `<article class="player-card other-seat">
    <div class="player-card-top"><span class="player-index">${key === 'student' ? 'PLAYER 1' : 'PLAYER 2'}</span></div>
    <div class="avatar big">${avatarHtml(player.avatar, 'avatar-img big-img')}</div>
    <label>NAME</label>
    <div class="other-name">${escapeHtml(player.name)}</div>
    <div class="other-status">${ready ? 'READY ✓' : 'CHOOSING…'}</div>
  </article>`;
}
