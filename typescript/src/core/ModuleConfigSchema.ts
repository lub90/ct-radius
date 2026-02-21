// ModuleConfigSchema.ts
import { z } from "zod";
import { moduleRegistry } from "./ModuleRegistry.js";

const allowedModules = Object.keys(moduleRegistry);

export const ModuleConfigSchema = z.object({
  type: z.enum(allowedModules).optional(),
  inherits: z.string().optional()
})
.refine(cfg => !(cfg.type && cfg.inherits), {
  message: "ModuleConfig must contain either 'type' OR 'inherits', not both."
})
.refine(cfg => cfg.type || cfg.inherits, {
  message: "ModuleConfig must contain either 'type' OR 'inherits'."
})
.catchall(z.unknown());

export type ModuleConfig = z.infer<typeof ModuleConfigSchema>;
