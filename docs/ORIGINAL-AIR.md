# Original Mega Drive aerial-ball evidence

Inspected 2026-10-15 using the local Mega Drive ROM and headless Genesis Plus GX. This document distinguishes observations from a first-hand player's guide and from design decisions still requiring verification.

## Directly observed in the local ROM

- A pass opens a schematic overhead pitch headed `Where? Move cursor by +button`. The directional pad moves a destination cursor through space. A target can be an empty location, a teammate, or an opponent; aiming at an opponent can show that player's name and `OPPONENT`. There are no visible hexes or explicit selectable tiles.
- Normal attacking menu controls are Left+C for Pass, Right+C for Shoot, Up+C for Dribble, Down+C for One Two. Direction must be held while confirming. Robert's submenus include Shot/Drive shot and One Two/Golden Combo.
- A dribble encounter lists surrounding opponents. Dribble is selected separately for each listed opponent. Pass or Shoot ends that sequence instead of requiring a dribble against every opponent.
- Flight can be interrupted before the eventual destination: a pass toward empty space in the opposing penalty area produced the airborne commentary `Chris tries to cut in front! The ball is slowing down.` Another attempted pass was intercepted by Bruce.
- A shot/rebound sequence said `No one can catches up to the ball!`, then `Oscar sweeps the ball!`, then returned to open play with Kevin in possession. This supports reach/order to the ball as part of resolution, but does not establish a numerical radius or timing formula.
- ROM labels include separate Trap, Through, Clear, Compete and Passcut stats, and Heading shot/Volley shot names. The coach explicitly recommends tackle against an expected dribble, passcut against an expected pass, and block against an expected shot. Thus anticipation is part of the original rules, rather than every defensive option being interchangeable.

Representative captures in `analysis/screenshots/` are `airresearch_goal_target.png`, `airresearch_kevin_cross_target.png`, `airresearch_kevin_cross480.png`, `airresearch_keeper180.png`, `airresearch_keeper360.png`, and `airresearch_kevin_to_david500.png`. Matching savestates are in `analysis/states/`.

## Corroborating first-hand Genesis guide

[Shirow's Tecmo Cup Football Game FAQ](https://gamefaqs.gamespot.com/genesis/563111-tecmo-cup-football-game/faqs/18326), Controls, air-ball subsections (lines 360–393 in the retrieved page), is specifically for Genesis, not the similarly named NES game.

It describes attacking-area airborne choices as Pass, Shoot, Trap and Through. Shoot becomes a header or volley according to position. In the defending area it describes Pass, Clear and Trap; Trap changes to Stay when the opponent is closer. This corroborates contextual menus and relative arrival priority, but supplies no exact geometry or probability formula.

## Not established by this inspection

- The receiving/contesting menu was not reached for a controlled attacker during the short local inspection. Its exact defender commands must therefore not be claimed as a screenshot observation here.
- No exact contest radius, zone count, hex adjacency, maximum participant count, flight height breakpoint, speed formula, stamina penalty, or matchup probability was recovered.
- The exact penalty of choosing Block against Trap was not measured. The original coach's action-specific advice supports the broader need to reward correct anticipation, but a numeric modifier would be a reconstruction design choice until verified.
- Do not present a four-action defensive aerial menu assembled from scattered ROM labels as an exact original menu. Preserve context-dependent actions and mark implementation assumptions.
