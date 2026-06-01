// Audit Trail Page
async function renderAudit(container) {
  container.innerHTML = `<div class="page active" id="page-audit"></div>`;

  try {
    const res = await API.getAuditLogs('limit=100');
    const logs = res.data || [];

    const typeColors = { auth: '#E3FCEF', doc: '#E6F0FF', approve: '#E3FCEF', review: '#FFF4E6', create: '#E6F0FF', system: '#F3E5F5', qr: '#E8EBF8' };
    const typeIcons = { auth: icon('lock', 14), doc: icon('file-text', 14), approve: icon('check', 14), review: icon('search', 14), create: icon('plus', 14), system: icon('settings', 14), qr: icon('camera', 14) };

    document.getElementById('page-audit').innerHTML = `
      <div class="page-header">
        <div class="page-header-left">
          <div class="page-title">Audit Trail</div>
          <div class="page-subtitle">Riwayat lengkap seluruh aktivitas sistem untuk keperluan audit IMS, SMK2, SPI</div>
        </div>
        <div class="page-actions">
          <button class="btn btn-secondary" onclick="showToast('Export audit log...','info')">${icon('download', 14)} Export Log</button>
        </div>
      </div>
      <div class="card">
        <div class="card-body" style="padding:0">
          <div class="audit-timeline">
            ${logs.length ? logs.map(a => `
              <div class="audit-item" style="padding:14px 20px">
                <div class="audit-timeline-dot" style="background:${typeColors[a.tipe] || 'var(--border)'}"></div>
                <div class="audit-content" style="margin-left:8px">
                  <div class="audit-action">${esc(a.aksi)} — <strong>${esc(a.user_nama || 'System')}</strong></div>
                  <div class="audit-detail">${esc(a.detail)}</div>
                  <div class="audit-meta">${formatDate(a.created_at)}</div>
                </div>
              </div>
            `).join('') : '<div style="padding:40px;text-align:center;color:var(--text-tertiary)">Belum ada data audit</div>'}
          </div>
        </div>
      </div>
    `;
    renderIcons();
  } catch (e) {
    container.innerHTML = `<div class="page active"><div class="alert alert-danger">${esc(e.message)}</div></div>`;
  }
}
