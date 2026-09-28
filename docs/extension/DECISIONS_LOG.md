# Extension Decisions Log

Running record of Naqib's decisions on the Architecture v1 extension lanes.
Each entry becomes a locked input for the lane that consumes it.

| Date | Decision | Lane | Input status |
|---|---|---|---|
| 2026-09-21 | D4: Lane 6a (minimal bot) starts in parallel with v3 lanes | 6a | Locked — shipped (`d:\Desktop\lh_bot_6a`) |
| 2026-09-21 | D7: Payment Voucher field map received and mapped (Architecture Appendix A) | 4 | Locked |
| 2026-09-21 | D8: Project & supplier names may reach an AI provider (never bank details) | 6 | Locked |
| 2026-09-21 | D1: Sync options compared first (Lane 2 step 0), Naqib picks, then spike | 2 | Locked — Dexie Cloud leading candidate |
| 2026-09-25 | Next lane to build: **Lane 1A (import scorecard)** | 1A | Locked — shipped (136/136) |
| 2026-09-25 | Stock design: **Option A — key items are pure workshop stock; project BOMs stay separate.** Naqib will recalculate/reconsider the linkage later ("need minus have" not built in pilot). | 3 | Locked for pilot |
| 2026-09-25 | Balance reminder: **A + B** — Telegram ping (day before / on due date) + in-app red badge & Dashboard "Balance due" list. Monday.com stays one-tap-copy only. | 4 | Locked |
| 2026-09-25 | **D1 resolved: sync = Dexie Cloud (Option A).** Free tier (3 seats / 100 MB) covers 1 user + 2 devices. Gated integration landed (inert until `VITE_DEXIE_CLOUD_URL` set); spike protocol in `Lane2_Spike_Protocol.md` awaits Naqib's two-device physical run. | 2 | Locked — spike pending |
| 2026-09-28 | **NAQIB Daily Bot v2 approved** (Architecture Phase 2 + Phase 3 pipeline imported to `docs/extension/naqib-daily-bot-v2/`). One Python process on Oracle Always Free VM; self-contained (no v3 DB access); supersedes + retires `lh_bot_6a` and `teleport` once shipped. Source claims verified — see `REVIEW_AND_VERIFICATION.md`. | DB2 | Locked — build next |
| 2026-09-25 | Starter key-items list: Naqib wants to **edit the 12-item draft** (Keep/Drop/Change + add real paint SKUs / electrical-box parts). Specifics pending. | 3 | **OPEN — awaiting Naqib's edits** |

## Pending from Naqib
- [ ] Key-items list edits (Keep / Drop / Change per item + real paint & electrical additions) — blocks Lane 3 build start.
- [ ] Real minimums + locations — filled during the first physical stock count.
