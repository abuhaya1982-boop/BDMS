// Laporan & Monitoring Page
async function renderLaporan(container) {
  container.innerHTML = `<div class="page active" id="page-laporan"></div>`;

  try {
    const res = await API.getLaporan();
    const d = res.data;

    // Generate chart bars
    const probisData = (d.probis_distribusi || []).slice(0, 6);
    const maxProbis = Math.max(...probisData.map(p => p.count), 1);
    const trendData = (d.monthly_trend || []);
    const maxTrend = Math.max(...trendData.map(t => t.count), 1);

    document.getElementById('page-laporan').innerHTML = `
      <div class="page-header">
        <div class="page-header-left">
          <div class="page-title">Laporan & Monitoring</div>
          <div class="page-subtitle">Analitik governance IK untuk keperluan manajemen, audit IMS, SMK2, SPI, dan PSM</div>
        </div>
        <div class="page-actions">
          <button class="btn btn-secondary" onclick="showToast('Mengunduh laporan...','success')">${icon('download', 14)} Export Laporan</button>
        </div>
      </div>
      <div class="grid-3" style="margin-bottom:20px">
        <div class="card">
          <div class="card-header"><div class="card-title">${icon('bar-chart-3', 14)} IK per Probis</div></div>
          <div class="card-body">
            <div class="chart-area" id="chartProbis">
              ${probisData.map(p => `
                <div class="chart-bar-wrap">
                  <div class="chart-bar-val">${p.count}</div>
                  <div class="chart-bar" style="height:${Math.round(p.count / maxProbis * 100)}px;background:var(--pln-blue-600)"></div>
                  <div class="chart-bar-label">${esc(p.nomor || '')}</div>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
        <div class="card">
          <div class="card-header"><div class="card-title">${icon('calendar', 14)} Trend Pembuatan IK</div></div>
          <div class="card-body">
            <div class="chart-area" id="chartTrend">
              ${trendData.map(t => `
                <div class="chart-bar-wrap">
                  <div class="chart-bar-val">${t.count}</div>
                  <div class="chart-bar" style="height:${Math.round(t.count / maxTrend * 100)}px;background:var(--pln-sky)"></div>
                  <div class="chart-bar-label">${t.bulan ? t.bulan.substring(5) : ''}</div>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
        <div class="card">
          <div class="card-header"><div class="card-title">${icon('zap', 14)} Compliance Rate</div></div>
          <div class="card-body">
            <div style="text-align:center;padding:10px 0">
              <div style="font-size:48px;font-weight:900;color:${(d.compliance?.compliance_rate || 0) >= 80 ? 'var(--success)' : 'var(--warning)'}">${d.compliance?.compliance_rate || 0}%</div>
              <div style="font-size:13px;color:var(--text-tertiary)">Tingkat kepatuhan pengelolaan IK</div>
              <div style="margin:16px 0">
                <div>
                  <div style="display:flex;justify-content:space-between;margin-bottom:4px"><span style="font-size:12px">Compliant</span><span style="font-size:12px;font-weight:700">${d.compliance?.compliant || 0}/${d.compliance?.total || 0}</span></div>
                  <div class="progress-bar"><div class="progress-fill" style="width:${d.compliance?.compliance_rate || 0}%;background:${(d.compliance?.compliance_rate || 0) >= 80 ? 'var(--success)' : 'var(--warning)'}"></div></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="card">
        <div class="card-header">
          <div class="card-title">${icon('clipboard', 14)} Rekap per Unit PLTA</div>
          <button class="btn btn-secondary btn-sm" onclick="showToast('Export Excel','success')">${icon('download', 14)} Export</button>
        </div>
        <div class="table-container">
          <table>
            <thead><tr><th>Unit PLTA</th><th>Kode</th><th>Total</th><th>Published</th><th>Draft</th><th>Review</th><th>Overdue</th><th>Compliance</th></tr></thead>
            <tbody>
              ${(d.unit_laporan || []).map(u => {
                const comp = u.total > 0 ? Math.round((u.total - (u.overdue || 0)) / u.total * 100) : 0;
                return `<tr>
                  <td style="font-weight:600">${esc(u.nama)}</td>
                  <td><span class="badge badge-blue">${esc(u.kode)}</span></td>
                  <td style="text-align:center;font-weight:700">${u.total}</td>
                  <td style="text-align:center"><span class="badge badge-success">${u.published}</span></td>
                  <td style="text-align:center"><span class="badge badge-draft">${u.draft || 0}</span></td>
                  <td style="text-align:center"><span class="badge badge-review">${u.in_review || 0}</span></td>
                  <td style="text-align:center"><span class="badge ${(u.overdue || 0) > 0 ? 'badge-risk-high' : 'badge-success'}">${u.overdue || 0}</span></td>
                  <td>
                    <div class="progress-bar-wrap">
                      <div class="progress-bar"><div class="progress-fill" style="width:${comp}%;background:${comp >= 85 ? 'var(--success)' : comp >= 70 ? 'var(--warning)' : 'var(--danger)'}"></div></div>
                      <div class="progress-label" style="color:${comp >= 85 ? 'var(--success)' : comp >= 70 ? 'var(--warning)' : 'var(--danger)'}">${comp}%</div>
                    </div>
                  </td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
    renderIcons();
  } catch (e) {
    container.innerHTML = `<div class="page active"><div class="alert alert-danger">${esc(e.message)}</div></div>`;
  }
}
