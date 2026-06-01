// Auth API Routes
const router = require('express').Router();
const { getDB } = require('../db');
const h = require('../helpers');

// POST /api/auth/login
router.post('/login', (req, res) => {
  const { nid, password } = req.body;
  if (!nid || !password) return h.error(res, 'NID dan password wajib diisi', 422);

  const db = getDB();
  const user = db.prepare("SELECT * FROM users WHERE nid = ? COLLATE NOCASE").get(nid.toUpperCase().trim());

  if (!user) {
    h.logAudit(req, 'LOGIN_FAILED', `Percobaan login gagal untuk NID: ${nid}`, 'auth', { success: 0 });
    return h.unauthorized(res, 'NID atau password salah');
  }

  if (user.auth_provider !== 'local') return h.forbidden(res, 'Akun ini menggunakan SSO/LDAP.');

  // Check lockout
  if (user.locked_until && new Date(user.locked_until) > new Date()) {
    const mins = Math.ceil((new Date(user.locked_until) - new Date()) / 60000);
    return h.forbidden(res, `Akun terkunci. Coba lagi dalam ${mins} menit`);
  }

  if (!user.password || !h.verifyPassword(password, user.password)) {
    const attempts = (user.failed_login_attempts || 0) + 1;
    if (attempts >= 5) {
      const lockTime = new Date(Date.now() + 15 * 60000).toISOString().replace('T', ' ').slice(0, 19);
      db.prepare("UPDATE users SET failed_login_attempts=?, locked_until=? WHERE id=?").run(attempts, lockTime, user.id);
      h.logAudit(req, 'ACCOUNT_LOCKED', `Akun ${user.nama} terkunci`, 'auth', { success: 0 });
      return h.forbidden(res, 'Akun terkunci karena 5x gagal login. Coba lagi dalam 15 menit.');
    }
    db.prepare("UPDATE users SET failed_login_attempts=? WHERE id=?").run(attempts, user.id);
    h.logAudit(req, 'LOGIN_FAILED', `Password salah untuk ${user.nama} (percobaan ke-${attempts})`, 'auth', { success: 0 });
    return h.unauthorized(res, 'NID atau password salah');
  }

  if (!['Aktif', 'Active'].includes(user.status)) return h.forbidden(res, 'Akun Anda tidak aktif');

  // Reset failed attempts & update last login
  db.prepare("UPDATE users SET failed_login_attempts=0, locked_until=NULL, last_login=datetime('now','localtime'), last_login_ip=? WHERE id=?")
    .run(h.getClientIP(req), user.id);

  // Set session
  req.session.user_id = user.id;
  req.session.role = user.role;
  req.session.original_role = user.role;
  req.session.nama = user.nama;
  req.session.logged_in = true;

  // Register session in user_sessions
  try {
    db.prepare("INSERT OR IGNORE INTO user_sessions (user_id, session_id, ip_address, user_agent, device_name) VALUES (?,?,?,?,?)")
      .run(user.id, req.sessionID, h.getClientIP(req), req.headers['user-agent'] || 'Unknown', h.getDeviceName(req.headers['user-agent']));
  } catch(e) {}

  h.logAudit(req, 'LOGIN', `User ${user.nama} (NID: ${user.nid}) login`, 'auth');

  h.success(res, {
    id: user.id, nama: user.nama, nid: user.nid, role: user.role, original_role: user.role,
    email: user.email, jabatan: user.jabatan, unit_id: user.unit_id,
    auth_provider: user.auth_provider || 'local',
    password_change_required: !!(user.password_change_required || user.must_set_password),
    must_set_password: !!user.must_set_password,
    permissions: h.getUserPermissions(user.id),
    roles: h.getUserRoles(user.id)
  }, 'Login berhasil');
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  if (req.session.user_id) {
    try {
      getDB().prepare("UPDATE user_sessions SET is_active=0 WHERE user_id=? AND session_id=?")
        .run(req.session.user_id, req.sessionID);
    } catch(e) {}
  }
  req.session.destroy(() => {});
  h.success(res, null, 'Logged out');
});

// GET /api/auth/me
router.get('/me', h.requireAuth, (req, res) => {
  const db = getDB();
  const user = db.prepare("SELECT id,nama,nid,email,jabatan,unit_id,role,status,auth_provider,last_login,last_login_ip,password_change_required,must_set_password,failed_login_attempts,locked_until FROM users WHERE id=?")
    .get(req.session.user_id);
  if (!user) return h.notFound(res, 'User tidak ditemukan');
  user.password_change_required = !!user.password_change_required;
  user.must_set_password = !!user.must_set_password;
  user.permissions = h.getUserPermissions(user.id);
  user.roles = h.getUserRoles(user.id);
  h.success(res, user);
});

