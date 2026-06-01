// Templates API
const router = require('express').Router();
const { getDB } = require('../db');
const h = require('../helpers');

router.get('/', h.requireAuth, (req, res) => {
  h.success(res, getDB().prepare("SELECT * FROM templates ORDER BY id DESC").all());
});

router.get('/active', h.requireAuth, (req, res) => {
  const t = getDB().prepare("SELECT * FROM templates WHERE status='Aktif' ORDER BY id DESC LIMIT 1").get();
  h.success(res, t || null);
});

router.post('/', h.requireRole('Admin', 'Super Admin'), (req, res) => {
  const { nama, versi, status, deskripsi, konten, tanggal_berlaku } = req.body;
  if (!nama || !versi) return h.error(res, 'Nama dan versi wajib');
  const db = getDB();
  // If setting as Aktif, deactivate others
  if (status === 'Aktif') db.prepare("UPDATE templates SET status='Legacy' WHERE status='Aktif'").run();
  const r = db.prepare("INSERT INTO templates (nama,versi,status,deskripsi,konten,tanggal_berlaku) VALUES (?,?,?,?,?,?)")
    .run(nama, versi, status || 'Legacy', deskripsi || null, typeof konten === 'string' ? konten : JSON.stringify(konten), tanggal_berlaku || null);
  h.logAudit(req, 'CREATE', `Template ${nama} ${versi} dibuat`, 'create');
  h.created(res, { id: r.lastInsertRowid });
});

router.put('/:id', h.requireRole('Admin', 'Super Admin'), (req, res) => {
  const db = getDB();
  const fields = []; const params = [];
  for (const f of ['nama','versi','status','deskripsi','konten','tanggal_berlaku']) {
    if (req.body[f] !== undefined) {
      const val = f === 'konten' && typeof req.body[f] !== 'string' ? JSON.stringify(req.body[f]) : req.body[f];
      fields.push(`${f}=?`); params.push(val);
    }
  }
  if (!fields.length) return h.error(res, 'Tidak ada data');
  if (req.body.status === 'Aktif') db.prepare("UPDATE templates SET status='Legacy' WHERE status='Aktif' AND id!=?").run(req.params.id);
  params.push(req.params.id);
  db.prepare(`UPDATE templates SET ${fields.join(',')} WHERE id=?`).run(...params);
  h.success(res, null, 'Template berhasil diperbarui');
});

router.delete('/:id', h.requireRole('Admin', 'Super Admin'), (req, res) => {
  getDB().prepare("DELETE FROM templates WHERE id=?").run(req.params.id);
  h.success(res, null, 'Template berhasil dihapus');
});

module.exports = router;
