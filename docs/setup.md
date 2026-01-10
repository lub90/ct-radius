# Setup of ct-radius

## Prerequisites

- 📡 **Network hardware with WPA Enterprise support**  
  Your access points and switches must support WPA Enterprise authentication. Please consult the manuals from your hardware vendor to confirm compatibility.

- 🔐 **ChurchTools ct-pass-store extension**  
  ct-radius relies on the [ct-pass-store extension](https://github.com/lub90/ct-pass-store) for managing secondary passwords. If you are not already using it, install this extension in your ChurchTools instance. Further information and installation instructions can be found in the [ct-pass-store README](https://github.com/lub90/ct-pass-store/blob/main/README.md).

- 🐳 **Server to run the Docker container**  
  You need a machine to host the ct-radius Docker container. We strongly recommend running it on a local server within your network for in-house deployment. Resource requirements are minimal — small home servers (e.g., Raspberry Pi) have proven sufficient in our experience. The project is security-wise not designed to run on a publicly available domain.

- ⚠️ **Knowledge of network and server administration**  
  A solid understanding of network administration is strongly advised, as misconfiguration can lead to serious IT security issues. Familiarity with server management and Docker administration is also recommended.



## Create API user in ChurchTools

ct-radius needs to access the [ct-pass-store extension](https://github.com/lub90/ct-pass-store) in ChurchTools. For this, you must create a valid ChurchTools user with read access rights.

Create a new ChurchTools user (the name is only for identification and will not be displayed to others). The new user must have the following rights:
- See all persons and their usernames  
- See all groups and their members  

Add this user as a `Read Access User` in the [ct-pass-store extension](https://github.com/lub90/ct-pass-store)'s settings panel.



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

ct-radius is primarily configured through the `config.json` file located inside your container’s directory. This file defines how authentication, authorization, and VLAN assignment are handled. Adjust the configuration according to your environment and requirements.

A default `config.json` looks like this:

```json
{
  "allowRequestedVlan": true,
  "vlanSeparator": "#",
  "modules": [
    "ct-groups"
  ],
  // Module configuration starts here
  "ct-groups": {
    ...
  }
}
```

### Basic ct-radius section

As shown above, the core ct-radius configuration only requires a few essential settings:

- **allowRequestedVlan**: Enables users to request a specific VLAN by appending it to their username.
- **vlanSeparator**: Defines the character used to separate the username from the requested VLAN. For example, `username#110` requests VLAN `110` for user `username`. This setting is only relevant when `allowRequestedVlan` is `true`.
- **modules**: A list of active modules. Each module is responsible for validating a username, optionally assigning a VLAN ID, and providing the cleartext password required for the MSCHAPv2 challenge–response mechanism.  
  If a module does not recognize a username, the request is passed to the next module in the list. If no module can handle the username, the authentication request is rejected. Modules are evaluated in the order they appear in this array.

### Modules section

Most of the detailed configuration happens within the module definitions. Modules determine how users are authenticated, how VLANs are assigned, and how passwords are retrieved. Each module has its own configuration block inside `config.json`, placed after the basic ct-radius settings. It starts with the name of the module. Only modules listed in the `modules` array must be configured.

Currently, the following modules are available:

- **`ct-groups`**: Grants WiFi access and optionally assigns VLAN IDs based on ChurchTools group membership. Its configuration is documented in detail in [here](./ct-groups.md).






## Configure ct-radius

ct-radius is mainly configured through the `config.json` file that you will find inside your container’s folder. This file defines how authentication and VLAN assignment are handled. Setup the config.json according to your needs.

A default `config.json` looks like this:

```json
{
  "allowRequestedVlan": true,
  "vlanSeparator": "#",
  "modules": [
    "ct-groups"
  ],
  // Module configuration starts here
  "ct-groups": {
    ...
  }
}
```


### Basic `ct-radius` section

As you can see above, `ct-radius` itself only requires few variables to be defined.

- **allowRequestedVlan**: Whether users are allowed to request a specific VLAN via the username.
- **vlanSeparator**: The character used in usernames to request a specific VLAN. For example, `username#110` would request VLAN `110` for user `username`. The seperator only becomes relevant if `allowRequestedVlan` is `true`.
- **modules**: An array specifing the activated modules. Modules are responsible for checking a username, assigning this username a VLAN id (if configured to do so) and provide the cleartext password to the username for the Challenge-Response-Mechanism. If a username is unknown to a module, the request will be handed on to the next module. If no module knows a username, the request will be rejected. The modules are triggered in order in which they are defined in this configuration file.

### Modules section

Most of the detailed configuration happens through adding and configuring the modules of `ct-radius`. Modules are responsible for checking a username, assigning this username a VLAN id (if configured to do so) and provide the cleartext password to the username for the Challenge-Response-Mechanism. As such, they have their own configuration part in the `config.json` which follows the configuration of the basic variables. Only the configruation of used modules (i.e., they are within the `modules` array) must be defined.

Currently, tthe following modules are available for `ct-radius`:
- `ct-groups` assigns wifi access and optionally VLAN ids based on ChurchTools group membership. It configuration can be found [here](./ct-groups.md).




## Configure your RADIUS clients

Add your WiFi access points and/or controller devices to the `clients.conf` file inside the folder you created. Each access point or network controller must be defined with its IP address and an individual shared secret:

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
CT_RADIUS_PRIVATE_SERVER_KEY_PWD="KEY_TO_YOUR_SERVER.PEM_FILE"

CT_SERVER_URL="https://your.church.tools"
CT_API_TOKEN="secure-api-token-for-your-churchtools-ct-radius-user"

CT_GROUPS_PRIVATE_DECRYPTION_KEY_PWD="password-for-your-private-decryption-key-from-ct-pass-store-extension"
```

Explanation of each variable:
- **CT_RADIUS_PRIVATE_SERVER_KEY_PWD** → Password protecting your server’s certificate file (`server.pem`).  
- **CT_SERVER_URL** → URL of your ChurchTools instance.  
- **CT_API_TOKEN** → [Login token](https://forum.church.tools/topic/9496/wie-kann-ich-einen-login-token-erstellen) of your previously created ct-radius user in ChurchTools.  
- **CT_GROUPS_PRIVATE_DECRYPTION_KEY_PWD** → Password for the `decryption.pem` file from ct-pass-store, used to decrypt secondary passwords.



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