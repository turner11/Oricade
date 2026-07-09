# Oricade — Production Game Spec

Browser-based, multi-level arcade game featuring radical shifts in genre, theme, and perspective across levels. 100% static client-side execution with zero backend dependencies.

---

## Technical Stack

* **Architecture:** 100% static site, deployable to GitHub Pages or any static CDN. Fully operational offline.
* **Rendering Engine:** 3D WebGL via a lightweight, high-performance engine (e.g., Three.js or PlayCanvas). A 3D foundation is required to seamlessly support both 2.5D side-scrolling views and true first-person perspectives within a single asset pipeline.
* **Input Handling:** HTML5 Gamepad API (dual controller support) + unified keyboard listener mapping layout.

---

## The Core Meta-Loop

`Main Menu → Interstitial Onboarding → Level Scene → Level Evaluation → Next Level Loop → Final Boss → Victory Screen`

### Arcade Rules & Meta-Systems
* **Global Life Pool:** The player begins the game with 3 global lives. 
* **Failure Condition:** Failing a level's objective or depleting the local health bar chunks 1 global life and forces a level restart. Reaching 0 lives triggers an immediate Game Over screen.
* **Interstitial Onboarding:** Every level transition triggers a mandatory 3-second static splash screen. This screen flashes the incoming level name, theme, core objective, and active control mapping to mitigate the cognitive load of shifting genres.

---

## Standardized Physics Core

To prevent cross-genre physics glitches, the engine runs on a single unified rigid-body simulation configuration with normalized metric scaling across all dimensions:

* **Character Scale:** Base player bounding box is set to a height of 1.8 meters and a width of 0.6 meters.
* **Mass Allocation:** Standard player mass is calculated at 75 kilograms.
* **Environmental Gravity:** Global downward acceleration is locked at 9.8 meters per second squared, scaled linearly per level context if adjustments to jump-arc feel are required.

---

## Level Matrix

| # | Theme | Perspective | Core Objective | Active Mechanics |
|---|---|---|---|---|
| 1 | Soccer | Third-person (Isometric) | Score 3 goals before time expires | Move, Shoot (Kick) |
| 2 | Basketball | Third-person (Side 2.5D) | Reach a 10-point threshold | Move, Jump, Shoot (Arc throw) |
| 3 | Retro Platformer | Third-person (Side-scroll) | Navigate hazards to reach the flag | Move, Jump, Crouch |
| 4 | Brawler | Third-person (Fixed Side 1v1) | Deplete opponent health bar | Move, Jump, Crouch, Attack |
| 5 | Unicorn Forest | Third-person (Behind-the-back) | Collect 5 magic gems | Move, Jump, Magic Spell (Dash) |
| 6 | Space Fleet | First-person (Cockpit view) | Destroy 3 enemy waves | Move, Shoot |
| 7 | Trap Dungeon | First-person (Free-look) | Navigate parkour to the artifact | Move, Jump, Crouch, Magic (Time-slow) |
| 8 | Comedic Boss | Dynamic (Swaps per phase) | Defeat the multi-phase mashup boss | All capabilities unlocked |

---

## Shared Capability Set & Input Mapping

The engine maintains a global controller class containing all 5 core inputs. Each scene selectively enables or disables action listeners based on the active level matrix rules.

### Input Configurations

| Action | Player 1 (Keyboard) | Player 2 (Keyboard) | Gamepad (P1 / P2) |
|---|---|---|---|
| **Move** | `W` / `A` / `S` / `D` | `Arrow Keys` | Left D-Pad / Analog |
| **Jump** | `Spacebar` | `Numpad 0` | Face Button Bottom (A/Cross) |
| **Shoot / Attack** | `F` | `Numpad 1` | Face Button West (X/Square) |
| **Crouch** | `Left Shift` | `Numpad Control` | Left Trigger (L2) |
| **Magic Spell** | `E` | `Numpad 2` | Face Button Top (Y/Triangle) |

---

## Visual & Audio Polish Requirements

* **Unified Art Direction:** To bridge the extreme thematic leaps coherently, the game employs a highly stylized, cohesive low-poly 3D design language with a shared pastel/neon color palette.
* **Visual Juice:** * **Particle Systems:** Mandatory on-hit, score, collect, and dash triggers.
    * **Juice / Easing:** Screen-shake on heavy impacts; camera scaling and interpolation (`lerp`) on camera state transitions.
* **Audio Pipeline:** Dynamic audio manager adjusting background music tracks seamlessly during the 3-second interstitial onboarding phases.

---

## Same-Computer Multiplayer Specification

Multiplayer is strictly local (couch co-op / versus), entirely eliminating netcode, latency interpolation, and signaling servers.

* **Display Layout:** * **Levels 1, 2, 3, 4, 8:** Single shared screen tracking both player bounding boxes. Camera bounds expand or contract to keep both players in focus.
    * **Levels 5, 6, 7:** Dynamic vertical split-screen mode, generating two distinct camera viewports rendering to separate halves of the WebGL canvas.
* **Mode Parameters:** * **Versus Mode:** Active during Level 1 (Soccer match) and Level 4 (Brawler). Player 2 controls the opposing team/fighter.
    * **Co-op Mode:** Active during all other levels. Scores are pooled, and both players must reach the exit or survive to complete the stage.
