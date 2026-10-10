# QUEST Opening & Game Experience Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a teacher-controlled shared-screen Episode 1 vertical slice of QUEST, from cinematic opening through the live 15-stop race and final result.

**Architecture:** Use React + Vite with a data-driven game engine. Keep narrative screens, map rendering, challenge content, player/session state, movement rules, timer, rematch deck and reporting as separate modules with explicit interfaces. Use SVG for the adventure map and CSS/React state for screen transitions and animation.

**Tech Stack:** React, TypeScript, Vite, SVG, CSS, Vitest/React Testing Library, browser-based local state for the first playable build.

**Spec:** `docs/superpowers/specs/2026-10-02-quest-opening-game-experience-design.md`

## Global Constraints

- Shared screen; teacher controls the game.
- Episode 1 has exactly 15 mixed stops: 3 Reading, 3 Writing, 3 Listening, 3 Speaking, 3 Quiz.
- Active game timer is 50 minutes; setup happens before the timer starts.
- Correct +1; Strong/Challenge +2; Incorrect -1; Serious miss -2; Successful Rematch +1; Bonus +2/+3.
- Failed challenges may enter the Rematch Deck.
- Timeout freezes both avatars and records progress rather than framing timeout as personal failure.
- Visual direction is clean modern SVG/vector illustration, not photorealistic, painterly, 3D or cluttered board-game art.
- Episode 1 content follows the supplied challenge blueprint.

## Review Focus

- Browser refresh during a live session must not silently corrupt the game state; keep first version session-local and fail safely.
- Timer reaching exactly zero during an answer must resolve deterministically to timeout or a completed response, never both.
- A player cannot move twice from one submitted challenge.
- A finished player cannot be moved by later challenges while the other player continues.
- Rematch success must recover exactly +1 and must not duplicate the original failure record.

---

### Task 1: Create the Vite/React application shell

**Files:**
- Create: `package.json`
- Create: `vite.config.ts`
- Create: `tsconfig.json`
- Create: `index.html`
- Create: `src/main.tsx`
- Create: `src/App.tsx`
- Create: `src/styles/global.css`
- Test: `src/App.test.tsx`

**Interfaces:**
- Produces `App` as the root screen router and a testable application shell.

- [ ] **Step 1: Write the failing smoke test** asserting the application renders QUEST MEANS BUSINESS.
- [ ] **Step 2: Run the test and verify it fails because the app does not yet exist.**
- [ ] **Step 3: Scaffold Vite/React/TypeScript and implement the root shell.**
- [ ] **Step 4: Run the smoke test and verify it passes.**
- [ ] **Step 5: Run the production build and verify it completes without errors.**

### Task 2: Implement the opening narrative state machine

**Files:**
- Create: `src/game/types.ts`
- Create: `src/game/screenState.ts`
- Create: `src/screens/SplashScreen.tsx`
- Create: `src/screens/ProclamationScreen.tsx`
- Create: `src/screens/MissionScreen.tsx`
- Create: `src/screens/SetupScreen.tsx`
- Test: `src/game/screenState.test.ts`

**Interfaces:**
- `ScreenState = 'splash' | 'proclamation' | 'mission' | 'setup' | 'map' | 'challenge' | 'result' | 'report'`.
- `advanceOpening(state: ScreenState): ScreenState` advances only through the intended opening sequence.

- [ ] **Step 1: Write tests for the exact opening order: splash → proclamation → mission → setup → map.**
- [ ] **Step 2: Run the tests and verify failure.**
- [ ] **Step 3: Implement the state transition function and screen components.**
- [ ] **Step 4: Run tests and verify the opening sequence passes.**
- [ ] **Step 5: Verify the copy uses short cinematic beats and the agreed Queen/odyssey narrative.**

### Task 3: Build the Episode 1 adventure map

**Files:**
- Create: `src/data/episode1/route.ts`
- Create: `src/components/map/QuestMap.tsx`
- Create: `src/components/map/StopMarker.tsx`
- Create: `src/components/map/AvatarMarker.tsx`
- Create: `src/components/map/MapLegend.tsx`
- Create: `src/styles/map.css`
- Test: `src/components/map/QuestMap.test.tsx`

**Interfaces:**
- `RouteStop { position:number; stopId:string; lane:Lane; x:number; y:number }`.
- `QuestMap` consumes route stops, player positions and active/completed stop state.

