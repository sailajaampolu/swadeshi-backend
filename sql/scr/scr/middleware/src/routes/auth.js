const express = require('express');
const jwt = require('jsonwebtoken');
const db = require('../db');

const router = express.Router();

const otpStore = new Map();

function generateOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

async function sendOtpSms(phone, code) {
  console.log('[dev only] OTP for ' + phone + ': ' + code);
}

router.post('/otp/request', async (req, res) => {
  const { phone } = req.body;
  if (!phone || !/^\d{10}$/.test(phone)) {
    return res.status(400).json({ error: 'A valid 10-digit phone number is required.' });
  }

  const code = generateOtp();
  otpStore.set(phone, { code, expiresAt: Date.now() + 5 * 60 * 1000 });

  await sendOtpSms(phone, code);
  res.json({ message: 'OTP sent.' });
});

router.post('/otp/verify', async (req, res) => {
  const { phone, otp } = req.body;
  const entry = otpStore.get(phone);

  if (!entry || entry.code !== otp || entry.expiresAt < Date.now()) {
    return res.status(400).json({ error: 'Invalid or expired OTP.' });
  }
  otpStore.delete(phone);

  const existing = await db.query('SELECT id FROM sellers WHERE phone = $1 LIMIT 1', [phone]);
  const sellerId = existing.rows[0] ? existing.rows[0].id : null;

  const token = jwt.sign({ phone, sellerId }, process.env.JWT_SECRET, { expiresIn: '30d' });
  res.json({ token, sellerId });
});

module.exports = router;
