const IK_COLUMNS = [
  { key: 'nomor_dokumen', label: 'No. Dokumen', default: true },
  { key: 'judul', label: 'Nama IK / Judul', default: true },
  { key: 'unit_nama', label: 'Unit / Bidang', default: true },
  { key: 'revisi', label: 'Rev', default: true },
  { key: 'status', label: 'Status', default: true },
  { key: 'retensi', label: 'Retensi', default: true },
  { key: 'tingkat_risiko', label: 'Risiko', default: true },
  { key: 'tanggal_terbit', label: 'Tgl. Terbit', default: true },
  { key: 'owner_nama', label: 'Owner', default: true },
  { key: 'review_due', label: 'Review Due', default: false },
  { key: 'probis_nama', label: 'Probis', default: false },
  { key: 'scan_count', label: 'Scan QR', default: false },
];

// Pilihan baris untuk aksi bulk (download ZIP / upload Drive). Disimpan per-id.
const _ikSelected = new Set();

// Retensi (masa berlaku) diturunkan dari status + archived_reason.
// BERLAKU = Published; TIDAK BERLAKU = Archived karena direvisi/diarsip; DITARIK = ditarik (obsolete).
function retensiInfo(d) {
  if (d.status === 'Published') return { label: 'BERLAKU', cls: 'badge-success' };
  if (d.status === 'Archived') {
    const r = (d.archived_reason || '').toLowerCase();
    if (r.includes('tarik')) return { label: 'DITARIK', cls: 'badge-danger' };
    return { label: 'TIDAK BERLAKU', cls: 'badge-gray' };
  }
  return null; // Draft/Review/dll → dalam proses, tak relevan
}
function retensiBadge(d) {
  const info = retensiInfo(d);
  if (!info) return '<span style="color:var(--text-tertiary);font-size:11px">—</span>';
  return `<span class="badge ${info.cls}" style="font-size:10px;font-weight:700">${info.label}</span>`;
}

function getIKColumns() {
  try { return JSON.parse(localStorage.getItem('bdms_ik_cols')) || IK_COLUMNS.filter(c=>c.default).map(c=>c.key); }
  catch { return IK_COLUMNS.filter(c=>c.default).map(c=>c.key); }
}

function setIKColumns(keys) {
  localStorage.setItem('bdms_ik_cols', JSON.stringify(keys));
}

