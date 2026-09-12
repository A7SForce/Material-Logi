# Handoff: 03 Design System (Phase 2, Agent 3)

## Evidence inspected
- `01` audit (unreadable BOM table, borderless buttons, emoji tabs, leaked internals);
  `02` flow/matrix/copy; before-screenshots; `src/index.css` (inline-style sprawl)

## Findings / decision record
| Decision or observation | Evidence | User impact | Invariant affected | Confidence / open question |
|---|---|---|---|---|
| Two directions evaluated, one selected (scorecard below) | Audit frictions | Single coherent language | None | High. Locked at Gate C. |
| Semantic tokens replace screen-specific colors; status always pairs tint + word/symbol | Color-only risk in badges | Sunlight-legible status | None | High. |
| Emoji tab icons removed; text labels + live Confirm count badge | Tofu glyphs in headless shots; tiny labels | Navigation readable everywhere | Count = live, never cached | High. Badge reads store on every render. |
| Minimum copy size 0.875rem (kills 0.75rem microcopy); tabular numerals for money | BOM screenshot density | Readable rows, aligned totals | None | High. |
| Unicode status marks (🔒/⛔/✓) kept as accompaniments only; words carry meaning | Existing tests assert lock text | No tofu-only status | None | High. |

### Direction scorecard (weights per pipeline)
| Criterion | Weight | A: Site Ledger (ink/paper, banded status, big rows) | B: Calm Ops (refined current palette, soft badges) |
|---|---|---|---|
| Status legibility in sunlight / low attention | 30 | 9 — thick bands + words | 6 — soft badges wash out |
| Information density without scanning burden | 25 | 8 — one row per item, generous targets | 7 — table kept, tightened |
| Accessibility and color independence | 20 | 8 — bands + labels | 8 — same grammar applied |
| Fit with deterministic operations | 15 | 9 — ledger = record-keeping | 6 — generic SaaS calm |
| Implementation cost / maintainability | 10 | 6 — more CSS rework | 9 — closer to current |
| **Weighted total** | 100 | **8.15** | **6.95** |

**Selected: A (Site Ledger), keeping B's slate hues.** Borrowed restraint: current `--primary/success/warning/error` hues stay; A contributes bands, row-lists, text tabs, type scale.

### Token table (implemented in `src/index.css`)
| Token | Value | Use |
|---|---|---|
| `--bg` | #f1f5f9 (slightly deeper for sunlight contrast) | App background |
| `--surface` | #ffffff | Cards, sheets |
| `--text` | #0f172a | Primary text |
| `--text-muted` | #475569 (darkened from #64748b for 4.5:1 on white) | Secondary text |
| `--border` | #cbd5e1 | Dividers, card edges |
| `--primary` / `--primary-dark` | #0369a1 / #075985 (white-on-primary 5.93:1; #0284c7 at 4.10:1 fails AA for text/fill and is retired from those uses) | Primary actions, active tab, links |
| `--focus` | 3px solid #0284c7 outline + offset | Visible keyboard focus, all interactives |
| `--blocked-bg` / `--blocked` | #fee2e2 / #b91c1c | Blocked banner band + text |
| `--warning-bg` / `--warning` | #fef3c7 / #92400e | Pending/lock accents |
| `--saved` | #15803d | Saved confirmations |
| `--tbd` | #475569, bold, letterspaced | TBD marker (never a price color) |
| Type | h1 1.75rem/700, h2 1.25rem/700, body 1rem/1.5, small 0.875rem min, money `font-variant-numeric: tabular-nums` | Hierarchy + aligned totals |

### Component contracts
- **Button**: primary (filled `--primary`, white text), secondary (surface, 2px `--border`), danger-ghost (red text, red border, used for Delete arm). All 48px+, visible focus, `disabled` dims + `aria-disabled` state. Labels are verbs ("Save + lock", "Go to Confirm").
- **Badge**: severity/status/kind chips — tinted band + WORD ("Medium", "New item", "6 open"). Never color alone.
- **Banner**: blocked (`--blocked-bg`, "PO blocked — N open…"), notice (neutral), error (blocked styling + recovery copy).
- **Row-list**: BOM/supplier rows as stacked cards — name (strong), meta line, values right-aligned tabular, whole value area tappable, lock shown as "Locked" word + mark.
- **Tab bar**: text labels (no emoji), active = `--primary` + 3px top indicator; Confirm carries live count badge ("Confirm · 6").

### Visual QA checklist
- [ ] No emoji-only affordances; no 0.75rem copy; money tabular everywhere
- [ ] Every status has word + tint; focus visible on all interactives via keyboard
- [ ] Contrast pairs computed (see 06): text/surface, muted/surface, primary/white, blocked, warning

## Deliverables
- This file. Implemented by Agent 5 (tokens → `src/index.css`, components → screens).

## Acceptance checks run
- Scorecard above; direction locked at Gate C against state language, 48px rule, contrast plan.

## Risks and follow-up owner
- Bigger rows = more scroll on 52-line BOM → accepted (scanning burden beats tap errors); Agent 6 checks.
- Receiving agents: 4 (motion), 5 (implementation).
