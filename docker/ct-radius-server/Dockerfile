FROM ct-radius-base

# Add a freerad user with a fixed id
RUN groupadd -g 998 freerad && \
    useradd -u 998 -g freerad -s /bin/bash -m freerad


# Install freeradius in version 3.0 or above
# We tested it with version 3.2.5, yet it should hopefully work with every running version...
RUN apt-get update && apt-get -y install freeradius curl

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

# Start freeradius
WORKDIR /
# Forward freeradius output to /ctradius/freeradius.log
CMD ["freeradius", "-f"]


