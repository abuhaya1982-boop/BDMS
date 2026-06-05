// Buat IK — Template-Driven WYSIWYG Editor
let editingDocId = null, pendingEditId = null;
let activeTemplate = null, activeTemplateSections = [];
let _tplLoadedAt = 0; // timestamp when template was loaded into this form

// ═══════════════════════════════════════════════
// RICH TEXT TOOLBAR — lightweight contenteditable
// ═══════════════════════════════════════════════
function richTextToolbar(editorId, opts = {}) {
  const showAttach = opts.showAttachment || false;
  return `<div class="rte-toolbar" data-for="${editorId}">
    <button type="button" class="rte-btn" onclick="rteCmd('${editorId}','bold')" title="Bold"><b>B</b></button>
    <button type="button" class="rte-btn" onclick="rteCmd('${editorId}','italic')" title="Italic"><i>I</i></button>
    <button type="button" class="rte-btn" onclick="rteCmd('${editorId}','underline')" title="Underline"><u>U</u></button>
    <span class="rte-sep"></span>
    <button type="button" class="rte-btn" onclick="rteCmd('${editorId}','justifyLeft')" title="Rata Kiri">&#8676;</button>
    <button type="button" class="rte-btn" onclick="rteCmd('${editorId}','justifyCenter')" title="Rata Tengah">&#8596;</button>
    <button type="button" class="rte-btn" onclick="rteCmd('${editorId}','justifyRight')" title="Rata Kanan">&#8677;</button>
    <button type="button" class="rte-btn" onclick="rteCmd('${editorId}','justifyFull')" title="Rata Kanan-Kiri">&#9776;</button>
    <span class="rte-sep"></span>
    <select class="rte-select" onchange="rteLineSpacing('${editorId}', this.value)" title="Spasi Baris">
      <option value="">Spasi</option>
      <option value="1">1.0</option>
      <option value="1.15">1.15</option>
      <option value="1.5">1.5</option>
      <option value="2">2.0</option>
    </select>
    <span class="rte-sep"></span>
    <button type="button" class="rte-btn" onclick="rteCmd('${editorId}','insertUnorderedList')" title="Bullet List">&#8226;</button>
    <button type="button" class="rte-btn" onclick="rteCmd('${editorId}','insertOrderedList')" title="Numbered List">1.</button>
    <span class="rte-sep"></span>
    <button type="button" class="rte-btn" onclick="rteInsertLocalImage('${editorId}')" title="Sisipkan Gambar">&#128247;</button>
    ${showAttach ? `<button type="button" class="rte-btn" onclick="rteAttachFile('${editorId}')" title="Lampirkan File">&#128206;</button>` : ''}
    <span class="rte-sep"></span>
    <span class="rte-img-controls" id="imgCtrl-${editorId}" style="display:none">
      <span class="rte-img-toolbar-label">Gambar:</span>
      <select class="rte-select" onchange="rteImgResize(this.value)" title="Ukuran Gambar">
        <option value="100%">100%</option>
        <option value="75%">75%</option>
        <option value="50%">50%</option>
        <option value="25%">25%</option>
      </select>
      <button type="button" class="rte-btn" onclick="rteImgAlign('left')" title="Gambar Rata Kiri">&#8676;&#128248;</button>
      <button type="button" class="rte-btn" onclick="rteImgAlign('center')" title="Gambar Rata Tengah">&#8596;&#128248;</button>
      <button type="button" class="rte-btn" onclick="rteImgAlign('right')" title="Gambar Rata Kanan">&#128248;&#8677;</button>
      <button type="button" class="rte-btn rte-btn-danger" onclick="rteImgDelete()" title="Hapus Gambar">&#128465;</button>
    </span>
  </div>
  <div class="rte-editor" id="${editorId}" contenteditable="true" data-placeholder="Ketik di sini..." onclick="rteEditorClick(event,'${editorId}')"></div>
  ${showAttach ? `<div class="rte-attachments" id="attach-${editorId}"></div>` : ''}`;
}

function rteCmd(editorId, cmd, val) {
  const el = document.getElementById(editorId);
  if (el) el.focus();
  document.execCommand(cmd, false, val || null);
}

function rteLineSpacing(editorId, val) {
  if (!val) return;
  const el = document.getElementById(editorId);
  if (!el) return;
  el.focus();
  const sel = window.getSelection();
  if (!sel.rangeCount) return;
  // Apply to the parent block
  let node = sel.anchorNode;
  while (node && node !== el && node.nodeType !== 1) node = node.parentNode;
  if (node && node !== el) {
    node.style.lineHeight = val;
  } else {
    // No specific block selected — apply to whole editor
    el.style.lineHeight = val;
  }
}

function rteInsertLocalImage(editorId) {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.onchange = function(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { showToast('Gambar terlalu besar (max 5MB)', 'error'); return; }
    const reader = new FileReader();
    reader.onload = function(ev) {
      const el = document.getElementById(editorId);
      if (el) {
        el.focus();
        document.execCommand('insertHTML', false,
          `<img src="${ev.target.result}" style="max-width:100%;width:100%;height:auto;border-radius:4px;margin:4px 0;cursor:pointer" />`
        );
        // Auto-select the newly inserted image
        setTimeout(() => {
          const imgs = el.querySelectorAll('img');
          if (imgs.length) rteSelectImage(imgs[imgs.length - 1], editorId);
        }, 50);
      }
    };
    reader.readAsDataURL(file);
  };
  input.click();
}

// ── Image Selection & Controls (integrated in main toolbar) ──
let _rteSelectedImg = null;
let _rteSelectedImgEditor = null;

function rteEditorClick(e, editorId) {
  if (e.target.tagName === 'IMG') {
    rteSelectImage(e.target, editorId);
  } else {
    rteDeselectImage();
  }
}

function rteSelectImage(img, editorId) {
  rteDeselectImage();
  _rteSelectedImg = img;
  _rteSelectedImgEditor = editorId;
  img.style.outline = '2px solid #2D5F8B';
  img.style.outlineOffset = '2px';
  // Show image controls in toolbar
  const ctrl = document.getElementById('imgCtrl-' + editorId);
  if (ctrl) {
    ctrl.style.display = 'inline-flex';
    // Sync size dropdown
    const sel = ctrl.querySelector('select');
    if (sel) sel.value = img.style.width || '100%';
  }
}

function rteDeselectImage() {
  if (_rteSelectedImg) {
    _rteSelectedImg.style.outline = '';
    _rteSelectedImg.style.outlineOffset = '';
  }
  if (_rteSelectedImgEditor) {
    const ctrl = document.getElementById('imgCtrl-' + _rteSelectedImgEditor);
    if (ctrl) ctrl.style.display = 'none';
  }
  _rteSelectedImg = null;
  _rteSelectedImgEditor = null;
}

function rteImgResize(pct) {
  if (!_rteSelectedImg) return;
  _rteSelectedImg.style.width = pct;
  _rteSelectedImg.style.maxWidth = pct;
  _rteSelectedImg.style.height = 'auto';
}

function rteImgAlign(dir) {
  if (!_rteSelectedImg) return;
  _rteSelectedImg.style.cssFloat = '';
  _rteSelectedImg.style.marginLeft = '';
  _rteSelectedImg.style.marginRight = '';
  _rteSelectedImg.style.display = '';
  if (dir === 'center') {
    _rteSelectedImg.style.display = 'block';
    _rteSelectedImg.style.marginLeft = 'auto';
    _rteSelectedImg.style.marginRight = 'auto';
    _rteSelectedImg.style.cssFloat = 'none';
  } else if (dir === 'right') {
    _rteSelectedImg.style.cssFloat = 'right';
    _rteSelectedImg.style.marginLeft = '8px';
    _rteSelectedImg.style.marginBottom = '4px';
  } else {
    _rteSelectedImg.style.cssFloat = 'left';
    _rteSelectedImg.style.marginRight = '8px';
    _rteSelectedImg.style.marginBottom = '4px';
  }
  showToast('Posisi gambar: ' + (dir === 'center' ? 'Tengah' : dir === 'right' ? 'Kanan' : 'Kiri'), 'success');
}

function rteImgDelete() {
  if (!_rteSelectedImg) return;
  _rteSelectedImg.remove();
  rteDeselectImage();
  showToast('Gambar dihapus', 'info');
}

// Deselect image when clicking outside editor
document.addEventListener('click', function(e) {
  if (_rteSelectedImg && !e.target.closest('.rte-toolbar') && !e.target.closest('.rte-editor') && e.target.tagName !== 'IMG') {
    rteDeselectImage();
  }
});

// File attachment for Formulir & Data Teknik
function rteAttachFile(editorId) {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.png,.jpeg,.gif,.zip,.rar';
  input.multiple = true;
  input.onchange = function(e) {
    const files = Array.from(e.target.files);
    const container = document.getElementById('attach-' + editorId);
    if (!container) return;
    files.forEach(file => {
      if (file.size > 10 * 1024 * 1024) { showToast(`${file.name}: max 10MB`, 'error'); return; }
      const reader = new FileReader();
      reader.onload = function(ev) {
        const id = 'att-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6);
        const ext = file.name.split('.').pop().toLowerCase();
        const iconMap = {pdf:'file-text',doc:'file-text',docx:'file-text',xls:'table',xlsx:'table',ppt:'presentation',pptx:'presentation',zip:'archive',rar:'archive'};
        const fileIcon = iconMap[ext] || 'paperclip';
        const sizeStr = file.size < 1024 ? file.size + ' B' : file.size < 1024*1024 ? (file.size/1024).toFixed(1) + ' KB' : (file.size/1024/1024).toFixed(1) + ' MB';
        container.insertAdjacentHTML('beforeend', `
          <div class="rte-attach-item" id="${id}" data-name="${esc(file.name)}" data-size="${file.size}" data-b64="${ev.target.result}">
            <span class="rte-attach-icon">${icon(fileIcon, 14)}</span>
            <span class="rte-attach-name">${esc(file.name)}</span>
            <span class="rte-attach-size">${sizeStr}</span>
            <button type="button" class="rte-attach-remove" onclick="document.getElementById('${id}').remove()" title="Hapus">${icon('x', 12)}</button>
          </div>`);
        renderIcons();
      };
      reader.readAsDataURL(file);
    });
  };
  input.click();
}

function collectAttachments(editorId) {
  const container = document.getElementById('attach-' + editorId);
  if (!container) return [];
  return Array.from(container.querySelectorAll('.rte-attach-item')).map(el => ({
    name: el.dataset.name || '',
    size: parseInt(el.dataset.size) || 0,
    data: el.dataset.b64 || '',
  }));
}

function loadAttachments(editorId, attachments) {
  const container = document.getElementById('attach-' + editorId);
  if (!container || !attachments || !attachments.length) return;
  attachments.forEach(att => {
    const id = 'att-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6);
    const ext = (att.name || '').split('.').pop().toLowerCase();
    const iconMap = {pdf:'file-text',doc:'file-text',docx:'file-text',xls:'table',xlsx:'table'};
    const fileIcon = iconMap[ext] || 'paperclip';
    const sizeStr = att.size < 1024 ? att.size + ' B' : att.size < 1024*1024 ? (att.size/1024).toFixed(1) + ' KB' : (att.size/1024/1024).toFixed(1) + ' MB';
    container.insertAdjacentHTML('beforeend', `
      <div class="rte-attach-item" id="${id}" data-name="${esc(att.name)}" data-size="${att.size}" data-b64="${att.data || ''}">
        <span class="rte-attach-icon">${icon(fileIcon, 14)}</span>
        <span class="rte-attach-name">${esc(att.name)}</span>
        <span class="rte-attach-size">${sizeStr}</span>
        <button type="button" class="rte-attach-remove" onclick="document.getElementById('${id}').remove()" title="Hapus">${icon('x', 12)}</button>
      </div>`);
  });
  renderIcons();
}

function getRteContent(editorId) {
  const el = document.getElementById(editorId);
  return el ? el.innerHTML.trim() : '';
}

function setRteContent(editorId, html) {
  const el = document.getElementById(editorId);
  if (el) el.innerHTML = html || '';
}

function editDokumen(id) { pendingEditId = id; showPage('buat-ik'); }

const IK = { nomorDokumen: '' };

// ═══════════════════════════════════════════════
// GENERIC TEMPLATE-DRIVEN SECTION RENDERERS
// ═══════════════════════════════════════════════
// These render sections based on template config (label, type, columns)
// instead of hardcoded function per section ID.

function renderGenericRichtext(section) {
  const editorId = 'rte-' + section.id;
  const needsAttach = ['formulir', 'data_teknik'].includes(section.id);
  return `<div class="doc-section-title" style="margin-top:22px">${esc(section.label)}</div>
  ${needsAttach ? '<div style="font-size:10px;color:#9E9A93;margin-bottom:4px;display:flex;align-items:center;gap:4px">' + icon('paperclip', 11) + ' Gunakan tombol &#128206; untuk melampirkan file referensi</div>' : ''}
  <div class="rte-wrap">
    ${richTextToolbar(editorId, { showAttachment: needsAttach })}
  </div>`;
}

function renderGenericTextarea(section) {
  const fieldId = 'f-' + section.id;
  return `<div class="doc-section-title" style="margin-top:22px">${esc(section.label)}</div>
  <textarea class="inline-textarea typewriter" id="${fieldId}" rows="4" placeholder="Ketik ${section.label.toLowerCase()}..." style="width:100%;font-size:12px;min-height:60px"></textarea>`;
}

function renderGenericTable(section) {
  const tbodyId = 'tbody-' + section.id;
  const cols = section.columns || ['Isi'];
  const hasNum = cols.length > 1;
  const tableId = 'table-' + section.id;

  let headerRow = '';
  if (hasNum) headerRow += `<td style="font-size:10px;font-weight:600;padding:4px 8px;font-family:'Inter',sans-serif;width:40px;text-align:center">No</td>`;
  cols.forEach(c => {
    headerRow += `<td style="font-size:10px;font-weight:600;padding:4px 8px;font-family:'Inter',sans-serif">${esc(c)}</td>`;
  });
  headerRow += `<td style="width:28px"></td>`;

  let firstRow = '';
  if (hasNum) firstRow += `<td style="text-align:center;font-size:11px">1</td>`;
  cols.forEach(c => {
    firstRow += `<td><input class="inline-input typewriter" placeholder="${esc(c)}" style="font-size:12px;width:100%"></td>`;
  });
  firstRow += `<td style="padding:0;position:relative"><div class="step-actions" style="display:flex;position:static;transform:none"><button onclick="delDynRow(this, '${tbodyId}')" title="Hapus">${icon('x', 13)}</button></div></td>`;

  return `
  <div class="doc-section-title" style="margin-top:22px">${esc(section.label)}</div>
  <div class="doc-table-tools">
    <button class="btn-table-tool" onclick="addDynRow('${tbodyId}', ${JSON.stringify(cols).replace(/"/g, '&quot;')}, ${hasNum})" title="Tambah Baris">${icon('plus', 12)} Baris</button>
    <button class="btn-table-tool" onclick="tableMergeCells('${tbodyId}')" title="Gabung sel terpilih">${icon('columns-3', 12)} Merge</button>
    <button class="btn-table-tool" onclick="tableUnmergeCells('${tbodyId}')" title="Pisah sel">${icon('split', 12)} Unmerge</button>
  </div>
  <div class="doc-table-wrap"><table id="${tableId}"><thead><tr style="background:#F0EFEA">${headerRow}</tr></thead>
    <tbody id="${tbodyId}"><tr>${firstRow}</tr></tbody>
  </table></div>`;
}

// Dynamic table row add/delete
function addDynRow(tbodyId, cols, hasNum) {
  const tb = document.getElementById(tbodyId);
  if (!tb) return;
  const no = tb.children.length + 1;
  const tr = document.createElement('tr');
  let html = '';
  if (hasNum) html += `<td style="text-align:center;font-size:11px">${no}</td>`;
  cols.forEach(c => {
    html += `<td><input class="inline-input typewriter" placeholder="${esc(c)}" style="font-size:12px;width:100%"></td>`;
  });
  html += `<td style="padding:0;position:relative"><div class="step-actions" style="display:flex;position:static;transform:none"><button onclick="delDynRow(this, '${tbodyId}')" title="Hapus">${icon('x', 13)}</button></div></td>`;
  tr.innerHTML = html;
  tb.appendChild(tr);
  renderIcons();
}

function delDynRow(btn, tbodyId) {
  const row = btn.closest('tr');
  if (row && row.parentNode.children.length > 1) {
    row.remove();
    renumTable('#' + tbodyId);
  } else {
    showToast('Minimal satu baris', 'warning');
  }
}

// ─── Table merge/unmerge cells ───
// Cells are selected by clicking while holding Ctrl
let _selectedCells = [];
document.addEventListener('click', function(e) {
  const td = e.target.closest('td');
  if (!td) return;
  const tbody = td.closest('tbody');
  if (!tbody || !tbody.id || !tbody.id.startsWith('tbody-')) return;
  // Only for table section cells (not header, not action column)
  if (td.closest('thead') || td.querySelector('.step-actions')) return;

  if (e.ctrlKey || e.metaKey) {
    e.preventDefault();
    td.classList.toggle('cell-selected');
    if (td.classList.contains('cell-selected')) {
      _selectedCells.push(td);
    } else {
      _selectedCells = _selectedCells.filter(c => c !== td);
    }
  }
});

function tableMergeCells(tbodyId) {
  const tbody = document.getElementById(tbodyId);
  if (!tbody) return;
  const cells = _selectedCells.filter(c => c.closest('tbody') === tbody);
  if (cells.length < 2) { showToast('Pilih minimal 2 sel (Ctrl+klik) untuk merge', 'warning'); return; }

  // Check cells are in same column
  const colIndices = cells.map(c => Array.from(c.parentNode.children).indexOf(c));
  const sameCol = colIndices.every(ci => ci === colIndices[0]);
  const sameRow = cells.every(c => c.parentNode === cells[0].parentNode);

  if (sameCol) {
    // Vertical merge — combine values, set rowspan on first, hide rest
    const first = cells[0];
    const values = cells.map(c => { const inp = c.querySelector('input'); return inp ? inp.value : c.textContent; }).filter(Boolean);
    const inp = first.querySelector('input');
    if (inp) inp.value = values.join('; ');
    first.setAttribute('rowspan', cells.length);
    cells.slice(1).forEach(c => { c.style.display = 'none'; c.dataset.mergedInto = '1'; });
  } else if (sameRow) {
    // Horizontal merge — combine values, set colspan on first, hide rest
    const first = cells[0];
    const values = cells.map(c => { const inp = c.querySelector('input'); return inp ? inp.value : c.textContent; }).filter(Boolean);
    const inp = first.querySelector('input');
    if (inp) inp.value = values.join('; ');
    first.setAttribute('colspan', cells.length);
    cells.slice(1).forEach(c => { c.style.display = 'none'; c.dataset.mergedInto = '1'; });
  } else {
    showToast('Sel harus dalam baris atau kolom yang sama', 'warning');
    return;
  }
  _clearCellSelection();
  showToast('Sel digabungkan', 'success');
}

function tableUnmergeCells(tbodyId) {
  const tbody = document.getElementById(tbodyId);
  if (!tbody) return;
  // Unmerge all merged cells
  tbody.querySelectorAll('[rowspan], [colspan]').forEach(cell => {
    cell.removeAttribute('rowspan');
    cell.removeAttribute('colspan');
  });
  tbody.querySelectorAll('[data-merged-into]').forEach(cell => {
    cell.style.display = '';
    delete cell.dataset.mergedInto;
  });
  _clearCellSelection();
  showToast('Sel dipisahkan', 'success');
}

function _clearCellSelection() {
  _selectedCells.forEach(c => c.classList.remove('cell-selected'));
  _selectedCells = [];
}

// ═══════════════════════════════════════════════
// SPECIAL RENDERERS (for complex built-in types)
// ═══════════════════════════════════════════════
// dokumen_terkait has sub-sections — keep as special
function renderDokumenTerkaitSpecial(section) {
  return `
  <div class="doc-section-title" style="margin-top:22px">${esc(section.label)}</div>
  <div class="doc-section-title" style="font-size:10px;margin:2px 0 4px">A.1 Dokumen Pendukung</div>
  <div class="doc-table-wrap"><table><tbody id="pendukungBody">
    <tr><td style="padding:2px 6px"><input class="inline-input typewriter" placeholder="Nomor IK terkait" style="font-size:12px;width:100%"></td>
      <td style="width:28px;padding:0;position:relative"><div class="step-actions" style="display:flex;position:static;transform:none"><button onclick="delDynRow(this,'pendukungBody')">${icon('x', 13)}</button></div></td></tr>
  </tbody></table></div>
  <button class="add-step-inline" onclick="addDynRow('pendukungBody',['Nomor IK terkait'],false)" style="margin:2px 0 8px">${icon('plus', 12)} Tambah</button>

  <div class="doc-section-title" style="font-size:10px;margin:8px 0 4px">A.2 Dokumen Referensi</div>
  <div class="doc-table-wrap"><table><tbody id="referensiBody">
    <tr><td style="padding:2px 6px"><input class="inline-input typewriter" placeholder="Peraturan / Kebijakan" style="font-size:12px;width:100%"></td>
      <td style="width:28px;padding:0;position:relative"><div class="step-actions" style="display:flex;position:static;transform:none"><button onclick="delDynRow(this,'referensiBody')">${icon('x', 13)}</button></div></td></tr>
  </tbody></table></div>
  <button class="add-step-inline" onclick="addDynRow('referensiBody',['Peraturan / Kebijakan'],false)" style="margin:2px 0 8px">${icon('plus', 12)} Tambah</button>

  <div class="doc-section-title" style="font-size:10px;margin:8px 0 4px">A.3 Dokumen Perizinan</div>
  <div class="doc-table-wrap"><table><tbody id="perizinanBody">
    <tr><td style="padding:2px 6px"><input class="inline-input typewriter" placeholder="Perizinan" style="font-size:12px;width:100%"></td>
      <td style="width:28px;padding:0;position:relative"><div class="step-actions" style="display:flex;position:static;transform:none"><button onclick="delDynRow(this,'perizinanBody')">${icon('x', 13)}</button></div></td></tr>
  </tbody></table></div>
  <button class="add-step-inline" onclick="addDynRow('perizinanBody',['Perizinan'],false)" style="margin:2px 0 8px">${icon('plus', 12)} Tambah</button>`;
}

// ═══ RISK MATRIX DATA (PLN NP Standard) ═══
const RISK_MATRIX = {
  cells: {
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
  },
  probLabels: [
    {key:'E',val:5,label:'Hampir Pasti Terjadi'},{key:'D',val:4,label:'Sangat Mungkin Terjadi'},
    {key:'C',val:3,label:'Bisa Terjadi'},{key:'B',val:2,label:'Jarang Terjadi'},
    {key:'A',val:1,label:'Sangat Jarang Terjadi'},
  ],
  dampakLabels: [
    {val:1,label:'Sangat Rendah'},{val:2,label:'Rendah'},{val:3,label:'Moderat'},
    {val:4,label:'Tinggi'},{val:5,label:'Sangat Tinggi'},
  ],
  get(p,d){ return this.cells[`${p}-${d}`]||{score:0,level:'-',color:'#ccc'}; }
};

function getRiskBadge(level) {
  const m={'LOW':'badge-success','LOW TO MODERATE':'badge-teal','MODERATE':'badge-amber','MODERATE TO HIGH':'badge-orange','HIGH':'badge-danger'};
  return `<span class="badge ${m[level]||'badge-secondary'}" style="font-size:9px;white-space:nowrap">${level}</span>`;
}

function renderIdentifikasiRisikoSpecial(section) {
  const probOpts = '<option value="">--</option>' + RISK_MATRIX.probLabels.slice().reverse().map(p =>
    `<option value="${p.val}">${p.key} (${p.val}) - ${p.label}</option>`).join('');
  const dampakOpts = '<option value="">--</option>' + RISK_MATRIX.dampakLabels.map(d =>
    `<option value="${d.val}">${d.val} - ${d.label}</option>`).join('');

  return `
  <div class="doc-section-title" style="margin-top:22px">${esc(section.label)}</div>
  <div class="doc-subsection-label">Identifikasi Risiko</div>
  <div class="doc-table-wrap"><table>
    <thead><tr style="background:#F0EFEA">
      <td class="th-cell" style="width:30px;text-align:center">No</td>
      <td class="th-cell">Risiko</td>
      <td class="th-cell">Penyebab</td>
      <td class="th-cell" style="width:150px">Probabilitas</td>
      <td class="th-cell" style="width:130px">Dampak</td>
      <td class="th-cell" style="width:42px;text-align:center">Skor</td>
      <td class="th-cell" style="width:115px">Level Inherent</td>
      <td style="width:24px"></td>
    </tr></thead>
    <tbody id="riskInherentBody">
      ${renderRiskInherentRow(1, probOpts, dampakOpts)}
    </tbody>
  </table></div>
  <button class="add-step-inline" onclick="addRiskInherentRow()" style="margin:2px 0 12px">${icon('plus', 12)} Tambah Risiko</button>

  <div class="doc-subsection-label">Perlakuan Risiko</div>
  <div class="doc-table-wrap"><table>
    <thead><tr style="background:#F0EFEA">
      <td class="th-cell" style="width:30px;text-align:center">No</td>
      <td class="th-cell">Kontrol / Pengendalian</td>
      <td class="th-cell">Mitigasi (Action Plan)</td>
      <td class="th-cell" style="width:150px">Probabilitas</td>
      <td class="th-cell" style="width:130px">Dampak</td>
      <td class="th-cell" style="width:42px;text-align:center">Skor</td>
      <td class="th-cell" style="width:115px">Level Residual</td>
      <td style="width:24px"></td>
    </tr></thead>
    <tbody id="riskResidualBody">
      ${renderRiskResidualRow(1, probOpts, dampakOpts)}
    </tbody>
  </table></div>
  <button class="add-step-inline" onclick="addRiskResidualRow()" style="margin:2px 0 12px">${icon('plus', 12)} Tambah</button>

  <div class="doc-subsection-label">Peta Risiko (Heat Map)</div>
  <div id="riskHeatMap" style="margin-bottom:10px">${renderRiskHeatMap()}</div>
  <div style="display:flex;gap:16px;align-items:center;font-size:11px;margin-bottom:6px;font-family:'Inter',sans-serif;color:var(--text-secondary)">
    <span style="display:flex;align-items:center;gap:4px">
      <span style="display:inline-block;width:18px;height:18px;border:2px solid #333;border-radius:3px;background:#fff"></span>
      Inherent Risk
    </span>
    <span style="display:flex;align-items:center;gap:4px">
      <span style="display:inline-block;width:18px;height:18px;border:2px solid #C2410C;border-radius:3px;background:#FB923C"></span>
      Target Residual Risk
    </span>
  </div>`;
}

function _riskOpts() {
  const probOpts = '<option value="">--</option>' + RISK_MATRIX.probLabels.slice().reverse().map(p =>
    `<option value="${p.val}">${p.key} (${p.val}) - ${p.label}</option>`).join('');
  const dampakOpts = '<option value="">--</option>' + RISK_MATRIX.dampakLabels.map(d =>
    `<option value="${d.val}">${d.val} - ${d.label}</option>`).join('');
  return { probOpts, dampakOpts };
}

function renderRiskInherentRow(no, probOpts, dampakOpts) {
  if (!probOpts) { const o = _riskOpts(); probOpts = o.probOpts; dampakOpts = o.dampakOpts; }
  return `<tr>
    <td style="text-align:center;font-size:11px">${no}</td>
    <td><textarea class="inline-textarea typewriter" rows="1" placeholder="Identifikasi risiko" style="font-size:11px"></textarea></td>
    <td><textarea class="inline-textarea typewriter" rows="1" placeholder="Penyebab" style="font-size:11px"></textarea></td>
    <td><select class="inline-select" style="font-size:10px;width:100%" onchange="calcRiskScore(this)">${probOpts}</select></td>
    <td><select class="inline-select" style="font-size:10px;width:100%" onchange="calcRiskScore(this)">${dampakOpts}</select></td>
    <td class="risk-score" style="text-align:center;font-weight:700;font-size:12px;border-radius:4px">—</td>
    <td class="risk-level" style="text-align:center"><span style="color:#aaa;font-size:10px">—</span></td>
    <td style="padding:0;position:relative"><div class="step-actions" style="display:flex;position:static;transform:none"><button onclick="delRiskInherentRow(this)" title="Hapus">${icon('x', 13)}</button></div></td>
  </tr>`;
}

function renderRiskResidualRow(no, probOpts, dampakOpts) {
  if (!probOpts) { const o = _riskOpts(); probOpts = o.probOpts; dampakOpts = o.dampakOpts; }
  return `<tr>
    <td style="text-align:center;font-size:11px">${no}</td>
    <td><textarea class="inline-textarea typewriter" rows="1" placeholder="Kontrol / Pengendalian" style="font-size:11px"></textarea></td>
    <td><textarea class="inline-textarea typewriter" rows="1" placeholder="Mitigasi (Action Plan)" style="font-size:11px"></textarea></td>
    <td><select class="inline-select" style="font-size:10px;width:100%" onchange="calcRiskScore(this)">${probOpts}</select></td>
    <td><select class="inline-select" style="font-size:10px;width:100%" onchange="calcRiskScore(this)">${dampakOpts}</select></td>
    <td class="risk-score" style="text-align:center;font-weight:700;font-size:12px;border-radius:4px">—</td>
    <td class="risk-level" style="text-align:center"><span style="color:#aaa;font-size:10px">—</span></td>
    <td style="padding:0;position:relative"><div class="step-actions" style="display:flex;position:static;transform:none"><button onclick="delRiskResidualRow(this)" title="Hapus">${icon('x', 13)}</button></div></td>
  </tr>`;
}

function calcRiskScore(selectEl) {
  const row = selectEl.closest('tr');
  const selects = row.querySelectorAll('select');
  const prob = parseInt(selects[0]?.value) || 0;
  const dampak = parseInt(selects[1]?.value) || 0;
  const scoreEl = row.querySelector('.risk-score');
  const levelEl = row.querySelector('.risk-level');
  if (prob && dampak) {
    const cell = RISK_MATRIX.get(prob, dampak);
    if (scoreEl) { scoreEl.textContent = cell.score; scoreEl.style.background = cell.color; scoreEl.style.color = '#222'; }
    if (levelEl) levelEl.innerHTML = getRiskBadge(cell.level);
  } else {
    if (scoreEl) { scoreEl.textContent = '—'; scoreEl.style.background = ''; scoreEl.style.color = ''; }
    if (levelEl) levelEl.innerHTML = '<span style="color:#aaa;font-size:10px">—</span>';
  }
  updateRiskHeatMap();
}

function renderRiskHeatMap() {
  const rows = RISK_MATRIX.probLabels;
  const cols = RISK_MATRIX.dampakLabels;
  let h = `<table style="border-collapse:collapse;width:100%;font-family:'Inter',sans-serif;font-size:10px;table-layout:fixed">`;
  h += `<tr><td colspan="2" style="border:1px solid #ccc;background:#f5f5f5;text-align:center;font-weight:700;font-size:10px;width:110px"></td>`;
  cols.forEach(d => { h += `<td style="border:1px solid #ccc;background:#f5f5f5;text-align:center;font-weight:600;padding:4px 2px">${d.label}<br><span style="font-weight:400">${d.val}</span></td>`; });
  h += `</tr>`;
  rows.forEach((p, i) => {
    h += `<tr>`;
    if (i === 0) h += `<td rowspan="5" style="border:1px solid #ccc;background:#f5f5f5;text-align:center;font-weight:700;writing-mode:vertical-lr;transform:rotate(180deg);padding:6px 2px;font-size:11px;width:24px">Probabilitas</td>`;
    h += `<td style="border:1px solid #ccc;background:#f5f5f5;text-align:center;font-weight:600;padding:3px;line-height:1.2;width:86px">${p.label}<br><b>${p.key}</b></td>`;
    cols.forEach(d => {
      const c = RISK_MATRIX.get(p.val, d.val);
      h += `<td style="border:1px solid #999;background:${c.color};text-align:center;padding:4px 2px;vertical-align:middle">
        <div style="font-weight:600;font-size:8px;color:#333;opacity:0.7">${c.level}</div>
        <div style="font-weight:800;font-size:13px;color:#222">${c.score}</div>
        <div class="hm-markers" id="hm-m-${p.val}-${d.val}" style="display:flex;gap:2px;justify-content:center;flex-wrap:wrap;margin-top:1px"></div>
      </td>`;
    });
    h += `</tr>`;
  });
  h += `<tr><td colspan="2" style="border:none"></td><td colspan="5" style="border:1px solid #ccc;background:#f5f5f5;text-align:center;font-weight:700;font-size:11px;padding:4px">Dampak</td></tr>`;
  h += `</table>`;
  return h;
}

function updateRiskHeatMap() {
  document.querySelectorAll('.hm-markers').forEach(el => el.innerHTML = '');
  document.querySelectorAll('#riskInherentBody tr').forEach((row, i) => {
    const ss = row.querySelectorAll('select');
    const p = ss[0]?.value, d = ss[1]?.value;
    if (p && d) {
      const el = document.getElementById(`hm-m-${p}-${d}`);
      if (el) el.innerHTML += `<span style="display:inline-flex;align-items:center;justify-content:center;width:17px;height:17px;border:2px solid #333;border-radius:3px;background:#fff;font-size:9px;font-weight:700;color:#333">${i+1}</span>`;
    }
  });
  document.querySelectorAll('#riskResidualBody tr').forEach((row, i) => {
    const ss = row.querySelectorAll('select');
    const p = ss[0]?.value, d = ss[1]?.value;
    if (p && d) {
      const el = document.getElementById(`hm-m-${p}-${d}`);
      if (el) el.innerHTML += `<span style="display:inline-flex;align-items:center;justify-content:center;width:17px;height:17px;border:2px solid #C2410C;border-radius:3px;background:#FB923C;font-size:9px;font-weight:700;color:#fff">${i+1}</span>`;
    }
  });
}

function addRiskInherentRow() {
  const tb = document.getElementById('riskInherentBody');
  const no = tb.children.length + 1;
  tb.insertAdjacentHTML('beforeend', renderRiskInherentRow(no));
  attachAutoGrow(); renderIcons();
}
function delRiskInherentRow(btn) {
  const row = btn.closest('tr');
  if (row && row.parentNode.children.length > 1) { row.remove(); renumTable('#riskInherentBody'); }
  updateRiskHeatMap();
}
function addRiskResidualRow() {
  const tb = document.getElementById('riskResidualBody');
  const no = tb.children.length + 1;
  tb.insertAdjacentHTML('beforeend', renderRiskResidualRow(no));
  attachAutoGrow(); renderIcons();
}
function delRiskResidualRow(btn) {
  const row = btn.closest('tr');
  if (row && row.parentNode.children.length > 1) { row.remove(); renumTable('#riskResidualBody'); }
  updateRiskHeatMap();
}

// ═══════════════════════════════════════════════
// MASTER RENDER — dispatches to appropriate renderer
// based on template section config
// ═══════════════════════════════════════════════

// Special section IDs that have complex/unique renderers
const SPECIAL_RENDERERS = {
  dokumen_terkait: renderDokumenTerkaitSpecial,
  identifikasi_risiko: renderIdentifikasiRisikoSpecial,
};

function renderSectionByConfig(section) {
  // Check for special renderer first (complex built-in sections)
  if (SPECIAL_RENDERERS[section.id]) {
    return SPECIAL_RENDERERS[section.id](section);
  }

  // Otherwise, dispatch by type
  switch (section.type) {
    case 'richtext':
      return renderGenericRichtext(section);
    case 'textarea':
      return renderGenericTextarea(section);
    case 'table':
      return renderGenericTable(section);
    case 'risk_matrix':
      return renderIdentifikasiRisikoSpecial(section);
    case 'special':
      // Special sections without a dedicated renderer fall through to richtext
      return renderGenericRichtext(section);
    default:
      return renderGenericRichtext(section);
  }
}

// ═══════════════════════════════════════════════
// CHANGE HISTORY (auto-generated, read-only log)
// ═══════════════════════════════════════════════
function renderChangeHistory(section) {
  const label = section?.label || 'Riwayat Perubahan Dokumen';
  return `
  <div class="doc-section-title" style="margin-top:0">${esc(label)}</div>
  <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
    <div style="font-size:10px;color:#9E9A93;font-family:'Inter',sans-serif;display:flex;align-items:center;gap:4px">
      ${icon('info', 12)} Bagian yang berubah dicatat otomatis. Anda boleh menambah keterangan detail (opsional) pada kolom Uraian.
    </div>
  </div>
  <div class="doc-table-wrap"><table>
    <thead><tr style="background:#F0EFEA"><td style="font-size:10px;font-weight:600;padding:4px 6px;font-family:'Inter',sans-serif;text-align:center">No</td>
      <td style="font-size:10px;font-weight:600;padding:4px 6px;font-family:'Inter',sans-serif">Bagian</td>
      <td style="font-size:10px;font-weight:600;padding:4px 6px;font-family:'Inter',sans-serif">Uraian Perubahan</td>
      <td style="font-size:10px;font-weight:600;padding:4px 6px;font-family:'Inter',sans-serif">Revisi</td>
      <td style="font-size:10px;font-weight:600;padding:4px 6px;font-family:'Inter',sans-serif">Tanggal</td></tr></thead>
    <tbody id="changeHistoryBody">
      <tr id="changeHistoryEmpty"><td colspan="5" style="text-align:center;font-size:11px;color:#9E9A93;padding:12px;font-style:italic">Belum ada riwayat perubahan — riwayat akan muncul setelah dokumen disimpan dan diperbarui</td></tr>
    </tbody>
  </table></div>`;
}
function renderChangeHistoryRow(idx, item) {
  const auto = (Array.isArray(item.sections) && item.sections.length)
    ? 'Perubahan pada ' + item.sections.join('; ')
    : (item.uraian || '');
  const note = item.catatan || '';
  return `<tr>
    <td style="text-align:center;font-size:11px;color:#4B463E">${idx}</td>
    <td style="font-size:11px;font-family:'Courier Prime','JetBrains Mono',monospace;color:#4B463E">${esc(item.halaman || '-')}</td>
    <td style="font-size:11px;font-family:'Courier Prime','JetBrains Mono',monospace;color:#1a1a1a">
      <div style="margin-bottom:3px">${esc(auto || '-')}</div>
      <input class="ch-note" data-rev="${esc(item.revisi || '')}" value="${esc(note)}" placeholder="+ keterangan detail (opsional)" style="width:100%;font-size:10.5px;padding:3px 6px;border:1px solid #E0DDD5;border-radius:4px;font-family:'Inter',sans-serif;box-sizing:border-box">
    </td>
    <td style="font-size:11px;font-family:'Courier Prime','JetBrains Mono',monospace;text-align:center;color:#4B463E">${esc(item.revisi || '00')}</td>
    <td style="font-size:11px;font-family:'Courier Prime','JetBrains Mono',monospace;color:#4B463E">${esc(item.tanggal || '-')}</td>
  </tr>`;
}
function renumTable(sel) {
  document.querySelectorAll(sel + ' tr').forEach((r, i) => { const c = r.querySelector('td:first-child'); if (c) c.textContent = i + 1; });
}

// ═══════════════════════════════════════════════
// DETAIL AKTIVITAS (Template-driven tabs)
// ═══════════════════════════════════════════════
function renderDetailAktivitas(aktivitasSections) {
  if (!aktivitasSections.length) return '';

  const tabs = aktivitasSections.map((s, i) =>
    `<button class="doc-tab${i===0?' active':''}" onclick="switchDocTab('${s.id}',this)">${esc(s.label.replace(/^Aktivitas\s*/i, ''))}</button>`
  ).join('');
  const sections = aktivitasSections.map((s, i) =>
    `<div class="tab-content${i===0?' active':''}" id="tab-${s.id}">
      <div class="rte-wrap">
        ${richTextToolbar('rte-aktivitas-' + s.id)}
      </div>
    </div>`
  ).join('');
  return `
  <div class="doc-section-title" style="margin-top:22px">Detail Aktivitas</div>
  <div style="font-size:11px;color:#6B6760;margin-bottom:6px">Dapat berupa deskripsi tahapan uraian aktivitas, flowchart BPMN, atau foto/gambar yang diberi penjelasan</div>
  <div class="doc-tabs">${tabs}</div>${sections}`;
}

function switchDocTab(tabId, btn) {
  document.querySelectorAll('.doc-tab').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');
  document.querySelectorAll('[id^="tab-"]').forEach(t => t.classList.remove('active'));
  const el = document.getElementById('tab-' + tabId);
  if (el) el.classList.add('active');
}

// ═══════════════════════════════════════════════
// MAIN RENDER (Template-Driven)
// ═══════════════════════════════════════════════
let _renderBuatIKVersion = 0; // guard against concurrent renders
async function renderBuatIK(container) {
  const thisRender = ++_renderBuatIKVersion; // each render gets a unique version
  editingDocId = pendingEditId; pendingEditId = null;

  let docSnapshot = null;
  let docTemplateVersi = null;
  let canUpgradeTemplate = false;

  if (editingDocId) {
    try {
      const docRes = await API.getDokumenById(editingDocId);
      const docData = docRes.data;
      if (docData.template_snapshot) {
        docSnapshot = docData.template_snapshot;
        docTemplateVersi = docData.template_versi;
      }
    } catch { /* will fallback to active template */ }
  }

  try {
    const tplRes = await API.getActiveTemplate();
    activeTemplate = tplRes.data;
    console.log('[BuatIK] Active template loaded:', activeTemplate?.nama, activeTemplate?.versi, '| Sections in konten:', activeTemplate?.konten ? JSON.parse(activeTemplate.konten).length : 0);

    if (editingDocId && docSnapshot) {
      // Editing existing doc → use its frozen snapshot
      const parsed = JSON.parse(docSnapshot);
      activeTemplateSections = parsed.filter(s => s.enabled !== false);
      console.log('[BuatIK] Using doc snapshot:', activeTemplateSections.length, 'sections (doc template:', docTemplateVersi, ')');
      if (docTemplateVersi && activeTemplate && activeTemplate.versi !== docTemplateVersi) {
        canUpgradeTemplate = true;
        console.log('[BuatIK] Template upgrade available:', docTemplateVersi, '→', activeTemplate.versi);
      }
    } else {
      // New document → use active template from server
      const parsed = activeTemplate && activeTemplate.konten ? JSON.parse(activeTemplate.konten) : [];
      activeTemplateSections = parsed.filter(s => s.enabled !== false);
      console.log('[BuatIK] New doc using active template:', activeTemplateSections.length, 'enabled sections:', activeTemplateSections.map(s => s.id).join(', '));
    }
  } catch (e) {
    console.error('[BuatIK] Template load error:', e.message);
    if (docSnapshot) {
      try {
        const parsed = JSON.parse(docSnapshot);
        activeTemplateSections = parsed.filter(s => s.enabled !== false);
      } catch { activeTemplateSections = []; }
    } else {
      activeTemplate = null;
      activeTemplateSections = [];
    }
  }

  // Fallback: if no template sections, use default sections
  if (activeTemplateSections.length === 0) {
    activeTemplateSections = (typeof DEFAULT_SECTIONS !== 'undefined' ? DEFAULT_SECTIONS : []).map(s => ({ ...s, enabled: true }));
  }

  // Guard: if a newer render started while we were awaiting, abort this one
  if (thisRender !== _renderBuatIKVersion) { console.log('[BuatIK] Render cancelled — superseded by newer render'); return; }

  // Track when template was loaded for sync detection
  _tplLoadedAt = Date.now();

  // Build section HTML — fully driven by template config, RESPECTING TEMPLATE ORDER
  let sectionsHtml = '';

  // Kop is always rendered (non-configurable)
  sectionsHtml += renderKop();

  // Collect aktivitas sections for grouped tab rendering
  const aktivitasSections = activeTemplateSections.filter(s => s.id.startsWith('aktivitas_'));
  let aktivitasRendered = false;

  // Render ALL sections in template order
  for (const section of activeTemplateSections) {
    if (section.id.startsWith('aktivitas_')) {
      // Render the grouped aktivitas tabs block at the position of the FIRST aktivitas section
      if (!aktivitasRendered && aktivitasSections.length > 0) {
        sectionsHtml += renderDetailAktivitas(aktivitasSections);
        aktivitasRendered = true;
      }
      // Skip subsequent aktivitas sections (already rendered as tabs)
    } else if (section.id === 'change_history') {
      sectionsHtml += renderChangeHistory(section);
    } else {
      sectionsHtml += renderSectionByConfig(section);
    }
  }

  container.innerHTML = `
  <div class="page active" id="page-buat-ik" style="background:#F4F6F8;padding:16px 24px">
    <div class="ik-sticky-toolbar">
      <div style="display:flex;align-items:center;gap:8px">
        <span style="font-weight:600;font-size:15px;color:var(--text-primary)">${icon('file-text', 16)} ${editingDocId ? 'Edit Dokumen' : 'Dokumen IK Baru'}</span>
        <span class="doc-num-display" id="docNumDisplay">${editingDocId ? 'Memuat...' : ''}</span>
        ${editingDocId && docTemplateVersi ? `<span style="font-size:11px;color:var(--text-tertiary);background:var(--bg-secondary);padding:2px 8px;border-radius:4px">${icon('layout-template', 12)} Template: ${esc(docTemplateVersi)}</span>` : (activeTemplate ? `<span style="font-size:11px;color:var(--text-tertiary);background:var(--bg-secondary);padding:2px 8px;border-radius:4px">${icon('layout-template', 12)} ${esc(activeTemplate.nama)} (${esc(activeTemplate.versi)})</span>` : '')}
        ${canUpgradeTemplate ? `<button class="btn btn-sm" style="font-size:11px;background:#FFF3E0;color:#E65100;border:1px solid #FFB74D" onclick="upgradeDocTemplate(${editingDocId})">${icon('refresh-cw', 12)} Upgrade ke ${esc(activeTemplate.versi)}</button>` : ''}
      </div>
      <div style="display:flex;gap:6px;align-items:center">
        ${!editingDocId ? `<button class="btn btn-ghost btn-sm" onclick="reloadActiveTemplate()" title="Muat ulang template aktif dari server" style="font-size:11px;color:var(--text-tertiary)">${icon('refresh-cw', 13)} Sync Template</button>` : ''}
        <button class="btn btn-secondary btn-sm" onclick="saveDraft()">${icon('save', 14)} Draft</button>
        <button class="btn btn-primary btn-sm" onclick="submitIK()">${icon('upload', 14)} Submit</button>
      </div>
    </div>
    ${activeTemplate ? `<div style="background:#EBF5FF;border:1px solid #B3D4FC;border-radius:6px;padding:8px 12px;margin-bottom:8px;font-size:11px;color:#1565C0">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
        ${icon('layout-template', 14)}
        <span>Form ini menggunakan template <strong>${esc(activeTemplate.nama)}</strong> versi <strong>${esc(activeTemplate.versi)}</strong> — ${activeTemplateSections.length} seksi aktif</span>
        ${editingDocId && canUpgradeTemplate ? `<span style="color:#E65100;font-weight:600">| Template terbaru tersedia</span>` : ''}
      </div>
      <div style="display:flex;flex-wrap:wrap;gap:4px;font-size:10px;color:#42A5F5">
        ${activeTemplateSections.map(s => `<span style="background:#BBDEFB;padding:1px 6px;border-radius:3px">${esc(s.label)}</span>`).join('')}
      </div>
    </div>` : ''}
    <div class="wysiwyg-doc" id="docPaper">
      ${sectionsHtml}
    </div>
  </div>`;
  renderIcons();
  await Promise.all([loadUnitsAndProbis(), loadApprovers()]);
  document.getElementById('f-tgl').value = new Date().toISOString().split('T')[0];
  document.getElementById('f-tgl-update').value = new Date().toISOString().split('T')[0];
  attachAutoGrow();
  const stickyBar = document.querySelector('.ik-sticky-toolbar');
  const contentEl = document.querySelector('.content');
  if (stickyBar && contentEl) {
    contentEl.addEventListener('scroll', () => {
      stickyBar.classList.toggle('scrolled', contentEl.scrollTop > 20);
    });
  }
  if (editingDocId) loadDokumenForEdit(editingDocId);
}

function attachAutoGrow() {
  document.querySelectorAll('.inline-textarea').forEach(el => {
    el.addEventListener('input', function() { autoGrow(this); });
    autoGrow(el);
  });
}
function autoGrow(el) {
  el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px';
}

// ════════════════════════════════════════════
//  KOP & TANDA TANGAN (Format PLN NP 2025)
// ════════════════════════════════════════════
function renderKop() {
  const isGenerated = editingDocId || IK.nomorDokumen;
  return `
  <div class="kop-cover">
    <div class="kop-cover__header">
      <div class="kop-cover__title">INSTRUKSI KERJA (IK)</div>
      <div class="kop-cover__company">PT PLN NUSANTARA POWER</div>
    </div>
    <div class="kop-cover__judul-section">
      <div class="kop-cover__judul-label">JUDUL IK</div>
      <input class="kop-cover__judul-input" id="f-judul" placeholder="Ketik judul instruksi kerja...">
    </div>
    <div class="kop-cover__meta-table">
      <table>
        <tr>
          <td class="kop-meta-label">NO. DOKUMEN</td>
          <td class="kop-meta-sep">:</td>
          <td class="kop-meta-value" id="kopNomorDisplay">${isGenerated ? `<strong>${IK.nomorDokumen}</strong>` : `<span class="kop-meta-placeholder">— (akan digenerate otomatis)</span>`}</td>
        </tr>
        <tr>
          <td class="kop-meta-label">TANGGAL DITETAPKAN</td>
          <td class="kop-meta-sep">:</td>
          <td class="kop-meta-value"><input class="inline-input" id="f-tgl" type="date"></td>
        </tr>
        <tr>
          <td class="kop-meta-label">TANGGAL DIPERBARUI</td>
          <td class="kop-meta-sep">:</td>
          <td class="kop-meta-value"><input class="inline-input" id="f-tgl-update" type="date"></td>
        </tr>
        <tr>
          <td class="kop-meta-label">REVISI</td>
          <td class="kop-meta-sep">:</td>
          <td class="kop-meta-value"><select class="inline-select" id="f-revisi" style="width:60px">${[0,1,2,3,4,5].map(r => `<option value="${r}"${r===0?' selected':''}>${String(r).padStart(2,'0')}</option>`).join('')}</select></td>
        </tr>
      </table>
    </div>
    <div class="kop-cover__unit-row">
      <span class="kop-meta-label">UNIT:</span> <select class="inline-select" id="f-bidang" style="width:160px" onchange="previewDocNumber()"><option value="">—</option></select>
      <span class="kop-meta-label" style="margin-left:16px">PROBIS:</span> <select class="inline-select" id="f-probis" style="width:180px" onchange="previewDocNumber()"><option value="">—</option></select>
    </div>
  </div>
  <!-- Doc Owner (system record, not on signature page) -->
  <div style="display:none"><input type="hidden" id="f-doc-owner" value="${APP.user?.id || ''}"></div>

  <div class="kop-cover__ttd">
    <table class="ttd-table">
      <thead><tr>
        <td>Disusun oleh,</td>
        <td>Disetujui oleh,</td>
        <td>Disahkan oleh,</td>
      </tr></thead>
      <tbody><tr>
        <td class="ttd-cell">
          <div class="ttd-sign-area" id="ttd-sign-prepared">
            <div class="ttd-sign-placeholder" id="ttd-placeholder-prepared">
              <div style="margin-bottom:6px;color:#B5B1AA">${icon('pen-tool', 20)}</div>
              <div style="font-size:10px;color:#9E9A93">Tanda Tangan</div>
            </div>
            <img class="ttd-sign-img" id="ttd-img-prepared" style="display:none" alt="TTD">
          </div>
          <div class="ttd-sign-actions">
            <button class="btn-ttd-action" onclick="uploadTTD('prepared','ttd')" title="Upload TTD Digital">${icon('upload', 12)} TTD</button>
            <button class="btn-ttd-action" onclick="uploadTTD('prepared','qr')" title="Upload QR Code">${icon('scan', 12)} QR</button>
            <button class="btn-ttd-action btn-ttd-clear" onclick="clearTTD('prepared')" title="Hapus" style="display:none" id="btn-clear-prepared">${icon('x', 12)}</button>
          </div>
          <input class="inline-input" id="f-prepared" value="${esc(APP.user?.nama || '')}" placeholder="Nama penyusun">
          <input class="inline-input" id="f-prepared-jabatan" placeholder="Jabatan (Asst. Manager)" value="${esc(APP.user?.jabatan || '')}">
          <input type="hidden" id="ttd-data-prepared" value="">
          <input type="hidden" id="ttd-type-prepared" value="">
        </td>
        <td class="ttd-cell">
          <div class="ttd-sign-area" id="ttd-sign-approved1">
            <div class="ttd-sign-placeholder" id="ttd-placeholder-approved1">
              <div style="margin-bottom:6px;color:#B5B1AA">${icon('pen-tool', 20)}</div>
              <div style="font-size:10px;color:#9E9A93">Tanda Tangan</div>
            </div>
            <img class="ttd-sign-img" id="ttd-img-approved1" style="display:none" alt="TTD">
          </div>
          <div class="ttd-sign-actions">
            <button class="btn-ttd-action" onclick="uploadTTD('approved1','ttd')" title="Upload TTD Digital">${icon('upload', 12)} TTD</button>
            <button class="btn-ttd-action" onclick="uploadTTD('approved1','qr')" title="Upload QR Code">${icon('scan', 12)} QR</button>
            <button class="btn-ttd-action btn-ttd-clear" onclick="clearTTD('approved1')" title="Hapus" style="display:none" id="btn-clear-approved1">${icon('x', 12)}</button>
          </div>
          <select class="inline-select" id="f-approved"><option value="">— Pilih Approver —</option></select>
          <div style="font-size:9px;color:#9E9A93;margin-top:2px;text-align:center">Manager Sub-bidang</div>
          <input type="hidden" id="ttd-data-approved1" value="">
          <input type="hidden" id="ttd-type-approved1" value="">
        </td>
        <td class="ttd-cell">
          <div class="ttd-sign-area" id="ttd-sign-pengesahan">
            <div class="ttd-sign-placeholder" id="ttd-placeholder-pengesahan">
              <div style="margin-bottom:6px;color:#B5B1AA">${icon('pen-tool', 20)}</div>
              <div style="font-size:10px;color:#9E9A93">Tanda Tangan</div>
            </div>
            <img class="ttd-sign-img" id="ttd-img-pengesahan" style="display:none" alt="TTD">
          </div>
          <div class="ttd-sign-actions">
            <button class="btn-ttd-action" onclick="uploadTTD('pengesahan','ttd')" title="Upload TTD Digital">${icon('upload', 12)} TTD</button>
            <button class="btn-ttd-action" onclick="uploadTTD('pengesahan','qr')" title="Upload QR Code">${icon('scan', 12)} QR</button>
            <button class="btn-ttd-action btn-ttd-clear" onclick="clearTTD('pengesahan')" title="Hapus" style="display:none" id="btn-clear-pengesahan">${icon('x', 12)}</button>
          </div>
          <select class="inline-select" id="f-pengesahan"><option value="">— Pilih Pengesah —</option></select>
          <div style="font-size:9px;color:#9E9A93;margin-top:2px;text-align:center">Senior Manager</div>
          <input type="hidden" id="ttd-data-pengesahan" value="">
          <input type="hidden" id="ttd-type-pengesahan" value="">
        </td>
      </tr></tbody>
    </table>
  </div>`;
}

// ════════════════════════════════════════════
//  PREVIEW NOMOR DOKUMEN (real-time)
// ════════════════════════════════════════════
async function previewDocNumber() {
  if (editingDocId) return;
  const unitId = document.getElementById('f-bidang')?.value;
  const probisId = document.getElementById('f-probis')?.value;
  if (!unitId || !probisId) {
    const display = document.getElementById('kopNomorDisplay');
    if (display) display.innerHTML = '<span class="kop-meta-placeholder">— (pilih Unit & Probis)</span>';
    return;
  }
  try {
    const res = await API.get('dokumen/preview-number?unit_id=' + unitId + '&probis_id=' + probisId);
    const previewNum = res.data?.preview || res.data?.nomor_dokumen;
    if (previewNum) {
      const display = document.getElementById('kopNomorDisplay');
      if (display) display.innerHTML = `<strong style="color:var(--primary)">${esc(previewNum)}</strong> <span style="font-size:10px;color:var(--text-tertiary)">(preview)</span>`;
      // Also show in the toolbar
      const pageDisplay = document.getElementById('docNumDisplay');
      if (pageDisplay) pageDisplay.textContent = previewNum + ' (preview)';
    }
  } catch (e) { /* silent preview failure */ }
}

// ════════════════════════════════════════════
//  NUMBERING, LOAD, SAVE
// ════════════════════════════════════════════
function setNomorDokumen(nomor) {
  IK.nomorDokumen = nomor;
  const display = document.getElementById('kopNomorDisplay');
  const pageDisplay = document.getElementById('docNumDisplay');
  if (display) display.innerHTML = `<strong>${nomor}</strong>`;
  if (pageDisplay) pageDisplay.textContent = nomor;
}

async function loadUnitsAndProbis() {
  try {
    const [unitsRes, probisRes] = await Promise.all([API.getUnits(), API.getProbis()]);
    const unitSel = document.getElementById('f-bidang');
    const probisSel = document.getElementById('f-probis');
    if (unitSel && unitsRes.data) {
      unitsRes.data.forEach(u => {
        unitSel.innerHTML += `<option value="${u.id}">${esc(u.kode + ' – ' + u.nama)}</option>`;
      });
    }
    if (probisSel && probisRes.data) {
      probisRes.data.forEach(p => {
        probisSel.innerHTML += `<option value="${p.id}">${esc(p.nomor + ' – ' + p.nama)}</option>`;
      });
    }
  } catch (e) {
    showToast('Gagal memuat data master: ' + e.message, 'error');
  }
}

async function loadApprovers() {
  try {
    const res = await API.getApprovers();
    const apprs = res.data || [];
    // f-approved = Manager Sub-bidang (Tier 2 approver)
    const selApproved = document.getElementById('f-approved');
    if (selApproved) {
      const managers = apprs.filter(u => ['Super Admin','Admin','Manager'].includes(u.role));
      managers.forEach(u => { selApproved.innerHTML += `<option value="${u.id}">${esc(u.nama)} — ${esc(u.jabatan || '')}</option>`; });
    }
    // f-pengesahan = Senior Manager (Tier 3 / Final approval)
    const selPengesahan = document.getElementById('f-pengesahan');
    if (selPengesahan) {
      const sms = apprs.filter(u => ['Super Admin','Admin','Senior Manager'].includes(u.role));
      sms.forEach(u => { selPengesahan.innerHTML += `<option value="${u.id}">${esc(u.nama)} — ${esc(u.jabatan || '')}</option>`; });
    }
  } catch (e) { /* ignore */ }
}

// ════════════════════════════════════════════
//  LOAD DOCUMENT FOR EDIT (Template-Driven)
// ════════════════════════════════════════════
async function loadDokumenForEdit(id) {
  try {
    const res = await API.getDokumenById(id);
    const d = res.data;
    if (d.nomor_dokumen) setNomorDokumen(d.nomor_dokumen);
    document.getElementById('f-judul').value = d.judul || '';
    const bidang = document.getElementById('f-bidang');
    if (bidang) bidang.value = d.unit_id || '';
    const probis = document.getElementById('f-probis');
    if (probis) probis.value = d.probis_id || '';
    const tgl = document.getElementById('f-tgl');
    if (tgl) tgl.value = d.tanggal_ditetapkan || '';
    const tglUpdate = document.getElementById('f-tgl-update');
    if (tglUpdate && d.tanggal_diperbarui) tglUpdate.value = d.tanggal_diperbarui;
    const revisi = document.getElementById('f-revisi');
    // Opsi dropdown bernilai 0..5; revisi tersimpan "00".."05" → petakan via parseInt.
    if (revisi) revisi.value = String(parseInt(d.revisi, 10) || 0);
    const prepared = document.getElementById('f-prepared');
    if (prepared) prepared.value = d.penyusun_nama || APP.user?.nama || '';
    const preparedJab = document.getElementById('f-prepared-jabatan');
    if (preparedJab) preparedJab.value = d.penyusun_jabatan || '';
    if (d.approver_id) { const el = document.getElementById('f-approved'); if (el) el.value = d.approver_id; }
    if (d.pengesahan_id) { const el = document.getElementById('f-pengesahan'); if (el) el.value = d.pengesahan_id; }
    if (d.doc_owner_id) { const el = document.getElementById('f-doc-owner'); if (el) el.value = d.doc_owner_id; }

    // Load TTD signatures (3 signers: prepared, approved1, pengesahan)
    if (d.ttd) {
      ['prepared','approved1','pengesahan'].forEach(role => {
        const ttd = d.ttd[role];
        if (ttd && ttd.data) {
          const img = document.getElementById('ttd-img-' + role);
          const placeholder = document.getElementById('ttd-placeholder-' + role);
          const clearBtn = document.getElementById('btn-clear-' + role);
          const dataInput = document.getElementById('ttd-data-' + role);
          const typeInput = document.getElementById('ttd-type-' + role);
          if (img) { img.src = ttd.data; img.style.display = 'block'; }
          if (placeholder) placeholder.style.display = 'none';
          if (clearBtn) clearBtn.style.display = 'inline-flex';
          if (dataInput) dataInput.value = ttd.data;
          if (typeInput) typeInput.value = ttd.type || 'ttd';
        }
      });
    }

    // Load section data — template-driven
    const s = d.steps || {};

    // For each section in the active template, load data from the document
    for (const section of activeTemplateSections) {
      const secId = section.id;

      // Special handling for known built-in section data mappings
      switch (secId) {
        case 'tujuan':
          setRteContent('rte-tujuan', s.tujuan || '');
          break;
        case 'ruang_lingkup':
          setRteContent('rte-ruang_lingkup', s.ruang_lingkup || '');
          break;
        case 'definisi':
          loadDynTable('tbody-definisi', d.definisi, section.columns || ['Istilah', 'Penjelasan']);
          break;
        case 'dokumen_terkait':
          loadDynTable('pendukungBody', d.dokumen_pendukung, ['nomor']);
          loadDynTable('referensiBody', d.dokumen_referensi, ['nama']);
          loadDynTable('perizinanBody', d.dokumen_perizinan, ['nama']);
          break;
        case 'sdm':
          loadDynTable('tbody-sdm', d.sdm, section.columns || ['Kompetensi', 'Jumlah', 'Keterangan']);
          break;
        case 'tools':
          loadDynTable('tbody-tools', d.tools, section.columns || ['Nama', 'Jumlah', 'Keterangan']);
          break;
        case 'material':
          loadDynTable('tbody-material', d.material, section.columns || ['Nama', 'Jumlah', 'Keterangan']);
          break;
        case 'identifikasi_risiko':
          loadRiskData(d.risiko);
          break;
        case 'metode_pengukuran':
          loadDynTable('tbody-metode_pengukuran', s.metode_pengukuran, section.columns || ['Metode', 'Parameter', 'Keterangan']);
          break;
        case 'formulir':
          setRteContent('rte-formulir', s.formulir || '');
          break;
        case 'data_teknik':
          setRteContent('rte-data_teknik', s.data_teknik || '');
          break;
        case 'change_history':
          loadChangeHistory(d.change_history);
          break;
        default:
          // Aktivitas sections
          if (secId.startsWith('aktivitas_')) {
            loadAktivitasRte(secId, s[secId]);
          } else {
            // Custom / generic sections — load from d.custom_sections
            loadCustomSectionData(section, d.custom_sections);
          }
          break;
      }
    }

    // Load file attachments
    if (d.attachments_formulir) loadAttachments('rte-formulir', d.attachments_formulir);
    if (d.attachments_data_teknik) loadAttachments('rte-data_teknik', d.attachments_data_teknik);

    showToast('Data dokumen dimuat', 'success');
    attachAutoGrow(); renderIcons();
  } catch (e) {
    console.error('[BuatIK] loadDokumenForEdit error:', e);
    showToast('Gagal memuat: ' + e.message, 'error');
  }
}

function loadCustomSectionData(section, customSections) {
  if (!customSections) return;
  const data = customSections[section.id];
  if (!data) return;

  if (section.type === 'richtext') {
    setRteContent('rte-' + section.id, data);
  } else if (section.type === 'textarea') {
    const el = document.getElementById('f-' + section.id);
    if (el) el.value = data;
  } else if (section.type === 'table') {
    loadDynTable('tbody-' + section.id, data, section.columns || ['Isi']);
  }
}

// ─── UPGRADE TEMPLATE ───
async function upgradeDocTemplate(docId) {
  const ok = await confirmDialog({
    title: 'Upgrade Template',
    icon: 'arrow-up-circle',
    message: 'Upgrade template dokumen ini ke versi terbaru? Data yang sudah diisi <b>tidak akan hilang</b>, namun struktur seksi akan disesuaikan dengan template terbaru.',
    confirmText: 'Upgrade',
  });
  if (!ok) return;
  try {
    const res = await fetch(`api/dokumen/${docId}/upgrade-template`, { method: 'POST', headers: { 'Content-Type': 'application/json' } });
    const json = await res.json();
    if (!json.success && json.error) { showToast(json.error, 'error'); return; }
    showToast(json.message || 'Template berhasil di-upgrade', 'success');
    pendingEditId = docId;
    showPage('buat-ik');
  } catch (e) { showToast('Gagal upgrade: ' + e.message, 'error'); }
}

// Load aktivitas content — supports both new RTE string and legacy step array
function loadAktivitasRte(secId, data) {
  if (!data) return;
  if (typeof data === 'string') {
    setRteContent('rte-aktivitas-' + secId, data);
  } else if (Array.isArray(data) && data.length > 0) {
    let html = '<ol>';
    data.forEach(step => {
      html += `<li>${step.uraian || ''}</li>`;
    });
    html += '</ol>';
    setRteContent('rte-aktivitas-' + secId, html);
  }
}

function parseArr(v) {
  if (Array.isArray(v)) return v;
  if (typeof v === 'string') try { return JSON.parse(v); } catch(e) {}
  return [];
}

// Generic dynamic table loader — works with any column config
function loadDynTable(tbodyId, data, columns) {
  const arr = parseArr(data);
  const tb = document.getElementById(tbodyId);
  if (!tb || !arr.length) return;
  const hasNum = columns.length > 1;
  const colKeys = columns.map(c => c.toLowerCase().replace(/[\s\/]/g, '_'));
  tb.innerHTML = '';
  arr.forEach((item, idx) => {
    const tr = document.createElement('tr');
    let html = '';
    if (hasNum) html += `<td style="text-align:center;font-size:11px">${idx + 1}</td>`;
    const skipKeys = new Set(['id', 'dokumen_id', 'tipe']);
    columns.forEach((col, ci) => {
      // Try to match value by column key or by index (skip internal DB keys)
      let val = '';
      if (typeof item === 'object' && item !== null) {
        val = item[colKeys[ci]] ?? item[col] ?? '';
        if (!val && val !== 0) {
          const dataKeys = Object.keys(item).filter(k => !skipKeys.has(k));
          val = (ci < dataKeys.length) ? item[dataKeys[ci]] : '';
        }
      } else {
        val = item;
      }
      html += `<td><input class="inline-input typewriter" value="${esc(String(val ?? ''))}" placeholder="${esc(col)}" style="font-size:12px;width:100%"></td>`;
    });
    html += `<td style="width:28px;padding:0;position:relative"><div class="step-actions" style="display:flex;position:static;transform:none"><button onclick="delDynRow(this,'${tbodyId}')">${icon('x', 13)}</button></div></td>`;
    tr.innerHTML = html;
    tb.appendChild(tr);
  });
}

function loadChangeHistory(data) {
  const arr = parseArr(data);
  const tb = document.getElementById('changeHistoryBody');
  if (!tb) return;
  if (!arr.length) return; // keep empty state message
  tb.innerHTML = '';
  arr.forEach((item, idx) => {
    tb.insertAdjacentHTML('beforeend', renderChangeHistoryRow(idx + 1, item));
  });
}
function refreshChangeHistoryUI(historyArr) {
  const tb = document.getElementById('changeHistoryBody');
  if (!tb) return;
  const arr = Array.isArray(historyArr) ? historyArr : [];
  if (!arr.length) {
    tb.innerHTML = '<tr><td colspan="5" style="text-align:center;font-size:11px;color:#9E9A93;padding:12px;font-style:italic">Belum ada riwayat perubahan</td></tr>';
    return;
  }
  tb.innerHTML = '';
  arr.forEach((item, idx) => {
    tb.insertAdjacentHTML('beforeend', renderChangeHistoryRow(idx + 1, item));
  });
}

function loadRiskData(risks) {
  if (!risks || !risks.length) return;
  const tbInherent = document.getElementById('riskInherentBody');
  const tbResidual = document.getElementById('riskResidualBody');
  if (!tbInherent || !tbResidual) return;
  tbInherent.innerHTML = '';
  tbResidual.innerHTML = '';
  risks.forEach((r, idx) => {
    tbInherent.insertAdjacentHTML('beforeend', renderRiskInherentRow(idx + 1));
    tbResidual.insertAdjacentHTML('beforeend', renderRiskResidualRow(idx + 1));
    const iRow = tbInherent.children[idx];
    const rRow = tbResidual.children[idx];
    if (iRow) {
      const tas = iRow.querySelectorAll('textarea');
      const sels = iRow.querySelectorAll('select');
      setField(tas[0], r.risiko || '');
      setField(tas[1], r.penyebab || '');
      if (sels[0]) sels[0].value = r.kemungkinan || '3';
      if (sels[1]) sels[1].value = r.dampak_level || '3';
      if (sels[0] && sels[0].value) calcRiskScore(sels[0]);
    }
    if (rRow) {
      const tas = rRow.querySelectorAll('textarea');
      const sels = rRow.querySelectorAll('select');
      setField(tas[0], r.kontrol_existing || '');
      setField(tas[1], r.mitigasi || '');
      if (sels[0]) sels[0].value = r.residual_kemungkinan || '';
      if (sels[1]) sels[1].value = r.residual_dampak || '';
      if (sels[0] && sels[0].value) calcRiskScore(sels[0]);
    }
  });
  updateRiskHeatMap();
}

function setField(el, val) { if (el) el.value = val; }

// ════════════════════════════════════════════
//  COLLECT DOCUMENT DATA (Template-Driven)
// ════════════════════════════════════════════
function collectDocData() {
  const g = id => document.getElementById(id)?.value || '';

  // Generic table collector for dynamic tbody
  const collectDynTable = (tbodyId, columns) => {
    const tb = document.getElementById(tbodyId);
    if (!tb) return [];
    const hasNum = columns.length > 1;
    const colKeys = columns.map(c => c.toLowerCase().replace(/[\s\/]/g, '_'));
    return Array.from(tb.querySelectorAll('tr')).map(r => {
      const ins = r.querySelectorAll('input,textarea');
      const obj = {};
      const offset = hasNum ? 0 : 0; // inputs don't include "No" td (it's text, not input)
      columns.forEach((col, i) => {
        obj[colKeys[i]] = ins[i + offset]?.value || '';
      });
      return obj;
    });
  };

  const collectRisks = () => {
    const tbInherent = document.getElementById('riskInherentBody');
    const tbResidual = document.getElementById('riskResidualBody');
    if (!tbInherent) return [];
    const rows = [];
    const iRows = tbInherent.querySelectorAll('tr');
    const rRows = tbResidual ? tbResidual.querySelectorAll('tr') : [];
    iRows.forEach((tr, idx) => {
      const tas = tr.querySelectorAll('textarea');
      const sels = tr.querySelectorAll('select');
      const scoreCell = tr.querySelector('.risk-score');
      const rTr = rRows[idx];
      const rTas = rTr ? rTr.querySelectorAll('textarea') : [];
      const rSels = rTr ? rTr.querySelectorAll('select') : [];
      const rScoreCell = rTr ? rTr.querySelector('.risk-score') : null;
      rows.push({
        risiko: tas[0]?.value || '',
        penyebab: tas[1]?.value || '',
        kemungkinan: sels[0]?.value || '',
        dampak_level: sels[1]?.value || '',
        skor_inheren: scoreCell?.textContent || '',
        kontrol_existing: rTas[0]?.value || '',
        mitigasi: rTas[1]?.value || '',
        residual_kemungkinan: rSels[0]?.value || '',
        residual_dampak: rSels[1]?.value || '',
        skor_residual: rScoreCell?.textContent || '',
      });
    });
    return rows;
  };

  // Build steps and section data dynamically from template
  const steps = {};
  const customSections = {};

  // Known built-in section data keys
  const builtinDataMap = {};

  for (const section of activeTemplateSections) {
    const secId = section.id;

    if (secId === 'change_history' || secId === 'identifikasi_risiko' || secId === 'dokumen_terkait') continue;
    if (secId === 'definisi' || secId === 'sdm' || secId === 'tools' || secId === 'material') continue;

    if (secId.startsWith('aktivitas_')) {
      steps[secId] = getRteContent('rte-aktivitas-' + secId) || '';
    } else if (section.type === 'richtext') {
      const content = getRteContent('rte-' + secId) || '';
      if (['tujuan', 'ruang_lingkup', 'data_teknik', 'formulir'].includes(secId)) {
        steps[secId] = content;
      } else if (secId.startsWith('custom_')) {
        customSections[secId] = content;
      } else {
        steps[secId] = content;
      }
    } else if (section.type === 'textarea') {
      const val = g('f-' + secId);
      if (secId.startsWith('custom_')) {
        customSections[secId] = val;
      } else {
        steps[secId] = val;
      }
    } else if (section.type === 'table') {
      const data = collectDynTable('tbody-' + secId, section.columns || ['Isi']);
      if (secId === 'metode_pengukuran') {
        steps.metode_pengukuran = data;
      } else if (secId.startsWith('custom_')) {
        customSections[secId] = data;
      }
    }
  }

  // Collect known built-in table sections explicitly
  const definisiSection = activeTemplateSections.find(s => s.id === 'definisi');
  const sdmSection = activeTemplateSections.find(s => s.id === 'sdm');
  const toolsSection = activeTemplateSections.find(s => s.id === 'tools');
  const materialSection = activeTemplateSections.find(s => s.id === 'material');

  return {
    judul: g('f-judul'),
    unit_id: g('f-bidang'),
    probis_id: g('f-probis'),
    template_id: activeTemplate?.id || null,
    template_snapshot: JSON.stringify(activeTemplateSections),
    template_versi: activeTemplate?.versi || null,
    tanggal_ditetapkan: g('f-tgl'),
    tanggal_diperbarui: g('f-tgl-update'),
    tingkat_risiko: 'Sedang',
    revisi: String(parseInt(g('f-revisi'), 10) || 0).padStart(2, '0'),
    penyusun_nama: g('f-prepared'),
    penyusun_jabatan: g('f-prepared-jabatan'),
    doc_owner_id: g('f-doc-owner') || null,
    approver_id: g('f-approved') || null,
    pengesahan_id: g('f-pengesahan') || null,
    ttd: {
      prepared: { data: g('ttd-data-prepared'), type: g('ttd-type-prepared') },
      approved1: { data: g('ttd-data-approved1'), type: g('ttd-type-approved1') },
      pengesahan: { data: g('ttd-data-pengesahan'), type: g('ttd-type-pengesahan') },
    },
    attachments_formulir: collectAttachments('rte-formulir'),
    attachments_data_teknik: collectAttachments('rte-data_teknik'),
    steps: steps,
    risiko: collectRisks(),
    definisi: definisiSection ? collectDynTable('tbody-definisi', definisiSection.columns || ['Istilah', 'Penjelasan']) : [],
    dokumen_pendukung: collectDynTable('pendukungBody', ['nomor']),
    dokumen_referensi: collectDynTable('referensiBody', ['nama']),
    dokumen_perizinan: collectDynTable('perizinanBody', ['nama']),
    sdm: sdmSection ? collectDynTable('tbody-sdm', sdmSection.columns || ['Kompetensi', 'Jumlah', 'Keterangan']) : [],
    tools: toolsSection ? collectDynTable('tbody-tools', toolsSection.columns || ['Nama', 'Jumlah', 'Keterangan']) : [],
    material: materialSection ? collectDynTable('tbody-material', materialSection.columns || ['Nama', 'Jumlah', 'Keterangan']) : [],
    // Bagian yang berubah dideteksi otomatis server-side; di sini hanya kirim
    // catatan manual (opsional) per revisi yang diisi penyusun di kolom Uraian.
    change_history_notes: collectChangeHistoryNotes(),
    custom_sections: Object.keys(customSections).length > 0 ? customSections : undefined,
  };
}

// Map { "<revisi>": "<catatan manual>" } dari input opsional di Daftar Perubahan.
function collectChangeHistoryNotes() {
  const notes = {};
  document.querySelectorAll('#changeHistoryBody .ch-note').forEach(inp => {
    const rev = inp.dataset.rev || '';
    if (rev) notes[rev] = inp.value || '';
  });
  return notes;
}

// ════════════════════════════════════════════
//  TTD DIGITAL / QR CODE UPLOAD
// ════════════════════════════════════════════
function uploadTTD(role, type) {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.onchange = function(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(ev) {
      const dataUrl = ev.target.result;
      const img = document.getElementById('ttd-img-' + role);
      const placeholder = document.getElementById('ttd-placeholder-' + role);
      const clearBtn = document.getElementById('btn-clear-' + role);
      const dataInput = document.getElementById('ttd-data-' + role);
      const typeInput = document.getElementById('ttd-type-' + role);
      if (img) { img.src = dataUrl; img.style.display = 'block'; }
      if (placeholder) placeholder.style.display = 'none';
      if (clearBtn) clearBtn.style.display = 'inline-flex';
      if (dataInput) dataInput.value = dataUrl;
      if (typeInput) typeInput.value = type;
      showToast(`${type === 'qr' ? 'QR Code' : 'TTD Digital'} berhasil diupload`, 'success');
    };
    reader.readAsDataURL(file);
  };
  input.click();
}

function clearTTD(role) {
  const img = document.getElementById('ttd-img-' + role);
  const placeholder = document.getElementById('ttd-placeholder-' + role);
  const clearBtn = document.getElementById('btn-clear-' + role);
  const dataInput = document.getElementById('ttd-data-' + role);
  const typeInput = document.getElementById('ttd-type-' + role);
  if (img) { img.src = ''; img.style.display = 'none'; }
  if (placeholder) placeholder.style.display = 'flex';
  if (clearBtn) clearBtn.style.display = 'none';
  if (dataInput) dataInput.value = '';
  if (typeInput) typeInput.value = '';
}

// Guard against double-click creating duplicate records (shared by saveDraft & submitIK)
let _saveInFlight = false;

async function saveDraft() {
  if (_saveInFlight) return; // ignore rapid double-click while a save is running
  const data = collectDocData();
  if (!data.judul) { showToast('Judul IK wajib diisi', 'error'); return; }
  if (!data.unit_id) { showToast('Pilih unit/bidang', 'error'); return; }
  if (!data.probis_id) { showToast('Pilih proses bisnis (Probis)', 'error'); return; }
  _saveInFlight = true;
  try {
    if (editingDocId) {
      // Server-side auto-detects changes and appends to change_history
      const res = await API.updateDokumen(editingDocId, data);
      const updatedDoc = res.data;
      // Refresh the change history UI from server response
      if (updatedDoc?.change_history) {
        refreshChangeHistoryUI(updatedDoc.change_history);
      }
      showToast('Draft diperbarui', 'success');
    } else {
      const res = await API.createDokumen(data);
      editingDocId = res.data?.id || res.data?.dokumen?.id;
      if (res.data?.nomor_dokumen) setNomorDokumen(res.data.nomor_dokumen);
      showToast('Draft tersimpan — No. ' + (res.data?.nomor_dokumen || ''), 'success');
    }
  } catch (e) { console.error('saveDraft error:', e); showToast('Gagal menyimpan: ' + e.message, 'error'); }
  finally { _saveInFlight = false; }
}

// ════════════════════════════════════════════
//  TEMPLATE SYNC — Detect template changes
// ════════════════════════════════════════════
async function reloadActiveTemplate() {
  if (editingDocId) {
    showToast('Template sync hanya berlaku untuk dokumen baru. Gunakan "Upgrade Template" untuk dokumen existing.', 'warning');
    return;
  }
  try {
    const tplRes = await API.getActiveTemplate();
    activeTemplate = tplRes.data;
    const parsed = activeTemplate.konten ? JSON.parse(activeTemplate.konten) : [];
    activeTemplateSections = parsed.filter(s => s.enabled !== false);
    if (activeTemplateSections.length === 0) {
      activeTemplateSections = (typeof DEFAULT_SECTIONS !== 'undefined' ? DEFAULT_SECTIONS : []).map(s => ({ ...s, enabled: true }));
    }
    _tplLoadedAt = Date.now();
    showToast('Template dimuat ulang: ' + activeTemplate.nama + ' (' + activeTemplate.versi + ')', 'success');
    // Re-render the entire form (will lose unsaved changes)
    renderBuatIK(document.getElementById('appContent'));
  } catch (e) {
    showToast('Gagal memuat template: ' + e.message, 'error');
  }
}

async function submitIK() {
  if (_saveInFlight) return; // ignore rapid double-click while a save is running
  const data = collectDocData();
  if (!data.judul) { showToast('Judul IK wajib diisi', 'error'); return; }
  if (!data.unit_id) { showToast('Pilih unit/bidang', 'error'); return; }
  if (!data.probis_id) { showToast('Pilih proses bisnis (Probis)', 'error'); return; }
  _saveInFlight = true;
  try {
    if (editingDocId) {
      // Server auto-records change history
      await API.updateDokumen(editingDocId, { ...data, status: 'Review' });
    } else {
      const res = await API.createDokumen({ ...data, status: 'Review' });
      editingDocId = res.data?.id || res.data?.dokumen?.id;
      if (res.data?.nomor_dokumen) setNomorDokumen(res.data.nomor_dokumen);
    }
    showToast('Dokumen disubmit untuk review', 'success');
    showPage('master-ik');
  } catch (e) { showToast('Gagal: ' + e.message, 'error'); }
  finally { _saveInFlight = false; }
}
