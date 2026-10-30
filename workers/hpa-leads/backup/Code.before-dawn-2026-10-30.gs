/**
 * HPA Lead Capture — Google Apps Script v2.4 (2026-10-22)
 *
 * 功能：
 * 1. 接收 Cloudflare Worker POST 请求，将留资数据写入 Google Sheets
 * 2. 发送邮件通知到创始人邮箱（替代已停服的 MailChannels）
 * 3. v2.4：按诊所转发——仅当 Worker 带 clinic_forward 且患者勾选了「同意分享给诊所」，
 *    才从 founder@ 用 MailApp 把【允许的字段】发给诊所（Health Pointe：姓名、联系方式、
 *    主要问题；不转自由备注和其他健康细节）。收件人与字段以本文件的 FORWARD_CLINICS 为准
 *    （与 worker.js CLINIC_REGISTRY 保持一致，双重校验）。
 * 4. v2.4：doPost 返回明确的 {ok:true|false}，Worker 以此作为「已落库」的唯一关口。
 *
 * 部署顺序：先发布本脚本 New version（原部署，/exec 不变），再部署 Worker v3.2。
 * 测试：姓名以 ZZTEST 开头的线索，诊所转发改发到 NOTIFY_EMAIL（founder@），不会发到诊所。
 *
 * 部署步骤见：HPA_Deployment_Guide.md
 */

var NOTIFY_EMAIL = "founder@harmonypainalliance.com";

// Worker sends this exact string as target_clinic_name for Get Matched leads
// (no clinic resolved). Must match UNASSIGNED_CLINIC_LABEL in worker.js.
var UNASSIGNED_CLINIC_LABEL = "(unassigned — manual follow-up)";

// v2.1 (2026-09-18): standalone project under founder@ — the sheet is opened
// by ID instead of getActiveSpreadsheet(). Real ID lives only in the deployed
// script (see private-handoffs/2026-09-18-identity-migration-v4.md).
var SHEET_ID = "REPLACE_WITH_SHEET_ID";
var SHEET_NAME = "Sheet1";

// v2.4 (2026-10-22): clinics that receive a minimised forward. Keyed by the
// Worker's clinic id. Recipient and fields are checked HERE as well as in the
// Worker registry; a mismatch is refused, not "fixed".
var FORWARD_CLINICS = {
  "health-pointe-jacksonville": {
    to: "info@hpjax.com",            // chosen by Dr. Miller, 2026-10-21
    subjectLabel: "Health Pointe",
    fields: ["name", "contact", "primary_concern"]   // only these three, ever
  }
};

// Display labels for the primary_concern codes (same wording as the site's
// Find Care options). The clinic sees the label, never the code.
var CONCERN_LABELS = {
  "pain-msk": "Neck, Back, Joint & Sports Pain",
  "chronic-complex": "Chronic Pain",
  "neuro": "Post-Stroke Recovery, Facial Palsy & Nerve Conditions",
  "fertility": "Fertility Support",
  "womens": "Women's Health",
  "mind-sleep": "Mood & Sleep",
  "cosmetic": "Cosmetic Acupuncture",
  "other-health-concern": "Something else",
  "not-sure": "Not sure"
};

// Test leads: a name starting with this prefix is forwarded to NOTIFY_EMAIL
// instead of the clinic, with a [TEST] subject, so the whole chain can be
// exercised without emailing a clinic.
var TEST_NAME_PREFIX = "ZZTEST";

