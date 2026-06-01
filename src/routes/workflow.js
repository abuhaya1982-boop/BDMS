const express = require('express');
const router = express.Router();
const { getDB } = require('../db');
const {
  success, error, notFound, forbidden,
  requireAuth, logAudit, notify
} = require('../helpers');

// GET / — Get workflow documents with optional status filter
router.get('/', requireAuth, (req, res) => {
  try {
    const db = getDB();
    const { status } = req.query;
    const params = [];
    let where = '';

    if (status) {
      where = 'WHERE d.status = ?';
      params.push(status);
    } else {
      where = "WHERE d.status != 'Draft'";
    }

    const items = db.prepare(`
      SELECT d.*, u.nama as unit_nama, p.nama as probis_nama,
             usr.nama as owner_nama, usr.email as owner_email
      FROM ik_documents d
      LEFT JOIN units u ON u.id = d.unit_id
      LEFT JOIN probis p ON p.id = d.probis_id
      LEFT JOIN users usr ON usr.id = d.owner_id
      ${where}
      ORDER BY d.updated_at DESC
    `).all(...params);

    return success(res, items);
  } catch (err) {
    return error(res, err.message);
  }
});

// POST /submit — Submit for review (Draft → Review)
router.post('/submit', requireAuth, (req, res) => {
  try {
    const db = getDB();
    const userId = req.user.id;
    const { dokumen_id, catatan } = req.body;

    if (!dokumen_id) {
      return error(res, 'dokumen_id is required');
    }

    const doc = db.prepare('SELECT * FROM ik_documents WHERE id = ?').get(dokumen_id);
    if (!doc) {
      return notFound(res, 'Document not found');
    }

    if (doc.status !== 'Draft') {
      return forbidden(res, 'Document must be in Draft status to submit for review');
    }

    const now = new Date().toISOString();

    db.prepare(`
      UPDATE ik_documents SET status = 'Review', updated_at = ? WHERE id = ?
    `).run(now, dokumen_id);

    db.prepare(`
      INSERT INTO ik_approvals (dokumen_id, user_id, action, status_from, status_to, catatan, created_at)
      VALUES (?, ?, 'SUBMIT', 'Draft', 'Review', ?, ?)
    `).run(dokumen_id, userId, catatan || null, now);

    logAudit(db, {
      user_id: userId,
      action: 'SUBMIT_DOCUMENT',
      target_type: 'ik_documents',
      target_id: dokumen_id,
      detail: `Submitted document for review: ${doc.judul}`
    });

    notify(db, {
      type: 'WORKFLOW',
      title: 'Document Submitted for Review',
      message: `Document "${doc.judul}" has been submitted for review.`,
      target_roles: ['Asman'],
      target_unit_id: doc.unit_id,
      reference_type: 'ik_documents',
      reference_id: dokumen_id
    });

    return success(res, { message: 'Document submitted for review', status: 'Review' });
  } catch (err) {
    return error(res, err.message);
  }
});

// POST /review — Asman reviews (Review → Approved-T1)
router.post('/review', requireAuth, (req, res) => {
  try {
    const db = getDB();
    const userId = req.user.id;
    const { dokumen_id, catatan } = req.body;

    if (!dokumen_id) {
      return error(res, 'dokumen_id is required');
    }

    const doc = db.prepare('SELECT * FROM ik_documents WHERE id = ?').get(dokumen_id);
    if (!doc) {
      return notFound(res, 'Document not found');
    }

    if (doc.status !== 'Review') {
      return forbidden(res, 'Document must be in Review status');
    }

    // Self-review prevention (unless Super Admin)
    const userRoles = req.user.roles || [];
    if (doc.owner_id === userId && !userRoles.includes('Super Admin')) {
      return forbidden(res, 'You cannot review your own document');
    }

    const now = new Date().toISOString();

    db.prepare(`
      UPDATE ik_documents SET status = 'Approved-T1', updated_at = ? WHERE id = ?
    `).run(now, dokumen_id);

    db.prepare(`
      INSERT INTO ik_approvals (dokumen_id, user_id, action, status_from, status_to, catatan, created_at)
      VALUES (?, ?, 'REVIEW', 'Review', 'Approved-T1', ?, ?)
    `).run(dokumen_id, userId, catatan || null, now);

    logAudit(db, {
      user_id: userId,
      action: 'REVIEW_DOCUMENT',
      target_type: 'ik_documents',
      target_id: dokumen_id,
      detail: `Reviewed and approved (T1): ${doc.judul}`
    });

    notify(db, {
      type: 'WORKFLOW',
      title: 'Document Reviewed - Awaiting Manager Approval',
      message: `Document "${doc.judul}" has been reviewed and is awaiting Manager approval.`,
      target_roles: ['Manager'],
      target_unit_id: doc.unit_id,
      reference_type: 'ik_documents',
      reference_id: dokumen_id
    });

    return success(res, { message: 'Document reviewed and approved (Tier 1)', status: 'Approved-T1' });
  } catch (err) {
    return error(res, err.message);
  }
});

