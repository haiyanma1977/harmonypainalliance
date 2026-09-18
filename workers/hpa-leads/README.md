# hpa-leads — HPA Patient Lead Capture Worker

**Status: LIVE IN PRODUCTION.** This Worker receives every patient lead submitted on
harmonypainalliance.com. `worker.js` in this folder is the **authoritative v3 source**
corresponding to production Version ID **`33a1db41`** — the executable code matches the
deployed v3 exactly; the only known difference is post-deployment documentation comments
added to this file's header. `worker.v2-deployed-778d24c9.js` remains the **verbatim
rollback capture** of v2.0.

Before the 2026-08-20 capture, the production source existed **only inside Cloudflare**. A
dashboard edit or an accidental overwrite would have been unrecoverable and invisible in git.

---

## Rollback reference

| Item | Value |
|---|---|
| Worker name | `hpa-leads` |
| Worker ID (script tag) | `9511b9b1f0104985872218771afc0115` |
| Created | 2026-04-19T21:58:16Z |
| Last modified (deployed) | **2026-04-20T02:29:37Z** |
| Source version | `HPA Lead Capture Worker v2.0` |
| Captured | 2026-08-20, read-only, unmodified |

### ✅ ROLLBACK TARGET

```
Active deployment Version ID:  778d24c9
```

Confirmed by Haiyan from the Cloudflare dashboard, 2026-08-20. This is the version that
`worker.js` in this folder was captured from — **source and deployment are a matched pair.**

**To roll back a bad v3 deploy:** Cloudflare Dashboard → Workers & Pages → **hpa-leads** →
**Deployments** → select **`778d24c9`** → Rollback. Seconds, and independent of git.

Record the new Version ID here after each future deploy, and keep the previous one until the
new version has proven itself in production.

| Deploy | Version ID | Source | Notes |
|---|---|---|---|
| **v3.1 + founder@ Apps Script — CURRENT** | **`f6b02f03`** | `worker.js` (code unchanged) | 2026-09-18, dashboard: `GOOGLE_SCRIPT_URL` value changed to the founder@ script's `/exec`. Live test 3/3 passed (identity-migration-v4 handoff §B). Rollback target: `737a95f3` (would point back at the legacy script). |
| v3.1 seven-category | **`737a95f3`** | `worker.js` | Deployed 2026-09-18 UTC (09-17 ET) via dashboard editor. `ALLOWED_CONCERNS` = 9 values; `LEGACY_CONCERN_MAP` (remove after 2026-10-18); Get Matched no longer resolves a clinic server-side. Live test 5/5 passed — `private-handoffs/2026-09-18-seven-category-v1-worker.md` §7. Rollback target: `33a1db41`. |
| v3.0 + KV binding `HPA_RATELIMIT` — **rolled back 2026-09-17** | `34f81f94` | `worker.js` (code unchanged) | 2026-09-17, dashboard "Added KV namespace binding HPA_RATELIMIT" (namespace `hpa-ratelimit`, `55cc138db8ec44cfa5b64b9e94746028`). ⚠ See note below: on Workers Free this limiter cannot stop bursts and spends the shared daily KV write quota. Rollback target: `33a1db41`. |
| v3.0 — rollback target (four-value taxonomy) | **`33a1db41`** | `worker.js` | Deployed 2026-08-20 via dashboard editor. No `HPA_RATELIMIT` binding. Haiyan rolled back to this version on 2026-09-17 after the KV limiter finding below. |
| v2.0 — rollback target | **`778d24c9`** | `worker.v2-deployed-778d24c9.js` | Deployed 2026-04-20T02:29:37Z. **Keep available.** |

**Rollback:** Dashboard → Workers & Pages → hpa-leads → Deployments → **`778d24c9`** → Rollback.

> **KV rate limiter — finding (2026-09-17).** A live burst of 31 requests from one IP
> never returned 429. Two KV properties explain it: KV allows at most **1 write per second
> to the same key** (faster writes throw, and `isRateLimited()` deliberately fails open), and
> reads are edge-cached, so the counter lags. The limiter therefore cannot stop bursts.
> It also calls `put()` on **every** request that passes the honeypot — including malformed
> spam that is rejected later — and on Workers Free the **1,000 writes/day limit is
> account-wide**, shared with `HPA_LEADS`. A spam run could exhaust it and make real lead
> writes fail (503). Recommended: remove the binding (roll back to `33a1db41`) and use a
> zone **WAF rate limiting rule** on `POST /api/lead` instead (parameters in the
> Cloudflare dashboard).

