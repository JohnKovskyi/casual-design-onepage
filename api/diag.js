const { google } = require("googleapis");

module.exports = async (req, res) => {
  try {
    const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || "";
    const key = (process.env.GOOGLE_PRIVATE_KEY || "").replace(/\\n/g, "\n");
    const sheetId = process.env.GOOGLE_SHEET_ID || "";

    const auth = new google.auth.JWT(
      email,
      null,
      key,
      ["https://www.googleapis.com/auth/spreadsheets"]
    );
    const sheets = google.sheets({ version: "v4", auth });

    const r = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: "content!A1:B5",
    });

    res.status(200).json({ ok: true, sample: r.data.values || [] });
  } catch (e) {
    res.status(200).json({
      ok: false,
      message: e?.response?.data?.error?.message || e.message,
      code: e?.code || null,
    });
  }
};
