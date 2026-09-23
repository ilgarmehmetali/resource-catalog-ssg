#!/usr/bin/env bash
# Simple Directory Backup Script
set -euo pipefail

SRC_DIR="${1:-./resources}"
DEST_DIR="${2:-./backups}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

mkdir -p "$DEST_DIR"
ARCHIVE_NAME="catalog_backup_${TIMESTAMP}.tar.gz"

echo "Creating backup of ${SRC_DIR} to ${DEST_DIR}/${ARCHIVE_NAME}..."
tar -czf "${DEST_DIR}/${ARCHIVE_NAME}" -C "$(dirname "$SRC_DIR")" "$(basename "$SRC_DIR")"
echo "Backup successfully created."

