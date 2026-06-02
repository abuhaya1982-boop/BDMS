// Master Data Page
async function renderMasterData(container) {
  container.innerHTML = `<div class="page active" id="page-master-data"></div>`;

  try {
    const [unitsRes, probisRes, rmRes] = await Promise.all([API.getUnits(), API.getProbis(), API.getRiskMatrix()]);
    const units = unitsRes.data || [];
    const probis = probisRes.data || [];
    _riskMatrixData = rmRes.data || { matrix: [], scales: [] };

    APP.cache.masterUnits = units;
    APP.cache.masterProbis = probis;
    document.getElementById('page-master-data').innerHTML = `
      <div class="page-header">
        <div class="page-header-left">
          <div class="page-title">Master Data Sistem</div>
          <div class="page-subtitle">Kelola data referensi: Unit CoA, Probis IMS, dan Penomoran</div>
        </div>
      </div>
      <div class="tabs">
        <div class="tab active" onclick="switchMDTab(this,'md-unit')">Unit / CoA</div>
        <div class="tab" onclick="switchMDTab(this,'md-probis')">Probis IMS</div>
        <div class="tab" onclick="switchMDTab(this,'md-risiko')">Matriks Risiko</div>
        <div class="tab" onclick="switchMDTab(this,'md-nomor')">Penomoran IK</div>
      </div>
      <div id="md-unit" class="tab-content active">
        <div class="card">
          <div class="card-header">
            <div class="card-title">Master Unit / Bidang (Segment 5 CoA)</div>
            <button class="btn btn-primary btn-sm" onclick="openAddUnitModal()">${icon('plus', 14)} Tambah</button>
          </div>
          <div class="table-container">
            <table>
              <thead><tr><th>Kode</th><th>Nama Unit / Bidang</th><th>Tipe</th><th>Kode Dokumen</th><th>Jumlah IK</th><th>Status</th><th>Aksi</th></tr></thead>
              <tbody>
                ${units.map(u => `
                  <tr>
                    <td class="td-mono">${esc(u.kode)}</td>
                    <td style="font-weight:500">${esc(u.nama)}</td>
                    <td><span class="badge ${u.tipe === 'Unit PLTA' ? 'badge-blue' : 'badge-sky'}" style="font-size:10px">${esc(u.tipe)}</span></td>
                    <td class="td-mono">IKBR-${esc(u.kode)}</td>
                    <td style="text-align:center;font-weight:700">${u.ik_count || 0}</td>
                    <td><span class="badge ${u.status === 'Nonaktif' ? 'badge-gray' : 'badge-success'}">${esc(u.status || 'Aktif')}</span></td>
                    <td><div style="display:flex;gap:4px"><button class="btn btn-secondary btn-xs" onclick="openEditUnitModal(${u.id})">${icon('edit-3', 13)}</button><button class="btn btn-danger btn-xs" onclick="deleteUnit(${u.id})">${icon('trash-2', 13)}</button></div></td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      <div id="md-probis" class="tab-content">
        <div class="card">
          <div class="card-header">
            <div class="card-title">Master Probis IMS PLN Nusantara Power</div>
            <button class="btn btn-primary btn-sm" onclick="openAddProbisModal()">${icon('plus', 14)} Tambah</button>
          </div>
          <div class="card-body" style="padding:8px 14px">
            <div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center">
              <input type="text" style="padding:5px 10px;font-size:11.5px;border:1px solid var(--border);border-radius:6px;width:200px" placeholder="Cari nomor / nama probis..." id="mdProbisSearch" oninput="filterProbisMD()">
              <select style="padding:5px 10px;font-size:11.5px;border:1px solid var(--border);border-radius:6px" id="mdProbisKat" onchange="filterProbisMD()">
                <option value="">Semua Kategori</option>
                <option>Inti</option><option>Pendukung</option><option>Sub-Probis</option>
              </select>
              <select style="padding:5px 10px;font-size:11.5px;border:1px solid var(--border);border-radius:6px" id="mdProbisStatus" onchange="filterProbisMD()">
                <option value="">Semua Status</option>
                <option value="Aktif">Aktif</option>
                <option value="Nonaktif">Nonaktif</option>
              </select>
              <span style="font-size:11.5px;color:var(--text-tertiary);margin-left:auto" id="mdProbisCount">${probis.length} item</span>
            </div>
          </div>
          <div class="table-container">
            <table id="mdProbisTable">
              <thead><tr><th>Nomor</th><th>Nama Proses Bisnis</th><th>Kategori</th><th>Jumlah IK</th><th>Status</th><th>Aksi</th></tr></thead>
              <tbody id="mdProbisBody">${renderProbisRowsMD(probis)}</tbody>
            </table>
          </div>
        </div>
      </div>
      <div id="md-risiko" class="tab-content">
        <div id="md-risiko-content"><div style="text-align:center;padding:40px;color:var(--text-tertiary)">Memuat matriks risiko...</div></div>
      </div>
      <div id="md-nomor" class="tab-content">
        <div class="card">
          <div class="card-header"><div class="card-title">Aturan Penomoran Dokumen IK</div></div>
          <div class="card-body">
            <div class="alert alert-success"><div class="alert-icon">${icon('check', 14)}</div><div><strong>Format:</strong> IK[KODEUNIT]-[NOMOR BIDANG/UNIT]-[NOMOR PROBIS]-[NOMOR URUT] <br><strong>Contoh:</strong> IKBR-327-10.1.3.c.b-001</div></div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
              <div>
                <div class="section-heading">Komponen Nomor</div>
                <div style="display:flex;flex-direction:column;gap:8px">
                  <div style="padding:12px;background:var(--surface-2);border-radius:var(--radius);border-left:3px solid var(--pln-blue-600)">
                    <div style="font-weight:700;margin-bottom:4px;font-family:var(--mono)">IKBR</div>
                    <div style="font-size:12.5px;color:var(--text-secondary)">IK = Instruksi Kerja, BR = Brantas (Segment 2 CoA)</div>
                  </div>
                  <div style="padding:12px;background:var(--surface-2);border-radius:var(--radius);border-left:3px solid var(--pln-sky)">
                    <div style="font-weight:700;margin-bottom:4px;font-family:var(--mono)">321–333 / 102–112</div>
                    <div style="font-size:12.5px;color:var(--text-secondary)">Kode Unit/Bidang berdasarkan Segment 5 CoA</div>
                  </div>
                  <div style="padding:12px;background:var(--surface-2);border-radius:var(--radius);border-left:3px solid var(--success)">
                    <div style="font-weight:700;margin-bottom:4px;font-family:var(--mono)">1.0 – 14.0 (+ sub-probis)</div>
                    <div style="font-size:12.5px;color:var(--text-secondary)">Nomor Probis berdasarkan IMS Business Process Map</div>
                  </div>
                  <div style="padding:12px;background:var(--surface-2);border-radius:var(--radius);border-left:3px solid var(--warning)">
                    <div style="font-weight:700;margin-bottom:4px;font-family:var(--mono)">001, 002, 003...</div>
                    <div style="font-size:12.5px;color:var(--text-secondary)">Nomor urut unik per kombinasi Unit+Probis</div>
                  </div>
                </div>
              </div>
              <div>
                <div class="section-heading">Aturan Sistem</div>
                <div style="display:flex;flex-direction:column;gap:6px;font-size:13px">
                  <div style="display:flex;gap:8px;align-items:flex-start"><span style="color:var(--success)">${icon('check', 16)}</span><span>Nomor urut <strong>unik per kombinasi</strong> Unit + Probis</span></div>
                  <div style="display:flex;gap:8px;align-items:flex-start"><span style="color:var(--success)">${icon('check', 16)}</span><span>Sistem mencegah <strong>duplikasi nomor dokumen</strong></span></div>
                  <div style="display:flex;gap:8px;align-items:flex-start"><span style="color:var(--success)">${icon('check', 16)}</span><span>Nomor <strong>terkunci</strong> setelah dokumen disubmit</span></div>
                  <div style="display:flex;gap:8px;align-items:flex-start"><span style="color:var(--warning)">${icon('alert-triangle', 16)}</span><span>Override nomor hanya oleh <strong>Admin</strong> dengan audit trail</span></div>
                  <div style="display:flex;gap:8px;align-items:flex-start"><span style="color:var(--success)">${icon('check', 16)}</span><span>Revisi menggunakan <strong>nomor yang sama</strong> + increment revisi</span></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
    renderIcons();
  } catch (e) {
    container.innerHTML = `<div class="page active"><div class="alert alert-danger">${esc(e.message)}</div></div>`;
  }
}

