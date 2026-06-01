// Master Data API — Units & Probis
const express = require('express');
const { getDB } = require('../db');
const h = require('../helpers');

const units = express.Router();
const probis = express.Router();

// ─── UNITS ───
units.get('/', h.requireAuth, (req, res) => {
  h.success(res, getDB().prepare("SELECT * FROM units ORDER BY kode").all());
});
units.post('/', h.requireRole('Admin', 'Super Admin'), (req, res) => {
  const { kode, nama, tipe, kode_dokumen, status } = req.body;
  if (!kode || !nama || !tipe || !kode_dokumen) return h.error(res, 'Semua field wajib diisi');
  try {
    const r = getDB().prepare("INSERT INTO units (kode,nama,tipe,kode_dokumen,status) VALUES (?,?,?,?,?)")
      .run(kode, nama, tipe, kode_dokumen, status || 'Aktif');
    h.logAudit(req, 'CREATE', `Unit ${kode} - ${nama} dibuat`, 'create');
    h.created(res, { id: r.lastInsertRowid });
  } catch(e) { h.error(res, e.message.includes('UNIQUE') ? 'Kode sudah digunakan' : e.message); }
});
units.put('/:id', h.requireRole('Admin', 'Super Admin'), (req, res) => {
  const fields = []; const params = [];
  for (const f of ['kode','nama','tipe','kode_dokumen','status']) {
    if (req.body[f] !== undefined) { fields.push(`${f}=?`); params.push(req.body[f]); }
  }
  if (!fields.length) return h.error(res, 'Tidak ada data');
  params.push(req.params.id);
  getDB().prepare(`UPDATE units SET ${fields.join(',')} WHERE id=?`).run(...params);
  h.success(res, null, 'Unit berhasil diperbarui');
});

// ─── PROBIS ───
probis.get('/', h.requireAuth, (req, res) => {
  h.success(res, getDB().prepare("SELECT * FROM probis ORDER BY nomor").all());
});
probis.post('/', h.requireRole('Admin', 'Super Admin'), (req, res) => {
  const { nomor, nama, kategori, status } = req.body;
  if (!nomor || !nama || !kategori) return h.error(res, 'Semua field wajib diisi');
  try {
    const r = getDB().prepare("INSERT INTO probis (nomor,nama,kategori,status) VALUES (?,?,?,?)")
      .run(nomor, nama, kategori, status || 'Aktif');
    h.created(res, { id: r.lastInsertRowid });
  } catch(e) { h.error(res, e.message.includes('UNIQUE') ? 'Nomor sudah digunakan' : e.message); }
});
probis.put('/:id', h.requireRole('Admin', 'Super Admin'), (req, res) => {
  const fields = []; const params = [];
  for (const f of ['nomor','nama','kategori','status']) {
    if (req.body[f] !== undefined) { fields.push(`${f}=?`); params.push(req.body[f]); }
  }
  if (!fields.length) return h.error(res, 'Tidak ada data');
  params.push(req.params.id);
  getDB().prepare(`UPDATE probis SET ${fields.join(',')} WHERE id=?`).run(...params);
  h.success(res, null, 'Probis berhasil diperbarui');
});

module.exports = { units, probis };
