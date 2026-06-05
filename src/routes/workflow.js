// Workflow API — 3-Tier Approval
const router = require('express').Router();
const { getDB } = require('../db');
const h = require('../helpers');

// Auto-upload DOCX ke Google Drive saat dokumen di-Publish (fire-and-forget).
// Tidak menggagalkan proses publish bila Drive belum dikonfigurasi / gagal.
async function uploadPublishedToDrive(dokumenId) {
  let gdrive, docxExport;
  try { gdrive = require('../gdrive'); } catch { return; }
  if (!gdrive.isConfigured()) return; // diam-diam dilewati bila belum disetel
  try { docxExport = require('./docx-export'); } catch { return; }
  if (typeof docxExport.generateDocxBuffer !== 'function') return;

  try {
    const result = await docxExport.generateDocxBuffer(dokumenId);
    if (!result) return;
    const { buffer, doc, filename } = result;
    const up = await gdrive.uploadDocx({
      buffer, filename,
      unitName: (doc.unit_nama || '').replace(/\s+/g, '_'),
      nomor: doc.nomor_dokumen,
    });
    getDB().prepare("UPDATE ik_documents SET gdrive_url=?, gdrive_file_id=? WHERE id=?")
      .run(up.link, up.id, dokumenId);
    console.log('[gdrive] terupload:', filename, '→', up.link);
  } catch (e) {
    console.warn('[gdrive] upload gagal untuk dokumen', dokumenId, ':', e.message);
  }
}

// GET / — List workflow documents
router.get('/', h.requireAuth, (req, res) => {
  try {
    const db = getDB();
    const { status } = req.query;
    let where = "WHERE d.status != 'Draft'";
    const params = [];
    if (status) { where = 'WHERE d.status = ?'; params.push(status); }

    const items = db.prepare(`
      SELECT d.*, u.nama as unit_nama, p.nama as probis_nama, usr.nama as owner_nama
      FROM ik_documents d LEFT JOIN units u ON u.id=d.unit_id
      LEFT JOIN probis p ON p.id=d.probis_id LEFT JOIN users usr ON usr.id=d.owner_id
      ${where} ORDER BY d.updated_at DESC
    `).all(...params);
    h.success(res, items);
  } catch (err) { h.error(res, err.message); }
});

// Helper: create approval record
function addApproval(db, dokumenId, userId, tahap, catatan) {
  db.prepare("INSERT INTO ik_approvals (dokumen_id, user_id, tahap, catatan) VALUES (?,?,?,?)")
    .run(dokumenId, userId, tahap, catatan || null);
}

// POST /submit — Draft → Review
router.post('/submit', h.requireAuth, (req, res) => {
  try {
    const db = getDB();
    const userId = req.session.user_id;
    const { dokumen_id, catatan } = req.body;
    if (!dokumen_id) return h.error(res, 'dokumen_id wajib');

    const doc = db.prepare('SELECT * FROM ik_documents WHERE id=?').get(dokumen_id);
    if (!doc) return h.notFound(res);
    if (doc.status !== 'Draft') return h.error(res, 'Dokumen harus berstatus Draft');

    db.prepare("UPDATE ik_documents SET status='Review', submitted_by=?, updated_at=datetime('now','localtime') WHERE id=?").run(userId, dokumen_id);
    addApproval(db, dokumen_id, userId, 'Submit', catatan);
    h.logAudit(req, 'SUBMIT_DOCUMENT', `Dokumen ${doc.nomor_dokumen} diajukan review`, 'workflow');
    h.notify(null, 'Dokumen Diajukan Review', `${doc.judul} menunggu review`);
    h.success(res, { status: 'Review' }, 'Dokumen berhasil diajukan');
  } catch (err) { h.error(res, err.message); }
});

// POST /review — Review → Approved-T1 (Asman)
router.post('/review', h.requireAuth, (req, res) => {
  try {
    const db = getDB();
    const userId = req.session.user_id;
    const { dokumen_id, catatan } = req.body;
    if (!dokumen_id) return h.error(res, 'dokumen_id wajib');

    const doc = db.prepare('SELECT * FROM ik_documents WHERE id=?').get(dokumen_id);
    if (!doc) return h.notFound(res);
    if (doc.status !== 'Review') return h.error(res, 'Dokumen harus berstatus Review');

    db.prepare("UPDATE ik_documents SET status='Approved-T1', reviewer_id=?, updated_at=datetime('now','localtime') WHERE id=?").run(userId, dokumen_id);
    addApproval(db, dokumen_id, userId, 'Review-Asman', catatan);
    h.logAudit(req, 'REVIEW_DOCUMENT', `Dokumen ${doc.nomor_dokumen} direview Asman`, 'workflow');
    h.notify(doc.owner_id, 'Dokumen Direview', `${doc.judul} telah direview, menunggu approval Manager`);
    h.success(res, { status: 'Approved-T1' }, 'Dokumen berhasil direview');
  } catch (err) { h.error(res, err.message); }
});

