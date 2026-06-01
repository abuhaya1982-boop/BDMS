// Admin — Enhanced Audit Trail Viewer
let allAuditLogs = [];
let auditTotal = 0;
let auditPage = 0;
const AUDIT_PER_PAGE = 50;

async function renderAdminAudit(container) {
  container.innerHTML = `<div class="page active" id="page-admin-audit"></div>`;
  try {
    await loadAuditPage(0);
    renderAuditPage();
  } catch (e) {
    container.innerHTML = `<div class="page active"><div class="alert alert-danger">${esc(e.message)}</div></div>`;
  }
}

async function loadAuditPage(page) {
  auditPage = page;
  const params = new URLSearchParams({
    limit: AUDIT_PER_PAGE,
    offset: page * AUDIT_PER_PAGE
  });
  const tipeFilter = document.getElementById('audit-filter-type')?.value;
  if (tipeFilter) params.set('tipe', tipeFilter);
  const searchFilter = document.getElementById('audit-search')?.value;
  if (searchFilter) params.set('search', searchFilter);

  const res = await API.getAuditLogs(params.toString());
  allAuditLogs = res.data?.items || res.data || [];
  auditTotal = res.data?.total || allAuditLogs.length;
}

function renderAuditPage() {
  const page = document.getElementById('page-admin-audit');
  if (!page) return;

  const totalPages = Math.ceil(auditTotal / AUDIT_PER_PAGE);
  const typeMap = {
    auth: icon('lock', 14), doc: icon('file-text', 14), approve: icon('check', 14), review: icon('eye', 14),
    create: icon('plus', 14), system: icon('settings', 14), qr: icon('camera', 14), role: icon('key', 13),
    user: icon('user', 14), workflow: icon('refresh-ccw', 14), session: icon('smartphone', 14), password: icon('lock', 14)
  };

  page.innerHTML = `
    <div class="page-header" style="margin-bottom:8px">
      <div class="page-header-left">
        <div class="page-title">Audit Trail Lengkap</div>
        <div class="page-subtitle">${auditTotal} catatan</div>
      </div>
      <div class="page-actions" style="gap:4px">
        <button class="btn btn-secondary btn-sm" onclick="exportAuditCSV()">${icon('download', 14)} Export CSV</button>
      </div>
    </div>
    <div class="card" style="margin-bottom:8px">
      <div class="card-body" style="padding:8px 14px">
        <div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center">
          <input type="text" style="padding:5px 10px;font-size:11.5px;border:1px solid var(--border);border-radius:6px;width:200px" id="audit-search" placeholder="Cari detail/pengguna..." oninput="debounceAuditFilter()">
          <select style="padding:5px 10px;font-size:11.5px;border:1px solid var(--border);border-radius:6px" id="audit-filter-type" onchange="applyAuditFilter()">
            <option value="">Semua Tipe</option>
            <option>auth</option><option>doc</option><option>approve</option><option>review</option>
            <option>create</option><option>user</option><option>role</option><option>workflow</option>
            <option>session</option><option>password</option><option>system</option>
          </select>
        </div>
      </div>
    </div>
    <div class="card">
      <div class="table-container" style="max-height:65vh">
        <table>
          <thead><tr><th style="width:30px"></th><th>Waktu</th><th>User</th><th>Aksi</th><th>Detail</th><th>IP</th></tr></thead>
          <tbody>
            ${allAuditLogs.map(a => `
              <tr>
                <td style="text-align:center;font-size:14px">${typeMap[a.tipe] || icon('clipboard', 14)}</td>
                <td style="font-size:11px;white-space:nowrap;color:var(--text-tertiary)">${formatDateTime(a.created_at)}</td>
                <td style="font-size:12px;font-weight:600">${esc(a.user_nama || 'System')}</td>
                <td style="font-size:12px"><span class="badge badge-gray" style="font-size:10px">${esc(a.aksi)}</span></td>
                <td style="font-size:11.5px;max-width:400px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${esc(a.detail || '')}">${esc(a.detail || '-')}</td>
                <td style="font-size:10px;font-family:monospace;color:var(--text-tertiary)">${esc(a.ip_address || '-')}</td>
              </tr>
            `).join('')}
            ${!allAuditLogs.length ? '<tr><td colspan="6" style="text-align:center;color:var(--text-tertiary);padding:24px">Tidak ada data</td></tr>' : ''}
          </tbody>
        </table>
      </div>
    </div>
    ${totalPages > 1 ? `
    <div style="display:flex;justify-content:center;align-items:center;gap:8px;margin-top:12px">
      <button class="btn btn-secondary btn-xs" ${auditPage <= 0 ? 'disabled' : ''} onclick="goAuditPage(${auditPage - 1})">← Prev</button>
      <span style="font-size:12px;color:var(--text-secondary)">Halaman ${auditPage + 1} dari ${totalPages}</span>
      <button class="btn btn-secondary btn-xs" ${auditPage >= totalPages - 1 ? 'disabled' : ''} onclick="goAuditPage(${auditPage + 1})">Next →</button>
    </div>` : ''}
  `;
  renderIcons();
}

function formatDateTime(dateStr) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' }) + ' ' +
    d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
}

const debounceAuditFilter = debounce(async () => {
  await loadAuditPage(0);
  renderAuditPage();
}, 400);

async function applyAuditFilter() {
  await loadAuditPage(0);
  renderAuditPage();
}

async function goAuditPage(page) {
  await loadAuditPage(page);
  renderAuditPage();
}

function exportAuditCSV() {
  const headers = ['Waktu','User','Aksi','Tipe','Detail','IP Address'];
  let csv = '\uFEFF' + headers.join(',') + '\n';
  allAuditLogs.forEach(a => {
    const row = [a.created_at, a.user_nama||'System', a.aksi, a.tipe, a.detail||'', a.ip_address||''];
    csv += row.map(v => '"' + (v||'').replace(/"/g,'""') + '"').join(',') + '\n';
  });
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'audit-trail-export.csv';
  a.click();
  URL.revokeObjectURL(a.href);
  showToast(allAuditLogs.length + ' baris di-export', 'success');
}
