import { z } from "zod";

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
  cacheTimeout: z.number().int().nonnegative(), // default 1 minute

  // Whether VLAN assignment is manadatory - must be explicitly boolean
  vlansRequired: z.boolean(),

  // Allowed VLAN ids for the guests
  allowedVlans: z.array(
    z.number().int().nonnegative()
  ).default([]),

});

export type CtGuestsConfig = z.infer<typeof CtGuestsConfigSchema>;
