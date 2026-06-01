// Template Engine Page — Full Section Configuration with Customization
const DEFAULT_SECTIONS = [
  { id: 'change_history', label: 'Riwayat Perubahan', required: false, type: 'table', columns: ['Bagian', 'Uraian Perubahan', 'Revisi', 'Tanggal'] },
  { id: 'tujuan', label: 'Tujuan', required: true, type: 'richtext' },
  { id: 'ruang_lingkup', label: 'Ruang Lingkup', required: true, type: 'richtext' },
  { id: 'definisi', label: 'Definisi & Singkatan', required: false, type: 'table', columns: ['Istilah', 'Penjelasan'] },
  { id: 'dokumen_terkait', label: 'Dokumen Terkait', required: false, type: 'special' },
  { id: 'sdm', label: 'Sumber Daya Manusia', required: true, type: 'table', columns: ['Kompetensi', 'Jumlah', 'Keterangan'] },
  { id: 'tools', label: 'Alat & Perlengkapan', required: true, type: 'table', columns: ['Nama', 'Jumlah', 'Keterangan'] },
  { id: 'material', label: 'Material & Suku Cadang', required: false, type: 'table', columns: ['Nama', 'Jumlah', 'Keterangan'] },
  { id: 'aktivitas_persiapan', label: 'Aktivitas Persiapan', required: true, type: 'richtext' },
  { id: 'aktivitas_pelaksanaan', label: 'Aktivitas Pelaksanaan', required: true, type: 'richtext' },
  { id: 'aktivitas_monitoring', label: 'Aktivitas Monitoring', required: false, type: 'richtext' },
  { id: 'aktivitas_tindak_lanjut', label: 'Aktivitas Tindakan Akhir', required: false, type: 'richtext' },
  { id: 'identifikasi_risiko', label: 'Identifikasi Risiko', required: true, type: 'risk_matrix' },
  { id: 'metode_pengukuran', label: 'Metode Pengukuran', required: false, type: 'table', columns: ['Metode', 'Parameter', 'Keterangan'] },
  { id: 'formulir', label: 'Formulir Terkait', required: false, type: 'richtext' },
  { id: 'data_teknik', label: 'Data Teknik Equipment', required: false, type: 'richtext' },
];

const SECTION_TYPES = [
  { value: 'richtext', label: 'Editor Rich Text', desc: 'WYSIWYG editor dengan format teks (bold, italic, list, gambar)' },
  { value: 'textarea', label: 'Teks Panjang', desc: 'Area teks sederhana tanpa format' },
  { value: 'table', label: 'Tabel', desc: 'Tabel dengan kolom yang dapat dikustomisasi' },
  { value: 'risk_matrix', label: 'Matriks Risiko', desc: 'Tabel identifikasi risiko PLN NP dengan heat map 5x5' },
  { value: 'special', label: 'Renderer Khusus', desc: 'Section dengan renderer khusus bawaan sistem (tidak dapat diubah tipe-nya)' },
];

async function renderTemplates(container) {
  container.innerHTML = `<div class="page active" id="page-template"></div>`;

  try {
    const res = await API.getTemplates();
    const templates = res.data || [];

    document.getElementById('page-template').innerHTML = `
      <div class="page-header">
        <div class="page-header-left">
          <div class="page-title">Template Engine</div>
          <div class="page-subtitle">Kelola versi dan struktur template dokumen IK — template adalah format acuan yang digunakan saat membuat dokumen IK baru</div>
        </div>
        <div class="page-actions">
          <button class="btn btn-primary" onclick="openNewTemplateModal()">${icon('plus', 14)} Template Baru</button>
        </div>
      </div>
      <div class="alert alert-info" style="margin-bottom:12px">
        <div class="alert-icon">${icon('info', 14)}</div>
        <div><strong>Template = Format Acuan:</strong> Perubahan pada template akan langsung digunakan sebagai struktur dokumen IK baru. Anda dapat mengubah label seksi, tipe input, kolom tabel, serta menambah seksi kustom baru.</div>
      </div>
      <div class="alert alert-warning">
        <div class="alert-icon">${icon('alert-triangle', 14)}</div>
        <div>Dokumen IK yang sudah Published/Approved TIDAK akan otomatis berubah saat template baru dirilis. Dokumen yang sudah disetujui harus melalui proses revisi ulang jika ingin mengadopsi template baru.</div>
      </div>
      <div style="display:flex;flex-direction:column;gap:12px" id="templateList">
        ${templates.map(t => renderTemplateCard(t)).join('')}
      </div>
    `;
    renderIcons();
  } catch (e) {
    container.innerHTML = `<div class="page active"><div class="alert alert-danger">${esc(e.message)}</div></div>`;
  }
}