async function renderMasterIK(container, docs) {
  container.innerHTML = `<div class="page active" id="page-master-ik"></div>`;
  const page = document.getElementById('page-master-ik');

  if (!docs) {
    try {
      const res = await API.getDokumen('limit=500');
      docs = res.data.items || [];
      APP.cache.masterIK = docs;
    } catch (e) {
      page.innerHTML = `<div class="alert alert-danger">Gagal memuat data: ${esc(e.message)}</div>`;
      return;
    }
  }

  const activeCols = getIKColumns();
  _ikSelected.clear();

  page.innerHTML = `
    <div class="page-header" style="margin-bottom:8px">
      <div class="page-header-left">
        <div class="page-title">Master Data IK</div>
        <div class="page-subtitle">${docs.length} dokumen terdaftar</div>
      </div>
      <div class="page-actions" style="gap:4px">
        <div class="dropdown-wrapper" style="position:relative">
          <button class="btn btn-secondary btn-sm" onclick="toggleColPicker()">${icon('columns', 14)} Kolom</button>
          <div id="colPicker" class="dropdown-menu" style="display:none;position:absolute;right:0;top:100%;background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:8px;z-index:100;min-width:160px;box-shadow:0 8px 24px rgba(0,0,0,.3)">
            ${IK_COLUMNS.map(c => `
              <label style="display:flex;align-items:center;gap:6px;padding:3px 6px;font-size:11.5px;cursor:pointer;white-space:nowrap;border-radius:4px" onmouseenter="this.style.background='var(--surface-2)'" onmouseleave="this.style.background=''">
                <input type="checkbox" ${activeCols.includes(c.key)?'checked':''} onchange="toggleIKCol('${c.key}')" style="accent-color:var(--primary)"> ${c.label}
              </label>
            `).join('')}
          </div>
        </div>
        <button class="btn btn-secondary btn-sm" onclick="exportIKExcel()">${icon('download', 14)} Excel</button>
        <button class="btn btn-secondary btn-sm" onclick="exportIKPdf()">${icon('printer', 14)} PDF</button>
        <button class="btn btn-primary btn-sm" onclick="showPage('buat-ik')">${icon('plus', 14)} Buat IK</button>
      </div>
    </div>

    <div class="card" style="margin-bottom:8px">
      <div class="card-body" style="padding:8px 12px">
        <div style="display:flex;flex-wrap:wrap;gap:6px;align-items:center">
          <select class="form-control" style="width:130px;font-size:11.5px;padding:4px 8px" id="filterUnit" onchange="filterMasterIK()">
            <option value="">Semua Unit</option>
          </select>
          <select class="form-control" style="width:120px;font-size:11.5px;padding:4px 8px" id="filterStatus" onchange="filterMasterIK()">
            <option value="">Semua Status</option>
            <option>Draft</option><option>Review</option><option>Approved-T1</option><option>Approved-T2</option><option>Published</option><option>Archived</option>
          </select>
          <select class="form-control" style="width:130px;font-size:11.5px;padding:4px 8px" id="filterRetensi" onchange="filterMasterIK()">
            <option value="">Semua Retensi</option>
            <option value="berlaku">Hanya Berlaku</option>
            <option value="tidak">Tidak Berlaku</option>
            <option value="ditarik">Ditarik</option>
          </select>
          <select class="form-control" style="width:110px;font-size:11.5px;padding:4px 8px" id="filterRisk" onchange="filterMasterIK()">
            <option value="">Semua Risiko</option>
            <option>Rendah</option><option>Sedang</option><option>Tinggi</option><option>Ekstrem</option>
          </select>
          <input type="text" style="width:140px;font-size:11.5px;padding:4px 8px;border:1px solid var(--border);border-radius:6px" placeholder="Cari judul / nomor..." id="filterSearch" oninput="filterMasterIK()">
          <button class="btn btn-secondary btn-xs" onclick="resetFilterIK()">${icon('rotate-ccw', 14)}</button>
          <span style="margin-left:auto;font-size:11.5px;color:var(--text-tertiary)" id="filterResultInfo">${docs.length} dokumen</span>
        </div>
      </div>
    </div>

    <div id="ikBulkBar" style="display:none;align-items:center;gap:8px;margin-bottom:8px;padding:8px 12px;background:var(--primary,#1E3A5F);color:#fff;border-radius:8px;flex-wrap:wrap">
      <span id="ikBulkCount" style="font-size:12px;font-weight:600">0 dipilih</span>
      <button class="btn btn-sm" style="background:#fff;color:var(--primary,#1E3A5F)" onclick="bulkDownloadDocx()">${icon('download', 14)} Download ZIP</button>
      <button class="btn btn-sm" style="background:#fff;color:var(--primary,#1E3A5F)" onclick="bulkUploadDrive()">${icon('cloud-upload', 14)} Upload ke Drive</button>
      <button class="btn btn-sm" style="background:transparent;color:#fff;border:1px solid rgba(255,255,255,.5)" onclick="clearIKSelection()">${icon('x', 14)} Batal</button>
    </div>

    <div class="card">
      <div class="table-container" style="overflow-x:auto">
        <table class="ik-master-table" style="font-size:12px">
          <thead><tr id="ikTableHead">${buildIKHeader(activeCols)}</tr></thead>
          <tbody id="masterIKBody">${renderIKRows(docs, activeCols)}</tbody>
        </table>
      </div>
    </div>
  `;
  renderIcons();
  updateIKBulkBar();

  // Load filter options
  try {
    const units = await API.getUnits();
    const sel = document.getElementById('filterUnit');
    (units.data || []).forEach(u => { sel.innerHTML += `<option value="${u.id}">${esc(u.nama)}</option>`; });
  } catch (e) { /* ignore */ }

  renderIcons();
  APP.cache.allIK = docs;
  // Close column picker on outside click
  document.addEventListener('click', function ikColClose(e) {
    if (!e.target.closest('.dropdown-wrapper')) { const p = document.getElementById('colPicker'); if (p) p.style.display = 'none'; }
    document.removeEventListener('click', ikColClose);
  });
}

