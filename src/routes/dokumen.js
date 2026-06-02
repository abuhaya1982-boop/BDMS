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
      SELECT d.*, u.nama as unit_nama, u.kode_dokumen, p.nama as probis_nama, p.nomor as probis_nomor,
        usr.nama as owner_nama,
        appr.nama as approver_nama, peng.nama as pengesahan_nama
      FROM ik_documents d LEFT JOIN units u ON u.id=d.unit_id LEFT JOIN probis p ON p.id=d.probis_id
      LEFT JOIN users usr ON usr.id=d.owner_id
      LEFT JOIN users appr ON appr.id=d.approver_id
      LEFT JOIN users peng ON peng.id=d.pengesahan_id
      WHERE d.id=?
    `).get(req.params.id);
    if (!doc) return h.notFound(res, 'Dokumen tidak ditemukan');

    const id = req.params.id;

    // Steps — stored as rows in ik_steps, merge into a flat object for frontend
    const stepRows = db.prepare('SELECT * FROM ik_steps WHERE dokumen_id=? ORDER BY step').all(id);
    const steps = {};
    if (stepRows.length) {
      const s = stepRows[0]; // Take first row (template-driven: usually 1 row)
      for (const key of ['tujuan','ruang_lingkup','aktivitas_persiapan','aktivitas_pelaksanaan','aktivitas_monitoring','aktivitas_tindak_lanjut','data_teknik','change_history']) {
        if (s[key]) steps[key] = s[key];
      }
      // metode_pengukuran might be JSON
      if (s.metode_pengukuran) {
        try { steps.metode_pengukuran = JSON.parse(s.metode_pengukuran); } catch { steps.metode_pengukuran = s.metode_pengukuran; }
      }
    }
    // Also load konten (JSON blob with extra data like formulir content)
    let konten = {};
    if (doc.konten) { try { konten = JSON.parse(doc.konten); } catch {} }

    // Merge steps from konten (for fields stored in konten JSON)
    if (konten.steps) { Object.assign(steps, konten.steps); }
    if (konten.formulir && !steps.formulir) steps.formulir = konten.formulir;

    const definisi = db.prepare('SELECT * FROM ik_definisi WHERE dokumen_id=?').all(id);
    const dokTerkaitAll = db.prepare('SELECT * FROM ik_dokumen_terkait WHERE dokumen_id=?').all(id);
    // Map DB rows to frontend-expected keys: pendukung uses 'nomor', referensi/perizinan use 'nama'
    const dokumen_pendukung = dokTerkaitAll.filter(d => d.tipe === 'Pendukung').map(d => ({ id: d.id, nomor: d.konten }));
    const dokumen_referensi = dokTerkaitAll.filter(d => d.tipe === 'Referensi').map(d => ({ id: d.id, nama: d.konten }));
    const dokumen_perizinan = dokTerkaitAll.filter(d => d.tipe === 'Perizinan').map(d => ({ id: d.id, nama: d.konten }));
    const sdm = db.prepare('SELECT * FROM ik_sdm WHERE dokumen_id=?').all(id);
    const tools = db.prepare('SELECT * FROM ik_tools WHERE dokumen_id=?').all(id);
    const material = db.prepare('SELECT * FROM ik_material WHERE dokumen_id=?').all(id);
    const formulir = db.prepare('SELECT * FROM ik_formulir WHERE dokumen_id=?').all(id);
    const risiko = db.prepare('SELECT * FROM ik_risiko WHERE dokumen_id=?').all(id);
    const approvals = db.prepare('SELECT a.*, usr.nama as user_nama FROM ik_approvals a LEFT JOIN users usr ON usr.id=a.user_id WHERE a.dokumen_id=? ORDER BY a.created_at DESC').all(id);

    // Parse TTD JSON
    let ttd = null;
    if (doc.ttd) { try { ttd = JSON.parse(doc.ttd); } catch {} }

    // Parse custom_sections
    let custom_sections = null;
    if (doc.custom_sections) { try { custom_sections = JSON.parse(doc.custom_sections); } catch {} }

    // Parse change_history from steps
    let change_history = [];
    if (steps.change_history) {
      if (Array.isArray(steps.change_history)) {
        change_history = steps.change_history;
      } else {
        try { change_history = JSON.parse(steps.change_history); } catch {}
      }
    }

    h.success(res, {
      ...doc,
      ttd,
      custom_sections,
      steps,
      konten,
      change_history,
      definisi,
      dokumen_pendukung,
      dokumen_referensi,
      dokumen_perizinan,
      attachments_formulir: Array.isArray(konten.attachments_formulir) ? konten.attachments_formulir : [],
      attachments_data_teknik: Array.isArray(konten.attachments_data_teknik) ? konten.attachments_data_teknik : [],
      sdm, tools, material, formulir, risiko, approvals
    });
  } catch (err) {
    console.error('GET /dokumen/:id error:', err);
    h.error(res, err.message);
  }
});

// ── Helper: save steps (object) into ik_steps table + konten JSON ──
function saveSteps(db, docId, stepsObj) {
  if (!stepsObj || typeof stepsObj !== 'object') return;

  db.prepare('DELETE FROM ik_steps WHERE dokumen_id=?').run(docId);

  // ik_steps columns
  const tujuan = stepsObj.tujuan || null;
  const ruang_lingkup = stepsObj.ruang_lingkup || null;
  const aktivitas_persiapan = stepsObj.aktivitas_persiapan || null;
  const aktivitas_pelaksanaan = stepsObj.aktivitas_pelaksanaan || null;
  const aktivitas_monitoring = stepsObj.aktivitas_monitoring || null;
  const aktivitas_tindak_lanjut = stepsObj.aktivitas_tindak_lanjut || null;
  const data_teknik = stepsObj.data_teknik || null;
  const metode = stepsObj.metode_pengukuran;
  const metode_pengukuran = metode ? (typeof metode === 'string' ? metode : JSON.stringify(metode)) : null;

  db.prepare(`INSERT INTO ik_steps (dokumen_id, step, tujuan, ruang_lingkup,
    aktivitas_persiapan, aktivitas_pelaksanaan, aktivitas_monitoring, aktivitas_tindak_lanjut,
    metode_pengukuran, data_teknik) VALUES (?,1,?,?,?,?,?,?,?,?)`)
    .run(docId, tujuan, ruang_lingkup, aktivitas_persiapan, aktivitas_pelaksanaan,
      aktivitas_monitoring, aktivitas_tindak_lanjut, metode_pengukuran, data_teknik);

  // Store extra steps data (formulir content, custom fields) in konten JSON
  const extra = {};
  for (const [k, v] of Object.entries(stepsObj)) {
    if (!['tujuan','ruang_lingkup','aktivitas_persiapan','aktivitas_pelaksanaan',
      'aktivitas_monitoring','aktivitas_tindak_lanjut','data_teknik','metode_pengukuran'].includes(k)) {
      if (v) extra[k] = v;
    }
  }
  return extra; // caller stores in konten JSON
}

// ── Helper: save dokumen_terkait from separate arrays ──
function saveDokumenTerkait(db, docId, body) {
  db.prepare('DELETE FROM ik_dokumen_terkait WHERE dokumen_id=?').run(docId);
  const stmt = db.prepare('INSERT INTO ik_dokumen_terkait (dokumen_id, tipe, konten) VALUES (?,?,?)');
  const save = (arr, tipe) => {
    if (!arr?.length) return;
    for (const d of arr) stmt.run(docId, tipe, d.nomor || d.nama || d.konten || '');
  };
  save(body.dokumen_pendukung, 'Pendukung');
  save(body.dokumen_referensi, 'Referensi');
  save(body.dokumen_perizinan, 'Perizinan');
  // Also handle legacy dokumen_terkait array
  if (body.dokumen_terkait?.length) {
    for (const d of body.dokumen_terkait) stmt.run(docId, d.tipe || 'Pendukung', d.konten || d.nama || '');
  }
}

// POST / — Create document
router.post('/', h.requireAuth, (req, res) => {
  try {
    const db = getDB();
    const userId = req.session.user_id;
    const b = req.body;

    if (!b.judul || !b.unit_id || !b.probis_id) return h.error(res, 'Judul, unit, dan probis wajib diisi');

    const unit = db.prepare('SELECT kode_dokumen FROM units WHERE id=?').get(b.unit_id);
    const prob = db.prepare('SELECT nomor FROM probis WHERE id=?').get(b.probis_id);
    if (!unit || !prob) return h.notFound(res, 'Unit atau Probis tidak ditemukan');

    // Generate doc number
    db.prepare(`INSERT INTO doc_number_sequences (unit_id, probis_id, last_sequence)
      VALUES (?,?,1) ON CONFLICT(unit_id, probis_id) DO UPDATE SET last_sequence=last_sequence+1`)
      .run(b.unit_id, b.probis_id);
    const seqRow = db.prepare('SELECT last_sequence FROM doc_number_sequences WHERE unit_id=? AND probis_id=?').get(b.unit_id, b.probis_id);
    const nomor_dokumen = h.generateDocNumber(unit.kode_dokumen, prob.nomor, seqRow.last_sequence);

    // Save steps and get extra data for konten JSON
    const stepsExtra = (b.steps && typeof b.steps === 'object' && !Array.isArray(b.steps)) ? b.steps : {};

    const result = db.prepare(`INSERT INTO ik_documents
      (judul, nomor_dokumen, unit_id, probis_id, revisi, status, tingkat_risiko, owner_id,
       template_id, template_snapshot, template_versi,
       tanggal_ditetapkan, tanggal_diperbarui, penyusun_nama, penyusun_jabatan,
       approver_id, pengesahan_id, ttd, custom_sections)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
      .run(
        b.judul, nomor_dokumen, b.unit_id, b.probis_id,
        b.revisi || '00', b.status || 'Draft', b.tingkat_risiko || 'Rendah', userId,
        b.template_id || null, b.template_snapshot || null, b.template_versi || null,
        b.tanggal_ditetapkan || null, b.tanggal_diperbarui || null,
        b.penyusun_nama || null, b.penyusun_jabatan || null,
        b.approver_id || null, b.pengesahan_id || null,
        b.ttd ? JSON.stringify(b.ttd) : null,
        b.custom_sections ? JSON.stringify(b.custom_sections) : null
      );
    const docId = result.lastInsertRowid;

    // Save steps → ik_steps + konten JSON (steps extras + file attachments)
    const extraSteps = saveSteps(db, docId, stepsExtra);
    const kontenObj = {};
    if (Object.keys(extraSteps || {}).length) kontenObj.steps = extraSteps;
    if (Array.isArray(b.attachments_formulir) && b.attachments_formulir.length) kontenObj.attachments_formulir = b.attachments_formulir;
    if (Array.isArray(b.attachments_data_teknik) && b.attachments_data_teknik.length) kontenObj.attachments_data_teknik = b.attachments_data_teknik;
    if (Object.keys(kontenObj).length) {
      db.prepare('UPDATE ik_documents SET konten=? WHERE id=?').run(JSON.stringify(kontenObj), docId);
    }

    // Sub-tables
    if (b.definisi?.length) {
      const stmt = db.prepare('INSERT INTO ik_definisi (dokumen_id, istilah, penjelasan) VALUES (?,?,?)');
      for (const d of b.definisi) stmt.run(docId, d.istilah, d.penjelasan);
    }
    saveDokumenTerkait(db, docId, b);
    if (b.sdm?.length) {
      const stmt = db.prepare('INSERT INTO ik_sdm (dokumen_id, kompetensi, jumlah, keterangan) VALUES (?,?,?,?)');
      for (const s of b.sdm) stmt.run(docId, s.kompetensi, s.jumlah || null, s.keterangan || null);
    }
    if (b.tools?.length) {
      const stmt = db.prepare('INSERT INTO ik_tools (dokumen_id, nama, jumlah, keterangan) VALUES (?,?,?,?)');
      for (const t of b.tools) stmt.run(docId, t.nama, t.jumlah || null, t.keterangan || null);
    }
    if (b.material?.length) {
      const stmt = db.prepare('INSERT INTO ik_material (dokumen_id, nama, jumlah, keterangan) VALUES (?,?,?,?)');
      for (const m of b.material) stmt.run(docId, m.nama, m.jumlah || null, m.keterangan || null);
    }
    if (b.formulir?.length) {
      const stmt = db.prepare('INSERT INTO ik_formulir (dokumen_id, nomor_form, judul_form) VALUES (?,?,?)');
      for (const f of b.formulir) stmt.run(docId, f.nomor_form || f.nomor, f.judul_form || f.judul);
    }
    if (b.risiko?.length) {
      const stmt = db.prepare(`INSERT INTO ik_risiko (dokumen_id, risiko, penyebab, dampak, kemungkinan, dampak_level, level_inheren, kontrol_existing, level_residual, mitigasi, residual_kemungkinan, residual_dampak) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`);
      for (const r of b.risiko) stmt.run(docId, r.risiko, r.penyebab || null, r.dampak || null, r.kemungkinan || null, r.dampak_level || null, r.skor_inheren || r.level_inheren || null, r.kontrol_existing || null, r.skor_residual || r.level_residual || null, r.mitigasi || null, r.residual_kemungkinan || null, r.residual_dampak || null);
    }

    h.logAudit(req, 'CREATE_DOCUMENT', `Dokumen ${nomor_dokumen} - ${b.judul} dibuat`, 'dokumen');
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

    const b = req.body;
    const id = req.params.id;

    // Update main document fields
    const fields = []; const params = [];
    for (const f of ['judul', 'tingkat_risiko', 'penyusun_nama', 'penyusun_jabatan', 'cloud_path',
      'revisi', 'tanggal_ditetapkan', 'tanggal_diperbarui', 'template_id', 'template_snapshot', 'template_versi',
      'approver_id', 'pengesahan_id']) {
      if (b[f] !== undefined) { fields.push(`${f}=?`); params.push(b[f]); }
    }
    if (b.ttd !== undefined) { fields.push('ttd=?'); params.push(JSON.stringify(b.ttd)); }
    if (b.custom_sections !== undefined) { fields.push('custom_sections=?'); params.push(JSON.stringify(b.custom_sections)); }
    if (b.status && ['Draft', 'Review'].includes(b.status)) { fields.push('status=?'); params.push(b.status); }

    fields.push("updated_at=datetime('now','localtime')");
    params.push(id);
    db.prepare(`UPDATE ik_documents SET ${fields.join(',')} WHERE id=?`).run(...params);

    // Save steps + attachments → konten JSON (merge with existing so unspecified fields persist)
    {
      let kontenObj = {};
      try { if (doc.konten) kontenObj = JSON.parse(doc.konten) || {}; } catch {}
      if (b.steps !== undefined && typeof b.steps === 'object' && !Array.isArray(b.steps)) {
        const extraSteps = saveSteps(db, id, b.steps);
        if (Object.keys(extraSteps || {}).length) kontenObj.steps = extraSteps; else delete kontenObj.steps;
      }
      if (b.attachments_formulir !== undefined) {
        if (Array.isArray(b.attachments_formulir) && b.attachments_formulir.length) kontenObj.attachments_formulir = b.attachments_formulir; else delete kontenObj.attachments_formulir;
      }
      if (b.attachments_data_teknik !== undefined) {
        if (Array.isArray(b.attachments_data_teknik) && b.attachments_data_teknik.length) kontenObj.attachments_data_teknik = b.attachments_data_teknik; else delete kontenObj.attachments_data_teknik;
      }
      db.prepare('UPDATE ik_documents SET konten=? WHERE id=?').run(Object.keys(kontenObj).length ? JSON.stringify(kontenObj) : null, id);
    }

    // Replace sub-tables if provided
    if (b.definisi !== undefined) {
      db.prepare('DELETE FROM ik_definisi WHERE dokumen_id=?').run(id);
      if (b.definisi?.length) {
        const stmt = db.prepare('INSERT INTO ik_definisi (dokumen_id, istilah, penjelasan) VALUES (?,?,?)');
        for (const d of b.definisi) stmt.run(id, d.istilah, d.penjelasan);
      }
    }
    if (b.dokumen_pendukung !== undefined || b.dokumen_referensi !== undefined || b.dokumen_perizinan !== undefined) {
      saveDokumenTerkait(db, id, b);
    }
    if (b.sdm !== undefined) {
      db.prepare('DELETE FROM ik_sdm WHERE dokumen_id=?').run(id);
      if (b.sdm?.length) { const stmt = db.prepare('INSERT INTO ik_sdm (dokumen_id, kompetensi, jumlah, keterangan) VALUES (?,?,?,?)'); for (const s of b.sdm) stmt.run(id, s.kompetensi, s.jumlah || null, s.keterangan || null); }
    }
    if (b.tools !== undefined) {
      db.prepare('DELETE FROM ik_tools WHERE dokumen_id=?').run(id);
      if (b.tools?.length) { const stmt = db.prepare('INSERT INTO ik_tools (dokumen_id, nama, jumlah, keterangan) VALUES (?,?,?,?)'); for (const t of b.tools) stmt.run(id, t.nama, t.jumlah || null, t.keterangan || null); }
    }
    if (b.material !== undefined) {
      db.prepare('DELETE FROM ik_material WHERE dokumen_id=?').run(id);
      if (b.material?.length) { const stmt = db.prepare('INSERT INTO ik_material (dokumen_id, nama, jumlah, keterangan) VALUES (?,?,?,?)'); for (const m of b.material) stmt.run(id, m.nama, m.jumlah || null, m.keterangan || null); }
    }
    if (b.formulir !== undefined) {
      db.prepare('DELETE FROM ik_formulir WHERE dokumen_id=?').run(id);
      if (b.formulir?.length) { const stmt = db.prepare('INSERT INTO ik_formulir (dokumen_id, nomor_form, judul_form) VALUES (?,?,?)'); for (const f of b.formulir) stmt.run(id, f.nomor_form || f.nomor, f.judul_form || f.judul); }
    }
    if (b.risiko !== undefined) {
      db.prepare('DELETE FROM ik_risiko WHERE dokumen_id=?').run(id);
      if (b.risiko?.length) {
        const stmt = db.prepare('INSERT INTO ik_risiko (dokumen_id, risiko, penyebab, dampak, kemungkinan, dampak_level, level_inheren, kontrol_existing, level_residual, mitigasi) VALUES (?,?,?,?,?,?,?,?,?,?)');
        for (const r of b.risiko) stmt.run(id, r.risiko, r.penyebab || null, r.dampak || null, r.kemungkinan || null, r.dampak_level || null, r.skor_inheren || r.level_inheren || null, r.kontrol_existing || null, r.skor_residual || r.level_residual || null, r.mitigasi || null);
      }
    }

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
