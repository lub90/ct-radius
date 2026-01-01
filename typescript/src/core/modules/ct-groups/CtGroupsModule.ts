import type { AuthModule } from "../../AuthModule.js";
import type { UserRequest } from "../../../types/UserRequest.js";
import type { RadiusResponse } from "../../../types/RadiusResponse.js";
import type { CtGroupsConfig } from "./CtGroupsConfigSchema.js";
import { CtGroupsConfigSchema } from "./CtGroupsConfigSchema.js";
import type pino from "pino";

export class CtGroupsModule implements AuthModule {
  name = "ct-groups";

  private readonly config: CtGroupsConfig;
  private readonly logger: pino.Logger


  constructor(config: any, logger: pino.Logger) {
    this.logger = logger;
    this.config = this.loadConfig(config);
  }

  private loadConfig(rawConfig: any): CtGroupsConfig {
    // Merge environment variables into the raw config
    const merged = {
      ...rawConfig,

      backendConfig: {
        ...rawConfig.backendConfig,

        serverUrl:
          process.env.CT_GROUPS_SERVER_URL,

        apiUser:
          process.env.CT_GROUPS_API_USER,

        apiUserPassword:
          process.env.CT_GROUPS_API_USER_PWD,

        privateDecryptionKeyPassword:
          process.env.CT_GROUPS_PRIVATE_DECRYPTION_KEY_PWD
      }
    };

    // Validate and return the final config
    const parsed = CtGroupsConfigSchema.safeParse(merged);
    if (!parsed.success) {
      const errors = parsed.error.issues
        .map(e => `- ${e.path.join(".")}: ${e.message}`)
        .join("\n");
      throw new Error(`Invalid configuration:\n${errors}`);
    }
    return parsed.data;
  }


  async authorize(req: UserRequest): Promise<RadiusResponse | null> {
    this.logger.debug(
      `CtGroupsModule: received request for username='${req.username}'` +
      (req.requestedVlanId !== undefined
        ? ` with requested VLAN=${req.requestedVlanId}`
        : "")
    );

    // Dummy behavior: do not handle request by returning null
    this.logger.debug("CtGroupsModule: dummy mode → returning null");
    return null;
  }
}
