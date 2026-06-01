// Brantas DMS — Help & Tutorial System

// ─── HELP PAGE RENDERER ─────────────────────────
async function renderHelp(container) {
  const role = APP.user?.role || 'Viewer';
  const roleGuides = getGuideForRole(role);

  container.innerHTML = `
    <div class="page active" id="page-help">
      <div class="page-header">
        <div class="page-header-left">
          <div class="page-title">${icon('help-circle', 20)} Bantuan & Panduan</div>
          <div class="page-subtitle">Panduan penggunaan Brantas DMS — Role Anda: <strong>${esc(role)}</strong></div>
        </div>
        <div class="page-actions">
          <button class="btn btn-primary" onclick="startGuidedTour()">${icon('play-circle', 14)} Mulai Tur Interaktif</button>
        </div>
      </div>

      <!-- Quick Start -->
      <div class="card" style="margin-bottom:16px">
        <div class="card-header"><div class="card-title">${icon('rocket', 16)} Quick Start — Mulai di Sini</div></div>
        <div class="card-body">
          <div class="help-quick-grid">
            ${roleGuides.quickStart.map((item, i) => `
              <div class="help-step-card" onclick="${item.action || ''}">
                <div class="help-step-num">${i + 1}</div>
                <div class="help-step-content">
                  <div class="help-step-title">${item.title}</div>
                  <div class="help-step-desc">${item.desc}</div>
                </div>
                ${item.action ? `<div class="help-step-arrow">${icon('chevron-right', 16)}</div>` : ''}
              </div>
            `).join('')}
          </div>
        </div>
      </div>

      <!-- Feature Guide Tabs -->
      <div class="card" style="margin-bottom:16px">
        <div class="card-header">
          <div class="card-title">${icon('book-open', 16)} Panduan Fitur</div>
          <div class="help-tab-bar">
            <button class="help-tab active" onclick="switchHelpTab('overview')">Overview</button>
            <button class="help-tab" onclick="switchHelpTab('dokumen')">Dokumen IK</button>
            <button class="help-tab" onclick="switchHelpTab('approval')">Approval</button>
            <button class="help-tab" onclick="switchHelpTab('lapangan')">Lapangan</button>
            ${['Super Admin', 'Admin'].includes(role) ? '<button class="help-tab" onclick="switchHelpTab(\'admin\')">Admin</button>' : ''}
          </div>
        </div>
        <div class="card-body" id="helpTabContent">
          ${renderHelpTabContent('overview')}
        </div>
      </div>

      <!-- FAQ -->
      <div class="card" style="margin-bottom:16px">
        <div class="card-header"><div class="card-title">${icon('message-circle', 16)} Pertanyaan Umum (FAQ)</div></div>
        <div class="card-body" style="padding:0">
          ${renderFAQ()}
        </div>
      </div>

      <!-- Alur Kerja Visual -->
      <div class="card" style="margin-bottom:16px">
        <div class="card-header"><div class="card-title">${icon('git-branch', 16)} Alur Kerja Dokumen IK</div></div>
        <div class="card-body">
          ${renderWorkflowDiagram()}
        </div>
      </div>

      <!-- Keyboard Shortcuts & Tips -->
      <div class="card">
        <div class="card-header"><div class="card-title">${icon('lightbulb', 16)} Tips & Pintasan</div></div>
        <div class="card-body">
          <div class="help-tips-grid">
            <div class="help-tip-item">
              <div class="help-tip-icon">${icon('search', 18)}</div>
              <div><strong>Pencarian Global</strong><br><span class="help-tip-desc">Gunakan search bar di topbar untuk mencari dokumen dari halaman mana saja</span></div>
            </div>
            <div class="help-tip-item">
              <div class="help-tip-icon">${icon('panel-left', 18)}</div>
              <div><strong>Toggle Sidebar</strong><br><span class="help-tip-desc">Klik tombol panel di kiri atas untuk menyembunyikan/menampilkan sidebar</span></div>
            </div>
            <div class="help-tip-item">
              <div class="help-tip-icon">${icon('bell', 18)}</div>
              <div><strong>Notifikasi</strong><br><span class="help-tip-desc">Klik ikon lonceng untuk melihat notifikasi approval, review, dan aktivitas terbaru</span></div>
            </div>
            <div class="help-tip-item">
              <div class="help-tip-icon">${icon('printer', 18)}</div>
              <div><strong>Cetak/PDF</strong><br><span class="help-tip-desc">Dari Master Data IK, klik Preview untuk melihat format cetak dan download PDF</span></div>
            </div>
            <div class="help-tip-item">
              <div class="help-tip-icon">${icon('scan', 18)}</div>
              <div><strong>QR Code</strong><br><span class="help-tip-desc">Setiap IK Published otomatis punya QR Code yang bisa dipasang di equipment</span></div>
            </div>
            <div class="help-tip-item">
              <div class="help-tip-icon">${icon('shield', 18)}</div>
              <div><strong>Role & Akses</strong><br><span class="help-tip-desc">Akses menu dan aksi disesuaikan otomatis berdasarkan role Anda</span></div>
            </div>
          </div>
        </div>
      </div>

      <div style="text-align:center;padding:24px 0;color:var(--text-tertiary);font-size:12px">
        Brantas DMS v3.0 &middot; PLN Nusantara Power UP Brantas &middot; Butuh bantuan lebih? Hubungi Admin Sistem.
      </div>
    </div>
  `;
  renderIcons();
}

