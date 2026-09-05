const express = require('express');
const db = require('../db');

const router = express.Router();

router.post('/', async (req, res) => {
  const { seller_id, source, customer_phone, distance_km } = req.body;

  if (!seller_id || !['call', 'whatsapp'].includes(source)) {
    return res.status(400).json({ error: 'seller_id and a valid source (call|whatsapp) are required.' });
  }

  const seller = await db.query(
    'SELECT phone, whatsapp, plan FROM sellers WHERE id = $1 AND is_active = TRUE',
    [seller_id]
  );
  if (seller.rows.length === 0) {
    return res.status(404).json({ error: 'Seller not found.' });
  }

  const plan = seller.rows[0].plan;
  if (plan === 'free') {
    const monthlyCount = await db.query(
      `SELECT COUNT(*)::int AS count FROM leads
       WHERE seller_id = $1 AND created_at >= date_trunc('month', now())`,
      [seller_id]
    );
    if (monthlyCount.rows[0].count >= 5) {
      return res.status(402).json({
        error: 'This seller has reached their free monthly contact limit.',
        upgrade_hint: 'Sellers can upgrade to a paid plan for unlimited leads.',
      });
    }
  }

  await db.query(
    `INSERT INTO leads (seller_id, customer_phone, source, distance_km)
     VALUES ($1,$2,$3,$4)`,
    [seller_id, customer_phone || null, source, distance_km || null]
  );

  res.status(201).json({
    phone: seller.rows[0].phone,
    whatsapp: seller.rows[0].whatsapp,
  });
});

module.exports = router;
