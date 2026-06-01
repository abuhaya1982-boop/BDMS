// Dashboard API
const router = require('express').Router();
const { getDB } = require('../db');
const h = require('../helpers');

router.get('/', h.requireAuth, (req, res) => {
  const db = getDB();
  const total = db.prepare("SELECT COUNT(*) as c FROM ik_documents").get().c;
  const published = db.prepare("SELECT COUNT(*) as c FROM ik_documents WHERE status='Published'").get().c;
  const draft = db.prepare("SELECT COUNT(*) as c FROM ik_documents WHERE status='Draft'").get().c;
  const review = db.prepare("SELECT COUNT(*) as c FROM ik_documents WHERE status IN ('Review','Approved-T1','Approved-T2')").get().c;
  const overdue = db.prepare("SELECT COUNT(*) as c FROM ik_documents WHERE status='Published' AND review_due IS NOT NULL AND date(review_due) < date('now','localtime')").get().c;
  const archived = db.prepare("SELECT COUNT(*) as c FROM ik_documents WHERE status='Archived'").get().c;

  // Status distribution (for pie/badges)
  const statusRows = db.prepare("SELECT status, COUNT(*) as c FROM ik_documents GROUP BY status").all();
  const status_distribution = {};
  for (const r of statusRows) status_distribution[r.status] = r.c;

  // Unit progress: total & published per unit
  const unit_progress = db.prepare(`SELECT u.nama,
    COUNT(d.id) as total,
    SUM(CASE WHEN d.status='Published' THEN 1 ELSE 0 END) as published
    FROM units u LEFT JOIN ik_documents d ON d.unit_id = u.id
    GROUP BY u.id ORDER BY total DESC LIMIT 10`).all();

  const recent = db.prepare(`SELECT d.*, u.nama as unit_nama FROM ik_documents d
    LEFT JOIN units u ON d.unit_id = u.id ORDER BY d.created_at DESC LIMIT 5`).all();

  h.success(res, {
    stats: { total, published, pending: review, overdue },
    status_distribution,
    unit_progress,
    recent_documents: recent
  });
});

module.exports = router;
