const express = require('express');
const router = express.Router();
const { getDB } = require('../db');
const {
  success, created, error, notFound, forbidden,
  requireAuth, requireRole,
  generateDocNumber, logAudit, notify
} = require('../helpers');

// GET / — List documents with filters
router.get('/', (req, res) => {
  try {
    const db = getDB();
    const { unit, probis, status, risiko, search, limit = 20, offset = 0 } = req.query;
    const params = [];
    const conditions = [];

    if (unit) {
      conditions.push('d.unit_id = ?');
      params.push(unit);
    }
    if (probis) {
      conditions.push('d.probis_id = ?');
      params.push(probis);
    }
    if (status) {
      conditions.push('d.status = ?');
      params.push(status);
    }
    if (risiko) {
      conditions.push('EXISTS (SELECT 1 FROM ik_risiko r WHERE r.dokumen_id = d.id AND r.level = ?)');
      params.push(risiko);
    }
    if (search) {
      conditions.push('(d.judul LIKE ? OR d.nomor_dokumen LIKE ?)');
      params.push(`%${search}%`, `%${search}%`);
    }

    const where = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

    const countRow = db.prepare(`
      SELECT COUNT(*) as total FROM ik_documents d ${where}
    `).get(...params);

    const items = db.prepare(`
      SELECT d.*, u.nama as unit_nama, p.nama as probis_nama,
             usr.nama as owner_nama
      FROM ik_documents d
      LEFT JOIN units u ON u.id = d.unit_id
      LEFT JOIN probis p ON p.id = d.probis_id
      LEFT JOIN users usr ON usr.id = d.owner_id
      ${where}
      ORDER BY d.updated_at DESC
      LIMIT ? OFFSET ?
    `).all(...params, Number(limit), Number(offset));

    return success(res, {
      items,
      total: countRow.total,
      limit: Number(limit),
      offset: Number(offset)
    });
  } catch (err) {
    return error(res, err.message);
  }
});

// GET /recent — Last 8 documents
router.get('/recent', (req, res) => {
  try {
    const db = getDB();
    const items = db.prepare(`
      SELECT d.*, u.nama as unit_nama, p.nama as probis_nama,
             usr.nama as owner_nama
      FROM ik_documents d
      LEFT JOIN units u ON u.id = d.unit_id
      LEFT JOIN probis p ON p.id = d.probis_id
      LEFT JOIN users usr ON usr.id = d.owner_id
      ORDER BY d.updated_at DESC
      LIMIT 8
    `).all();

    return success(res, items);
  } catch (err) {
    return error(res, err.message);
  }
});

// GET /preview-number — Preview next doc number
router.get('/preview-number', (req, res) => {
  try {
    const db = getDB();
    const { unit_id, probis_id } = req.query;

    if (!unit_id || !probis_id) {
      return error(res, 'unit_id and probis_id are required');
    }

    const unit = db.prepare('SELECT kode_dokumen FROM units WHERE id = ?').get(unit_id);
    const probiRow = db.prepare('SELECT nomor FROM probis WHERE id = ?').get(probis_id);

    if (!unit || !probiRow) {
      return notFound(res, 'Unit or Probis not found');
    }

    const seqRow = db.prepare(
      'SELECT last_sequence FROM doc_number_sequences WHERE unit_id = ? AND probis_id = ?'
    ).get(unit_id, probis_id);

    const nextSeq = (seqRow ? seqRow.last_sequence : 0) + 1;
    const nomor = generateDocNumber(unit.kode_dokumen, probiRow.nomor, nextSeq);

    return success(res, { preview: nomor, next_sequence: nextSeq });
  } catch (err) {
    return error(res, err.message);
  }
});

