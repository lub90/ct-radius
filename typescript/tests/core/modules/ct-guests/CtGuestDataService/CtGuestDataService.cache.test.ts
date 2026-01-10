import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mkdtempSync, existsSync, unlinkSync } from "fs";
import { join, dirname } from "path";
import { tmpdir } from "os";

import { CtGuestDataService } from "../../../../../src/core/modules/ct-guests/CtGuestDataService";
import type { ChurchToolsClientType } from "../../../../../src/core/churchtoolsSetup";




// ------------------------------
// Mock ExtensionData
// ------------------------------
const mockBackend = {
  data: undefined as any[] | undefined,
  throwOnGet: false,
};

vi.mock("../../../../../src/ct-utils/lib/ExtensionData", () => {
  const getCategoryData = vi.fn(async (name: string, single: boolean = false) => {
    if (mockBackend.throwOnGet) {
      throw new Error("backend-error");
    }
    return mockBackend.data ?? [];
  });

  class ExtensionData {
    constructor(_client: any, _key: string) { }
  }

  // Attach spy to prototype so Vitest can track calls
  ExtensionData.prototype.getCategoryData = getCategoryData;

  return { ExtensionData };
});

import { ExtensionData } from "../../../../../src/ct-utils/lib/ExtensionData";

// ------------------------------
// Test Suite
// ------------------------------
describe("CtGuestDataService cache tests", () => {
  let client: ChurchToolsClientType;
  let cachePath: string;

  beforeEach(() => {
    vi.clearAllMocks();
    mockBackend.data = undefined;
    mockBackend.throwOnGet = false;

    client = {
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
    } as any;

    const tmp = mkdtempSync(join(tmpdir(), "ct-cache-"));
    cachePath = join(tmp, "test-cache.sqlite");
  });



  // ---------------------------------------------------------------------------
  // Cache miss → backend fetch → cache write → return user
  // ---------------------------------------------------------------------------
  it("fetches from backend on cache miss, caches result, and returns parsed user", async () => {
    const svc = new CtGuestDataService(client, cachePath, 60);

    const user = {
      username: "guest1",
      password: "pw1",
      valid: {
        from: "2025-01-01T00:00:00Z",
        to: "2025-12-31T23:59:59Z"
      },
      assignedVlan: 10,
    };

    mockBackend.data = [{ value: JSON.stringify(user) }];

    const result = await svc.get("guest1");
    expect(result).toBeDefined();
    expect(result?.username).toBe("guest1");
    expect(result?.assignedVlan).toBe(10);
    expect(result?.valid.from).toBeInstanceOf(Date);
    expect(result?.valid.to).toBeInstanceOf(Date);

    // backend now empty → must still return cached value
    mockBackend.data = [];
    const cached = await svc.get("guest1");
    expect(cached?.password).toBe("pw1");
    expect(cached?.assignedVlan).toBe(10);
    expect(cached?.valid.from).toBeInstanceOf(Date);
    expect(cached?.valid.to).toBeInstanceOf(Date);

    // backend must have been called exactly once
    expect(ExtensionData.prototype.getCategoryData).toHaveBeenCalledTimes(1);
  });

  // ---------------------------------------------------------------------------
  // Cache hit → no backend call
  // ---------------------------------------------------------------------------
  it("returns cached user without calling backend again", async () => {
    const svc = new CtGuestDataService(client, cachePath, 60);

    const internal = svc as any;

    // Prepare a valid cached entry exactly as CtGuestDataService stores it
    const cachedUser = {
      username: "guest2",
      password: "pw2",
      valid: {
        from: new Date("2025-01-01T00:00:00Z"),
        to: new Date("2025-12-31T23:59:59Z"),
      },
    };

    // Insert directly into Keyv cache
    await internal.cache.set("guest2", {
      user: cachedUser,
      timestamp: Date.now(), // required for TTL logic
      data: cachedUser,
    });
    const setTest = await internal.cache.get("guest2");
    expect(setTest).toBeDefined();

    // Ensure backend would return nothing if called
    mockBackend.data = [];

    // Now call get() — it must return the cached value without backend access
    const result = await svc.get("guest2");

    expect(result).toBeDefined();
    expect(result?.username).toBe("guest2");
    expect(result?.password).toBe("pw2");

    // Ensure backend was NOT called
    expect(ExtensionData.prototype.getCategoryData).not.toHaveBeenCalled();
  });


  // ---------------------------------------------------------------------------
  // TTL expiration → backend refresh
  // ---------------------------------------------------------------------------
  it("refreshes cache when TTL expired", async () => {
    // TTL = 0 means: every cache entry is considered expired immediately
    const svc = new CtGuestDataService(client, cachePath, 0);

    const internal = svc as any;

    // First cached user (expired immediately because TTL = 0)
    const cachedUser = {
      username: "guest3",
      password: "old",
      valid: {
        from: new Date("2025-01-01"),
        to: new Date("2025-12-31"),
      },
    };

    // Insert expired entry directly into cache
    await internal.cache.set("guest3", {
      user: cachedUser,
      timestamp: Date.now() - 10000, // ensure it's considered expired
    });

    // Backend now returns a NEW version of the user
    const backendUser = {
      username: "guest3",
      password: "new",
      valid: {
        from: "2025-01-01",
        to: "2025-12-31",
      },
    };

    mockBackend.data = [{ value: JSON.stringify(backendUser) }];

    // Calling get() must refresh the cache and return the new backend value
    const refreshed = await svc.get("guest3");

    expect(refreshed).toBeDefined();
    expect(refreshed?.password).toBe("new");

    // Ensure backend was actually called due to TTL expiration
    expect(ExtensionData.prototype.getCategoryData).toHaveBeenCalled();
  });


  // ---------------------------------------------------------------------------
  // clearCache()
  // ---------------------------------------------------------------------------
  it("clears the cache so the next get() forces a backend fetch", async () => {
    const svc = new CtGuestDataService(client, cachePath, 60);
    const internal = svc as any;

    // Insert a cached entry directly into Keyv
    const cachedUser = {
      username: "guest4",
      password: "pw4",
      valid: {
        from: new Date("2025-01-01"),
        to: new Date("2025-12-31"),
      },
    };

    await internal.cache.set("guest4", {
      user: cachedUser,
      timestamp: Date.now(),
    });

    // Ensure the entry is actually present before clearing
    const before = await internal.cache.get("guest4");
    expect(before).toBeDefined();
    expect(before.user.username).toBe("guest4");

    // Clear the cache
    await svc.clearCache();

    // Verify the cache entry is gone
    const after = await internal.cache.get("guest4");
    expect(after).toBeUndefined();

    // Backend now returns nothing → get() must return undefined
    mockBackend.data = [];

    const result = await svc.get("guest4");
    expect(result).toBeUndefined();

    // And backend must have been called because cache was empty
    expect(ExtensionData.prototype.getCategoryData).toHaveBeenCalled();
  });

});