function switchMDTab(el, contentId) {
  document.querySelectorAll('#page-master-data .tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('#page-master-data .tab-content').forEach(c => c.classList.remove('active'));
  el.classList.add('active');
  document.getElementById(contentId)?.classList.add('active');
  // Render risk matrix from pre-loaded data (no extra API call)
  if (contentId === 'md-risiko' && document.getElementById('md-risiko-content')?.dataset.rendered !== '1') {
    renderRiskMatrixTab();
    const el2 = document.getElementById('md-risiko-content');
    if (el2) el2.dataset.rendered = '1';
  }
}

function openAddUnitModal() {
  openGenericModal(
    'Tambah Unit / Bidang',
    `
    <div class="form-grid">
      <div class="form-group">
        <label class="form-label">Kode <span class="required">*</span></label>
        <input type="text" class="form-control mono" id="md-unit-kode" placeholder="334">
      </div>
      <div class="form-group">
        <label class="form-label">Nama <span class="required">*</span></label>
        <input type="text" class="form-control" id="md-unit-nama" placeholder="Nama unit/bidang">
      </div>
      <div class="form-group">
        <label class="form-label">Tipe</label>
        <select class="form-control" id="md-unit-tipe"><option>Unit PLTA</option><option>Bidang Fungsional</option></select>
      </div>
    </div>
    `,
    `<button class="btn btn-secondary" onclick="closeModal('modalGeneric')">Batal</button>
     <button class="btn btn-primary" onclick="saveNewUnit()">${icon('save', 14)} Simpan</button>`
  );
}

async function saveNewUnit() {
  const kode = document.getElementById('md-unit-kode')?.value;
  const nama = document.getElementById('md-unit-nama')?.value;
  if (!kode || !nama) { showToast('Kode dan nama wajib diisi', 'error'); return; }
  try {
    await API.createUnit({ kode, nama, tipe: document.getElementById('md-unit-tipe')?.value || 'Unit PLTA' });
    closeModal('modalGeneric');
    showToast('Unit ditambahkan', 'success');
    showPage('master-data');
  } catch (e) { showToast('Gagal: ' + e.message, 'error'); }
}

function openAddProbisModal() {
  openGenericModal(
    'Tambah Probis',
    `
    <div class="form-grid">
      <div class="form-group">
        <label class="form-label">Nomor <span class="required">*</span></label>
        <input type="text" class="form-control mono" id="md-probis-nomor" placeholder="15.0">
      </div>
      <div class="form-group">
        <label class="form-label">Nama <span class="required">*</span></label>
        <input type="text" class="form-control" id="md-probis-nama" placeholder="Nama proses bisnis">
      </div>
      <div class="form-group">
        <label class="form-label">Kategori</label>
        <select class="form-control" id="md-probis-kat"><option>Inti</option><option>Pendukung</option><option>Sub-Probis</option></select>
      </div>
    </div>
    `,
    `<button class="btn btn-secondary" onclick="closeModal('modalGeneric')">Batal</button>
     <button class="btn btn-primary" onclick="saveNewProbis()">${icon('save', 14)} Simpan</button>`
  );
}

async function saveNewProbis() {
  const nomor = document.getElementById('md-probis-nomor')?.value;
  const nama = document.getElementById('md-probis-nama')?.value;
  if (!nomor || !nama) { showToast('Nomor dan nama wajib diisi', 'error'); return; }
  try {
    await API.createProbis({ nomor, nama, kategori: document.getElementById('md-probis-kat')?.value || 'Pendukung' });
    closeModal('modalGeneric');
    showToast('Probis ditambahkan', 'success');
    showPage('master-data');
  } catch (e) { showToast('Gagal: ' + e.message, 'error'); }
}

// ─── UNIT EDIT / DELETE ─────────────────────
function openEditUnitModal(id) {
  const u = (APP.cache.masterUnits || []).find(x => x.id == id);
  if (!u) return;
  openGenericModal(
    'Edit Unit: ' + u.kode,
    `
    <div class="form-grid">
      <div class="form-group">
        <label class="form-label">Kode <span class="required">*</span></label>
        <input type="text" class="form-control mono" id="md-unit-kode" value="${esc(u.kode)}">
      </div>
      <div class="form-group">
        <label class="form-label">Nama <span class="required">*</span></label>
        <input type="text" class="form-control" id="md-unit-nama" value="${esc(u.nama)}">
      </div>
      <div class="form-group">
        <label class="form-label">Tipe</label>
        <select class="form-control" id="md-unit-tipe"><option${u.tipe==='Unit PLTA'?' selected':''}>Unit PLTA</option><option${u.tipe==='Bidang Fungsional'?' selected':''}>Bidang Fungsional</option></select>
      </div>
      <div class="form-group">
        <label class="form-label">Status</label>
        <select class="form-control" id="md-unit-status"><option value="Aktif"${u.status==='Aktif'?' selected':''}>Aktif</option><option value="Nonaktif"${u.status==='Nonaktif'?' selected':''}>Nonaktif</option></select>
      </div>
    </div>
    `,
    `<button class="btn btn-secondary" onclick="closeModal('modalGeneric')">Batal</button>
     <button class="btn btn-primary" onclick="saveEditUnit(${id})">${icon('save', 14)} Simpan</button>`
  );
}

async function saveEditUnit(id) {
  const kode = document.getElementById('md-unit-kode')?.value;
  const nama = document.getElementById('md-unit-nama')?.value;
  if (!kode || !nama) { showToast('Kode dan nama wajib diisi', 'error'); return; }
  try {
    await API.updateUnit(id, { kode, nama, tipe: document.getElementById('md-unit-tipe')?.value, status: document.getElementById('md-unit-status')?.value });
    closeModal('modalGeneric');
    showToast('Unit diperbarui', 'success');
    showPage('master-data');
  } catch (e) { showToast('Gagal: ' + e.message, 'error'); }
}

async function deleteUnit(id) {
  const u = (APP.cache.masterUnits || []).find(x => x.id == id);
  const label = u ? `${u.kode} – ${u.nama}` : 'Unit ini';
  const ok = await renderConfirmDialog('Hapus Unit', `Yakin ingin menghapus <strong>${esc(label)}</strong> secara permanen?<br><br>Tindakan ini <strong>tidak dapat dibatalkan</strong>.`);
  if (!ok) return;
  try {
    await API.del('units/' + id);
    showToast('Unit berhasil dihapus', 'success');
    showPage('master-data');
  } catch (e) {
    const msg = e.message || '';
    if (msg.includes('FOREIGN KEY') || msg.includes('constraint')) {
      const force = await renderConfirmDialog('Force Hapus Unit', `Unit <strong>${esc(label)}</strong> masih digunakan oleh dokumen IK.<br><br>Force hapus akan menghapus master Unit, namun data <strong>unit_id</strong> pada dokumen IK terkait tetap tersimpan.<br><br>Lanjutkan force hapus?`, 'Force Hapus', 'Batal');
      if (!force) return;
      try {
        await API.del('units/' + id + '?force=1');
        showToast('Unit berhasil dihapus (force)', 'success');
        showPage('master-data');
      } catch (e2) { showToast('Gagal force hapus: ' + e2.message, 'error'); }
    } else { showToast('Gagal: ' + msg, 'error'); }
  }
}

// ─── PROBIS EDIT / DELETE ───────────────────
function openEditProbisModal(id) {
  const p = (APP.cache.masterProbis || []).find(x => x.id == id);
  if (!p) return;
  openGenericModal(
    'Edit Probis: ' + p.nomor,
    `
    <div class="form-grid">
      <div class="form-group">
        <label class="form-label">Nomor <span class="required">*</span></label>
        <input type="text" class="form-control mono" id="md-probis-nomor" value="${esc(p.nomor)}">
      </div>
      <div class="form-group">
        <label class="form-label">Nama <span class="required">*</span></label>
        <input type="text" class="form-control" id="md-probis-nama" value="${esc(p.nama)}">
      </div>
      <div class="form-group">
        <label class="form-label">Kategori</label>
        <select class="form-control" id="md-probis-kat"><option${p.kategori==='Inti'?' selected':''}>Inti</option><option${p.kategori==='Pendukung'?' selected':''}>Pendukung</option><option${p.kategori==='Sub-Probis'?' selected':''}>Sub-Probis</option></select>
      </div>
      <div class="form-group">
        <label class="form-label">Status</label>
        <select class="form-control" id="md-probis-status"><option value="Aktif"${p.status==='Aktif'?' selected':''}>Aktif</option><option value="Nonaktif"${p.status==='Nonaktif'?' selected':''}>Nonaktif</option></select>
      </div>
    </div>
    `,
    `<button class="btn btn-secondary" onclick="closeModal('modalGeneric')">Batal</button>
     <button class="btn btn-primary" onclick="saveEditProbis(${id})">${icon('save', 14)} Simpan</button>`
  );
}

async function saveEditProbis(id) {
  const nomor = document.getElementById('md-probis-nomor')?.value;
  const nama = document.getElementById('md-probis-nama')?.value;
  if (!nomor || !nama) { showToast('Nomor dan nama wajib diisi', 'error'); return; }
  try {
    await API.updateProbis(id, { nomor, nama, kategori: document.getElementById('md-probis-kat')?.value, status: document.getElementById('md-probis-status')?.value });
    closeModal('modalGeneric');
    showToast('Probis diperbarui', 'success');
    showPage('master-data');
  } catch (e) { showToast('Gagal: ' + e.message, 'error'); }
}

async function deleteProbis(id) {
  const p = (APP.cache.masterProbis || []).find(x => x.id == id);
  const label = p ? `${p.nomor} – ${p.nama}` : 'Probis ini';
  const ok = await renderConfirmDialog('Hapus Probis', `Yakin ingin menghapus <strong>${esc(label)}</strong> secara permanen?<br><br>Tindakan ini <strong>tidak dapat dibatalkan</strong>.`);
  if (!ok) return;
  try {
    await API.del('probis/' + id);
    showToast('Probis berhasil dihapus', 'success');
    showPage('master-data');
  } catch (e) {
    const msg = e.message || '';
    if (msg.includes('FOREIGN KEY') || msg.includes('constraint')) {
      const force = await renderConfirmDialog('Force Hapus Probis', `Probis <strong>${esc(label)}</strong> masih digunakan oleh dokumen IK.<br><br>Force hapus akan menghapus master Probis, namun data <strong>probis_id</strong> pada dokumen IK terkait tetap tersimpan.<br><br>Lanjutkan force hapus?`, 'Force Hapus', 'Batal');
      if (!force) return;
      try {
        await API.del('probis/' + id + '?force=1');
        showToast('Probis berhasil dihapus (force)', 'success');
        showPage('master-data');
      } catch (e2) { showToast('Gagal force hapus: ' + e2.message, 'error'); }
    } else { showToast('Gagal: ' + msg, 'error'); }
  }
}

// ─── PROBIS SEARCH / FILTER ─────────────────
function renderProbisRowsMD(list) {
  return list.map(p => `
    <tr>
      <td class="td-mono">${esc(p.nomor)}</td>
      <td style="font-weight:500">${esc(p.nama)}</td>
      <td><span class="badge ${p.kategori === 'Inti' ? 'badge-blue' : p.kategori === 'Sub-Probis' ? 'badge-amber' : 'badge-sky'}" style="font-size:10px">${esc(p.kategori)}</span></td>
      <td style="text-align:center;font-weight:700">${p.ik_count || 0}</td>
      <td><span class="badge ${p.status === 'Nonaktif' ? 'badge-gray' : 'badge-success'}">${esc(p.status || 'Aktif')}</span></td>
      <td><div style="display:flex;gap:4px"><button class="btn btn-secondary btn-xs" onclick="openEditProbisModal(${p.id})">${icon('edit-3', 13)}</button><button class="btn btn-danger btn-xs" onclick="deleteProbis(${p.id})">${icon('trash-2', 13)}</button></div></td>
    </tr>
  `).join('');
}

function filterProbisMD() {
  const q = (document.getElementById('mdProbisSearch')?.value || '').toLowerCase();
  const kat = document.getElementById('mdProbisKat')?.value || '';
  const st = document.getElementById('mdProbisStatus')?.value || '';
  let list = APP.cache.masterProbis || [];
  if (q) list = list.filter(p => p.nomor.toLowerCase().includes(q) || p.nama.toLowerCase().includes(q));
  if (kat) list = list.filter(p => p.kategori === kat);
  if (st) list = list.filter(p => (p.status || 'Aktif') === st);
  document.getElementById('mdProbisBody').innerHTML = renderProbisRowsMD(list);
  document.getElementById('mdProbisCount').textContent = list.length + ' item';
  renderIcons();
}

// ═══════════════════════════════════════════════════
// MATRIKS RISIKO — Dynamic CRUD from DB
// ═══════════════════════════════════════════════════
let _riskMatrixData = { matrix: [], scales: [] };
const LEVEL_OPTIONS = ['LOW','LOW TO MODERATE','MODERATE','MODERATE TO HIGH','HIGH'];
const COLOR_OPTIONS = ['#00B050','#92D050','#FFFF00','#FFC000','#FF0000'];

async function loadRiskMatrix() {
  try {
    const res = await API.getRiskMatrix();
    _riskMatrixData = res.data || { matrix: [], scales: [] };
    renderRiskMatrixTab();
  } catch (e) {
    const el = document.getElementById('md-risiko-content');
    if (el) el.innerHTML = `<div class="alert alert-danger">${esc(e.message)}</div>`;
  }
}

function _rmLookup(p, i) {
  return _riskMatrixData.matrix.find(m => m.probability === p && m.impact === i) || { score: '-', level: '-', color: '#ccc' };
}

function _scaleByType(tipe) {
  return (_riskMatrixData.scales || []).filter(s => s.tipe === tipe).sort((a, b) => a.nilai - b.nilai);
}

function _textColor(bg) {
  if (!bg) return '#000';
  const hex = bg.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16), g = parseInt(hex.substr(2, 2), 16), b = parseInt(hex.substr(4, 2), 16);
  return (r * 0.299 + g * 0.587 + b * 0.114) > 160 ? '#000' : '#fff';
}