function renderTemplateCard(t) {
  const statusColors = { Aktif: 'badge-success', Legacy: 'badge-amber', Archived: 'badge-archived' };
  const sections = parseSections(t.konten);
  const sectionCount = sections.length || DEFAULT_SECTIONS.filter(s => s.required).length;

  return `
  <div class="card template-card">
    <div style="display:flex;align-items:flex-start;gap:16px;padding:18px 20px">
      <div class="template-icon-wrap">${icon('file-cog', 24)}</div>
      <div style="flex:1;min-width:0">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:4px;flex-wrap:wrap">
          <div style="font-size:15px;font-weight:700">${esc(t.nama)}</div>
          <span class="badge ${statusColors[t.status] || 'badge-gray'}">${esc(t.status)}</span>
          ${t.status === 'Aktif' ? `<span class="badge badge-blue">${icon('check-circle', 12)} Template Aktif</span>` : ''}
        </div>
        <div style="font-size:13px;color:var(--text-secondary);margin-bottom:8px">${esc(t.deskripsi || 'Tidak ada deskripsi')}</div>
        <div style="display:flex;gap:16px;font-size:12px;color:var(--text-tertiary);flex-wrap:wrap">
          <span>${icon('calendar', 13)} Berlaku: ${t.tanggal_berlaku ? formatDate(t.tanggal_berlaku) : '-'}</span>
          <span>${icon('layers', 13)} ${sectionCount} Seksi</span>
          <span>${icon('file-text', 13)} <span class="tpl-ik-count" data-id="${t.id}">-</span> Dokumen IK</span>
          <span class="mono" style="font-size:11px">${esc(t.versi)}</span>
        </div>
      </div>
      <div style="display:flex;gap:8px;flex-shrink:0;flex-wrap:wrap">
        <button class="btn btn-secondary btn-sm" onclick="previewTemplate(${t.id})">${icon('eye', 14)} Preview</button>
        <button class="btn btn-secondary btn-sm" onclick="editTemplateSections(${t.id})">${icon('settings', 14)} Konfigurasi</button>
        <button class="btn btn-secondary btn-sm" onclick="viewTemplateHistory(${t.id})">${icon('history', 14)} Riwayat</button>
        ${t.status !== 'Aktif' ? `<button class="btn btn-primary btn-sm" onclick="activateTemplate(${t.id})">${icon('check', 14)} Aktifkan</button>` : ''}
        ${t.status === 'Aktif' ? `<button class="btn btn-secondary btn-sm" onclick="editTemplateMeta(${t.id})">${icon('edit-3', 14)} Edit</button>` : ''}
        ${t.status !== 'Aktif' ? `<button class="btn btn-danger btn-sm" onclick="deleteTemplate(${t.id})">${icon('trash-2', 14)}</button>` : ''}
      </div>
    </div>
  </div>`;
}

function parseSections(konten) {
  if (!konten) return [];
  try { return JSON.parse(konten); } catch { return []; }
}

function getTemplateSections(konten) {
  const saved = parseSections(konten);
  if (saved.length > 0) return saved;
  return DEFAULT_SECTIONS.filter(s => s.required).map(s => ({ ...s, enabled: true }));
}

