// Dashboard API
const router = require('express').Router();
const { getDB } = require('../db');
const h = require('../helpers');

router.get('/', h.requireAuth, (req, res) => {
  const db = getDB();
  const total = db.prepare("SELECT COUNT(*) as c FROM ik_documents").get().c;
  const published = db.prepare("SELECT COUNT(*) as c FROM ik_documents WHERE status='Published'").get().c;
  const draft = db.prepare("SELECT COUNT(*) as c FROM ik_documents WHERE status='Draft'").get().c;
  const review = db.prepare("SELECT COUNT(*) as c FROM ik_documents WHERE status='Review'").get().c;
  const approvedT1 = db.prepare("SELECT COUNT(*) as c FROM ik_documents WHERE status='Approved-T1'").get().c;
  const approvedT2 = db.prepare("SELECT COUNT(*) as c FROM ik_documents WHERE status='Approved-T2'").get().c;
  const archived = db.prepare("SELECT COUNT(*) as c FROM ik_documents WHERE status='Archived'").get().c;
  const users = db.prepare("SELECT COUNT(*) as c FROM users WHERE status='Aktif'").get().c;
  const equipment = db.prepare("SELECT COUNT(*) as c FROM equipment").get().c;

  const byUnit = db.prepare(`SELECT u.nama, COUNT(d.id) as total FROM units u
    LEFT JOIN ik_documents d ON d.unit_id = u.id GROUP BY u.id ORDER BY total DESC LIMIT 10`).all();
  const byRisk = db.prepare(`SELECT tingkat_risiko as label, COUNT(*) as total FROM ik_documents
    WHERE status != 'Archived' GROUP BY tingkat_risiko`).all();
  const recent = db.prepare(`SELECT d.*, u.nama as unit_nama FROM ik_documents d
    LEFT JOIN units u ON d.unit_id = u.id ORDER BY d.created_at DESC LIMIT 5`).all();

  h.success(res, {
    total_dokumen: total, published, draft, review, approved_t1: approvedT1,
    approved_t2: approvedT2, archived, total_users: users, total_equipment: equipment,
    by_unit: byUnit, by_risk: byRisk, recent_documents: recent
  });
});

module.exports = router;
