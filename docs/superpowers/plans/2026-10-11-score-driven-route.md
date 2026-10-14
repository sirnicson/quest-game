# Score Driven Route Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tie avatar position to score and show two player-specific roads while keeping challenge selection independent of fractional route progress.

**Architecture:** Keep `players.*.position` as continuous score progress (`score / 5`, clamped to 14), and add independent per-player challenge indices. Map each five-point route step to one of the map's 14 physical legs. Generate two paths per segment that share city endpoints but use opposite lateral offsets, then interpolate map avatar positions along the selected player's path.

**Tech Stack:** Browser JavaScript modules, SVG map rendering, Node test runner.

**Spec:** `docs/superpowers/specs/score-driven-route.md`

## Global Constraints

- Score progress equals score divided by five, clamped to 0 through 14; each five-point checkpoint lands at a city center.
- Score progress equals score divided by five, clamped to 14; five points lands at the next city center.
- Standard awards stop at the next city and discard overflow; Quiz rewards keep score and route position aligned.
- Exactly three Quiz challenges per player; question selection uses challenge index, not route position.
- Existing city endpoints and all unrelated game presentation remain unchanged.
- Building the central skill banks and authoring Level 1–5 content remain deferred.
- Student route is deep red; guide route is deep blue. Roads stop at the avatar, use the earlier winding geometry, and rings stay uncolored before progress, turn green during progress, and red during retry or Go Back states.
- Retries keep the full 5, 2, or 0 point award; no retry cap applies.

## Review Focus

- Fractional movement across a city boundary retains the next question index: state/deck tests.
- Score reductions move the avatar backward using the same scale: reward state tests.
- Both player paths meet at every city and diverge between cities: geometry tests.
- Route reveal and movement animation use fractional player path distance: map tests.
- Finishing, timeout, and completed-player switching remain stable with continuous positions: game tests.

---

### Task 1: Score position and question progress state

**Files:**
- Modify: `src/core/gameState.js`
- Modify: `src/core/challengeSelect.js`
- Modify: `src/core/deck.js`
- Test: `tests/game.test.js`
- Test: `tests/deck.test.js`

**Interfaces:**
- Add `routeProgress(score)` returning a number from 0 to 14.
- Add per-player `challengeIndex` state, initialized/reset to 0 and advanced once per completed challenge.
- Keep 3 Quiz items per initial 15-question deck; challenge lookup uses `challengeIndex`.

- [x] Add failing tests for 2 points -> position 0.4, score reduction -> backward progress, and fractional movement not changing the selected challenge until challengeIndex changes.
- [x] Run the focused game and deck tests and confirm the expected failures.
- [x] Implement score-derived position updates for normal turns, boost, Go Back, automatic setbacks, and initialization/reset. Move all completion guards to score-derived route position while keeping turn completion indexed independently.
- [x] Run focused tests and confirm they pass.

### Task 2: Player-specific route geometry and interpolation

**Files:**
- Modify: `src/components/GameMap.js`
- Modify: `src/styles.css`
- Create or modify: `tests/gameMap.test.js`

**Interfaces:**
- Export `legPath(index, player)` for `student` red and `guide` yellow geometry with shared endpoints.
- Export a pure interpolation helper that maps a fractional route position to x/y along a sequence of generated route segments.

- [x] Add failing tests for distinct curves with identical endpoints and correct interpolation at 0, 0.4, and 1 segment progress.
- [x] Run the focused map tests and confirm the expected failures.
- [x] Draw/reveal each player's colored road and place avatars on their interpolated route position; retain fixed city markers and existing map framing.
- [x] Run focused tests and confirm they pass.

### Task 3: Update progression dependent UI and animation

**Files:**
- Modify: `src/App.js`
- Modify: `src/components/HUD.js`
- Modify: `src/screens/episodes/Episode01/Map.js`
- Modify: `src/screens/episodes/Episode01/Finish.js`
- Modify: relevant styles
- Test: `tests/game.test.js` and `tests/deck.test.js`

**Interfaces:**
- Movement animations accept fractional `from` and `to` positions.
- City callouts and active stop are derived from the next route endpoint while the avatar can be between cities.
- Display route progress without treating it as a challenge array index.

- [x] Add failing tests for finish and player-turn transitions at continuous progress values.
- [x] Run the focused tests and confirm the expected failures.
- [x] Update pin animation, HUD progress text, map callouts, retry handling, and finished checks to respect the separate challenge index and fractional route position.
- [x] Run focused tests and confirm they pass.

### Task 4: Full verification and review

**Files:** all scoped changes above.

- [x] Run `npm.cmd test` (83/83 passed).
- [x] Run `npm.cmd run build` (passed).
- [x] Review `git diff --check` and inspect the final diff for unintended edits.
