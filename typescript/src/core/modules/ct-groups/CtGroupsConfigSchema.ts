import { z } from "zod";

/**
 * BACKEND CONFIG (timeout + username_field_name)
 */
const BackendConfigSchema = z.object({
  timeout: z.number().int().positive().default(5),

  usernameFieldName: z.string().min(1),

  // Delivered as environment variables
  privateDecryptionKeyPassword: z.string().min(1)
});


/**
 * VLAN MAPPING SECTION (optional)
 */
const VlanMappingSchema = z.object({
  defaultVlan: z.number().int().nonnegative().optional(),

  assignments: z
    .record(z.string(), z.number().int().nonnegative())
    .optional(),

  assignmentsIfRequested: z
    .record(z.string(), z.number().int().nonnegative())
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

  // formerly basic.path_to_private_decryption_key
  pathToPrivateDecryptionKey: z.string().min(1),

  // formerly basic.path_to_cache_file
  pathToCacheFile: z.string().min(1),

  // new subobject
  backendConfig: BackendConfigSchema,

  // optional VLAN mapping block
  vlanMapping: VlanMappingSchema
});

export type CtGroupsConfig = z.infer<typeof CtGroupsConfigSchema>;
