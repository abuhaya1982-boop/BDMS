// DOCX Export — Generate .docx matching PLN NP IK Template 2025
const router = require('express').Router();
const fs = require('fs');
const path = require('path');
const { getDB } = require('../db');
const h = require('../helpers');
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  ImageRun, Header, Footer, AlignmentType, PageBreak, HeadingLevel,
  LevelFormat, BorderStyle, WidthType, ShadingType, VerticalAlign,
  PageNumber, SectionType, VerticalMergeType
} = require('docx');

// ═══ CONSTANTS ═══
const A4_W = 11906, A4_H = 16838;
const MARGIN = { top: 1134, right: 1134, bottom: 1134, left: 1134 }; // ~2cm all sides
const CONTENT_W = A4_W - MARGIN.left - MARGIN.right; // 9638 DXA
const FONT = 'Arial';
const SZ = { xs: 14, sm: 16, md: 20, lg: 22, xl: 28, xxl: 36, title: 44, cover: 56 }; // half-points
const CLR = { primary: '2A7489', dark: '000000', gray: '808080', headerBg: 'D9E2F3', white: 'FFFFFF' };

// Logo
let LOGO_BUF = null;
try { LOGO_BUF = fs.readFileSync(path.join(__dirname, '..', 'assets', 'logo-pln-np.jpeg')); } catch {}

// PLN NP Risk Matrix 5x5
const RISK_MATRIX = {
  '1-1':{s:1,l:'LOW',c:'00B050'},'1-2':{s:5,l:'LOW',c:'00B050'},'1-3':{s:10,l:'LOW TO MODERATE',c:'92D050'},'1-4':{s:15,l:'MODERATE',c:'FFFF00'},'1-5':{s:20,l:'HIGH',c:'FF0000'},
  '2-1':{s:2,l:'LOW',c:'00B050'},'2-2':{s:6,l:'LOW TO MODERATE',c:'92D050'},'2-3':{s:8,l:'LOW TO MODERATE',c:'92D050'},'2-4':{s:16,l:'MODERATE TO HIGH',c:'FFC000'},'2-5':{s:21,l:'HIGH',c:'FF0000'},
  '3-1':{s:3,l:'LOW',c:'00B050'},'3-2':{s:8,l:'LOW TO MODERATE',c:'92D050'},'3-3':{s:11,l:'MODERATE',c:'FFFF00'},'3-4':{s:18,l:'MODERATE TO HIGH',c:'FFC000'},'3-5':{s:23,l:'HIGH',c:'FF0000'},
  '4-1':{s:4,l:'LOW',c:'00B050'},'4-2':{s:9,l:'LOW TO MODERATE',c:'92D050'},'4-3':{s:14,l:'MODERATE',c:'FFFF00'},'4-4':{s:19,l:'MODERATE TO HIGH',c:'FFC000'},'4-5':{s:24,l:'HIGH',c:'FF0000'},
  '5-1':{s:7,l:'LOW TO MODERATE',c:'92D050'},'5-2':{s:12,l:'MODERATE',c:'FFFF00'},'5-3':{s:17,l:'MODERATE TO HIGH',c:'FFC000'},'5-4':{s:22,l:'HIGH',c:'FF0000'},'5-5':{s:25,l:'HIGH',c:'FF0000'},
};
const rmLookup = (p, d) => RISK_MATRIX[`${p}-${d}`] || { s: '-', l: '-', c: 'CCCCCC' };

// Heat map row labels (Indonesian) matching template
const HM_ROWS = [
  { p: 5, label: 'Hampir Pasti\nTerjadi\nE' },
  { p: 4, label: 'Sangat Mungkin\nTerjadi\nD' },
  { p: 3, label: 'Bisa Terjadi\nC' },
  { p: 2, label: 'Jarang Terjadi\nB' },
  { p: 1, label: 'Sangat Jarang\nTerjadi\nA' },
];
const HM_COLS = [
  { d: 1, label: 'Sangat\nRendah\n1' },
  { d: 2, label: 'Rendah\n2' },
  { d: 3, label: 'Moderat\n3' },
  { d: 4, label: 'Tinggi\n4' },
  { d: 5, label: 'Sangat Tinggi\n5' },
];

