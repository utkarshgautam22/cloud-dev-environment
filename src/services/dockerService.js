// Load environment variables immediately
require('dotenv').config();

// Configuration from .env
const BASE_SSH_PORT = parseInt(process.env.BASE_SSH_PORT, 10) || 22000;
const BASE_IDE_PORT = parseInt(process.env.BASE_IDE_PORT, 10) || 8000;
const CPU_SHARES = parseInt(process.env.CPU_SHARES, 10) || 512;
const MEMORY_LIMIT = parseInt(process.env.MEMORY_LIMIT, 10) || 536870912;
const BASE_DOMAIN = process.env.BASE_DOMAIN || '';

const Docker = require('dockerode');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const logger = require('../utils/logger');

// Initialize Dockerode. Assumes Docker is running locally.
// For remote Docker daemon, configure appropriately:
// const docker = new Docker({ host: 'http://127.0.0.1', port: 2375 });
const docker = new Docker();

// Keep track of host ports in use to avoid conflicts
// Map container ID to its allocated ports for proper release
const usedPorts = new Set();
const containerPortsMap = new Map();

function getAvailablePort(basePort, type) {
    let port = basePort;
    while (usedPorts.has(`${type}-${port}`)) {
        port++;
    }
    usedPorts.add(`${type}-${port}`);
    return port;
}

// Helper to sanitize environment type names (e.g. 'c++' -> 'cpp')
// function slugifyEnvType(envType) {
//   return envType.replace(/\+/g, 'p').replace(/[^a-z0-9]/gi, '').toLowerCase();
// }

async function provisionEnvironment(environmentType, userId = 'anonymous') {
  // Direct usage of environmentType - no slug
  const baseImageTag = `dev-env-${environmentType}:base`;
  const imageName = baseImageTag;
  const containerName = `${environmentType}-env-${uuidv4().substring(0, 8)}`;

    try {
        // Ensure base image exists (pre-built at startup)
        await docker.getImage(baseImageTag).inspect().catch(() => {
            throw new Error(`Base image ${baseImageTag} not found. Please run the update-bases script.`);
        });
        logger.info(`Using base image ${baseImageTag}`);

        // Assign unique host ports
        const hostSshPort = getAvailablePort(BASE_SSH_PORT, 'ssh');
        const hostIdePort = getAvailablePort(BASE_IDE_PORT, 'ide');

        logger.info(`Creating container ${containerName}...`);
        const container = await docker.createContainer({
            Image: imageName, // use baseImageTag
            name: containerName,
            Tty: true,
            Labels: {
                owner: userId, // Associate container with user
                'traefik.enable': 'true',
                // Route by subdomain: {containerName}.{BASE_DOMAIN}
                [`traefik.http.routers.${containerName}.rule`]: `Host(\`${containerName}.${BASE_DOMAIN}\`)`,
                [`traefik.http.routers.${containerName}.tls`]: 'true',
                [`traefik.http.services.${containerName}.loadbalancer.server.port`]: '8080'
            },
            ExposedPorts: {
                '22/tcp': {},    // SSH
                '8080/tcp': {}   // Web IDE
            },
            HostConfig: {
                PortBindings: {
                    '22/tcp': [{ HostPort: String(hostSshPort) }],
                    '8080/tcp': [{ HostPort: String(hostIdePort) }]
                },
                Binds: [`${containerName}-project:/home/devuser/project`], // Persistent project storage
                // Stricter resource limits from .env
                CpuShares: CPU_SHARES,
                Memory: MEMORY_LIMIT,
            },
            // Add volume for persistence if needed
            // Volumes: { '/home/devuser/project': {} },
            // HostConfig: { Binds: [`my-volume-${containerName}:/home/devuser/project`] }
        });

        await container.start();
        logger.info(`Container ${containerName} started for user ${userId}`, { container: containerName });

        // Track allocated ports for cleanup
        containerPortsMap.set(container.id, { ssh: hostSshPort, ide: hostIdePort });

        logger.info(`Container ${containerName} started successfully.`);

        const containerInfo = await container.inspect();

        return {
            id: container.id,
            name: containerInfo.Name.substring(1), // Remove leading '/'
            image: imageName,
            status: containerInfo.State.Status,
            ports: {
                ssh: hostSshPort,
                ide: hostIdePort
            },
            connectionDetails: {
                ssh: `ssh devuser@localhost -p ${hostSshPort}`,
                ide_url: `http://localhost:${hostIdePort}`
            }
        };
    } catch (error) {
        logger.error('Error provisioning environment:', error);
        // Cleanup: remove image if built, etc.
        throw error;
    }
}

