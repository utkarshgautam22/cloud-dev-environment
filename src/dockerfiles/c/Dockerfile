# Base C development image with GCC
FROM gcc:latest

# Install sudo, SSH server and common tools
RUN apt-get update && apt-get install -y --no-install-recommends \
    sudo \
    openssh-server \
    curl \
    git \
    procps \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user 'devuser' with sudo privileges
RUN useradd -ms /bin/bash devuser && \
    echo "devuser:password" | chpasswd && \
    adduser devuser sudo && \
    echo "devuser ALL=(ALL) NOPASSWD: ALL" >> /etc/sudoers

# Configure SSH
RUN mkdir /var/run/sshd && \
    sed -i 's/#UsePAM yes/UsePAM no/g' /etc/ssh/sshd_config && \
    sed -i 's/#PermitRootLogin prohibit-password/PermitRootLogin yes/g' /etc/ssh/sshd_config

# Install code-server
ARG CODE_SERVER_VERSION=4.91.1
RUN apt-get update && apt-get install -y ca-certificates && \
    curl -fsSL https://github.com/coder/code-server/releases/download/v${CODE_SERVER_VERSION}/code-server_${CODE_SERVER_VERSION}_amd64.deb -o code-server.deb && \
    dpkg -i code-server.deb && \
    rm code-server.deb

# Copy the entrypoint script and make it executable
COPY entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh && \
    mkdir -p /home/devuser/project && \
    chown -R devuser:devuser /home/devuser && \
    chmod -R 775 /home/devuser/project

# Expose SSH port and code-server port
EXPOSE 22 8080

# We'll start as root to fix permissions in entrypoint but run code-server as devuser
WORKDIR /home/devuser/project

# Use exec form for CMD to run the entrypoint script
CMD ["/usr/local/bin/entrypoint.sh"]