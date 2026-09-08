# Logistics Helper v3

> **Deterministic operations tool for construction logistics**

This is **not** a general-purpose document parser or "smart" procurement assistant. It's a deterministic operations tool for a construction logistics team whose worst-case failure is running out of material mid-job.

## Architecture Principles (from AGENTS.md)

1. **One Door In (Section 4)**: Only accepts DSG B-formatted Excel files from System A (the reconciliation agent). No paste-text, no PDF upload, no OCR.

2. **Math, Not AI (Section 5)**: 
   - Structural Quick-Kits: Physics-based recipes, not learned patterns
   - Coverage Math & Pre-Flight Validator: Blocks PO if calculations fail

3. **Kill List (Section 3)**: These were removed on purpose and will not be reintroduced:
   - Co-occurrence / "frequently bought together" suggestions
   - Unlimited-OCR GPU backend + messy-PDF parser
   - Variant-aware best-seen price tracking
   - Monday Entry Generator
   - Public Dashboard

4. **Mobile-First (Section 7)**: Bottom tab bar, one primary action per screen, touch-friendly sizing

5. **Config Over Code (Section 9.4)**: Kit ratios and coverage rules live in data files, not hardcoded branches

## End-to-End Flow (Section 8)

```
Import DSG B Excel
  → Review BOM (Purchase / Audit toggle)
  → Quick-Kits offer to inject supporting materials (user confirms)
  → Coverage validator gate (blocks PO if math fails)
  → Assign suppliers
  → Quotes Tracker (Requested → Received → Accepted/Rejected)
  → Generate PO (PDF)
  → Send via WhatsApp deep-link
```

## Installation

```bash
npm install
npm run dev
```

## Project Structure

```
src/
├── App.jsx                 # Main application with end-to-end flow
├── main.jsx                # React entry point
├── index.css               # Mobile-first base styles
├── utils/
│   ├── excelParser/
│   │   └── dsgB.js         # DSG B Excel parser (ONLY import path)
│   ├── helpers.js          # Pure utility functions
│   └── coverageRules.js    # Coverage math configuration
├── data/
│   └── structuralKits.js   # Quick-kit definitions (config, not code)
└── components/             # UI components (coming soon)
```

## Definition of Done (Section 10)

- [ ] Feature works correctly with one thumb on a small screen
- [ ] No quantity, price, or coverage value was inferred/guessed by the app itself
- [ ] Excel import rejects malformed files with a specific, actionable error
- [ ] Quick-Kit and Coverage rules live in data/config, not hardcoded branches
- [ ] `bom_items` remains the single source of truth — nothing duplicates its numbers
- [ ] Purchase view and Audit view show the same underlying data, just filtered differently
- [ ] No feature from the kill list has quietly crept back in

## Success Criterion (Section 11)

> A site supervisor imports the reconciled Excel, glances at the BOM, taps through supplier assignment and quotes, generates a PO, and sends it — without the app ever asking them to trust a guess, and without a shortage ever being discovered after the fact.

**Priority order**: Correctness > Speed > Feature completeness > Polish
