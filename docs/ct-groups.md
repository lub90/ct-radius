# ct-groups module

The `ct-groups` module integrates ct-radius with ChurchTools group management. It determines **who is allowed to authenticate**, **which VLAN a user should be placed into** (optional), and **how ct-radius retrieves and decrypts user credentials**.   All logic is based on ChurchTools group membership, making network access fully aligned with your church’s organizational structure.

Below is a complete example configuration for the `ct-groups` module:

```json
{
  // Base config of ct-radius including module definition
  ...
  // ct-groups definition starts here
  "ct-groups": {
    "wifiAccessGroups": [
      194
    ],
    "includeAssignmentGroupsInAccessGroups": true,
    "pathToCacheFile": "/ct-radius/cache.sqlite",
    "cacheTimeout": 60,
    "credentials": {
      "usernameFieldName": "cmsUserId",
      "pathToPrivateDecryptionKey": "/ct-radius/decryption.pem"
    },
    "vlanMapping": {
      "defaultVlan": 30,
      "assignments": [
        {
          "group": 71,
          "vlan": 20
        },
        {
          "group": 132,
          "vlan": 20
        }
      ],
      "assignmentsIfRequested": [
        {
          "group": 231,
          "vlan": 110
        },
        {
          "group": 77,
          "vlan": 120
        }
      ]
    }
  }
}
```

## Configuration Reference

-  **wifiAccessGroups**: A list of ChurchTools group IDs whose members are allowed to authenticate. Only users in these groups (or optionally assignment groups, see below) may log in.

-  **includeAssignmentGroupsInAccessGroups**: If enabled, all groups used in VLAN assignments (`assignments` and `assignmentsIfRequested` variables) are automatically treated as WiFi access groups. This ensures that anyone who is assigned to a VLAN group is also allowed to authenticate, even if they are not explicitly listed in `wifiAccessGroups`.

-  **pathToCacheFile**: Path to the SQLite file used for caching ChurchTools user and group data. Caching reduces backend load and speeds up authentication, especially during peak times (e.g., Sunday morning). For the container environment, this variable doesn't need to be changed.

-  **cacheTimeout**: How long cached entries remain valid before ct-groups refreshes them from ChurchTools.

### Credentials Section

-  **credentials.usernameFieldName**: The ChurchTools person field that stores the username used for authentication. Most ChurchTools installations use `cmsUserId`. As such, you can leave this unchanged.

-  **credentials.pathToPrivateDecryptionKey**: Path to the private key used to decrypt secondary passwords stored by the [ct-pass-store extension](https://github.com/lub90/ct-pass-store). For the container environment, this variable doesn't need to be changed.

### VLAN Mapping Section

The `vlanMapping` block defines how VLANs are assigned based on ChurchTools groups. This whole section as well as each variable within this section is optional. As such, you can also use the module without VLANs.

-  **vlanMapping.defaultVlan**: The fallback VLAN id used when no assignment rule matches.

-  **vlanMapping.assignments**: Priority‑based VLAN assignments. Users are placed into the **first matching** group’s VLAN unless they explicitly request another VLAN.

-  **vlanMapping.assignmentsIfRequested**: VLANs that users may join **only if they explicitly request them**, e.g.: through `username#110`. This allows flexible, on‑demand VLAN switching for users with special roles.


