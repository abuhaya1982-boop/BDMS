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

  // Pertahankan Daftar Perubahan (change_history) — jangan ikut terhapus saat
  // baris ik_steps di-rebuild. (Dulu hilang tiap simpan → riwayat tak pernah ada.)
  const prev = db.prepare('SELECT change_history FROM ik_steps WHERE dokumen_id=? ORDER BY step LIMIT 1').get(docId);
  const prevHist = prev ? prev.change_history : null;

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
    metode_pengukuran, data_teknik, change_history) VALUES (?,1,?,?,?,?,?,?,?,?,?)`)
    .run(docId, tujuan, ruang_lingkup, aktivitas_persiapan, aktivitas_pelaksanaan,
      aktivitas_monitoring, aktivitas_tindak_lanjut, metode_pengukuran, data_teknik, prevHist);

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

    // Snapshot isi lama SEBELUM ditimpa — untuk auto-deteksi Daftar Perubahan.
    const _oldSnap = loadDocSnapshot(db, id);

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
        const stmt = db.prepare('INSERT INTO ik_risiko (dokumen_id, risiko, penyebab, dampak, kemungkinan, dampak_level, level_inheren, kontrol_existing, level_residual, mitigasi, residual_kemungkinan, residual_dampak) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)');
        for (const r of b.risiko) stmt.run(id, r.risiko, r.penyebab || null, r.dampak || null, r.kemungkinan || null, r.dampak_level || null, r.skor_inheren || r.level_inheren || null, r.kontrol_existing || null, r.skor_residual || r.level_residual || null, r.mitigasi || null, r.residual_kemungkinan || null, r.residual_dampak || null);
      }
    }

    // Auto-catat Daftar Perubahan — SATU baris per revisi (akumulasi bagian yang
    // berubah), plus catatan manual opsional dari penyusun. Hanya saat revisi >= 01.
    const curRev = (b.revisi !== undefined ? b.revisi : doc.revisi) || '00';
    let change_history = _parseHistory(_firstStep(db, id)?.change_history);
    const _autoText = (secs) => (secs && secs.length) ? ('Perubahan pada ' + secs.join('; ')) : '';
    const _composeUraian = (secs, note) => [_autoText(secs), note].filter(Boolean).join(' — ');

    // 1) Gabungkan catatan manual (opsional) — TIDAK menimpa deteksi otomatis.
    const notes = (b.change_history_notes && typeof b.change_history_notes === 'object') ? b.change_history_notes : null;
    if (notes) {
      for (const r of change_history) {
        const key = String(r.revisi);
        if (Object.prototype.hasOwnProperty.call(notes, key)) {
          r.catatan = String(notes[key] || '');
          r.uraian = _composeUraian(Array.isArray(r.sections) ? r.sections : [], r.catatan);
        }
      }
    }

    // 2) Deteksi bagian yang berubah untuk revisi aktif.
    if (parseInt(curRev, 10) >= 1) {
      const changed = detectChangedSections(_oldSnap, b, doc);
      let row = change_history.find(r => String(r.revisi) === String(curRev));
      const set = new Set(row && Array.isArray(row.sections) ? row.sections : []);
      for (const label of changed) set.add(label);
      const curNote = notes && Object.prototype.hasOwnProperty.call(notes, String(curRev))
        ? String(notes[String(curRev)] || '')
        : (row && row.catatan ? row.catatan : '');
      if (set.size || curNote) {
        const sections = Array.from(set);
        const halaman = sections.length === 0 ? '—' : (sections.length === 1 ? sections[0] : 'Beberapa bagian');
        const uraian = _composeUraian(sections, curNote);
        if (row) { row.halaman = halaman; row.uraian = uraian; row.sections = sections; row.catatan = curNote; if (changed.length) row.tanggal = _todayStr(db); }
        else { change_history.push({ halaman, uraian, revisi: curRev, tanggal: _todayStr(db), sections, catatan: curNote }); }
      }
    }

    if (change_history.length) setChangeHistory(db, id, change_history);

    h.logAudit(req, 'UPDATE_DOCUMENT', `Dokumen ${doc.nomor_dokumen} diperbarui`, 'dokumen');
    h.success(res, { change_history }, 'Dokumen berhasil diperbarui');
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

// ── Helper: copy all sub-table rows from one document to another ──
function cloneSubTables(db, srcId, newId) {
  // ik_steps
  for (const s of db.prepare('SELECT * FROM ik_steps WHERE dokumen_id=?').all(srcId)) {
    db.prepare(`INSERT INTO ik_steps (dokumen_id, step, tujuan, ruang_lingkup,
      aktivitas_persiapan, aktivitas_pelaksanaan, aktivitas_monitoring, aktivitas_tindak_lanjut,
      metode_pengukuran, data_teknik, change_history) VALUES (?,?,?,?,?,?,?,?,?,?,?)`)
      .run(newId, s.step, s.tujuan, s.ruang_lingkup, s.aktivitas_persiapan, s.aktivitas_pelaksanaan,
        s.aktivitas_monitoring, s.aktivitas_tindak_lanjut, s.metode_pengukuran, s.data_teknik, s.change_history);
  }
  for (const d of db.prepare('SELECT * FROM ik_definisi WHERE dokumen_id=?').all(srcId))
    db.prepare('INSERT INTO ik_definisi (dokumen_id, istilah, penjelasan) VALUES (?,?,?)').run(newId, d.istilah, d.penjelasan);
  for (const d of db.prepare('SELECT * FROM ik_dokumen_terkait WHERE dokumen_id=?').all(srcId))
    db.prepare('INSERT INTO ik_dokumen_terkait (dokumen_id, tipe, konten) VALUES (?,?,?)').run(newId, d.tipe, d.konten);
  for (const r of db.prepare('SELECT * FROM ik_sdm WHERE dokumen_id=?').all(srcId))
    db.prepare('INSERT INTO ik_sdm (dokumen_id, kompetensi, jumlah, keterangan) VALUES (?,?,?,?)').run(newId, r.kompetensi, r.jumlah, r.keterangan);
  for (const r of db.prepare('SELECT * FROM ik_tools WHERE dokumen_id=?').all(srcId))
    db.prepare('INSERT INTO ik_tools (dokumen_id, nama, jumlah, keterangan) VALUES (?,?,?,?)').run(newId, r.nama, r.jumlah, r.keterangan);
  for (const r of db.prepare('SELECT * FROM ik_material WHERE dokumen_id=?').all(srcId))
    db.prepare('INSERT INTO ik_material (dokumen_id, nama, jumlah, keterangan) VALUES (?,?,?,?)').run(newId, r.nama, r.jumlah, r.keterangan);
  for (const r of db.prepare('SELECT * FROM ik_formulir WHERE dokumen_id=?').all(srcId))
    db.prepare('INSERT INTO ik_formulir (dokumen_id, nomor_form, judul_form) VALUES (?,?,?)').run(newId, r.nomor_form, r.judul_form);
  for (const r of db.prepare('SELECT * FROM ik_risiko WHERE dokumen_id=?').all(srcId))
    db.prepare(`INSERT INTO ik_risiko (dokumen_id, risiko, penyebab, dampak, kemungkinan, dampak_level,
      level_inheren, kontrol_existing, level_residual, mitigasi, residual_kemungkinan, residual_dampak)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`)
      .run(newId, r.risiko, r.penyebab, r.dampak, r.kemungkinan, r.dampak_level, r.level_inheren,
        r.kontrol_existing, r.level_residual, r.mitigasi, r.residual_kemungkinan, r.residual_dampak);
}

// ── Helper: create a new ik_documents row cloned from source, return new id+nomor ──
// opts: { judul, revisi, status, nomor (optional explicit), revisi_dari }
function createClonedDocument(db, src, userId, opts) {
  const unit = db.prepare('SELECT kode_dokumen FROM units WHERE id=?').get(src.unit_id);
  const prob = db.prepare('SELECT nomor FROM probis WHERE id=?').get(src.probis_id);
  let nomor = opts.nomor;
  if (!nomor) {
    db.prepare(`INSERT INTO doc_number_sequences (unit_id, probis_id, last_sequence)
      VALUES (?,?,1) ON CONFLICT(unit_id, probis_id) DO UPDATE SET last_sequence=last_sequence+1`)
      .run(src.unit_id, src.probis_id);
    const seqRow = db.prepare('SELECT last_sequence FROM doc_number_sequences WHERE unit_id=? AND probis_id=?').get(src.unit_id, src.probis_id);
    nomor = h.generateDocNumber(unit ? unit.kode_dokumen : 'IK', prob ? prob.nomor : '00', seqRow.last_sequence);
  }
  const result = db.prepare(`INSERT INTO ik_documents
    (judul, nomor_dokumen, unit_id, probis_id, revisi, status, tingkat_risiko, owner_id,
     template_id, template_snapshot, template_versi,
     tanggal_ditetapkan, tanggal_diperbarui, penyusun_nama, penyusun_jabatan,
     approver_id, pengesahan_id, ttd, custom_sections, konten, revisi_dari)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
    .run(
      opts.judul, nomor, src.unit_id, src.probis_id,
      opts.revisi, opts.status || 'Draft', src.tingkat_risiko || 'Rendah', userId,
      src.template_id, src.template_snapshot, src.template_versi,
      src.tanggal_ditetapkan || null, null,
      src.penyusun_nama || null, src.penyusun_jabatan || null,
      src.approver_id || null, src.pengesahan_id || null,
      src.ttd || null, src.custom_sections || null, src.konten || null,
      opts.revisi_dari || null
    );
  const newId = result.lastInsertRowid;
  cloneSubTables(db, src.id, newId);
  return { id: newId, nomor_dokumen: nomor };
}

