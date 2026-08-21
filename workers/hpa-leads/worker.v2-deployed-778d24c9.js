/* ============================================
   HPA Lead Capture Worker v2.0
   Cloudflare Worker for harmonypainalliance.com

   Bindings required:
   - KV namespace: HPA_LEADS (bound as HPA_LEADS)
   - Environment variable: GOOGLE_SCRIPT_URL

   v2.0 Changes:
   - Fixed: added ctx (3rd param) for proper waitUntil
   - Fixed: await all tasks BEFORE returning response
   - Fixed: Google Sheets redirect handling
   - Removed: MailChannels (discontinued 2024)
   - Added: email via Google Apps Script MailApp
   - Added: detailed debug info in response
   ============================================ */

const CLINICS = {
  "lei-acupuncture": {
    id: "lei-acupuncture",
    name: "Lei's Acupuncture",
    city: "Winter Garden",
    state: "FL",
    address: "209 E Bay St, Winter Garden, FL 34787",
    phone: "561-403-6485",
    booking_type: "janeapp",
    booking_url: "https://leisacupuncture.janeapp.com",
    is_default: true
  }
  // Add more clinics here in the future
};

function getClinic(id) {
  if (id && CLINICS[id]) return CLINICS[id];
  return Object.values(CLINICS).find(c => c.is_default) || Object.values(CLINICS)[0];
}

function generateLeadId() {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).substring(2, 6);
  return `lead_${ts}_${rand}`;
}

// CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export default {
  async fetch(request, env, ctx) {
    // Handle CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    // Only accept POST to /api/lead
    const url = new URL(request.url);
    if (url.pathname !== "/api/lead" || request.method !== "POST") {
      return new Response(JSON.stringify({ error: "Not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    try {
      const body = await request.json();

      // Validate required fields
      if (!body.name || !body.email || !body.phone) {
        return new Response(JSON.stringify({ error: "Missing required fields: name, email, phone" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      // Build lead record
      const clinic = getClinic(body.target_clinic);
      const cf = request.cf || {};
      const lead = {
        lead_id: generateLeadId(),
        submitted_at: new Date().toISOString(),
        // User-provided fields
        name: body.name || "",
        email: body.email || "",
        phone: body.phone || "",
        language: body.language || "",
        primary_concern: body.primary_concern || "",
        duration: body.duration || "",
        first_acupuncture: body.first_acupuncture || "",
        first_visit: body.first_visit || "",
        preferred_time: body.preferred_time || "",
        insurance: body.insurance || "",
        how_found: body.how_found || "",
        notes: body.notes || "",
        // Auto-collected fields
        source_button: body.source_button || "unknown",
        page_language: body.page_language || "en",
        user_city: cf.city || "unknown",
        user_country: cf.country || "unknown",
        user_region: cf.region || "",
        user_ip: request.headers.get("CF-Connecting-IP") || "",
        // Clinic info
        target_clinic: clinic.id,
        target_clinic_name: clinic.name,
        target_booking_url: clinic.booking_url,
        booking_type: clinic.booking_type
      };

      // Track results for debugging
      const debug = { kv: "skipped", sheets: "skipped" };

      // 1. Store in KV — await directly, no background
      if (env.HPA_LEADS) {
        try {
          await env.HPA_LEADS.put(lead.lead_id, JSON.stringify(lead), {
            expirationTtl: 365 * 24 * 60 * 60 // 1 year
          });
          debug.kv = "ok";
        } catch (err) {
          debug.kv = "error: " + err.message;
        }
      } else {
        debug.kv = "no binding";
      }

      // 2. Post to Google Sheets + send email (Apps Script handles both)
      //    Google Apps Script returns a 302 redirect after executing doPost.
      //    Using redirect:"manual" lets us confirm Google received the request
      //    (302 = doPost executed) without following the redirect chain which
      //    can return HTML error pages even on success.
      if (env.GOOGLE_SCRIPT_URL) {
        try {
          const gsResp = await fetch(env.GOOGLE_SCRIPT_URL, {
            method: "POST",
            body: JSON.stringify(lead),
            redirect: "manual"
          });
          // 302 = Google processed doPost and is redirecting to response
          // 200 = direct response (shouldn't happen with manual redirect)
          if (gsResp.status === 302 || gsResp.status === 200) {
            debug.sheets = "ok (status " + gsResp.status + ")";
          } else {
            const gsText = await gsResp.text();
            debug.sheets = "unexpected " + gsResp.status + ": " + gsText.substring(0, 200);
          }
        } catch (err) {
          debug.sheets = "error: " + err.message;
        }
      } else {
        debug.sheets = "no env var";
      }

      // Build response
      const response = {
        success: true,
        lead_id: lead.lead_id,
        redirect_url: clinic.booking_url,
        booking_type: clinic.booking_type,
        debug: debug
      };

      // For phone-only clinics, include phone number
      if (clinic.booking_type === "phone-only") {
        response.phone = clinic.phone;
        response.redirect_url = null;
      }

      return new Response(JSON.stringify(response), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });

    } catch (err) {
      // Even on error, return the default clinic booking URL so frontend can redirect
      const fallbackClinic = getClinic(null);
      return new Response(JSON.stringify({
        success: false,
        error: err.message || "Internal error",
        redirect_url: fallbackClinic.booking_url
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
  }
};
