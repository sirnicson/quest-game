# Listening Multi-Gap Questions Design

Date: 2026-10-11

## Goal

Update the Listening interaction so missing words or phrases are answered directly inside the sentence prompt. Support multiple independently answered gaps for LS01–LS05 while keeping the existing single-gap Listening items working. This is limited to Listening; other question types will be considered separately.

## User requirements

- LS01: “The train leaves from platform ____ at _____.” Answers: `3` or `three`; `ten twenty` or `10.20`.
- LS02: “Rain is expected after ____ o’clock. Travellers should carry __________ clothing.” Answers: `3` or `three`; `waterproof`.
- LS03: “The museum is about ____ minutes from the station on _______, but visitors can also take the number _____ bus from the main road.” Answers: `15` or `fifteen`; `foot`; `six` or `6`. The current audio transcript explicitly says “on foot.”
- LS04: “Breakfast is served from seven until ____ in the morning in the _______ beside reception.” Answers: `10` or `ten`; `dining room`.
- LS05: “The group will spend the first night in ____ and will continue ______ on Tuesday to ______________.” Answers: `Paris`; `south-east`, `south east`, or `southeast`; `Switzerland`.
- All gaps are required for the existing 5-point item score. No partial credit.
- Keep each submitted gap’s correct/incorrect color feedback. A complete submitted answer set continues through the existing correct/incorrect turn and scoring behavior; empty or over-limit entries remain retryable according to existing behavior.

## Proposed design

### Data model

Represent each item’s prompt as text and ordered gap segments. Each gap carries its accepted answer variants and answer type/word limit. This keeps answers adjacent to the sentence structure and supports existing one-gap items without requiring separate UI modes. The question order and accepted variants must be preserved exactly, with reasonable normalization for punctuation and spacing already supported by the Listening engine.

The existing audio transcript and clip path remain unchanged. LS01–LS05 transcript content already contains each requested answer. MeloTTS audio does not need regeneration for these prompt and answer changes.

### Card interaction

Render text and one input per gap in sentence order within the Listening prompt area. Inputs are inline with surrounding text and individually identify their gap for keyboard and assistive use. Retain the existing play-audio control and Check Answer action. Remove the standalone answer field. Existing LS06–LS10 continue to show one inline gap.

### Checking, feedback, and score

Validate every gap against that gap’s accepted answers and word limit. Show green or red feedback per submitted gap. The item is correct only when every required gap is correct; award the existing 5 points once for a fully correct item, with no partial points. Preserve retry behavior for empty and over-limit responses, and preserve the established turn behavior for a checked complete response.

### State and multiplayer

Represent a Listening submission as an ordered collection of gap values instead of one scalar string. Keep that shape consistent through local answer checking, turn state, and multiplayer action synchronization so both clients evaluate the same answers. Existing single-gap questions use a one-element collection.

### Scope boundaries

Only Listening question data, answer checking, Listening card rendering, and the associated answer-state/action handling are in scope. Do not alter Quiz, Speaking, Reading, Writing, general card layout, global feedback, or the audio generation pipeline.

## Acceptance criteria

1. LS01–LS05 display the supplied sentence with the specified number of inline gaps and accept the listed variants.
2. LS03 accepts `foot` in its second gap; LS04 accepts `dining room` in its second gap.
3. LS06–LS10 retain their current prompts, accepted answers, audio, limits, and one-gap behavior, now rendered inline.
4. Each gap receives its own correctness color after checking.
5. A response earns 5 points only if every required gap is correct; no partial credit is awarded.
6. Empty and over-limit entries follow the current retry behavior, and fully checked responses preserve the existing turn behavior.
7. Multiplayer synchronization carries the full ordered answer set and produces the same result on both clients.
8. No non-Listening question type or audio asset is changed.
