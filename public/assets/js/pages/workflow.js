// Workflow Page — 3-Tier Sequential Approval
// Flow: Draft → Review (Asman) → Approved-T1 (Manager) → Approved-T2/Published (SM)

const WF_STATUS_CONFIG = {
  'Review': { label: 'Menunggu Review Asman', color: '#FFF4E6', icon: 'eye', tierNeeded: 1 },
  'Approved-T1': { label: 'Menunggu Approval Manager', color: '#E6F0FF', icon: 'check-circle', tierNeeded: 2 },
  'Approved-T2': { label: 'Menunggu Pengesahan SM', color: '#E3FCEF', icon: 'shield-check', tierNeeded: 3 },
};

async function renderWorkflow(container) {
  container.innerHTML = `<div class="page active" id="page-workflow"></div>`;

  try {
    const res = await API.getWorkflow();
    const docs = res.data || [];

    const review = docs.filter(d => d.status === 'Review');
    const t1 = docs.filter(d => d.status === 'Approved-T1');
    const t2 = docs.filter(d => d.status === 'Approved-T2');
    const draft = docs.filter(d => d.status === 'Draft');

    document.getElementById('page-workflow').innerHTML = `
      <div class="page-header">
        <div class="page-header-left">
          <div class="page-title">Alur Persetujuan Berjenjang</div>
          <div class="page-subtitle">3-Tier: Asman (Review) → Manager (Approve) → Senior Manager (Pengesahan)</div>
        </div>
      </div>

      <!-- Status Pipeline Visual -->
      <div class="wf-pipeline" style="display:flex;gap:6px;margin-bottom:16px;flex-wrap:wrap">
        <div class="wf-pipe-item" style="flex:1;min-width:160px;padding:10px 14px;background:#FFF4E6;border-radius:8px;border-left:4px solid #F59E0B">
          <div style="font-size:11px;font-weight:600;color:#92400E">${icon('eye', 14)} Tier 1 — Review Asman</div>
          <div style="font-size:22px;font-weight:700;color:#D97706;margin-top:4px">${review.length}</div>
        </div>
        <div style="display:flex;align-items:center;color:#ccc;font-size:18px">→</div>
        <div class="wf-pipe-item" style="flex:1;min-width:160px;padding:10px 14px;background:#E6F0FF;border-radius:8px;border-left:4px solid #2563EB">
          <div style="font-size:11px;font-weight:600;color:#1E40AF">${icon('check-circle', 14)} Tier 2 — Approval Manager</div>
          <div style="font-size:22px;font-weight:700;color:#2563EB;margin-top:4px">${t1.length}</div>
        </div>
        <div style="display:flex;align-items:center;color:#ccc;font-size:18px">→</div>
        <div class="wf-pipe-item" style="flex:1;min-width:160px;padding:10px 14px;background:#E3FCEF;border-radius:8px;border-left:4px solid #059669">
          <div style="font-size:11px;font-weight:600;color:#065F46">${icon('shield-check', 14)} Tier 3 — Pengesahan SM</div>
          <div style="font-size:22px;font-weight:700;color:#059669;margin-top:4px">${t2.length}</div>
        </div>
      </div>

      <div class="tabs">
        <div class="tab active" onclick="switchWFTab(this,'wf-review')">${icon('eye', 14)} Review Asman (${review.length})</div>
        <div class="tab" onclick="switchWFTab(this,'wf-t1')">${icon('check-circle', 14)} Approval Manager (${t1.length})</div>
        <div class="tab" onclick="switchWFTab(this,'wf-t2')">${icon('shield-check', 14)} Pengesahan SM (${t2.length})</div>
        <div class="tab" onclick="switchWFTab(this,'wf-draft')">${icon('file-edit', 14)} Draft (${draft.length})</div>
      </div>
      <div id="wf-review" class="tab-content active">${renderWFTable(review, 'Review')}</div>
      <div id="wf-t1" class="tab-content">${renderWFTable(t1, 'Approved-T1')}</div>
      <div id="wf-t2" class="tab-content">${renderWFTable(t2, 'Approved-T2')}</div>
      <div id="wf-draft" class="tab-content">${renderWFTable(draft, 'Draft')}</div>
    `;
    renderIcons();
  } catch (e) {
    document.getElementById('page-workflow').innerHTML = `<div class="alert alert-danger">${esc(e.message)}</div>`;
  }
}

