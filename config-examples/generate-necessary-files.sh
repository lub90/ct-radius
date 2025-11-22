#!/bin/bash

# List of log files to create
LOG_FILES=(
  "radius.log"
  "authorize.log"
)

echo "📝 Creating empty log files..."

for file in "${LOG_FILES[@]}"; do
  if [ ! -f "$file" ]; then
    touch "$file"
    echo "✅ Created: $file"
  else
    echo "ℹ️ Already exists: $file"
  fi
done

# TODO: Add generation of config.yaml and var.env

echo "🚀 Done. Add your config.yaml, var.env, clients.conf, server.key, server.pem and ca.pem. Run set-mount-permission.sh afterwards to finish setup."
