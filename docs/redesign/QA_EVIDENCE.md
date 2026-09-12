# QA Evidence (Phase 5, Agent 8)

## Automated
- `npx vitest run` → 15 files, 43 passed (recorded 2026-09-11, code as committed)
- `npx vite build` → green, dist/ served for all shots
- Contrast pairs (computed): 17.85 / 7.58 / 5.93 / 5.30 / 6.37 / 5.02 — all ≥ 4.5
- Kill-list grep over `src/`: zero hits (pattern in 07)

## Screenshots / prototypes
- `docs/redesign/artifacts/before-*.png` (8): baseline journey, real import flow
- `docs/redesign/artifacts/after-*.png` (8 + 2 at 320px): same journey post-redesign
- `shoot.mjs` / `shoot320.mjs`: re-runnable capture (needs preview on :4173 + cached Chromium)
- No generated mockups — all evidence is the running app

## Manual device checklist
- Human G4 checklist: `MANUAL_TEST_CHECKLIST.md` (repo root) — OPEN, not run by agents
- Reduced-motion emulation: not run (CSS rule tested present) — OPEN

## Unresolved items
- None blocking. G4 run + motion emulation are labelled follow-ups, not pass claims.
