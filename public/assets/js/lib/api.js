// Brantas DMS — API Client
const API = {
  base: '/api/',

  async request(method, endpoint, data = null) {
    const opts = {
      method,
      headers: { 'Content-Type': 'application/json' },
    };
    if (data && method !== 'GET') opts.body = JSON.stringify(data);

    try {
      const res = await fetch(this.base + endpoint, opts);

      // Parse body defensively — proxies/WAF may return HTML (not JSON) on 403/5xx
      const raw = await res.text();
      let json = null;
      try { json = raw ? JSON.parse(raw) : null; } catch { json = null; }

      if (!res.ok) {
        if (res.status === 401 && APP.loggedIn) {
          APP.loggedIn = false;
          document.getElementById('loginPage').style.display = 'grid';
          document.getElementById('mainApp').style.display = 'none';
          showToast('Sesi berakhir, silakan login kembali', 'warning');
        }
        let msg = (json && (json.message || json.error)) || '';
        if (!msg) {
          if (res.status === 403) msg = 'Akses ditolak (403). Permintaan diblokir oleh server/proxy keamanan. Coba lagi atau hubungi administrator.';
          else if (res.status === 404) msg = 'Data tidak ditemukan (404).';
          else if (res.status >= 500) msg = `Server bermasalah (${res.status}). Silakan coba lagi.`;
          else msg = `HTTP ${res.status}`;
        }
        throw new Error(msg);
      }

      // OK but unparseable body — return empty success envelope
      if (json === null) return { success: true, data: null };
      return json;
    } catch (err) {
      if (err.name === 'TypeError') {
        throw new Error('Koneksi ke server gagal. Periksa koneksi internet Anda.');
      }
      throw err;
    }
  },

  get(endpoint) { return this.request('GET', endpoint); },
  post(endpoint, data) { return this.request('POST', endpoint, data); },
  put(endpoint, data) { return this.request('PUT', endpoint, data); },
  del(endpoint) { return this.request('DELETE', endpoint); },

  // Upload file via FormData
  async uploadFile(file, dokumenId = 0) {
    const fd = new FormData();
    fd.append('file', file);
    if (dokumenId) fd.append('dokumen_id', dokumenId);

    const res = await fetch(this.base + 'upload/upload', { method: 'POST', body: fd });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || 'Upload gagal');
    return json;
  },

  // Auth
  login(nid, password) { return this.post('auth/login', { nid, password }); },
  logout() { return this.post('auth/logout'); },
  me() { return this.get('auth/me'); },
  checkAuth() { return this.get('auth/check'); },
  changePassword(oldPassword, newPassword) { return this.post('auth/change-password', { old_password: oldPassword, new_password: newPassword }); },
  switchRole(role) { return this.post('auth/switch-role', { role }); },

  // Dokumen
  getDokumen(params = '') { return this.get('dokumen' + (params ? '?' + params : '')); },
  getDokumenById(id) { return this.get('dokumen/' + id); },
  getDokumenPdf(id) { return this.base + 'dokumen/' + id + '/pdf'; },
  getDokumenDocxUrl(id) { return this.base + 'dokumen/' + id + '/docx'; },
  createDokumen(data) { return this.post('dokumen', data); },
  updateDokumen(id, data) { return this.put('dokumen/' + id, data); },
  deleteDokumen(id) { return this.del('dokumen/' + id); },
  getRecentDokumen() { return this.get('dokumen/recent'); },
  duplicateDokumen(id) { return this.post('dokumen/' + id + '/duplicate'); },
  reviseDokumen(id) { return this.post('dokumen/' + id + '/revisi'); },
  getDocVersions(id) { return this.get('dokumen/' + id + '/versions'); },
  getDocVersion(id, vid) { return this.get('dokumen/' + id + '/versions/' + vid); },

  // Dashboard
  getDashboard() { return this.get('dashboard'); },

  // Workflow — 3-Tier Sequential Approval
  getWorkflow(status = '') { return this.get('workflow' + (status ? '?status=' + status : '')); },
  submitForReview(dokumenId, catatan = '') { return this.post('workflow/submit', { dokumen_id: dokumenId, catatan }); },
  reviewDoc(dokumenId, catatan = '') { return this.post('workflow/review', { dokumen_id: dokumenId, catatan }); },
  approveT1(dokumenId, catatan = '') { return this.post('workflow/approve-t1', { dokumen_id: dokumenId, catatan }); },
  approveT2(dokumenId, catatan = '') { return this.post('workflow/approve-t2', { dokumen_id: dokumenId, catatan }); },
  rejectDoc(dokumenId, catatan = '') { return this.post('workflow/reject', { dokumen_id: dokumenId, catatan }); },
  returnForRevision(dokumenId, catatan = '') { return this.post('workflow/return-revisi', { dokumen_id: dokumenId, catatan }); },
  archiveDoc(dokumenId, catatan = '') { return this.post('workflow/archive', { dokumen_id: dokumenId, catatan }); },
  withdrawDoc(dokumenId, catatan = '') { return this.post('workflow/withdraw', { dokumen_id: dokumenId, catatan }); },
  uploadDocToDrive(dokumenId) { return this.post('workflow/upload-drive', { dokumen_id: dokumenId }); },

  // Master Data
  getUnits() { return this.get('units'); },
  createUnit(data) { return this.post('units', data); },
  updateUnit(id, data) { return this.put('units/' + id, data); },
  getProbis() { return this.get('probis'); },
  createProbis(data) { return this.post('probis', data); },
  updateProbis(id, data) { return this.put('probis/' + id, data); },

  // Equipment
  getEquipment() { return this.get('equipment'); },
  getEquipmentById(id) { return this.get('equipment/' + id); },
  createEquipment(data) { return this.post('equipment', data); },
  updateEquipment(id, data) { return this.put('equipment/' + id, data); },
  deleteEquipment(id) { return this.del('equipment/' + id); },

  // Templates
  getTemplates() { return this.get('templates'); },
  getActiveTemplate() { return this.get('templates/active'); },
  createTemplate(data) { return this.post('templates', data); },
  updateTemplate(id, data) { return this.put('templates/' + id, data); },
  deleteTemplate(id) { return this.del('templates/' + id); },

  // Users
  getApprovers() { return this.get('pengguna/approvers'); },
  getUsers() { return this.get('pengguna'); },
  getUser(id) { return this.get('pengguna/' + id); },
  createUser(data) { return this.post('pengguna', data); },
  updateUser(id, data) { return this.put('pengguna/' + id, data); },
  deleteUser(id) { return this.del('pengguna/' + id); },
  bulkDeleteUsers(ids, force = '') { return this.post('pengguna/bulk-delete' + force, { ids }); },

  // Audit
  getAuditLogs(params = '') { return this.get('audit' + (params ? '?' + params : '')); },

  // Notifications
  getNotif() { return this.get('notifikasi'); },
  getUnreadCount() { return this.get('notifikasi/unread-count'); },
  markNotifRead(id = null) { return this.post('notifikasi/mark-read', id ? { id } : {}); },

  // Reports
  getLaporan() { return this.get('laporan'); },

  // QR
  getQRData() { return this.get('qrcode'); },
  getQRStats() { return this.get('qrcode/stats'); },

  // Auth - enhanced
  forgotPassword(email) { return this.post('auth/forgot-password', { email }); },
  resetPassword(token, password) { return this.post('auth/reset-password', { token, password }); },
  adminForceReset(userId) { return this.post('auth/admin-force-reset', { user_id: userId }); },

  // Roles & Permissions
  getRoles() { return this.get('roles'); },
  getRole(id) { return this.get('roles/' + id); },
  createRole(data) { return this.post('roles', data); },
  updateRole(id, data) { return this.put('roles/' + id, data); },
  deleteRole(id) { return this.del('roles/' + id); },
  getPermissions() { return this.get('permissions'); },

  // Invitations
  getInvitations() { return this.get('invitations'); },
  createInvitation(data) { return this.post('invitations', data); },
  cancelInvitation(id) { return this.del('invitations/' + id); },
  acceptInvitation(token, password) { return this.post('invitations/accept', { token, password }); },

  // Sessions
  getSessions(userId) { return this.get('sessions' + (userId ? '?user_id=' + userId : '')); },
  getMySessions() { return this.get('sessions/me'); },
  forceLogoutSession(id) { return this.del('sessions/' + id); },
  deleteMySession(id) { return this.del('sessions/me/' + id); },

  // User management
  suspendUser(id) { return this.put('pengguna/' + id + '/suspend'); },
  activateUser(id) { return this.put('pengguna/' + id + '/activate'); },

  // Settings
  getSettings() { return this.get('settings'); },
  saveSettings(data) { return this.post('settings', data); },

  // Risk Matrix
  getRiskMatrix() { return this.get('risk-matrix'); },
  updateRiskMatrixCell(data) { return this.put('risk-matrix/cell', data); },
  updateRiskMatrixBulk(data) { return this.put('risk-matrix/bulk', data); },
  updateRiskScales(scales) { return this.put('risk-matrix/scales', { scales }); },
  resetRiskMatrix() { return this.post('risk-matrix/reset'); },
};
