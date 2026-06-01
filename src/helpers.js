// Brantas DMS — Helper functions
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { getDB } = require('./db');

// ─── Response helpers ───
function success(res, data = null, message = 'OK', code = 200) {
  res.status(code).json({ success: true, message, data });
}
function created(res, data = null, message = 'Created') {
  success(res, data, message, 201);
}
function error(res, message = 'Bad request', code = 400, errors = null) {
  const body = { success: false, message };
  if (errors) body.errors = errors;
  res.status(code).json(body);
}
function notFound(res, message = 'Resource not found') { error(res, message, 404); }
function unauthorized(res, message = 'Unauthorized') { error(res, message, 401); }
function forbidden(res, message = 'Forbidden') { error(res, message, 403); }

// ─── Auth helpers ───
function requireAuth(req, res, next) {
  if (!req.session?.user_id) return unauthorized(res, 'Silakan login terlebih dahulu');
  next();
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.session?.user_id) return unauthorized(res);
    if (req.session.role === 'Super Admin') return next();
    if (!roles.includes(req.session.role)) return forbidden(res, 'Anda tidak memiliki akses');
    next();
  };
}

function requirePermission(permKode) {
  return (req, res, next) => {
    if (!req.session?.user_id) return unauthorized(res);
    if (userHasPermission(req.session.user_id, permKode)) return next();
    forbidden(res, 'Anda tidak memiliki akses');
  };
}

// ─── RBAC helpers ───
function userHasPermission(userId, permKode) {
  const db = getDB();
  const row = db.prepare(`SELECT COUNT(*) as c FROM user_roles ur
    JOIN role_permissions rp ON ur.role_id = rp.role_id
    JOIN permissions p ON rp.permission_id = p.id
    WHERE ur.user_id = ? AND p.kode = ?`).get(userId, permKode);
  return row.c > 0;
}

function getUserPermissions(userId) {
  const db = getDB();
  return db.prepare(`SELECT DISTINCT p.kode, p.nama, p.grup FROM user_roles ur
    JOIN role_permissions rp ON ur.role_id = rp.role_id
    JOIN permissions p ON rp.permission_id = p.id
    WHERE ur.user_id = ? ORDER BY p.grup, p.kode`).all(userId);
}

function getUserRoles(userId) {
  const db = getDB();
  return db.prepare(`SELECT r.*, ur.is_primary, ur.unit_scope_id FROM user_roles ur
    JOIN roles r ON ur.role_id = r.id WHERE ur.user_id = ? ORDER BY r.priority DESC`).all(userId);
}

// ─── Utility ───
function generateToken(len = 32) { return crypto.randomBytes(len).toString('hex'); }
function hashPassword(pw) { return bcrypt.hashSync(pw, 10); }
function verifyPassword(pw, hash) { return bcrypt.compareSync(pw, hash); }

function getClientIP(req) {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || '0.0.0.0';
}

function getDeviceName(ua = '') {
  if (ua.includes('Windows')) return 'Windows';
  if (ua.includes('Mac')) return 'macOS';
  if (ua.includes('Linux')) return 'Linux';
  if (ua.includes('Android')) return 'Android';
  if (ua.includes('iPhone')) return 'iPhone';
  return 'Unknown';
}

function generateDocNumber(kodeDokumen, unitKode, probisNo, seq) {
  return `${kodeDokumen}-${probisNo}-${String(seq).padStart(3, '0')}`;
}

function logAudit(req, aksi, detail, tipe = 'system', opts = {}) {
  try {
    const db = getDB();
    db.prepare(`INSERT INTO audit_trails (user_id, aksi, tipe, resource_type, resource_id, detail, data_before, data_after, ip_address, user_agent, success)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
      req.session?.user_id || null, aksi, tipe,
      opts.resource_type || null, opts.resource_id || null, detail,
      opts.data_before || null, opts.data_after || null,
      getClientIP(req), req.headers['user-agent'] || null, opts.success ?? 1
    );
  } catch(e) {
    // Fallback to audit_logs
    try {
      const db = getDB();
      db.prepare('INSERT INTO audit_logs (user_id, aksi, detail, tipe) VALUES (?, ?, ?, ?)').run(
        req.session?.user_id || null, aksi, detail, tipe);
    } catch(e2) {}
  }
}

function notify(userId, judul, deskripsi, icon = 'info', warnaBg = '#E6F0FF') {
  try {
    const db = getDB();
    db.prepare('INSERT INTO notifications (user_id, judul, deskripsi, icon, warna_bg) VALUES (?,?,?,?,?)').run(
      userId, judul, deskripsi, icon, warnaBg);
  } catch(e) {}
}

module.exports = {
  success, created, error, notFound, unauthorized, forbidden,
  requireAuth, requireRole, requirePermission,
  userHasPermission, getUserPermissions, getUserRoles,
  generateToken, hashPassword, verifyPassword,
  getClientIP, getDeviceName, generateDocNumber,
  logAudit, notify
};
