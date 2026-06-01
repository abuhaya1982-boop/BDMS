// DOCX Export — Generate .docx matching PLN NP IK Template 2025
const router = require('express').Router();
const { getDB } = require('../db');
const h = require('../helpers');
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, PageBreak, HeadingLevel, LevelFormat,
  BorderStyle, WidthType, ShadingType, VerticalAlign, PageNumber,
  SectionType, TableOfContents
} = require('docx');

// ═══ CONSTANTS ═══
const A4_W = 11906, A4_H = 16838; // A4 in DXA (twentieths of a point)
const MARGIN = { top: 850, right: 850, bottom: 1134, left: 850 }; // ~15mm top/lr, 20mm bottom
const CONTENT_W = A4_W - MARGIN.left - MARGIN.right; // usable width
const FONT = 'Arial';
const FONT_MONO = 'Courier New';
const CLR = { primary: '1F4E79', header: '1F4E79', border: '000000', gray: '808080', lightGray: 'D9E2F3', white: 'FFFFFF' };

// PLN NP Risk Matrix
const RISK_MATRIX = {
  '1-1':{s:1,l:'LOW',c:'00B050'},'1-2':{s:5,l:'LOW',c:'00B050'},'1-3':{s:10,l:'LOW TO MODERATE',c:'92D050'},'1-4':{s:15,l:'MODERATE',c:'FFFF00'},'1-5':{s:20,l:'HIGH',c:'FF0000'},
  '2-1':{s:2,l:'LOW',c:'00B050'},'2-2':{s:6,l:'LOW TO MODERATE',c:'92D050'},'2-3':{s:8,l:'LOW TO MODERATE',c:'92D050'},'2-4':{s:16,l:'MODERATE TO HIGH',c:'FFC000'},'2-5':{s:21,l:'HIGH',c:'FF0000'},
  '3-1':{s:3,l:'LOW',c:'00B050'},'3-2':{s:8,l:'LOW TO MODERATE',c:'92D050'},'3-3':{s:11,l:'MODERATE',c:'FFFF00'},'3-4':{s:18,l:'MODERATE TO HIGH',c:'FFC000'},'3-5':{s:23,l:'HIGH',c:'FF0000'},
  '4-1':{s:4,l:'LOW',c:'00B050'},'4-2':{s:9,l:'LOW TO MODERATE',c:'92D050'},'4-3':{s:14,l:'MODERATE',c:'FFFF00'},'4-4':{s:19,l:'MODERATE TO HIGH',c:'FFC000'},'4-5':{s:24,l:'HIGH',c:'FF0000'},
  '5-1':{s:7,l:'LOW TO MODERATE',c:'92D050'},'5-2':{s:12,l:'MODERATE',c:'FFFF00'},'5-3':{s:17,l:'MODERATE TO HIGH',c:'FFC000'},'5-4':{s:22,l:'HIGH',c:'FF0000'},'5-5':{s:25,l:'HIGH',c:'FF0000'},
};
const rmLookup = (p, d) => RISK_MATRIX[`${p}-${d}`] || { s: '-', l: '-', c: 'CCCCCC' };

// ═══ HELPER: borders ═══
const border = { style: BorderStyle.SINGLE, size: 1, color: CLR.border };
const borders = { top: border, bottom: border, left: border, right: border };
const noBorders = { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } };

// ═══ HELPER: create a cell ═══
function cell(text, opts = {}) {
  const { width, bold, align, shade, font, size, span, vAlign, children, noBorder } = opts;
  const cellOpts = {
    borders: noBorder ? noBorders : borders,
    margins: { top: 40, bottom: 40, left: 80, right: 80 },
  };
  if (width) cellOpts.width = { size: width, type: WidthType.DXA };
  if (shade) cellOpts.shading = { fill: shade, type: ShadingType.CLEAR };
  if (span) cellOpts.columnSpan = span;
  if (vAlign) cellOpts.verticalAlign = vAlign;

  if (children) {
    cellOpts.children = children;
  } else {
    cellOpts.children = [new Paragraph({
      alignment: align || AlignmentType.LEFT,
      children: [new TextRun({
        text: String(text ?? ''),
        bold: bold || false,
        font: font || FONT,
        size: size || 20, // 10pt
      })],
    })];
  }
  return new TableCell(cellOpts);
}

