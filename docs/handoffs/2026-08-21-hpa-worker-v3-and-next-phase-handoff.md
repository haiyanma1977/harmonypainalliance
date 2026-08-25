# HPA HANDOFF — Worker v3 Live + Next Phase
**Date:** 2026-08-21 · **For:** fresh Cowork session continuing HPA platform work
**Repo:** `Harmony-Painalliance-Comms/website` (= harmonypainalliance.com; deploys via Cloudflare Pages on push)
**Companion docs in repo:** `workers/hpa-leads/README.md` (ops/rollback detail) · `workers/hpa-leads/HPA_Deployment_Guide.md` (deploy procedure)

---

## 1. COMPLETED — DO NOT REDO

### Worker v3 — LIVE IN PRODUCTION
- Production Version ID: **`33a1db41`** · Rollback Version ID: **`778d24c9`** (v2.0 — keep available; verbatim source at `workers/hpa-leads/worker.v2-deployed-778d24c9.js`)
- Deployed 2026-08-20 via Cloudflare dashboard editor (paste method — NOT `wrangler deploy`)
- **Production end-to-end test PASSED:** live HPA form → Worker v3 → KV (`schema_version: 2`) → Google Sheet row → HPA internal email (`founder@`, subject `[HPA Lead] …`) → Lei's Acupuncture Jane redirect
- Verified on real traffic: Origin `https://harmonypainalliance.com`; KV record contains no `user_ip`/`user_city`/`user_region`; Sheet cols 20–21 blank **by design** (D9); legacy label mapping `English→en` works
- Launch state: note cap **2000** (migration window — 300 only when the shared component ships a visible counter) · `HPA_RATELIMIT` **unbound** · CORS locked to apex+www · no `debug` in responses · unknown clinic slug → 422, **no silent fallback**
- **Worker/ops package COMMITTED AND PUSHED** (6 files under `workers/hpa-leads/`: worker.js, worker.v2-deployed-778d24c9.js, wrangler.toml, README.md, HPA_Deployment_Guide.md, apps-script/Code.gs). Secret scan clean; no stale deployment-state statements.

### Stroke Recovery medical evidence QA — COMMITTED AND PUSHED
- EN / ES / ZH `stroke-recovery-acupuncture/index.html`, two corrections each, byte-proven scope:
  - **PMID 38336368:** "measurable reorganization in the brain" → "changes in brain functional connectivity on neuroimaging" (ES: "cambios en la conectividad funcional del cerebro observados en neuroimagen"; ZH: "神经影像上可见的大脑功能连接变化")
  - **PMID 39084147:** evidence grade "low" → "**very low**" (ES "muy baja"; ZH "极低")
- **PMID 38252438** QoL statement independently verified by Haiyan against the paper and **retained unchanged** — do not weaken it
- Three-language pre-commit check passed (structure, JSON-LD, canonical/hreflang, FAQ, taxonomy all untouched)

**Principle applied throughout: evidence-accurate and balanced — never exaggerate, never weaken.**

---

## 2. CURRENT WORKING TREE

Only known remaining uncommitted website files:

```
en/clinics/leis-acupuncture/index.html
es/clinics/leis-acupuncture/index.html
zh/clinics/leis-acupuncture/index.html
```

These carry pre-existing local modifications (mtimes 2026-08-20, made **outside** the Cowork sessions). **They must be audited before any commit** — content unknown to prior sessions. See §4.

---

## 3. APPROVED BUT NOT YET EXECUTED

