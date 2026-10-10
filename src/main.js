import { createApp } from './App.js';
import { armAutoplay } from './core/audio.js';

const root = document.querySelector('#root');

if (!root) {
  throw new Error('QUEST application root #root was not found.');
}

createApp(root);
armAutoplay();

// Warm the browser cache so the forest and mountain loops are ready before their screens open.
['./assets/opening/forest-live.mp4', './assets/opening/alpine-home.mp4', './assets/opening/forest-live.png', './assets/opening/alpine-home.png', './assets/audio/soundtrack-intro.wav', './assets/audio/soundtrack-journey.wav']
  .forEach(url => fetch(url).catch(() => {}));