// POST /approve-t1 — Approved-T1 → Approved-T2 (Manager)
router.post('/approve-t1', h.requireAuth, (req, res) => {
  try {
    const db = getDB();
    const userId = req.session.user_id;
    const { dokumen_id, catatan } = req.body;
    if (!dokumen_id) return h.error(res, 'dokumen_id wajib');

    const doc = db.prepare('SELECT * FROM ik_documents WHERE id=?').get(dokumen_id);
    if (!doc) return h.notFound(res);
    if (doc.status !== 'Approved-T1') return h.error(res, 'Dokumen harus berstatus Approved-T1');

    db.prepare("UPDATE ik_documents SET status='Approved-T2', approver_id=?, updated_at=datetime('now','localtime') WHERE id=?").run(userId, dokumen_id);
    addApproval(db, dokumen_id, userId, 'Approve-Manager', catatan);
    h.logAudit(req, 'APPROVE_T1', `Dokumen ${doc.nomor_dokumen} diapprove Manager`, 'workflow');
    h.notify(doc.owner_id, 'Dokumen Diapprove Manager', `${doc.judul} menunggu approval SM`);
    h.success(res, { status: 'Approved-T2' }, 'Dokumen berhasil diapprove');
  } catch (err) { h.error(res, err.message); }
});

// POST /approve-t2 — Approved-T2 → Published (SM)
router.post('/approve-t2', h.requireAuth, (req, res) => {
  try {
    const db = getDB();
    const userId = req.session.user_id;
    const { dokumen_id, catatan } = req.body;
    if (!dokumen_id) return h.error(res, 'dokumen_id wajib');

    const doc = db.prepare('SELECT * FROM ik_documents WHERE id=?').get(dokumen_id);
    if (!doc) return h.notFound(res);
    if (doc.status !== 'Approved-T2') return h.error(res, 'Dokumen harus berstatus Approved-T2');

    // Terbitkan. Revisi dilakukan in-place (dokumen & nomor yang sama), jadi tidak
    // ada manipulasi penomoran / pengarsipan versi lama di sini.
    db.prepare("UPDATE ik_documents SET status='Published', tanggal_terbit=datetime('now','localtime'), review_due=date('now','localtime','+2 years'), updated_at=datetime('now','localtime') WHERE id=?").run(dokumen_id);
    addApproval(db, dokumen_id, userId, 'Approve-SM', catatan);

    h.logAudit(req, 'APPROVE_T2', `Dokumen ${doc.nomor_dokumen} diapprove SM & diterbitkan`, 'workflow');
    h.notify(doc.owner_id, 'Dokumen Diterbitkan', `${doc.judul} telah diterbitkan`);
    // Auto-upload DOCX final ke Google Drive (non-blocking) — respons publish tidak menunggu.
    uploadPublishedToDrive(dokumen_id).catch(() => {});
    h.success(res, { status: 'Published' }, 'Dokumen berhasil diterbitkan');
  } catch (err) { h.error(res, err.message); }
});

// POST /reject — Reject back to Draft
router.post('/reject', h.requireAuth, (req, res) => {
  try {
    const db = getDB();
    const userId = req.session.user_id;
    const { dokumen_id, catatan } = req.body;
    if (!dokumen_id) return h.error(res, 'dokumen_id wajib');
    if (!catatan) return h.error(res, 'Alasan penolakan wajib diisi');

    const doc = db.prepare('SELECT * FROM ik_documents WHERE id=?').get(dokumen_id);
    if (!doc) return h.notFound(res);
    if (!['Review', 'Approved-T1', 'Approved-T2'].includes(doc.status)) return h.error(res, 'Dokumen tidak dalam tahap review');

    db.prepare("UPDATE ik_documents SET status='Rejected', updated_at=datetime('now','localtime') WHERE id=?").run(dokumen_id);
    addApproval(db, dokumen_id, userId, 'Reject', catatan);
    h.logAudit(req, 'REJECT_DOCUMENT', `Dokumen ${doc.nomor_dokumen} ditolak: ${catatan}`, 'workflow');
    h.notify(doc.owner_id, 'Dokumen Ditolak', `${doc.judul} ditolak: ${catatan}`);
    h.success(res, { status: 'Rejected' }, 'Dokumen ditolak');
  } catch (err) { h.error(res, err.message); }
});

