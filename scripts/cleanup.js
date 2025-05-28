#!/usr/bin/env node
/**
 * Comprehensive cleanup script for Docker containers and images
 * Usage: node scripts/cleanup.js [options]
 * 
 * Options:
 *   --containers  Clean only containers
 *   --images      Clean only images (dangling + non-base)
 *   --dangling    Clean only dangling images
 *   --non-base    Clean only non-base images
 *   --all         Clean everything (default)
 *   --dry-run     Show what would be deleted without actually deleting
 */

const Docker = require('dockerode');
const docker = new Docker();
const dockerService = require('../src/services/dockerService');
const logger = require('../src/utils/logger');

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  containers: args.includes('--containers') || args.includes('--all') || args.length === 0,
  dangling: args.includes('--dangling') || args.includes('--images') || args.includes('--all') || args.length === 0,
  nonBase: args.includes('--non-base') || args.includes('--images') || args.includes('--all') || args.length === 0,
  dryRun: args.includes('--dry-run')
};

// Show help if requested
if (args.includes('--help') || args.includes('-h')) {
  console.log(`
  Cloud Development Environment Cleanup Utility
  
  Usage: node scripts/cleanup.js [options]
  
  Options:
    --containers  Clean only containers
    --images      Clean only images (dangling + non-base)
    --dangling    Clean only dangling images
    --non-base    Clean only non-base images
    --all         Clean everything (default)
    --dry-run     Show what would be deleted without actually deleting
    --help, -h    Show this help message
  `);
  process.exit(0);
}

async function cleanup() {
  try {
    if (options.dryRun) {
      logger.info('DRY RUN MODE: No actual deletions will be performed');
    }
    
    // 1. Prune stopped containers
    if (options.containers) {
      logger.info('Pruning stopped containers...');
      
      if (options.dryRun) {
        const containers = await docker.listContainers({ all: true, filters: { status: ['exited'] } });
        logger.info(`Would remove ${containers.length} stopped containers`);
        for (const container of containers) {
          logger.info(`- ${container.Id.substring(0, 12)} (${container.Names.join(', ')})`);
        }
      } else {
        const containersResult = await docker.pruneContainers();
        const removedCount = containersResult.ContainersDeleted ? containersResult.ContainersDeleted.length : 0;
        logger.info(`Removed ${removedCount} containers`);
        if (containersResult.ContainersDeleted && containersResult.ContainersDeleted.length > 0) {
          logger.info('Containers removed:', containersResult.ContainersDeleted);
        }
      }
    }
    
    // 2. Prune dangling images
    if (options.dangling) {
      logger.info('Pruning dangling images...');
      
      if (options.dryRun) {
        const images = await docker.listImages({ filters: { dangling: ['true'] } });
        logger.info(`Would remove ${images.length} dangling images`);
        for (const image of images) {
          logger.info(`- ${image.Id.substring(0, 12)}`);
        }
      } else {
        const imagesResult = await docker.pruneImages();
        const removedCount = imagesResult.ImagesDeleted ? imagesResult.ImagesDeleted.length : 0;
        logger.info(`Removed ${removedCount} dangling images`);
        if (imagesResult.ImagesDeleted && imagesResult.ImagesDeleted.length > 0) {
          logger.info('Images removed:', imagesResult.ImagesDeleted);
        }
      }
    }
    
    // 3. Remove non-base environment images
    if (options.nonBase) {
      logger.info('Cleaning up non-base environment images...');
      
      if (options.dryRun) {
        // Get images that would be removed by our cleanup function
        const images = await docker.listImages();
        const nonBaseImages = images.filter(image => {
          if (!image.RepoTags || image.RepoTags.length === 0 || image.RepoTags[0] === '<none>:<none>') {
            return false;
          }
          return image.RepoTags.some(tag => tag.startsWith('dev-env-') && !tag.endsWith(':base'));
        });
        
        logger.info(`Would remove ${nonBaseImages.length} non-base environment images`);
        for (const image of nonBaseImages) {
          logger.info(`- ${image.Id.substring(0, 12)}: ${image.RepoTags.join(', ')}`);
        }
      } else {
        const result = await dockerService.cleanupNonBaseImages();
        logger.info(`Successfully removed ${result.count} non-base environment images`);
        if (result.removed.length > 0) {
          logger.info('Removed images:', result.removed);
        }
      }
    }
    
    // Show a summary of what was done
    if (!options.dryRun) {
      try {
        const info = await docker.info();
        logger.info(`Cleanup completed successfully. Current Docker status:`);
        logger.info(`- Containers: ${info.Containers} total, ${info.ContainersRunning} running, ${info.ContainersStopped} stopped`);
        logger.info(`- Images: ${info.Images}`);
      } catch (infoError) {
        logger.warn('Could not retrieve Docker system information:', infoError.message);
      }
    } else {
      logger.info('Dry run completed. No changes were made.');
    }
  } catch (error) {
    logger.error('Failed during cleanup operation:', error);
    process.exit(1);
  }
}

// Function to format disk space in a readable format
function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(decimals)) + ' ' + sizes[i];
}

cleanup().catch(err => {
  logger.error('Unhandled error during cleanup:', err);
  process.exit(1);
});
