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

describe("CtUserdataService.updateCache", () => {
  const username = "alice";
  let cachePath: string;

  beforeEach(() => {
    const tmp = mkdtempSync(join(tmpdir(), "ct-cache-"));
    cachePath = join(tmp, "test-cache.sqlite");
  });


  it("calls updateUsernameCache and then updateGroupCache", async () => {
    const client = createFakeClient();
    const service = new CtUserdataService(client, "cmsUserId", cachePath, 60);

    const spyUpdateUser = vi
      .spyOn(service as any, "updateUsernameCache")
      .mockImplementation(async (u: string) => {
        // simulate that the username update populated the cache
        // @ts-expect-error access internal cache
        await service["cache"].set(u, {
          username: u,
          id: 12,
          timestamp: Date.now()
        });
      });
    const spyUpdateGroups = vi
      .spyOn(service as any, "updateGroupCache")
      .mockResolvedValue(undefined);

    await service.updateCache(username);

    expect(spyUpdateUser).toHaveBeenCalledTimes(1);
    expect(spyUpdateUser).toHaveBeenCalledWith(username);
    expect(spyUpdateGroups).toHaveBeenCalledTimes(1);
    expect(spyUpdateGroups).toHaveBeenCalledWith(username);
  });

  it("does not call updateGroupCache if updateUsernameCache throws", async () => {
    const client = createFakeClient();
    const service = new CtUserdataService(client, "cmsUserId", cachePath, 60);

    const error = new Error("username update failed");
    const spyUpdateUser = vi
      .spyOn(service as any, "updateUsernameCache")
      .mockRejectedValue(error);
    const spyUpdateGroups = vi
      .spyOn(service as any, "updateGroupCache")
      .mockResolvedValue(undefined);

    await expect(service.updateCache(username)).rejects.toBe(error);

    expect(spyUpdateUser).toHaveBeenCalledTimes(1);
    expect(spyUpdateGroups).not.toHaveBeenCalled();
  });

  it("propagates errors from updateGroupCache", async () => {
    const client = createFakeClient();
    const service = new CtUserdataService(client, "cmsUserId", cachePath, 60);

    const error = new Error("group update failed");
    vi.spyOn(service as any, "updateUsernameCache").mockImplementation(async (u: string) => {
      // simulate populated cache so updateGroupCache gets called
      // @ts-expect-error access internal cache
      await service["cache"].set(u, {
        username: u,
        id: 12,
        timestamp: Date.now()
      });
    });
    vi.spyOn(service as any, "updateGroupCache").mockRejectedValue(error);

    await expect(service.updateCache(username)).rejects.toBe(error);
  });

  it("validates username input", async () => {
    const client = createFakeClient();
    const service = new CtUserdataService(client, "cmsUserId", cachePath, 60);

    await expect(service.updateCache("   ")).rejects.toThrow();
    // @ts-expect-error
    await expect(service.updateCache(undefined)).rejects.toThrow();
    // @ts-expect-error
    await expect(service.updateCache(null)).rejects.toThrow();
    // @ts-expect-error
    await expect(service.updateCache(123)).rejects.toThrow();
  });
});
