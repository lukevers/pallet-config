# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## OVERVIEW

We are building a visual pallet configuration web application.

## Project status

Pallet Config is a Vite + React 19 + TypeScript SPA. It's currently a scaffold: `src/App.tsx` is a `<div>todo</div>` stub and `README.md` is "TODO". Audio samples (`public/samples/bass.wav`, `public/samples/guitar.wav`) and an `icons.svg` sprite hint at the eventual scope, but no real features exist yet — assume you're often building things from scratch rather than extending established patterns.

## Commands

Package manager and runtime are pinned in `package.json`:
- pnpm `10.33.2`, Node `v24.15.0` (also in `.nvmrc`). Use pnpm, not npm/yarn.

```
pnpm dev          # Vite dev server
pnpm build        # tsc -b && vite build (typecheck gates the build)
pnpm lint         # biome check src/
pnpm test         # vitest run (single pass)
pnpm test:ui      # vitest with web UI
```

Run a single test file: `pnpm vitest run path/to/file.test.tsx`
Run by name: `pnpm vitest run -t "matches test name"`

## Tooling conventions

- **Biome** is the sole formatter and linter (no Prettier, no ESLint). Config in `biome.json`:
  - Single quotes, 2-space indent, 80-char line width.
  - `nursery/useSortedClasses: error` — Tailwind class lists must be in Biome's canonical order; running `pnpm lint --write` (or save in VS Code with the Biome extension) sorts them.
  - `style/useConsistentArrayType` enforces generic `Array<T>` syntax over `T[]`.
  - `style/useBlockStatements: error` — always use braces, even for single-statement `if`/`else`/`for`.
  - Imports are auto-organized via Biome's assist on save.
- **TypeScript** is strict with `noUnusedLocals`, `noUnusedParameters`, and `verbatimModuleSyntax`. Type-only imports must use `import type`.
- **Tailwind v3** with PostCSS + autoprefixer. Content scan covers `index.html` and `src/**/*.{ts,tsx}`. The theme is unextended — add design tokens to `tailwind.config.js` rather than hardcoding magic values.

## Testing

`vite.config.ts` configures Vitest with `environment: 'jsdom'`, `globals: true`, and `setupFiles: ['./src/test/setup.ts']`. **That setup file does not exist yet** — the first test added to the project needs to create `src/test/setup.ts` (typically `import '@testing-library/jest-dom'`). `@testing-library/react` and `@testing-library/jest-dom` are already in devDependencies. With `globals: true`, `describe`/`it`/`expect` don't need to be imported.

## Architecture notes

Standard Vite React entrypoint: `index.html` → `src/main.tsx` (mounts `<App />` in `<StrictMode>`) → `src/App.tsx`. There is no router, no state library, and no component directory yet — introduce these only when a concrete need arises.

`lucide-react` is the icon library.