// Admin — Role & Permission Manager
let allRoles = [];
let allPermissions = [];

async function renderAdminRoles(container) {
  container.innerHTML = `<div class="page active" id="page-admin-roles"></div>`;
  try {
    const [rolesRes, permsRes] = await Promise.all([API.getRoles(), API.getPermissions()]);
    allRoles = rolesRes.data || [];
    allPermissions = permsRes.data || [];
    renderRolesPage();
  } catch (e) {
    container.innerHTML = `<div class="page active"><div class="alert alert-danger">${esc(e.message)}</div></div>`;
  }
}

function renderRolesPage() {
  const page = document.getElementById('page-admin-roles');
  if (!page) return;

  page.innerHTML = `
    <div class="page-header" style="margin-bottom:8px">
      <div class="page-header-left">
        <div class="page-title">Role & Permission Manager</div>
        <div class="page-subtitle">${allRoles.length} role · ${allPermissions.reduce((s, g) => s + g.permissions.length, 0)} permissions</div>
      </div>
      <div class="page-actions" style="gap:4px">
        <button class="btn btn-primary btn-sm" onclick="openAddRoleModal()">${icon('plus', 14)} Tambah Role</button>
      </div>
    </div>
    <div class="card">
      <div class="table-container">
        <table>
          <thead><tr><th>Role</th><th>Deskripsi</th><th>Priority</th><th>Pengguna</th><th>System</th><th>Aksi</th></tr></thead>
          <tbody>
            ${allRoles.map(r => `
              <tr>
                <td><strong>${esc(r.nama)}</strong></td>
                <td style="font-size:12px;color:var(--text-secondary)">${esc(r.deskripsi || '-')}</td>
                <td><span class="badge badge-gray">${r.priority || 0}</span></td>
                <td><span class="badge badge-sky">${r.user_count || 0}</span></td>
                <td>${r.is_system ? '<span class="badge badge-amber">System</span>' : '<span class="badge badge-gray">Custom</span>'}</td>
                <td>
                  <div style="display:flex;gap:3px">
                    <button class="btn btn-secondary btn-xs" onclick="openEditRoleModal(${r.id})" title="Edit">${icon('edit-3', 13)}</button>
                    ${!r.is_system ? `<button class="btn btn-danger btn-xs" onclick="deleteRole(${r.id})" title="Hapus">${icon('trash-2', 13)}</button>` : ''}
                  </div>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function openAddRoleModal() {
  const permGroups = allPermissions.map(g => `
    <div class="perm-group" style="margin-bottom:8px">
      <div style="font-weight:600;font-size:12px;margin-bottom:4px;color:var(--text-primary)">${esc(g.grup)}</div>
      <div style="display:flex;flex-wrap:wrap;gap:4px">
        ${g.permissions.map(p => `
          <label style="display:flex;align-items:center;gap:3px;font-size:11px;cursor:pointer;padding:2px 6px;border-radius:4px;background:var(--surface-2)">
            <input type="checkbox" class="perm-check" value="${p.id}" style="accent-color:var(--pln-blue-600)"> ${esc(p.nama)}
          </label>
        `).join('')}
      </div>
    </div>
  `).join('');

  openGenericModal(
    `${icon('plus', 18)} Tambah Role Baru`,
    `
    <div class="form-group">
      <label class="form-label">Nama Role <span class="required">*</span></label>
      <input type="text" class="form-control" id="role-nama" placeholder="Contoh: Manager">
    </div>
    <div class="form-group" style="margin-top:8px">
      <label class="form-label">Deskripsi</label>
      <input type="text" class="form-control" id="role-deskripsi" placeholder="Tugas dan tanggung jawab role ini">
    </div>
    <div class="form-group" style="margin-top:8px">
      <label class="form-label">Priority (semakin tinggi semakin kuat)</label>
      <input type="number" class="form-control" id="role-priority" value="10" style="width:100px">
    </div>
    <hr style="margin:12px 0;border-color:var(--border)">
    <div style="margin-bottom:6px;font-weight:600;font-size:13px">Permission</div>
    <div style="padding:8px;background:var(--surface-2);border-radius:6px;max-height:300px;overflow-y:auto">
      ${permGroups}
    </div>
    `,
    `<button class="btn btn-secondary" onclick="closeModal('modalGeneric')">Batal</button>
        <button class="btn btn-primary" onclick="saveNewRole()">${icon('save', 14)} Simpan</button>`
  );
}

async function saveNewRole() {
  const nama = document.getElementById('role-nama')?.value;
  if (!nama) { showToast('Nama role wajib diisi', 'error'); return; }
  const btn = document.querySelector('#modalGenericFooter .btn-primary');
  btn.disabled = true; btn.innerHTML = `${icon('loader-2', 14)} Menyimpan...`;
  try {
    const res = await API.createRole({
      nama,
      deskripsi: document.getElementById('role-deskripsi')?.value || '',
      priority: parseInt(document.getElementById('role-priority')?.value || '10')
    });
    const checkedPerms = Array.from(document.querySelectorAll('.perm-check:checked')).map(cb => parseInt(cb.value));
    if (checkedPerms.length) {
      await API.updateRole(res.data.id, { permission_ids: checkedPerms });
    }
    closeModal('modalGeneric');
    showToast('Role berhasil dibuat', 'success');
    renderAdminRoles(document.getElementById('appContent'));
  } catch (e) { showToast('Gagal: ' + e.message, 'error'); }
  finally { btn.disabled = false; btn.innerHTML = `${icon('save', 14)} Simpan`; }
}

async function openEditRoleModal(id) {
  try {
    const roleRes = await API.getRole(id);
    const role = roleRes.data;
    const permIds = new Set((role.permission_ids || []).map(Number));

    const permGroups = allPermissions.map(g => `
      <div class="perm-group" style="margin-bottom:8px">
        <div style="font-weight:600;font-size:12px;margin-bottom:4px;color:var(--text-primary)">${esc(g.grup)}</div>
        <div style="display:flex;flex-wrap:wrap;gap:4px">
          ${g.permissions.map(p => `
            <label style="display:flex;align-items:center;gap:3px;font-size:11px;cursor:pointer;padding:2px 6px;border-radius:4px;background:var(--surface-2)">
              <input type="checkbox" class="perm-check" value="${p.id}" ${permIds.has(p.id) ? 'checked' : ''} style="accent-color:var(--pln-blue-600)"> ${esc(p.nama)}
            </label>
          `).join('')}
        </div>
      </div>
    `).join('');

    openGenericModal(
      `${icon('edit-3', 18)} Edit Role: ${esc(role.nama)}`,
      `
      <div class="form-group">
        <label class="form-label">Nama Role</label>
        <input type="text" class="form-control" id="role-nama" value="${esc(role.nama)}">
      </div>
      <div class="form-group" style="margin-top:8px">
        <label class="form-label">Deskripsi</label>
        <input type="text" class="form-control" id="role-deskripsi" value="${esc(role.deskripsi || '')}">
      </div>
      <div class="form-group" style="margin-top:8px">
        <label class="form-label">Priority</label>
        <input type="number" class="form-control" id="role-priority" value="${role.priority || 0}" style="width:100px">
      </div>
      <hr style="margin:12px 0;border-color:var(--border)">
      <div style="margin-bottom:6px;font-weight:600;font-size:13px">Permission</div>
      <div style="padding:8px;background:var(--surface-2);border-radius:6px;max-height:300px;overflow-y:auto">
        ${permGroups}
      </div>
      `,
      `<button class="btn btn-secondary" onclick="closeModal('modalGeneric')">Batal</button>
        <button class="btn btn-primary" onclick="updateRole(${id})">${icon('save', 14)} Simpan</button>`
    );
  } catch (e) { showToast('Gagal memuat role', 'error'); }
}

async function updateRole(id) {
  const btn = document.querySelector('#modalGenericFooter .btn-primary');
  btn.disabled = true; btn.innerHTML = `${icon('loader-2', 14)} Menyimpan...`;
  try {
    const permission_ids = Array.from(document.querySelectorAll('.perm-check:checked')).map(cb => parseInt(cb.value));
    await API.updateRole(id, {
      nama: document.getElementById('role-nama')?.value,
      deskripsi: document.getElementById('role-deskripsi')?.value || '',
      priority: parseInt(document.getElementById('role-priority')?.value || '0'),
      permission_ids
    });
    closeModal('modalGeneric');
    showToast('Role diperbarui', 'success');
    renderAdminRoles(document.getElementById('appContent'));
  } catch (e) { showToast('Gagal: ' + e.message, 'error'); }
  finally { btn.disabled = false; btn.innerHTML = `${icon('save', 14)} Simpan`; }
}

async function deleteRole(id) {
  const role = allRoles.find(r => r.id == id);
  if (!role) return;
  const ok = await renderConfirmDialog('Hapus Role', `Yakin ingin menghapus role <strong>${esc(role.nama)}</strong>?`);
  if (!ok) return;
  try {
    await API.deleteRole(id);
    showToast('Role dihapus', 'success');
    renderAdminRoles(document.getElementById('appContent'));
  } catch (e) { showToast('Gagal: ' + e.message, 'error'); }
}
