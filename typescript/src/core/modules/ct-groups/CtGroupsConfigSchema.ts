import { z } from "zod";

/**
 * BACKEND CONFIG (timeout + username_field_name)
 */
const CredentialsConfigSchema = z.object({

  usernameFieldName: z.string().min(1),

  // password for the private decryption key - to be delivered as environment variable
  privateDecryptionKeyPassword: z.string().min(1),

  // The api token, delivered as environment variable - same as the main app config api token
  apiToken: z.string().min(1),

  // Path to the private decryption key file
  pathToPrivateDecryptionKey: z.string().refine(
    (val) => val.endsWith(".pem"),
    "privateDecryptionKeyPath must end with .pem"
  )
});


/**
 * VLAN MAPPING SECTION (optional)
 */
const VlanMappingSchema = z.object({
  defaultVlan: z.number().int().nonnegative().optional(),

  assignments: z
    .array(
      z.object({
        group: z.number().int().nonnegative(),
        vlan: z.number().int().nonnegative()
      })
    )
    .optional(),

  assignmentsIfRequested: z
    .array(
      z.object({
        group: z.number().int().nonnegative(),
        vlan: z.number().int().nonnegative()
      })
    )
    .optional()
}).optional();



/**
 * FULL MODULE CONFIG (flattened)
 */
export const CtGroupsConfigSchema = z.object({
  // formerly basic.wifi_access_groups
  wifiAccessGroups: z.array(z.number().int().nonnegative()).default([]),

  // formerly basic.include_assignment_groups_in_access_groups
  includeAssignmentGroupsInAccessGroups: z.boolean().default(false),

  // formerly basic.path_to_cache_file
  pathToCacheFile: z.string().refine(
    (val) => val.endsWith(".sqlite"),
    "cachePath must end with .sqlite"
  ),

  cacheTimeout: z.number().int().nonnegative().default(60), // in seconds, default 1 min

  // new subobject
  credentials: CredentialsConfigSchema,

  // optional VLAN mapping block
  vlanMapping: VlanMappingSchema
});

export type CtGroupsConfig = z.infer<typeof CtGroupsConfigSchema>;