// ─── ROLE-BASED QUICK START GUIDE ───────────────
function getGuideForRole(role) {
  const guides = {
    'Super Admin': {
      quickStart: [
        { title: 'Kelola Pengguna', desc: 'Tambah/edit pengguna dan atur role di menu Pengguna & Akses', action: "showPage('pengguna')" },
        { title: 'Konfigurasi Template', desc: 'Sesuaikan template IK sesuai standar IMS terbaru', action: "showPage('template')" },
        { title: 'Monitor Sistem', desc: 'Pantau sesi aktif, audit trail, dan performa sistem', action: "showPage('admin-sessions')" },
        { title: 'Role Switcher', desc: 'Gunakan dropdown role di sidebar untuk menguji tampilan role lain', action: '' },
      ]
    },
    'Admin': {
      quickStart: [
        { title: 'Kelola Pengguna', desc: 'Tambah/edit pengguna dan atur role di menu Pengguna & Akses', action: "showPage('pengguna')" },
        { title: 'Kelola Template', desc: 'Edit template IK dan aktifkan/nonaktifkan section', action: "showPage('template')" },
        { title: 'Lihat Laporan', desc: 'Pantau compliance rate dan distribusi IK per unit', action: "showPage('laporan')" },
        { title: 'Pengaturan Sistem', desc: 'Konfigurasi backup, cloud path, dan general settings', action: "showPage('pengaturan')" },
      ]
    },
    'Senior Manager': {
      quickStart: [
        { title: 'Pengesahan IK', desc: 'Review dan sahkan dokumen IK yang sudah diapprove Manager', action: "showPage('workflow')" },
        { title: 'Dashboard', desc: 'Lihat ringkasan status dokumen dan pending tasks', action: "showPage('dashboard')" },
        { title: 'Laporan Compliance', desc: 'Pantau tingkat kepatuhan pengelolaan IK per unit', action: "showPage('laporan')" },
        { title: 'Audit Trail', desc: 'Lihat riwayat aktivitas untuk keperluan audit', action: "showPage('audit')" },
      ]
    },
    'Manager': {
      quickStart: [
        { title: 'Approve Dokumen', desc: 'Review dan approve IK yang sudah direview Asman', action: "showPage('workflow')" },
        { title: 'Monitor IK Unit', desc: 'Lihat status semua IK di Master Data', action: "showPage('master-ik')" },
        { title: 'Laporan', desc: 'Lihat analitik dan compliance per probis', action: "showPage('laporan')" },
        { title: 'Return Revisi', desc: 'Kembalikan dokumen ke penyusun jika perlu perbaikan', action: "showPage('workflow')" },
      ]
    },
    'Asst. Manager': {
      quickStart: [
        { title: 'Buat IK Baru', desc: 'Susun dokumen IK menggunakan template standar', action: "showPage('buat-ik')" },
        { title: 'Review Dokumen', desc: 'Review IK yang disubmit oleh Document Owner/staf', action: "showPage('workflow')" },
        { title: 'Submit ke Manager', desc: 'Setelah review, kirim ke Manager untuk approval', action: "showPage('workflow')" },
        { title: 'Lihat Repository', desc: 'Akses semua dokumen IK di Master Data', action: "showPage('master-ik')" },
      ]
    },
    'Document Owner': {
      quickStart: [
        { title: 'Buat IK Baru', desc: 'Susun dokumen IK baru menggunakan template', action: "showPage('buat-ik')" },
        { title: 'Submit Review', desc: 'Kirim draft IK ke Asman untuk review', action: "showPage('workflow')" },
        { title: 'Lihat Status', desc: 'Pantau progres approval dokumen Anda', action: "showPage('workflow')" },
        { title: 'Edit Dokumen', desc: 'Perbaiki dokumen yang dikembalikan untuk revisi', action: "showPage('master-ik')" },
      ]
    },
    'Viewer': {
      quickStart: [
        { title: 'Lihat Dokumen', desc: 'Akses semua dokumen IK yang sudah dipublish', action: "showPage('master-ik')" },
        { title: 'Cari Dokumen', desc: 'Gunakan search/filter di Master Data untuk menemukan IK', action: "showPage('master-ik')" },
        { title: 'Preview & Cetak', desc: 'Buka preview untuk melihat format resmi dan download PDF', action: "showPage('master-ik')" },
        { title: 'Scan QR Code', desc: 'Scan QR di equipment untuk akses langsung ke IK terkait', action: '' },
      ]
    }
  };
  return guides[role] || guides['Viewer'];
}