---

## 限流架构（Rate limiting — as deployed, 2026-09-17）

**Where rate limiting actually happens: the Cloudflare WAF, not the Worker.**

| Layer | State | Fact |
|---|---|---|
| Cloudflare zone WAF — rate limiting rule | **Active** | A zone-level rate limiting rule on `harmonypainalliance.com` covers `POST /api/lead`. 参数见 Cloudflare 控制台 WAF 规则。Created by Haiyan in the dashboard on 2026-09-17. Verified externally the same day: a burst of POSTs from one IP started returning **`429`** with body `error code: 1015` (Cloudflare's rate-limit response, not the Worker's); GETs on the same path were never limited. The rule runs **before** the request reaches the Worker. |
| KV namespace `hpa-ratelimit` | **Exists, unused** | ID `55cc138db8ec44cfa5b64b9e94746028`. Created 2026-09-17. It is **not bound** to the Worker (the `HPA_RATELIMIT` binding was added in version `34f81f94` and removed by rolling back to `33a1db41` the same day). Idle, no cost. |
| Worker code — `isRateLimited()` in `worker.js` | **Present, not active** | The function only runs when `env.HPA_RATELIMIT` is bound; with no binding it is skipped. Current production version `33a1db41` has no such binding, so the in-Worker KV limiter is **inert**. The code has not been changed. |

Why the KV limiter is not used: see the finding above (KV allows at most 1 write/s per key and reads are edge-cached, so bursts pass; every request that passes the honeypot would spend the account-wide 1,000 writes/day free quota shared with `HPA_LEADS`).

Operational notes:
- A `429` on `POST /api/lead` is produced by the WAF rule, not by Worker code. Look for it in the zone's Security → Events, not in Worker logs.
- Changing the rule's parameters is a dashboard change to the WAF rule, not a Worker deploy.
- Do not re-add the `HPA_RATELIMIT` binding without revisiting the finding above; the namespace may be deleted or kept — either is harmless.

---

## Apps Script deployment reference — founder@ (since 2026-09-18)

**Identity migration done 2026-09-18** (`private-handoffs/2026-09-18-identity-migration-v4.md`).
The Sheet, the script and the notification sender all live in HPA's Google Workspace now.

| Item | Value |
|---|---|
| Project | `hpa-leads-script` (standalone) — ID `1PzlAFXbijh26cs8daa7rO8yV62ssdWCzbEDphuD-9FvlwzwEeVrABpfy` |
| Owner / Execute as | **`founder@harmonypainalliance.com`** (Workspace) |
| Who has access | Anyone (required — the Worker calls it unauthenticated) |
| Active deployment | **Version 1**, 2026-09-18 08:56 (America/New_York), description `HPA lead receiver v2.1 (founder@, seven-category)` |
| Source | `apps-script/Code.gs` **v2.1** in this folder — byte-identical to the deployed script except `SHEET_ID`, which is a placeholder here (real ID in the handoff above; not committed) |
| Sheet | "HPA Leads", owned by `founder@`, tab `Sheet1`, opened by ID (`SpreadsheetApp.openById(SHEET_ID).getSheetByName("Sheet1")`) |
| Notification | `MailApp.sendEmail` → `founder@harmonypainalliance.com`, **sent as `founder@`** |
| `/exec` URL | stored only in the Worker variable `GOOGLE_SCRIPT_URL` (Worker version `f6b02f03`) — value not committed |
| Shared secret | none — the script checks no token; the unguessable `/exec` URL is the only credential |

**Verified 2026-09-18 13:32–13:34 UTC** with three live submissions (Get Matched / clinic path /
legacy value): rows landed in the founder@ Sheet with the expected cols 7/17/18/19; three emails
arrived from `founder@` with the v2.1 subject rules (two segments when unassigned, three with a
clinic) and no empty `Booking URL:` line; no email came from the old account.

