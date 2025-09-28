module.exports = async (req, res) => {
  const key = process.env.GOOGLE_PRIVATE_KEY || "";
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || "";
  const sheet = process.env.GOOGLE_SHEET_ID || "";

  res.status(200).json({
    hasKey: !!key,
    keyLooksPEM: key.includes("BEGIN PRIVATE KEY") && key.includes("END PRIVATE KEY"),
    keyLen: key.length,
    email,
    sheet: sheet ? sheet.slice(0, 6) + "..." + sheet.slice(-6) : ""
  });
};
