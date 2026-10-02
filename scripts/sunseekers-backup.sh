#!/usr/bin/env bash
set -eo pipefail

TIMESTAMP=$(date +'%Y%m%d_%H%M%S')
BACKUP_DIR="/var/backups/sunseekers"
BACKUP_FILE="${BACKUP_DIR}/sunseekers_db_${TIMESTAMP}.sql.gz"
REMOTE_DEST="gdrive:sunseekers-crm-backups"
LOG_PREFIX="[$(date +'%Y-%m-%d %H:%M:%S')] [SUNSEEKERS-BACKUP]"

echo "${LOG_PREFIX} Starting automated database backup..."

# Ensure local backup directory exists
mkdir -p "${BACKUP_DIR}"

# Verify postgres container is running
if ! docker ps --format '{{.Names}}' | grep -q '^sunseekers-db$'; then
  echo "${LOG_PREFIX} ERROR: sunseekers-db container is not running! Aborting backup." >&2
  exit 1
fi

# Execute pg_dump and compress with gzip
echo "${LOG_PREFIX} Dumping PostgreSQL database 'sunseekers' from container..."
docker exec sunseekers-db pg_dump -U sunseekers sunseekers | gzip -9 > "${BACKUP_FILE}"

FILE_SIZE=$(stat -c%s "${BACKUP_FILE}" 2>/dev/null || stat -f%z "${BACKUP_FILE}")
echo "${LOG_PREFIX} Backup created: ${BACKUP_FILE} (${FILE_SIZE} bytes)"

if [ "${FILE_SIZE}" -lt 10000 ]; then
  echo "${LOG_PREFIX} ERROR: Backup file is unusually small (${FILE_SIZE} bytes). Dump may be corrupt!" >&2
  exit 1
fi

# Upload to Google Drive using rclone
echo "${LOG_PREFIX} Uploading backup to Google Drive (${REMOTE_DEST})..."
/usr/local/bin/rclone copy "${BACKUP_FILE}" "${REMOTE_DEST}"

echo "${LOG_PREFIX} Verifying upload to Google Drive..."
/usr/local/bin/rclone check "${BACKUP_FILE}" "${REMOTE_DEST}" --one-way || true

# Retention: Keep last 7 days of local backups
echo "${LOG_PREFIX} Cleaning up local backups older than 7 days..."
find "${BACKUP_DIR}" -type f -name "sunseekers_db_*.sql.gz" -mtime +7 -delete

# Retention: Keep last 30 days of Google Drive backups
echo "${LOG_PREFIX} Rotating Google Drive backups older than 30 days..."
/usr/local/bin/rclone delete --min-age 30d "${REMOTE_DEST}" || true

echo "${LOG_PREFIX} Automated backup completed successfully!"
