/* ============================================================================
   HPA Lead Capture Worker — v3.0
   Cloudflare Worker for harmonypainalliance.com

   STATUS: LIVE IN PRODUCTION.
     Deployed 2026-08-20 (America/New_York) / 2026-08-21 UTC via the
     Cloudflare dashboard editor.
     Production Version ID : 33a1db41
     Rollback  Version ID  : 778d24c9  (v2.0 — keep available; source in
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
     3. PRIMARY CONCERN ALLOW-LIST — the four current taxonomy values.
        Values themselves are UNCHANGED. An absent/empty concern stays legal.
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
   ========================================================================= */

const SCHEMA_VERSION = 2;

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
  }
  // Additional clinics: add here only. No front-end change required.
};

/* Current PHASE-1 public taxonomy. Values are locked — do not edit.
   Expansion is governed by "one meaning = one taxonomy value". */
const ALLOWED_CONCERNS = [
  "post-stroke-neuro",
  "chronic-complex-pain",
  "other-health-concern",
  "not-sure"
];

const ALLOWED_LANGUAGES = ["en", "es", "zh"];

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
  legacy: 100
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
   No default clinic: if nothing accepts the concern, this returns null and the
   lead is stored as a no-match for human follow-up. */
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
    target_clinic_name: clinic ? clinic.display_name : "",
    target_booking_url: clinic ? clinic.booking_url : "",
    user_city: "",
    user_region: "",
    user_country: lead.user_country,
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

    const primaryConcern = trimTo(body.primary_concern, 64);
    if (primaryConcern && !ALLOWED_CONCERNS.includes(primaryConcern)) {
      return fail("invalid_concern", 422, origin, env, "primary_concern");
    }

    /* --- clinic resolution — no silent fallback ------------------------- */
    let clinic = null;
    if (targetClinicRaw) {
      clinic = getClinic(targetClinicRaw);
      if (!clinic) {
        return fail("invalid_clinic", 422, origin, env, "target_clinic");
      }
    } else {
      // Get Matched path: server-side matching. May legitimately return null.
      clinic = matchClinic(primaryConcern);
    }

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
      legacy
    };

    /* --- 1. STORE — the gate ------------------------------------------- */
    if (!env.HPA_LEADS) {
      console.error("hpa-leads: KV binding missing");
      return fail("storage_failed", 503, origin, env);
    }
    try {
      await env.HPA_LEADS.put(lead.lead_id, JSON.stringify(lead), {
        expirationTtl: 365 * 24 * 60 * 60
      });
    } catch (err) {
      console.error("hpa-leads: KV write failed: " + err.message);
      return fail("storage_failed", 503, origin, env);
    }

    /* --- 2. CLINIC NOTIFICATION — inert until Postmark is configured ---- */
    const notified = await notifyClinic(lead, clinic, env);
    if (notified.attempted) {
      lead.connection_status = notified.ok ? "clinic_notified" : "notification_failed";
      try {
        await env.HPA_LEADS.put(lead.lead_id, JSON.stringify(lead), {
          expirationTtl: 365 * 24 * 60 * 60
        });
      } catch (err) {
        console.error("hpa-leads: status re-write failed: " + err.message);
      }
    }

    /* --- 3. HPA INTERNAL — existing Apps Script, unchanged endpoint ------
       Its result is recorded but NEVER trusted: the deployed script returns
       HTTP 200 even when the Sheet write throws, so "ok" here means only
       "Google accepted the request". It must not influence the patient
       outcome, and it never changes connection_status. */
    let appsScriptResult = "skipped";
    if (env.GOOGLE_SCRIPT_URL) {
      try {
        const resp = await fetch(env.GOOGLE_SCRIPT_URL, {
          method: "POST",
          body: JSON.stringify(buildAppsScriptPayload(lead, clinic)),
          redirect: "manual"
        });
        appsScriptResult =
          resp.status === 302 || resp.status === 200
            ? "accepted"
            : "unexpected_" + resp.status;
      } catch (err) {
        appsScriptResult = "error";
      }
    } else {
      appsScriptResult = "no_env_var";
    }

    // Server-side only. No PII, and never returned to the browser.
    console.log(
      JSON.stringify({
        lead_id: lead.lead_id,
        resolved_clinic: lead.resolved_clinic,
        connection_status: lead.connection_status,
        apps_script: appsScriptResult,
        schema_version: SCHEMA_VERSION
      })
    );

    /* --- 4. RESPOND ----------------------------------------------------- */
    let nextStep;
    if (clinic && clinic.booking_type === "phone-only") nextStep = "clinic_will_contact";
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

      /* Legacy keys — the live v1 front end does not read the body today, but
         these keep any older consumer working through the migration. Remove
         once the shared connection component is the only client. */
      success: true,
      redirect_url: clinic && clinic.booking_type !== "phone-only" ? clinic.booking_url : null,
      booking_type: clinic ? clinic.booking_type : "none"
    };

    // NOTE: no `debug` object. v2 returned Apps Script output to the browser.
    return json(response, 200, origin, env);
  }
};
