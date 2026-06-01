// Upload/File API
const router = require('express').Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { getDB } = require('../db');
const h = require('../helpers');

// Configure multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads');
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.random().toString(36).slice(2,8)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowed = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.png', '.jpg', '.jpeg', '.gif'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error('Tipe file tidak diizinkan'));
  }
});

// Upload file
router.post('/', h.requireAuth, upload.single('file'), (req, res) => {
  if (!req.file) return h.error(res, 'File tidak ditemukan');
  const db = getDB();
  const { dokumen_id, kategori } = req.body;
  const r = db.prepare(`INSERT INTO file_uploads (dokumen_id, nama_file, nama_asli, ukuran, tipe, kategori, uploaded_by)
    VALUES (?,?,?,?,?,?,?)`)
    .run(dokumen_id || null, req.file.filename, req.file.originalname, req.file.size,
      req.file.mimetype, kategori || 'lampiran', req.session.user_id);
  h.created(res, {
    id: r.lastInsertRowid,
    filename: req.file.filename,
    original: req.file.originalname,
    size: req.file.size,
    url: `/uploads/${req.file.filename}`
  });
});

// Upload multiple files
router.post('/multiple', h.requireAuth, upload.array('files', 10), (req, res) => {
  if (!req.files || !req.files.length) return h.error(res, 'File tidak ditemukan');
  const db = getDB();
  const { dokumen_id, kategori } = req.body;
  const results = [];
  const stmt = db.prepare(`INSERT INTO file_uploads (dokumen_id, nama_file, nama_asli, ukuran, tipe, kategori, uploaded_by)
    VALUES (?,?,?,?,?,?,?)`);
  for (const file of req.files) {
    const r = stmt.run(dokumen_id || null, file.filename, file.originalname, file.size,
      file.mimetype, kategori || 'lampiran', req.session.user_id);
    results.push({ id: r.lastInsertRowid, filename: file.filename, original: file.originalname, size: file.size });
  }
  h.created(res, results);
});

// List files for a document
router.get('/dokumen/:dokumen_id', h.requireAuth, (req, res) => {
  const files = getDB().prepare("SELECT * FROM file_uploads WHERE dokumen_id=? ORDER BY created_at DESC").all(req.params.dokumen_id);
  h.success(res, files);
});

// Delete file
router.delete('/:id', h.requireAuth, (req, res) => {
  const db = getDB();
  const file = db.prepare("SELECT * FROM file_uploads WHERE id=?").get(req.params.id);
  if (!file) return h.notFound(res);
  // Only uploader or Admin can delete
  if (file.uploaded_by !== req.session.user_id && !['Admin', 'Super Admin'].includes(req.session.user_role)) {
    return h.forbidden(res);
  }
  // Remove physical file
  const filePath = path.join(__dirname, '../../uploads', file.nama_file);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  db.prepare("DELETE FROM file_uploads WHERE id=?").run(req.params.id);
  h.success(res, null, 'File berhasil dihapus');
});

// Error handling for multer
router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') return h.error(res, 'Ukuran file melebihi batas (max 10MB)', 413);
    return h.error(res, err.message);
  }
  if (err) return h.error(res, err.message);
  next();
});

module.exports = router;
