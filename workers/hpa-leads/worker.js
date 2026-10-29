/* ============================================================================
   HPA Lead Capture Worker — v3.0
   Cloudflare Worker for harmonypainalliance.com

   STATUS: LIVE IN PRODUCTION — seven-category v1 deployed 2026-09-18 UTC
     (2026-09-17 ET) via the Cloudflare dashboard editor; five-request
     live test passed (see private-handoffs/2026-09-18-seven-category-v1-worker.md §7).
     Production Version ID : 737a95f3
     Rollback  Version ID  : 33a1db41  (v3.0 four-value taxonomy, 2026-08-20)
     Older rollback        : 778d24c9  (v2.0 — keep available; source in
                             worker.v2-deployed-778d24c9.js)
     Production verification PASSED 2026-08-20/21 UTC, end-to-end:
     live form → Worker v3 → KV (schema_version 2) → Google Sheet →
     HPA internal email → Jane booking redirect.

   Deployment state at launch (all per approved decisions):
     - note cap             : 2000 (migration window; tighten to 300 only
                              when the shared component ships a visible
                              maxlength + counter)
     - HPA_RATELIMIT        : unbound — rate limiting inert
     - GOOGLE_SCRIPT_URL    : still a Text variable; Secret conversion is a
                              separate approved step
     - Postmark             : not configured — clinic notification inactive
     - connection_status    : therefore always "stored"

   Bindings
     KV       HPA_LEADS          (required) — existing namespace, unchanged
     var      GOOGLE_SCRIPT_URL  (required) — existing Apps Script /exec, unchanged
     var      ALLOWED_ORIGINS    (optional) — comma-separated extra CORS origins
     KV       HPA_RATELIMIT      (optional) — if absent, rate limiting is skipped
     var      POSTMARK_TOKEN     (optional) — reserved; clinic notification NOT enabled

   ---------------------------------------------------------------------------
   v3.0 changes (all approved in Task 3)
   ---------------------------------------------------------------------------
     1. DURABLE-STORAGE TRUTH RULE
        ok:true only when the KV write succeeds. KV failure → 503, and NO
        redirect_url is returned on any failure path.
     2. INPUT VALIDATION
        name required; at least one VALID contact channel (email or phone);
        email + phone format checks; trimming; per-field length caps;
        request size limit.
     3. PRIMARY CONCERN ALLOW-LIST — seven-category v1 (2026-09-18), nine
        values: pain-msk | chronic-complex | neuro | fertility | womens |
        mind-sleep | cosmetic | other-health-concern | not-sure. Legacy
        post-stroke-neuro / chronic-complex-pain were mapped until 2026-10-18;
        the map was removed in v3.3, so old values now return 422
        invalid_concern. An absent/empty concern stays legal.
     4. CLINIC REGISTRY IS AUTHORITATIVE
        No is_default. No silent fallback. Unknown/inactive slug → 422.
     5. FULL ATTRIBUTION — source_page (new), source_button, page_language,
        target_clinic, primary_concern, patient-preferred language.
     6. SCHEMA V2 — schema_version, resolved_clinic, connection_status.
        user_ip / user_city / user_region are NO LONGER RETAINED.
        user_country retained.
     7. SECURITY — CORS locked to HPA origins, honeypot, no browser-visible
        debug, invalid clinic + concern rejected, optional transient rate
        limiting. No CAPTCHA.
     8. RESPONSE CONTRACT — explicit JSON; Worker-authoritative booking
        destination; connection_status of stored | clinic_notified |
        notification_failed.
     9. APPS SCRIPT — still called, unchanged endpoint, legacy-shaped payload
        so the existing 22-column Sheet keeps working. Its result is recorded
        but NEVER trusted to mean success (it returns HTTP 200 on error).
    10. BACKWARD COMPATIBILITY — the live v1 front end keeps working unchanged.
        Legacy field names accepted; legacy response keys still emitted.

   Clinic notification via Postmark is SCAFFOLDED BUT INERT — see notifyClinic().

   ---------------------------------------------------------------------------
   v3.1 — consent record (legal v1, 2026-09-18; source patch, NOT YET DEPLOYED)
   ---------------------------------------------------------------------------
     - Reads consent_terms, clinic_share_consent, terms_version, privacy_version
       from the form; generates consent_at server-side. All four stored in KV
       and forwarded to Apps Script (Sheet columns 23-26).
     - CONSENT_REQUIRED switch (below). false = accept and record; true = 422
       consent_required / clinic_consent_required. Deploy with false first,
       flip to true only after the front end with the consent box is live.
     - Legacy top-level `redirect_url` in the response REMOVED (dead code:
       main.js reads clinic.redirect_url only; approved 2026-09-18).

   ---------------------------------------------------------------------------
   v3.2 — Health Pointe + HIPAA data minimisation (2026-10-22; source patch,
   NOT YET DEPLOYED. Deploy AFTER Code.gs v2.4 — see deploy order in
   private-handoffs/2026-10-22-health-pointe-v1.md)
   ---------------------------------------------------------------------------
     1. CLINIC_REGISTRY: + "health-pointe-jacksonville" (phone-only, no booking
        URL). Registry now carries per-clinic `forward` config.
     2. CLINIC FORWARD (Health Pointe only): the Worker does NOT email clinics.
        When the lead names a clinic whose registry entry has `forward` AND the
        patient ticked clinic_share_consent, the payload to Apps Script carries
        `clinic_forward` {clinic_id, to, fields, subject_label}. Apps Script
        (Gmail/MailApp from founder@, Google BAA) sends ONLY the listed fields
        (Health Pointe: name, contact, primary_concern). Get Matched leads are
        never forwarded. Postmark stays inert.
     3. KV (HPA_LEADS) now stores ONLY { lead_id, submitted_at } (Cloudflare has
        no BAA). The Google Sheet is the single record; the durable-storage gate
        moved from "KV write succeeded" to "Apps Script returned {ok:true}".
        Apps Script failure / timeout / non-JSON → 503 storage_failed, no
        redirect, nothing promised. KV write failure is logged, non-fatal.
     4. Apps Script is called with redirect:"follow" (POST → 302 → GET of the
        result) so the Worker can read its JSON answer. Needs Code.gs v2.4,
        which returns {ok:true|false, clinic_forward}.
     5. If a forward was expected but Apps Script did not report "sent":
        connection_status = "notification_failed" and next_step =
        "hpa_will_follow_up" (the internal email is flagged FORWARD FAILED).

   ---------------------------------------------------------------------------
   v3.3 — release prep (2026-10-29; source patch, NOT YET DEPLOYED)
   ---------------------------------------------------------------------------
     1. CLINIC_REGISTRY unchanged from v3.2: lei-acupuncture and
        health-pointe-jacksonville. South Florida TCM is NOT added.
     2. LEGACY_CONCERN_MAP removed (the 30-day window ended 2026-10-18).
     3. Open item: Health Pointe patient booking link (waiting on the clinic).
   ========================================================================= */

