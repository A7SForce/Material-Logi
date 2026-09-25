# Telegram Bot: Known Gaps & Future Work

This document tracks known gaps in the Telegram bot implementation (post-Lane 6a) to ensure they are not forgotten as development continues.

## 1. Manual Fields Awaiting v3 Facts Integration
Currently, the **Deal Supplier** and **Lalamove** fields are filled using Naqib's manual answers, rather than real v3 facts. This is a deliberate interim state. 
- **Action Required:** Once Lane 2 (sync) and M8 (daily facts export) land, this manual step must be updated. The bot needs to be explicitly wired to consume the new facts snapshot so that Naqib isn't forced to do redundant duplicate typing. This update must be tracked as a required follow-up to M8's completion, as it will not happen automatically.

## 2. Missing Activity Formats
Lane 6a successfully shipped the minimal bot with the **Daily Report** check-in. However, the bot is not yet "done".
- **Action Required:** The remaining formats—**Production Activity**, **Delivery Activity**, and the **Weekly Draft**—are explicitly not built yet. These three formats need to be implemented in a future iteration.

## 3. Unresolved Hosting Decision (D3)
The hosting strategy (Decision D3) was never finalized. Currently, the bot runs locally or manually.
- **Action Required:** Before the bot can be relied upon daily, D3 needs a concrete solution (e.g., a small always-on service). Without a proper hosting setup, a day where the bot happens to be offline locally could lead to a missed check-in, which is a real failure mode.
