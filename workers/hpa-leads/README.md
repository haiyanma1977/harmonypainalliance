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
| **v3.0 — CURRENT** | **`33a1db41`** | `worker.js` | Deployed 2026-08-20 via dashboard editor |
| v2.0 — rollback target | **`778d24c9`** | `worker.v2-deployed-778d24c9.js` | Deployed 2026-04-20T02:29:37Z. **Keep available.** |

**Rollback:** Dashboard → Workers & Pages → hpa-leads → Deployments → **`778d24c9`** → Rollback.

---

## Apps Script deployment reference

Confirmed by Haiyan, 2026-08-20, from the Apps Script editor.

| Item | Value |
|---|---|
| Active deployment | **Version 3** |
| Created | **2026-04-19, 10:25 PM** (America/New_York) = 2026-04-20T02:25Z |
| Description | `HPA lead receiver Vison` *(sic — "Vison")* |
| Pinned to | **Version 3, NOT HEAD** |
| Owner account | `haiyanma256@gmail.com` (**personal Gmail**) |

> **Confirmed 2026-08-20:** HPA already operates a **Google Workspace environment for
> `harmonypainalliance.com`**, hosting `info@harmonypainalliance.com` and
> `founder@harmonypainalliance.com`. Corroborated independently by DNS — the domain's MX records are
> the standard Google Workspace set.
>
> **Consequence for the ownership-migration plan (Task 3 §2):** the destination tenant
> **already exists**. Migration no longer requires provisioning Workspace — steps 1 and part of 2 of
> the proposed sequence collapse to "pick the owning account in the existing tenant."
>
> The production "HPA Leads" Sheet and its bound Apps Script nonetheless **still live in a personal
> Gmail account**, outside that Workspace — so they sit outside HPA's admin console, Drive restore,
> audit logging, and any retention policy. The gap is now a **configuration** gap, not a
> provisioning one.
>
> **No migration authorized. Nothing moved.**

**Consequence: editing `Code.gs` does not change production.** A version-pinned Web App keeps
serving its pinned version; saved edits reach only the `/dev` URL, which requires a logged-in
Google session and is not what the Worker calls.

To make an edit live: **Deploy → Manage deployments → edit the existing deployment →
Version: New version → Deploy.** Updating the *existing* deployment **preserves the `/exec` URL**,
so `GOOGLE_SCRIPT_URL` does not change. Creating a *new deployment* instead mints a new URL and
would silently break the Worker.

### Deployment timeline (all America/New_York)

| When | What |
|---|---|
| Apr 19, 22:25 | Apps Script **Version 3** deployed — **currently live** |
| Apr 19, 22:29 | Worker deployed (v2.0) — **currently live**. 4 minutes later: consistent with pasting the new `/exec` URL into `GOOGLE_SCRIPT_URL` and redeploying. |
| Apr 19, 23:27 | `worker/google-apps-script.js` edited locally — **62 min AFTER** the live deployment |
| Apr 20, 01:53 | `worker/hpa-leads-worker.js` edited locally — **3h24m AFTER** the live deployment. **Confirmed divergent** (see below). |

### ⚠️ `apps-script/Code.gs` is UNVERIFIED against live Version 3

The recovered `Code.gs` was **modified locally after Version 3 was deployed** — the same pattern
that produced the confirmed Worker divergence. It may or may not match what is actually running.
There is no API in use here that can read a deployed Apps Script version, so this **cannot be
verified remotely**.

**Verification attempted and FAILED.** Haiyan opened Project History and selected Version 3 on
2026-08-20; **the code pane renders blank**, so the deployed source cannot be read from the UI.
There is no API in use here that can read it either.

**Status: deployed Version 3 source is UNVERIFIED and must be treated as unknown.**

Everything downstream was derived from the **local** file, not from deployed Version 3 — the Sheet
column mapping, the `founder@` recipient, the subject/body construction, and the error-handling
behaviour. Do not assume any of it describes production.

### How this resolves

Two things make this a documented limitation rather than a blocker:

1. **The deployed script's behaviour is observable in its outputs.** The Sheet's header row and
   populated columns show exactly what deployed Version 3 writes; an existing `[HPA Lead]` email
   shows the real recipient, subject format, and rendered fields. The column-mapping question can
   be re-grounded on artefacts that already exist — **no test submission and no code change
   required.**
2. **It self-resolves at the next deployment.** The v2 edit will deploy a new version *from*
   `apps-script/Code.gs`. At that moment production becomes byte-identical to source control and
   the uncertainty disappears permanently.

**Rule until then: do not rely on any assumption about Version 3's internals.** Ground every claim
about current behaviour in observed Sheet/email artefacts, and treat the v2 deployment as the point
where source control becomes authoritative.

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

This makes `SpreadsheetApp.getActiveSheet()` **unambiguous today**, but it stays fragile: adding a
second tab and leaving it active would silently divert lead rows.

> **v2 recommendation:** change the writer to `getSheetByName("Sheet1")`. Any future purge script
> must also target the sheet **by name**, never "active".

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
| `GOOGLE_SCRIPT_URL` | present, still a **Text variable** — Secret conversion pending |
| Postmark | **not configured** — clinic notification stubbed |
| `connection_status` | always **`stored`** — never claims `clinic_notified` |
| Apps Script | **unchanged** — Version 3, still notifies `founder@` |
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
                                          └─▶ Google Apps Script (see apps-script/)
                                                 ├─ appendRow → "HPA Leads" Sheet
                                                 └─ MailApp   → founder@harmonypainalliance.com
```

### Bindings

| Kind | Name | Value |
|---|---|---|
| KV namespace | `HPA_LEADS` | `hpa-leads` — `0a7c30cc4d6c49298efc0be6e0b37a34` (**the only KV namespace on the account**) |
| Variable | `GOOGLE_SCRIPT_URL` | Apps Script `/exec` endpoint — **value not committed** |

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
