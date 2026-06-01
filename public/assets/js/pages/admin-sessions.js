// Admin — Active Sessions Manager
let allSessions = [];
let sessionUsers = [];

async function renderAdminSessions(container) {
  container.innerHTML = `<div class="page active" id="page-admin-sessions"></div>`;
  try {
    await loadSessionsData();
    renderSessionsPage();
  } catch (e) {
    container.innerHTML = `<div class="page active"><div class="alert alert-danger">${esc(e.message)}</div></div>`;
  }
}

async function loadSessionsData() {
  const [sessionsRes, usersRes] = await Promise.all([
    API.getSessions(),
    API.getUsers()
  ]);
  allSessions = sessionsRes.data || [];
  sessionUsers = usersRes.data || [];
}

function renderSessionsPage() {
  const page = document.getElementById('page-admin-sessions');
  if (!page) return;

  const activeCount = allSessions.filter(s => s.is_active).length;
  const userMap = {};
  sessionUsers.forEach(u => userMap[u.id] = u);

  page.innerHTML = `
    <div class="page-header" style="margin-bottom:8px">
      <div class="page-header-left">
        <div class="page-title">Sesi Aktif Pengguna</div>
        <div class="page-subtitle">${activeCount} sesi aktif · ${allSessions.length} total</div>
      </div>
      <div class="page-actions" style="gap:4px">
        <button class="btn btn-secondary btn-sm" onclick="refreshSessions()">${icon('refresh-ccw', 14)} Refresh</button>
      </div>
    </div>
    <div class="card">
      <div class="table-container">
        <table>
          <thead><tr><th>Pengguna</th><th>Perangkat</th><th>IP Address</th><th>Login</th><th>Terakhir Aktif</th><th>Status</th><th>Aksi</th></tr></thead>
          <tbody>
            ${allSessions.map(s => {
              const user = userMap[s.user_id] || {};
              return `
                <tr>
                  <td>
                    <div style="display:flex;align-items:center;gap:6px">
                      <div style="width:24px;height:24px;border-radius:50%;background:linear-gradient(135deg,var(--pln-sky),var(--pln-blue-600));display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;color:white">${getInitials(user.nama || '?')}</div>
                      <span style="font-weight:600;font-size:12px">${esc(user.nama || 'Unknown')}</span>
                    </div>
                  </td>
                  <td style="font-size:11.5px">${esc(s.device_name || '-')}</td>
                  <td style="font-size:11px;font-family:monospace">${esc(s.ip_address || '-')}</td>
                  <td style="font-size:11.5px">${formatDate(s.login_at)}</td>
                  <td style="font-size:11.5px">${formatDate(s.last_active_at)}</td>
                  <td>${s.is_active ? '<span class="badge badge-success">● Aktif</span>' : '<span class="badge badge-gray">● Nonaktif</span>'}</td>
                  <td>
                    ${s.is_active ? `<button class="btn btn-danger btn-xs" onclick="forceLogout(${s.id})" title="Putuskan sesi">${icon('log-out', 14)} Putus</button>` : '-'}
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
      </div>
    `;
  renderIcons();
  }

async function refreshSessions() {
  await loadSessionsData();
  renderSessionsPage();
  showToast('Sesi diperbarui', 'success');
}

async function forceLogout(id) {
  const ok = await renderConfirmDialog('Putus Sesi', 'Yakin ingin memutus sesi ini? Pengguna harus login ulang.');
  if (!ok) return;
  try {
    await API.forceLogoutSession(id);
    showToast('Sesi diputuskan', 'success');
    refreshSessions();
  } catch (e) { showToast('Gagal: ' + e.message, 'error'); }
}
