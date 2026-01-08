import { z } from "zod";
import { moduleRegistry } from "./ModuleRegistry.js";

const allowedModules = Object.keys(moduleRegistry);

export const AppConfigSchema = z.object({

  backendConfig: z.object({
    // Delivered as environment variables
    serverUrl: z.string()
      .url()
      .min(1)
      .refine((url) => url.startsWith("https://"), {
        message: "serverUrl must start with https://",
      }),

    // Delivered as environment variables
    apiToken: z.string().min(1),
  }),

  allowRequestedVlan: z.boolean(),
  vlanSeparator: z.string().min(1),
  modules: z.array(z.enum(allowedModules as [string, ...string[]])).min(0),
}).catchall(z.unknown());

export type AppConfig = z.infer<typeof AppConfigSchema>;
