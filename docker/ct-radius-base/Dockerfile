# Use Ubuntu 24.04 LTS explicitly
FROM ubuntu:24.04

# Set non-interactive mode for apt
ARG DEBIAN_FRONTEND=noninteractive

# Install Python and required tools
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    python3-venv \
    libgdbm-dev \
    python3-gdbm \
    && rm -rf /var/lib/apt/lists/*

# Create working directory
WORKDIR /ct-radius

# Copy Python source code and requirements
COPY ./python/ /ct-radius/

# Create and activate virtual environment + install dependencies
RUN python3 -m venv venv \
    && . venv/bin/activate \
    && pip install --upgrade pip \
    && pip install -r requirements.txt

# Set default entrypoint to use the virtualenv
ENV PATH="/ct-radius/venv/bin:$PATH"
