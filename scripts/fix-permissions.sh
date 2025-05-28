#!/bin/bash
# Script to rebuild base images and fix permission issues

echo "====================================="
echo "Fixing permission issues in containers"
echo "====================================="

# Change to the project directory
cd "$(dirname "$0")/.."

echo "Current directory: $(pwd)"

echo "1. Rebuilding base images with fixed permissions..."
npm run update-bases

echo "2. Cleaning up any stopped containers with permission issues..."
docker ps -a | grep "dev-env-" | awk '{print $1}' | xargs -r docker rm

echo "3. Removing any existing project volumes that might have permission issues..."
echo "   (Note: This will delete all existing project data)"
docker volume ls | grep "\-project" | awk '{print $2}' | xargs -r docker volume rm

echo "4. Checking Docker socket permissions..."
ls -la /var/run/docker.sock
echo "If the Docker socket is not accessible, run: sudo chmod 666 /var/run/docker.sock"

echo "====================================="
echo "Permission fixes complete. Please restart the cloud-dev-environment service."
echo "To restart: docker compose down && docker compose up -d"
echo "====================================="

# Make sure the script is executable
chmod +x "$(dirname "$0")/update-bases.js"
