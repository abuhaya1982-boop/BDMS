// Settings API
const router = require('express').Router();
const { getDB } = require('../db');
const h = require('../helpers');

// Get all settings
router.get('/', h.requireAuth, (req, res) => {
  const settings = getDB().prepare("SELECT * FROM settings ORDER BY grup, kunci").all();
  // Group by grup
  const grouped = {};
  for (const s of settings) {
    if (!grouped[s.grup]) grouped[s.grup] = [];
    grouped[s.grup].push(s);
  }
  h.success(res, grouped);
});

// Get single setting
router.get('/:kunci', h.requireAuth, (req, res) => {
  const setting = getDB().prepare("SELECT * FROM settings WHERE kunci=?").get(req.params.kunci);
  if (!setting) return h.notFound(res);
  h.success(res, setting);
});

// Update setting(s)
router.put('/', h.requireRole('Admin', 'Super Admin'), (req, res) => {
  const { settings } = req.body;
  if (!settings || !Array.isArray(settings)) return h.error(res, 'Format settings tidak valid');
  const db = getDB();
  const stmt = db.prepare("UPDATE settings SET nilai=?, updated_at=datetime('now','localtime') WHERE kunci=?");
  let updated = 0;
  for (const { kunci, nilai } of settings) {
    if (kunci) { stmt.run(nilai, kunci); updated++; }
  }
  h.logAudit(req, 'UPDATE_SETTINGS', `${updated} pengaturan diperbarui`, 'setting');
  h.success(res, { updated }, 'Pengaturan berhasil disimpan');
});

// Update single setting
router.put('/:kunci', h.requireRole('Admin', 'Super Admin'), (req, res) => {
  const { nilai } = req.body;
  if (nilai === undefined) return h.error(res, 'Nilai wajib');
  const db = getDB();
  const existing = db.prepare("SELECT * FROM settings WHERE kunci=?").get(req.params.kunci);
  if (!existing) return h.notFound(res);
  db.prepare("UPDATE settings SET nilai=?, updated_at=datetime('now','localtime') WHERE kunci=?").run(nilai, req.params.kunci);
  h.logAudit(req, 'UPDATE_SETTING', `Setting ${req.params.kunci} diubah`, 'setting');
  h.success(res, null, 'Pengaturan berhasil disimpan');
});

module.exports = router;
