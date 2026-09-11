# Logistics Helper v3 — Build Progress

> Source of truth: [`SYSTEM_SPEC.md`](./SYSTEM_SPEC.md). This file is the build record.

Pipeline: `logistics_helper_v3_build_pipeline.md` (5 agents). Status: **all 5 agents done, verified**.
Follow-ups Task A (same-run fixtures) + Task B (dead-file deletion) + Tasks C/D (README count, supplier browser) + Tasks E/F (dedupe key, PO PDF) + Task G (Phase 5 audit): **done, verified** (G4 physical-device test is human-run — checklist below).
Verification: `npx vitest run` → **9 files, 25 tests, all pass**. `npx vite build` → **green**.

## Agent 1 — Parser ✅ (Task A: deep equality, 2026-09-11)
Files: `src/utils/importParser/{detectFormat,mdReader,xlsxReader,normalize,index}.js`
- Extension routing (`.md`/`.xlsx`), header-text section/sheet detection (no fixed positions),
  shared normalizer → single `ParsedImport` shape (`null` if absent, never guessed).
- Fixtures (`tests/fixtures/`) are now a **true same-run pair** — one Agent 6/7 run 2026-09-10
  (~14:00), exported as `.md` (15:01) and `.xlsx` (14:08, 8 sheets incl. supplier directory +
  change log). The Sep-08 xlsx from a different run was replaced.

| File | Title | BOM | Shortage | Suppliers | Change log |
|---|---|---|---|---|---|
| `Qwen_markdown_20260910_k171vvnlq.md` | SURAU DARUL DAKWAH | 52 | 6 | 14 | 5 |
| `Surau_Darul_Dakwah_BOM_A7_Grounded_Sourcing.xlsx` | SURAU DARUL DAKWAH | 52 | 6 | 14 | 5 |

- `parser.test.js` asserts **full deep equality** (`toEqual`) between the two `ParsedImport`
  outputs — same item count, same values field-by-field — plus anchor spot checks. Any
  cross-format data drift fails loudly.
- Three deterministic parser rules make deep equality hold (all in `normalize.js`/`mdReader.js`,
  documented in code): canonical `projectTitle` (location tail stripped — location belongs in
  `Project.location`, same rule as `projectMatcher.normalizeTitle`); numbers cleaned to 4dp
  (kills xlsx float dust, e.g. `28.000000000000004` from a 0.28 fraction); markdown-link URLs
  parsed greedily so paren-containing URLs (waze link) survive intact.

## Agent 2 — Data Layer ✅
Files: `src/data/{db,schema,projectRepo,bomRepo,supplierRepo,shortageRepo,changeLogRepo}.js` (+ `dexie` dep,
`fake-indexeddb` dev-dep for tests). IndexedDB via Dexie, schema exactly per spec.
`shortageRepo.js` added (schema table had no owning repo file; merge engine + UI need it).
Acceptance: write → `lockField` → `closeDb()`/`openDb()` → data + `lockedFields` intact (tested).

## Agent 3 — Merge Engine ✅
Files: `src/logic/{projectMatcher,itemMatcher,mergeEngine,seedProject,approvePending}.js`
- Exact spec algorithm: locked skip (reported, not logged) / unlocked diff → agent log + overwrite /
  new → `new_item_pending` (not added) / missing → `removed_item_pending` (not deleted) /
  `supervisorEdit` → lock + supervisor log. All three acceptance cases pass.
- Additions inside this layer (UI stays logic-free): idempotency guard (no duplicate open pendings
  on re-import), `seedProjectFromImport` (first-import path), `approvePending` (Confirm actions:
  insert snapshot / delete match / resolve). Pending rows carry a `snapshot` for approvals.

## Agent 4 — UI Screens ✅
Files: `src/screens/{ProjectsScreen,DashboardScreen,BomScreen,ConfirmScreen,SuppliersScreen,PoScreen,poGate}.js`,
`src/App.jsx` rewired (Projects entry → 5-tab project view). No business logic in components.
Hard rule: `resolveTabRequest('po', unresolvedCount)` → `'confirm'` when count > 0 (used by tab bar
and tested); `PoScreen` also re-checks the gate itself and renders a blocked panel with Go-to-Confirm.
The old DSG-B-only flow in `App.jsx` was replaced; its dead utils are now deleted (Task B).

## Agent 5 — QA ✅
Files: `tests/{parser,dataLayer,mergeEngine,poGate,supplierBrowser,poPdf,touchTargets,singleSource,e2eLockedField}.test.{js,jsx}` (Vitest). 25/25 pass.
`poGate.test.js` seeds the **real MD sample** (52 lines, 6 open confirmations) and asserts
PO-request → Confirm redirect, then gate opens after resolving all.
Test-count note: 14 → 11 was the Task A rewrite (7 shape-only parser tests consolidated into
4, with strictly stronger deep-equality assertions); 11 → 13 is Task D's new
`supplierBrowser.test.js` (2 tests). Task B removed zero tests — nothing live
depended on the deleted files.

