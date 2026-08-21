/* ============================================
   HPA Partner Application Worker  —  hpa-partners  v1.0

   ┌───────────────────────────────────────────────────────────────────────┐
   │ STATUS: NOT DEPLOYED. THIS IS NOT LIVE INFRASTRUCTURE.                │
   │ Verified 2026-08-21: the Cloudflare account contains only hpa-leads,  │
   │ leisacupuncture and one unrelated Worker. There is no hpa-partners    │
   │ Worker and no /api/partner route in production.                       │
   │ Partner applications are handled by Google Forms today (see the       │
   │ /join/ and /tech-partnership/ pages). Source retained under version   │
   │ control per decision K7 (HPA Site Framework V2). Do not treat any     │
   │ behaviour described below as production behaviour, and do not deploy  │
   │ without an explicit, separate approval from Haiyan.                   │
   └───────────────────────────────────────────────────────────────────────┘

   Standalone Worker for harmonypainalliance.com partner applications.
   Deliberately separate from hpa-leads: different audience, different
   retention, different notification template, no patient booking flow.

   Route      : harmonypainalliance.com/api/partner   (POST)
   KV binding : HPA_PARTNERS          (own namespace — NOT HPA_LEADS)
   Env var    : PARTNER_SCRIPT_URL    (own Apps Script — NOT GOOGLE_SCRIPT_URL)
   Env var    : PARTNER_NOTIFY_EMAIL  (optional; defaults below)

   Differences from hpa-leads, on purpose:
   - No Jane App / booking redirect anywhere in the response.
   - No name/email/phone requirement. Partner forms collect a single free-text
     contact field (email OR phone OR WeChat), so requiring all three would
     reject legitimate applications.
   - Full field set is preserved. hpa-leads whitelists patient fields and drops
     everything else, which would silently discard clinic name, focus areas,
     and the applicant's motivation text.
   - Applications are business records: stored without a TTL, not expired
     after a year like patient leads.
   ============================================ */

const DEFAULT_NOTIFY_EMAIL = "founder@harmonypainalliance.com";

/* Accepted form types and their field sets. Anything not listed is ignored,
   so a malicious or malformed post cannot bloat the stored record. */
const FORM_SCHEMAS = {
  clinic: {
    label: "Clinic Partnership Application",
    required: ["clinic_name_full", "clinic_contact"],
    fields: [
      "clinic_name_full",   // Full name
      "clinic_name",        // Clinic name
      "clinic_title",       // Their title / role
      "clinic_location",    // State & city
      "clinic_website",
      "clinic_contact",     // Email / phone / WhatsApp (free text by design)
      "specialty",          // repeatable checkbox
      "timeline",
      "clinic_why"          // Why they want to join
    ]
  },
  tech: {
    label: "Technology Partnership Inquiry",
    required: ["tech_name", "tech_contact"],
    fields: [
      "tech_name",
      "tech_institution",   // Institution / lineage
      "tech_title",
      "tech_city",
      "tech_contact",       // WeChat / email (free text by design)
      "english",            // English communication level
      "tech_expertise",
      "goal",               // repeatable checkbox
      "tech_description"    // System description + NA potential
    ]
  }
};

const MAX_FIELD_LEN = 5000;   // generous: the description textarea is long-form
const CORS = {
  "Access-Control-Allow-Origin": "https://harmonypainalliance.com",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type"
};

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" }
  });
}

function generateApplicationId(formType) {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).substring(2, 6);
  return `partner_${formType}_${ts}_${rand}`;
}

/* Normalise one submitted value: arrays (checkbox groups) become a joined
   string, everything is trimmed and length-capped. */
function clean(value) {
  if (Array.isArray(value)) {
    return value.map(v => String(v).trim()).filter(Boolean).join(", ").slice(0, MAX_FIELD_LEN);
  }
  if (value === undefined || value === null) return "";
  return String(value).trim().slice(0, MAX_FIELD_LEN);
}

/* Plain-text notification body. Deliberately its own template — a partner
   application reads nothing like a patient booking, and mixing the two in one
   inbox format is how applications get skimmed past. */
