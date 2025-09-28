const { google } = require("googleapis");

// GET /api/content -> { ok:true, data:{ key:value } }
function getSheets() {
  // If the ENV key is stored with literal "\n", convert to real newlines:
  const privateKey = (process.env.GOOGLE_PRIVATE_KEY || "").replace(/\\n/g, "\n");

  const auth = new google.auth.JWT(
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    null,
    privateKey,
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
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;
    if (!spreadsheetId) throw new Error("Missing GOOGLE_SHEET_ID");

    const sheets = getSheets();

    const { data } = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: "content!A:B", // tab "content", columns A & B
    });

    const rows = data.values || [];
    const out = {};
    for (const [k, v] of rows) out[k] = v ?? "";

    return res.status(200).json({ ok: true, data: out });
  } catch (e) {
    console.error("content error:", e?.message || e);
    return res
      .status(500)
      .json({ ok: false, error: e?.message || "Failed to read content" });
  }
};
