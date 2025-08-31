# Base image with Python and venv already set up
FROM ct-radius-base

# Create freerad user with GID 998
RUN groupadd -g 998 freeradSync && \
    useradd -u 998 -g freeradSync -s /bin/bash -m freeradSync

# Ensure freerad can access the working directory
RUN chown -R root:freeradSync /ct-radius

# Switch to freerad user
USER freeradSync

# Set working directory (optional, already set in base)
WORKDIR /ct-radius

# Set default entrypoint to use the virtualenv
ENV PATH="/ct-radius/venv/bin:$PATH"

# Run syncPwds.py using the virtual environment
CMD ["python3", "synchronize.py", "--config", "/ct-radius/config.yaml", "--env", "/ct-radius/var.env", "--log", "/ct-radius/synchronize.log", "--interval", "15"]