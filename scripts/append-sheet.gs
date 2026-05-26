// ─────────────────────────────────────────────────────────────────────────────
// xzvl.store — Google Apps Script Web App
//
// HOW TO DEPLOY:
//  1. Open your Google Sheet → Extensions → Apps Script
//  2. Paste this entire file, replacing the default code
//  3. Save → Deploy → New deployment
//     - Type: Web app
//     - Execute as: Me
//     - Who has access: Anyone
//  4. Click Deploy → Copy the Web App URL
//  5. Paste the URL into Vercel env var: APPS_SCRIPT_URL
// ─────────────────────────────────────────────────────────────────────────────

var SHEET_NAME = "2026 PRE-ORDER";

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);

    if (!sheet) {
      return respond({ error: "Sheet '" + SHEET_NAME + "' not found." }, 404);
    }

    var items = data.items || [];

    // One row per product item — customer info repeated on each row
    items.forEach(function (item) {
      sheet.appendRow([
        data.date        || new Date().toLocaleDateString("en-PH"),
        data.name        || "",
        data.location    || "",
        data.phone       || "",
        data.email       || "",
        item.product     || "",
        item.qty         || 1,
        item.subtotal    || 0,
        "Pending"
      ]);
    });

    return respond({ success: true });
  } catch (err) {
    return respond({ error: err.message }, 500);
  }
}

function respond(obj, code) {
  var output = ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
  return output;
}