// ═══ HELPER: header cell (bold, centered, shaded) ═══
function hCell(text, opts = {}) {
  return cell(text, { bold: true, align: AlignmentType.CENTER, shade: CLR.lightGray, ...opts });
}

// ═══ HELPER: parse rich text HTML → TextRun array (simplified) ═══
function htmlToRuns(html) {
  if (!html) return [new TextRun({ text: '-', font: FONT, size: 20, color: CLR.gray })];
  // Strip HTML tags for DOCX (simplified: paragraphs only)
  const text = String(html)
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<li[^>]*>/gi, '  • ')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#x2019;/g, "'").replace(/&nbsp;/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  if (!text) return [new TextRun({ text: '-', font: FONT, size: 20, color: CLR.gray })];
  return [new TextRun({ text, font: FONT, size: 20 })];
}

// ═══ HELPER: convert HTML to paragraphs ═══
function htmlToParagraphs(html) {
  if (!html) return [new Paragraph({ children: [new TextRun({ text: '-', font: FONT, size: 20, color: CLR.gray })] })];
  const text = String(html)
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<li[^>]*>/gi, '• ')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#x2019;/g, "'").replace(/&nbsp;/g, ' ')
    .trim();
  if (!text) return [new Paragraph({ children: [new TextRun({ text: '-', font: FONT, size: 20, color: CLR.gray })] })];
  return text.split('\n').filter(l => l.trim()).map(line =>
    new Paragraph({
      spacing: { after: 60 },
      children: [new TextRun({ text: line.trim(), font: FONT, size: 20 })],
    })
  );
}

