// AppConfigSchema.ts
import { z } from "zod";
import { ModuleConfigSchema } from "./ModuleConfigSchema.js";
import { CtAuthProvider } from "./CtAuthProvider.js";


const RequestRouteSchema = z.object({
  modules: z.array(z.string().min(1))
});


const BaseSchema = z.object({
  backendConfig: z.object({
    serverUrl: z.string()
      .url()
      .min(1)
      .refine(url => url.startsWith("https://"), {
        message: "serverUrl must start with https://"
      }),
    apiToken: z.string().min(1)
  }),

  allowRequestedVlan: z.boolean(),
  vlanSeparator: z.string().min(1),

  requestRoutes: z.record(
    z.enum(CtAuthProvider.ALLOWED_REQUEST_ROUTES),
    RequestRouteSchema
  )
})
  .catchall(ModuleConfigSchema);


export const AppConfigSchema = BaseSchema.superRefine((cfg, ctx) => {
  const reservedKeys = [
    "backendConfig",
    "allowRequestedVlan",
    "vlanSeparator",
    "requestRoutes"
  ];

  const moduleKeys = Object.keys(cfg).filter(k => !reservedKeys.includes(k));

  //
  // A) requestRoutes.modules → must exist
  //
  for (const [reqType, reqCfg] of Object.entries(cfg.requestRoutes)) {
    for (const moduleName of reqCfg.modules) {
      if (!moduleKeys.includes(moduleName)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Module '${moduleName}' referenced in requestRoute '${reqType}' is not defined.`,
          path: ["requestRoutes", reqType, "modules"]
        });
      }
    }
  }

  //
  // B) inherits → must exist if specified
  //
  for (const moduleName of moduleKeys) {
    const moduleCfg = cfg[moduleName]!;
    if (moduleCfg.inherits && !moduleKeys.includes(moduleCfg.inherits)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Module '${moduleName}' inherits from unknown module '${moduleCfg.inherits}'.`,
        path: [moduleName, "inherits"]
      });
    }
  }

  //
  // C) inherits → no cycles allowed
  //
  function detectCycle(start: string, visited: Set<string>): boolean {
    if (visited.has(start)) return true; // found a cycle
    visited.add(start);

    const parent = cfg[start]?.inherits;
    if (!parent) return false;

    return detectCycle(parent, visited);
  }

  for (const moduleName of moduleKeys) {
    if (detectCycle(moduleName, new Set())) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Inheritance cycle detected starting at module '${moduleName}'.`,
        path: [moduleName, "inherits"]
      });
    }
  }

  // D) requestRoutes keys must not be empty
  for (const key of Object.keys(cfg.requestRoutes)) {
    if (key.trim().length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "requestRoutes keys must not be empty.",
        path: ["requestRoutes"]
      });
    }
  }

});

export type AppConfig = z.infer<typeof AppConfigSchema>;
