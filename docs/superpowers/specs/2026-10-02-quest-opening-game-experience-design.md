# QUEST Opening & Game Experience Design

## Product
QUEST MEANS BUSINESS — An IELTS Skills Adventure
Season 1: The Unknown Road

## Goal
Create a teacher-controlled, shared-screen adventure game in which a teacher and learner travel together/race along a 15-stop illustrated route while IELTS skill challenges are embedded into an unfolding expedition narrative.

## Experience principle
QUEST should feel like an adventure first and an IELTS learning system second. IELTS skills are the mechanism through which the player advances through the world.

## Session flow
1. QUEST splash/loading
2. Queen's Proclamation
3. Mission/rules
4. Expedition setup
5. Episode intro
6. Live map
7. Challenge
8. Result/feedback
9. Movement
10. Return to map and repeat
11. Finish or time expiry
12. Quest report

## Play model
- Shared screen.
- Teacher controls the game.
- Teacher and student each have an avatar.
- Both can move, overtake, and finish independently.
- Setup occurs before the 50-minute active timer.

## Opening narrative
The Queen commissions an odyssey beyond the known world. The traveller will cross villages, cities, forests, deserts, mountains, rivers, cliffs and ocean, encountering unexpected places and challenges. Each challenge provides skills needed for the journey: reading carefully, listening closely, speaking confidently, writing with purpose, and thinking quickly.

Mistakes are part of the journey. Failed challenges may return through the Rematch Deck so the player can remember, retry and recover.

## Visual direction
Clean modern SVG/vector illustration. The world is a winding adventure path rather than a conventional board. Natural features include forests, mountains, rivers, waterfalls, cliffs, bridges, lakes, coastline, cabins/campsites, city areas, lighthouse and travel/aviation cues. Avoid photorealism, painterly textures, 3D rendering and cluttered board-game ornamentation.

## Core screens
### Splash/loading
Full-screen QUEST MEANS BUSINESS identity, subtitle, restrained loading animation, then Enter the Quest.

### Queen's Proclamation
Cinematic narrative sequence with world reveal. Text appears in short readable beats rather than a dense paragraph. Ends with BEGIN JOURNEY.

### Expedition setup
Teacher selects/assigns two avatars, sees episode title and session duration, then starts the quest.

### Live map
Full map with route, 15 stops, two avatars, 50-minute timer and minimal teacher controls. Active/completed stops have distinct states.

### Challenge
Map remains visually present but dimmed behind a challenge card. Challenge type, prompt, response controls and submit action are presented without losing the journey context.

### Result
Immediate motivating feedback, movement value, and optional explanation. Correct/incorrect/rematch state is visible.

### Movement
Avatar animates along the route after movement is awarded. Map returns to active state after movement.

### Rematch
Failed challenges enter a Rematch Deck. Later a rematch can be triggered; successful recovery awards +1 movement.

### End state
If a player reaches FINISH, that player becomes QUEST Finisher while the other may continue. If the 50-minute timer expires, avatars freeze and the result records progress rather than framing timeout as failure.

### Quest report
Show distance/progress, stops attempted, correct/incorrect, rematches, overtakes, bonuses, elapsed time and completion reason. Later analytics can extend this into skill-level reporting.

## Game rules
- Correct +1
- Strong/Challenge +2
- Incorrect -1
- Serious miss -2
- Successful Rematch +1 recovery
- Bonus +2/+3
- 15 mixed stops: 3 Reading, 3 Writing, 3 Listening, 3 Speaking, 3 Quiz
- 50-minute active game timer

## Episode 1 challenge order
1 Quiz — Quick Win MCQ
2 Speaking — Part 1
3 Reading — MCQ
4 Listening — note completion
5 Writing — Task 1 micro-response
6 Quiz — Brain Boost
7 Reading — True/False/Not Given
8 Speaking — Part 2
9 Listening — sentence completion
10 Writing — Task 2 introduction
11 Quiz — Big Brain
12 Reading — sentence completion
13 Listening — MCQ/short answer
14 Speaking — Part 3
15 Writing — Task 2 development

## Architecture principles
- Separate game engine from challenge content.
- Treat each stop as a standard Challenge Object.
- Keep route/map data independent from challenge content.
- Make teacher control explicit and centralized.
- Build Episode 1 as a complete playable vertical slice before Episodes 2–5.
