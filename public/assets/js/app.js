// Brantas DMS — Core Application

// ─── PERMISSION HELPER ──────────────────────────
function _hasPermission(kode) {
  if (!APP.user) return false;
  if (APP.user.role === 'Super Admin' || APP.user.original_role === 'Super Admin') return true;
  const perms = APP.user.permissions || [];
  return perms.some(p => p.kode === kode);
}

// ─── LOGIN ───────────────────────────────────────
async function doLogin() {
  const nid = document.getElementById('loginNid').value.trim().toUpperCase();
  const password = document.getElementById('loginPassword').value;
  const errEl = document.getElementById('loginError');
  const btn = document.querySelector('.btn-login');
  btn.disabled = true;
    btn.innerHTML = `${icon('loader-2', 16)} Memproses...`;

  try {
    const res = await API.login(nid, password);
    APP.user = res.data;
    APP.loggedIn = true;
    document.getElementById('loginPage').style.display = 'none';
    document.getElementById('mainApp').style.display = 'flex';
    document.getElementById('sbAvatar').textContent = getInitials(APP.user.nama);
    document.getElementById('sbName').textContent = APP.user.nama;
    document.getElementById('sbRole').textContent = `${APP.user.role} · UP Brantas`;

    if (res.data.password_change_required) {
      showToast('Silakan ganti password Anda untuk keamanan', 'warning');
      openChangePasswordModal();
    }

    initApp();
    showToast('Selamat datang, ' + APP.user.nama.split(' ')[0] + '!', 'success');
  } catch (e) {
    let msg = e.message;
    if (msg.includes('setup_required') || msg.includes('belum diinisialisasi') || msg.includes('no such table')) {
      msg = 'Database belum diinisialisasi. Buka /setup.php terlebih dahulu.';
    }
    errEl.textContent = msg;
    errEl.style.display = 'block';
  } finally {
    btn.disabled = false;
    btn.innerHTML = `${icon('log-in', 16)} Masuk ke Sistem`;
  }
}

function getInitials(name) {
  if (!name) return '?';
  const parts = name.split(' ');
  return (parts[0][0] + (parts[1] ? parts[1][0] : '')).toUpperCase();
}

async function doLogout() {
  try { await API.logout(); } catch (e) { /* ignore */ }
  APP.loggedIn = false;
  APP.user = null;
  document.getElementById('loginPage').style.display = 'grid';
  document.getElementById('mainApp').style.display = 'none';
  const adminNav = document.getElementById('adminNavSection');
  if (adminNav) adminNav.style.display = 'none';
}

// ─── FORGOT PASSWORD ────────────────────────────
function openForgotPassword() {
  openGenericModal(
    `${icon('lock', 18)} Lupa Password`,
    `
    <div style="margin-bottom:12px;font-size:13px;color:var(--text-secondary)">Masukkan email Anda untuk menerima link reset password.</div>
    <div class="form-group">
      <label class="form-label">Email</label>
      <input type="email" class="form-control" id="fp-email" placeholder="user@plnnp.co.id" autocomplete="email">
    </div>
    <div id="fp-error" style="color:var(--danger);font-size:12px;margin-top:8px;display:none"></div>
    <div id="fp-success" style="color:var(--success);font-size:12px;margin-top:8px;display:none"></div>
    `,
    `<button class="btn btn-secondary" onclick="closeModal('modalGeneric')">Tutup</button>
     <button class="btn btn-primary" onclick="doForgotPassword()">${icon('send', 14)} Kirim Link Reset</button>`
  );
  renderIcons();
}

async function doForgotPassword() {
  const email = document.getElementById('fp-email')?.value.trim();
  const errEl = document.getElementById('fp-error');
  const successEl = document.getElementById('fp-success');
  const btn = document.querySelector('#modalGenericFooter .btn-primary');
  if (!email) { errEl.textContent = 'Email wajib diisi'; errEl.style.display = 'block'; return; }
  errEl.style.display = 'none'; successEl.style.display = 'none';
  btn.disabled = true; btn.innerHTML = `${icon('loader-2', 14)} Mengirim...`;
  try {
    const res = await API.forgotPassword(email);
    successEl.innerHTML = `${icon('check-circle', 14)} ${res.message}<br><small style="display:block;margin-top:4px;word-break:break-all">${res.data?.reset_url || ''}</small>`;
    successEl.style.display = 'block';
    btn.style.display = 'none';
  } catch (e) {
    errEl.textContent = e.message;
    errEl.style.display = 'block';
    btn.disabled = false; btn.innerHTML = `${icon('send', 14)} Kirim Link Reset`;
  }
}

// ═══════════════════════════════════════════════════════════════
// DOCUMENT PREVIEW & EXPORT — Format PLN Nusantara Power IMS
// Sesuai Template IK Tahun 2025
// ═══════════════════════════════════════════════════════════════

async function downloadPdf(id) { await downloadDocx(id); }

async function downloadDocx(id) {
  try {
    showToast('Mengunduh DOCX...', 'info');
    const url = API.getDokumenDocxUrl(id);
    const resp = await fetch(url);
    if (!resp.ok) {
      const errJson = await resp.json().catch(() => null);
      throw new Error(errJson?.message || `HTTP ${resp.status}`);
    }
    const blob = await resp.blob();
    const cd = resp.headers.get('Content-Disposition') || '';
    const fnMatch = cd.match(/filename="?([^"]+)"?/);
    const filename = fnMatch ? fnMatch[1] : `IK_${id}.docx`;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
    showToast('DOCX berhasil diunduh: ' + filename, 'success');
  } catch (e) {
    console.error('downloadDocx error:', e);
    showToast('Gagal download DOCX: ' + (e.message || JSON.stringify(e)), 'error');
  }
}

// Legacy alias — kept for backward compatibility
async function previewDokumenFull(id, mode) { await downloadDocx(id); }