function buildEmailBody(app, schema) {
  const L = [];
  L.push(`NEW ${schema.label.toUpperCase()}`);
  L.push("");
  L.push(`Application ID : ${app.application_id}`);
  L.push(`Submitted      : ${app.submitted_at}`);
  L.push(`Page language  : ${app.page_language}`);
  L.push(`From           : ${app.user_city}, ${app.user_country}`);
  L.push("");
  L.push("---- Application ----");
  for (const key of schema.fields) {
    const v = app.fields[key];
    if (v) L.push(`${key}: ${v}`);
  }
  L.push("");
  L.push("---- Reply commitment ----");
  L.push("HPA states a 5-business-day reply on the application form.");
  return L.join("\n");
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS });
    }

    const url = new URL(request.url);
    if (url.pathname !== "/api/partner" || request.method !== "POST") {
      return json({ error: "Not found" }, 404);
    }

    let body;
    try {
      body = await request.json();
    } catch (err) {
      return json({ success: false, error: "Invalid JSON" }, 400);
    }

    /* Honeypot: the form ships a hidden field no human fills in.
       Answer 200 so bots cannot distinguish success from rejection. */
    if (clean(body.company_website_hp)) {
      return json({ success: true, application_id: "ignored" });
    }

    const formType = clean(body.form_type);
    const schema = FORM_SCHEMAS[formType];
    if (!schema) {
      return json({
        success: false,
        error: "Unknown form_type. Expected 'clinic' or 'tech'."
      }, 400);
    }

    const fields = {};
    for (const key of schema.fields) fields[key] = clean(body[key]);

    const missing = schema.required.filter(k => !fields[k]);
    if (missing.length) {
      return json({
        success: false,
        error: `Missing required field(s): ${missing.join(", ")}`
      }, 400);
    }

    const cf = request.cf || {};
    const application = {
      application_id: generateApplicationId(formType),
      submitted_at: new Date().toISOString(),
      form_type: formType,
      form_label: schema.label,
      fields,
      page_language: clean(body.page_language) || "en",
      source_page: clean(body.source_page),
      user_city: cf.city || "unknown",
      user_country: cf.country || "unknown",
      user_region: cf.region || "",
      user_ip: request.headers.get("CF-Connecting-IP") || ""
    };

    const debug = { kv: "skipped", notify: "skipped" };

    /* 1. Store. No expirationTtl — applications are business records.
          Failure here must NOT lose the application, so we still try to
          notify and we report the failure back in the response. */
    if (env.HPA_PARTNERS) {
      try {
        await env.HPA_PARTNERS.put(
          application.application_id,
          JSON.stringify(application)
        );
        debug.kv = "ok";
      } catch (err) {
        debug.kv = "error: " + err.message;
      }
    } else {
      debug.kv = "no binding";
    }

    /* 2. Notify via a partner-specific Apps Script.
          Same 302-means-received handling as hpa-leads. */
    if (env.PARTNER_SCRIPT_URL) {
      try {
        const payload = {
          type: "partner_application",
          notify_email: env.PARTNER_NOTIFY_EMAIL || DEFAULT_NOTIFY_EMAIL,
          subject: `[HPA] ${schema.label} — ${fields[schema.required[0]]}`,
          text_body: buildEmailBody(application, schema),
          application
        };
        const resp = await fetch(env.PARTNER_SCRIPT_URL, {
          method: "POST",
          body: JSON.stringify(payload),
          redirect: "manual"
        });
        debug.notify = (resp.status === 302 || resp.status === 200)
          ? `ok (status ${resp.status})`
          : `unexpected ${resp.status}`;
      } catch (err) {
        debug.notify = "error: " + err.message;
      }
    } else {
      debug.notify = "no env var";
    }

    /* 3. Respond. Note what is absent: no redirect_url, no booking_type.
          A clinic applying to partner must never be pushed to a patient
          booking page. */
    const stored = debug.kv === "ok";
    const delivered = debug.notify.startsWith("ok");

    return json({
      success: true,
      application_id: application.application_id,
      stored,
      delivered,
      // Tell the front end whether to show the "email us directly" fallback.
      show_fallback: !(stored || delivered),
      debug
    });
  }
};