const SCHEMA_VERSION = 2;

/* Apps Script confirmation timeout (ms). Apps Script cold starts are slow;
   Cloudflare's own limit is far above this. */
const APPS_SCRIPT_TIMEOUT_MS = 20000;

/* Consent gate (legal v1). Keep false until the consent-box front end is live
   and verified; then set true and redeploy. See consent-spec-v2.md §3. */
const CONSENT_REQUIRED = true;
const VERSION_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/* ---------------------------------------------------------------------------
   Clinic registry — the single authoritative source.
   The front end must consume `redirect_url` from the response, not its own copy.
   NOTE: no `is_default`. Unknown or inactive slugs are rejected, never rerouted.
   ------------------------------------------------------------------------ */
const CLINIC_REGISTRY = {
  "lei-acupuncture": {
    id: "lei-acupuncture",
    display_name: "Lei's Acupuncture",
    active: true,
    city: "Winter Garden",
    state: "FL",
    phone: "561-403-6485",
    languages: ["en", "es", "zh"],
    accepted_concerns: [
      "post-stroke-neuro",
      "chronic-complex-pain",
      "other-health-concern",
      "not-sure"
    ],
    booking_type: "janeapp",
    booking_url: "https://leisacupuncture.janeapp.com",
    // Clinic-facing notification destination. Confirmed by Haiyan 2026-08-20.
    // NOT yet used — notifyClinic() is inert until Postmark is configured.
    notification_destination: "leidong@leisacupuncture.com"
    // No `forward` block: Lei's flow is unchanged (leads reach HPA, HPA follows up).
  },
  "health-pointe-jacksonville": {
    id: "health-pointe-jacksonville",
    display_name: "Health Pointe Jacksonville",
    active: true,
    city: "Jacksonville",
    state: "FL",
    phone: "904-448-0046",
    languages: ["en"],
    accepted_concerns: [],          // dormant (matchClinic() is not called)
    // No online booking: patient is told the clinic will contact them and sees
    // the phone number (main.js clinicContact string). redirect_url stays null.
    // TODO (open): waiting for the clinic to provide a patient booking link.
    // If provided: set booking_type/booking_url here, then add the page button.
    booking_type: "phone-only",
    booking_url: null,
    // Patient-request mailbox, chosen by the clinic (info@hpjax.com, 2026-10-21).
    notification_destination: "info@hpjax.com",
    // Per-clinic forward config — the clinic chose "only name, contact, main
    // concern" (Dr. Miller, 2026-10-21; HPA committed in writing). Field names:
    //   name | contact (email + phone) | primary_concern (label, never free text)
    // Never add `note`/`notes` or any health detail here. Code.gs keeps its own
    // allow-list of recipient + fields (defence in depth) — keep both in sync.
    forward: {
      fields: ["name", "contact", "primary_concern"],
      subject_label: "Health Pointe"
    }
  }
  // Additional clinics: add here only. No front-end change required.
};

