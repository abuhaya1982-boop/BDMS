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

async function downloadPdf(id) { await previewDokumenFull(id, 'pdf'); }

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

async function previewDokumenFull(id, mode) {
  try {
    const res = await API.getDokumenById(id);
    const d = res.data;
    const unit = d.unit_nama || '';
    const probis = d.probis_nama || '';
    const owner = d.owner_nama || '';

    let cloudBaseUrl = '';
    try { const settRes = await API.getSettings(); cloudBaseUrl = settRes.data?.cloud_base_url || ''; } catch(e) { /* ignore */ }

    const gdrivePath = cloudBaseUrl
      ? `${cloudBaseUrl.replace(/\/+$/,'')}/${unit.replace(/\s+/g,'_')}/${d.nomor_dokumen}/`
      : `G:/IMS_UP_Brantas/Instruksi_Kerja/${unit.replace(/\s+/g,'_')}/${d.nomor_dokumen}/`;

    const qrData = cloudBaseUrl ? `${gdrivePath}` : `BDMS|${d.nomor_dokumen}|Rev${d.revisi||'00'}|${unit}`;
    const qrSvg = generateQRCodeSVG(qrData, 150);

    const konten = d.konten || {};
    const steps = d.steps || konten.steps || {};
    const logoB64 = typeof LOGO_PLN_NP_B64 !== 'undefined' ? LOGO_PLN_NP_B64 : '';

    // Fetch risk matrix from DB
    let riskMatrixMap = null;
    try { const rmRes = await API.getRiskMatrix(); riskMatrixMap = rmRes.data; } catch(e) { /* fallback to hardcoded */ }

    let html = buildPrintableDoc(d, { unit, probis, owner, gdrivePath, qrSvg, steps, konten, logoB64, riskMatrixMap });
    // Auto-trigger the print dialog only for explicit "pdf" mode, after the document (incl. images) is fully loaded
    if (mode === 'pdf') {
      html = html.replace('</body></html>', '<script>window.addEventListener("load",function(){setTimeout(function(){try{window.focus();window.print();}catch(e){}},500);});<\/script></body></html>');
    }
    // Open via a real Blob URL (not about:blank + document.write) so the popup has a
    // concrete document URL/origin — makes window.print() and same-site fetch reliable.
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const w = window.open(url, '_blank');
    if (!w) { URL.revokeObjectURL(url); showToast('Pop-up diblokir browser. Izinkan pop-up untuk preview.', 'error'); return; }
    w.focus();
    setTimeout(() => { try { URL.revokeObjectURL(url); } catch (e) {} }, 60000);
    showToast(`Preview: ${d.nomor_dokumen}`, 'success');
  } catch (e) {
    console.error('previewDokumenFull error:', e);
    showToast('Gagal memuat dokumen: ' + (e.message || JSON.stringify(e)), 'error');
  }
}

