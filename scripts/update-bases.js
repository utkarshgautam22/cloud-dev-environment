#!/usr/bin/env node
const Docker = require('dockerode');
const path = require('path');
const fs = require('fs');
const docker = new Docker();

async function updateBaseImage(envDir) {
  const baseTag = `dev-env-${envDir}:base`;
  const contextPath = path.join(__dirname, '..', 'src', 'dockerfiles', envDir);
  console.log(`Rebuilding base image ${baseTag} from ${contextPath}...`);
  const files = fs.readdirSync(contextPath);
  const stream = await docker.buildImage({ context: contextPath, src: files }, { t: baseTag });
  await new Promise((resolve, reject) => {
    docker.modem.followProgress(stream, (err, res) => err ? reject(err) : resolve(res));
  });
  console.log(`Successfully rebuilt ${baseTag}`);
}

async function main() {
  const dockerfilesDir = path.join(__dirname, '..', 'src', 'dockerfiles');
  const entries = fs.readdirSync(dockerfilesDir, { withFileTypes: true });
  const envDirs = entries.filter(e => e.isDirectory()).map(e => e.name);
  for (const env of envDirs) {
    await updateBaseImage(env);
  }
}

main().catch(err => {
  console.error('Failed to update base images:', err);
  process.exit(1);
});
