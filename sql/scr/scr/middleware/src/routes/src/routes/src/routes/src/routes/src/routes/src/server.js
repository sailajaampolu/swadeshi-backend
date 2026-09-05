require('dotenv').config();
require('express-async-errors');

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const authRoutes = require('./routes/auth');
const sellerRoutes = require('./routes/sellers');
const searchRoutes = require('./routes/search');
const leadRoutes = require('./routes/leads');
const categoryRoutes = require('./routes/categories');

const app = express();

app.use(helmet());
app.use(express.json());
app.use(cors({
  origin: (process.env.CORS_ORIGINS || '').split(',').filter(Boolean),
}));

app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 300 }));

const otpLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 5 });
app.use('/auth/otp/request', otpLimiter);

app.get('/health', function (req, res) { res.json({ status: 'ok' }); });

app.use('/auth', authRoutes);
app.use('/sellers', sellerRoutes);
app.use('/search', searchRoutes);
app.use('/leads', leadRoutes);
app.use('/categories', categoryRoutes);

app.use(function (err, req, res, next) {
  console.error(err);
  res.status(500).json({ error: 'Something went wrong on our end.' });
});

const port = process.env.PORT || 4000;
app.listen(port, function () { console.log('Swadeshi Setu API listening on :' + port); });
