// Dokumen IK API
const router = require('express').Router();
const { getDB } = require('../db');
const h = require('../helpers');

// GET / — List documents with filters
router.get('/', h.requireAuth, (req, res) => {
  try {
    const db = getDB();
    const { unit, probis, status, risiko, search, limit = 20, offset = 0 } = req.query;
    const params = [];
    const conditions = [];

    if (unit) { conditions.push('d.unit_id = ?'); params.push(unit); }
    if (probis) { conditions.push('d.probis_id = ?'); params.push(probis); }
    if (status) { conditions.push('d.status = ?'); params.push(status); }
    if (risiko) { conditions.push('d.tingkat_risiko = ?'); params.push(risiko); }
    if (search) { conditions.push('(d.judul LIKE ? OR d.nomor_dokumen LIKE ?)'); params.push(`%${search}%`, `%${search}%`); }

    const where = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';
    const countRow = db.prepare(`SELECT COUNT(*) as total FROM ik_documents d ${where}`).get(...params);
    const items = db.prepare(`
      SELECT d.*, u.nama as unit_nama, p.nama as probis_nama, usr.nama as owner_nama
      FROM ik_documents d
      LEFT JOIN units u ON u.id = d.unit_id
      LEFT JOIN probis p ON p.id = d.probis_id
      LEFT JOIN users usr ON usr.id = d.owner_id
      ${where} ORDER BY d.updated_at DESC LIMIT ? OFFSET ?
    `).all(...params, Number(limit), Number(offset));

    h.success(res, { items, total: countRow.total, limit: Number(limit), offset: Number(offset) });
  } catch (err) { h.error(res, err.message); }
});

// GET /recent
router.get('/recent', h.requireAuth, (req, res) => {
  try {
    const items = getDB().prepare(`
      SELECT d.*, u.nama as unit_nama, p.nama as probis_nama, usr.nama as owner_nama
      FROM ik_documents d LEFT JOIN units u ON u.id=d.unit_id
      LEFT JOIN probis p ON p.id=d.probis_id LEFT JOIN users usr ON usr.id=d.owner_id
      ORDER BY d.updated_at DESC LIMIT 8
    `).all();
    h.success(res, items);
  } catch (err) { h.error(res, err.message); }
});

// GET /preview-number
router.get('/preview-number', h.requireAuth, (req, res) => {
  try {
    const db = getDB();
    const { unit_id, probis_id } = req.query;
    if (!unit_id || !probis_id) return h.error(res, 'unit_id dan probis_id wajib');
    const unit = db.prepare('SELECT kode_dokumen FROM units WHERE id=?').get(unit_id);
    const prob = db.prepare('SELECT nomor FROM probis WHERE id=?').get(probis_id);
    if (!unit || !prob) return h.notFound(res, 'Unit atau Probis tidak ditemukan');
    const seqRow = db.prepare('SELECT last_sequence FROM doc_number_sequences WHERE unit_id=? AND probis_id=?').get(unit_id, probis_id);
    const nextSeq = (seqRow ? seqRow.last_sequence : 0) + 1;
    h.success(res, { preview: h.generateDocNumber(unit.kode_dokumen, prob.nomor, nextSeq), next_sequence: nextSeq });
  } catch (err) { h.error(res, err.message); }
});

