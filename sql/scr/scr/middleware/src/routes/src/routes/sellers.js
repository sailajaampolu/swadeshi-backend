const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.post('/', requireAuth, async (req, res) => {
  const {
    business_name, owner_name, whatsapp, category_id,
    description, lat, lng, address_text, locality, city
  } = req.body;

  if (!business_name || lat == null || lng == null) {
    return res.status(400).json({ error: 'business_name, lat, and lng are required.' });
  }

  const result = await db.query(
    `INSERT INTO sellers
      (business_name, owner_name, phone, whatsapp, category_id, description,
       location, address_text, locality, city)
     VALUES ($1,$2,$3,$4,$5,$6, ST_SetSRID(ST_MakePoint($7,$8),4326)::geography, $9,$10,$11)
     RETURNING id, business_name, locality, created_at`,
    [business_name, owner_name, req.auth.phone, whatsapp, category_id, description,
     lng, lat, address_text, locality, city]
  );

  res.status(201).json(result.rows[0]);
});

router.get('/:id', async (req, res) => {
  const sellerResult = await db.query(
    `SELECT s.id, s.business_name, s.owner_name, s.description, s.locality, s.city,
            s.is_verified, c.name AS category,
            ST_Y(s.location::geometry) AS lat, ST_X(s.location::geometry) AS lng
     FROM sellers s
     LEFT JOIN categories c ON c.id = s.category_id
     WHERE s.id = $1 AND s.is_active = TRUE`,
    [req.params.id]
  );

  if (sellerResult.rows.length === 0) {
    return res.status(404).json({ error: 'Seller not found.' });
  }

  const photos = await db.query(
    'SELECT url FROM seller_photos WHERE seller_id = $1 ORDER BY sort_order',
    [req.params.id]
  );

  res.json(Object.assign({}, sellerResult.rows[0], { photos: photos.rows.map(function (p) { return p.url; }) }));
});

router.patch('/:id', requireAuth, async (req, res) => {
  if (req.auth.sellerId !== req.params.id) {
    return res.status(403).json({ error: 'You can only edit your own listing.' });
  }

  const fields = ['business_name', 'owner_name', 'whatsapp', 'category_id', 'description', 'address_text', 'locality', 'city'];
  const updates = [];
  const values = [];
  let i = 1;

  for (const field of fields) {
    if (req.body[field] !== undefined) {
      updates.push(field + ' = $' + i);
      values.push(req.body[field]);
      i++;
    }
  }

  if (req.body.lat != null && req.body.lng != null) {
    updates.push('location = ST_SetSRID(ST_MakePoint($' + i + ', $' + (i + 1) + '), 4326)::geography');
    values.push(req.body.lng, req.body.lat);
    i += 2;
  }

  if (updates.length === 0) {
    return res.status(400).json({ error: 'No fields to update.' });
  }

  values.push(req.params.id);
  const result = await db.query(
    'UPDATE sellers SET ' + updates.join(', ') + ' WHERE id = $' + i + ' RETURNING id',
    values
  );

  res.json(result.rows[0]);
});

router.get('/:id/dashboard', requireAuth, async (req, res) => {
  if (req.auth.sellerId !== req.params.id) {
    return res.status(403).json({ error: 'Not your dashboard.' });
  }

  const leadStats = await db.query(
    `SELECT source, COUNT(*)::int AS count
     FROM leads WHERE seller_id = $1
     GROUP BY source`,
    [req.params.id]
  );

  const last30Days = await db.query(
    `SELECT date_trunc('day', created_at) AS day, COUNT(*)::int AS count
     FROM leads
     WHERE seller_id = $1 AND created_at > now() - interval '30 days'
     GROUP BY day ORDER BY day`,
    [req.params.id]
  );

  res.json({
    total_leads: leadStats.rows.reduce(function (sum, r) { return sum + r.count; }, 0),
    by_source: leadStats.rows,
    last_30_days: last30Days.rows,
  });
});

router.post('/:id/photos', requireAuth, async (req, res) => {
  if (req.auth.sellerId !== req.params.id) {
    return res.status(403).json({ error: 'You can only add photos to your own listing.' });
  }
  const { url, sort_order } = req.body;
  if (!url) return res.status(400).json({ error: 'url is required.' });

  const result = await db.query(
    'INSERT INTO seller_photos (seller_id, url, sort_order) VALUES ($1,$2,$3) RETURNING id',
    [req.params.id, url, sort_order || 0]
  );
  res.status(201).json(result.rows[0]);
});

module.exports = router;
