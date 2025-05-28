# Cloud Development Environment

A platform for provisioning and managing containerized development environments with a modern web interface. This system allows developers to create, access, and manage isolated development environments directly from their browser or via SSH.

## Key Features

### Development Environments
- **Multi-Language Support**: Provision environments for multiple programming languages:
  - Python 3.9 with common data science packages
  - Node.js 18 with NPM
  - C development with GCC
  - C++ development with G++
- **Persistent Storage**: All project data persists between container restarts
- **Resource Management**: Configurable CPU and memory limits per environment

### Access Methods
- **VS Code in Browser**: Web-based VS Code (code-server) accessible via browser
- **SSH Access**: Secure shell access with unique port for each environment
- **Subdomain Routing**: Optional Traefik integration for subdomain-based access

### Security
- **User Isolation**: Each environment is associated with a specific user
- **Authentication**: API token-based access control
- **Container Isolation**: Each development environment runs in its own container

### User Experience
- **Modern UI**: Clean, responsive interface built with modern web technologies
- **Dark/Light Mode**: Automatically adapts to user preference with manual toggle option
- **Environment Dashboard**: Visual overview of all active environments
- **Status Indicators**: Real-time status of each environment (running, stopped)

## System Architecture

### Container Architecture
- **Base Images**: Pre-built for each supported language
- **User Containers**: Created on-demand from base images
- **Named Volumes**: Persistent storage for each environment
- **Network Isolation**: Each container has its own network namespace
- **Resource Control**: CPU and memory limits per container

### Backend Components
- **Express.js Server**: Handles API requests and serves the frontend
- **Docker Service**: Manages container lifecycle via Dockerode
- **Authentication Middleware**: Validates API tokens for all requests
- **Logging System**: Structured logging with Winston

### Frontend Components
- **Responsive Dashboard**: Works on desktop and mobile devices
- **Real-time Updates**: Environment status updates
- **Interactive UI**: Create, manage, and access environments
- **Session Management**: Persistent user sessions with local storage

## Resource Management

The system includes comprehensive Docker resource management to prevent excessive resource consumption:

### Automatic Cleanup
The system automatically cleans up resources based on configurable thresholds:

```
ENABLE_AUTO_CLEANUP=true
CLEANUP_DISK_THRESHOLD=80     # Clean when disk usage exceeds 80%
CLEANUP_IMAGE_AGE_HOURS=24    # Remove non-base images older than 24h
CLEANUP_CONTAINER_AGE_HOURS=48 # Remove stopped containers older than 48h
```

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

## Installation & Setup

### Prerequisites
- Docker Engine 20.10+ and Docker Compose v2+
- Node.js 16+ and npm
- At least 1GB of free RAM and 5GB of disk space
- Ports 3000 (API/UI), 22000-22999 (SSH), 8000-8999 (Web IDE) available

### Quick Start
```bash
# Clone the repository
git clone https://github.com/username/cloud-dev-environment.git
cd cloud-dev-environment

# Install dependencies
npm install

# Configure environment variables (copy and modify example)
cp .env.example .env

# Build base environment images
npm run update-bases

# Start the platform
npm start
```

### Docker Compose Deployment
For production deployments, use Docker Compose:

```bash
# Start all services
docker compose up -d

# View logs
docker compose logs -f

# Stop all services
docker compose down
```

### Environment Configuration
Configure the platform via `.env` file:

```
# Basic Configuration
PORT=3000                   # Web server port
NODE_ENV=production         # Environment (development/production)
LOG_LEVEL=info              # Log verbosity

# Docker Resource Limits
BASE_SSH_PORT=22000         # Starting port for SSH
BASE_IDE_PORT=8000          # Starting port for web IDE
CPU_SHARES=512              # CPU allocation per container
MEMORY_LIMIT=536870912      # Memory limit (512MB)

# Domain Configuration (for subdomain routing)
BASE_DOMAIN=dev.example.com # Base domain for environments
```

## API Documentation

The platform provides a RESTful API for environment management:

### Authentication
All API requests require authentication headers:
```
x-api-token: YOUR_API_TOKEN
x-user-id: YOUR_USER_ID
```

### Endpoints
| Method | Endpoint              | Description                      | Request Body                     |
|--------|----------------------|----------------------------------|----------------------------------|
| POST   | /api/environments    | Create new environment           | `{ "type": "python" }`           |
| GET    | /api/environments    | List all environments            | -                                |
| DELETE | /api/environments/:id| Terminate an environment         | -                                |
| GET    | /health              | Platform health check            | -                                |

## Frontend Interface

The platform includes a modern, responsive web interface for managing development environments with an intuitive user experience.

### User Interface Components

#### Login Screen
- API token and user ID authentication
- Credential persistence with local storage
- Optional base domain configuration
- Automatic login for returning users

#### Environment Dashboard
- Card and table views of all environments
- Real-time status indicators (running/stopped)
- Quick-access buttons for environment management
- Dark/light mode toggle based on system preference

#### Environment Management
- One-click environment creation by language type
- Copy-to-clipboard functionality for SSH commands
- Direct links to web-based VS Code instances
- Confirmation dialogs for destructive actions

<!-- ### Screenshots

![Login Screen](docs/screenshots/login.png)
![Dashboard](docs/screenshots/dashboard.png) -->

### Mobile Responsiveness
The interface automatically adapts to different screen sizes:
- Stacked cards view on mobile devices
- Condensed table view on tablets
- Full-featured dashboard on desktop

### User Experience Features
- Toast notifications for important events
- Loading indicators for async operations
- Error handling with user-friendly messages
- Session persistence between visits
- Keyboard shortcuts for common actions

## Development and Customization

### Adding New Language Environments
1. Create a new directory under `src/dockerfiles/`
2. Add `Dockerfile` and `entrypoint.sh` based on existing templates
3. Customize with language-specific packages and tools
4. Run `npm run update-bases` to build the new image

### Customizing the Frontend
- Modify styles in `src/public/styles.css`
- Update JavaScript functionality in `src/public/frontend.js`
- Add new UI components by modifying HTML templates

## Troubleshooting

### Common Issues
- **Container fails to start**: Check Docker logs and ensure ports are available
- **Cannot access web IDE**: Verify the container is running and ports are accessible
- **Authentication fails**: Check API token and user ID in request headers

### Logs and Debugging
- Server logs are stored in `logs/app.log`
- Container logs can be viewed with `docker logs <container_id>`
- Set `LOG_LEVEL=debug` in `.env` for verbose logging

## License
This project is licensed under the MIT License - see the LICENSE file for details.
