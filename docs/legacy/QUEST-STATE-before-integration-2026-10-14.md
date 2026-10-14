# QUEST — Source of Truth (state after the 4.0 freeze)

Last updated: 2026-10-08. Read this first. It supersedes `QUEST-4.0-NOTES.md` for "what exists now"; the 4.0 notes remain the rollback reference.

## 1. What QUEST is
Browser "English Test Adventure" for two players. Episode 01: London → Istanbul, 15 stops, 50:00 session timer. No dependencies; plain ES modules + a small Node server.

Run: `node scripts/dev.mjs` → http://127.0.0.1:5173/ (env `PORT`, `HOST`). Tests: `node --test tests/*.test.js` (currently **60 passing**; do not use `npm test`).

Standing rules from the owner:
- Never permanently delete assets; archive to a legacy folder.
- All images are publicly sourced / open for public use; copyright concerns are overridden.
- The user iterates one request at a time; verify in the browser and with tests, report concisely.

## 2. Rollback points
- `.rollback-QUEST4.0/` — frozen single-device game (restore by copying over the project root). Notes: `QUEST-4.0-NOTES.md`.
- `.rollback-QUEST3.3/`, `V3.01-NOTES.md` — older.
- `QUEST\QUEST` nested copy: untouched legacy, ignore.
Nothing multiplayer-related exists in the 4.0 rollback.

## 3. Game rules (unchanged by multiplayer work)
- Five skills: Read, Listen, Speak, Write, Quiz. Heading text is "SKILLS FOR THE ROAD".
- 50-question bank (`src/core/challengeBank.js`); each player gets an independent 15-question deck (3 per skill, disjoint). `buildDecks` accepts a seed (`src/core/deck.js`).
- Quiz = reveal question: reveal, then CORRECT / WRONG. A failed Quiz retries with a *different unseen* question from the 20 bank questions in neither deck (retry may be any skill). State: `override[player]`, `seenQuizzes` in `gameState.js`; `currentChallenge` honours `game.override`. Failed Reading/Speaking/Writing/Listening repeat the same question.
- Writing scoring by word count: 0 words none; 1–10 RETRY; 11..minimum RETRY+FAIR; ≥minimum RETRY+FAIR+GOOD. GOOD 5 pts, FAIR 2, RETRY 0.
- Pass → player advances to next stop; fail → stays (red ring) and waits for next turn. Position 15 = finished. *Open question: FAIR on Speaking/Writing currently advances; owner has not confirmed.*
- Rings: both yellow at London; green after a correct answer and stays green while progressing; red on any fail/retry.

