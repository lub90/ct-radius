import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mkdtempSync, existsSync, unlinkSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

import { CtGuestDataService } from "../../../../../src/core/modules/ct-guests/CtGuestDataService";
import type { ChurchToolsClientType } from "../../../../../src/core/churchtoolsSetup";

describe("Constructor validation", () => {
    let cachePath: string;
    let client: ChurchToolsClientType;

    beforeEach(() => {
        // Create a unique temporary directory and SQLite file for each test
        const tmp = mkdtempSync(join(tmpdir(), "ct-cache-"));
        cachePath = join(tmp, "test-cache.sqlite");

        client = {
            get: vi.fn(),
            post: vi.fn(),
            put: vi.fn(),
            delete: vi.fn(),
        } as any;
    });


    it("creates a working Keyv SQLite store with valid parameters", async () => {
        // Should NOT throw when all parameters are valid
        const svc = new CtGuestDataService(client, cachePath, 60);
        expect(svc).toBeDefined();

        const internal = svc as any;

        // Check that constructor stored the parameters correctly
        expect(internal.client).toBe(client);
        expect(internal.timeoutSeconds).toBe(60);

        // Check that Keyv instance exists
        expect(internal.cache).toBeDefined();
        expect(typeof internal.cache.get).toBe("function");

        // Force a write to ensure SQLite file is created
        await internal.cache.set("test-key", {
            username: "x",
            data: {},
            timestamp: Date.now(),
        });

        // Check that the SQLite file exists on disk
        expect(existsSync(cachePath)).toBe(true);

        // Check that reading from the cache works
        const entry = await internal.cache.get("test-key");
        expect(entry).toBeDefined();
        expect(entry.username).toBe("x");
    });

    // ---------------------------------------------------------------------------
    // Constructor should throw for invalid ChurchTools client
    // ---------------------------------------------------------------------------
    it("throws when ChurchTools client is null, undefined, or not an object", () => {
        expect(() => new CtGuestDataService(null as any, cachePath, 60))
            .toThrow("Invalid ChurchTools client");

        expect(() => new CtGuestDataService(undefined as any, cachePath, 60))
            .toThrow("Invalid ChurchTools client");

        expect(() => new CtGuestDataService("not-an-object" as any, cachePath, 60))
            .toThrow("Invalid ChurchTools client");
    });

    // ---------------------------------------------------------------------------
    // Constructor should throw for invalid cachePath
    // ---------------------------------------------------------------------------
    it("throws when cachePath is empty, whitespace, or null", () => {
        expect(() => new CtGuestDataService(client, "", 60))
            .toThrow("Invalid cachePath");

        expect(() => new CtGuestDataService(client, "   ", 60))
            .toThrow("Invalid cachePath");

        expect(() => new CtGuestDataService(client, null as any, 60))
            .toThrow("Invalid cachePath");
    });

    it("throws when cachePath does not end with .sqlite", () => {
        expect(() => new CtGuestDataService(client, "/tmp/cache.db", 60))
            .toThrow("Invalid cachePath");

        expect(() => new CtGuestDataService(client, "/tmp/cache.sqlite3", 60))
            .toThrow("Invalid cachePath");

        expect(() => new CtGuestDataService(client, "/tmp/cache", 60))
            .toThrow("Invalid cachePath");
    });

    // ---------------------------------------------------------------------------
    // Constructor should throw for invalid timeoutSeconds
    // ---------------------------------------------------------------------------
    it("throws when timeoutSeconds is negative or not a number", () => {
        expect(() => new CtGuestDataService(client, cachePath, -1))
            .toThrow("Invalid timeoutSeconds");

        expect(() => new CtGuestDataService(client, cachePath, "60" as any))
            .toThrow("Invalid timeoutSeconds");

        expect(() => new CtGuestDataService(client, cachePath, NaN))
            .toThrow("Invalid timeoutSeconds");
    });

    // ---------------------------------------------------------------------------
    // Timeout = 0 should be allowed
    // ---------------------------------------------------------------------------
    it("accepts timeoutSeconds = 0 (cache always expired)", () => {
        const svc = new CtGuestDataService(client, cachePath, 0);
        expect(svc).toBeDefined();

        const internal = svc as any;
        expect(internal.timeoutSeconds).toBe(0);
    });
});
