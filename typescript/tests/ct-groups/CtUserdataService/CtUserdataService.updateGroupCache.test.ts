import { describe, it, expect, beforeEach, vi } from "vitest";
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

describe("CtUserdataService.updateGroupCache", () => {
  const username = "alice";
  let cachePath: string;

  beforeEach(() => {
    const tmp = mkdtempSync(join(tmpdir(), "ct-cache-"));
    cachePath = join(tmp, "test-cache.sqlite");
  });


  it("updates groups for existing user while preserving timestamp", async () => {
    const client = createFakeClient();
    const service = new CtUserdataService(client, "cmsUserId", cachePath, 60);

    const originalTimestamp = Date.now() - 1000;

    // @ts-expect-error
    await service["cache"].set(username, {
      username,
      id: 12,
      timestamp: originalTimestamp
      // no groups yet
    });

    client.get.mockResolvedValue([
      { group: { id: 101 } },
      { group: { id: 102 } }
    ]);

    await service.updateGroupCache(username);

    // @ts-expect-error
    const updated = await service["cache"].get(username);

    expect(updated).toEqual({
      username,
      id: 12,
      groups: [101, 102],
      timestamp: originalTimestamp
    });

    expect(client.get).toHaveBeenCalledTimes(1);
    expect(client.get).toHaveBeenCalledWith("/persons/12/groups");
  });

  it("throws if user is not present in cache", async () => {
    const client = createFakeClient();
    const service = new CtUserdataService(client, "cmsUserId", cachePath, 60);

    await expect(service.updateGroupCache(username)).rejects.toThrow();
    expect(client.get).not.toHaveBeenCalled();
  });

  it("throws and does not modify cache if backend get throws", async () => {
    const client = createFakeClient();
    const service = new CtUserdataService(client, "cmsUserId", cachePath, 60);

    const originalTimestamp = Date.now() - 1000;

    // @ts-expect-error
    await service["cache"].set(username, {
      username,
      id: 12,
      timestamp: originalTimestamp
    });

    const error = new Error("groups failed");
    client.get.mockRejectedValue(error);

    await expect(service.updateGroupCache(username)).rejects.toBe(error);

    // @ts-expect-error
    const entry = await service["cache"].get(username);
    expect(entry).toEqual({
      username,
      id: 12,
      timestamp: originalTimestamp
    });
  });

  it("validates username input", async () => {
    const client = createFakeClient();
    const service = new CtUserdataService(client, "cmsUserId", cachePath, 60);

    await expect(service.updateGroupCache("   ")).rejects.toThrow();
    // @ts-expect-error
    await expect(service.updateGroupCache(undefined)).rejects.toThrow();
    // @ts-expect-error
    await expect(service.updateGroupCache(null)).rejects.toThrow();
    // @ts-expect-error
    await expect(service.updateGroupCache(123)).rejects.toThrow();
  });
});
