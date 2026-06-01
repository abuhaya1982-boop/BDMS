let allUsers = [];

async function renderPengguna(container) {
  container.innerHTML = `<div class="page active" id="page-pengguna"></div>`;
  try {
    const res = await API.getUsers();
    allUsers = res.data || [];
    renderUserList();
  } catch (e) {
    container.innerHTML = `<div class="page active"><div class="alert alert-danger">${esc(e.message)}</div></div>`;
  }
}

async function renderUserList() {
  const search = (document.getElementById('usr-search')?.value || '').toLowerCase();
  const roleFilter = document.getElementById('usr-filter-role')?.value || '';
  const statusFilter = document.getElementById('usr-filter-status')?.value || '';
  let users = allUsers;
  if (search) users = users.filter(u => u.nama.toLowerCase().includes(search) || u.nid.toLowerCase().includes(search) || (u.jabatan || '').toLowerCase().includes(search));
  if (roleFilter) users = users.filter(u => u.role === roleFilter);
  if (statusFilter) users = users.filter(u => u.status === statusFilter);

  const page = document.getElementById('page-pengguna');
  if (!page) return;

  page.innerHTML = `
    <div class="page-header" style="margin-bottom:8px">
      <div class="page-header-left">
        <div class="page-title">Manajemen Pengguna & Akses</div>
        <div class="page-subtitle">${users.length} dari ${allUsers.length} pengguna</div>
      </div>
      <div class="page-actions" style="gap:4px">
        <button class="btn btn-secondary btn-sm" onclick="exportUsersCSV()">${icon('download', 14)} Export CSV</button>
        <button class="btn btn-secondary btn-sm" onclick="importUsersCSV()">${icon('upload', 14)} Import CSV</button>
        <button class="btn btn-secondary btn-sm" onclick="openInviteModal()">${icon('mail', 14)} Undang</button>
        <button class="btn btn-danger btn-sm" id="bulkDeleteBtn" style="display:none" onclick="bulkDeleteUsers()">${icon('trash-2', 14)} Hapus Terpilih</button>
        <button class="btn btn-primary btn-sm" onclick="openAddUserModal()">${icon('plus', 14)} Tambah</button>
      </div>
    </div>
    <div class="card" style="margin-bottom:8px">
      <div class="card-body" style="padding:8px 14px">
        <div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center">
          <input type="text" style="padding:5px 10px;font-size:11.5px;border:1px solid var(--border);border-radius:6px;width:200px" id="usr-search" placeholder="Cari nama, NID, jabatan..." oninput="renderUserList()">
          <select style="padding:5px 10px;font-size:11.5px;border:1px solid var(--border);border-radius:6px" id="usr-filter-role" onchange="renderUserList()">
            <option value="">Semua Role</option>
            <option>Admin</option><option>Asst. Manager</option><option>Manager</option><option>Senior Manager</option><option>Document Owner</option><option>Viewer</option>
          </select>
          <select style="padding:5px 10px;font-size:11.5px;border:1px solid var(--border);border-radius:6px" id="usr-filter-status" onchange="renderUserList()">
            <option value="">Semua Status</option>
            <option>Aktif</option><option>Nonaktif</option>
          </select>
          <label style="display:flex;align-items:center;gap:4px;font-size:11.5px;cursor:pointer;margin-left:auto">
            <input type="checkbox" onchange="toggleSelectAll(this)" style="accent-color:var(--pln-blue-600)"> Pilih Semua
          </label>
        </div>
      </div>
    </div>
    <div class="card">
      <div class="table-container">
        <table>
          <thead><tr><th style="width:32px"></th><th>Nama</th><th>NID</th><th>Unit</th><th>Jabatan</th><th>Role</th><th>Auth</th><th>Status</th><th>Login Terakhir</th><th style="min-width:150px">Aksi</th></tr></thead>
          <tbody>
            ${users.map(u => `
              <tr id="usr-row-${u.id}">
                <td style="text-align:center"><input type="checkbox" class="usr-check" value="${u.id}" onchange="updateBulkBtn()" style="accent-color:var(--pln-blue-600)"></td>
                <td>
                  <div style="display:flex;align-items:center;gap:8px">
                    <div style="width:28px;height:28px;border-radius:50%;background:linear-gradient(135deg,var(--pln-sky),var(--pln-blue-600));display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:white;flex-shrink:0">${getInitials(u.nama)}</div>
                    <span style="font-weight:600;font-size:13px">${esc(u.nama)}</span>
                  </div>
                </td>
                <td class="td-mono" style="font-size:12px">${esc(u.nid)}</td>
                <td style="font-size:11.5px">${esc(u.unit_id || '-')}</td>
                <td style="font-size:12px">${esc(u.jabatan || '-')}</td>
                <td>${(u.roles || []).map(r => roleBadge(r.nama)).join('') || roleBadge(u.role)}</td>
                <td><span class="badge badge-${u.auth_provider === 'local' ? 'gray' : 'sky'}" style="font-size:10px">${esc(u.auth_provider || 'local')}</span></td>
                <td>
                  ${u.status === 'Aktif' ? '<span class="badge badge-success" style="font-size:10px">● Aktif</span>' :
                    u.status === 'Suspended' ? '<span class="badge badge-amber" style="font-size:10px">● Suspended</span>' :
                    u.status === 'Pending' ? '<span class="badge badge-sky" style="font-size:10px">● Pending</span>' :
                    '<span class="badge badge-gray" style="font-size:10px">● ' + esc(u.status) + '</span>'}
                </td>
                <td style="font-size:11.5px;color:var(--text-tertiary)">${formatDate(u.last_login)}</td>
                <td>
                  <div style="display:flex;gap:3px">
                    <button class="btn btn-secondary btn-xs" onclick="editUser(${u.id})" title="Edit">${icon('edit-3', 13)}</button>
                    <button class="btn btn-secondary btn-xs" onclick="adminForceReset(${u.id})" title="Force reset password">${icon('key', 13)}</button>
                    ${u.status === 'Aktif'
                      ? `<button class="btn btn-secondary btn-xs" onclick="suspendUser(${u.id})" title="Suspend">${icon('pause-circle', 13)}</button>`
                      : `<button class="btn btn-secondary btn-xs" onclick="activateUser(${u.id})" title="Aktifkan">${icon('play-circle', 13)}</button>`}
                    <button class="btn btn-secondary btn-xs" onclick="API.getSessions(${u.id}).then(r => showUserSessions(${u.id}, r.data))" title="Sesi aktif">${icon('smartphone', 13)}</button>
                    <button class="btn btn-danger btn-xs" onclick="deleteUser(${u.id})" title="Hapus">${icon('trash-2', 13)}</button>
                  </div>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
  renderIcons();
}

