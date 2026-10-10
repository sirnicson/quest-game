import { readFile } from 'node:fs/promises';
for (const file of ['index.html','src/main.js','src/styles.css','src/game/state.js','src/data/episode1.js','src/data/episodeRoutes.js']) await readFile(file,'utf8');
console.log('QUEST build check passed');