function fmtDate(d) {
  if (!d) return '-';
  try { return new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' }); }
  catch { return d; }
}

// ═══════════════════════════════════════════
//  BUILD DOCX DOCUMENT
// ═══════════════════════════════════════════
function buildDocx(doc, data) {
  const { steps, definisi, sdm, tools, material, risiko, formulir,
    dokPendukung, dokReferensi, dokPerizinan, changeHistory } = data;

  const nom = doc.nomor_dokumen || '';
  const judul = doc.judul || '';
  const rev = doc.revisi || '00';
  const unit = doc.unit_nama || '';
  const probis = doc.probis_nama || '';
  const penyusunNama = doc.penyusun_nama || doc.owner_nama || '-';
  const penyusunJab = doc.penyusun_jabatan || 'Asst. Manager';
  const approverNama = doc.approver_nama || '........................';
  const pengesahanNama = doc.pengesahan_nama || '........................';

  // Parse template sections
  let tplSections = [];
  try {
    if (doc.template_snapshot) tplSections = JSON.parse(doc.template_snapshot).filter(s => s.enabled !== false);
  } catch {}
  if (!tplSections.length) {
    tplSections = [
      { id: 'tujuan', label: 'Tujuan' }, { id: 'ruang_lingkup', label: 'Ruang Lingkup' },
      { id: 'definisi', label: 'Definisi & Singkatan', type: 'table' },
      { id: 'dokumen_terkait', label: 'Dokumen Terkait', type: 'special' },
      { id: 'sdm', label: 'Sumber Daya Manusia', type: 'table' },
      { id: 'tools', label: 'Alat & Perlengkapan', type: 'table' },
      { id: 'material', label: 'Material & Suku Cadang', type: 'table' },
      { id: 'aktivitas_persiapan', label: 'Aktivitas Persiapan' },
      { id: 'aktivitas_pelaksanaan', label: 'Aktivitas Pelaksanaan' },
      { id: 'aktivitas_monitoring', label: 'Aktivitas Monitoring' },
      { id: 'aktivitas_tindak_lanjut', label: 'Aktivitas Tindakan Akhir' },
      { id: 'identifikasi_risiko', label: 'Identifikasi Risiko', type: 'risk_matrix' },
      { id: 'metode_pengukuran', label: 'Metode Pengukuran', type: 'table' },
      { id: 'formulir', label: 'Formulir Terkait' },
      { id: 'data_teknik', label: 'Data Teknik Equipment' },
    ];
  }

  // ═══ PAGE PROPERTIES (shared) ═══
  const pageProps = {
    page: {
      size: { width: A4_W, height: A4_H },
      margin: MARGIN,
    },
  };

  // ═══ IMS HEADER TABLE (for content pages) ═══
  function makeHeaderTable() {
    const hdrColWidths = [800, 4000, 1800, 3606];
    return new Table({
      width: { size: CONTENT_W, type: WidthType.DXA },
      columnWidths: hdrColWidths,
      rows: [
        new TableRow({ children: [
          cell('PLN NP', { width: hdrColWidths[0], bold: true, align: AlignmentType.CENTER, size: 14, span: 1 }),
          cell('PT PLN NUSANTARA POWER\nINTEGRATED MANAGEMENT SYSTEM', { width: hdrColWidths[1], bold: true, align: AlignmentType.CENTER, size: 18, span: 1, children: [
            new Paragraph({ alignment: AlignmentType.CENTER, children: [
              new TextRun({ text: 'PT PLN NUSANTARA POWER', bold: true, font: FONT, size: 19 }),
            ]}),
            new Paragraph({ alignment: AlignmentType.CENTER, children: [
              new TextRun({ text: 'INTEGRATED MANAGEMENT SYSTEM', font: FONT, size: 16 }),
            ]}),
          ]}),
          cell('No. Dokumen', { width: hdrColWidths[2], bold: true, size: 17 }),
          cell(`: ${nom}`, { width: hdrColWidths[3], size: 17, font: FONT_MONO }),
        ]}),
        new TableRow({ children: [
          cell('', { width: hdrColWidths[0], span: 1 }),
          cell('INSTRUKSI KERJA\n' + judul.toUpperCase(), { width: hdrColWidths[1], bold: true, align: AlignmentType.CENTER, size: 18, span: 1, children: [
            new Paragraph({ alignment: AlignmentType.CENTER, children: [
              new TextRun({ text: 'INSTRUKSI KERJA', bold: true, font: FONT, size: 19 }),
            ]}),
            new Paragraph({ alignment: AlignmentType.CENTER, children: [
              new TextRun({ text: judul.toUpperCase(), bold: true, font: FONT, size: 17 }),
            ]}),
          ]}),
          cell('Revisi', { width: hdrColWidths[2], bold: true, size: 17 }),
          cell(`: ${rev}`, { width: hdrColWidths[3], size: 17 }),
        ]}),
        new TableRow({ children: [
          cell('', { width: hdrColWidths[0], span: 2 }),
          cell('', { width: hdrColWidths[1] }),
          cell('Tgl. Terbit', { width: hdrColWidths[2], bold: true, size: 17 }),
          cell(`: ${fmtDate(doc.tanggal_terbit)}`, { width: hdrColWidths[3], size: 17 }),
        ]}),
      ],
    });
  }

  // ═══ SECTION 1: COVER PAGE ═══
  const coverChildren = [
    new Paragraph({ spacing: { before: 2400 } }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 80 }, children: [
      new TextRun({ text: 'INSTRUKSI KERJA (IK)', bold: true, font: FONT, size: 32, color: CLR.primary }),
    ]}),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 600 }, children: [
      new TextRun({ text: 'PT PLN NUSANTARA POWER', bold: true, font: FONT, size: 28, color: CLR.primary }),
    ]}),
    // Title box
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 400 }, border: { top: { style: BorderStyle.SINGLE, size: 3, color: CLR.border, space: 8 }, bottom: { style: BorderStyle.SINGLE, size: 3, color: CLR.border, space: 8 }, left: { style: BorderStyle.SINGLE, size: 3, color: CLR.border, space: 12 }, right: { style: BorderStyle.SINGLE, size: 3, color: CLR.border, space: 12 } },
      children: [new TextRun({ text: judul.toUpperCase(), bold: true, font: FONT, size: 32 })],
    }),
    new Paragraph({ spacing: { after: 600 } }),
    // Metadata table
    new Table({
      width: { size: 6000, type: WidthType.DXA },
      columnWidths: [2800, 400, 2800],
      rows: [
        new TableRow({ children: [
          cell('NO. DOKUMEN', { width: 2800, bold: true, size: 22, noBorder: true }),
          cell(':', { width: 400, bold: true, size: 22, align: AlignmentType.CENTER, noBorder: true }),
          cell(nom, { width: 2800, size: 22, font: FONT_MONO, noBorder: true }),
        ]}),
        new TableRow({ children: [
          cell('TANGGAL DITETAPKAN', { width: 2800, bold: true, size: 22, noBorder: true }),
          cell(':', { width: 400, bold: true, size: 22, align: AlignmentType.CENTER, noBorder: true }),
          cell(fmtDate(doc.tanggal_ditetapkan), { width: 2800, size: 22, noBorder: true }),
        ]}),
        new TableRow({ children: [
          cell('TANGGAL DIPERBARUI', { width: 2800, bold: true, size: 22, noBorder: true }),
          cell(':', { width: 400, bold: true, size: 22, align: AlignmentType.CENTER, noBorder: true }),
          cell(fmtDate(doc.tanggal_diperbarui || doc.updated_at), { width: 2800, size: 22, noBorder: true }),
        ]}),
        new TableRow({ children: [
          cell('REVISI', { width: 2800, bold: true, size: 22, noBorder: true }),
          cell(':', { width: 400, bold: true, size: 22, align: AlignmentType.CENTER, noBorder: true }),
          cell(rev, { width: 2800, size: 22, noBorder: true }),
        ]}),
      ],
    }),
    new Paragraph({ spacing: { after: 600 } }),
    // Signature table (3 columns)
    new Table({
      width: { size: CONTENT_W, type: WidthType.DXA },
      columnWidths: [Math.floor(CONTENT_W / 3), Math.floor(CONTENT_W / 3), CONTENT_W - 2 * Math.floor(CONTENT_W / 3)],
      rows: [
        new TableRow({ children: [
          hCell('Disusun oleh', { width: Math.floor(CONTENT_W / 3) }),
          hCell('Disetujui oleh', { width: Math.floor(CONTENT_W / 3) }),
          hCell('Disahkan oleh', { width: CONTENT_W - 2 * Math.floor(CONTENT_W / 3) }),
        ]}),
        new TableRow({ children: [
          cell('', { width: Math.floor(CONTENT_W / 3), children: [
            new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 80 }, children: [new TextRun({ text: 'Disusun,', bold: true, font: FONT, size: 20 })] }),
            new Paragraph({ spacing: { before: 800, after: 80 } }), // space for signature
            new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 40 }, border: { top: { style: BorderStyle.SINGLE, size: 1, color: CLR.border } }, children: [new TextRun({ text: penyusunNama, bold: true, font: FONT, size: 20 })] }),
            new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: penyusunJab, font: FONT, size: 16, color: CLR.gray })] }),
          ]}),
          cell('', { width: Math.floor(CONTENT_W / 3), children: [
            new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 80 }, children: [new TextRun({ text: 'Disetujui,', bold: true, font: FONT, size: 20 })] }),
            new Paragraph({ spacing: { before: 800, after: 80 } }),
            new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 40 }, border: { top: { style: BorderStyle.SINGLE, size: 1, color: CLR.border } }, children: [new TextRun({ text: approverNama, bold: true, font: FONT, size: 20 })] }),
            new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Manager Sub-bidang', font: FONT, size: 16, color: CLR.gray })] }),
          ]}),
          cell('', { width: CONTENT_W - 2 * Math.floor(CONTENT_W / 3), children: [
            new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 80 }, children: [new TextRun({ text: 'Disahkan,', bold: true, font: FONT, size: 20 })] }),
            new Paragraph({ spacing: { before: 800, after: 80 } }),
            new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 40 }, border: { top: { style: BorderStyle.SINGLE, size: 1, color: CLR.border } }, children: [new TextRun({ text: pengesahanNama, bold: true, font: FONT, size: 20 })] }),
            new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Senior Manager', font: FONT, size: 16, color: CLR.gray })] }),
          ]}),
        ]}),
      ],
    }),
  ];

  // ═══ SECTION 2: CHANGE HISTORY ═══
  const historyRows = (changeHistory && changeHistory.length)
    ? changeHistory.map((r, i) => new TableRow({ children: [
        cell(String(i + 1) + '.', { width: 500, align: AlignmentType.CENTER }),
        cell(r.halaman || '', { width: 2000 }),
        cell(r.uraian || '', { width: 5000 }),
        cell(r.revisi || '', { width: 800, align: AlignmentType.CENTER }),
        cell(r.tanggal || '', { width: 1906, align: AlignmentType.CENTER }),
      ] }))
    : [new TableRow({ children: [
        cell('1.', { width: 500, align: AlignmentType.CENTER }),
        cell('Seluruh halaman', { width: 2000 }),
        cell('Dokumen baru — revisi awal', { width: 5000 }),
        cell('00', { width: 800, align: AlignmentType.CENTER }),
        cell(fmtDate(doc.tanggal_ditetapkan), { width: 1906, align: AlignmentType.CENTER }),
      ] })];

  const changeHistoryChildren = [
    makeHeaderTable(),
    new Paragraph({ spacing: { before: 300 } }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 200 }, children: [
      new TextRun({ text: 'DAFTAR PERUBAHAN DOKUMEN', bold: true, font: FONT, size: 24 }),
    ]}),
    new Table({
      width: { size: CONTENT_W, type: WidthType.DXA },
      columnWidths: [500, 2000, 5000, 800, 1906],
      rows: [
        new TableRow({ children: [
          hCell('No', { width: 500 }), hCell('Halaman', { width: 2000 }), hCell('Uraian Perubahan', { width: 5000 }),
          hCell('Revisi ke-', { width: 800 }), hCell('Tanggal', { width: 1906 }),
        ]}),
        ...historyRows,
      ],
    }),
  ];

  // ═══ SECTION 3: CONTENT ═══
  const contentChildren = [makeHeaderTable(), new Paragraph({ spacing: { before: 200 } })];
  let secNum = 1;

  // Section title helper
  function addSectionTitle(label) {
    contentChildren.push(new Paragraph({
      spacing: { before: 240, after: 120 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 2, color: CLR.border, space: 4 } },
      children: [new TextRun({ text: `${secNum}. ${label}`, bold: true, font: FONT, size: 22 })],
    }));
  }

  function addSubTitle(label) {
    contentChildren.push(new Paragraph({
      spacing: { before: 160, after: 80 },
      children: [new TextRun({ text: label, bold: true, font: FONT, size: 20 })],
    }));
  }

  // Generic table builder
  function addTable(dataArr, columns, colWidths) {
    if (!dataArr || !dataArr.length) return;
    const colKeys = columns.map(c => c.toLowerCase().replace(/[\s\/]/g, '_'));
    const skipKeys = new Set(['id', 'dokumen_id', 'tipe']);
    const noWidth = Math.floor(CONTENT_W * 0.05);
    const remaining = CONTENT_W - noWidth;
    const widths = colWidths || columns.map(() => Math.floor(remaining / columns.length));

    const headerRow = new TableRow({ children: [
      hCell('No', { width: noWidth }),
      ...columns.map((c, i) => hCell(c, { width: widths[i] })),
    ]});
    const dataRows = dataArr.map((r, idx) => {
      const cells = [cell(String(idx + 1), { width: noWidth, align: AlignmentType.CENTER })];
      columns.forEach((c, ci) => {
        let val = '';
        if (typeof r === 'object' && r !== null) {
          val = r[colKeys[ci]] ?? r[c] ?? '';
          if (!val && val !== 0) {
            const dataKeys = Object.keys(r).filter(k => !skipKeys.has(k));
            val = (ci < dataKeys.length) ? r[dataKeys[ci]] : '';
          }
        } else val = r;
        cells.push(cell(String(val ?? ''), { width: widths[ci] }));
      });
      return new TableRow({ children: cells });
    });

    contentChildren.push(new Table({
      width: { size: CONTENT_W, type: WidthType.DXA },
      columnWidths: [noWidth, ...widths],
      rows: [headerRow, ...dataRows],
    }));
  }

  // Build risk tables
  function addRiskSection() {
    if (!risiko || !risiko.length) return;
    addSectionTitle('Identifikasi Risiko');

    // Inherent Risk Table
    addSubTitle('Identifikasi Risiko (Inherent)');
    const iW = [500, 2500, 2000, 900, 900, 700, 2706];
    contentChildren.push(new Table({
      width: { size: CONTENT_W, type: WidthType.DXA },
      columnWidths: iW,
      rows: [
        new TableRow({ children: [
          hCell('No.', { width: iW[0] }), hCell('Risiko', { width: iW[1] }), hCell('Penyebab', { width: iW[2] }),
          hCell('Prob.', { width: iW[3] }), hCell('Dampak', { width: iW[4] }),
          hCell('Skor', { width: iW[5] }), hCell('Level Inherent', { width: iW[6] }),
        ]}),
        ...risiko.map((r, i) => {
          const p = parseInt(r.kemungkinan) || 0, d2 = parseInt(r.dampak_level) || 0;
          const rm = rmLookup(p, d2);
          return new TableRow({ children: [
            cell(String(i + 1), { width: iW[0], align: AlignmentType.CENTER }),
            cell(r.risiko || '', { width: iW[1] }),
            cell(r.penyebab || '', { width: iW[2] }),
            cell(String(p || '-'), { width: iW[3], align: AlignmentType.CENTER }),
            cell(String(d2 || '-'), { width: iW[4], align: AlignmentType.CENTER }),
            cell(String(rm.s), { width: iW[5], align: AlignmentType.CENTER, bold: true, shade: rm.c }),
            cell(rm.l, { width: iW[6], align: AlignmentType.CENTER, bold: true, size: 16 }),
          ]});
        }),
      ],
    }));

    // Residual Risk Table (Targeted)
    addSubTitle('Perlakuan Risiko (Residual)');
    const rW = [500, 2500, 2000, 900, 900, 700, 2706];
    contentChildren.push(new Table({
      width: { size: CONTENT_W, type: WidthType.DXA },
      columnWidths: rW,
      rows: [
        new TableRow({ children: [
          hCell('No', { width: rW[0] }), hCell('Kontrol / Pengendalian', { width: rW[1] }), hCell('Mitigasi', { width: rW[2] }),
          hCell('Prob.', { width: rW[3] }), hCell('Dampak', { width: rW[4] }),
          hCell('Skor', { width: rW[5] }), hCell('Level Residual', { width: rW[6] }),
        ]}),
        ...risiko.map((r, i) => {
          const rp = parseInt(r.residual_kemungkinan) || 0, rd = parseInt(r.residual_dampak) || 0;
          const rm = rmLookup(rp, rd);
          return new TableRow({ children: [
            cell(String(i + 1), { width: rW[0], align: AlignmentType.CENTER }),
            cell(r.kontrol_existing || '', { width: rW[1] }),
            cell(r.mitigasi || '-', { width: rW[2] }),
            cell(String(rp || '-'), { width: rW[3], align: AlignmentType.CENTER }),
            cell(String(rd || '-'), { width: rW[4], align: AlignmentType.CENTER }),
            cell(String(rm.s), { width: rW[5], align: AlignmentType.CENTER, bold: true, shade: rm.c }),
            cell(rm.l, { width: rW[6], align: AlignmentType.CENTER, bold: true, size: 16 }),
          ]});
        }),
      ],
    }));

    // 5x5 Heat Map
    addSubTitle('Heat Map Risiko');
    const hmSize = Math.floor(CONTENT_W / 6);
    const hmLabel = CONTENT_W - 5 * hmSize;
    const hmRows = [];
    // Header row
    hmRows.push(new TableRow({ children: [
      hCell('Prob \\ Dampak', { width: hmLabel, size: 16 }),
      ...[1, 2, 3, 4, 5].map(d => hCell(String(d), { width: hmSize, size: 16 })),
    ]}));
    for (let p = 5; p >= 1; p--) {
      hmRows.push(new TableRow({ children: [
        hCell(String(p), { width: hmLabel, size: 16 }),
        ...[1, 2, 3, 4, 5].map(d => {
          const rm = rmLookup(p, d);
          return cell(String(rm.s), { width: hmSize, align: AlignmentType.CENTER, bold: true, shade: rm.c, size: 18 });
        }),
      ]}));
    }
    contentChildren.push(new Table({
      width: { size: CONTENT_W, type: WidthType.DXA },
      columnWidths: [hmLabel, hmSize, hmSize, hmSize, hmSize, hmSize],
      rows: hmRows,
    }));

    secNum++;
  }

  // Collect aktivitas sections
  const aktivitasSections = tplSections.filter(s => s.id.startsWith('aktivitas_'));
  let aktivitasRendered = false;

  // Render all sections in template order
  for (const sec of tplSections) {
    if (sec.id === 'change_history') continue;

    // Aktivitas: grouped block at first aktivitas section
    if (sec.id.startsWith('aktivitas_')) {
      if (!aktivitasRendered && aktivitasSections.length) {
        addSectionTitle('Detail Aktivitas');
        for (const aSec of aktivitasSections) {
          const tabLabel = aSec.label.replace(/^Aktivitas\s*/i, '') || aSec.label;
          const content = steps[aSec.id];
          if (content) {
            addSubTitle(tabLabel);
            htmlToParagraphs(content).forEach(p => contentChildren.push(p));
          }
        }
        secNum++;
        aktivitasRendered = true;
      }
      continue;
    }

    switch (sec.id) {
      case 'tujuan':
      case 'ruang_lingkup':
      case 'data_teknik': {
        const content = steps[sec.id] || '';
        if (content || sec.id === 'tujuan' || sec.id === 'ruang_lingkup') {
          addSectionTitle(sec.label);
          htmlToParagraphs(content).forEach(p => contentChildren.push(p));
          secNum++;
        }
        break;
      }
      case 'definisi': {
        addSectionTitle(sec.label);
        if (definisi.length) addTable(definisi, sec.columns || ['Istilah', 'Penjelasan']);
        else contentChildren.push(new Paragraph({ children: [new TextRun({ text: '-', font: FONT, size: 20, color: CLR.gray })] }));
        secNum++;
        break;
      }
      case 'dokumen_terkait': {
        addSectionTitle(sec.label);
        if (dokPendukung.length) {
          addSubTitle('A.1 Dokumen Pendukung');
          dokPendukung.forEach(d => contentChildren.push(new Paragraph({
            spacing: { after: 40 },
            indent: { left: 360 },
            children: [new TextRun({ text: '• ' + (d.nomor || d.nama || d.konten || ''), font: FONT, size: 20 })],
          })));
        }
        if (dokReferensi.length) {
          addSubTitle('A.2 Dokumen Referensi');
          dokReferensi.forEach(d => contentChildren.push(new Paragraph({
            spacing: { after: 40 },
            indent: { left: 360 },
            children: [new TextRun({ text: '• ' + (d.nama || d.konten || ''), font: FONT, size: 20 })],
          })));
        }
        if (dokPerizinan.length) {
          addSubTitle('A.3 Dokumen Perizinan');
          dokPerizinan.forEach(d => contentChildren.push(new Paragraph({
            spacing: { after: 40 },
            indent: { left: 360 },
            children: [new TextRun({ text: '• ' + (d.nama || d.konten || ''), font: FONT, size: 20 })],
          })));
        }
        secNum++;
        break;
      }
      case 'sdm': {
        addSectionTitle(sec.label);
        addTable(sdm, sec.columns || ['Kompetensi', 'Jumlah', 'Keterangan']);
        secNum++;
        break;
      }
      case 'tools': {
        addSectionTitle(sec.label);
        addTable(tools, sec.columns || ['Nama', 'Jumlah', 'Keterangan']);
        secNum++;
        break;
      }
      case 'material': {
        addSectionTitle(sec.label);
        addTable(material, sec.columns || ['Nama', 'Jumlah', 'Keterangan']);
        secNum++;
        break;
      }
      case 'identifikasi_risiko': {
        addRiskSection();
        break;
      }
      case 'metode_pengukuran': {
        const metode = steps.metode_pengukuran || [];
        if (Array.isArray(metode) && metode.length) {
          addSectionTitle(sec.label);
          addTable(metode, sec.columns || ['Metode', 'Parameter', 'Keterangan']);
          secNum++;
        }
        break;
      }
      case 'formulir': {
        const fc = steps.formulir || '';
        if (fc) {
          addSectionTitle(sec.label);
          htmlToParagraphs(fc).forEach(p => contentChildren.push(p));
          secNum++;
        }
        break;
      }
      default: {
        // Custom sections
        const customData = doc.custom_sections ? (typeof doc.custom_sections === 'string' ? JSON.parse(doc.custom_sections) : doc.custom_sections) : {};
        const val = customData[sec.id] || steps[sec.id];
        if (val) {
          addSectionTitle(sec.label);
          if (typeof val === 'string') {
            htmlToParagraphs(val).forEach(p => contentChildren.push(p));
          } else if (Array.isArray(val)) {
            addTable(val, sec.columns || ['Isi']);
          }
          secNum++;
        }
        break;
      }
    }
  }

  // Footer info
  contentChildren.push(new Paragraph({ spacing: { before: 400 } }));
  contentChildren.push(new Paragraph({
    border: { top: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC', space: 4 } },
    children: [
      new TextRun({ text: `Brantas DMS v3.0 — PT PLN Nusantara Power UP Brantas — ${nom} Rev.${rev}`, font: FONT, size: 15, color: CLR.gray }),
    ],
  }));

  // ═══ ASSEMBLE DOCUMENT ═══
  return new Document({
    styles: {
      default: { document: { run: { font: FONT, size: 20 } } },
    },
    sections: [
      // Cover page
      { properties: { ...pageProps }, children: coverChildren },
      // Change history page
      { properties: { ...pageProps, type: SectionType.NEXT_PAGE }, children: changeHistoryChildren },
      // Content pages
      {
        properties: {
          ...pageProps,
          type: SectionType.NEXT_PAGE,
        },
        children: contentChildren,
      },
    ],
  });
}

