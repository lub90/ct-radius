import type { AuthModule } from "../../AuthModule.js";
import type { UserRequest } from "../../../types/UserRequest.js";
import { ChallengeResponse, RadiusResponse, RejectResponse } from "../../../types/RadiusResponse.js";
import type { CtGuestsConfig } from "./CtGuestsConfigSchema.js";
import { CtGuestsConfigSchema } from "./CtGuestsConfigSchema.js";
import type pino from "pino";
import { CtGuestDataService } from "./CtGuestDataService.js";
import type { ChurchToolsClientType } from "../../churchtoolsSetup.js";

export class CtGuestsModule implements AuthModule {
  name = "ct-guests";

  private readonly config: CtGuestsConfig;
  private readonly logger: pino.Logger;
  private readonly churchtoolsClient: ChurchToolsClientType;
  private guestDataService: CtGuestDataService | null = null;

  constructor(churchtoolsClient: ChurchToolsClientType, config: any, logger: pino.Logger) {
    // Validation
    if (!churchtoolsClient || typeof churchtoolsClient !== "object") {
      throw new Error("Invalid ChurchTools client");
    }

    if (!logger || typeof logger !== "object") {
      throw new Error("Invalid logger");
    }

    this.churchtoolsClient = churchtoolsClient;
    this.logger = logger;
    this.config = this.loadConfig(config);
  }

  /**
   * Load and validate configuration
   */
  private loadConfig(rawConfig: any): CtGuestsConfig {
    // Validate and return the configuration
    const parsed = CtGuestsConfigSchema.safeParse(rawConfig);
    if (!parsed.success) {
      const errors = parsed.error.issues
        .map((e) => `- ${e.path.join(".")}: ${e.message}`)
        .join("\n");
      throw new Error(`Invalid ct-guests configuration:\n${errors}`);
    }
    return parsed.data;
  }

  /**
   * Get or create the guest data service
   */
  private async getGuestDataService(): Promise<CtGuestDataService> {
    if (this.guestDataService === null) {
      this.guestDataService = new CtGuestDataService(
        this.churchtoolsClient,
        this.config.cachePath,
        this.config.cacheTimeout
      );
    }
    return this.guestDataService;
  }

  /**
   * Authorize a guest user
   */
  async authorize(req: UserRequest): Promise<RadiusResponse | null> {

    try {
      const guestDataService = await this.getGuestDataService();
      const guestUser = await guestDataService.get(req.username);

      // User not found - forward to next module
      if (guestUser === undefined) {
        this.logger.info(
          `Guest user '${req.username}' not found in ChurchTools guest users - forwarding to next module`
        );
        return null;
      }


      // Check if VLAN is required and assigned
      if (this.config.vlansRequired && guestUser.assignedVlan === undefined) {
        throw new Error(
          `Guest user '${guestUser.username}' has no VLAN assigned, but VLANs are required`
        );
      }

      // Check that assignedVlan is allowed
      if (
        guestUser.assignedVlan !== undefined &&
        !this.config.allowedVlans.includes(guestUser.assignedVlan)
      ) {
        throw new Error(
          `Guest user '${guestUser.username}' is assigned to VLAN ${guestUser.assignedVlan}, which is not allowed`
        );
      }

      // Check if user's validity period covers today
      if (!this.isWithinValidityPeriod(guestUser.valid.from, guestUser.valid.to)) {
        this.logger.info(
          `Guest user '${req.username}' is outside valid date range - denying access`
        );
        return new RejectResponse();
      }

      // User is valid - return Challenge response with password
      if (guestUser.assignedVlan !== undefined) {
        return new ChallengeResponse(guestUser.password, {
          tunnelType: 13,
          tunnelMediumType: 6,
          tunnelPrivateGroupId: guestUser.assignedVlan,
        });
      } else {
        return new ChallengeResponse(guestUser.password);
      }

    } catch (error) {

      this.logger.error(
        `Error in ct-guests authorization: ${error instanceof Error ? error.message : String(error)
        }`
      );
      throw error;

    }
  }

  /**
   * Check if a date range covers today
   */
  private isWithinValidityPeriod(from: Date, to: Date): boolean {
    try {
      const now = Date.now();
      return now >= from.getTime() && now <= to.getTime();
    } catch (error) {
      throw new Error(
        `Invalid date format in guest user data: ${error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }
}