- [ ] **Step 1: Write tests asserting exactly 15 stops, START and FINISH, and the required lane distribution/order.**
- [ ] **Step 2: Run tests and verify failure.**
- [ ] **Step 3: Port/adapt the supplied winding SVG composition into reusable React SVG components rather than retaining the prototype as one monolithic HTML file.**
- [ ] **Step 4: Add two avatar markers and visual states for current, completed and active stops.**
- [ ] **Step 5: Run component tests and verify map structure.**
- [ ] **Step 6: Run the production build and perform a browser visual check.**

### Task 4: Add player, route and session state

**Files:**
- Create: `src/game/playerState.ts`
- Create: `src/game/sessionState.ts`
- Create: `src/game/movement.ts`
- Test: `src/game/movement.test.ts`
- Test: `src/game/sessionState.test.ts`

**Interfaces:**
- `PlayerState { id; name; avatarId; position; stopsAttempted; correct; incorrect; rematches; overtakes; bonuses; finished }`.
- `SessionState { episodeId; elapsedSeconds; status; activeStopId; players; rematchDeck }`.
- `calculateMovement(result, difficulty): number`.
- `applyMovement(player, movement): PlayerState`.

- [ ] **Step 1: Write table-driven tests for +1, +2, -1, -2, rematch +1 and bonus +2/+3.**
- [ ] **Step 2: Run tests and verify failure.**
- [ ] **Step 3: Implement movement calculation and immutable player updates.**
- [ ] **Step 4: Test that one challenge submission can only produce one movement event.**
- [ ] **Step 5: Test that finished players cannot be moved.**
- [ ] **Step 6: Run all movement/session tests and verify they pass.**

### Task 5: Implement the 50-minute QUEST timer

**Files:**
- Create: `src/game/timer.ts`
- Create: `src/components/game/QuestTimer.tsx`
- Test: `src/game/timer.test.ts`
- Test: `src/components/game/QuestTimer.test.tsx`

**Interfaces:**
- `QUEST_DURATION_SECONDS = 3000`.
- `createTimerState(): TimerState`.
- `tickTimer(state): TimerState`.
- `isExpired(state): boolean`.

- [ ] **Step 1: Write tests for 3000-second duration, countdown, pause/setup behavior and exact-zero behavior.**
- [ ] **Step 2: Run tests and verify failure.**
- [ ] **Step 3: Implement timer state and display.**
- [ ] **Step 4: Test that expiry freezes gameplay and cannot become negative.**
- [ ] **Step 5: Run timer tests and verify they pass.**

### Task 6: Create the Challenge Object model and Episode 1 bank

**Files:**
- Create: `src/game/challenges.ts`
- Create: `src/data/episode1/challenges.ts`
- Test: `src/data/episode1/challenges.test.ts`

**Interfaces:**
- `Challenge { questionId; episodeId; stopId; lane; title; topic; difficulty; instructions; prompt; timeLimit; skillTags; answerType; gameValue; rematchEnabled; feedbackCorrect; feedbackIncorrect; explanation; source; notesTeacher; validation }`.
- Lane-specific extensions for Reading, Listening, Writing, Speaking and Quiz.

- [ ] **Step 1: Write tests asserting 15 unique challenge IDs and one challenge per route stop.**
- [ ] **Step 2: Assert the exact lane sequence from the supplied Episode 1 blueprint.**
- [ ] **Step 3: Implement the Challenge Object types and populate the supplied Episode 1 content ideas without inventing unsupported final answers where the source only marks an idea.**
- [ ] **Step 4: Run data validation tests and verify the bank is structurally valid.**

### Task 7: Build the challenge presentation and answer flow

**Files:**
- Create: `src/components/challenge/ChallengePanel.tsx`
- Create: `src/components/challenge/QuizChallenge.tsx`
- Create: `src/components/challenge/ReadingChallenge.tsx`
- Create: `src/components/challenge/ListeningChallenge.tsx`
- Create: `src/components/challenge/WritingChallenge.tsx`
- Create: `src/components/challenge/SpeakingChallenge.tsx`
- Create: `src/game/validation.ts`
- Test: `src/game/validation.test.ts`

**Interfaces:**
- `validateResponse(challenge, response): ValidationResult`.
- `ValidationResult { result; movement; feedback; rematchCreated; explanation }`.

- [ ] **Step 1: Write tests for Quiz/Reading automatic validation and word-limit checks.**
- [ ] **Step 2: Write tests for Writing/Speaking teacher-assessment submission as manual results rather than pretending they are automatically scoreable.**
- [ ] **Step 3: Implement lane-specific challenge panels.**
- [ ] **Step 4: Add teacher-only controls for marking writing/speaking Strong/Good/Developing/Rematch.**
- [ ] **Step 5: Run validation tests and verify results.**

### Task 8: Implement result feedback and avatar movement animation