function buildIKHeader(cols) {
  const colMap = Object.fromEntries(IK_COLUMNS.map(c => [c.key, c.label]));
  const cb = `<th style="width:28px;text-align:center"><input type="checkbox" id="ikSelectAll" title="Pilih semua" onchange="toggleIKSelectAll(this.checked)" style="accent-color:var(--primary)"></th>`;
  return cb + cols.concat(['aksi']).map(k => {
    if (k === 'aksi') return '<th style="width:50px;text-align:center">Aksi</th>';
    const label = colMap[k] || k;
    let cls = '';
    if (k === 'nomor_dokumen') cls = ' style="min-width:130px"';
    else if (k === 'judul') cls = ' style="min-width:160px"';
    return `<th${cls}>${label}</th>`;
  }).join('');
}

function renderIKRows(docs, cols) {
  if (!cols) cols = getIKColumns();
  const _role = APP.user?.role;
  const _canDrive = _role === 'Admin' || _role === 'Super Admin';
  return docs.map(d => {
    const cells = cols.map(k => {
      switch (k) {
        case 'nomor_dokumen': return `<td class="td-mono">${esc(d.nomor_dokumen)}</td>`;
        case 'judul': return `<td style="max-width:200px"><div title="${esc(d.judul)}" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:200px;text-transform:uppercase;font-weight:600">${esc(d.judul)}</div></td>`;
        case 'unit_nama': return `<td style="font-size:11.5px">${esc(d.unit_nama || '')}</td>`;
        case 'revisi': return `<td style="text-align:center"><span class="badge badge-blue" style="font-size:10px">Rev ${d.revisi || '00'}</span></td>`;
        case 'status': return `<td>${statusBadge(d.status)}</td>`;
        case 'retensi': return `<td>${retensiBadge(d)}</td>`;
        case 'tingkat_risiko': return `<td>${riskBadge(d.tingkat_risiko)}</td>`;
        case 'tanggal_terbit': return `<td style="font-size:11px">${d.tanggal_terbit ? formatDate(d.tanggal_terbit) : '<span style="color:var(--text-tertiary)">—</span>'}</td>`;
        case 'owner_nama': return `<td style="font-size:11.5px">${esc(d.owner_nama || '-')}</td>`;
        case 'review_due': return `<td style="font-size:11px;${d.review_due && new Date(d.review_due) < new Date() ? 'color:var(--danger);font-weight:700' : ''}">${formatDate(d.review_due)}</td>`;
        case 'probis_nama': return `<td style="font-size:11px">${esc(d.probis_nama || '-')}</td>`;
        case 'scan_count': return `<td style="text-align:center;font-size:11px">${d.scan_count != null ? d.scan_count : '-'}</td>`;
        default: return '<td></td>';
      }
    });
    cells.push(`
      <td style="text-align:center">
        <div style="display:flex;gap:2px;justify-content:center">
          <button class="btn btn-secondary btn-xs" style="padding:2px 6px;font-size:11px" onclick="viewDocDetail(${d.id})">${icon('eye', 14)}</button>
          ${d.status === 'Published' ? `<button class="btn btn-secondary btn-xs" style="padding:2px 6px;font-size:11px" onclick="downloadDocx(${d.id})" title="Download DOCX">${icon('download', 14)}</button>` : ''}
          ${d.status === 'Published' && d.gdrive_url ? `<a class="btn btn-secondary btn-xs" style="padding:2px 6px;font-size:11px" href="${esc(d.gdrive_url)}" target="_blank" rel="noopener" title="Buka di Google Drive">${icon('external-link', 14)}</a>` : ''}
          ${d.status === 'Published' && _canDrive ? `<button class="btn btn-secondary btn-xs" style="padding:2px 6px;font-size:11px" onclick="uploadIKToDrive(${d.id})" title="${d.gdrive_url ? 'Unggah ulang ke Google Drive' : 'Unggah ke Google Drive'}">${icon('cloud-upload', 14)}</button>` : ''}
          <button class="btn btn-secondary btn-xs" style="padding:2px 6px;font-size:11px" onclick="duplicateIK(${d.id})" title="Salin sebagai IK baru">${icon('copy', 14)}</button>
          ${d.status === 'Published' ? `<button class="btn btn-secondary btn-xs" style="padding:2px 6px;font-size:11px" onclick="reviseIK(${d.id})" title="Buat revisi">${icon('git-compare', 14)}</button>` : ''}
          ${(d.status === 'Published' || d.status === 'Archived') && _canDrive && !(d.archived_reason || '').toLowerCase().includes('tarik') ? `<button class="btn btn-secondary btn-xs" style="padding:2px 6px;font-size:11px;color:var(--danger)" onclick="withdrawIK(${d.id})" title="Tarik dokumen (DITARIK)">${icon('archive-x', 14)}</button>` : ''}
        </div>
      </td>
    `);
    const cb = `<td style="text-align:center;width:28px"><input type="checkbox" class="ik-row-cb" data-id="${d.id}" ${_ikSelected.has(d.id) ? 'checked' : ''} onchange="toggleIKSelect(${d.id}, this.checked)" style="accent-color:var(--primary)"></td>`;
    return `<tr>${cb}${cells.join('')}</tr>`;
  }).join('');
}

