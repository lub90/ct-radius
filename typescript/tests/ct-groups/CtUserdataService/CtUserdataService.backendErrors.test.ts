import { describe, it, expect, vi } from "vitest";
import { mkdtempSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { CtUserdataService, CacheStatus } from "../../../src/core/modules/ct-groups/CtUserdataService";

function createFakeClient() {
    return {
        getAllPages: vi.fn(),
        get: vi.fn()
    };
}

describe("CtUserdataService backend error propagation", () => {
    const username = "alice";

    let cachePath: string;

    beforeEach(() => {
        const tmp = mkdtempSync(join(tmpdir(), "ct-cache-"));
        cachePath = join(tmp, "test-cache.sqlite");
    });

    it("propagates errors from getAllPages via updateUsernameCache", async () => {
        const client = createFakeClient();
        const service = new CtUserdataService(client, "cmsUserId", cachePath, 60);

        const error = new Error("getAllPages failed");
        client.getAllPages.mockRejectedValue(error);

        await expect(service.updateUsernameCache(username)).rejects.toBe(error);
    });

    it("propagates errors from get via updateGroupCache", async () => {
        const client = createFakeClient();
        const service = new CtUserdataService(client, "cmsUserId", cachePath, 60);

        // @ts-expect-error
        await service["cache"].set(username, {
            username,
            id: 12,
            timestamp: Date.now()
        });

        const error = new Error("get failed");
        client.get.mockRejectedValue(error);

        await expect(service.updateGroupCache(username)).rejects.toBe(error);
    });

    it("propagates backend errors through get() when updateCache fails", async () => {
        const client = createFakeClient();
        const service = new CtUserdataService(client, "cmsUserId", cachePath, 60);

        vi.spyOn(service, "checkCache").mockResolvedValue(CacheStatus.NOT_AVAILABLE_IN_CACHE);

        const error = new Error("updateCache failed");
        vi.spyOn(service, "updateCache").mockRejectedValue(error);

        await expect(service.get(username)).rejects.toBe(error);
    });

    it("propagates backend errors through get() when updateGroupCache fails", async () => {
        const client = createFakeClient();
        const service = new CtUserdataService(client, "cmsUserId", cachePath, 60);

        vi.spyOn(service, "checkCache").mockResolvedValue(CacheStatus.MISSING_USER_GROUPS);

        const error = new Error("updateGroupCache failed");
        vi.spyOn(service, "updateGroupCache").mockRejectedValue(error);

        await expect(service.get(username)).rejects.toBe(error);
    });
});
