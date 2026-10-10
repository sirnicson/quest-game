# QUEST assets

Assets are grouped by product area.

- `opening/` — opening expedition atmosphere and artwork.
- `audio/` — locally bundled audio fallback.
- `episodes/episode01/` — Episode 01 geographic map assets.
- `episodes/episode01/audio/` — Listening clips (`LS01`–`LS10`), generated locally with MeloTTS from the transcripts in `src/data/episodes/listeningBank.js`. The four accents (British, American, Australian, Indian) are synthetic voices, not recordings. Regenerate with `MELOTTS_HOME=<melotts folder> node scripts/generate-listening-audio.mjs [LS03 ...] [--force]`.

Episode-specific assets should remain inside their episode folder so later episodes can be developed independently.
