# Phase 2 — System Architecture: NAQIB Daily Bot v2

**Status:** Draft, awaiting your sign-off before Phase 3 (System Building)
**Supersedes:** `lh_bot_6a` (Lane 6a) and `teleport` (NAQIB Weekly Report Bot) — both retired once this ships
**Lives in:** Material-Logi v3 repo, as its own extension lane (own folder, own deploy target)
**Read this like:** a blueprint for an AI coding agent to build from — every section below becomes a task.

---

## 1. The One-Sentence Objective

One Telegram bot that collects Naqib's day in small, easy chunks, tracks project items as they move through production, and turns a week of that into a formal AI-written report.

---

## 2. The Big Picture (how the pieces talk)

Think of this like a **restaurant kitchen ticket system**:
- Small tickets come in all day (the chunks) — easy to handle one at a time.
- A running order board (persistent Item Progress) tracks what's cooking, what's ready, what's paid.
- At the end of the week, someone writes up a summary of the whole week's service (the AI weekly report).

```
Telegram (Naqib)
      │
      ▼
┌─────────────────────────────┐
│   NAQIB Daily Bot v2         │
│   (single Python process,    │
│    polling — no inbound port)│
├─────────────────────────────┤
│  Scheduler  →  fires touch-  │
│  points at fixed KL times    │
├─────────────────────────────┤
│  Conversation Engine  →      │
│  asks questions, one at a    │
│  time, tracks what's answered│
├─────────────────────────────┤
│  Data Store (JSON files)  →  │
│  daily answers, item state,  │
│  project list                │
├─────────────────────────────┤
│  Weekly Compiler  →          │
│  Groq AI turns 6 days of     │
│  data into a formal report   │
└─────────────────────────────┘
      │
      ▼
  .docx report file
  sent back via Telegram
```

Nothing here talks to the Material-Logi v3 app's own database. This bot is self-contained — Telegram in, `.docx` out.

---

## 3. Daily Schedule (the touchpoints)

| Time (KL) | Name | What happens |
|---|---|---|
| **1:15 PM** | Midday chunk | Asks: Weekly Meeting *(Mon only)*, Project briefing, Discussion, Deal Supplier, Production |
| **4:30 PM** | Late-afternoon chunk | Asks: Logistic, Lalamove, Item on site, Point learned, Halangan/isu |
| **~4:50 PM** | Catch-up ping | One message listing only the topics still unanswered from the two chunks above — nothing repeated that's already answered |
| **5:00 PM** | Item Progress + Delivery Activity | Guided, project-by-project — see Section 5 |
| **Mon, 10am-ish** | Project refresh (in) | "List active projects this week" |
| **Fri, 3pm-ish** | Project refresh (out) | "Update the list — done / new / ongoing" |

**Why these times:** everything lands before your 5:30pm target, spaced so no single ping asks too much at once.

---

## 4. The "Smart Skip" Rule

Before a chunk fires, the bot checks: *has Naqib already answered this topic today* (e.g. he mentioned "dealt with ABC Supplier" earlier in free chat)? If yes, that topic is silently dropped from the chunk. He only ever gets asked things he hasn't already said.

**In plain terms:** the bot keeps a small checklist per day. Every incoming message — chunk answer or random free-text — gets checked against that list before deciding what's still missing.

---

## 5. Item Progress + Delivery Activity (the persistent tracker)

This is the one part of the system with real memory — a "whiteboard," not a "notepad."

### 5.1 What an item looks like

Every tracked item belongs to exactly one project and has one status at a time:

| Icon | Status | Meaning |
|---|---|---|
| 🔁 | `in_progress` | Item is in production |
| 💰 | `done_payment` | Item done, payment being requested |
| ✅ | `ready_on_site` | Item ready / arrived on site |
| 🚚 | `delivered` | Item delivered to client *(new — closes the loop)* |

### 5.2 The daily flow (5:00 PM touchpoint)