**Editing the script:** `Code.gs` here is the source of truth. To ship a change: paste into the
project → **Deploy → Manage deployments → edit the existing deployment → Version: New version →
Deploy**. Updating the *existing* deployment keeps the `/exec` URL, so `GOOGLE_SCRIPT_URL` does not
change. A *new deployment* mints a new URL and requires a Worker variable change.

### Legacy (pre-2026-09-18) — awaiting archive by Haiyan

| Item | Value |
|---|---|
| Sheet | "HPA Leads" in `haiyanma256@gmail.com` (personal) — holds all leads Apr–Sep 2026; test rows removed 2026-09-18 |
| Script | container-bound to that Sheet; Web App **Version 3** (2026-04-19 22:25 ET, description `HPA lead receiver Vison`), Execute as `haiyanma256@`, Anyone |
| `/exec` | the previous `GOOGLE_SCRIPT_URL` value — no longer called by the Worker, **still live until archived** |
| To do | export the Sheet to CSV into founder@ Drive, then Apps Script → Deploy → Manage deployments → Archive |

The column mapping evidence below was gathered against the legacy Sheet on 2026-08-20; the header
row is identical in the new Sheet (verified column by column on 2026-09-18).

---

## ✅ Production evidence — Sheet column mapping VERIFIED

Confirmed by Haiyan on 2026-08-20 by reading the live "HPA Leads" Sheet directly.

**Row 1 contains exactly 22 columns, in this order:**

```
 1 Lead ID            2 Submitted At       3 Name              4 Email
 5 Phone              6 Language           7 Primary Concern   8 Duration
 9 First Acupuncture 10 First Visit       11 Preferred Time   12 Insurance
13 How Found         14 Notes             15 Source Button    16 Page Language
17 Target Clinic     18 Clinic Name       19 Booking URL      20 User City
21 User Region       22 User Country
```

**This matches `apps-script/Code.gs` exactly — same 22 headers, same order.**

Existing rows also show the trailing fields — Source Button, Page Language, Target Clinic, Clinic
Name, Booking URL, User City, User Region, User Country — **populated in production**.

### What this proves

- The deployed Version 3 header array is **identical** to the local file's. The header row is
  written only when the sheet is empty, and no lead could have reached the Sheet before Version 3
  went live (Apps Script V3 at 22:25, Worker at 22:29), so this row is V3's own output.
- Because the trailing columns are correctly populated, the deployed `appendRow` **data** array must
  align positionally with the same 22 headers. The column mapping is therefore
  **production-verified, not inferred**.
- The local file was edited 62 minutes after V3 deployed — but **whatever that edit changed, it was
  not the header or data arrays.** The divergence window is now much narrower than the Worker's.

### What this still does NOT verify

| Item | Status |
|---|---|
| `NOTIFY_EMAIL` value | ✅ **VERIFIED** — received at `founder@harmonypainalliance.com`, matching `Code.gs` |
| Subject construction | ✅ **CONSISTENT** — see below |
| Body sections / which fields render | ✅ **CONSISTENT** for the observed sections — see below |
| Sheet tab count | ✅ **VERIFIED** — one visible tab, `Sheet1` |
| ROUTING / GEO body sections | Not reported — see below |
| 200-on-error behaviour (`doPost` catch) | Unverified; not observable from artefacts. Resolves at the v2 deploy. |

### Email evidence (read-only, existing lead email, 2026-08-20)

**Observed subject:** `[HPA Lead] haiyan ma — Lei's Acupuncture`

This matches `Code.gs` **on the empty-concern branch**:

```js
var concern = data.primary_concern ? " — " + data.primary_concern : "";
var subject = "[HPA Lead] " + name + concern + " — " + clinicName;
```

With `primary_concern` blank the middle segment collapses, producing exactly two segments. Expected
for that test — the concern field sat inside the collapsed optional panel and was left empty.

> ⚠️ **Caveat:** this observes only the empty-concern branch. It confirms the prefix and the clinic
> segment; it does **not** independently confirm that deployed V3 contains the concern segment.

**Observed body structure:** `New HPA Lead Received!` · Lead ID · Time · Source · **CONTACT INFO** ·
**CLINICAL DETAILS** · **REFERRAL**

