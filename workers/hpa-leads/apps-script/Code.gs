/**
 * HPA Lead Capture — Google Apps Script v2.0
 *
 * 功能：
 * 1. 接收 Cloudflare Worker POST 请求，将留资数据写入 Google Sheets
 * 2. 发送邮件通知到创始人邮箱（替代已停服的 MailChannels）
 *
 * 部署步骤见：HPA_Deployment_Guide.md
 */

var NOTIFY_EMAIL = "founder@harmonypainalliance.com";

// 收到 POST 请求时自动执行
function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();

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
        "User Country"
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
      data.user_country || ""
    ]);

    // 发送邮件通知
    sendNotification(data);

    return ContentService
      .createTextOutput(JSON.stringify({ status: "ok", lead_id: data.lead_id }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: "error", message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// 发送邮件通知
function sendNotification(data) {
  try {
    var concern = data.primary_concern ? " — " + data.primary_concern : "";
    var clinicName = data.target_clinic_name || "Unknown Clinic";
    var subject = "[HPA Lead] " + (data.name || "Unknown") + concern + " — " + clinicName;

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
      + "Booking URL: " + (data.target_booking_url || "") + "\n\n"
      + "GEO\n"
      + "Location: " + (data.user_city || "") + ", " + (data.user_region || "") + " " + (data.user_country || "") + "\n"
      + "Page Language: " + (data.page_language || "");

    MailApp.sendEmail(NOTIFY_EMAIL, subject, body);
  } catch (err) {
    // 邮件发送失败不影响数据写入，只记录日志
    console.error("Email notification failed: " + err.toString());
  }
}

// 收到 GET 请求时返回状态（用于测试）
function doGet(e) {
  return ContentService
    .createTextOutput(JSON.stringify({ status: "ok", message: "HPA Lead Sheet v2.0 is active" }))
    .setMimeType(ContentService.MimeType.JSON);
}
