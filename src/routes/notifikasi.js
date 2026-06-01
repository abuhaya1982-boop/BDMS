// Notifikasi API
const router = require('express').Router();
const { getDB } = require('../db');
const h = require('../helpers');

router.get('/', h.requireAuth, (req, res) => {
  const notifs = getDB().prepare("SELECT * FROM notifications WHERE user_id=? OR user_id IS NULL ORDER BY created_at DESC LIMIT 50").all(req.session.user_id);
  h.success(res, notifs);
});

router.get('/unread-count', h.requireAuth, (req, res) => {
  const row = getDB().prepare("SELECT COUNT(*) as c FROM notifications WHERE (user_id=? OR user_id IS NULL) AND is_read=0").get(req.session.user_id);
  h.success(res, { count: row.c });
});

router.post('/mark-read', h.requireAuth, (req, res) => {
  const db = getDB();
  if (req.body.id) {
    db.prepare("UPDATE notifications SET is_read=1 WHERE id=? AND (user_id=? OR user_id IS NULL)").run(req.body.id, req.session.user_id);
  } else {
    db.prepare("UPDATE notifications SET is_read=1 WHERE (user_id=? OR user_id IS NULL)").run(req.session.user_id);
  }
  h.success(res, null, 'OK');
});

module.exports = router;