**CLINICAL DETAILS fields observed:** Primary Concern · Duration · First Acupuncture · First Visit ·
Preferred Time · Insurance — **all six, in the same order as `Code.gs`.**

> **Not reported: the ROUTING and GEO sections**, which `Code.gs` emits after REFERRAL. Either they
> were below the fold, or deployed V3 lacks them. Low-stakes either way — both are dropped or
> reduced in v2 regardless.

### Sheet structure

**One visible tab, named `Sheet1`** — the untouched default, consistent with the deployment guide's
"script creates the headers automatically" setup.

The legacy script used `SpreadsheetApp.getActiveSheet()`, which was fragile (a second tab left
active would divert rows). **Done in v2.1 (2026-09-18):** the founder@ script opens the Sheet by ID
and the tab by name (`getSheetByName("Sheet1")`). Any future purge script must also target the
sheet **by name**, never "active".

### Divergence assessment — risk now LOW

Deployed Version 3 and the local `Code.gs` agree on every observable point:

| Agreement | Evidence |
|---|---|
| 22-column header array, exact order | live Sheet row 1 |
| Data-array positional alignment | trailing columns correctly populated |
| `NOTIFY_EMAIL` | inbox the email arrived in |
| Subject prefix + clinic segment | observed subject line |
| Body header, CONTACT INFO, CLINICAL DETAILS (all 6 fields, in order), REFERRAL | observed body |

**Conclusion:** the probability that deployed V3 differs *materially* from `apps-script/Code.gs` is
now low. The post-deployment local edit — whatever it was — touched none of the observable surface.

This remains an **assessment, not proof.** The unverified remainder is the ROUTING/GEO sections, the
subject's concern segment, and `doPost` error handling. All of it resolves permanently at the v2
deploy, when production is published *from* this repo copy.

### ✅ Q3 — recipient change, APPROVED and scheduled

| | |
|---|---|
| Current production recipient | `founder@harmonypainalliance.com` (**verified from a received email**) |
| Approved new recipient | **`info@harmonypainalliance.com`** |
| Rationale | `info@` is the durable company operations / patient-connection inbox; `founder@` should not carry routine lead notification |
| When | **Bundled with the v2 Apps Script changes.** Not a standalone edit. |
| How | Edit `NOTIFY_EMAIL` in `Code.gs`, then **Deploy → Manage deployments → edit the existing deployment → Version: New version**. This **preserves the current `/exec` URL**, so `GOOGLE_SCRIPT_URL` needs no change. |
| Status | **Not implemented.** Production unchanged. |

> Do **not** create a *new deployment* for this — that mints a new `/exec` URL and would silently
> break the Worker. Update the **existing** deployment to a new version.

### Consequence for the v2 schema change — now evidence-based

| Change | Effect on the live Sheet |
|---|---|
| Drop `duration`, `first_acupuncture`, `first_visit`, `preferred_time`, `insurance` | cols 8–12 → blank. **No shift.** |
| Drop `how_found` | col 13 → blank |
| Rename `notes` → `note` | col 14 → blank **unless the script's field reference is updated** |
| Drop `user_city`, `user_region` | cols 20–21 → blank |
| Add `source_page`, `resolved_clinic`, `connection_status`, `schema_version` | **not written at all** until the script and the header row are both extended |

The header row will **not** self-update — it is written only when the sheet is empty. Adding
columns 23–26 requires editing the header row by hand as part of the v2 window.

---

## ⚠️ The local copy is NOT what is deployed

`Harmony-Painalliance-Comms/worker/hpa-leads-worker.js` (204 lines, mtime 2026-04-20)
**differs from the deployed Worker** (188 lines).

The local file is a **debug build that was never deployed**, or was deployed and rolled
back. The difference is one block — the Apps Script response handling — and it is not
cosmetic:

| | Deployed (this folder) | Local copy |
|---|---|---|
| On Apps Script 302 | records `"ok (status 302)"` | **follows the redirect** and echoes up to **300 chars** of the response body into `debug.sheets` |
| On other status | echoes 200 chars of body | echoes 300 chars of body |
| `debug.sheets_url` | **absent** | **present — leaks the first 60 characters of `GOOGLE_SCRIPT_URL` to the browser** |