// ─── NEW TEMPLATE MODAL ───
function openNewTemplateModal() {
  openGenericModal(
    'Buat Template Baru',
    `
    <div class="alert alert-warning"><div class="alert-icon">${icon('alert-triangle', 14)}</div><div>Template baru hanya berlaku untuk IK yang dibuat setelahnya. IK yang sudah Published tidak akan terpengaruh.</div></div>
    <div class="form-grid">
      <div class="form-group">
        <label class="form-label">Nama Template <span class="required">*</span></label>
        <input type="text" class="form-control" id="tpl-nama" placeholder="Contoh: IK Template v2026.1">
      </div>
      <div class="form-group">
        <label class="form-label">Versi <span class="required">*</span></label>
        <input type="text" class="form-control mono" id="tpl-versi" placeholder="v2026.1">
      </div>
      <div class="form-group full">
        <label class="form-label">Deskripsi / Catatan Perubahan</label>
        <textarea class="form-control" rows="3" id="tpl-deskripsi" placeholder="Jelaskan perubahan signifikan dari versi sebelumnya..."></textarea>
      </div>
      <div class="form-group full">
        <label class="form-label">Basis Template</label>
        <select class="form-control" id="tpl-basis">
          <option value="default">Template Standar IMS 2025 (Default)</option>
          <option value="clone">Duplikasi dari Template Aktif</option>
          <option value="empty">Kosong (Konfigurasi Manual)</option>
        </select>
      </div>
    </div>
    `,
    `<button class="btn btn-secondary" onclick="closeModal('modalGeneric')">Batal</button>
     <button class="btn btn-primary" onclick="saveNewTemplate()">${icon('save', 14)} Simpan Template</button>`
  );
}

async function saveNewTemplate() {
  const nama = document.getElementById('tpl-nama')?.value;
  const versi = document.getElementById('tpl-versi')?.value;
  const deskripsi = document.getElementById('tpl-deskripsi')?.value;
  const basis = document.getElementById('tpl-basis')?.value;

  if (!nama || !versi) { showToast('Nama dan versi wajib diisi', 'error'); return; }

  let konten = '';
  if (basis === 'default') {
    konten = JSON.stringify(DEFAULT_SECTIONS.map(s => ({ ...s, enabled: true })));
  } else if (basis === 'clone') {
    try {
      const res = await API.getTemplates();
      const aktif = (res.data || []).find(t => t.status === 'Aktif');
      if (aktif && aktif.konten) konten = aktif.konten;
      else konten = JSON.stringify(DEFAULT_SECTIONS.map(s => ({ ...s, enabled: s.required })));
    } catch { konten = JSON.stringify(DEFAULT_SECTIONS.map(s => ({ ...s, enabled: s.required }))); }
  }

  try {
    await API.createTemplate({ nama, versi, deskripsi, status: 'Legacy', konten });
    closeModal('modalGeneric');
    showToast('Template berhasil disimpan', 'success');
    showPage('template');
  } catch (e) { showToast('Gagal: ' + e.message, 'error'); }
}

// ─── EDIT TEMPLATE META ───
async function editTemplateMeta(id) {
  try {
    const res = await API.getTemplates();
    const t = (res.data || []).find(x => x.id == id);
    if (!t) { showToast('Template tidak ditemukan', 'error'); return; }

    openGenericModal(
      'Edit Template: ' + esc(t.nama),
      `
      <div class="form-grid">
        <div class="form-group">
          <label class="form-label">Nama Template</label>
          <input type="text" class="form-control" id="tpl-edit-nama" value="${esc(t.nama)}">
        </div>
        <div class="form-group">
          <label class="form-label">Versi</label>
          <input type="text" class="form-control mono" id="tpl-edit-versi" value="${esc(t.versi)}">
        </div>
        <div class="form-group full">
          <label class="form-label">Deskripsi</label>
          <textarea class="form-control" rows="3" id="tpl-edit-deskripsi">${esc(t.deskripsi || '')}</textarea>
        </div>
      </div>
      `,
      `<button class="btn btn-secondary" onclick="closeModal('modalGeneric')">Batal</button>
       <button class="btn btn-primary" onclick="saveTemplateMeta(${id})">${icon('save', 14)} Simpan</button>`
    );
  } catch (e) { showToast('Gagal: ' + e.message, 'error'); }
}