// ═══ BORDERS ═══
const border = { style: BorderStyle.SINGLE, size: 1, color: CLR.dark };
const borders = { top: border, bottom: border, left: border, right: border };
const noBorders = { top: { style: BorderStyle.NONE, size: 0 }, bottom: { style: BorderStyle.NONE, size: 0 }, left: { style: BorderStyle.NONE, size: 0 }, right: { style: BorderStyle.NONE, size: 0 } };

// ═══ HELPER: table cell ═══
function cell(text, opts = {}) {
  const { width, bold, align, shade, font, size, span, vAlign, children, noBorder, vMerge, vMergeRestart } = opts;
  const cellOpts = {
    borders: noBorder ? noBorders : borders,
    margins: { top: 40, bottom: 40, left: 80, right: 80 },
  };
  if (width) cellOpts.width = { size: width, type: WidthType.DXA };
  if (shade) cellOpts.shading = { fill: shade, type: ShadingType.CLEAR, color: 'auto' };
  if (span) cellOpts.columnSpan = span;
  if (vAlign) cellOpts.verticalAlign = vAlign;
  if (vMerge) cellOpts.verticalMerge = VerticalMergeType.CONTINUE;
  if (vMergeRestart) cellOpts.verticalMerge = VerticalMergeType.RESTART;

  if (children) {
    cellOpts.children = children;
  } else {
    cellOpts.children = [new Paragraph({
      alignment: align || AlignmentType.LEFT,
      spacing: { after: 0 },
      children: [new TextRun({
        text: String(text ?? ''),
        bold: bold || false,
        font: font || FONT,
        size: size || SZ.md,
      })],
    })];
  }
  return new TableCell(cellOpts);
}

// ═══ HELPER: header cell (bold, centered, shaded) ═══
function hCell(text, opts = {}) {
  return cell(text, { bold: true, align: AlignmentType.CENTER, shade: CLR.headerBg, size: SZ.sm, ...opts });
}

// ═══ HELPER: multiline cell content ═══
function multiLineParagraphs(text, opts = {}) {
  const { bold, font, size, align, color } = opts;
  return String(text).split('\n').map(line =>
    new Paragraph({
      alignment: align || AlignmentType.CENTER,
      spacing: { after: 0 },
      children: [new TextRun({ text: line, bold: bold || false, font: font || FONT, size: size || SZ.sm, color: color })],
    })
  );
}

// ═══ HELPER: convert HTML to paragraphs (justified) ═══
function htmlToParagraphs(html) {
  if (!html) return [new Paragraph({ children: [new TextRun({ text: '-', font: FONT, size: SZ.md, color: CLR.gray })] })];
  const text = String(html)
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n').replace(/<\/div>/gi, '\n').replace(/<\/li>/gi, '\n')
    .replace(/<li[^>]*>/gi, '• ')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#x2019;/g, "'").replace(/&nbsp;/g, ' ')
    .trim();
  if (!text) return [new Paragraph({ children: [new TextRun({ text: '-', font: FONT, size: SZ.md, color: CLR.gray })] })];
  return text.split('\n').filter(l => l.trim()).map(line =>
    new Paragraph({
      alignment: AlignmentType.JUSTIFIED,
      spacing: { after: 80 },
      children: [new TextRun({ text: line.trim(), font: FONT, size: SZ.md })],
    })
  );
}

