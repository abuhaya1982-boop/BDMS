// Master Data Page
async function renderMasterData(container) {
  container.innerHTML = `<div class="page active" id="page-master-data"></div>`;

  try {
    const [unitsRes, probisRes] = await Promise.all([API.getUnits(), API.getProbis()]);
    const units = unitsRes.data || [];
    const probis = probisRes.data || [];

    APP.cache.masterUnits = units;
    APP.cache.masterProbis = probis;
    document.getElementById('page-master-data').innerHTML = `
      <div class="page-header">
        <div class="page-header-left">
          <div class="page-title">Master Data Sistem</div>
          <div class="page-subtitle">Kelola data referensi: Unit CoA, Probis IMS, dan Penomoran</div>
        </div>
      </div>
      <div class="tabs">
        <div class="tab active" onclick="switchMDTab(this,'md-unit')">Unit / CoA</div>
        <div class="tab" onclick="switchMDTab(this,'md-probis')">Probis IMS</div>
        <div class="tab" onclick="switchMDTab(this,'md-risiko')">Matriks Risiko</div>
        <div class="tab" onclick="switchMDTab(this,'md-nomor')">Penomoran IK</div>
      </div>
      <div id="md-unit" class="tab-content active">
        <div class="card">
          <div class="card-header">
            <div class="card-title">Master Unit / Bidang (Segment 5 CoA)</div>
            <button class="btn btn-primary btn-sm" onclick="openAddUnitModal()">${icon('plus', 14)} Tambah</button>
          </div>
          <div class="table-container">
            <table>
              <thead><tr><th>Kode</th><th>Nama Unit / Bidang</th><th>Tipe</th><th>Kode Dokumen</th><th>Jumlah IK</th><th>Status</th><th>Aksi</th></tr></thead>
              <tbody>
                ${units.map(u => `
                  <tr>
                    <td class="td-mono">${esc(u.kode)}</td>
                    <td style="font-weight:500">${esc(u.nama)}</td>
                    <td><span class="badge ${u.tipe === 'Unit PLTA' ? 'badge-blue' : 'badge-sky'}" style="font-size:10px">${esc(u.tipe)}</span></td>
                    <td class="td-mono">IKBR-${esc(u.kode)}</td>
                    <td style="text-align:center;font-weight:700">${u.ik_count || 0}</td>
                    <td><span class="badge ${u.status === 'Nonaktif' ? 'badge-gray' : 'badge-success'}">${esc(u.status || 'Aktif')}</span></td>
                    <td><div style="display:flex;gap:4px"><button class="btn btn-secondary btn-xs" onclick="openEditUnitModal(${u.id})">${icon('edit-3', 13)}</button><button class="btn btn-danger btn-xs" onclick="deleteUnit(${u.id})">${icon('trash-2', 13)}</button></div></td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      <div id="md-probis" class="tab-content">
        <div class="card">
          <div class="card-header">
            <div class="card-title">Master Probis IMS PLN Nusantara Power</div>
            <button class="btn btn-primary btn-sm" onclick="openAddProbisModal()">${icon('plus', 14)} Tambah</button>
          </div>
          <div class="card-body" style="padding:8px 14px">
            <div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center">
              <input type="text" style="padding:5px 10px;font-size:11.5px;border:1px solid var(--border);border-radius:6px;width:200px" placeholder="Cari nomor / nama probis..." id="mdProbisSearch" oninput="filterProbisMD()">
              <select style="padding:5px 10px;font-size:11.5px;border:1px solid var(--border);border-radius:6px" id="mdProbisKat" onchange="filterProbisMD()">
                <option value="">Semua Kategori</option>
                <option>Inti</option><option>Pendukung</option><option>Sub-Probis</option>
              </select>
              <select style="padding:5px 10px;font-size:11.5px;border:1px solid var(--border);border-radius:6px" id="mdProbisStatus" onchange="filterProbisMD()">
                <option value="">Semua Status</option>
                <option value="Aktif">Aktif</option>
                <option value="Nonaktif">Nonaktif</option>
              </select>
              <span style="font-size:11.5px;color:var(--text-tertiary);margin-left:auto" id="mdProbisCount">${probis.length} item</span>
            </div>
          </div>
          <div class="table-container">
            <table id="mdProbisTable">
              <thead><tr><th>Nomor</th><th>Nama Proses Bisnis</th><th>Kategori</th><th>Jumlah IK</th><th>Status</th><th>Aksi</th></tr></thead>
              <tbody id="mdProbisBody">${renderProbisRowsMD(probis)}</tbody>
            </table>
          </div>
        </div>
      </div>
      <div id="md-risiko" class="tab-content">
        <div class="card">
          <div class="card-header"><div class="card-title">Konfigurasi Matriks Risiko 5×5 (PLN NP Standard)</div></div>
          <div class="card-body">
            <div class="alert alert-info"><div class="alert-icon">${icon('info', 14)}</div><div>Matriks risiko 5×5 sesuai kebijakan manajemen risiko PLN Nusantara Power. Digunakan pada seksi Identifikasi Risiko di setiap dokumen IK.</div></div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px">
              <div>
                <div class="section-heading">Skala Probabilitas (Likelihood)</div>
                <table class="table-compact">
                  <thead><tr><th>Kode</th><th>Level</th><th>Deskripsi</th></tr></thead>
                  <tbody>
                    <tr><td class="td-mono">E (5)</td><td>Hampir Pasti Terjadi</td><td style="font-size:11.5px;color:var(--text-secondary)">Terjadi di hampir semua kondisi</td></tr>
                    <tr><td class="td-mono">D (4)</td><td>Sangat Mungkin Terjadi</td><td style="font-size:11.5px;color:var(--text-secondary)">Kemungkinan besar terjadi</td></tr>
                    <tr><td class="td-mono">C (3)</td><td>Bisa Terjadi</td><td style="font-size:11.5px;color:var(--text-secondary)">Mungkin terjadi pada suatu waktu</td></tr>
                    <tr><td class="td-mono">B (2)</td><td>Jarang Terjadi</td><td style="font-size:11.5px;color:var(--text-secondary)">Tidak mungkin terjadi dalam kondisi normal</td></tr>
                    <tr><td class="td-mono">A (1)</td><td>Sangat Jarang Terjadi</td><td style="font-size:11.5px;color:var(--text-secondary)">Hanya terjadi dalam keadaan luar biasa</td></tr>
                  </tbody>
                </table>
              </div>
              <div>
                <div class="section-heading">Skala Dampak (Impact)</div>
                <table class="table-compact">
                  <thead><tr><th>Level</th><th>Kategori</th><th>Deskripsi</th></tr></thead>
                  <tbody>
                    <tr><td class="td-mono">1</td><td>Sangat Rendah</td><td style="font-size:11.5px;color:var(--text-secondary)">Dampak minimal, kerugian rendah</td></tr>
                    <tr><td class="td-mono">2</td><td>Rendah</td><td style="font-size:11.5px;color:var(--text-secondary)">Dampak minor, bisa ditangani internal</td></tr>
                    <tr><td class="td-mono">3</td><td>Moderat</td><td style="font-size:11.5px;color:var(--text-secondary)">Dampak material, memerlukan tindakan</td></tr>
                    <tr><td class="td-mono">4</td><td>Tinggi</td><td style="font-size:11.5px;color:var(--text-secondary)">Dampak besar pada operasi/keuangan</td></tr>
                    <tr><td class="td-mono">5</td><td>Sangat Tinggi</td><td style="font-size:11.5px;color:var(--text-secondary)">Mengancam keberlangsungan usaha</td></tr>
                  </tbody>
                </table>
              </div>
            </div>
            <div style="margin-top:20px">
              <div class="section-heading">Peta Risiko (Heat Map)</div>
              <div style="overflow-x:auto">
                <table style="border-collapse:collapse;width:100%;font-family:'Inter',sans-serif;font-size:11px;text-align:center;table-layout:fixed">
                  <tr>
                    <td rowspan="6" style="border:1px solid #999;background:#F5F5F5;font-weight:700;writing-mode:vertical-lr;transform:rotate(180deg);padding:8px 4px;font-size:12px;width:28px">Probabilitas</td>
                    <td style="border:1px solid #999;background:#F5F5F5;font-weight:600;padding:6px 4px;width:110px">Hampir Pasti Terjadi<br><b>E</b></td>
                    <td style="border:1px solid #999;background:#92D050;padding:6px;font-weight:600"><div style="font-size:9px;opacity:0.8">LOW TO MODERATE</div><div style="font-size:14px;font-weight:800">7</div></td>
                    <td style="border:1px solid #999;background:#FFFF00;padding:6px;font-weight:600"><div style="font-size:9px;opacity:0.8">MODERATE</div><div style="font-size:14px;font-weight:800">12</div></td>
                    <td style="border:1px solid #999;background:#FFC000;padding:6px;font-weight:600"><div style="font-size:9px;opacity:0.8">MODERATE TO HIGH</div><div style="font-size:14px;font-weight:800">17</div></td>
                    <td style="border:1px solid #999;background:#FF0000;padding:6px;font-weight:600;color:#fff"><div style="font-size:9px;opacity:0.9">HIGH</div><div style="font-size:14px;font-weight:800">22</div></td>
                    <td style="border:1px solid #999;background:#FF0000;padding:6px;font-weight:600;color:#fff"><div style="font-size:9px;opacity:0.9">HIGH</div><div style="font-size:14px;font-weight:800">25</div></td>
                  </tr>
                  <tr>
                    <td style="border:1px solid #999;background:#F5F5F5;font-weight:600;padding:6px 4px">Sangat Mungkin Terjadi<br><b>D</b></td>
                    <td style="border:1px solid #999;background:#00B050;padding:6px;font-weight:600;color:#fff"><div style="font-size:9px;opacity:0.9">LOW</div><div style="font-size:14px;font-weight:800">4</div></td>
                    <td style="border:1px solid #999;background:#92D050;padding:6px;font-weight:600"><div style="font-size:9px;opacity:0.8">LOW TO MODERATE</div><div style="font-size:14px;font-weight:800">9</div></td>
                    <td style="border:1px solid #999;background:#FFFF00;padding:6px;font-weight:600"><div style="font-size:9px;opacity:0.8">MODERATE</div><div style="font-size:14px;font-weight:800">14</div></td>
                    <td style="border:1px solid #999;background:#FFC000;padding:6px;font-weight:600"><div style="font-size:9px;opacity:0.8">MODERATE TO HIGH</div><div style="font-size:14px;font-weight:800">19</div></td>
                    <td style="border:1px solid #999;background:#FF0000;padding:6px;font-weight:600;color:#fff"><div style="font-size:9px;opacity:0.9">HIGH</div><div style="font-size:14px;font-weight:800">24</div></td>
                  </tr>
                  <tr>
                    <td style="border:1px solid #999;background:#F5F5F5;font-weight:600;padding:6px 4px">Bisa Terjadi<br><b>C</b></td>
                    <td style="border:1px solid #999;background:#00B050;padding:6px;font-weight:600;color:#fff"><div style="font-size:9px;opacity:0.9">LOW</div><div style="font-size:14px;font-weight:800">3</div></td>
                    <td style="border:1px solid #999;background:#92D050;padding:6px;font-weight:600"><div style="font-size:9px;opacity:0.8">LOW TO MODERATE</div><div style="font-size:14px;font-weight:800">8</div></td>
                    <td style="border:1px solid #999;background:#FFFF00;padding:6px;font-weight:600"><div style="font-size:9px;opacity:0.8">MODERATE</div><div style="font-size:14px;font-weight:800">11</div></td>
                    <td style="border:1px solid #999;background:#FFC000;padding:6px;font-weight:600"><div style="font-size:9px;opacity:0.8">MODERATE TO HIGH</div><div style="font-size:14px;font-weight:800">18</div></td>
                    <td style="border:1px solid #999;background:#FF0000;padding:6px;font-weight:600;color:#fff"><div style="font-size:9px;opacity:0.9">HIGH</div><div style="font-size:14px;font-weight:800">23</div></td>
                  </tr>
                  <tr>
                    <td style="border:1px solid #999;background:#F5F5F5;font-weight:600;padding:6px 4px">Jarang Terjadi<br><b>B</b></td>
                    <td style="border:1px solid #999;background:#00B050;padding:6px;font-weight:600;color:#fff"><div style="font-size:9px;opacity:0.9">LOW</div><div style="font-size:14px;font-weight:800">2</div></td>
                    <td style="border:1px solid #999;background:#92D050;padding:6px;font-weight:600"><div style="font-size:9px;opacity:0.8">LOW TO MODERATE</div><div style="font-size:14px;font-weight:800">6</div></td>
                    <td style="border:1px solid #999;background:#92D050;padding:6px;font-weight:600"><div style="font-size:9px;opacity:0.8">LOW TO MODERATE</div><div style="font-size:14px;font-weight:800">8</div></td>
                    <td style="border:1px solid #999;background:#FFC000;padding:6px;font-weight:600"><div style="font-size:9px;opacity:0.8">MODERATE TO HIGH</div><div style="font-size:14px;font-weight:800">16</div></td>
                    <td style="border:1px solid #999;background:#FF0000;padding:6px;font-weight:600;color:#fff"><div style="font-size:9px;opacity:0.9">HIGH</div><div style="font-size:14px;font-weight:800">21</div></td>
                  </tr>
                  <tr>
                    <td style="border:1px solid #999;background:#F5F5F5;font-weight:600;padding:6px 4px">Sangat Jarang Terjadi<br><b>A</b></td>
                    <td style="border:1px solid #999;background:#00B050;padding:6px;font-weight:600;color:#fff"><div style="font-size:9px;opacity:0.9">LOW</div><div style="font-size:14px;font-weight:800">1</div></td>
                    <td style="border:1px solid #999;background:#00B050;padding:6px;font-weight:600;color:#fff"><div style="font-size:9px;opacity:0.9">LOW</div><div style="font-size:14px;font-weight:800">5</div></td>
                    <td style="border:1px solid #999;background:#92D050;padding:6px;font-weight:600"><div style="font-size:9px;opacity:0.8">LOW TO MODERATE</div><div style="font-size:14px;font-weight:800">10</div></td>
                    <td style="border:1px solid #999;background:#FFFF00;padding:6px;font-weight:600"><div style="font-size:9px;opacity:0.8">MODERATE</div><div style="font-size:14px;font-weight:800">15</div></td>
                    <td style="border:1px solid #999;background:#FF0000;padding:6px;font-weight:600;color:#fff"><div style="font-size:9px;opacity:0.9">HIGH</div><div style="font-size:14px;font-weight:800">20</div></td>
                  </tr>
                  <tr>
                    <td style="border:none"></td>
                    <td style="border:1px solid #999;background:#F5F5F5;font-weight:600;padding:6px">Sangat Rendah<br><b>1</b></td>
                    <td style="border:1px solid #999;background:#F5F5F5;font-weight:600;padding:6px">Rendah<br><b>2</b></td>
                    <td style="border:1px solid #999;background:#F5F5F5;font-weight:600;padding:6px">Moderat<br><b>3</b></td>
                    <td style="border:1px solid #999;background:#F5F5F5;font-weight:600;padding:6px">Tinggi<br><b>4</b></td>
                    <td style="border:1px solid #999;background:#F5F5F5;font-weight:600;padding:6px">Sangat Tinggi<br><b>5</b></td>
                  </tr>
                  <tr>
                    <td style="border:none"></td>
                    <td style="border:none"></td>
                    <td colspan="5" style="border:1px solid #999;background:#F5F5F5;font-weight:700;font-size:12px;padding:6px">Dampak</td>
                  </tr>
                </table>
              </div>
            </div>
            <div style="margin-top:16px;display:grid;grid-template-columns:repeat(5,1fr);gap:8px;font-size:11px;font-family:'Inter',sans-serif">
              <div style="display:flex;align-items:center;gap:6px"><span style="display:inline-block;width:20px;height:14px;background:#00B050;border:1px solid #999;border-radius:2px"></span><b>LOW</b> (1–4)</div>
              <div style="display:flex;align-items:center;gap:6px"><span style="display:inline-block;width:20px;height:14px;background:#92D050;border:1px solid #999;border-radius:2px"></span><b>LOW TO MODERATE</b> (5–9)</div>
              <div style="display:flex;align-items:center;gap:6px"><span style="display:inline-block;width:20px;height:14px;background:#FFFF00;border:1px solid #999;border-radius:2px"></span><b>MODERATE</b> (10–14)</div>
              <div style="display:flex;align-items:center;gap:6px"><span style="display:inline-block;width:20px;height:14px;background:#FFC000;border:1px solid #999;border-radius:2px"></span><b>MODERATE TO HIGH</b> (15–19)</div>
              <div style="display:flex;align-items:center;gap:6px"><span style="display:inline-block;width:20px;height:14px;background:#FF0000;border:1px solid #999;border-radius:2px"></span><b>HIGH</b> (20–25)</div>
            </div>
          </div>
        </div>

        <!-- ═══ INFORMASI PELENGKAP (Sumber: Kebijakan Manajemen Risiko PLN NP) ═══ -->
        <div class="card" style="margin-top:16px">
          <div class="card-header">
            <div class="card-title">${icon('book-open', 16)} Referensi Penilaian Risiko PLN Nusantara Power</div>
            <span class="badge badge-sky" style="font-size:10px">Informasi Pelengkap</span>
          </div>
          <div class="card-body">
            <div class="alert alert-warning" style="margin-bottom:16px"><div class="alert-icon">${icon('alert-triangle', 14)}</div><div style="font-size:12px">Data berikut merupakan <strong>informasi pelengkap referensi</strong> dari kebijakan manajemen risiko PLN Nusantara Power. <strong>Tidak dimasukkan ke dalam format dokumen IK</strong>, melainkan sebagai panduan bagi penyusun saat mengisi seksi Identifikasi Risiko.</div></div>

            <div style="margin-bottom:20px">
              <div class="section-heading">Kriteria Dampak (Impact Criteria)</div>
              <div style="overflow-x:auto">
                <table class="table-compact" style="font-size:11.5px">
                  <thead>
                    <tr>
                      <th style="width:110px">Tingkat Dampak</th>
                      <th style="width:260px">Parameter Kuantitatif (Keuangan)</th>
                      <th>Parameter Kualitatif</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td><span class="badge badge-success" style="font-size:10px">Sangat Rendah</span></td>
                      <td style="font-size:11px;font-family:var(--mono)">(X &le; 20% dari limit risiko)<br>X &le; Rp 3.033.633.923</td>
                      <td style="color:var(--text-secondary)">Melibatkan kelalaian umum</td>
                    </tr>
                    <tr>
                      <td><span class="badge badge-sky" style="font-size:10px">Rendah</span></td>
                      <td style="font-size:11px;font-family:var(--mono)">(20% &lt; X &le; 40%)<br>Rp 3.033.633.923 &lt; X &le; Rp 6.067.267.847</td>
                      <td style="color:var(--text-secondary)">Melibatkan kelalaian umum, dapat melemahkan reputasi dan tidak ada indikasi potensi disrupsi operasi dan kerugian jiwa</td>
                    </tr>
                    <tr>
                      <td><span class="badge badge-amber" style="font-size:10px">Moderat</span></td>
                      <td style="font-size:11px;font-family:var(--mono)">(40% &lt; X &le; 60%)<br>Rp 6.067.267.847 &lt; X &le; Rp 9.101.501.770</td>
                      <td style="color:var(--text-secondary)">Melibatkan tindakan salah kelola umum, cacat tidak tetap/ketidakhadiran kerja yang terbatas, dapat merusak reputasi BUMN dan ada potensi disrupsi operasional</td>
                    </tr>
                    <tr>
                      <td><span class="badge badge-warning" style="font-size:10px">Tinggi</span></td>
                      <td style="font-size:11px;font-family:var(--mono)">(60% &lt; X &le; 80%)<br>Rp 9.101.501.770 &lt; X &le; Rp 12.135.335.693</td>
                      <td style="color:var(--text-secondary)">Melibatkan <em>gross negligence</em>, keselamatan perorangan, dan melibatkan penurunan reputasi dan kepercayaan publik pada BUMN, terjadi disrupsi operasional untuk periode di bawah 1 bulan</td>
                    </tr>
                    <tr>
                      <td><span class="badge badge-danger" style="font-size:10px">Sangat Tinggi</span></td>
                      <td style="font-size:11px;font-family:var(--mono)">(X &gt; 80% dari limit risiko)<br>X &gt; Rp 12.135.335.693</td>
                      <td style="color:var(--text-secondary)">Melibatkan <em>fraud</em>, pelanggaran peraturan perundang-undangan, disrupsi operasi &gt; 1 bulan, melibatkan kerugian jiwa, atau penurunan reputasi signifikan yang berdampak sistemik dan sektor</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div style="margin-top:8px;padding:8px 12px;background:var(--surface-2);border-radius:var(--radius);border-left:3px solid var(--pln-blue-600);font-size:12px">
                <strong>Nilai Limit UP Brantas:</strong> <span style="font-family:var(--mono);font-weight:700;color:var(--pln-blue-600)">Rp 15.168.169.617</span>
              </div>
            </div>

            <div style="margin-bottom:20px">
              <div class="section-heading">Kriteria Probabilitas (Likelihood Criteria)</div>
              <div style="overflow-x:auto">
                <table class="table-compact" style="font-size:11.5px">
                  <thead>
                    <tr><th style="width:180px">Tingkat Probabilitas</th><th>Parameter Probabilitas</th></tr>
                  </thead>
                  <tbody>
                    <tr><td>Sangat Jarang Terjadi <span class="td-mono">(A)</span></td><td style="color:var(--text-secondary)">Probabilitas kejadian di bawah 20%</td></tr>
                    <tr><td>Jarang Terjadi <span class="td-mono">(B)</span></td><td style="color:var(--text-secondary)">Probabilitas kejadian antara 20% sampai dengan 40%</td></tr>
                    <tr><td>Bisa Terjadi <span class="td-mono">(C)</span></td><td style="color:var(--text-secondary)">Probabilitas kejadian antara 40% sampai dengan 60%</td></tr>
                    <tr><td>Sangat Mungkin Terjadi <span class="td-mono">(D)</span></td><td style="color:var(--text-secondary)">Probabilitas kejadian antara 60% sampai dengan 80%</td></tr>
                    <tr><td>Hampir Pasti Terjadi <span class="td-mono">(E)</span></td><td style="color:var(--text-secondary)">Probabilitas kejadian antara 80% sampai dengan 100%</td></tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div>
              <div class="section-heading">Definisi Level Risiko</div>
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
                <div style="padding:12px 14px;background:var(--surface-2);border-radius:var(--radius);border-left:3px solid var(--warning)">
                  <div style="font-weight:700;font-size:12.5px;margin-bottom:4px">Level Risiko Inheren</div>
                  <div style="font-size:12px;color:var(--text-secondary)">Risiko yang masih melekat setelah memperhitungkan <em>existing control</em> (kontrol yang ada) yang dijalankan dalam aktivitas proses bisnis.</div>
                </div>
                <div style="padding:12px 14px;background:var(--surface-2);border-radius:var(--radius);border-left:3px solid var(--success)">
                  <div style="font-weight:700;font-size:12.5px;margin-bottom:4px">Level Risiko Residual</div>
                  <div style="font-size:12px;color:var(--text-secondary)">Risiko yang masih melekat setelah dilakukan perlakuan risiko (<em>risk treatment</em>).</div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
      <div id="md-nomor" class="tab-content">
        <div class="card">
          <div class="card-header"><div class="card-title">Aturan Penomoran Dokumen IK</div></div>
          <div class="card-body">
            <div class="alert alert-success"><div class="alert-icon">${icon('check', 14)}</div><div><strong>Format:</strong> IK[KODEUNIT]-[NOMOR BIDANG/UNIT]-[NOMOR PROBIS]-[NOMOR URUT] <br><strong>Contoh:</strong> IKBR-327-10.1.3.c.b-001</div></div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
              <div>
                <div class="section-heading">Komponen Nomor</div>
                <div style="display:flex;flex-direction:column;gap:8px">
                  <div style="padding:12px;background:var(--surface-2);border-radius:var(--radius);border-left:3px solid var(--pln-blue-600)">
                    <div style="font-weight:700;margin-bottom:4px;font-family:var(--mono)">IKBR</div>
                    <div style="font-size:12.5px;color:var(--text-secondary)">IK = Instruksi Kerja, BR = Brantas (Segment 2 CoA)</div>
                  </div>
                  <div style="padding:12px;background:var(--surface-2);border-radius:var(--radius);border-left:3px solid var(--pln-sky)">
                    <div style="font-weight:700;margin-bottom:4px;font-family:var(--mono)">321–333 / 102–112</div>
                    <div style="font-size:12.5px;color:var(--text-secondary)">Kode Unit/Bidang berdasarkan Segment 5 CoA</div>
                  </div>
                  <div style="padding:12px;background:var(--surface-2);border-radius:var(--radius);border-left:3px solid var(--success)">
                    <div style="font-weight:700;margin-bottom:4px;font-family:var(--mono)">1.0 – 14.0 (+ sub-probis)</div>
                    <div style="font-size:12.5px;color:var(--text-secondary)">Nomor Probis berdasarkan IMS Business Process Map</div>
                  </div>
                  <div style="padding:12px;background:var(--surface-2);border-radius:var(--radius);border-left:3px solid var(--warning)">
                    <div style="font-weight:700;margin-bottom:4px;font-family:var(--mono)">001, 002, 003...</div>
                    <div style="font-size:12.5px;color:var(--text-secondary)">Nomor urut unik per kombinasi Unit+Probis</div>
                  </div>
                </div>
              </div>
              <div>
                <div class="section-heading">Aturan Sistem</div>
                <div style="display:flex;flex-direction:column;gap:6px;font-size:13px">
                  <div style="display:flex;gap:8px;align-items:flex-start"><span style="color:var(--success)">${icon('check', 16)}</span><span>Nomor urut <strong>unik per kombinasi</strong> Unit + Probis</span></div>
                  <div style="display:flex;gap:8px;align-items:flex-start"><span style="color:var(--success)">${icon('check', 16)}</span><span>Sistem mencegah <strong>duplikasi nomor dokumen</strong></span></div>
                  <div style="display:flex;gap:8px;align-items:flex-start"><span style="color:var(--success)">${icon('check', 16)}</span><span>Nomor <strong>terkunci</strong> setelah dokumen disubmit</span></div>
                  <div style="display:flex;gap:8px;align-items:flex-start"><span style="color:var(--warning)">${icon('alert-triangle', 16)}</span><span>Override nomor hanya oleh <strong>Admin</strong> dengan audit trail</span></div>
                  <div style="display:flex;gap:8px;align-items:flex-start"><span style="color:var(--success)">${icon('check', 16)}</span><span>Revisi menggunakan <strong>nomor yang sama</strong> + increment revisi</span></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
    renderIcons();
  } catch (e) {
    container.innerHTML = `<div class="page active"><div class="alert alert-danger">${esc(e.message)}</div></div>`;
  }
}

