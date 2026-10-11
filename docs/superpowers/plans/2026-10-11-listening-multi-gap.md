# Listening Multi-Gap Questions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Render Listening answers as inline prompt gaps, support multiple gaps for LS01–LS05, and preserve single-gap behavior for LS06–LS10.

**Architecture:** Store each prompt as ordered text segments paired with gap metadata (accepted answers and answer type). The Listening engine checks an ordered array of values and returns per-gap statuses plus an overall result. The card renders inputs in sentence order; App state and multiplayer actions carry the same ordered array.

**Tech Stack:** Vanilla JavaScript ES modules, HTML template strings, CSS, existing multiplayer action transport.

**Spec:** `docs/superpowers/specs/2026-10-11-listening-multi-gap-design.md`

## Global Constraints

- All gaps are required for the existing 5-point item score; no partial credit.
- LS06–LS10 retain their existing prompt content, accepted answers, audio, and word limits.
- Keep the current audio clips and MeloTTS generation pipeline unchanged.
- Changes are limited to Listening; do not modify Quiz, Speaking, Reading, Writing, general card layout, or global feedback.
- Do not add or run tests unless requested; use the spec acceptance criteria as the implementation checklist.

## Review Focus

- Missing input array entries must remain retryable and must not accidentally count as correct.
- Per-gap word limits must still allow multiword accepted answers such as “ten twenty” and “dining room.”
- A completed set with one wrong gap must finish as incorrect and award no points.
- Multiplayer messages must preserve the answer array ordering and values.
- Existing one-gap Listening challenges and audio play/unlock flow must continue to work.

---

### Task 1: Convert Listening items to ordered prompt segments and gap data

**Files:**
- Modify: `src/data/episodes/listeningBank.js`
- Modify: `src/core/listeningEngine.js`

**Interfaces:**
- Produce each item as `promptParts: string[]` and `gaps: { answerType: string, accepted: string[] }[]`.
- `promptParts.length` is always `gaps.length + 1`.
- Replace scalar validation with `checkListeningAnswer(item, values: string[])`, returning `{ status, gapStatuses, values, message }`. Gap statuses are `empty`, `over-limit`, `correct`, or `incorrect`; overall `status` is `empty`/`over-limit` if any entry needs retry, otherwise `correct` only when all gaps are correct and `incorrect` for any complete wrong set.
- Keep `listeningChallenge(id)` returning the complete item at `listening` and its prompt parts available to the Listening renderer.

- [x] Convert all ten items to `promptParts` and `gaps`, using a single gap for LS06–LS10 and preserving their existing prompt text and answers.
- [x] Set LS01–LS05 prompt parts and gap metadata to the approved wording and variants from the spec. LS03 has three gaps: fifteen, foot, six. LS04’s second answer is `dining room`.
- [x] Implement ordered per-gap normalization and word-limit checking; retain existing number, time, and unit normalization behavior.
- [x] Manually inspect the data entries against the spec and confirm each item has exactly one more prompt part than gaps.

### Task 2: Render inline gaps and per-gap feedback

**Files:**
- Modify: `src/screens/episodes/Episode01/Challenge.js`
- Modify: `src/styles.css`

**Interfaces:**
- The Listening card reads `state.values: string[]` and `state.gapStatuses: string[]`.
- Each input uses class `listening-answer`, a stable `data-listening-gap` index, and an accessible label identifying its gap. Existing audio element and `data-action="check-listening"` button remain.

- [x] Replace the escaped scalar prompt and standalone answer field in `listeningCard` with escaped text segments interleaved with indexed inline inputs.
- [x] Render each gap’s saved value and independent status class; disable inputs until audio is played and after the answer set is locked.
- [x] Style inputs as inline prompt fields with widths that fit answers while wrapping naturally on smaller screens; retain distinct correct and incorrect colors.
- [x] Inspect the prompt template for LS01, LS03, LS05, and LS06 gap counts, accessibility labels, and responsive inline-field styling.

### Task 3: Carry gap arrays through local and multiplayer answer handling

**Files:**
- Modify: `src/App.js`

**Interfaces:**
- `game.listening` stores `{ played: boolean, values: string[], gapStatuses: string[], status: string, message: string }`.
- `check-listening` multiplayer action `v` carries a JSON-serializable `string[]` in prompt order.

- [ ] Update `markListeningPlayed` to preserve all values from `[data-listening-gap]` inputs and focus the first gap after rerender.
- [ ] Update action broadcasting and remote action handling to collect and pass the ordered values array.
- [ ] Update `check-listening` to validate the full array, save per-gap state, focus the first retryable gap for empty/over-limit results, and finish the turn once for complete correct/incorrect results.
- [ ] Update Enter handling so Enter in any Listening gap checks the answer set.
- [ ] Manually walk through LS01 and LS05 locally: correct all gaps, submit one incorrect gap, and leave a gap empty; confirm score/turn behavior matches the spec.
- [ ] Manually walk through one online two-player Listening item and confirm both clients show matching per-gap values/status and finish the turn only after the active player’s response.

## Completion checklist

- Confirm every spec acceptance criterion is covered by the changed data, checker, UI, and action state.
- Review `git diff` to ensure only the five scoped Listening files changed, aside from this plan.
- Leave audio assets and all non-Listening challenge behavior untouched.
