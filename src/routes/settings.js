// Settings API
const router = require('express').Router();
const path = require('path');
const fs = require('fs');
const { getDB, _reset } = require('../db');
const h = require('../helpers');

// Helper: get all settings as flat key-value object
function getSettingsFlat() {
  const db = getDB();
  const rows = db.prepare("SELECT key, value FROM settings").all();
  const obj = {};
  for (const r of rows) {
    try { obj[r.key] = JSON.parse(r.value); } catch { obj[r.key] = r.value; }
  }
  return obj;
}

// GET /api/settings — return flat key-value object
router.get('/', h.requireAuth, (req, res) => {
  h.success(res, getSettingsFlat());
});

// GET /api/settings/db-stats
router.get('/db-stats', h.requireAuth, (req, res) => {
  const db = getDB();
  const documents = db.prepare("SELECT COUNT(*) as c FROM ik_documents").get().c;
  const users = db.prepare("SELECT COUNT(*) as c FROM users").get().c;
  const templates = db.prepare("SELECT COUNT(*) as c FROM templates").get().c;
  const equipment = db.prepare("SELECT COUNT(*) as c FROM equipment").get().c;
  const audit_logs = db.prepare("SELECT COUNT(*) as c FROM audit_trails").get().c;
  const dbPath = path.join(__dirname, '../../database/bdms.db');
  let db_size = '?';
  try {
    const stats = fs.statSync(dbPath);
    const kb = Math.round(stats.size / 1024);
    db_size = kb > 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${kb} KB`;
  } catch {}
  h.success(res, { documents, users, templates, equipment, audit_logs, db_size });
});

// GET /api/settings/export — export all data as JSON
router.get('/export', h.requireRole('Admin', 'Super Admin'), (req, res) => {
  const db = getDB();
  h.success(res, {
    settings: getSettingsFlat(),
    users: db.prepare("SELECT id,nama,nid,email,jabatan,unit_id,role,status FROM users").all(),
    units: db.prepare("SELECT * FROM units").all(),
    probis: db.prepare("SELECT * FROM probis").all(),
    templates: db.prepare("SELECT * FROM templates").all(),
    documents: db.prepare("SELECT * FROM ik_documents").all(),
    equipment: db.prepare("SELECT * FROM equipment").all(),
    roles: db.prepare("SELECT * FROM roles").all(),
    exported_at: new Date().toISOString()
  });
});

// POST /api/settings — save flat key-value object from frontend
router.post('/', h.requireRole('Admin', 'Super Admin'), (req, res) => {
  const db = getDB();
  const body = req.body;
  if (!body || typeof body !== 'object') return h.error(res, 'Format tidak valid');

  const upsert = db.prepare(`INSERT INTO settings (key, value, updated_at) VALUES (?, ?, datetime('now','localtime'))
    ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at`);

  let updated = 0;
  for (const [key, value] of Object.entries(body)) {
    const val = typeof value === 'object' ? JSON.stringify(value) : String(value);
    upsert.run(key, val);
    updated++;
  }
  h.logAudit(req, 'UPDATE_SETTINGS', `${updated} pengaturan diperbarui`, 'setting');
  h.success(res, getSettingsFlat(), 'Pengaturan disimpan');
});

// GET /api/settings/gdrive-status — status konfigurasi Google Drive
router.get('/gdrive-status', h.requireAuth, (req, res) => {
  try {
    const g = require('../gdrive');
    h.success(res, { hasCreds: g.hasCreds(), hasFolder: g.hasFolder(), configured: g.isConfigured() });
  } catch (e) {
    h.success(res, { hasCreds: false, hasFolder: false, configured: false, error: e.message });
  }
});

// POST /api/settings/gdrive-test — uji koneksi & akses folder Drive
router.post('/gdrive-test', h.requireRole('Admin', 'Super Admin'), async (req, res) => {
  try {
    const g = require('../gdrive');
    if (!g.hasCreds()) return h.error(res, 'Kredensial Service Account belum diatur (env GDRIVE_SA_JSON / GDRIVE_SA_KEY_FILE)');
    if (!g.hasFolder()) return h.error(res, 'Folder ID belum diisi');
    const r = await g.testConnection();
    h.success(res, r, `Koneksi OK — folder "${r.folderName}"${r.sharedDrive ? ' (Shared Drive)' : ''}`);
  } catch (e) {
    h.error(res, 'Gagal: ' + e.message);
  }
});

// POST /api/settings/reset-db — reset database
router.post('/reset-db', h.requireRole('Super Admin'), (req, res) => {
  try {
    _reset();
    const dbPath = path.join(__dirname, '../../database/bdms.db');
    if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
    // Next getDB() call will re-init
    h.success(res, null, 'Database berhasil direset');
  } catch (e) {
    h.error(res, 'Gagal reset database: ' + e.message);
  }
});

// PUT /api/settings/:key — update single setting
router.put('/:key', h.requireRole('Admin', 'Super Admin'), (req, res) => {
  const { nilai } = req.body;
  if (nilai === undefined) return h.error(res, 'Nilai wajib');
  getDB().prepare(`INSERT INTO settings (key, value, updated_at) VALUES (?, ?, datetime('now','localtime'))
    ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at`)
    .run(req.params.key, typeof nilai === 'object' ? JSON.stringify(nilai) : String(nilai));
  h.success(res, null, 'Pengaturan berhasil disimpan');
});

module.exports = router;
