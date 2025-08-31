#!/bin/bash

# Name of the image and container
IMAGE_NAME="ct-radius-server"

# Optional: path to the Dockerfile
DOCKERFILE="Dockerfile"

# Build context (e.g. current directory)
CONTEXT_DIR="../../"

echo "🔧 Building Docker image '$IMAGE_NAME' using '$DOCKERFILE'..."
docker build -f "$DOCKERFILE" -t "$IMAGE_NAME" "$CONTEXT_DIR"