function bumpRevisi(rev) {
  const n = parseInt(rev, 10);
  if (Number.isNaN(n)) return '01';
  return String(n + 1).padStart(2, '0');
}

// ── Helpers: Daftar Perubahan Dokumen (change_history disimpan di ik_steps) ──
function _firstStep(db, docId) {
  return db.prepare('SELECT * FROM ik_steps WHERE dokumen_id=? ORDER BY step LIMIT 1').get(docId);
}
function _parseHistory(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  try { const a = JSON.parse(raw); return Array.isArray(a) ? a : []; } catch { return []; }
}
function setChangeHistory(db, docId, arr) {
  const row = _firstStep(db, docId);
  if (row) db.prepare('UPDATE ik_steps SET change_history=? WHERE id=?').run(JSON.stringify(arr || []), row.id);
  else db.prepare('INSERT INTO ik_steps (dokumen_id, step, change_history) VALUES (?,1,?)').run(docId, JSON.stringify(arr || []));
}
function _todayStr(db) {
  return db.prepare("SELECT strftime('%d-%m-%Y','now','localtime') AS t").get().t;
}

// ── Auto-deteksi section yang berubah untuk Daftar Perubahan Dokumen ──
function _norm(v) { return String(v == null ? '' : v).replace(/\s+/g, ' ').trim(); }
function _normArr(arr, pick) { return JSON.stringify((Array.isArray(arr) ? arr : []).map(r => pick(r).map(_norm))); }

