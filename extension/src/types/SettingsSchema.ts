import { z } from "zod";

export const AllowedVlanSchema = z.object({
  id: z.number(),
  name: z.string(),
});

export const SettingsSchema = z.object({
  allowedVlans: z.array(AllowedVlanSchema),

  defaultVlan: z.number(),

  vlanRequired: z.boolean(),

  passwordLength: z.number().min(1),

  usernameLength: z.number().min(1),

  usernamePrefix: z.string().trim().nonempty(),

  guestSSID: z.string().trim().nonempty(),
});

export type Settings = z.infer<
  typeof SettingsSchema
>;
