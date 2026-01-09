# ct-guests Module Implementation Summary

## Overview
Successfully created a new authentication module called `ct-guests` that enables guest user authentication via the ChurchTools backend. This module complements the existing `ct-groups` module.

## Architecture

The module follows the established pattern of the ct-radius project and consists of three main components:

### 1. Configuration Schema (`CtGuestsConfigSchema.ts`)
- **File**: [CtGuestsConfigSchema.ts](../src/core/modules/ct-guests/CtGuestsConfigSchema.ts)
- Validates configuration parameters using Zod
- Parameters:
  - `cachePath` (required): SQLite cache file path (must end with `.sqlite`)
  - `cacheTimeout` (optional): Cache timeout in seconds (default: 300)
  - `vlansRequired` (optional): Enforce VLAN assignment for all users (default: false)
- Includes type definitions for `GuestUser` data structure

### 2. Data Retrieval Service (`CtGuestDataService.ts`)
- **File**: [CtGuestDataService.ts](../src/core/modules/ct-guests/CtGuestDataService.ts)
- Handles communication with ChurchTools backend via ExtensionData
- Features:
  - Retrieves guest user data from ChurchTools extension (`ct-radius` extension, `guest-users` category)
  - Implements intelligent caching using SQLite (similar to CtUserdataService)
  - Validates VLAN requirements based on configuration
  - Handles authentication date/time validation
  - Defensive input validation and error handling
  
**Extension Configuration**:
- Extension Key: `ct-radius`
- Category: `guest-users`
- Data Format: Array of guest user objects with structure:
  ```json
  {
    "username": "string",
    "password": "string",
    "valid": {
      "from": "ISO 8601 datetime",
      "to": "ISO 8601 datetime"
    },
    "assignedVlan": number (optional)
  }
  ```

### 3. Module Class (`CtGuestsModule.ts`)
- **File**: [CtGuestsModule.ts](../src/core/modules/ct-guests/CtGuestsModule.ts)
- Implements the `AuthModule` interface
- Features:
  - Loads and validates configuration
  - Manages GuestDataService lifecycle
  - Implements authorization logic:
    - Returns `null` if user not found (forwards to next module)
    - Returns `RejectResponse` if user is outside validity period
    - Returns `ChallengeResponse` with cleartext password if valid
    - Includes VLAN attributes if user has assigned VLAN
  - Comprehensive error handling and logging

### 4. Module Registration
Updated [ModuleRegistry.ts](../src/core/ModuleRegistry.ts) to register the ct-guests module alongside ct-groups

## Authorization Flow

1. **User Lookup**: Query guest user data from ChurchTools (cached)
2. **User Not Found**: Return `null` to forward to next module
3. **Validity Check**: Verify user's date range covers today
4. **Denied (Out of Range)**: Return `RejectResponse`
5. **Allowed**: Return `ChallengeResponse` with:
   - Cleartext password from guest data
   - VLAN assignment (if configured and available)

## Test Coverage

Comprehensive test suite with 115 tests across 4 test files:

### Test Files
1. **CtGuestsConfigSchema.test.ts** (18 tests)
   - Configuration validation
   - Field validation (cachePath, cacheTimeout, vlansRequired)
   - Default values
   - Invalid input handling

2. **CtGuestDataService.test.ts** (23 tests)
   - Constructor validation
   - Input validation
   - Cache clearing
   - Error handling
   - Configuration parameter respect

3. **CtGuestsModule.constructor.test.ts** (34 tests)
   - Constructor validation
   - Configuration validation
   - Default values
   - Error messages
   - Module lifecycle

4. **CtGuestsModule.authorize.test.ts** (40 tests)
   - Authorization return types
   - Validity period validation
   - VLAN handling
   - Password handling
   - Error scenarios
   - Input handling
   - Logging verification

## Key Implementation Details

### Defensive Programming
- All inputs are validated before use
- Empty strings are rejected
- Type checking prevents type-related errors
- Clear, descriptive error messages

### Caching Strategy
- Uses Keyv with SQLite backend for persistent caching
- Configurable timeout (prevents stale data)
- Cache can be manually cleared
- Automatic refresh on cache expiry

### Date/Time Handling
- Validates ISO 8601 formatted dates from guest data
- Performs date range checks at day-level granularity
- Handles timezone-aware datetime strings

### VLAN Support
- Optional VLAN assignment per guest user
- Configurable VLAN requirement enforcement
- Proper RADIUS attribute formatting

## Test Results
All 370 tests pass (including 115 new tests for ct-guests module):
- ✅ Configuration schema validation
- ✅ Data service operations
- ✅ Module lifecycle
- ✅ Authorization flow
- ✅ Error handling
- ✅ Input validation

## Integration with Existing Code
- Follows the same patterns as ct-groups module
- Compatible with existing CtAuthProvider flow
- Uses standard RadiusResponse types (ChallengeResponse, RejectResponse)
- Integrates with ChurchTools client infrastructure
- Maintains logging standards with pino logger
