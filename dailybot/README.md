# NAQIB Daily Bot v2

One telegram bot that collects Naqib's day in small chunks, tracks project items
as they move through production, and compiles a week of that into a formal
AI-written .docx report.

- Architecture (source of truth): `../docs/extension/naqib-daily-bot-v2/PHASE2_SYSTEM_ARCHITECTURE.md`
- Build pipeline: `../docs/extension/naqib-daily-bot-v2/PHASE3_AGENT_PIPELINE_SYSTEM_PROMPT.md`
- Source verification: `../docs/extension/naqib-daily-bot-v2/REVIEW_AND_VERIFICATION.md`
- Per-slice handoffs: `docs/build/`

Self-contained: Telegram in, .docx out. No Material-Logi v3 database access.
One Python process, polling (no inbound port), deployed on the Oracle Always
Free VM — independent of the Vercel web app in the rest of this monorepo.

## Layout

    dailybot/
    |-- bot/              the bot package (grows slice by slice)
    |-- data/
    |   |-- topics.json   10 topics + project refresh rules (ported as-is from Lane 6a)
    |   |-- projects.json active-project list seed (Mon/Fri refresh writes at runtime)
    |   |-- items/        persistent per-project item state (runtime, gitignored)
    |   |-- daily/        per-day chunk answers (runtime, gitignored)
    |   |-- reports/      generated weekly .docx (runtime, gitignored)
    '-- docs/build/       per-agent handoff files (proof-gated)
