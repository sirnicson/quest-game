# QUEST 4.0 — Frozen fallback state

Snapshot date: 2026-10-08. This is the rollback point. A full copy of the code and assets is in `.rollback-QUEST4.0/`.
To roll back: copy the contents of `.rollback-QUEST4.0/` over the project root (`src`, `assets`, `scripts`, `tests`, `index.html`, `package.json`).

## What 4.0 contains
- Episode 01, London → Istanbul, 15 stops, 50:00 session timer.
- Two players with independent 15-challenge decks from the 50-question bank (3 per skill, no repeats, no shared questions).
- Five question types: Quiz (reveal, then CORRECT / WRONG), Reading, Speaking (peer-judged GOOD / FAIR / RETRY), Writing (live GOOD / FAIR / RETRY by word count) and Listening (synthesised audio).
- Failed Reading, Speaking, Writing or Listening repeats the same question. A failed Quiz retries with a different unseen question that is in neither deck.
- Meandering route (boat-like over sea), cinematic camera and avatar movement, yellow / green / red avatar rings.
- 18 photo avatars. Local looping forest and alpine videos.
- Two original synthesised soundtracks (`scripts/build-soundtracks.mjs`): intro from page load, tension-building journey loop from PLAY EPISODE 01. The journey track pauses during Listening questions.
- Responsive question card that stays on screen without scrolling.
- 50 tests: `node --test tests/*.test.js`.

## Asset and copyright position
Per the project owner, all images used in this game are publicly sourced and treated as open source / public use. No rights concerns are open for 4.0.

## Earlier fallbacks
- `.rollback-QUEST3.3/`
- `V3.01-NOTES.md` (V3.01 and V3.02 notes)
