import { describe, it, expect, beforeEach, vi } from "vitest";
import { CtUserdataService } from "../../src/core/CtUserdataService";

function createFakeClient() {
  return {
    getAllPages: vi.fn(),
    get: vi.fn()
  };
}

describe("CtUserdataService cache consistency", () => {
  const cachePath = "test-cache.json";
  const username = "alice";

  beforeEach(() => {
    vi.useFakeTimers();
  });

  it("does not change existing cache entry when updateUsernameCache fails", async () => {
    const client = createFakeClient();
    const service = new CtUserdataService(client, "cmsUserId", cachePath, 60);

    const originalEntry = {
      username,
      id: 12,
      groups: [101],
      timestamp: Date.now()
    };

    // @ts-expect-error
    await service["cache"].set(username, originalEntry);

    const error = new Error("getAllPages failed");
    client.getAllPages.mockRejectedValue(error);

    await expect(service.updateUsernameCache(username)).rejects.toBe(error);

    // @ts-expect-error
    const entry = await service["cache"].get(username);
    expect(entry).toEqual(originalEntry);
  });

  it("does not change existing cache entry when updateGroupCache fails", async () => {
    const client = createFakeClient();
    const service = new CtUserdataService(client, "cmsUserId", cachePath, 60);

    const originalEntry = {
      username,
      id: 12,
      groups: [101],
      timestamp: Date.now()
    };

    // @ts-expect-error
    await service["cache"].set(username, originalEntry);

    const error = new Error("get failed");
    client.get.mockRejectedValue(error);

    await expect(service.updateGroupCache(username)).rejects.toBe(error);

    // @ts-expect-error
    const entry = await service["cache"].get(username);
    expect(entry).toEqual(originalEntry);
  });
});