function renderRiskMatrixTab() {
  const el = document.getElementById('md-risiko-content');
  if (!el) return;
  const isSuperAdmin = APP.user?.role === 'Super Admin' || APP.user?.original_role === 'Super Admin';
  const probScales = _scaleByType('probability');
  const impScales = _scaleByType('impact');

  // Build heat map rows (probability 5→1, top to bottom)
  let heatRows = '';
  for (let p = 5; p >= 1; p--) {
    const ps = probScales.find(s => s.nilai === p) || { kode: p, label: 'Level ' + p };
    let cells = `<td style="border:1px solid #999;background:#F5F5F5;font-weight:600;padding:6px 4px;width:120px;font-size:11px">${esc(ps.label)}<br><b>${esc(ps.kode)}</b></td>`;
    for (let i = 1; i <= 5; i++) {
      const c = _rmLookup(p, i);
      const tc = _textColor(c.color);
      const clickAttr = isSuperAdmin ? ` onclick="openEditRiskCell(${p},${i})" style="cursor:pointer;border:1px solid #999;background:${c.color};padding:6px;font-weight:600;color:${tc}" title="Klik untuk edit"` : ` style="border:1px solid #999;background:${c.color};padding:6px;font-weight:600;color:${tc}"`;
      cells += `<td${clickAttr}><div style="font-size:9px;opacity:0.85">${esc(c.level)}</div><div style="font-size:14px;font-weight:800">${c.score}</div></td>`;
    }
    heatRows += `<tr>${p === 5 ? '<td rowspan="5" style="border:1px solid #999;background:#F5F5F5;font-weight:700;writing-mode:vertical-lr;transform:rotate(180deg);padding:8px 4px;font-size:12px;width:28px">Probabilitas</td>' : ''}${cells}</tr>`;
  }
  // Impact footer row
  let impFooter = '<td style="border:none"></td>';
  for (let i = 1; i <= 5; i++) {
    const is2 = impScales.find(s => s.nilai === i) || { label: 'Level ' + i };
    impFooter += `<td style="border:1px solid #999;background:#F5F5F5;font-weight:600;padding:6px;font-size:11px">${esc(is2.label)}<br><b>${i}</b></td>`;
  }

  // Probability scale table
  const probRows = probScales.map(s => `<tr>
    <td class="td-mono">${esc(s.kode)} (${s.nilai})</td>
    <td style="font-weight:500">${esc(s.label)}</td>
    <td style="font-size:11.5px;color:var(--text-secondary)">${esc(s.deskripsi || '')}</td>
    ${isSuperAdmin ? `<td><button class="btn btn-secondary btn-xs" onclick="openEditScale('probability',${s.nilai})">${icon('edit-3', 12)}</button></td>` : ''}
  </tr>`).join('');

  const impRows = impScales.map(s => `<tr>
    <td class="td-mono">${s.nilai}</td>
    <td style="font-weight:500">${esc(s.label)}</td>
    <td style="font-size:11.5px;color:var(--text-secondary)">${esc(s.deskripsi || '')}</td>
    ${isSuperAdmin ? `<td><button class="btn btn-secondary btn-xs" onclick="openEditScale('impact',${s.nilai})">${icon('edit-3', 12)}</button></td>` : ''}
  </tr>`).join('');

  el.innerHTML = `
    <div class="card">
      <div class="card-header">
        <div class="card-title">${icon('grid-3x3', 14)} Matriks Risiko 5×5</div>
        <div style="display:flex;gap:6px">
          ${isSuperAdmin ? `<button class="btn btn-danger btn-sm" onclick="resetRiskMatrixDefault()">${icon('rotate-ccw', 13)} Reset Default</button>` : ''}
        </div>
      </div>
      <div class="card-body">
        <div class="alert alert-info" style="margin-bottom:14px"><div class="alert-icon">${icon('info', 14)}</div><div style="font-size:12px">Matriks risiko 5×5 sesuai kebijakan manajemen risiko PLN Nusantara Power. Digunakan pada seksi <strong>Identifikasi Risiko</strong> di setiap dokumen IK.${isSuperAdmin ? ' <strong>Klik sel matriks untuk mengedit.</strong>' : ''}</div></div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px">
          <div>
            <div class="section-heading">Skala Probabilitas (Likelihood)</div>
            <table class="table-compact">
              <thead><tr><th>Kode</th><th>Level</th><th>Deskripsi</th>${isSuperAdmin ? '<th style="width:40px"></th>' : ''}</tr></thead>
              <tbody>${probRows}</tbody>
            </table>
          </div>
          <div>
            <div class="section-heading">Skala Dampak (Impact)</div>
            <table class="table-compact">
              <thead><tr><th>Level</th><th>Kategori</th><th>Deskripsi</th>${isSuperAdmin ? '<th style="width:40px"></th>' : ''}</tr></thead>
              <tbody>${impRows}</tbody>
            </table>
          </div>
        </div>

        <div style="margin-top:20px">
          <div class="section-heading">Peta Risiko (Heat Map)${isSuperAdmin ? ' — <span style="font-weight:400;color:var(--text-tertiary)">klik sel untuk edit</span>' : ''}</div>
          <div style="overflow-x:auto">
            <table style="border-collapse:collapse;width:100%;font-family:'Inter',sans-serif;font-size:11px;text-align:center;table-layout:fixed">
              ${heatRows}
              <tr>${impFooter}</tr>
              <tr><td style="border:none"></td><td style="border:none"></td><td colspan="5" style="border:1px solid #999;background:#F5F5F5;font-weight:700;font-size:12px;padding:6px">Dampak</td></tr>
            </table>
          </div>
        </div>

        <div style="margin-top:16px;display:grid;grid-template-columns:repeat(5,1fr);gap:8px;font-size:11px">
          ${LEVEL_OPTIONS.map((l, idx) => `<div style="display:flex;align-items:center;gap:6px"><span style="display:inline-block;width:20px;height:14px;background:${COLOR_OPTIONS[idx]};border:1px solid #999;border-radius:2px"></span><b>${l}</b></div>`).join('')}
        </div>
      </div>
    </div>
  `;
  renderIcons();
}