function renderWFTable(docs, status) {
  if (!docs.length) {
    return `<div class="card"><div class="card-body"><div class="empty-state"><div class="empty-icon">${icon('clipboard', 18)}</div><div class="empty-title">Tidak ada dokumen</div><div class="empty-desc">Belum ada dokumen dalam tahap ini</div></div></div></div>`;
  }

  const session = APP.user;
  const currentRole = session?.role;
  const isSuperAdmin = currentRole === 'Super Admin';
  const isAdmin = currentRole === 'Admin';
  const isAsman = currentRole === 'Asst. Manager';
  const isManager = currentRole === 'Manager';
  const isSM = currentRole === 'Senior Manager';

  return `<div class="card"><div class="table-container"><table>
    <thead><tr><th>No. Dokumen</th><th>Judul IK</th><th>Penyusun</th><th>Risiko</th><th>Status</th><th>Aksi</th></tr></thead>
    <tbody>${docs.map(d => {
      // Determine which actions the current user can perform based on status + role
      let actions = `<button class="btn btn-secondary btn-xs" onclick="viewDocDetail(${d.id})" title="Lihat detail">${icon('eye', 14)}</button>`;

      if (status === 'Review' && (isAsman || isSuperAdmin || isAdmin)) {
        // Self-review prevention
        const isSelf = d.owner_id == session?.id || d.submitted_by == session?.id;
        if (!isSelf || isSuperAdmin) {
          actions += `<button class="btn btn-success btn-xs" onclick="doReviewApprove(${d.id})" title="Review & Approve (Tier 1)">${icon('check', 14)} Review OK</button>`;
        } else {
          actions += `<span style="font-size:10px;color:#9E9A93;font-style:italic">Tidak bisa review sendiri</span>`;
        }
        if (isAsman || isSuperAdmin || isAdmin) {
          actions += `<button class="btn btn-warning btn-xs" onclick="doReturnRevisi(${d.id})" title="Return revisi">${icon('undo-2', 14)} Revisi</button>`;
          actions += `<button class="btn btn-danger btn-xs" onclick="doReject(${d.id})" title="Tolak">${icon('x', 14)}</button>`;
        }
      }

      else if (status === 'Approved-T1' && (isManager || isSuperAdmin || isAdmin)) {
        actions += `<button class="btn btn-success btn-xs" onclick="doApproveT1(${d.id})" title="Approve (Tier 2 — Manager)">${icon('check', 14)} Approve</button>`;
        actions += `<button class="btn btn-warning btn-xs" onclick="doReturnRevisi(${d.id})" title="Return revisi">${icon('undo-2', 14)} Revisi</button>`;
        actions += `<button class="btn btn-danger btn-xs" onclick="doReject(${d.id})" title="Tolak">${icon('x', 14)}</button>`;
      }

      else if (status === 'Approved-T2' && (isSM || isSuperAdmin || isAdmin)) {
        actions += `<button class="btn btn-success btn-xs" onclick="doApproveT2(${d.id})" title="Sahkan & Publish (Final)">${icon('shield-check', 14)} Sahkan</button>`;
        actions += `<button class="btn btn-warning btn-xs" onclick="doReturnRevisi(${d.id})" title="Return revisi">${icon('undo-2', 14)} Revisi</button>`;
        actions += `<button class="btn btn-danger btn-xs" onclick="doReject(${d.id})" title="Tolak">${icon('x', 14)}</button>`;
      }

      else if (status === 'Draft') {
        const canEdit = isSuperAdmin || isAdmin || _hasPermission('doc:edit');
        const canSubmit = isSuperAdmin || isAdmin || _hasPermission('approve:submit');
        if (canEdit) actions += `<button class="btn btn-outline btn-xs" onclick="editDokumen(${d.id})" title="Edit dokumen">${icon('pencil', 14)} Edit</button>`;
        if (canSubmit) actions += `<button class="btn btn-primary btn-xs" onclick="doSubmit(${d.id})" title="Submit untuk review">${icon('upload', 14)} Submit</button>`;
      }

      else if (status === 'Published') {
        if (d.gdrive_url) {
          actions += `<a class="btn btn-outline btn-xs" href="${esc(d.gdrive_url)}" target="_blank" rel="noopener" title="Buka di Google Drive">${icon('external-link', 14)} Drive</a>`;
        }
        if (isSuperAdmin || isAdmin) {
          actions += `<button class="btn btn-secondary btn-xs" onclick="uploadDocToDrive(${d.id})" title="${d.gdrive_url ? 'Unggah ulang ke Google Drive' : 'Unggah ke Google Drive'}">${icon('cloud-upload', 14)} ${d.gdrive_url ? 'Re-upload' : 'Upload Drive'}</button>`;
        }
      }

      // Status badge
      const statusBadge = getStatusBadge(d.status);

      return `<tr>
        <td class="td-mono">${esc(d.nomor_dokumen)}</td>
        <td style="font-weight:500">${esc(d.judul)}</td>
        <td>${esc(d.penyusun_nama || d.owner_nama || '-')}</td>
        <td>${riskBadge(d.tingkat_risiko)}</td>
        <td>${statusBadge}</td>
        <td><div style="display:flex;gap:4px;flex-wrap:wrap">${actions}</div></td>
      </tr>`;
    }).join('')}</tbody>
  </table></div></div>`;
}

