# Stacking Patterns + Per-Layer Box Count — Design

**Date:** 2026-05-01
**Status:** Approved (Approach A, six patterns)

## Goal

1. Let users pick a **stacking pattern** for the pallet from six standard options (Block, Row, Brick, Pinwheel, Split Row, Hybrid Pinwheel). The pattern determines how boxes are oriented and arranged on each layer, including layers that mix orientations within a single layer.
2. Let users override the **box count** on each layer (default = the maximum that fits given the pattern). Reducing the count truncates the layer in a deterministic order.

## Architectural change

The current layout engine assumes one orientation per layer and renders a uniform `cols × rows` grid (`LayerLayout.rows / cols / footprintLength / footprintWidth / offsetLength / offsetWidth`). That assumption breaks for Brick/Pinwheel/Split Row/Hybrid Pinwheel, which place boxes of different orientations within the same layer.

**The layout engine moves from a single-grid model to an explicit list of box placements per layer.** Each placement carries its own orientation and offset.

## Data model

```ts
// Replaces the current LayerLayout single-grid shape.
type BoxPlacement = {
  orientation: BoxOrientation;
  // Pallet-relative offsets to the box's near corner (origin at pallet 0,0).
  offsetLength: number;
  offsetWidth: number;
};

type LayerLayout = {
  placements: ReadonlyArray<BoxPlacement>;     // truncated to boxCount
  capacity: number;                             // placements before truncation
  // AABB of placements (used as the next layer's bounding region)
  boundsLength: number;
  boundsWidth: number;
  boundsOriginLength: number;
  boundsOriginWidth: number;
};

type StackingPattern =
  | 'block'
  | 'row'
  | 'brick'
  | 'pinwheel'
  | 'split-row'
  | 'hybrid-pinwheel';

// LayerConfig (per layer, persisted): orientation removed, boxCount added.
type LayerConfig = {
  alignment: LayerAlignment;
  boxCount: number | null; // null = use the pattern's max
};

// SavedConfig gains pattern + a global "primary orientation" used by patterns
// that need a starting axis (Block, Row).
type SavedConfig = {
  // ...existing fields
  stackingPattern: StackingPattern;
  orientation: LayerOrientationChoice; // 'auto' | 'length-along-pallet' | 'width-along-pallet'
  layers: Array<LayerConfig>;
};
```

## Pattern algorithms

Each pattern is a function `(box, bounds, layerIndex, primaryOrientation) → Array<BoxPlacement>` returning placements ordered for deterministic truncation. After the pattern function fills the bounded region as densely as the pattern allows, alignment shifts the AABB of placements within the bounded region.

**Block** — all layers identical; one orientation throughout.
- Resolve orientation from `primaryOrientation` (`'auto'` picks whichever fits more boxes).
- Simple `cols × rows` grid in row-major order.

**Row** — single orientation per layer, alternating between layers.
- Layer 0 uses `primaryOrientation` (`'auto'` → best fit).
- Each subsequent layer flips orientation.
- Each layer is its own simple grid sized to its orientation.

**Brick** — within a layer, alternating *stripes* of L-rows and W-rows fill the bounding region; layers also alternate stripe direction.
- Pick stripe axis (along length or along width) based on which orientation fits more boxes per stripe.
- Stack stripes of alternating orientation until the perpendicular axis is exhausted.
- Layer 1 rotates the whole stripe direction 90°; layer 2 returns to layer 0's direction.

**Pinwheel** — bounded region split into 4 quadrants (NW, NE, SE, SW); diagonally-opposite quadrants share an orientation, creating a 2-fold-symmetric pinwheel-like layout (true 4-fold symmetry would need 4 orientations, but the model only supports L and W).
- NW + SE → L; NE + SW → W (per layer 0).
- Each quadrant is its own sub-grid (boxes packed within its quarter).
- Layers alternate (rotate the pinwheel 90°).

**Split Row** — bounded region split in half along its longer axis; one half fills with L rows, the other with W rows.
- Split axis = longer of `boundsLength` / `boundsWidth`.
- Top/left half: L-orientation grid; bottom/right half: W-orientation grid.
- Layers alternate (swap which half gets which orientation).

