#!/bin/sh
#
# This script starts the SSH daemon and then executes code-server.
# Using /bin/sh for broader compatibility (alpine uses sh, not bash by default).

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

# Start the SSH server in the background
service ssh start

# Execute code-server in the foreground.
# The 'exec' command replaces the current shell process with code-server,
# allowing code-server to receive signals directly if this script is PID 1.
echo "Starting code-server..."
cd /home/devuser/project
exec sudo -u devuser code-server --bind-addr 0.0.0.0:8080 --auth none .
