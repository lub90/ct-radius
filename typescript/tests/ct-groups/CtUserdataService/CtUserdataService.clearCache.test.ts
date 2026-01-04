import { describe, it, expect, vi } from "vitest";
import { CtUserdataService } from "../../src/core/CtUserdataService";

function createFakeClient() {
    return {
        getAllPages: vi.fn(),
        get: vi.fn()
    };
}

describe("CtUserdataService.clearCache", () => {
    const cachePath = "test-cache.json";

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
        await expect(service.clearCache(undefined)).rejects.toThrow();
        // @ts-expect-error
        await expect(service.clearCache(null)).rejects.toThrow();
        // @ts-expect-error
        await expect(service.clearCache(123)).rejects.toThrow();
    });
});
