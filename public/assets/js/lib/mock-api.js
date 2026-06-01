// ═══════════════════════════════════════════════════════════════
// Brantas DMS — Mock API — Simulates PHP backend using localStorage
// Enables full frontend testing without PHP server
// ═══════════════════════════════════════════════════════════════

const MockDB = {
  _store: {},

  _version: 14, // Increment to force re-seed

  init() {
    const saved = localStorage.getItem('bdms_mockdb');
    const ver = localStorage.getItem('bdms_mockdb_ver');
    if (saved && parseInt(ver) === this._version) {
      try { this._store = JSON.parse(saved); return; } catch(e) {}
    }
    this._seed();
    localStorage.setItem('bdms_mockdb_ver', this._version);
  },

  save() {
    localStorage.setItem('bdms_mockdb', JSON.stringify(this._store));
  },

  reset() {
    localStorage.removeItem('bdms_mockdb');
    this._seed();
  },

  _seed() {
    this._store = {
      users: [
        { id: 1, nama: 'Super Administrator', nid: 'superadmin', email: 'superadmin@plnnp.co.id', password: 'admin123', jabatan: 'System Administrator', role: 'Super Admin', status: 'Aktif' },
        { id: 2, nama: 'Administrator', nid: 'admin', email: 'admin@plnnp.co.id', password: 'admin123', jabatan: 'Administrator', role: 'Admin', status: 'Aktif' },
      ],
      units: [
        { id: 1, kode: '321', nama: 'SENGGURUH', tipe: 'Unit PLTA', kode_dokumen: 'IKBR-321' },
        { id: 2, kode: '322', nama: 'SUTAMI', tipe: 'Unit PLTA', kode_dokumen: 'IKBR-322' },
        { id: 3, kode: '323', nama: 'WLINGI', tipe: 'Unit PLTA', kode_dokumen: 'IKBR-323' },
        { id: 4, kode: '324', nama: 'LODOYO', tipe: 'Unit PLTA', kode_dokumen: 'IKBR-324' },
        { id: 5, kode: '325', nama: 'SELOREJO', tipe: 'Unit PLTA', kode_dokumen: 'IKBR-325' },
        { id: 6, kode: '326', nama: 'MENDALAN', tipe: 'Unit PLTA', kode_dokumen: 'IKBR-326' },
        { id: 7, kode: '327', nama: 'SIMAN', tipe: 'Unit PLTA', kode_dokumen: 'IKBR-327' },
        { id: 8, kode: '328', nama: 'TULUNG AGUNG', tipe: 'Unit PLTA', kode_dokumen: 'IKBR-328' },
        { id: 9, kode: '329', nama: 'GIRINGAN', tipe: 'Unit PLTA', kode_dokumen: 'IKBR-329' },
        { id: 10, kode: '330', nama: 'GOLANG', tipe: 'Unit PLTA', kode_dokumen: 'IKBR-330' },
        { id: 11, kode: '331', nama: 'NGEBEL', tipe: 'Unit PLTA', kode_dokumen: 'IKBR-331' },
        { id: 12, kode: '332', nama: 'WONOREJO', tipe: 'Unit PLTA', kode_dokumen: 'IKBR-332' },
        { id: 13, kode: '333', nama: 'AMPEL GADING', tipe: 'Unit PLTA', kode_dokumen: 'IKBR-333' },
        { id: 14, kode: '103', nama: 'Bid. Operasi & Pemeliharaan', tipe: 'Bidang Fungsional', kode_dokumen: 'IKBR-103' },
        { id: 15, kode: '102', nama: 'Bid. Enjiniring & QA', tipe: 'Bidang Fungsional', kode_dokumen: 'IKBR-102' },
        { id: 16, kode: '112', nama: 'Bid. Keuangan & Administrasi', tipe: 'Bidang Fungsional', kode_dokumen: 'IKBR-112' },
      ],
      probis: [
        { id: 1, nomor: '1.0', nama: 'Menyusun Visi dan Strategi', kategori: 'Inti' },
        { id: 2, nomor: '2.0', nama: 'Mengembangkan serta Mengelola Produk dan Jasa', kategori: 'Inti' },
        { id: 3, nomor: '3.0', nama: 'Memasarkan serta Menjual Produk dan Jasa', kategori: 'Inti' },
        { id: 4, nomor: '4.0', nama: 'Menyediakan Produk', kategori: 'Inti' },
        { id: 5, nomor: '5.0', nama: 'Menyediakan Jasa', kategori: 'Inti' },
        { id: 6, nomor: '6.0', nama: 'Mengelola Layanan Pelanggan', kategori: 'Inti' },
        { id: 7, nomor: '7.0', nama: 'Mengembangkan dan Mengelola Human Capital', kategori: 'Pendukung' },
        { id: 8, nomor: '8.0', nama: 'Mengelola Teknologi Informasi', kategori: 'Pendukung' },
        { id: 9, nomor: '9.0', nama: 'Mengelola Sumber Daya Keuangan', kategori: 'Pendukung' },
        { id: 10, nomor: '10.0', nama: 'Mengakuisisi, Membangun, dan Mengelola Aset', kategori: 'Pendukung' },
        { id: 11, nomor: '10.1.3.c.b', nama: 'Pengelolaan Mess', kategori: 'Sub-Probis' },
        { id: 12, nomor: '11.0', nama: 'Mengelola Risiko, Kepatuhan, dan Kelangsungan Bisnis', kategori: 'Pendukung' },
        { id: 13, nomor: '12.0', nama: 'Mengelola Hubungan Eksternal', kategori: 'Pendukung' },
        { id: 14, nomor: '13.0', nama: 'Mengembangkan dan Mengelola Kapabilitas Bisnis', kategori: 'Pendukung' },
        { id: 15, nomor: '14.0', nama: 'Mengoperasikan Aset Pembangkit', kategori: 'Pendukung' },
      ],
      templates: [
        {
          id: 1, nama: 'IK Template v2025.1', versi: 'v2025.1', status: 'Aktif',
          deskripsi: 'Template standar IMS terbaru dengan seksi Metode Pengukuran dan Formulir Terkait.',
          tanggal_berlaku: '2025-01-01',
          konten: JSON.stringify([
            { id: 'change_history', label: 'Riwayat Perubahan', type: 'special', enabled: true },
            { id: 'tujuan', label: 'Tujuan', type: 'richtext', enabled: true },
            { id: 'ruang_lingkup', label: 'Ruang Lingkup', type: 'richtext', enabled: true },
            { id: 'definisi', label: 'Definisi & Singkatan', type: 'table', columns: ['Istilah', 'Penjelasan'], enabled: true },
            { id: 'dokumen_terkait', label: 'Dokumen Terkait', type: 'special', enabled: true },
            { id: 'sdm', label: 'Sumber Daya Manusia', type: 'table', columns: ['Kompetensi', 'Jumlah', 'Keterangan'], enabled: true },
            { id: 'tools', label: 'Alat & Perlengkapan', type: 'table', columns: ['Nama', 'Jumlah', 'Keterangan'], enabled: true },
            { id: 'material', label: 'Material & Suku Cadang', type: 'table', columns: ['Nama', 'Jumlah', 'Keterangan'], enabled: true },
            { id: 'aktivitas_persiapan', label: 'Aktivitas Persiapan', type: 'richtext', enabled: true },
            { id: 'aktivitas_pelaksanaan', label: 'Aktivitas Pelaksanaan', type: 'richtext', enabled: true },
            { id: 'aktivitas_monitoring', label: 'Aktivitas Monitoring', type: 'richtext', enabled: true },
            { id: 'aktivitas_tindak_lanjut', label: 'Aktivitas Tindakan Akhir', type: 'richtext', enabled: true },
            { id: 'identifikasi_risiko', label: 'Identifikasi Risiko', type: 'risk_matrix', enabled: true },
            { id: 'metode_pengukuran', label: 'Metode Pengukuran', type: 'table', columns: ['Metode', 'Parameter', 'Keterangan'], enabled: true },
            { id: 'formulir', label: 'Formulir Terkait', type: 'richtext', enabled: true },
            { id: 'data_teknik', label: 'Data Teknik Equipment', type: 'richtext', enabled: true },
          ])
        },
        { id: 2, nama: 'IK Template v2024.2', versi: 'v2024.2', status: 'Legacy', deskripsi: 'Revisi kedua tahun 2024.', tanggal_berlaku: '2024-07-01', konten: null },
        { id: 3, nama: 'IK Template v2024.1', versi: 'v2024.1', status: 'Archived', deskripsi: 'Template awal tahun 2024.', tanggal_berlaku: '2024-01-01', konten: null },
      ],
      documents: [],
      doc_sequences: [],
      equipment: [],
      notifications: [],
      audit_logs: [],
      settings: {
        instansi: 'PT PLN Nusantara Power UP Brantas',
        kode_unit_coa: 'BR',
        nama_unit_coa: 'Brantas',
        review_period: '12',
        notif_days: '30',
        cloud_base_url: '',
        cloud_backup_urls: [],
        default_risiko: 'Sedang',
        auto_archive_months: '0',
        notif_overdue: true,
        notif_approval: true,
        notif_publish: true,
        notif_revision: true,
        watermark_draft: true,
        max_file_size_mb: '10',
      },
      permissions: [
        // Dokumen
        { id: 1,  kunci: 'doc.view',       nama: 'Lihat Dokumen',          grup: 'Dokumen' },
        { id: 2,  kunci: 'doc.create',      nama: 'Buat Dokumen',           grup: 'Dokumen' },
        { id: 3,  kunci: 'doc.edit',        nama: 'Edit Dokumen',           grup: 'Dokumen' },
        { id: 4,  kunci: 'doc.submit',      nama: 'Submit Review',          grup: 'Dokumen' },
        { id: 5,  kunci: 'doc.delete',      nama: 'Hapus Dokumen',          grup: 'Dokumen' },
        // Approval — 3-Tier Sequential
        { id: 6,  kunci: 'doc.review',      nama: 'Review Dokumen (Tier 1 — Asman)',   grup: 'Approval' },
        { id: 7,  kunci: 'doc.approve_t1',  nama: 'Approve Tier 1 (Manager)',          grup: 'Approval' },
        { id: 8,  kunci: 'doc.approve_t2',  nama: 'Approve Tier 2 / Pengesahan (SM)',  grup: 'Approval' },
        { id: 9,  kunci: 'doc.reject',      nama: 'Reject Dokumen',                    grup: 'Approval' },
        { id: 10, kunci: 'doc.return_revisi', nama: 'Kembalikan Revisi',               grup: 'Approval' },
        { id: 26, kunci: 'doc.archive',     nama: 'Arsipkan Dokumen',                  grup: 'Approval' },
        // Template
        { id: 11, kunci: 'template.view',   nama: 'Lihat Template',         grup: 'Template' },
        { id: 12, kunci: 'template.edit',   nama: 'Edit Template',          grup: 'Template' },
        { id: 13, kunci: 'template.create', nama: 'Buat Template',          grup: 'Template' },
        { id: 14, kunci: 'template.activate', nama: 'Aktifkan Template',    grup: 'Template' },
        // Equipment
        { id: 15, kunci: 'equipment.view',  nama: 'Lihat Equipment',        grup: 'Equipment' },
        { id: 16, kunci: 'equipment.manage', nama: 'Kelola Equipment',      grup: 'Equipment' },
        // Laporan
        { id: 17, kunci: 'report.view',     nama: 'Lihat Laporan',          grup: 'Laporan' },
        { id: 18, kunci: 'report.export',   nama: 'Ekspor Laporan',         grup: 'Laporan' },
        { id: 19, kunci: 'audit.view',      nama: 'Lihat Audit Trail',      grup: 'Laporan' },
        // Sistem
        { id: 20, kunci: 'user.view',       nama: 'Lihat Pengguna',         grup: 'Sistem' },
        { id: 21, kunci: 'user.manage',     nama: 'Kelola Pengguna',        grup: 'Sistem' },
        { id: 22, kunci: 'role.manage',     nama: 'Kelola Role',            grup: 'Sistem' },
        { id: 23, kunci: 'role.switch',     nama: 'Pindah Role (Impersonasi)', grup: 'Sistem' },
        { id: 24, kunci: 'settings.view',   nama: 'Lihat Pengaturan',       grup: 'Sistem' },
        { id: 25, kunci: 'settings.edit',   nama: 'Edit Pengaturan',        grup: 'Sistem' },
      ],
      roles: [
        { id: 1, nama: 'Super Admin', deskripsi: 'Akses penuh + impersonasi role', is_system: true, priority: 100, permission_ids: [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26] },
        { id: 2, nama: 'Admin', deskripsi: 'Akses penuh ke semua fitur', is_system: true, priority: 90, permission_ids: [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,24,25,26] },
        { id: 3, nama: 'Asst. Manager', deskripsi: 'Menyusun dokumen + Review Tier 1 (Asman)', is_system: true, priority: 50, approval_tier: 1, permission_ids: [1,2,3,4,6,9,10,15,17] },
        { id: 4, nama: 'Manager', deskripsi: 'Approve Tier 1 — Manager Sub-bidang', is_system: true, priority: 60, approval_tier: 2, permission_ids: [1,3,7,9,10,15,17] },
        { id: 5, nama: 'Senior Manager', deskripsi: 'Approve Tier 2 / Pengesahan — Final Approval', is_system: true, priority: 70, approval_tier: 3, permission_ids: [1,8,9,10,26,15,17] },
        { id: 6, nama: 'Document Owner', deskripsi: 'Membuat dan mengedit dokumen IK (Staf)', is_system: true, priority: 30, permission_ids: [1,2,3,4,15,17] },
        { id: 7, nama: 'Viewer', deskripsi: 'Hanya melihat dokumen yang sudah dipublish', is_system: true, priority: 10, permission_ids: [1,15,17] },
      ],
      template_history: [],
      session: null,
    };
    this.save();
  },

  // Helpers
  nextId(table) {
    const items = this._store[table] || [];
    return items.length > 0 ? Math.max(...items.map(i => i.id)) + 1 : 1;
  },

  getSequence(unitId, probisId) {
    const seq = this._store.doc_sequences.find(s => s.unit_id == unitId && s.probis_id == probisId);
    return seq ? seq.last_sequence : 0;
  },

  incrementSequence(unitId, probisId) {
    let seq = this._store.doc_sequences.find(s => s.unit_id == unitId && s.probis_id == probisId);
    if (!seq) {
      seq = { unit_id: parseInt(unitId), probis_id: parseInt(probisId), last_sequence: 0 };
      this._store.doc_sequences.push(seq);
    }
    seq.last_sequence++;
    this.save();
    return seq.last_sequence;
  },

  generateDocNumber(unitId, probisId) {
    const unit = this._store.units.find(u => u.id == unitId);
    const probis = this._store.probis.find(p => p.id == probisId);
    if (!unit || !probis) return null;
    const nextSeq = this.getSequence(unitId, probisId) + 1;
    const seqStr = String(nextSeq).padStart(3, '0');
    return `${unit.kode_dokumen}-${probis.nomor}-${seqStr}`;
  },

  /**
   * Check if the current session user has a specific permission key.
   * Super Admin always has all permissions. Returns true/false.
   */
  hasPermission(permKey) {
    const session = this._store.session;
    if (!session) return false;
    const roleName = session.role;
    const role = this._store.roles.find(r => r.nama === roleName);
    if (!role) return false;
    // Super Admin has everything
    if (role.priority >= 100) return true;
    // Find permission id by key
    const perm = this._store.permissions.find(p => p.kunci === permKey);
    if (!perm) return false;
    return (role.permission_ids || []).includes(perm.id);
  }
};

