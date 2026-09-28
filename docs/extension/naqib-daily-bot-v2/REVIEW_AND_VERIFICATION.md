# Daily Bot v2 — Architecture Review & Source Verification

**Date:** 28 September 2026
**Reviewer:** Agent (Lane Q discipline: verify claims against real code before building)
**Verdict:** **Phase 2 architecture confirmed buildable as written.** Every carry-over claim checked against the actual `teleport` and `lh_bot_6a` repos on this machine. No blocking discrepancies — three porting notes below become Slice-5/6 knowledge.

## Claims vs reality (all checked 2026-09-28)

| Architecture claim | Verified against | Result |
|---|---|---|
| Teleport's Groq call + BM prompt + 7-key JSON contract "already validated" | `Teleport/bot/report/compiler.py` | ✅ Exact: `REQUIRED_KEYS = (ringkasan, isu, cadangan, pencapaian_kerja, pencapaian_peribadi, refleksi_belajar, refleksi_perbaiki)`; live Groq run logged 7/7 keys in 4.6 s (`openai/gpt-oss-120b`) |
| "the same Bahasa Malaysia prompt" | `compiler.py SYSTEM_PROMPT` + `_build_user_prompt` | ✅ Formal-BM system prompt, 6 numbered report parts mapping onto the 7 keys, JSON-mode-with-fallback + code-fence stripping + key validation all present |
| `.docx` built "the way Teleport's formatter.py does" | `Teleport/bot/report/formatter.py` | ✅ Present; produced real `.docx` files under `data/reports/` in Teleport's live verification |
| Input swap: "this bot's `daily/*.json` instead of Teleport's SQLite" | `Teleport/bot/database.py` | ✅ Accurate — Teleport reads activities from SQLite (`activities.db`); the port replaces only the data source, prompt + contract untouched (exactly what Slice 5 demands) |
| `topics.json` from Lane 6a "carried over as-is (10 topics + project refresh rules)" | `lh_bot_6a/data/topics.json` | ✅ Exactly 10 topics (weekly_meeting, project_briefing, discussion, deal_supplier, production, logistic, lalamove, item_on_site, point_learned, obstacles) + a `projectRefresh` block — the full Daily Report field set plus Mon/Fri refresh rules |
| Oracle Always Free VM "is exactly what Teleport's Oracle setup already is — reusing that host, not rebuilding it" | `Teleport/SYSTEM_PROGRESS.md` §7–8 | ✅ Decision recorded: Oracle Always Free permanent home; `docker-compose.yml`, Dockerfile, and ed25519 SSH deploy key (`teleport_oci`) prepped. **VM itself still pending Naqib's OCI signup** — Slice 7's stop condition (needs real credentials) is real |
| Weekly template fit | Open Items v2 §2 (RESOLVED template) | ✅ The 7 contract keys map one-to-one onto the fixed weekly template's sections |

## Porting notes for the build (Slice 5/6 knowledge — no design change)

1. **lh_bot_6a is Node.js; the v2 bot is one Python process.** Only `topics.json` (pure data) ports verbatim from 6a — its conversation logic is a *reference* for wording/flow, not copyable code. Phase 3's "copy what works" applies verbatim only to Teleport's Python (`compiler.py`, `formatter.py`).
2. **Groq model name drift is a live hazard.** Teleport already survived one silent retirement (`llama-3.3-70b-versatile` → 404). Carry `openai/gpt-oss-120b` as the default and keep the "re-query `/v1/models` on 404" note in the v2 config.
3. **Single-poller rule.** Exactly one bot instance may run against the Telegram token (Teleport §7 records it; v2 inherits it) — the deploy slice must stop the old Teleport/6a pollers when v2 goes live, matching the "both retired once this ships" clause.

## System bookkeeping done alongside this review

- `docs/extension/telegram_bot_gaps.md` → all three gaps marked superseded by Daily Bot v2.
- `SYSTEM_SPEC.md` Annex C → Lane 6a/6 rows superseded by the Daily Bot v2 lane (own folder, own deploy target, zero v3 app code).
- `DECISIONS_LOG.md` → decision recorded: build Daily Bot v2 per PHASE2, retire 6a + Teleport on ship.
- The bot stays **outside v3's web app**: no shared state with the Dexie database, no Vercel involvement, M8 snapshot not required (v2 collects its own data).
