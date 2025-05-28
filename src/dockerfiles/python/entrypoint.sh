#!/bin/sh
#
# This script starts the SSH daemon and then executes code-server.
# Using /bin/sh for broader compatibility (alpine uses sh, not bash by default).

# Start the SSH server in the background
service ssh start

# Execute code-server in the foreground.
# The 'exec' command replaces the current shell process with code-server,
# allowing code-server to receive signals directly if this script is PID 1.
echo "Starting code-server..."
exec code-server --bind-addr 0.0.0.0:8080 --auth none .
