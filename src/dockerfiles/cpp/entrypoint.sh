#!/bin/sh
# This script starts the SSH daemon and then executes code-server.
# Using /bin/sh for broader compatibility.

# Start SSH server
service ssh start

# Start code-server
echo "Starting code-server..."
exec code-server --bind-addr 0.0.0.0:8080 --auth none .