/* Public taxonomy — seven-category v1 (2026-09-18). Codes follow
   clinic-outreach/分类标准_v1.md §1 plus "other" and "not-sure". Order is
   fixed; do not reorder. Expansion is governed by "one meaning = one
   taxonomy value". */
const ALLOWED_CONCERNS = [
  "pain-msk",
  "neuro",
  "womens",
  "fertility",
  "mind-sleep",
  "chronic-complex",
  "cosmetic",
  "other-health-concern",
  "not-sure"
];

const ALLOWED_LANGUAGES = ["en", "es", "zh"];

/* Shown in the notification email (subject + ROUTING) and Sheet column 18
   when a lead has no resolved clinic. */
const UNASSIGNED_CLINIC_LABEL = "(unassigned — manual follow-up)";

/* CORS. The live site calls /api/lead SAME-ORIGIN, so this costs legitimate
   traffic nothing — it only stops other sites posting leads from a browser.
   www is included defensively in case the production Origin differs. */
const DEFAULT_ALLOWED_ORIGINS = [
  "https://harmonypainalliance.com",
  "https://www.harmonypainalliance.com"
];

/* Limits */
const MAX_BODY_BYTES = 16 * 1024;
const CAPS = {
  name: 100,
  email: 254,
  phone: 32,
  /* MIGRATION-WINDOW VALUE — 2000, not the final 300.

     The live v1 textarea has no `maxlength` and no character counter, so a
     server-side 300 cap would silently discard text a patient could see
     themselves typing. Approved rule:

       v1 front end + Worker v3   → 2000   (this value)
       shared connection component → 300, with a VISIBLE maxlength + counter,
                                     and only THEN tighten the Worker to 300

     Tighten this to 300 in the same change that ships the new component, so
     the patient always sees the same limit the server enforces. */
  note: 2000,
  source_page: 200,
  source_button: 64,
  language: 8,
  page_language: 8,
  target_clinic: 64,
  legacy: 100,
  terms_version: 10,
  privacy_version: 10
};

/* Optional transient rate limit. Disabled unless HPA_RATELIMIT is bound.
   Keys are SHA-256 hashes — the raw IP is never written anywhere.

   The cap is deliberately GENEROUS. Patients routinely share a public IP:
   clinic waiting-room WiFi, family broadband, corporate NAT, and mobile
   carrier CGNAT can put many people behind one address. This is a flood
   brake, not a per-person quota — a threshold tuned for "one human" would
   block real patients. Local runtime testing with a 5/10min cap locked out
   legitimate traffic after five requests, which is what prompted this value. */
const RATE_LIMIT = { max: 30, windowSeconds: 600 };

