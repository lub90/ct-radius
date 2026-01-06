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

describe("CtUserdataService.checkCache", () => {
  const username = "alice";
  let cachePath: string;

  beforeEach(() => {
    const tmp = mkdtempSync(join(tmpdir(), "ct-cache-"));
    cachePath = join(tmp, "test-cache.sqlite");
  });

  it("returns NOT_AVAILABLE_IN_CACHE when no entry exists", async () => {
    const client = createFakeClient();
    const service = new CtUserdataService(client, "cmsUserId", cachePath, 60);

    const status = await service.checkCache(username);

    expect(status).toBe(CacheStatus.NOT_AVAILABLE_IN_CACHE);
  });

  it("returns MISSING_USER_GROUPS when entry has no groups", async () => {
    const client = createFakeClient();
    const service = new CtUserdataService(client, "cmsUserId", cachePath, 60);

    const now = Date.now();
    vi.setSystemTime(now);

    // @ts-expect-error access internal cache
    await service["cache"].set(username, {
      username,
      id: 12,
      timestamp: now
      // groups is intentionally missing
    });

    const status = await service.checkCache(username);

    expect(status).toBe(CacheStatus.MISSING_USER_GROUPS);
  });

  it("returns TIMED_OUT when entry is older than timeoutSeconds", async () => {
    const client = createFakeClient();
    const timeoutSeconds = 60;
    const service = new CtUserdataService(client, "cmsUserId", cachePath, timeoutSeconds);

    const now = Date.now();
    vi.setSystemTime(now);

    const oldTimestamp = now - (timeoutSeconds * 1000 + 1);

    // @ts-expect-error
    await service["cache"].set(username, {
      username,
      id: 12,
      groups: [101],
      timestamp: oldTimestamp
    });

    const status = await service.checkCache(username);

    expect(status).toBe(CacheStatus.TIMED_OUT);
  });

  it("returns AVAILABLE when entry is fresh and has groups", async () => {
    const client = createFakeClient();
    const timeoutSeconds = 60;
    const service = new CtUserdataService(client, "cmsUserId", cachePath, timeoutSeconds);

    const now = Date.now();
    vi.setSystemTime(now);

    const freshTimestamp = now - (timeoutSeconds * 1000 - 1000);

    // @ts-expect-error
    await service["cache"].set(username, {
      username,
      id: 12,
      groups: [101, 102],
      timestamp: freshTimestamp
    });

    const status = await service.checkCache(username);

    expect(status).toBe(CacheStatus.AVAILABLE);
  });
});
