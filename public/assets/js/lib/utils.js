// Brantas DMS — Utility Functions

// State
const APP = {
  currentPage: 'dashboard',
  currentStep: 1,
  user: __INITIAL_STATE__.user,
  loggedIn: __INITIAL_STATE__.loggedIn,
  cache: {},
};

const PAGE_TITLES = {
  'dashboard': 'Dashboard',
  'master-ik': 'Master Data IK Repository',
  'buat-ik': 'Buat IK Baru',
  'workflow': 'Alur Persetujuan',
  'template': 'Template Engine',
  'equipment': 'Master Equipment',
  'qrcode': 'QR Code Manager',
  'laporan': 'Laporan & Monitoring',
  'audit': 'Audit Trail',
  'master-data': 'Master Data Sistem',
  'pengguna': 'Pengguna & Akses',
  'admin-roles': 'Role & Permission Manager',
  'admin-sessions': 'Sesi Aktif Pengguna',
  'admin-audit': 'Audit Trail Lengkap',
  'pengaturan': 'Pengaturan',
  'help': 'Bantuan & Panduan'
};

// Lucide icon helper — returns SVG string
function icon(name, size = 16, className = '') {
  return `<i data-lucide="${name}" class="lucide ${className}" style="width:${size}px;height:${size}px;stroke-width:1.8"></i>`;
}
// Re-render lucide icons after DOM change
function renderIcons() { if (window.lucide) lucide.createIcons(); }

// Skeleton loading for tables
function tableSkeleton(rows = 8, cols = 6) {
  let html = '';
  for (let r = 0; r < rows; r++) {
    html += '<tr class="skeleton-row">';
    for (let c = 0; c < cols; c++) {
      const w = 40 + Math.random() * 55;
      html += `<td><div class="skeleton skeleton-cell" style="width:${w}%"></div></td>`;
    }
    html += '</tr>';
  }
  return html;
}
function cardSkeleton(count = 4) {
  let html = '';
  for (let i = 0; i < count; i++) {
    html += `<div class="stat-card"><div class="skeleton" style="width:40px;height:40px;border-radius:6px;margin-bottom:14px"></div>
      <div class="skeleton" style="width:60%;height:10px;margin-bottom:8px;border-radius:3px"></div>
      <div class="skeleton" style="width:40%;height:24px;border-radius:4px"></div></div>`;
  }
  return html;
}

// Badge helpers
function statusBadge(s) {
  const m = {
    Draft: 'badge-draft',
    Review: 'badge-review',
    'Approved-T1': 'badge-review',
    'Approved-T2': 'badge-approved',
    Published: 'badge-published',
    Archived: 'badge-archived'
  };
  const labels = {
    'Review': 'Review (Asman)',
    'Approved-T1': 'Approved (Manager)',
    'Approved-T2': 'Pengesahan (SM)',
  };
  return `<span class="badge ${m[s] || 'badge-gray'}">${labels[s] || s}</span>`;
}

function riskBadge(r) {
  const m = { Rendah: 'badge-risk-low', Sedang: 'badge-risk-moderate', Moderate: 'badge-risk-moderate', Tinggi: 'badge-risk-high', Ekstrem: 'badge-risk-extreme' };
  return `<span class="badge ${m[r] || 'badge-gray'}">${r}</span>`;
}

function roleBadge(r) {
  const m = {
    'Super Admin': 'badge-risk-high',
    'Admin': 'badge-risk-high',
    'Senior Manager': 'badge-approved',
    'Manager': 'badge-blue',
    'Asst. Manager': 'badge-amber',
    'Document Owner': 'badge-sky',
    'Viewer': 'badge-gray'
  };
  return `<span class="badge ${m[r] || 'badge-gray'}">${r}</span>`;
}

