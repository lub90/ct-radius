import { CtGroupsModule } from "./modules/ct-groups/CtGroupsModule.js";
import { CtGuestsModule } from "./modules/ct-guests/CtGuestsModule.js";
import type { AuthModule } from "./AuthModule.js";
import pino from "pino";
import type { ChurchToolsClientType } from "./churchtoolsSetup.js";

export const moduleRegistry: Record<string, (churchtoolsClient: ChurchToolsClientType, cfg: any, logger: pino.Logger) => AuthModule> = {
    "ct-groups": (churchtoolsClient, cfg, logger) => new CtGroupsModule(churchtoolsClient, cfg, logger),
    "ct-guests": (churchtoolsClient, cfg, logger) => new CtGuestsModule(churchtoolsClient, cfg, logger)
};