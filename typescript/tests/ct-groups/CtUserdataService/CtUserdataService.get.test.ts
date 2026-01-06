import { describe, it, expect, beforeEach, vi } from "vitest";
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

describe("CtUserdataService.get", () => {
    const username = "alice";
    let cachePath: string;

    beforeEach(() => {
        const tmp = mkdtempSync(join(tmpdir(), "ct-cache-"));
        cachePath = join(tmp, "test-cache.json");
    });

    it("validates username input", async () => {
        const client = createFakeClient();
        const service = new CtUserdataService(client, "cmsUserId", cachePath, 60);

        await expect(service.get("   ")).rejects.toThrow();
        // @ts-expect-error
        await expect(service.get(undefined)).rejects.toThrow();
        // @ts-expect-error
        await expect(service.get(null)).rejects.toThrow();
        // @ts-expect-error
        await expect(service.get(123)).rejects.toThrow();
    });

    it("returns cached data directly when AVAILABLE", async () => {
        const client = createFakeClient();
        const service = new CtUserdataService(client, "cmsUserId", cachePath, 60);

        const now = Date.now();
        vi.setSystemTime(now);

        // @ts-expect-error
        await service["cache"].set(username, {
            username,
            id: 12,
            groups: [101, 102],
            timestamp: now
        });

        const spyCheckCache = vi.spyOn(service, "checkCache");
        const spyUpdateCache = vi.spyOn(service, "updateCache");
        const spyUpdateGroups = vi.spyOn(service, "updateGroupCache");

        const result = await service.get(username);

        expect(spyCheckCache).toHaveBeenCalledWith(username);
        expect(spyUpdateCache).not.toHaveBeenCalled();
        expect(spyUpdateGroups).not.toHaveBeenCalled();

        expect(result).toEqual({
            username,
            id: 12,
            groups: [101, 102]
        });
    });

    it("calls updateCache when cache status is NOT_AVAILABLE_IN_CACHE", async () => {
        const client = createFakeClient();
        const service = new CtUserdataService(client, "cmsUserId", cachePath, 60);

        const spyCheckCache = vi
            .spyOn(service, "checkCache")
            .mockResolvedValue(CacheStatus.NOT_AVAILABLE_IN_CACHE);
        const spyUpdateCache = vi
            .spyOn(service, "updateCache")
            .mockImplementation(async (u: string) => {
                // Simulate that updateCache populated the cache
                // @ts-expect-error
                await service["cache"].set(u, {
                    username: u,
                    id: 12,
                    groups: [101],
                    timestamp: Date.now()
                });
            });

        const result = await service.get(username);

        expect(spyCheckCache).toHaveBeenCalledWith(username);
        expect(spyUpdateCache).toHaveBeenCalledWith(username);

        expect(result).toEqual({
            username,
            id: 12,
            groups: [101]
        });
    });

    it("calls updateCache when cache status is TIMED_OUT", async () => {
        const client = createFakeClient();
        const service = new CtUserdataService(client, "cmsUserId", cachePath, 60);

        const spyCheckCache = vi
            .spyOn(service, "checkCache")
            .mockResolvedValue(CacheStatus.TIMED_OUT);
        const spyUpdateCache = vi
            .spyOn(service, "updateCache")
            .mockImplementation(async (u: string) => {
                // Simulate that updateCache populated the cache
                // @ts-expect-error
                await service["cache"].set(u, {
                    username: u,
                    id: 12,
                    groups: [101],
                    timestamp: Date.now()
                });
            });


        const result = await service.get(username);

        expect(spyCheckCache).toHaveBeenCalledWith(username);
        expect(spyUpdateCache).toHaveBeenCalledWith(username);

        expect(result).toEqual({
            username,
            id: 12,
            groups: [101]
        });
    });

    it("calls updateGroupCache when cache status is MISSING_USER_GROUPS", async () => {
        const client = createFakeClient();
        const service = new CtUserdataService(client, "cmsUserId", cachePath, 60);

        const spyCheckCache = vi
            .spyOn(service, "checkCache")
            .mockResolvedValue(CacheStatus.MISSING_USER_GROUPS);
        const spyUpdateCache = vi.spyOn(service, "updateCache");
        const spyUpdateGroups = vi
            .spyOn(service, "updateGroupCache")
            .mockImplementation(async (u: string) => {
                // @ts-expect-error
                const existing = await service["cache"].get(u);
                // Simulate groups being added
                // @ts-expect-error
                await service["cache"].set(u, {
                    ...(existing ?? { username: u, id: 12 }),
                    groups: [101, 102]
                });
            });

        // Seed cache without groups
        // @ts-expect-error
        await service["cache"].set(username, {
            username,
            id: 12,
            timestamp: Date.now()
        });

        const result = await service.get(username);

        expect(spyCheckCache).toHaveBeenCalledWith(username);
        expect(spyUpdateCache).not.toHaveBeenCalled();
        expect(spyUpdateGroups).toHaveBeenCalledWith(username);

        expect(result).toEqual({
            username,
            id: 12,
            groups: [101, 102]
        });
    });

    it("propagates errors from updateCache", async () => {
        const client = createFakeClient();
        const service = new CtUserdataService(client, "cmsUserId", cachePath, 60);

        vi.spyOn(service, "checkCache").mockResolvedValue(CacheStatus.NOT_AVAILABLE_IN_CACHE);
        const error = new Error("updateCache failed");
        vi.spyOn(service, "updateCache").mockRejectedValue(error);

        await expect(service.get(username)).rejects.toBe(error);
    });

    it("propagates errors from updateGroupCache", async () => {
        const client = createFakeClient();
        const service = new CtUserdataService(client, "cmsUserId", cachePath, 60);

        vi.spyOn(service, "checkCache").mockResolvedValue(CacheStatus.MISSING_USER_GROUPS);
        const error = new Error("updateGroupCache failed");
        vi.spyOn(service, "updateGroupCache").mockRejectedValue(error);

        await expect(service.get(username)).rejects.toBe(error);
    });
});
