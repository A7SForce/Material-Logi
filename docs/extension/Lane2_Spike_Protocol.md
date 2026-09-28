# Lane 2, Step 1 — Dexie Cloud Spike Protocol (two-device, real data)

**Date:** 25 September 2026
**Decision ref:** D1 — Naqib picked **Dexie Cloud (Option A)**, 2026-09-25.
**Code state:** gated integration landed — sync is **inert until `VITE_DEXIE_CLOUD_URL` is set** at build time. The app honestly shows a "Local only" chip until then; all 139 tests green with sync off.

---

## What the spike must prove (Architecture Part 5 must-pass, adapted)

| # | Test | Passes when |
|---|---|---|
| S1 | Offline edit on both devices | Edit different items on phone (offline) and laptop (offline), reconnect both — no lost data, no duplicates |
| S2 | Clear browser data → restore | Clear the app's browser data on one device, reopen, sign in — everything returns from the cloud |
| S3 | New device / browser | Sign in from a fresh browser (or incognito) — everything returns |
| S4 | Visible status | Chip shows "Offline — changes saved here, will sync" while offline and "Synced" after reconnect |
| S5 | Same-field conflict (informational) | Edit the SAME field on both devices offline, reconnect — record what the merged value is (expected: latest client timestamp wins) |
| — | Bank details encryption | **Deferred to Lane 4** — bank details don't exist in v3 yet |

## Spike questions this run answers (evidence for step 2)

1. Do v3's **client-generated UUID primary keys** sync as-is, or does Dexie Cloud require `@id` markers (schema bump)?
2. Does the `supplierLinks` **compound primary key** `[projectId+globalSupplierId]` sync (associative-entity pattern)?
3. What are the addon's actual **status values** (chip labels may need refinement)?
4. Same-field offline edit — what actually wins?

---

## Naqib's steps (one-time, ~10 minutes)

1. **Create the cloud database** (from the repo folder, one command — it emails you a one-time password):
   ```
   npx dexie-cloud create
   ```
   Note the database URL it prints, e.g. `https://something.dexie.cloud`.
2. **Whitelist the app origin** so the cloud accepts sync from the deployed site:
   ```
   npx dexie-cloud whitelist https://material-logi.vercel.app
   ```
3. **Send me the database URL.** I will set `VITE_DEXIE_CLOUD_URL` in Vercel and redeploy. Nothing changes until this is done — the app stays "Local only".
4. **Laptop:** open https://material-logi.vercel.app → the login prompt appears → sign in with your email (OTP).
5. **Phone:** open the same site → sign in **with the same email** → your data appears.

## Then run S1–S5 above and record the results

Mark each PASS / FAIL / unexpected behavior directly in this file (or tell the agent and it records them). A FAIL is not a disaster — it is the spike doing its job: step 2 (full integration + soft deletes) only proceeds on what the evidence shows.

## What could go wrong (from the comparison report, restated)

- If sync rejects plain client ids → schema bump to `@id` markers (planned, evidence-gated)
- If compound-key links misbehave → links get their own uuid PK (additive migration)
- If the free tier's 100 MB / 10 connections limits bite (they should not at this scale) → €3/month tier
- If you clear browser data on the ONLY device before the first successful sync — that data is gone (same as today). Sync fixes this only after it has run at least once.

## Rollback

Unset `VITE_DEXIE_CLOUD_URL` in Vercel → redeploy → the addon never registers and the app is exactly the pre-Lane-2 local-only version. No data is lost by turning sync off — local data always stays local first.