// Toast
function showToast(msg, type = 'info') {
  const c = document.getElementById('toastContainer');
  const t = document.createElement('div');
  const icons = { success: 'check-circle', error: 'x-circle', warning: 'alert-triangle', info: 'info' };
  t.className = `toast toast-${type}`;
  t.innerHTML = `<span>${icon(icons[type] || 'bell', 18)}</span><span>${msg}</span>`;
  c.appendChild(t);
  setTimeout(() => t.classList.add('show'), 10);
  setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 350); }, 3500);
  renderIcons();
}

// Modal
function openModal(id) { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }
function openGenericModal(title, bodyHtml, footerHtml = '') {
  document.getElementById('modalGenericTitle').textContent = title;
  document.getElementById('modalGenericBody').innerHTML = bodyHtml;
  document.getElementById('modalGenericFooter').innerHTML = footerHtml || '<button class="btn btn-secondary" onclick="closeModal(\'modalGeneric\')">Tutup</button>';
  openModal('modalGeneric');
  renderIcons();
}

// Confirm dialog (pengganti window.confirm / window.prompt yang nyaman & sesuai tema).
// opts: { title, message(html), confirmText, cancelText, danger, icon, input }
//   - Tanpa `input`  → resolve(true/false)
//   - Dengan `input` → resolve(string trimmed) bila konfirmasi, atau null bila batal.
//     input: { label, placeholder, value, required }
function confirmDialog(opts = {}) {
  return new Promise((resolve) => {
    const {
      title = 'Konfirmasi', message = '', confirmText = 'Lanjutkan',
      cancelText = 'Batal', danger = false, icon: ic = 'help-circle', input = null,
    } = opts;

    const inputHtml = input ? `
      <div style="margin-top:14px">
        ${input.label ? `<label style="display:block;font-size:11.5px;font-weight:600;color:var(--text-secondary);margin-bottom:5px">${esc(input.label)}</label>` : ''}
        <textarea id="__confirmDlgInput" rows="3" placeholder="${esc(input.placeholder || '')}"
          style="width:100%;font-size:13px;padding:8px 10px;border:1px solid var(--border);border-radius:8px;resize:vertical;font-family:inherit;box-sizing:border-box">${esc(input.value || '')}</textarea>
      </div>` : '';

    const body = `
      <div style="display:flex;gap:14px;align-items:flex-start">
        <div style="flex-shrink:0;width:42px;height:42px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:${danger ? 'var(--danger-bg)' : 'var(--primary-light)'};color:${danger ? 'var(--danger)' : 'var(--primary)'}">${icon(ic, 22)}</div>
        <div style="flex:1;font-size:13px;line-height:1.55;color:var(--text-secondary);padding-top:2px">${message}</div>
      </div>${inputHtml}`;

    const footer = `
      <button class="btn btn-secondary" onclick="__confirmDlgDone(false)">${esc(cancelText)}</button>
      <button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" onclick="__confirmDlgDone(true)">${esc(confirmText)}</button>`;

    window.__confirmDlgDone = (ok) => {
      let val = null;
      if (ok && input) {
        val = (document.getElementById('__confirmDlgInput')?.value || '').trim();
        if (input.required && !val) { showToast('Mohon isi terlebih dahulu', 'warning'); return; }
      }
      closeModal('modalGeneric');
      window.__confirmDlgDone = null;
      resolve(input ? (ok ? val : null) : ok);
    };

    openGenericModal(title, body, footer);
    if (input) setTimeout(() => document.getElementById('__confirmDlgInput')?.focus(), 60);
  });
}

// Format date
function formatDate(dateStr) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

// Escape HTML
function esc(str) {
  const div = document.createElement('div');
  div.textContent = str || '';
  return div.innerHTML;
}

// Debounce
function debounce(fn, ms = 300) {
  let timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), ms);
  };
}

// Init modal close on overlay background click only
document.addEventListener('click', function (e) {
  const overlay = e.target.closest('.modal-overlay');
  if (overlay && e.target === overlay) {
    overlay.classList.remove('open');
  }
});

// Prevent clicks inside modal dialog from propagating to overlay/document
document.getElementById('modalGenericInner')?.addEventListener('click', function (e) {
  e.stopPropagation();
});
