import type { AuthModule } from "../../AuthModule.js";
import type { UserRequest } from "../../../types/UserRequest.js";
import type { RadiusResponse } from "../../../types/RadiusResponse.js";
import type { CtGroupsConfig } from "./CtGroupsConfig.js";
import type pino from "pino";

export class CtGroupsModule implements AuthModule {
  name = "ct-groups";

  constructor(
    private readonly config: CtGroupsConfig,
    private readonly logger: pino.Logger
  ) {}

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
