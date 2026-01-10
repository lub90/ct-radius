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
  return {
    ExtensionData: class {
      constructor(_client: any, _key: string) { }
      async getCategoryData(_name: string, _single = false) {
        if (mockBackend.throwOnGet) throw new Error("backend-error");
        return mockBackend.data ?? [];
      }
    },
  };
});

// ------------------------------
// Test Suite
// ------------------------------
describe("CtGuestDataService (real Keyv + mocked backend)", () => {
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
  // Backend errors
  // ---------------------------------------------------------------------------
  it("throws descriptive error when backend fails", async () => {
    const svc = new CtGuestDataService(client, cachePath, 60);

    mockBackend.throwOnGet = true;

    await expect(svc.get("guest5")).rejects.toThrow(
      "Failed to load guest data from ChurchTools"
    );
  });

  // ---------------------------------------------------------------------------
  // Invalid backend data
  // ---------------------------------------------------------------------------
  it("throws when backend returns non-array", async () => {
    const svc = new CtGuestDataService(client, cachePath, 60);

    mockBackend.data = {} as any;

    await expect(svc.get("x")).rejects.toThrow("Guest user data must be an array");
  });

  it("throws when backend entry has no value", async () => {
    const svc = new CtGuestDataService(client, cachePath, 60);

    mockBackend.data = [{}] as any;

    await expect(svc.get("x")).rejects.toThrow("Invalid guest user data retrieved");
  });

  it("throws when backend entry contains invalid JSON", async () => {
    const svc = new CtGuestDataService(client, cachePath, 60);

    mockBackend.data = [{ value: "not-json" }];

    await expect(svc.get("x")).rejects.toThrow("Failed to parse guest user data");
  });

  it("throws when schema validation fails", async () => {
    const svc = new CtGuestDataService(client, cachePath, 60);

    mockBackend.data = [
      { value: JSON.stringify({ username: "", password: "p", valid: { from: "2025", to: "2026" } }) },
    ];

    await expect(svc.get("x")).rejects.toThrow("Guest user validation failed");
  });


  it("throws when backend value is not a string (number)", async () => {
    const svc = new CtGuestDataService(client, cachePath, 60);

    mockBackend.data = [{ value: 123 as any }];

    await expect(svc.get("x")).rejects.toThrow();
  });

  it("throws when backend value is null", async () => {
    const svc = new CtGuestDataService(client, cachePath, 60);

    mockBackend.data = [{ value: null as any }];

    await expect(svc.get("x")).rejects.toThrow();
  });

  it("throws when backend value is an object instead of JSON string", async () => {
    const svc = new CtGuestDataService(client, cachePath, 60);

    mockBackend.data = [{ value: { foo: "bar" } as any }];

    await expect(svc.get("x")).rejects.toThrow("Failed to parse guest user data");
  });

  // Should throw when required fields are missing
  it("throws when backend JSON is missing required fields", async () => {
    const svc = new CtGuestDataService(client, cachePath, 60);

    mockBackend.data = [
      { value: JSON.stringify({ password: "pw", valid: { from: "2025", to: "2026" } }) }, // missing username
    ];

    await expect(svc.get("x")).rejects.toThrow("Guest user validation failed");
  });

});
