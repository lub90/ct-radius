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
        this.config.cacheTimeout,
        this.config.vlansRequired
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

      // Check if user's validity period covers today
      if (!this.isValidToday(guestUser.valid.from, guestUser.valid.to)) {
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
        `Error in ct-guests authorization: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      throw error;
    }
  }

  /**
   * Check if a date range covers today
   */
  private isValidToday(fromStr: string, toStr: string): boolean {
    try {
      const from = new Date(fromStr);
      const to = new Date(toStr);
      const today = new Date();

      // Reset time to midnight for date-only comparison
      today.setHours(0, 0, 0, 0);
      from.setHours(0, 0, 0, 0);
      to.setHours(23, 59, 59, 999);

      return today >= from && today <= to;
    } catch (error) {
      throw new Error(
        `Invalid date format in guest user data: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }
}