// ─── HELP TAB CONTENT ───────────────────────────
function switchHelpTab(tab) {
  document.querySelectorAll('.help-tab').forEach(t => t.classList.remove('active'));
  event.target.classList.add('active');
  document.getElementById('helpTabContent').innerHTML = renderHelpTabContent(tab);
  renderIcons();
}

function renderHelpTabContent(tab) {
  const contents = {
    overview: `
      <div class="help-section">
        <h4>${icon('layout-dashboard', 16)} Tentang Brantas DMS</h4>
        <p>Brantas DMS (Document Management System) adalah sistem pengelolaan dokumen Instruksi Kerja (IK)
        untuk PLN Nusantara Power UP Brantas. Sistem ini mendukung standar IMS (Integrated Management System),
        SMK2, SPI, dan PSM.</p>

        <h4>${icon('users', 16)} Struktur Role</h4>
        <div class="help-role-table">
          <table>
            <thead><tr><th>Role</th><th>Fungsi Utama</th><th>Approval Tier</th></tr></thead>
            <tbody>
              <tr><td><span class="badge badge-risk-high">Super Admin</span></td><td>Akses penuh + impersonasi role</td><td>-</td></tr>
              <tr><td><span class="badge badge-risk-high">Admin</span></td><td>Kelola pengguna, template, pengaturan</td><td>-</td></tr>
              <tr><td><span class="badge badge-approved">Senior Manager</span></td><td>Pengesahan final dokumen IK</td><td>Tier 3</td></tr>
              <tr><td><span class="badge badge-blue">Manager</span></td><td>Approval Tier 1 (setelah Asman review)</td><td>Tier 2</td></tr>
              <tr><td><span class="badge badge-amber">Asst. Manager</span></td><td>Penyusun + Reviewer Tier 1</td><td>Tier 1</td></tr>
              <tr><td><span class="badge badge-sky">Document Owner</span></td><td>Membuat dan mengedit dokumen IK</td><td>-</td></tr>
              <tr><td><span class="badge badge-gray">Viewer</span></td><td>Melihat dokumen yang sudah published</td><td>-</td></tr>
            </tbody>
          </table>
        </div>

        <h4>${icon('shield-check', 16)} Halaman & Menu</h4>
        <div class="help-menu-list">
          <div class="help-menu-item"><strong>Dashboard</strong> — Ringkasan status, notifikasi, dan aksi cepat</div>
          <div class="help-menu-item"><strong>Master Data IK</strong> — Repository semua dokumen IK (search, filter, preview, print)</div>
          <div class="help-menu-item"><strong>Buat IK Baru</strong> — Editor WYSIWYG untuk membuat dokumen IK baru</div>
          <div class="help-menu-item"><strong>Alur Persetujuan</strong> — Pipeline approval 3-tier (review, approve, pengesahan)</div>
          <div class="help-menu-item"><strong>Template Engine</strong> — Kelola template dan section dokumen IK</div>
          <div class="help-menu-item"><strong>Master Equipment</strong> — Database aset fisik & relasi ke IK</div>
          <div class="help-menu-item"><strong>QR Code Manager</strong> — Generate & tracking QR untuk akses IK di lapangan</div>
          <div class="help-menu-item"><strong>Laporan & Monitoring</strong> — Analitik compliance, trend, dan KPI</div>
          <div class="help-menu-item"><strong>Audit Trail</strong> — Riwayat semua aktivitas sistem</div>
        </div>
      </div>
    `,
    dokumen: `
      <div class="help-section">
        <h4>${icon('file-plus', 16)} Membuat Dokumen IK Baru</h4>
        <ol class="help-steps-list">
          <li><strong>Buka halaman "Buat IK Baru"</strong> dari sidebar</li>
          <li><strong>Isi metadata:</strong> judul, unit PLTA, proses bisnis, tingkat risiko</li>
          <li><strong>Pilih approver</strong> — Manager dan Senior Manager untuk pengesahan</li>
          <li><strong>Isi konten per section:</strong> Tujuan, Ruang Lingkup, Definisi, Langkah Kerja, dll.</li>
          <li><strong>Section tipe tabel</strong> — klik "Tambah Baris" untuk mengisi data tabular</li>
          <li><strong>Section tipe richtext</strong> — gunakan toolbar formatting (bold, italic, list)</li>
          <li><strong>Klik "Simpan Draft"</strong> untuk menyimpan progress</li>
          <li><strong>Klik "Submit Review"</strong> untuk mengirim ke Asman</li>
        </ol>

        <h4>${icon('edit', 16)} Mengedit Dokumen</h4>
        <p>Dokumen dengan status <span class="badge badge-draft">Draft</span> bisa diedit langsung dari Master Data IK.
        Dokumen yang dikembalikan untuk revisi juga otomatis kembali ke status Draft.</p>

        <h4>${icon('eye', 16)} Preview & Cetak</h4>
        <p>Dari tabel Master Data IK, klik tombol <strong>Preview</strong> untuk melihat dokumen dalam format resmi PLN NP.
        Tersedia opsi download PDF dan cetak langsung.</p>

        <h4>${icon('archive', 16)} Arsip Dokumen</h4>
        <p>Dokumen yang sudah Published bisa diarsipkan oleh Senior Manager jika sudah tidak berlaku lagi.</p>
      </div>
    `,
    approval: `
      <div class="help-section">
        <h4>${icon('git-compare', 16)} Alur Approval 3-Tier</h4>
        <p>Brantas DMS menggunakan sistem persetujuan berjenjang untuk memastikan kualitas dokumen IK:</p>

        <div class="help-approval-flow">
          <div class="help-flow-step">
            <div class="help-flow-badge" style="background:var(--warning-bg);color:var(--warning)">Draft</div>
            <div class="help-flow-desc">Penyusun membuat dan melengkapi dokumen</div>
          </div>
          <div class="help-flow-arrow">${icon('arrow-down', 16)}</div>
          <div class="help-flow-step">
            <div class="help-flow-badge" style="background:#E6F0FF;color:var(--pln-blue-700)">Submit</div>
            <div class="help-flow-desc">Penyusun mengirim untuk review</div>
          </div>
          <div class="help-flow-arrow">${icon('arrow-down', 16)}</div>
          <div class="help-flow-step">
            <div class="help-flow-badge" style="background:#FFF4E6;color:#E65100">Review (Asman)</div>
            <div class="help-flow-desc">Asst. Manager mereview konten teknis</div>
          </div>
          <div class="help-flow-arrow">${icon('arrow-down', 16)}</div>
          <div class="help-flow-step">
            <div class="help-flow-badge" style="background:#E3FCEF;color:var(--success)">Approved-T1 (Manager)</div>
            <div class="help-flow-desc">Manager Sub-bidang approve dokumen</div>
          </div>
          <div class="help-flow-arrow">${icon('arrow-down', 16)}</div>
          <div class="help-flow-step">
            <div class="help-flow-badge" style="background:#E8F5E9;color:#1B5E20">Pengesahan (SM)</div>
            <div class="help-flow-desc">Senior Manager mengesahkan — dokumen Published</div>
          </div>
        </div>

        <h4 style="margin-top:20px">${icon('rotate-ccw', 16)} Return Revisi & Reject</h4>
        <p><strong>Return Revisi</strong> — Setiap tier bisa mengembalikan dokumen ke penyusun untuk perbaikan.
        Dokumen kembali ke status Draft dan bisa diedit ulang.</p>
        <p><strong>Reject</strong> — Menolak dokumen secara permanen. Dokumen tidak bisa diproses lebih lanjut.</p>

        <h4>${icon('alert-triangle', 16)} Aturan Penting</h4>
        <ul class="help-list">
          <li><strong>Self-review prevention:</strong> Asman tidak bisa mereview dokumen yang ia susun sendiri</li>
          <li><strong>Sequential:</strong> Harus berurutan — tidak bisa loncat tier</li>
          <li><strong>Audit trail:</strong> Setiap aksi approval tercatat di history dokumen</li>
        </ul>
      </div>
    `,
    lapangan: `
      <div class="help-section">
        <h4>${icon('scan', 16)} QR Code di Lapangan</h4>
        <p>Setiap dokumen IK yang sudah Published otomatis memiliki QR Code. Alur penggunaan:</p>
        <ol class="help-steps-list">
          <li>Admin/penyusun download QR Code dari halaman QR Code Manager</li>
          <li>QR Code dicetak dan ditempel di equipment/lokasi kerja terkait</li>
          <li>Teknisi di lapangan scan QR menggunakan HP</li>
          <li>Langsung redirect ke dokumen IK yang relevan</li>
          <li>Sistem mencatat setiap scan (statistik utilisasi)</li>
        </ol>

        <h4>${icon('settings', 16)} Master Equipment</h4>
        <p>Database aset fisik PLTA yang terintegrasi dengan dokumen IK:</p>
        <ul class="help-list">
          <li>Setiap equipment menampilkan <strong>IK terkait</strong></li>
          <li>Status equipment: Operasi, Inspeksi, Maintenance, Nonaktif</li>
          <li>Grouped by sistem: Pembangkitan, Hidrolika, dll.</li>
          <li>Membantu auditor memverifikasi: <em>"Apakah setiap aset kritis sudah punya IK?"</em></li>
        </ul>

        <h4>${icon('bar-chart-3', 16)} Statistik QR Scan</h4>
        <p>Panel statistik menampilkan:</p>
        <ul class="help-list">
          <li>Jumlah scan hari ini dan bulan ini</li>
          <li>Top dokumen yang paling sering di-scan</li>
          <li>Bukti bahwa IK benar-benar digunakan di lapangan (untuk audit IMS)</li>
        </ul>
      </div>
    `,
    admin: `
      <div class="help-section">
        <h4>${icon('users', 16)} Pengguna & Akses</h4>
        <p>Halaman untuk mengelola semua pengguna sistem:</p>
        <ul class="help-list">
          <li>Tambah/edit/nonaktifkan pengguna</li>
          <li>Assign role (Super Admin, Admin, SM, Manager, Asman, Doc Owner, Viewer)</li>
          <li>Reset password pengguna</li>
        </ul>

        <h4>${icon('shield', 16)} Role & Permission</h4>
        <p>Kelola role dan permission matrix. Setiap role memiliki set permission yang menentukan akses fitur.</p>

        <h4>${icon('smartphone', 16)} Sesi Aktif</h4>
        <p>Monitor real-time siapa saja yang sedang login:</p>
        <ul class="help-list">
          <li>Lihat device, IP, waktu login, dan status aktif</li>
          <li><strong>Force logout</strong> — putuskan sesi jika ada aktivitas mencurigakan</li>
        </ul>

        <h4>${icon('folder-open', 16)} Template Engine</h4>
        <p>Kelola template dokumen IK:</p>
        <ul class="help-list">
          <li>Aktifkan/nonaktifkan section dalam template</li>
          <li>Sesuaikan urutan section</li>
          <li>Definisikan kolom tabel untuk setiap section</li>
        </ul>

        <h4>${icon('settings', 16)} Pengaturan</h4>
        <p>Konfigurasi sistem: backup database, export audit log, cloud path, general settings.</p>
      </div>
    `
  };
  return contents[tab] || contents.overview;
}

