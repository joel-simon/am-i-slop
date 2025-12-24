#!/bin/bash

# Build and push RunPod worker to Docker Hub
# Usage: ./build-and-push.sh [YOUR_DOCKER_USERNAME]

if [ -z "$1" ]; then
    echo "Error: Docker username required"
    echo "Usage: ./build-and-push.sh [YOUR_DOCKER_USERNAME]"
    exit 1
fi

DOCKER_USERNAME=$1
IMAGE_NAME="perplexity-worker"
FULL_IMAGE="${DOCKER_USERNAME}/${IMAGE_NAME}:latest"

echo "🔨 Building Docker image: ${FULL_IMAGE}"
docker build --platform linux/amd64 --tag "${FULL_IMAGE}" .

if [ $? -ne 0 ]; then
    echo "❌ Build failed"
    exit 1
fi

echo "✅ Build successful!"
echo ""
echo "🚀 Pushing to Docker Hub..."
docker push "${FULL_IMAGE}"

if [ $? -ne 0 ]; then
    echo "❌ Push failed"
    exit 1
fi

echo "✅ Push successful!"
echo ""
echo "📦 Your image is ready:"
echo "   ${FULL_IMAGE}"
echo ""
echo "🎯 Next steps:"
echo "   1. Go to https://www.console.runpod.io/serverless"
echo "   2. Click 'New Endpoint'"
echo "   3. Click 'Import from Docker Registry'"
echo "   4. Enter: docker.io/${FULL_IMAGE}"
echo "   5. In the Model field, enter: gpt2"
echo "   6. Click 'Deploy Endpoint'"

