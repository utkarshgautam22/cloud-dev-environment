// src/server.js
require('dotenv').config(); // Load environment variables from .env file
const app = require('./app');
const dockerService = require('./services/dockerService');
const logger = require('./utils/logger');

const PORT = process.env.PORT || 3000;

// Configure auto-cleanup based on environment variables
const ENABLE_AUTO_CLEANUP = process.env.ENABLE_AUTO_CLEANUP === 'true';
const DISK_THRESHOLD = parseInt(process.env.CLEANUP_DISK_THRESHOLD || 80, 10);
const IMAGE_AGE_HOURS = parseInt(process.env.CLEANUP_IMAGE_AGE_HOURS || 24, 10);
const CONTAINER_AGE_HOURS = parseInt(process.env.CLEANUP_CONTAINER_AGE_HOURS || 48, 10);

let stopAutoCleanup = null;

// Pre-build base images for all environments
dockerService.ensureBaseImages()
  .then(() => {
    // Start the server
    app.listen(PORT, () => {
      logger.info(`Server is running on port ${PORT}`);
      logger.info('Ensure Docker daemon is running and accessible.');
      
      // Configure auto-cleanup if enabled
      if (ENABLE_AUTO_CLEANUP) {
        stopAutoCleanup = dockerService.configureAutoCleanup({
          diskThresholdPercent: DISK_THRESHOLD,
          imageAgeHours: IMAGE_AGE_HOURS,
          containerExitedHours: CONTAINER_AGE_HOURS
        });
        
        logger.info(`Auto-cleanup enabled (disk: ${DISK_THRESHOLD}%, image age: ${IMAGE_AGE_HOURS}h, container age: ${CONTAINER_AGE_HOURS}h)`);
      } else {
        logger.info('Auto-cleanup disabled. Set ENABLE_AUTO_CLEANUP=true to enable.');
      }
    });
    
    // Handle graceful shutdown
    process.on('SIGTERM', gracefulShutdown);
    process.on('SIGINT', gracefulShutdown);
  })
  .catch(err => {
    logger.error('Failed to pre-build base images:', err);
    process.exit(1);
  });
  
// Graceful shutdown function
function gracefulShutdown() {
  logger.info('Received shutdown signal, closing server...');
  
  if (stopAutoCleanup) {
    stopAutoCleanup();
  }
  
  // Additional cleanup could be added here
  
  process.exit(0);
}