// ─── FAQ ─────────────────────────────────────────
function renderFAQ() {
  const faqs = [
    { q: 'Bagaimana cara mengubah password?', a: 'Klik tombol "Ganti Password" di bagian bawah sidebar, masukkan password lama dan password baru.' },
    { q: 'Kenapa saya tidak bisa membuat IK baru?', a: 'Hanya role dengan permission "doc.create" (Asst. Manager, Document Owner, Admin, Super Admin) yang bisa membuat dokumen baru. Hubungi Admin jika Anda memerlukan akses.' },
    { q: 'Dokumen saya dikembalikan untuk revisi, apa yang harus dilakukan?', a: 'Buka halaman Alur Persetujuan, cari dokumen di tab "Draft", lalu klik Edit untuk memperbaiki. Setelah diperbaiki, submit kembali untuk review.' },
    { q: 'Bagaimana cara mencetak dokumen IK?', a: 'Buka Master Data IK, klik Preview pada dokumen yang diinginkan, lalu gunakan tombol PDF/Print pada halaman preview.' },
    { q: 'Apa bedanya Review, Approve, dan Pengesahan?', a: 'Review (Asman) = cek teknis konten. Approve (Manager) = persetujuan manajerial. Pengesahan (SM) = pengesahan final sebelum dokumen berlaku resmi.' },
    { q: 'Apakah saya bisa me-review dokumen yang saya buat sendiri?', a: 'Tidak. Sistem mencegah self-review untuk menjaga integritas approval. Dokumen harus direview oleh Asman yang berbeda dari penyusun.' },
    { q: 'Bagaimana QR Code digunakan di lapangan?', a: 'QR Code dicetak dan ditempel di equipment. Teknisi scan dengan HP untuk langsung mengakses IK terkait tanpa perlu login ke komputer.' },
    { q: 'Apa itu Compliance Rate di Laporan?', a: 'Persentase dokumen IK yang dikelola sesuai standar: published tepat waktu, tidak overdue review, dan sesuai format template.' },
  ];

  return faqs.map((faq, i) => `
    <div class="help-faq-item" onclick="toggleFaq(this)">
      <div class="help-faq-q">
        <span>${icon('help-circle', 14)} ${esc(faq.q)}</span>
        <span class="help-faq-chevron">${icon('chevron-down', 14)}</span>
      </div>
      <div class="help-faq-a">${esc(faq.a)}</div>
    </div>
  `).join('');
}

