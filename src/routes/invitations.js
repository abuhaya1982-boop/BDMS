// Invitations API
const router = require('express').Router();
const { getDB } = require('../db');
const h = require('../helpers');

router.get('/', h.requireRole('Admin', 'Super Admin'), (req, res) => {
  const invitations = getDB().prepare(`SELECT i.*, u.nama as invited_by_nama, r.nama as role_nama
    FROM invitation_tokens i LEFT JOIN users u ON i.invited_by=u.id LEFT JOIN roles r ON i.role_id=r.id
    ORDER BY i.created_at DESC`).all();
  h.success(res, invitations);
});

router.post('/', h.requireRole('Admin', 'Super Admin'), (req, res) => {
  const { email, nama, nid, role_id, unit_id, jabatan } = req.body;
  if (!email || !nama || !nid) return h.error(res, 'Email, nama, dan NID wajib');
  const db = getDB();
  // Check existing user
  const existing = db.prepare("SELECT id FROM users WHERE nid=? OR email=?").get(nid.toUpperCase(), email);
  if (existing) return h.error(res, 'NID atau email sudah terdaftar');
  const token = h.generateToken(32);
  const expiresAt = new Date(Date.now() + 7 * 86400000).toISOString().replace('T', ' ').slice(0, 19);
  const r = db.prepare("INSERT INTO invitation_tokens (token,email,nama,nid,role_id,unit_id,jabatan,invited_by,expires_at) VALUES (?,?,?,?,?,?,?,?,?)")
    .run(token, email, nama, nid.toUpperCase(), role_id || null, unit_id || null, jabatan || null, req.session.user_id, expiresAt);
  h.logAudit(req, 'INVITE_USER', `Undangan dikirim ke ${nama} (${email})`, 'user');
  h.created(res, { id: r.lastInsertRowid, token, invite_url: `${req.protocol}://${req.get('host')}/invitation?token=${token}` });
});

router.delete('/:id', h.requireRole('Admin', 'Super Admin'), (req, res) => {
  getDB().prepare("UPDATE invitation_tokens SET status='cancelled' WHERE id=?").run(req.params.id);
  h.success(res, null, 'Undangan dibatalkan');
});

router.post('/accept', (req, res) => {
  const { token, password } = req.body;
  if (!token || !password || password.length < 6) return h.error(res, 'Token dan password (min 6 karakter) wajib');
  const db = getDB();
  const inv = db.prepare("SELECT * FROM invitation_tokens WHERE token=? AND status='pending' AND expires_at > datetime('now','localtime')").get(token);
  if (!inv) return h.error(res, 'Undangan tidak valid atau sudah kedaluwarsa');
  try {
    const r = db.prepare("INSERT INTO users (nama,nid,email,password,jabatan,unit_id,role,status) VALUES (?,?,?,?,?,?,?,?)")
      .run(inv.nama, inv.nid, inv.email, h.hashPassword(password), inv.jabatan, inv.unit_id,
        inv.role_id ? db.prepare("SELECT nama FROM roles WHERE id=?").get(inv.role_id)?.nama || 'Viewer' : 'Viewer', 'Aktif');
    if (inv.role_id) db.prepare("INSERT OR IGNORE INTO user_roles (user_id,role_id,is_primary) VALUES (?,?,1)").run(r.lastInsertRowid, inv.role_id);
    db.prepare("UPDATE invitation_tokens SET status='accepted', accepted_at=datetime('now','localtime') WHERE id=?").run(inv.id);
    h.success(res, { user_id: r.lastInsertRowid }, 'Registrasi berhasil');
  } catch(e) { h.error(res, e.message.includes('UNIQUE') ? 'NID atau email sudah terdaftar' : e.message); }
});

module.exports = router;