## Task B — Dead Kill-List files deleted ✅ (2026-09-11)
Deleted: `src/utils/excelParser/dsgB.js`, `src/data/structuralKits.js`, `src/utils/coverageRules.js`
(empty parent dirs `src/utils/excelParser/`, `src/components/` removed too).
`src/components/QuickKitPrompt.jsx` + `CoverageGate.jsx` never existed (spec §3 "Removed from
v1.0.0" — they were never built); verified absent. Grep for `parseDSGB`, `STRUCTURAL_KITS`,
`findMatchingKit`, `validateCoverage`, `coverageRules`, `structuralKits`, `excelParser`,
`QuickKitPrompt`, `CoverageGate` across `src/` + `tests/`: **zero hits**. Tests + build green.
Phase 5 "zero Kill List items" audit now passes on presence (remaining Kill List items were
never introduced).

## Task C — README count ✅ (2026-09-11)
One line: `npx vitest run` comment 14/14 → 11/11 → 13/13 (Task D) → 18/18 (Tasks E/F) → 25 (Task G).

## Task D — Global supplier browser ✅ (2026-09-11, closes Delta D5)- New `src/logic/supplierLinking.js`: single home of the dedupe-by-normalized-businessName
  rule (`linkSupplierEntry`: find-or-create + link). `seedProject.js` refactored onto it —
  same behavior (poGate full-seed test still green). `mergeEngine.js` and the import path
  untouched.
- `SuppliersScreen.jsx`: "Browse All Suppliers" opens the full `GlobalSupplier` directory —
  search box over name/specialty/address/contact (region via address text, e.g. "Kuching"),
  data-driven tag chips, per-row Link / Linked ✓ (idempotent `put`). Tapping runs the shared
  rule: only a `ProjectSupplierLink` is ever added, never a duplicate supplier record.
- `tests/supplierBrowser.test.js` (2 tests): A seeded with one supplier from its own import;
  B browses + links it → exactly 1 `GlobalSupplier` row + 2 links (one per project, same id);
  re-link and case-variant entries never duplicate.
- Spec: D5 logged done-with-date in Annex B, Annex A row reflects the browser, D5 removed
  from Annex C item 2. D3 (audit toggle) and D6 (PO PDF/WhatsApp) unchanged in the queue.

## Task E — Harden supplier dedupe key ✅ (2026-09-11)
`supplierLinking.js` dedupes on **(normalized name, normalized address)** — both must match.
Same common name in different towns ("ABC Hardware" Betong vs Kuching) now stays two records
instead of silently merging. New case in `supplierBrowser.test.js`; existing same-name /
case-variant cases pass unchanged. Spec D5 text updated to the hardened rule.

## Task F — Phase 4: PO PDF + WhatsApp ✅ (2026-09-11, closes Delta D6)
- New `src/logic/poDocument.js`: `buildPoLines` (same `BomItem[]`), missing price
  (null/blank/NaN — explicit 0 stays a real price) → TBD line, `buildPoTotal` sums priced
  lines only, `renderPoPdf` (jspdf, compression off, ASCII deterministic bytes),
  `buildWhatsAppLink` = exact `https://wa.me/?text=…&attachment=po.pdf` shape.
- `PoScreen.jsx`: Generate PO button lives only in the already-open gate branch; the
  on-screen table shows TBD instead of zero-filled RM 0.00; the WhatsApp anchor derives
  strictly from pdfUrl state (no PDF → no link, by construction). `poGate.js`, parser,
  merge engine untouched.
- `tests/poPdf.test.js` (4 tests): resolved-gate open; TBD-only-on-missing-row + 336 total;
  PDF bytes contain project/item names, TBD, and 336.00; link shape exact.
- Spec: D6 logged done-with-date in Annex B, Annex A row reflects the deliverable, Phase 4
  marked done in Annex C item 2. D3 (audit toggle) deferred as agreed — untouched.

## Environment fixes (pre-existing, not pipeline scope)
- `npm install` fails with arborist `edgesOut` on this machine (vitest peer graph) → use
  `npm install --legacy-peer-deps`. Generated `package-lock.json` is committed.
- `vite build` failed: `minify: 'terser'` with terser not installed (pre-existing) → `'esbuild'`.
- `fake-indexeddb` placed in `devDependencies` (test-only).

## Explicitly NOT built (per spec)
Agent 6/7 BOM producers, PO PDF generation, multi-user backend.

## Run
`npm install --legacy-peer-deps` · `npm run dev` · `npx vitest run` · `npx vite build`