// GET /:id — Full document with all sub-tables
router.get('/:id', (req, res) => {
  try {
    const db = getDB();
    const { id } = req.params;

    const doc = db.prepare(`
      SELECT d.*, u.nama as unit_nama, u.kode_dokumen,
             p.nama as probis_nama, p.nomor as probis_nomor,
             usr.nama as owner_nama
      FROM ik_documents d
      LEFT JOIN units u ON u.id = d.unit_id
      LEFT JOIN probis p ON p.id = d.probis_id
      LEFT JOIN users usr ON usr.id = d.owner_id
      WHERE d.id = ?
    `).get(id);

    if (!doc) {
      return notFound(res, 'Document not found');
    }

    const steps = db.prepare('SELECT * FROM ik_steps WHERE dokumen_id = ? ORDER BY urutan').all(id);
    const definisi = db.prepare('SELECT * FROM ik_definisi WHERE dokumen_id = ?').all(id);

    const dokumenTerkaitAll = db.prepare('SELECT * FROM ik_dokumen_terkait WHERE dokumen_id = ?').all(id);
    const dokumen_terkait = {
      pendukung: dokumenTerkaitAll.filter(d => d.tipe === 'Pendukung'),
      referensi: dokumenTerkaitAll.filter(d => d.tipe === 'Referensi'),
      perizinan: dokumenTerkaitAll.filter(d => d.tipe === 'Perizinan')
    };

    const sdm = db.prepare('SELECT * FROM ik_sdm WHERE dokumen_id = ?').all(id);
    const tools = db.prepare('SELECT * FROM ik_tools WHERE dokumen_id = ?').all(id);
    const material = db.prepare('SELECT * FROM ik_material WHERE dokumen_id = ?').all(id);
    const form = db.prepare('SELECT * FROM ik_formulir WHERE dokumen_id = ?').all(id);
    const risiko = db.prepare('SELECT * FROM ik_risiko WHERE dokumen_id = ?').all(id);
    const approvals = db.prepare(`
      SELECT a.*, usr.nama as user_nama
      FROM ik_approvals a
      LEFT JOIN users usr ON usr.id = a.user_id
      WHERE a.dokumen_id = ?
      ORDER BY a.created_at DESC
    `).all(id);

    return success(res, {
      ...doc,
      steps,
      definisi,
      dokumen_terkait,
      sdm,
      tools,
      material,
      form,
      risiko,
      approvals
    });
  } catch (err) {
    return error(res, err.message);
  }
});