function getStatusBadge(status) {
  const map = {
    'Draft': { bg: '#F3F4F6', color: '#6B7280', label: 'Draft' },
    'Review': { bg: '#FFF4E6', color: '#D97706', label: 'Review Asman' },
    'Approved-T1': { bg: '#E6F0FF', color: '#2563EB', label: 'Approval Manager' },
    'Approved-T2': { bg: '#E3FCEF', color: '#059669', label: 'Pengesahan SM' },
    'Published': { bg: '#DCFCE7', color: '#166534', label: 'Published' },
    'Archived': { bg: '#F3F4F6', color: '#9CA3AF', label: 'Archived' },
  };
  const c = map[status] || { bg: '#F3F4F6', color: '#6B7280', label: status };
  return `<span style="display:inline-block;padding:2px 8px;border-radius:4px;font-size:10px;font-weight:600;background:${c.bg};color:${c.color}">${c.label}</span>`;
}

function switchWFTab(el, contentId) {
  document.querySelectorAll('#page-workflow .tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('#page-workflow .tab-content').forEach(c => c.classList.remove('active'));
  el.classList.add('active');
  document.getElementById(contentId)?.classList.add('active');
}

// ─── Workflow Actions ───

async function doSubmit(id) {
  if (!confirm('Submit dokumen ini untuk review Asman?')) return;
  try {
    await API.submitForReview(id);
    showToast('Dokumen disubmit untuk review', 'success');
    renderWorkflow(document.getElementById('appContent'));
    loadNotifs();
  } catch (e) { showToast('Gagal: ' + e.message, 'error'); }
}

async function doReviewApprove(id) {
  const catatan = prompt('Catatan review (opsional):') || '';
  try {
    await API.reviewDoc(id, catatan);
    showToast('Dokumen telah di-review ✓ — Lanjut ke approval Manager', 'success');
    renderWorkflow(document.getElementById('appContent'));
    loadNotifs();
  } catch (e) { showToast('Gagal: ' + e.message, 'error'); }
}

async function doApproveT1(id) {
  const catatan = prompt('Catatan approval Manager (opsional):') || '';
  try {
    await API.approveT1(id, catatan);
    showToast('Dokumen di-approve Manager ✓ — Lanjut ke pengesahan SM', 'success');
    renderWorkflow(document.getElementById('appContent'));
    loadNotifs();
  } catch (e) { showToast('Gagal: ' + e.message, 'error'); }
}

async function doApproveT2(id) {
  if (!confirm('Sahkan dokumen ini? Dokumen akan dipublish setelah pengesahan.')) return;
  const catatan = prompt('Catatan pengesahan (opsional):') || '';
  try {
    await API.approveT2(id, catatan);
    showToast('Dokumen disahkan & dipublish! ✓', 'success');
    renderWorkflow(document.getElementById('appContent'));
    loadNotifs();
  } catch (e) { showToast('Gagal: ' + e.message, 'error'); }
}

async function uploadDocToDrive(id) {
  try {
    showToast('Mengunggah ke Google Drive…', 'info');
    const r = await API.uploadDocToDrive(id);
    showToast('Berhasil diunggah ke Google Drive ✓', 'success');
    renderWorkflow(document.getElementById('appContent'));
    if (r && r.gdrive_url) window.open(r.gdrive_url, '_blank', 'noopener');
  } catch (e) { showToast('Gagal upload ke Drive: ' + e.message, 'error'); }
}

async function doReturnRevisi(id) {
  const note = prompt('Catatan revisi yang perlu diperbaiki:');
  if (!note) return;
  try {
    await API.returnForRevision(id, note);
    showToast('Dokumen dikembalikan ke Draft untuk revisi', 'warning');
    renderWorkflow(document.getElementById('appContent'));
    loadNotifs();
  } catch (e) { showToast('Gagal: ' + e.message, 'error'); }
}

async function doReject(id) {
  const note = prompt('Alasan penolakan:');
  if (!note) return;
  try {
    await API.rejectDoc(id, note);
    showToast('Dokumen ditolak — kembali ke Draft', 'warning');
    renderWorkflow(document.getElementById('appContent'));
    loadNotifs();
  } catch (e) { showToast('Gagal: ' + e.message, 'error'); }
}
