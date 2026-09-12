# Handoff: 04 Interaction & Motion Spec (Phase 2, Agent 4)

## Evidence inspected
- `02` matrix (Draft/Saved/Blocked/Ready/Generated handoff); current screens (instant,
  unannounced state swaps; `busy` disables input with no text; no transitions anywhere)

## Findings / decision record
| Decision or observation | Evidence | User impact | Invariant affected | Confidence / open question |
|---|---|---|---|---|
| Motion only answers: where did content go / what changed / is it working | Zero-motion baseline | No decorative motion to unpick | None | High. |
| Tab switches are instant (state change, not a journey) | Tab bar swaps screens | Feels immediate, never misleading | None | High. |
| Storage actions: pending label → Saved notice only after write + refreshed read | Save currently swaps silently | "Saved" always means persisted + visible | Saved honesty | High. |
| Reduced-motion: every pattern has an instant alternative via media query + no-JS-motion default | No existing motion | Accessible by default | None | High. |
| Banned: confetti, scores, streaks, countdowns, completion effects, animated "success" ticks | — | No unverified-data celebration | All | High. |

### Pattern specs
| Pattern | Motion | Duration/easing | Interruption | Reduced-motion |
|---|---|---|---|---|
| Edit panel open (BOM) | Slide-down + focus to input | 150ms ease-out | New tap retargets | Instant, focus still moves |
| Save | Button label → "Saving…", then Saved notice appears | Text swap only | Latest write wins; stale notice replaced | Same (text only) |
| Tab switch | None (instant) | — | — | — |
| Import progress | Text steps: "Parsing import…" → "Matching project…" → "Saving…" (aria-live polite) | Text only | — | Same |
| Browser open / delete arm | Instant label/panel swap | — | — | — |
| Banner/notice appear | Fade 120ms (decorative only; text present immediately for SR) | 120ms ease-out | — | Instant |

### Rules
- `Saved` renders only after the repo write resolves AND the refreshed value displays.
- `aria-live="polite"` on: import progress, save notices, badge/count changes, link confirmations.
- `@media (prefers-reduced-motion: reduce)`: all transitions/animations off (single global rule).

## Deliverables
- This file. Agent 5 implements; Agent 6 verifies with reduced-motion emulation + keyboard.

## Acceptance checks run
- Each pattern mapped to a real state in `02`; no pattern implies persistence.

## Risks and follow-up owner
- Over-animation creep in polish slice → forbidden list enforced at Gate D per slice.
- Receiving agent: 5 (implementation).
