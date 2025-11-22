# Radius Server Certificate Generation

This guide explains how to create a custom Certificate Authority (CA) and a server certificate for Ct-Radius using FreeRADIUS. Please note that certificates are security-critical components. The following instructions offer general guidance but should always be adapted to your specific environment, requirements, and authentication mechanisms.

## 🛠️ Prerequisites

- FreeRADIUS is installed (e.g., under `/etc/freeradius/3.0/`)
- OpenSSL is available
- You have root privileges or use `sudo`

## 📁 Step 1: Adjust Configuration Files

FreeRADIUS provides sample configuration files for the certificates that you can customize:

Edit the following files located in `/etc/freeradius/3.0/certs/`:

- `ca.cnf` – for the Certificate Authority
- `server.cnf` – for the server certificate

In these `ca.cnf` file, enter your organization details, location, email, etc. Example:

```Ini
[certificate_authority]
countryName = DE
stateOrProvinceName = Baden-Württemberg
localityName = Karlsruhe
organizationName = "My Church"
emailAddress = admin@my-church.de
commonName = "MyCtRadius CA"
```

If you intend to provide a Certificate Revocation List (CRL) for your CA, make sure to set the appropriate URL under `crlDistributionPoints`. For more information on CRLs and their purpose, see for example: [Wikipedia: Certificate Revocation List](https://en.wikipedia.org/wiki/Certificate_revocation_list).

In the `server.cnf` file, enter your servers details:

```Ini
[server]
countryName             = DE
stateOrProvinceName     = Radius
localityName            = Baden-Württemberg
organizationName        = Karlsruhe
emailAddress            = admin@my-church.de
commonName              = "MyCtRadius Server Certificate"
```

You can adjust the validity period of certificates issued using the `default_days` variable in both files. Similarly, use `default_crl_days` to define the validity of the CRL.

Additionally, it is strongly advised to protect your private keys for your ca and your certificate with a password. To do this, please set the `input_password` and `output_password` variables in both `.cnf` files according to the preferred password. Please use different passwords for the ca and the server certificate.

## 🔐 Step 2: Generate Certificates

Navigate to the certificate directory:

```
cd /etc/freeradius/3.0/certs
```

Then run the following commands:

```
make clean
make ca.pem
make server.pem
```

These commands will four files:

- `ca.pem` – your CA certificate, necessary for your RADIUS setup
- `server.pem` and `server.key` – your server certificate and private key, both necessary for your RADIUS setup
- `ca.key` – your CA's private key. Make sure to protect this file as best as you can. Somebody who might gain access to it, can issue new certificates in the name of your CA. This file should not be incorporated into your FreeRADIUS server at all!

PAdditionally, please be aware that if you have protected the private `server.key` file with a password (see Step 1, last paragraph), you need to provide this password within the `.env` file for your setup within the variable name `CT_RADIUS_PRIVATE_SERVER_KEY_PWD`. If you decided not to do this, be advised to restrict the access to your `server.key` file, e.g. through `chmod 600`.

Additionally, a `ca.key` file will be produced. M

## 📦 Step 3: Integrate Certificates into FreeRADIUS

If you're using a Docker container, ensure that `server.key`, `server.pem`, and `ca.pem` are properly mounted into the container according to your Docker Compose setup (see main insturction page).

If you're running FreeRADIUS with the Ct-Radius configuration outside of Docker, specify the certificate paths in the `/etc/freeradius/3.0/mods-enabled/eap` file:

```
tls-config tls-common {
  private_key_file = ${certdir}/server.key
  certificate_file = ${certdir}/server.pem
  ca_file = ${certdir}/ca.pem
}
```


Finally, make sure that the docker container or the freeradius user can access the three files:

```bash
chown freerad:freerad /etc/freeradius/3.0/certs/server.pem
chmod 600 /etc/freeradius/3.0/certs/server.pem
```
