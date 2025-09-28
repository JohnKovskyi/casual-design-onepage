module.exports = async (req, res) => {
  res.status(200).json({ 
    ok: true,
    message: "API is working",
    env: {
      hasGoogleEmail: !!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      hasGoogleKey: !!process.env.GOOGLE_PRIVATE_KEY,
      hasSheetId: !!process.env.GOOGLE_SHEET_ID,
      hasJWTSecret: !!process.env.JWT_SECRET
    }
  });
};