async function saveTemplateMeta(id) {
  const nama = document.getElementById('tpl-edit-nama')?.value;
  const versi = document.getElementById('tpl-edit-versi')?.value;
  const deskripsi = document.getElementById('tpl-edit-deskripsi')?.value;
  if (!nama) { showToast('Nama wajib diisi', 'error'); return; }
  try {
    await API.updateTemplate(id, { nama, versi, deskripsi });
    closeModal('modalGeneric');
    showToast('Template diperbarui', 'success');
    showPage('template');
  } catch (e) { showToast('Gagal: ' + e.message, 'error'); }
}

// ─── SECTION CONFIGURATION (Full Customization) ───
async function editTemplateSections(id) {
  try {
    const res = await API.getTemplates();
    const t = (res.data || []).find(x => x.id == id);
    if (!t) { showToast('Template tidak ditemukan', 'error'); return; }

    const sections = getTemplateSections(t.konten);
    const allSections = DEFAULT_SECTIONS.map(def => {
      const saved = sections.find(s => s.id === def.id);
      return saved ? { ...def, ...saved, enabled: saved.enabled !== false } : { ...def, enabled: def.required };
    });
    // Add custom sections that are not in DEFAULT_SECTIONS
    sections.forEach(s => {
      if (!DEFAULT_SECTIONS.find(d => d.id === s.id)) {
        allSections.push({ ...s, enabled: s.enabled !== false, custom: true });
      }
    });

    window._tplSectionsEdit = allSections;
    window._tplSectionsId = id;

    openGenericModal(
      `Konfigurasi Seksi — ${esc(t.nama)}`,
      renderSectionConfig(allSections),
      `<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
        <button class="btn btn-secondary" onclick="closeModal('modalGeneric')">Batal</button>
        <button class="btn btn-secondary" onclick="addCustomSection()">${icon('plus', 14)} Tambah Seksi Baru</button>
        <button class="btn btn-primary" onclick="saveSectionConfig()">${icon('save', 14)} Simpan Konfigurasi</button>
      </div>`
    );
    renderIcons();
  } catch (e) { showToast('Gagal: ' + e.message, 'error'); }
}

function renderSectionConfig(sections) {
  return `
  <div class="alert alert-info" style="margin-bottom:10px"><div class="alert-icon">${icon('info', 14)}</div><div>Konfigurasi di sini akan langsung digunakan sebagai format dokumen IK baru. Anda dapat mengubah label, tipe input, kolom tabel, menambah seksi kustom, serta mengatur urutan.</div></div>
  <div class="section-config-list" id="sectionConfigList">
    ${renderSectionConfigInner(sections)}
  </div>`;
}

