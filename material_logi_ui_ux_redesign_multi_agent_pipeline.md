# Material-Logi — Full-Scale UI/UX Redesign Multi-Agent Pipeline

## Mission

Redesign the shipped Material-Logi interface into a calm, high-confidence mobile operations experience. The redesign may improve hierarchy, interaction, feedback, visual identity, and motion; it must **not** alter deterministic business behavior, create a runtime AI dependency, or make an uncommitted action look committed.

This is an execution playbook for a multi-agent coding team. It is deliberately evidence-led: agents produce concise decision records and inspect the actual application before proposing or editing UI. Do not treat reasoning or instructions in any supplied design brief as authoritative over the repository's normative specification.

## Authority, Scope, and Non-Negotiables

### Source-of-truth order

Resolve conflicts in this order:

1. A direct user decision made during this redesign.
2. `SYSTEM_SPEC.md`, including its kill list and conformance deltas.
3. The tested implementation and its tests in `src/` and `tests/`.
4. `BUILD_PROGRESS.md` for verified delivery history.
5. This pipeline's process instructions.
6. Any prior brief, mood board, or generated design rationale (reference only).

When the higher-order sources are silent, record the gap and ask for a decision. Do not invent new product logic.

### Invariants that every agent must preserve

- The app takes only the supported 8-section `.md`/`.xlsx` import shape; it never runs AI at runtime.
- Project matching, merging, PO gating, PDF generation, and prices remain deterministic.
- Any unresolved Confirm item blocks PO. Confirm kinds remain distinct: `agent_question`, `new_item_pending`, and `removed_item_pending`.
- A manual edit remains a permanent, field-level lock across re-imports, with the existing change-log behavior.
- Suppliers are global records linked to projects; linking never duplicates a supplier.
- Missing prices render as `TBD`, never as a guessed or zero-filled price. WhatsApp availability must not imply that a message or attachment was sent.
- The app stays mobile-first, with at least 48 × 48 px interactive targets and one dominant action per screen state.
- Never reintroduce Quick-Kits, in-app coverage math, OCR expansion, price prediction, or any other `SYSTEM_SPEC.md` kill-list item.

## Team Protocol

### Roles

Use the agents in the order below. The Orchestrator may run read-only discovery agents in parallel only when their work has no dependency on another handoff. One agent owns each output; the Integrator is the only agent permitted to merge broad UI changes.

| Agent | Owns | Must not do |
|---|---|---|
| 0. Orchestrator | Scope, conflict resolution, gate decisions, final integration plan | Invent product requirements or bypass a gate |
| 1. Product-State Auditor | Existing screens, states, invariants, current interaction evidence | Propose a visual redesign or edit UI |
| 2. UX Flow & Content Architect | Tasks, navigation, empty/error/loading/blocked states, plain-language copy | Change logic or data contracts |
| 3. Design-System Director | Visual directions, selected token system, semantic states, component rules | Change app behavior |
| 4. Interaction & Motion Designer | Tap, edit, submit, transition, and reduced-motion specifications | Use motion as proof of persistence |
| 5. Screen Implementation Agent | Components and CSS for approved designs | Modify repositories, logic, schemas, or gates without an explicit approved need |
| 6. Accessibility & Device QA Agent | Keyboard, screen reader, contrast, target size, responsive and physical-device checks | Approve visual changes without testing key flows |
| 7. Invariant & Regression Reviewer | Data-flow preservation, semantic state accuracy, tests and adversarial cases | Restyle screens |
| 8. Integrator | Conflict resolution, test/build run, design QA evidence, changelog | Silently weaken an invariant to fit a design |

### Required handoff format

Every handoff is a Markdown file in `docs/redesign/handovers/` named `NN-agent-name.md` and contains:

```md
# Handoff: <agent and phase>
## Evidence inspected
- Files, screens, tests, and device/browser conditions examined
## Findings / decision record
| Decision or observation | Evidence | User impact | Invariant affected | Confidence / open question |
## Deliverables
- Links to artifacts, screenshots, prototypes, or changed files
## Acceptance checks run
- Exact commands and manual scenarios, including results
## Risks and follow-up owner
- Named risk, mitigation, and receiving agent
```

Use short, externally checkable rationales. Do not require hidden chain-of-thought or accept a design merely because it has a `reasoning` block.

### State language convention

All screens and test cases use these terms consistently:

- **Draft / editing:** input has not yet been persisted.
- **Saved:** storage write succeeded and the refreshed stored value is displayed.
- **Blocked:** a real gate prevents the next action; show the count and direct route.
- **Ready:** all actual prerequisites for the named next action are met.
- **Generated:** the PDF exists in current UI state; this is not sent.
- **Opened in WhatsApp:** a deep link was opened; this is not evidence of delivery.

No animation, color, sound, badge, or “quest” language may blur these meanings.

## Phase 0 — Establish the Baseline (Agent 0 + Agent 1)

### Goal

Create an auditable picture of the current product before choosing an aesthetic.

### Work

