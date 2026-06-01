// Equipment Page
const EMOJI_TO_LUCIDE = {'⚡':'zap','⚙️':'settings','⚙':'settings','🏗️':'building-2','🏗':'building-2','🏠':'home','🚰':'droplet','💧':'droplet','🔧':'wrench'};
function eqIcon(val, size) {
  const name = EMOJI_TO_LUCIDE[val] || val || 'settings';
  return icon(name, size);
}

async function renderEquipment(container) {
  container.innerHTML = `<div class="page active" id="page-equipment"></div>`;

  try {
    const res = await API.getEquipment();
    const items = res.data || [];

    document.getElementById('page-equipment').innerHTML = `
      <div class="page-header">
        <div class="page-header-left">
          <div class="page-title">Master Data Equipment / Aset</div>
          <div class="page-subtitle">Kaitkan dokumen IK dengan aset fisik di lapangan</div>
        </div>
        <div class="page-actions">
          <button class="btn btn-primary" onclick="openAddEquipmentModal()">${icon('plus', 14)} Tambah Equipment</button>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px">
        ${items.map(e => `
          <div class="equipment-card" onclick="viewEquipment(${e.id})">
            <div class="equip-icon" style="background:var(--surface-2)">${eqIcon(e.icon, 20)}</div>
            <div style="flex:1">
              <div style="font-size:13.5px;font-weight:700;margin-bottom:3px">${esc(e.nama)}</div>
              <div style="font-size:12px;color:var(--text-tertiary);margin-bottom:6px">${esc(e.lokasi || '')}</div>
              <div style="display:flex;gap:6px;flex-wrap:wrap">
                <span class="badge badge-sky" style="font-size:10px">${esc(e.sistem || '-')}</span>
                <span class="badge ${e.status === 'Operasi' ? 'badge-success' : 'badge-amber'}" style="font-size:10px">${esc(e.status)}</span>
              </div>
              <div style="margin-top:8px;font-size:12px;color:var(--pln-blue-600);font-weight:600">${icon('file-text', 14)} ${e.ik_count || 0} Dokumen IK Terkait</div>
              <div style="margin-top:4px;font-family:var(--mono);font-size:10.5px;color:var(--text-tertiary)">${esc(e.kode)}</div>
            </div>
          </div>
        `).join('')}
      </div>
    `;
    renderIcons();
  } catch (e) {
    container.innerHTML = `<div class="page active"><div class="alert alert-danger">${esc(e.message)}</div></div>`;
  }
}

function openAddEquipmentModal() {
  openGenericModal(
    'Tambah Equipment Baru',
    `
    <div class="form-grid">
      <div class="form-group full">
        <label class="form-label">Nama Equipment <span class="required">*</span></label>
        <input type="text" class="form-control" id="eq-nama" placeholder="Nama equipment/aset">
      </div>
      <div class="form-group">
        <label class="form-label">Lokasi</label>
        <input type="text" class="form-control" id="eq-lokasi">
      </div>
      <div class="form-group">
        <label class="form-label">Sistem</label>
        <input type="text" class="form-control" id="eq-sistem" placeholder="Contoh: Pembangkitan, Hidrolika">
      </div>
      <div class="form-group">
        <label class="form-label">Status</label>
        <select class="form-control" id="eq-status"><option>Operasi</option><option>Inspeksi</option><option>Maintenance</option><option>Nonaktif</option></select>
      </div>
      <div class="form-group">
        <label class="form-label">Icon</label>
        <select class="form-control" id="eq-icon"><option value="settings">⚙ Settings</option><option value="zap">⚡ Zap</option><option value="droplet">💧 Droplet</option><option value="building-2">🏗 Building</option><option value="home">🏠 Home</option><option value="wrench">🔧 Wrench</option></select>
      </div>
    </div>
    `,
    `<button class="btn btn-secondary" onclick="closeModal('modalGeneric')">Batal</button>
     <button class="btn btn-primary" onclick="saveEquipment()">${icon('save', 14)} Simpan</button>`
  );
}

async function saveEquipment() {
  const nama = document.getElementById('eq-nama')?.value;
  if (!nama) { showToast('Nama equipment wajib diisi', 'error'); return; }

  try {
    await API.createEquipment({
      nama,
      lokasi: document.getElementById('eq-lokasi')?.value || '',
      sistem: document.getElementById('eq-sistem')?.value || '',
      status: document.getElementById('eq-status')?.value || 'Operasi',
      icon: document.getElementById('eq-icon')?.value || 'settings',
    });
    closeModal('modalGeneric');
    showToast('Equipment ditambahkan', 'success');
    showPage('equipment');
  } catch (e) { showToast('Gagal: ' + e.message, 'error'); }
}

async function viewEquipment(id) {
  try {
    const res = await API.getEquipmentById(id);
    const eq = res.data;
    openGenericModal(
      esc(eq.nama),
      `
      <div class="grid-2">
        <div><strong>Kode:</strong> ${esc(eq.kode)}</div>
        <div><strong>Status:</strong> ${esc(eq.status)}</div>
        <div><strong>Lokasi:</strong> ${esc(eq.lokasi || '-')}</div>
        <div><strong>Sistem:</strong> ${esc(eq.sistem || '-')}</div>
      </div>
      <hr class="section-divider">
      <div class="section-heading">Dokumen IK Terkait</div>
      ${(eq.dokumen || []).map(d => `<div style="padding:6px 0;font-size:13px">${icon('file-text', 14)} ${esc(d.nomor_dokumen)} — ${esc(d.judul)}</div>`).join('') || '<div style="color:var(--text-tertiary)">Tidak ada dokumen terkait</div>'}
      `,
      `      <button class="btn btn-secondary" onclick="closeModal('modalGeneric')">Tutup</button>`
    );
    renderIcons();
  } catch (e) { showToast('Gagal memuat detail', 'error'); }
}