// POST /approve-t1 — Manager approves (Approved-T1 → Approved-T2)
router.post('/approve-t1', requireAuth, (req, res) => {
  try {
    const db = getDB();
    const userId = req.user.id;
    const { dokumen_id, catatan } = req.body;

    if (!dokumen_id) {
      return error(res, 'dokumen_id is required');
    }

    const doc = db.prepare('SELECT * FROM ik_documents WHERE id = ?').get(dokumen_id);
    if (!doc) {
      return notFound(res, 'Document not found');
    }

    if (doc.status !== 'Approved-T1') {
      return forbidden(res, 'Document must be in Approved-T1 status');
    }

    const now = new Date().toISOString();

    db.prepare(`
      UPDATE ik_documents SET status = 'Approved-T2', updated_at = ? WHERE id = ?
    `).run(now, dokumen_id);

    db.prepare(`
      INSERT INTO ik_approvals (dokumen_id, user_id, action, status_from, status_to, catatan, created_at)
      VALUES (?, ?, 'APPROVE_T1', 'Approved-T1', 'Approved-T2', ?, ?)
    `).run(dokumen_id, userId, catatan || null, now);

    logAudit(db, {
      user_id: userId,
      action: 'APPROVE_T1_DOCUMENT',
      target_type: 'ik_documents',
      target_id: dokumen_id,
      detail: `Manager approved (T1): ${doc.judul}`
    });

    notify(db, {
      type: 'WORKFLOW',
      title: 'Document Approved (T1) - Awaiting SM Approval',
      message: `Document "${doc.judul}" has been approved by Manager and is awaiting SM approval.`,
      target_roles: ['SM'],
      target_unit_id: doc.unit_id,
      reference_type: 'ik_documents',
      reference_id: dokumen_id
    });

    return success(res, { message: 'Document approved (Tier 1)', status: 'Approved-T2' });
  } catch (err) {
    return error(res, err.message);
  }
});

// POST /approve-t2 — SM approves (Approved-T2 → Published)
router.post('/approve-t2', requireAuth, (req, res) => {
  try {
    const db = getDB();
    const userId = req.user.id;
    const { dokumen_id, catatan } = req.body;

    if (!dokumen_id) {
      return error(res, 'dokumen_id is required');
    }

    const doc = db.prepare('SELECT * FROM ik_documents WHERE id = ?').get(dokumen_id);
    if (!doc) {
      return notFound(res, 'Document not found');
    }

    if (doc.status !== 'Approved-T2') {
      return forbidden(res, 'Document must be in Approved-T2 status');
    }

    const now = new Date().toISOString();

    db.prepare(`
      UPDATE ik_documents SET status = 'Published', tanggal_terbit = ?, updated_at = ? WHERE id = ?
    `).run(now, now, dokumen_id);

    db.prepare(`
      INSERT INTO ik_approvals (dokumen_id, user_id, action, status_from, status_to, catatan, created_at)
      VALUES (?, ?, 'APPROVE_T2', 'Approved-T2', 'Published', ?, ?)
    `).run(dokumen_id, userId, catatan || null, now);

    logAudit(db, {
      user_id: userId,
      action: 'APPROVE_T2_DOCUMENT',
      target_type: 'ik_documents',
      target_id: dokumen_id,
      detail: `SM approved and published: ${doc.judul}`
    });

    notify(db, {
      type: 'WORKFLOW',
      title: 'Document Published',
      message: `Document "${doc.judul}" has been fully approved and published.`,
      target_user_id: doc.owner_id,
      reference_type: 'ik_documents',
      reference_id: dokumen_id
    });

    return success(res, { message: 'Document approved and published', status: 'Published' });
  } catch (err) {
    return error(res, err.message);
  }
});

