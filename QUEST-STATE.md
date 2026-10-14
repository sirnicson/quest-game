# QUEST - current project state

Updated: 2026-10-14. This document is the source of truth for current rules, implementation and outstanding work. Earlier state notes are preserved in docs/legacy/QUEST-STATE-before-integration-2026-10-14.md. Rollback copies remain at .rollback-QUEST3.3, .rollback-QUEST4.0, .rollback-QUEST5.0 and .rollback-QUEST6.0.

## Project and development

QUEST is a browser English learning adventure for two players. Episode 01 follows 15 locations from London to Istanbul. The project uses plain JavaScript ES modules and a Node server, with no runtime package dependencies.

- Main branch is named master. The development worktree is QUEST/listening-multi-gap, branch codex/listening-multi-gap.
- Start the server with npm run dev (on Windows, npm.cmd run dev), then open http://127.0.0.1:5173. Start it from the checkout whose code you intend to preview. PORT and HOST can override the defaults. A port-in-use error means another server already occupies that port.
- Verify with node --test tests/*.test.js and npm run build. Current integration checks: 99 tests pass. The build script checks required source files; it does not bundle the app or prove visual animation quality.
- Archive replaced assets and question files under legacy rather than deleting them.
- Continue review locally; a local merge does not deploy to Render. GitHub push is a separate action.

## Agreed Episode 01 rules

### Clock, route and points

- The timer is 50 minutes and continues counting during writing, listening, location videos, previews and movement. There is no pause capability.
- Scores determine route positions. Each city checkpoint is five route points apart. London is the starting location; Istanbul is location 15, reached at 70 route points.
- GOOD/correct earns up to 5; FAIR earns up to 2; RETRY earns 0. An award cannot carry a player past the next city checkpoint. For example, 2 followed by a 5-point answer becomes 5: only 3 points count on that second answer. Feedback must report the points actually applied.
- Partial awards place the avatar between cities. The code maps position as score / 5, so 2 points currently means 40% of a leg. Only cities have locator dots and names. An exact halfway placement for 2 points is not implemented.
- Players alternate turns. A player arriving at Istanbul waits their next turn to answer its final question; arrival alone does not finish the player.
- Passing the final question awards 5 more points. The first finisher receives another 5-point bonus: winner 80, runner-up 75.
- Retry scoring has no special 3-point cap: retries may earn 5, 2 or 0, subject to the normal next-checkpoint limit.
- Two consecutive failures trigger regression by one route segment, deducting up to 5 points, bounded at zero. A failed Quiz is followed by a skill retry; a further failure contributes to the setback sequence. No regression beyond London.

### Questions and Quiz rewards

- Each player has an independent seeded question schedule. Players may have different skills and Quiz questions at the same city.
- Initial decks contain 15 questions, three per skill: Reading, Listening, Speaking, Writing and Quiz. Additional non-Quiz questions support longer journeys caused by partial scores and setbacks.
- There are only three scheduled Quizzes per player. Quizzes are excluded at London and Istanbul; scheduled Quiz slots are independently randomized within slots 2-14 and are not adjacent. Selection also prevents a Quiz from being presented at the final city.
- Failing a Quiz consumes that opportunity. Its retry is a non-Quiz skill card, never another Quiz. The player earns no reward for the failed Quiz; any unused reward remains available for subsequent successful Quizzes. Revisiting a Quiz slot after a setback uses a skill replacement.
- FREEZE, GO BACK and BOOST are each available at most once per player. Used or ineffective choices are disabled. Fewer successful Quizzes mean fewer reward selections.
- FREEZE makes the opponent miss the next turn and changes no points.
- GO BACK regresses the opponent to the previous city checkpoint and deducts the points needed to return there. On a full city step that is 5 points; a partial leg can lose fewer. Scores and route positions remain aligned.
- BOOST when level or behind targets the opponent's score +5. It is bounded by the final route checkpoint and does not finish the final question. When already ahead, the agreed goal is one stop ahead from the current position; see the implementation gap below.

### Skill interactions

- Reading and Quiz use shuffled multiple-choice options, seeded so both online players see matching order. Answer colours communicate the outcome; global Correct/Wrong labels and the old Select an answer instruction have been removed.
- Quiz cards arrange question/options on the left and an image on the right when available. Controls form a separate left-aligned row beneath both columns; image is vertically centered beside the question area.
- Listening uses native inputs embedded in the sentence. Each blank accepts a word or phrase. All blanks must be correct for the 5-point award; individual blanks show their own colour. No partial credit.
- LS01: platform 3/three, time ten twenty/10.20. LS02: 3/three, waterproof. LS03: fifteen/15, foot, six/6. LS04: ten/10, dining room. LS05: Paris, south-east/south east/southeast, Switzerland. Recorded scripts remain the source for audio.
- Writing prompts target 20-30 words. Empty text enables no assessment; 1-9 words allow RETRY, 10-19 also allow FAIR, 20 or more also allow GOOD. The displayed upper range does not disable GOOD above 30.
- Speaking and Writing are judged by the other player online. Writing is submitted before the judge chooses the verdict. The answerer's controls show the selected assessment but cannot judge their own work.

## Map and presentation

- Player 1 has a deep orange dotted route (#e65100); Player 2 has a purple dotted route (#8000ff). Both wind between locator centers. Each route is drawn only to its own player's position and retracts with regression.
- Player 1's avatar stays west of their route; Player 2's stays east. At London only, avatars align horizontally with a 14-unit gap from the locator ring. Later positions follow the route geometry and its side offset.
- Avatar ring colour is independent of route colour: no coloured ring at the initial state, green for progression/Boost, red for retry/regression/punishment.
- Card sequence: location video pushes up and then down; player preview pushes up, switches to question/Quiz, answered card pushes down completely; transparent feedback appears; movement completes; scores update; feedback disappears; next preview displays for two seconds; next question appears.
- The feedback strip sits at bottom center and uses concise text, at most two lines. It does not overlap the departing question card or next preview.
- Punished-player presentation happens first: camera shows the affected avatar and its red annotation, its regression if applicable, then its score update. Awarded-player movement and camera follow happen afterward, then the next turn.
- Under-avatar text: GO BACK shows Player Y goes behind -Npts in red; FREEZE shows Player Y misses a turn 0pts in red; BOOST shows Player X goes ahead +5pts in green.
- Transparent reward feedback: Player X sends Player Y back; Player X freezes Player Y; Player X goes ahead of Player Y.
- Automatic setback feedback: Retry failed. Goes back 1 spot - Npts.
- Camera, avatar and route drawing share the movement animation. Page transitions use subtle fades; in-game cards use vertical entrances/exits. Animation smoothness still needs human browser review on the affected route segments.
- HUD progress follows route position and changes to 15/15 once the final question is completed. It is not an independently counted tally of all attempted questions.

## Finish and timeout

- First finisher: large black-and-white checkered winner banner, name/avatar, celebration sound and confetti. The other player then continues alone.
- Runner-up: quieter checkered banner, well done, no sound or confetti. Both completed players lead to the completion report.
- Completion: centered report box over the Hagia Sophia/Istanbul video, QUEST COMPLETE, The road remembers, agreed journey text, winner and runner-up, VIEW ROAD AHEAD and REPLAY EPISODE 01.
- Timeout before both complete currently displays TIME UP and QUEST FAILED. Text: The timer expired before both players got to the final stop. Scores are stacked vertically, highest first; ties put host first. No ahead/trailing labels. PLAY AGAIN is active; VIEW EPISODE 02 is disabled.
- Completion reports currently show points. The requested replacement with each player's recorded finish time is pending, including deciding whether to label elapsed time or time remaining. It is not yet implemented or stored.

## Location media

- London introduction is implemented using George Morina's Tower Bridge clip. Fact: Tower Bridge opened on 30 June 1894. It appears before the first player preview.
- Manchester introduction uses David Pickup's aerial cathedral clip (Pexels 28871888) when the city is first reached. Caption: Manchester Cathedral has over 800 years of history, dating back to 1215. Previous traffic footage is archived under assets/locations/legacy.
- The owner finalized Manchester Cathedral footage on 2026-10-14, replacing the previously discussed Town Hall option.
- The rejected Nottingham Station clip is archived at assets/locations/legacy/nottingham-station-rejected-for-manchester.mp4. It is not referenced by the game.
- Credits and source links are retained in assets/locations/SOURCES.md, without displaying them on the location card. The city introduction currently supports London and Manchester only; remaining cities await footage and facts.

## Episode previews

All previews use one yellow dashed route through city locators; player routes, scores and timer are not shown on an unstarted episode preview. Tabs list all five episodes:

1. THE WEST: EUROPE
2. THE ROAD TO THE EAST
3. ACROSS THE PACIFIC
4. THE AMERICAN CROSSING
5. THE SANDS OF AFRICA

Europe's briefing and preview use the shared route overlay on the Europe base map. Asia uses the supplied Asia base map with a Mercator projection and 15 numbered cities:

Istanbul -> Damascus -> Baghdad -> Tehran -> Kabul -> Islamabad -> New Delhi -> Kathmandu -> Dhaka -> Bangkok -> Hanoi -> Hong Kong -> Taipei -> Shanghai -> Beijing.

Episodes 03-05 show pending-map presentations until their final maps/routes are supplied. Their gameplay is not implemented.

## Multiplayer architecture and limitations

- HOST creates a room; guest joins through an invite link. SOLO supports two players on one device. Each online player chooses their own name/avatar and both ready before play.
- Server uses SSE for updates and POST for actions. Both clients run the same seeded reducer; game actions are relayed to the other player.
- Active player owns answer entry/reward selection; the waiting player judges Speaking and Writing. Listening blank answers and writing text are synchronized.
- Rooms are in memory with a six-hour TTL. Room membership persists in sessionStorage, but authoritative gameplay recovery after reload/disconnection is not implemented.
- Timers currently run independently per browser and may drift. Dropped events are not replayed; server-owned clock/state, reconnect/state recovery and judge nudges remain future work.

## Question-bank governance for the future refactor

Create src/data/questionbank/reading, listening, writing and speaking. Each skill has level1 through level5 collections (the proposed level1reading etc. naming can be applied during that refactor). Archive replaced files under legacy.

Each item needs a stable ID, skill/type, level and skill-specific answer/evaluation data. Internal tags support selection and balancing and must not appear in the UI. Both players must receive comparable difficulty and skill counts, with independently randomized order and deterministic seeds for online replay. Episode 01 uses mostly Level 1; subsequent episodes progress through the levels. Preserve three Quizzes per player. These new banks and five-level contents do not exist yet; only the central Quiz bank and current Listening/episode banks exist.

## Remaining review and implementation work

- Finish-time display and storage on the successful report, replacing score display as requested.
- Ahead-player BOOST currently adds the normal question award and then another five. That can move an already-ahead player two city steps on a full award; reconcile with the agreed one-step rule before treating that case as finalized.
- GO BACK from a partial leg returns to a checkpoint, whereas automatic failed retry subtracts five route points. Keep that distinction visible; the owner's later fixed -5 annotation does not describe every partial Quiz setback.
- Decide whether the 2-point position should remain proportional at 40% or be displayed at the exact midpoint.
- Confirm whether timeout after one player has already finished should remain QUEST FAILED; current code fails unless both are complete.
- Introductions for the remaining locations.
- Central five-level question banks, later episode content and final maps.
- Browser review of route/camera smoothness, movement order, complete two-player journey, small screens and media transitions after merging.
- Online recovery and clock synchronization as described above.
