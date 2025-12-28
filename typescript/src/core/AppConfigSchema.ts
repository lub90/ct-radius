import { z } from "zod";
import { moduleRegistry } from "./ModuleRegistry.js";

const allowedModules = Object.keys(moduleRegistry);

export const AppConfigSchema = z.object({
  allowRequestedVlan: z.boolean(),
  vlanSeparator: z.string().min(1),
  modules: z.array(z.enum(allowedModules as [string, ...string[]])).min(1),
}).catchall(z.unknown());

export type AppConfig = z.infer<typeof AppConfigSchema>;