**`HPA_Deployment_Guide.md` §3.2 instructs pasting the local file into the Cloudflare
editor.** Following that instruction today would deploy the leaky build. Treat
`worker.js` in *this* folder as the only authoritative production source, and update or
retire the guide accordingly.

---

## ✅ APPROVED — clinic notification provider (not yet implemented)

Decision recorded 2026-08-20. **Nothing configured, no account created, no DNS added, no Worker
change.**

| | |
|---|---|
| Provider | **Postmark** |
| Sending subdomain | **`mail.harmonypainalliance.com`** (dedicated; root domain untouched) |
| Clinic destination — Lei's Acupuncture | `leidong@leisacupuncture.com` |
| HPA internal notification | `info@harmonypainalliance.com` via the existing Apps Script → "HPA Leads" Sheet workflow |

### Target architecture — two separate roles, never merged

```
Worker (v3)
  ├── HPA INTERNAL  → Apps Script → "HPA Leads" Sheet + email → info@harmonypainalliance.com
  │                   (full operational record incl. source_page / source_button attribution)
  │
  └── CLINIC-FACING → Postmark → the selected clinic's notification destination
                      Lei's Acupuncture → leidong@leisacupuncture.com
                      MINIMIZED payload only — no IP, no attribution, no internal metadata
```

**Why Postmark:** transactional-only sending policy (deliverability to a clinic inbox is the risk
that matters), an explicit `ErrorCode` in the API response — which is what makes honest
`clinic_notified` / `notification_failed` status possible — permanent free tier at HPA's volume, two
DNS records, no SDK required.

**Why a dedicated subdomain:** the root domain's MX and TXT are never edited, so Postmark setup
cannot disrupt `info@` or `founder@`. Postmark's Return-Path CNAME supplies SPF alignment via their
bounce domain, so **HPA never has to author an SPF record.** Fully reversible by deleting two
subdomain records.

### DNS required at implementation time — PROPOSAL, NOT APPLIED

| Type | Name | Value | Cloudflare |
|---|---|---|---|
| TXT | `<selector>._domainkey.mail.harmonypainalliance.com` | DKIM key — **supplied by Postmark** | — |
| CNAME | `pm_bounces.mail.harmonypainalliance.com` | `pm.mtasv.net` | **DNS only — grey cloud** |
| TXT *(optional)* | `_dmarc.mail.harmonypainalliance.com` | `v=DMARC1; p=none; rua=mailto:info@harmonypainalliance.com` | — |

> ⚠️ The CNAME **must not be proxied.** Cloudflare proxies CNAMEs by default; a proxied record here
> breaks bounce handling and SPF alignment. Most common failure mode for this setup.

**Verified 2026-08-20:** `mail.harmonypainalliance.com` has no records of any kind, and the root
domain has no SPF, DKIM, DMARC, or stale MailChannels records. Clean slate, no conflicts.

**Open before implementation:** Postmark's message-retention default must be set deliberately and
disclosed — the provider becomes a **fourth** store of patient data alongside Cloudflare KV, the
Google Sheet, and the notification inbox (D23 / `privacy.html` §4).

---

## FILE ROLES

**v3.0 was deployed on 2026-08-20 (Version `33a1db41`) and is now live in production.**

| File | Contents | Deployed? |
|---|---|---|
| `worker.js` | **v3.0** | ✅ **YES — live as `33a1db41`** |
| `worker.v2-deployed-778d24c9.js` | Verbatim capture of v2.0 | Rollback source — **keep** |

> **Why the extra file.** When v3 was written, `worker.js` held the only on-disk copy of the deployed
> source. Overwriting it would have destroyed the restore point before it was committed. The v2
> capture is preserved verbatim, byte-identical to what Cloudflare served as `778d24c9`.
>
> **Do not deploy `worker.v2-deployed-778d24c9.js`** unless deliberately rolling back — and prefer
> the dashboard Deployments rollback, which is faster and safer.

### Deployment state at v3.0 launch

