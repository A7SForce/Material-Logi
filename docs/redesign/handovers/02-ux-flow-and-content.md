# Handoff: 02 UX Flow & Content (Phase 1)

## Evidence inspected
- `01-product-state-audit.md` + before-screenshots; `SYSTEM_SPEC.md` §3 constraints;
  Confirm kinds in `src/data/schema.js`; gate in `src/screens/poGate.js`;
  `PoScreen.jsx` generated-vs-link states; `SuppliersScreen.jsx` browser states

## Findings / decision record
| Decision or observation | Evidence | User impact | Invariant affected | Confidence / open question |
|---|---|---|---|---|
| Primary task: "clear today's order blockers." Every screen gets exactly one primary action (see matrix) | Audit: BOM table + tiny buttons bury the edit action | One-handed triage under time pressure | None | High. No open question. |
| Confirm groups (not badges): Questions / New items / Removed items, each with consequence copy | Kinds distinct in store (`agent_question`, `new_item_pending`, `removed_item_pending`), blurred in UI | Supervisor understands Approve vs Dismiss per kind | Kinds preserved | High. Wording below. |
| Blocked PO = one pattern: count + which kinds + direct route. Kill the App-banner-plus-Confirm duplication | before-mobile-po-blocked.png double heading | No double-heading confusion | Gate truthful | High. Single blocked banner owned by PO route. |
| Dashboard change log rewritten as sentences, newest first, short dates | `import_note: null →` leak in screenshot | Reads as site diary, not database | Display only | High. |
| Recoverability copy specified per failure (matrix); destructive delete keeps two-tap + consequence line | Delete exists without consequence copy | No surprise data loss | Cascade unchanged | High. |
| State words fixed: Draft / Saved / Blocked / Ready / Generated / Opened in WhatsApp (glossary below) | Pipeline convention | No generated-vs-sent confusion | WhatsApp honesty | High. |

### Journey map (happy path + recovery)
Projects → Import (parsing… → matching… → created/merged outcome) → Dashboard (Ready or Blocked badge)
→ BOM (tap value → Draft → Save → Saved + locked) → Confirm (per-group Resolve/Approve/Dismiss →
empty → "Nothing outstanding") → Suppliers (linked list ⇄ global browser → linked) → PO
(Blocked: count + Go to Confirm · Ready: lines + Generate PO → Generated → Opened in WhatsApp).
Recovery: invalid file → specific error, stay on Projects; empty import → no project created;
save failure → stay in Draft with error; re-import skips locked with visible "kept your value";
delete → two-tap with "project data goes, shared suppliers stay".

### Screen-state matrix
| Screen/state | Purpose | Primary action | Secondary | Blocked rule | Empty/loading/error copy | Announcement |
|---|---|---|---|---|---|---|
| Projects empty | Start | Import a BOM file | — | — | "No projects yet — import a file above." | — |
| Projects importing | Feedback | Wait (input disabled) | Cancel n/a | — | "Parsing import… / Matching project… / Saving…" | aria-live progress text |
| Projects list | Choose | Open | Delete (two-tap) | — | — | "Project deleted. Shared suppliers kept." |
| Dashboard Ready/Blocked | Status | Go to Confirm (when blocked) | Review changes | Badge = live open count | "Loading project…" | Badge change announced |
| BOM list | Review + fix | Tap a value to edit | — | — | "No items yet." | — |
| BOM editing | Draft | Save + lock | Cancel | Save disabled on invalid number | "Enter a number." / "Couldn't save — still draft." | "Saved. Purchase quantity locked." |
| Confirm groups | Triage | Per-item Resolve/Approve/Dismiss | — | — | "Nothing outstanding — PO is unlocked." | Count changes |
| Suppliers | Assign | Browse all suppliers | Open directory link | — | "No suppliers linked." / "No suppliers match." | "Linked X to this project." |
| PO Blocked | Redirect | Go to Confirm (count + kinds) | — | Always when open > 0 | — | — |
| PO Ready | Order | Generate PO | — | — | "TBD" on unpriced lines | "Purchase order generated." |
| PO Generated | Handoff | Open in WhatsApp | Download again | — | — | "Opened in WhatsApp. Message not sent by the app." |

### Content inventory (exact labels)
- Saved: "Saved. {Field} locked — future imports won't overwrite it."
- Blocked: "PO blocked — {n} open ({kinds}). Resolve them on Confirm."
- Ready: "Ready — nothing outstanding. PO is unlocked."
- Generated: "Purchase order generated. Not sent."
- WhatsApp: "Opened in WhatsApp. The app did not send anything."
- Delete: "Delete {name}? Its BOM, confirmations and history go. Shared suppliers stay." + "Tap again to confirm delete."
- Groups: "Questions from the agent" / "New items from the latest import — approve to add" / "Missing from the latest import — approve to remove". Dismiss = "Dismiss (leaves the BOM unchanged)".

### Do-not-gamify list
No progress %, no streaks, no "project health score", no countdowns, no confetti on empty Confirm,
no "Ready to order: YES!" celebration — Ready is a plain factual badge. No urgency copy
("Act now", "Critical — do not delay") beyond the file's own severity words.

## Deliverables
- This file (journey, matrix, copy). Consumed by Agents 3/4/5.

## Acceptance checks run
- Every interaction above traced to an existing store transition (repos/logic) or an
  approved display-only change — no new product logic proposed.

## Risks and follow-up owner
- Copy length on 320px widths → Agent 5 keeps labels short; Agent 6 verifies at 320px.
- Receiving agents: 3 (visual), 4 (motion).