function openEditRiskCell(prob, imp) {
  const c = _rmLookup(prob, imp);
  const levelOpts = LEVEL_OPTIONS.map(l => `<option value="${l}" ${c.level === l ? 'selected' : ''}>${l}</option>`).join('');
  const colorOpts = COLOR_OPTIONS.map(cl => `<option value="${cl}" ${c.color === cl ? 'selected' : ''} style="background:${cl};color:${_textColor(cl)}">${cl}</option>`).join('');
  openGenericModal(
    `Edit Sel Risiko [P=${prob}, I=${imp}]`,
    `<div class="form-grid" style="grid-template-columns:1fr 1fr">
      <div class="form-group"><label class="form-label">Score</label>
        <input type="number" class="form-control" id="rm-score" value="${c.score}" min="1" max="25"></div>
      <div class="form-group"><label class="form-label">Level</label>
        <select class="form-control" id="rm-level">${levelOpts}</select></div>
      <div class="form-group"><label class="form-label">Warna</label>
        <select class="form-control" id="rm-color" onchange="document.getElementById('rm-color-preview').style.background=this.value">${colorOpts}</select></div>
      <div class="form-group"><label class="form-label">Preview</label>
        <div id="rm-color-preview" style="width:100%;height:36px;border-radius:6px;border:1px solid #999;background:${c.color}"></div></div>
    </div>`,
    `<button class="btn btn-secondary" onclick="closeModal('modalGeneric')">Batal</button>
     <button class="btn btn-primary" onclick="saveRiskCell(${prob},${imp})">${icon('save', 14)} Simpan</button>`
  );
  renderIcons();
}

