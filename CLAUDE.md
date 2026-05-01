# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Pallet Config is a visual pallet-loading configurator: pick a standard pallet, enter box dimensions, build the stack one layer at a time, and see how boxes pack onto it. Each layer has its own orientation (auto / length-along-pallet / width-along-pallet) and a 9-grid alignment within the layer below. The app renders the result in four synchronized views: a hero view (toggleable 3D ↔ 2D iso), plus orthographic front, side, and top.

## Stack

Vite + React 19 + TypeScript SPA. 3D rendering via `@react-three/fiber` and `@react-three/drei` (Three.js). 2D rendering uses hand-rolled SVG with an isometric projection helper (`src/lib/iso.ts`). Icons: `lucide-react`. No router, no state library — `src/App.tsx` owns all state via `useState` and passes it down.

## Commands

Package manager and runtime are pinned. Use pnpm, not npm/yarn.
- pnpm `10.33.2`, Node `v24.15.0` (also in `.nvmrc`).

```
pnpm dev          # Vite dev server
pnpm build        # tsc -b && vite build (typecheck gates the build)
pnpm lint         # biome check src/
pnpm lint --write # apply Biome fixes (sorts Tailwind classes, organizes imports)
pnpm test         # vitest run (single pass)
pnpm test:ui      # vitest with web UI
```

Run a single test file: `pnpm vitest run path/to/file.test.tsx`
Run by name: `pnpm vitest run -t "matches test name"`

## Code layout

```
src/
  App.tsx              # top-level state + layout (Header / Controls / Hero / Ortho / Summary)
  constants.ts         # STANDARD_PALLETS table + pallet construction dimensions
  types.ts             # Box, PalletStandard(Id), BoxOrientation, LayerOrientationChoice,
                       #   LayerAlignment, LayerConfig, PalletConfig, SavedConfig, ViewMode
  components/
    Header, Controls, BoxSizeCard, SummaryCard
    ConfigsBar         # tab strip for saved configs (switch / rename / delete / share)
    HeroView           # 3D/2D toggle wrapper
    PalletScene3D      # @react-three/fiber canvas
    PalletScene2D      # SVG isometric scene with plane-based painter sort
    OrthoView          # SVG front/side/top orthographic projection
  lib/
    layout.ts          # computeLayerLayout / computeLayerLayouts / totalBoxes / formatInches
    iso.ts             # 30° isometric projection (iso(x,y,z) → screen) + SVG path builder
    storage.ts         # localStorage persistence (key 'pallet-config:v1') for ConfigStore
    share.ts           # URL-hash share links: encode/decode SharedPayload as '#c=<base64url>'
```

### Layer layout semantics

A `LayerConfig` is `{ orientation: 'auto' | BoxOrientation, alignment: LayerAlignment }` where `LayerAlignment` is the 9-grid (`top-left` … `bottom-right` with `middle-center` as the default).

`computeLayerLayouts` threads a **bounding region** through layers (gravity constraint): layer 1 is bounded by the pallet, layer N+1 is bounded by layer N's box-block rectangle. Inside that region:

- `orientation: 'auto'` picks whichever orientation fits the most boxes within the bounded region.
- Explicit `length-along-pallet` / `width-along-pallet` is clipped to fit (cols/rows are `floor`d against the bounded region).
- `alignment` interprets fractions (`0` / `0.5` / `1`) of the remaining margin within the bounded region, then offsets are added to the bounded region's origin to produce pallet-relative `offsetLength` / `offsetWidth`.

Consequence: an upper layer's footprint is always ⊆ the layer below's, so boxes never overhang the layer they're sitting on.

All linear measurements are inches. `constants.ts` converts metric pallet specs to inches via `mm()` but preserves `nativeUnit`/`nativeLength`/`nativeWidth` for display.

### 2D iso painter algorithm

