# Score Driven Route Design

## Goal

Make each player's route position a direct visual representation of score, with avatars able to stop between named cities, while both players follow separate, colored roads to Istanbul.

## Rules

- Score progress is `clamp(score / 5, 0, 14)`. London to Istanbul contains 14 physical legs, each ending at the exact center of the next city locator. Two points moves 40% of a leg; five points reaches the next city.
- A normal 5-, 2-, or 0-point award advances toward the next city. If the award crosses a city threshold, apply only the points needed to reach that city and discard the overflow. This requires players to check in at every city.
- Player 1 (`student`) follows a deep red route. Player 2 (`guide`) follows a deep blue route. Both routes share city endpoints and use the earlier winding road geometry, mirrored to either side between cities. Sea legs retain their water-side arcs.
- Each revealed route is clipped at the avatar's current fractional position. Routes begin at the city locator center; at city stops, avatars sit level on opposite sides with a 20-unit gap between their edges and the locator ring. Between cities, avatars follow their respective route offsets. The city focus ring is hidden while the active player is at the start.
- Avatar rings are independent of route colors: uncolored before progress, green during progress, and red while retrying or after a Go Back.
- The avatar is interpolated along that player's route. Progress and score therefore cannot disagree about which player is ahead.
- Challenge selection advances by a per-player question index, not by fractional route progress. Each player's 15-question initial deck has exactly 3 Quiz items, with the other 12 drawn from Reading, Speaking, Writing, and Listening. The deck then offers unused non-Quiz questions from that episode's banks before deterministic non-Quiz recycling; each player still receives exactly 3 Quiz challenges.
- Challenge scores, including retries, remain 5, 2, or 0 points. A score cannot move a player beyond the next city checkpoint. Quiz Go Back moves to the previous city checkpoint and updates the score to match; Quiz Boost moves to the checkpoint one city beyond the leading player's current leg; Freeze remains a turn skip with no movement.
- Episode completion remains at Istanbul after 14 route legs / 70 movement points, before any existing first-finisher bonus; first/second finish sequencing remains intact.

## Deferred work

- Authoring and organizing central Reading, Speaking, Writing, and Listening banks by Levels 1–5 is not part of this route change. Existing episode question data remains in use; no new level labels or questions are inferred here.

## Scope

Implement episode 1 only. Preserve existing question content, UI styling, timer, and non-route interactions. Add robust support to the state model and map renderer for fractional positions and per-player routes. Keep legacy question-card layouts and other episodes out of scope.

## Verification

Cover score-to-progress conversion, fixed question indexing at fractional positions, the three-Quiz quota, same-endpoint divergent routes, and path interpolation. Run the existing test suite and production build after implementation.