// POST /return-revisi — Return to Draft for revision
router.post('/return-revisi', h.requireAuth, (req, res) => {
  try {
    const db = getDB();
    const userId = req.session.user_id;
    const { dokumen_id, catatan } = req.body;
    if (!dokumen_id) return h.error(res, 'dokumen_id wajib');

    const doc = db.prepare('SELECT * FROM ik_documents WHERE id=?').get(dokumen_id);
    if (!doc) return h.notFound(res);
    if (!['Review', 'Approved-T1', 'Approved-T2'].includes(doc.status)) return h.error(res, 'Dokumen tidak dalam tahap review');

    db.prepare("UPDATE ik_documents SET status='Draft', updated_at=datetime('now','localtime') WHERE id=?").run(dokumen_id);
    addApproval(db, dokumen_id, userId, 'Return-Revisi', catatan);
    h.logAudit(req, 'RETURN_REVISI', `Dokumen ${doc.nomor_dokumen} dikembalikan untuk revisi`, 'workflow');
    h.notify(doc.owner_id, 'Dokumen Perlu Revisi', `${doc.judul} dikembalikan untuk revisi${catatan ? ': ' + catatan : ''}`);
    h.success(res, { status: 'Draft' }, 'Dokumen dikembalikan untuk revisi');
  } catch (err) { h.error(res, err.message); }
});

// POST /archive — Published → Archived
router.post('/archive', h.requireAuth, (req, res) => {
  try {
    const db = getDB();
    const userId = req.session.user_id;
    const { dokumen_id, catatan } = req.body;
    if (!dokumen_id) return h.error(res, 'dokumen_id wajib');

    const doc = db.prepare('SELECT * FROM ik_documents WHERE id=?').get(dokumen_id);
    if (!doc) return h.notFound(res);
    if (doc.status !== 'Published') return h.error(res, 'Hanya dokumen Published yang bisa diarsipkan');

    db.prepare("UPDATE ik_documents SET status='Archived', archived_reason=?, archived_at=datetime('now','localtime'), updated_at=datetime('now','localtime') WHERE id=?")
      .run(catatan || 'Diarsipkan', dokumen_id);
    addApproval(db, dokumen_id, userId, 'Archive', catatan);
    h.logAudit(req, 'ARCHIVE_DOCUMENT', `Dokumen ${doc.nomor_dokumen} diarsipkan`, 'workflow');
    h.success(res, { status: 'Archived' }, 'Dokumen berhasil diarsipkan');
  } catch (err) { h.error(res, err.message); }
});

// POST /withdraw — Tarik dokumen (Published/Archived → Archived, ditandai DITARIK)
router.post('/withdraw', h.requireRole('Admin', 'Super Admin'), (req, res) => {
  try {
    const db = getDB();
    const userId = req.session.user_id;
    const { dokumen_id, catatan } = req.body;
    if (!dokumen_id) return h.error(res, 'dokumen_id wajib');

    const doc = db.prepare('SELECT * FROM ik_documents WHERE id=?').get(dokumen_id);
    if (!doc) return h.notFound(res);
    if (!['Published', 'Archived'].includes(doc.status)) return h.error(res, 'Hanya dokumen Published/Archived yang bisa ditarik');

    const reason = catatan ? `Ditarik: ${catatan}` : 'Ditarik';
    db.prepare("UPDATE ik_documents SET status='Archived', archived_reason=?, archived_at=datetime('now','localtime'), updated_at=datetime('now','localtime') WHERE id=?")
      .run(reason, dokumen_id);
    addApproval(db, dokumen_id, userId, 'Withdraw', catatan);
    h.logAudit(req, 'WITHDRAW_DOCUMENT', `Dokumen ${doc.nomor_dokumen} ditarik (obsolete)`, 'workflow');
    h.success(res, { status: 'Archived' }, 'Dokumen ditarik (DITARIK)');
  } catch (err) { h.error(res, err.message); }
});

// POST /upload-drive — unggah ulang DOCX dokumen ke Google Drive secara manual
// (mis. untuk dokumen yang sudah Published sebelum fitur ini aktif).
router.post('/upload-drive', h.requireAuth, async (req, res) => {
  try {
    const { dokumen_id } = req.body;
    if (!dokumen_id) return h.error(res, 'dokumen_id wajib');
    const gdrive = require('../gdrive');
    if (!gdrive.isConfigured()) return h.error(res, 'Google Drive belum dikonfigurasi (kredensial / Folder ID)');
    const docxExport = require('./docx-export');
    const result = await docxExport.generateDocxBuffer(dokumen_id);
    if (!result) return h.notFound(res);
    const { buffer, doc, filename } = result;
    const up = await gdrive.uploadDocx({
      buffer, filename,
      unitName: (doc.unit_nama || '').replace(/\s+/g, '_'),
      nomor: doc.nomor_dokumen,
    });
    getDB().prepare("UPDATE ik_documents SET gdrive_url=?, gdrive_file_id=? WHERE id=?")
      .run(up.link, up.id, dokumen_id);
    h.logAudit(req, 'UPLOAD_DRIVE', `Dokumen ${doc.nomor_dokumen} diunggah ke Google Drive`, 'workflow');
    h.success(res, { gdrive_url: up.link }, 'Berhasil diupload ke Google Drive');
  } catch (e) {
    h.error(res, 'Gagal upload ke Drive: ' + e.message);
  }
});

module.exports = router;
