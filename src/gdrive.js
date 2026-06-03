// Brantas DMS — Integrasi Google Drive (auto-upload DOCX saat Publish)
// Mendukung 2 mode autentikasi (otomatis terdeteksi dari env):
//
//  A) OAuth user (untuk Workspace tanpa Shared Drive / bukan admin) — file masuk My Drive akun:
//       GDRIVE_OAUTH_CLIENT_ID     = Client ID OAuth
//       GDRIVE_OAUTH_CLIENT_SECRET = Client Secret OAuth
//       GDRIVE_OAUTH_REFRESH_TOKEN = refresh token (diambil sekali via OAuth Playground)
//
//  B) Service Account (untuk Workspace dengan Shared Drive):
//       GDRIVE_SA_JSON       = isi penuh file kunci Service Account (JSON)
//          atau GDRIVE_SA_KEY_FILE = path ke file JSON
//
//  Wajib (kedua mode):
//       GDRIVE_FOLDER_ID  = ID folder tujuan (atau diisi lewat Pengaturan → gdrive_folder_id)
//
// Bila ketiga env OAuth ada, mode OAuth dipakai lebih dulu; jika tidak, jatuh ke Service Account.
// Modul ini "graceful": bila belum dikonfigurasi, isConfigured() = false dan
// pemanggil cukup melewati upload tanpa menggagalkan proses publish.
const fs = require('fs');
const { Readable } = require('stream');

const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const FOLDER_MIME = 'application/vnd.google-apps.folder';

// --- Mode OAuth (user) ---
function hasOAuth() {
  return !!(process.env.GDRIVE_OAUTH_CLIENT_ID &&
    process.env.GDRIVE_OAUTH_CLIENT_SECRET &&
    process.env.GDRIVE_OAUTH_REFRESH_TOKEN);
}

// --- Mode Service Account ---
function hasServiceAccount() {
  return !!(process.env.GDRIVE_SA_JSON ||
    (process.env.GDRIVE_SA_KEY_FILE && fs.existsSync(process.env.GDRIVE_SA_KEY_FILE)));
}

function loadCreds() {
  if (process.env.GDRIVE_SA_JSON) {
    return JSON.parse(process.env.GDRIVE_SA_JSON);
  }
  const f = process.env.GDRIVE_SA_KEY_FILE;
  if (f && fs.existsSync(f)) {
    return JSON.parse(fs.readFileSync(f, 'utf8'));
  }
  throw new Error('Kredensial Google belum diatur (GDRIVE_SA_JSON atau GDRIVE_SA_KEY_FILE)');
}