**Hybrid Pinwheel** — pinwheel "frame" around the perimeter with a uniform-orientation "core" in the center.
- Top + bottom strips: L-orientation rows spanning the full bounded length, anchored opposite ends (creates the rotational illusion).
- Left + right strips: W-orientation columns spanning the perimeter between the top/bottom strips.
- Center: filled with the primary orientation.
- Layers alternate the perimeter rotation.

### Order within `placements`

Each pattern returns placements in row-major reading order (top-to-bottom, then left-to-right) so reducing `boxCount` removes the bottom-right corner first. Patterns with sub-regions (Pinwheel, Split Row, Hybrid Pinwheel) interleave reading order globally so partial layers stay visually balanced rather than over-emptying one quadrant.

### Imperfect tilings

Real-world boxes rarely tile patterns perfectly (Brick assumes a 2:1 ratio; Pinwheel assumes specific symmetries). When a pattern can't tile, we fit as many placements as possible and accept gaps. This is preferable to either rejecting the input or silently falling back to Block.

## UI

**Controls.tsx** changes:

- **Pattern selector** at the top of the layers section (segmented buttons: Block, Row, Brick, Pinwheel, Split Row, Hybrid Pinwheel).
- **Global orientation selector** (Auto/L/W) shown only for patterns where it's meaningful (Block, Row, Hybrid Pinwheel center). Hidden for the others.
- **LayerCard** keeps its alignment grid but loses orientation. Adds a compact integer **Count** input to the right of the alignment grid.
  - Min: 1, max: `capacity` for that layer.
  - Stored as `null` when equal to capacity (so it auto-tracks if box/pallet/pattern changes); explicit when overridden.
- New props on `Controls`: `stackingPattern`, `orientation`, `onStackingPatternChange`, `onOrientationChange`, and `layouts` (so each LayerCard knows its capacity).

## Renderers

All renderers iterate `layer.placements` instead of nested row/col loops. Each placement carries its own orientation, so each rendered box uses `box.length`/`box.width` mapped through that orientation.

- **PalletScene2D / PalletScene3D**: replace the `for row in rows / for col in cols` block with `for placement in placements` (already truncated to boxCount). The painter's-algorithm sort in 2D continues to work since each placement still has its own AABB.
- **OrthoView (top)**: render each placement as a rect at `(offsetLength, offsetWidth)` with size `(footprintLength, footprintWidth)` derived from the placement's orientation.
- **OrthoView (front/side)**: aggregate placements into elevation-axis bands. Front view collapses the length axis, side view collapses the width axis. For each layer we project placements onto the elevation axis and render contiguous spans (or just per-placement rectangles since they don't overlap).
- **SummaryCard**: `boxesPerLayer` is now `placements.length`. `totalBoxes` sums `placements.length` across layouts.

## Migration

**Old `LayerConfig`** has `orientation: LayerOrientationChoice` and no `boxCount`.
**Old `SavedConfig`** has no `stackingPattern` or top-level `orientation`.

Migration runs once on load (in `App.tsx` `initialState`):

- For each saved config without `stackingPattern`: detect from layer orientations.
  - All same → `'block'` with that orientation.
  - Strict alternation → `'row'` with the layer-0 orientation.
  - Otherwise → `'block'` with `'auto'`.
- For each layer: drop `orientation`, set `boxCount: null`.

**Share links** (`lib/share.ts`): `validatePayload` accepts both old and new shapes. Old shapes are migrated identically before being returned as a `SharedPayload` of the new shape. Invalid payloads still return `null`.

**Storage key** (`pallet-config:v1`) is unchanged — the migration runs on read; subsequent writes use the new format. (No need to bump to `v2` since the new format is additive after migration.)

## Out of scope

- Per-box-orientation overrides (the user picks the pattern; the engine determines orientations).
- Patterns that need 4-direction orientations (true 4-fold pinwheel symmetry) — we approximate with 2-fold symmetry.
- Optimizing tilings for non-2:1 box ratios beyond fitting what we can (no rotation tricks, no specialty packers).
