#!/bin/bash


copy_if_missing() {
  local src="$1"
  local dest="$2"

  if [ -f "$src" ]; then
    if [ ! -f "$dest" ]; then
      cp "$src" "$dest"
      echo "✅ Copied $(basename "$src") to $dest"
    else
      echo "ℹ️  Already exists: $dest"
    fi
  else
    echo "⚠️ $(basename "$src") not found in $(dirname "$src")"
  fi
}




# List of log files to create
LOG_FILES=(
  "radius.log"
  "authorize.log"
)

# Ask user for target directory
read -rp "📂 Enter the path where you want to generate the files: " TARGET_DIR

# Expand ~ to home if present
TARGET_DIR=$(eval echo "$TARGET_DIR")

# Check if path exists and is a directory
if [ ! -d "$TARGET_DIR" ]; then
  echo "❌ Error: $TARGET_DIR does not exist or is not a directory."
  exit 1
fi

echo "📝 Creating necessary files in $TARGET_DIR..."
echo ""

for file in "${LOG_FILES[@]}"; do
  full_path="$TARGET_DIR/$file"
  if [ ! -f "$full_path" ]; then
    touch "$full_path"
    echo "✅ Created: $full_path"
  else
    echo "ℹ️  Already exists: $full_path"
  fi
done




# Copy reference config and env files
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

copy_if_missing "$SCRIPT_DIR/config.json" "$TARGET_DIR/config.json"
copy_if_missing "$SCRIPT_DIR/config-reference.jsonc" "$TARGET_DIR/config-reference.jsonc"
copy_if_missing "$SCRIPT_DIR/var.env" "$TARGET_DIR/var.env"
copy_if_missing "$SCRIPT_DIR/clients.conf" "$TARGET_DIR/clients.conf"
copy_if_missing "$SCRIPT_DIR/docker-compose.yml" "$TARGET_DIR/docker-compose.yml"



echo ""
echo "🚀 Done - Next steps are:"
echo "- Edit the config.json, var.env and clients.conf to suit your setup."
echo "- Add the server.key, server.pem, ca.pem for the server's certificate to $TARGET_DIR."
echo "- Add the decryption.pem for the encryption of the secondary password to $TARGET_DIR."
echo "- Run set-permissions.sh afterwards to finish the file setup."
