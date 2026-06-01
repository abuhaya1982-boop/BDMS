// Brantas DMS — SQLite Database (better-sqlite3)
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, '..', 'database', 'bdms.db');
let _db = null;

function getDB() {
  if (_db) return _db;
  const needsInit = !fs.existsSync(DB_PATH);
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  _db = new Database(DB_PATH);
  _db.pragma('journal_mode = WAL');
  _db.pragma('foreign_keys = ON');

  if (needsInit) autoInit(_db);
  else migrateDB(_db);
  return _db;
}

// Add missing columns to existing databases (safe — ignores if already exist)
function migrateDB(db) {
  const safeCols = [
    ["ik_documents", "template_snapshot", "TEXT"],
    ["ik_documents", "template_versi", "TEXT"],
    ["ik_documents", "pengesahan_id", "INTEGER"],
    ["ik_documents", "ttd", "TEXT"],
    ["ik_documents", "custom_sections", "TEXT"],
    ["ik_documents", "konten", "TEXT"],
  ];
  for (const [table, col, type] of safeCols) {
    try { db.exec(`ALTER TABLE ${table} ADD COLUMN ${col} ${type}`); } catch(e) { /* already exists */ }
  }
}

function autoInit(db) {
  console.log('Auto-initializing BDMS database...');

  // ═══ CREATE TABLES ═══
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT, nama TEXT NOT NULL, nid TEXT NOT NULL UNIQUE,
      email TEXT NOT NULL UNIQUE, password TEXT, jabatan TEXT, unit_id INTEGER,
      role TEXT NOT NULL DEFAULT 'Viewer' CHECK(role IN ('Super Admin','Admin','Senior Manager','Manager','Asman','Approver','Document Owner','Viewer')),
      status TEXT NOT NULL DEFAULT 'Aktif' CHECK(status IN ('Aktif','Nonaktif')),
      auth_provider TEXT NOT NULL DEFAULT 'local', external_id TEXT UNIQUE,
      last_login TEXT, last_login_ip TEXT, password_change_required INTEGER NOT NULL DEFAULT 0,
      must_set_password INTEGER NOT NULL DEFAULT 0, failed_login_attempts INTEGER NOT NULL DEFAULT 0, locked_until TEXT,
      created_at TEXT DEFAULT (datetime('now','localtime')), updated_at TEXT DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS units (
      id INTEGER PRIMARY KEY AUTOINCREMENT, kode TEXT NOT NULL UNIQUE, nama TEXT NOT NULL,
      tipe TEXT NOT NULL CHECK(tipe IN ('Unit PLTA','Bidang Fungsional')),
      kode_dokumen TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'Aktif', created_at TEXT DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS probis (
      id INTEGER PRIMARY KEY AUTOINCREMENT, nomor TEXT NOT NULL UNIQUE, nama TEXT NOT NULL,
      kategori TEXT NOT NULL CHECK(kategori IN ('Inti','Pendukung','Sub-Probis')),
      status TEXT NOT NULL DEFAULT 'Aktif', created_at TEXT DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS templates (
      id INTEGER PRIMARY KEY AUTOINCREMENT, nama TEXT NOT NULL, versi TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'Legacy' CHECK(status IN ('Aktif','Legacy','Archived')),
      deskripsi TEXT, konten TEXT, tanggal_berlaku TEXT,
      created_at TEXT DEFAULT (datetime('now','localtime')), updated_at TEXT DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS ik_documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT, nomor_dokumen TEXT NOT NULL UNIQUE, judul TEXT NOT NULL,
      unit_id INTEGER, probis_id INTEGER, revisi TEXT NOT NULL DEFAULT '00',
      status TEXT NOT NULL DEFAULT 'Draft' CHECK(status IN ('Draft','Review','Approved-T1','Approved-T2','Published','Archived','Rejected')),
      tingkat_risiko TEXT DEFAULT 'Rendah', owner_id INTEGER, template_id INTEGER,
      template_snapshot TEXT, template_versi TEXT,
      tanggal_ditetapkan TEXT, tanggal_terbit TEXT, review_due TEXT, cloud_path TEXT,
      penyusun_nama TEXT, penyusun_jabatan TEXT, tanggal_diperbarui TEXT,
      reviewer_id INTEGER, approver_id INTEGER, pengesahan_id INTEGER, submitted_by INTEGER,
      ttd TEXT, custom_sections TEXT, konten TEXT,
      created_at TEXT DEFAULT (datetime('now','localtime')), updated_at TEXT DEFAULT (datetime('now','localtime')),
      FOREIGN KEY (unit_id) REFERENCES units(id), FOREIGN KEY (probis_id) REFERENCES probis(id),
      FOREIGN KEY (owner_id) REFERENCES users(id), FOREIGN KEY (template_id) REFERENCES templates(id)
    );

    CREATE TABLE IF NOT EXISTS ik_steps (
      id INTEGER PRIMARY KEY AUTOINCREMENT, dokumen_id INTEGER NOT NULL, step INTEGER NOT NULL,
      tujuan TEXT, ruang_lingkup TEXT, aktivitas_persiapan TEXT, aktivitas_pelaksanaan TEXT,
      aktivitas_monitoring TEXT, aktivitas_tindak_lanjut TEXT, metode_pengukuran TEXT,
      data_teknik TEXT, change_history TEXT,
      created_at TEXT DEFAULT (datetime('now','localtime')), updated_at TEXT DEFAULT (datetime('now','localtime')),
      FOREIGN KEY (dokumen_id) REFERENCES ik_documents(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS ik_definisi (
      id INTEGER PRIMARY KEY AUTOINCREMENT, dokumen_id INTEGER NOT NULL, istilah TEXT NOT NULL, penjelasan TEXT,
      FOREIGN KEY (dokumen_id) REFERENCES ik_documents(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS ik_dokumen_terkait (
      id INTEGER PRIMARY KEY AUTOINCREMENT, dokumen_id INTEGER NOT NULL,
      tipe TEXT NOT NULL CHECK(tipe IN ('Pendukung','Referensi','Perizinan','Teknis')), konten TEXT,
      FOREIGN KEY (dokumen_id) REFERENCES ik_documents(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS ik_sdm (
      id INTEGER PRIMARY KEY AUTOINCREMENT, dokumen_id INTEGER NOT NULL, kompetensi TEXT, jumlah INTEGER, keterangan TEXT,
      FOREIGN KEY (dokumen_id) REFERENCES ik_documents(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS ik_tools (
      id INTEGER PRIMARY KEY AUTOINCREMENT, dokumen_id INTEGER NOT NULL, nama TEXT, jumlah TEXT, keterangan TEXT,
      FOREIGN KEY (dokumen_id) REFERENCES ik_documents(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS ik_material (
      id INTEGER PRIMARY KEY AUTOINCREMENT, dokumen_id INTEGER NOT NULL, nama TEXT, jumlah TEXT, keterangan TEXT,
      FOREIGN KEY (dokumen_id) REFERENCES ik_documents(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS ik_formulir (
      id INTEGER PRIMARY KEY AUTOINCREMENT, dokumen_id INTEGER NOT NULL, nomor_form TEXT, judul_form TEXT,
      FOREIGN KEY (dokumen_id) REFERENCES ik_documents(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS ik_risiko (
      id INTEGER PRIMARY KEY AUTOINCREMENT, dokumen_id INTEGER NOT NULL, risiko TEXT NOT NULL, penyebab TEXT, dampak TEXT,
      kemungkinan TEXT DEFAULT 'C-Bisa Terjadi', dampak_level TEXT DEFAULT '2-Rendah',
      level_inheren TEXT, kontrol_existing TEXT, level_residual TEXT, mitigasi TEXT,
      FOREIGN KEY (dokumen_id) REFERENCES ik_documents(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS ik_approvals (
      id INTEGER PRIMARY KEY AUTOINCREMENT, dokumen_id INTEGER NOT NULL,
      tahap TEXT NOT NULL, user_id INTEGER, catatan TEXT, ttd_digital TEXT,
      created_at TEXT DEFAULT (datetime('now','localtime')),
      FOREIGN KEY (dokumen_id) REFERENCES ik_documents(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
    CREATE TABLE IF NOT EXISTS equipment (
      id INTEGER PRIMARY KEY AUTOINCREMENT, kode TEXT NOT NULL UNIQUE, nama TEXT NOT NULL, lokasi TEXT, unit_id INTEGER,
      sistem TEXT, status TEXT NOT NULL DEFAULT 'Operasi', icon TEXT DEFAULT '???',
      created_at TEXT DEFAULT (datetime('now','localtime')), updated_at TEXT DEFAULT (datetime('now','localtime')),
      FOREIGN KEY (unit_id) REFERENCES units(id)
    );
    CREATE TABLE IF NOT EXISTS ik_equipment (
      ik_id INTEGER NOT NULL, equipment_id INTEGER NOT NULL, PRIMARY KEY (ik_id, equipment_id),
      FOREIGN KEY (ik_id) REFERENCES ik_documents(id) ON DELETE CASCADE,
      FOREIGN KEY (equipment_id) REFERENCES equipment(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS qr_codes (
      id INTEGER PRIMARY KEY AUTOINCREMENT, dokumen_id INTEGER NOT NULL, kode_qr TEXT NOT NULL UNIQUE, file_path TEXT,
      scan_count INTEGER DEFAULT 0, last_scan TEXT, created_at TEXT DEFAULT (datetime('now','localtime')),
      FOREIGN KEY (dokumen_id) REFERENCES ik_documents(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS qr_scan_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT, qr_id INTEGER NOT NULL, lokasi TEXT,
      scanned_at TEXT DEFAULT (datetime('now','localtime')),
      FOREIGN KEY (qr_id) REFERENCES qr_codes(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, aksi TEXT NOT NULL, detail TEXT,
      tipe TEXT NOT NULL DEFAULT 'system', created_at TEXT DEFAULT (datetime('now','localtime')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
    CREATE TABLE IF NOT EXISTS audit_trails (
      id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, aksi TEXT NOT NULL, tipe TEXT NOT NULL DEFAULT 'system',
      resource_type TEXT, resource_id INTEGER, detail TEXT, data_before TEXT, data_after TEXT,
      ip_address TEXT, user_agent TEXT, success INTEGER NOT NULL DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now','localtime')), FOREIGN KEY (user_id) REFERENCES users(id)
    );
    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, judul TEXT NOT NULL, deskripsi TEXT,
      icon TEXT DEFAULT '???', warna_bg TEXT DEFAULT '#E6F0FF', is_read INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now','localtime')), FOREIGN KEY (user_id) REFERENCES users(id)
    );
    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT, key TEXT NOT NULL UNIQUE, value TEXT,
      updated_at TEXT DEFAULT (datetime('now','localtime'))
    );
    CREATE TABLE IF NOT EXISTS doc_number_sequences (
      id INTEGER PRIMARY KEY AUTOINCREMENT, unit_id INTEGER NOT NULL, probis_id INTEGER NOT NULL,
      last_sequence INTEGER NOT NULL DEFAULT 0, UNIQUE (unit_id, probis_id)
    );
    CREATE TABLE IF NOT EXISTS file_uploads (
      id INTEGER PRIMARY KEY AUTOINCREMENT, dokumen_id INTEGER, original_name TEXT NOT NULL, file_path TEXT NOT NULL,
      file_type TEXT, file_size INTEGER, uploaded_at TEXT DEFAULT (datetime('now','localtime')),
      FOREIGN KEY (dokumen_id) REFERENCES ik_documents(id) ON DELETE SET NULL
    );
    CREATE TABLE IF NOT EXISTS permissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT, kode TEXT NOT NULL UNIQUE, nama TEXT NOT NULL,
      grup TEXT NOT NULL DEFAULT 'general', deskripsi TEXT, created_at TEXT DEFAULT (datetime('now','localtime'))
    );
    CREATE TABLE IF NOT EXISTS roles (
      id INTEGER PRIMARY KEY AUTOINCREMENT, nama TEXT NOT NULL UNIQUE, deskripsi TEXT,
      is_system INTEGER NOT NULL DEFAULT 0, priority INTEGER NOT NULL DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now','localtime')), updated_at TEXT DEFAULT (datetime('now','localtime'))
    );
    CREATE TABLE IF NOT EXISTS role_permissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT, role_id INTEGER NOT NULL, permission_id INTEGER NOT NULL,
      UNIQUE(role_id, permission_id),
      FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
      FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS user_roles (
      id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, role_id INTEGER NOT NULL,
      unit_scope_id INTEGER, is_primary INTEGER NOT NULL DEFAULT 0, UNIQUE(user_id, role_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS user_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, session_id TEXT NOT NULL UNIQUE,
      ip_address TEXT, user_agent TEXT, device_name TEXT, is_active INTEGER NOT NULL DEFAULT 1,
      login_at TEXT DEFAULT (datetime('now','localtime')), last_active_at TEXT DEFAULT (datetime('now','localtime')), expires_at TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS invitation_tokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT, token TEXT NOT NULL UNIQUE, email TEXT NOT NULL, nama TEXT NOT NULL,
      nid TEXT NOT NULL, role_id INTEGER, unit_id INTEGER, jabatan TEXT, invited_by INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending', expires_at TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now','localtime')), accepted_at TEXT,
      FOREIGN KEY (invited_by) REFERENCES users(id)
    );
    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, token TEXT NOT NULL UNIQUE,
      type TEXT NOT NULL, expires_at TEXT NOT NULL, is_used INTEGER NOT NULL DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now','localtime')), used_at TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  // ═══ INDEXES ═══
  const indexes = [
    'CREATE INDEX IF NOT EXISTS idx_dokumen_status ON ik_documents(status)',
    'CREATE INDEX IF NOT EXISTS idx_dokumen_unit ON ik_documents(unit_id)',
    'CREATE INDEX IF NOT EXISTS idx_notif_user ON notifications(user_id)',
    'CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_trails(user_id)',
    'CREATE INDEX IF NOT EXISTS idx_user_roles_user ON user_roles(user_id)',
    'CREATE INDEX IF NOT EXISTS idx_role_perms_role ON role_permissions(role_id)',
    'CREATE INDEX IF NOT EXISTS idx_user_sessions_user ON user_sessions(user_id)',
  ];
  for (const idx of indexes) { try { db.exec(idx); } catch(e) {} }

  // ═══ SEED DATA ═══
  const pwHash = bcrypt.hashSync('admin123', 10);

  db.exec(`
    INSERT OR IGNORE INTO users (id, nama, nid, email, password, jabatan, role, status, auth_provider, password_change_required) VALUES
      (1, 'Super Administrator', 'SUPERADMIN', 'superadmin@plnnp.co.id', '${pwHash}', 'System Administrator', 'Super Admin', 'Aktif', 'local', 0),
      (2, 'Administrator', 'ADMIN', 'admin@plnnp.co.id', '${pwHash}', 'Administrator', 'Admin', 'Aktif', 'local', 0);

    INSERT OR IGNORE INTO units (id, kode, nama, tipe, kode_dokumen) VALUES
      (1,'321','SENGGURUH','Unit PLTA','IKBR-321'),(2,'322','SUTAMI','Unit PLTA','IKBR-322'),
      (3,'323','WLINGI','Unit PLTA','IKBR-323'),(4,'324','LODOYO','Unit PLTA','IKBR-324'),
      (5,'325','SELOREJO','Unit PLTA','IKBR-325'),(6,'326','MENDALAN','Unit PLTA','IKBR-326'),
      (7,'327','SIMAN','Unit PLTA','IKBR-327'),(8,'328','TULUNG AGUNG','Unit PLTA','IKBR-328'),
      (9,'329','GIRINGAN','Unit PLTA','IKBR-329'),(10,'330','GOLANG','Unit PLTA','IKBR-330'),
      (11,'331','NGEBEL','Unit PLTA','IKBR-331'),(12,'332','WONOREJO','Unit PLTA','IKBR-332'),
      (13,'333','AMPEL GADING','Unit PLTA','IKBR-333'),
      (14,'103','Bid. Operasi & Pemeliharaan','Bidang Fungsional','IKBR-103'),
      (15,'102','Bid. Enjiniring & QA','Bidang Fungsional','IKBR-102'),
      (16,'112','Bid. Keuangan & Administrasi','Bidang Fungsional','IKBR-112');

    INSERT OR IGNORE INTO probis (id, nomor, nama, kategori) VALUES
      (1,'1.0','Menyusun Visi dan Strategi','Inti'),(2,'2.0','Mengembangkan serta Mengelola Produk dan Jasa','Inti'),
      (3,'3.0','Memasarkan serta Menjual Produk dan Jasa','Inti'),(4,'4.0','Menyediakan Produk','Inti'),
      (5,'5.0','Menyediakan Jasa','Inti'),(6,'6.0','Mengelola Layanan Pelanggan','Inti'),
      (7,'7.0','Mengembangkan dan Mengelola Human Capital','Pendukung'),
      (8,'8.0','Mengelola Teknologi Informasi','Pendukung'),
      (9,'9.0','Mengelola Sumber Daya Keuangan','Pendukung'),
      (10,'10.0','Mengakuisisi, Membangun, dan Mengelola Aset','Pendukung'),
      (11,'10.1.3.c.b','Pengelolaan Mess','Sub-Probis'),
      (12,'11.0','Mengelola Risiko, Kepatuhan, dan Kelangsungan Bisnis','Pendukung'),
      (13,'12.0','Mengelola Hubungan Eksternal','Pendukung'),
      (14,'13.0','Mengembangkan dan Mengelola Kapabilitas Bisnis','Pendukung'),
      (15,'14.0','Mengoperasikan Aset Pembangkit','Pendukung');

    INSERT OR IGNORE INTO settings (key, value) VALUES
      ('instansi','PT PLN Nusantara Power UP Brantas'),('review_period','12'),('notif_days','30');
  `);

  // Templates
  const defaultSections = JSON.stringify([
    {id:'change_history',label:'Riwayat Perubahan',required:false,type:'table',columns:['Bagian','Uraian Perubahan','Revisi','Tanggal'],enabled:true},
    {id:'tujuan',label:'Tujuan',required:true,type:'richtext',enabled:true},
    {id:'ruang_lingkup',label:'Ruang Lingkup',required:true,type:'richtext',enabled:true},
    {id:'definisi',label:'Definisi & Singkatan',required:false,type:'table',columns:['Istilah','Penjelasan'],enabled:true},
    {id:'dokumen_terkait',label:'Dokumen Terkait',required:false,type:'special',enabled:true},
    {id:'sdm',label:'Sumber Daya Manusia',required:true,type:'table',columns:['Kompetensi','Jumlah','Keterangan'],enabled:true},
    {id:'tools',label:'Alat & Perlengkapan',required:true,type:'table',columns:['Nama','Jumlah','Keterangan'],enabled:true},
    {id:'material',label:'Material & Suku Cadang',required:false,type:'table',columns:['Nama','Jumlah','Keterangan'],enabled:true},
    {id:'aktivitas_persiapan',label:'Aktivitas Persiapan',required:true,type:'richtext',enabled:true},
    {id:'aktivitas_pelaksanaan',label:'Aktivitas Pelaksanaan',required:true,type:'richtext',enabled:true},
    {id:'aktivitas_monitoring',label:'Aktivitas Monitoring',required:false,type:'richtext',enabled:true},
    {id:'aktivitas_tindak_lanjut',label:'Aktivitas Tindakan Akhir',required:false,type:'richtext',enabled:true},
    {id:'identifikasi_risiko',label:'Identifikasi Risiko',required:true,type:'risk_matrix',enabled:true},
    {id:'metode_pengukuran',label:'Metode Pengukuran',required:false,type:'table',columns:['Metode','Parameter','Keterangan'],enabled:true},
    {id:'formulir',label:'Formulir Terkait',required:false,type:'richtext',enabled:true},
    {id:'data_teknik',label:'Data Teknik Equipment',required:false,type:'richtext',enabled:true},
  ]);
  const stmtTpl = db.prepare('INSERT OR IGNORE INTO templates (id,nama,versi,status,deskripsi,konten,tanggal_berlaku) VALUES (?,?,?,?,?,?,?)');
  stmtTpl.run(1,'IK Template v2025.1','v2025.1','Aktif','Template standar IMS terbaru.',defaultSections,'2025-01-01');
  stmtTpl.run(2,'IK Template v2024.2','v2024.2','Legacy','Revisi kedua tahun 2024.',defaultSections,'2024-07-01');
  stmtTpl.run(3,'IK Template v2024.1','v2024.1','Archived','Template awal tahun 2024.',null,'2024-01-01');

  // Permissions
  db.exec(`
    INSERT OR IGNORE INTO permissions (kode,nama,grup,deskripsi) VALUES
      ('user:view','Lihat Pengguna','user','Melihat daftar pengguna'),
      ('user:create','Tambah Pengguna','user','Menambahkan pengguna baru'),
      ('user:edit','Edit Pengguna','user','Mengedit data pengguna'),
      ('user:delete','Hapus Pengguna','user','Menghapus pengguna'),
      ('user:suspend','Nonaktifkan Pengguna','user','Mengubah status pengguna'),
      ('user:invite','Undang Pengguna','user','Mengirim undangan via email'),
      ('user:force-logout','Force Logout','user','Memutus sesi pengguna lain'),
      ('user:reset-password','Reset Password','user','Mereset password pengguna'),
      ('role:view','Lihat Role','role','Melihat daftar role'),
      ('role:create','Buat Role','role','Membuat role baru'),
      ('role:edit','Edit Role','role','Mengedit role dan permissionnya'),
      ('role:delete','Hapus Role','role','Menghapus role'),
      ('doc:view','Lihat Dokumen','doc','Melihat semua dokumen IK'),
      ('doc:create','Buat Dokumen','doc','Membuat dokumen IK baru'),
      ('doc:edit','Edit Dokumen','doc','Mengedit dokumen IK'),
      ('doc:delete','Hapus Dokumen','doc','Menghapus dokumen IK'),
      ('doc:publish','Publikasikan Dokumen','doc','Mempublikasikan dokumen'),
      ('approve:submit','Submit Review','approve','Mengirim dokumen ke review'),
      ('approve:approve','Setujui Dokumen','approve','Menyetujui dokumen'),
      ('approve:reject','Tolak Dokumen','approve','Menolak dokumen'),
      ('approve:archive','Arsipkan Dokumen','approve','Mengarsipkan dokumen'),
      ('workflow:configure','Konfigurasi Workflow','workflow','Mengatur alur persetujuan'),
      ('workflow:delegate','Delegasi Wewenang','workflow','Mendelegasikan wewenang approval'),
      ('master:view','Lihat Master Data','master','Melihat unit, probis, equipment'),
      ('master:edit','Edit Master Data','master','Mengubah master data'),
      ('system:settings','Pengaturan Sistem','system','Mengubah pengaturan sistem'),
      ('system:audit','Lihat Audit Trail','system','Melihat log audit'),
      ('system:template','Kelola Template','system','Mengelola template dokumen');

    INSERT OR IGNORE INTO roles (id,nama,deskripsi,is_system,priority) VALUES
      (1,'Super Admin','Akses penuh ke seluruh sistem',1,100),
      (2,'Admin','Administrator sistem',1,80),
      (3,'Senior Manager','Pengesahan akhir dokumen IK',1,90),
      (4,'Manager','Menyetujui dokumen IK',1,75),
      (5,'Asman','Review awal dokumen',1,65),
      (6,'Approver','Menyetujui dokumen IK (legacy)',1,60),
      (7,'Document Owner','Membuat dan mengelola dokumen IK',1,40),
      (8,'Viewer','Melihat dokumen dan laporan',1,20);
  `);

  // Role-Permission mappings
  const stmtRP = db.prepare('INSERT OR IGNORE INTO role_permissions (role_id, permission_id) VALUES (?, ?)');
  const allPerms = db.prepare('SELECT id FROM permissions').all().map(r => r.id);
  for (const pid of allPerms) stmtRP.run(1, pid); // Super Admin: all

  const adminPerms = db.prepare("SELECT id FROM permissions WHERE kode NOT IN ('role:create','role:edit','role:delete','system:settings','user:delete')").all();
  for (const r of adminPerms) stmtRP.run(2, r.id);

  const rolePermMap = {
    3: ['doc:view','doc:publish','approve:approve','approve:reject','approve:archive','workflow:delegate','workflow:configure','master:view','system:audit'],
    4: ['doc:view','approve:approve','approve:reject','workflow:delegate','master:view'],
    5: ['doc:view','doc:create','doc:edit','approve:submit','approve:approve','master:view'],
    6: ['doc:view','approve:approve','approve:reject','approve:archive','doc:publish','workflow:delegate'],
    7: ['doc:view','doc:create','doc:edit','approve:submit'],
    8: ['doc:view'],
  };
  for (const [roleId, perms] of Object.entries(rolePermMap)) {
    const pIds = db.prepare(`SELECT id FROM permissions WHERE kode IN (${perms.map(()=>'?').join(',')})`).all(...perms);
    for (const p of pIds) stmtRP.run(Number(roleId), p.id);
  }

  // User-Role mappings
  db.exec(`
    INSERT OR IGNORE INTO user_roles (user_id, role_id, is_primary) VALUES (1, 1, 1), (2, 2, 1);
    INSERT OR IGNORE INTO notifications (user_id, judul, deskripsi, icon, warna_bg) VALUES
      (1, 'Sistem siap digunakan', 'Brantas DMS telah aktif.', '???', '#E3FCEF');
  `);

  console.log('Database initialized successfully');
}

function _reset() {
  if (_db) { try { _db.close(); } catch {} }
  _db = null;
}

module.exports = { getDB, _reset };