// Snapshot isi dokumen SEBELUM update (untuk dibandingkan dengan payload baru)
function loadDocSnapshot(db, id) {
  return {
    steps: db.prepare('SELECT * FROM ik_steps WHERE dokumen_id=? ORDER BY step LIMIT 1').get(id) || {},
    definisi: db.prepare('SELECT * FROM ik_definisi WHERE dokumen_id=?').all(id),
    sdm: db.prepare('SELECT * FROM ik_sdm WHERE dokumen_id=?').all(id),
    tools: db.prepare('SELECT * FROM ik_tools WHERE dokumen_id=?').all(id),
    material: db.prepare('SELECT * FROM ik_material WHERE dokumen_id=?').all(id),
    formulir: db.prepare('SELECT * FROM ik_formulir WHERE dokumen_id=?').all(id),
    risiko: db.prepare('SELECT * FROM ik_risiko WHERE dokumen_id=?').all(id),
    dokTerkait: db.prepare('SELECT * FROM ik_dokumen_terkait WHERE dokumen_id=?').all(id),
  };
}

// Kembalikan daftar label section yang berubah (old snapshot vs payload b)
function detectChangedSections(old, b, doc) {
  const changed = [];
  const os = old.steps || {};
  if (b.steps && typeof b.steps === 'object') {
    const s = b.steps;
    if (s.tujuan !== undefined && _norm(s.tujuan) !== _norm(os.tujuan)) changed.push('Tujuan');
    if (s.ruang_lingkup !== undefined && _norm(s.ruang_lingkup) !== _norm(os.ruang_lingkup)) changed.push('Ruang Lingkup');
    const aktKeys = ['aktivitas_persiapan', 'aktivitas_pelaksanaan', 'aktivitas_monitoring', 'aktivitas_tindak_lanjut'];
    if (aktKeys.some(k => s[k] !== undefined)) {
      const aN = aktKeys.map(k => _norm(s[k])).join('|');
      const aO = aktKeys.map(k => _norm(os[k])).join('|');
      if (aN !== aO) changed.push('Detail Aktivitas');
    }
    if (s.data_teknik !== undefined && _norm(s.data_teknik) !== _norm(os.data_teknik)) changed.push('Dokumen/Data Teknik');
    if (s.metode_pengukuran !== undefined) {
      const mN = typeof s.metode_pengukuran === 'string' ? _norm(s.metode_pengukuran) : _norm(JSON.stringify(s.metode_pengukuran));
      const mO = os.metode_pengukuran ? (typeof os.metode_pengukuran === 'string' ? _norm(os.metode_pengukuran) : _norm(JSON.stringify(os.metode_pengukuran))) : '';
      if (mN !== mO) changed.push('Metode Pengukuran');
    }
  }
  if (b.judul !== undefined && _norm(b.judul) !== _norm(doc.judul)) changed.push('Judul');
  if (b.definisi !== undefined && _normArr(b.definisi, d => [d.istilah, d.penjelasan]) !== _normArr(old.definisi, d => [d.istilah, d.penjelasan])) changed.push('Definisi');
  if (b.sdm !== undefined && _normArr(b.sdm, r => [r.kompetensi, r.jumlah, r.keterangan]) !== _normArr(old.sdm, r => [r.kompetensi, r.jumlah, r.keterangan])) changed.push('Sumber Daya (SDM)');
  if (b.tools !== undefined && _normArr(b.tools, r => [r.nama, r.jumlah, r.keterangan]) !== _normArr(old.tools, r => [r.nama, r.jumlah, r.keterangan])) changed.push('Tools/APD');
  if (b.material !== undefined && _normArr(b.material, r => [r.nama, r.jumlah, r.keterangan]) !== _normArr(old.material, r => [r.nama, r.jumlah, r.keterangan])) changed.push('Material');
  if (b.formulir !== undefined && _normArr(b.formulir, r => [r.nomor_form || r.nomor, r.judul_form || r.judul]) !== _normArr(old.formulir, r => [r.nomor_form, r.judul_form])) changed.push('Formulir');
  if (b.risiko !== undefined) {
    const pick = r => [r.risiko, r.penyebab, r.dampak, r.kemungkinan, r.dampak_level,
      r.level_inheren != null ? r.level_inheren : r.skor_inheren, r.kontrol_existing,
      r.level_residual != null ? r.level_residual : r.skor_residual, r.mitigasi,
      r.residual_kemungkinan, r.residual_dampak];
    if (_normArr(b.risiko, pick) !== _normArr(old.risiko, pick)) changed.push('Identifikasi Risiko');
  }
  if (b.dokumen_pendukung !== undefined || b.dokumen_referensi !== undefined || b.dokumen_perizinan !== undefined) {
    const newDt = JSON.stringify([
      (b.dokumen_pendukung || []).map(x => _norm(x.nomor || x.konten)),
      (b.dokumen_referensi || []).map(x => _norm(x.nama || x.konten)),
      (b.dokumen_perizinan || []).map(x => _norm(x.nama || x.konten)),
    ]);
    const oldDt = JSON.stringify([
      old.dokTerkait.filter(d => d.tipe === 'Pendukung').map(d => _norm(d.konten)),
      old.dokTerkait.filter(d => d.tipe === 'Referensi').map(d => _norm(d.konten)),
      old.dokTerkait.filter(d => d.tipe === 'Perizinan').map(d => _norm(d.konten)),
    ]);
    if (newDt !== oldDt) changed.push('Dokumen Terkait');
  }
  return changed;
}

