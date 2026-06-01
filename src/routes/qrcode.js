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

  const kodeQr = 'QR-' + doc.nomor_dokumen + '-' + h.generateToken(8);

  const r = db.prepare("INSERT INTO qr_codes (dokumen_id, kode_qr) VALUES (?,?)")
    .run(dokumen_id, kodeQr);

  h.logAudit(req, 'GENERATE_QR', `QR Code dibuat untuk dokumen ${doc.nomor_dokumen}`, 'qrcode');
  h.created(res, { id: r.lastInsertRowid, kode_qr: kodeQr });
});

// Verify/scan QR code (public endpoint)
router.get('/verify/:kode', (req, res) => {
  const db = getDB();
  const qr = db.prepare(`SELECT q.*, d.judul, d.nomor_dokumen, d.status, d.revisi, d.tanggal_terbit
    FROM qr_codes q LEFT JOIN ik_documents d ON q.dokumen_id=d.id
    WHERE q.kode_qr=?`).get(req.params.kode);
  if (!qr) return h.notFound(res, 'QR Code tidak valid');

  // Log scan
  db.prepare("INSERT INTO qr_scan_logs (qr_id, lokasi) VALUES (?,?)")
    .run(qr.id, h.getClientIP(req));
  db.prepare("UPDATE qr_codes SET scan_count=scan_count+1, last_scan=datetime('now','localtime') WHERE id=?").run(qr.id);

  h.success(res, {
    valid: true,
    nomor_dokumen: qr.nomor_dokumen,
    judul: qr.judul,
    status: qr.status,
    revisi: qr.revisi,
    tanggal_terbit: qr.tanggal_terbit
  });
});

// Stats
router.get('/stats', h.requireAuth, (req, res) => {
  const db = getDB();
  const total_qr = db.prepare("SELECT COUNT(*) as c FROM qr_codes").get().c;
  const total_scans = db.prepare("SELECT SUM(scan_count) as c FROM qr_codes").get().c || 0;
  const today_scans = db.prepare("SELECT COUNT(*) as c FROM qr_scan_logs WHERE date(scanned_at)=date('now','localtime')").get().c;
  h.success(res, { total_qr, total_scans, today_scans });
});

// Scan logs for a QR
router.get('/:id/logs', h.requireAuth, (req, res) => {
  const logs = getDB().prepare("SELECT * FROM qr_scan_logs WHERE qr_id=? ORDER BY scanned_at DESC LIMIT 50").all(req.params.id);
  h.success(res, logs);
});

module.exports = router;
