// Sessions API
const router = require('express').Router();
const { getDB } = require('../db');
const h = require('../helpers');

router.get('/', h.requireAuth, (req, res) => {
  const db = getDB();
  const userId = req.query.user_id || null;
  const sql = userId
    ? "SELECT s.*, u.nama as user_nama FROM user_sessions s LEFT JOIN users u ON s.user_id=u.id WHERE s.user_id=? ORDER BY s.last_active_at DESC"
    : "SELECT s.*, u.nama as user_nama FROM user_sessions s LEFT JOIN users u ON s.user_id=u.id ORDER BY s.last_active_at DESC LIMIT 100";
  h.success(res, userId ? db.prepare(sql).all(userId) : db.prepare(sql).all());
});

router.get('/me', h.requireAuth, (req, res) => {
  const sessions = getDB().prepare("SELECT * FROM user_sessions WHERE user_id=? ORDER BY last_active_at DESC").all(req.session.user_id);
  for (const s of sessions) s.is_current = s.session_id === req.sessionID;
  h.success(res, sessions);
});

router.delete('/:id', h.requireRole('Admin', 'Super Admin'), (req, res) => {
  getDB().prepare("UPDATE user_sessions SET is_active=0 WHERE id=?").run(req.params.id);
  h.logAudit(req, 'FORCE_LOGOUT', `Session ID ${req.params.id} diputus`, 'session');
  h.success(res, null, 'Session diputus');
});

router.delete('/me/:id', h.requireAuth, (req, res) => {
  getDB().prepare("UPDATE user_sessions SET is_active=0 WHERE id=? AND user_id=?").run(req.params.id, req.session.user_id);
  h.success(res, null, 'Session dihapus');
});

module.exports = router;
