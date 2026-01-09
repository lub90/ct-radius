# Use Ubuntu 24.04 LTS explicitly
FROM ubuntu:24.04

# Set non-interactive mode for apt
ARG DEBIAN_FRONTEND=noninteractive

# Install node js
RUN apt-get update && apt-get install -y \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*


# Add node source repo
RUN curl -fsSL https://deb.nodesource.com/setup_24.x | bash -

# Install node js
RUN apt-get install -y nodejs