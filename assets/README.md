# Quest game character asset

`quest-spritesheet.png` is the original custom Quest character atlas supplied by
the project owner. No artwork was generated, cropped, recolored, or otherwise
edited for the game. Canvas source rectangles select existing animation frames
at runtime.

- Name: Quest, the cheeky pixel adventurer.
- Provenance: custom character atlas supplied by the project owner, bundled on
  2026-10-13 (Tokyo date).
- PNG geometry: RGBA, 1536 × 2288 pixels; sprite version 2.
- SHA256: `f6bcd7ddccc152392203cb35ac527cae8a688a3a9bd6cfc15e01661bb5b8615d`.
- Grid: 8 columns × 11 rows, with 192 × 208 pixel cells.

## Source atlas mapping

Rows and columns below are zero based. Empty cells stay unused.

| Row | Original animation | Occupied cells | Game use |
| --- | --- | --- | --- |
| 0 | Idle | 0–5 | `idle` |
| 1 | Run right | 0–7 | `run`, `dash`, facing right |
| 2 | Run left | 0–7 | `run`, `dash`, facing left |
| 3 | Wave | 0–3 | `celebrate` |
| 4 | Jump | 0–4 | `jump` uses 0–2; `fall` uses 3–4 |
| 5 | Sad / hurt | 0–7 | `hurt` |
| 6 | Waiting / explaining | 0–5 | Reserved |
| 7 | Thinking | 0–5 | `think` |
| 8 | Alert | 0–5 | Reserved |
| 9 | Look directions, first half | 0–7 | Reserved |
| 10 | Look directions, second half | 0–7 | Reserved |

`src/sprites.mjs` exports `ANIMATIONS` and `SpriteAtlas`. Create an atlas with an
`HTMLImageElement` or `ImageBitmap`, then call:

```js
atlas.draw(ctx, {
  x: player.x,
  y: player.y,
  width: player.width,
  height: player.height,
  direction: 1,       // -1 faces left; +1 faces right.
  state: 'run',
  time: stateSeconds, // Elapsed seconds in the chosen animation.
  alpha: 1,
});
```

The common source trim is x=24, y=2, width=144, height=200 within each cell.
Alpha-bound inspection verified every used pose fits inside it. The renderer
anchors the visible feet to the gameplay rectangle's bottom and centers the
atlas cell on its horizontal midpoint. Upright visible height equals the body
height; crouching poses retain their shorter silhouette. Left running uses the
original left-facing row; other states mirror only when facing left. Smoothing
is disabled and transparent cell margins prevent atlas-neighbor bleed.

An unloaded or missing image draws a small teal character placeholder. This
asset is bundled with the game and needs no external character service.
