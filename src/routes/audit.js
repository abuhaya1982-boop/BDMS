// Audit API
const router = require('express').Router();
const { getDB } = require('../db');
const h = require('../helpers');

router.get('/', h.requireAuth, (req, res) => {
  const db = getDB();
  const { tipe, user_id, search, limit: lim, offset: off } = req.query;
  let sql = `SELECT a.*, u.nama as user_nama FROM audit_trails a LEFT JOIN users u ON a.user_id = u.id WHERE 1=1`;
  const params = [];
  if (tipe) { sql += ' AND a.tipe=?'; params.push(tipe); }
  if (user_id) { sql += ' AND a.user_id=?'; params.push(user_id); }
  if (search) { sql += ' AND (a.aksi LIKE ? OR a.detail LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }
  const limit = Math.min(parseInt(lim) || 50, 200);
  const offset = Math.max(parseInt(off) || 0, 0);
  sql += ' ORDER BY a.created_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);
  const items = db.prepare(sql).all(...params);
  h.success(res, items);
});

module.exports = router;
