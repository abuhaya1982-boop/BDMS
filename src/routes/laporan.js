// Laporan (Reports) API
const router = require('express').Router();
const { getDB } = require('../db');
const h = require('../helpers');

// Statistik dokumen per unit
router.get('/per-unit', h.requireAuth, (req, res) => {
  const db = getDB();
  const rows = db.prepare(`SELECT u.id, u.nama, u.kode,
    COUNT(d.id) as total,
    SUM(CASE WHEN d.status='Published' THEN 1 ELSE 0 END) as published,
    SUM(CASE WHEN d.status='Draft' THEN 1 ELSE 0 END) as draft,
    SUM(CASE WHEN d.status='Review' THEN 1 ELSE 0 END) as review,
    SUM(CASE WHEN d.status='Approved-T1' THEN 1 ELSE 0 END) as approved_t1,
    SUM(CASE WHEN d.status='Approved-T2' THEN 1 ELSE 0 END) as approved_t2
    FROM units u LEFT JOIN ik_documents d ON u.id=d.unit_id
    GROUP BY u.id ORDER BY u.nama`).all();
  h.success(res, rows);
});

// Statistik dokumen per probis
router.get('/per-probis', h.requireAuth, (req, res) => {
  const db = getDB();
  const rows = db.prepare(`SELECT p.id, p.nama, p.kode,
    COUNT(d.id) as total,
    SUM(CASE WHEN d.status='Published' THEN 1 ELSE 0 END) as published,
    SUM(CASE WHEN d.status='Draft' THEN 1 ELSE 0 END) as draft
    FROM probis p LEFT JOIN ik_documents d ON p.id=d.probis_id
    GROUP BY p.id ORDER BY p.nama`).all();
  h.success(res, rows);
});

// Statistik dokumen per status
router.get('/per-status', h.requireAuth, (req, res) => {
  const db = getDB();
  const rows = db.prepare(`SELECT status, COUNT(*) as total FROM ik_documents GROUP BY status`).all();
  h.success(res, rows);
});

// Statistik risiko
router.get('/risiko', h.requireAuth, (req, res) => {
  const db = getDB();
  const rows = db.prepare(`SELECT r.tingkat_risiko, COUNT(*) as total
    FROM ik_risiko r JOIN ik_documents d ON r.dokumen_id=d.id
    GROUP BY r.tingkat_risiko ORDER BY total DESC`).all();
  h.success(res, rows);
});

// Aktivitas approval
router.get('/approval-activity', h.requireAuth, (req, res) => {
  const db = getDB();
  const { start_date, end_date } = req.query;
  let sql = `SELECT a.*, d.judul as doc_judul, u.nama as user_nama
    FROM ik_approvals a
    LEFT JOIN ik_documents d ON a.dokumen_id=d.id
    LEFT JOIN users u ON a.user_id=u.id WHERE 1=1`;
  const params = [];
  if (start_date) { sql += ' AND a.created_at >= ?'; params.push(start_date); }
  if (end_date) { sql += ' AND a.created_at <= ?'; params.push(end_date + ' 23:59:59'); }
  sql += ' ORDER BY a.created_at DESC LIMIT 100';
  h.success(res, db.prepare(sql).all(...params));
});

// Dokumen expiring (approaching review date)
router.get('/expiring', h.requireAuth, (req, res) => {
  const db = getDB();
  const days = parseInt(req.query.days) || 30;
  const rows = db.prepare(`SELECT d.*, u.nama as unit_nama
    FROM ik_documents d LEFT JOIN units u ON d.unit_id=u.id
    WHERE d.status='Published' AND d.tanggal_berlaku IS NOT NULL
    AND date(d.tanggal_berlaku) <= date('now','+'||?||' days')
    ORDER BY d.tanggal_berlaku ASC`).all(days);
  h.success(res, rows);
});

module.exports = router;
