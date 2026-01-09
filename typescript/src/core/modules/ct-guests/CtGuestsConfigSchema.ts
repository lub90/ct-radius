import { z } from "zod";

/**
 * GUEST USER DATA SCHEMA
 * This defines the structure of each guest user in the extension data
 */
const GuestUserSchema = z.object({
  username: z.string().min(1, "Username must not be empty"),
  password: z.string().min(1, "Password must not be empty"),
  valid: z.object({
    from: z.string().datetime("Invalid date format for 'valid.from'"),
    to: z.string().datetime("Invalid date format for 'valid.to'"),
  }),
  assignedVlan: z.number().int().nonnegative("VLAN must be non-negative").optional(),
});

/**
 * MODULE CONFIG SCHEMA
 */
export const CtGuestsConfigSchema = z.object({
  // Path to the SQLite cache file - must be non-empty string ending with .sqlite
  cachePath: z.string()
    .trim()
    .min(1, "cachePath must not be empty")
    .refine(
      (val) => val.endsWith(".sqlite"),
      "cachePath must end with .sqlite"
    ),

  // Cache timeout in seconds
  cacheTimeout: z.number().int().nonnegative().default(300), // default 5 minutes

  // Whether VLAN assignment is mandatory - must be explicitly boolean
  vlansRequired: z.boolean().default(false),
});

export type CtGuestsConfig = z.infer<typeof CtGuestsConfigSchema>;
export type GuestUser = z.infer<typeof GuestUserSchema>;
