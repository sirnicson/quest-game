import { button, escapeHtml } from '../../components/view.js';
import { livingMountain } from '../../components/LivingMountain.js';

// lobby: { mode: 'choose' | 'creating' | 'waiting' | 'invite' | 'joining', link, copied, error }
export function lobbyControls(lobby) {
  const error = lobby.error ? `<p class="lobby-note error" role="alert">${escapeHtml(lobby.error)}</p>` : '';
  if (lobby.mode === 'invite') return `${button('ENTER QUEST','join-room')}${error}`;
  if (lobby.mode === 'joining') return `<button type="button" class="btn primary" disabled>JOINING…</button>`;
  if (lobby.mode === 'creating') return `<button type="button" class="btn primary" disabled>CREATING LINK…</button>`;
  if (lobby.mode === 'waiting') return `<div class="lobby-waiting">
      <div class="lobby-link"><input type="text" readonly value="${escapeHtml(lobby.link)}" aria-label="Invite link" data-select-all><button type="button" class="btn primary" data-action="copy-link">${lobby.copied ? 'COPIED ✓' : 'COPY LINK'}</button></div>
      <p class="lobby-note">Share this link with the other player.</p>
      <p class="lobby-wait" role="status">WAITING FOR OTHER PLAYER<span class="dots" aria-hidden="true"></span></p>
      <button type="button" class="lobby-cancel" data-action="cancel-room">CANCEL</button>
    </div>`;
  return `<div class="lobby-choice">${button('HOST','host-room')}${button('SOLO','next','ghost')}</div>${error}`;
}

export function Splash(soundEnabled=true, lobby={ mode:'choose' }){
  return `<section class="splash screen">${livingMountain()}
    <div class="hero-vignette"></div>
    <div class="hero-content">
      <div class="hero-brand">
        <div class="hero-wordmark">
          <img src="${new URL('../../../assets/favicon.svg',import.meta.url).href}" alt="">
          <h1>QUEST</h1>
        </div>
        <p class="hero-kicker">THE ROAD IS OPEN.</p>
      </div>
      <div class="lobby" id="lobby">${lobbyControls(lobby)}</div>
    </div>
    <button type="button" class="sound-toggle" data-action="toggle-sound" aria-pressed="${soundEnabled}" aria-label="Sound ${soundEnabled ? 'on' : 'off'}"><span aria-hidden="true">${soundEnabled ? '🔊' : '🔇'}</span> SOUND ${soundEnabled ? 'ON' : 'OFF'}</button>
  </section>`;
}
