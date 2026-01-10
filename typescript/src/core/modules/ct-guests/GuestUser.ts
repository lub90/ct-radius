import { z } from "zod";

/**
 * GUEST USER DATA SCHEMA
 * This defines the structure of each guest user in the extension data
 */
export const GuestUserSchema = z.object({
  username: z.string().trim().min(1, "Username must not be empty"),
  password: z.string().trim().min(1, "Password must not be empty"),
  valid: z.object({
    from: z.coerce.date(),
    to: z.coerce.date(),
  }),
  assignedVlan: z.number().int().nonnegative("VLAN must be non-negative").optional(),
});

export type GuestUser = z.infer<typeof GuestUserSchema>;