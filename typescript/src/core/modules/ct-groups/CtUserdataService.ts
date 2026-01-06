import Keyv from "keyv";
import KeyvFile from "keyv-file";
import type { ChurchToolsClient } from "@churchtools/churchtools-client";

export enum CacheStatus {
    NOT_AVAILABLE_IN_CACHE = "NOT_AVAILABLE_IN_CACHE",
    MISSING_USER_GROUPS = "MISSING_USER_GROUPS",
    TIMED_OUT = "TIMED_OUT",
    AVAILABLE = "AVAILABLE"
}

export interface CachedUserEntry {
    username: string;
    id: number;
    groups?: number[];
    timestamp: number;
}

export interface UserData {
    username: string;
    id: number;
    groups: number[];
}

export class CtUserdataService {
    private readonly client: ChurchToolsClient;
    private readonly fieldName: string;
    private readonly timeoutSeconds: number;
    private readonly cache: Keyv<CachedUserEntry>;

    constructor(
        churchtoolsClient: ChurchToolsClient,
        fieldName: string,
        cachePath: string,
        timeoutSeconds: number
    ) {
        // -----------------------------
        // VALIDATION
        // -----------------------------
        if (!churchtoolsClient || typeof churchtoolsClient !== "object") {
            throw new Error("Invalid ChurchTools client");
        }

        if (!this.isValidString(fieldName)) {
            throw new Error("Invalid fieldName");
        }

        if (!this.isValidString(cachePath)) {
            throw new Error("Invalid cachePath");
        }

        if (typeof timeoutSeconds !== "number" || timeoutSeconds < 0 || Number.isNaN(timeoutSeconds)) {
            throw new Error("Invalid timeoutSeconds");
        }

        this.client = churchtoolsClient;
        this.fieldName = fieldName.trim();
        this.timeoutSeconds = timeoutSeconds;

        this.cache = new Keyv<CachedUserEntry>({
            store: new KeyvFile({ filename: cachePath })
        });
    }

    // ---------------------------------------------------------------------------
    // PUBLIC API
    // ---------------------------------------------------------------------------

    async get(username: string): Promise<UserData> {
        this.ensureValidUsername(username);

        const status = await this.checkCache(username);

        if (status === CacheStatus.NOT_AVAILABLE_IN_CACHE || status === CacheStatus.TIMED_OUT) {
            await this.updateCache(username);
        } else if (status === CacheStatus.MISSING_USER_GROUPS) {
            await this.updateGroupCache(username);
        }

        // User data is now guaranteed to be available
        const entry = await this.cache.get(username);
        if (!entry || !entry.groups) {
            throw new Error("Cache inconsistency: missing user data after update");
        }

        return {
            username: entry.username,
            id: entry.id,
            groups: entry.groups
        };
    }

    async checkCache(username: string): Promise<CacheStatus> {
        this.ensureValidUsername(username);

        const entry = await this.cache.get(username);
        if (!entry) {
            return CacheStatus.NOT_AVAILABLE_IN_CACHE;
        }

        if (!entry.groups) {
            return CacheStatus.MISSING_USER_GROUPS;
        }

        const ageMs = Date.now() - entry.timestamp;
        if (ageMs > this.timeoutSeconds * 1000) {
            return CacheStatus.TIMED_OUT;
        }

        return CacheStatus.AVAILABLE;
    }

    async updateCache(username: string): Promise<void> {
        this.ensureValidUsername(username);

        await this.updateUsernameCache(username);
        await this.updateGroupCache(username);
    }

    async updateUsernameCache(username: string): Promise<void> {
        this.ensureValidUsername(username);

        let persons;
        try {
            persons = await this.client.getAllPages("/persons");    // token is already inside client
        } catch (err) {
            throw err;
        }

        const now = Date.now();

        // Clear entire cache
        await this.clearCache();

        // Write all persons
        for (const p of persons) {
            const uname = p[this.fieldName];
            if (!this.isValidString(uname)) continue;

            const entry: CachedUserEntry = {
                username: uname.trim(),
                id: p.id,
                timestamp: now
            };

            await this.cache.set(entry.username, entry);
        }
    }

    async updateGroupCache(username: string): Promise<void> {
        this.ensureValidUsername(username);

        const entry = await this.cache.get(username);
        if (!entry) {
            throw new Error(`Cannot update groups: user '${username}' not in cache`);
        }

        let groupsResponse;
        try {
            groupsResponse = await this.client.get(`/persons/${entry.id}/groups`);  // token is already inside client
        } catch (err) {
            throw err;
        }

        const groups = (groupsResponse as any)
            .map((g: any) => g.group?.id)
            .filter((id: any) => typeof id === "number");

        const updated: CachedUserEntry = {
            ...entry,
            groups
        };

        await this.cache.set(username, updated);
    }

    async clearCache(): Promise<void>;
    async clearCache(username: string): Promise<void>;
    async clearCache(username?: string): Promise<void> {
        if (username === undefined) {
            await this.cache.clear();
            return;
        }

        this.ensureValidUsername(username);
        await this.cache.delete(username);
    }

    // ---------------------------------------------------------------------------
    // INTERNAL HELPERS
    // ---------------------------------------------------------------------------

    private ensureValidUsername(username: any): void {
        if (!this.isValidString(username)) {
            throw new Error("Invalid username");
        }
    }

    private isValidString(value: any): value is string {
        return typeof value === "string" && value.trim().length > 0;
    }
}
