import { CtGroupsModule } from "./modules/ct-groups/CtGroupsModule.js";
import type { AuthModule } from "./AuthModule.js";
import pino from "pino";

export const moduleRegistry: Record<string, (cfg: any, logger: pino.Logger) => AuthModule> = {
    "ct-groups": (cfg, logger) => new CtGroupsModule(cfg, logger)
};