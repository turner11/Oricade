# Oricade — Game Spec

Browser-based, multi-level arcade game. Static site (HTML/CSS/JS), age 10+, production-grade visual polish.

## Stack

- Static site, no backend required for single-player. Deployable to GitHub Pages / any static host.
- Rendering: HTML5 Canvas (2D) via a lightweight engine (e.g. Phaser or a custom minimal loop — decide at implementation time based on bundle-size/perf tradeoffs).
- Multiplayer: WebSocket/WebRTC relay for real-time sync (needs a small signaling server — the one non-static piece; see Multiplayer section).

## Core loop

`Main Menu → Level Select → Level (with its own goal/theme/perspective) → Level Complete → next Level → ... → Boss (final level) → Victory`

## Levels

Each level = its own theme, art direction, camera perspective (first- or third-person, per-level choice), goal, and control subset drawn from the shared capability set below.

| # | Theme | Perspective | Goal | Notes |
|---|-------|-------------|------|-------|
| 1 | Soccer | Third-person | Score N goals before time runs out | Move, shoot (kick) |
| 2 | Basketball | Third-person | Reach a point threshold | Move, jump, shoot (throw) |
| 3 | Mario-like platformer | Third-person (side-scroll) | Reach the flag | Move, jump, crouch |
| 4 | Street Fighter | Third-person (side view, 1v1) | Deplete opponent's health bar | Move, jump, crouch, attack |
| 5 | Unicorns | Third-person | Collect N magic gems while avoiding hazards | Move, jump, magic spell (dash/glow) |
| 6 | Space Invaders | First-person (cockpit) or top-down | Clear all waves | Move, shoot |
| 7 | Persian Prince | First-person | Navigate traps/parkour to the artifact | Move, jump, crouch, magic spell (time-slow) |
| 8 (final) | Boss stage — comedic mashup of prior themes | Third-person | Defeat the boss (multi-phase, silly dialogue/animations) | All capabilities available |

## Shared capability set

Move, jump, shoot, crouch, magic spell — each level enables the subset relevant to its theme. Input: keyboard (WASD/arrows + action keys) with on-screen touch controls for mobile.

## Visual bar

This is the headline requirement — every level ships with: cohesive art direction, smooth animation/easing, particle effects on key actions (goal, hit, collect), polished UI/HUD, transitions between levels, and audio (sfx + theme-appropriate music). No placeholder art in the final build.

## Multiplayer

Optional co-op or versus per level (at minimum: versus for Street Fighter stage, co-op for platformer/boss stages). Requires a lightweight WebSocket relay server for state sync — the only non-static-hosting dependency. Single-player must work fully offline/static without it.

## Out of scope for this issue

This issue is spec-only. Engine choice, asset pipeline, and individual level implementations are follow-up issues, each scoped to one level so they can be built and tested independently.
