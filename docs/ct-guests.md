# ct-guests module

The `ct-guests` module enables temporary WiFi access for people who are **not part of your ChurchTools installation**. This is useful for situations where external individuals need short‑term network access, such as:

- guest worship leaders or musicians  
- visiting preachers  
- contractors and handymen  
- seminar or workshop participants  
- event helpers  
- external teams using your facilities  

Instead of creating full ChurchTools accounts for these people, your staff (e.g., secretary, chief technician, event coordinator) can create **guest WiFi accounts** through an associated ChurchTools extension. These guest accounts:

- have a username and password  
- are valid only for a defined time window  
- may optionally be assigned to a specific VLAN 
- do **not** require the guest to exist as a ChurchTools person  

The `ct-guests` module integrates this guest‑user workflow into ct-radius, ensuring that temporary WiFi access is secure, auditable, and easy to manage.

## Setup

*To be added, once the extension is implemented in a first version...*

## Configuration

Below is a complete example configuration for the `ct-guests` module:

```json
{
  // Base config of ct-radius including module definition
  ...
  // ct-guests definition starts here
  "ct-guests": {
    "cachePath": "/ct-radius/guest-cache.sqlite",
    "cacheTimeout": 60,
    "vlansRequired": false,
    "allowedVlans": [
      30,
      40
    ]
  }
}
```


### Configuration Reference

-  **cachePath**: Path to the SQLite file used for caching guest user data retrieved from the ChurchTools extension. Caching ensures that authentication remains fast and reliable even if the ChurchTools backend is temporarily slow or unavailable. Do not change this variable if you are using the Docker container.

-  **cacheTimeout**: How long (in seconds) cached guest entries remain valid before ct-guests refreshes them from the ChurchTools extension. A typical value is **60 seconds**, balancing freshness with backend load.

-  **vlansRequired**: Determines whether every guest must have a VLAN assigned. If set to `true`: The ChurchTools extension will require you to assign every guest a VLAN ID out of the list of `allowedVlans`. Any guest without an assigned VLAN will **fail authentication**. This is useful in environments where VLAN separation is mandatory for security. If set to `false`: VLAN assignment is optional. Guest users may be assigned to a VLAN from the list of `allowedVlans` or not at all.

-  **allowedVlans**: A list of VLAN IDs that guest users are permitted to use. If non‑empty, **any VLAN assigned to a guest must be included in this list**, otherwise authentication fails. This allows you to restrict guest users to a safe subset of your network (e.g., only VLAN 30 and 40).