// POST / — Create document
router.post('/', requireAuth, (req, res) => {
  try {
    const db = getDB();
    const userId = req.user.id;
    const {
      judul, unit_id, probis_id, tujuan, ruang_lingkup, deskripsi,
      steps, definisi, dokumen_terkait, sdm, tools, material, form, risiko
    } = req.body;

    if (!judul || !unit_id || !probis_id) {
      return error(res, 'judul, unit_id, and probis_id are required');
    }

    // Get unit and probis for doc number generation
    const unit = db.prepare('SELECT kode_dokumen FROM units WHERE id = ?').get(unit_id);
    const probiRow = db.prepare('SELECT nomor FROM probis WHERE id = ?').get(probis_id);

    if (!unit || !probiRow) {
      return notFound(res, 'Unit or Probis not found');
    }

    // Generate sequence number
    db.prepare(`
      INSERT OR REPLACE INTO doc_number_sequences (unit_id, probis_id, last_sequence)
      VALUES (?, ?, COALESCE((SELECT last_sequence FROM doc_number_sequences WHERE unit_id = ? AND probis_id = ?), 0) + 1)
    `).run(unit_id, probis_id, unit_id, probis_id);

    const seqRow = db.prepare(
      'SELECT last_sequence FROM doc_number_sequences WHERE unit_id = ? AND probis_id = ?'
    ).get(unit_id, probis_id);

    const nomor_dokumen = generateDocNumber(unit.kode_dokumen, probiRow.nomor, seqRow.last_sequence);

    // Insert main document
    const now = new Date().toISOString();
    const result = db.prepare(`
      INSERT INTO ik_documents (judul, nomor_dokumen, unit_id, probis_id, tujuan, ruang_lingkup, deskripsi, status, owner_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'Draft', ?, ?, ?)
    `).run(judul, nomor_dokumen, unit_id, probis_id, tujuan || null, ruang_lingkup || null, deskripsi || null, userId, now, now);

    const dokumenId = result.lastInsertRowid;

    // Insert steps
    if (steps && steps.length > 0) {
      const stmtStep = db.prepare(`
        INSERT INTO ik_steps (dokumen_id, urutan, judul, deskripsi, gambar, catatan)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      for (const step of steps) {
        stmtStep.run(dokumenId, step.urutan, step.judul, step.deskripsi || null, step.gambar || null, step.catatan || null);
      }
    }

    // Insert definisi
    if (definisi && definisi.length > 0) {
      const stmtDef = db.prepare('INSERT INTO ik_definisi (dokumen_id, istilah, penjelasan) VALUES (?, ?, ?)');
      for (const d of definisi) {
        stmtDef.run(dokumenId, d.istilah, d.penjelasan);
      }
    }

    // Insert dokumen_terkait
    if (dokumen_terkait && dokumen_terkait.length > 0) {
      const stmtDok = db.prepare('INSERT INTO ik_dokumen_terkait (dokumen_id, tipe, nama, nomor, keterangan) VALUES (?, ?, ?, ?, ?)');
      for (const d of dokumen_terkait) {
        stmtDok.run(dokumenId, d.tipe, d.nama, d.nomor || null, d.keterangan || null);
      }
    }

    // Insert SDM
    if (sdm && sdm.length > 0) {
      const stmtSdm = db.prepare('INSERT INTO ik_sdm (dokumen_id, peran, jumlah, kualifikasi) VALUES (?, ?, ?, ?)');
      for (const s of sdm) {
        stmtSdm.run(dokumenId, s.peran, s.jumlah || null, s.kualifikasi || null);
      }
    }

    // Insert tools
    if (tools && tools.length > 0) {
      const stmtTool = db.prepare('INSERT INTO ik_tools (dokumen_id, nama, spesifikasi, jumlah) VALUES (?, ?, ?, ?)');
      for (const t of tools) {
        stmtTool.run(dokumenId, t.nama, t.spesifikasi || null, t.jumlah || null);
      }
    }

    // Insert material
    if (material && material.length > 0) {
      const stmtMat = db.prepare('INSERT INTO ik_material (dokumen_id, nama, spesifikasi, jumlah) VALUES (?, ?, ?, ?)');
      for (const m of material) {
        stmtMat.run(dokumenId, m.nama, m.spesifikasi || null, m.jumlah || null);
      }
    }

    // Insert formulir
    if (form && form.length > 0) {
      const stmtForm = db.prepare('INSERT INTO ik_formulir (dokumen_id, nama, nomor, keterangan) VALUES (?, ?, ?, ?)');
      for (const f of form) {
        stmtForm.run(dokumenId, f.nama, f.nomor || null, f.keterangan || null);
      }
    }

    // Insert risiko
    if (risiko && risiko.length > 0) {
      const stmtRisk = db.prepare('INSERT INTO ik_risiko (dokumen_id, deskripsi, level, mitigasi) VALUES (?, ?, ?, ?)');
      for (const r of risiko) {
        stmtRisk.run(dokumenId, r.deskripsi, r.level || null, r.mitigasi || null);
      }
    }

    logAudit(db, {
      user_id: userId,
      action: 'CREATE_DOCUMENT',
      target_type: 'ik_documents',
      target_id: dokumenId,
      detail: `Created document: ${judul}`
    });

    return created(res, { id: dokumenId, nomor_dokumen });
  } catch (err) {
    return error(res, err.message);
  }
});

// PUT /:id — Update document
router.put('/:id', requireAuth, (req, res) => {
  try {
    const db = getDB();
    const { id } = req.params;
    const userId = req.user.id;

    const doc = db.prepare('SELECT * FROM ik_documents WHERE id = ?').get(id);
    if (!doc) {
      return notFound(res, 'Document not found');
    }

    if (!['Draft', 'Review'].includes(doc.status)) {
      return forbidden(res, 'Document can only be edited in Draft or Review status');
    }

    const {
      judul, tujuan, ruang_lingkup, deskripsi,
      steps, definisi, dokumen_terkait, sdm, tools, material, form, risiko
    } = req.body;

    const now = new Date().toISOString();

    // Update main document fields
    db.prepare(`
      UPDATE ik_documents
      SET judul = COALESCE(?, judul),
          tujuan = COALESCE(?, tujuan),
          ruang_lingkup = COALESCE(?, ruang_lingkup),
          deskripsi = COALESCE(?, deskripsi),
          updated_at = ?
      WHERE id = ?
    `).run(judul || null, tujuan || null, ruang_lingkup || null, deskripsi || null, now, id);

    // Replace steps
    if (steps !== undefined) {
      db.prepare('DELETE FROM ik_steps WHERE dokumen_id = ?').run(id);
      if (steps && steps.length > 0) {
        const stmtStep = db.prepare(`
          INSERT INTO ik_steps (dokumen_id, urutan, judul, deskripsi, gambar, catatan)
          VALUES (?, ?, ?, ?, ?, ?)
        `);
        for (const step of steps) {
          stmtStep.run(id, step.urutan, step.judul, step.deskripsi || null, step.gambar || null, step.catatan || null);
        }
      }
    }

    // Replace definisi
    if (definisi !== undefined) {
      db.prepare('DELETE FROM ik_definisi WHERE dokumen_id = ?').run(id);
      if (definisi && definisi.length > 0) {
        const stmtDef = db.prepare('INSERT INTO ik_definisi (dokumen_id, istilah, penjelasan) VALUES (?, ?, ?)');
        for (const d of definisi) {
          stmtDef.run(id, d.istilah, d.penjelasan);
        }
      }
    }

    // Replace dokumen_terkait
    if (dokumen_terkait !== undefined) {
      db.prepare('DELETE FROM ik_dokumen_terkait WHERE dokumen_id = ?').run(id);
      if (dokumen_terkait && dokumen_terkait.length > 0) {
        const stmtDok = db.prepare('INSERT INTO ik_dokumen_terkait (dokumen_id, tipe, nama, nomor, keterangan) VALUES (?, ?, ?, ?, ?)');
        for (const d of dokumen_terkait) {
          stmtDok.run(id, d.tipe, d.nama, d.nomor || null, d.keterangan || null);
        }
      }
    }

    // Replace SDM
    if (sdm !== undefined) {
      db.prepare('DELETE FROM ik_sdm WHERE dokumen_id = ?').run(id);
      if (sdm && sdm.length > 0) {
        const stmtSdm = db.prepare('INSERT INTO ik_sdm (dokumen_id, peran, jumlah, kualifikasi) VALUES (?, ?, ?, ?)');
        for (const s of sdm) {
          stmtSdm.run(id, s.peran, s.jumlah || null, s.kualifikasi || null);
        }
      }
    }

    // Replace tools
    if (tools !== undefined) {
      db.prepare('DELETE FROM ik_tools WHERE dokumen_id = ?').run(id);
      if (tools && tools.length > 0) {
        const stmtTool = db.prepare('INSERT INTO ik_tools (dokumen_id, nama, spesifikasi, jumlah) VALUES (?, ?, ?, ?)');
        for (const t of tools) {
          stmtTool.run(id, t.nama, t.spesifikasi || null, t.jumlah || null);
        }
      }
    }

    // Replace material
    if (material !== undefined) {
      db.prepare('DELETE FROM ik_material WHERE dokumen_id = ?').run(id);
      if (material && material.length > 0) {
        const stmtMat = db.prepare('INSERT INTO ik_material (dokumen_id, nama, spesifikasi, jumlah) VALUES (?, ?, ?, ?)');
        for (const m of material) {
          stmtMat.run(id, m.nama, m.spesifikasi || null, m.jumlah || null);
        }
      }
    }

    // Replace formulir
    if (form !== undefined) {
      db.prepare('DELETE FROM ik_formulir WHERE dokumen_id = ?').run(id);
      if (form && form.length > 0) {
        const stmtForm = db.prepare('INSERT INTO ik_formulir (dokumen_id, nama, nomor, keterangan) VALUES (?, ?, ?, ?)');
        for (const f of form) {
          stmtForm.run(id, f.nama, f.nomor || null, f.keterangan || null);
        }
      }
    }

    // Replace risiko
    if (risiko !== undefined) {
      db.prepare('DELETE FROM ik_risiko WHERE dokumen_id = ?').run(id);
      if (risiko && risiko.length > 0) {
        const stmtRisk = db.prepare('INSERT INTO ik_risiko (dokumen_id, deskripsi, level, mitigasi) VALUES (?, ?, ?, ?)');
        for (const r of risiko) {
          stmtRisk.run(id, r.deskripsi, r.level || null, r.mitigasi || null);
        }
      }
    }

    logAudit(db, {
      user_id: userId,
      action: 'UPDATE_DOCUMENT',
      target_type: 'ik_documents',
      target_id: id,
      detail: `Updated document: ${doc.judul}`
    });

    return success(res, { message: 'Document updated successfully' });
  } catch (err) {
    return error(res, err.message);
  }
});

// DELETE /:id — Delete document (Admin only)
router.delete('/:id', requireAuth, requireRole('Admin'), (req, res) => {
  try {
    const db = getDB();
    const { id } = req.params;
    const userId = req.user.id;

    const doc = db.prepare('SELECT * FROM ik_documents WHERE id = ?').get(id);
    if (!doc) {
      return notFound(res, 'Document not found');
    }

    // Delete all sub-tables
    db.prepare('DELETE FROM ik_steps WHERE dokumen_id = ?').run(id);
    db.prepare('DELETE FROM ik_definisi WHERE dokumen_id = ?').run(id);
    db.prepare('DELETE FROM ik_dokumen_terkait WHERE dokumen_id = ?').run(id);
    db.prepare('DELETE FROM ik_sdm WHERE dokumen_id = ?').run(id);
    db.prepare('DELETE FROM ik_tools WHERE dokumen_id = ?').run(id);
    db.prepare('DELETE FROM ik_material WHERE dokumen_id = ?').run(id);
    db.prepare('DELETE FROM ik_formulir WHERE dokumen_id = ?').run(id);
    db.prepare('DELETE FROM ik_risiko WHERE dokumen_id = ?').run(id);
    db.prepare('DELETE FROM ik_approvals WHERE dokumen_id = ?').run(id);

    // Delete main document
    db.prepare('DELETE FROM ik_documents WHERE id = ?').run(id);

    logAudit(db, {
      user_id: userId,
      action: 'DELETE_DOCUMENT',
      target_type: 'ik_documents',
      target_id: id,
      detail: `Deleted document: ${doc.judul} (${doc.nomor_dokumen})`
    });

    return success(res, { message: 'Document deleted successfully' });
  } catch (err) {
    return error(res, err.message);
  }
});

module.exports = router;
