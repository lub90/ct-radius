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

describe("CtUserdataService.updateUsernameCache", () => {
  let cachePath: string;

  beforeEach(() => {
    const tmp = mkdtempSync(join(tmpdir(), "ct-cache-"));
    cachePath = join(tmp, "test-cache.sqlite");
  });

  it("loads all persons from backend, clears cache and writes them with current timestamp", async () => {
    const client = createFakeClient();
    const now = new Date("2026-01-01T00:00:00Z");
    vi.setSystemTime(now);

    client.getAllPages.mockResolvedValue([
        { id: 12, cmsUserId: "alice" },
        { id: 13, cmsUserId: "bob" }
      ]);

    const service = new CtUserdataService(client, "cmsUserId", cachePath, 60);

    // Pre-fill cache with something that should be cleared
    // @ts-expect-error
    await service["cache"].set("oldUser", {
      username: "oldUser",
      id: 1,
      timestamp: Date.now()
    });

    await service.updateUsernameCache("alice");

    // old entry must be gone
    // @ts-expect-error
    const oldEntry = await service["cache"].get("oldUser");
    expect(oldEntry).toBeUndefined();

    // new entries must exist
    // @ts-expect-error
    const alice = await service["cache"].get("alice");
    // @ts-expect-error
    const bob = await service["cache"].get("bob");

    expect(alice).toEqual({
      username: "alice",
      id: 12,
      timestamp: now.getTime()
    });
    expect(bob).toEqual({
      username: "bob",
      id: 13,
      timestamp: now.getTime()
    });

    expect(client.getAllPages).toHaveBeenCalledTimes(1);
    expect(client.getAllPages).toHaveBeenCalledWith("/persons");
  });

  it("throws and does not modify cache if backend getAllPages throws", async () => {
    const client = createFakeClient();
    const service = new CtUserdataService(client, "cmsUserId", cachePath, 60);

    // Seed cache
    // @ts-expect-error
    await service["cache"].set("alice", {
      username: "alice",
      id: 12,
      timestamp: Date.now()
    });

    const error = new Error("backend failed");
    client.getAllPages.mockRejectedValue(error);

    await expect(service.updateUsernameCache("alice")).rejects.toBe(error);

    // Cache should remain unchanged
    // @ts-expect-error
    const entry = await service["cache"].get("alice");
    expect(entry).toEqual({
      username: "alice",
      id: 12,
      timestamp: entry.timestamp // same structure; we don't care about exact time here
    });
  });

  it("validates username input", async () => {
    const client = createFakeClient();
    const service = new CtUserdataService(client, "cmsUserId", cachePath, 60);

    await expect(service.updateUsernameCache("   ")).rejects.toThrow();
    // @ts-expect-error
    await expect(service.updateUsernameCache(undefined)).rejects.toThrow();
    // @ts-expect-error
    await expect(service.updateUsernameCache(null)).rejects.toThrow();
    // @ts-expect-error
    await expect(service.updateUsernameCache(123)).rejects.toThrow();
  });
});
