// Brantas DMS — Backup DB otomatis (in-app, tanpa cron)
// Memakai online-backup better-sqlite3 (konsisten walau mode WAL), hasil di-gzip,
// dengan rotasi (simpan N backup terbaru). Berjalan dari dalam proses app:
//   - catch-up sesaat setelah startup (kalau belum ada backup hari ini)
//   - cek berkala tiap 6 jam (guard 1 backup/hari)
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { getDB } = require('./db');

const DATA_DIR = process.env.BDMS_DATA_DIR
  ? path.resolve(process.env.BDMS_DATA_DIR)
  : path.join(__dirname, '..', 'database');
const BACKUP_DIR = process.env.BDMS_BACKUP_DIR
  ? path.resolve(process.env.BDMS_BACKUP_DIR)
  : path.join(DATA_DIR, '..', 'bdms-backups');
const KEEP = Math.max(1, parseInt(process.env.BDMS_BACKUP_KEEP || '7', 10) || 7);

const p2 = (n) => String(n).padStart(2, '0');
const stamp = (d = new Date()) =>
  `${d.getFullYear()}${p2(d.getMonth() + 1)}${p2(d.getDate())}-${p2(d.getHours())}${p2(d.getMinutes())}${p2(d.getSeconds())}`;
const dayKey = (d = new Date()) => `${d.getFullYear()}${p2(d.getMonth() + 1)}${p2(d.getDate())}`;

function listBackups() {
  try {
    return fs.readdirSync(BACKUP_DIR).filter((f) => /^bdms-.*\.db\.gz$/.test(f)).sort();
  } catch {
    return [];
  }
}

function hasBackupToday() {
  const key = `bdms-${dayKey()}`;
  return listBackups().some((f) => f.startsWith(key));
}

function rotate() {
  const newestFirst = listBackups().sort().reverse(); // nama berisi timestamp → sortable
  for (const f of newestFirst.slice(KEEP)) {
    try { fs.unlinkSync(path.join(BACKUP_DIR, f)); } catch {}
  }
}

async function runBackup() {
  if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });
  const raw = path.join(BACKUP_DIR, `bdms-${stamp()}.db`);
  const gzPath = raw + '.gz';

  // 1) Snapshot konsisten (online backup, aman walau ada penulisan/WAL)
  await getDB().backup(raw);

  // 2) Kompres → .gz, lalu hapus file mentah
  await new Promise((resolve, reject) => {
    const inp = fs.createReadStream(raw);
    const out = fs.createWriteStream(gzPath);
    const gz = zlib.createGzip({ level: 9 });
    inp.on('error', reject);
    gz.on('error', reject);
    out.on('error', reject);
    out.on('close', resolve);
    inp.pipe(gz).pipe(out);
  });
  try { fs.unlinkSync(raw); } catch {}

  // 3) Rotasi
  rotate();
  return gzPath;
}

let _scheduled = false;
function scheduleDailyBackup() {
  if (_scheduled) return;
  _scheduled = true;
  const tick = async () => {
    try {
      if (!hasBackupToday()) {
        const out = await runBackup();
        console.log('[backup] dibuat:', out);
      }
    } catch (e) {
      console.warn('[backup] gagal:', e.message);
    }
  };
  setTimeout(tick, 30 * 1000);              // catch-up setelah startup
  setInterval(tick, 6 * 60 * 60 * 1000);    // cek tiap 6 jam (1 backup/hari)
}

module.exports = { runBackup, scheduleDailyBackup, BACKUP_DIR };
