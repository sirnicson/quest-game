import { button } from '../../../components/view.js';

export function Result(game){
  const correct=game.lastResult==='correct';
  const next=game.activeStop<=15?`STOP ${String(game.activeStop).padStart(2,'0')}`:'FINISH';
  return `<aside class="result-card">
    <div class="result-burst">${correct?'✦':'↺'}</div>
    <span class="eyebrow">${correct?'CHALLENGE COMPLETE':'REMATCH DECK'}</span>
    <h2>${correct?'Clock it! 😌🤏':'The road remembers.'}</h2>
    <p>${correct?'You nailed the challenge. The expedition moves forward.':'This challenge is saved for another pass. Recovery is part of the quest.'}</p>
    <div class="movement">${correct?'+1':'0'}<small>${correct?'MOVE':'HOLD'}</small></div>
    <div class="next-stop"><small>${correct?'NEXT':'CURRENT'}</small><strong>${next}</strong></div>
    ${button(correct?'RETURN TO THE ROAD':'TRY AGAIN LATER','map')}
  </aside>`;
}
