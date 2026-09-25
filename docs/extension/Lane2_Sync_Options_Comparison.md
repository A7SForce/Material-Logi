# Lane 2, Step 0 — Sync Options Comparison (no code)

**Date:** 25 September 2026
**Author:** Agent (research pass)
**Decision ref:** D1 (locked 21 Sep: agent compares, Naqib picks, then a spike follows)
**Sources:** Official pricing/product pages only — dexie.org/pricing, dexie.org/cloud, firebase.google.com/pricing, supabase.com/pricing (all fetched 2026-09-25)

---

## The question in one line

v3 keeps all data in the browser (Dexie/IndexedDB). One user (Naqib), two devices (phone + laptop). Which sync + backup layer keeps them identical, works offline, and doesn't force a rewrite of v3?

---

## Options at a glance

| Criterion | A. Dexie Cloud | B. Firebase Firestore | C. Supabase (custom sync) |
|---|---|---|---|
| **Works offline** | ★ Offline-**first** by design — v3 keeps writing to IndexedDB; sync is a background addon (WebSocket when online, queue when offline) | Online-first with an offline cache — the app model changes; the server is the source of truth | None built in — you build offline + sync yourself on top of Postgres |
| **Effort to add to v3** | **Smallest.** `npm install dexie-cloud-addon` + configure. Data layer (7 repos, merge engine, locked fields) untouched — matches the "additive only" invariant | **Large.** Full data-layer rewrite: Firestore SDK, document modeling, re-implement every repo; merge/lock semantics must survive the port | **Largest.** Postgres + realtime + a hand-built sync engine — the architecture doc already calls this "highest bug risk" |
| **Cost — 1 user, 2 devices** | **€0.** Free tier: 3 production users, 100 MB storage, forever free. Naqib = 1 account used from 2 devices (devices are not seats). Production starts €3/mo per 25 seats if ever needed | **$0** within Spark free quotas (1 GiB stored, 20K writes/day, 50K reads/day) — v3's usage fits comfortably | **$0** free tier (500 MB, pauses after **1 week of inactivity** — a real risk for a daily tool if you skip a week), then $25/mo Pro |
| **Where data lives** | Awarica AB (Dexie's company, Stockholm, Sweden) — GDPR compliant, private-by-default, realm-based access control; self-host escape hatch (€3,495 one-time, or €7,995 with full source) | Google Cloud region of your choice (e.g. singapore for Malaysia latency) | Region selectable (Singapore available) |
| **Bank-detail encryption (Lane 4)** | App-level ciphertext is just data to the server — any of the three store it fine. The real question is **where the key lives** so a new device can still decrypt (open design task for Lane 4, independent of this choice) | Same | Same |
| **Server-side Telegram bot reads/writes data (D2)** | **(verify in spike).** Management REST API + webhooks exist and the docs mention backend integration via REST/webhooks, but whether a bot can query *app data* server-side needs hands-on proof. **Fallback already in the architecture:** M8 daily facts snapshot (v3 pushes, bot keeps its own log) | **Excellent** — Admin SDK reads/writes Firestore from any Node service | **Excellent** — direct Postgres/REST access |
| **Bug risk** | **Lowest** — managed sync addon, battle-tested (100k+ Dexie developers), v3 code barely changes | High — rewrite of the entire data layer for a trust-first app | Highest — you build and debug your own sync |
| **Free-tier catches** | 100 MB storage, 10 connections, 20 req/s — v3's data is kilobytes; non-issue at this scale | Blaze plan needs a card on file for anything beyond Spark | **Free projects pause after 7 inactive days** — for a daily tool this is a live grenade |

---

## Recommendation — plain language

**Pick Dexie Cloud (Option A).** It is the only option that keeps v3 local-first without a rewrite: v3 already speaks Dexie, the addon turns the same writes into background sync, and the free tier covers one user on two devices forever (100 MB is roughly a thousand times more than v3's data). Firebase and Supabase both give a server-side bot nicer data access, but they would force v3 to become an online-first app — the exact opposite of what the architecture locked in ("v3 stays first. The cloud is a copy, not the boss."). If the bot ever needs live v3 facts, the M8 daily facts snapshot (already planned) covers it without giving the bot database access.

## What could go wrong (honest list)

1. **Primary keys.** Dexie Cloud syncs best with server-generated `@id` primary keys; v3 generates its own local string ids today. Switching could touch every FK reference (BomItem.assignedSupplierId, ProjectSupplierLink's `[projectId+globalSupplierId]` compound key, preset references). **This is the #1 spike question** — verify whether local ids can sync as-is or whether a migration is needed.
2. **Conflict semantics.** The architecture proposes latest-edit-wins per field with timestamps. Dexie Cloud's exact conflict behavior for simultaneous offline edits must be proven against the Part 5 must-pass tests (phone-offline edit + laptop-offline edit → reconnect → no loss, no dupes). One user = rare conflicts, but the rule still has to be safe.
3. **Restore + encryption.** "Clear browser data, then restore from cloud" must still decrypt bank details later — the encryption key cannot live only in the old device's IndexedDB. Design task for Lane 4, flagged now so it doesn't surprise us.
4. **Vendor dependency.** Free tier limits (10 connections, 20 req/s) are fine for 1 user / 2 devices. If the app ever grows, it's €3/month. If Awarica disappears: self-host is a paid escape hatch, and the bot-fallback (M8 snapshot) keeps the extension working.
5. **The bot's data access stays unverified until the spike.** If server-side data reads turn out not to be supported, D2's fallback (one-way daily facts snapshot) is the answer — no re-pick needed.

## Proposed spike (step 1, after your pick)

With real data on both devices: create the free cloud DB, enable sync on a **copy** of v3's schema, and prove the Part 5 must-pass tests — offline edit on both devices → reconnect → no loss; clear-browser → restore; new device → sign in → everything returns; pending/synced status visible. The spike answers the `@id` and conflict questions before any integration code lands in main v3.

---

**Awaiting Naqib's pick: A (Dexie Cloud, recommended), B (Firebase), C (Supabase), or "run the spike on A and decide from evidence".**