/* Legacy v1 fields. Still accepted and still forwarded to Apps Script so the
   existing Sheet columns 8-13 keep working while the v1 forms are live.
   Delete this block once the shared connection component has shipped. */
const LEGACY_FIELDS = [
  "duration",
  "first_acupuncture",
  "first_visit",
  "preferred_time",
  "insurance",
  "how_found"
];

/* ------------------------------------------------------------------ helpers */

function trimTo(value, max) {
  if (value === undefined || value === null) return "";
  return String(value).trim().slice(0, max);
}

function corsHeaders(origin, env) {
  const extra = (env && env.ALLOWED_ORIGINS ? env.ALLOWED_ORIGINS.split(",") : [])
    .map(o => o.trim())
    .filter(Boolean);
  const allowed = DEFAULT_ALLOWED_ORIGINS.concat(extra);
  const headers = {
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Vary": "Origin"
  };
  if (origin && allowed.includes(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
  }
  return headers;
}

function isOriginAllowed(origin, env) {
  // No Origin header (non-browser client) is permitted — CORS is a browser
  // control. Non-browser abuse is handled by honeypot + rate limit + validation.
  if (!origin) return true;
  const extra = (env && env.ALLOWED_ORIGINS ? env.ALLOWED_ORIGINS.split(",") : [])
    .map(o => o.trim())
    .filter(Boolean);
  return DEFAULT_ALLOWED_ORIGINS.concat(extra).includes(origin);
}

function json(body, status, origin, env) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders(origin, env),
      "Content-Type": "application/json",
      "Cache-Control": "no-store"
    }
  });
}

function fail(code, status, origin, env, field) {
  const body = { ok: false, error: code, success: false };
  if (field) body.field = field;
  // NOTE: no redirect_url on ANY failure path. This is deliberate (v2 returned
  // the clinic booking URL even on a 500, sending patients to Jane after a
  // submission that was never recorded).
  return json(body, status, origin, env);
}

function generateLeadId() {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).substring(2, 6);
  return `lead_${ts}_${rand}`;
}

/* Deliberately permissive — stricter than v2 (which had none) but not so tight
   that it rejects addresses the browser already accepted. */
function isValidEmail(value) {
  if (!value || value.length > CAPS.email) return false;
  return /^[^\s@,;:<>()[\]\\]+@[^\s@.,;:<>()[\]\\]+(\.[^\s@.,;:<>()[\]\\]+)+$/.test(value);
}

/* Digits only, 7-15, matching E.164 bounds. Extensions and formatting survive
   because we count digits rather than pattern-matching the whole string. */
function isValidPhone(value) {
  if (!value) return false;
  const digits = value.replace(/\D/g, "");
  return digits.length >= 7 && digits.length <= 15;
}

function normalizePhone(value) {
  const digits = value.replace(/\D/g, "");
  return digits ? digits : "";
}

/* /en/stroke-recovery-acupuncture/ — normalized, then shape-checked. */
function normalizeSourcePage(value) {
  let p = trimTo(value, CAPS.source_page);
  if (!p) return "";
  p = p.split("?")[0].split("#")[0];
  if (!p.startsWith("/")) p = "/" + p;
  p = p.replace(/index\.html$/i, "");
  if (!p.endsWith("/")) p += "/";
  return /^\/[a-zA-Z0-9/_-]*$/.test(p) ? p : "";
}

async function hashKey(value) {
  const data = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 32);
}

/* Returns true when the caller should be blocked. Fails OPEN on any error —
   a broken limiter must never block a real patient. */
async function isRateLimited(request, env) {
  if (!env.HPA_RATELIMIT) return false;
  const ip = request.headers.get("CF-Connecting-IP");
  if (!ip) return false;
  try {
    const key = "rl:" + (await hashKey(ip));
    const current = parseInt((await env.HPA_RATELIMIT.get(key)) || "0", 10);
    if (current >= RATE_LIMIT.max) return true;
    await env.HPA_RATELIMIT.put(key, String(current + 1), {
      expirationTtl: RATE_LIMIT.windowSeconds
    });
    return false;
  } catch (err) {
    return false;
  }
}

/* --------------------------------------------------------------- resolution */