**Files:**
- Create: `src/components/game/ResultOverlay.tsx`
- Create: `src/components/game/MovementAnimator.tsx`
- Create: `src/styles/feedback.css`
- Test: `src/components/game/ResultOverlay.test.tsx`

**Interfaces:**
- Result overlay consumes `ValidationResult` and player identity.
- Movement animator consumes previous and target route positions.

- [ ] **Step 1: Write tests asserting correct/incorrect/rematch states render distinct feedback and movement values.**
- [ ] **Step 2: Implement the feedback overlay using the approved teen/Gen-Z-friendly feedback style.**
- [ ] **Step 3: Implement smooth route movement for each avatar.**
- [ ] **Step 4: Verify movement is committed exactly once after the result.**
- [ ] **Step 5: Run component tests and visual browser check.**

### Task 9: Implement Rematch Deck

**Files:**
- Create: `src/game/rematchDeck.ts`
- Create: `src/components/game/RematchCard.tsx`
- Test: `src/game/rematchDeck.test.ts`

**Interfaces:**
- `addRematch(deck, challenge, playerId, failureReason): RematchDeck`.
- `drawRematch(deck): { challenge, entry, remainingDeck } | null`.
- `resolveRematch(entry, success): RematchEntry`.

- [ ] **Step 1: Write tests for adding failed challenges, drawing them later, successful recovery +1 and failed retry.**
- [ ] **Step 2: Implement the deck.**
- [ ] **Step 3: Verify the original failure and rematch are separately recorded.**
- [ ] **Step 4: Run tests and verify they pass.**

### Task 10: Build the teacher-controlled live game shell

**Files:**
- Create: `src/components/game/GameHUD.tsx`
- Create: `src/components/game/TeacherControls.tsx`
- Create: `src/screens/GameScreen.tsx`
- Modify: `src/App.tsx`
- Test: `src/screens/GameScreen.test.tsx`

**Interfaces:**
- `GameScreen` owns the live orchestration of map, timer, challenge, result and movement states.
- `TeacherControls` can start a stop, submit/resolve a challenge, trigger rematch and pause/end where permitted.

- [ ] **Step 1: Write tests for the complete state sequence: map → challenge → result → movement → map.**
- [ ] **Step 2: Implement the GameScreen orchestration.**
- [ ] **Step 3: Add persistent timer and two-player race HUD.**
- [ ] **Step 4: Ensure the student never needs direct controls for the first version.**
- [ ] **Step 5: Run game screen tests and verify the loop.**

### Task 11: Implement finish, timeout and report

**Files:**
- Create: `src/game/sessionEnd.ts`
- Create: `src/screens/QuestReportScreen.tsx`
- Test: `src/game/sessionEnd.test.ts`
- Test: `src/screens/QuestReportScreen.test.tsx`

**Interfaces:**
- `resolveSessionEnd(session): SessionResult`.
- `SessionResult { status; duration; playerResults }`.

- [ ] **Step 1: Write tests for one player reaching FINISH while the other continues.**
- [ ] **Step 2: Write tests for timer expiry freezing both players.**
- [ ] **Step 3: Implement session-end resolution and report screen.**
- [ ] **Step 4: Verify report includes position/progress, stops attempted, correct/incorrect, rematches, overtakes, bonuses and completion reason.**
- [ ] **Step 5: Run tests and verify they pass.**

### Task 12: Integrate, polish and verify the Episode 1 vertical slice

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/styles/global.css`
- Modify: relevant component styles
- Create: `tests/e2e/episode1-flow.test.ts`

- [ ] **Step 1: Write an end-to-end test for opening → setup → start → challenge → result → movement → finish/timeout.**
- [ ] **Step 2: Run the E2E test and verify any integration failures.**
- [ ] **Step 3: Fix integration issues without changing the locked product rules.**
- [ ] **Step 4: Run unit tests, component tests and production build.**
- [ ] **Step 5: Run browser visual verification at desktop shared-screen dimensions.**
- [ ] **Step 6: Verify keyboard accessibility for teacher controls and visible focus states.**
- [ ] **Step 7: Verify responsive fallback for smaller screens without compromising the shared-screen desktop composition.**
- [ ] **Step 8: Commit the complete Episode 1 vertical slice.**

## Completion Criteria

The first build is complete when a teacher can open QUEST, experience the Queen's introduction, configure the two avatars, start Episode 1, run through challenge stops, see automatic/manual validation, watch avatars move, accumulate rematches, continue the race, reach FINISH or hit the 50-minute timeout, and view a session report — all without requiring a backend or second device.