// Terima ID polos ATAU URL folder (mis. .../folders/<ID>?usp=...) lalu ambil ID-nya.
function normalizeFolderId(v) {
  if (!v) return v;
  const s = String(v).trim();
  const m = s.match(/\/folders\/([A-Za-z0-9_-]+)/) || s.match(/[?&]id=([A-Za-z0-9_-]+)/);
  if (m) return m[1];
  return s.replace(/[?#].*$/, ''); // buang query string bila ada
}

function folderId() {
  if (process.env.GDRIVE_FOLDER_ID) return normalizeFolderId(process.env.GDRIVE_FOLDER_ID);
  try {
    const { getDB } = require('./db');
    const s = getDB().prepare("SELECT value FROM settings WHERE key='gdrive_folder_id'").get();
    if (s && s.value) return normalizeFolderId(s.value);
  } catch {}
  throw new Error('Folder Google Drive belum diatur (GDRIVE_FOLDER_ID atau setting gdrive_folder_id)');
}

function hasCreds() {
  return hasOAuth() || hasServiceAccount();
}

// Diagnosa non-rahasia: untuk memastikan env benar-benar terbaca server.
// Client ID OAuth BUKAN rahasia (boleh tampil penuh). Secret & refresh token
// hanya ditampilkan panjang + awalannya, tidak pernah utuh.
function debugInfo() {
  const cid = process.env.GDRIVE_OAUTH_CLIENT_ID || '';
  const sec = process.env.GDRIVE_OAUTH_CLIENT_SECRET || '';
  const rt = process.env.GDRIVE_OAUTH_REFRESH_TOKEN || '';
  return {
    mode: hasOAuth() ? 'oauth' : (hasServiceAccount() ? 'service_account' : 'none'),
    oauthClientId: cid || null,
    oauthClientIdLooksValid: /\.apps\.googleusercontent\.com$/.test(cid.trim()),
    clientIdHasWhitespace: cid !== cid.trim(),
    clientSecretLen: sec.length,
    clientSecretPrefix: sec ? sec.slice(0, 7) : null,
    clientSecretHasWhitespace: sec !== sec.trim(),
    refreshTokenLen: rt.length,
    refreshTokenPrefix: rt ? rt.slice(0, 3) : null,
    refreshTokenHasWhitespace: rt !== rt.trim(),
  };
}

function hasFolder() {
  if (process.env.GDRIVE_FOLDER_ID) return true;
  try {
    const { getDB } = require('./db');
    const s = getDB().prepare("SELECT value FROM settings WHERE key='gdrive_folder_id'").get();
    return !!(s && s.value);
  } catch { return false; }
}

function isConfigured() {
  return hasCreds() && hasFolder();
}

let _drive = null;
async function getDrive() {
  if (_drive) return _drive;
  const { google } = require('googleapis'); // lazy: hanya dibutuhkan saat upload aktif

  if (hasOAuth()) {
    // Mode OAuth user: file masuk My Drive akun yang memberi izin.
    const oauth2 = new google.auth.OAuth2(
      process.env.GDRIVE_OAUTH_CLIENT_ID,
      process.env.GDRIVE_OAUTH_CLIENT_SECRET
    );
    oauth2.setCredentials({ refresh_token: process.env.GDRIVE_OAUTH_REFRESH_TOKEN });
    _drive = google.drive({ version: 'v3', auth: oauth2 });
    return _drive;
  }

  // Mode Service Account (Shared Drive).
  const auth = new google.auth.GoogleAuth({
    credentials: loadCreds(),
    scopes: ['https://www.googleapis.com/auth/drive'],
  });
  const client = await auth.getClient();
  _drive = google.drive({ version: 'v3', auth: client });
  return _drive;
}

const qEscape = (s) => String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'");

async function findChild(drive, name, parent, mimeType) {
  let q = `name='${qEscape(name)}' and '${qEscape(parent)}' in parents and trashed=false`;
  if (mimeType) q += ` and mimeType='${mimeType}'`;
  const r = await drive.files.list({
    q,
    fields: 'files(id,name)',
    pageSize: 1,
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
    spaces: 'drive',
  });
  return (r.data.files && r.data.files[0]) ? r.data.files[0].id : null;
}

async function findOrCreateFolder(drive, name, parent) {
  const existing = await findChild(drive, name, parent, FOLDER_MIME);
  if (existing) return existing;
  const r = await drive.files.create({
    requestBody: { name, mimeType: FOLDER_MIME, parents: [parent] },
    fields: 'id',
    supportsAllDrives: true,
  });
  return r.data.id;
}

// Upload (atau perbarui) DOCX ke struktur: <root>/<Unit>/<Nomor>/<filename>
// Mengembalikan { id, link }.
async function uploadDocx({ buffer, filename, unitName, nomor }) {
  const drive = await getDrive();
  let parent = folderId();
  if (unitName) parent = await findOrCreateFolder(drive, String(unitName).trim(), parent);
  if (nomor) parent = await findOrCreateFolder(drive, String(nomor).trim(), parent);

  const existingId = await findChild(drive, filename, parent, DOCX_MIME);
  const media = { mimeType: DOCX_MIME, body: Readable.from(buffer) };

  let fileId, link;
  if (existingId) {
    const r = await drive.files.update({
      fileId: existingId, media, fields: 'id,webViewLink', supportsAllDrives: true,
    });
    fileId = r.data.id; link = r.data.webViewLink;
  } else {
    const r = await drive.files.create({
      requestBody: { name: filename, parents: [parent], mimeType: DOCX_MIME },
      media, fields: 'id,webViewLink', supportsAllDrives: true,
    });
    fileId = r.data.id; link = r.data.webViewLink;
  }

  // Best effort: izinkan "siapa saja dengan link" agar QR bisa dipindai tanpa login.
  // Admin Workspace bisa memblokir ini — diabaikan bila gagal.
  try {
    await drive.permissions.create({
      fileId, requestBody: { role: 'reader', type: 'anyone' }, supportsAllDrives: true,
    });
  } catch {}

  return { id: fileId, link: link || `https://drive.google.com/file/d/${fileId}/view` };
}

// Uji koneksi: verifikasi kredensial valid DAN folder tujuan dapat diakses
// Service Account (artinya folder sudah di-share ke email SA). Throw bila gagal.
async function testConnection() {
  const drive = await getDrive();
  const fid = folderId();
  const meta = await drive.files.get({
    fileId: fid, fields: 'id,name,driveId', supportsAllDrives: true,
  });
  return {
    ok: true,
    folderName: meta.data.name,
    folderId: meta.data.id,
    sharedDrive: !!meta.data.driveId,
  };
}

module.exports = { isConfigured, uploadDocx, hasCreds, hasFolder, testConnection, debugInfo };