function getClinic(id) {
  if (!id) return null;
  const clinic = CLINIC_REGISTRY[id];
  if (!clinic || !clinic.active) return null;
  return clinic;
}

/* Server-side matching for Get Matched (target_clinic omitted).
   NOT CALLED since 2026-09-18 (seven-category v1): Get Matched leads are
   stored unassigned for manual follow-up. Kept for a future region-aware
   matcher; CLINIC_REGISTRY.accepted_concerns is likewise dormant. */
function matchClinic(concern) {
  const active = Object.values(CLINIC_REGISTRY).filter(c => c.active);
  if (!active.length) return null;
  if (!concern) return null;
  return active.find(c => c.accepted_concerns.includes(concern)) || null;
}

/* ------------------------------------------------------- clinic notification
   INERT. Postmark is approved but not configured: no account, no DNS, no
   token. Enabling this is a separate approved step. Until then every lead
   resolves to connection_status "stored".
   ------------------------------------------------------------------------ */
async function notifyClinic(lead, clinic, env) {
  if (!env.POSTMARK_TOKEN || !clinic || !clinic.notification_destination) {
    return { attempted: false, ok: false };
  }
  // Intentionally not implemented in v3.0. When Postmark is configured this
  // sends the MINIMIZED clinic-facing payload only — never source_page,
  // source_button, page_language, user_country or any internal metadata.
  return { attempted: false, ok: false };
}

/* --------------------------------------------------------------- Apps Script
   POST the lead and WAIT for Apps Script's explicit confirmation.
   Apps Script answers a POST with 302 → GET result; redirect:"follow" turns the
   302 into a GET of the result URL (it does not re-run doPost). Resolves to
   { ok:true, clinic_forward } only for HTTP 200 + JSON {ok:true}.
   Never throws. */
async function postToAppsScript(env, payload) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), APPS_SCRIPT_TIMEOUT_MS);
  try {
    const resp = await fetch(env.GOOGLE_SCRIPT_URL, {
      method: "POST",
      body: JSON.stringify(payload),
      redirect: "follow",
      signal: controller.signal
    });
    if (resp.status !== 200) return { ok: false, reason: "http_" + resp.status };
    let data;
    try {
      data = JSON.parse(await resp.text());
    } catch (err) {
      return { ok: false, reason: "non_json" };
    }
    if (!data || data.ok !== true) return { ok: false, reason: "not_confirmed" };
    return {
      ok: true,
      clinic_forward: typeof data.clinic_forward === "string" ? data.clinic_forward : "none"
    };
  } catch (err) {
    return { ok: false, reason: err && err.name === "AbortError" ? "timeout" : "error" };
  } finally {
    clearTimeout(timer);
  }
}

/* Per-clinic forward instruction for Apps Script. Only when the lead names a
   clinic whose registry entry has `forward` AND the patient ticked the
   clinic-share box. Apps Script re-checks recipient + fields against its own
   allow-list and builds the email from the listed fields only. */
function buildClinicForward(lead, clinic) {
  if (!clinic || !clinic.forward || !lead.clinic_share_consent) return null;
  if (!clinic.notification_destination) return null;
  return {
    clinic_id: clinic.id,
    to: clinic.notification_destination,
    fields: clinic.forward.fields,
    subject_label: clinic.forward.subject_label
  };
}

/* --------------------------------------------------------------- Apps Script
   Legacy-shaped payload. The deployed Apps Script writes 22 fixed columns
   positionally with `|| ""` defaults, so this shape must be preserved until
   the approved Apps Script v2 edit ships.

   Deliberate mappings:
     note  → notes         keeps Sheet column 14 populated despite the rename
     legacy fields         forwarded so columns 8-13 keep working
     user_city/user_region sent EMPTY — no longer collected (approved D9),
                           so columns 20-21 will blank. Intended.
   ------------------------------------------------------------------------ */