// ═══ Mock API Interceptor ═══
const MockAPI = {
  delay: 150, // simulate network delay (ms)

  async handle(method, url, body) {
    await new Promise(r => setTimeout(r, this.delay));

    const path = url.replace(/^\/api\//, '');
    const parts = path.split('?');
    const endpoint = parts[0];
    const params = new URLSearchParams(parts[1] || '');
    const segments = endpoint.split('/');

    // ── Auth ──
    if (segments[0] === 'auth') {
      return this.handleAuth(segments[1], method, body);
    }
    // ── Dokumen ──
    if (segments[0] === 'dokumen') {
      return this.handleDokumen(segments, method, body, params);
    }
    // ── Templates ──
    if (segments[0] === 'templates') {
      return this.handleTemplates(segments, method, body);
    }
    // ── Units ──
    if (segments[0] === 'units') {
      return this.handleUnits(segments, method, body);
    }
    // ── Probis ──
    if (segments[0] === 'probis') {
      return this.handleProbis(segments, method, body, params);
    }
    // ── Equipment ──
    if (segments[0] === 'equipment') {
      return this.handleEquipment(segments, method, body);
    }
    // ── Dashboard ──
    if (segments[0] === 'dashboard') {
      return this.handleDashboard();
    }
    // ── Workflow ──
    if (segments[0] === 'workflow') {
      return this.handleWorkflow(segments, method, body, params);
    }
    // ── Notifications ──
    if (segments[0] === 'notifikasi') {
      return this.handleNotifikasi(segments, method, body);
    }
    // ── Pengguna ──
    if (segments[0] === 'pengguna') {
      return this.handlePengguna(segments, method, body);
    }
    // ── Audit ──
    if (segments[0] === 'audit') {
      return this.handleAudit(params);
    }
    // ── Permissions ──
    if (segments[0] === 'permissions') {
      return this.handlePermissions();
    }
    // ── Roles ──
    if (segments[0] === 'roles') {
      return this.handleRoles(segments, method, body);
    }
    // ── Sessions ──
    if (segments[0] === 'sessions') {
      return this.handleSessions(segments, method);
    }
    // ── Settings ──
    if (segments[0] === 'settings') {
      return this.handleSettings(method, body);
    }
    // ── Laporan ──
    if (segments[0] === 'laporan') {
      return this.handleLaporan();
    }
    // ── QR ──
    if (segments[0] === 'qrcode') {
      return this.handleQR(segments);
    }

    return { success: false, message: `Mock: endpoint ${endpoint} not implemented` };
  },

  // ── Auth Handlers ──
  handleAuth(action, method, body) {
    if (action === 'login') {
      const user = MockDB._store.users.find(u =>
        u.nid.toLowerCase() === (body.nid || '').toLowerCase() &&
        (body.password === 'admin123' || body.password === u.nid.toLowerCase())
      );
      if (!user) return this.error('NID atau password salah', 401);
      MockDB._store.session = { ...user, original_role: user.role };
      MockDB.save();
      return this.ok({ ...user, original_role: user.role, password_change_required: false });
    }
    if (action === 'logout') {
      MockDB._store.session = null;
      MockDB.save();
      return this.ok(null, 'Logout berhasil');
    }
    if (action === 'me' || action === 'check') {
      if (!MockDB._store.session) return this.error('Unauthorized', 401);
      return this.ok(MockDB._store.session);
    }
    if (action === 'switch-role') {
      if (!MockDB._store.session) return this.error('Unauthorized', 401);
      // Only Super Admin can switch roles
      if (MockDB._store.session.original_role !== 'Super Admin') {
        return this.error('Hanya Super Admin yang dapat melakukan role switching', 403);
      }
      MockDB._store.session.role = body.role;
      MockDB.save();
      return this.ok({ role: body.role });
    }
    if (action === 'change-password') {
      if (body.old_password !== 'admin123') return this.error('Password lama salah');
      return this.ok(null, 'Password berhasil diganti');
    }
    if (action === 'forgot-password') {
      return this.ok({ reset_url: 'http://localhost:8080/?reset=mock-token-123' }, 'Link reset telah dikirim ke email.');
    }
    return this.ok(null);
  },

  // ── Dokumen Handlers ──
  handleDokumen(segments, method, body, params) {
    // GET /dokumen/preview-number?unit_id=X&probis_id=Y
    if (segments[1] === 'preview-number') {
      const unitId = params.get('unit_id');
      const probisId = params.get('probis_id');
      if (!unitId || !probisId) return this.error('unit_id dan probis_id wajib');
      const nomor = MockDB.generateDocNumber(unitId, probisId);
      if (!nomor) return this.error('Unit atau Probis tidak valid');
      const seq = MockDB.getSequence(unitId, probisId) + 1;
      return this.ok({ nomor_dokumen: nomor, sequence: seq });
    }

    // GET /dokumen/:id/pdf — redirect to preview (mock: return doc data for client-side rendering)
    if (segments[2] === 'pdf') {
      const doc = MockDB._store.documents.find(d => d.id == segments[1]);
      if (!doc) return this.error('Dokumen tidak ditemukan', 404);
      return this.ok(this.enrichDoc(doc), 'Gunakan previewDokumenFull() untuk render PDF');
    }

    // POST /dokumen/:id/upgrade-template
    if (segments[2] === 'upgrade-template' && method === 'POST') {
      const doc = MockDB._store.documents.find(d => d.id == segments[1]);
      if (!doc) return this.error('Dokumen tidak ditemukan', 404);
      const activeTemplate = MockDB._store.templates.find(t => t.status === 'Aktif');
      if (!activeTemplate) return this.error('Tidak ada template aktif', 404);
      if (doc.template_versi === activeTemplate.versi) return this.error('Dokumen sudah menggunakan template terbaru');
      const oldVersi = doc.template_versi;
      doc.template_snapshot = typeof activeTemplate.konten === 'string' ? activeTemplate.konten : JSON.stringify(activeTemplate.konten);
      doc.template_versi = activeTemplate.versi;
      doc.template_id = activeTemplate.id;
      MockDB.save();
      return this.ok({ old_versi: oldVersi, new_versi: activeTemplate.versi }, 'Template berhasil di-upgrade ke ' + activeTemplate.versi);
    }

    // GET /dokumen/recent
    if (segments[1] === 'recent') {
      const recent = [...MockDB._store.documents].sort((a, b) => b.id - a.id).slice(0, 5);
      return this.ok(this.enrichDocs(recent));
    }

    // GET /dokumen/:id
    if (segments[1] && /^\d+$/.test(segments[1])) {
      const doc = MockDB._store.documents.find(d => d.id == segments[1]);
      if (!doc) return this.error('Dokumen tidak ditemukan', 404);
      return this.ok(this.enrichDoc(doc));
    }

    // GET /dokumen (list)
    if (method === 'GET') {
      let docs = [...MockDB._store.documents];
      const search = params.get('search');
      if (search) {
        const q = search.toLowerCase();
        docs = docs.filter(d => d.judul.toLowerCase().includes(q) || d.nomor_dokumen.toLowerCase().includes(q));
      }
      const status = params.get('status');
      if (status) docs = docs.filter(d => d.status === status);

      const total = docs.length;
      const limit = parseInt(params.get('limit')) || 20;
      const page = parseInt(params.get('page')) || 1;
      docs = docs.slice((page - 1) * limit, page * limit);

      return this.ok({ items: this.enrichDocs(docs), total, page, limit, total_pages: Math.ceil(total / limit) });
    }

    // POST /dokumen (create)
    if (method === 'POST') {
      if (!MockDB.hasPermission('doc.create')) return this.error('Anda tidak memiliki izin untuk membuat dokumen', 403);
      const unitId = body.unit_id;
      const probisId = body.probis_id;
      if (!unitId || !probisId) return this.error('unit_id dan probis_id wajib');

      const seq = MockDB.incrementSequence(unitId, probisId);
      const unit = MockDB._store.units.find(u => u.id == unitId);
      const probis = MockDB._store.probis.find(p => p.id == probisId);
      const seqStr = String(seq).padStart(3, '0');
      const nomor = `${unit.kode_dokumen}-${probis.nomor}-${seqStr}`;

      // Capture template snapshot at creation time
      const templateId = body.template_id || 1;
      const activeTemplate = MockDB._store.templates.find(t => t.id == templateId);
      const templateSnapshot = body.template_snapshot || (activeTemplate ? (typeof activeTemplate.konten === 'string' ? activeTemplate.konten : JSON.stringify(activeTemplate.konten)) : null);
      const templateVersi = body.template_versi || (activeTemplate ? activeTemplate.versi : null);

      const newDoc = {
        id: MockDB.nextId('documents'),
        nomor_dokumen: nomor,
        judul: body.judul || 'Untitled',
        unit_id: parseInt(unitId),
        probis_id: parseInt(probisId),
        revisi: body.revisi || '00',
        status: body.status || 'Draft',
        tingkat_risiko: body.tingkat_risiko || 'Sedang',
        owner_id: MockDB._store.session?.id || 1,
        template_id: templateId,
        template_snapshot: templateSnapshot,
        template_versi: templateVersi,
        tanggal_ditetapkan: body.tanggal_ditetapkan || new Date().toISOString().split('T')[0],
        tanggal_diperbarui: body.tanggal_diperbarui || null,
        tanggal_terbit: null,
        review_due: null,
        created_at: new Date().toISOString(),
        // ── Semua data isian IK ──
        penyusun_nama: body.penyusun_nama || null,
        penyusun_jabatan: body.penyusun_jabatan || null,
        doc_owner_id: body.doc_owner_id || (MockDB._store.session?.id || 1),
        approver_id: body.approver_id || null,
        steps: body.steps || null,
        definisi: body.definisi || [],
        dokumen_pendukung: body.dokumen_pendukung || [],
        dokumen_referensi: body.dokumen_referensi || [],
        dokumen_perizinan: body.dokumen_perizinan || [],
        sdm: body.sdm || [],
        tools: body.tools || [],
        material: body.material || [],
        risiko: body.risiko || [],
        form: body.form || [],
        change_history: [{
          halaman: 'Semua',
          uraian: 'Dokumen baru dibuat',
          revisi: body.revisi || '00',
          tanggal: new Date().toISOString().split('T')[0],
        }],
        data_teknik: body.data_teknik || null,
        konten: body.konten || null,
        pengesahan_id: body.pengesahan_id || null,
        ttd: body.ttd || null,
        custom_sections: body.custom_sections || null,
        attachments_formulir: body.attachments_formulir || [],
        attachments_data_teknik: body.attachments_data_teknik || [],
      };
      MockDB._store.documents.push(newDoc);
      MockDB.save();
      return this.ok({ id: newDoc.id, nomor_dokumen: nomor }, 'Dokumen berhasil disimpan');
    }

    // PUT /dokumen/:id
    if (method === 'PUT' && segments[1]) {
      if (!MockDB.hasPermission('doc.edit')) return this.error('Anda tidak memiliki izin untuk mengedit dokumen', 403);
      const doc = MockDB._store.documents.find(d => d.id == segments[1]);
      if (!doc) return this.error('Dokumen tidak ditemukan', 404);

      // Auto-track changes in change_history
      const oldRevisi = doc.revisi || '00';
      const newRevisi = body.revisi != null ? String(body.revisi).padStart(2, '0') : oldRevisi;
      if (body.revisi != null) body.revisi = newRevisi;

      // Detect what sections changed (content sections)
      const changedSections = [];
      const contentFields = ['steps','definisi','sdm','tools','material','risiko','form','dokumen_pendukung','dokumen_referensi','dokumen_perizinan','custom_sections'];
      const sectionLabels = {
        steps:'Aktivitas', definisi:'Definisi', sdm:'SDM', tools:'Tools/APD',
        material:'Material', risiko:'Risiko', form:'Formulir',
        dokumen_pendukung:'Dok. Pendukung', dokumen_referensi:'Dok. Referensi',
        dokumen_perizinan:'Dok. Perizinan', custom_sections:'Section Kustom',
      };
      for (const f of contentFields) {
        if (body[f] !== undefined && JSON.stringify(body[f]) !== JSON.stringify(doc[f])) {
          changedSections.push(f);
        }
      }

      // Also detect metadata changes
      const metaChanges = [];
      const metaFields = {judul:'Judul', tanggal_ditetapkan:'Tanggal Ditetapkan', penyusun_nama:'Penyusun', reviewer_id:'Reviewer', approver_id:'Approver', pengesahan_id:'Pengesahan', tingkat_risiko:'Tingkat Risiko'};
      for (const [field, label] of Object.entries(metaFields)) {
        if (body[field] !== undefined && String(body[field] || '') !== String(doc[field] || '')) {
          metaChanges.push(label);
        }
      }

      // Check revision change
      const revisiChanged = newRevisi !== oldRevisi;

      // Build change history entry if anything changed
      const allChanges = [...changedSections.map(s => sectionLabels[s] || s), ...metaChanges];
      if (allChanges.length > 0 || revisiChanged) {
        const history = Array.isArray(doc.change_history) ? [...doc.change_history] : [];
        let uraian = '';
        if (revisiChanged && allChanges.length > 0) {
          uraian = `Revisi ${oldRevisi} → ${newRevisi}: ${allChanges.join(', ')}`;
        } else if (revisiChanged) {
          uraian = `Revisi diperbarui: ${oldRevisi} → ${newRevisi}`;
        } else {
          uraian = `Perubahan pada: ${allChanges.join(', ')}`;
        }
        // Prevent duplicate consecutive entries
        const lastEntry = history[history.length - 1];
        const today = new Date().toISOString().split('T')[0];
        if (!lastEntry || lastEntry.uraian !== uraian || lastEntry.tanggal !== today) {
          history.push({
            halaman: changedSections.length > 0 ? changedSections.map(s => sectionLabels[s] || s).join(', ') : (metaChanges.length > 0 ? 'Metadata' : 'Revisi'),
            uraian: uraian,
            revisi: newRevisi,
            tanggal: today,
          });
        }
        body.change_history = history;
      }

      // Preserve existing change_history if no new changes detected
      if (!body.change_history && doc.change_history) {
        body.change_history = doc.change_history;
      }

      Object.assign(doc, body, { id: doc.id, nomor_dokumen: doc.nomor_dokumen });
      MockDB.save();
      return this.ok(doc, 'Dokumen berhasil diupdate');
    }

    // DELETE
    if (method === 'DELETE' && segments[1]) {
      if (!MockDB.hasPermission('doc.delete')) return this.error('Anda tidak memiliki izin untuk menghapus dokumen', 403);
      MockDB._store.documents = MockDB._store.documents.filter(d => d.id != segments[1]);
      MockDB.save();
      return this.ok(null, 'Dokumen berhasil dihapus');
    }

    return this.ok({ items: [], total: 0 });
  },

  enrichDoc(doc) {
    const unit = MockDB._store.units.find(u => u.id == doc.unit_id);
    const probis = MockDB._store.probis.find(p => p.id == doc.probis_id);
    const owner = MockDB._store.users.find(u => u.id == doc.owner_id);
    const reviewer = doc.reviewer_id ? MockDB._store.users.find(u => u.id == doc.reviewer_id) : null;
    const approver = doc.approver_id ? MockDB._store.users.find(u => u.id == doc.approver_id) : null;
    const pengesahan = doc.pengesahan_id ? MockDB._store.users.find(u => u.id == doc.pengesahan_id) : null;
    const docOwner = doc.doc_owner_id ? MockDB._store.users.find(u => u.id == doc.doc_owner_id) : null;
    const unitName = (unit?.nama || 'Unknown').replace(/\s+/g, '_');
    const cloud_path = doc.cloud_path || `G:/IMS_UP_Brantas/Instruksi_Kerja/${unitName}/${doc.nomor_dokumen}/`;
    return {
      ...doc,
      unit_nama: unit?.nama,
      probis_nama: probis?.nama,
      probis_nomor: probis?.nomor,
      owner_nama: owner?.nama,
      reviewer_nama: reviewer?.nama || null,
      approver_nama: approver?.nama || null,
      pengesahan_nama: pengesahan?.nama || null,
      doc_owner_nama: docOwner?.nama || null,
      cloud_path,
    };
  },

  enrichDocs(docs) {
    return docs.map(d => this.enrichDoc(d));
  },

  // ── Templates ──
  handleTemplates(segments, method, body) {
    if (segments[1] === 'active') {
      const tpl = MockDB._store.templates.find(t => t.status === 'Aktif');
      if (!tpl) return this.error('Tidak ada template aktif', 404);
      return this.ok(tpl);
    }
    // GET /templates/:id/history
    if (segments[1] && segments[2] === 'history') {
      const history = (MockDB._store.template_history || []).filter(h => h.template_id == segments[1]);
      return this.ok(history.sort((a, b) => b.id - a.id));
    }

    if (segments[1] && /^\d+$/.test(segments[1])) {
      if (method === 'PUT') {
        if (!MockDB.hasPermission('template.edit')) return this.error('Anda tidak memiliki izin untuk mengedit template', 403);
        const tpl = MockDB._store.templates.find(t => t.id == segments[1]);
        if (!tpl) return this.error('Template tidak ditemukan', 404);

        // Record change in template_history
        const versiSebelum = tpl.versi;
        const kontenSebelum = tpl.konten;
        const versiSesudah = body.versi || tpl.versi;
        const kontenSesudah = body.konten || tpl.konten;

        if (kontenSebelum !== kontenSesudah || versiSebelum !== versiSesudah) {
          if (!MockDB._store.template_history) MockDB._store.template_history = [];
          MockDB._store.template_history.push({
            id: MockDB.nextId('template_history'),
            template_id: tpl.id,
            versi_sebelum: versiSebelum,
            versi_sesudah: versiSesudah,
            konten_sebelum: kontenSebelum,
            konten_sesudah: kontenSesudah,
            perubahan: body.perubahan || 'Perubahan template',
            user_id: MockDB._store.session?.id || 1,
            created_at: new Date().toISOString(),
          });
        }

        // Auto-deactivate other templates when this one becomes Aktif
        if (body.status === 'Aktif') {
          MockDB._store.templates.forEach(t => {
            if (t.id !== tpl.id && t.status === 'Aktif') t.status = 'Legacy';
          });
        }

        Object.assign(tpl, body, { id: tpl.id });
        MockDB.save();
        return this.ok(tpl, 'Template berhasil diupdate');
      }
      if (method === 'DELETE') {
        MockDB._store.templates = MockDB._store.templates.filter(t => t.id != segments[1]);
        MockDB.save();
        return this.ok(null, 'Template dihapus');
      }
      const tpl = MockDB._store.templates.find(t => t.id == segments[1]);
      return tpl ? this.ok(tpl) : this.error('Not found', 404);
    }
    if (method === 'POST') {
      if (!MockDB.hasPermission('template.create')) return this.error('Anda tidak memiliki izin untuk membuat template', 403);
      const newTpl = { id: MockDB.nextId('templates'), ...body, status: body.status || 'Draft' };
      MockDB._store.templates.push(newTpl);
      MockDB.save();
      return this.ok(newTpl, 'Template berhasil dibuat');
    }
    return this.ok(MockDB._store.templates);
  },

  // ── Units ──
  handleUnits(segments, method, body) {
    if (method === 'DELETE' && segments[1]) {
      const id = parseInt(segments[1]);
      MockDB._store.units = MockDB._store.units.filter(u => u.id !== id);
      MockDB.save();
      return this.ok(null, 'Unit berhasil dihapus');
    }
    if (method === 'GET' && !segments[1]) return this.ok(MockDB._store.units);
    if (method === 'POST') {
      const u = { id: MockDB.nextId('units'), ...body };
      MockDB._store.units.push(u);
      MockDB.save();
      return this.ok(u);
    }
    if (method === 'PUT' && segments[1]) {
      const u = MockDB._store.units.find(x => x.id == segments[1]);
      if (u) Object.assign(u, body, { id: u.id });
      MockDB.save();
      return this.ok(u);
    }
    return this.ok(MockDB._store.units);
  },

  // ── Probis ──
  handleProbis(segments, method, body, params) {
    if (method === 'DELETE' && segments[1]) {
      const id = parseInt(segments[1]);
      const force = params && params.get('force');
      const used = MockDB._store.documents.some(d => d.probis_id === id);
      if (used && !force) {
        this.error('FOREIGN KEY constraint: probis masih digunakan oleh dokumen');
      }
      MockDB._store.probis = MockDB._store.probis.filter(p => p.id !== id);
      MockDB.save();
      return this.ok(null, 'Probis berhasil dihapus');
    }
    if (method === 'GET') return this.ok(MockDB._store.probis);
    if (method === 'POST') {
      const p = { id: MockDB.nextId('probis'), ...body };
      MockDB._store.probis.push(p);
      MockDB.save();
      return this.ok(p);
    }
    if (method === 'PUT' && segments[1]) {
      const p = MockDB._store.probis.find(x => x.id == segments[1]);
      if (p) Object.assign(p, body, { id: p.id });
      MockDB.save();
      return this.ok(p);
    }
    return this.ok(MockDB._store.probis);
  },

  // ── Equipment ──
  handleEquipment(segments, method, body) {
    if (segments[1] && /^\d+$/.test(segments[1])) {
      if (method === 'DELETE') {
        MockDB._store.equipment = MockDB._store.equipment.filter(e => e.id != segments[1]);
        MockDB.save();
        return this.ok(null, 'Equipment dihapus');
      }
      if (method === 'PUT') {
        const eq = MockDB._store.equipment.find(e => e.id == segments[1]);
        if (eq) Object.assign(eq, body, { id: eq.id });
        MockDB.save();
        return this.ok(eq);
      }
      return this.ok(MockDB._store.equipment.find(e => e.id == segments[1]));
    }
    if (method === 'POST') {
      const eq = { id: MockDB.nextId('equipment'), ...body };
      MockDB._store.equipment.push(eq);
      MockDB.save();
      return this.ok(eq);
    }
    return this.ok(MockDB._store.equipment);
  },

  // ── Dashboard ──
  handleDashboard() {
    const docs = MockDB._store.documents;
    const now = new Date();
    const published = docs.filter(d => d.status === 'Published').length;
    const draft = docs.filter(d => d.status === 'Draft').length;
    const review = docs.filter(d => d.status === 'Review').length;
    const approvedT1 = docs.filter(d => d.status === 'Approved-T1').length;
    const approvedT2 = docs.filter(d => d.status === 'Approved-T2').length;
    const pending = review + approvedT1 + approvedT2; // all in-progress approvals
    const archived = docs.filter(d => d.status === 'Archived').length;
    const overdue = docs.filter(d => d.review_due && new Date(d.review_due) < now).length;

    // Status distribution for badges
    const status_distribution = {};
    if (draft) status_distribution.Draft = draft;
    if (review) status_distribution['Review (Asman)'] = review;
    if (approvedT1) status_distribution['Approval (Manager)'] = approvedT1;
    if (approvedT2) status_distribution['Pengesahan (SM)'] = approvedT2;
    if (published) status_distribution.Published = published;
    if (archived) status_distribution.Archived = archived;

    // Unit progress (published vs total per unit)
    const unit_progress = MockDB._store.units.slice(0, 8).map(u => {
      const unitDocs = docs.filter(d => d.unit_id === u.id);
      return {
        nama: u.nama,
        total: unitDocs.length,
        published: unitDocs.filter(d => d.status === 'Published').length
      };
    }).filter(u => u.total > 0);

    // Recent documents (enriched with unit name)
    const recent_documents = this.enrichDocs(docs.slice().sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 8));

    return this.ok({
      stats: {
        total: docs.length,
        published: published,
        pending: pending,
        overdue: overdue
      },
      status_distribution,
      unit_progress,
      recent_documents,
      recent_activity: MockDB._store.audit_logs.slice(0, 5)
    });
  },

  // ── Workflow (3-Tier Sequential Approval) ──
  // Status flow: Draft → Review → Approved-T1 → Approved-T2 → Published → Archived
  // Tier 1 (Asman): Review → can approve to Approved-T1
  // Tier 2 (Manager): Approved-T1 → can approve to Approved-T2
  // Tier 3 (SM): Approved-T2 → can approve/publish to Published
  handleWorkflow(segments, method, body, params) {
    if (method === 'POST') {
      const action = segments[1];
      const session = MockDB._store.session;
      const currentUser = session ? MockDB._store.users.find(u => u.id === session.user_id) : null;
      const currentRole = MockDB._store.roles.find(r => r.nama === session?.role);
      const userTier = currentRole?.approval_tier || 0;
      const isSuperAdmin = currentRole?.priority >= 100;
      const isAdmin = currentRole?.priority >= 90;

      const doc = MockDB._store.documents.find(d => d.id == body.dokumen_id);
      if (!doc) return this.error('Dokumen tidak ditemukan');

      // Initialize approval_history if not exists
      if (!doc.approval_history) doc.approval_history = [];

      const now = new Date().toISOString().split('T')[0];

      if (action === 'submit') {
        if (!MockDB.hasPermission('doc.submit')) return this.error('Anda tidak memiliki izin untuk submit dokumen', 403);
        if (doc.status !== 'Draft') return this.error('Hanya dokumen Draft yang bisa di-submit');
        doc.status = 'Review';
        doc.submitted_at = now;
        doc.submitted_by = currentUser?.id;
        // Notify Asman/reviewers
        MockDB._store.users.filter(u => ['Asst. Manager','Manager','Senior Manager','Super Admin'].includes(u.role)).forEach(u => {
          this._createNotification(u.id, 'Dokumen Disubmit untuk Review', `${doc.judul} disubmit oleh ${currentUser?.nama}`, '#E6F0FF');
        });
      }

      else if (action === 'review') {
        // Tier 1: Asman reviews — status Review → Approved-T1
        if (!isSuperAdmin && !isAdmin && !MockDB.hasPermission('doc.review')) return this.error('Anda tidak memiliki izin untuk review (Tier 1)', 403);
        if (doc.status !== 'Review') return this.error('Dokumen tidak dalam status Review');
        // Self-review prevention: Asman cannot review their own document
        if (currentUser && doc.owner_id == currentUser.id && !isSuperAdmin) {
          return this.error('Anda tidak bisa me-review dokumen yang Anda susun sendiri', 403);
        }
        doc.status = 'Approved-T1';
        doc.approval_history.push({ tier: 1, action: 'review', user_id: currentUser?.id, user_nama: currentUser?.nama, role: session?.role, tanggal: now, catatan: body.catatan || '' });
        // Notify document owner + managers
        if (doc.owner_id) this._createNotification(doc.owner_id, 'Dokumen Di-review (Tier 1)', `${doc.judul} telah di-review oleh ${currentUser?.nama}`, '#E8F5E9');
        MockDB._store.users.filter(u => ['Manager','Senior Manager','Super Admin'].includes(u.role)).forEach(u => {
          this._createNotification(u.id, 'Dokumen Menunggu Approval Manager', `${doc.judul} sudah melewati review Asman`, '#FFF8E1');
        });
      }

      else if (action === 'approve-t1') {
        // Tier 2: Manager approves — status Approved-T1 → Approved-T2
        if (!isSuperAdmin && !isAdmin && !MockDB.hasPermission('doc.approve_t1')) return this.error('Anda tidak memiliki izin untuk approve Tier 1 (Manager)', 403);
        if (doc.status !== 'Approved-T1') return this.error('Dokumen belum di-review oleh Asman (status harus Approved-T1)');
        doc.status = 'Approved-T2';
        doc.approval_history.push({ tier: 2, action: 'approve', user_id: currentUser?.id, user_nama: currentUser?.nama, role: session?.role, tanggal: now, catatan: body.catatan || '' });
        // Notify owner + Senior Manager
        if (doc.owner_id) this._createNotification(doc.owner_id, 'Dokumen Disetujui Manager', `${doc.judul} telah disetujui oleh ${currentUser?.nama}`, '#E8F5E9');
        MockDB._store.users.filter(u => ['Senior Manager','Super Admin'].includes(u.role)).forEach(u => {
          this._createNotification(u.id, 'Dokumen Menunggu Pengesahan', `${doc.judul} menunggu pengesahan Senior Manager`, '#FFF8E1');
        });
      }

      else if (action === 'approve-t2') {
        // Tier 3: Senior Manager final approval — status Approved-T2 → Published
        if (!isSuperAdmin && !isAdmin && !MockDB.hasPermission('doc.approve_t2')) return this.error('Anda tidak memiliki izin untuk pengesahan (Senior Manager)', 403);
        if (doc.status !== 'Approved-T2') return this.error('Dokumen belum di-approve oleh Manager (status harus Approved-T2)');
        doc.status = 'Published';
        doc.tanggal_terbit = now;
        doc.approval_history.push({ tier: 3, action: 'approve', user_id: currentUser?.id, user_nama: currentUser?.nama, role: session?.role, tanggal: now, catatan: body.catatan || '' });
        // Notify owner + all approvers
        if (doc.owner_id) this._createNotification(doc.owner_id, 'Dokumen Telah Disahkan ✓', `${doc.judul} telah disahkan dan dipublikasikan oleh ${currentUser?.nama}`, '#E8F5E9');
        // Broadcast to all users about published document
        this._createNotification(0, 'Dokumen Baru Terbit', `${doc.judul} telah dipublikasikan`, '#E6F0FF');
      }

      else if (action === 'reject') {
        if (!MockDB.hasPermission('doc.reject') && !isSuperAdmin && !isAdmin) return this.error('Anda tidak memiliki izin untuk reject', 403);
        if (!['Review', 'Approved-T1', 'Approved-T2'].includes(doc.status)) return this.error('Dokumen tidak dalam proses approval');
        const prevStatus = doc.status;
        doc.status = 'Draft';
        doc.approval_history.push({ tier: userTier || 0, action: 'reject', user_id: currentUser?.id, user_nama: currentUser?.nama, role: session?.role, tanggal: now, catatan: body.catatan || '', prev_status: prevStatus });
        // Notify document owner about rejection
        if (doc.owner_id) this._createNotification(doc.owner_id, 'Dokumen Ditolak', `${doc.judul} ditolak oleh ${currentUser?.nama}. Catatan: ${body.catatan || '-'}`, '#FFEBEE');
      }

      else if (action === 'return-revisi') {
        if (!MockDB.hasPermission('doc.return_revisi') && !isSuperAdmin && !isAdmin) return this.error('Anda tidak memiliki izin untuk return revisi', 403);
        if (!['Review', 'Approved-T1', 'Approved-T2'].includes(doc.status)) return this.error('Dokumen tidak dalam proses approval');
        const prevStatus = doc.status;
        doc.status = 'Draft';
        doc.revision_notes = doc.revision_notes || [];
        doc.revision_notes.push({ catatan: body.catatan, reviewer: currentUser?.nama, tanggal: new Date().toISOString() });
        doc.revisi = (parseInt(doc.revisi) || 0) + 1;
        doc.approval_history.push({ tier: userTier || 0, action: 'return', user_id: currentUser?.id, user_nama: currentUser?.nama, role: session?.role, tanggal: now, catatan: body.catatan || '', prev_status: prevStatus });
        // Notify document owner about revision request
        if (doc.owner_id) this._createNotification(doc.owner_id, 'Dokumen Perlu Revisi', `${doc.judul} dikembalikan oleh ${currentUser?.nama}. Catatan: ${body.catatan || '-'}`, '#FFF3E0');
      }

      else if (action === 'archive') {
        if (!MockDB.hasPermission('doc.archive') && !isSuperAdmin && !isAdmin) return this.error('Anda tidak memiliki izin untuk arsip', 403);
        doc.status = 'Archived';
      }

      else {
        return this.error(`Aksi "${action}" tidak dikenali`);
      }

      MockDB.save();
      return this.ok(this.enrichDoc(doc), `Dokumen berhasil di-${action}`);
    }

    // GET workflow items — show all documents in approval pipeline
    const statusFilter = params.get('status');
    let docs = MockDB._store.documents.filter(d => ['Draft', 'Review', 'Approved-T1', 'Approved-T2'].includes(d.status));
    if (statusFilter) docs = docs.filter(d => d.status === statusFilter);
    return this.ok(this.enrichDocs(docs));
  },

  // ── Notifications ──
  handleNotifikasi(segments, method, body) {
    const userId = MockDB._store.session?.id;
    // Filter notifications: show user-specific + broadcast (user_id=0 or user_id matches)
    const userNotifs = MockDB._store.notifications.filter(n => !n.user_id || n.user_id === userId || n.user_id === 0);

    if (segments[1] === 'mark-read') {
      if (body && body.id) {
        const n = MockDB._store.notifications.find(x => x.id == body.id);
        if (n) n.is_read = true;
      } else {
        // Mark all for this user
        userNotifs.forEach(n => n.is_read = true);
      }
      MockDB.save();
      return this.ok(null);
    }
    if (segments[1] === 'unread-count') {
      return this.ok({ count: userNotifs.filter(n => !n.is_read).length });
    }
    // Sort by newest first
    return this.ok(userNotifs.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)));
  },

  // Helper: Create notification (called internally after workflow actions)
  _createNotification(userId, judul, deskripsi, warnaBg = '#E6F0FF') {
    const notif = {
      id: MockDB.nextId('notifications'),
      user_id: userId,
      judul,
      deskripsi,
      icon: '📋',
      warna_bg: warnaBg,
      is_read: false,
      created_at: new Date().toISOString()
    };
    MockDB._store.notifications.push(notif);
    return notif;
  },

  // ── Pengguna ──
  handlePengguna(segments, method, body) {
    if (segments[1] === 'approvers') {
      return this.ok(MockDB._store.users.filter(u => ['Super Admin','Admin','Asst. Manager','Manager','Senior Manager'].includes(u.role)));
    }
    if (segments[1] === 'bulk-delete') {
      if (!MockDB.hasPermission('user.manage')) return this.error('Anda tidak memiliki izin untuk mengelola pengguna', 403);
      if (body.ids) {
        MockDB._store.users = MockDB._store.users.filter(u => !body.ids.includes(u.id));
        MockDB.save();
      }
      return this.ok(null, 'Users deleted');
    }
    if (segments[1] && /^\d+$/.test(segments[1])) {
      if (method === 'PUT') {
        if (!MockDB.hasPermission('user.manage')) return this.error('Anda tidak memiliki izin untuk mengelola pengguna', 403);
        const u = MockDB._store.users.find(x => x.id == segments[1]);
        if (u) Object.assign(u, body, { id: u.id });
        MockDB.save();
        return this.ok(u);
      }
      if (method === 'DELETE') {
        if (!MockDB.hasPermission('user.manage')) return this.error('Anda tidak memiliki izin untuk mengelola pengguna', 403);
        MockDB._store.users = MockDB._store.users.filter(u => u.id != segments[1]);
        MockDB.save();
        return this.ok(null);
      }
      return this.ok(MockDB._store.users.find(u => u.id == segments[1]));
    }
    if (method === 'POST') {
      if (!MockDB.hasPermission('user.manage')) return this.error('Anda tidak memiliki izin untuk mengelola pengguna', 403);
      const u = { id: MockDB.nextId('users'), ...body, status: 'Aktif' };
      MockDB._store.users.push(u);
      MockDB.save();
      return this.ok(u);
    }
    return this.ok(MockDB._store.users);
  },

  // ── Audit ──
  handleAudit(params) {
    return this.ok({ items: MockDB._store.audit_logs, total: MockDB._store.audit_logs.length });
  },

  // ── Permissions ──
  handlePermissions() {
    const perms = MockDB._store.permissions || [];
    // Group by grup field for the UI checklist
    const groups = {};
    perms.forEach(p => {
      if (!groups[p.grup]) groups[p.grup] = { grup: p.grup, permissions: [] };
      groups[p.grup].permissions.push({ id: p.id, nama: p.nama, kunci: p.kunci });
    });
    return this.ok(Object.values(groups));
  },

  // ── Roles ──
  handleRoles(segments, method, body) {
    const roleId = segments[1] && /^\d+$/.test(segments[1]) ? parseInt(segments[1]) : null;

    // GET /roles/:id
    if (method === 'GET' && roleId) {
      const role = MockDB._store.roles.find(r => r.id === roleId);
      if (!role) return this.error('Role tidak ditemukan', 404);
      // Attach user_count
      const userCount = MockDB._store.users.filter(u => u.role === role.nama).length;
      return this.ok({ ...role, user_count: userCount });
    }

    // GET /roles
    if (method === 'GET') {
      return this.ok(MockDB._store.roles.map(r => ({
        ...r,
        user_count: MockDB._store.users.filter(u => u.role === r.nama).length
      })));
    }

    // POST /roles — create
    if (method === 'POST' && !roleId) {
      if (!MockDB.hasPermission('role.manage')) return this.error('Anda tidak memiliki izin untuk mengelola role', 403);
      if (!body.nama) return this.error('Nama role wajib diisi');
      // Check duplicate
      if (MockDB._store.roles.some(r => r.nama.toLowerCase() === body.nama.toLowerCase())) {
        return this.error('Nama role sudah digunakan');
      }
      const newRole = {
        id: MockDB.nextId('roles'),
        nama: body.nama,
        deskripsi: body.deskripsi || '',
        is_system: false,
        priority: body.priority || 10,
        permission_ids: body.permission_ids || []
      };
      MockDB._store.roles.push(newRole);
      MockDB.save();
      return this.ok(newRole, 'Role berhasil dibuat');
    }

    // PUT /roles/:id — update
    if (method === 'PUT' && roleId) {
      if (!MockDB.hasPermission('role.manage')) return this.error('Anda tidak memiliki izin untuk mengelola role', 403);
      const role = MockDB._store.roles.find(r => r.id === roleId);
      if (!role) return this.error('Role tidak ditemukan', 404);
      if (body.nama !== undefined) role.nama = body.nama;
      if (body.deskripsi !== undefined) role.deskripsi = body.deskripsi;
      if (body.priority !== undefined) role.priority = body.priority;
      if (body.permission_ids !== undefined) role.permission_ids = body.permission_ids;
      MockDB.save();
      return this.ok(role, 'Role berhasil diperbarui');
    }

    // DELETE /roles/:id — delete
    if (method === 'DELETE' && roleId) {
      if (!MockDB.hasPermission('role.manage')) return this.error('Anda tidak memiliki izin untuk mengelola role', 403);
      const role = MockDB._store.roles.find(r => r.id === roleId);
      if (!role) return this.error('Role tidak ditemukan', 404);
      if (role.is_system) return this.error('Role bawaan sistem tidak dapat dihapus');
      // Check if any users are using this role
      const usersWithRole = MockDB._store.users.filter(u => u.role === role.nama);
      if (usersWithRole.length > 0) return this.error(`Tidak dapat menghapus — ${usersWithRole.length} pengguna masih menggunakan role ini`);
      MockDB._store.roles = MockDB._store.roles.filter(r => r.id !== roleId);
      MockDB.save();
      return this.ok(null, 'Role berhasil dihapus');
    }

    return this.ok(MockDB._store.roles);
  },

  // ── Sessions ──
  handleSessions(segments, method) {
    if (segments[1] === 'me') {
      return this.ok([{ id: 1, ip: '127.0.0.1', user_agent: navigator.userAgent, created_at: new Date().toISOString(), is_current: true }]);
    }
    return this.ok([]);
  },

  // ── Settings ──
  handleSettings(method, body) {
    if (method === 'POST') {
      if (!MockDB.hasPermission('settings.edit')) return this.error('Anda tidak memiliki izin untuk mengubah pengaturan', 403);
      Object.assign(MockDB._store.settings, body);
      MockDB.save();
      return this.ok(MockDB._store.settings, 'Pengaturan disimpan');
    }
    return this.ok(MockDB._store.settings);
  },

  // ── Laporan ──
  handleLaporan() {
    const docs = MockDB._store.documents;
    return this.ok({
      total: docs.length,
      by_status: { Published: 7, Review: 1, Draft: 1, Archived: 0 },
      by_risk: { Rendah: 3, Sedang: 1, Tinggi: 5, Ekstrem: 1 },
      by_unit: MockDB._store.units.slice(0, 8).map(u => ({ nama: u.nama, count: docs.filter(d => d.unit_id === u.id).length })),
      compliance_rate: 85,
      overdue_count: 2,
    });
  },

  // ── QR ──
  handleQR(segments) {
    if (segments[1] === 'stats') {
      return this.ok({ total_scans: 996, total_qr: 7, today_scans: 47 });
    }
    return this.ok(MockDB._store.documents.filter(d => d.status === 'Published').map(d => ({
      id: d.id, dokumen_id: d.id, kode_qr: `QR-${d.nomor_dokumen}-abc`, nomor_dokumen: d.nomor_dokumen,
      judul: d.judul, scan_count: Math.floor(Math.random() * 200) + 10
    })));
  },

  // ── Helpers ──
  ok(data, message = 'Success') {
    return { success: true, data, message };
  },
  error(message, status = 400) {
    const err = new Error(message);
    err.status = status;
    throw err;
  }
};

// ═══ Override fetch to intercept API calls ═══
(function() {
  MockDB.init();
  const originalFetch = window.fetch;

  window.fetch = async function(url, opts = {}) {
    const urlStr = typeof url === 'string' ? url : url.url;

    // Only intercept /api/ calls
    if (urlStr.startsWith('/api/')) {
      const method = (opts.method || 'GET').toUpperCase();
      let body = null;
      if (opts.body) {
        try { body = JSON.parse(opts.body); } catch(e) { body = opts.body; }
      }

      try {
        const result = await MockAPI.handle(method, urlStr, body);
        return new Response(JSON.stringify(result), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      } catch (err) {
        return new Response(JSON.stringify({ success: false, message: err.message }), {
          status: err.status || 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    // Pass through non-API requests
    return originalFetch.apply(this, arguments);
  };

  console.log('%c[Brantas DMS Mock API] Active — All /api/ calls intercepted', 'color:#10B981;font-weight:bold');
  console.log('%c[Brantas DMS Mock API] Reset data: MockDB.reset()', 'color:#6B7280;font-size:11px');
})();
