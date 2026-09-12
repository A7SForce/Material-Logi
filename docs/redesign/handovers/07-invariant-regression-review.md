# Handoff: 07 Invariant & Regression Review (Phase 4, Agent 7)

## Evidence inspected
- Full suite 43/43 + build; adversarial paths below re-run against the redesigned UI;
  kill-list grep over `src/` (zero hits); `mergeEngine.js`/`poGate.js`/parser diffs: none

## Findings / decision record
| # | Adversarial path | Evidence | Verdict |
|---|---|---|---|
| 1 | MD and XLSX fresh imports, equivalent visible outcomes | parser deep-equal (52/6/14/5) + e2eFreshImport (md UI) + xlsxUiImport (xlsx UI counts) | PASS |
| 2 | Matched re-import retains locks; skips visible without implying overwrite | e2eLockedField (UI: value holds, supervisor + agent log exact, no agent purchaseQty entry); merge status line reports locked-skipped count | PASS |
| 3 | Every Confirm kind blocks PO; last resolve opens the real gate | poGate tests (unit + seeded-sample redirect + resolve-all-opens); approvePending tests (3 kinds apply correctly) | PASS |
| 4 | Supplier linking reuses global record; same name + different address stays distinct | supplierBrowser tests (incl. ABC Hardware towns case) | PASS |
| 5 | Missing price shows TBD; totals only priced rows | poPdf byte assertions; PoScreen renders from the same buildPoLines as the PDF | PASS |
| 6 | Generated vs WhatsApp-handoff vs sent not conflated | Copy fixed: "Purchase order generated. Not sent." + "opens a chat link — the app does not send anything" + "Open in WhatsApp" button | PASS (was FAIL in baseline wiring — "Send via WhatsApp") |
| 7 | No forbidden feature or runtime AI call | grep `fetch\(|XMLHttpRequest|OpenAI|openai|anthropic|gemini|gpt-|co-occur|frequently bought|best-seen|ocr|tesseract|Monday` over `src/`: zero hits | PASS |
| 8 | Bonus find (not adversarial): PO-blocked banner erased by tab-change effect | Probed via Playwright (banner absent after redirect); fixed (effect no longer clears notice); redesignUi asserts persistence past a tick | PASS after fix |

## Deliverables
- This file. No restyling edits made (one copy fix + one effect fix, both covered by tests).

## Acceptance checks run
- `npx vitest run` → 15 files, 43 passed; `npx vite build` → green
- Kill-list grep (command above): zero hits

## Risks and follow-up owner
- None open. Receiving agent: 8 (Integrator).