function renderSectionConfigInner(sections) {
  return sections.map((s, i) => `
    <div class="section-config-item ${s.enabled ? '' : 'disabled'}" data-idx="${i}">
      <div class="section-config-drag">${icon('grip-vertical', 14)}</div>
      <div class="section-config-toggle">
        <label class="toggle-switch">
          <input type="checkbox" ${s.enabled ? 'checked' : ''} ${s.required ? 'disabled' : ''} onchange="toggleSection(${i}, this.checked)">
          <span class="toggle-slider"></span>
        </label>
      </div>
      <div class="section-config-info" style="flex:1;min-width:0">
        <div class="section-config-label">${esc(s.label)} ${s.required ? '<span class="required">*wajib</span>' : ''} ${s.custom ? '<span class="badge badge-blue" style="font-size:9px">Kustom</span>' : ''}</div>
        <div class="section-config-meta">
          <span class="badge badge-gray" style="font-size:10px">${typeLabel(s.type)}</span>
          ${s.columns ? `<span style="font-size:11px;color:var(--text-tertiary)">Kolom: ${s.columns.join(', ')}</span>` : ''}
        </div>
      </div>
      <div class="section-config-actions" style="display:flex;gap:4px;align-items:center">
        <button class="btn btn-ghost btn-xs" onclick="editSectionDetail(${i})" title="Edit Seksi">${icon('edit-3', 14)}</button>
        <button class="btn btn-ghost btn-xs" onclick="moveSectionUp(${i})" ${i === 0 ? 'disabled' : ''} title="Pindah Atas">${icon('chevron-up', 14)}</button>
        <button class="btn btn-ghost btn-xs" onclick="moveSectionDown(${i})" ${i === sections.length - 1 ? 'disabled' : ''} title="Pindah Bawah">${icon('chevron-down', 14)}</button>
        ${s.custom ? `<button class="btn btn-ghost btn-xs" onclick="removeCustomSection(${i})" title="Hapus Seksi" style="color:var(--danger)">${icon('trash-2', 14)}</button>` : ''}
      </div>
    </div>
  `).join('');
}

// ─── EDIT SECTION DETAIL (Label, Type, Columns) ───
function editSectionDetail(idx) {
  const s = window._tplSectionsEdit[idx];
  if (!s) return;

  const typeOpts = SECTION_TYPES.map(t =>
    `<option value="${t.value}" ${s.type === t.value ? 'selected' : ''}>${t.label}</option>`
  ).join('');

  const colsVal = s.columns ? s.columns.join(', ') : '';

  // Build inline editor in a sub-modal style (replace config list temporarily)
  const editHtml = `
  <div style="background:var(--surface-2);border:1px solid var(--border-light);border-radius:8px;padding:16px;margin-bottom:12px" id="sectionEditPanel">
    <div style="font-weight:700;font-size:14px;margin-bottom:12px">${icon('edit-3', 14)} Edit Seksi: ${esc(s.label)}</div>
    <div class="form-grid" style="gap:10px">
      <div class="form-group">
        <label class="form-label">Label Seksi <span class="required">*</span></label>
        <input type="text" class="form-control" id="sec-edit-label" value="${esc(s.label)}" placeholder="Nama seksi yang ditampilkan">
      </div>
      <div class="form-group">
        <label class="form-label">Tipe Input</label>
        <select class="form-control" id="sec-edit-type" onchange="onSectionTypeChange()">${typeOpts}</select>
        <div style="font-size:10px;color:var(--text-tertiary);margin-top:4px" id="sec-edit-type-desc">${esc(SECTION_TYPES.find(t => t.value === s.type)?.desc || '')}</div>
      </div>
      <div class="form-group full" id="sec-edit-cols-wrap" style="${s.type === 'table' ? '' : 'display:none'}">
        <label class="form-label">Kolom Tabel (pisahkan dengan koma)</label>
        <input type="text" class="form-control mono" id="sec-edit-cols" value="${esc(colsVal)}" placeholder="Kolom 1, Kolom 2, Kolom 3">
        <div style="font-size:10px;color:var(--text-tertiary);margin-top:4px">Contoh: Nama, Jumlah, Keterangan</div>
      </div>
      ${!s.required ? `
      <div class="form-group">
        <label class="form-label">Wajib diisi?</label>
        <label class="toggle-switch" style="margin-top:4px">
          <input type="checkbox" id="sec-edit-required" ${s.required ? 'checked' : ''}>
          <span class="toggle-slider"></span>
        </label>
      </div>` : ''}
    </div>
    <div style="display:flex;gap:8px;margin-top:12px">
      <button class="btn btn-primary btn-sm" onclick="saveSectionDetail(${idx})">${icon('check', 14)} Terapkan</button>
      <button class="btn btn-secondary btn-sm" onclick="cancelSectionDetail()">Batal</button>
    </div>
  </div>`;

  // Insert above the config list
  const existing = document.getElementById('sectionEditPanel');
  if (existing) existing.remove();
  const list = document.getElementById('sectionConfigList');
  if (list) list.insertAdjacentHTML('beforebegin', editHtml);
  renderIcons();
}

