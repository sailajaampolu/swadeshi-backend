const express = require('express');
const db = require('../db');

const router = express.Router();

router.get('/', async (req, res) => {
  const lat = parseFloat(req.query.lat);
  const lng = parseFloat(req.query.lng);
  const radiusKm = parseFloat(req.query.radius_km) || 15;
  const categoryId = req.query.category_id || null;
  const q = req.query.q || null;

  if (Number.isNaN(lat) || Number.isNaN(lng)) {
    return res.status(400).json({ error: 'lat and lng query params are required.' });
  }
  if (radiusKm > 50) {
    return res.status(400).json({ error: 'radius_km cannot exceed 50 - this platform is for local discovery.' });
  }

  const result = await db.query(
    `SELECT s.id, s.business_name, s.description, s.locality, s.is_verified,
            c.name AS category,
            ST_Distance(s.location, ST_SetSRID(ST_MakePoint($1,$2),4326)::geography) / 1000 AS distance_km
     FROM sellers s
     LEFT JOIN categories c ON c.id = s.category_id
     WHERE s.is_active = TRUE
       AND ST_DWithin(s.location, ST_SetSRID(ST_MakePoint($1,$2),4326)::geography, $3 * 1000)
       AND ($4::uuid IS NULL OR s.category_id = $4)
       AND ($5::text IS NULL OR s.business_name ILIKE '%' || $5 || '%' OR s.description ILIKE '%' || $5 || '%')
     ORDER BY
       s.plan = 'featured' DESC,
       distance_km ASC
     LIMIT 50`,
    [lng, lat, radiusKm, categoryId, q]
  );

  res.json({
    count: result.rows.length,
    radius_km: radiusKm,
    results: result.rows.map(function (r) {
      return Object.assign({}, r, { distance_km: Number(r.distance_km.toFixed(1)) });
    }),
  });
});

module.exports = router;