function toggleSelectAll(master) {
  document.querySelectorAll('.usr-check').forEach(cb => cb.checked = master.checked);
  updateBulkBtn();
}

function updateBulkBtn() {
  const count = document.querySelectorAll('.usr-check:checked').length;
  const btn = document.getElementById('bulkDeleteBtn');
  if (btn) { btn.style.display = count ? 'inline-flex' : 'none'; btn.innerHTML = `${icon('trash-2', 14)} Hapus ${count} Terpilih`; }
}

function getSelectedUserIds() {
  return Array.from(document.querySelectorAll('.usr-check:checked')).map(cb => parseInt(cb.value));
}

// ─── EXPORT CSV ─────────────────────────────
function exportUsersCSV() {
  const search = (document.getElementById('usr-search')?.value || '').toLowerCase();
  const roleFilter = document.getElementById('usr-filter-role')?.value || '';
  const statusFilter = document.getElementById('usr-filter-status')?.value || '';
  let users = allUsers;
  if (search) users = users.filter(u => u.nama.toLowerCase().includes(search) || u.nid.toLowerCase().includes(search) || (u.jabatan || '').toLowerCase().includes(search));
  if (roleFilter) users = users.filter(u => u.role === roleFilter);
  if (statusFilter) users = users.filter(u => u.status === statusFilter);

  const headers = ['Nama','NID','Email','Jabatan','Unit ID','Role','Status','Auth Provider','Login Terakhir'];
  let csv = '\uFEFF' + headers.map(h => '"' + h + '"').join(',') + '\n';
  users.forEach(u => {
    const row = [u.nama, u.nid, u.email, u.jabatan||'', u.unit_id||'', u.role, u.status, u.auth_provider||'local', u.last_login||''];
    csv += row.map(v => '"' + (v||'').replace(/"/g,'""') + '"').join(',') + '\n';
  });
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'pengguna-export.csv'; a.click();
  URL.revokeObjectURL(a.href);
  showToast(users.length + ' pengguna di-export', 'success');
}

// ─── IMPORT CSV ─────────────────────────────
function importUsersCSV() {
  openGenericModal(
    `${icon('upload', 18)} Import Pengguna dari CSV`,
    `
    <div style="margin-bottom:12px;font-size:12.5px;color:var(--text-secondary)">
      Format CSV: <code>Nama,NID,Email,Jabatan,Role,Status</code><br>
      Baris pertama = header (akan dilewati). Role: Viewer|Document Owner|Approver|Admin.<br>
      <strong>NID wajib</strong>, password default = NID lowercase.
    </div>
    <div style="border:2px dashed var(--border);border-radius:8px;padding:24px;text-align:center" id="csvDropZone" ondrop="handleCSVDrop(event)" ondragover="event.preventDefault()">
      <div style="font-size:32px;margin-bottom:8px;color:var(--text-secondary)">${icon('folder-open', 28)}</div>
      <div style="font-size:13px;margin-bottom:8px">Letakkan file CSV di sini</div>
      <div style="font-size:12px;color:var(--text-tertiary);margin-bottom:12px">atau</div>
      <input type="file" accept=".csv" id="csvFileInput" style="display:none" onchange="handleCSVFile(this)">
      <button class="btn btn-secondary btn-sm" onclick="document.getElementById('csvFileInput').click()">Pilih File CSV</button>
    </div>
    <div id="csvPreview" style="margin-top:12px;max-height:200px;overflow:auto;font-size:11.5px"></div>
    <div id="csvImportResult" style="margin-top:8px;font-size:12px"></div>
    `,
    `<button class="btn btn-secondary" onclick="closeModal('modalGeneric')">Batal</button>
     <button class="btn btn-primary" id="btnImportCSV" style="display:none" onclick="doImportCSV()">${icon('upload', 14)} Import Data</button>`
  );
  window._csvData = null;
}

function handleCSVDrop(e) {
  e.preventDefault();
  const file = e.dataTransfer.files[0];
  if (file) parseCSVFile(file);
}

function handleCSVFile(input) {
  if (input.files[0]) parseCSVFile(input.files[0]);
}

function parseCSVFile(file) {
  const reader = new FileReader();
  reader.onload = function(e) {
    const text = e.target.result;
    const lines = text.split('\n').filter(l => l.trim());
    if (lines.length < 2) { document.getElementById('csvPreview').innerHTML = '<div class="alert alert-danger">File CSV kosong atau tidak valid</div>'; return; }
    const headers = lines[0].split(',').map(h => h.replace(/^"|"$/g,'').trim().toLowerCase());
    const data = [];
    for (let i = 1; i < lines.length; i++) {
      const vals = parseCSVLine(lines[i]);
      const obj = {};
      headers.forEach((h, idx) => { obj[h] = (vals[idx]||'').replace(/^"|"$/g,'').trim(); });
      data.push(obj);
    }
    window._csvData = data;
    const preview = data.slice(0, 10);
    let html = '<table style="font-size:11px"><thead><tr><th>#</th><th>Nama</th><th>NID</th><th>Role</th><th>Status</th></tr></thead><tbody>';
    preview.forEach((d, i) => {
      html += `<tr><td>${i+1}</td><td>${esc(d.nama||'')}</td><td>${esc(d.nid||'')}</td><td>${esc(d.role||'')}</td><td>${esc(d.status||'')}</td></tr>`;
    });
    if (data.length > 10) html += `<tr><td colspan="5" style="text-align:center;color:var(--text-tertiary)">...dan ${data.length-10} lainnya</td></tr>`;
    html += '</tbody></table>';
    document.getElementById('csvPreview').innerHTML = html;
    document.getElementById('csvImportResult').innerHTML = `<span style="color:var(--success)">${icon('check', 14)} ${data.length} baris siap diimport</span>`;
    document.getElementById('btnImportCSV').style.display = 'inline-flex';
  };
  reader.readAsText(file);
}

function parseCSVLine(line) {
  const result = []; let current = ''; let inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') { inQuote = !inQuote; }
    else if (ch === ',' && !inQuote) { result.push(current); current = ''; }
    else { current += ch; }
  }
  result.push(current);
  return result;
}

async function doImportCSV() {
  const data = window._csvData;
  if (!data || !data.length) { showToast('Tidak ada data untuk diimport', 'error'); return; }
  const btn = document.getElementById('btnImportCSV');
  btn.disabled = true; btn.innerHTML = `${icon('loader-2', 14)} Mengimport...`;
  let success = 0, errors = [];
  for (let i = 0; i < data.length; i++) {
    const d = data[i];
    if (!d.nid) { errors.push(`Baris ${i+2}: NID wajib`); continue; }
    try {
      await API.createUser({
        nama: d.nama || d.nid,
        nid: d.nid,
        email: d.email || (d.nid + '@plnnp.co.id'),
        jabatan: d.jabatan || '',
        role: ['Admin','Asst. Manager','Manager','Senior Manager','Document Owner','Viewer'].includes(d.role) ? d.role : 'Viewer',
        status: ['Aktif','Nonaktif'].includes(d.status) ? d.status : 'Aktif',
      });
      success++;
    } catch (e) { errors.push(`Baris ${i+2} (${d.nid}): ${e.message}`); }
  }
  btn.style.display = 'none';
  const resultDiv = document.getElementById('csvImportResult');
  let html = `<span style="color:var(--success);font-weight:700">${icon('check', 14)} ${success} pengguna berhasil diimport</span>`;
  if (errors.length) html += `<br><span style="color:var(--danger);font-size:11px">${errors.length} gagal: ${errors.slice(0,3).join('; ')}${errors.length>3 ? '...' : ''}</span>`;
  resultDiv.innerHTML = html;
  if (success) { showToast(success + ' pengguna diimport', 'success'); showPage('pengguna'); }
}

// ─── DELETE ─────────────────────────────────
async function deleteUser(id) {
  const u = allUsers.find(x => x.id == id);
  const label = esc(u ? u.nama : 'User #'+id);
  const ok = await renderConfirmDialog('Hapus Pengguna', `Yakin ingin menghapus <strong>${label}</strong> secara permanen?<br><br>Tindakan ini <strong>tidak dapat dibatalkan</strong>.`);
  if (!ok) return;
  try {
    await API.deleteUser(id);
    showToast('Pengguna dihapus', 'success');
    showPage('pengguna');
  } catch (e) {
    const msg = e.message || '';
    if (msg.includes('FOREIGN KEY') || msg.includes('constraint')) {
      const force = await renderConfirmDialog('Force Hapus Pengguna', `Pengguna <strong>${label}</strong> masih memiliki data terkait (dokumen, approval, dll).<br><br>Force hapus tetap menghapus user, data terkait tetap tersimpan.<br><br>Lanjutkan force hapus?`, 'Force Hapus', 'Batal');
      if (!force) return;
      try {
        await API.del('pengguna/' + id + '?force=1');
        showToast('Pengguna dihapus (force)', 'success');
        showPage('pengguna');
      } catch (e2) { showToast('Gagal: ' + e2.message, 'error'); }
    } else { showToast('Gagal: ' + msg, 'error'); }
  }
}

async function bulkDeleteUsers() {
  const ids = getSelectedUserIds();
  if (!ids.length) return;
  const ok = await renderConfirmDialog('Hapus Massal', `Yakin ingin menghapus <strong>${ids.length} pengguna</strong> secara permanen?<br><br>Tindakan ini <strong>tidak dapat dibatalkan</strong>.`);
  if (!ok) return;
  try {
    const res = await API.bulkDeleteUsers(ids);
    showToast(res.message || ids.length + ' pengguna dihapus', 'success');
    showPage('pengguna');
  } catch (e) {
    const msg = e.message || '';
    if (msg.includes('FOREIGN KEY') || msg.includes('constraint')) {
      const force = await renderConfirmDialog('Force Hapus Massal', `Beberapa pengguna masih memiliki data terkait.<br><br>Force hapus tetap menghapus semua pengguna terpilih, data terkait tetap tersimpan.<br><br>Lanjutkan force hapus?`, 'Force Hapus', 'Batal');
      if (!force) return;
      try {
        const res = await API.bulkDeleteUsers(ids, '?force=1');
        showToast(res.message || ids.length + ' pengguna dihapus (force)', 'success');
        showPage('pengguna');
      } catch (e2) { showToast('Gagal: ' + e2.message, 'error'); }
    } else { showToast('Gagal: ' + msg, 'error'); }
  }
}

// ─── ADD / EDIT / RESET ─────────────────────

async function saveNewUser() {
  const nama = document.getElementById('usr-nama')?.value;
  const nid = document.getElementById('usr-nid')?.value.trim();
  const password = document.getElementById('usr-password')?.value;
  if (!nama || !nid) { showToast('Nama dan NID wajib diisi', 'error'); return; }
  const btn = document.querySelector('#modalGenericFooter .btn-primary');
  btn.disabled = true; btn.innerHTML = `${icon('loader-2', 14)} Menyimpan...`;
  try {
    await API.createUser({
      nama, nid, password,
      email: document.getElementById('usr-email')?.value || '',
      jabatan: document.getElementById('usr-jabatan')?.value || '',
      role: document.getElementById('usr-role')?.value || 'Viewer',
      unit_id: document.getElementById('usr-unit')?.value || null
    });
    closeModal('modalGeneric');
    showToast('Pengguna berhasil ditambahkan. Password default: ' + nid.toLowerCase(), 'success');
    showPage('pengguna');
  } catch (e) { showToast('Gagal: ' + e.message, 'error'); }
  finally { btn.disabled = false; btn.innerHTML = `${icon('save', 14)} Simpan`; }
}

async function editUser(id) {
  try {
    const [userRes, unitsRes] = await Promise.all([API.getUser(id), API.getUnits()]);
    const u = userRes.data;
    const unitOpts = (unitsRes.data || []).map(un => `<option value="${un.id}"${un.id == (u.unit_id || '') ? ' selected' : ''}>${esc(un.kode)} – ${esc(un.nama)}</option>`).join('');
    openGenericModal(
      `${icon('edit-3', 18)} Edit Pengguna`,
      `
      <div class="form-grid">
        <div class="form-group">
          <label class="form-label">Nama</label>
          <input type="text" class="form-control" id="usr-edit-nama" value="${esc(u.nama)}">
        </div>
        <div class="form-group">
          <label class="form-label">NID</label>
          <input type="text" class="form-control mono" id="usr-edit-nid" value="${esc(u.nid)}" readonly style="background:var(--surface-2)">
        </div>
        <div class="form-group">
          <label class="form-label">Email</label>
          <input type="email" class="form-control" id="usr-edit-email" value="${esc(u.email)}">
        </div>
        <div class="form-group">
          <label class="form-label">Jabatan</label>
          <input type="text" class="form-control" id="usr-edit-jabatan" value="${esc(u.jabatan || '')}">
        </div>
        <div class="form-group">
          <label class="form-label">Role</label>
          <select class="form-control" id="usr-edit-role">
            <option ${u.role === 'Viewer' ? 'selected' : ''}>Viewer</option>
            <option ${u.role === 'Document Owner' ? 'selected' : ''}>Document Owner</option>
            <option ${u.role === 'Asst. Manager' ? 'selected' : ''}>Asst. Manager</option>
            <option ${u.role === 'Manager' ? 'selected' : ''}>Manager</option>
            <option ${u.role === 'Senior Manager' ? 'selected' : ''}>Senior Manager</option>
            <option ${u.role === 'Admin' ? 'selected' : ''}>Admin</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Unit</label>
          <select class="form-control" id="usr-edit-unit">
            <option value="">-- Semua Unit --</option>
            ${unitOpts}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Status</label>
          <select class="form-control" id="usr-edit-status">
            <option ${u.status === 'Aktif' ? 'selected' : ''}>Aktif</option>
            <option ${u.status === 'Nonaktif' ? 'selected' : ''}>Nonaktif</option>
          </select>
        </div>
      </div>
      `,
      `<button class="btn btn-secondary" onclick="closeModal('modalGeneric')">Batal</button>
       <button class="btn btn-primary" onclick="updateUser(${id})">${icon('save', 14)} Simpan</button>`
    );
  } catch (e) { showToast('Gagal memuat data user', 'error'); }
}

async function openAddUserModal() {
  try {
    const unitsRes = await API.getUnits();
    const unitOpts = (unitsRes.data || []).map(u => `<option value="${u.id}">${esc(u.kode)} – ${esc(u.nama)}</option>`).join('');
    openGenericModal(
      `${icon('plus', 18)} Tambah Pengguna Baru`,
      `
      <div class="form-grid">
        <div class="form-group">
          <label class="form-label">Nama <span class="required">*</span></label>
          <input type="text" class="form-control" id="usr-nama" placeholder="Nama lengkap">
        </div>
        <div class="form-group">
          <label class="form-label">NID <span class="required">*</span></label>
          <input type="text" class="form-control mono" id="usr-nid" placeholder="NID-XXXX" style="text-transform:uppercase">
        </div>
        <div class="form-group">
          <label class="form-label">Email</label>
          <input type="email" class="form-control" id="usr-email" placeholder="user@plnnp.co.id">
        </div>
        <div class="form-group">
          <label class="form-label">Password (default = NID)</label>
          <input type="text" class="form-control" id="usr-password" placeholder="Kosongkan untuk default = NID (lowercase)">
          <div style="font-size:11px;color:var(--text-tertiary);margin-top:3px">Default: NID huruf kecil (contoh: nid-0001)</div>
        </div>
        <div class="form-group">
          <label class="form-label">Jabatan</label>
          <input type="text" class="form-control" id="usr-jabatan" placeholder="Asst. Manager MMRK">
        </div>
        <div class="form-group">
          <label class="form-label">Role</label>
          <select class="form-control" id="usr-role">
            <option>Viewer</option><option>Document Owner</option><option>Asst. Manager</option><option>Manager</option><option>Senior Manager</option><option>Admin</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Unit</label>
          <select class="form-control" id="usr-unit">
            <option value="">-- Semua Unit --</option>
            ${unitOpts}
          </select>
        </div>
      </div>
      `,
      `<button class="btn btn-secondary" onclick="closeModal('modalGeneric')">Batal</button>
       <button class="btn btn-primary" onclick="saveNewUser()">${icon('save', 14)} Simpan</button>`
    );
    document.getElementById('usr-nid')?.addEventListener('input', function() { this.value = this.value.toUpperCase(); });
  } catch (e) { showToast('Gagal memuat data master', 'error'); }
}

async function updateUser(id) {
  const btn = document.querySelector('#modalGenericFooter .btn-primary');
  btn.disabled = true; btn.innerHTML = `${icon('loader-2', 14)} Menyimpan...`;
  try {
    await API.updateUser(id, {
      nama: document.getElementById('usr-edit-nama')?.value,
      email: document.getElementById('usr-edit-email')?.value,
      jabatan: document.getElementById('usr-edit-jabatan')?.value,
      unit_id: document.getElementById('usr-edit-unit')?.value || null,
      role: document.getElementById('usr-edit-role')?.value,
      status: document.getElementById('usr-edit-status')?.value,
    });
    closeModal('modalGeneric');
    showToast('Pengguna diperbarui', 'success');
    showPage('pengguna');
  } catch (e) { showToast('Gagal: ' + e.message, 'error'); }
  finally { btn.disabled = false; btn.innerHTML = `${icon('save', 14)} Simpan`; }
}

async function resetUserPassword(id) {
  const pw = prompt('Password baru (min 6 karakter):');
  if (!pw || pw.length < 6) { showToast('Minimal 6 karakter', 'error'); return; }
  try {
    await API.updateUser(id, { password: pw });
    showToast('Password berhasil direset', 'success');
  } catch (e) { showToast('Gagal: ' + e.message, 'error'); }
}

// ─── INVITE USER ────────────────────────────
function openInviteModal() {
  openGenericModal(
    `${icon('mail', 18)} Undang Pengguna Baru`,
    `
    <div style="margin-bottom:12px;font-size:12.5px;color:var(--text-secondary)">
      Undangan akan dikirim via email. User akan memilih password sendiri saat pertama login.
    </div>
    <div class="form-grid">
      <div class="form-group">
        <label class="form-label">Nama <span class="required">*</span></label>
        <input type="text" class="form-control" id="inv-nama" placeholder="Nama lengkap">
      </div>
      <div class="form-group">
        <label class="form-label">NID <span class="required">*</span></label>
        <input type="text" class="form-control mono" id="inv-nid" placeholder="NID-XXXX" style="text-transform:uppercase">
      </div>
      <div class="form-group">
        <label class="form-label">Email <span class="required">*</span></label>
        <input type="email" class="form-control" id="inv-email" placeholder="user@plnnp.co.id">
      </div>
      <div class="form-group">
        <label class="form-label">Jabatan</label>
        <input type="text" class="form-control" id="inv-jabatan" placeholder="Asst. Manager MMRK">
      </div>
      <div class="form-group">
        <label class="form-label">Unit</label>
        <select class="form-control" id="inv-unit"><option value="">-- Pilih Unit --</option></select>
      </div>
    </div>
    `,
    `<button class="btn btn-secondary" onclick="closeModal('modalGeneric')">Batal</button>
      <button class="btn btn-primary" onclick="doInviteUser()">${icon('mail', 14)} Kirim Undangan</button>`
  );
  // Load units
  API.getUnits().then(r => {
    const sel = document.getElementById('inv-unit');
    if (sel) (r.data || []).forEach(u => sel.innerHTML += `<option value="${u.id}">${esc(u.kode)} – ${esc(u.nama)}</option>`);
  });
}

async function doInviteUser() {
  const nama = document.getElementById('inv-nama')?.value;
  const nid = document.getElementById('inv-nid')?.value.trim();
  const email = document.getElementById('inv-email')?.value.trim();
  if (!nama || !nid || !email) { showToast('Nama, NID, dan Email wajib diisi', 'error'); return; }
  const btn = document.querySelector('#modalGenericFooter .btn-primary');
  btn.disabled = true; btn.innerHTML = `${icon('loader-2', 14)} Mengirim...`;
  try {
    const res = await API.createInvitation({
      nama, nid, email,
      jabatan: document.getElementById('inv-jabatan')?.value || '',
      unit_id: document.getElementById('inv-unit')?.value || null
    });
    closeModal('modalGeneric');
    showToast(`Undangan berhasil! Link: ${res.data?.invite_url || ''}`, 'success');
    showPage('pengguna');
  } catch (e) { showToast('Gagal: ' + e.message, 'error'); }
  finally { btn.disabled = false; btn.innerHTML = `${icon('mail', 14)} Kirim Undangan`; }
}

// ─── SUSPEND / ACTIVATE ─────────────────────
async function suspendUser(id) {
  const u = allUsers.find(x => x.id == id);
  const ok = await renderConfirmDialog('Suspend Pengguna', `Nonaktifkan sementara <strong>${esc(u?.nama || 'User #'+id)}</strong>? Semua sesi akan diputus.`);
  if (!ok) return;
  try {
    await API.suspendUser(id);
    showToast('Pengguna di-suspend', 'success');
    showPage('pengguna');
  } catch (e) { showToast('Gagal: ' + e.message, 'error'); }
}

async function activateUser(id) {
  try {
    await API.activateUser(id);
    showToast('Pengguna diaktifkan kembali', 'success');
    showPage('pengguna');
  } catch (e) { showToast('Gagal: ' + e.message, 'error'); }
}

// ─── ADMIN FORCE RESET ─────────────────────
async function adminForceReset(id) {
  const u = allUsers.find(x => x.id == id);
  const confirm = await renderConfirmDialog('Force Reset Password',
    `Reset password <strong>${esc(u?.nama || 'User #'+id)}</strong>?<br><br>
    Password sementara akan dibuat. User <strong>WAJIB</strong> ganti password saat login berikutnya.`,
    'Reset', 'Batal');
  if (!confirm) return;
  try {
    const res = await API.adminForceReset(id);
    const pw = res.data?.temp_password || '(error)';
    showToast(`Password sementara: ${pw}`, 'success');
  } catch (e) { showToast('Gagal: ' + e.message, 'error'); }
}

// ─── SHOW USER SESSIONS ────────────────────
async function showUserSessions(userId, sessions) {
  if (!sessions || !sessions.length) {
    showToast('Tidak ada sesi aktif', 'info');
    return;
  }
  const list = sessions.map(s => `
    <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid var(--border)">
      <div>
        <div style="font-size:12px;font-weight:600">${esc(s.device_name || 'Unknown device')}</div>
        <div style="font-size:11px;color:var(--text-tertiary)">IP: ${esc(s.ip_address || '-')} · Login: ${formatDate(s.login_at)}</div>
      </div>
      <button class="btn btn-danger btn-xs" onclick="forceLogoutSession(${s.id})">Putus</button>
    </div>
  `).join('');
  openGenericModal(`${icon('smartphone', 16)} Sesi Aktif`, list, `<button class="btn btn-secondary" onclick="closeModal('modalGeneric')">Tutup</button>`);
}

async function forceLogoutSession(sessionId) {
  try {
    await API.forceLogoutSession(sessionId);
    showToast('Sesi diputuskan', 'success');
    closeModal('modalGeneric');
  } catch (e) { showToast('Gagal: ' + e.message, 'error'); }
}