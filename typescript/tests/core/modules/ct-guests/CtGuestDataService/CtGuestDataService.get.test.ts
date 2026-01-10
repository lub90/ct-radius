import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mkdtempSync } from "fs";
import { join } from "path";
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



// Helper to build a valid user object
function makeUser(username: string, withVlan = true) {
  return {
    username,
    password: `${username}-pw`,
    ...(withVlan ? { assignedVlan: 42 } : {}),
    valid: {
      from: "2025-01-01",
      to: "2025-12-31"
    },
  };
}



// ------------------------------
// Test Suite
// ------------------------------
describe("CtGuestDataService get() parameter test", () => {
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
  // Username validation
  // ---------------------------------------------------------------------------
  it("rejects invalid usernames before touching backend", async () => {
    const svc = new CtGuestDataService(client, cachePath, 60);

    await expect(svc.get("")).rejects.toThrow("Invalid username");
    await expect(svc.get("   ")).rejects.toThrow("Invalid username");
    await expect(svc.get(null as any)).rejects.toThrow("Invalid username");

    // backend must NOT have been called
    expect(ExtensionData.prototype.getCategoryData).not.toHaveBeenCalled();
  });

  // Should return undefined when backend returns an empty array
  it("returns undefined when backend returns empty array", async () => {
    const svc = new CtGuestDataService(client, cachePath, 60);

    mockBackend.data = [];

    const result = await svc.get("ghost-user");
    expect(result).toBeUndefined();
    expect(ExtensionData.prototype.getCategoryData).toHaveBeenCalledTimes(1);
  });

  // Should return undefined when no entry matches the requested username
  it("returns undefined when backend contains users but none match the username", async () => {
    const svc = new CtGuestDataService(client, cachePath, 60);

    mockBackend.data = [
      { value: JSON.stringify({ username: "other", password: "x", valid: { from: "2025", to: "2026" } }) },
    ];

    const result = await svc.get("target");
    expect(result).toBeUndefined();
    expect(ExtensionData.prototype.getCategoryData).toHaveBeenCalledTimes(1);
  });

  // ---------------------------------------------------------------------------
  // Matching user retrieval from backend
  // ---------------------------------------------------------------------------

  it("returns the correct user when backend returns exactly one matching user", async () => {
    const svc = new CtGuestDataService(client, cachePath, 60);

    const user = makeUser("alice");
    mockBackend.data = [{ value: JSON.stringify(user) }];

    const result = await svc.get("alice");

    expect(result).toBeDefined();
    expect(result?.username).toBe("alice");
    expect(result?.password).toBe("alice-pw");
    expect(result?.assignedVlan).toBe(42);
    expect(result?.valid.from).toBeInstanceOf(Date);
  });

  it("returns the correct user when backend returns two users and one matches", async () => {
    const svc = new CtGuestDataService(client, cachePath, 60);

    mockBackend.data = [
      { value: JSON.stringify(makeUser("bob")) },
      { value: JSON.stringify(makeUser("carol")) },
    ];

    const result = await svc.get("carol");

    expect(result).toBeDefined();
    expect(result?.username).toBe("carol");
    expect(result?.password).toBe("carol-pw");
  });

  it("returns the correct user when backend returns ten users and one matches", async () => {
    const svc = new CtGuestDataService(client, cachePath, 60);

    const users = Array.from({ length: 10 }, (_, i) => makeUser(`user${i}`));
    mockBackend.data = users.map((u) => ({ value: JSON.stringify(u) }));

    const result = await svc.get("user7");

    expect(result).toBeDefined();
    expect(result?.username).toBe("user7");
    expect(result?.password).toBe("user7-pw");
  });

  // ---------------------------------------------------------------------------
  // Non-matching user retrieval from backend
  // ---------------------------------------------------------------------------

  it("returns undefined when backend returns one user but it does not match", async () => {
    const svc = new CtGuestDataService(client, cachePath, 60);

    mockBackend.data = [{ value: JSON.stringify(makeUser("alice")) }];

    const result = await svc.get("bob");
    expect(result).toBeUndefined();
  });

  it("returns undefined when backend returns two users but none match", async () => {
    const svc = new CtGuestDataService(client, cachePath, 60);

    mockBackend.data = [
      { value: JSON.stringify(makeUser("alice")) },
      { value: JSON.stringify(makeUser("bob")) },
    ];

    const result = await svc.get("carol");
    expect(result).toBeUndefined();
  });

  it("returns undefined when backend returns ten users but none match", async () => {
    const svc = new CtGuestDataService(client, cachePath, 60);

    const users = Array.from({ length: 10 }, (_, i) => makeUser(`user${i}`));
    mockBackend.data = users.map((u) => ({ value: JSON.stringify(u) }));

    const result = await svc.get("not-present");
    expect(result).toBeUndefined();
  });

  // ---------------------------------------------------------------------------
  // VLAN handling tests
  // ---------------------------------------------------------------------------

  it("returns a user that includes assignedVlan when present", async () => {
    const svc = new CtGuestDataService(client, cachePath, 60);

    const user = makeUser("alice", true);
    mockBackend.data = [{ value: JSON.stringify(user) }];

    const result = await svc.get("alice");

    expect(result).toBeDefined();
    expect(result?.username).toBe("alice");
    expect(result?.assignedVlan).toBe(42);
    expect(result?.valid.from).toBeInstanceOf(Date);
  });

  it("returns a user without assignedVlan when it is not provided", async () => {
    const svc = new CtGuestDataService(client, cachePath, 60);

    const user = makeUser("bob", false);
    mockBackend.data = [{ value: JSON.stringify(user) }];

    const result = await svc.get("bob");

    expect(result).toBeDefined();
    expect(result?.username).toBe("bob");
    expect(result?.assignedVlan).toBeUndefined();
    expect(result?.valid.from).toBeInstanceOf(Date);
  });

  it("returns the correct user with VLAN when multiple users exist", async () => {
    const svc = new CtGuestDataService(client, cachePath, 60);

    mockBackend.data = [
      { value: JSON.stringify(makeUser("user1", false)) },
      { value: JSON.stringify(makeUser("user2", true)) },
      { value: JSON.stringify(makeUser("user3", false)) },
    ];

    const result = await svc.get("user2");

    expect(result).toBeDefined();
    expect(result?.username).toBe("user2");
    expect(result?.assignedVlan).toBe(42);
  });

  it("returns the correct user without VLAN when multiple users exist", async () => {
    const svc = new CtGuestDataService(client, cachePath, 60);

    mockBackend.data = [
      { value: JSON.stringify(makeUser("userA", true)) },
      { value: JSON.stringify(makeUser("userB", false)) },
      { value: JSON.stringify(makeUser("userC", true)) },
    ];

    const result = await svc.get("userB");

    expect(result).toBeDefined();
    expect(result?.username).toBe("userB");
    expect(result?.assignedVlan).toBeUndefined();
  });

  it("returns undefined when matching user exists but has invalid VLAN type", async () => {
    const svc = new CtGuestDataService(client, cachePath, 60);

    // assignedVlan must be a non-negative integer → this violates schema
    mockBackend.data = [
      {
        value: JSON.stringify({
          username: "broken",
          password: "pw",
          assignedVlan: "not-a-number",
          valid: { from: "2025", to: "2026" }
        })
      },
    ];

    await expect(svc.get("broken")).rejects.toThrow("Guest user validation failed");
  });



});