// 收到 POST 请求时自动执行
function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_NAME);

    // 如果是第一行（空表），先写表头
    if (sheet.getLastRow() === 0) {
      sheet.appendRow([
        "Lead ID",
        "Submitted At",
        "Name",
        "Email",
        "Phone",
        "Language",
        "Primary Concern",
        "Duration",
        "First Acupuncture",
        "First Visit",
        "Preferred Time",
        "Insurance",
        "How Found",
        "Notes",
        "Source Button",
        "Page Language",
        "Target Clinic",
        "Clinic Name",
        "Booking URL",
        "User City",
        "User Region",
        "User Country",
        "Terms Version",
        "Privacy Version",
        "Consent At",
        "Clinic Share Consent"
      ]);
    }

    // 写入数据行
    sheet.appendRow([
      data.lead_id || "",
      data.submitted_at || "",
      data.name || "",
      data.email || "",
      data.phone || "",
      data.language || "",
      data.primary_concern || "",
      data.duration || "",
      data.first_acupuncture || "",
      data.first_visit || "",
      data.preferred_time || "",
      data.insurance || "",
      data.how_found || "",
      data.notes || "",
      data.source_button || "",
      data.page_language || "",
      data.target_clinic || "",
      data.target_clinic_name || "",
      data.target_booking_url || "",
      data.user_city || "",
      data.user_region || "",
      data.user_country || "",
      // v2.3 (legal v1, 2026-09-18): consent record, columns 23-26.
      data.terms_version || "",
      data.privacy_version || "",
      data.consent_at || "",
      data.clinic_share_consent || ""
    ]);

    // v2.4: 按诊所转发（失败不影响数据写入；结果写进内部通知并回报给 Worker）
    var forward = forwardToClinic(data);

    // 发送邮件通知
    sendNotification(data, forward);

    // v2.4: ok:true = the row is in the sheet. Worker treats anything else as failure.
    return ContentService
      .createTextOutput(JSON.stringify({
        status: "ok",
        ok: true,
        lead_id: data.lead_id,
        clinic_forward: forward.status
      }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: "error", ok: false, message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// v2.4: minimised forward to a clinic. Returns {status: "none"|"sent"|"failed",
// error?, to?}. Never throws.
function forwardToClinic(data) {
  var req = data.clinic_forward;
  if (!req) return { status: "none" };
  try {
    var cfg = FORWARD_CLINICS[req.clinic_id];
    if (!cfg) return { status: "failed", error: "clinic not in allow-list" };
    if (String(data.target_clinic || "") !== req.clinic_id) return { status: "failed", error: "target_clinic mismatch" };
    if (String(data.clinic_share_consent || "") !== "yes") return { status: "failed", error: "no clinic-share consent" };
    if (String(req.to || "").toLowerCase() !== cfg.to) return { status: "failed", error: "recipient mismatch" };

    // Only fields that BOTH the Worker asked for AND this script allows.
    var wanted = {};
    (req.fields || []).forEach(function (f) { wanted[f] = true; });
    var lines = [];
    cfg.fields.forEach(function (f) {
      if (!wanted[f]) return;
      if (f === "name") {
        lines.push("Name: " + cleanLine(data.name));
      } else if (f === "contact") {
        if (data.email) lines.push("Email: " + cleanLine(data.email));
        if (data.phone) lines.push("Phone: " + cleanLine(data.phone));
      } else if (f === "primary_concern") {
        lines.push("Main concern: " + (CONCERN_LABELS[data.primary_concern] || "Not specified"));
      }
    });
    if (!lines.length) return { status: "failed", error: "no fields to send" };

    var isTest = String(data.name || "").toUpperCase().indexOf(TEST_NAME_PREFIX) === 0;
    var to = isTest ? NOTIFY_EMAIL : cfg.to;
    var subject = (isTest ? "[TEST - not sent to clinic] " : "")
      + "[HPA Lead] " + cleanLine(data.name || "Unknown") + " \u2014 " + cfg.subjectLabel;
    var body = "A patient asked Harmony Pain Alliance (HPA) to share this request with your clinic.\n"
      + "Please follow up through your usual intake process.\n\n"
      + lines.join("\n") + "\n\n"
      + "--\n"
      + "Harmony Pain Alliance | founder@harmonypainalliance.com\n"
      + "Sent as standard email (TLS where supported); not a secure portal.";

    MailApp.sendEmail({ to: to, subject: subject, body: body, name: "Harmony Pain Alliance" });
    return { status: "sent", to: to, test: isTest };
  } catch (err) {
    console.error("Clinic forward failed: " + err.toString());
    return { status: "failed", error: err.toString() };
  }
}

// Single-line, trimmed (no header injection through the subject/body lines).
function cleanLine(v) {
  return String(v || "").replace(/[\r\n]+/g, " ").replace(/\s+/g, " ").trim();
}

// 发送邮件通知
function sendNotification(data, forward) {
  forward = forward || { status: "none" };
  try {
    // v2.3 (2026-09-18): primary_concern removed from the subject line —
    // it appears in the body only. Subject = "[HPA Lead] name — clinic".
    // Unassigned = empty name or the Worker's placeholder → two-segment subject.
    var rawClinic = data.target_clinic_name || "";
    var unassigned = !rawClinic || rawClinic === UNASSIGNED_CLINIC_LABEL;
    var clinicName = unassigned ? UNASSIGNED_CLINIC_LABEL : rawClinic;
    var subject = (forward.status === "failed" ? "[FORWARD FAILED] " : "")
      + "[HPA Lead] " + cleanLine(data.name || "Unknown")
      + (unassigned ? "" : " — " + clinicName);

    var body = "New HPA Lead Received!\n"
      + "━━━━━━━━━━━━━━━━━━━━━\n\n"
      + "Lead ID: " + (data.lead_id || "") + "\n"
      + "Time: " + (data.submitted_at || "") + "\n"
      + "Source: " + (data.source_button || "unknown") + "\n\n"
      + "CONTACT INFO\n"
      + "Name: " + (data.name || "") + "\n"
      + "Email: " + (data.email || "") + "\n"
      + "Phone: " + (data.phone || "") + "\n"
      + "Language: " + (data.language || "Not specified") + "\n\n"
      + "CLINICAL DETAILS\n"
      + "Primary Concern: " + (data.primary_concern || "Not specified") + "\n"
      + "Duration: " + (data.duration || "Not specified") + "\n"
      + "First Acupuncture: " + (data.first_acupuncture || "Not specified") + "\n"
      + "First Visit: " + (data.first_visit || "Not specified") + "\n"
      + "Preferred Time: " + (data.preferred_time || "Not specified") + "\n"
      + "Insurance: " + (data.insurance || "Not specified") + "\n\n"
      + "REFERRAL\n"
      + "How Found: " + (data.how_found || "Not specified") + "\n"
      + "Notes: " + (data.notes || "None") + "\n\n"
      + "ROUTING\n"
      + "Target Clinic: " + clinicName + "\n"
      + (data.target_booking_url ? "Booking URL: " + data.target_booking_url + "\n" : "")
      // v2.4: clinic forward result (name, contact, main concern only)
      + (forward.status === "sent"
          ? "Clinic forward: SENT to " + forward.to + (forward.test ? " (TEST: redirected to founder@, not the clinic)" : "") + " (name, contact, main concern only)\n"
          : forward.status === "failed"
            ? "Clinic forward: FAILED (" + forward.error + ") - please forward manually: name, contact, main concern only\n"
            : "")
      + "\n"
      + "GEO\n"
      + "Location: " + (data.user_city || "") + ", " + (data.user_region || "") + " " + (data.user_country || "") + "\n"
      + "Page Language: " + (data.page_language || "") + "\n\n"
      // v2.3 (legal v1): consent record
      + "Consent: terms " + (data.terms_version || "?") + " / privacy " + (data.privacy_version || "?")
      + " at " + (data.consent_at || "?") + "; clinic share: " + (data.clinic_share_consent || "no") + "\n\n"
      // v2.2 (2026-09-18): link to the live sheet so the reader lands on the
      // one sheet the script writes to (there are look-alike files in Drive).
      + "Sheet: https://docs.google.com/spreadsheets/d/" + SHEET_ID + "/edit";

    MailApp.sendEmail(NOTIFY_EMAIL, subject, body);
  } catch (err) {
    // 邮件发送失败不影响数据写入，只记录日志
    console.error("Email notification failed: " + err.toString());
  }
}

// 收到 GET 请求时返回状态（用于测试）
function doGet(e) {
  return ContentService
    .createTextOutput(JSON.stringify({ status: "ok", message: "HPA Lead Sheet v2.4 is active" }))
    .setMimeType(ContentService.MimeType.JSON);
}