// POST /:id/duplicate — Salin dokumen sebagai IK baru (nomor baru, revisi 00, Draft)
router.post('/:id/duplicate', h.requireAuth, (req, res) => {
  try {
    const db = getDB();
    const src = db.prepare('SELECT * FROM ik_documents WHERE id=?').get(req.params.id);
    if (!src) return h.notFound(res, 'Dokumen sumber tidak ditemukan');
    const userId = req.session.user_id;
    const out = createClonedDocument(db, src, userId, {
      judul: (src.judul || 'Tanpa Judul') + ' (Salinan)',
      revisi: '00', status: 'Draft',
    });
    // Salinan adalah IK baru (Rev 00) — mulai dengan Daftar Perubahan kosong.
    setChangeHistory(db, out.id, []);
    h.logAudit(req, 'DUPLICATE_DOCUMENT', `Dokumen ${src.nomor_dokumen} disalin menjadi ${out.nomor_dokumen}`, 'dokumen');
    h.created(res, out);
  } catch (err) { h.error(res, err.message); }
});

// POST /:id/revisi — Buka dokumen yang SAMA untuk direvisi.
// Nomor dokumen TIDAK berubah; revisi naik (mis. 00→01) & status kembali Draft
// agar bisa diedit. Perubahan per-section tercatat otomatis ke Daftar Perubahan
// saat disimpan (lihat detectChangedSections di PUT).
router.post('/:id/revisi', h.requireAuth, (req, res) => {
  try {
    const db = getDB();
    const src = db.prepare('SELECT * FROM ik_documents WHERE id=?').get(req.params.id);
    if (!src) return h.notFound(res, 'Dokumen tidak ditemukan');
    if (src.status !== 'Published') return h.error(res, 'Hanya dokumen berstatus Published yang bisa direvisi');

    const newRev = bumpRevisi(src.revisi);
    db.prepare("UPDATE ik_documents SET revisi=?, status='Draft', tanggal_diperbarui=date('now','localtime'), updated_at=datetime('now','localtime') WHERE id=?")
      .run(newRev, src.id);
    h.logAudit(req, 'REVISE_DOCUMENT', `Dokumen ${src.nomor_dokumen} dibuka untuk revisi ${newRev}`, 'dokumen');
    h.success(res, { id: src.id, nomor_dokumen: src.nomor_dokumen, revisi: newRev }, `Dokumen dibuka untuk revisi ${newRev}`);
  } catch (err) { h.error(res, err.message); }
});

module.exports = router;
