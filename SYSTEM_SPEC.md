# Material-Logi — Consolidated System Specification

**Version:** 2.0.0 + Implementation Annex (2026-09-11)
**Upstream source:** `Material-Logi_System_Specification_v2.md` (2026-09-11, supersedes v1.0.0).
Superseded: v1.0.0 DSG-B-only design (`dsgB.js`, Quick-Kits, Coverage Validator, single-project).
**Core Philosophy:** Deterministic operations inside the app. Math and matching, not guessing.
Correctness > Speed > Feature completeness > Polish.

> **Read-this-first for agents:** this file is the single source of truth. Where it is silent,
> stop and report the gap — do not improvise. Annex B records every place the implementation
> deliberately differs from the upstream v2 text, with the decision. Do not "fix" those
> deltas back toward v2 without a new decision recorded here.

---

## 1. Data Flow (normative, from v2.0.0)

```text
[Upstream: Agent 6 (BOM Reconciliation) + Agent 7 (Grounded Sourcing)] — separate system, outside this app
▼ (.md or .xlsx, 8-section format)
[1. Import Parser] ──► format detect, all 8 sections → one common shape (ParsedImport)
▼
[2. Project Matcher] ──► match title → re-import into project; no match → auto-create (no prompt)
▼
[3. Merge Engine] ──► diff vs stored rows, respect lockedFields, queue new/removed to Confirm
▼
[4. Central Store] ──► BomItem[] per project (single source of truth per project)
├─► [5. Confirm Queue] ──► agent questions + new-item + removed-item; ALL block PO until resolved
├─► [6. Supplier Linker] ──► Global Supplier Directory ⇄ per-project links (never duplicate records)
└─► [7. Change Log] ──► append-only, every entry tagged agent- or supervisor-made
▼ (zero unresolved Confirm items)
[8. PO Generator] ──► deterministic PDF, "TBD" for missing price — never inferred (landed Task F)
▼
[9. WhatsApp Deep-Link] ──► wa.me + po.pdf (landed Task F)
```

Removed in v2 (do not reintroduce — see Kill List): Quick-Kit Injector, Coverage Validator.
Both are handled upstream by Agent 6/7 before any file reaches this app.

## 2. Contracts (normative, from v2.0.0)

**ParsedImport** — every field required, `null` if genuinely absent, never guessed:
```js
{
  projectTitle: string,   // from Master BOM header, e.g. "SURAU DARUL DAKWAH"
  bomItems: [{ item, spec, category, unit, netQty, wastagePct,
               purchaseQty, unitCost, estTotal, basis, confidence, pack, notes }],
  shortageConfirmItems: [{ severity, issue, missingInfo, confirmationRequired, owner }],
  supplierEntries: [{ businessName, contact, address, specialty, logisticsNote, sourceUrl }],
  changeLogFromAgent: [{ description }],
}
```

**Parsing (defensive):** sections found by header-text match, never fixed position.
A missing section → empty array for that section; the import still proceeds.
Merge matching: `(item name + spec)` text, case-insensitive.
Supervisor edit → field appended to `lockedFields` + `ChangeLogEntry(actor: "supervisor")`.
Agent overwrite → `ChangeLogEntry(actor: "agent")`. Locked fields are skipped silently in
storage (the skip is reported in the `MergeResult`, never written as a change).

**Storage (Dexie/IndexedDB):** `Project { id, name, location, createdAt }`,
`BomItem { …, lockedFields: string[] }`,
`ShortageConfirmItem { …, resolved: bool, kind: agent_question | new_item_pending | removed_item_pending }`,
`GlobalSupplier { …, tags }`, `ProjectSupplierLink { projectId, globalSupplierId, assignedToItemId? }`,
`ChangeLogEntry { …, actor: agent | supervisor, field, oldValue, newValue }`.

## 3. Screens (normative intent, from v2.0.0 §3)

Entry: Projects list. Inside a project, bottom tab bar: Dashboard | BOM | Confirm | Suppliers | PO.
Key constraints: Dashboard status reflects the **live** Confirm count, never cached; BOM edits lock
fields + log automatically; **PO is blocked while any unresolved Confirm item of any kind exists**;
supplier assignment creates a link, never a duplicate record; PO renders "TBD", never an inferred price.
Mobile-first: bottom-30% primary actions, deterministic progress text, specific actionable errors,
48×48px minimum tap targets.

## 4. Kill List (normative — any PR containing these is rejected)

1. Co-occurrence / "frequently bought together" suggestions.
2. Unlimited-OCR GPU backend + messy-PDF parser.
3. Variant-aware best-seen price tracking.
4. Monday Entry Generator.
5. Public Dashboard.
6. Quick-Kit auto-suggestion logic (removed v2).
7. In-app coverage math — paint/primer ratios etc. (removed v2, upstream owns it).
8. Any runtime AI call inside this app (AI lives only in upstream Agent 6/7).

---

## Annex A — Spec → Repo File Map (as built 2026-09-11)

