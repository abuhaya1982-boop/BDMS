// QR Code API
const router = require('express').Router();
const { getDB } = require('../db');
const h = require('../helpers');

// List QR codes
router.get('/', h.requireAuth, (req, res) => {
  const db = getDB();
  const { dokumen_id } = req.query;
  let sql = `SELECT q.*, d.judul as doc_judul, d.nomor_dokumen
    FROM qr_codes q LEFT JOIN ik_documents d ON q.dokumen_id=d.id`;
  if (dokumen_id) {
    sql += ' WHERE q.dokumen_id=?';
    h.success(res, db.prepare(sql + ' ORDER BY q.created_at DESC').all(dokumen_id));
  } else {
    h.success(res, db.prepare(sql + ' ORDER BY q.created_at DESC LIMIT 100').all());
  }
});

// Generate QR code for document
router.post('/generate', h.requireRole('Admin', 'Super Admin', 'Manager', 'Asman'), (req, res) => {
  const { dokumen_id } = req.body;
  if (!dokumen_id) return h.error(res, 'dokumen_id wajib');
  const db = getDB();
  const doc = db.prepare("SELECT * FROM ik_documents WHERE id=?").get(dokumen_id);
  if (!doc) return h.notFound(res, 'Dokumen tidak ditemukan');

  const qrToken = h.generateToken(16);
  const qrData = JSON.stringify({
    token: qrToken,
    doc_id: dokumen_id,
    nomor: doc.nomor_dokumen,
    judul: doc.judul
  });

  const r = db.prepare("INSERT INTO qr_codes (dokumen_id, qr_token, qr_data, created_by) VALUES (?,?,?,?)")
    .run(dokumen_id, qrToken, qrData, req.session.user_id);

  h.logAudit(req, 'GENERATE_QR', `QR Code dibuat untuk dokumen ${doc.nomor_dokumen}`, 'qrcode');
  h.created(res, { id: r.lastInsertRowid, qr_token: qrToken, qr_data: qrData });
});

// Verify/scan QR code (public endpoint)
router.get('/verify/:token', (req, res) => {
  const db = getDB();
  const qr = db.prepare(`SELECT q.*, d.judul, d.nomor_dokumen, d.status, d.revisi, d.tanggal_berlaku
    FROM qr_codes q LEFT JOIN ik_documents d ON q.dokumen_id=d.id
    WHERE q.qr_token=? AND q.is_active=1`).get(req.params.token);
  if (!qr) return h.notFound(res, 'QR Code tidak valid');

  // Log scan
  db.prepare("INSERT INTO qr_scan_logs (qr_id, ip_address, user_agent) VALUES (?,?,?)")
    .run(qr.id, h.getClientIP(req), req.get('user-agent'));
  db.prepare("UPDATE qr_codes SET scan_count=scan_count+1, last_scanned_at=datetime('now','localtime') WHERE id=?").run(qr.id);

  h.success(res, {
    valid: true,
    nomor_dokumen: qr.nomor_dokumen,
    judul: qr.judul,
    status: qr.status,
    revisi: qr.revisi,
    tanggal_berlaku: qr.tanggal_berlaku
  });
});

// Deactivate QR code
router.put('/:id/deactivate', h.requireRole('Admin', 'Super Admin'), (req, res) => {
  getDB().prepare("UPDATE qr_codes SET is_active=0 WHERE id=?").run(req.params.id);
  h.success(res, null, 'QR Code dinonaktifkan');
});

// Scan logs
router.get('/:id/logs', h.requireAuth, (req, res) => {
  const logs = getDB().prepare("SELECT * FROM qr_scan_logs WHERE qr_id=? ORDER BY scanned_at DESC LIMIT 50").all(req.params.id);
  h.success(res, logs);
});

module.exports = router;
