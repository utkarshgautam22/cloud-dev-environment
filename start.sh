#!/bin/bash
# Cloud Development Environment Startup Script

# Banner
echo "================================="
echo "Cloud Development Environment"
echo "================================="

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
  echo "❌ Docker is not running or not accessible!"
  echo "Please start the Docker daemon before continuing."
  exit 1
fi

echo "✅ Docker is running"

# Check if .env file exists, create from example if not
if [ ! -f .env ]; then
  echo "❗ .env file not found, creating from .env.example"
  if [ -f .env.example ]; then
    cp .env.example .env
    echo "✅ Created .env file from example template"
    echo "🔑 Please update API_KEY in .env with a secure key before deploying to production"
  else
    echo "❌ .env.example not found, cannot create .env file"
    exit 1
  fi
fi

# Check if dependencies are installed
if [ ! -d "node_modules" ]; then
  echo "📦 Installing dependencies..."
  npm install
  echo "✅ Dependencies installed"
fi

# Update base Docker images
echo "🐳 Updating base Docker images..."
npm run update-bases
echo "✅ Docker images updated"

# Start the application
echo "🚀 Starting Cloud Development Environment"
echo "📝 Check logs with: npm run logs"
echo "================================="
npm start
