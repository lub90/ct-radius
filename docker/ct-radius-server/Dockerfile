# ============================
# 1) Build stage
# ============================

FROM ct-radius-base AS build

WORKDIR /app

# Copy package files
COPY ./typescript/package*.json ./

# Install ALL dependencies (including dev)
RUN npm ci

# Copy source
COPY ./typescript/tsconfig.json ./
COPY ./typescript/src ./src

# Build TypeScript → dist/
RUN npm run build


# ============================
# 2) Runtime stage
# ============================
FROM ct-radius-base AS runtime



# Create app directory
WORKDIR /ct-radius

# Copy package files
COPY ./typescript/package*.json ./

# Install ONLY production dependencies
RUN npm ci --omit=dev

# Copy compiled output
COPY --from=build /app/dist ./dist



# Add a freerad user with a fixed id
RUN groupadd -g 998 freerad && \
    useradd -u 998 -g freerad -s /bin/bash -m freerad


# Install freeradius in version 3.0 or above
# We tested it with version 3.2.5, yet it should hopefully work with every running version...
RUN apt-get update && apt-get install -y freeradius \
    && rm -rf /var/lib/apt/lists/*


# Copy the config files to freeradius
# The default settings of freeradius
COPY ./freeradius-configs/default /etc/freeradius/3.0/sites-enabled/default
# Copy over the custom attributes
COPY ./freeradius-configs/dictionary /etc/freeradius/3.0/dictionary
# Override the eap file which contains the password to the certificates
COPY ./freeradius-configs/eap /etc/freeradius/3.0/mods-enabled/eap
# Copy the inner tunnel settings, where the node js script is invoked
COPY ./freeradius-configs/inner-tunnel /etc/freeradius/3.0/sites-available/inner-tunnel
# Remove the allowed clients, we mount the clients file in the compose file
RUN rm /etc/freeradius/3.0/clients.conf

# Setup the certificates and all that stuff
# Firstly, delete everything in the certificate directory
RUN rm -r -f /etc/freeradius/3.0/certs/*
# No need to copy the new certificates over, we mount them in the compose file

# Make sure the whole folder is owned by freerad so that it can access everything
RUN chown -R freerad:freerad /ct-radius

# Start freeradius
WORKDIR /
# Forward freeradius output to /ct-radius/radius.log
CMD ["freeradius", "-f"]


