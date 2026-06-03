#!/usr/bin/env bash
# ───────────────────────────────────────────────────────────────
#  Backup harian DB Brantas DMS (SQLite, mode WAL)
#  - Snapshot konsisten via "sqlite3 .backup" (fallback: salin db+wal+shm)
#  - Hasil dikompres .gz
#  - Rotasi: simpan 7 backup terbaru, sisanya dihapus otomatis
#
#  Lokasi DB & backup memakai env var bila tersedia, jika tidak pakai
#  default path Hostinger akun ini (di LUAR folder deploy, jadi aman).
# ───────────────────────────────────────────────────────────────
set -u

DB="${BDMS_DB_PATH:-${BDMS_DATA_DIR:-/home/u427599352/bdms-data}/bdms.db}"
BACKUP_DIR="${BDMS_BACKUP_DIR:-/home/u427599352/bdms-backups}"
KEEP="${BDMS_BACKUP_KEEP:-7}"

STAMP="$(date +%Y%m%d-%H%M%S)"
OUT="$BACKUP_DIR/bdms-$STAMP.db"

mkdir -p "$BACKUP_DIR"

if [ ! -f "$DB" ]; then
  echo "[backup] DB tidak ditemukan: $DB" >&2
  exit 1
fi

# 1) Snapshot konsisten
if command -v sqlite3 >/dev/null 2>&1; then
  sqlite3 "$DB" ".backup '$OUT'"
else
  # Fallback: salin file db + WAL + SHM bersamaan (cukup aman bila trafik rendah)
  cp "$DB" "$OUT"
  [ -f "$DB-wal" ] && cp "$DB-wal" "$OUT-wal"
  [ -f "$DB-shm" ] && cp "$DB-shm" "$OUT-shm"
fi

# 2) Kompres
gzip -f "$OUT"
[ -f "$OUT-wal" ] && gzip -f "$OUT-wal"
[ -f "$OUT-shm" ] && gzip -f "$OUT-shm"

echo "[backup] OK: $OUT.gz"

# 3) Rotasi — simpan $KEEP file *.db.gz terbaru
ls -1t "$BACKUP_DIR"/bdms-*.db.gz 2>/dev/null | tail -n +"$((KEEP + 1))" | while read -r old; do
  rm -f "$old" "${old%.db.gz}".db-wal.gz "${old%.db.gz}".db-shm.gz
  echo "[backup] hapus lama: $old"
done

exit 0
