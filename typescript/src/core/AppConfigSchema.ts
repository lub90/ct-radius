import { z } from "zod";

export const AppConfigSchema = z.object({
  allowRequestedVlan: z.boolean(),
  vlanSeparator: z.string().min(1),
  modules: z.array(z.string()),
}).catchall(z.unknown());

export type AppConfig = z.infer<typeof AppConfigSchema>;
