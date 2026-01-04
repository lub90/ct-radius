import { describe, it, expect, vi } from "vitest";
import { CtUserdataService } from "../../src/core/CtUserdataService";

function createFakeClient() {
  return {
    getAllPages: vi.fn(),
    get: vi.fn()
  };
}

describe("CtUserdataService.updateCache", () => {
  const cachePath = "test-cache.json";
  const username = "alice";

  it("calls updateUsernameCache and then updateGroupCache", async () => {
    const client = createFakeClient();
    const service = new CtUserdataService(client, "cmsUserId", cachePath, 60);

    const spyUpdateUser = vi
      .spyOn(service as any, "updateUsernameCache")
      .mockResolvedValue(undefined);
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
    vi.spyOn(service as any, "updateUsernameCache").mockResolvedValue(undefined);
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