async function terminateEnvironment(containerId, userId = 'anonymous') {
    try {
        const container = docker.getContainer(containerId);
        const info = await container.inspect();
        // User isolation: only allow owner to terminate
        if (info.Config.Labels.owner !== userId) {
            throw new Error('Unauthorized');
        }
         
        await container.stop();
        await container.remove();

        // Release allocated ports
        if (containerPortsMap.has(containerId)) {
            const { ssh, ide } = containerPortsMap.get(containerId);
            usedPorts.delete(`ssh-${ssh}`);
            usedPorts.delete(`ide-${ide}`);
            containerPortsMap.delete(containerId);
        }
        
        logger.info(`Container ${containerId} terminated.`);
        return { id: containerId, message: 'Terminated successfully' };
    } catch (error) {
        logger.error(`Error terminating container ${containerId}: ${error.message}`, { error });
        if (error.message === 'Unauthorized') {
            throw error;
        }
        // Attempt to remove container forcibly if not owned by user
        try {
            await docker.getContainer(containerId).remove({ force: true });
            logger.info(`Container ${containerId} forcibly removed.`);
            return { id: containerId, message: 'Terminated forcibly' };
        } catch (removeError) {
            logger.error(`Error forcibly removing container ${containerId}: ${removeError.message}`, { removeError });
            throw new Error(`Unable to terminate container ${containerId}: ${removeError.message}`);
        }
    }
}

async function listContainers(userId = 'anonymous') {
    const containers = await docker.listContainers({ all: true });
    return containers
        .filter(c => c.Labels && c.Labels.owner === userId)
        .map(c => {
            const name = c.Names[0].substring(1);
            const sshBinding = c.Ports.find(p => p.PrivatePort === 22);
            const ideBinding = c.Ports.find(p => p.PrivatePort === 8080);
            const hostSsh = sshBinding ? sshBinding.PublicPort : null;
            const hostIde = ideBinding ? ideBinding.PublicPort : null;
            return {
                id: c.Id,
                name,
                image: c.Image,
                status: c.State,
                ports: {
                    ssh: hostSsh,
                    ide: hostIde
                },
                connectionDetails: {
                    ssh: `ssh devuser@localhost -p ${hostSsh}`,
                    ide_url: `http://localhost:${hostIde}`
                }
            };
        });
}

async function getContainerInfo(containerId) {
    try {
        const container = docker.getContainer(containerId);
        const info = await container.inspect();
        return {
            id: info.Id,
            name: info.Name.substring(1),
            image: info.Image,
            status: info.State.Status,
            ports: info.NetworkSettings.Ports,
            created: info.Created,
            labels: info.Config.Labels
        };
    } catch (error) {
        logger.error(`Error fetching info for container ${containerId}: ${error.message}`, { error });
        throw error;
    }
}

// Ensure base images exist for all environment types
async function ensureBaseImages() {
    const dockerfilesDir = path.join(__dirname, '..', 'dockerfiles');
    const dirs = fs.readdirSync(dockerfilesDir, { withFileTypes: true })
        .filter(d => d.isDirectory())
        .map(d => d.name);

    for (const envType of dirs) {
        const baseTag = `dev-env-${envType}:base`;
        try {
            await docker.getImage(baseTag).inspect();
            logger.info(`Base image ${baseTag} already exists`);
        } catch {
            logger.info(`Building missing base image ${baseTag}`);
            const contextPath = path.join(dockerfilesDir, envType);
            const files = fs.readdirSync(contextPath);
            const stream = await docker.buildImage({ context: contextPath, src: files }, { t: baseTag });
            await new Promise((resolve, reject) => {
                docker.modem.followProgress(stream, (err, res) => err ? reject(err) : resolve(res));
            });
            logger.info(`Built base image ${baseTag}`);
        }
    }
}

/**
 * Configure automatic cleanup based on resource thresholds
 * @param {Object} options Cleanup options
 * @param {number} options.diskThresholdPercent Disk usage threshold to trigger cleanup (e.g., 80 for 80%)
 * @param {number} options.imageAgeHours Remove non-base images older than this many hours
 * @param {number} options.containerExitedHours Remove containers that exited more than this many hours ago
 * @returns {Function} Stop function to disable auto cleanup
 */
