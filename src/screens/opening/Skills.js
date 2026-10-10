import { button } from '../../components/view.js';
import { forestAtmosphere } from '../../components/ForestAtmosphere.js';

export function Skills(soundEnabled=true){
  const skills=[['01','READ','📖'],['02','LISTEN','🎧'],['03','SPEAK','🗣️'],['04','WRITE','✍️'],['05','QUIZ','🧠']];
  return `<section class="mission screen">${forestAtmosphere()}
    <div class="mission-content">
      <div class="eyebrow">SKILLS FOR THE ROAD</div>
      <div class="skill-grid">${skills.map(([n,title,icon])=>`<article><span class="skill-no">${n}</span><div class="skill-icon">${icon}</div><b>${title}</b></article>`).join('')}</div>
      ${button('ACCEPT THE QUEST','next')}
    </div>
    <button type="button" class="sound-toggle" data-action="toggle-sound" aria-pressed="${soundEnabled}" aria-label="Sound ${soundEnabled ? 'on' : 'off'}"><span aria-hidden="true">${soundEnabled ? '🔊' : '🔇'}</span> SOUND ${soundEnabled ? 'ON' : 'OFF'}</button>
  </section>`;
}
