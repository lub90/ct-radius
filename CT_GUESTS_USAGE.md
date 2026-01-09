# ct-guests Module Usage Guide

## Configuration

Add the `ct-guests` module to your main configuration file. Example in `setup/config.json`:

```json
{
  "serverUrl": "https://your-churchtools-instance.com",
  "apiToken": "YOUR_API_TOKEN",
  "modules": ["ct-groups", "ct-guests"],
  
  "ct-guests": {
    "cachePath": "/path/to/ct-guests-cache.sqlite",
    "cacheTimeout": 300,
    "vlansRequired": false
  }
}
```

## Configuration Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `cachePath` | string | Yes | N/A | Path to SQLite cache file (must end with `.sqlite`) |
| `cacheTimeout` | number | No | 300 | Cache timeout in seconds |
| `vlansRequired` | boolean | No | false | If `true`, all users must have VLAN assignments |

## ChurchTools Setup

The module expects guest user data to be stored in ChurchTools' custom module extension:

### Extension Configuration
- **Extension Key**: `ct-radius`
- **Category Name**: `guest-users`
- **Data Type**: Array

### Guest User Data Format

Each entry in the `guest-users` category should have a JSON value with this structure:

```json
{
  "username": "kmustermann",
  "password": "SecurePassword123",
  "valid": {
    "from": "2025-01-09T00:00:00Z",
    "to": "2025-01-10T23:59:59Z"
  },
  "assignedVlan": 20
}
```

#### Field Descriptions
- **username** (string, required): Guest account username
- **password** (string, required): Cleartext password for guest
- **valid.from** (ISO 8601 datetime, required): Start of validity period
- **valid.to** (ISO 8601 datetime, required): End of validity period
- **assignedVlan** (integer, optional): VLAN ID to assign (0-4094)

## Authorization Behavior

### User Not Found
Guest user doesn't exist in ChurchTools guest users → Returns `null` (forwards to next module)

### Validity Period Check
- **Outside Date Range**: Returns `RejectResponse` (denies access)
- **Within Date Range**: Returns `ChallengeResponse` with password

### VLAN Assignment
- **User has assignedVlan**: Includes VLAN attributes in response
- **User has no assignedVlan**: 
  - If `vlansRequired=false`: Returns password-only response
  - If `vlansRequired=true`: Throws error in CtGuestDataService

## Caching

The module caches guest user data locally in SQLite:

- **Cache Location**: Specified in `cachePath` configuration
- **Timeout**: Configurable via `cacheTimeout` (seconds)
- **Automatic Refresh**: Data is automatically refreshed after timeout expires
- **Initial Load**: First request loads all guest users from ChurchTools

## Error Handling

### Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| `Invalid cachePath` | Path doesn't end with `.sqlite` or is empty | Update config with valid SQLite path |
| `Invalid ChurchTools client` | Client not properly initialized | Check server configuration |
| `Failed to load guest data from ChurchTools` | Backend API call failed | Verify extension exists and contains valid data |
| `Guest user has no VLAN assigned, but VLANs are required` | User missing VLAN when vlansRequired=true | Add assignedVlan to user data |

## Integration with Module Chain

The ct-guests module works as part of a module chain. Example order:

```json
"modules": ["ct-guests", "ct-groups", "ct-default"]
```

- **ct-guests first**: Guest users are checked first
  - If guest user exists and is valid → authenticate
  - If guest user doesn't exist → forward to ct-groups
- **ct-groups second**: Regular ChurchTools members
- **ct-default last**: Fallback module (if configured)

## Examples

### Minimal Configuration
```json
{
  "ct-guests": {
    "cachePath": "/var/cache/ct-radius/guests.sqlite"
  }
}
```

### Full Configuration (Production)
```json
{
  "ct-guests": {
    "cachePath": "/var/cache/ct-radius/guests.sqlite",
    "cacheTimeout": 600,
    "vlansRequired": true
  }
}
```

### Multiple Guest Users (ChurchTools Extension Data)
```json
[
  {
    "value": "{\"username\":\"guest1\",\"password\":\"pass1\",\"valid\":{\"from\":\"2025-01-09T00:00:00Z\",\"to\":\"2025-01-16T23:59:59Z\"},\"assignedVlan\":20}"
  },
  {
    "value": "{\"username\":\"guest2\",\"password\":\"pass2\",\"valid\":{\"from\":\"2025-01-09T00:00:00Z\",\"to\":\"2025-01-10T23:59:59Z\"}}"
  }
]
```

## Debugging

### Enable Verbose Logging
Set logger level in your setup to 'debug' to see detailed module operations

### Check Cache
- Cache file location: Set via `cachePath`
- Cache is stored in SQLite format
- Use SQLite browser to inspect cached data

### Common Issues

1. **Guest users not being authenticated**
   - Verify guest user exists in ChurchTools extension
   - Check current date is within validity period
   - Ensure username matches exactly (case-sensitive)

2. **RADIUS attributes not received**
   - Check if `assignedVlan` is set in guest user data
   - Verify VLAN ID is valid (0-4094)

3. **Cache not updating**
   - Check `cacheTimeout` setting
   - Ensure cache file has write permissions
   - Manually delete cache file to force refresh

## Performance Considerations

- **First Request**: May be slow (loads all guests from backend)
- **Cached Requests**: Fast (reads from local SQLite)
- **Cache Expiry**: After timeout, next request triggers refresh
- **Large User Lists**: Cache timeout helps reduce backend load