// ═══ ROUTE: GET /api/dokumen/:id/docx ═══
router.get('/:id/docx', h.requireAuth, async (req, res) => {
  try {
    const db = getDB();
    const doc = db.prepare(`
      SELECT d.*, u.nama as unit_nama, u.kode_dokumen, p.nama as probis_nama,
        usr.nama as owner_nama, appr.nama as approver_nama, peng.nama as pengesahan_nama
      FROM ik_documents d LEFT JOIN units u ON u.id=d.unit_id LEFT JOIN probis p ON p.id=d.probis_id
      LEFT JOIN users usr ON usr.id=d.owner_id
      LEFT JOIN users appr ON appr.id=d.approver_id
      LEFT JOIN users peng ON peng.id=d.pengesahan_id
      WHERE d.id=?
    `).get(req.params.id);
    if (!doc) return h.notFound(res, 'Dokumen tidak ditemukan');

    const id = req.params.id;

    // Load steps
    const stepRows = db.prepare('SELECT * FROM ik_steps WHERE dokumen_id=? ORDER BY step').all(id);
    const steps = {};
    if (stepRows.length) {
      const s = stepRows[0];
      for (const key of ['tujuan', 'ruang_lingkup', 'aktivitas_persiapan', 'aktivitas_pelaksanaan', 'aktivitas_monitoring', 'aktivitas_tindak_lanjut', 'data_teknik', 'change_history']) {
        if (s[key]) steps[key] = s[key];
      }
      if (s.metode_pengukuran) { try { steps.metode_pengukuran = JSON.parse(s.metode_pengukuran); } catch { steps.metode_pengukuran = s.metode_pengukuran; } }
    }
    // Merge konten
    let konten = {};
    if (doc.konten) { try { konten = JSON.parse(doc.konten); } catch {} }
    if (konten.steps) Object.assign(steps, konten.steps);
    if (konten.formulir && !steps.formulir) steps.formulir = konten.formulir;

    // Load sub-tables
    const definisi = db.prepare('SELECT * FROM ik_definisi WHERE dokumen_id=?').all(id);
    const dokTerkaitAll = db.prepare('SELECT * FROM ik_dokumen_terkait WHERE dokumen_id=?').all(id);
    const dokPendukung = dokTerkaitAll.filter(d => d.tipe === 'Pendukung').map(d => ({ nomor: d.konten }));
    const dokReferensi = dokTerkaitAll.filter(d => d.tipe === 'Referensi').map(d => ({ nama: d.konten }));
    const dokPerizinan = dokTerkaitAll.filter(d => d.tipe === 'Perizinan').map(d => ({ nama: d.konten }));
    const sdm = db.prepare('SELECT * FROM ik_sdm WHERE dokumen_id=?').all(id);
    const tools = db.prepare('SELECT * FROM ik_tools WHERE dokumen_id=?').all(id);
    const material = db.prepare('SELECT * FROM ik_material WHERE dokumen_id=?').all(id);
    const formulir = db.prepare('SELECT * FROM ik_formulir WHERE dokumen_id=?').all(id);
    const risiko = db.prepare('SELECT * FROM ik_risiko WHERE dokumen_id=?').all(id);

    let changeHistory = [];
    if (steps.change_history) {
      if (Array.isArray(steps.change_history)) changeHistory = steps.change_history;
      else { try { changeHistory = JSON.parse(steps.change_history); } catch {} }
    }

    // Parse custom_sections
    let customSections = null;
    if (doc.custom_sections) { try { customSections = JSON.parse(doc.custom_sections); } catch {} }

    // Build DOCX
    const docx = buildDocx(
      { ...doc, custom_sections: customSections },
      { steps, definisi, sdm, tools, material, risiko, formulir, dokPendukung, dokReferensi, dokPerizinan, changeHistory }
    );

    const buffer = await Packer.toBuffer(docx);
    const filename = `${doc.nomor_dokumen || 'IK'}_Rev${doc.revisi || '00'}.docx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', buffer.length);
    res.send(buffer);
  } catch (err) {
    console.error('DOCX export error:', err);
    h.error(res, 'Gagal generate DOCX: ' + err.message, 500);
  }
});

module.exports = router;