function onSectionTypeChange() {
  const type = document.getElementById('sec-edit-type')?.value;
  const colsWrap = document.getElementById('sec-edit-cols-wrap');
  const descEl = document.getElementById('sec-edit-type-desc');
  if (colsWrap) colsWrap.style.display = type === 'table' ? '' : 'none';
  if (descEl) descEl.textContent = SECTION_TYPES.find(t => t.value === type)?.desc || '';
}

function saveSectionDetail(idx) {
  const s = window._tplSectionsEdit[idx];
  if (!s) return;
  const label = document.getElementById('sec-edit-label')?.value?.trim();
  const type = document.getElementById('sec-edit-type')?.value;
  const colsRaw = document.getElementById('sec-edit-cols')?.value?.trim();
  const reqEl = document.getElementById('sec-edit-required');

  if (!label) { showToast('Label seksi wajib diisi', 'error'); return; }

  s.label = label;
  s.type = type;
  if (type === 'table' && colsRaw) {
    s.columns = colsRaw.split(',').map(c => c.trim()).filter(Boolean);
  } else if (type !== 'table') {
    delete s.columns;
  }
  if (reqEl) s.required = reqEl.checked;

  cancelSectionDetail();
  document.getElementById('sectionConfigList').innerHTML = renderSectionConfigInner(window._tplSectionsEdit);
  renderIcons();
  showToast('Seksi diperbarui: ' + label, 'success');
}

function cancelSectionDetail() {
  const panel = document.getElementById('sectionEditPanel');
  if (panel) panel.remove();
}

// ─── ADD CUSTOM SECTION ───
function addCustomSection() {
  const idx = window._tplSectionsEdit.length;
  const newId = 'custom_' + Date.now();
  window._tplSectionsEdit.push({
    id: newId,
    label: 'Seksi Baru ' + (idx + 1),
    required: false,
    type: 'richtext',
    enabled: true,
    custom: true,
  });
  document.getElementById('sectionConfigList').innerHTML = renderSectionConfigInner(window._tplSectionsEdit);
  renderIcons();
  // Auto-open editor for the new section
  editSectionDetail(idx);
}

// ─── REMOVE CUSTOM SECTION ───
function removeCustomSection(idx) {
  const s = window._tplSectionsEdit[idx];
  if (!s || !s.custom) { showToast('Hanya seksi kustom yang dapat dihapus', 'error'); return; }
  if (!confirm(`Hapus seksi "${s.label}"?`)) return;
  window._tplSectionsEdit.splice(idx, 1);
  document.getElementById('sectionConfigList').innerHTML = renderSectionConfigInner(window._tplSectionsEdit);
  renderIcons();
  showToast('Seksi dihapus', 'info');
}

function toggleSection(idx, enabled) {
  window._tplSectionsEdit[idx].enabled = enabled;
  const item = document.querySelectorAll('.section-config-item')[idx];
  if (item) item.classList.toggle('disabled', !enabled);
}

function moveSectionUp(idx) {
  if (idx <= 0) return;
  const arr = window._tplSectionsEdit;
  [arr[idx - 1], arr[idx]] = [arr[idx], arr[idx - 1]];
  document.getElementById('sectionConfigList').innerHTML = renderSectionConfigInner(arr);
  renderIcons();
}