function escH(s) { return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function fmtDate(d) { if (!d) return '-'; try { return new Date(d).toLocaleDateString('id-ID',{day:'2-digit',month:'2-digit',year:'numeric'}); } catch { return d; } }

function generateQRCodeSVG(data, size) {
  // Use qrcode-generator library for real, scannable QR codes
  if (typeof qrcode !== 'undefined') {
    try {
      const qr = qrcode(0, 'M'); // Type 0 = auto-detect, Error correction M
      qr.addData(data);
      qr.make();
      // Generate as <img> with GIF data URL (Word-compatible, no SVG issues)
      const cellSize = 4;
      const margin = 2;
      const dataUrl = qr.createDataURL(cellSize, margin);
      const imgSize = size || 150;
      return `<img src="${dataUrl}" width="${imgSize}" height="${imgSize}" style="width:${imgSize}px;height:${imgSize}px;image-rendering:pixelated" alt="QR Code">`;
    } catch (e) {
      console.warn('QR generation failed, using fallback:', e);
    }
  }
  // Fallback: placeholder text
  return `<div style="width:90px;height:90px;border:2px solid #ccc;display:flex;align-items:center;justify-content:center;font-size:10px;color:#999;background:#f5f5f5">QR Code</div>`;
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

  // Build heat map table — Word-compatible (no flex, no writing-mode, absolute widths in pt)
  // Total table width ≈ 480pt (fits within A4 content area 180mm ≈ 510pt, with margin)
  const hmCellW = '68pt';   // each of 5 dampak columns
  const hmLabelW = '18pt';  // Probabilitas vertical column
  const hmProbW = '65pt';   // probability label column
  let h = `<table style="border-collapse:collapse;width:100%;font-family:inherit;font-size:10px;table-layout:fixed;mso-table-lspace:0pt;mso-table-rspace:0pt">`;
  // Header row — dampak labels
  h += `<tr><td colspan="2" style="border:1px solid #ccc;background:#f5f5f5;mso-pattern:auto none;background-color:#f5f5f5;text-align:center;font-weight:700;font-size:10px;width:${hmProbW}"></td>`;
  dampakLabels.forEach(d => { h += `<td style="border:1px solid #ccc;background:#f5f5f5;mso-pattern:auto none;background-color:#f5f5f5;text-align:center;font-weight:600;padding:4px 2px;width:${hmCellW}">${d.label}<br><span style="font-weight:400">${d.val}</span></td>`; });
  h += `</tr>`;
  // Probability rows (E=5 down to A=1)
  probLabels.forEach((p, i) => {
    h += `<tr>`;
    if (i === 0) h += `<td rowspan="5" style="border:1px solid #ccc;background:#f5f5f5;mso-pattern:auto none;background-color:#f5f5f5;text-align:center;font-weight:700;padding:6px 2px;font-size:11px;width:${hmLabelW};mso-text-orientation:upward">P<br>R<br>O<br>B</td>`;
    h += `<td style="border:1px solid #ccc;background:#f5f5f5;mso-pattern:auto none;background-color:#f5f5f5;text-align:center;font-weight:600;padding:3px;line-height:1.2;width:${hmProbW}">${p.label}<br><b>${p.key}</b></td>`;
    dampakLabels.forEach(d => {
      const c = rmGet(p.val, d.val);
      const key = `${p.val}-${d.val}`;
      // Build markers — use inline-block for Word compatibility
      let markers = '';
      if (inherentMap[key]) {
        markers += inherentMap[key].map(n => `<span style="display:inline-block;width:14pt;height:14pt;border:2px solid #333;text-align:center;line-height:14pt;background:#fff;font-size:9px;font-weight:700;color:#333;margin:1px">${n}</span>`).join('');
      }
      if (residualMap[key]) {
        markers += residualMap[key].map(n => `<span style="display:inline-block;width:14pt;height:14pt;border:2px solid #C2410C;text-align:center;line-height:14pt;background:#FB923C;mso-pattern:auto none;background-color:#FB923C;font-size:9px;font-weight:700;color:#fff;margin:1px">${n}</span>`).join('');
      }
      h += `<td style="border:1px solid #999;background:${c.color};mso-pattern:auto none;background-color:${c.color};text-align:center;padding:4px 2px;vertical-align:middle;width:${hmCellW}">
        <div style="font-weight:600;font-size:8px;color:#333">${c.level}</div>
        <div style="font-weight:800;font-size:13px;color:#222">${c.score}</div>
        <div style="text-align:center;margin-top:1px">${markers}</div>
      </td>`;
    });
    h += `</tr>`;
  });
  h += `<tr><td colspan="2" style="border:none"></td><td colspan="5" style="border:1px solid #ccc;background:#f5f5f5;mso-pattern:auto none;background-color:#f5f5f5;text-align:center;font-weight:700;font-size:11px;padding:4px">Dampak</td></tr>`;
  h += `</table>`;

  // Legend — Word-compatible (no flex, use table for alignment)
  h += `<table style="border-collapse:collapse;margin:8px 0 12px;font-size:10px;border:none;mso-table-lspace:0pt;mso-table-rspace:0pt"><tr>
    <td style="border:none;padding:2pt 4pt;vertical-align:middle"><span style="display:inline-block;width:14pt;height:14pt;border:2px solid #333;text-align:center;line-height:14pt;background:#fff;font-size:9px;font-weight:700;color:#333">n</span></td>
    <td style="border:none;padding:2pt 8pt 2pt 2pt;vertical-align:middle;font-size:10px">Inherent Risk</td>
    <td style="border:none;padding:2pt 4pt;vertical-align:middle"><span style="display:inline-block;width:14pt;height:14pt;border:2px solid #C2410C;text-align:center;line-height:14pt;background:#FB923C;mso-pattern:auto none;background-color:#FB923C;font-size:9px;font-weight:700;color:#fff">n</span></td>
    <td style="border:none;padding:2pt 4pt 2pt 2pt;vertical-align:middle;font-size:10px">Target Residual Risk</td>
  </tr></table>`;

  return h;
}

// ── Build the complete IK print document (multi-page, PLN NP format) ──
function buildPrintableDoc(d, ctx) {
  const { unit, probis, owner, gdrivePath, qrSvg, steps, konten, logoB64, riskMatrixMap } = ctx;
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
@page{size:A4;margin:15mm 10mm 15mm 20mm}
@page:first{size:A4;margin:15mm 10mm 15mm 20mm}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Courier Prime','Courier New',Courier,monospace;font-size:10pt;line-height:1.5;color:#1a1a1a;background:#e2e8f0;-webkit-font-smoothing:antialiased}
.toolbar{position:fixed;top:0;left:0;right:0;background:#1a1f2e;color:#fff;padding:6px 16px;display:flex;align-items:center;gap:10px;z-index:9999;font-size:12px;box-shadow:0 2px 8px rgba(0,0,0,.3)}
.toolbar button{background:#2563EB;color:#fff;border:none;padding:5px 12px;border-radius:4px;font-size:11px;cursor:pointer;font-weight:600}
.toolbar button:hover{background:#1d4ed8}
.toolbar .btn-green{background:#16a34a}
.toolbar .btn-green:hover{background:#15803d}
.toolbar .btn-lite{background:#475569;font-weight:500}
.toolbar .btn-lite:hover{background:#334155}
.toolbar button:disabled{opacity:.6;cursor:default}
.toolbar .spacer{flex:1}
.toolbar .info{font-size:10px;color:#94a3b8;max-width:350px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}

/* Pages — consistent on screen & print */
.page-container{width:210mm;max-width:210mm;margin:50px auto 30px}
.page{padding:15mm 10mm 15mm 20mm;position:relative;min-height:297mm;width:210mm;background:#fff;box-shadow:0 1px 8px rgba(0,0,0,.12);margin-bottom:40px}
.page-break{page-break-before:always}
.page-top{padding-top:15mm}
.page-number{position:absolute;bottom:10mm;right:15mm;font-size:8pt;color:#666}

/* ── HALAMAN JUDUL (Cover) ── */
.cover{display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:297mm;width:210mm;padding:15mm 10mm 15mm 20mm;text-align:center;page-break-after:always}
.cover-label{font-size:18pt;font-weight:700;color:#000;letter-spacing:1.5px;margin-bottom:4px}
.cover-company{font-size:16pt;font-weight:700;color:#2A7489;margin-bottom:30px}
.cover-title-box{border:2px solid #2A7489;padding:20px 40px;margin-bottom:40px;min-width:80%}
.cover-title{font-size:16pt;font-weight:700;line-height:1.3;color:#2A7489}
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
table.tbl{width:100%;border-collapse:collapse;margin:6px 0 12px;font-size:9.5pt}
table.tbl th,table.tbl td{border:1px solid #000;padding:4px 8px;vertical-align:top}
table.tbl th{background:#D9E2F3;font-weight:700;text-align:center;font-size:9pt}
table.tbl td.no{text-align:center;width:30px}

/* Sections */
.sec-title{font-size:11pt;font-weight:700;margin:16px 0 6px;padding:4px 0;border-bottom:1.5px solid #000}
.sec-num{margin-right:8px}
.sub-title{font-weight:700;font-size:10pt;margin:10px 0 4px}
p.content{margin:4px 0 10px;text-align:justify;font-size:10pt}
ul.content-list{margin:4px 0 10px 20px;font-size:10pt}
ul.content-list li{margin-bottom:2px}
ol.step-list{margin:4px 0 10px 20px;font-size:10pt;counter-reset:stp}
ol.step-list li{margin-bottom:4px;padding-left:4px}

/* Step tables */
table.step-tbl td{white-space:pre-wrap;word-wrap:break-word}
table.step-tbl ul,table.step-tbl ol{margin:2px 0 2px 16px;padding:0}
table.step-tbl li{margin-bottom:1px}
.step-meta{color:#555;font-size:8.5pt}
.sec-content{margin:4px 0 12px;font-size:10pt;overflow-wrap:break-word;word-wrap:break-word;word-break:break-word;max-width:100%;overflow:hidden;text-align:justify}
.sec-content p,.sec-content div,.sec-content span,.sec-content li{max-width:100%!important;margin-left:0!important;margin-right:0!important;text-indent:0!important}
.sec-content ul,.sec-content ol{max-width:100%!important;margin-left:20px!important;margin-right:0!important;padding-left:0!important}
.sec-content table{max-width:100%!important;width:100%!important;table-layout:fixed}
.sec-content img{max-width:100%!important;height:auto!important}
.sec-content p.content{margin:4px 0}
.sec-content ul.content-list{margin:4px 0 8px 20px}

/* Screen/Print visibility */
.print-only{display:none}
.screen-only{display:block}

/* Screen page structure — paginated content pages must be exact A4 */
.page-hdr{margin-bottom:8px}
.page-body{flex:1;overflow:hidden}
.page-ftr{margin-top:auto;padding-top:6px}
.screen-only .content-page{height:297mm;min-height:297mm;max-height:297mm;display:flex;flex-direction:column;overflow:hidden}

/* Content page wrapper — repeating header & footer on print */
.content-wrap-table{width:100%;border-collapse:collapse;border:none;table-layout:fixed}
.content-wrap-table,.content-wrap-table thead,.content-wrap-table tbody,.content-wrap-table tfoot,.content-wrap-table tr,.content-thead-cell,.content-tbody-cell,.content-tfoot-cell{border:none;padding:0;margin:0}
.content-thead-cell{padding:0 0 8px 0;vertical-align:top;width:100%}
.content-tbody-cell{padding:0;vertical-align:top;overflow:hidden;word-wrap:break-word;width:100%}
.content-tfoot-cell{padding:8px 0 0;vertical-align:bottom;font-size:8pt;color:#666;text-align:center;border-top:0.5px solid #ccc;width:100%}

/* QR */
.qr-block{display:flex;align-items:flex-start;gap:16px;margin:16px 0;padding:14px;border:1.5px solid #ccc;border-radius:6px;background:#fafafa}
.qr-block svg{display:block}
.qr-block .qr-text{font-size:8.5pt;color:#333}
.qr-block .qr-text strong{font-size:9pt}
.footer-line{border-top:1px solid #ccc;padding-top:6px;font-size:7.5pt;color:#888;display:flex;justify-content:space-between;margin-top:20px}

/* ═══ PRINT — make screen & print identical, NO section leaks ═══ */
@media print{
  .no-print{display:none!important}
  .print-only{display:block!important}
  .screen-only{display:none!important}
  body{background:#fff;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  .page-container{margin:0;max-width:none}
  .page{box-shadow:none;margin:0;padding:0;min-height:auto}
  .page-break{page-break-before:always}
  .cover{min-height:auto;height:100vh;padding:0;page-break-after:always}
  .page-top{padding-top:0}
  .page-number{display:none}
  .content-wrap-table thead{display:table-header-group}
  .content-wrap-table tfoot{display:table-footer-group}
  .content-page{padding:0;min-height:auto;height:auto;max-height:none;overflow:visible}
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

  // ── COVER PAGE ──
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

  // ── Render attachment files (image previews + file list) ──
  function renderAttachments(list) {
    if (!Array.isArray(list) || !list.length) return '';
    let out = '<div class="attach-block" style="margin-top:10px">';
    out += '<div class="attach-caption" style="font-size:9pt;font-weight:700;color:#444;margin-bottom:6px">&#128206; Lampiran Dokumen:</div>';
    list.forEach((att, i) => {
      const name = escH(att.name || ('Lampiran ' + (i + 1)));
      const data = att.data || '';
      const sizeNum = parseInt(att.size) || 0;
      const sizeStr = sizeNum < 1024 ? sizeNum + ' B' : sizeNum < 1048576 ? (sizeNum / 1024).toFixed(1) + ' KB' : (sizeNum / 1048576).toFixed(1) + ' MB';
      const isImg = /^data:image\//i.test(data);
      const isPdf = /^data:application\/pdf/i.test(data);
      out += '<div class="attach-item" style="margin-bottom:10px;page-break-inside:avoid;border:1px solid #ddd;border-radius:4px;overflow:hidden">';
      out += `<div style="background:#f3f4f6;padding:5px 8px;font-size:8.5pt;color:#333;display:flex;justify-content:space-between;border-bottom:1px solid #e5e7eb"><span style="font-weight:600">${name}</span><span style="color:#777">${sizeStr}</span></div>`;
      if (isImg && data) {
        out += `<div style="padding:6px;text-align:center;background:#fff"><img src="${data}" alt="${name}" style="max-width:100%;max-height:240mm;height:auto;border:1px solid #eee"></div>`;
      } else if (isPdf && data) {
        // Embedded PDF viewer (screen); printed copy shows a note + link
        out += `<object data="${data}" type="application/pdf" class="screen-only" style="width:100%;height:300mm;border:0"></object>`;
        out += `<div class="print-only" style="padding:10px;font-size:8.5pt;color:#555">Dokumen PDF terlampir &mdash; lihat versi digital untuk isi lengkap. <a href="${data}" download="${name}">Unduh ${name}</a></div>`;
      } else if (data) {
        out += `<div style="padding:10px;font-size:8.5pt;color:#555">Berkas terlampir: <a href="${data}" download="${name}">${name}</a> (${sizeStr})</div>`;
      } else {
        out += `<div style="padding:10px;font-size:8.5pt;color:#999">${name} (${sizeStr}) &mdash; data tidak tersedia</div>`;
      }
      out += '</div>';
    });
    out += '</div>';
    return out;
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

  // PLN NP Risk Matrix for score/level lookup — from DB or fallback
  const _RM_FALLBACK = {
    '1-1':{s:1,l:'LOW',c:'#00B050'},'1-2':{s:5,l:'LOW',c:'#00B050'},'1-3':{s:10,l:'LOW TO MODERATE',c:'#92D050'},'1-4':{s:15,l:'MODERATE',c:'#FFFF00'},'1-5':{s:20,l:'HIGH',c:'#FF0000'},
    '2-1':{s:2,l:'LOW',c:'#00B050'},'2-2':{s:6,l:'LOW TO MODERATE',c:'#92D050'},'2-3':{s:8,l:'LOW TO MODERATE',c:'#92D050'},'2-4':{s:16,l:'MODERATE TO HIGH',c:'#FFC000'},'2-5':{s:21,l:'HIGH',c:'#FF0000'},
    '3-1':{s:3,l:'LOW',c:'#00B050'},'3-2':{s:8,l:'LOW TO MODERATE',c:'#92D050'},'3-3':{s:11,l:'MODERATE',c:'#FFFF00'},'3-4':{s:18,l:'MODERATE TO HIGH',c:'#FFC000'},'3-5':{s:23,l:'HIGH',c:'#FF0000'},
    '4-1':{s:4,l:'LOW',c:'#00B050'},'4-2':{s:9,l:'LOW TO MODERATE',c:'#92D050'},'4-3':{s:14,l:'MODERATE',c:'#FFFF00'},'4-4':{s:19,l:'MODERATE TO HIGH',c:'#FFC000'},'4-5':{s:24,l:'HIGH',c:'#FF0000'},
    '5-1':{s:7,l:'LOW TO MODERATE',c:'#92D050'},'5-2':{s:12,l:'MODERATE',c:'#FFFF00'},'5-3':{s:17,l:'MODERATE TO HIGH',c:'#FFC000'},'5-4':{s:22,l:'HIGH',c:'#FF0000'},'5-5':{s:25,l:'HIGH',c:'#FF0000'},
  };
  // Build RM from DB data if available
  const RM = {};
  if (riskMatrixMap && riskMatrixMap.matrix && riskMatrixMap.matrix.length) {
    for (const m of riskMatrixMap.matrix) RM[`${m.probability}-${m.impact}`] = {s:m.score, l:m.level, c:m.color};
  }
  const rmLookup = (p,d2) => RM[`${p}-${d2}`] || _RM_FALLBACK[`${p}-${d2}`] || {s:'-',l:'-',c:'#ccc'};

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
        const dtAttach = (sec.id === 'data_teknik') ? (d.attachments_data_teknik || []) : [];
        if (content || dtAttach.length || sec.id === 'tujuan' || sec.id === 'ruang_lingkup') {
          body += `<div class="sec-title"><span class="sec-num">${secNum}.</span>${secLabel}</div>
<div class="sec-content">${fmtContent(content)}${renderAttachments(dtAttach)}</div>`;
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
        const fmAttach = d.attachments_formulir || [];
        if (formulirContent || fmAttach.length) {
          body += `<div class="sec-title"><span class="sec-num">${secNum}.</span>${secLabel}</div>
<div class="sec-content">${fmtContent(formulirContent)}${renderAttachments(fmAttach)}</div>`;
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

  // ── PAGE 3+: Content pages with IMS header repeated ──
  // Screen: shows as multiple A4 "page cards" via JS pagination after load
  // Print: uses <table><thead>/<tfoot> trick for browser-native repeat
  const runFooter = `<div style="text-align:center;font-size:8pt;color:#666;padding-top:4px;border-top:0.5px solid #ccc">${nom} &mdash; Rev.${rev} &mdash; PT PLN Nusantara Power UP Brantas</div>`;

  // Print version (hidden on screen, shown on print) — uses table trick
  const printPage3 = `
<div class="print-only page-break content-page">
  <table class="content-wrap-table">
    <thead><tr><td class="content-thead-cell">${hdrTable}</td></tr></thead>
    <tfoot><tr><td class="content-tfoot-cell">${runFooter}</td></tr></tfoot>
    <tbody><tr><td class="content-tbody-cell">${body}</td></tr></tbody>
  </table>
</div>`;

  // Screen version (shown on screen, hidden on print) — paginated by JS
  const screenPage3 = `
<div class="screen-only" id="screen-content-pages">
  <div class="page page-break page-top content-page">
    <div class="page-hdr">${hdrTable}</div>
    <div class="page-body" id="content-body-source">${body}</div>
    <div class="page-ftr">${runFooter}</div>
  </div>
</div>`;

  // ── ASSEMBLE FULL DOCUMENT ──
  return `<!DOCTYPE html><html lang="id"><head><meta charset="UTF-8">
<title>${nom} &mdash; ${judul}</title>
<link href="https://fonts.googleapis.com/css2?family=Courier+Prime:wght@400;700&display=swap" rel="stylesheet">
<style>${css}</style>
</head><body>
<div class="toolbar no-print">
  <strong style="font-size:13px">${nom}</strong>
  <span style="color:#64748b;font-size:11px">${judul}</span>
  <span class="spacer"></span>
  <span class="info" title="${escH(gdrivePath)}">&#128193; GDrive: ${escH(gdrivePath)}</span>
  <button onclick="window.print()">&#128424; Cetak / PDF</button>
  <button class="btn-green" onclick="downloadDocxNative(this)">&#128196; Download Word (.docx)</button>
  <button class="btn-lite" onclick="downloadAsDoc()" title="Versi ringan (.doc) bila server tidak tersedia">.doc (cadangan)</button>
</div>
<div class="page-container">
  ${coverHtml}
  ${page2}
  ${printPage3}
  ${screenPage3}
</div>
<script>
// ── Primary: native .docx generated server-side (template-accurate, robust) ──
function downloadDocxNative(btn){
  var id = ${d.id};
  // Popup is about:blank → root-relative URLs cannot resolve. Use absolute app origin.
  var apiBase = '${location.origin}';
  var orig = btn ? btn.innerHTML : '';
  if(btn){ btn.disabled=true; btn.innerHTML='\\u23F3 Menyiapkan...'; }
  function restore(){ if(btn){ btn.disabled=false; btn.innerHTML=orig; } }
  fetch(apiBase+'/api/dokumen/'+id+'/docx',{credentials:'include'})
    .then(function(r){
      if(!r.ok) throw new Error('HTTP '+r.status);
      var fn='${nom}_Rev${rev}.docx';
      var cd=r.headers.get('Content-Disposition')||'';
      var m=cd.match(/filename="?([^"]+)"?/);
      if(m) fn=m[1];
      return r.blob().then(function(b){ return {blob:b, fn:fn}; });
    })
    .then(function(o){
      var a=document.createElement('a');
      a.href=URL.createObjectURL(o.blob);
      a.download=o.fn;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(function(){ URL.revokeObjectURL(a.href); },1500);
      restore();
    })
    .catch(function(e){
      restore();
      alert('Gagal mengunduh Word (.docx): '+e.message+'\\n\\nPastikan Anda masih login. Sebagai alternatif, gunakan tombol ".doc (cadangan)".');
    });
}

function downloadAsDoc(){
  // ═══════════════════════════════════════════════════════════════════
  // MSO-Specific Word Export — Linear Structure (No wrapper table)
  // All DOM manipulation first, then regex on innerHTML string
  // ═══════════════════════════════════════════════════════════════════

  // ── Step 1: Clone and extract content ──
  var tmp = document.querySelector('.page-container').cloneNode(true);
  // Remove screen-only elements (JS-paginated pages)
  var screenEls = tmp.querySelectorAll('.screen-only');
  for(var s=0;s<screenEls.length;s++) screenEls[s].parentNode.removeChild(screenEls[s]);
  // Show print-only elements
  var printEls = tmp.querySelectorAll('.print-only');
  for(var p=0;p<printEls.length;p++) printEls[p].style.display='block';

  // ── Step 1b: Remove PLN NP company branding from cover page ──
  var coverComp = tmp.querySelector('.cover-company');
  if(coverComp) coverComp.parentNode.removeChild(coverComp);

  // ── Step 1c: Center cover metadata table ──
  var coverMeta = tmp.querySelector('.cover-meta');
  if(coverMeta){
    coverMeta.style.cssText = 'width:100%;margin:0 auto 40pt;text-align:center';
    var metaTbl = coverMeta.querySelector('table');
    if(metaTbl){
      metaTbl.setAttribute('align','center');
      metaTbl.style.cssText = 'font-size:11pt;border-collapse:collapse;margin:0 auto';
    }
  }

  // ── Step 1d: Fix QR code image size for Word ──
  // QR is already a <img> with GIF data URL (generated by createDataURL)
  var qrImgs = tmp.querySelectorAll('.qr-block img');
  for(var qi=0;qi<qrImgs.length;qi++){
    qrImgs[qi].setAttribute('width','90');
    qrImgs[qi].setAttribute('height','90');
    qrImgs[qi].style.cssText = 'width:90pt;height:90pt';
  }

  // ── Step 1e: Restructure QR block as Word table (DOM-based) ──
  var qrBlock = tmp.querySelector('.qr-block');
  if(qrBlock){
    var qrTable = document.createElement('table');
    qrTable.style.cssText = 'width:100%;border:1.5pt solid #000;border-collapse:collapse;margin:14pt 0';
    var qrTr = document.createElement('tr');
    // QR code image cell
    var tdQr = document.createElement('td');
    tdQr.style.cssText = 'width:100pt;padding:8pt;border:none;vertical-align:top;text-align:center';
    var qrImg = qrBlock.querySelector('img');
    if(qrImg){ tdQr.appendChild(qrImg.cloneNode(true)); }
    // Text/description cell — preserve actual content
    var tdTxt = document.createElement('td');
    tdTxt.style.cssText = 'padding:8pt;border:none;vertical-align:top;font-size:9pt;color:#333';
    var qrText = qrBlock.querySelector('.qr-text');
    if(qrText){ tdTxt.innerHTML = qrText.innerHTML; }
    qrTr.appendChild(tdQr);
    qrTr.appendChild(tdTxt);
    qrTable.appendChild(qrTr);
    qrBlock.parentNode.replaceChild(qrTable, qrBlock);
  }

  // ── Step 1f: Fix logo images in ik-header ──
  var logoCells = tmp.querySelectorAll('.logo-cell img');
  for(var li=0;li<logoCells.length;li++){
    logoCells[li].setAttribute('width','48');
    logoCells[li].setAttribute('height','24');
    logoCells[li].style.cssText = 'width:48pt;height:24pt';
  }

  // ── Step 1g: Fix heatmap risk markers for Word ──
  // Find marker spans (14pt x 14pt inline-block) and simplify for Word
  var allTds = tmp.querySelectorAll('td');
  for(var ti=0;ti<allTds.length;ti++){
    var markerSpans = allTds[ti].querySelectorAll('span');
    for(var mi=0;mi<markerSpans.length;mi++){
      var ms = markerSpans[mi];
      if(ms.style.display==='inline-block' && ms.style.width==='14pt'){
        ms.style.display = '';
        ms.style.width = '';
        ms.style.height = '';
        ms.style.lineHeight = '';
        ms.style.padding = '1pt 4pt';
      }
    }
  }

  // ── Step 2: Extract content-wrap-table → LINEAR structure ──
  // This is CRITICAL: Word cannot handle all body content inside a single <td>
  var wrapTable = tmp.querySelector('.content-wrap-table');
  if(wrapTable){
    var parentEl = wrapTable.parentElement;
    var theadCell = wrapTable.querySelector('.content-thead-cell');
    var hdrHtml = theadCell ? theadCell.innerHTML : '';
    var tbodyCell = wrapTable.querySelector('.content-tbody-cell');
    var bodyHtml = tbodyCell ? tbodyCell.innerHTML : '';
    var tfootCell = wrapTable.querySelector('.content-tfoot-cell');
    var ftrHtml = tfootCell ? tfootCell.innerHTML : '';
    var linearDiv = document.createElement('div');
    linearDiv.className = 'content-page';
    linearDiv.innerHTML = hdrHtml + bodyHtml + ftrHtml;
    parentEl.replaceChild(linearDiv, wrapTable);
  }

  var c = tmp.innerHTML;

  // ── Step 5: Footer-line → Word table layout ──
  c = c.replace(/<div class="footer-line">([\\s\\S]*?)<\\/div>/gi, function(m, inner) {
    var spans = inner.match(/<span[^>]*>[\\s\\S]*?<\\/span>/gi) || [];
    if (spans.length >= 2) {
      return '<table style="width:100%;border-top:1pt solid #ccc;margin-top:16pt;border-collapse:collapse;mso-table-lspace:0;mso-table-rspace:0"><tr>' +
        '<td style="padding-top:6pt;font-size:7.5pt;color:#888;border:none;text-align:left">' + spans[0].replace(/<\\/?span[^>]*>/gi,'') + '</td>' +
        '<td style="padding-top:6pt;font-size:7.5pt;color:#888;border:none;text-align:right">' + spans[1].replace(/<\\/?span[^>]*>/gi,'') + '</td>' +
        '</tr></table>';
    }
    return m;
  });

  // ── Step 6: Heat Map — fix vertical text & flex layouts for Word ──
  // Replace writing-mode:vertical-lr;transform:rotate(180deg) with Word-compatible vertical text
  c = c.replace(/writing-mode\s*:\s*vertical-lr\s*;?\s*/gi, '');
  c = c.replace(/transform\s*:\s*rotate\([^)]*\)\s*;?\s*/gi, '');
  // Replace the Probabilitas vertical cell with Word MSO layout-flow
  c = c.replace(/>Probabilitas<\\/td>/gi, function(m) {
    return ' mso-tstyle-colband-size:0;layout-flow:vertical;mso-layout-flow-alt:bottom-to-top">Probabilitas</td>';
  });

  // Heat map cell colors: add mso-pattern for Word color preservation (skip if already present)
  c = c.replace(/(<td[^>]*style="[^"]*)(background:\s*#[0-9A-Fa-f]{3,8})([^"]*")/gi, function(m, pre, bg, post) {
    // Skip if mso-pattern already exists in this style
    if ((pre + bg + post).indexOf('mso-pattern') >= 0) return m;
    var hex = bg.replace(/background\s*:\s*/i, '');
    return pre + bg + ';mso-pattern:auto none;background-color:' + hex + post;
  });

  // Heat map markers: replace inline-flex with inline-block for Word
  c = c.replace(/display\s*:\s*inline-flex\s*;?/gi, 'display:inline-block;');
  // Flex container for markers → normal text flow
  c = c.replace(/display\s*:\s*flex\s*;?\s*gap\s*:\s*2px\s*;?\s*justify-content\s*:\s*center\s*;?\s*flex-wrap\s*:\s*wrap\s*;?/gi,
    'text-align:center;');

  // ── Step 7: Remove remaining CSS Word doesn't support ──
  c = c.replace(/display\s*:\s*(flex|grid|inline-flex|inline-grid)\s*;?/gi, '');
  c = c.replace(/flex[\w-]*\s*:\s*[^;"']*;?/gi, '');
  c = c.replace(/gap\s*:\s*[^;"']*;?/gi, '');
  c = c.replace(/align-items\s*:\s*[^;"']*;?/gi, '');
  c = c.replace(/justify-content\s*:\s*[^;"']*;?/gi, '');
  c = c.replace(/align-self\s*:\s*[^;"']*;?/gi, '');
  c = c.replace(/grid[\w-]*\s*:\s*[^;"']*;?/gi, '');
  c = c.replace(/border-radius\s*:\s*[^;"']*;?/gi, '');
  c = c.replace(/box-shadow\s*:\s*[^;"']*;?/gi, '');
  c = c.replace(/transition\s*:\s*[^;"']*;?/gi, '');
  c = c.replace(/opacity\s*:\s*[^;"']*;?/gi, '');
  c = c.replace(/cursor\s*:\s*pointer\s*;?/gi, '');
  c = c.replace(/-webkit-[^;"':]+:\s*[^;"']*;?/gi, '');
  c = c.replace(/word-break\s*:\s*break-all\s*;?/gi, 'word-wrap:break-word;');
  c = c.replace(/overflow-wrap\s*:\s*break-word\s*;?/gi, '');

  // ── Step 7b: Fix heat map risk markers for Word ──
  // Word ignores display:inline-block with explicit width/height on spans.
  // Convert to simple bordered spans with padding that Word renders correctly.
  c = c.replace(/display:inline-block;width:14pt;height:14pt;/g, '');
  c = c.replace(/line-height:14pt;/g, 'padding:1pt 4pt;');

  // ── Step 8: Fix images — fixed dimensions for Word ──
  // First: fix logo images inside .logo-cell parent
  c = c.replace(/<td[^>]*class="[^"]*logo-cell[^"]*"[^>]*>\\s*(<img[^>]*>)/gi, function(m, imgTag) {
    var cleanImg = imgTag.replace(/style="[^"]*"/gi,'').replace(/\\s+width="[^"]*"/gi,'').replace(/\\s+height="[^"]*"/gi,'');
    return m.replace(imgTag, cleanImg.replace(/<img/i, '<img width="48" height="24" style="width:48pt;height:24pt"'));
  });
  // Then: fix remaining images
  c = c.replace(/<img([^>]*)>/gi, function(m, attrs) {
    // Skip already-fixed logo images
    if (attrs.indexOf('width:48pt') >= 0) return m;
    // Signature images: fix to 50pt
    if (attrs.indexOf('max-height:50px') >= 0 || attrs.indexOf('max-height:50pt') >= 0) {
      return '<img' + attrs.replace(/style="[^"]*"/gi,'') + ' width="80" height="40" style="width:80pt;height:40pt">';
    }
    // Other images: constrain max width
    if (attrs.indexOf('width') < 0) {
      return '<img' + attrs + ' style="width:auto;height:auto;max-width:450pt">';
    }
    return m;
  });

  // ── Step 8b: Sanitize user content (rich-text from copy-paste) ──
  // Remove Angular/framework elements from web copy-paste
  c = c.replace(/<source-footnote[^>]*>[\\s\\S]*?<\\/source-footnote>/gi, '');
  c = c.replace(/<sources-carousel-inline[^>]*>[\\s\\S]*?<\\/sources-carousel-inline>/gi, '');
  c = c.replace(/<source-inline-chip[^>]*>[\\s\\S]*?<\\/source-inline-chip>/gi, '');
  // Remove data-* and _ng* attributes
  c = c.replace(/\\s+(data-[a-z][a-z0-9-]*)="[^"]*"/gi, '');
  c = c.replace(/\\s+(_ng[a-z][a-z0-9-]*)="[^"]*"/gi, '');
  c = c.replace(/\\s+ng-version="[^"]*"/gi, '');
  c = c.replace(/\\s+id="p-rc_[^"]*"/gi, '');
  // Remove empty HTML comments (<!---->)
  c = c.replace(/<![-]+>/g, '');
  // Remove broken Google Sans styles
  c = c.replace(/style="Google Sans Text[^"]*"/gi, '');
  // Remove empty <span> and <sup> tags
  c = c.replace(/<sup[^>]*>\\s*<\\/sup>/gi, '');
  c = c.replace(/<span[^>]*>\\s*<\\/span>/gi, '');

  // Remove editor artifacts
  c = c.replace(/<div[^>]*class="rte-img-toolbar"[^>]*>[\\s\\S]*?<\\/div>/gi, '');
  c = c.replace(/outline\s*:\s*[^;"']*;?/gi, '');
  c = c.replace(/outline-offset\s*:\s*[^;"']*;?/gi, '');
  // Clean leftover empty styles
  c = c.replace(/style="\s*;?\s*"/gi, '');
  // Remove user-select MSO pasted content
  c = c.replace(/tab-stops\s*:\s*[^;"']*;?/gi, '');

  // ── Step 9: MSO Word metadata ──
  var wordMeta = '<!--[if gte mso 9]><xml><w:WordDocument>' +
    '<w:View>Print<\\/w:View><w:Zoom>100<\\/w:Zoom>' +
    '<w:SpellingState>Clean<\\/w:SpellingState><w:GrammarState>Clean<\\/w:GrammarState>' +
    '<w:TrackMoves>false<\\/w:TrackMoves><w:TrackFormatting/>' +
    '<w:HyphenationZone>21<\\/w:HyphenationZone>' +
    '<w:DoNotOptimizeForBrowser/>' +
    '<w:AllowPNG/>' +
    '<\\/w:WordDocument><\\/xml><![endif]-->' +
    '<!--[if gte mso 9]><xml><w:LatentStyles DefLockedState="false" DefUnhideWhenUsed="false" DefSemiHidden="false" DefQFormat="false" DefPriority="99"/><\\/xml><![endif]-->';

  // ── Step 10: MSO-Specific CSS ──
  var docCss =
    /* ── Page geometry ── */
    '@page WordSection1{size:210mm 297mm;margin:15mm 10mm 15mm 20mm;mso-header-margin:5mm;mso-footer-margin:5mm}' +
    'div.WordSection1{page:WordSection1}' +
    /* ── Base typography ── */
    'body{font-family:"Courier New",Courier,monospace;font-size:10pt;line-height:1.5;color:#1a1a1a;background:#fff;margin:0;padding:0}' +
    /* ── Global table rules ── */
    'table{border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt}' +
    'td,th{mso-line-height-rule:exactly}' +
    /* ── Hide toolbar ── */
    '.toolbar,.no-print,.screen-only{display:none!important}' +
    /* ── Page structure ── */
    '.page-container{margin:0;padding:0}' +
    '.page{margin:0;padding:0;border:none;box-shadow:none;min-height:auto;max-height:none;height:auto;overflow:visible;background:#fff}' +
    '.page-break{page-break-before:always;mso-break-type:section-break}' +
    '.page-top{padding-top:0}' +
    /* ── Cover page ── */
    '.cover{page-break-after:always;min-height:auto;height:auto;padding:30mm 20mm;text-align:center;max-height:none;overflow:visible}' +
    '.cover-label{font-size:16pt;font-weight:bold;margin-bottom:4pt;letter-spacing:2pt}' +
    '.cover-company{font-size:14pt;font-weight:bold;color:#0066B3;margin-bottom:40pt}' +
    '.cover-title-box{border:2pt solid #000;padding:15pt 30pt;margin:0 auto 40pt;text-align:center;mso-element:para-border-div}' +
    '.cover-title{font-size:16pt;font-weight:bold;line-height:1.3}' +
    '.cover-meta{width:100%;margin:0 auto 40pt;text-align:center}' +
    '.cover-meta table{font-size:11pt;border-collapse:collapse;margin:0 auto}' +
    '.cover-meta td{padding:4pt 4pt;vertical-align:top;border:none;text-align:left}' +
    /* ── Signature table ── */
    '.sig-table{width:100%;border-collapse:collapse;margin-top:30pt;mso-pagination:lines-together}' +
    '.sig-table td{border:1pt solid #999;padding:6pt 8pt;text-align:center;font-size:9pt;vertical-align:top;mso-pattern:auto none;background-color:#f0f0f0}' +
    '.sig-label{font-weight:bold;font-size:10pt;display:block;margin-bottom:50pt}' +
    '.sig-name{font-weight:bold;border-top:1pt solid #000;display:inline-block;padding-top:4pt;min-width:120pt;margin-top:50pt}' +
    '.sig-pos{font-size:8pt;color:#555;margin-top:2pt}' +
    /* ── Content page (linear, no wrapper table) ── */
    '.content-page{padding:0;min-height:auto;height:auto;max-height:none;overflow:visible}' +
    /* ── IK Header (kop dokumen) — repeatable via <thead> ── */
    '.ik-header{width:100%;border-collapse:collapse;border:1.5pt solid #000;margin-bottom:6pt;font-size:9pt;mso-table-lspace:0pt;mso-table-rspace:0pt}' +
    '.ik-header td{border:1pt solid #000;padding:3pt 8pt;vertical-align:middle}' +
    '.ik-header .logo-cell{width:50pt;text-align:center;padding:3pt 6pt}' +
    '.ik-header .logo-cell img{width:48pt;height:24pt}' +
    '.ik-header .company-cell{font-weight:bold;font-size:9.5pt;text-align:center}' +
    '.ik-header .title-cell{font-weight:bold;font-size:9.5pt;text-align:center}' +
    '.ik-header .label-cell{font-weight:bold;width:85pt;font-size:8.5pt;white-space:nowrap}' +
    '.ik-header .value-cell{font-size:9pt}' +
    /* ── Content tables (tbl) ── */
    'table.tbl{width:100%;border-collapse:collapse;margin:6pt 0 12pt;font-size:9.5pt;mso-table-lspace:0pt;mso-table-rspace:0pt}' +
    'table.tbl th,table.tbl td{border:1pt solid #000;padding:3pt 6pt;vertical-align:top}' +
    'table.tbl th{background-color:#D9E2F3;mso-pattern:auto none;font-weight:bold;text-align:center;font-size:9pt}' +
    'table.tbl td.no{text-align:center;width:25pt}' +
    'table.tbl thead tr{mso-header-row-yes:yes}' +
    'table.tbl tr{mso-pagination:lines-together}' +
    /* ── Section titles (anti-orphan) ── */
    '.sec-title{font-size:11pt;font-weight:bold;margin:14pt 0 6pt;padding:3pt 0;border-bottom:1.5pt solid #000;mso-pagination:lines-together;page-break-after:avoid}' +
    '.sec-num{margin-right:6pt}' +
    '.sub-title{font-weight:bold;font-size:10pt;margin:8pt 0 4pt;mso-pagination:lines-together;page-break-after:avoid}' +
    /* ── Content typography ── */
    'p.content{margin:4pt 0 8pt;text-align:justify;font-size:10pt}' +
    'ul.content-list{margin:4pt 0 8pt 20pt;font-size:10pt}' +
    'ul.content-list li{margin-bottom:2pt}' +
    'ol.step-list{margin:4pt 0 8pt 20pt;font-size:10pt}' +
    'ol.step-list li{margin-bottom:3pt;padding-left:4pt}' +
    '.sec-content{margin:4pt 0 12pt;font-size:10pt;mso-pagination:widow-orphan}' +
    '.sec-content p,.sec-content div,.sec-content span,.sec-content li{margin-left:0!important;margin-right:0!important;text-indent:0!important}' +
    '.sec-content ul,.sec-content ol{margin-left:20pt!important;padding-left:0!important}' +
    '.sec-content table{width:100%!important}' +
    '.sec-content img{max-width:450pt}' +
    /* ── QR block ── */
    '.qr-block{margin:14pt 0;mso-pagination:lines-together;page-break-inside:avoid}' +
    '.qr-block td{border:none;padding:6pt;vertical-align:top}' +
    '.qr-block .qr-text{font-size:8.5pt;color:#333}' +
    /* ── Images — fixed dimensions ── */
    'img{mso-width-source:userset;mso-height-source:userset}' +
    /* ── Heat Map colors ── */
    'td[style*="background"]{mso-pattern:auto none}';

  // ── Step 11: Assemble final .doc HTML ──
  var h='<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns:v="urn:schemas-microsoft-com:vml" xmlns="http://www.w3.org/TR/REC-html40">' +
    '<head><meta charset="utf-8"><meta http-equiv="Content-Type" content="text/html; charset=utf-8">' + wordMeta +
    '<style>' + docCss + '<\\/style></head><body><div class="WordSection1">' + c + '</div></body></html>';
  var b=new Blob(['\\ufeff'+h],{type:'application/msword;charset=utf-8'});
  var a=document.createElement('a');a.href=URL.createObjectURL(b);a.download='${nom}.doc';a.click();URL.revokeObjectURL(a.href);
}
<\/script>
<script>
// ── Screen Pagination: break content into visual A4 page cards ──
document.addEventListener('DOMContentLoaded', function(){
  var src = document.getElementById('content-body-source');
  var wrap = document.getElementById('screen-content-pages');
  if(!src || !wrap) return;

  // Get header and footer HTML from the first page
  var firstPage = wrap.querySelector('.content-page');
  if(!firstPage) return;
  var hdrEl = firstPage.querySelector('.page-hdr');
  var ftrEl = firstPage.querySelector('.page-ftr');
  var hdrHtml = hdrEl ? hdrEl.outerHTML : '';
  var ftrHtml = ftrEl ? ftrEl.outerHTML : '';

  // ── DYNAMIC measurement: measure actual header/footer heights ──
  // Create a hidden measuring page with identical styling
  var measurePage = document.createElement('div');
  measurePage.className = 'page page-break page-top content-page';
  measurePage.style.cssText = 'position:absolute;left:-9999px;top:0;visibility:hidden;height:297mm;width:210mm;display:flex;flex-direction:column;overflow:hidden;padding:15mm 10mm 15mm 20mm;box-sizing:border-box';
  measurePage.innerHTML = hdrHtml + '<div class="page-body" style="flex:1;overflow:hidden"></div>' + ftrHtml;
  document.body.appendChild(measurePage);

  // Measure actual rendered heights
  var mHdr = measurePage.querySelector('.page-hdr');
  var mFtr = measurePage.querySelector('.page-ftr');
  var mBody = measurePage.querySelector('.page-body');
  var HDR_H = mHdr ? mHdr.getBoundingClientRect().height : 70;
  var FTR_H = mFtr ? mFtr.getBoundingClientRect().height : 30;

  // A4 content area = 297mm - 15mm(top padding) - 15mm(bottom padding) = 267mm
  // Convert: 1mm at 96dpi = 3.7795px
  var CONTENT_H = 267 * 3.7795; // ≈1009px
  // Usable body = content area - header - header margin-bottom(8px) - footer - footer padding-top(6px) - safety(12px)
  var BODY_H = CONTENT_H - HDR_H - 8 - FTR_H - 6 - 12;
  document.body.removeChild(measurePage);

  // Helper: get full element height including margins
  function fullHeight(el){
    var style = window.getComputedStyle(el);
    var h = el.getBoundingClientRect().height;
    h += parseFloat(style.marginTop) || 0;
    h += parseFloat(style.marginBottom) || 0;
    return h;
  }

  // Collect all direct children of the source body
  var children = Array.prototype.slice.call(src.children);
  if(!children.length) return;

  // Create pages
  var pages = [];
  var currentBody = document.createElement('div');
  currentBody.className = 'page-body';
  var currentH = 0;

  function newPage(){
    var pg = document.createElement('div');
    pg.className = 'page page-break page-top content-page';
    pg.innerHTML = hdrHtml;
    pg.appendChild(currentBody);
    var ftr = document.createElement('div');
    ftr.innerHTML = ftrHtml;
    pg.appendChild(ftr.firstElementChild || ftr);
    pages.push(pg);
    currentBody = document.createElement('div');
    currentBody.className = 'page-body';
    currentH = 0;
  }

  for(var i=0; i<children.length; i++){
    var el = children[i];
    var clone = el.cloneNode(true);
    // Temporarily add to DOM to measure (inside correct layout context)
    currentBody.appendChild(clone);
    src.appendChild(currentBody);
    var elH = fullHeight(clone);
    src.removeChild(currentBody);

    if(currentH > 0 && (currentH + elH) > BODY_H){
      // Remove the clone from current, start new page
      currentBody.removeChild(clone);
      newPage();
      currentBody.appendChild(clone);
      currentH = elH;
    } else {
      currentH += elH;
    }
  }
  // Flush last page
  if(currentBody.children.length > 0){
    newPage();
  }

  // Replace original content
  wrap.innerHTML = '';
  for(var p=0; p<pages.length; p++){
    wrap.appendChild(pages[p]);
  }
});
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
        <button class="nav-item" onclick="showPage('master-data')"><span class="nav-icon">${icon('database', 16)}</span><span class="nav-label">Master Data</span></button>
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