`PalletScene2D` flattens every visible face (3 per box + 3 per pallet, plus tape/deck-line decorations) into a single `Face[]`, then sorts them with a plane-based painter's compare implemented as a stable insertion sort. The compare uses the **separating-axis theorem** for AABBs: for two non-overlapping boxes A, B, find an axis where `A.max ≤ B.min` (or vice versa) — the smaller-side box draws first. Faces sharing the same `bounds` (same box, or same pallet) tie and the insertion order is preserved (`left`, `right`, `top`, then any tape/deck-line decorations after).

Why insertion sort: the comparator isn't a total order — when two faces have no plane separation it returns 0, and `Array.sort` would produce inconsistent placements. Insertion sort places each face just before the first face it must precede, which is stable for ties. See `painterCompare` and `painterSort` in `PalletScene2D.tsx` for the full rationale.

## Tooling conventions

- **Biome** is the sole formatter and linter (no Prettier, no ESLint). Config in `biome.json`:
  - Single quotes, 2-space indent, 80-char line width.
  - `nursery/useSortedClasses: error` — Tailwind class lists must be in Biome's canonical order. `pnpm lint --write` (or save in VS Code with the Biome extension) sorts them.
  - `style/useConsistentArrayType` enforces generic `Array<T>` syntax over `T[]`.
  - `style/useBlockStatements: error` — always use braces, even for single-statement `if`/`else`/`for`.
  - Imports are auto-organized via Biome's assist on save.
- **TypeScript** is strict with `noUnusedLocals`, `noUnusedParameters`, and `verbatimModuleSyntax`. Type-only imports must use `import type`.
- **Tailwind v3** with PostCSS + autoprefixer. Content scan covers `index.html` and `src/**/*.{ts,tsx}`. The theme is extended with project-specific palettes — prefer these tokens over hardcoded hex:
  - `navy` (`DEFAULT`/`dark`/`light`/`ink`) — text and UI chrome
  - `kraft` (`DEFAULT`/`dark`/`light`/`tape`/`shadow`) — cardboard box surfaces
  - `wood` (`DEFAULT`/`dark`/`light`) — pallet surfaces
  - `canvas` (`DEFAULT`/`card`) — page and card backgrounds
  - `shadow-card` — standard card elevation

  Add new design tokens to `tailwind.config.js` rather than hardcoding values.

## Testing

`vite.config.ts` configures Vitest with `environment: 'jsdom'`, `globals: true`, and `setupFiles: ['./src/test/setup.ts']`. **That setup file does not exist yet** — the first test added to the project needs to create `src/test/setup.ts` (typically `import '@testing-library/jest-dom'`). `@testing-library/react` and `@testing-library/jest-dom` are already in devDependencies. With `globals: true`, `describe`/`it`/`expect` don't need to be imported.

Pure logic in `src/lib/` (layout math, isometric projection) is the most natural target for unit tests.

## Architecture notes

Standard Vite React entrypoint: `index.html` → `src/main.tsx` (mounts `<App />` in `<StrictMode>`) → `src/App.tsx`.

State shape: `App` owns `{ configs: Array<SavedConfig>, activeId: string }`. Each `SavedConfig` carries its own `palletId`, `box`, and `layers`, plus `id` / `name` / `updatedAt`. The active config's fields are what `useMemo`'d derivations (`pallet`, `layouts`) read from, and those derived values fan out to every view component. Adding a new view means consuming `(pallet, box, layouts)` — don't recompute layout inside view components.

Persistence: `initialState()` in `App.tsx` hydrates from `loadStore()` (localStorage), then layers in any `#c=…` payload from `readSharedFromHash()` as a freshly-id'd imported config and clears the hash. Every state change is mirrored back via `saveStore()` in an effect. If the store is empty and there's no shared payload, a default config is seeded.

Sharing: `buildShareUrl(payload)` produces a URL with `#c=<base64url(JSON)>`. The decoder validates pallet id against `STANDARD_PALLETS`, enforces positive box dimensions, and whitelists orientation/alignment strings — invalid payloads return `null` rather than throwing.

The hero view defaults to 2D iso (`viewMode: '2d'`). Per-layer orientation/alignment changes are made through `Controls` — the user adds layers one at a time, and `App.tsx` exposes `addLayer` / `removeLayer` / `updateLayer` callbacks that mutate the active config's `layers` array.
