// Dashboard Page
const DASHBOARD_STAT_ICONS = {
  total: { icon: 'file-text', color: '#2C5282', bg: '#EBF0F7', accent: '#2C5282' },
  published: { icon: 'check-circle', color: '#3D7A5A', bg: '#E8F2EC', accent: '#3D7A5A' },
  pending: { icon: 'clock', color: '#B87A3A', bg: '#F5EDE2', accent: '#B87A3A' },
  overdue: { icon: 'alert-triangle', color: '#B34532', bg: '#F2E4E0', accent: '#B34532' },
};

async function renderDashboard(container) {
  container.innerHTML = `<div class="page active" id="page-dashboard">
    <div class="page-header">
      <div class="page-title-wrap">
        <div class="page-title">Selamat Datang, ${esc(APP.user.nama || 'User')}</div>
        <div class="page-subtitle">${new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} · PLN Nusantara Power UP Brantas</div>
      </div>
      <div class="page-actions">
        <button class="btn btn-secondary btn-sm" onclick="showPage('laporan')">${icon('bar-chart-3', 14)} Export</button>
        <button class="btn btn-primary btn-sm" onclick="showPage('buat-ik')">${icon('plus', 14)} Buat IK</button>
      </div>
    </div>
    <div class="stats-grid" id="dash-stats">${cardSkeleton(4)}</div>
    <div class="grid-main-side" id="dash-main">
      <div id="dash-left"><div class="card"><div class="card-body" style="padding:40px;text-align:center;color:var(--text-tertiary)">Memuat data...</div></div></div>
      <div id="dash-right"><div class="card"><div class="card-body" style="padding:40px;text-align:center;color:var(--text-tertiary)">Memuat data...</div></div></div>
    </div>
  </div>`;
  renderIcons();

  try {
    const res = await API.getDashboard();
    const d = res.data;

    // Stats
    document.getElementById('dash-stats').innerHTML = Object.entries(DASHBOARD_STAT_ICONS).map(([key, s]) => `
      <div class="stat-card">
        <div class="stat-card-accent" style="background:${s.accent}"></div>
        <div class="stat-card-icon" style="background:${s.bg};color:${s.color}">${icon(s.icon, 18)}</div>
        <div class="stat-label">${key === 'total' ? 'Total Dokumen IK' : key === 'published' ? 'IK Published & Aktif' : key === 'pending' ? 'Menunggu Persetujuan' : 'IK Overdue Review'}</div>
        <div class="stat-value" style="color:${s.color}">${d.stats[key] ?? 0}</div>
      </div>
    `).join('');
    renderIcons();

    // Left: Distribution + Unit Progress
    document.getElementById('dash-left').innerHTML = `
      <div class="card">
        <div class="card-header">
          <div class="card-title">${icon('pie-chart', 16)} Distribusi Status Dokumen IK</div>
          <button class="btn btn-ghost btn-sm" onclick="showPage('master-ik')">Lihat Semua ${icon('chevron-right', 14)}</button>
        </div>
        <div class="card-body">
          <div style="display:flex;gap:16px;margin-bottom:20px;flex-wrap:wrap">${renderStatusBadges(d.status_distribution)}</div>
          <div class="section-heading">${icon('trending-up', 12)} IK per Unit PLTA</div>
          <div style="display:flex;flex-direction:column;gap:10px">${(d.unit_progress || []).map(u => {
            const pct = u.total > 0 ? Math.round(u.published / u.total * 100) : 0;
            const barColor = pct >= 85 ? 'var(--success)' : pct >= 70 ? 'var(--warning)' : 'var(--danger)';
            return `<div style="display:flex;align-items:center;gap:12px">
              <div style="width:100px;font-size:12px;font-weight:600;color:var(--text-secondary);flex-shrink:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(u.nama)}</div>
              <div style="flex:1"><div class="progress-bar"><div class="progress-fill" style="width:${pct}%;background:${barColor}"></div></div></div>
              <div style="font-size:12px;font-weight:700;min-width:32px;text-align:right;color:var(--text-secondary)">${pct}%</div>
              <div style="font-size:11px;color:var(--text-tertiary);min-width:50px;text-align:right">${u.published}/${u.total} IK</div>
            </div>`;
          }).join('')}</div>
        </div>
      </div>
      <div class="card">
        <div class="card-header">
          <div class="card-title">${icon('file-text', 16)} Dokumen IK Terbaru</div>
          <button class="btn btn-ghost btn-sm" onclick="showPage('master-ik')">Lihat Semua ${icon('chevron-right', 14)}</button>
        </div>
        <div class="table-container"><table>
          <thead><tr><th>No Dokumen</th><th>Judul</th><th>Status</th><th>Unit</th><th>Tgl Dibuat</th></tr></thead>
          <tbody>${(d.recent_documents || []).map(doc => `<tr>
            <td class="td-mono">${esc(doc.nomor_dokumen)}</td>
            <td style="font-weight:500">${esc(doc.judul || doc.judul_ik || '-')}</td>
            <td>${statusBadge(doc.status)}</td>
            <td style="font-size:11px;color:var(--text-secondary)">${esc(doc.unit_nama || '-')}</td>
            <td style="font-size:11px;color:var(--text-tertiary)">${formatDate(doc.created_at)}</td>
          </tr>`).join('')}</tbody>
        </table></div>
      </div>
    `;
    renderIcons();

    // Right: Recent notifications
    const notifs = APP.cache.notif || [];
    const unread = notifs.filter(n => !n.is_read).length;
    const recentNotifs = notifs.slice(0, 6);
    document.getElementById('dash-right').innerHTML = `
      <div class="card">
        <div class="card-header">
          <div class="card-title" style="display:flex;align-items:center;gap:8px">${icon('bell', 16)} Notifikasi Terbaru</div>
          ${unread > 0 ? `<span class="badge badge-primary">${unread} baru</span>` : ''}
        </div>
        <div style="padding:8px 0">${recentNotifs.length === 0 ? `<div style="padding:32px;text-align:center;color:var(--text-tertiary);font-size:13px">${icon('inbox', 20)}<br><br>Tidak ada notifikasi</div>` :
          recentNotifs.map(n => `<div class="notif-item ${n.is_read ? '' : 'unread'}" onclick="readNotif(${n.id})" style="padding:10px 14px;border-bottom:1px solid var(--border);cursor:pointer">
            <div class="notif-dot" style="background:var(--info-bg);color:var(--info)">${icon('message-circle', 14)}</div>
            <div class="notif-content"><div class="notif-title">${esc(n.judul || n.tipe || 'Notifikasi')}</div>
            <div class="notif-desc">${esc(n.pesan || '')}</div>
            <div class="notif-time">${formatDate(n.created_at)}</div></div>
          </div>`).join('')}</div>
        <div style="padding:8px 14px 12px;border-top:1px solid var(--border)">
          <button class="btn btn-ghost btn-sm" onclick="toggleNotif()" style="width:100%;justify-content:center">${icon('bell', 14)} Lihat Semua Notifikasi</button>
        </div>
      </div>
    `;
    renderIcons();
  } catch (e) {
    document.getElementById('dash-stats').innerHTML = `<div style="grid-column:1/-1;padding:20px;text-align:center;color:var(--danger)">${icon('alert-circle', 18)} Gagal memuat data: ${esc(e.message)}</div>`;
    renderIcons();
  }
}

function renderStatusBadges(dist) {
  const colors = { Draft: 'badge-draft', Review: 'badge-review', Approved: 'badge-approved', Published: 'badge-published', Archived: 'badge-archived' };
  return Object.entries(dist || {}).map(([k, v]) => {
    if (!v) return '';
    const pct = Math.round(v / Object.values(dist).reduce((a, b) => a + b, 0) * 100);
    return `<span class="badge ${colors[k] || 'badge-gray'}" style="font-size:12px;padding:4px 12px">${esc(k)}: ${v} (${pct}%)</span>`;
  }).filter(Boolean).join('');
}