// GET /api/auth/check
router.get('/check', (req, res) => {
  h.success(res, { logged_in: !!req.session?.user_id });
});

// POST /api/auth/change-password
router.post('/change-password', h.requireAuth, (req, res) => {
  const { old_password, new_password } = req.body;
  if (!new_password || new_password.length < 6) return h.error(res, 'Password baru minimal 6 karakter');

  const db = getDB();
  const user = db.prepare("SELECT password, must_set_password FROM users WHERE id=?").get(req.session.user_id);
  if (!user) return h.notFound(res);

  if (!user.must_set_password && !h.verifyPassword(old_password || '', user.password)) {
    return h.unauthorized(res, 'Password lama salah');
  }

  db.prepare("UPDATE users SET password=?, password_change_required=0, must_set_password=0 WHERE id=?")
    .run(h.hashPassword(new_password), req.session.user_id);
  h.logAudit(req, 'CHANGE_PASSWORD', `User ID ${req.session.user_id} mengganti password`, 'password');
  h.success(res, null, 'Password berhasil diganti');
});

// POST /api/auth/switch-role
router.post('/switch-role', h.requireAuth, (req, res) => {
  const { role } = req.body;
  const allowed = ['Super Admin','Admin','Senior Manager','Manager','Asman','Approver','Document Owner','Viewer'];
  if (!allowed.includes(role)) return h.error(res, 'Role tidak valid');

  const db = getDB();
  const user = db.prepare("SELECT role FROM users WHERE id=?").get(req.session.user_id);
  if (!user || user.role !== 'Super Admin') return h.forbidden(res, 'Hanya Super Admin yang dapat switch role');

  req.session.role = role;
  h.logAudit(req, 'SWITCH_ROLE', `Super Admin beralih ke role: ${role}`, 'auth');
  h.success(res, { role, original_role: req.session.original_role }, `Role berubah menjadi ${role}`);
});

// POST /api/auth/forgot-password
router.post('/forgot-password', (req, res) => {
  const { email } = req.body;
  if (!email) return h.error(res, 'Email wajib diisi');
  const db = getDB();
  const user = db.prepare("SELECT id,nama,email FROM users WHERE email=? AND auth_provider='local'").get(email.trim());
  if (!user) return h.success(res, null, 'Jika email terdaftar, link reset akan dikirim');

  const token = h.generateToken(32);
  const expiresAt = new Date(Date.now() + 3600000).toISOString().replace('T', ' ').slice(0, 19);
  db.prepare("INSERT INTO password_reset_tokens (user_id,token,type,expires_at) VALUES (?,'self_service',?,?)").run(user.id, token, expiresAt);
  const resetUrl = `${req.protocol}://${req.get('host')}/reset-password?token=${token}`;
  h.logAudit(req, 'FORGOT_PASSWORD', `Link reset dikirim ke ${user.email}`, 'password');
  h.success(res, { reset_url: resetUrl }, 'Link reset password telah dikirim');
});

// POST /api/auth/reset-password
router.post('/reset-password', (req, res) => {
  const { token, password } = req.body;
  if (!password || password.length < 6) return h.error(res, 'Password minimal 6 karakter');
  const db = getDB();
  const reset = db.prepare("SELECT * FROM password_reset_tokens WHERE token=? AND is_used=0 AND expires_at > datetime('now','localtime')").get(token);
  if (!reset) return h.error(res, 'Token tidak valid atau sudah kedaluwarsa');

  db.prepare("UPDATE users SET password=?, password_change_required=0, must_set_password=0 WHERE id=?").run(h.hashPassword(password), reset.user_id);
  db.prepare("UPDATE password_reset_tokens SET is_used=1, used_at=datetime('now','localtime') WHERE id=?").run(reset.id);
  h.logAudit(req, 'RESET_PASSWORD', `Password direset untuk User ID ${reset.user_id}`, 'password');
  h.success(res, null, 'Password berhasil direset');
});

// POST /api/auth/admin-force-reset
router.post('/admin-force-reset', h.requireRole('Admin', 'Super Admin'), (req, res) => {
  const { user_id } = req.body;
  if (!user_id) return h.error(res, 'User ID wajib');
  const db = getDB();
  const user = db.prepare("SELECT id,nama,nid,email FROM users WHERE id=?").get(user_id);
  if (!user) return h.notFound(res);
  const tempPw = user.nid.toLowerCase() + Math.floor(100 + Math.random() * 900);
  db.prepare("UPDATE users SET password=?, password_change_required=0, must_set_password=1 WHERE id=?").run(h.hashPassword(tempPw), user_id);
  h.logAudit(req, 'ADMIN_FORCE_RESET', `Admin force reset password untuk ${user.nama}`, 'password');
  h.success(res, { temp_password: tempPw, user_id, user_name: user.nama }, `Password ${user.nama} telah direset`);
});

module.exports = router;
