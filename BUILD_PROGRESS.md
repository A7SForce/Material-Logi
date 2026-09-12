# Logistics Helper v3 — Build Progress

> Source of truth: [`SYSTEM_SPEC.md`](./SYSTEM_SPEC.md). This file is the build record.

Pipeline: `logistics_helper_v3_build_pipeline.md` (5 agents). Status: **all 5 agents done, verified**.
Follow-ups Task A (same-run fixtures) + Task B (dead-file deletion) + Tasks C/D (README count, supplier browser) + Tasks E/F (dedupe key, PO PDF) + Task G (Phase 5 audit): **done, verified** (G4 physical-device test is human-run — checklist below).
Verification: `npx vitest run` → **15 files, 43 tests, all pass**. `npx vite build` → **green**.

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
Files: `tests/{parser,dataLayer,mergeEngine,poGate,supplierBrowser,poPdf,touchTargets,singleSource,e2eLockedField,xlsxUiImport,reimport,projectDelete,e2eFreshImport,redesignUi,approvePending}.test.{js,jsx}` (Vitest). 43/43 pass.
`poGate.test.js` seeds the **real MD sample** (52 lines, 6 open confirmations) and asserts
PO-request → Confirm redirect, then gate opens after resolving all.
Test-count note: 14 → 11 was the Task A rewrite (7 shape-only parser tests consolidated into
4, with strictly stronger deep-equality assertions); 11 → 13 is Task D's new
`supplierBrowser.test.js` (2 tests); 13 → 18 Tasks E/F; 18 → 25 Task G; 25 → 27 md rework.
Task B removed zero tests — nothing live depended on the deleted files.

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
One line: `npx vitest run` comment 14/14 → 11/11 → 13/13 (Task D) → 18/18 (Tasks E/F) → 25 (Task G) → 27 (md rework) → 34 (H-tasks) → 43 (redesign).

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

## MD rework — pandas-export variant ✅ (2026-09-11)
Root file `Surau_Darul_Dakwah_BOM.md` (pandas dump: title/metadata rows above the true
header, `Unnamed:` columns, 6 sections, no supplier/change-log sections) parsed to
all-zeros — `parseTables` assumed block[0] is the header. Fixed in `mdReader.js`: each
typed parser now locates its own true header row by content, separator rows stripped
centrally, plus a numbered-`#` guard so note/total rows can't leak in as items. Result:
52 lines + 6 confirmations (was 0/0/0/0); Qwen + xlsx outputs byte-identical to before
(deep-equality still holds, no regression). Regression-locked by
`tests/fixtures/Surau_Darul_Dakwah_BOM.md` + 2 new parser cases (not deep-equal to Qwen —
different export wording, same anchor values).
Note: root `Surau_Darul_Dakwah_BOM_A7_Grounded_Sourcing.md` is byte-identical (same SHA)
to the Qwen fixture — same file under two names, parses 52/6/14/5 with no changes.

## Task H1 — xlsx import crash ✅ (2026-09-11, blocking)
Reproduced exactly (`Import failed: Cannot read properties of undefined (reading 'map')`)
by driving the real xlsx through the UI path in jsdom. Root cause: a missing `await` on
async `parseXlsx` inside `parseImport` shipped a Promise as ParsedImport (unit tests always
awaited it directly, so only the UI path crashed). Fixed + hardened: every sheet/section
parse resolves non-arrays to `[]`, `buildParsedImport` tolerates explicit `null`, new
`friendlyImportError` (password/corrupt/empty → specific messages, raw JS strings go to
console only), `isEmptyImport` guard refuses content-less files without creating a project.
Regression: `tests/xlsxUiImport.test.jsx` (real xlsx → 52/6/14 through the UI + message mapping).

## Task H2 — reimport routing + suppliers ✅ (2026-09-11, most important)
Investigation first: the seed path was correct — a fresh import always seeded. The "98
pendings + no suppliers" came from the MATCH path: a second import of the same project
merged (by design) but merge never touched suppliers, and cross-run item keys queued
everything as pending (52 new + 44 removed + questions ≈ the reported count). Fix: new
`src/logic/reimportProject.js` orchestrator (merge diff + supplier linking via the shared
rule; `mergeEngine.js` untouched), wired into `ProjectsScreen`. `tests/reimport.test.js`
(3 tests): clean re-import, price+supplier update without dupes, new-line pending intact.