function toggleFaq(el) {
  el.classList.toggle('open');
}

// ─── WORKFLOW DIAGRAM ────────────────────────────
function renderWorkflowDiagram() {
  return `
    <div class="help-workflow-diagram">
      <div class="help-wf-node help-wf-draft">
        <div class="help-wf-node-icon">${icon('file-edit', 18)}</div>
        <div class="help-wf-node-label">Draft</div>
        <div class="help-wf-node-role">Penyusun</div>
      </div>
      <div class="help-wf-connector">${icon('arrow-right', 16)}<span>Submit</span></div>
      <div class="help-wf-node help-wf-review">
        <div class="help-wf-node-icon">${icon('search', 18)}</div>
        <div class="help-wf-node-label">Review</div>
        <div class="help-wf-node-role">Asman</div>
      </div>
      <div class="help-wf-connector">${icon('arrow-right', 16)}<span>Approve</span></div>
      <div class="help-wf-node help-wf-t1">
        <div class="help-wf-node-icon">${icon('check-circle', 18)}</div>
        <div class="help-wf-node-label">Approved</div>
        <div class="help-wf-node-role">Manager</div>
      </div>
      <div class="help-wf-connector">${icon('arrow-right', 16)}<span>Sahkan</span></div>
      <div class="help-wf-node help-wf-published">
        <div class="help-wf-node-icon">${icon('badge-check', 18)}</div>
        <div class="help-wf-node-label">Published</div>
        <div class="help-wf-node-role">Senior Manager</div>
      </div>
    </div>
    <div style="text-align:center;margin-top:12px;font-size:12px;color:var(--text-tertiary)">
      ${icon('rotate-ccw', 12)} Setiap tier bisa <strong>Return Revisi</strong> (kembali ke Draft) atau <strong>Reject</strong>
    </div>
  `;
}