function switchMDTab(el, contentId) {
  document.querySelectorAll('#page-master-data .tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('#page-master-data .tab-content').forEach(c => c.classList.remove('active'));
  el.classList.add('active');
  document.getElementById(contentId)?.classList.add('active');
}

function openAddUnitModal() {
  openGenericModal(
    'Tambah Unit / Bidang',
    `
    <div class="form-grid">
      <div class="form-group">
        <label class="form-label">Kode <span class="required">*</span></label>
        <input type="text" class="form-control mono" id="md-unit-kode" placeholder="334">
      </div>
      <div class="form-group">
        <label class="form-label">Nama <span class="required">*</span></label>
        <input type="text" class="form-control" id="md-unit-nama" placeholder="Nama unit/bidang">
      </div>
      <div class="form-group">
        <label class="form-label">Tipe</label>
        <select class="form-control" id="md-unit-tipe"><option>Unit PLTA</option><option>Bidang Fungsional</option></select>
      </div>
    </div>
    `,
    `<button class="btn btn-secondary" onclick="closeModal('modalGeneric')">Batal</button>
     <button class="btn btn-primary" onclick="saveNewUnit()">${icon('save', 14)} Simpan</button>`
  );
}

async function saveNewUnit() {
  const kode = document.getElementById('md-unit-kode')?.value;
  const nama = document.getElementById('md-unit-nama')?.value;
  if (!kode || !nama) { showToast('Kode dan nama wajib diisi', 'error'); return; }
  try {
    await API.createUnit({ kode, nama, tipe: document.getElementById('md-unit-tipe')?.value || 'Unit PLTA' });
    closeModal('modalGeneric');
    showToast('Unit ditambahkan', 'success');
    showPage('master-data');
  } catch (e) { showToast('Gagal: ' + e.message, 'error'); }
}

function openAddProbisModal() {
  openGenericModal(
    'Tambah Probis',
    `
    <div class="form-grid">
      <div class="form-group">
        <label class="form-label">Nomor <span class="required">*</span></label>
        <input type="text" class="form-control mono" id="md-probis-nomor" placeholder="15.0">
      </div>
      <div class="form-group">
        <label class="form-label">Nama <span class="required">*</span></label>
        <input type="text" class="form-control" id="md-probis-nama" placeholder="Nama proses bisnis">
      </div>
      <div class="form-group">
        <label class="form-label">Kategori</label>
        <select class="form-control" id="md-probis-kat"><option>Inti</option><option>Pendukung</option><option>Sub-Probis</option></select>
      </div>
    </div>
    `,
    `<button class="btn btn-secondary" onclick="closeModal('modalGeneric')">Batal</button>
     <button class="btn btn-primary" onclick="saveNewProbis()">${icon('save', 14)} Simpan</button>`
  );
}

async function saveNewProbis() {
  const nomor = document.getElementById('md-probis-nomor')?.value;
  const nama = document.getElementById('md-probis-nama')?.value;
  if (!nomor || !nama) { showToast('Nomor dan nama wajib diisi', 'error'); return; }
  try {
    await API.createProbis({ nomor, nama, kategori: document.getElementById('md-probis-kat')?.value || 'Pendukung' });
    closeModal('modalGeneric');
    showToast('Probis ditambahkan', 'success');
    showPage('master-data');
  } catch (e) { showToast('Gagal: ' + e.message, 'error'); }
}

// ─── UNIT EDIT / DELETE ─────────────────────
function openEditUnitModal(id) {
  const u = (APP.cache.masterUnits || []).find(x => x.id == id);
  if (!u) return;
  openGenericModal(
    'Edit Unit: ' + u.kode,
    `
    <div class="form-grid">
      <div class="form-group">
        <label class="form-label">Kode <span class="required">*</span></label>
        <input type="text" class="form-control mono" id="md-unit-kode" value="${esc(u.kode)}">
      </div>
      <div class="form-group">
        <label class="form-label">Nama <span class="required">*</span></label>
        <input type="text" class="form-control" id="md-unit-nama" value="${esc(u.nama)}">
      </div>
      <div class="form-group">
        <label class="form-label">Tipe</label>
        <select class="form-control" id="md-unit-tipe"><option${u.tipe==='Unit PLTA'?' selected':''}>Unit PLTA</option><option${u.tipe==='Bidang Fungsional'?' selected':''}>Bidang Fungsional</option></select>
      </div>
      <div class="form-group">
        <label class="form-label">Status</label>
        <select class="form-control" id="md-unit-status"><option value="Aktif"${u.status==='Aktif'?' selected':''}>Aktif</option><option value="Nonaktif"${u.status==='Nonaktif'?' selected':''}>Nonaktif</option></select>
      </div>
    </div>
    `,
    `<button class="btn btn-secondary" onclick="closeModal('modalGeneric')">Batal</button>
     <button class="btn btn-primary" onclick="saveEditUnit(${id})">${icon('save', 14)} Simpan</button>`
  );
}

async function saveEditUnit(id) {
  const kode = document.getElementById('md-unit-kode')?.value;
  const nama = document.getElementById('md-unit-nama')?.value;
  if (!kode || !nama) { showToast('Kode dan nama wajib diisi', 'error'); return; }
  try {
    await API.updateUnit(id, { kode, nama, tipe: document.getElementById('md-unit-tipe')?.value, status: document.getElementById('md-unit-status')?.value });
    closeModal('modalGeneric');
    showToast('Unit diperbarui', 'success');
    showPage('master-data');
  } catch (e) { showToast('Gagal: ' + e.message, 'error'); }
}

async function deleteUnit(id) {
  const u = (APP.cache.masterUnits || []).find(x => x.id == id);
  const label = u ? `${u.kode} – ${u.nama}` : 'Unit ini';
  const ok = await renderConfirmDialog('Hapus Unit', `Yakin ingin menghapus <strong>${esc(label)}</strong> secara permanen?<br><br>Tindakan ini <strong>tidak dapat dibatalkan</strong>.`);
  if (!ok) return;
  try {
    await API.del('units/' + id);
    showToast('Unit berhasil dihapus', 'success');
    showPage('master-data');
  } catch (e) {
    const msg = e.message || '';
    if (msg.includes('FOREIGN KEY') || msg.includes('constraint')) {
      const force = await renderConfirmDialog('Force Hapus Unit', `Unit <strong>${esc(label)}</strong> masih digunakan oleh dokumen IK.<br><br>Force hapus akan menghapus master Unit, namun data <strong>unit_id</strong> pada dokumen IK terkait tetap tersimpan.<br><br>Lanjutkan force hapus?`, 'Force Hapus', 'Batal');
      if (!force) return;
      try {
        await API.del('units/' + id + '?force=1');
        showToast('Unit berhasil dihapus (force)', 'success');
        showPage('master-data');
      } catch (e2) { showToast('Gagal force hapus: ' + e2.message, 'error'); }
    } else { showToast('Gagal: ' + msg, 'error'); }
  }
}

// ─── PROBIS EDIT / DELETE ───────────────────
function openEditProbisModal(id) {
  const p = (APP.cache.masterProbis || []).find(x => x.id == id);
  if (!p) return;
  openGenericModal(
    'Edit Probis: ' + p.nomor,
    `
    <div class="form-grid">
      <div class="form-group">
        <label class="form-label">Nomor <span class="required">*</span></label>
        <input type="text" class="form-control mono" id="md-probis-nomor" value="${esc(p.nomor)}">
      </div>
      <div class="form-group">
        <label class="form-label">Nama <span class="required">*</span></label>
        <input type="text" class="form-control" id="md-probis-nama" value="${esc(p.nama)}">
      </div>
      <div class="form-group">
        <label class="form-label">Kategori</label>
        <select class="form-control" id="md-probis-kat"><option${p.kategori==='Inti'?' selected':''}>Inti</option><option${p.kategori==='Pendukung'?' selected':''}>Pendukung</option><option${p.kategori==='Sub-Probis'?' selected':''}>Sub-Probis</option></select>
      </div>
      <div class="form-group">
        <label class="form-label">Status</label>
        <select class="form-control" id="md-probis-status"><option value="Aktif"${p.status==='Aktif'?' selected':''}>Aktif</option><option value="Nonaktif"${p.status==='Nonaktif'?' selected':''}>Nonaktif</option></select>
      </div>
    </div>
    `,
    `<button class="btn btn-secondary" onclick="closeModal('modalGeneric')">Batal</button>
     <button class="btn btn-primary" onclick="saveEditProbis(${id})">${icon('save', 14)} Simpan</button>`
  );
}

async function saveEditProbis(id) {
  const nomor = document.getElementById('md-probis-nomor')?.value;
  const nama = document.getElementById('md-probis-nama')?.value;
  if (!nomor || !nama) { showToast('Nomor dan nama wajib diisi', 'error'); return; }
  try {
    await API.updateProbis(id, { nomor, nama, kategori: document.getElementById('md-probis-kat')?.value, status: document.getElementById('md-probis-status')?.value });
    closeModal('modalGeneric');
    showToast('Probis diperbarui', 'success');
    showPage('master-data');
  } catch (e) { showToast('Gagal: ' + e.message, 'error'); }
}

async function deleteProbis(id) {
  const p = (APP.cache.masterProbis || []).find(x => x.id == id);
  const label = p ? `${p.nomor} – ${p.nama}` : 'Probis ini';
  const ok = await renderConfirmDialog('Hapus Probis', `Yakin ingin menghapus <strong>${esc(label)}</strong> secara permanen?<br><br>Tindakan ini <strong>tidak dapat dibatalkan</strong>.`);
  if (!ok) return;
  try {
    await API.del('probis/' + id);
    showToast('Probis berhasil dihapus', 'success');
    showPage('master-data');
  } catch (e) {
    const msg = e.message || '';
    if (msg.includes('FOREIGN KEY') || msg.includes('constraint')) {
      const force = await renderConfirmDialog('Force Hapus Probis', `Probis <strong>${esc(label)}</strong> masih digunakan oleh dokumen IK.<br><br>Force hapus akan menghapus master Probis, namun data <strong>probis_id</strong> pada dokumen IK terkait tetap tersimpan.<br><br>Lanjutkan force hapus?`, 'Force Hapus', 'Batal');
      if (!force) return;
      try {
        await API.del('probis/' + id + '?force=1');
        showToast('Probis berhasil dihapus (force)', 'success');
        showPage('master-data');
      } catch (e2) { showToast('Gagal force hapus: ' + e2.message, 'error'); }
    } else { showToast('Gagal: ' + msg, 'error'); }
  }
}

// ─── PROBIS SEARCH / FILTER ─────────────────
function renderProbisRowsMD(list) {
  return list.map(p => `
    <tr>
      <td class="td-mono">${esc(p.nomor)}</td>
      <td style="font-weight:500">${esc(p.nama)}</td>
      <td><span class="badge ${p.kategori === 'Inti' ? 'badge-blue' : p.kategori === 'Sub-Probis' ? 'badge-amber' : 'badge-sky'}" style="font-size:10px">${esc(p.kategori)}</span></td>
      <td style="text-align:center;font-weight:700">${p.ik_count || 0}</td>
      <td><span class="badge ${p.status === 'Nonaktif' ? 'badge-gray' : 'badge-success'}">${esc(p.status || 'Aktif')}</span></td>
      <td><div style="display:flex;gap:4px"><button class="btn btn-secondary btn-xs" onclick="openEditProbisModal(${p.id})">${icon('edit-3', 13)}</button><button class="btn btn-danger btn-xs" onclick="deleteProbis(${p.id})">${icon('trash-2', 13)}</button></div></td>
    </tr>
  `).join('');
}

function filterProbisMD() {
  const q = (document.getElementById('mdProbisSearch')?.value || '').toLowerCase();
  const kat = document.getElementById('mdProbisKat')?.value || '';
  const st = document.getElementById('mdProbisStatus')?.value || '';
  let list = APP.cache.masterProbis || [];
  if (q) list = list.filter(p => p.nomor.toLowerCase().includes(q) || p.nama.toLowerCase().includes(q));
  if (kat) list = list.filter(p => p.kategori === kat);
  if (st) list = list.filter(p => (p.status || 'Aktif') === st);
  document.getElementById('mdProbisBody').innerHTML = renderProbisRowsMD(list);
  document.getElementById('mdProbisCount').textContent = list.length + ' item';
  renderIcons();
}
