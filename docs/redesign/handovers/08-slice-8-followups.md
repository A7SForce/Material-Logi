# Handoff: 08 Slice-8 Follow-Ups (Tickets 1–6)

## Evidence inspected
- Refreshed after-shots (10 files, current main incl. D18); severity/contact value sets
  from all four fixtures; computed contrast pairs; full suite + build

## Findings / decision record
| Ticket | Decision / outcome | Evidence | Invariant | Confidence |
|---|---|---|---|---|
| T6 evidence first | Re-shot all 10 on current main; D18 file-picker confirmed fixed; shoot.mjs needed exact-text repair (picker labels now contain item names) | after-*-*.png timestamps | None | High |
| T1 NULL contacts | Conditional render (`null`/blank/`"NULL"` → "Contact not listed"); never raw stored value | after-mobile-suppliers.png (5 cases); new test in supplierCsvUi | Display only | High |
| T2 severity tints | Value set is {LOW, MEDIUM, HIGH, INFO} in mixed case. LOW gray, MEDIUM amber, HIGH red pair, INFO default; lookup case-normalized (previously most badges fell through to default) | Fixture sweep; contrast 8.40 / 6.37 / 5.30 computed | No color-only (words stay) | High |
| T3 locked/pending split | `.badge.locked` cool blue (7.15) vs warm pending tints; LOW-vs-locked was the real collision (both default white) | Contrast + class-contract test | None | High |
| T4 desktop grid | `@media (min-width:1024px)` re-flows `.rowlist` to auto-fill grid; markup untouched | Stylesheet contract test + 1280 re-shots | Presentational | High |
| T5 category view | Display-only grouping; toggle Suppliers/Category/All; **default stays Suppliers** (deviation from ticket's flat-default recommendation: fast-ordering shipped grouped-default first and the 1-minute flow depends on it — flipping would regress it; one line to change if overruled). Reorder/merge/storage untouched | bomCategoryView tests (no drops, flat reproduces displayOrder, storage re-read clean) | displayOrder invisible to merge (D14) preserved | High |
| Testing limits hit | jsdom does not resolve `var()` colors — tint contracts assert classes + literal-valued computed pairs; contrast proven by computation (06 pattern) | Failing-then-passing test run | None | Documented, not hidden |

## Deliverables
- Code: SuppliersScreen conditional, index.css (3 tints + locked + breakpoint), ConfirmScreen case map, BomScreen view modes; tests: +1 supplierCsvUi, +2 touchTargets, +1 bomCategoryView
- Shots: refreshed 10 + 320px pair

## Acceptance checks run
- Full suite 104/104 + build green; per-ticket tests listed above

## Risks and follow-up owner
- None open. G4 physical-device run still human-open (unchanged).