// ─── PILIH BARIS & AKSI BULK ───
function toggleIKSelect(id, checked) {
  if (checked) _ikSelected.add(id); else _ikSelected.delete(id);
  updateIKBulkBar();
}

function toggleIKSelectAll(checked) {
  document.querySelectorAll('.ik-row-cb').forEach(cb => {
    cb.checked = checked;
    const id = Number(cb.dataset.id);
    if (checked) _ikSelected.add(id); else _ikSelected.delete(id);
  });
  updateIKBulkBar();
}

function clearIKSelection() {
  _ikSelected.clear();
  document.querySelectorAll('.ik-row-cb').forEach(cb => { cb.checked = false; });
  updateIKBulkBar();
}

function updateIKBulkBar() {
  const cnt = _ikSelected.size;
  const bar = document.getElementById('ikBulkBar');
  if (bar) bar.style.display = cnt ? 'flex' : 'none';
  const c = document.getElementById('ikBulkCount');
  if (c) c.textContent = cnt + ' dipilih';
  const all = document.querySelectorAll('.ik-row-cb');
  const sa = document.getElementById('ikSelectAll');
  if (sa && all.length) {
    const checkedCount = [...all].filter(cb => cb.checked).length;
    sa.checked = checkedCount === all.length;
    sa.indeterminate = checkedCount > 0 && checkedCount < all.length;
  }
}

