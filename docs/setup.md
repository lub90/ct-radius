# Setup of ct-radius

## Prerequisites

- 📡 **Network hardware with WPA Enterprise support**  
  Your access points and switches must support WPA Enterprise authentication. Please consult the manuals from your hardware vendor to confirm compatibility.

- 🔐 **ChurchTools ct-pass-store extension**  
  ct-radius relies on the [ct-pass-store extension](https://github.com/lub90/ct-pass-store) for managing secondary passwords. If you are not already using it, install this extension in your ChurchTools instance. Further information and installation instructions can be found in the [ct-pass-store README](https://github.com/lub90/ct-pass-store/blob/main/README.md).

- 🐳 **Server to run the Docker container**  
  You need a machine to host the ct-radius Docker container. We strongly recommend running it on a local server within your network for in-house deployment. Resource requirements are minimal—small home servers (e.g., Raspberry Pi) have proven sufficient in our experience. The project is security-wise not designed to run on a pulblicly available domain.

- ⚠️ **Knowledge of network and server administration**  
  A solid understanding of network administration is strongly advised, as misconfiguration can lead to serious IT security issues. Familiarity with server management and Docker administration is also recommended.



## Create API user in ChurchTools

ct-radius needs to access the [ct-pass-store extension](https://github.com/lub90/ct-pass-store) in ChurchTools. For this, you must create a valid ChurchTools user with read access rights.

Create a new ChurchTools user (the name is only for identification and will not be displayed to others). The new user must have the following rights:
- See all persons and their usernames  
- See all groups and their members  

Note the user ID of the newly created account and add it as a `Read Access User` in the [ct-pass-store extension](https://github.com/lub90/ct-pass-store)'s settings panel.



## Download the latest release

The project is already set up so that configuration can be done on a file basis. To get started, you must first clone or download the entire repository of ct-radius ([https://github.com/lub90/ct-radius](https://github.com/lub90/ct-radius)) to your host machine. The latest stable version is available on the **main** branch.

To clone the repository, run:

```bash
git clone https://github.com/lub90/ct-radius.git
cd ct-radius
```

Alternatively, you can download the main branch as a ZIP file directly from GitHub. Simply click on the green **Code** button in the repository, select **Download ZIP**, and then extract the archive to your desired location. This provides the same files as cloning, without requiring Git.



## Building the docker container

Enter the `./setup` directory in the downloaded/cloned ct-radius repository. Run the following script to build the Docker container:

```bash
cd setup
./build-docker.sh
```



## Generate the files

Create a new folder on your host machine for your Docker container's files. This folder will hold all certificates, configuration files, and log files for ct-radius.

After creating the folder, run the following script to generate the necessary files. It will ask you for the location of your folder:

```bash
./generate-necessary-files.sh
> 📂 Enter the path where you want to generate the files: _
```



## Add the server certificates

ct-radius requires three server certificate files: `server.key`, `server.pem`, and `ca.pem`.

If you do not already have certificates for your current WiFi setup, you need to create them. Follow the instructions in [here](./docs/certificates.md) to generate these files. Once generated, copy them into the folder you prepared for your Docker container.



## Copy over the decryption file from your ct-pass-store extension

Your [ct-pass-store extension](https://github.com/lub90/ct-pass-store) provides a private key used to encrypt secondary passwords in the ChurchTools database. ct-radius requires this file to obtain cleartext passwords for the MSCHAPv2 challenge-response process.

Copy the private key file that you obtained during your [ct-pass-store extension](https://github.com/lub90/ct-pass-store) installation into the folder you created for your Docker container and rename it to `decryption.pem`.

## Configure ct-radius

ct-radius is mainly configured through the `config.yaml` file that you will find inside your container’s folder. This file defines how authentication and VLAN assignment are handled.

A default `config.yaml` looks like this:

```yaml
basic:
  wifi_access_groups: [194]
  include_assignment_groups_in_access_groups: True
  vlan_separator: "#"
  timeout: 5
  path_to_private_decryption_key: /ct-radius/decryption.pem
  username_field_name: cmsUserId

vlans:
  default_vlan: 30
  assignments:
    71: 20
    132: 20
  assignments_if_requested:
    231: 110
    77: 120
```

---

### Explanation of each variable

#### `basic` section
- **wifi_access_groups**: A list of ChurchTools group IDs whose members are allowed to access the WiFi/LAN. Only users in these groups can authenticate successfully.
- **include_assignment_groups_in_access_groups**: If set to `True`, groups that are used for VLAN assignment are automatically included in the access groups, even if not explicitly listed in `wifi_access_groups`. This ensures that anyone assigned to a VLAN group also has WiFi access. Set to `False` if you do not want to have this behavior.
- **vlan_separator**: The character used in usernames to request a specific VLAN. For example, `username#110` would request VLAN 110.
- **timeout**: The maximum time (in seconds) ct-radius will wait for a response from the ChurchTools server and the [ct-pass-store extension](https://github.com/lub90/ct-pass-store) before failing the authentication attempt.
- **path_to_private_decryption_key**: Path inside the container to the private key file (`decryption.pem`) used to decrypt secondary passwords from the ct-pass-store extension. No need to change normally.
- **username_field_name**: The field in the ChurchTools person database that stores the username. Typically `cmsUserId`, but can be changed if your ChurchTools instance uses a different field.

#### `vlans` section
- **default_vlan**: The VLAN ID assigned to users who do not match any specific group assignment. This acts as the fallback VLAN.
- **assignments**: A dictionary mapping ChurchTools group IDs to VLANs. If a user belongs to one of these groups, they are automatically placed into the corresponding VLAN. Priority is determined by order: the first matching group takes precedence, and subsequent assignments are ignored.
- **assignments_if_requested**: A dictionary mapping ChurchTools group IDs to VLANs that users can join only if they explicitly request it (by appending `#VLAN_ID` to their username). Priority is again determined by order. This allows flexible, on-demand VLAN switching for users with special roles.

Setup the config.yaml according to your needs.

## Configure your RADIUS clients

Add your WiFi access points and/or controller devices to the `clients.conf` file inside your Docker container's folder. Each access point or network controller must be defined with its IP address and an individual shared secret:

```bash
client nameOfClient {
    ipaddr = 172.17.0.1
    secret = testing123
}
```

You can also define IP address ranges. For further details, see the [FreeRADIUS clients.conf documentation](https://www.freeradius.org/documentation/freeradius-server/4.0~alpha1/raddb/clients.conf.html). 



## Add credentials

Credentials are stored in environment variables of your Docker container. These variables are defined in the `var.env` file inside your container’s folder.

Open the `var.env` file and insert the following:

```bash
CT_RADIUS_PRIVATE_SERVER_KEY_PWD="ABCDEFG"
CT_SERVER_URL="https://your.church.tools"
CT_API_USER="mmustermann"
CT_API_USER_PWD="test1234"
CT_PRIVATE_DECRYPTION_KEY_PWD="1234567"
```

Explanation of each variable:
- **CT_RADIUS_PRIVATE_SERVER_KEY_PWD** → Password protecting your server’s certificate file (`server.pem`).  
- **CT_SERVER_URL** → URL of your ChurchTools instance.  
- **CT_API_USER / CT_API_USER_PWD** → Credentials of the ChurchTools API user you created for read access.  
- **CT_PRIVATE_DECRYPTION_KEY_PWD** → Password for the `decryption.pem` file from ct-pass-store, used to decrypt secondary passwords.



## Update file access rights

ct-radius will access your files (certificates, configs, logs) from within its Docker container. To prevent security issues while still enabling access for the Docker user, run `set-permissions.sh` from inside the `./setup` directory. This script will configure the file permissions correctly.



## Start your Docker container

Inside your container's folder you will find a `docker-compose.yml` file. Navigate into the folder and start the container:

```bash
docker compose up -d
```

Adjust the network settings or other settings for your container if necessary to fit your environment. Yet, the given configuration should already work.




## Integrate the radius server with your network

Integration of ct-radius into your existing infrastructure depends on the hardware vendor and the management interface of your access points or switches. In general, you will configure your devices to use the ct-radius Docker container as their RADIUS authentication server, providing the IP address of the host machine running ct-radius and the shared secret defined in your configuration.

- 📡 **Ubiquiti hardware**  
  For Ubiquiti UniFi or related devices, you can follow the [official Ubiquiti tutorial](https://help.ui.com/hc/en-us/articles/360015268353-Configuring-a-RADIUS-Server-in-UniFi) on setting up WPA Enterprise with RADIUS.

*More hardware vendors will be added in the near future as soon as we have verified, working tutorials...*