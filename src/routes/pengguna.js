// Pengguna (Users) API
const router = require('express').Router();
const { getDB } = require('../db');
const h = require('../helpers');

router.get('/', h.requireAuth, (req, res) => {
  const db = getDB();
  const users = db.prepare(`SELECT u.id,u.nama,u.nid,u.email,u.jabatan,u.unit_id,u.role,u.status,u.auth_provider,u.last_login,u.created_at,
    un.nama as unit_nama FROM users u LEFT JOIN units un ON u.unit_id = un.id ORDER BY u.nama`).all();
  h.success(res, users);
});

router.get('/approvers', h.requireAuth, (req, res) => {
  const db = getDB();
  const approvers = db.prepare("SELECT id,nama,nid,jabatan,role FROM users WHERE role IN ('Approver','Admin','Super Admin','Senior Manager','Manager','Asman') AND status='Aktif' ORDER BY nama").all();
  h.success(res, approvers);
});

router.get('/:id', h.requireAuth, (req, res) => {
  const db = getDB();
  const user = db.prepare(`SELECT u.*, un.nama as unit_nama FROM users u LEFT JOIN units un ON u.unit_id = un.id WHERE u.id=?`).get(req.params.id);
  if (!user) return h.notFound(res);
  delete user.password;
  user.permissions = h.getUserPermissions(user.id);
  user.roles = h.getUserRoles(user.id);
  h.success(res, user);
});

router.post('/', h.requireRole('Admin', 'Super Admin'), (req, res) => {
  const { nama, nid, email, password, jabatan, unit_id, role, status } = req.body;
  if (!nama || !nid || !email) return h.error(res, 'Nama, NID, dan email wajib diisi');
  const db = getDB();
  try {
    const pw = password ? h.hashPassword(password) : null;
    const mustSet = password ? 0 : 1;
    const r = db.prepare("INSERT INTO users (nama,nid,email,password,jabatan,unit_id,role,status,must_set_password) VALUES (?,?,?,?,?,?,?,?,?)")
      .run(nama, nid.toUpperCase(), email, pw, jabatan || null, unit_id || null, role || 'Viewer', status || 'Aktif', mustSet);
    // Assign role in user_roles
    const roleRow = db.prepare("SELECT id FROM roles WHERE nama=?").get(role || 'Viewer');
    if (roleRow) db.prepare("INSERT OR IGNORE INTO user_roles (user_id,role_id,is_primary) VALUES (?,?,1)").run(r.lastInsertRowid, roleRow.id);
    h.logAudit(req, 'CREATE_USER', `User ${nama} (${nid}) dibuat`, 'user', { resource_type: 'user', resource_id: r.lastInsertRowid });
    h.created(res, { id: r.lastInsertRowid }, 'User berhasil dibuat');
  } catch(e) {
    if (e.message.includes('UNIQUE')) return h.error(res, 'NID atau email sudah terdaftar');
    h.error(res, e.message);
  }
});

router.put('/:id', h.requireRole('Admin', 'Super Admin'), (req, res) => {
  const db = getDB();
  const fields = []; const params = [];
  for (const f of ['nama','nid','email','jabatan','unit_id','role','status']) {
    if (req.body[f] !== undefined) { fields.push(`${f}=?`); params.push(f === 'nid' ? req.body[f].toUpperCase() : req.body[f]); }
  }
  if (req.body.password) { fields.push('password=?'); params.push(h.hashPassword(req.body.password)); }
  if (!fields.length) return h.error(res, 'Tidak ada data');
  params.push(req.params.id);
  db.prepare(`UPDATE users SET ${fields.join(',')} WHERE id=?`).run(...params);
  // Update role mapping if role changed
  if (req.body.role) {
    const roleRow = db.prepare("SELECT id FROM roles WHERE nama=?").get(req.body.role);
    if (roleRow) {
      db.prepare("DELETE FROM user_roles WHERE user_id=? AND is_primary=1").run(req.params.id);
      db.prepare("INSERT OR IGNORE INTO user_roles (user_id,role_id,is_primary) VALUES (?,?,1)").run(req.params.id, roleRow.id);
    }
  }
  h.logAudit(req, 'UPDATE_USER', `User ID ${req.params.id} diperbarui`, 'user');
  h.success(res, null, 'User berhasil diperbarui');
});

router.delete('/:id', h.requireRole('Admin', 'Super Admin'), (req, res) => {
  const db = getDB();
  const user = db.prepare("SELECT nama,nid FROM users WHERE id=?").get(req.params.id);
  if (!user) return h.notFound(res);
  if (req.params.id == req.session.user_id) return h.error(res, 'Tidak bisa menghapus akun sendiri');
  db.prepare("DELETE FROM users WHERE id=?").run(req.params.id);
  h.logAudit(req, 'DELETE_USER', `User ${user.nama} (${user.nid}) dihapus`, 'user');
  h.success(res, null, 'User berhasil dihapus');
});

router.post('/bulk-delete', h.requireRole('Admin', 'Super Admin'), (req, res) => {
  const { ids } = req.body;
  if (!ids?.length) return h.error(res, 'IDs wajib');
  const db = getDB();
  const force = req.originalUrl.includes('force');
  const placeholders = ids.map(() => '?').join(',');
  if (!force) {
    const hasDoc = db.prepare(`SELECT COUNT(*) as c FROM ik_documents WHERE owner_id IN (${placeholders})`).get(...ids);
    if (hasDoc.c > 0) return h.error(res, `${hasDoc.c} user memiliki dokumen. Gunakan ?force untuk tetap hapus.`);
  }
  db.prepare(`DELETE FROM users WHERE id IN (${placeholders}) AND id != ?`).run(...ids, req.session.user_id);
  h.logAudit(req, 'BULK_DELETE_USERS', `${ids.length} user dihapus`, 'user');
  h.success(res, null, `${ids.length} user berhasil dihapus`);
});

router.put('/:id/suspend', h.requireRole('Admin', 'Super Admin'), (req, res) => {
  getDB().prepare("UPDATE users SET status='Nonaktif' WHERE id=?").run(req.params.id);
  h.logAudit(req, 'SUSPEND_USER', `User ID ${req.params.id} dinonaktifkan`, 'user');
  h.success(res, null, 'User dinonaktifkan');
});

router.put('/:id/activate', h.requireRole('Admin', 'Super Admin'), (req, res) => {
  getDB().prepare("UPDATE users SET status='Aktif' WHERE id=?").run(req.params.id);
  h.logAudit(req, 'ACTIVATE_USER', `User ID ${req.params.id} diaktifkan`, 'user');
  h.success(res, null, 'User diaktifkan');
});

module.exports = router;