// ─── GUIDED TOUR ─────────────────────────────────
const TOUR_STEPS = [
  {
    target: '.sidebar-nav',
    title: 'Navigasi Sidebar',
    desc: 'Menu utama aplikasi. Klik item untuk berpindah halaman. Sidebar bisa di-minimize dengan tombol di topbar.',
    position: 'right'
  },
  {
    target: '#globalSearch',
    title: 'Pencarian Global',
    desc: 'Ketik untuk mencari dokumen IK dari halaman mana saja. Hasil pencarian muncul secara real-time.',
    position: 'bottom'
  },
  {
    target: '.tb-icon-btn',
    title: 'Notifikasi',
    desc: 'Klik ikon lonceng untuk melihat notifikasi approval, review, dan aktivitas terbaru.',
    position: 'bottom'
  },
  {
    target: '.sb-user',
    title: 'Profil & Role Anda',
    desc: 'Informasi user yang sedang login. Di sini juga tersedia tombol Logout dan Ganti Password.',
    position: 'top'
  },
  {
    target: '[onclick*="dashboard"]',
    title: 'Dashboard',
    desc: 'Halaman utama dengan ringkasan status dokumen, pending tasks, dan statistik cepat.',
    position: 'right'
  },
  {
    target: '[onclick*="master-ik"]',
    title: 'Master Data IK',
    desc: 'Repository semua dokumen IK. Filter, cari, preview, dan kelola dokumen dari sini.',
    position: 'right'
  },
  {
    target: '[onclick*="workflow"]',
    title: 'Alur Persetujuan',
    desc: 'Pipeline approval 3-tier. Lihat status dokumen di setiap tahap dan lakukan aksi (review/approve/reject).',
    position: 'right'
  }
];

