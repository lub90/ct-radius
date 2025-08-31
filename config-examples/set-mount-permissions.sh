#!/bin/bash

# GID for freerad
FREERAD_GID=998

# Files that need write access
WRITABLE_FILES=(
  "authorize.log"
  "synchronize.log"
  "radius.log"
  "database.db"
)

# Files that should be read-only
READONLY_FILES=(
  "ca.pem"
  "clients.conf"
  "config.yaml"
  "server.key"
  "server.pem"
  "var.env"
)

echo "🔧 Setting group ownership to freerad (GID $FREERAD_GID)..."

# Writable files: chown + chmod 660
for file in "${WRITABLE_FILES[@]}"; do
  if [ -f "$file" ]; then
    sudo chown root:$FREERAD_GID "$file"
    sudo chmod 660 "$file"
    echo "✅ Write permissions set for: $file"
  else
    echo "⚠️ File not found: $file"
  fi
done

# Read-only files: chown + chmod 640
for file in "${READONLY_FILES[@]}"; do
  if [ -f "$file" ]; then
    sudo chown root:$FREERAD_GID "$file"
    sudo chmod 640 "$file"
    echo "✅ Read permissions set for: $file"
  else
    echo "⚠️ File not found: $file"
  fi
done

echo "✅ Permissions successfully updated."