async function bulkDownloadDocx() {
  const ids = [..._ikSelected];
  if (!ids.length) return;
  if (typeof JSZip === 'undefined') { showToast('Pustaka ZIP belum termuat — muat ulang halaman (Ctrl+F5)', 'error'); return; }
  const docs = APP.cache.allIK || [];
  showToast(`Menyiapkan ${ids.length} dokumen…`, 'info');
  const zip = new JSZip();
  let ok = 0, fail = 0;
  for (const id of ids) {
    try {
      const resp = await fetch(API.getDokumenDocxUrl(id), { credentials: 'include' });
      if (!resp.ok) throw new Error('HTTP ' + resp.status);
      const blob = await resp.blob();
      const d = docs.find(x => x.id === id) || {};
      const safe = String(d.nomor_dokumen || ('dok-' + id)).replace(/[\\/:*?"<>|]+/g, '_');
      zip.file(safe + '.docx', blob);
      ok++;
    } catch (e) { fail++; }
  }
  if (!ok) { showToast('Gagal menyiapkan dokumen', 'error'); return; }
  const content = await zip.generateAsync({ type: 'blob' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(content);
  a.download = `IK-dokumen-${new Date().toISOString().slice(0, 10)}.zip`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  showToast(`ZIP siap: ${ok} dokumen${fail ? `, ${fail} gagal` : ''} ✓`, fail ? 'warning' : 'success');
}

async function bulkUploadDrive() {
  const ids = [..._ikSelected];
  if (!ids.length) return;
  const docs = APP.cache.allIK || [];
  const pub = ids.filter(id => { const d = docs.find(x => x.id === id); return d && d.status === 'Published'; });
  const skipped = ids.length - pub.length;
  if (!pub.length) { showToast('Tidak ada dokumen Published terpilih untuk diupload', 'warning'); return; }
  let ok = 0, fail = 0;
  for (let i = 0; i < pub.length; i++) {
    showToast(`Mengunggah ${i + 1}/${pub.length}…`, 'info');
    try { await API.uploadDocToDrive(pub[i]); ok++; } catch (e) { fail++; }
  }
  showToast(`Upload selesai: ${ok} berhasil${fail ? `, ${fail} gagal` : ''}${skipped ? `, ${skipped} dilewati (bukan Published)` : ''}`, fail ? 'warning' : 'success');
  await renderMasterIK(document.getElementById('appContent'));
}

function toggleColPicker() {
  const p = document.getElementById('colPicker');
  if (p) p.style.display = p.style.display === 'none' ? 'block' : 'none';
}

function toggleIKCol(key) {
  let cols = getIKColumns();
  if (cols.includes(key)) cols = cols.filter(c => c !== key);
  else cols.push(key);
  setIKColumns(cols);
  const docs = APP.cache.allIK || [];
  document.getElementById('ikTableHead').innerHTML = buildIKHeader(cols);
  document.getElementById('masterIKBody').innerHTML = renderIKRows(docs, cols);
  renderIcons();
  updateIKBulkBar();
}

async function filterMasterIK() {
  const unit = document.getElementById('filterUnit').value;
  const status = document.getElementById('filterStatus').value;
  const risk = document.getElementById('filterRisk').value;
  const search = (document.getElementById('filterSearch')?.value || '').toLowerCase();
  const retensi = document.getElementById('filterRetensi')?.value || '';
  let docs = APP.cache.allIK || [];
  if (unit) docs = docs.filter(d => d.unit_id == unit);
  if (status) docs = docs.filter(d => d.status === status);
  if (risk) docs = docs.filter(d => d.tingkat_risiko === risk);
  if (retensi) docs = docs.filter(d => {
    const info = retensiInfo(d);
    if (retensi === 'berlaku') return info && info.label === 'BERLAKU';
    if (retensi === 'tidak') return info && info.label === 'TIDAK BERLAKU';
    if (retensi === 'ditarik') return info && info.label === 'DITARIK';
    return true;
  });
  if (search) docs = docs.filter(d => (d.judul + ' ' + d.nomor_dokumen).toLowerCase().includes(search));
  const cols = getIKColumns();
  document.getElementById('masterIKBody').innerHTML = renderIKRows(docs, cols);
  document.getElementById('filterResultInfo').textContent = docs.length + ' dokumen';
  renderIcons();
  updateIKBulkBar();
}

function resetFilterIK() {
  ['filterUnit','filterStatus','filterRisk','filterRetensi'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  const s = document.getElementById('filterSearch'); if (s) s.value = '';
  filterMasterIK();
}

function exportIKExcel() {
  const cols = getIKColumns();
  const colMap = Object.fromEntries(IK_COLUMNS.map(c => [c.key, c.label]));
  const headers = cols.map(k => colMap[k] || k);
  const docs = APP.cache.allIK || [];
  const rows = docs.map(d => cols.map(k => {
    switch (k) {
      case 'status': return d.status || '';
      case 'tingkat_risiko': return d.tingkat_risiko || '';
      case 'revisi': return 'Rev ' + (d.revisi || '00');
      case 'tanggal_terbit': return d.tanggal_terbit || '';
      case 'review_due': return d.review_due || '';
      case 'scan_count': return d.scan_count != null ? d.scan_count : '0';
      default: return (d[k] || '').toString();
    }
  }));
  let csv = '\uFEFF' + headers.join(',') + '\n';
  rows.forEach(r => { csv += r.map(v => '"' + v.replace(/"/g,'""') + '"').join(',') + '\n'; });
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'master-ik-export.csv'; a.click();
  URL.revokeObjectURL(a.href);
  showToast('Excel diunduh', 'success');
}

function exportIKPdf() {
  const cols = getIKColumns();
  const colMap = Object.fromEntries(IK_COLUMNS.map(c => [c.key, c.label]));
  const headers = cols.map(k => colMap[k] || k);
  const docs = APP.cache.allIK || [];
  const rows = docs.map(d => cols.map(k => {
    switch (k) {
      case 'status': return d.status || '';
      case 'tingkat_risiko': return d.tingkat_risiko || '';
      case 'revisi': return 'Rev ' + (d.revisi || '00');
      case 'tanggal_terbit': return d.tanggal_terbit ? formatDate(d.tanggal_terbit) : '-';
      case 'review_due': return d.review_due ? formatDate(d.review_due) : '-';
      case 'scan_count': return d.scan_count != null ? '' + d.scan_count : '0';
      default: return (d[k] || '-').toString();
    }
  }));

  let html = `<html><head><meta charset="utf-8"><title>Master Data IK</title>
<style>body{font-family:Arial,sans-serif;font-size:10px;margin:20px}
h1{font-size:16px;margin-bottom:4px}
.sub{font-size:11px;color:#666;margin-bottom:16px}
table{width:100%;border-collapse:collapse}
th{background:#1a1f2e;color:#fff;padding:5px 6px;text-align:left;font-size:9px;text-transform:uppercase}
td{padding:4px 6px;border-bottom:1px solid #ddd}
tr:nth-child(even){background:#f8f9fa}
.total{margin-top:12px;font-size:11px;color:#666}
</style></head><body>
<h1>Master Data IK Repository</h1>
<div class="sub">PT PLN Nusantara Power UP Brantas — ${docs.length} dokumen</div>
<table><thead><tr>${headers.map(h => '<th>' + h + '</th>').join('')}</tr></thead>
<tbody>${rows.map(r => '<tr>' + r.map(c => '<td>' + c + '</td>').join('') + '</tr>').join('')}</tbody></table>
<div class="total">Dicetak: ${new Date().toLocaleDateString('id-ID')}</div>
</body></html>`;

  const w = window.open('', '_blank');
  w.document.write(html);
  w.document.close();
  w.focus();
  w.print();
  showToast('Cetak PDF', 'info');
}

async function viewDocDetail(id) {
  try {
    const res = await API.getDokumenById(id);
    const d = res.data;
    openGenericModal(
      esc(d.judul || d.nomor_dokumen),
      `
      <div class="grid-2" style="margin-bottom:16px">
        <div><div style="font-size:10px;font-weight:700;color:var(--text-tertiary);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:2px">No. Dokumen</div><div class="td-mono" style="font-size:13px">${esc(d.nomor_dokumen)}</div></div>
        <div><div style="font-size:10px;font-weight:700;color:var(--text-tertiary);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:2px">Status</div>${statusBadge(d.status)}</div>
        <div><div style="font-size:10px;font-weight:700;color:var(--text-tertiary);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:2px">Unit/Bidang</div><div style="font-size:12px">${esc(d.unit_nama || '')}</div></div>
        <div><div style="font-size:10px;font-weight:700;color:var(--text-tertiary);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:2px">Probis</div><div style="font-size:12px">${esc(d.probis_nomor || '')} — ${esc(d.probis_nama || '')}</div></div>
        <div><div style="font-size:10px;font-weight:700;color:var(--text-tertiary);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:2px">Revisi</div><span class="badge badge-blue" style="font-size:10px">Rev ${d.revisi || '00'}</span></div>
        <div><div style="font-size:10px;font-weight:700;color:var(--text-tertiary);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:2px">Risiko</div>${riskBadge(d.tingkat_risiko)}</div>
        <div><div style="font-size:10px;font-weight:700;color:var(--text-tertiary);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:2px">Tgl. Terbit</div><div style="font-size:12px">${d.tanggal_terbit ? formatDate(d.tanggal_terbit) : '<span style="color:var(--text-tertiary)">—</span>'}</div></div>
        <div><div style="font-size:10px;font-weight:700;color:var(--text-tertiary);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:2px">Owner</div><div style="font-size:12px">${esc(d.owner_nama || '-')}</div></div>
        <div><div style="font-size:10px;font-weight:700;color:var(--text-tertiary);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:2px">Review Due</div><div style="font-size:12px">${formatDate(d.review_due)}</div></div>
      </div>
      <hr class="section-divider">
      <div style="display:flex;gap:16px;flex-wrap:wrap">
        <div style="flex:1;min-width:180px">
          <div style="font-size:10px;font-weight:700;color:var(--text-tertiary);text-transform:uppercase;margin-bottom:4px">Cloud Storage (GDrive)</div>
          <div style="font-size:11px;font-family:monospace;color:var(--text-secondary);background:var(--surface-2);padding:6px 10px;border-radius:4px;word-break:break-all">${esc(d.cloud_path || '-')}</div>
        </div>
        ${d.status === 'Published' ? `
        <div>
          <div style="font-size:10px;font-weight:700;color:var(--text-tertiary);text-transform:uppercase;margin-bottom:4px">QR Code</div>
          <div style="display:flex;align-items:center;gap:8px">
            <div style="width:48px;height:48px;background:var(--surface-2);border-radius:6px;display:flex;align-items:center;justify-content:center">${icon('qr-code', 28)}</div>
            <div>
              <div style="font-size:11px;color:var(--text-secondary)">Scan untuk akses lapangan</div>
              <button class="btn btn-secondary btn-xs" style="margin-top:4px" onclick="generateAndDownloadQR(${d.id})">${icon('download', 12)} Unduh QR</button>
            </div>
          </div>
        </div>` : ''}
      </div>
      `,
      `<button class="btn btn-secondary btn-sm" onclick="closeModal('modalGeneric')">Tutup</button>
       <button class="btn btn-secondary btn-sm" onclick="closeModal('modalGeneric');previewDokumenFull(${d.id})">${icon('eye', 14)} Preview</button>
       <button class="btn btn-secondary btn-sm" onclick="closeModal('modalGeneric');previewDokumenFull(${d.id},'pdf')">${icon('printer', 14)} PDF</button>
       <button class="btn btn-primary btn-sm" onclick="closeModal('modalGeneric');downloadDocx(${d.id})">${icon('download', 14)} DOCX</button>
       ${d.status === 'Draft' ? `<button class="btn btn-primary btn-sm" onclick="closeModal('modalGeneric');editDokumen(${d.id})">${icon('edit-3', 14)} Edit</button>` : ''}`
    );
    renderIcons();
  } catch (e) {
    console.error('[MasterIK] viewDocDetail error:', e);
    showToast('Gagal memuat detail dokumen: ' + e.message, 'error');
  }
}

// ─── UPLOAD KE GOOGLE DRIVE (manual, dokumen Published) ───
async function uploadIKToDrive(id) {
  try {
    showToast('Mengunggah ke Google Drive…', 'info');
    const r = await API.uploadDocToDrive(id);
    showToast('Berhasil diunggah ke Google Drive ✓', 'success');
    await renderMasterIK(document.getElementById('appContent'));
    if (r && r.data && r.data.gdrive_url) window.open(r.data.gdrive_url, '_blank', 'noopener');
  } catch (e) {
    showToast('Gagal upload ke Drive: ' + e.message, 'error');
  }
}

// ─── DUPLIKAT / REVISI / TARIK ───
async function duplicateIK(id) {
  const ok = await confirmDialog({
    title: 'Salin sebagai IK Baru',
    icon: 'copy',
    message: 'Dokumen ini akan disalin menjadi <b>IK baru</b> dengan <b>nomor baru</b>, revisi <b>00</b>, dan status <b>Draft</b>. Anda akan langsung diarahkan ke editor.',
    confirmText: 'Salin',
  });
  if (!ok) return;
  try {
    const r = await API.duplicateDokumen(id);
    showToast(`Disalin → ${r.data?.nomor_dokumen || 'IK baru'} ✓`, 'success');
    APP.cache.masterIK = null;
    await renderMasterIK(document.getElementById('appContent'));
    if (r.data?.id) editDokumen(r.data.id);
  } catch (e) {
    showToast('Gagal menyalin: ' + e.message, 'error');
  }
}

async function reviseIK(id) {
  const ok = await confirmDialog({
    title: 'Revisi Dokumen',
    icon: 'git-compare',
    message: 'Dokumen ini akan dibuka kembali sebagai <b>Draft</b> untuk direvisi. <b>Nomor dokumen tetap sama</b>, versi naik (mis. 00 → 01). Perubahan yang Anda lakukan akan tercatat otomatis di <b>Daftar Perubahan</b>. Setelah selesai, ajukan ulang persetujuan.',
    confirmText: 'Mulai Revisi',
  });
  if (!ok) return;
  try {
    const r = await API.reviseDokumen(id);
    showToast(`Dokumen dibuka untuk revisi ${r.data?.revisi || ''} ✓`, 'success');
    APP.cache.masterIK = null;
    await renderMasterIK(document.getElementById('appContent'));
    if (r.data?.id) editDokumen(r.data.id);
  } catch (e) {
    showToast('Gagal membuat revisi: ' + e.message, 'error');
  }
}

async function withdrawIK(id) {
  const reason = await confirmDialog({
    title: 'Tarik Dokumen',
    icon: 'archive-x',
    danger: true,
    message: 'Dokumen akan ditandai <b>DITARIK</b> (obsolete) dan tidak lagi berlaku. Tindakan ini sebaiknya hanya untuk dokumen yang sudah tidak dipakai.',
    input: { label: 'Alasan penarikan (opsional)', placeholder: 'mis. Digantikan kebijakan baru…' },
    confirmText: 'Tarik Dokumen',
  });
  if (reason === null) return;
  try {
    await API.withdrawDoc(id, reason);
    showToast('Dokumen ditarik (DITARIK) ✓', 'success');
    APP.cache.masterIK = null;
    await renderMasterIK(document.getElementById('appContent'));
  } catch (e) {
    showToast('Gagal menarik dokumen: ' + e.message, 'error');
  }
}

// ─── QR CODE GENERATION & DOWNLOAD ───
async function generateAndDownloadQR(id) {
  try {
    const res = await API.getDokumenById(id);
    const d = res.data;
    const qrData = `BDMS|${d.nomor_dokumen}|Rev${d.revisi||'00'}|${d.tanggal_terbit||'draft'}`;
    const svg = generateQRCodeSVG(qrData);

    // Create downloadable SVG file
    const blob = new Blob([svg], { type: 'image/svg+xml' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `QR-${d.nomor_dokumen}.svg`;
    a.click();
    URL.revokeObjectURL(a.href);
    showToast('QR Code diunduh: QR-' + d.nomor_dokumen + '.svg', 'success');
  } catch (e) {
    showToast('Gagal generate QR: ' + e.message, 'error');
  }
}