| Spec module | Implementation | Status |
|---|---|---|
| §2.1 Import Parser (`detectFormat/mdReader/xlsxReader/normalize`) | `src/utils/importParser/` (+ `index.js`) | ✅ Done, tested vs both sample files |
| §2.2 Project Matcher | `src/logic/projectMatcher.js` (+ `src/logic/itemMatcher.js`) | ✅ Done; auto-create on no-match per spec |
| §2.3 Merge Engine | `src/logic/mergeEngine.js` (+ `seedProject.js` first-import path, `approvePending.js` Confirm actions, `reimportProject.js` match-path orchestrator: merge + supplier link) | ✅ Done, 3/3 merge cases pass |
| §2.4 Data Layer | `src/data/{db,schema,projectRepo,bomRepo,supplierRepo,shortageRepo,changeLogRepo}.js` | ✅ Done (`shortageRepo` added: schema table had no owning repo file) |
| `ProjectsList` | `src/screens/ProjectsScreen.jsx` (import + two-tap project delete) | ✅ Done |
| `FileUploader` | Import control inside `ProjectsScreen.jsx` (no separate file) | ✅ Done, see Deltas D2 |
| `Dashboard` | `src/screens/DashboardScreen.jsx` (recent changes inline = Change Log link) | ✅ Done |
| `BOMReview` | `src/screens/BomScreen.jsx` (purchase view + inline edit + 🔒 indicators; qty/price cells are tap targets) | ✅ Done, see Deltas D3 |
| `ConfirmQueue` | `src/screens/ConfirmScreen.jsx` (kind badges; Approve/Dismiss via `approvePending`) | ✅ Done, see Deltas D4 |
| `SupplierDirectory` + global browser | `src/screens/SuppliersScreen.jsx` (per-project list + searchable Global Directory browser; links run the shared `supplierLinking.js` rule) | ✅ Done (D5 closed 2026-09-11) |
| `POGenerator` + WhatsApp | `src/screens/PoScreen.jsx` (Generate PO → jspdf bytes download; wa.me link derived from PDF state, gate unchanged) + `src/logic/poDocument.js` (lines/TBD totals/PDF/link builders) | ✅ Done (D6 closed 2026-09-11) |
| PO gate rule | `src/screens/poGate.js` (`getPoGate` / `resolveTabRequest`, pure + tested) | ✅ Done |
| App shell / tab bar | `src/App.jsx` (Projects entry → 5-tab project context) | ✅ Done |
| Tests | `tests/{parser,dataLayer,mergeEngine,poGate,supplierBrowser,poPdf,touchTargets,singleSource,e2eLockedField,xlsxUiImport,reimport,projectDelete,e2eFreshImport}.test.{js,jsx}` (34/34 pass) + `tests/fixtures/` | ✅ Done |

## Annex B — Conformance Deltas (decisions, do not revert without a new entry here)

- **D1 — UI lives in `src/screens/`, not `src/components/`.** The §3 component names map 1:1 to
  the table above. Do NOT create a parallel `src/components/` tree — that duplicates tested screens.
- **D2 — No standalone `FileUploader.jsx`.** The import control lives in `ProjectsScreen` (wiring only;
  parse/match/seed decisions live in Agent 1/3 + repos). Missing sections yield empty arrays per the
  defensive-parsing contract — they are not parse failures. "Show which section couldn't be found"
  (§3) is accepted as future UI polish: surface section presence as warnings, not errors.
- **D3 — No Purchase/Audit toggle in `BomScreen`.** Purchase view only. Audit toggle is deferred
  (needs a decision on what the audit view shows beyond the Change Log link on Dashboard).
- **D4 — `ConfirmScreen` uses kind badges, not three grouped sections.** Grouping by
  `agent_question / new_item_pending / removed_item_pending` is deferred UI polish; the data
  distinction exists in `kind` and is fully tested.
- **D5 — CLOSED 2026-09-11 (Task D).** "Browse All Suppliers" browser exists in
  `SuppliersScreen`: searchable full-directory list (name/specialty/address substring covers
  region, e.g. "Kuching"; tag chips are data-driven from tags present). Tapping links via
  `src/logic/supplierLinking.js`, the single home of the dedupe rule — (name, address)
  both normalized, both must match (hardened Task E: same name in different towns stays two
  records) — shared with the import path (`seedProject` refactored onto it, behavior unchanged) — a tap can only add a
  `ProjectSupplierLink`, never a duplicate `GlobalSupplier`. `mergeEngine.js` untouched.
- **D6 — CLOSED 2026-09-11 (Task F).** PO PDF + WhatsApp landed: `poDocument.js` builds
  lines from the same `BomItem[]` (missing price → TBD, totals sum priced lines only), renders
  jspdf bytes (asserted byte-searchable in tests), `wa.me/?text=…&attachment=po.pdf` link.
  `PoScreen` exposes Generate PO only inside the already-open gate branch; `poGate.js` untouched.
- **D7 — No Zustand.** §1.2 recommends it for in-memory UI state; current screens use React
  `useState` with Dexie as the store. Decision: deferred until prop-drilling actually appears.
  Dexie (persistent) is adopted as specified.
