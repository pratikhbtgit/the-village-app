#!/usr/bin/env bash

# Ensure backups directory exists
mkdir -p backups

# Generate timestamped backup filename
TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")
BACKUP_FILE="backups/village_${TIMESTAMP}.sqlite"

# Copy SQLite database file
if [ -f "village.sqlite" ]; then
    cp village.sqlite "$BACKUP_FILE"
    echo "✅ Database backup created successfully: $BACKUP_FILE"
else
    echo "⚠️ Error: village.sqlite file not found."
    exit 1
fi