## 4. Changes made since the 4.0 freeze (the multiplayer track)
Goal (owner's spec): HOST creates a room and shares a link; guest opens it; both browsers play one shared game. Online players each choose only their own avatar/name; judge/owner split for peer-judged skills.

### Phase 1 — lobby, link, join (DONE, tested)
- First page shows HOST / SOLO over the live mountain video. HOST creates a room, copies the invite link, shows "WAITING FOR OTHER PLAYER" (+ COPY LINK, CANCEL). Guest link `/?room=CODE` shows ENTER THE QUEST. Joining = the join event; both advance to the Proclamation. A third visitor sees "room full".
- `scripts/rooms.mjs`: in-memory room store (`createRoomStore`), HTTP handler (`createRoomHandler`). Seats: `student` = host = Player 1, `guide` = guest = Player 2. 4-char codes (no ambiguous letters), UUID tokens never exposed in snapshots, 6-hour TTL prune, max-rooms cap.
  - Routes: `POST /api/rooms`, `GET /api/rooms/:code`, `POST …/join`, `GET …/events?token=` (SSE), `POST …/profile`, `POST …/ready`. Route regex needs exactly 4 alphanumerics.
- `src/core/multiplayer.js`: client helpers (`roomCodeFromUrl`, `inviteLink`, `createRoom`, `joinRoom`, `roomStatus`, `connectRoom` via EventSource, `sendProfile`, `sendReady`, `copyText`, session in sessionStorage key `quest-room`).
- UI: `lobbyControls` in `src/screens/opening/Splash.js`; CSS appended at end of `src/styles.css`.
- `scripts/dev.mjs` calls `handleRooms` before static serving.
- Transport choice: SSE + POST (no WebSocket dependency; works through proxies/tunnels).

### Phase 2 — shared traveller setup + ready gate (DONE, browser-verified with two tabs)
- Snapshot carries `phase` (`lobby` → `opening` → `playing`), `seed`, and per seat `joined/name/avatar/ready`.
- Server: `setProfile` (avatar must match `/^\/assets\/…/`; `taken` if other seat has it; `locked` once ready/playing; name trimmed to 24), `setReady` (both ready → `phase='playing'`, `seed=crypto.randomInt`).
- Setup screen online (`TravellerSetup.js`, `PlayerCard.js`): only your own editable card ("· YOU"); the other seat is a read-only live card (`#other-seat`, "CHOOSING…"/"READY ✓"); avatars taken by the other player are disabled/greyed. Updates patch DOM in place (no re-render) so the name input keeps focus.
- Briefing (`Briefing.js` `playButton`): solo → `episode-start`; online → `episode-ready`, then disabled "WAITING FOR <NAME>…". When both ready, both clients call `startEpisode(seed)` → identical decks.
- `App.js` online state: `net = {seat, meReady, otherReady}`; `onRoomUpdate`, `shareProfile`, `startEpisode`, `restoreRoom` (does not re-share profile), actions `host-room`, `join-room`, `cancel-room`, `copy-link`, `episode-ready`. Name `change` handler syncs your name (render deferred with `setTimeout` to avoid a blur/re-render DOM error).
- Bugs fixed on the way: stale dev server returned 404 for the room API (restart after changing `rooms.mjs`); `post()` in `multiplayer.js` had a duplicate `body` declaration (renamed to `data`).

### Other changes since 4.0 (before the multiplayer work, already in 4.0 unless noted)
- HUD logo 24px; two synthesised soundtracks (`scripts/build-soundtracks.mjs` → `assets/audio/soundtrack-intro.wav`, `soundtrack-journey.wav`); `src/core/audio.js` WebAudio loops, `armAutoplay()` starts intro on page load, journey starts at PLAY EPISODE 01, journey pauses during Listening (`pauseGameplay`/`resumeGameplay`). `forest-ambience-fallback.wav` kept but unreferenced.


### Phase 3 — synced gameplay with owner/judge roles (DONE, browser-verified with two tabs)
Architecture: **action relay**, not server-owned state. Both browsers run the same reducer on the same room seed; each in-game action is sent via `POST /api/rooms/:code/act` and the server forwards it as an SSE `act` event to the *other* seat only (allow-list `GAME_ACTIONS` in `scripts/rooms.mjs`, `store.relay`). The sender applies locally, the receiver replays it via `dispatch(..., remote=true, extra)` in `App.js` (`onRemoteAct`, `SYNCED`, `JUDGE_ACTIONS`).
- Owner = the active player's seat; judge = the other seat. Owner-only actions: `start-challenge`, `select-answer`, `check-reading`, `check-listening` (value sent), `submit-writing` (text sent), plus the unrelayed-to-self `writing` typing mirror (150 ms debounce). Judge-only: `reveal-quiz`, `judge-quiz`, `judge`. Anything from the wrong seat is ignored locally.
- Speaking/Writing: owner's GOOD/FAIR/RETRY are always disabled (informational); judge's are active (Writing: only after the owner presses "SEND TO <JUDGE>", and only the verdicts allowed by word count). The chosen verdict is highlighted (`.btn.chosen`) and the owner sees "<Judge> scored you FAIR · +2 PTS".
- Quiz: judge (waiting player) sees the question, "<Owner> is answering…", REVEAL ANSWER, then the answer and CORRECT/WRONG; owner (active player) sees only the question and then the CORRECT/WRONG result. Answer is never rendered on the owner screen.
- Reading: owner has active options + CHECK ANSWER; judge sees the question/passage, disabled options mirroring the owner pick, "<Owner> is answering…" (no check button) and the CORRECT/WRONG feedback. Listening: owner has audio button, answer box and CHECK; judge sees only the question, "<Owner> is listening…" (no audio button, no input) and the feedback.
- Determinism: `start-episode` stores `game.seed`; quiz-retry pick uses `seededRandom` (mulberry32 on seed + progress) so both sides choose the same replacement question. Removed `Math.random` from that path when a seed exists.
- Role rendering: `Challenge.js` `role(game)` uses `game.net` (passed in by `screenMarkup` for challenge/result/report screens).
- Known gaps: each browser runs its own 50:00 timer (small drift possible); a reload mid-game loses state (no state resync/reconnect); a dropped SSE event is not replayed; no judge nudge/timeout. Move/cinematic animations run locally on both sides from the same state.
- Test notes: in Playwright, `context().pages()` order is [host, guest]; `find(p=>p!==page)` can return the wrong page. Added a relay test in `tests/rooms.test.js`.
## 5. NOT built yet (continue here)
(Phase 3 above is built with an action-relay design; the items below that remain are the gaps.) Original plan — server owns turn state and the 50:00 clock; each question has an *owner* (answering) and a *judge* (other player).
- Quiz: judge sees question + answer + reveal; owner answers verbally (assume voice on an external call at first); judge presses CORRECT/WRONG. Answer is withheld from the owner's client.
- Speaking: owner speaks; GOOD/FAIR/RETRY inactive for owner, active for judge; chosen verdict shows on owner's screen and points apply.
- Writing: owner types; text mirrors live to judge; verdict stays locked until owner presses SUBMIT; verdict returned to owner.
- Reading/Listening: owner answers and self-checks; judge just sees question + result.
Phase 4/5: judge nudge at ~60 s (no auto-score), reconnect/pause on disconnect, rejoin after reload (gameplay state currently lost on reload; only room membership survives), hosting for a real second player (invite link is `127.0.0.1` — needs a hosted server or tunnel, e.g. Cloudflare tunnel / Render / Fly.io), optional WebRTC voice.

### Question-bank architecture decision (apply during the future bank refactor)
- Create central skill banks under `src/data/questionbank/{reading,listening,writing,speaking}/`, each split into `level1` through `level5` collections. Archive replaced files under `legacy`; do not delete them.
- Every bank item carries internal metadata for stable question ID, skill/type, level, and the answer/evaluation data required by that skill. These tags are for selection and balancing only: do not display them on question cards, player previews, or other player-facing UI.
- Each player's question schedule is randomized independently, so the type and order of questions at a stop can differ between players. Keep randomness seeded/deterministic for multiplayer replay and synchronization.
- Randomize order while preserving equivalent difficulty and skill distribution for both players within an episode. Give both players comparable counts at each level and skill; do not give either player a systematically easier mix. Preserve the existing rule of exactly three Quiz questions per player unless the owner changes it.
- Do not expose upcoming question types or levels to players. Current episode limits and the one-question-bank-per-skill refactor remain separate from this gameplay-rule decision.

Other open items: movable question card request; small-viewport checks of Writing/Listening cards; full browser run to Istanbul and the report screen; confirm FAIR advances; owner must audition the soundtracks.

## 6. File map
- `src/App.js` — central controller: render, dispatch, lobby/room wiring (~175–290), `screenMarkup`, event listeners.
- `src/core/` — `gameState.js` (turn engine/reducer), `deck.js`, `challengeBank.js`, `challengeSelect.js`, `listeningEngine.js`, `audio.js`, `multiplayer.js`, `router.js`, `storage.js`.
- `src/components/` — `GameMap.js`, `HUD.js`, `PlayerCard.js`, `Navigation.js`, atmosphere components.
- `src/screens/opening/` — `Splash.js`, `Proclamation.js`, `Skills.js`, `TravellerSetup.js`; `src/screens/episodes/Episode01/` (`Briefing.js` etc.).
- `scripts/` — `dev.mjs`, `rooms.mjs`, `build-soundtracks.mjs`, `build-episode01-bank.mjs`, listening-audio generators.
- `tests/` — `architecture`, `deck`, `game`, `listening`, `rooms` (rooms: 5 tests incl. profile/ready).
- `src/data/episodes/episode01Challenges.js` — old placeholder, still imported.

## 7. Environment gotchas (Windows / PowerShell 5)
- Use `npm.cmd`; `Stop-Process -Id <n>` only; `Start-Process` has no `-Environment` (set `$env:PORT` first).
- Some files are CRLF → multi-line edit matches can fail; use single-line anchors.
- Write non-ASCII via `[IO.File]` with `UTF8Encoding($false)`.
- The architecture test asserts the literal string `fadeAmbient(1200).then(()=>startGameplay())` in `App.js` (kept inside `startEpisode`).
- Dev server must be restarted after editing `scripts/rooms.mjs`. A background server may already hold port 5173 (stop by PID).
- Playwright: use `page.evaluate(()=>el.click())` for animated buttons; second player = another tab via `context().newPage()` or a second `openBrowserPage` with `?room=CODE`.


### Role-view refinements (latest, user-approved spec)
Final per-skill views are implemented in Challenge.js (ole(game) -> online/owner/judge) and gated in App.js dispatch (JUDGE_ACTIONS = reveal-quiz, judge-quiz, judge). Speaking: judge sees active GOOD/FAIR/RETRY + <Owner> is answering…; owner's buttons inactive, only the chosen one highlighted. Writing: as above. Not yet re-verified in two live tabs after the last refinement (56 unit tests pass, module loads); next agent should run a two-tab pass for Quiz/Reading/Listening/Speaking from both seats.

### Game-rule additions ("spice") — latest
- **Central quiz bank (66 tests):** the Quiz lane now draws from `src/data/quizBank.js` (30 general-knowledge items QZ01–QZ30, 4 options each, correct answer first, shuffled per game by `shuffledChallenge`). It is separate from the episode banks, so any episode can pull from it (`bankIds.Quiz` in challengeBank.js). The old Europe quiz is archived in `src/data/legacy/europeQuizBank.js` (written by scripts/build-episode01-bank.mjs, which no longer emits a quizBank). Each game uses 6 of the 30 (3 per player).
- **Quiz is now multiple choice, auto-checked** (`quizBank` items have `options` + `correct` index; QZ04 = Istanbul, QZ07 = Rome). It reuses the Reading card (`readingCard` with `isQuiz`) and `select-answer`/`check-reading`. The old `reveal-quiz` / `judge-quiz` actions and the waiting-player quiz judging were removed.
- **Quiz punishment:** on a correct Quiz the owner picks FREEZE (victim skips next turn) / BACK 1 (victim one stop back) / STEAL (up to 5 PTS moves to owner). Options only enabled if they would have an effect (`punishOptions` in `gameState.js`). New synced action `quiz-punish` (owner-only; added to the `GAME_ACTIONS` allow-list in `scripts/rooms.mjs` — restart the dev server after changes). Waiting player sees "<Owner> is choosing how to punish <Victim>…".
- **Fail twice → one stop back:** `game.fails[player] = {stop,count}` in `completePlayerTurn`; two consecutive fails on the same stop (non-Quiz only; Quiz fails never count) move the player back one stop. Not applied at London (position 0).
- **Winner bonus:** first player to reach stop 15 gets +10 (`WINNER_BONUS`, `game.winner`).
- **Frozen:** `game.frozen[player]`; the frozen player's next turn is skipped, the other plays again.
- `game.notice` (text of what just happened) is shown on the between-turn player-preview card (`.player-preview-notice`) on both screens, and keeps the preview up for ~3.8 s.
- Verified: unit tests for all rules; live two-tab check of Quiz → punish → freeze. Back/steal/fail-drop/winner bonus are unit-tested but not yet exercised in a live two-tab run.

### Quiz revision (latest, 63 tests)
- **Quiz stops are random per game:** `buildDecks` (deck.js) now returns `{student, guide, quizStops}`. 3 Quiz stops, deck indices 1–13 (stops 2–14, never stop 1 or 15, never adjacent), the same for both players, picked from the room seed (`pickQuizStops`). All other stops hold Reading/Speaking/Writing/Listening (3 each, no same-skill back-to-back).
- **Sent back onto a Quiz stop** (fail-twice drop or BACK punishment) → the player gets a skill question there (`skillReplacement`, stored in `game.override`), never a Quiz, so no Quiz rewards on a replay.
- **Rewards after a correct Quiz** (3 types, no steal): reeze (victim skips a turn), ack (victim -1 stop and -2 PTS, BACK_PENALTY), oost (owner's score = max(own, opponent)+5, stop = max(own, opponent)+1, at most 2 beyond owner's new stop, cap stop 14; only offered if opponent is level/ahead in stop or score). **Each reward is once per player per game** (game.rewardsUsed = {student:[],guide:[]}); spent ones show greyed with 'used'. Rewards that would have no effect (back at London, freeze/back/boost vs a finished opponent, boost when ahead) are greyed but stay banked. A failed Quiz earns no reward. punishOptions(game) returns the usable ones. All applied immediately in completePlayerTurn.
- **Route on setback:** legs drawn = furthest current position of either player; when the furthest player is sent back, that leg un-draws (.undrawing, 2 s). game.reached only keeps the route visible. Animation elapsed is clamped >= 0 (a negative rAF delta once crashed the move animation).
- **Answer variety / shuffle (66 tests):** Listening compares canonical tokens (`canonicalTokens` in listeningEngine.js): digits = number words, min/mins/minute(s) and hr/hour(s) unify, "9mins" splits, and a unit word is optional and not counted against the word limit. Reading and Quiz options are shuffled per game by `shuffledChallenge` (challengeSelect.js, seeded by `game.optionSeed` + question id, so both browsers match and a replayed question keeps its order); `currentChallenge` returns the shuffled copy. The raw bank is unchanged (Reading was 8/10 option B).
- **Retry rules (64 tests):** a retry of a stop already failed once (`isCappedRetry`, derived from `game.fails`, not Quiz) caps points at `RETRY_CAP` = 3 for all four skills (FAIR 2 stays 2); a second fail drops one stop (not at London), and the counter, retry chip and reason reset at the new stop. Speaking/Writing: the judge's RETRY first opens a reason picker (TOO SHORT / OFF TOPIC / UNCLEAR, local `game.reasonPick`, ← cancels via `judge-back`); the reason is sent as `judge` with `RETRY:<CODE>` (synced), saved in `game.retryReason[player]` and shown on the question chip ("RETRY · TOO SHORT · MAX 3 PTS") until the player replays it. Reading/Listening show "RETRY · MAX 3 PTS" with no reason.
- **Setback animation:** `game.backAnim {player,from,to}`; `runBackAnimation` in App.js walks the pin back along its last leg (2 s). `game.reached` keeps the route drawn after someone moves back.
- **Views:** Quiz waiting player sees only the question, disabled options with the owner's pick, and, after the owner chooses, "X chose: <reward>" (also shown to the owner). No reveal / Correct-Wrong buttons.
## QUEST 5.0 frozen (2026-10-10)
Rollback copy in .rollback-QUEST5.0/ (notes: QUEST-5.0-NOTES.md). 66 tests pass at freeze.

## Quiz pictures
- 11 of 30 quiz questions (QZ02, 06, 07, 12, 14, 18, 20, 22, 25, 27, 29) show a Wikimedia Commons photo banner above the question (image field in src/data/quizBank.js, PICTURES set). Credits: assets/quiz/CREDITS.md. Rejected/poor fits archived in assets/quiz/_rejected/. Other questions render as before.

## QUEST 6.0 frozen
- Snapshot in .rollback-QUEST6.0/ (see QUEST-6.0-NOTES.md).
