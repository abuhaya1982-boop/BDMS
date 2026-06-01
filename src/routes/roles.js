// Roles & Permissions API
const express = require('express');
const { getDB } = require('../db');
const h = require('../helpers');

const router = express.Router();
const permissions = express.Router();

// ─── ROLES ───
router.get('/', h.requireAuth, (req, res) => {
  const db = getDB();
  const roles = db.prepare("SELECT * FROM roles ORDER BY priority DESC").all();
  for (const r of roles) {
    r.permissions = db.prepare(`SELECT p.* FROM role_permissions rp JOIN permissions p ON rp.permission_id = p.id WHERE rp.role_id=? ORDER BY p.grup,p.kode`).all(r.id);
    r.user_count = db.prepare("SELECT COUNT(*) as c FROM user_roles WHERE role_id=?").get(r.id).c;
  }
  h.success(res, roles);
});

router.get('/:id', h.requireAuth, (req, res) => {
  const db = getDB();
  const role = db.prepare("SELECT * FROM roles WHERE id=?").get(req.params.id);
  if (!role) return h.notFound(res);
  role.permissions = db.prepare(`SELECT p.* FROM role_permissions rp JOIN permissions p ON rp.permission_id = p.id WHERE rp.role_id=?`).all(role.id);
  role.permission_ids = role.permissions.map(p => p.id);
  h.success(res, role);
});

router.post('/', h.requireRole('Super Admin'), (req, res) => {
  const { nama, deskripsi, priority, permission_ids } = req.body;
  if (!nama) return h.error(res, 'Nama role wajib');
  const db = getDB();
  try {
    const r = db.prepare("INSERT INTO roles (nama,deskripsi,is_system,priority) VALUES (?,?,0,?)").run(nama, deskripsi || null, priority || 0);
    if (permission_ids?.length) {
      const stmt = db.prepare("INSERT OR IGNORE INTO role_permissions (role_id,permission_id) VALUES (?,?)");
      for (const pid of permission_ids) stmt.run(r.lastInsertRowid, pid);
    }
    h.logAudit(req, 'CREATE_ROLE', `Role ${nama} dibuat`, 'role');
    h.created(res, { id: r.lastInsertRowid });
  } catch(e) { h.error(res, e.message.includes('UNIQUE') ? 'Nama role sudah ada' : e.message); }
});

router.put('/:id', h.requireRole('Super Admin'), (req, res) => {
  const db = getDB();
  const role = db.prepare("SELECT * FROM roles WHERE id=?").get(req.params.id);
  if (!role) return h.notFound(res);
  const fields = []; const params = [];
  for (const f of ['nama','deskripsi','priority']) {
    if (req.body[f] !== undefined) { fields.push(`${f}=?`); params.push(req.body[f]); }
  }
  if (fields.length) { params.push(req.params.id); db.prepare(`UPDATE roles SET ${fields.join(',')} WHERE id=?`).run(...params); }
  if (req.body.permission_ids) {
    db.prepare("DELETE FROM role_permissions WHERE role_id=?").run(req.params.id);
    const stmt = db.prepare("INSERT INTO role_permissions (role_id,permission_id) VALUES (?,?)");
    for (const pid of req.body.permission_ids) stmt.run(req.params.id, pid);
  }
  h.logAudit(req, 'UPDATE_ROLE', `Role ${role.nama} diperbarui`, 'role');
  h.success(res, null, 'Role berhasil diperbarui');
});

router.delete('/:id', h.requireRole('Super Admin'), (req, res) => {
  const db = getDB();
  const role = db.prepare("SELECT * FROM roles WHERE id=?").get(req.params.id);
  if (!role) return h.notFound(res);
  if (role.is_system) return h.error(res, 'Role sistem tidak bisa dihapus');
  db.prepare("DELETE FROM roles WHERE id=?").run(req.params.id);
  h.logAudit(req, 'DELETE_ROLE', `Role ${role.nama} dihapus`, 'role');
  h.success(res, null, 'Role berhasil dihapus');
});

// ─── PERMISSIONS ───
permissions.get('/', h.requireAuth, (req, res) => {
  const rows = getDB().prepare("SELECT * FROM permissions ORDER BY grup, kode").all();
  // Group by grup — frontend expects [{grup, permissions:[{id,nama,kode,...}]}]
  const grouped = [];
  const map = {};
  for (const p of rows) {
    const g = p.grup || 'Lainnya';
    if (!map[g]) { map[g] = { grup: g, permissions: [] }; grouped.push(map[g]); }
    map[g].permissions.push(p);
  }
  h.success(res, grouped);
});

router.permissions = permissions;
module.exports = router;
