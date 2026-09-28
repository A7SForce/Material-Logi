# Telegram Bot: Known Gaps & Future Work

**Status 2026-09-28: SUPERSEDED by NAQIB Daily Bot v2** (`docs/extension/naqib-daily-bot-v2/PHASE2_SYSTEM_ARCHITECTURE.md`). The three gaps below are all absorbed into the v2 build — Pipeline 6a and Teleport are retired once v2 ships. This file stays as the historical record.

This document tracks known gaps in the Telegram bot implementation (post-Lane 6a) to ensure they are not forgotten as development continues.

## 1. Manual Fields Awaiting v3 Facts Integration — SUPERSEDED
Currently, the **Deal Supplier** and **Lalamove** fields are filled using Naqib's manual answers, rather than real v3 facts. This is a deliberate interim state.
- **Resolution:** v2 keeps collecting these as check-in answers (Deal Supplier midday chunk, Lalamove late-afternoon chunk) with the Smart Skip rule so they're never asked twice. The future M8 facts-snapshot idea is no longer required for the bot's operation — v2 is self-contained by design.

## 2. Missing Activity Formats — SUPERSEDED
Lane 6a successfully shipped the minimal bot with the **Daily Report** check-in. However, the bot is not yet "done".
- **Resolution:** v2 adds **Production** (midday chunk topic) and **Delivery Activity** (5:00 PM touchpoint, its own independent list) as first-class parts of the daily flow. The weekly draft is v2's Weekly Compile (Slice 5) — a port of Teleport's proven Groq + `.docx` engine.

## 3. Unresolved Hosting Decision (D3) — RESOLVED BY ARCHITECTURE §8
The hosting strategy was never finalized in Lane 6a. Currently, the bot runs locally or manually.
- **Resolution:** v2 lives on the **Oracle Always Free VM** (Teleport's already-prepped host: SSH key, docker-compose, $0 forever). One always-on Python process, polling only, no inbound port. Slice 7 handles the cutover and stops the old single-poller instances.
