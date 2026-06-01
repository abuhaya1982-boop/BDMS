// Laporan (Reports) API
const router = require('express').Router();
const { getDB } = require('../db');
const h = require('../helpers');

// GET /api/laporan — combined report data (frontend expects this)
router.get('/', h.requireAuth, (req, res) => {
  const db = getDB();

  // Total & by status
  const total = db.prepare("SELECT COUNT(*) as c FROM ik_documents").get().c;
  const statusRows = db.prepare("SELECT status, COUNT(*) as c FROM ik_documents GROUP BY status").all();
  const by_status = {};
  for (const r of statusRows) by_status[r.status] = r.c;

  // By risk
  const riskRows = db.prepare(`SELECT r.tingkat_risiko, COUNT(*) as c FROM ik_risiko r
    JOIN ik_documents d ON r.dokumen_id=d.id GROUP BY r.tingkat_risiko`).all();
  const by_risk = {};
  for (const r of riskRows) by_risk[r.tingkat_risiko] = r.c;

  // By unit (unit_laporan for table)
  const unit_laporan = db.prepare(`SELECT u.id, u.nama, u.kode,
    COUNT(d.id) as total,
    SUM(CASE WHEN d.status='Published' THEN 1 ELSE 0 END) as published,
    SUM(CASE WHEN d.status='Draft' THEN 1 ELSE 0 END) as draft,
    SUM(CASE WHEN d.status IN ('Review','Approved-T1') THEN 1 ELSE 0 END) as in_review,
    SUM(CASE WHEN d.status='Published' AND d.tanggal_berlaku IS NOT NULL AND date(d.tanggal_berlaku) < date('now') THEN 1 ELSE 0 END) as overdue
    FROM units u LEFT JOIN ik_documents d ON u.id=d.unit_id
    GROUP BY u.id ORDER BY u.nama`).all();

  // Probis distribusi
  const probis_distribusi = db.prepare(`SELECT p.nomor, COUNT(d.id) as count
    FROM probis p LEFT JOIN ik_documents d ON p.id=d.probis_id
    GROUP BY p.id HAVING count > 0 ORDER BY count DESC LIMIT 8`).all();

  // Monthly trend (last 6 months)
  const monthly_trend = db.prepare(`SELECT strftime('%Y-%m', created_at) as bulan, COUNT(*) as count
    FROM ik_documents WHERE created_at >= date('now','-6 months')
    GROUP BY bulan ORDER BY bulan`).all();

  // Compliance
  const published = by_status['Published'] || 0;
  const overdue_count = unit_laporan.reduce((sum, u) => sum + (u.overdue || 0), 0);
  const compliant = published - overdue_count;
  const compliance_rate = total > 0 ? Math.round((compliant > 0 ? compliant : 0) / total * 100) : 0;

  h.success(res, {
    total,
    by_status,
    by_risk,
    by_unit: unit_laporan.slice(0, 8).map(u => ({ nama: u.nama, count: u.total })),
    unit_laporan,
    probis_distribusi,
    monthly_trend,
    compliance: { compliance_rate, compliant: compliant > 0 ? compliant : 0, total },
    overdue_count
  });
});

// Sub-routes for detailed reports
router.get('/per-unit', h.requireAuth, (req, res) => {
  const rows = getDB().prepare(`SELECT u.id, u.nama, u.kode,
    COUNT(d.id) as total,
    SUM(CASE WHEN d.status='Published' THEN 1 ELSE 0 END) as published,
    SUM(CASE WHEN d.status='Draft' THEN 1 ELSE 0 END) as draft
    FROM units u LEFT JOIN ik_documents d ON u.id=d.unit_id
    GROUP BY u.id ORDER BY u.nama`).all();
  h.success(res, rows);
});

router.get('/per-probis', h.requireAuth, (req, res) => {
  const rows = getDB().prepare(`SELECT p.id, p.nama, p.kode,
    COUNT(d.id) as total,
    SUM(CASE WHEN d.status='Published' THEN 1 ELSE 0 END) as published
    FROM probis p LEFT JOIN ik_documents d ON p.id=d.probis_id
    GROUP BY p.id ORDER BY p.nama`).all();
  h.success(res, rows);
});

module.exports = router;