| Setting | Value |
|---|---|
| Note cap | **2000** — migration window. Tighten to 300 only when the shared component ships with a visible counter. |
| `HPA_RATELIMIT` | **unbound** — rate limiting inert |
| `GOOGLE_SCRIPT_URL` | founder@ script `/exec` (since 2026-09-18) — check Type in dashboard; Secret preferred |
| Postmark | **not configured** — clinic notification stubbed |
| `connection_status` | always **`stored`** — never claims `clinic_notified` |
| Apps Script | founder@ `hpa-leads-script` Version 1 (since 2026-09-18); notifies and sends as `founder@` |
| Sheet cols 20–21 | **blank for new rows** — accepted (D9) |

---

## Architecture (as deployed — v2.0)

```
browser  ──POST /api/lead──▶  hpa-leads Worker
                                 │
                                 ├─▶ KV  HPA_LEADS   key = lead_<ts36>_<rand4>
                                 │                   expirationTtl = 365 days
                                 │
                                 └─▶ POST GOOGLE_SCRIPT_URL  (full lead JSON)
                                          │
                                          └─▶ Google Apps Script hpa-leads-script (founder@, see apps-script/)
                                                 ├─ appendRow → "HPA Leads" Sheet (founder@ Drive)
                                                 └─ MailApp   → founder@harmonypainalliance.com (sent as founder@)
```

### Bindings

| Kind | Name | Value |
|---|---|---|
| KV namespace | `HPA_LEADS` | `hpa-leads` — `0a7c30cc4d6c49298efc0be6e0b37a34` (**the only KV namespace on the account**) |
| Variable | `GOOGLE_SCRIPT_URL` | founder@ `hpa-leads-script` `/exec` endpoint — **value not committed** |

### Endpoint

`POST /api/lead` only. Every other method and path returns `404 {"error":"Not found"}`.

**Required fields:** `name`, `email`, `phone` — truthiness check only, no format validation.

**Response:** `{ success, lead_id, redirect_url, booking_type, debug }`.
Note that `redirect_url` is returned but the current front end **ignores it** and uses its
own `HPA_CLINICS` table in `js/main.js` — two sources of truth. Also note the `500` branch
returns the default clinic's `redirect_url`, so a failed submission still sends the patient
to Jane.

---

## Known issues in the deployed version

Carried over from the Task 2 audit. **None are fixed in this capture** — this file is a
verbatim snapshot, not a corrected one.

| # | Issue |
|---|---|
| 1 | `Access-Control-Allow-Origin: "*"` — any origin on the internet can POST leads. The real site calls `/api/lead` same-origin, so restricting this costs nothing. |
| 2 | No honeypot, no CAPTCHA, no rate limiting |
| 3 | No server-side email or phone validation |
| 4 | No field length caps — `notes` is unbounded |
| 5 | `primary_concern` accepts **any** string; no taxonomy allow-list |
| 6 | Unknown/invalid `target_clinic` **silently falls back** to Lei's Acupuncture |
| 7 | `success: true` is returned even when the KV write failed — the patient sees success while the lead is lost |
| 8 | `user_ip` (`CF-Connecting-IP`) is stored in KV beside health-related fields |
| 9 | `debug` object is returned to the browser, including up to 200 chars of Apps Script output |
| 10 | Apps Script failure never changes the patient-facing result and is not durably logged |

---

## Deploy / rollback

**Current practice is dashboard paste-and-deploy.** Do not switch to `wrangler deploy`
until every `VERIFY` item in `wrangler.toml` is confirmed — an unverified config can drop
the route or the KV binding on a Worker that handles live patient data.

**Rollback:** Cloudflare Dashboard → Workers & Pages → hpa-leads → Deployments → select
the recorded version ID → Rollback. Seconds, and independent of git.

**Never** create a second KV namespace. Existing v1 lead records must stay readable.

---

## Related files

| Path | What |
|---|---|
| `worker.js` | Deployed production source, verbatim (this capture) |
| `wrangler.toml` | Reconstructed config — **verify before use** |
| `apps-script/Code.gs` | Recovered Apps Script source (Sheet + email) |
| `../hpa-partners/` | Separate partner-application Worker — **not deployed** |
| `../../js/main.js` | Front end; holds the duplicate `HPA_CLINICS` table |

**Google Drive:** `HPA_Deployment_Guide.md` documents the original 2026-04-19 setup. It is
now **partly stale** — it still describes MailChannels SPF configuration, which Worker v2.0
removed in favour of Apps Script `MailApp`.
