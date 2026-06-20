#!/bin/bash

# ==============================================================================
# Enterprise MongoDB Restore Script
# ==============================================================================

MONGO_URI=${MONGO_URI:-"mongodb://localhost:27017/prime-oil"}
BACKUP_FILE=$1

if [ -z "$BACKUP_FILE" ]; then
  echo "Usage: ./restore.sh <path_to_backup.archive>"
  exit 1
fi

if [ ! -f "$BACKUP_FILE" ]; then
  echo "ERROR: File not found: $BACKUP_FILE"
  exit 1
fi

echo "Starting restore from $BACKUP_FILE to $MONGO_URI"
echo "WARNING: This will drop existing collections in the target database."
read -p "Are you sure you want to continue? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "Restore cancelled."
  exit 1
fi

mongorestore --uri="$MONGO_URI" --archive="$BACKUP_FILE" --gzip --drop

if [ $? -eq 0 ]; then
  echo "Restore completed successfully."
else
  echo "ERROR: Restore failed."
  exit 1
fi
