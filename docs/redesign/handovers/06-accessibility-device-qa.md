# Handoff: 06 Accessibility & Device QA (Phase 4, Agent 6)

## Evidence inspected
- After-shots: 390px journey (7), 1280px (2), 320px dashboard + confirm;
  `src/index.css` token/focus/motion rules; `tests/touchTargets.test.jsx`,
  `tests/redesignUi.test.jsx`; computed contrast pairs (script output below)

## Findings / decision record
| Decision or observation | Evidence | User impact | Invariant affected | Confidence / open question |
|---|---|---|---|---|
| 320px + 390px + 1280px render without overlap; long supplier names wrap | after-320-*.png, after-mobile-*.png, after-desktop-*.png | Small-phone usable | None | High. Full-page shots show fixed tab bar overlapping mid-scroll — artifact of fullPage capture, real-phone padding is 6rem. |
| Every interactive meets 48px (buttons, inputs, tab buttons, role=button cells, a.btn) | touchTargets 5/5 (stylesheet + rendered, all screens + tab bar) | One-thumb taps land | None | High. |
| Keyboard: native buttons free; value cells Enter/Space tested; visible 3px focus on all interactives | redesignUi keyboard test; `:focus-visible` rule test | Keyboard-only operation possible | None | High. |
| Names: tabs labelled, badge announces "N open confirmations", cells labelled with current value, progress/notices role=status, destructive arm has consequence text | redesignUi + implementation | Screen-reader operable | None | High. |
| No color-only status: badges/banners pair tint + words; TBD bold + letterspaced neutral | Shots; `.tbd`, `.badge`, `.banner` rules | Sunlight / color-vision safe | TBD honesty | High. |
| Contrast (computed, AA normal text ≥ 4.5): text/surface 17.85, muted/surface 7.58, white/primary#0369a1 5.93, blocked 5.30, warning 6.37, saved 5.02 — all pass; retired #0284c7-as-text (4.10 fail) | node contrast script | Legible body + actions | None | High. |
| Reduced-motion: single global kill rule, tested present; not emulated in a browser | CSS test; no emulation run | Motion-sensitive users get instant UI | None | Medium. Emulation = follow-up if a browser harness lands. |
| Physical device (G4): NOT run by an agent — pending, checklist in BUILD_PROGRESS | — | One-thumb feel unverified | None | Open: human run required at Gate E. |

## Deliverables
- This file + after-shots + contrast table above.

## Acceptance checks run
- `npx vitest run tests/touchTargets.test.jsx tests/redesignUi.test.jsx` → green (in full suite)
- Chromium 320/390/1280 walkthroughs with real import flow (shoot.mjs, shoot320.mjs)

## Risks and follow-up owner
- Fixed tab bar + bottom content on short viewports → container padding covers; verify on G4 run.
- Receiving agent: 8 (Integrator).
