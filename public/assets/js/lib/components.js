// Brantas DMS — Shared UI Components
// Reusable component functions for pages

function renderDataTable(headers, rows, opts = {}) {
  const thead = headers.map(h => `<th>${h}</th>`).join('');
  const tbody = rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('');
  return `<div class="table-container"><table><thead><tr>${thead}</tr></thead><tbody>${tbody}</tbody></table></div>`;
}

function renderConfirmDialog(title, message, confirmText = 'Ya', cancelText = 'Batal') {
  return new Promise((resolve) => {
    const footer = `
      <button class="btn btn-secondary" onclick="closeModal('modalGeneric');resolvePromise(false)">${cancelText}</button>
      <button class="btn btn-primary" onclick="closeModal('modalGeneric');resolvePromise(true)">${confirmText}</button>
    `;
    openGenericModal(title, `<p>${message}</p>`, footer);
    window.resolvePromise = resolve;
  });
}

function renderPageLoading() {
  return '<div class="page active" style="display:flex;align-items:center;justify-content:center;min-height:300px"><div style="text-align:center"><div style="color:var(--text-tertiary);margin-bottom:8px"><i data-lucide="loader-2" style="width:28px;height:28px;animation:spin 1.2s linear infinite"></i></div><div style="color:var(--text-tertiary);font-size:13px">Memuat data...</div></div></div>';
}

function renderPageError(message) {
  return `<div class="page active" style="padding:24px"><div class="alert alert-danger"><div style="margin-right:8px">${icon('alert-circle', 16)}</div><div>${esc(message)}</div></div></div>`;
}