// GET /:id — Full document with all sub-tables
router.get('/:id', h.requireAuth, (req, res) => {
  try {
    const db = getDB();
    const doc = db.prepare(`
      SELECT d.*, u.nama as unit_nama, u.kode_dokumen, p.nama as probis_nama, p.nomor as probis_nomor, usr.nama as owner_nama
      FROM ik_documents d LEFT JOIN units u ON u.id=d.unit_id LEFT JOIN probis p ON p.id=d.probis_id LEFT JOIN users usr ON usr.id=d.owner_id
      WHERE d.id=?
    `).get(req.params.id);
    if (!doc) return h.notFound(res, 'Dokumen tidak ditemukan');

    const id = req.params.id;
    const steps = db.prepare('SELECT * FROM ik_steps WHERE dokumen_id=? ORDER BY step').all(id);
    const definisi = db.prepare('SELECT * FROM ik_definisi WHERE dokumen_id=?').all(id);
    const dokTerkaitAll = db.prepare('SELECT * FROM ik_dokumen_terkait WHERE dokumen_id=?').all(id);
    const dokumen_terkait = {
      pendukung: dokTerkaitAll.filter(d => d.tipe === 'Pendukung'),
      referensi: dokTerkaitAll.filter(d => d.tipe === 'Referensi'),
      perizinan: dokTerkaitAll.filter(d => d.tipe === 'Perizinan'),
      teknis: dokTerkaitAll.filter(d => d.tipe === 'Teknis')
    };
    const sdm = db.prepare('SELECT * FROM ik_sdm WHERE dokumen_id=?').all(id);
    const tools = db.prepare('SELECT * FROM ik_tools WHERE dokumen_id=?').all(id);
    const material = db.prepare('SELECT * FROM ik_material WHERE dokumen_id=?').all(id);
    const formulir = db.prepare('SELECT * FROM ik_formulir WHERE dokumen_id=?').all(id);
    const risiko = db.prepare('SELECT * FROM ik_risiko WHERE dokumen_id=?').all(id);
    const approvals = db.prepare('SELECT a.*, usr.nama as user_nama FROM ik_approvals a LEFT JOIN users usr ON usr.id=a.user_id WHERE a.dokumen_id=? ORDER BY a.created_at DESC').all(id);
    const equipment = db.prepare('SELECT e.* FROM ik_equipment ie JOIN equipment e ON ie.equipment_id=e.id WHERE ie.ik_id=?').all(id);

    h.success(res, { ...doc, steps, definisi, dokumen_terkait, sdm, tools, material, formulir, risiko, approvals, equipment });
  } catch (err) { h.error(res, err.message); }
});

// POST / — Create document
router.post('/', h.requireAuth, (req, res) => {
  try {
    const db = getDB();
    const userId = req.session.user_id;
    const { judul, unit_id, probis_id, tingkat_risiko, penyusun_nama, penyusun_jabatan,
      steps, definisi, dokumen_terkait, sdm, tools, material, formulir, risiko } = req.body;

    if (!judul || !unit_id || !probis_id) return h.error(res, 'Judul, unit, dan probis wajib diisi');

    const unit = db.prepare('SELECT kode_dokumen FROM units WHERE id=?').get(unit_id);
    const prob = db.prepare('SELECT nomor FROM probis WHERE id=?').get(probis_id);
    if (!unit || !prob) return h.notFound(res, 'Unit atau Probis tidak ditemukan');

    // Generate doc number
    db.prepare(`INSERT INTO doc_number_sequences (unit_id, probis_id, last_sequence)
      VALUES (?,?,1) ON CONFLICT(unit_id, probis_id) DO UPDATE SET last_sequence=last_sequence+1`)
      .run(unit_id, probis_id);
    const seqRow = db.prepare('SELECT last_sequence FROM doc_number_sequences WHERE unit_id=? AND probis_id=?').get(unit_id, probis_id);
    const nomor_dokumen = h.generateDocNumber(unit.kode_dokumen, prob.nomor, seqRow.last_sequence);

    const result = db.prepare(`INSERT INTO ik_documents (judul, nomor_dokumen, unit_id, probis_id, tingkat_risiko, owner_id, penyusun_nama, penyusun_jabatan)
      VALUES (?,?,?,?,?,?,?,?)`).run(judul, nomor_dokumen, unit_id, probis_id, tingkat_risiko || 'Rendah', userId, penyusun_nama || null, penyusun_jabatan || null);
    const docId = result.lastInsertRowid;

    // Insert sub-tables
    if (steps) {
      const stmt = db.prepare('INSERT INTO ik_steps (dokumen_id, step, tujuan, ruang_lingkup, aktivitas_persiapan, aktivitas_pelaksanaan, aktivitas_monitoring, aktivitas_tindak_lanjut) VALUES (?,?,?,?,?,?,?,?)');
      steps.forEach((s, i) => stmt.run(docId, i + 1, s.tujuan || null, s.ruang_lingkup || null, s.aktivitas_persiapan || null, s.aktivitas_pelaksanaan || null, s.aktivitas_monitoring || null, s.aktivitas_tindak_lanjut || null));
    }
    if (definisi?.length) {
      const stmt = db.prepare('INSERT INTO ik_definisi (dokumen_id, istilah, penjelasan) VALUES (?,?,?)');
      for (const d of definisi) stmt.run(docId, d.istilah, d.penjelasan);
    }
    if (dokumen_terkait?.length) {
      const stmt = db.prepare('INSERT INTO ik_dokumen_terkait (dokumen_id, tipe, konten) VALUES (?,?,?)');
      for (const d of dokumen_terkait) stmt.run(docId, d.tipe, d.konten || d.nama || null);
    }
    if (sdm?.length) {
      const stmt = db.prepare('INSERT INTO ik_sdm (dokumen_id, kompetensi, jumlah, keterangan) VALUES (?,?,?,?)');
      for (const s of sdm) stmt.run(docId, s.kompetensi, s.jumlah || null, s.keterangan || null);
    }
    if (tools?.length) {
      const stmt = db.prepare('INSERT INTO ik_tools (dokumen_id, nama, jumlah, keterangan) VALUES (?,?,?,?)');
      for (const t of tools) stmt.run(docId, t.nama, t.jumlah || null, t.keterangan || null);
    }
    if (material?.length) {
      const stmt = db.prepare('INSERT INTO ik_material (dokumen_id, nama, jumlah, keterangan) VALUES (?,?,?,?)');
      for (const m of material) stmt.run(docId, m.nama, m.jumlah || null, m.keterangan || null);
    }
    if (formulir?.length) {
      const stmt = db.prepare('INSERT INTO ik_formulir (dokumen_id, nomor_form, judul_form) VALUES (?,?,?)');
      for (const f of formulir) stmt.run(docId, f.nomor_form || f.nomor, f.judul_form || f.judul);
    }
    if (risiko?.length) {
      const stmt = db.prepare('INSERT INTO ik_risiko (dokumen_id, risiko, penyebab, dampak, kemungkinan, dampak_level, level_inheren, kontrol_existing, level_residual, mitigasi) VALUES (?,?,?,?,?,?,?,?,?,?)');
      for (const r of risiko) stmt.run(docId, r.risiko, r.penyebab || null, r.dampak || null, r.kemungkinan || null, r.dampak_level || null, r.level_inheren || null, r.kontrol_existing || null, r.level_residual || null, r.mitigasi || null);
    }

    h.logAudit(req, 'CREATE_DOCUMENT', `Dokumen ${nomor_dokumen} - ${judul} dibuat`, 'dokumen');
    h.created(res, { id: docId, nomor_dokumen });
  } catch (err) { h.error(res, err.message); }
});

