import { describe, it, expect, beforeEach } from "vitest";
import { mkdtempSync, existsSync, readFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { CtUserdataService } from "../../../../../src/core/modules/ct-groups/CtUserdataService";

function createFakeClient() {
  return {
    getAllPages: vi.fn(),
    get: vi.fn()
  };
}


describe("CtUserdataService persistence behavior", () => {
  let cachePath: string;

  beforeEach(() => {
    const tmp = mkdtempSync(join(tmpdir(), "ct-cache-"));
    cachePath = join(tmp, "test-cache.sqlite");
  });

  it("writes cache to disk and allows reopening by a new instance", async () => {

    const client1 = createFakeClient();
    const service1 = new CtUserdataService(client1, "cmsUserId", cachePath, 60);

    // Mock backend responses
    client1.getAllPages.mockResolvedValue([
      { id: 12, cmsUserId: "alice" }
    ]);
    client1.get.mockResolvedValue([
      { group: { id: 101 } }
    ]);

    // Populate cache using real logic
    await service1.updateCache("alice");

    // Ensure file exists on disk
    expect(existsSync(cachePath)).toBe(true);


    // Create a second instance reading the same file
    const client2 = createFakeClient();
    const service2 = new CtUserdataService(client2, "cmsUserId", cachePath, 60);

    // Read entry directly from disk
    // @ts-expect-error
    const entry = await service2["cache"].get("alice");
    expect(entry).toEqual({
      username: "alice",
      id: 12,
      groups: [101],
      timestamp: entry.timestamp // timestamp is dynamic
    });

    // Call the real public API
    const result = await service2.get("alice");
    // Should NOT call backend again
    expect(client2.getAllPages).not.toHaveBeenCalled();
    expect(client2.get).not.toHaveBeenCalled();
    // Should return correct user data
    expect(result).toEqual({
      username: "alice",
      id: 12,
      groups: [101]
    });

  });

  it("persists multiple entries and preserves them across instances", async () => {
    const client1 = createFakeClient();
    const service1 = new CtUserdataService(client1, "cmsUserId", cachePath, 60);

    // Mock backend responses for two users
    client1.getAllPages.mockResolvedValue([
      { id: 1, cmsUserId: "alice" },
      { id: 2, cmsUserId: "bob" }
    ]);

    client1.get.mockImplementation(async (path) => {
      if (path === "/persons/1/groups") {
        return [{ group: { id: 101 } }];
      }
      if (path === "/persons/2/groups") {
        return [{ group: { id: 202 } }];
      }
      return [];
    });

    // Populate cache using real logic
    await service1.updateCache("alice");
    await service1.updateGroupCache("bob");

    // Ensure file exists
    expect(existsSync(cachePath)).toBe(true);

    // Second instance reading the same file
    const client2 = createFakeClient();
    const service2 = new CtUserdataService(client2, "cmsUserId", cachePath, 60);

    // Read entries directly from disk
    // @ts-expect-error
    const alice = await service2["cache"].get("alice");
    // @ts-expect-error
    const bob = await service2["cache"].get("bob");

    expect(alice).toMatchObject({
      username: "alice",
      id: 1,
      groups: [101],
      timestamp: alice.timestamp // timestamp is dynamic
    });

    expect(bob).toMatchObject({
      username: "bob",
      id: 2,
      groups: [202],
      timestamp: bob.timestamp // timestamp is dynamic
    });

    // And verify the public API also works
    const aliceResult = await service2.get("alice");
    const bobResult = await service2.get("bob");

    expect(client2.getAllPages).not.toHaveBeenCalled();
    expect(client2.get).not.toHaveBeenCalled();

    expect(aliceResult).toEqual({
      username: "alice",
      id: 1,
      groups: [101]
    });

    expect(bobResult).toEqual({
      username: "bob",
      id: 2,
      groups: [202]
    });
  });


  it("supports concurrent access from two instances", async () => {
    const client = createFakeClient();

    const serviceA = new CtUserdataService(client, "cmsUserId", cachePath, 60);
    const serviceB = new CtUserdataService(client, "cmsUserId", cachePath, 60);

    // Write from A
    // @ts-expect-error
    await serviceA["cache"].set("alice", {
      username: "alice",
      id: 12,
      timestamp: Date.now()
    });

    // Write from B
    // @ts-expect-error
    await serviceB["cache"].set("bob", {
      username: "bob",
      id: 13,
      timestamp: Date.now()
    });

    // Both should see both entries
    // @ts-expect-error
    const a1 = await serviceA["cache"].get("alice");
    // @ts-expect-error
    const b1 = await serviceA["cache"].get("bob");

    // @ts-expect-error
    const a2 = await serviceB["cache"].get("alice");
    // @ts-expect-error
    const b2 = await serviceB["cache"].get("bob");

    expect(a1).toBeDefined();
    expect(b1).toBeDefined();
    expect(a2).toBeDefined();
    expect(b2).toBeDefined();
  });
  
});
