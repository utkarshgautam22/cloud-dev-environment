# Cloud Development Environment

A platform for provisioning and managing containerized development environments.

## Features

- Provision cloud development environments in various languages (Python, Node.js, C, C++)
- Web-based VS Code IDE for each environment
- SSH access to environments
- Automatic Docker resource management
- API for environment provisioning and termination

## Resource Management and Cleanup

The system includes automated Docker resource management to prevent excessive resource consumption:

### Manual Cleanup

You can manually clean up Docker resources using the cleanup script:

```bash
# Clean everything (default)
node scripts/cleanup.js

# Only clean containers
node scripts/cleanup.js --containers

# Only clean images
node scripts/cleanup.js --images

# Fine-grained control
node scripts/cleanup.js --dangling --non-base

# Preview what would be removed without deleting
node scripts/cleanup.js --dry-run
```

### Automatic Cleanup

The system can automatically clean up resources based on configurable thresholds. Configure via environment variables:

```
ENABLE_AUTO_CLEANUP=true
CLEANUP_DISK_THRESHOLD=80
CLEANUP_IMAGE_AGE_HOURS=24
CLEANUP_CONTAINER_AGE_HOURS=48
```

## Environment Setup

1. Ensure Docker is installed and running
2. Run `npm install` to install dependencies
3. Run `node scripts/update-bases.js` to build base images
4. Configure environment variables in `.env` file (see `.env.example`)
5. Start the server with `npm start`

## API Documentation

API endpoints for environment management:

- `POST /api/environments` - Provision a new environment
- `GET /api/environments` - List all environments
- `GET /api/environments/:id` - Get environment details
- `DELETE /api/environments/:id` - Terminate an environment