function configureAutoCleanup({ diskThresholdPercent = 80, imageAgeHours = 24, containerExitedHours = 48 } = {}) {
    logger.info(`Configuring auto-cleanup: disk threshold ${diskThresholdPercent}%, image age ${imageAgeHours}h, container age ${containerExitedHours}h`);
    
    // Check if disk usage exceeds threshold
    async function checkDiskUsage() {
        try {
            // Get Docker system information including disk usage
            const info = await docker.df();
            
            if (!info.LayersSize || !info.TotalSize) {
                return false;
            }
            
            const usedPercent = (info.LayersSize / info.TotalSize) * 100;
            return usedPercent >= diskThresholdPercent;
        } catch (error) {
            logger.error('Error checking disk usage:', error.message);
            return false;
        }
    }
    
    // Perform targeted cleanup based on age
    async function performAutoCleanup() {
        try {
            logger.info('Starting auto-cleanup...');
            
            // Check if we need to clean up
            const diskNeedsCleanup = await checkDiskUsage();
            if (!diskNeedsCleanup) {
                logger.info('Disk usage below threshold, skipping auto-cleanup');
                return;
            }
            
            // Clean up exited containers based on age
            const containers = await docker.listContainers({ all: true, filters: { status: ['exited'] } });
            const now = new Date();
            
            for (const container of containers) {
                try {
                    const containerInfo = await docker.getContainer(container.Id).inspect();
                    const exitedAt = new Date(containerInfo.State.FinishedAt);
                    const hoursExited = (now - exitedAt) / (1000 * 60 * 60);
                    
                    if (hoursExited >= containerExitedHours) {
                        logger.info(`Auto-removing container ${container.Id.substring(0, 12)} - exited ${Math.floor(hoursExited)}h ago`);
                        await docker.getContainer(container.Id).remove();
                    }
                } catch (err) {
                    logger.error(`Error processing container ${container.Id}:`, err.message);
                }
            }
            
            // Clean up non-base images based on age
            await cleanupNonBaseImages({ olderThanHours: imageAgeHours });
            
            // Clean up any dangling images
            await docker.pruneImages();
            
            logger.info('Auto-cleanup completed');
        } catch (error) {
            logger.error('Error during auto-cleanup:', error.message);
        }
    }
    
    // Set up periodic check
    const intervalMinutes = 30;
    const interval = setInterval(performAutoCleanup, intervalMinutes * 60 * 1000);
    logger.info(`Auto-cleanup will run every ${intervalMinutes} minutes`);
    
    // Return function to stop auto cleanup
    return () => {
        clearInterval(interval);
        logger.info('Auto-cleanup disabled');
    };
}

// Update the cleanupNonBaseImages function to accept age parameter
async function cleanupNonBaseImages({ olderThanHours } = {}) {
    try {
        // Get all images
        const images = await docker.listImages();
        
        // Filter for non-base images related to our environments
        const nonBaseImagesToRemove = images.filter(image => {
            // Skip images with no tags
            if (!image.RepoTags || image.RepoTags.length === 0 || image.RepoTags[0] === '<none>:<none>') {
                return false;
            }
            
            // Find environment images that aren't base images
            const isNonBase = image.RepoTags.some(tag => {
                return tag.startsWith('dev-env-') && !tag.endsWith(':base');
            });
            
            // Apply age filter if specified
            if (isNonBase && olderThanHours) {
                const createdDate = new Date(image.Created * 1000);
                const ageHours = (Date.now() - createdDate.getTime()) / (1000 * 60 * 60);
                return ageHours >= olderThanHours;
            }
            
            return isNonBase;
        });
        
        // Remove the filtered images
        const removedImages = [];
        for (const image of nonBaseImagesToRemove) {
            try {
                logger.info(`Removing image ${image.Id} with tags ${image.RepoTags.join(', ')}`);
                await docker.getImage(image.Id).remove();
                removedImages.push(image.RepoTags);
            } catch (error) {
                logger.error(`Failed to remove image ${image.Id}: ${error.message}`);
                // Image might be in use by a container
            }
        }
        
        return {
            removed: removedImages,
            count: removedImages.length
        };
    } catch (error) {
        logger.error(`Error cleaning up non-base images: ${error.message}`, { error });
        throw error;
    }
}

// Export functions for external use
module.exports = {
    provisionEnvironment,
    terminateEnvironment,
    listContainers,
    getContainerInfo,
    ensureBaseImages,
    cleanupNonBaseImages,
    configureAutoCleanup
};
