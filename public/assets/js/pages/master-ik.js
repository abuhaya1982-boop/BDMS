const IK_COLUMNS = [
  { key: 'nomor_dokumen', label: 'No. Dokumen', default: true },
  { key: 'judul', label: 'Nama IK / Judul', default: true },
  { key: 'unit_nama', label: 'Unit / Bidang', default: true },
  { key: 'revisi', label: 'Rev', default: true },
  { key: 'status', label: 'Status', default: true },
  { key: 'tingkat_risiko', label: 'Risiko', default: true },
  { key: 'tanggal_terbit', label: 'Tgl. Terbit', default: true },
  { key: 'owner_nama', label: 'Owner', default: true },
  { key: 'review_due', label: 'Review Due', default: false },
  { key: 'probis_nama', label: 'Probis', default: false },
  { key: 'scan_count', label: 'Scan QR', default: false },
];

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
  return cols.concat(['aksi']).map(k => {
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
  return docs.map(d => {
    const cells = cols.map(k => {
      switch (k) {
        case 'nomor_dokumen': return `<td class="td-mono">${esc(d.nomor_dokumen)}</td>`;
        case 'judul': return `<td style="max-width:200px"><div title="${esc(d.judul)}" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:200px;text-transform:uppercase;font-weight:600">${esc(d.judul)}</div></td>`;
        case 'unit_nama': return `<td style="font-size:11.5px">${esc(d.unit_nama || '')}</td>`;
        case 'revisi': return `<td style="text-align:center"><span class="badge badge-blue" style="font-size:10px">Rev ${d.revisi || '00'}</span></td>`;
        case 'status': return `<td>${statusBadge(d.status)}</td>`;
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
        </div>
      </td>
    `);
    return `<tr>${cells.join('')}</tr>`;
  }).join('');
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
}

async function filterMasterIK() {
  const unit = document.getElementById('filterUnit').value;
  const status = document.getElementById('filterStatus').value;
  const risk = document.getElementById('filterRisk').value;
  const search = (document.getElementById('filterSearch')?.value || '').toLowerCase();
  let docs = APP.cache.allIK || [];
  if (unit) docs = docs.filter(d => d.unit_id == unit);
  if (status) docs = docs.filter(d => d.status === status);
  if (risk) docs = docs.filter(d => d.tingkat_risiko === risk);
  if (search) docs = docs.filter(d => (d.judul + ' ' + d.nomor_dokumen).toLowerCase().includes(search));
  const cols = getIKColumns();
  document.getElementById('masterIKBody').innerHTML = renderIKRows(docs, cols);
  document.getElementById('filterResultInfo').textContent = docs.length + ' dokumen';
}

function resetFilterIK() {
  ['filterUnit','filterStatus','filterRisk'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
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