For **Item Progress**, guided per active project:
1. Bot shows current open items for that project (e.g. "PJ Rufaidah: PVC 🔁, H.Steel 🔁 — anything changed?")
2. Naqib replies with changes only (move an item to 💰 or ✅, add a new item, or say "no change")
3. Bot asks for the project's overall completion %

For **Delivery Activity** (separate list, independent of Item Progress):
1. Bot asks: "Any deliveries done today?" → free entry, tied to a project
2. Bot asks: "Anything newly ready to deliver, with a target date?" → can include items that were never tracked in Item Progress at all

### 5.3 Why separate

Item Progress is *production status*. Delivery Activity is *logistics status*. An item can skip straight to "ready to deliver" without ever going through the Item Progress board (e.g. something bought off-the-shelf, not made in-house). Keeping them separate avoids forcing every delivery to have a fake production history.

---

## 6. Data Model (JSON files — the "filing cabinet")

Simple file-per-concern, matching Lane 6a's proven pattern (no rebuild needed to tweak data).

```
data/
├── topics.json          # carried over as-is from Lane 6a (10 topics + project refresh rules)
├── projects.json         # the shared active-project list (Mon/Fri refresh writes here)
├── items/
│   └── {project_id}.json # persistent item list + status, per project
├── daily/
│   └── {date}.json       # that day's chunk answers, keyed by topic id
└── reports/
    └── {week_range}.docx # generated weekly reports
```

**Beginner note:** each file is just a text file holding structured data (like a very strict spreadsheet). The bot reads a file, changes a value, writes it back. No database server to run or maintain.

### 6.1 Example — `items/pj-rufaidah.json`

```json
{
  "project": "PJ Rufaidah",
  "completionPct": 62,
  "items": [
    { "name": "PVC", "status": "in_progress" },
    { "name": "H. Steel", "status": "in_progress" }
  ]
}
```

### 6.2 Example — `daily/2026-09-28.json`

```json
{
  "date": "2026-09-28",
  "chunks": {
    "midday": { "answeredAt": "13:22", "dealSupplier": "...", "production": "..." },
    "lateAfternoon": { "answeredAt": null }
  },
  "deliveryActivity": {
    "doneToday": [],
    "readyToDeliver": [{ "project": "PJ Rufaidah", "date": "12/10" }]
  }
}
```

---

## 7. Weekly Compile (reusing Teleport's proven engine)

No change to the part that already works. Every Saturday (or on `/weekly`):
1. Bot reads the last 6 days of `daily/*.json`
2. Sends it to Groq with the same Bahasa Malaysia prompt + 7-key JSON contract Teleport already validated
3. Builds the `.docx` the same way Teleport's `formatter.py` does
4. Sends the file back over Telegram

This whole step is a straight port — the code already exists and is tested.

---

## 8. Deployment

| Piece | Where |
|---|---|
| Material-Logi v3 (web app) | Vercel — unchanged |
| NAQIB Daily Bot v2 (this bot) | Oracle Always Free VM — one always-on process |
| Code | Lives inside the v3 monorepo, but **runs and deploys independently** |

**Why not one deployment:** Vercel runs code only when a request comes in, then shuts it down. A Telegram bot needs to sit there listening 24/7 — that needs a real always-on machine, which is exactly what Teleport's Oracle setup already is. We're reusing that host, not rebuilding it.

---

## 9. What Gets Retired

- `lh_bot_6a` repo → archived, logic absorbed into this build
- `teleport` repo → archived, weekly-compile code ported in, rest absorbed

---

## 10. Open Items for Phase 3 (System Building)

Nothing blocking — these are small decisions that naturally surface once we start building:
- Exact wording/order for the guided Item Progress conversation prompts
- Whether "no change" needs a quick shortcut reply (e.g. just "-") for speed
- New project name for the combined bot (cosmetic, doesn't affect the build)

---

**Next step:** confirm this architecture matches what you pictured, and we move to Phase 3 — where I lay out the actual file-by-file build plan for your coding agent to follow.
