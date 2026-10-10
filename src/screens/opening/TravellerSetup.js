import { button } from '../../components/view.js';
import { playerCard, otherSeatCard } from '../../components/PlayerCard.js';
import { forestAtmosphere } from '../../components/ForestAtmosphere.js';

// In a two-player room (game.net) each screen shows only its own editable seat plus a live read-only card for the other.
export const otherSeatMarkup = game => {
  const other = game.net.seat === 'student' ? 'guide' : 'student';
  return otherSeatCard(game, other, game.net.otherReady);
};

function playersMarkup(game) {
  if (!game.net?.seat) return `<div class="players">${playerCard(game,'student')}<div class="versus"><span>THE ROAD</span>VS</div>${playerCard(game,'guide')}</div>`;
  const mine = game.net.seat;
  const other = mine === 'student' ? 'guide' : 'student';
  const own = playerCard(game, mine, { taken: game.players[other].avatar, you: true });
  const theirs = `<div id="other-seat">${otherSeatMarkup(game)}</div>`;
  const versus = '<div class="versus"><span>THE ROAD</span>VS</div>';
  return `<div class="players">${mine === 'student' ? own + versus + theirs : theirs + versus + own}</div>`;
}

export function TravellerSetup(game, soundEnabled=true){
  return `<section class="setup screen">${forestAtmosphere()}
    <div class="setup-overlay"></div>
    <div class="setup-content">
      <div class="eyebrow">EXPEDITION SETUP</div>
      <h2>Choose Your Travellers</h2>
      ${playersMarkup(game)}
      ${button('START THE JOURNEY','next')}
    </div>
    <button type="button" class="sound-toggle" data-action="toggle-sound" aria-pressed="${soundEnabled}" aria-label="Sound ${soundEnabled ? 'on' : 'off'}"><span aria-hidden="true">${soundEnabled ? '🔊' : '🔇'}</span> SOUND ${soundEnabled ? 'ON' : 'OFF'}</button>
  </section>`;
}
