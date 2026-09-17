# Logistics Helper v3

> **Deterministic operations tool for construction logistics.**
> Live: https://material-logi.vercel.app · Single source of truth: [`SYSTEM_SPEC.md`](./SYSTEM_SPEC.md) (v2.0.0 + Implementation Annex).

This app consumes finished 8-section BOM files (`.md`/`.xlsx`) produced upstream by the
Agent 6 + Agent 7 pipeline — a separate system. It never produces BOMs, never guesses a
quantity/price/supplier, and makes no runtime AI calls. Correctness > Speed > Features > Polish.

## Flow

```
Import file → match/create project → merge (locks respected, new/removed queued)
  → Dashboard / BOM (edits lock fields) / Confirm (resolve all) / Suppliers
  → PO (blocked until Confirm is empty; PDF + WhatsApp = Phase 4, pending)
```

## Structure

```
src/
├── App.jsx                 # Projects entry → 5-tab project shell + PO gate redirect
├── screens/                # Projects, Dashboard, BOM, Confirm, Suppliers, PO (+ poGate.js)
├── utils/importParser/     # detectFormat, mdReader, xlsxReader, normalize (Agent 1)
├── logic/                  # projectMatcher, itemMatcher, mergeEngine, seedProject, approvePending
└── data/                   # Dexie db, schema, project/bom/supplier/shortage/changeLog repos
tests/
├── fixtures/               # Real sample .md + .xlsx (ground truth)
└── *.test.js               # parser, dataLayer, mergeEngine, poGate (14 tests)
```

## Run

```bash
npm install --legacy-peer-deps   # plain `npm install` hits an arborist bug on vitest peers
npm run dev
npx vitest run                   # 113/113 must pass
npx vite build
```

## Kill List (rejected in any PR)

Co-occurrence suggestions · OCR/messy-PDF parsing · variant price tracking · Monday Entry
Generator · Public Dashboard · **Quick-Kit logic · in-app coverage math · runtime AI calls.**
Dead v1 files (`dsgB.js`, `structuralKits.js`, `coverageRules.js`) were deleted 2026-09-11
(zero references remain in `src/`). Do not reintroduce them.
