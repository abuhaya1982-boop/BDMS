// Brantas DMS — Node.js Backend
const express = require('express');
const session = require('express-session');
const path = require('path');
const app = express();

// Session store (SQLite-backed)
const SQLiteStore = require('connect-sqlite3')(session);

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.use(session({
  store: new SQLiteStore({ db: 'sessions.db', dir: path.join(__dirname, 'database') }),
  secret: process.env.SESSION_SECRET || 'bdms-brantas-secret-2025',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 86400000, // 24 hours
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production'
  }
}));

// CORS headers
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// Serve static frontend files
app.use(express.static(path.join(__dirname, 'public')));
// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// API Routes
app.use('/api/auth', require('./src/routes/auth'));
app.use('/api/dokumen', require('./src/routes/dokumen'));
app.use('/api/workflow', require('./src/routes/workflow'));
app.use('/api/dashboard', require('./src/routes/dashboard'));
app.use('/api/equipment', require('./src/routes/equipment'));
app.use('/api/units', require('./src/routes/masterdata').units);
app.use('/api/probis', require('./src/routes/masterdata').probis);
app.use('/api/templates', require('./src/routes/templates'));
app.use('/api/pengguna', require('./src/routes/pengguna'));
app.use('/api/roles', require('./src/routes/roles'));
app.use('/api/permissions', require('./src/routes/roles').permissions);
app.use('/api/invitations', require('./src/routes/invitations'));
app.use('/api/sessions', require('./src/routes/sessions'));
app.use('/api/audit', require('./src/routes/audit'));
app.use('/api/notifikasi', require('./src/routes/notifikasi'));
app.use('/api/laporan', require('./src/routes/laporan'));
app.use('/api/qrcode', require('./src/routes/qrcode'));
app.use('/api/settings', require('./src/routes/settings'));
app.use('/api/upload', require('./src/routes/upload'));

// SPA fallback — serve index.html for all non-API routes
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api/')) {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  } else {
    res.status(404).json({ success: false, message: 'Endpoint tidak ditemukan' });
  }
});

// Error handler
app.use((err, req, res, _next) => {
  console.error('Server error:', err);
  res.status(500).json({ success: false, message: err.message || 'Internal server error' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Brantas DMS running on port ${PORT}`));
