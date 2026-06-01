// QR Code Manager Page
async function renderQRCode(container) {
  container.innerHTML = `<div class="page active" id="page-qrcode"></div>`;

  try {
    const [qrRes, statsRes] = await Promise.all([API.getQRData(), API.getQRStats()]);
    const qrs = qrRes.data || [];
    const stats = statsRes.data || {};

    document.getElementById('page-qrcode').innerHTML = `
      <div class="page-header">
        <div class="page-header-left">
          <div class="page-title">QR Code Manager</div>
          <div class="page-subtitle">Generate dan kelola QR Code untuk akses IK di lapangan</div>
        </div>
        <div class="page-actions">
          <button class="btn btn-primary" onclick="showToast('Generate QR Code untuk semua Published','info')">${icon('refresh-ccw', 14)} Generate Semua QR</button>
        </div>
      </div>
      <div class="grid-main-side">
        <div class="card">
          <div class="card-header"><div class="card-title">${icon('camera', 14)} Daftar QR Code Aktif</div></div>
          <div class="table-container">
            <table>
              <thead><tr><th>No. Dokumen</th><th>Judul IK</th><th>Scan Count</th><th>Aksi</th></tr></thead>
              <tbody>
                ${qrs.length ? qrs.map(q => `
                  <tr>
                    <td class="td-mono">${esc(q.nomor_dokumen)}</td>
                    <td style="font-size:12.5px">${esc(q.judul)}</td>
                    <td style="text-align:center;font-weight:700;color:var(--pln-sky)">${q.scan_count || 0}</td>
                    <td><button class="btn btn-secondary btn-xs" onclick="showToast('QR PNG diunduh','success')">${icon('download', 14)} Download</button></td>
                  </tr>
                `).join('') : '<tr><td colspan="4" style="text-align:center;padding:24px;color:var(--text-tertiary)">Belum ada QR Code. Publish dokumen untuk generate QR.</td></tr>'}
              </tbody>
            </table>
          </div>
        </div>
        <div class="card">
          <div class="card-header"><div class="card-title">${icon('bar-chart-3', 14)} Statistik QR Scan</div></div>
          <div class="card-body">
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px">
              <div style="text-align:center;padding:14px;background:var(--surface-2);border-radius:var(--radius)">
                <div style="font-size:24px;font-weight:800;color:var(--success)">${stats.today || 0}</div>
                <div style="font-size:11px;color:var(--text-tertiary)">Scan Hari Ini</div>
              </div>
              <div style="text-align:center;padding:14px;background:var(--surface-2);border-radius:var(--radius)">
                <div style="font-size:24px;font-weight:800;color:var(--pln-sky)">${stats.month || 0}</div>
                <div style="font-size:11px;color:var(--text-tertiary)">Scan Bulan Ini</div>
              </div>
            </div>
            <div class="section-heading">Top Dokumen Terscan</div>
            ${(stats.top_documents || []).map(q => `
              <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid var(--border)">
                <div>
                  <div style="font-size:12px;font-weight:600;font-family:var(--mono);color:var(--pln-blue-700)">${esc(q.nomor_dokumen)}</div>
                  <div style="font-size:11px;color:var(--text-tertiary)">${esc(q.judul || '')}</div>
                </div>
                <span style="font-size:14px;font-weight:800;color:var(--pln-sky)">${q.scan_count || 0}×</span>
              </div>
            `).join('') || '<div style="color:var(--text-tertiary);font-size:13px">Belum ada data scan</div>'}
          </div>
        </div>
      </div>
    `;
    renderIcons();
  } catch (e) {
    container.innerHTML = `<div class="page active"><div class="alert alert-danger">${esc(e.message)}</div></div>`;
  }
}