| Item | Key constraints |
|---|---|
| **`GOOGLE_SCRIPT_URL` Text → encrypted Secret** | **Separate operation** after stable v3 verification, not bundled with anything else. Same name, value passes through clipboard; recoverable from Apps Script → Manage deployments if lost. Procedure: README §6 / checklist. |
| **Apps Script v2 changes** (one bundled version) | Recipient `founder@` → **`info@harmonypainalliance.com`** · `getActiveSheet()` → `getSheetByName("Sheet1")` · schema/header handling (drop cols 8–13 sources, `notes`→`note` reference, add header cols 23–26 **by hand**: source_page, resolved_clinic, connection_status, schema_version). **Deploy by updating the EXISTING deployment → New Version — preserves `/exec` URL. DO NOT create a new deployment** (mints new URL, silently breaks the Worker). Owner: `haiyanma256@gmail.com` (personal); live deployment pinned to Version 3, not HEAD. |
| **Postmark** (approved clinic-facing provider) | Sending subdomain **`mail.harmonypainalliance.com`**. NOT configured: no account, no DNS, no token. Clinic notification stays inactive; `connection_status` stays `"stored"` — never claim `clinic_notified` until Postmark is configured and verified. Future DNS: DKIM TXT + `pm_bounces` CNAME → `pm.mtasv.net` (**DNS-only / grey cloud**), values from the real account only. Clinic destination: `leidong@leisacupuncture.com`. Two-role separation locked: HPA internal (`info@`, Apps Script/Sheet) vs clinic-facing (Postmark, minimized payload — no IP/attribution/metadata). |
| **Optional second synthetic test** | Legacy/optional-field passthrough (notes shim to Sheet col 14, cols 8–13, 526-char marker note, "Español" mapping). **Optional** — primary production verification already PASSED. Recipe exists in prior session if wanted. |

---

## 4. NEXT IMMEDIATE TASK

**READ-ONLY audit of exactly these three files:**

```
en/clinics/leis-acupuncture/index.html
es/clinics/leis-acupuncture/index.html
zh/clinics/leis-acupuncture/index.html
```

Focus especially on the **unresolved business-hours changes** and **JSON-LD `openingHoursSpecification`**. Known background: Task 1/2 audits found hours conflicting across the HPA Clinic Profile, HPA homepage structured data, and leisacupuncture.com (4 of 7 days differed). **Do not guess the correct hours** — report discrepancies; Haiyan resolves factual values. Also respect the standing rules: guillemet placeholders (⟪TODO⟫/⟪PENDIENTE⟫/⟪待确认⟫) are never filled/removed; NAP and JSON-LD values are report-only without explicit approval.

---

## 5. LATER TASK ORDER (after Clinic Profile audit)

1. Task 2 / shared patient connection flow
2. Get Matched pages (`/en|es|zh/get-matched/` — approved) + shared connection component (`js/hpa-connect.js` — B+C architecture)
3. Postmark clinic-facing notification (account → DNS → Worker enable, each separately approved)
4. Privacy / Terms updates required by the final data-flow architecture (must ship **with** the behavior they describe; factual change list exists from Task 3 planning)
5. **Then** resume Task 1 Navigation V2 implementation under the previously approved decisions (D1–D8 of the Task 1 pause: About HPA deferred to Homepage V2; Clinics dropdown links the Clinic Profile; homepage BreadcrumbList removal approved; ES CTA `Conéctate con una Clínica`)

---

## 6. OPERATING RULES FOR THE NEXT COWORK SESSION

- **Reconnect the local `website` folder** at session start (grants do not carry over); add the parent `Harmony-Painalliance-Comms` only if the old worker/ archives are needed
- The **repo is the source of truth** — `workers/hpa-leads/worker.js` is the authoritative v3 source; the deployed Worker's header comment lags it slightly (comment-only; self-heals at next deploy)
- **Do not run git** unless Haiyan explicitly requests it — commits/pushes are Haiyan's via GitHub Desktop
- **Do not deploy anything** without explicit approval
- **Preserve EN / ES / ZH parity** in any content change
- **No medical claim may be exaggerated OR weakened** — corrections must be faithful to the source papers
- **Do not reopen completed Worker v3 or Stroke QA work** unless a new verified defect is found
- Taxonomy values (`post-stroke-neuro`, `chronic-complex-pain`, `other-health-concern`, `not-sure`) remain locked; work step-by-step with explicit approval gates, one controlled commit scope at a time