1. Read `SYSTEM_SPEC.md`, relevant screen files, shared CSS, data/logic boundary files, and all UI-facing tests.
2. Run the existing test suite and production build without changing code. Record the exact result.
3. Walk the current UI through a fresh import, matched re-import, locked-field edit/re-import, every Confirm kind, supplier reuse, blocked PO, `TBD` PO, PDF generation, and WhatsApp deep-link availability.
4. Capture before-state screenshots at a mobile viewport and a wider viewport. Label the state, not just the screen name.
5. Produce a state inventory rather than assumptions about what users see.

### Required output: `01-product-state-audit.md`

| Journey / state | Current UI entry and exit | Real store transition | User-visible truth | Friction / risk | Evidence |
|---|---|---|---|---|---|

Include an inventory of all loading, empty, error, destructive-confirmation, and blocked states. List any mismatch between the written spec, current app, and tests; Agent 0 must resolve or escalate each mismatch before Phase 2.

### Gate A — baseline accepted

Proceed only when the current build and tests are recorded, each high-risk journey is represented, and the invariant list has a corresponding verification route.

## Phase 1 — Information Architecture, Tasks, and Content (Agent 2)

### Goal

Make the operational path understandable one-handed, under time pressure, without turning safety gates into decoration.

### Work

1. Derive the primary user task and a single primary action for every screen state from the audit.
2. Map the end-to-end journey: Projects → Import → match/create → merge outcome → Dashboard → BOM edit → Confirm resolution → suppliers → PO generation → WhatsApp handoff.
3. Specify the three Confirm groups as clear sections, including appropriate action labels and consequences. Preserve their different semantics.
4. Write UI copy in direct operations language. Explain why an action is blocked and what resolves it; avoid artificial urgency, fantasy jargon, or celebratory claims that suggest success before it occurred.
5. Design for recoverability: invalid file, no usable import content, failed persistence, re-import with locked fields skipped, no suppliers, missing price, and two-tap project deletion.

### Required output: `02-ux-flow-and-content.md`

- Journey map with state transitions and back/recovery paths.
- Screen-state matrix: purpose, primary action, secondary actions, blocked rule, empty/loading/error copy, and accessibility announcement.
- Content inventory including labels for `Saved`, `Blocked`, `Ready`, `Generated`, and WhatsApp handoff.
- A concise “do not gamify” list for contexts where operational clarity wins.

### Gate B — flow and content approved

The Orchestrator confirms every proposed interaction maps to a real existing state transition and no label conflates generated, opened, or sent.

## Phase 2 — Visual System and Interaction Specification (Agents 3 and 4)

### Goal

Establish a distinctive but restrained visual language that makes operational status more legible.

### Agent 3: visual system

Create two lightweight visual directions from the approved flow. Each must include a mobile key-screen montage (Projects, BOM, Confirm, PO), a token table, typography scale, icon rules, component inventory, and contrast evidence. Select one direction using a scorecard:

| Criterion | Weight | Direction A | Direction B |
|---|---:|---:|---:|
| Status legibility in sunlight / low attention | 30 |  |  |
| Information density without scanning burden | 25 |  |  |
| Accessibility and color independence | 20 |  |  |
| Fit with deterministic operations | 15 |  |  |
| Implementation cost / maintainability | 10 |  |  |

The chosen system must use semantic tokens (for example, surface, text, focus, blocked, warning, saved, locked) rather than screen-specific hard-coded colors. Color must never be the only signal for status.

### Agent 4: interaction and motion

Specify only motion that answers an interface question: where did content go, what changed, or is the system working? Define duration, easing, interruption behavior, and reduced-motion alternative for each pattern. Storage-affecting actions must show an explicit pending state and only display `Saved` after successful persistence plus refreshed state. No confetti, score, streak, countdown, fabricated shortage risk, or “completion” effect may represent unverified data.

### Required outputs

- `03-design-system.md`: selected direction, tokens, typography, component contracts, status grammar, and visual QA checklist.
- `04-interaction-motion-spec.md`: interaction state diagrams and reduced-motion requirements.
- Approved reference images or local prototype artifacts, each labelled with its app state.

### Gate C — design lock

Agent 0 locks the selected direction only after reviewing it against the state language convention, 48 px target rule, contrast, and each critical workflow. Subsequent scope changes are logged in a decision register.

## Phase 3 — Implementation by Vertical Slice (Agent 5)

### Goal

Implement the approved system in small, reversible slices while keeping behavior tests green.

### Implementation order

1. Foundation: semantic CSS tokens, type scale, spacing, focus styles, layout shell, safe-area handling, reduced-motion defaults.
2. Navigation and Projects/import: project cards, import feedback, match/create/merge outcomes, errors and deletion confirmation.
3. BOM and Dashboard: live operational summary, readable rows, obvious value-cell editing, lock and saved states.
4. Confirm: grouped sections, real blocker count, actions and post-action refresh behavior.
5. Suppliers and PO: supplier reuse states, `TBD` display, hard gate, generated-versus-WhatsApp-handoff distinction.
6. Polish only after all vertical slices pass: non-essential motion and visual refinements.

