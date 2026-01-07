import type { AuthModule } from "../../AuthModule.js";
import type { UserRequest } from "../../../types/UserRequest.js";
import { ChallengeResponse, RadiusResponse, RejectResponse } from "../../../types/RadiusResponse.js";
import type { CtGroupsConfig } from "./CtGroupsConfigSchema.js";
import { ChurchToolsClient } from "@churchtools/churchtools-client";
import { CtGroupsConfigSchema } from "./CtGroupsConfigSchema.js";
import type pino from "pino";
import { CT_GROUPS } from "./constants.js";
import { ExtensionData } from "../../../ct-utils/lib/ExtensionData.js";
import { CtPasswordService } from "./CtPasswordService.js";
import { CtUserdataService } from "./CtUserdataService.js";
import type { UserData } from "./UserData.js";

export class CtGroupsModule implements AuthModule {
  name = "ct-groups";

  private readonly config: CtGroupsConfig;
  private readonly logger: pino.Logger
  private readonly churchtoolsClient: ChurchToolsClient;
  private passwordService: CtPasswordService | null;
  private userdataService: CtUserdataService | null;


  constructor(churchtoolsClient: ChurchToolsClient, config: any, logger: pino.Logger) {
    this.churchtoolsClient = churchtoolsClient;
    this.logger = logger;
    this.config = this.loadConfig(config);
    this.passwordService = null;
    this.userdataService = null;
  }

  private loadConfig(rawConfig: any): CtGroupsConfig {
    if (rawConfig.credentials?.privateDecryptionKeyPassword !== undefined) {
      throw new Error("privateDecryptionKeyPassword must not be defined in the JSON config file. Use environment variables instead.");
    }

    if (rawConfig.credentials?.apiToken !== undefined) {
      throw new Error("apiToken must not be defined in the JSON config file. Use environment variables instead.");
    }

    // Merge environment variables into the raw config
    const merged = {
      ...rawConfig,

      credentials: {
        ...rawConfig.credentials,

        privateDecryptionKeyPassword:
          process.env.CT_GROUPS_PRIVATE_DECRYPTION_KEY_PWD,

        apiToken:
          process.env.CT_API_TOKEN
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
    
    // Resolve user and check if he has wifi access
    const userdataService = await this.getUserdataService();
    const userData = await userdataService.get(req.username);

    if (userData === undefined) {
      this.logger.info(`User '${req.username}' not found in ChurchTools - forwarding to next module`);
      return null;
    }

    if (!this.hasGeneralWifiAccess(userData)) {
      this.logger.info(`User '${req.username}' does not have WiFi access - rejecting request!`);
      return new RejectResponse();
    }


    // Get user's cleartext password
    const passwordService = await this.getPasswordService(this.churchtoolsClient);
    const pwd = await passwordService.getCleartextPwd(userData.id);

    if (!pwd) {
      this.logger.info(`User '${req.username}' has no password set - denying access!`);
      return new RejectResponse();
    }

    // Determine VLAN assignment
    const vlanId = this.getVlan(userData, req.requestedVlanId);
    if (vlanId !== undefined) {
      // VLAN id assigned - return Challenge response with VLAN attributes
      return new ChallengeResponse(pwd, {
        tunnelType: 13,
        tunnelMediumType: 6,
        tunnelPrivateGroupId: vlanId
      });
    } else if (req.requestedVlanId === undefined) {
      // No VLAN id assigned, but also no VLAN id requested - just return the Challenge response
      return new ChallengeResponse(pwd);
    } else {
      // VLAN id was requested, but no matching VLAN found - Deny access
      this.logger.info(`User '${req.username}' has no allowed VLAN group for requested VLAN ID ${req.requestedVlanId} - denying access!`);
      return new RejectResponse();
    }

  }



  private hasGeneralWifiAccess(user: UserData): boolean {
    let wifiAccessGroups = [...this.config.wifiAccessGroups];

    if (this.config.includeAssignmentGroupsInAccessGroups) {
      const assignments = this.config.vlanMapping?.assignments ?? [];
      const assignmentsIfRequested = this.config.vlanMapping?.assignmentsIfRequested ?? [];

      wifiAccessGroups = [
        ...wifiAccessGroups,
        ...assignments.map(a => a.group),
        ...assignmentsIfRequested.map(a => a.group)
      ];
    }

    return user.groups.some(g => wifiAccessGroups.includes(g));
  }




  private getVlan(user: UserData, requestedVlanId?: number): number | undefined {
    const vlanMapping = this.config.vlanMapping;

    const assignments = vlanMapping?.assignments ?? [];
    const assignmentsIfRequested = vlanMapping?.assignmentsIfRequested ?? [];
    const defaultVlan = vlanMapping?.defaultVlan;

    // ---------------------------------------------------------
    // CASE 1: User requested a specific VLAN
    // ---------------------------------------------------------
    if (requestedVlanId !== undefined) {

      // 1) Check assignmentsIfRequested (in JSON order)
      for (const entry of assignmentsIfRequested) {
        if (
          user.groups.includes(entry.group) &&
          entry.vlan === requestedVlanId
        ) {
          return entry.vlan;
        }
      }

      // 2) Check assignments (in JSON order)
      for (const entry of assignments) {
        if (
          user.groups.includes(entry.group) &&
          entry.vlan === requestedVlanId
        ) {
          return entry.vlan;
        }
      }

      // 3) Check default VLAN
      if (defaultVlan === requestedVlanId) {
        return defaultVlan;
      }

      // 4) Nothing matched
      return undefined;
    }

    // ---------------------------------------------------------
    // CASE 2: No requested VLAN → normal assignment logic
    // ---------------------------------------------------------

    // 1) Check assignments (in JSON order)
    for (const entry of assignments) {
      if (user.groups.includes(entry.group)) {
        return entry.vlan;
      }
    }

    // 2) Check default VLAN
    if (defaultVlan !== undefined) {
      return defaultVlan;
    }

    // 3) No VLAN assigned
    return undefined;
  }



  private async getUserdataService(): Promise<CtUserdataService> {
    if (this.userdataService !== null) {
      return this.userdataService;
    }

    this.userdataService = new CtUserdataService(
      this.churchtoolsClient,
      this.config.credentials.usernameFieldName,
      this.config.pathToCacheFile,
      this.config.cacheTimeout
    );

    return this.userdataService;
  }

  private async getPasswordService(churchtoolsClient: ChurchToolsClient): Promise<CtPasswordService> {
    if (this.passwordService !== null) {
      return this.passwordService;
    }

    const serverUrl = await this.getPasswordServerUrl(churchtoolsClient);

    this.passwordService = new CtPasswordService(this.config.credentials.pathToPrivateDecryptionKey, this.config.credentials.privateDecryptionKeyPassword, this.config.credentials.apiToken, serverUrl);

    return this.passwordService;
  }


  private async getPasswordServerUrl(churchtoolsClient: ChurchToolsClient): Promise<string> {
    const extensonData = new ExtensionData(churchtoolsClient, CT_GROUPS.CT_PASS_STORE_EXTENSION_KEY);
    const settings = await extensonData.getCategoryData(CT_GROUPS.CT_PASS_STORE_SETTINGS_CATEGORY_NAME, true);
    const serverUrl = settings[CT_GROUPS.CT_PASS_STORE_SERVER_URL_FIELD_NAME];

    if (!serverUrl || serverUrl.trim() === "") throw new Error("serverUrl must be a non-empty string");
    if (!serverUrl.startsWith("https://")) throw new Error("serverUrl must start with https://");

    return serverUrl.trim().replace(/\/$/, "").trim();
  }
}
