#!/bin/bash

# GID for freerad
FREERAD_GID=998

# Files that need write access
WRITABLE_FILES=(
  "authorize.log"
  "radius.log"
)

# Files that should be read-only
READONLY_FILES=(
  "ca.pem"
  "clients.conf"
  "config.json"
  "server.key"
  "server.pem"
  "var.env"
  "decryption.pem"
)

# Ask user for target directory
read -rp "📂 Enter the path where the files are located: " TARGET_DIR
TARGET_DIR=$(eval echo "$TARGET_DIR")

# Check if path exists and is a directory
if [ ! -d "$TARGET_DIR" ]; then
  echo "❌ Error: $TARGET_DIR does not exist or is not a directory."
  exit 1
fi

echo "🔧 Setting group ownership of files in $TARGET_DIR to freerad (GID $FREERAD_GID)..."
echo ""

# Writable files: chown + chmod 660
for file in "${WRITABLE_FILES[@]}"; do
  full_path="$TARGET_DIR/$file"
  if [ -f "$full_path" ]; then
    sudo chown root:$FREERAD_GID "$full_path"
    sudo chmod 660 "$full_path"
    echo "✅ Write permissions set for: $full_path"
  else
    echo "⚠️ File not found: $full_path"
  fi
done

# Read-only files: chown + chmod 640
for file in "${READONLY_FILES[@]}"; do
  full_path="$TARGET_DIR/$file"
  if [ -f "$full_path" ]; then
    sudo chown root:$FREERAD_GID "$full_path"
    sudo chmod 640 "$full_path"
    echo "✅ Read permissions set for: $full_path"
  else
    echo "⚠️ File not found: $full_path"
  fi
done

echo ""
echo "🚀 Permissions successfully updated in $TARGET_DIR."