## Task H3 — tappable edit targets ✅ (2026-09-11)
The wire-up existed and was tested (G3) — users tapped the qty/price VALUES, which weren't
clickable, only the small Edit buttons. Qty + unit-cost cells now open the same
`supervisorEdit` editor (cursor pointer, larger padding, 🔒 shown inline in the cell).
No logic touched. G3's assertion updated for the new "99 🔒" cell text.

## Task I — project deletion ✅ (2026-09-11, new scope)
Two-tap Delete per project on `ProjectsScreen` ("Tap again to confirm delete") over the
existing cascading `deleteProject` (BOM, confirmations, links, log go; `GlobalSupplier`
records survive — verified). `tests/projectDelete.test.js`: cascade exact, survivor link
intact, supplier re-linkable from a new project. This is also the cleanup path for H2-style
compounded imports: delete the messy project, re-import clean.

## Task J — fresh-import e2e ✅ (2026-09-11)
`tests/e2eFreshImport.test.jsx`: brand-new project, real `.md`, first import through the UI
(not a repo call) → exactly 52 BOM / 6 confirm (all `agent_question`, zero spurious pendings)
/ 14 suppliers; then a value-cell edit persists and locks. The scenario that hid H2/H3 is
now the suite's strictest test.

## Redesign — full-scale UI/UX ✅ (2026-09-11, pipeline `material_logi_ui_ux_redesign_multi_agent_pipeline.md`)
Phases 0–5 executed with handoffs in `docs/redesign/handovers/01–07`, decision register,
summary, and QA evidence in `docs/redesign/`. Direction A (Site Ledger) locked 8.15–6.95.
Delivered: token foundation, text tabs + live Confirm badge, import progress copy, BOM
row-list with keyboardable cells, grouped Confirm, diary Dashboard, labelled search, TBD
row-list PO, "Open in WhatsApp" honesty copy, 150/120ms motion with reduced-motion kill.
Two correctness fixes from evidence: PO banner erased by tab effect (fixed + persistence
test), "Send via WhatsApp" implied sending (fixed). 34 → 43 tests (redesignUi 5,
approvePending 3, touchTargets +1). Before/after shots (8+8+2) via re-runnable
`docs/redesign/artifacts/shoot*.mjs`. Invariants all PASS (07); kill-list grep zero.
G4 physical-device run remains human-open. Primary color moved #0284c7 → #0369a1 on
computed contrast evidence (4.10 fail → 5.93 pass).

## Environment fixes (pre-existing, not pipeline scope)
- `npm install` fails with arborist `edgesOut` on this machine (vitest peer graph) → use
  `npm install --legacy-peer-deps`. Generated `package-lock.json` is committed.
- `vite build` failed: `minify: 'terser'` with terser not installed (pre-existing) → `'esbuild'`.
- `fake-indexeddb` placed in `devDependencies` (test-only).

## Explicitly NOT built (per spec)
Agent 6/7 BOM producers, multi-user backend. (PO PDF + WhatsApp landed in Task F.)

## Deployment (Vercel, 2026-09-11)
- Live: **https://material-logi.vercel.app** (production, Ready; also
  `material-logi-nart7s-projects.vercel.app`). Project `material-logi` under the
  personal Vercel scope, auto-detected as Vite (`vite build` → `dist`).
- `.npmrc` (`legacy-peer-deps=true`) added so Vercel's `npm install` avoids the
  vitest peer-graph arborist bug; `.vercel/` linkage gitignored (local only).
- Open items: Deployment Protection (Vercel Authentication) is ON — the URL serves
  an auth wall until disabled in Project Settings or opened via bypass token.
  No GitHub auto-deploy wired (project was created from local files); connect the
  repo in Project Settings → Git for push-to-deploy.
- Redeploy 2026-09-11 (md rework): 27/27 green, build green, pushed + redeployed.
- Redeploy 2026-09-11 (H1/H2/H3/I/J): 34/34 green, build green, pushed (05af8cd) + redeployed production Ready.
- Redeploy 2026-09-12 (redesign): 43/43 green, build green, pushed + redeployed production Ready (aliases repointed).

## Run
`npm install --legacy-peer-deps` · `npm run dev` · `npx vitest run` · `npx vite build`
