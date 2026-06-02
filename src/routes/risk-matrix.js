// Risk Matrix API — Brantas DMS
const express = require('express');
const router = express.Router();
const { getDB } = require('../db');
const h = require('../helpers');

// GET /api/risk-matrix — get full matrix + scales
router.get('/', h.requireAuth, (req, res) => {
  const db = getDB();
  const matrix = db.prepare("SELECT * FROM risk_matrix ORDER BY probability, impact").all();
  const scales = db.prepare("SELECT * FROM risk_scales ORDER BY tipe, nilai").all();
  h.success(res, { matrix, scales });
});

// PUT /api/risk-matrix/cell — update a single cell (Super Admin only)
router.put('/cell', h.requireRole('Super Admin'), (req, res) => {
  const { probability, impact, score, level, color } = req.body;
  if (!probability || !impact || score == null || !level || !color) {
    return h.error(res, 'Semua field wajib diisi (probability, impact, score, level, color)', 400);
  }
  const db = getDB();
  db.prepare(`
    INSERT INTO risk_matrix (probability, impact, score, level, color)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(probability, impact) DO UPDATE SET score=?, level=?, color=?
  `).run(probability, impact, score, level, color, score, level, color);
  h.success(res, { probability, impact, score, level, color });
});

// PUT /api/risk-matrix/bulk — update entire matrix at once (Super Admin only)
router.put('/bulk', h.requireRole('Super Admin'), (req, res) => {
  const { matrix, scales } = req.body;
  if (!Array.isArray(matrix) || matrix.length !== 25) {
    return h.error(res, 'Matrix harus berisi 25 sel (5x5)', 400);
  }
  const db = getDB();
  const stmtM = db.prepare(`
    INSERT INTO risk_matrix (probability, impact, score, level, color)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(probability, impact) DO UPDATE SET score=?, level=?, color=?
  `);
  const txn = db.transaction(() => {
    for (const cell of matrix) {
      stmtM.run(cell.probability, cell.impact, cell.score, cell.level, cell.color, cell.score, cell.level, cell.color);
    }
    if (Array.isArray(scales)) {
      const stmtS = db.prepare(`
        INSERT INTO risk_scales (tipe, nilai, kode, label, deskripsi)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(tipe, nilai) DO UPDATE SET kode=?, label=?, deskripsi=?
      `);
      for (const s of scales) {
        stmtS.run(s.tipe, s.nilai, s.kode, s.label, s.deskripsi, s.kode, s.label, s.deskripsi);
      }
    }
  });
  txn();
  h.success(res, { updated: 25 });
});

// PUT /api/risk-matrix/scales — update scales only (Super Admin only)
router.put('/scales', h.requireRole('Super Admin'), (req, res) => {
  const { scales } = req.body;
  if (!Array.isArray(scales)) return h.error(res, 'scales harus berupa array', 400);
  const db = getDB();
  const stmt = db.prepare(`
    INSERT INTO risk_scales (tipe, nilai, kode, label, deskripsi)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(tipe, nilai) DO UPDATE SET kode=?, label=?, deskripsi=?
  `);
  const txn = db.transaction(() => {
    for (const s of scales) {
      stmt.run(s.tipe, s.nilai, s.kode, s.label, s.deskripsi, s.kode, s.label, s.deskripsi);
    }
  });
  txn();
  h.success(res, { updated: scales.length });
});

// POST /api/risk-matrix/reset — reset to PLN NP default (Super Admin only)
router.post('/reset', h.requireRole('Super Admin'), (req, res) => {
  const db = getDB();
  db.exec("DELETE FROM risk_matrix; DELETE FROM risk_scales;");
  // Re-seed using the same function from db.js — but we inline it here for simplicity
  const matrix = [
    [1,1,1,'LOW','#00B050'],[1,2,5,'LOW','#00B050'],[1,3,10,'LOW TO MODERATE','#92D050'],[1,4,15,'MODERATE','#FFFF00'],[1,5,20,'HIGH','#FF0000'],
    [2,1,2,'LOW','#00B050'],[2,2,6,'LOW TO MODERATE','#92D050'],[2,3,8,'LOW TO MODERATE','#92D050'],[2,4,16,'MODERATE TO HIGH','#FFC000'],[2,5,21,'HIGH','#FF0000'],
    [3,1,3,'LOW','#00B050'],[3,2,8,'LOW TO MODERATE','#92D050'],[3,3,11,'MODERATE','#FFFF00'],[3,4,18,'MODERATE TO HIGH','#FFC000'],[3,5,23,'HIGH','#FF0000'],
    [4,1,4,'LOW','#00B050'],[4,2,9,'LOW TO MODERATE','#92D050'],[4,3,14,'MODERATE','#FFFF00'],[4,4,19,'MODERATE TO HIGH','#FFC000'],[4,5,24,'HIGH','#FF0000'],
    [5,1,7,'LOW TO MODERATE','#92D050'],[5,2,12,'MODERATE','#FFFF00'],[5,3,17,'MODERATE TO HIGH','#FFC000'],[5,4,22,'HIGH','#FF0000'],[5,5,25,'HIGH','#FF0000'],
  ];
  const stmt = db.prepare('INSERT INTO risk_matrix (probability,impact,score,level,color) VALUES (?,?,?,?,?)');
  for (const r of matrix) stmt.run(...r);

  const probStmt = db.prepare('INSERT INTO risk_scales (tipe,nilai,kode,label,deskripsi) VALUES (?,?,?,?,?)');
  probStmt.run('probability',1,'A','Sangat Jarang Terjadi','Probabilitas kejadian di bawah 20%');
  probStmt.run('probability',2,'B','Jarang Terjadi','Probabilitas kejadian antara 20% sampai dengan 40%');
  probStmt.run('probability',3,'C','Bisa Terjadi','Probabilitas kejadian antara 40% sampai dengan 60%');
  probStmt.run('probability',4,'D','Sangat Mungkin Terjadi','Probabilitas kejadian antara 60% sampai dengan 80%');
  probStmt.run('probability',5,'E','Hampir Pasti Terjadi','Probabilitas kejadian antara 80% sampai dengan 100%');
  const impStmt = db.prepare('INSERT INTO risk_scales (tipe,nilai,kode,label,deskripsi) VALUES (?,?,?,?,?)');
  impStmt.run('impact',1,'1','Sangat Rendah','Dampak minimal, kerugian rendah');
  impStmt.run('impact',2,'2','Rendah','Dampak minor, bisa ditangani internal');
  impStmt.run('impact',3,'3','Moderat','Dampak material, memerlukan tindakan');
  impStmt.run('impact',4,'4','Tinggi','Dampak besar pada operasi/keuangan');
  impStmt.run('impact',5,'5','Sangat Tinggi','Mengancam keberlangsungan usaha');

  h.success(res, { message: 'Matriks risiko berhasil direset ke default PLN NP' });
});

module.exports = router;
