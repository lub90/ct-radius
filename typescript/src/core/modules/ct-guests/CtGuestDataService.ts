import Keyv from "keyv";
import KeyvSqlite from "@keyv/sqlite";
import type { ChurchToolsClientType } from "../../churchtoolsSetup.js";
import { ExtensionData } from "../../../ct-utils/lib/ExtensionData.js";
import type { GuestUser } from "./GuestUser.js";
import { CT_GUESTS } from "./constants.js";

export interface CachedGuestEntry {
  username: string;
  data: GuestUser;
  timestamp: number; // epoch ms
}

export class CtGuestDataService {
  private readonly client: ChurchToolsClientType;
  private readonly timeoutSeconds: number;
  private readonly vlansRequired: boolean;
  private readonly cache: Keyv<CachedGuestEntry>;

  constructor(
    churchtoolsClient: ChurchToolsClientType,
    cachePath: string,
    timeoutSeconds: number,
    vlansRequired: boolean
  ) {
    if (!churchtoolsClient || typeof churchtoolsClient !== "object") {
      throw new Error("Invalid ChurchTools client");
    }

    if (typeof cachePath !== "string" || !cachePath.endsWith(".sqlite")) {
      throw new Error("Invalid cachePath");
    }

    if (typeof timeoutSeconds !== "number" || timeoutSeconds < 0) {
      throw new Error("Invalid timeoutSeconds");
    }

    if (typeof vlansRequired !== "boolean") {
      throw new Error("Invalid vlansRequired");
    }

    this.client = churchtoolsClient;
    this.timeoutSeconds = timeoutSeconds;
    this.vlansRequired = vlansRequired;

    this.cache = new Keyv<CachedGuestEntry>({
      store: new KeyvSqlite({ uri: "sqlite://" + cachePath }),
    });

    this.cache.on("error", (err) => {
      throw err;
    });
  }

  // ---------------------------------------------------------------------------
  // PUBLIC API
  // ---------------------------------------------------------------------------

  async get(username: string): Promise<GuestUser | undefined> {
    this.validateUsername(username);

    const entry = await this.cache.get(username);

    if (!entry || this.isExpired(entry.timestamp)) {
      await this.refreshCacheFromBackend();
      const updated = await this.cache.get(username);

      if (!updated) return undefined;
    
      // TODO: Duplicated to remaining method
      if (this.vlansRequired && updated.data.assignedVlan === undefined) {
        throw new Error(
          `Guest user '${username}' has no VLAN assigned, but VLANs are required`
        );
      }

      return updated.data;
    }

    if (this.vlansRequired && entry.data.assignedVlan === undefined) {
      throw new Error(
        `Guest user '${username}' has no VLAN assigned, but VLANs are required`
      );
    }

    return entry.data;
  }

  // ---------------------------------------------------------------------------
  // INTERNALS
  // ---------------------------------------------------------------------------

  private isExpired(timestamp: number): boolean {
    return Date.now() - timestamp > this.timeoutSeconds * 1000;
  }

  private async refreshCacheFromBackend(): Promise<void> {
    try {
      const extensionData = new ExtensionData(this.client, CT_GUESTS.EXTENSION_KEY);

      const hasCategory = await extensionData.hasCategory(CT_GUESTS.CATEGORY_NAME);
      if (!hasCategory) {
        await this.cache.clear();
        return;
      }

      const rawData = await extensionData.getCategoryData(
        CT_GUESTS.CATEGORY_NAME,
        false
      );

      const parsed = this.parseGuestUserData(rawData);

      await this.cache.clear();

      const now = Date.now();
      for (const user of parsed) {
        const entry: CachedGuestEntry = {
          username: user.username.trim(),
          data: user,
          timestamp: now,
        };
        await this.cache.set(entry.username, entry);
      }
    } catch (error) {
      throw new Error(
        `Failed to load guest data from ChurchTools: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  private parseGuestUserData(rawData: any[]): GuestUser[] {
    if (!Array.isArray(rawData)) {
      throw new Error("Guest user data must be an array");
    }

    const guests: GuestUser[] = [];

    for (const entry of rawData) {
      if (!entry || typeof entry !== "object" || !entry.value) continue;

      try {
        guests.push(JSON.parse(entry.value));
      } catch (error) {
        throw new Error(
          `Failed to parse guest user data: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      }
    }

    return guests;
  }

  private validateUsername(username: string): void {
    if (typeof username !== "string" || username.trim().length === 0) {
      throw new Error("Invalid username");
    }
  }

  async clearCache(): Promise<void> {
    try {
      await this.cache.clear();
    } catch (error) {
      throw new Error(
        `Failed to clear cache: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }
}
