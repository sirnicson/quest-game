import { button } from '../../components/view.js';
import { forestAtmosphere } from '../../components/ForestAtmosphere.js';

export function Proclamation(soundEnabled){
  return `<section class="proclamation screen">${forestAtmosphere()}
    <div class="proclamation-card">
      <div class="eyebrow">THE QUEEN'S PROCLAMATION</div>
      <h2>Welcome, <em>traveller.</em></h2>
      <p class="lead">The Queen has commissioned an odyssey to the end of the known world.</p>
      <p>Your road will take you through villages and cities, forests and deserts, mountains and rivers. You will cross cliffs, encounter wild places and travel beyond the ocean.</p>
      <p>And along the way, you will acquire the skills that will help you succeed on the journey.</p>
      ${button('FOLLOW THE ROAD','next')}
    </div>
    <button type="button" class="sound-toggle" data-action="toggle-sound" aria-pressed="${soundEnabled}" aria-label="Sound ${soundEnabled ? 'on' : 'off'}"><span aria-hidden="true">${soundEnabled ? '🔊' : '🔇'}</span> SOUND ${soundEnabled ? 'ON' : 'OFF'}</button>
  </section>`;
}
