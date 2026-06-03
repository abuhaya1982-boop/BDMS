// ═══════════════════════════════════════════════════════════════
// Pengaturan / Settings Page — Brantas DMS v3
// ═══════════════════════════════════════════════════════════════

let _settingsData = {};

async function renderPengaturan(container) {
  container.innerHTML = `<div class="page active" id="page-pengaturan"></div>`;

  try {
    const res = await API.getSettings();
    _settingsData = res.data || {};
  } catch (e) { _settingsData = {}; }

  const s = _settingsData;
  const backupUrls = Array.isArray(s.cloud_backup_urls) ? s.cloud_backup_urls : [];

  document.getElementById('page-pengaturan').innerHTML = `
    <div class="page-header" style="margin-bottom:8px">
      <div class="page-header-left">
        <div class="page-title">Pengaturan Sistem</div>
        <div class="page-subtitle">Konfigurasi Brantas DMS untuk PLN Nusantara Power UP Brantas</div>
      </div>
      <div class="page-actions">
        <button class="btn btn-secondary btn-sm" onclick="exportSettingsJSON()" title="Ekspor pengaturan sebagai JSON">${icon('download', 14)} Ekspor</button>
      </div>
    </div>

    <div class="tabs" style="margin-bottom:0">
      <div class="tab active" onclick="switchSettingsTab(this,'set-tab-umum')">Umum</div>
      <div class="tab" onclick="switchSettingsTab(this,'set-tab-cloud')">Cloud & Backup</div>
      <div class="tab" onclick="switchSettingsTab(this,'set-tab-dokumen')">Dokumen</div>
      <div class="tab" onclick="switchSettingsTab(this,'set-tab-notif')">Notifikasi</div>
      <div class="tab" onclick="switchSettingsTab(this,'set-tab-keamanan')">Keamanan & Data</div>
    </div>

    <!-- ═══ TAB: UMUM ═══ -->
    <div id="set-tab-umum" class="tab-content active">
      <div class="card">
        <div class="card-header"><div class="card-title">${icon('building', 14)} Identitas Instansi</div></div>
        <div class="card-body">
          <div class="form-grid" style="grid-template-columns:1fr 1fr">
            <div class="form-group">
              <label class="form-label">Nama Instansi <span class="required">*</span></label>
              <input type="text" class="form-control" id="set-instansi" value="${esc(s.instansi || 'PT PLN Nusantara Power UP Brantas')}">
            </div>
            <div class="form-group">
              <label class="form-label">Kode Unit (Segment 2 CoA)</label>
              <div style="display:flex;gap:8px">
                <input type="text" class="form-control mono" id="set-kode-coa" value="${esc(s.kode_unit_coa || 'BR')}" style="width:80px" maxlength="4">
                <input type="text" class="form-control" id="set-nama-coa" value="${esc(s.nama_unit_coa || 'Brantas')}" style="flex:1" placeholder="Nama unit">
              </div>
              <div style="font-size:11px;color:var(--text-tertiary);margin-top:4px">Digunakan sebagai prefix penomoran dokumen: IK<strong id="preview-coa">${esc(s.kode_unit_coa || 'BR')}</strong></div>
            </div>
          </div>
          <div style="margin-top:14px;text-align:right">
            <button class="btn btn-primary" onclick="saveSettingsUmum()">${icon('save', 14)} Simpan Identitas</button>
          </div>
        </div>
      </div>
    </div>

    <!-- ═══ TAB: CLOUD & BACKUP ═══ -->
    <div id="set-tab-cloud" class="tab-content">
      <div class="card">
        <div class="card-header">
          <div class="card-title">${icon('cloud', 14)} Cloud Storage Utama</div>
        </div>
        <div class="card-body">
          <div class="alert alert-info" style="margin-bottom:14px"><div class="alert-icon">${icon('info', 14)}</div><div style="font-size:12px">Base URL cloud digunakan pada <strong>QR Code dokumen IK</strong> dan <strong>path referensi GDrive</strong> di halaman cetak. Format path: <code>[Base URL]/[Nama_Unit]/[Nomor_Dokumen]/</code></div></div>
          <div class="form-group" style="margin-bottom:14px">
            <label class="form-label">Base URL Cloud / GDrive (Utama)</label>
            <div style="display:flex;gap:8px">
              <input type="url" class="form-control mono" id="set-cloud-url" value="${esc(s.cloud_base_url || '')}" placeholder="https://drive.google.com/drive/folders/xxx" style="flex:1" oninput="updateCloudPreview()">
              <button class="btn btn-secondary btn-sm" onclick="testCloudUrl('set-cloud-url')" title="Test URL">${icon('external-link', 14)}</button>
            </div>
          </div>
          <div class="form-group" style="margin-bottom:14px">
            <label class="form-label">Preview Path Dokumen</label>
            <div class="form-control mono" style="background:var(--surface-2);font-size:11px;color:var(--text-secondary);cursor:default;word-break:break-all" id="set-cloud-preview"></div>
          </div>
          <div style="text-align:right">
            <button class="btn btn-primary" onclick="saveCloudSettings()">${icon('save', 14)} Simpan Cloud Utama</button>
          </div>
        </div>
      </div>

      <div class="card" style="margin-top:12px">
        <div class="card-header">
          <div class="card-title">${icon('copy', 14)} URL Backup Tambahan</div>
          <button class="btn btn-secondary btn-sm" onclick="addBackupUrl()">${icon('plus', 14)} Tambah</button>
        </div>
        <div class="card-body">
          <div class="alert alert-warning" style="margin-bottom:14px"><div class="alert-icon">${icon('alert-triangle', 14)}</div><div style="font-size:12px">URL backup tambahan bersifat <strong>opsional</strong>. Digunakan untuk menyimpan referensi link backup dokumen selain cloud utama (misal: SharePoint, NAS internal, OneDrive, dsb).</div></div>
          <div id="backup-urls-list" style="display:flex;flex-direction:column;gap:10px">
            ${backupUrls.length === 0 ? '<div style="text-align:center;padding:16px;color:var(--text-tertiary);font-size:12.5px" id="no-backup-msg">Belum ada URL backup tambahan</div>' : ''}
          </div>
          <div style="margin-top:14px;text-align:right">
            <button class="btn btn-primary" onclick="saveBackupUrls()">${icon('save', 14)} Simpan Backup URLs</button>
          </div>
        </div>
      </div>
    </div>

    <!-- ═══ TAB: DOKUMEN ═══ -->
    <div id="set-tab-dokumen" class="tab-content">
      <div class="card">
        <div class="card-header"><div class="card-title">${icon('file-text', 14)} Konfigurasi Dokumen IK</div></div>
        <div class="card-body">
          <div class="form-grid" style="grid-template-columns:1fr 1fr">
            <div class="form-group">
              <label class="form-label">Periode Review IK (bulan)</label>
              <input type="number" class="form-control" id="set-review-period" value="${s.review_period || '12'}" min="1" max="60" style="width:120px">
              <div style="font-size:11px;color:var(--text-tertiary);margin-top:4px">Setiap IK wajib direview setelah periode ini. Standar: 12 bulan.</div>
            </div>
            <div class="form-group">
              <label class="form-label">Auto-Arsip Setelah (bulan)</label>
              <input type="number" class="form-control" id="set-auto-archive" value="${s.auto_archive_months || '0'}" min="0" max="120" style="width:120px">
              <div style="font-size:11px;color:var(--text-tertiary);margin-top:4px">Dokumen Published otomatis diarsipkan setelah N bulan. 0 = nonaktif.</div>
            </div>
            <div class="form-group">
              <label class="form-label">Maks Ukuran Lampiran (MB)</label>
              <input type="number" class="form-control" id="set-max-file" value="${s.max_file_size_mb || '10'}" min="1" max="100" style="width:120px">
              <div style="font-size:11px;color:var(--text-tertiary);margin-top:4px">Batas ukuran file per lampiran dokumen.</div>
            </div>
          </div>
          <div style="margin-top:4px">
            <label style="display:flex;align-items:center;gap:8px;font-size:13px;cursor:pointer">
              <input type="checkbox" id="set-watermark" ${s.watermark_draft !== false ? 'checked' : ''} style="accent-color:var(--pln-blue-600)">
              Tampilkan watermark <strong>"DRAFT"</strong> pada dokumen dengan status Draft/Review
            </label>
          </div>
          <div style="margin-top:14px;text-align:right">
            <button class="btn btn-primary" onclick="saveSettingsDokumen()">${icon('save', 14)} Simpan Konfigurasi Dokumen</button>
          </div>
        </div>
      </div>

      <div class="card" style="margin-top:12px">
        <div class="card-header"><div class="card-title">${icon('hash', 14)} Preview Format Penomoran</div></div>
        <div class="card-body">
          <div style="display:grid;grid-template-columns:repeat(4,auto) 1fr;gap:0;align-items:center;font-size:13px">
            <div style="padding:8px 12px;background:var(--pln-blue-600);color:#fff;font-weight:700;font-family:var(--mono);border-radius:6px 0 0 6px">IK${esc(s.kode_unit_coa || 'BR')}</div>
            <div style="padding:8px 4px;color:var(--text-tertiary);font-size:16px">-</div>
            <div style="padding:8px 12px;background:var(--surface-2);font-weight:600;font-family:var(--mono)">327</div>
            <div style="padding:8px 4px;color:var(--text-tertiary);font-size:16px">-</div>
            <div style="display:flex;align-items:center;gap:4px">
              <span style="padding:8px 12px;background:var(--surface-2);font-weight:600;font-family:var(--mono)">10.1.3.c.b</span>
              <span style="padding:8px 4px;color:var(--text-tertiary);font-size:16px">-</span>
              <span style="padding:8px 12px;background:var(--success);color:#fff;font-weight:700;font-family:var(--mono);border-radius:0 6px 6px 0">001</span>
            </div>
          </div>
          <div style="display:grid;grid-template-columns:repeat(4,auto) 1fr;gap:4px;margin-top:6px;font-size:10.5px;color:var(--text-tertiary)">
            <div style="text-align:center;padding:0 12px">Prefix + CoA</div>
            <div></div>
            <div style="text-align:center">Kode Unit</div>
            <div></div>
            <div style="display:flex;gap:4px">
              <span style="text-align:center;flex:1">Nomor Probis</span>
              <span></span>
              <span style="text-align:center">Urut</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ═══ TAB: NOTIFIKASI ═══ -->
    <div id="set-tab-notif" class="tab-content">
      <div class="card">
        <div class="card-header"><div class="card-title">${icon('bell', 14)} Pengaturan Notifikasi</div></div>
        <div class="card-body">
          <div class="form-group" style="margin-bottom:16px">
            <label class="form-label">Peringatan Sebelum Overdue (hari)</label>
            <input type="number" class="form-control" id="set-notif-days" value="${s.notif_days || '30'}" min="1" max="90" style="width:120px">
            <div style="font-size:11px;color:var(--text-tertiary);margin-top:4px">Notifikasi dikirim H-N hari sebelum dokumen IK melewati periode review.</div>
          </div>
          <div class="section-heading" style="margin-bottom:10px">Jenis Notifikasi Aktif</div>
          <div style="display:flex;flex-direction:column;gap:10px">
            <label style="display:flex;align-items:flex-start;gap:10px;padding:10px 14px;background:var(--surface-2);border-radius:var(--radius);cursor:pointer">
              <input type="checkbox" id="set-notif-overdue" ${s.notif_overdue !== false ? 'checked' : ''} style="accent-color:var(--pln-blue-600);margin-top:2px">
              <div>
                <div style="font-weight:600;font-size:13px">${icon('clock', 14)} Overdue Review</div>
                <div style="font-size:11.5px;color:var(--text-secondary);margin-top:2px">Kirim notifikasi ketika dokumen IK melewati periode review tahunan</div>
              </div>
            </label>
            <label style="display:flex;align-items:flex-start;gap:10px;padding:10px 14px;background:var(--surface-2);border-radius:var(--radius);cursor:pointer">
              <input type="checkbox" id="set-notif-approval" ${s.notif_approval !== false ? 'checked' : ''} style="accent-color:var(--pln-blue-600);margin-top:2px">
              <div>
                <div style="font-weight:600;font-size:13px">${icon('check-circle', 14)} Approval Request</div>
                <div style="font-size:11.5px;color:var(--text-secondary);margin-top:2px">Kirim notifikasi kepada Approver saat ada dokumen yang disubmit untuk review</div>
              </div>
            </label>
            <label style="display:flex;align-items:flex-start;gap:10px;padding:10px 14px;background:var(--surface-2);border-radius:var(--radius);cursor:pointer">
              <input type="checkbox" id="set-notif-publish" ${s.notif_publish !== false ? 'checked' : ''} style="accent-color:var(--pln-blue-600);margin-top:2px">
              <div>
                <div style="font-weight:600;font-size:13px">${icon('globe', 14)} Dokumen Dipublish</div>
                <div style="font-size:11.5px;color:var(--text-secondary);margin-top:2px">Kirim notifikasi kepada semua pengguna saat dokumen IK baru dipublish</div>
              </div>
            </label>
            <label style="display:flex;align-items:flex-start;gap:10px;padding:10px 14px;background:var(--surface-2);border-radius:var(--radius);cursor:pointer">
              <input type="checkbox" id="set-notif-revision" ${s.notif_revision !== false ? 'checked' : ''} style="accent-color:var(--pln-blue-600);margin-top:2px">
              <div>
                <div style="font-weight:600;font-size:13px">${icon('rotate-ccw', 14)} Revisi / Dikembalikan</div>
                <div style="font-size:11.5px;color:var(--text-secondary);margin-top:2px">Kirim notifikasi kepada Document Owner saat dokumen dikembalikan untuk revisi</div>
              </div>
            </label>
          </div>
          <div style="margin-top:16px;text-align:right">
            <button class="btn btn-primary" onclick="saveSettingsNotif()">${icon('save', 14)} Simpan Notifikasi</button>
          </div>
        </div>
      </div>
    </div>

    <!-- ═══ TAB: KEAMANAN & DATA ═══ -->
    <div id="set-tab-keamanan" class="tab-content">
      <div class="grid-2">
        <div class="card">
          <div class="card-header"><div class="card-title">${icon('shield', 14)} Status Keamanan</div></div>
          <div class="card-body">
            <div style="display:flex;flex-direction:column;gap:8px">
              <div style="display:flex;align-items:center;gap:8px;padding:8px 12px;background:var(--surface-2);border-radius:var(--radius)">
                <span style="color:var(--success)">${icon('check-circle', 16)}</span>
                <div>
                  <div style="font-weight:600;font-size:12.5px">Enkripsi AES-256</div>
                  <div style="font-size:11px;color:var(--text-tertiary)">Data terenkripsi saat tersimpan dan dalam transit (SSL/TLS)</div>
                </div>
              </div>
              <div style="display:flex;align-items:center;gap:8px;padding:8px 12px;background:var(--surface-2);border-radius:var(--radius)">
                <span style="color:var(--success)">${icon('check-circle', 16)}</span>
                <div>
                  <div style="font-weight:600;font-size:12.5px">Audit Trail</div>
                  <div style="font-size:11px;color:var(--text-tertiary)">Semua tindakan pengguna dicatat lengkap dengan timestamp</div>
                </div>
              </div>
              <div style="display:flex;align-items:center;gap:8px;padding:8px 12px;background:var(--surface-2);border-radius:var(--radius)">
                <span style="color:var(--success)">${icon('check-circle', 16)}</span>
                <div>
                  <div style="font-weight:600;font-size:12.5px">RBAC (Role-Based Access)</div>
                  <div style="font-size:11px;color:var(--text-tertiary)">Kontrol akses granular berdasarkan role dan permission</div>
                </div>
              </div>
              <div style="display:flex;align-items:center;gap:8px;padding:8px 12px;background:var(--surface-2);border-radius:var(--radius)">
                <span style="color:var(--pln-blue-600)">${icon('info', 16)}</span>
                <div>
                  <div style="font-weight:600;font-size:12.5px">SQLite Backend</div>
                  <div style="font-size:11px;color:var(--text-tertiary)">Data tersimpan di database server (production mode)</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="card">
          <div class="card-header"><div class="card-title">${icon('database', 14)} Manajemen Data</div></div>
          <div class="card-body">
            <div style="display:flex;flex-direction:column;gap:8px">
              <div style="padding:10px 14px;background:var(--surface-2);border-radius:var(--radius);display:flex;justify-content:space-between;align-items:center">
                <div>
                  <div style="font-weight:600;font-size:12.5px">Statistik Database</div>
                  <div style="font-size:11px;color:var(--text-tertiary)" id="set-db-stats">Menghitung...</div>
                </div>
                <button class="btn btn-secondary btn-xs" onclick="refreshDbStats()">${icon('refresh-cw', 13)}</button>
              </div>
              <button class="btn btn-secondary" onclick="exportDatabaseJSON()">${icon('download', 14)} Ekspor Seluruh Database (JSON)</button>
              <button class="btn btn-secondary" onclick="exportAuditLog()">${icon('file-text', 14)} Unduh Audit Log</button>
              <button class="btn btn-secondary" onclick="triggerBackup()">${icon('upload-cloud', 14)} Simulasi Backup Manual</button>
              <hr style="border-color:var(--border);margin:4px 0">
              <button class="btn btn-danger btn-sm" onclick="resetDatabase()" style="width:100%">${icon('alert-triangle', 14)} Reset Database ke Default</button>
              <div style="font-size:10.5px;color:var(--text-tertiary);text-align:center">Menghapus semua data dan mengembalikan ke kondisi awal (seed data).</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  renderIcons();
  updateCloudPreview();
  renderBackupUrlItems(backupUrls);
  refreshDbStats();

  // Live preview for CoA code
  const coaInput = document.getElementById('set-kode-coa');
  if (coaInput) {
    coaInput.addEventListener('input', () => {
      const el = document.getElementById('preview-coa');
      if (el) el.textContent = coaInput.value || 'BR';
    });
  }
}

// ─── Tab Switching ───────────────────────────
function switchSettingsTab(el, tabId) {
  document.querySelectorAll('#page-pengaturan .tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('#page-pengaturan .tab-content').forEach(c => c.classList.remove('active'));
  el.classList.add('active');
  document.getElementById(tabId)?.classList.add('active');
}

// ─── Cloud Preview ───────────────────────────
function updateCloudPreview() {
  const url = document.getElementById('set-cloud-url')?.value || '';
  const el = document.getElementById('set-cloud-preview');
  if (!el) return;
  const base = url ? url.replace(/\/+$/, '') : 'G:/IMS_UP_Brantas/Instruksi_Kerja';
  el.innerHTML = `${esc(base)}/<span style="color:var(--pln-blue-600);font-weight:600">[Nama_Unit]</span>/<span style="color:var(--success);font-weight:600">[Nomor_Dokumen]</span>/`;
}

function testCloudUrl(inputId) {
  const url = document.getElementById(inputId)?.value;
  if (!url) { showToast('URL belum diisi', 'error'); return; }
  try {
    new URL(url);
    window.open(url, '_blank');
  } catch {
    showToast('Format URL tidak valid', 'error');
  }
}

// ─── Backup URLs ─────────────────────────────
function renderBackupUrlItems(urls) {
  const list = document.getElementById('backup-urls-list');
  if (!list) return;
  const noMsg = document.getElementById('no-backup-msg');
  if (noMsg && urls.length > 0) noMsg.remove();

  // Clear existing items (keep no-msg if empty)
  list.querySelectorAll('.backup-url-item').forEach(el => el.remove());

  urls.forEach((item, idx) => {
    const div = document.createElement('div');
    div.className = 'backup-url-item';
    div.style.cssText = 'display:flex;gap:8px;align-items:flex-start;padding:10px 14px;background:var(--surface-2);border-radius:var(--radius);border-left:3px solid var(--pln-sky)';
    div.innerHTML = `
      <div style="flex:1">
        <div style="display:flex;gap:8px;margin-bottom:6px">
          <input type="text" class="form-control" placeholder="Label (misal: SharePoint, NAS)" value="${esc(item.label || '')}" style="width:200px;font-size:12px" data-backup-label="${idx}">
        </div>
        <div style="display:flex;gap:8px">
          <input type="url" class="form-control mono" placeholder="https://..." value="${esc(item.url || '')}" style="flex:1;font-size:12px" data-backup-url="${idx}">
          <button class="btn btn-secondary btn-xs" onclick="testCloudUrl(this.previousElementSibling.id || '');this.previousElementSibling.id='_tmp_backup_'+${idx};testCloudUrl('_tmp_backup_'+${idx})" title="Test URL">${icon('external-link', 13)}</button>
        </div>
      </div>
      <button class="btn btn-danger btn-xs" onclick="removeBackupUrl(${idx})" title="Hapus" style="margin-top:6px">${icon('trash-2', 13)}</button>
    `;
    list.appendChild(div);
  });
  renderIcons();
}

function addBackupUrl() {
  const list = document.getElementById('backup-urls-list');
  if (!list) return;
  const noMsg = document.getElementById('no-backup-msg');
  if (noMsg) noMsg.remove();

  const currentItems = list.querySelectorAll('.backup-url-item');
  const idx = currentItems.length;
  const div = document.createElement('div');
  div.className = 'backup-url-item';
  div.style.cssText = 'display:flex;gap:8px;align-items:flex-start;padding:10px 14px;background:var(--surface-2);border-radius:var(--radius);border-left:3px solid var(--pln-sky)';
  div.innerHTML = `
    <div style="flex:1">
      <div style="display:flex;gap:8px;margin-bottom:6px">
        <input type="text" class="form-control" placeholder="Label (misal: SharePoint, NAS)" value="" style="width:200px;font-size:12px" data-backup-label="${idx}">
      </div>
      <div style="display:flex;gap:8px">
        <input type="url" class="form-control mono" placeholder="https://..." value="" style="flex:1;font-size:12px" data-backup-url="${idx}" id="_tmp_backup_${idx}">
        <button class="btn btn-secondary btn-xs" onclick="testCloudUrl('_tmp_backup_${idx}')" title="Test URL">${icon('external-link', 13)}</button>
      </div>
    </div>
    <button class="btn btn-danger btn-xs" onclick="this.closest('.backup-url-item').remove()" title="Hapus" style="margin-top:6px">${icon('trash-2', 13)}</button>
  `;
  list.appendChild(div);
  renderIcons();
  // Focus the label input
  div.querySelector('input[data-backup-label]')?.focus();
}

function removeBackupUrl(idx) {
  // Collect current, remove idx, re-render
  const items = collectBackupUrls();
  items.splice(idx, 1);
  renderBackupUrlItems(items);
  if (items.length === 0) {
    const list = document.getElementById('backup-urls-list');
    if (list) list.innerHTML = '<div style="text-align:center;padding:16px;color:var(--text-tertiary);font-size:12.5px" id="no-backup-msg">Belum ada URL backup tambahan</div>';
  }
}

function collectBackupUrls() {
  const items = [];
  document.querySelectorAll('.backup-url-item').forEach(div => {
    const label = div.querySelector('input[data-backup-label]')?.value?.trim() || '';
    const url = div.querySelector('input[data-backup-url]')?.value?.trim() || '';
    if (url) items.push({ label, url });
  });
  return items;
}

// ─── Save Functions ──────────────────────────
async function saveSettingsUmum() {
  const instansi = document.getElementById('set-instansi')?.value?.trim();
  if (!instansi) { showToast('Nama instansi wajib diisi', 'error'); return; }
  try {
    await API.saveSettings({
      instansi,
      kode_unit_coa: document.getElementById('set-kode-coa')?.value?.trim() || 'BR',
      nama_unit_coa: document.getElementById('set-nama-coa')?.value?.trim() || 'Brantas',
    });
    showToast('Identitas instansi disimpan', 'success');
  } catch (e) { showToast('Gagal: ' + e.message, 'error'); }
}

async function saveCloudSettings() {
  const url = document.getElementById('set-cloud-url')?.value?.trim() || '';
  // Validate URL format if provided
  if (url) {
    try { new URL(url); } catch {
      showToast('Format URL cloud tidak valid. Gunakan format https://...', 'error');
      return;
    }
  }
  try {
    await API.saveSettings({ cloud_base_url: url });
    updateCloudPreview();
    showToast('Cloud storage utama disimpan. QR Code dokumen akan menggunakan link ini.', 'success');
  } catch (e) { showToast('Gagal: ' + e.message, 'error'); }
}

async function saveBackupUrls() {
  const items = collectBackupUrls();
  // Validate URLs
  for (const item of items) {
    try { new URL(item.url); } catch {
      showToast(`URL backup "${item.label || item.url}" tidak valid`, 'error');
      return;
    }
  }
  try {
    await API.saveSettings({ cloud_backup_urls: items });
    showToast(`${items.length} URL backup disimpan`, 'success');
  } catch (e) { showToast('Gagal: ' + e.message, 'error'); }
}

async function saveSettingsDokumen() {
  try {
    await API.saveSettings({
      review_period: document.getElementById('set-review-period')?.value || '12',
      auto_archive_months: document.getElementById('set-auto-archive')?.value || '0',
      max_file_size_mb: document.getElementById('set-max-file')?.value || '10',
      watermark_draft: document.getElementById('set-watermark')?.checked !== false,
    });
    showToast('Konfigurasi dokumen disimpan', 'success');
  } catch (e) { showToast('Gagal: ' + e.message, 'error'); }
}

async function saveSettingsNotif() {
  try {
    await API.saveSettings({
      notif_days: document.getElementById('set-notif-days')?.value || '30',
      notif_overdue: document.getElementById('set-notif-overdue')?.checked !== false,
      notif_approval: document.getElementById('set-notif-approval')?.checked !== false,
      notif_publish: document.getElementById('set-notif-publish')?.checked !== false,
      notif_revision: document.getElementById('set-notif-revision')?.checked !== false,
    });
    showToast('Pengaturan notifikasi disimpan', 'success');
  } catch (e) { showToast('Gagal: ' + e.message, 'error'); }
}

// ─── Database & Export ───────────────────────
async function refreshDbStats() {
  const el = document.getElementById('set-db-stats');
  if (!el) return;
  try {
    const res = await API.get('settings/db-stats');
    const st = res.data || {};
    el.innerHTML = `${st.documents || 0} dokumen &middot; ${st.users || 0} pengguna &middot; ${st.templates || 0} template &middot; ${st.equipment || 0} equipment &middot; ${st.audit_logs || 0} audit log<br><span style="font-size:10px">Database: <strong>SQLite (${st.db_size || '?'})</strong></span>`;
  } catch (e) {
    el.innerHTML = `<span style="color:var(--danger)">Gagal memuat: ${esc(e.message)}</span>`;
  }
}

async function exportDatabaseJSON() {
  try {
    const res = await API.get('settings/export');
    const data = JSON.stringify(res.data || {}, null, 2);
    _downloadTextFile(data, `bdms-database-${_fileTimestamp()}.json`, 'application/json');
    showToast('Database berhasil diekspor', 'success');
  } catch (e) { showToast('Gagal ekspor: ' + e.message, 'error'); }
}

async function exportAuditLog() {
  try {
    const res = await API.get('audit');
    const logs = res.data || [];
    if (logs.length === 0) { showToast('Tidak ada data audit log', 'info'); return; }
    const header = 'ID,User ID,Aksi,Detail,Tipe,Tanggal';
    const rows = logs.map(l => `${l.id},"${(l.user_id || '')}","${(l.aksi || '').replace(/"/g, '""')}","${(l.detail || '').replace(/"/g, '""')}","${l.tipe || ''}","${l.created_at || ''}"`);
    const csv = [header, ...rows].join('\n');
    _downloadTextFile(csv, `bdms-audit-log-${_fileTimestamp()}.csv`, 'text/csv');
    showToast(`${logs.length} audit log diekspor ke CSV`, 'success');
  } catch (e) { showToast('Gagal ekspor audit: ' + e.message, 'error'); }
}

function exportSettingsJSON() {
  const data = JSON.stringify(_settingsData, null, 2);
  _downloadTextFile(data, `bdms-settings-${_fileTimestamp()}.json`, 'application/json');
  showToast('Pengaturan diekspor', 'success');
}

async function triggerBackup() {
  showToast('Memulai backup...', 'info');
  try {
    const res = await API.get('settings/export');
    const data = JSON.stringify(res.data || {}, null, 2);
    const sizeKB = Math.round(data.length / 1024);
    _downloadTextFile(data, `bdms-backup-${_fileTimestamp()}.json`, 'application/json');
    showToast(`Backup selesai — ${sizeKB} KB data diekspor`, 'success');
  } catch (e) { showToast('Gagal backup: ' + e.message, 'error'); }
}

async function resetDatabase() {
  const ok = await renderConfirmDialog(
    'Reset Database',
    `<div style="text-align:center;margin-bottom:12px"><span style="font-size:40px">&#9888;&#65039;</span></div>
     <div>Tindakan ini akan <strong>menghapus semua data</strong> (dokumen, pengguna, template, audit log, dll) dan mengembalikan database ke kondisi awal (seed data).</div>
     <div style="margin-top:8px;padding:8px 12px;background:#FFF0F0;border-radius:6px;font-size:12px;color:var(--danger)"><strong>Peringatan:</strong> Data yang sudah dihapus tidak dapat dikembalikan. Pastikan Anda sudah mengekspor backup sebelum melanjutkan.</div>`,
    'Ya, Reset Database',
    'Batal'
  );
  if (!ok) return;
  const ok2 = await renderConfirmDialog('Konfirmasi Akhir', 'Apakah Anda yakin ingin mereset seluruh database?', 'Reset Sekarang', 'Batal');
  if (!ok2) return;

  try {
    await API.post('settings/reset-db', {});
    showToast('Database berhasil direset ke kondisi awal. Halaman akan dimuat ulang...', 'success');
    setTimeout(() => location.reload(), 1500);
  } catch (e) { showToast('Gagal reset: ' + e.message, 'error'); }
}

// ─── Helpers ─────────────────────────────────
function _fileTimestamp() {
  const d = new Date();
  return d.getFullYear() + String(d.getMonth() + 1).padStart(2, '0') + String(d.getDate()).padStart(2, '0') + '-' + String(d.getHours()).padStart(2, '0') + String(d.getMinutes()).padStart(2, '0');
}

function _downloadTextFile(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 100);
}