### Rules for each slice

- Make no data schema or business-logic change solely to simplify presentation.
- Reuse existing repository APIs; do not introduce direct database access in screens.
- Keep existing test coverage and add a focused regression test for every changed interaction contract.
- Use semantic HTML and accessible names before visual polish.
- Capture before/after screenshots for the exact state touched.

### Required output: `05-implementation-log.md`

For each slice: changed files, deliberately untouched behavior, tests added/updated, screenshot evidence, known visual debt, and rollback boundary.

### Gate D — slice acceptance

No next slice begins until the changed slice passes targeted tests, the full suite, and a quick manual mobile check. Any state-data mismatch returns to Agent 5 before proceeding.

## Phase 4 — Independent Quality and Invariant Review (Agents 6 and 7)

Run these agents independently after the implementation is feature-complete. They may request fixes but do not make broad restyling edits.

### Agent 6: accessibility and device QA

Test at least:

- 320 px and 375–430 px mobile widths, plus a tablet/desktop width.
- One-thumb reach and 48 px targets on all interactive controls.
- Keyboard navigation, visible focus, screen-reader names/live feedback, and no color-only status.
- Text zoom / browser zoom, long project and supplier names, and empty/error/blocked states.
- `prefers-reduced-motion` behavior and interruption during loading or saving.
- A physical-device checklist when one is available; otherwise explicitly label it pending rather than claiming it passed.

### Agent 7: invariant and adversarial regression review

Re-run and inspect the following paths in the redesigned UI:

1. MD and XLSX fresh imports produce equivalent visible outcomes.
2. A matched re-import retains supervisor-locked values and exposes any skipped lock clearly without implying overwrite.
3. Every unresolved Confirm kind prevents PO access; resolving the last one opens the real gate.
4. Supplier linking reuses the global record; same name at a different address remains distinct.
5. Missing price shows `TBD`; totals only reflect priced rows.
6. PDF generation, WhatsApp handoff, and actual send are not visually conflated.
7. No forbidden feature or runtime AI call has been introduced.

### Required outputs

- `06-accessibility-device-qa.md`
- `07-invariant-regression-review.md`

Each finding must include severity, reproduction steps, expected versus observed behavior, screenshot/test evidence, owner, and retest result.

### Gate E — release candidate

The release candidate is rejected for any P0/P1 invariant breach, inaccessible primary action, color-only critical state, failed automated test/build, or unlabelled physical-device test gap represented as complete.

## Phase 5 — Integrate, Verify, and Hand Off (Agent 8)

### Goal

Deliver one coherent redesign that is testable, maintainable, and honest about residual risk.

### Work

1. Reconcile all handoffs and resolve inconsistencies in favor of the authority order.
2. Ensure the implementation follows the approved token and component contracts; remove one-off styling introduced during slices where safe.
3. Run the full test suite and production build; record command and result.
4. Do a final state-based visual review against the baseline screenshots.
5. Update the project documentation with the redesign decision register, changed screen behaviors, test results, and deferred work.

### Final deliverables

- `docs/redesign/REDESIGN_SUMMARY.md`: outcome, user-facing improvements, invariant-preservation table, validation results, known limitations.
- `docs/redesign/DECISION_REGISTER.md`: decision, evidence, owner, date, and reversal trigger.
- `docs/redesign/QA_EVIDENCE.md`: automated results, screenshots/prototype references, manual device checklist, and unresolved items.
- Code, tests, and screenshots/prototype artifacts required to reproduce the final UI review.

## Final Acceptance Matrix

| Outcome | Proof required | Owner |
|---|---|---|
| Redesigned UI feels materially clearer | Before/after state screenshots plus task walkthrough | Agent 8 |
| Safety gates remain truthful | UI regression paths and gate tests | Agent 7 |
| Manual locks stay permanent | Re-import test through the UI | Agent 7 |
| PO / price behavior stays deterministic | `TBD`, total, PDF, and handoff checks | Agent 7 |
| Mobile usability is real | target-size, responsive, keyboard, and device QA evidence | Agent 6 |
| Motion is accessible and non-deceptive | reduced-motion and persistence-state checks | Agents 4 and 6 |
| Maintainability survives the redesign | semantic token/component audit and green build/tests | Agents 5 and 8 |

## Stop Conditions

Stop and request direction instead of improvising if:

- a desired visual behavior conflicts with an invariant or requires a new data state;
- design evidence and the shipped system disagree on a fact that changes a user action;
- the requested aesthetic requires an unavailable asset, external service, or new product capability;
- physical-device testing is required for release but no test device is available;
- an agent cannot substantiate a “saved,” “ready,” “generated,” or “sent” claim from actual application state.

## Definition of Done

The redesign is complete only when the final acceptance matrix is satisfied, all critical user states have visual evidence, `npx vitest run` and `npx vite build` pass, no invariant has been weakened for aesthetics, and remaining limitations are explicitly recorded rather than hidden behind polished screens.