- **D8 — CLOSED 2026-09-11 (Task G1).** All interactive elements 48×48px minimum
  (`src/index.css`; tab-bar `min-height:auto` override removed). Verified by
  `tests/touchTargets.test.jsx` (stylesheet contract + every rendered tap target).
  Honest limit: jsdom has no layout engine, so the test asserts applied CSS minimums —
  real tap feel stays in the G4 manual checklist.
- **D9 — Merge engine extras (documented, inside its layer):** re-import idempotency guard (no
  duplicate open pendings), `snapshot` payload on pending rows (powers approvals), `skippedLocked`
  reporting in `MergeResult`. None change first-run behavior specified in §2.3.
- **D10 — Single-source-of-truth review (Task G2), PASS with one fix.** Grep audit 2026-09-11:
  direct Dexie table access now exists only in `src/data/` (repos + `db.js`) — zero in
  `src/screens/` or `src/App.jsx`. The single bypass found (`SuppliersScreen` reading
  `db.globalSuppliers` directly) was fixed via new `supplierRepo.getSupplier`. All screen
  state is render-scoped (fresh repo read on every mount — tab switches remount — plus
  reload-after-every-mutation); no persistent cross-screen cache exists to drift. Guarded by
  `tests/singleSource.test.js` (static zero-bypass scan + `getSupplier` round-trip).
- **D11 — Import robustness (Task H1).** A missing `await` on async `parseXlsx` shipped a
  Promise as ParsedImport down the UI path (unit tests awaited it directly, so only the app
  crashed with "Cannot read properties of undefined (reading 'map')"). Fixed; every
  sheet/section parse resolves non-arrays to `[]`; `friendlyImportError` maps failures to
  readable messages (raw JS strings to console only); `isEmptyImport` refuses content-less
  files without creating a project. Regression: `tests/xlsxUiImport.test.jsx`.
- **D12 — Re-import links suppliers (Task H2).** The match path merged BOM rows but never
  suppliers, and cross-run re-imports queued everything as pending — the "98 pendings, no
  suppliers" report. `reimportProject.js` runs merge + shared supplier linking;
  `mergeEngine.js` untouched. Compounded state is cleaned via project delete (Task I).
- **D13 — Project deletion (Task I, new scope).** Two-tap Delete on `ProjectsScreen` over
  cascading `deleteProject` (own rows go; shared `GlobalSupplier` records survive).

## Annex C — Agent Work Queue (ordered; Phase 2–4 done, verified 34/34 + prod build green)

1. **~~Delete dead v1 files~~ DONE 2026-09-11 (Task B):** `src/utils/excelParser/dsgB.js`,
   `src/data/structuralKits.js`, `src/utils/coverageRules.js` deleted (empty parent dirs removed).
   `QuickKitPrompt.jsx` / `CoverageGate.jsx` never existed — verified absent. Zero references
   remain in `src/` + `tests/`; tests + build green. Phase 5 "zero Kill List items" audit passes
   on presence.
2. **~~Phase 4~~ DONE 2026-09-11 (Task F):** PO PDF (`poDocument.js` TBD-rendering, byte-asserted) + WhatsApp deep-link.
3. **Deferred UI polish:** D2 section warnings, D3 audit toggle, D4 grouped Confirm sections.
4. **Phase 5 audit:** D8 48px ✅ (automated proxy; real feel in G4) · single-source review ✅
   (D10) · UI-driven locked-field re-import ✅ (`tests/e2eLockedField.test.jsx`) ·
   **OPEN: G4 one-thumb physical-device test — human-run, checklist in BUILD_PROGRESS.**
5. **Adopt Zustand only if** a screen starts prop-drilling (D7); do not pre-empt.

## Annex D — Sources & Supersession

- Upstream normative: `Material-Logi_System_Specification_v2.md` (Downloads, 2026-09-11).
  Superseded: v1.0.0 (`Material-Logi_System_Specification.md`, DSG-B-only world).
- Execution plan: `logistics_helper_v3_build_pipeline.md` (5-agent split; consistent with this spec).
- Build record: `BUILD_PROGRESS.md` (measured fixture table, test results, env fixes).
- Ground-truth fixtures: `tests/fixtures/Qwen_markdown_20260910_k171vvnlq.md`,
  `tests/fixtures/Surau_Darul_Dakwah_BOM_A7_Grounded_Sourcing.xlsx` — a true same-run pair
  (one Agent 6/7 run 2026-09-10, 52/6/14/5 in both; `parser.test.js` asserts deep equality).
  Plus `tests/fixtures/Surau_Darul_Dakwah_BOM.md` — pandas-export variant of the same project
  (title/metadata rows above header, 6 sections; 52/6 parsed, regression-locked, not
  deep-equal to Qwen by wording).

> *"A site supervisor drops the reconciled file, sees which of their projects it belongs to,
> resolves any open questions the agent flagged, taps through supplier assignment, generates a PO,
> and sends it — without the app ever asking them to trust a guess, without a shortage surfacing
> after the fact, and without a hand-edited number ever silently reverting."*