function fmtDate(d) {
  if (!d) return '-';
  try { return new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' }); }
  catch { return d; }
}

// ═══════════════════════════════════════════
//  BUILD IMS HEADER TABLE (template-accurate)
//  4 cols: Logo | Company+IK Title | Label | Value
//  Grid: 1857, 3808, 1418, 2126 = 9209 (template)
//  Scaled to CONTENT_W
// ═══════════════════════════════════════════
function makeHeaderTable(nom, judul, rev, tglTerbit) {
  const scale = CONTENT_W / 9209;
  const c1 = Math.round(1857 * scale);
  const c2 = Math.round(3808 * scale);
  const c3 = Math.round(1418 * scale);
  const c4 = CONTENT_W - c1 - c2 - c3;

  const labelStyle = { size: SZ.sm, font: FONT };
  const valStyle = { size: SZ.sm, font: FONT };

  // Logo cell (spans 4 rows via vMerge)
  const logoCellFirst = new TableCell({
    borders,
    verticalMerge: VerticalMergeType.RESTART,
    verticalAlign: VerticalAlign.CENTER,
    width: { size: c1, type: WidthType.DXA },
    margins: { top: 40, bottom: 40, left: 40, right: 40 },
    children: LOGO_BUF ? [new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new ImageRun({
        type: 'jpg',
        data: LOGO_BUF,
        transformation: { width: 120, height: 63 },
        altText: { title: 'PLN NP', description: 'Logo PLN Nusantara Power', name: 'logo' },
      })],
    })] : [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'PLN NP', bold: true, font: FONT, size: SZ.sm })] })],
  });

  const logoCellCont = () => new TableCell({
    borders,
    verticalMerge: VerticalMergeType.CONTINUE,
    width: { size: c1, type: WidthType.DXA },
    children: [new Paragraph({ spacing: { after: 0 } })],
  });

  // Row 1: Logo | "PT PLN NUSANTARA POWER" | Nomor Dokumen | : IKXX-XXX
  const row1 = new TableRow({ children: [
    logoCellFirst,
    new TableCell({
      borders,
      width: { size: c2, type: WidthType.DXA },
      verticalAlign: VerticalAlign.BOTTOM,
      children: [new Paragraph({
        alignment: AlignmentType.CENTER, spacing: { after: 0 },
        children: [new TextRun({ text: 'PT PLN NUSANTARA POWER', bold: true, font: FONT, size: SZ.sm })],
      })],
    }),
    new TableCell({
      borders: { ...borders, right: { style: BorderStyle.NONE, size: 0 } },
      width: { size: c3, type: WidthType.DXA },
      verticalAlign: VerticalAlign.BOTTOM,
      margins: { top: 20, bottom: 20, left: 60, right: 0 },
      children: [new Paragraph({ spacing: { after: 0 }, children: [new TextRun({ text: 'Nomor Dokumen', ...labelStyle })] })],
    }),
    new TableCell({
      borders: { ...borders, left: { style: BorderStyle.NONE, size: 0 } },
      width: { size: c4, type: WidthType.DXA },
      verticalAlign: VerticalAlign.BOTTOM,
      margins: { top: 20, bottom: 20, left: 60, right: 40 },
      children: [new Paragraph({ spacing: { after: 0 }, children: [new TextRun({ text: ': ' + nom, ...valStyle })] })],
    }),
  ]});

  // Row 2: Logo(cont) | "PJB INTEGRATED MANAGEMENT SYSTEM" | Revisi | : 00
  const row2 = new TableRow({ children: [
    logoCellCont(),
    new TableCell({
      borders,
      width: { size: c2, type: WidthType.DXA },
      verticalAlign: VerticalAlign.BOTTOM,
      children: [new Paragraph({
        alignment: AlignmentType.CENTER, spacing: { after: 0 },
        children: [new TextRun({ text: 'PLN NP INTEGRATED MANAGEMENT SYSTEM', bold: true, font: FONT, size: SZ.sm })],
      })],
    }),
    new TableCell({
      borders: { ...borders, right: { style: BorderStyle.NONE, size: 0 } },
      width: { size: c3, type: WidthType.DXA },
      verticalAlign: VerticalAlign.BOTTOM,
      margins: { top: 20, bottom: 20, left: 60, right: 0 },
      children: [new Paragraph({ spacing: { after: 0 }, children: [new TextRun({ text: 'Revisi', ...labelStyle })] })],
    }),
    new TableCell({
      borders: { ...borders, left: { style: BorderStyle.NONE, size: 0 } },
      width: { size: c4, type: WidthType.DXA },
      verticalAlign: VerticalAlign.BOTTOM,
      margins: { top: 20, bottom: 20, left: 60, right: 40 },
      children: [new Paragraph({ spacing: { after: 0 }, children: [new TextRun({ text: ': ' + rev, ...valStyle })] })],
    }),
  ]});

  // Row 3: Logo(cont) | "INSTRUKSI KERJA judul" (vMerge start) | Tanggal Terbit | : date
  const row3 = new TableRow({ children: [
    logoCellCont(),
    new TableCell({
      borders,
      verticalMerge: VerticalMergeType.RESTART,
      width: { size: c2, type: WidthType.DXA },
      verticalAlign: VerticalAlign.CENTER,
      children: [
        new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 0 }, children: [
          new TextRun({ text: 'INSTRUKSI KERJA', bold: true, font: FONT, size: 18 }),
        ]}),
        new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 0 }, children: [
          new TextRun({ text: judul.toUpperCase(), bold: true, font: FONT, size: 18, color: CLR.primary }),
        ]}),
      ],
    }),
    new TableCell({
      borders: { ...borders, right: { style: BorderStyle.NONE, size: 0 } },
      width: { size: c3, type: WidthType.DXA },
      verticalAlign: VerticalAlign.BOTTOM,
      margins: { top: 20, bottom: 20, left: 60, right: 0 },
      children: [new Paragraph({ spacing: { after: 0 }, children: [new TextRun({ text: 'Tanggal Terbit', ...labelStyle })] })],
    }),
    new TableCell({
      borders: { ...borders, left: { style: BorderStyle.NONE, size: 0 } },
      width: { size: c4, type: WidthType.DXA },
      verticalAlign: VerticalAlign.BOTTOM,
      margins: { top: 20, bottom: 20, left: 60, right: 40 },
      children: [new Paragraph({ spacing: { after: 0 }, children: [new TextRun({ text: ': ' + fmtDate(tglTerbit), ...valStyle })] })],
    }),
  ]});

  // Row 4: Logo(cont) | IK title (cont) | Halaman | : PAGE of NUMPAGES
  const row4 = new TableRow({ children: [
    logoCellCont(),
    new TableCell({
      borders,
      verticalMerge: VerticalMergeType.CONTINUE,
      width: { size: c2, type: WidthType.DXA },
      children: [new Paragraph({ spacing: { after: 0 } })],
    }),
    new TableCell({
      borders: { ...borders, right: { style: BorderStyle.NONE, size: 0 } },
      width: { size: c3, type: WidthType.DXA },
      verticalAlign: VerticalAlign.BOTTOM,
      margins: { top: 20, bottom: 20, left: 60, right: 0 },
      children: [new Paragraph({ spacing: { after: 0 }, children: [new TextRun({ text: 'Halaman', ...labelStyle })] })],
    }),
    new TableCell({
      borders: { ...borders, left: { style: BorderStyle.NONE, size: 0 } },
      width: { size: c4, type: WidthType.DXA },
      verticalAlign: VerticalAlign.BOTTOM,
      margins: { top: 20, bottom: 20, left: 60, right: 40 },
      children: [new Paragraph({ spacing: { after: 0 }, children: [
        new TextRun({ text: ': ', ...valStyle }),
        new TextRun({ children: [PageNumber.CURRENT], ...valStyle }),
        new TextRun({ text: ' dari ', ...valStyle }),
        new TextRun({ children: [PageNumber.TOTAL_PAGES], ...valStyle }),
      ]})],
    }),
  ]});

  return new Table({
    width: { size: CONTENT_W, type: WidthType.DXA },
    columnWidths: [c1, c2, c3, c4],
    rows: [row1, row2, row3, row4],
  });
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
    page: { size: { width: A4_W, height: A4_H }, margin: MARGIN },
  };

  // ═══════════════════════════════════
  //  SECTION 1: COVER PAGE (vertically centered)
  // ═══════════════════════════════════
  const sigColW = Math.floor(CONTENT_W / 3);
  const sigCol3 = CONTENT_W - 2 * sigColW;

  const coverChildren = [];

  // Logo at top
  if (LOGO_BUF) {
    coverChildren.push(new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
      children: [new ImageRun({
        type: 'jpg', data: LOGO_BUF,
        transformation: { width: 220, height: 116 },
        altText: { title: 'PLN NP', description: 'Logo PLN Nusantara Power', name: 'logo-cover' },
      })],
    }));
  }

  // Spacer to push content toward vertical center
  coverChildren.push(new Paragraph({ spacing: { before: 1600 } }));

  // Title lines
  coverChildren.push(new Paragraph({
    alignment: AlignmentType.CENTER, spacing: { after: 80 },
    children: [new TextRun({ text: 'INSTRUKSI KERJA (IK)', bold: true, font: FONT, size: SZ.cover })],
  }));
  coverChildren.push(new Paragraph({
    alignment: AlignmentType.CENTER, spacing: { after: 600 },
    children: [new TextRun({ text: 'PT PLN NUSANTARA POWER', bold: true, font: FONT, size: SZ.cover })],
  }));

  // Document title (teal color like template)
  coverChildren.push(new Paragraph({
    alignment: AlignmentType.CENTER, spacing: { before: 200, after: 120 },
    children: [new TextRun({ text: judul.toUpperCase(), bold: true, font: FONT, size: SZ.title, color: CLR.primary })],
  }));

  // Separator line
  coverChildren.push(new Paragraph({
    alignment: AlignmentType.CENTER, spacing: { after: 600 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 3, color: CLR.primary, space: 8 } },
    children: [new TextRun({ text: '', font: FONT, size: 4 })],
  }));

  // Metadata table (no borders)
  coverChildren.push(new Table({
    width: { size: 6000, type: WidthType.DXA },
    columnWidths: [2800, 400, 2800],
    rows: [
      ['NO. DOKUMEN', nom],
      ['TANGGAL DITETAPKAN', fmtDate(doc.tanggal_ditetapkan)],
      ['TANGGAL DIPERBARUI', fmtDate(doc.tanggal_diperbarui || doc.updated_at)],
      ['REVISI', rev],
    ].map(([label, val]) => new TableRow({ children: [
      cell(label, { width: 2800, bold: true, size: SZ.lg, noBorder: true }),
      cell(':', { width: 400, bold: true, size: SZ.lg, align: AlignmentType.CENTER, noBorder: true }),
      cell(val, { width: 2800, size: SZ.lg, noBorder: true }),
    ]})),
  }));

  coverChildren.push(new Paragraph({ spacing: { before: 600 } }));

  // Signature table
  function sigBlock(title, name, jabatan) {
    return [
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 80, after: 0 }, children: [new TextRun({ text: title, bold: true, font: FONT, size: SZ.md })] }),
      new Paragraph({ spacing: { before: 1000, after: 0 } }),
      new Paragraph({
        alignment: AlignmentType.CENTER, spacing: { after: 40 },
        border: { bottom: { style: BorderStyle.SINGLE, size: 1, color: CLR.dark } },
        children: [new TextRun({ text: name, bold: true, font: FONT, size: SZ.md })],
      }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 0 }, children: [new TextRun({ text: jabatan, font: FONT, size: SZ.xs, color: CLR.gray })] }),
    ];
  }

  coverChildren.push(new Table({
    width: { size: CONTENT_W, type: WidthType.DXA },
    columnWidths: [sigColW, sigColW, sigCol3],
    rows: [
      new TableRow({ children: [
        hCell('Disusun oleh', { width: sigColW, size: SZ.sm }),
        hCell('Disetujui oleh', { width: sigColW, size: SZ.sm }),
        hCell('Disahkan oleh', { width: sigCol3, size: SZ.sm }),
      ]}),
      new TableRow({ children: [
        cell('', { width: sigColW, children: sigBlock('Disusun,', penyusunNama, penyusunJab) }),
        cell('', { width: sigColW, children: sigBlock('Disetujui,', approverNama, 'Manager Sub-bidang') }),
        cell('', { width: sigCol3, children: sigBlock('Disahkan,', pengesahanNama, 'Senior Manager') }),
      ]}),
    ],
  }));

  // ═══════════════════════════════════
  //  SECTION 2: CHANGE HISTORY
  // ═══════════════════════════════════
  const chColW = [500, 2000, 4638, 800, 1700];
  const historyRows = (changeHistory && changeHistory.length)
    ? changeHistory.map((r, i) => new TableRow({ children: [
        cell(String(i + 1) + '.', { width: chColW[0], align: AlignmentType.CENTER, size: SZ.sm }),
        cell(r.halaman || '', { width: chColW[1], size: SZ.sm }),
        cell(r.uraian || '', { width: chColW[2], size: SZ.sm }),
        cell(r.revisi || '', { width: chColW[3], align: AlignmentType.CENTER, size: SZ.sm }),
        cell(r.tanggal || '', { width: chColW[4], align: AlignmentType.CENTER, size: SZ.sm }),
      ] }))
    : [new TableRow({ children: [
        cell('1.', { width: chColW[0], align: AlignmentType.CENTER, size: SZ.sm }),
        cell('Seluruh halaman', { width: chColW[1], size: SZ.sm }),
        cell('Dokumen baru — revisi awal', { width: chColW[2], size: SZ.sm }),
        cell('00', { width: chColW[3], align: AlignmentType.CENTER, size: SZ.sm }),
        cell(fmtDate(doc.tanggal_ditetapkan), { width: chColW[4], align: AlignmentType.CENTER, size: SZ.sm }),
      ] })];

  const changeHistoryChildren = [
    makeHeaderTable(nom, judul, rev, doc.tanggal_terbit),
    new Paragraph({ spacing: { before: 300 } }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 200 }, children: [
      new TextRun({ text: 'DAFTAR PERUBAHAN DOKUMEN', bold: true, font: FONT, size: SZ.lg }),
    ]}),
    new Table({
      width: { size: CONTENT_W, type: WidthType.DXA },
      columnWidths: chColW,
      rows: [
        new TableRow({ children: [
          hCell('No', { width: chColW[0] }), hCell('Halaman', { width: chColW[1] }),
          hCell('Uraian Perubahan', { width: chColW[2] }),
          hCell('Revisi ke-', { width: chColW[3] }), hCell('Tanggal', { width: chColW[4] }),
        ]}),
        ...historyRows,
      ],
    }),
  ];

  // ═══════════════════════════════════
  //  SECTION 3: CONTENT PAGES
  // ═══════════════════════════════════
  const contentChildren = [
    makeHeaderTable(nom, judul, rev, doc.tanggal_terbit),
    new Paragraph({ spacing: { before: 200 } }),
  ];
  let secNum = 1;

  function addSectionTitle(label) {
    contentChildren.push(new Paragraph({
      spacing: { before: 280, after: 120 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 2, color: CLR.primary, space: 4 } },
      children: [new TextRun({ text: `${secNum}. ${label}`, bold: true, font: FONT, size: SZ.lg, color: CLR.primary })],
    }));
  }

  function addSubTitle(label) {
    contentChildren.push(new Paragraph({
      spacing: { before: 180, after: 80 },
      children: [new TextRun({ text: label, bold: true, font: FONT, size: SZ.md })],
    }));
  }

  // Generic table builder
  function addTable(dataArr, columns, colWidths) {
    if (!dataArr || !dataArr.length) return;
    const colKeys = columns.map(c => c.toLowerCase().replace(/[\s\/]/g, '_'));
    const skipKeys = new Set(['id', 'dokumen_id', 'tipe']);
    const noWidth = Math.floor(CONTENT_W * 0.06);
    const remaining = CONTENT_W - noWidth;
    const widths = colWidths || columns.map(() => Math.floor(remaining / columns.length));

    const headerRow = new TableRow({ children: [
      hCell('No', { width: noWidth }),
      ...columns.map((c, i) => hCell(c, { width: widths[i] })),
    ]});
    const dataRows = dataArr.map((r, idx) => {
      const cells = [cell(String(idx + 1), { width: noWidth, align: AlignmentType.CENTER, size: SZ.sm })];
      columns.forEach((c, ci) => {
        let val = '';
        if (typeof r === 'object' && r !== null) {
          val = r[colKeys[ci]] ?? r[c] ?? '';
          if (!val && val !== 0) {
            const dataKeys = Object.keys(r).filter(k => !skipKeys.has(k));
            val = (ci < dataKeys.length) ? r[dataKeys[ci]] : '';
          }
        } else val = r;
        cells.push(cell(String(val ?? ''), { width: widths[ci], size: SZ.sm }));
      });
      return new TableRow({ children: cells });
    });

    contentChildren.push(new Table({
      width: { size: CONTENT_W, type: WidthType.DXA },
      columnWidths: [noWidth, ...widths],
      rows: [headerRow, ...dataRows],
    }));
  }

  // ═══ RISK SECTION (inherent + residual + heat map) ═══
  function addRiskSection() {
    if (!risiko || !risiko.length) return;
    addSectionTitle('Identifikasi Risiko');

    // Inherent Risk Table
    addSubTitle('Identifikasi Risiko (Inherent)');
    const iW = [480, 2200, 1800, 800, 800, 700, 2858];
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
            cell(String(i + 1), { width: iW[0], align: AlignmentType.CENTER, size: SZ.sm }),
            cell(r.risiko || '', { width: iW[1], size: SZ.sm }),
            cell(r.penyebab || '', { width: iW[2], size: SZ.sm }),
            cell(String(p || '-'), { width: iW[3], align: AlignmentType.CENTER, size: SZ.sm }),
            cell(String(d2 || '-'), { width: iW[4], align: AlignmentType.CENTER, size: SZ.sm }),
            cell(String(rm.s), { width: iW[5], align: AlignmentType.CENTER, bold: true, shade: rm.c, size: SZ.md }),
            cell(rm.l, { width: iW[6], align: AlignmentType.CENTER, bold: true, shade: rm.c, size: SZ.xs }),
          ]});
        }),
      ],
    }));

    contentChildren.push(new Paragraph({ spacing: { before: 200 } }));

    // Residual Risk Table
    addSubTitle('Perlakuan Risiko (Residual / Targeted)');
    const rW = [480, 2200, 1800, 800, 800, 700, 2858];
    contentChildren.push(new Table({
      width: { size: CONTENT_W, type: WidthType.DXA },
      columnWidths: rW,
      rows: [
        new TableRow({ children: [
          hCell('No', { width: rW[0] }), hCell('Kontrol', { width: rW[1] }), hCell('Mitigasi', { width: rW[2] }),
          hCell('Prob.', { width: rW[3] }), hCell('Dampak', { width: rW[4] }),
          hCell('Skor', { width: rW[5] }), hCell('Level Residual', { width: rW[6] }),
        ]}),
        ...risiko.map((r, i) => {
          const rp = parseInt(r.residual_kemungkinan) || 0, rd = parseInt(r.residual_dampak) || 0;
          const rm = rmLookup(rp, rd);
          return new TableRow({ children: [
            cell(String(i + 1), { width: rW[0], align: AlignmentType.CENTER, size: SZ.sm }),
            cell(r.kontrol_existing || '', { width: rW[1], size: SZ.sm }),
            cell(r.mitigasi || '-', { width: rW[2], size: SZ.sm }),
            cell(String(rp || '-'), { width: rW[3], align: AlignmentType.CENTER, size: SZ.sm }),
            cell(String(rd || '-'), { width: rW[4], align: AlignmentType.CENTER, size: SZ.sm }),
            cell(String(rm.s), { width: rW[5], align: AlignmentType.CENTER, bold: true, shade: rm.c, size: SZ.md }),
            cell(rm.l, { width: rW[6], align: AlignmentType.CENTER, bold: true, shade: rm.c, size: SZ.xs }),
          ]});
        }),
      ],
    }));

    contentChildren.push(new Paragraph({ spacing: { before: 200 } }));

    // 5×5 Heat Map (matching template image3.jpeg layout)
    addSubTitle('Heat Map Risiko');
    const hmLabelW = Math.floor(CONTENT_W * 0.18);
    const hmCellW = Math.floor((CONTENT_W - hmLabelW) / 5);
    const hmLastW = CONTENT_W - hmLabelW - 4 * hmCellW;
    const hmColWidths = [hmLabelW, hmCellW, hmCellW, hmCellW, hmCellW, hmLastW];

    // Header: Probabilitas label + Dampak column headers
    const hmHeaderRow = new TableRow({ children: [
      cell('', { width: hmLabelW, shade: 'F2F2F2', noBorder: false, children: [
        new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 0 }, children: [
          new TextRun({ text: 'Probabilitas', bold: true, font: FONT, size: SZ.xs, color: CLR.dark }),
        ]}),
      ]}),
      ...[0,1,2,3,4].map((di, idx) => {
        const col = HM_COLS[di];
        const w = idx < 4 ? hmCellW : hmLastW;
        return cell('', { width: w, shade: 'F2F2F2', children: multiLineParagraphs(col.label, { bold: true, size: SZ.xs }) });
      }),
    ]});

    const hmDataRows = HM_ROWS.map(row => {
      return new TableRow({ children: [
        cell('', { width: hmLabelW, shade: 'F2F2F2', children: multiLineParagraphs(row.label, { bold: true, size: SZ.xs }) }),
        ...[1,2,3,4,5].map((d, idx) => {
          const rm = rmLookup(row.p, d);
          const w = idx < 4 ? hmCellW : hmLastW;
          return cell(String(rm.s), { width: w, align: AlignmentType.CENTER, bold: true, shade: rm.c, size: SZ.xl, vAlign: VerticalAlign.CENTER });
        }),
      ]});
    });

    // Dampak label row at bottom
    const hmFooterRow = new TableRow({ children: [
      cell('', { width: hmLabelW, shade: 'F2F2F2', children: [new Paragraph({ spacing: { after: 0 } })] }),
      cell('Dampak', { width: CONTENT_W - hmLabelW, span: 5, bold: true, align: AlignmentType.CENTER, shade: 'F2F2F2', size: SZ.sm }),
    ]});

    // Legend row
    const legendColors = [
      { label: 'Low', c: '00B050' }, { label: 'Low to Moderate', c: '92D050' },
      { label: 'Moderate', c: 'FFFF00' }, { label: 'Moderate to High', c: 'FFC000' },
      { label: 'High', c: 'FF0000' },
    ];

    contentChildren.push(new Table({
      width: { size: CONTENT_W, type: WidthType.DXA },
      columnWidths: hmColWidths,
      rows: [hmHeaderRow, ...hmDataRows, hmFooterRow],
    }));

    // Legend as separate small table
    contentChildren.push(new Paragraph({ spacing: { before: 80 } }));
    const legCellW = Math.floor(CONTENT_W / legendColors.length);
    contentChildren.push(new Table({
      width: { size: CONTENT_W, type: WidthType.DXA },
      columnWidths: legendColors.map(() => legCellW),
      rows: [new TableRow({ children: legendColors.map(lc =>
        cell(lc.label, { width: legCellW, align: AlignmentType.CENTER, shade: lc.c, bold: true, size: SZ.xs })
      )})],
    }));

    secNum++;
  }

  // Collect aktivitas sections
  const aktivitasSections = tplSections.filter(s => s.id.startsWith('aktivitas_'));
  let aktivitasRendered = false;

  // Render all sections in template order
  for (const sec of tplSections) {
    if (sec.id === 'change_history') continue;

    // Aktivitas: grouped block
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
        else contentChildren.push(new Paragraph({ children: [new TextRun({ text: '-', font: FONT, size: SZ.md, color: CLR.gray })] }));
        secNum++;
        break;
      }
      case 'dokumen_terkait': {
        addSectionTitle(sec.label);
        const bulletItem = (text) => new Paragraph({
          spacing: { after: 40 },
          indent: { left: 360 },
          children: [new TextRun({ text: '• ' + text, font: FONT, size: SZ.md })],
        });
        if (dokPendukung.length) {
          addSubTitle('A.1 Dokumen Pendukung');
          dokPendukung.forEach(d => contentChildren.push(bulletItem(d.nomor || d.nama || d.konten || '')));
        }
        if (dokReferensi.length) {
          addSubTitle('A.2 Dokumen Referensi');
          dokReferensi.forEach(d => contentChildren.push(bulletItem(d.nama || d.konten || '')));
        }
        if (dokPerizinan.length) {
          addSubTitle('A.3 Dokumen Perizinan');
          dokPerizinan.forEach(d => contentChildren.push(bulletItem(d.nama || d.konten || '')));
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
      new TextRun({ text: `Brantas DMS v3.0 — PT PLN Nusantara Power UP Brantas — ${nom} Rev.${rev}`, font: FONT, size: SZ.xs, color: CLR.gray }),
    ],
  }));

  // ═══ ASSEMBLE DOCUMENT ═══
  return new Document({
    styles: {
      default: { document: { run: { font: FONT, size: SZ.md } } },
    },
    sections: [
      // Cover page — verticalAlign CENTER
      {
        properties: {
          ...pageProps,
          verticalAlign: VerticalAlign.CENTER,
        },
        children: coverChildren,
      },
      // Change history
      {
        properties: { ...pageProps, type: SectionType.NEXT_PAGE },
        children: changeHistoryChildren,
      },
      // Content pages
      {
        properties: { ...pageProps, type: SectionType.NEXT_PAGE },
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
