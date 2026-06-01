// Equipment API
const router = require('express').Router();
const { getDB } = require('../db');
const h = require('../helpers');

router.get('/', h.requireAuth, (req, res) => {
  const db = getDB();
  const items = db.prepare(`SELECT e.*, u.nama as unit_nama FROM equipment e LEFT JOIN units u ON e.unit_id = u.id ORDER BY e.nama`).all();
  h.success(res, items);
});

router.get('/:id', h.requireAuth, (req, res) => {
  const db = getDB();
  const item = db.prepare(`SELECT e.*, u.nama as unit_nama FROM equipment e LEFT JOIN units u ON e.unit_id = u.id WHERE e.id=?`).get(req.params.id);
  if (!item) return h.notFound(res);
  h.success(res, item);
});

router.post('/', h.requireRole('Admin', 'Super Admin'), (req, res) => {
  const { kode, nama, lokasi, unit_id, sistem, status, icon } = req.body;
  if (!kode || !nama) return h.error(res, 'Kode dan nama wajib diisi');
  const db = getDB();
  try {
    const r = db.prepare("INSERT INTO equipment (kode,nama,lokasi,unit_id,sistem,status,icon) VALUES (?,?,?,?,?,?,?)")
      .run(kode, nama, lokasi || null, unit_id || null, sistem || null, status || 'Operasi', icon || null);
    h.logAudit(req, 'CREATE', `Equipment ${kode} - ${nama} dibuat`, 'create');
    h.created(res, { id: r.lastInsertRowid }, 'Equipment berhasil dibuat');
  } catch(e) {
    h.error(res, e.message.includes('UNIQUE') ? 'Kode sudah digunakan' : e.message);
  }
});

router.put('/:id', h.requireRole('Admin', 'Super Admin'), (req, res) => {
  const db = getDB();
  const fields = []; const params = [];
  for (const f of ['kode','nama','lokasi','unit_id','sistem','status','icon']) {
    if (req.body[f] !== undefined) { fields.push(`${f}=?`); params.push(req.body[f]); }
  }
  if (!fields.length) return h.error(res, 'Tidak ada data untuk diupdate');
  params.push(req.params.id);
  db.prepare(`UPDATE equipment SET ${fields.join(',')} WHERE id=?`).run(...params);
  h.logAudit(req, 'UPDATE', `Equipment ID ${req.params.id} diperbarui`, 'doc');
  h.success(res, null, 'Equipment berhasil diperbarui');
});

router.delete('/:id', h.requireRole('Admin', 'Super Admin'), (req, res) => {
  const db = getDB();
  const eq = db.prepare("SELECT kode,nama FROM equipment WHERE id=?").get(req.params.id);
  if (!eq) return h.notFound(res);
  db.prepare("DELETE FROM equipment WHERE id=?").run(req.params.id);
  h.logAudit(req, 'DELETE', `Equipment ${eq.kode} - ${eq.nama} dihapus`, 'doc');
  h.success(res, null, 'Equipment berhasil dihapus');
});

module.exports = router;
