#!/bin/bash

# ==============================================================================
# Enterprise MongoDB Backup Script
# Handles: Automated Backups, Retention Policies, and basic Validation
# ==============================================================================

# Configuration
MONGO_URI=${MONGO_URI:-"mongodb://localhost:27017/prime-oil"}
BACKUP_DIR=${BACKUP_DIR:-"/var/backups/prime-oil/mongodb"}
LOG_FILE="${BACKUP_DIR}/backup.log"
DATE=$(date +%Y-%m-%d_%H-%M-%S)
ARCHIVE_NAME="prime-oil_${DATE}.archive"
BACKUP_PATH="${BACKUP_DIR}/${ARCHIVE_NAME}"

# Retention Policies
DAILY_RETENTION=30
MONTHLY_RETENTION=365

mkdir -p "$BACKUP_DIR"

log() {
  echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log "Starting MongoDB backup process..."

# 1. Perform Backup
mongodump --uri="$MONGO_URI" --archive="$BACKUP_PATH" --gzip
if [ $? -ne 0 ]; then
  log "ERROR: mongodump failed."
  exit 1
fi

log "Backup completed successfully: ${BACKUP_PATH}"

# 2. Validate Backup Automatically
log "Validating backup archive..."
bsondump --archive="$BACKUP_PATH" > /dev/null 2>&1
# We actually just check if the gzip archive is valid using gzip -t
gzip -t "$BACKUP_PATH"
if [ $? -ne 0 ]; then
  log "ERROR: Backup validation failed. Archive is corrupt."
  exit 1
fi
log "Backup validation passed."

# 3. Apply Retention Policy
log "Applying retention policy (Daily: ${DAILY_RETENTION} days, Monthly: ${MONTHLY_RETENTION} days)..."

# Find and delete backups older than 30 days, EXCEPT those taken on the 1st of the month
find "$BACKUP_DIR" -name "*.archive" -type f -mtime +${DAILY_RETENTION} | while read -r file; do
  filename=$(basename "$file")
  # Extract day of month from prime-oil_YYYY-MM-DD_HH-MM-SS.archive
  if [[ $filename =~ _([0-9]{4}-[0-9]{2}-01)_ ]]; then
    # It's a monthly snapshot (1st of the month)
    # Check if older than 365 days
    mtime=$(stat -c %Y "$file" 2>/dev/null || stat -f %m "$file")
    now=$(date +%s)
    diff=$(( (now - mtime) / 86400 ))
    if [ $diff -gt $MONTHLY_RETENTION ]; then
      log "Deleting old monthly backup: $file"
      rm -f "$file"
    fi
  else
    log "Deleting old daily backup: $file"
    rm -f "$file"
  fi
done

log "Backup process completed successfully."
exit 0