// PUT /:id — Update document (Draft/Review only)
router.put('/:id', h.requireAuth, (req, res) => {
  try {
    const db = getDB();
    const doc = db.prepare('SELECT * FROM ik_documents WHERE id=?').get(req.params.id);
    if (!doc) return h.notFound(res);
    if (!['Draft', 'Review'].includes(doc.status)) return h.forbidden(res, 'Hanya dokumen Draft/Review yang bisa diedit');

    const fields = []; const params = [];
    for (const f of ['judul', 'tingkat_risiko', 'penyusun_nama', 'penyusun_jabatan', 'cloud_path']) {
      if (req.body[f] !== undefined) { fields.push(`${f}=?`); params.push(req.body[f]); }
    }
    if (fields.length) {
      fields.push("updated_at=datetime('now','localtime')");
      params.push(req.params.id);
      db.prepare(`UPDATE ik_documents SET ${fields.join(',')} WHERE id=?`).run(...params);
    }

    const id = req.params.id;
    // Replace sub-tables if provided
    const { steps, definisi, dokumen_terkait, sdm, tools, material, formulir, risiko } = req.body;
    if (steps !== undefined) {
      db.prepare('DELETE FROM ik_steps WHERE dokumen_id=?').run(id);
      if (steps?.length) {
        const stmt = db.prepare('INSERT INTO ik_steps (dokumen_id, step, tujuan, ruang_lingkup, aktivitas_persiapan, aktivitas_pelaksanaan, aktivitas_monitoring, aktivitas_tindak_lanjut) VALUES (?,?,?,?,?,?,?,?)');
        steps.forEach((s, i) => stmt.run(id, i + 1, s.tujuan || null, s.ruang_lingkup || null, s.aktivitas_persiapan || null, s.aktivitas_pelaksanaan || null, s.aktivitas_monitoring || null, s.aktivitas_tindak_lanjut || null));
      }
    }
    if (definisi !== undefined) { db.prepare('DELETE FROM ik_definisi WHERE dokumen_id=?').run(id); if (definisi?.length) { const stmt = db.prepare('INSERT INTO ik_definisi (dokumen_id, istilah, penjelasan) VALUES (?,?,?)'); for (const d of definisi) stmt.run(id, d.istilah, d.penjelasan); } }
    if (dokumen_terkait !== undefined) { db.prepare('DELETE FROM ik_dokumen_terkait WHERE dokumen_id=?').run(id); if (dokumen_terkait?.length) { const stmt = db.prepare('INSERT INTO ik_dokumen_terkait (dokumen_id, tipe, konten) VALUES (?,?,?)'); for (const d of dokumen_terkait) stmt.run(id, d.tipe, d.konten || d.nama || null); } }
    if (sdm !== undefined) { db.prepare('DELETE FROM ik_sdm WHERE dokumen_id=?').run(id); if (sdm?.length) { const stmt = db.prepare('INSERT INTO ik_sdm (dokumen_id, kompetensi, jumlah, keterangan) VALUES (?,?,?,?)'); for (const s of sdm) stmt.run(id, s.kompetensi, s.jumlah || null, s.keterangan || null); } }
    if (tools !== undefined) { db.prepare('DELETE FROM ik_tools WHERE dokumen_id=?').run(id); if (tools?.length) { const stmt = db.prepare('INSERT INTO ik_tools (dokumen_id, nama, jumlah, keterangan) VALUES (?,?,?,?)'); for (const t of tools) stmt.run(id, t.nama, t.jumlah || null, t.keterangan || null); } }
    if (material !== undefined) { db.prepare('DELETE FROM ik_material WHERE dokumen_id=?').run(id); if (material?.length) { const stmt = db.prepare('INSERT INTO ik_material (dokumen_id, nama, jumlah, keterangan) VALUES (?,?,?,?)'); for (const m of material) stmt.run(id, m.nama, m.jumlah || null, m.keterangan || null); } }
    if (formulir !== undefined) { db.prepare('DELETE FROM ik_formulir WHERE dokumen_id=?').run(id); if (formulir?.length) { const stmt = db.prepare('INSERT INTO ik_formulir (dokumen_id, nomor_form, judul_form) VALUES (?,?,?)'); for (const f of formulir) stmt.run(id, f.nomor_form || f.nomor, f.judul_form || f.judul); } }
    if (risiko !== undefined) { db.prepare('DELETE FROM ik_risiko WHERE dokumen_id=?').run(id); if (risiko?.length) { const stmt = db.prepare('INSERT INTO ik_risiko (dokumen_id, risiko, penyebab, dampak, kemungkinan, dampak_level, level_inheren, kontrol_existing, level_residual, mitigasi) VALUES (?,?,?,?,?,?,?,?,?,?)'); for (const r of risiko) stmt.run(id, r.risiko, r.penyebab || null, r.dampak || null, r.kemungkinan || null, r.dampak_level || null, r.level_inheren || null, r.kontrol_existing || null, r.level_residual || null, r.mitigasi || null); } }

    h.logAudit(req, 'UPDATE_DOCUMENT', `Dokumen ${doc.nomor_dokumen} diperbarui`, 'dokumen');
    h.success(res, null, 'Dokumen berhasil diperbarui');
  } catch (err) { h.error(res, err.message); }
});

// DELETE /:id
router.delete('/:id', h.requireRole('Admin', 'Super Admin'), (req, res) => {
  try {
    const db = getDB();
    const doc = db.prepare('SELECT * FROM ik_documents WHERE id=?').get(req.params.id);
    if (!doc) return h.notFound(res);
    db.prepare('DELETE FROM ik_documents WHERE id=?').run(req.params.id);
    h.logAudit(req, 'DELETE_DOCUMENT', `Dokumen ${doc.nomor_dokumen} dihapus`, 'dokumen');
    h.success(res, null, 'Dokumen berhasil dihapus');
  } catch (err) { h.error(res, err.message); }
});

module.exports = router;
