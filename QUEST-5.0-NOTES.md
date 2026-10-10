# QUEST 5.0 — Frozen fallback state

Snapshot date: 2026-10-10. This is the rollback point. A full copy of the code and assets is in `.rollback-QUEST5.0/`.
To roll back: copy the contents of `.rollback-QUEST5.0/` over the project root (`src`, `assets`, `scripts`, `tests`, `docs`, `index.html`, `package.json`).
Full detail of the build is in `QUEST-STATE.md`.

## What 5.0 adds over 4.0
- Online two-player multiplayer: host / guest lobby, invite link, shared room seed, synced gameplay. The question owner answers; the other player judges. Action relay in `scripts/rooms.mjs`.
- Quiz is multiple choice. 3 random Quiz stops per game (stops 2–14, never adjacent), the same for both players. A player sent back onto a Quiz stop gets a skill question instead.
- Three once-per-player Quiz rewards: FREEZE (skip a turn), GO BACK (−1 stop, −2 PTS), BOOST (jump ahead, up to 2 stops, +5 PTS lead). Spent rewards grey out.
- Fail the same stop twice: back one stop (not at London). A retry scores at most 3 PTS for all four skills.
- Speaking and Writing RETRY needs a judge reason (TOO SHORT / OFF TOPIC / UNCLEAR), kept on the question chip until replayed.
- First player to finish stop 15 gets +10.
- Route un-draws when the furthest player is sent back; setback animation.
- Listening accepts digit / number-word / unit variants (9 mins, nine minutes, 9minutes).
- Reading and Quiz options shuffled per game (seeded, same in both browsers).
- Central Quiz bank `src/data/quizBank.js` (30 general-knowledge questions). The old Europe quiz is archived in `src/data/legacy/europeQuizBank.js`.
- Splash button reads ENTER QUEST.
- 66 tests: `node --test tests/*.test.js`.

## Known limits
- The timer is per browser; no reconnect or resync; no judge timeout; invite link uses 127.0.0.1.
- Quiz answers are in the client bundle.
- Reading/Listening/Speaking/Writing banks are still Episode 01 only (an internal level structure was discussed but not built).

## Earlier fallbacks
- `.rollback-QUEST4.0/`, `.rollback-QUEST3.3/`