// POST /reject — Reject back to Draft from any review stage
router.post('/reject', requireAuth, (req, res) => {
  try {
    const db = getDB();
    const userId = req.user.id;
    const { dokumen_id, catatan } = req.body;

    if (!dokumen_id) {
      return error(res, 'dokumen_id is required');
    }

    if (!catatan) {
      return error(res, 'catatan (reason) is required for rejection');
    }

    const doc = db.prepare('SELECT * FROM ik_documents WHERE id = ?').get(dokumen_id);
    if (!doc) {
      return notFound(res, 'Document not found');
    }

    const allowedStatuses = ['Review', 'Approved-T1', 'Approved-T2'];
    if (!allowedStatuses.includes(doc.status)) {
      return forbidden(res, 'Document must be in a review stage to be rejected');
    }

    const now = new Date().toISOString();
    const previousStatus = doc.status;

    db.prepare(`
      UPDATE ik_documents SET status = 'Draft', updated_at = ? WHERE id = ?
    `).run(now, dokumen_id);

    db.prepare(`
      INSERT INTO ik_approvals (dokumen_id, user_id, action, status_from, status_to, catatan, created_at)
      VALUES (?, ?, 'REJECT', ?, 'Draft', ?, ?)
    `).run(dokumen_id, userId, previousStatus, catatan, now);

    logAudit(db, {
      user_id: userId,
      action: 'REJECT_DOCUMENT',
      target_type: 'ik_documents',
      target_id: dokumen_id,
      detail: `Rejected document from ${previousStatus} to Draft: ${doc.judul}. Reason: ${catatan}`
    });

    notify(db, {
      type: 'WORKFLOW',
      title: 'Document Rejected',
      message: `Document "${doc.judul}" has been rejected. Reason: ${catatan}`,
      target_user_id: doc.owner_id,
      reference_type: 'ik_documents',
      reference_id: dokumen_id
    });

    return success(res, { message: 'Document rejected', status: 'Draft', previous_status: previousStatus });
  } catch (err) {
    return error(res, err.message);
  }
});

// POST /return-revisi — Return to Draft for revision
router.post('/return-revisi', requireAuth, (req, res) => {
  try {
    const db = getDB();
    const userId = req.user.id;
    const { dokumen_id, catatan } = req.body;

    if (!dokumen_id) {
      return error(res, 'dokumen_id is required');
    }

    const doc = db.prepare('SELECT * FROM ik_documents WHERE id = ?').get(dokumen_id);
    if (!doc) {
      return notFound(res, 'Document not found');
    }

    const allowedStatuses = ['Review', 'Approved-T1', 'Approved-T2'];
    if (!allowedStatuses.includes(doc.status)) {
      return forbidden(res, 'Document must be in a review stage to be returned for revision');
    }

    const now = new Date().toISOString();
    const previousStatus = doc.status;

    db.prepare(`
      UPDATE ik_documents SET status = 'Draft', updated_at = ? WHERE id = ?
    `).run(now, dokumen_id);

    db.prepare(`
      INSERT INTO ik_approvals (dokumen_id, user_id, action, status_from, status_to, catatan, created_at)
      VALUES (?, ?, 'RETURN_REVISI', ?, 'Draft', ?, ?)
    `).run(dokumen_id, userId, previousStatus, catatan || null, now);

    logAudit(db, {
      user_id: userId,
      action: 'RETURN_REVISI_DOCUMENT',
      target_type: 'ik_documents',
      target_id: dokumen_id,
      detail: `Returned document for revision from ${previousStatus}: ${doc.judul}`
    });

    notify(db, {
      type: 'WORKFLOW',
      title: 'Document Returned for Revision',
      message: `Document "${doc.judul}" has been returned for revision.${catatan ? ' Note: ' + catatan : ''}`,
      target_user_id: doc.owner_id,
      reference_type: 'ik_documents',
      reference_id: dokumen_id
    });

    return success(res, { message: 'Document returned for revision', status: 'Draft', previous_status: previousStatus });
  } catch (err) {
    return error(res, err.message);
  }
});

// POST /archive — Archive a Published document
router.post('/archive', requireAuth, (req, res) => {
  try {
    const db = getDB();
    const userId = req.user.id;
    const { dokumen_id, catatan } = req.body;

    if (!dokumen_id) {
      return error(res, 'dokumen_id is required');
    }

    const doc = db.prepare('SELECT * FROM ik_documents WHERE id = ?').get(dokumen_id);
    if (!doc) {
      return notFound(res, 'Document not found');
    }

    if (doc.status !== 'Published') {
      return forbidden(res, 'Only Published documents can be archived');
    }

    const now = new Date().toISOString();

    db.prepare(`
      UPDATE ik_documents SET status = 'Archived', updated_at = ? WHERE id = ?
    `).run(now, dokumen_id);

    db.prepare(`
      INSERT INTO ik_approvals (dokumen_id, user_id, action, status_from, status_to, catatan, created_at)
      VALUES (?, ?, 'ARCHIVE', 'Published', 'Archived', ?, ?)
    `).run(dokumen_id, userId, catatan || null, now);

    logAudit(db, {
      user_id: userId,
      action: 'ARCHIVE_DOCUMENT',
      target_type: 'ik_documents',
      target_id: dokumen_id,
      detail: `Archived document: ${doc.judul}`
    });

    notify(db, {
      type: 'WORKFLOW',
      title: 'Document Archived',
      message: `Document "${doc.judul}" has been archived.`,
      target_user_id: doc.owner_id,
      reference_type: 'ik_documents',
      reference_id: dokumen_id
    });

    return success(res, { message: 'Document archived', status: 'Archived' });
  } catch (err) {
    return error(res, err.message);
  }
});

module.exports = router;