function moveSectionDown(idx) {
  const arr = window._tplSectionsEdit;
  if (idx >= arr.length - 1) return;
  [arr[idx], arr[idx + 1]] = [arr[idx + 1], arr[idx]];
  document.getElementById('sectionConfigList').innerHTML = renderSectionConfigInner(arr);
  renderIcons();
}

async function saveSectionConfig() {
  const id = window._tplSectionsId;
  const sections = window._tplSectionsEdit;
  const konten = JSON.stringify(sections);
  try {
    await API.updateTemplate(id, { konten, perubahan: 'Perubahan konfigurasi seksi template' });
    closeModal('modalGeneric');
    showToast('Konfigurasi seksi disimpan — perubahan akan berlaku untuk dokumen IK baru', 'success');
    // Signal template change — IK form will detect and offer refresh
    window._templateLastUpdated = Date.now();
    showPage('template');
  } catch (e) { showToast('Gagal: ' + e.message, 'error'); }
}

// ─── PREVIEW TEMPLATE ───
async function previewTemplate(id) {
  try {
    const res = await API.getTemplates();
    const t = (res.data || []).find(x => x.id == id);
    if (!t) { showToast('Template tidak ditemukan', 'error'); return; }

    const sections = getTemplateSections(t.konten);
    const enabled = sections.filter(s => s.enabled !== false);

    openGenericModal(
      `Preview — ${esc(t.nama)} (${esc(t.versi)})`,
      `
      <div class="template-preview">
        <div class="tpl-preview-header">
          <div style="font-weight:700;font-size:14px">Struktur Dokumen IK</div>
          <div style="font-size:12px;color:var(--text-tertiary)">${enabled.length} seksi aktif</div>
        </div>
        <div class="tpl-preview-sections">
          ${enabled.map((s, i) => `
            <div class="tpl-preview-section">
              <div class="tpl-preview-num">${i + 1}</div>
              <div class="tpl-preview-content">
                <div class="tpl-preview-label">${esc(s.label)} ${s.custom ? '<span class="badge badge-blue" style="font-size:9px">Kustom</span>' : ''}</div>
                <div class="tpl-preview-type">
                  <span class="badge badge-gray" style="font-size:10px">${typeLabel(s.type)}</span>
                  ${s.required ? '<span class="badge badge-blue" style="font-size:10px">Wajib</span>' : '<span class="badge badge-gray" style="font-size:10px">Opsional</span>'}
                  ${s.columns ? `<span style="font-size:11px;color:var(--text-tertiary)">[ ${s.columns.join(' | ')} ]</span>` : ''}
                </div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
      `,
      `<button class="btn btn-secondary" onclick="closeModal('modalGeneric')">Tutup</button>
       <button class="btn btn-primary" onclick="closeModal('modalGeneric');editTemplateSections(${id})">${icon('settings', 14)} Konfigurasi</button>`
    );
    renderIcons();
  } catch (e) { showToast('Gagal: ' + e.message, 'error'); }
}

function typeLabel(type) {
  const map = { textarea: 'Teks Panjang', richtext: 'Editor Rich Text', table: 'Tabel', risk_matrix: 'Matriks Risiko', special: 'Renderer Khusus' };
  return map[type] || type || 'richtext';
}

// ─── ACTIVATE / DELETE ───
async function activateTemplate(id) {
  if (!confirm('Aktifkan template ini? Template aktif sebelumnya akan menjadi Legacy.')) return;
  try {
    await API.updateTemplate(id, { status: 'Aktif' });
    showToast('Template diaktifkan — dokumen IK baru akan menggunakan template ini', 'success');
    window._templateLastUpdated = Date.now();
    showPage('template');
  } catch (e) { showToast('Gagal: ' + e.message, 'error'); }
}

async function deleteTemplate(id) {
  if (!confirm('Hapus template ini? Aksi ini tidak dapat dibatalkan.')) return;
  try {
    await API.deleteTemplate(id);
    showToast('Template dihapus', 'success');
    showPage('template');
  } catch (e) { showToast('Gagal: ' + e.message, 'error'); }
}

// ─── TEMPLATE CHANGE HISTORY ───
async function viewTemplateHistory(id) {
  try {
    const res = await fetch(`api/templates/${id}/history`);
    const json = await res.json();
    const history = json.data || [];

    if (history.length === 0) {
      openGenericModal('Riwayat Perubahan Template', `
        <div class="alert alert-info"><div class="alert-icon">${icon('info', 14)}</div><div>Belum ada riwayat perubahan untuk template ini.</div></div>
      `, `<button class="btn btn-secondary" onclick="closeModal('modalGeneric')">Tutup</button>`);
      renderIcons();
      return;
    }

    const rows = history.map(h => {
      const user = h.user_id ? `User #${h.user_id}` : 'System';
      const date = h.created_at ? new Date(h.created_at).toLocaleString('id-ID') : '-';
      let diffHtml = '';
      try {
        const before = JSON.parse(h.konten_sebelum || '[]');
        const after = JSON.parse(h.konten_sesudah || '[]');
        const added = after.filter(a => !before.find(b => b.id === a.id));
        const removed = before.filter(b => !after.find(a => a.id === b.id));
        const toggled = after.filter(a => {
          const b = before.find(x => x.id === a.id);
          return b && b.enabled !== a.enabled;
        });
        const edited = after.filter(a => {
          const b = before.find(x => x.id === a.id);
          return b && (b.label !== a.label || b.type !== a.type || JSON.stringify(b.columns) !== JSON.stringify(a.columns));
        });
        if (added.length) diffHtml += `<span class="badge badge-success" style="font-size:10px">+${added.length} seksi baru</span> `;
        if (removed.length) diffHtml += `<span class="badge badge-danger" style="font-size:10px">-${removed.length} seksi dihapus</span> `;
        if (toggled.length) diffHtml += `<span class="badge badge-amber" style="font-size:10px">${toggled.length} seksi diubah</span> `;
        if (edited.length) diffHtml += `<span class="badge badge-blue" style="font-size:10px">${edited.length} seksi diedit</span> `;
      } catch { diffHtml = '<span class="badge badge-gray" style="font-size:10px">Perubahan metadata</span>'; }

      return `
        <div style="padding:12px 0;border-bottom:1px solid var(--border-light)">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
            <div style="font-weight:600;font-size:13px">${esc(h.versi_sebelum || '-')} &rarr; ${esc(h.versi_sesudah || '-')}</div>
            <div style="font-size:11px;color:var(--text-tertiary)">${date}</div>
          </div>
          <div style="font-size:12px;color:var(--text-secondary);margin-bottom:4px">${esc(h.perubahan || '')}</div>
          <div style="display:flex;gap:6px;align-items:center">
            ${diffHtml}
            <span style="font-size:11px;color:var(--text-tertiary)">${icon('user', 12)} ${esc(user)}</span>
          </div>
        </div>
      `;
    }).join('');

    openGenericModal('Riwayat Perubahan Template', `
      <div style="max-height:400px;overflow-y:auto">${rows}</div>
    `, `<button class="btn btn-secondary" onclick="closeModal('modalGeneric')">Tutup</button>`);
    renderIcons();
  } catch (e) { showToast('Gagal memuat riwayat: ' + e.message, 'error'); }
}

// ─── LOAD IK COUNT PER TEMPLATE (async after render) ───
async function loadTemplateIkCounts() {
  try {
    const res = await API.getDokumen();
    const docs = res.data || [];
    const counts = {};
    docs.forEach(d => {
      const tid = d.template_id;
      if (tid) counts[tid] = (counts[tid] || 0) + 1;
    });
    document.querySelectorAll('.tpl-ik-count').forEach(el => {
      const id = el.dataset.id;
      el.textContent = counts[id] || 0;
    });
  } catch { /* silent */ }
}