function buildAppsScriptPayload(lead, clinic) {
  return {
    lead_id: lead.lead_id,
    submitted_at: lead.submitted_at,
    name: lead.name,
    email: lead.email,
    phone: lead.phone,
    language: lead.language,
    primary_concern: lead.primary_concern,
    duration: lead.legacy.duration || "",
    first_acupuncture: lead.legacy.first_acupuncture || "",
    first_visit: lead.legacy.first_visit || "",
    preferred_time: lead.legacy.preferred_time || "",
    insurance: lead.legacy.insurance || "",
    how_found: lead.legacy.how_found || "",
    notes: lead.note,
    source_button: lead.source_button,
    page_language: lead.page_language,
    target_clinic: lead.resolved_clinic || lead.target_clinic || "",
    // Unassigned (Get Matched) leads: the pinned Apps Script v3 always prints
    // "[HPA Lead] name — concern — <target_clinic_name>" and a ROUTING block
    // with "Target Clinic:" and "Booking URL:" (Code.gs L90–92, L114–116; it
    // substitutes "Unknown Clinic" when the name is empty). The Worker cannot
    // suppress those segments, so it supplies the placeholder text instead
    // and sends an empty booking URL.
    target_clinic_name: clinic ? clinic.display_name : UNASSIGNED_CLINIC_LABEL,
    target_booking_url: clinic ? clinic.booking_url : "",
    user_city: "",
    user_region: "",
    user_country: lead.user_country,
    // legal v1 consent record → Sheet columns 23-26 (Code.gs v2.3)
    terms_version: lead.terms_version || "",
    privacy_version: lead.privacy_version || "",
    consent_at: lead.consent_at || "",
    clinic_share_consent: lead.clinic_share_consent ? "yes" : "no",
    consent_terms: lead.consent_terms ? "yes" : "no",
    // v3.2: forward instruction (null unless this lead is forwardable)
    clinic_forward: buildClinicForward(lead, clinic),
    // v3 additions — ignored by the current script, ready for the v2 edit.
    source_page: lead.source_page,
    schema_version: lead.schema_version,
    connection_status: lead.connection_status,
    resolved_clinic: lead.resolved_clinic || ""
  };
}

/* ==========================================================================
   Handler
   ======================================================================== */

