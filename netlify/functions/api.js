const express = require('express');
const serverless = require('serverless-http');
const { getPool } = require('./db');

const app = express();
app.use(express.json());

// Netlify redirects /api/* here, stripping to this router's root.
const router = express.Router();

function requireAdmin(req, res, next) {
  const token = req.get('x-admin-token');
  if (!process.env.ADMIN_TOKEN || token !== process.env.ADMIN_TOKEN) {
    return res.status(401).json({ error: 'Invalid or missing admin token.' });
  }
  next();
}

// POST /api/contact — create a work-order enquiry
router.post('/contact', async (req, res) => {
  const { name, business, email, phone, message } = req.body || {};

  if (!name || !email || !message) {
    return res.status(400).json({ error: 'Name, email and message are required.' });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'That email address doesn\u2019t look right.' });
  }

  try {
    const pool = getPool();
    const result = await pool.query(
      `INSERT INTO enquiries (name, business, email, phone, message)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, created_at`,
      [name.trim(), (business || '').trim(), email.trim(), (phone || '').trim(), message.trim()]
    );
    return res.status(201).json({ ok: true, id: result.rows[0].id });
  } catch (err) {
    console.error('POST /contact failed:', err.message);
    return res.status(500).json({ error: 'Could not save that enquiry. Please try again.' });
  }
});

// GET /api/enquiries — list enquiries (admin only)
router.get('/enquiries', requireAdmin, async (req, res) => {
  try {
    const pool = getPool();
    const result = await pool.query(
      `SELECT id, name, business, email, phone, message, status, created_at
       FROM enquiries ORDER BY created_at DESC LIMIT 200`
    );
    return res.json(result.rows);
  } catch (err) {
    console.error('GET /enquiries failed:', err.message);
    return res.status(500).json({ error: 'Could not load enquiries.' });
  }
});

// PATCH /api/enquiries/:id — update status (admin only)
router.patch('/enquiries/:id', requireAdmin, async (req, res) => {
  const { status } = req.body || {};
  if (!['new', 'handled'].includes(status)) {
    return res.status(400).json({ error: 'status must be "new" or "handled".' });
  }
  try {
    const pool = getPool();
    const result = await pool.query(
      `UPDATE enquiries SET status = $1 WHERE id = $2 RETURNING id, status`,
      [status, req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Enquiry not found.' });
    return res.json(result.rows[0]);
  } catch (err) {
    console.error('PATCH /enquiries/:id failed:', err.message);
    return res.status(500).json({ error: 'Could not update that enquiry.' });
  }
});

app.use('/api', router);
// Also mount at root so it works whether Netlify passes the /api prefix through or strips it.
app.use('/', router);

module.exports.handler = serverless(app);
