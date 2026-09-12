# Handoff: 01 Product-State Audit (Phase 0)

## Evidence inspected
- `SYSTEM_SPEC.md` (v2.0.0 + Annex A–D), `src/App.jsx`, all 7 files in `src/screens/`,
  `src/index.css`, `src/screens/poGate.js`, repo/logic boundary (`src/data/*`, `src/logic/*`)
- UI-facing tests: `touchTargets.test.jsx`, `e2eLockedField.test.jsx`, `e2eFreshImport.test.jsx`,
  `poGate.test.js`, `poPdf.test.js`, `xlsxUiImport.test.jsx`
- Suite + build, unmodified: `npx vitest run` → 13 files, 34 passed; `npx vite build` → green
- Real Chromium (headless, 390×844 + 1280×800) driven through the true import flow with
  `tests/fixtures/Qwen_markdown_20260910_k171vvnlq.md`: 8 before-screenshots in
  `docs/redesign/artifacts/before-*.png` (empty projects, dashboard, BOM, confirm,
  suppliers, PO-blocked, desktop dashboard/BOM)

## Findings / decision record
| Decision or observation | Evidence | User impact | Invariant affected | Confidence / open question |
|---|---|---|---|---|
| BOM table unreadable on 390px: 4 cramped columns, 0.75rem edit buttons, horizontal squeeze | before-mobile-bom.png | Core task (review + edit quantities) painful on phone | None (display only) | High. Fix as card/row list. No open question. |
| Buttons render with heavy default borders (no border/background reset in CSS) | All screenshots: chunky black-bordered buttons | App looks broken/unfinished; affordance unclear | None | High. Token system must own button surfaces. |
| Tab icons are emoji; headless render shows tofu, tiny 0.75rem labels | All screenshots tab bar | Weak nav legibility; emoji-dependent | None | High. Replace with text/SVG + larger labels. |
| Dashboard leaks storage internals: `import_note: null → …`, raw ISO timestamps | before-mobile-dashboard.png | Supervisor reads database jargon | Change-log display only | High. Rewrite as plain sentences + relative/short dates. |
| PO-blocked path renders App banner + Confirm screen; `PoScreen`'s own blocked panel unreachable via tabs | before-mobile-po-blocked.png; `App.requestTab` always redirects | Duplicated heading ("PO blocked…" + "Confirm (6 open)"); dead UI branch | Gate intact and truthful | High. Unify into one blocked pattern; remove or route the dead branch. |
| Confirm list ungrouped (badges only); Approve/Dismiss side-by-side squeeze at 390px | before-mobile-confirm.png; D4 | Hard to triage questions vs new/removed items | Kinds distinct in data, blurred in UI | High. Group by kind (03/04 specify). |
| Zero focus styles, zero aria attributes, zero keyboard handlers, zero live regions in `src/` | grep: no `:focus`, `aria-`, `role=`, `tabIndex`, `onKey` | Keyboard/SR users cannot operate primary actions | None (missing feature) | High. Required in slices + 06 QA. |
| Import has no progress text (`busy` only disables input); Dashboard "Loading…" only loader | ProjectsScreen.jsx:44-51; DashboardScreen.jsx:37 | Spec §4 "deterministic spinners with text" violated | None | High. Add Parsing/Matching/Saving states with exact copy. |
| No transitions, no reduced-motion CSS anywhere | grep + index.css full read | Motion work starts from zero; nothing to unpick | None | High. |
| Styling is inline-style + 3 color utilities; no token/component system | All screens; index.css (only :root colors + utilities) | Every visual change is per-file surgery | None | High. 03 tokens + 05 slices replace incrementally. |
| Data layer is clean: screens use repos only (D10), state remounts per tab, reload-after-mutation | singleSource.test.js; App.jsx conditional render | Redesign can restyle freely without touching data flow | All data invariants | High. No open question. |
| Suite covers gates, locks, TBD, dedupe, e2e import/edit/reimport (34 tests) | tests/ | Broad restyle has a safety net; new interaction contracts need new tests | All | High. 05 adds per-slice tests; 07 re-runs adversarial paths. |
| Physical-device feel unverified (G4 open); screenshots are headless-Chromium only | BUILD_PROGRESS G4 checklist | Cannot claim one-thumb pass | None | Open: human G4 run still required at Gate E. |

## Deliverables
- `docs/redesign/artifacts/before-*.png` (8), `shoot.mjs` (re-runnable evidence script)
- State inventory: Projects (empty/list/importing/merge-outcome/delete-confirm), Dashboard
  (loading/ready), BOM (list/edit-panel/saving/saved+locked), Confirm (open-item kinds/
  approve/dismiss/empty-resolved), Suppliers (linked/browser/search/no-match),
  PO (blocked-via-redirect/generated/WhatsApp-handoff), global error (friendly import errors)

## Acceptance checks run
- `npx vitest run` → 13 files, 34 passed (recorded, code untouched)
- `npx vite build` → green, dist/ served for shots
- Chromium journey: empty → import (52/6/14 seeded) → 5 tabs + blocked PO, mobile + desktop

## Risks and follow-up owner
- Emoji tab icons render as tofu on some devices → Agent 3 (replace icon system)
- No focus/aria baseline → Agent 5 (per-slice) + Agent 6 (audit)
- Screenshots ≠ physical device → Agent 6 labels G4 pending; Agent 8 Gate E enforcement
- Receiving agent: Agent 2 (flow/content)
