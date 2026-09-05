const express = require('express');
const db = require('../db');

const router = express.Router();

router.get('/', async (req, res) => {
  const result = await db.query('SELECT id, name, parent_id FROM categories ORDER BY name');
  res.json(result.rows);
});

module.exports = router;
