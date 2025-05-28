#!/bin/sh
# This script starts the SSH daemon and then executes code-server.
# Using /bin/sh for broader compatibility.

# Create and set correct permissions for project directory
mkdir -p /home/devuser/project
chown -R devuser:devuser /home/devuser/project
chmod -R 775 /home/devuser/project

# Fix volume permissions issue
if [ -d "/home/devuser/project" ]; then
  # Allow devuser to modify files in the project directory
  find /home/devuser/project -type d -exec chmod 775 {} \;
  find /home/devuser/project -type f -exec chmod 664 {} \;
  chown -R devuser:devuser /home/devuser/project
fi

# Start SSH server
service ssh start

# Start code-server
echo "Starting code-server..."
cd /home/devuser/project
exec sudo -u devuser code-server --bind-addr 0.0.0.0:8080 --auth none .
