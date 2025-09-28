const { google } = require("googleapis");

// GET /api/content -> { ok:true, data:{ key:value } }
function getSheets() {
  const auth = new google.auth.JWT(
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    null,
    (process.env.GOOGLE_PRIVATE_KEY || "").replace(/\\n/g, "\n"),
    ["https://www.googleapis.com/auth/spreadsheets"]
  );
  return google.sheets({ version: "v4", auth });
}

module.exports = async (req, res) => {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).end();
  }
  try {
    const sheets = getSheets();
    const r = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: "content!A:B"
    });
    const rows = r.data.values || [];
    const data = {};
    rows.forEach(([k, v]) => { if (k) data[k] = v || ""; });
    res.status(200).json({ ok: true, data });
  } catch (e) {
    console.error("content error", e);
    res.status(500).json({ ok: false, error: "Failed to read content" });
  }
};