function escH(s) { return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function fmtDate(d) { if (!d) return '-'; try { return new Date(d).toLocaleDateString('id-ID',{day:'2-digit',month:'2-digit',year:'numeric'}); } catch { return d; } }

function generateQRCodeSVG(data, size) {
  // Use qrcode-generator library for real, scannable QR codes
  if (typeof qrcode !== 'undefined') {
    try {
      const qr = qrcode(0, 'M'); // Type 0 = auto-detect, Error correction M
      qr.addData(data);
      qr.make();
      const moduleCount = qr.getModuleCount();
      const cellSize = Math.max(3, Math.round((size || 120) / moduleCount));
      const svgSize = moduleCount * cellSize;
      let cells = '';
      for (let row = 0; row < moduleCount; row++) {
        for (let col = 0; col < moduleCount; col++) {
          if (qr.isDark(row, col)) {
            cells += `<rect x="${col * cellSize}" y="${row * cellSize}" width="${cellSize}" height="${cellSize}"/>`;
          }
        }
      }
      return `<svg width="${svgSize}" height="${svgSize}" viewBox="0 0 ${svgSize} ${svgSize}" xmlns="http://www.w3.org/2000/svg"><rect width="${svgSize}" height="${svgSize}" fill="#fff" rx="4"/><g fill="#000">${cells}</g></svg>`;
    } catch (e) {
      console.warn('QR generation failed, using fallback:', e);
    }
  }
  // Fallback: simple placeholder if library not loaded
  return `<svg width="90" height="90" viewBox="0 0 90 90" xmlns="http://www.w3.org/2000/svg"><rect width="90" height="90" fill="#f5f5f5" rx="4" stroke="#ccc"/><text x="45" y="48" text-anchor="middle" font-size="8" fill="#999">QR Code</text></svg>`;
}

// ── Heat Map Risk 5x5 builder — PLN NP Standard RISK_MATRIX ──
function buildHeatMapHtml(risiko) {
  // PLN NP Risk Matrix — exact same data as RISK_MATRIX in buat-ik.js
  const RM_CELLS = {
    '1-1':{score:1,level:'LOW',color:'#00B050'},'1-2':{score:5,level:'LOW',color:'#00B050'},
    '1-3':{score:10,level:'LOW TO MODERATE',color:'#92D050'},'1-4':{score:15,level:'MODERATE',color:'#FFFF00'},
    '1-5':{score:20,level:'HIGH',color:'#FF0000'},
    '2-1':{score:2,level:'LOW',color:'#00B050'},'2-2':{score:6,level:'LOW TO MODERATE',color:'#92D050'},
    '2-3':{score:8,level:'LOW TO MODERATE',color:'#92D050'},'2-4':{score:16,level:'MODERATE TO HIGH',color:'#FFC000'},
    '2-5':{score:21,level:'HIGH',color:'#FF0000'},
    '3-1':{score:3,level:'LOW',color:'#00B050'},'3-2':{score:8,level:'LOW TO MODERATE',color:'#92D050'},
    '3-3':{score:11,level:'MODERATE',color:'#FFFF00'},'3-4':{score:18,level:'MODERATE TO HIGH',color:'#FFC000'},
    '3-5':{score:23,level:'HIGH',color:'#FF0000'},
    '4-1':{score:4,level:'LOW',color:'#00B050'},'4-2':{score:9,level:'LOW TO MODERATE',color:'#92D050'},
    '4-3':{score:14,level:'MODERATE',color:'#FFFF00'},'4-4':{score:19,level:'MODERATE TO HIGH',color:'#FFC000'},
    '4-5':{score:24,level:'HIGH',color:'#FF0000'},
    '5-1':{score:7,level:'LOW TO MODERATE',color:'#92D050'},'5-2':{score:12,level:'MODERATE',color:'#FFFF00'},
    '5-3':{score:17,level:'MODERATE TO HIGH',color:'#FFC000'},'5-4':{score:22,level:'HIGH',color:'#FF0000'},
    '5-5':{score:25,level:'HIGH',color:'#FF0000'},
  };
  const rmGet = (p,d) => RM_CELLS[`${p}-${d}`] || {score:0,level:'-',color:'#ccc'};
  const probLabels = [
    {key:'E',val:5,label:'Hampir Pasti Terjadi'},{key:'D',val:4,label:'Sangat Mungkin Terjadi'},
    {key:'C',val:3,label:'Bisa Terjadi'},{key:'B',val:2,label:'Jarang Terjadi'},
    {key:'A',val:1,label:'Sangat Jarang Terjadi'},
  ];
  const dampakLabels = [
    {val:1,label:'Sangat Rendah'},{val:2,label:'Rendah'},{val:3,label:'Moderat'},
    {val:4,label:'Tinggi'},{val:5,label:'Sangat Tinggi'},
  ];

  // Collect inherent risk markers (black border, white bg)
  const inherentMap = {};
  // Collect residual risk markers (orange border, orange bg)
  const residualMap = {};
  risiko.forEach((r, idx) => {
    const p = parseInt(r.kemungkinan) || 0;
    const d = parseInt(r.dampak_level) || 0;
    if (p > 0 && d > 0) {
      const key = `${p}-${d}`;
      if (!inherentMap[key]) inherentMap[key] = [];
      inherentMap[key].push(idx + 1);
    }
    // Residual risk if available (new fields: residual_kemungkinan, residual_dampak)
    const rp = parseInt(r.residual_kemungkinan || r.kemungkinan_residual || 0);
    const rd = parseInt(r.residual_dampak || r.dampak_residual || 0);
    if (rp > 0 && rd > 0) {
      const rkey = `${rp}-${rd}`;
      if (!residualMap[rkey]) residualMap[rkey] = [];
      residualMap[rkey].push(idx + 1);
    }
  });

  // Build heat map table — same structure as renderRiskHeatMap() in buat-ik.js
  let h = `<table style="border-collapse:collapse;width:100%;font-family:'Inter','Plus Jakarta Sans',sans-serif;font-size:10px;table-layout:fixed">`;
  // Header row — dampak labels
  h += `<tr><td colspan="2" style="border:1px solid #ccc;background:#f5f5f5;text-align:center;font-weight:700;font-size:10px;width:110px"></td>`;
  dampakLabels.forEach(d => { h += `<td style="border:1px solid #ccc;background:#f5f5f5;text-align:center;font-weight:600;padding:4px 2px">${d.label}<br><span style="font-weight:400">${d.val}</span></td>`; });
  h += `</tr>`;
  // Probability rows (E=5 down to A=1)
  probLabels.forEach((p, i) => {
    h += `<tr>`;
    if (i === 0) h += `<td rowspan="5" style="border:1px solid #ccc;background:#f5f5f5;text-align:center;font-weight:700;writing-mode:vertical-lr;transform:rotate(180deg);padding:6px 2px;font-size:11px;width:24px">Probabilitas</td>`;
    h += `<td style="border:1px solid #ccc;background:#f5f5f5;text-align:center;font-weight:600;padding:3px;line-height:1.2;width:86px">${p.label}<br><b>${p.key}</b></td>`;
    dampakLabels.forEach(d => {
      const c = rmGet(p.val, d.val);
      const key = `${p.val}-${d.val}`;
      // Build markers
      let markers = '';
      if (inherentMap[key]) {
        markers += inherentMap[key].map(n => `<span style="display:inline-flex;align-items:center;justify-content:center;width:17px;height:17px;border:2px solid #333;border-radius:3px;background:#fff;font-size:9px;font-weight:700;color:#333">${n}</span>`).join('');
      }
      if (residualMap[key]) {
        markers += residualMap[key].map(n => `<span style="display:inline-flex;align-items:center;justify-content:center;width:17px;height:17px;border:2px solid #C2410C;border-radius:3px;background:#FB923C;font-size:9px;font-weight:700;color:#fff">${n}</span>`).join('');
      }
      h += `<td style="border:1px solid #999;background:${c.color};text-align:center;padding:4px 2px;vertical-align:middle">
        <div style="font-weight:600;font-size:8px;color:#333;opacity:0.7">${c.level}</div>
        <div style="font-weight:800;font-size:13px;color:#222">${c.score}</div>
        <div style="display:flex;gap:2px;justify-content:center;flex-wrap:wrap;margin-top:1px">${markers}</div>
      </td>`;
    });
    h += `</tr>`;
  });
  h += `<tr><td colspan="2" style="border:none"></td><td colspan="5" style="border:1px solid #ccc;background:#f5f5f5;text-align:center;font-weight:700;font-size:11px;padding:4px">Dampak</td></tr>`;
  h += `</table>`;

  // Legend
  h += `<div style="display:flex;gap:16px;margin:8px 0 12px;font-size:10px;flex-wrap:wrap;align-items:center">
    <span style="display:inline-flex;align-items:center;gap:4px"><span style="display:inline-flex;align-items:center;justify-content:center;width:17px;height:17px;border:2px solid #333;border-radius:3px;background:#fff;font-size:9px;font-weight:700;color:#333">n</span> Inherent Risk</span>
    <span style="display:inline-flex;align-items:center;gap:4px"><span style="display:inline-flex;align-items:center;justify-content:center;width:17px;height:17px;border:2px solid #C2410C;border-radius:3px;background:#FB923C;font-size:9px;font-weight:700;color:#fff">n</span> Target Residual Risk</span>
  </div>`;

  return h;
}

// ── Build the complete IK print document (multi-page, PLN NP format) ──
function buildPrintableDoc(d, ctx) {
  const { unit, probis, owner, gdrivePath, qrSvg, steps, konten, logoB64 } = ctx;
  const definisi = d.definisi || konten.definisi || [];
  const sdm = d.sdm || konten.sdm || [];
  const tools = d.tools || konten.tools || [];
  const material = d.material || konten.material || [];
  const risiko = d.risiko || konten.risiko || [];
  const dokPendukung = d.dokumen_pendukung || konten.dokumen_pendukung || [];
  const dokReferensi = d.dokumen_referensi || konten.dokumen_referensi || [];
  const dokPerizinan = d.dokumen_perizinan || konten.dokumen_perizinan || [];
  const changeHistory = d.change_history || konten.change_history || [];
  const nom = escH(d.nomor_dokumen);
  const judul = escH(d.judul);
  const rev = escH(d.revisi || '00');
  const tglTerbit = fmtDate(d.tanggal_terbit);
  const penyusunNama = escH(d.penyusun_nama || owner || '-');
  const penyusunJab = escH(d.penyusun_jabatan || '');

  // ── CSS ──
  const css = `
@page{size:A4;margin:15mm 15mm 20mm 15mm}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Courier Prime','JetBrains Mono','IBM Plex Mono','Source Code Pro',monospace;font-size:10pt;line-height:1.7;color:#1a1a1a;background:#e2e8f0;font-weight:300;-webkit-font-smoothing:antialiased;letter-spacing:0.005em}
.toolbar{position:fixed;top:0;left:0;right:0;background:#1a1f2e;color:#fff;padding:6px 16px;display:flex;align-items:center;gap:10px;z-index:9999;font-size:12px;box-shadow:0 2px 8px rgba(0,0,0,.3)}
.toolbar button{background:#2563EB;color:#fff;border:none;padding:5px 12px;border-radius:4px;font-size:11px;cursor:pointer;font-weight:600}
.toolbar button:hover{background:#1d4ed8}
.toolbar .btn-green{background:#16a34a}
.toolbar .btn-green:hover{background:#15803d}
.toolbar .spacer{flex:1}
.toolbar .info{font-size:10px;color:#94a3b8;max-width:350px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}

/* Pages — consistent on screen & print */
.page-container{max-width:210mm;margin:50px auto 30px}
.page{padding:20mm;position:relative;min-height:297mm;background:#fff;box-shadow:0 1px 8px rgba(0,0,0,.12);margin-bottom:40px}
.page-break{page-break-before:always}
.page-top{padding-top:15mm}

/* ── HALAMAN JUDUL (Cover) ── */
.cover{display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:297mm;padding:30mm 25mm;text-align:center;page-break-after:always}
.cover-label{font-size:16pt;font-weight:700;color:#000;letter-spacing:2px;margin-bottom:4px}
.cover-company{font-size:14pt;font-weight:700;color:#0066B3;margin-bottom:40px}
.cover-logo{margin-bottom:30px}
.cover-logo img{height:60px}
.cover-title-box{border:2px solid #000;padding:20px 40px;margin-bottom:40px;min-width:80%}
.cover-title{font-size:16pt;font-weight:700;line-height:1.3}
.cover-meta{width:70%;margin:0 auto 40px;text-align:left}
.cover-meta table{width:100%;font-size:11pt;border-collapse:collapse}
.cover-meta td{padding:6px 4px;vertical-align:top}
.cover-meta td:first-child{font-weight:700;width:180px;white-space:nowrap}
.cover-meta td:nth-child(2){width:12px;text-align:center}
.cover-meta td:last-child{font-family:inherit}

/* Signature block */
.sig-table{width:100%;border-collapse:collapse;margin-top:30px}
.sig-table td{border:1px solid #999;padding:8px 10px;text-align:center;font-size:9pt;vertical-align:top}
.sig-label{font-weight:700;font-size:10pt;margin-bottom:50px;display:block}
.sig-name{font-weight:700;border-top:1px solid #000;display:inline-block;padding-top:4px;min-width:120px;margin-top:50px}
.sig-pos{font-size:8pt;color:#555;margin-top:2px}

/* ── HEADER (halaman 2+) ── */
.ik-header{width:100%;border-collapse:collapse;border:1.5px solid #000;margin-bottom:0;font-size:9pt}
.ik-header td{border:1px solid #000;padding:4px 10px;vertical-align:middle}
.ik-header .logo-cell{width:52px;text-align:center;padding:4px 6px;border-right:1px solid #000}
.ik-header .logo-cell img{height:24px;width:auto}
.ik-header .company-cell{font-weight:700;font-size:9.5pt;text-align:center}
.ik-header .title-cell{font-weight:700;font-size:9.5pt;text-align:center}
.ik-header .label-cell{font-weight:600;width:110px;white-space:nowrap;font-size:8.5pt}
.ik-header .value-cell{font-family:inherit;font-size:9pt;min-width:140px}

/* ── CONTENT TABLES ── */
table.tbl{width:100%;border-collapse:collapse;margin:6px 0 12px;font-size:9.5pt;font-family:inherit}
table.tbl th,table.tbl td{border:1px solid #000;padding:4px 8px;vertical-align:top}
table.tbl th{background:#D9E2F3;font-weight:700;text-align:center;font-size:9pt}
table.tbl td.no{text-align:center;width:30px}

/* Sections */
.sec-title{font-size:11pt;font-weight:700;margin:16px 0 6px;padding:4px 0;border-bottom:1.5px solid #000;font-family:inherit}
.sec-num{margin-right:8px}
.sub-title{font-weight:700;font-size:10pt;margin:10px 0 4px;font-family:inherit}
p.content{margin:4px 0 10px;text-align:justify;font-size:10pt;font-family:inherit}
ul.content-list{margin:4px 0 10px 20px;font-size:10pt;font-family:inherit}
ul.content-list li{margin-bottom:2px}
ol.step-list{margin:4px 0 10px 20px;font-size:10pt;counter-reset:stp;font-family:inherit}
ol.step-list li{margin-bottom:4px;padding-left:4px}

/* Step tables */
table.step-tbl td{white-space:pre-wrap;word-wrap:break-word}
table.step-tbl ul,table.step-tbl ol{margin:2px 0 2px 16px;padding:0}
table.step-tbl li{margin-bottom:1px}
.step-meta{color:#555;font-size:8.5pt}
.sec-content{margin:4px 0 12px;font-size:10pt;overflow-wrap:break-word;word-wrap:break-word;word-break:break-word;max-width:100%;overflow:hidden}
.sec-content p,.sec-content div,.sec-content span,.sec-content li{max-width:100%!important;margin-left:0!important;margin-right:0!important;text-indent:0!important}
.sec-content ul,.sec-content ol{max-width:100%!important;margin-left:20px!important;margin-right:0!important;padding-left:0!important}
.sec-content table{max-width:100%!important;width:100%!important;table-layout:fixed}
.sec-content img{max-width:100%!important;height:auto!important}
.sec-content p.content{margin:4px 0}
.sec-content ul.content-list{margin:4px 0 8px 20px}

/* Content page wrapper — repeating header on print */
.content-wrap-table{width:100%;border-collapse:collapse;border:none}
.content-wrap-table,.content-wrap-table thead,.content-wrap-table tbody,.content-wrap-table tr,.content-thead-cell,.content-tbody-cell{border:none;padding:0;margin:0}
.content-thead-cell{padding:0 0 8px 0;vertical-align:top}
.content-tbody-cell{padding:0;vertical-align:top;overflow:hidden;word-wrap:break-word;max-width:100%}

/* QR */
.qr-block{display:flex;align-items:flex-start;gap:16px;margin:16px 0;padding:14px;border:1.5px solid #ccc;border-radius:6px;background:#fafafa}
.qr-block svg{display:block}
.qr-block .qr-text{font-size:8.5pt;color:#333}
.qr-block .qr-text strong{font-size:9pt}
.footer-line{border-top:1px solid #ccc;padding-top:6px;font-size:7.5pt;color:#888;display:flex;justify-content:space-between;margin-top:20px}

/* ═══ PRINT — make screen & print identical, NO section leaks ═══ */
@media print{
  .no-print{display:none!important}
  body{background:#fff;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  .page-container{margin:0;max-width:none}
  .page{box-shadow:none;margin:0;padding:20mm;min-height:auto}
  .page-break{page-break-before:always}
  .cover{min-height:auto;height:auto;padding:30mm 25mm;page-break-after:always}
  .page-top{padding-top:15mm}
  .content-wrap-table thead{display:table-header-group}
  .content-page{padding:15mm 20mm;min-height:auto}
  /* Prevent section titles from being orphaned at bottom of page */
  .sec-title{page-break-after:avoid;page-break-inside:avoid;break-after:avoid}
  .sub-title{page-break-after:avoid;page-break-inside:avoid;break-after:avoid}
  /* Keep section content together with its title — avoid leaks */
  .sec-content{page-break-before:avoid;break-before:avoid}
  /* Tables: keep header + first row together, allow break within body */
  table.tbl{page-break-inside:auto;break-inside:auto}
  table.tbl thead{display:table-header-group}
  table.tbl tr{page-break-inside:avoid;break-inside:avoid}
  table.tbl thead tr{page-break-after:avoid;break-after:avoid}
  /* Risk tables — keep each risk row intact */
  table.step-tbl tr{page-break-inside:avoid;break-inside:avoid}
  /* Signature block, QR, footer — never split */
  .sig-table{page-break-inside:avoid;break-inside:avoid}
  .qr-block{border-color:#000;background:#fff;page-break-inside:avoid;break-inside:avoid}
  .footer-line{page-break-inside:avoid;break-inside:avoid}
  /* Keep images from splitting across pages */
  img{page-break-inside:avoid;break-inside:avoid}
  /* Prevent widows/orphans in content paragraphs */
  p.content{orphans:3;widows:3}
  .sec-content p,.sec-content div{orphans:2;widows:2}
}
`;

  // ── COVER PAGE (no logo, uppercase title, 3 signature columns) ──
  const coverHtml = `
<div class="page cover">
  <div class="cover-label">INSTRUKSI KERJA (IK)</div>
  <div class="cover-company">PT PLN NUSANTARA POWER</div>
  <div class="cover-title-box">
    <div class="cover-title">${judul.toUpperCase()}</div>
  </div>
  <div class="cover-meta">
    <table>
      <tr><td>NO. DOKUMEN</td><td>:</td><td>${nom}</td></tr>
      <tr><td>TANGGAL DITETAPKAN</td><td>:</td><td>${fmtDate(d.tanggal_ditetapkan)}</td></tr>
      <tr><td>TANGGAL DIPERBARUI</td><td>:</td><td>${fmtDate(d.tanggal_diperbarui || d.updated_at)}</td></tr>
      <tr><td>REVISI</td><td>:</td><td>${rev}</td></tr>
    </table>
  </div>
  <table class="sig-table">
    <tr>
      <td style="width:33%;font-weight:700;background:#f0f0f0">Disusun oleh</td>
      <td style="width:34%;font-weight:700;background:#f0f0f0">Disetujui oleh</td>
      <td style="width:33%;font-weight:700;background:#f0f0f0">Disahkan oleh</td>
    </tr>
    <tr>
      <td>
        <span class="sig-label">Disusun,</span>
        ${d.ttd?.prepared?.data ? `<img src="${d.ttd.prepared.data}" style="max-height:50px;margin:4px auto;display:block">` : ''}
        <div class="sig-name">${penyusunNama}</div>
        <div class="sig-pos">${penyusunJab || 'Asst. Manager'}</div>
      </td>
      <td>
        <span class="sig-label">Disetujui,</span>
        ${d.ttd?.approved1?.data ? `<img src="${d.ttd.approved1.data}" style="max-height:50px;margin:4px auto;display:block">` : ''}
        <div class="sig-name">${escH(d.approver_nama || '........................')}</div>
        <div class="sig-pos">Manager Sub-bidang</div>
      </td>
      <td>
        <span class="sig-label">Disahkan,</span>
        ${d.ttd?.pengesahan?.data ? `<img src="${d.ttd.pengesahan.data}" style="max-height:50px;margin:4px auto;display:block">` : ''}
        <div class="sig-name">${escH(d.pengesahan_nama || '........................')}</div>
        <div class="sig-pos">Senior Manager</div>
      </td>
    </tr>
  </table>
</div>`;

  // ── HEADER TABLE (used on page 2+) ──
  const hdrTable = `<table class="ik-header">
  <tr>
    <td class="logo-cell" rowspan="3">${logoB64 ? `<img src="${logoB64}">` : 'PLN NP'}</td>
    <td class="company-cell" rowspan="2" style="width:35%">PT PLN NUSANTARA POWER<br><span style="font-size:8pt;font-weight:400">INTEGRATED MANAGEMENT SYSTEM</span></td>
    <td class="label-cell">No. Dokumen</td>
    <td class="value-cell" style="word-break:break-all">: ${nom}</td>
  </tr>
  <tr>
    <td class="label-cell">Revisi</td>
    <td class="value-cell">: ${rev}</td>
  </tr>
  <tr>
    <td class="title-cell" colspan="1">INSTRUKSI KERJA<br><span style="font-size:8.5pt">${judul.toUpperCase()}</span></td>
    <td class="label-cell">Tgl. Terbit</td>
    <td class="value-cell">: ${tglTerbit}</td>
  </tr>
</table>`;

  // ── PAGE 2: DAFTAR PERUBAHAN DOKUMEN ──
  const changeRows = changeHistory.length
    ? changeHistory.map((r,i) => `<tr><td class="no">${i+1}.</td><td>${escH(r.halaman||'')}</td><td>${escH(r.uraian||'')}</td><td class="no">${escH(r.revisi||'')}</td><td>${escH(r.tanggal||'')}</td></tr>`).join('')
    : `<tr><td class="no">1.</td><td>Seluruh halaman</td><td>Dokumen baru — revisi awal</td><td class="no">00</td><td>${fmtDate(d.tanggal_ditetapkan)}</td></tr>`;

  const page2 = `
<div class="page page-break page-top">
  ${hdrTable}
  <div class="sec-title" style="text-align:center;border-bottom:none;font-size:12pt;margin-top:16px">DAFTAR PERUBAHAN DOKUMEN</div>
  <table class="tbl">
    <thead><tr><th style="width:30px">No</th><th>Halaman</th><th>Uraian Perubahan</th><th style="width:60px">Revisi ke-</th><th style="width:90px">Tanggal</th></tr></thead>
    <tbody>${changeRows}</tbody>
  </table>
</div>`;

  // ── Helper: format rich text content (handle \n, bullets •, dashes -, HTML from rich editor) ──
  function fmtContent(text) {
    if (!text) return '<span style="color:#888">-</span>';
    // If text already has HTML tags (from rich text editor), sanitize MSO styles then render
    if (/<[a-z][\s\S]*>/i.test(text)) {
      // Remove MSO-specific CSS properties and excessive margins/indents from Word-pasted content
      let clean = text
        .replace(/mso-[^;"':]+:[^;"']+;?/gi, '')           // Remove mso-* properties
        .replace(/margin-left\s*:\s*[^;"']+;?/gi, '')       // Remove margin-left
        .replace(/margin-right\s*:\s*[^;"']+;?/gi, '')      // Remove margin-right
        .replace(/text-indent\s*:\s*[^;"']+;?/gi, '')       // Remove text-indent
        .replace(/tab-stops\s*:\s*[^;"']+;?/gi, '')         // Remove tab-stops
        .replace(/line-height\s*:\s*[^;"']+;?/gi, '')       // Remove line-height overrides
        .replace(/font-family\s*:\s*[^;"']+;?/gi, '')       // Remove custom font-family
        .replace(/class="Mso[^"]*"/gi, '')                   // Remove MsoNormal etc classes
        .replace(/<o:p><\/o:p>/gi, '')                       // Remove Office XML tags
        .replace(/style="\s*"/g, '')                         // Remove empty style attrs
        .replace(/\s{2,}/g, ' ');                            // Collapse whitespace
      return clean;
    }
    // Otherwise, process plain text with line breaks and manual bullets
    const lines = text.split('\n');
    let html = '';
    let inList = false;
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) { if (inList) { html += '</ul>'; inList = false; } html += '<br>'; continue; }
      // Lines starting with • or - or * are list items
      if (/^[•\-\*]\s*/.test(trimmed)) {
        if (!inList) { html += '<ul class="content-list">'; inList = true; }
        html += '<li>' + escH(trimmed.replace(/^[•\-\*]\s*/, '')) + '</li>';
      } else if (/^\d+[\.\)]\s*/.test(trimmed)) {
        // Numbered items
        if (inList) { html += '</ul>'; inList = false; }
        html += '<div style="margin-left:16px;margin-bottom:2px">' + escH(trimmed) + '</div>';
      } else {
        if (inList) { html += '</ul>'; inList = false; }
        html += '<p class="content">' + escH(trimmed) + '</p>';
      }
    }
    if (inList) html += '</ul>';
    return html;
  }

  // ── PAGE 3+: ISI DOKUMEN (Template-Driven) ──
  let secNum = 1;
  let body = '';

  // Parse template sections from the document's snapshot or active template
  let tplSections = [];
  try {
    if (d.template_snapshot) {
      tplSections = JSON.parse(d.template_snapshot).filter(s => s.enabled !== false);
    }
  } catch {}
  // Fallback: if no snapshot, use default section order (matches active template)
  if (!tplSections.length) {
    tplSections = [
      { id: 'tujuan', label: 'Tujuan', type: 'richtext' },
      { id: 'ruang_lingkup', label: 'Ruang Lingkup', type: 'richtext' },
      { id: 'definisi', label: 'Definisi & Singkatan', type: 'table', columns: ['Istilah', 'Penjelasan'] },
      { id: 'dokumen_terkait', label: 'Dokumen Terkait', type: 'special' },
      { id: 'sdm', label: 'Sumber Daya Manusia', type: 'table', columns: ['Kompetensi', 'Jumlah', 'Keterangan'] },
      { id: 'tools', label: 'Alat & Perlengkapan', type: 'table', columns: ['Nama', 'Jumlah', 'Keterangan'] },
      { id: 'material', label: 'Material & Suku Cadang', type: 'table', columns: ['Nama', 'Jumlah', 'Keterangan'] },
      { id: 'aktivitas_persiapan', label: 'Aktivitas Persiapan', type: 'richtext' },
      { id: 'aktivitas_pelaksanaan', label: 'Aktivitas Pelaksanaan', type: 'richtext' },
      { id: 'aktivitas_monitoring', label: 'Aktivitas Monitoring', type: 'richtext' },
      { id: 'aktivitas_tindak_lanjut', label: 'Aktivitas Tindakan Akhir', type: 'richtext' },
      { id: 'identifikasi_risiko', label: 'Identifikasi Risiko', type: 'risk_matrix' },
      { id: 'metode_pengukuran', label: 'Metode Pengukuran', type: 'table', columns: ['Metode', 'Parameter', 'Keterangan'] },
      { id: 'formulir', label: 'Formulir Terkait', type: 'richtext' },
      { id: 'data_teknik', label: 'Data Teknik Equipment', type: 'richtext' },
    ];
  }

  // PLN NP Risk Matrix for score/level lookup
  const RM = {
    '1-1':{s:1,l:'LOW',c:'#00B050'},'1-2':{s:5,l:'LOW',c:'#00B050'},'1-3':{s:10,l:'LOW TO MODERATE',c:'#92D050'},'1-4':{s:15,l:'MODERATE',c:'#FFFF00'},'1-5':{s:20,l:'HIGH',c:'#FF0000'},
    '2-1':{s:2,l:'LOW',c:'#00B050'},'2-2':{s:6,l:'LOW TO MODERATE',c:'#92D050'},'2-3':{s:8,l:'LOW TO MODERATE',c:'#92D050'},'2-4':{s:16,l:'MODERATE TO HIGH',c:'#FFC000'},'2-5':{s:21,l:'HIGH',c:'#FF0000'},
    '3-1':{s:3,l:'LOW',c:'#00B050'},'3-2':{s:8,l:'LOW TO MODERATE',c:'#92D050'},'3-3':{s:11,l:'MODERATE',c:'#FFFF00'},'3-4':{s:18,l:'MODERATE TO HIGH',c:'#FFC000'},'3-5':{s:23,l:'HIGH',c:'#FF0000'},
    '4-1':{s:4,l:'LOW',c:'#00B050'},'4-2':{s:9,l:'LOW TO MODERATE',c:'#92D050'},'4-3':{s:14,l:'MODERATE',c:'#FFFF00'},'4-4':{s:19,l:'MODERATE TO HIGH',c:'#FFC000'},'4-5':{s:24,l:'HIGH',c:'#FF0000'},
    '5-1':{s:7,l:'LOW TO MODERATE',c:'#92D050'},'5-2':{s:12,l:'MODERATE',c:'#FFFF00'},'5-3':{s:17,l:'MODERATE TO HIGH',c:'#FFC000'},'5-4':{s:22,l:'HIGH',c:'#FF0000'},'5-5':{s:25,l:'HIGH',c:'#FF0000'},
  };
  const rmLookup = (p,d2) => RM[`${p}-${d2}`] || {s:'-',l:'-',c:'#ccc'};

  // Helper for rendering aktivitas
  const hasAktivitasContent = (v) => (typeof v === 'string' && v.trim()) || (Array.isArray(v) && v.length > 0);
  const renderAktSectionPrint = (data, title) => {
    if (!hasAktivitasContent(data)) return '';
    if (typeof data === 'string') {
      return `<div class="sub-title">${title}</div><div class="sec-content">${data}</div>`;
    }
    if (Array.isArray(data) && data.length) {
      const rows = data.map((s2, i) => {
        const uraian = s2.uraian || '';
        const content = /<[a-z][\s\S]*>/i.test(uraian) ? uraian : escH(uraian).replace(/\n/g, '<br>');
        return `<tr><td class="no">${i+1}</td><td>${content}</td></tr>`;
      }).join('');
      return `<div class="sub-title">${title}</div>
<table class="tbl step-tbl"><thead><tr><th style="width:35px">No</th><th>Uraian Aktivitas</th></tr></thead>
<tbody>${rows}</tbody></table>`;
    }
    return '';
  };

  // Helper: render a generic table section for print
  function printTable(data, columns, label) {
    const arr = Array.isArray(data) ? data : [];
    if (!arr.length) return '';
    const colKeys = columns.map(c => c.toLowerCase().replace(/[\s\/]/g, '_'));
    // Skip internal DB keys when doing positional fallback
    const skipKeys = new Set(['id', 'dokumen_id', 'tipe']);
    return `<table class="tbl"><thead><tr><th style="width:30px">No</th>${columns.map(c=>`<th>${escH(c)}</th>`).join('')}</tr></thead>
<tbody>${arr.map((r,i) => {
  const cells = columns.map((c,ci) => {
    let val = '';
    if (typeof r === 'object' && r !== null) {
      // Try exact key match first, then column name, then positional (skip DB internal keys)
      val = r[colKeys[ci]] ?? r[c] ?? '';
      if (!val && val !== 0) {
        const dataKeys = Object.keys(r).filter(k => !skipKeys.has(k));
        val = (ci < dataKeys.length) ? r[dataKeys[ci]] : '';
      }
    } else {
      val = r;
    }
    return `<td>${escH(val)}</td>`;
  }).join('');
  return `<tr><td class="no">${i+1}</td>${cells}</tr>`;
}).join('')}</tbody></table>`;
  }

  // Collect aktivitas sections for grouped rendering
  const aktivitasSections = tplSections.filter(s => s.id.startsWith('aktivitas_'));
  let aktivitasRendered = false;

  // Helper: render the grouped aktivitas block
  const renderAktivitasBlock = () => {
    const hasAktivitas = aktivitasSections.some(s => hasAktivitasContent(steps[s.id]));
    if (!hasAktivitas) return;
    body += `<div class="sec-title"><span class="sec-num">${secNum}.</span>Detail Aktivitas</div>`;
    for (const sec of aktivitasSections) {
      const tabLabel = sec.label.replace(/^Aktivitas\s*/i, '') || sec.label;
      body += renderAktSectionPrint(steps[sec.id], tabLabel);
    }
    secNum++;
  };

  // Render ALL sections in TEMPLATE ORDER (respect user's configured order)
  for (const sec of tplSections) {
    // Skip change_history (rendered on page 2)
    if (sec.id === 'change_history') continue;

    // Aktivitas sections: render grouped block at position of FIRST aktivitas section
    if (sec.id.startsWith('aktivitas_')) {
      if (!aktivitasRendered) {
        renderAktivitasBlock();
        aktivitasRendered = true;
      }
      continue; // skip subsequent aktivitas sections
    }

    const secLabel = escH(sec.label);

    switch (sec.id) {
      // ── Built-in section: Tujuan / Ruang Lingkup / Data Teknik (richtext/textarea) ──
      case 'tujuan':
      case 'ruang_lingkup':
      case 'data_teknik': {
        const content = steps[sec.id] || '';
        if (content || sec.id === 'tujuan' || sec.id === 'ruang_lingkup') {
          body += `<div class="sec-title"><span class="sec-num">${secNum}.</span>${secLabel}</div>
<div class="sec-content">${fmtContent(content)}</div>`;
          secNum++;
        }
        break;
      }

      // ── Built-in: Definisi (table) ──
      case 'definisi': {
        if (definisi.length) {
          const cols = sec.columns || ['Istilah', 'Penjelasan'];
          body += `<div class="sec-title"><span class="sec-num">${secNum}.</span>${secLabel}</div>`;
          body += printTable(definisi, cols, secLabel);
        }
        secNum++;
        break;
      }

      // ── Built-in: Dokumen Terkait (special sub-sections) ──
      case 'dokumen_terkait': {
        body += `<div class="sec-title"><span class="sec-num">${secNum}.</span>${secLabel}</div>`;
        if (dokPendukung.length) {
          body += `<div class="sub-title">A.1 Dokumen Pendukung</div><ul class="content-list">${dokPendukung.map(r=>`<li>${escH(r.nomor||r.nama||'')}</li>`).join('')}</ul>`;
        }
        if (dokReferensi.length) {
          body += `<div class="sub-title">A.2 Dokumen Referensi</div><ul class="content-list">${dokReferensi.map(r=>`<li>${escH(r.nama||'')}</li>`).join('')}</ul>`;
        }
        if (dokPerizinan.length) {
          body += `<div class="sub-title">A.3 Dokumen Perizinan</div><ul class="content-list">${dokPerizinan.map(r=>`<li>${escH(r.nama||'')}</li>`).join('')}</ul>`;
        }
        secNum++;
        break;
      }

      // ── Built-in: SDM / Tools / Material (tables with template-driven columns) ──
      case 'sdm': {
        body += `<div class="sec-title"><span class="sec-num">${secNum}.</span>${secLabel}</div>`;
        const cols = sec.columns || ['Kompetensi', 'Jumlah', 'Keterangan'];
        if (sdm.length) { body += printTable(sdm, cols, secLabel); }
        else { body += `<p class="content" style="color:#888">-</p>`; }
        secNum++;
        break;
      }
      case 'tools': {
        body += `<div class="sec-title"><span class="sec-num">${secNum}.</span>${secLabel}</div>`;
        const cols = sec.columns || ['Nama', 'Jumlah', 'Keterangan'];
        if (tools.length) { body += printTable(tools, cols, secLabel); }
        else { body += `<p class="content" style="color:#888">-</p>`; }
        secNum++;
        break;
      }
      case 'material': {
        body += `<div class="sec-title"><span class="sec-num">${secNum}.</span>${secLabel}</div>`;
        const cols = sec.columns || ['Nama', 'Jumlah', 'Keterangan'];
        if (material.length) { body += printTable(material, cols, secLabel); }
        else { body += `<p class="content" style="color:#888">-</p>`; }
        secNum++;
        break;
      }

      // ── Built-in: Identifikasi Risiko (risk_matrix) ──
      case 'identifikasi_risiko': {
        if (risiko.length) {
          body += `<div class="sec-title"><span class="sec-num">${secNum}.</span>${secLabel}</div>`;
          body += `<div class="sub-title">Identifikasi Risiko (Inherent)</div>
<table class="tbl"><thead><tr><th style="width:25px">No.</th><th>Risiko</th><th>Penyebab</th><th style="width:50px">Prob.</th><th style="width:50px">Dampak</th><th style="width:40px">Skor</th><th style="width:110px">Level Inherent</th></tr></thead>
<tbody>${risiko.map((r,i)=>{
  const p=parseInt(r.kemungkinan)||0, d2=parseInt(r.dampak_level)||0;
  const cell=rmLookup(p,d2);
  return `<tr><td class="no">${i+1}</td><td>${escH(r.risiko||'')}</td><td>${escH(r.penyebab||'')}</td><td class="no">${p||'-'}</td><td class="no">${d2||'-'}</td><td class="no" style="background:${cell.c};font-weight:700">${cell.s}</td><td class="no" style="font-weight:600;font-size:8pt">${cell.l}</td></tr>`;
}).join('')}</tbody></table>`;

          body += `<div class="sub-title">Perlakuan Risiko (Residual)</div>
<table class="tbl"><thead><tr><th style="width:25px">No</th><th>Kontrol / Pengendalian</th><th>Mitigasi</th><th style="width:50px">Prob.</th><th style="width:50px">Dampak</th><th style="width:40px">Skor</th><th style="width:110px">Level Residual</th></tr></thead>
<tbody>${risiko.map((r,i)=>{
  const rp=parseInt(r.residual_kemungkinan)||0, rd=parseInt(r.residual_dampak)||0;
  const rcell=rmLookup(rp,rd);
  return `<tr><td class="no">${i+1}</td><td>${escH(r.kontrol_existing||'')}</td><td>${escH(r.mitigasi||'-')}</td><td class="no">${rp||'-'}</td><td class="no">${rd||'-'}</td><td class="no" style="background:${rcell.c};font-weight:700">${rcell.s}</td><td class="no" style="font-weight:600;font-size:8pt">${rcell.l}</td></tr>`;
}).join('')}</tbody></table>`;

          body += `<div class="sub-title">Heat Map Risiko</div>`;
          body += buildHeatMapHtml(risiko);
          secNum++;
        }
        break;
      }

      // ── Built-in: Metode Pengukuran (table) ──
      case 'metode_pengukuran': {
        const metode = steps.metode_pengukuran || [];
        if (metode.length) {
          const cols = sec.columns || ['Metode', 'Parameter', 'Keterangan'];
          body += `<div class="sec-title"><span class="sec-num">${secNum}.</span>${secLabel}</div>`;
          body += printTable(metode, cols, secLabel);
          secNum++;
        }
        break;
      }

      // ── Built-in: Formulir (richtext + attachment) ──
      case 'formulir': {
        const formulirContent = steps.formulir || '';
        if (formulirContent) {
          body += `<div class="sec-title"><span class="sec-num">${secNum}.</span>${secLabel}</div>
<div class="sec-content">${fmtContent(formulirContent)}</div>`;
          secNum++;
        }
        break;
      }

      // ── Custom / Unknown sections ──
      default: {
        const customData = d.custom_sections ? d.custom_sections[sec.id] : (steps[sec.id] || null);
        if (customData) {
          body += `<div class="sec-title"><span class="sec-num">${secNum}.</span>${secLabel}</div>`;
          if (sec.type === 'richtext' || sec.type === 'textarea') {
            body += `<div class="sec-content">${fmtContent(customData)}</div>`;
          } else if (sec.type === 'table' && Array.isArray(customData) && customData.length) {
            body += printTable(customData, sec.columns || ['Isi'], secLabel);
          }
          secNum++;
        }
        break;
      }
    }
  }

  // QR Code & Cloud Path
  body += `<div class="qr-block" style="margin-top:24px;page-break-inside:avoid">
  <div style="flex-shrink:0;padding:6px;background:#fff;border:1px solid #ddd;border-radius:4px">${qrSvg}</div>
  <div class="qr-text" style="flex:1">
    <strong style="font-size:10pt">QR Code Akses Dokumen</strong><br>
    <span style="font-size:9pt">Scan kode QR untuk mengakses dokumen instruksi kerja di lapangan.</span><br>
    <div style="margin-top:6px;padding:6px 8px;background:#f8f8f8;border-radius:3px;border:1px solid #eee">
      <div style="font-size:8pt;color:#666;margin-bottom:2px">No. Dokumen:</div>
      <div style="font-family:monospace;font-size:9.5pt;font-weight:700;color:#1a1a1a">${nom}</div>
    </div>
    <div style="margin-top:4px;padding:6px 8px;background:#f0f8ff;border-radius:3px;border:1px solid #dce8f3">
      <div style="font-size:8pt;color:#666;margin-bottom:2px">Cloud Storage:</div>
      <div style="font-family:monospace;font-size:8.5pt;color:#2C5282;word-break:break-all">${escH(gdrivePath)}</div>
    </div>
  </div>
</div>`;

  // Footer
  body += `<div class="footer-line">
  <span>Brantas DMS v3.0 &mdash; PT PLN Nusantara Power UP Brantas &mdash; Integrated Management System</span>
  <span>${nom} Rev.${rev} &mdash; Dicetak ${new Date().toLocaleDateString('id-ID',{day:'numeric',month:'long',year:'numeric'})}</span>
</div>`;

  // ── PAGE 3+: Use <table><thead> trick so IMS header repeats on every printed page ──
  const page3 = `
<div class="page page-break page-top content-page">
  <table class="content-wrap-table">
    <thead><tr><td class="content-thead-cell">${hdrTable}</td></tr></thead>
    <tbody><tr><td class="content-tbody-cell">${body}</td></tr></tbody>
  </table>
</div>`;

  // ── ASSEMBLE FULL DOCUMENT ──
  return `<!DOCTYPE html><html lang="id"><head><meta charset="UTF-8">
<title>${nom} &mdash; ${judul}</title>
<link href="https://fonts.googleapis.com/css2?family=Courier+Prime:wght@400;700&family=JetBrains+Mono:wght@300;400;500&display=swap" rel="stylesheet">
<style>${css}</style>
</head><body>
<div class="toolbar no-print">
  <strong style="font-size:13px">${nom}</strong>
  <span style="color:#64748b;font-size:11px">${judul}</span>
  <span class="spacer"></span>
  <span class="info" title="${escH(gdrivePath)}">&#128193; GDrive: ${escH(gdrivePath)}</span>
  <button onclick="window.print()">&#128424; Cetak / PDF</button>
  <button class="btn-green" onclick="downloadAsDoc()">&#128196; Download .doc</button>
</div>
<div class="page-container">
  ${coverHtml}
  ${page2}
  ${page3}
</div>
<script>
function downloadAsDoc(){
  var c=document.querySelector('.page-container').innerHTML;

  // ── Clean up HTML for Word compatibility ──
  // Remove SVG (QR code) — convert to descriptive text box for Word
  c = c.replace(/<svg[^>]*>[\\s\\S]*?<\\/svg>/gi, '<div style="width:120pt;height:120pt;border:2pt solid #000;text-align:center;padding:30pt 10pt;font-size:9pt;font-weight:bold;color:#333;display:inline-block">[QR Code]<br><span style="font-size:7pt;font-weight:normal;color:#666">Scan di versi digital</span></div>');
  // Remove CSS properties Word doesn't support
  c = c.replace(/display\\s*:\\s*(flex|grid|inline-flex|inline-grid)[^;"']*/gi, '');
  c = c.replace(/flex[\\w-]*\\s*:[^;"']*/gi, '');
  c = c.replace(/gap\\s*:\\s*[^;"']*/gi, '');
  c = c.replace(/align-items\\s*:[^;"']*/gi, '');
  c = c.replace(/justify-content\\s*:[^;"']*/gi, '');
  c = c.replace(/align-self\\s*:[^;"']*/gi, '');
  c = c.replace(/grid[\\w-]*\\s*:[^;"']*/gi, '');
  c = c.replace(/border-radius\\s*:[^;"']*/gi, '');
  c = c.replace(/box-shadow\\s*:[^;"']*/gi, '');
  c = c.replace(/transition\\s*:[^;"']*/gi, '');
  c = c.replace(/transform\\s*:[^;"']*/gi, '');
  c = c.replace(/outline-offset\\s*:[^;"']*/gi, '');
  c = c.replace(/cursor\\s*:\\s*pointer[^;"']*/gi, '');
  // Sanitize MSO Word-pasted content styles
  c = c.replace(/mso-[^;"':]+:[^;"']+;?/gi, '');
  c = c.replace(/tab-stops\\s*:[^;"']*/gi, '');
  // Clean empty style attrs
  c = c.replace(/style="[\\s;]*"/gi, '');
  // Remove image toolbar artifacts
  c = c.replace(/<div[^>]*class="rte-img-toolbar"[^>]*>[\\s\\S]*?<\\/div>/gi, '');
  // Remove inline image outlines (editor artifacts)
  c = c.replace(/outline\\s*:[^;"']*/gi, '');
  c = c.replace(/outline-offset\\s*:[^;"']*/gi, '');

  // ── Convert flex-based QR block to Word-compatible table layout ──
  c = c.replace(/<div class="qr-block"[^>]*>([\\s\\S]*?)<\\/div>\\s*<\\/div>\\s*<\\/div>/gi, function(m, inner) {
    return '<table class="qr-block" style="width:100%;border:1.5pt solid #000;border-collapse:collapse;margin:14pt 0"><tr>' +
      '<td style="width:130pt;padding:10pt;border:none;vertical-align:top;text-align:center">' +
      inner.replace(/<div[^>]*style="[^"]*flex-shrink[^"]*"[^>]*>([\\s\\S]*?)<\\/div>/i, '$1') +
      '</td></tr></table>';
  });

  // Fix footer-line: convert flex layout to table for Word
  c = c.replace(/<div class="footer-line">([\\s\\S]*?)<\\/div>/gi, function(m, inner) {
    var spans = inner.match(/<span[^>]*>[\\s\\S]*?<\\/span>/gi) || [];
    if (spans.length >= 2) {
      return '<table style="width:100%;border-top:1pt solid #ccc;margin-top:20pt;border-collapse:collapse"><tr>' +
        '<td style="padding-top:6pt;font-size:7.5pt;color:#888;border:none;text-align:left">' + spans[0].replace(/<\\/?span[^>]*>/gi,'') + '</td>' +
        '<td style="padding-top:6pt;font-size:7.5pt;color:#888;border:none;text-align:right">' + spans[1].replace(/<\\/?span[^>]*>/gi,'') + '</td>' +
        '</tr></table>';
    }
    return m;
  });

  // ── Fix cover-meta: convert flex centering to Word margin centering ──
  c = c.replace(/<div class="cover-meta">/gi, '<div class="cover-meta" style="width:70%;margin:0 auto 40pt;text-align:left">');

  // ── Fix images: ensure all images have proper Word sizing ──
  c = c.replace(/<img([^>]*)>/gi, function(m, attrs) {
    // Ensure images have max-width for Word
    if (attrs.indexOf('max-width') < 0) {
      return '<img' + attrs + ' style="max-width:100%;height:auto">';
    }
    return m;
  });

  var wordMeta = '<!--[if gte mso 9]><xml><w:WordDocument>' +
    '<w:View>Print<\\/w:View><w:Zoom>100<\\/w:Zoom>' +
    '<w:SpellingState>Clean<\\/w:SpellingState><w:GrammarState>Clean<\\/w:GrammarState>' +
    '<w:TrackMoves>false<\\/w:TrackMoves><w:TrackFormatting/>' +
    '<w:HyphenationZone>21<\\/w:HyphenationZone>' +
    '<w:DoNotOptimizeForBrowser/>' +
    '<w:AllowPNG/>' +
    '<\\/w:WordDocument><\\/xml><![endif]-->' +
    '<!--[if gte mso 9]><xml><w:LatentStyles DefLockedState="false" DefUnhideWhenUsed="false" DefSemiHidden="false" DefQFormat="false" DefPriority="99"/><\\/xml><![endif]-->';

  var docCss =
    '@page WordSection1{size:210mm 297mm;margin:20mm 20mm 20mm 20mm;mso-header-margin:10mm;mso-footer-margin:15mm}' +
    'div.WordSection1{page:WordSection1}' +
    'body{font-family:"Courier New",Courier,monospace;font-size:10pt;line-height:1.6;color:#1a1a1a;background:#fff;margin:0;padding:0}' +
    'table{border-collapse:collapse;mso-table-lspace:0;mso-table-rspace:0}' +
    'td,th{mso-line-height-rule:exactly}' +
    '.toolbar,.no-print{display:none!important}' +
    '.page-container{margin:0;padding:0}' +
    '.page{margin:0;padding:0;border:none;box-shadow:none;min-height:auto;background:#fff}' +
    '.page-break{page-break-before:always;mso-break-type:section-break}' +
    '.page-top{padding-top:0}' +
    '.cover{page-break-after:always;min-height:auto;height:auto;padding:30mm 20mm;text-align:center}' +
    '.cover-label{font-size:16pt;font-weight:bold;margin-bottom:4pt;letter-spacing:2pt}' +
    '.cover-company{font-size:14pt;font-weight:bold;color:#0066B3;margin-bottom:40pt}' +
    '.cover-title-box{border:2pt solid #000;padding:15pt 30pt;margin:0 auto 40pt;text-align:center}' +
    '.cover-title{font-size:16pt;font-weight:bold;line-height:1.3}' +
    '.cover-meta{width:70%;margin:0 auto 40pt;text-align:left}' +
    '.cover-meta table{width:100%;font-size:11pt;border-collapse:collapse}' +
    '.cover-meta td{padding:4pt 4pt;vertical-align:top;border:none}' +
    '.sig-table{width:100%;border-collapse:collapse;margin-top:30pt}' +
    '.sig-table td{border:1pt solid #999;padding:6pt 8pt;text-align:center;font-size:9pt;vertical-align:top}' +
    '.sig-label{font-weight:bold;font-size:10pt;display:block;margin-bottom:50pt}' +
    '.sig-name{font-weight:bold;border-top:1pt solid #000;display:inline-block;padding-top:4pt;min-width:120pt;margin-top:50pt}' +
    '.sig-pos{font-size:8pt;color:#555;margin-top:2pt}' +
    '.content-page{padding:0;min-height:auto}' +
    '.content-wrap-table{width:100%;border-collapse:collapse;border:none;mso-border-alt:none}' +
    '.content-wrap-table,.content-wrap-table thead,.content-wrap-table tbody,.content-wrap-table tr,.content-thead-cell,.content-tbody-cell{border:none;padding:0;margin:0;mso-border-alt:none}' +
    '.content-thead-cell{padding:0 0 6pt 0;vertical-align:top;border:none}' +
    '.content-tbody-cell{padding:0;vertical-align:top;border:none;word-wrap:break-word}' +
    '.sec-content{margin:4pt 0 12pt;font-size:10pt}' +
    '.sec-content p,.sec-content div,.sec-content span,.sec-content li{margin-left:0!important;margin-right:0!important;text-indent:0!important}' +
    '.sec-content ul,.sec-content ol{margin-left:20pt!important;padding-left:0!important}' +
    '.sec-content table{width:100%!important}' +
    '.sec-content img{max-width:100%}' +
    '.ik-header{width:100%;border-collapse:collapse;border:1.5pt solid #000;margin-bottom:0;font-size:9pt}' +
    '.ik-header td{border:1pt solid #000;padding:3pt 8pt;vertical-align:middle}' +
    '.ik-header .logo-cell{width:50pt;text-align:center;padding:3pt 6pt}' +
    '.ik-header .logo-cell img{height:24pt}' +
    '.ik-header .company-cell{font-weight:bold;font-size:9.5pt;text-align:center}' +
    '.ik-header .title-cell{font-weight:bold;font-size:9.5pt;text-align:center}' +
    '.ik-header .label-cell{font-weight:bold;width:85pt;font-size:8.5pt;white-space:nowrap}' +
    '.ik-header .value-cell{font-size:9pt}' +
    'table.tbl{width:100%;border-collapse:collapse;margin:6pt 0 12pt;font-size:9.5pt}' +
    'table.tbl th,table.tbl td{border:1pt solid #000;padding:3pt 6pt;vertical-align:top}' +
    'table.tbl th{background:#D9E2F3;font-weight:bold;text-align:center;font-size:9pt;mso-pattern:auto none;background-color:#D9E2F3}' +
    'table.tbl td.no{text-align:center;width:25pt}' +
    '.sec-title{font-size:11pt;font-weight:bold;margin:14pt 0 6pt;padding:3pt 0;border-bottom:1.5pt solid #000}' +
    '.sec-num{margin-right:6pt}' +
    '.sub-title{font-weight:bold;font-size:10pt;margin:8pt 0 4pt}' +
    'p.content{margin:4pt 0 8pt;text-align:justify;font-size:10pt}' +
    'ul.content-list{margin:4pt 0 8pt 20pt;font-size:10pt}' +
    'ul.content-list li{margin-bottom:2pt}' +
    'ol.step-list{margin:4pt 0 8pt 20pt;font-size:10pt}' +
    'ol.step-list li{margin-bottom:3pt;padding-left:4pt}' +
    '.qr-block{border:1.5pt solid #000;padding:10pt;margin:14pt 0}' +
    '.qr-block td{border:none;padding:6pt;vertical-align:top}' +
    '.qr-block .qr-text{font-size:8.5pt;color:#333}' +
    'img{max-width:100%;height:auto;mso-width-percent:1000;mso-height-percent:0;mso-width-relative:margin}' +
    /* Ensure section titles don't orphan in Word */
    '.sec-title{mso-pagination:lines-together;page-break-after:avoid}' +
    '.sub-title{mso-pagination:lines-together;page-break-after:avoid}' +
    '.sec-content{mso-pagination:widow-orphan}' +
    'table.tbl tr{mso-pagination:lines-together}' +
    '.sig-table{mso-pagination:lines-together}' +
    '.cover-title-box{mso-element:para-border-div}' +
    /* Heat map table colors for Word */
    'td[style*="background"]{mso-pattern:auto none}';

  var h='<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns:v="urn:schemas-microsoft-com:vml" xmlns="http://www.w3.org/TR/REC-html40">' +
    '<head><meta charset="utf-8"><meta http-equiv="Content-Type" content="text/html; charset=utf-8">' + wordMeta +
    '<style>' + docCss + '<\\/style></head><body><div class="WordSection1">' + c + '</div></body></html>';
  var b=new Blob(['\\ufeff'+h],{type:'application/msword;charset=utf-8'});
  var a=document.createElement('a');a.href=URL.createObjectURL(b);a.download='${nom}.doc';a.click();URL.revokeObjectURL(a.href);
}
<\/script></body></html>`;
}

// ─── NAVIGATION ────────────────────────────────
async function showPage(id) {
  // Route guard: Admin-only pages (Super Admin & Admin both have access)
  const isAdminLevel = ['Super Admin', 'Admin'].includes(APP.user?.role);
  if (id === 'template' && !isAdminLevel) {
    showToast('Akses ditolak: hanya Admin yang dapat mengakses Template Engine', 'error');
    id = 'dashboard';
  }

  APP.currentPage = id;

  // Update nav
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(b => {
    if (b.getAttribute('onclick') && b.getAttribute('onclick').includes(`'${id}'`)) {
      b.classList.add('active');
    }
  });
  document.getElementById('currentPageTitle').textContent = PAGE_TITLES[id] || id;
  closeNotif();

  // Render page
  const content = document.getElementById('appContent');
  try {
    switch (id) {
      case 'dashboard': await renderDashboard(content); break;
      case 'master-ik': await renderMasterIK(content); break;
      case 'buat-ik': await renderBuatIK(content); break;
      case 'workflow': await renderWorkflow(content); break;
      case 'template': await renderTemplates(content); loadTemplateIkCounts(); break;
      case 'equipment': await renderEquipment(content); break;
      case 'qrcode': await renderQRCode(content); break;
      case 'laporan': await renderLaporan(content); break;
      case 'audit': await renderAudit(content); break;
      case 'master-data': await renderMasterData(content); break;
      case 'pengguna': await renderPengguna(content); break;
      case 'admin-roles': await renderAdminRoles(content); break;
      case 'admin-sessions': await renderAdminSessions(content); break;
      case 'admin-audit': await renderAdminAudit(content); break;
      case 'pengaturan': await renderPengaturan(content); break;
      case 'help': await renderHelp(content); break;
      default:
        content.innerHTML = '<div class="page active" style="padding:24px"><h2>Halaman tidak ditemukan</h2></div>';
    }
  } catch (e) {
    content.innerHTML = `<div class="page active" style="padding:24px"><div class="alert alert-danger"><div class="alert-icon">${icon('alert-circle', 18)}</div><div>Gagal memuat halaman: ${esc(e.message)}</div></div></div>`;
  }
  renderIcons();
}

// ─── SIDEBAR TOGGLE (3-state: full → mini → collapsed) ─────────────────────────
function toggleSidebar() {
  const sb = document.querySelector('.sidebar');
  if (!sb.classList.contains('mini') && !sb.classList.contains('collapsed')) {
    // full → mini
    sb.classList.add('mini');
    sb.classList.remove('collapsed');
  } else if (sb.classList.contains('mini')) {
    // mini → collapsed
    sb.classList.remove('mini');
    sb.classList.add('collapsed');
  } else {
    // collapsed → full
    sb.classList.remove('collapsed');
    sb.classList.remove('mini');
  }
  // Save preference
  localStorage.setItem('bdms_sidebar', sb.classList.contains('mini') ? 'mini' : sb.classList.contains('collapsed') ? 'collapsed' : 'full');
}

// Restore sidebar state on load
function restoreSidebarState() {
  const state = localStorage.getItem('bdms_sidebar');
  const sb = document.querySelector('.sidebar');
  if (!sb) return;
  if (state === 'mini') { sb.classList.add('mini'); sb.classList.remove('collapsed'); }
  else if (state === 'collapsed') { sb.classList.add('collapsed'); sb.classList.remove('mini'); }
}

// ─── NOTIFICATIONS ────────────────────────────
async function loadNotifs() {
  try {
    const res = await API.getNotif();
    APP.cache.notif = res.data || [];
    renderNotifList();
    updateNotifBadge();
  } catch (e) { /* silent */ }
}

function updateNotifBadge() {
  const list = APP.cache.notif || [];
  const unreadCount = list.filter(n => !n.is_read).length;
  const dot = document.getElementById('notifBadgeDot');
  if (dot) dot.style.display = unreadCount > 0 ? 'block' : 'none';
}

function renderNotifList() {
  const list = APP.cache.notif || [];
  const el = document.getElementById('notifList');
  if (!list.length) {
    el.innerHTML = '<div style="padding:24px;text-align:center;color:var(--text-tertiary);font-size:13px">Tidak ada notifikasi</div>';
    return;
  }
  el.innerHTML = list.map((n, i) => `
    <div class="notif-item ${n.is_read ? '' : 'unread'}" onclick="readNotif(${n.id})">
      <div class="notif-dot" style="background:${n.warna_bg || '#E6F0FF'}">${icon('bell', 14)}</div>
      <div class="notif-content">
        <div class="notif-title">${esc(n.judul)}</div>
        <div class="notif-desc">${esc(n.deskripsi)}</div>
        <div class="notif-time">${timeAgo(n.created_at)}</div>
      </div>
    </div>
  `).join('');
  renderIcons();
}

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const now = new Date();
  const d = new Date(dateStr);
  const diffMs = now - d;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'Baru saja';
  if (diffMin < 60) return diffMin + ' menit lalu';
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return diffHr + ' jam lalu';
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return diffDay + ' hari lalu';
  return formatDate(dateStr);
}

async function readNotif(id) {
  try { await API.markNotifRead(id); } catch (e) { /* ignore */ }
  loadNotifs();
}

async function markAllReadNotif() {
  try { await API.markNotifRead(); } catch (e) { /* ignore */ }
  loadNotifs();
  showToast('Semua notifikasi telah dibaca', 'success');
}

function toggleNotif() {
  document.getElementById('notifPanel').classList.toggle('open');
}

function closeNotif() {
  document.getElementById('notifPanel').classList.remove('open');
}

// ─── GLOBAL SEARCH ──────────────────────────
const globalSearchFn = debounce(async (q) => {
  if (!q || !q.trim()) return;
  try {
    const res = await API.getDokumen('search=' + encodeURIComponent(q));
    if (res.data && res.data.items && res.data.items.length > 0) {
      showPage('master-ik');
      renderMasterIK(document.getElementById('appContent'), res.data.items);
    } else {
      showToast('Tidak ditemukan hasil untuk "' + q + '"', 'warning');
    }
  } catch (e) {
    showToast('Pencarian gagal', 'error');
  }
}, 400);

// ─── ROLE SWITCHER (ensure it exists after client-side login) ─────────
function ensureRoleSwitcher() {
  if (!APP.user) return;
  const origRole = APP.user.original_role || APP.user.role;
  if (origRole !== 'Super Admin') return;
  // Already exists?
  if (document.getElementById('roleSwitcher')) return;
  // Create switcher in sidebar footer
  const footer = document.querySelector('.sidebar-footer');
  if (!footer) return;
  const wrap = document.createElement('div');
  wrap.className = 'role-switcher-wrap';
  const allRoles = ['Super Admin','Admin','Senior Manager','Manager','Asman','Approver','Document Owner','Viewer'];
  const currentRole = APP.user.role || 'Super Admin';
  wrap.innerHTML = `<select id="roleSwitcher" onchange="switchMyRole(this.value)">${allRoles.map(r => `<option value="${r}"${r === currentRole ? ' selected' : ''}>${r === 'Document Owner' ? 'Doc Owner' : r}</option>`).join('')}</select>`;
  // Insert before sidebar-actions
  const actions = footer.querySelector('.sidebar-actions');
  if (actions) footer.insertBefore(wrap, actions);
  else footer.appendChild(wrap);
}

// ─── ROLE SWITCHING (Super Admin) ─────────────
function toggleAdminNav(showAdminNav) {
  // Admin nav items — visibility depends on current active role
  let el = document.getElementById('adminNavSection');
  if (showAdminNav) {
    if (!el) {
      const nav = document.querySelector('.sidebar-nav');
      const wrap = document.createElement('div');
      wrap.id = 'adminNavSection';
      wrap.innerHTML = `
        <div class="nav-section">Administrasi</div>
        <button class="nav-item" onclick="showPage('pengguna')"><span class="nav-icon">${icon('users', 16)}</span><span class="nav-label">Manajemen Pengguna</span></button>
        <button class="nav-item" onclick="showPage('admin-roles')"><span class="nav-icon">${icon('shield', 16)}</span><span class="nav-label">Roles & Permissions</span></button>
        <button class="nav-item" onclick="showPage('admin-sessions')"><span class="nav-icon">${icon('monitor', 16)}</span><span class="nav-label">Sesi Aktif</span></button>
        <button class="nav-item" onclick="showPage('pengaturan')"><span class="nav-icon">${icon('sliders', 16)}</span><span class="nav-label">Pengaturan</span></button>
      `;
      nav.appendChild(wrap);
      renderIcons();
    } else {
      el.style.display = '';
    }
  } else {
    if (el) el.style.display = 'none';
  }
  // Template Engine — visible if user has system:template permission or is admin
  let tplNav = document.getElementById('navTemplateEngine');
  const showTemplate = showAdminNav || _hasPermission('system:template');
  if (!tplNav && showTemplate) {
    // Create dynamically (client-side login case)
    const workflowBtn = document.querySelector('.nav-item[onclick*="workflow"]');
    if (workflowBtn) {
      const btn = document.createElement('button');
      btn.className = 'nav-item';
      btn.id = 'navTemplateEngine';
      btn.setAttribute('onclick', "showPage('template')");
      btn.innerHTML = `<span class="nav-icon"><i data-lucide="folder-open" class="icon-16"></i></span><span class="nav-label">Template Engine</span>`;
      workflowBtn.insertAdjacentElement('afterend', btn);
      renderIcons();
    }
  } else if (tplNav) {
    tplNav.style.display = showTemplate ? '' : 'none';
  }

  // Buat IK — visible only if user has doc:create
  const canCreateDoc = showAdminNav || _hasPermission('doc:create');
  let buatIK = document.getElementById('navBuatIK');
  if (!buatIK && canCreateDoc) {
    // Create dynamically (client-side login case)
    const masterBtn = document.querySelector('.nav-item[onclick*="master-ik"]');
    if (masterBtn) {
      const secDiv = document.createElement('div');
      secDiv.className = 'nav-section';
      secDiv.id = 'navSectionDokumen';
      secDiv.textContent = 'Dokumen IK';
      masterBtn.insertAdjacentElement('afterend', secDiv);
      const btn = document.createElement('button');
      btn.className = 'nav-item';
      btn.id = 'navBuatIK';
      btn.setAttribute('onclick', "showPage('buat-ik')");
      btn.innerHTML = `<span class="nav-icon"><i data-lucide="file-plus" class="icon-16"></i></span><span class="nav-label">Buat IK Baru</span>`;
      secDiv.insertAdjacentElement('afterend', btn);
      renderIcons();
    }
  } else if (buatIK) {
    buatIK.style.display = canCreateDoc ? '' : 'none';
    const secDok = document.getElementById('navSectionDokumen');
    if (secDok) secDok.style.display = canCreateDoc ? '' : 'none';
  }
}

async function switchMyRole(role) {
  try {
    const res = await API.switchRole(role);
    APP.user.role = res.data.role;
    document.getElementById('sbRole').textContent = `${APP.user.role} · UP Brantas`;
    const sw = document.getElementById('roleSwitcher');
    if (sw) sw.value = role;
    // Super Admin & Admin both get admin nav
    const hasAdminAccess = ['Super Admin', 'Admin'].includes(role);
    // Update nav visibility BEFORE page render
    toggleAdminNav(hasAdminAccess);
    // Navigate to safe page if current page is admin-only
    const adminPages = ['master-data','pengguna','admin-roles','admin-sessions','pengaturan','template'];
    const target = (!hasAdminAccess && adminPages.includes(APP.currentPage)) ? 'dashboard' : (APP.currentPage || 'dashboard');
    await showPage(target);
    // Re-enforce nav visibility AFTER page render (prevents race condition)
    toggleAdminNav(hasAdminAccess);
    showToast(`Role berubah: ${role}`, 'success');
  } catch (e) {
    const sw = document.getElementById('roleSwitcher');
    if (sw) sw.value = APP.user.role;
    showToast('Gagal pindah role: ' + e.message, 'error');
  }
}

// ─── CHANGE PASSWORD ─────────────────────────
function openChangePasswordModal() {
  openGenericModal(
    `${icon('key', 18)} Ganti Password`,
    `
    <div class="form-group">
      <label class="form-label">Password Lama</label>
      <input type="password" class="form-control" id="cp-old" autocomplete="current-password">
    </div>
    <div class="form-group" style="margin-top:12px">
      <label class="form-label">Password Baru <span class="required">*</span></label>
      <input type="password" class="form-control" id="cp-new" autocomplete="new-password" placeholder="Minimal 6 karakter">
    </div>
    <div class="form-group" style="margin-top:12px">
      <label class="form-label">Konfirmasi Password Baru</label>
      <input type="password" class="form-control" id="cp-confirm" autocomplete="new-password">
    </div>
    <div id="cp-error" style="color:var(--danger);font-size:12px;margin-top:8px;display:none"></div>
    `,
    `<button class="btn btn-secondary" onclick="closeModal('modalGeneric')">Batal</button>
     <button class="btn btn-primary" onclick="doChangePassword()">${icon('save', 14)} Simpan Password</button>`
  );
  renderIcons();
}

async function doChangePassword() {
  const oldPw = document.getElementById('cp-old')?.value;
  const newPw = document.getElementById('cp-new')?.value;
  const confirmPw = document.getElementById('cp-confirm')?.value;
  const errEl = document.getElementById('cp-error');

  if (!oldPw || !newPw) { errEl.textContent = 'Semua field wajib diisi'; errEl.style.display = 'block'; return; }
  if (newPw.length < 6) { errEl.textContent = 'Password baru minimal 6 karakter'; errEl.style.display = 'block'; return; }
  if (newPw !== confirmPw) { errEl.textContent = 'Konfirmasi password tidak cocok'; errEl.style.display = 'block'; return; }

  try {
    await API.changePassword(oldPw, newPw);
    closeModal('modalGeneric');
    showToast('Password berhasil diganti!', 'success');
  } catch (e) {
    errEl.textContent = e.message;
    errEl.style.display = 'block';
  }
}

// ─── INIT ──────────────────────────────────────
async function initApp() {
  restoreSidebarState();
  ensureRoleSwitcher();
  const hasAdminAccess = ['Super Admin', 'Admin'].includes(APP.user?.role);
  toggleAdminNav(hasAdminAccess);
  showPage('dashboard');
  loadNotifs();
  loadBadges();
}

async function loadBadges() {
  try {
    const res = await API.getDokumen('limit=1');
    const badge = document.getElementById('badge-master');
    if (badge && res.data) badge.textContent = res.data.total || 0;

    const wf = await API.getWorkflow('');
    const badgeWf = document.getElementById('badge-workflow');
    if (badgeWf && wf.data) badgeWf.textContent = wf.data.length || 0;
  } catch (e) { /* silent */ }
}

// Auto-init if logged in
if (APP.loggedIn) {
  document.addEventListener('DOMContentLoaded', initApp);
}
