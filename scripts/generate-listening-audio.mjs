// Generates (or regenerates) the Listening audio clips from src/data/episodes/listeningBank.js.
//
//   node scripts/generate-listening-audio.mjs                 # only missing clips
//   node scripts/generate-listening-audio.mjs --force         # every clip
//   node scripts/generate-listening-audio.mjs LS03 LS07 --force
//
// Set MELOTTS_HOME to a folder that contains python/, MeloTTS/, nltk_data/ and hf-cache/.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const home = process.env.MELOTTS_HOME;
if (!home) {
  console.error('Set MELOTTS_HOME to the local MeloTTS folder (python/, MeloTTS/, nltk_data/, hf-cache/).');
  process.exit(1);
}

const { listeningBank } = await import(pathToFileURL(path.join(root, 'src/data/episodes/listeningBank.js')).href);
const flags = process.argv.slice(2);
const ids = flags.filter(arg => !arg.startsWith('--'));
const jobs = listeningBank.map(({ id, audioText, accent, audio }) => ({ id, audioText, accent, audio }));

const jobFile = path.join(os.tmpdir(), 'quest-listening-jobs.json');
fs.writeFileSync(jobFile, JSON.stringify(jobs));

const result = spawnSync(path.join(home, 'python', 'python.exe'), [
  path.join(root, 'scripts', 'generate_listening_audio.py'), jobFile, '--out-root', root,
  ...(ids.length ? ['--only', ...ids] : []), ...(flags.includes('--force') ? ['--force'] : [])
], {
  stdio: 'inherit',
  env: {
    ...process.env,
    PYTHONPATH: path.join(home, 'MeloTTS'),
    NLTK_DATA: path.join(home, 'nltk_data'),
    HF_HOME: path.join(home, 'hf-cache'),
    HF_HUB_OFFLINE: '1'
  }
});
fs.rmSync(jobFile, { force: true });
process.exit(result.status ?? 1);