export default {
  async fetch(request, env, ctx) {
    const origin = request.headers.get("Origin");
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      if (!isOriginAllowed(origin, env)) {
        return new Response(null, { status: 403 });
      }
      return new Response(null, { status: 204, headers: corsHeaders(origin, env) });
    }

    if (url.pathname !== "/api/lead" || request.method !== "POST") {
      return fail("not_found", 404, origin, env);
    }

    if (!isOriginAllowed(origin, env)) {
      return fail("origin_not_allowed", 403, origin, env);
    }

    /* --- request size ------------------------------------------------- */
    const declaredLength = parseInt(request.headers.get("Content-Length") || "0", 10);
    if (declaredLength > MAX_BODY_BYTES) {
      return fail("payload_too_large", 413, origin, env);
    }

    let raw;
    try {
      raw = await request.text();
    } catch (err) {
      return fail("invalid_body", 400, origin, env);
    }
    if (raw.length > MAX_BODY_BYTES) {
      return fail("payload_too_large", 413, origin, env);
    }

    let body;
    try {
      body = JSON.parse(raw);
    } catch (err) {
      return fail("invalid_json", 400, origin, env);
    }
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return fail("invalid_json", 400, origin, env);
    }

    /* --- honeypot ------------------------------------------------------
       A hidden field no human fills in. Answer 200 with a plausible shape so
       bots cannot distinguish rejection from success. Nothing is stored. */
    if (trimTo(body.website_url_hp, 200) || trimTo(body.company_website_hp, 200)) {
      return json(
        {
          ok: true,
          status: "stored",
          lead_id: generateLeadId(),
          clinic: null,
          next_step: "hpa_will_follow_up",
          success: true
        },
        200,
        origin,
        env
      );
    }

    /* --- rate limit ---------------------------------------------------- */
    if (await isRateLimited(request, env)) {
      return fail("rate_limited", 429, origin, env);
    }

    /* --- normalize ----------------------------------------------------- */
    const name = trimTo(body.name, CAPS.name);
    const email = trimTo(body.email, CAPS.email);
    const phone = trimTo(body.phone, CAPS.phone);
    // v1 sends `notes`; v2 front end will send `note`. Accept both.
    const note = trimTo(body.note !== undefined ? body.note : body.notes, CAPS.note);
    const sourceButton = trimTo(body.source_button, CAPS.source_button) || "unknown";
    const sourcePage = normalizeSourcePage(body.source_page);
    const targetClinicRaw = trimTo(body.target_clinic, CAPS.target_clinic);

    let pageLanguage = trimTo(body.page_language, CAPS.page_language).toLowerCase();
    if (!ALLOWED_LANGUAGES.includes(pageLanguage)) pageLanguage = "en";

    // v1 sends the display label ("English"/"Español"/"中文"); v2 will send a code.
    let language = trimTo(body.language, 32);
    const languageMap = {
      english: "en", en: "en",
      "español": "es", espanol: "es", es: "es",
      "中文": "zh", zh: "zh", chinese: "zh"
    };
    language = languageMap[language.toLowerCase()] || (ALLOWED_LANGUAGES.includes(language) ? language : "");

    /* --- validation ----------------------------------------------------- */
    if (!name) {
      return fail("missing_name", 422, origin, env, "name");
    }

    const emailValid = email ? isValidEmail(email) : false;
    const phoneValid = phone ? isValidPhone(phone) : false;

    // At least ONE usable channel. A malformed value in the other channel is
    // kept rather than rejected — a lead with one good channel is still a lead.
    if (!emailValid && !phoneValid) {
      if (!email && !phone) return fail("missing_contact", 422, origin, env, "email");
      if (email && !emailValid) return fail("invalid_email", 422, origin, env, "email");
      return fail("invalid_phone", 422, origin, env, "phone");
    }

    /* --- consent (legal v1) --------------------------------------------- */
    const consentTerms = trimTo(body.consent_terms, 8) === "1";
    const clinicShareConsentRaw = trimTo(body.clinic_share_consent, 8) === "1";
    let termsVersion = trimTo(body.terms_version, CAPS.terms_version);
    let privacyVersion = trimTo(body.privacy_version, CAPS.privacy_version);
    if (!VERSION_DATE_RE.test(termsVersion)) termsVersion = "";
    if (!VERSION_DATE_RE.test(privacyVersion)) privacyVersion = "";
    if (CONSENT_REQUIRED && !consentTerms) {
      return fail("consent_required", 422, origin, env, "consent_terms");
    }

    // Seven-category v1 values only (legacy four-value map removed in v3.3).
    const primaryConcern = trimTo(body.primary_concern, 64);
    if (primaryConcern && !ALLOWED_CONCERNS.includes(primaryConcern)) {
      return fail("invalid_concern", 422, origin, env, "primary_concern");
    }

    /* --- clinic resolution — no silent fallback ------------------------- */
    // Path discriminator: `target_clinic` present = REQUEST APPOINTMENT
    // (clinic page "Connect with This Clinic", front end sends data-clinic);
    // absent = GET MATCHED. Since 2026-09-18 Get Matched never resolves a
    // clinic server-side: resolved_clinic / booking_url stay empty and HPA
    // follows up by hand (multi-clinic network; no region data on the form).
    let clinic = null;
    if (targetClinicRaw) {
      clinic = getClinic(targetClinicRaw);
      if (!clinic) {
        return fail("invalid_clinic", 422, origin, env, "target_clinic");
      }
      if (CONSENT_REQUIRED && !clinicShareConsentRaw) {
        return fail("clinic_consent_required", 422, origin, env, "clinic_share_consent");
      }
    }
    // Clinic-share consent only means anything on the Request Appointment path.
    const clinicShareConsent = !!clinic && clinicShareConsentRaw;
    // else: Get Matched → clinic stays null (matchClinic() intentionally not called).

    /* --- legacy passthrough --------------------------------------------- */
    const legacy = {};
    for (const key of LEGACY_FIELDS) {
      const v = trimTo(body[key], CAPS.legacy);
      if (v) legacy[key] = v;
    }

    /* --- build the Schema V2 record -------------------------------------
       Deliberately absent: user_ip, user_city, user_region (approved D9). */
    const cf = request.cf || {};
    const lead = {
      lead_id: generateLeadId(),
      submitted_at: new Date().toISOString(),
      schema_version: SCHEMA_VERSION,

      name,
      email,
      phone,
      phone_normalized: phoneValid ? normalizePhone(phone) : "",
      language,
      primary_concern: primaryConcern,
      note,

      target_clinic: targetClinicRaw || null,
      resolved_clinic: clinic ? clinic.id : null,
      booking_type: clinic ? clinic.booking_type : "none",
      booking_url: clinic ? clinic.booking_url : null,

      source_page: sourcePage,
      source_button: sourceButton,
      page_language: pageLanguage,
      user_country: cf.country || "",

      connection_status: "stored",

      // legal v1 consent record
      consent_terms: consentTerms,
      clinic_share_consent: clinicShareConsent,
      terms_version: termsVersion,
      privacy_version: privacyVersion,
      consent_at: new Date().toISOString(),

      legacy
    };

    /* --- 1. STORE — the gate (v3.2) ------------------------------------
       The Google Sheet (Apps Script, Google BAA) is the record of truth.
       Success = Apps Script returned {ok:true}. Anything else → 503 and no
       promise to the patient. */
    if (!env.GOOGLE_SCRIPT_URL) {
      console.error("hpa-leads: GOOGLE_SCRIPT_URL missing");
      return fail("storage_failed", 503, origin, env);
    }
    const stored = await postToAppsScript(env, buildAppsScriptPayload(lead, clinic));
    if (!stored.ok) {
      console.error("hpa-leads: Apps Script did not confirm: " + stored.reason);
      return fail("storage_failed", 503, origin, env);
    }

    /* --- 2. KV — lead_id + timestamp ONLY (Cloudflare has no BAA) ------- */
    if (env.HPA_LEADS) {
      try {
        await env.HPA_LEADS.put(
          lead.lead_id,
          JSON.stringify({ lead_id: lead.lead_id, submitted_at: lead.submitted_at }),
          { expirationTtl: 365 * 24 * 60 * 60 }
        );
      } catch (err) {
        // Non-fatal: the Sheet already holds the lead.
        console.error("hpa-leads: KV write failed: " + err.message);
      }
    }

    /* --- 3. CLINIC NOTIFICATION — Postmark path stays inert ------------- */
    const notified = await notifyClinic(lead, clinic, env);
    if (notified.attempted) {
      lead.connection_status = notified.ok ? "clinic_notified" : "notification_failed";
    }

    /* Clinic forward (Apps Script, from founder@): reported back in the
       confirmation. Expected = clinic has `forward` AND consent given. */
    const forwardExpected = !!buildClinicForward(lead, clinic);
    if (forwardExpected) {
      lead.connection_status =
        stored.clinic_forward === "sent" ? "clinic_notified" : "notification_failed";
    }

    // Server-side only. No PII, and never returned to the browser.
    console.log(
      JSON.stringify({
        lead_id: lead.lead_id,
        resolved_clinic: lead.resolved_clinic,
        connection_status: lead.connection_status,
        apps_script: "confirmed",
        clinic_forward: stored.clinic_forward,
        schema_version: SCHEMA_VERSION
      })
    );

    /* --- 4. RESPOND ----------------------------------------------------- */
    let nextStep;
    if (forwardExpected && stored.clinic_forward !== "sent") nextStep = "hpa_will_follow_up";
    else if (clinic && clinic.booking_type === "phone-only") nextStep = "clinic_will_contact";
    else if (clinic && clinic.booking_url) nextStep = "booking";
    else nextStep = "hpa_will_follow_up";

    const response = {
      ok: true,
      status: lead.connection_status,
      lead_id: lead.lead_id,
      clinic: clinic
        ? {
            id: clinic.id,
            display_name: clinic.display_name,
            booking_type: clinic.booking_type,
            redirect_url: clinic.booking_type === "phone-only" ? null : clinic.booking_url,
            phone: clinic.booking_type === "phone-only" ? clinic.phone : undefined
          }
        : null,
      next_step: nextStep,

      /* Legacy keys kept for older consumers. Top-level `redirect_url` removed
         2026-09-18 (dead: main.js reads clinic.redirect_url only). */
      success: true,
      booking_type: clinic ? clinic.booking_type : "none"
    };

    // NOTE: no `debug` object. v2 returned Apps Script output to the browser.
    return json(response, 200, origin, env);
  }
};