let tourCurrentStep = 0;
let tourOverlay = null;

function startGuidedTour() {
  tourCurrentStep = 0;
  showTourStep();
}

function showTourStep() {
  // Remove existing overlay
  closeTour(true);

  if (tourCurrentStep >= TOUR_STEPS.length) {
    showToast('Tur selesai! Selamat menggunakan Brantas DMS.', 'success');
    return;
  }

  const step = TOUR_STEPS[tourCurrentStep];
  const target = document.querySelector(step.target);
  if (!target) {
    tourCurrentStep++;
    showTourStep();
    return;
  }

  // Create overlay
  tourOverlay = document.createElement('div');
  tourOverlay.className = 'tour-overlay';
  tourOverlay.innerHTML = `<div class="tour-backdrop" onclick="closeTour()"></div>`;
  document.body.appendChild(tourOverlay);

  // Highlight target
  const rect = target.getBoundingClientRect();
  const highlight = document.createElement('div');
  highlight.className = 'tour-highlight';
  highlight.style.top = (rect.top - 4) + 'px';
  highlight.style.left = (rect.left - 4) + 'px';
  highlight.style.width = (rect.width + 8) + 'px';
  highlight.style.height = (rect.height + 8) + 'px';
  tourOverlay.appendChild(highlight);

  // Tooltip
  const tooltip = document.createElement('div');
  tooltip.className = `tour-tooltip tour-pos-${step.position}`;

  // Position tooltip
  switch (step.position) {
    case 'right':
      tooltip.style.top = rect.top + 'px';
      tooltip.style.left = (rect.right + 16) + 'px';
      break;
    case 'bottom':
      tooltip.style.top = (rect.bottom + 16) + 'px';
      tooltip.style.left = rect.left + 'px';
      break;
    case 'top':
      tooltip.style.bottom = (window.innerHeight - rect.top + 16) + 'px';
      tooltip.style.left = rect.left + 'px';
      break;
    case 'left':
      tooltip.style.top = rect.top + 'px';
      tooltip.style.right = (window.innerWidth - rect.left + 16) + 'px';
      break;
  }

  tooltip.innerHTML = `
    <div class="tour-tooltip-header">
      <span class="tour-step-badge">${tourCurrentStep + 1}/${TOUR_STEPS.length}</span>
      <button class="tour-close" onclick="closeTour()">&times;</button>
    </div>
    <div class="tour-tooltip-title">${step.title}</div>
    <div class="tour-tooltip-desc">${step.desc}</div>
    <div class="tour-tooltip-actions">
      ${tourCurrentStep > 0 ? `<button class="btn btn-secondary btn-sm" onclick="tourPrev()">${icon('chevron-left', 14)} Sebelumnya</button>` : '<span></span>'}
      <button class="btn btn-primary btn-sm" onclick="tourNext()">${tourCurrentStep < TOUR_STEPS.length - 1 ? `Selanjutnya ${icon('chevron-right', 14)}` : `${icon('check', 14)} Selesai`}</button>
    </div>
  `;
  tourOverlay.appendChild(tooltip);
  renderIcons();
}

function tourNext() {
  tourCurrentStep++;
  showTourStep();
}

function tourPrev() {
  tourCurrentStep--;
  showTourStep();
}

function closeTour(skipToast) {
  if (tourOverlay) {
    tourOverlay.remove();
    tourOverlay = null;
  }
}

// ─── HELP BUTTON QUICK OPEN (from topbar) ────────
function openHelpQuick() {
  showPage('help');
}
