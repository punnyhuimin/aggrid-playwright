# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

A minimal React + TypeScript + Vite app demonstrating AG Grid (Community edition via `ag-grid-react`), with Playwright component tests.

## Commands

- `npm run dev` — start the Vite dev server
- `npm run build` — type-check (`tsc -b`) and build for production
- `npm run lint` — run ESLint over the project
- `npm run preview` — preview the production build
- `npm run test-ct` — run Playwright component tests (uses `playwright-ct.config.ts`)

To run a single component test, pass a file path: `npm run test-ct -- src/App.spec.tsx`. Component tests run against chromium, firefox, and webkit projects by default.

## Architecture

- `src/App.tsx` — the entire app. Defines the `ICar` row type, registers AG Grid's `AllCommunityModule` via `ModuleRegistry`, and renders a single `AgGridReact` grid with local `rowData`/`colDefs` state.
- `src/main.tsx` — React entry point, mounts `App` into `#root`.
- `src/App.spec.tsx` — Playwright component test (CT) that mounts `App` directly and asserts on AG Grid DOM (`.ag-root`, `.ag-header-cell-text`, `.ag-cell`).
- `playwright/index.tsx` / `playwright/index.html` — Playwright CT bootstrap files (component test harness entry point and HTML shell).
- `playwright-ct.config.ts` — Playwright component test config; snapshots go to `./__snapshots__`, CT server runs on port 3100.

Since the app is currently a single component, most feature work and grid configuration (column defs, row data, cell editing, etc.) happens directly in `src/App.tsx`.
