import { describe, it, expect, vi } from "vitest";
import { mkdtempSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { CtUserdataService } from "../../../src/core/modules/ct-groups/CtUserdataService";

function createFakeClient() {
    return {
        getAllPages: vi.fn(),
        get: vi.fn()
    };
}

describe("CtUserdataService.clearCache", () => {
    let cachePath: string;

    beforeEach(() => {
        const tmp = mkdtempSync(join(tmpdir(), "ct-cache-"));
        cachePath = join(tmp, "test-cache.sqlite");
    });

    it("clearCache() clears all entries", async () => {
        const client = createFakeClient();
        const service = new CtUserdataService(client, "cmsUserId", cachePath, 60);

        // @ts-expect-error
        await service["cache"].set("alice", { username: "alice", id: 12, timestamp: Date.now() });
        // @ts-expect-error
        await service["cache"].set("bob", { username: "bob", id: 13, timestamp: Date.now() });

        await service.clearCache();

        // @ts-expect-error
        const alice = await service["cache"].get("alice");
        // @ts-expect-error
        const bob = await service["cache"].get("bob");

        expect(alice).toBeUndefined();
        expect(bob).toBeUndefined();
    });

    it("clearCache(username) deletes only that username entry", async () => {
        const client = createFakeClient();
        const service = new CtUserdataService(client, "cmsUserId", cachePath, 60);

        // @ts-expect-error
        await service["cache"].set("alice", { username: "alice", id: 12, timestamp: Date.now() });
        // @ts-expect-error
        await service["cache"].set("bob", { username: "bob", id: 13, timestamp: Date.now() });

        await service.clearCache("alice");

        // @ts-expect-error
        const alice = await service["cache"].get("alice");
        // @ts-expect-error
        const bob = await service["cache"].get("bob");

        expect(alice).toBeUndefined();
        expect(bob).toEqual({
            username: "bob",
            id: 13,
            timestamp: bob.timestamp
        });
    });

    it("validates username input for clearCache(username)", async () => {
        const client = createFakeClient();
        const service = new CtUserdataService(client, "cmsUserId", cachePath, 60);

        await expect(service.clearCache("   ")).rejects.toThrow();
        // @ts-expect-error
        await expect(service.clearCache(null)).rejects.toThrow();
        // @ts-expect-error
        await expect(service.clearCache(123)).rejects.toThrow();
    });

    it("treats clearCache(undefined) the same as clearCache()", async () => {
        const client = createFakeClient();
        const service = new CtUserdataService(client, "cmsUserId", cachePath, 60);

        // Seed cache with two entries
        // @ts-expect-error
        await service["cache"].set("alice", { username: "alice", id: 1, timestamp: Date.now() });
        // @ts-expect-error
        await service["cache"].set("bob", { username: "bob", id: 2, timestamp: Date.now() });

        // Call clearCache(undefined)
        // @ts-expect-error
        await service.clearCache(undefined);

        // Both should result in an empty cache
        // @ts-expect-error
        const alice = await service["cache"].get("alice");
        // @ts-expect-error
        const bob = await service["cache"].get("bob");

        expect(alice).toBeUndefined();
        expect(bob).toBeUndefined();
    });

});