async function saveRiskCell(prob, imp) {
  const score = parseInt(document.getElementById('rm-score')?.value);
  const level = document.getElementById('rm-level')?.value;
  const color = document.getElementById('rm-color')?.value;
  if (!score || !level || !color) { showToast('Semua field wajib diisi', 'error'); return; }
  try {
    await API.updateRiskMatrixCell({ probability: prob, impact: imp, score, level, color });
    closeModal('modalGeneric');
    showToast('Sel risiko diperbarui', 'success');
    await loadRiskMatrix();
  } catch (e) { showToast('Gagal: ' + e.message, 'error'); }
}

function openEditScale(tipe, nilai) {
  const s = (_riskMatrixData.scales || []).find(x => x.tipe === tipe && x.nilai === nilai);
  if (!s) return;
  const label = tipe === 'probability' ? 'Probabilitas' : 'Dampak';
  openGenericModal(
    `Edit Skala ${label}: Level ${nilai}`,
    `<div class="form-grid">
      <div class="form-group"><label class="form-label">Kode</label>
        <input type="text" class="form-control mono" id="rs-kode" value="${esc(s.kode || '')}" maxlength="4" style="width:80px"></div>
      <div class="form-group"><label class="form-label">Label</label>
        <input type="text" class="form-control" id="rs-label" value="${esc(s.label)}"></div>
      <div class="form-group" style="grid-column:span 2"><label class="form-label">Deskripsi</label>
        <input type="text" class="form-control" id="rs-desk" value="${esc(s.deskripsi || '')}"></div>
    </div>`,
    `<button class="btn btn-secondary" onclick="closeModal('modalGeneric')">Batal</button>
     <button class="btn btn-primary" onclick="saveScale('${tipe}',${nilai})">${icon('save', 14)} Simpan</button>`
  );
  renderIcons();
}

async function saveScale(tipe, nilai) {
  const kode = document.getElementById('rs-kode')?.value;
  const label = document.getElementById('rs-label')?.value;
  const deskripsi = document.getElementById('rs-desk')?.value;
  if (!label) { showToast('Label wajib diisi', 'error'); return; }
  try {
    await API.updateRiskScales([{ tipe, nilai, kode, label, deskripsi }]);
    closeModal('modalGeneric');
    showToast('Skala diperbarui', 'success');
    await loadRiskMatrix();
  } catch (e) { showToast('Gagal: ' + e.message, 'error'); }
}

async function resetRiskMatrixDefault() {
  const ok = await renderConfirmDialog('Reset Matriks Risiko', 'Yakin ingin mereset matriks risiko ke standar default PLN Nusantara Power?<br><br>Semua kustomisasi akan <strong>hilang</strong>.', 'Reset', 'Batal');
  if (!ok) return;
  try {
    await API.resetRiskMatrix();
    showToast('Matriks risiko direset ke default', 'success');
    await loadRiskMatrix();
  } catch (e) { showToast('Gagal: ' + e.message, 'error'); }
}
