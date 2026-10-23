# Validation notes

## Learning hint language — 2026-10-23

- JavaScript syntax checks and all 18 Node tests passed. New checks cover old-save
  migration, both saved language choices, invalid settings, blocked browser
  storage, and complete translations for every memory note and practice hint.
- Local browser QA confirmed English on first load, switching both directions,
  persistence after reload, and immediate updates to lesson notes, revealed hints,
  question support, and desktop field notes.
- Enter and Space on the language switch preserve the current lesson/question.
  Changing language after answering retains feedback, disabled answer choices,
  and the recorded attempt. The QA field guide still showed exactly one attempt
  and one discovery after switching and reloading.
- Layouts were inspected at 1280px desktop and 390px/320px mobile CSS widths.
  The mobile pages and lesson dialog had no horizontal overflow at those sizes.
- No browser warnings or errors were observed in the exercised flows. QA used
  `?qa=1` and its separate storage namespace. Physical phones were not tested.
## Standalone publication — 2026-10-23

Checked the standalone copy using Node.js 24.2.0:

- `npm run check` and the local server syntax check passed.
- All 14 focused Node tests passed.
- The local HTTP server returned 200 and nonempty responses for 14 routes:
  the entry page, both stylesheets, all ten source modules, and the sprite atlas.
- The public copy contains only the game, tests, documentation, and screenshots.
  Internal character-service IDs and personal learner history were removed.
- The bundled character atlas still matches the SHA256 in `assets/README.md`.

This pass checked source, logic, and local HTTP serving. Browser interactions,
physical audio output, and phone performance were not rechecked. Historical
browser and scene-render checks are documented below.

## Original implementation — 2026-10-13

Checked on 2026-10-13 using Node.js 24.19.0 and the Codex in-app browser.

## Source and logic checks

- All eight source modules and the local server passed JavaScript syntax checks.
- All 14 focused Node checks passed: landing, double jump limits, coyote time,
  dash cooldown, one-way platforms, spring pads, corrupt or unavailable storage,
  supported-practice records, isolated QA storage, lesson/question integrity,
  safe shrine geometry, locked portals and single victory emission, and fall
  respawn with solved bridges retained.
- The language pack was reviewed for kanji readings, long vowels, particles,
  the transitive/intransitive repair pairs, and grammar scope. Purpose use of
  `ために` is explicitly qualified; `により` questions use a displayed context.
- The character atlas matches the original Quest source SHA256 recorded in
  `assets/README.md`. Frame rectangles and alpha bounds were inspected before
  integrating it into Canvas.

## Browser checks

The local server returned HTTP 200. The browser loaded the sprite and ES modules
without console errors during the exercised flows.

- **1280 × 900:** title, world selection, forest movement and spring boost,
  spark collection, nearby shrine interaction, full Japanese lesson, wrong
  answer explanation, fresh retry question, correct reward, 1/3 shrine update,
  pause menu, grammar filtering, and a workplace grammar practice question.
- **390 × 844:** title and workshop start, held on-screen movement, jump and
  dash buttons, field guide, and a full grammar lesson. Document width equaled
  viewport width. Touch buttons measured 56px high; the lesson stayed inside
  the viewport and could scroll.
- Music shortcut, SFX and FX controls updated independently. Browser audio
  initialization produced no console errors; physical speaker output was not
  measured. An installed Japanese voice exposed the optional Listen control.
- Practice persisted across reload. Export produced valid JSON with the exact
  three exercised answer attempts, including the deliberate wrong answer.
  The export identified itself as `automated-qa` and used a storage namespace
  separate from normal player practice.

The portal and respawn logic were exercised in focused Node checks. The browser
checks covered representative gameplay and lesson flows, not a manual complete
run of all three routes. Mobile checks used a responsive browser viewport;
physical phone performance and multitouch were not measured.

## Screenshots

- [Desktop title](screenshots/title-desktop.png)
- [Desktop gameplay](screenshots/gameplay-desktop.png)
- [Desktop kanji lesson](screenshots/lesson-desktop.png)
- [Desktop grammar lesson](screenshots/grammar-desktop.png)
- [Mobile title](screenshots/title-mobile.png)
- [Mobile gameplay](screenshots/gameplay-mobile.png)
- [Mobile grammar lesson](screenshots/lesson-mobile.png)

These are captures of the running application, not concept mockups.

## Countryside revision — 2026-10-13

The revised direction combines Japanese rice terraces, timber village houses
and shrine frames with fantasy cottages, windmills and a working waterwheel.
The interface now uses warm paper and meadow colors. Stable world IDs, route
geometry, controls, practice storage and the lesson pack are retained.

Selective props use actual XYZ meshes, face culling, depth sorting and directional
lighting through Canvas. Raised-platform front faces use an oblique projection
so their horizontal top edges match the existing collision surfaces. Background
props use orthographic projection with a small change in angle as the camera moves.
Decorative rotations and drifting details freeze when effects/motion are reduced.

All source modules passed syntax checks. Three complete scenes were exported
from the production GameEngine using a native Canvas context and the original
Quest atlas; the exports were inspected for character placement, prop depth and
Japanese shrine labels. These exports are scene renders, not browser screenshots.

Browser preview control was blocked by a URL security rule while selecting the
existing tab. The revised interface and live browser interaction could not be
rechecked in this pass. The earlier browser checks above describe the first
version. The 14 logic checks were not rerun for this visual revision.

- [Ricefield Trail scene](screenshots/countryside-wordwood-v002.png)
- [Windmill Village scene](screenshots/countryside-workshop-v002.png)
- [Sunset Shrine scene](screenshots/countryside-sky-v002.png)
