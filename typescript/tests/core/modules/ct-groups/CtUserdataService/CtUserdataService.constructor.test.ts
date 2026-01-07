import { describe, it, expect } from "vitest";
import { mkdtempSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { CtUserdataService } from "../../../../../src/core/modules/ct-groups/CtUserdataService";

function createFakeClient() {
  return {
    getAllPages: () => Promise.resolve([]),
    get: () => Promise.resolve([])
  };
}

describe("CtUserdataService constructor", () => {
  let cachePath: string;

  beforeEach(() => {
    const tmp = mkdtempSync(join(tmpdir(), "ct-cache-"));
    cachePath = join(tmp, "test-cache.sqlite");
  });

  it("creates an instance with valid arguments", () => {
    const client = createFakeClient();
    const service = new CtUserdataService(client, "cmsUserId", cachePath, 60);

    expect(service).toBeInstanceOf(CtUserdataService);
  });

  it("throws if churchtoolsClient is undefined", () => {
    expect(() => {
      // @ts-expect-error
      new CtUserdataService(undefined, "cmsUserId", cachePath, 60);
    }).toThrow();
  });

  it("throws if churchtoolsClient is null", () => {
    expect(() => {
      // @ts-expect-error
      new CtUserdataService(null, "cmsUserId", cachePath, 60);
    }).toThrow();
  });

  it("throws if fieldName is missing, empty or whitespace", () => {
    const client = createFakeClient();

    // @ts-expect-error
    expect(() => new CtUserdataService(client, undefined, cachePath, 60)).toThrow();
    // @ts-expect-error
    expect(() => new CtUserdataService(client, null, cachePath, 60)).toThrow();
    expect(() => new CtUserdataService(client, "", cachePath, 60)).toThrow();
    expect(() => new CtUserdataService(client, "   ", cachePath, 60)).toThrow();
  });

  it("throws if cachePath is missing, empty, whitespace or does not end with .sqlite", () => {
    const client = createFakeClient();

    // @ts-expect-error
    expect(() => new CtUserdataService(client, "cmsUserId", undefined, 60)).toThrow();
    // @ts-expect-error
    expect(() => new CtUserdataService(client, "cmsUserId", null, 60)).toThrow();
    expect(() => new CtUserdataService(client, "cmsUserId", "", 60)).toThrow();
    expect(() => new CtUserdataService(client, "cmsUserId", "   ", 60)).toThrow();
    expect(() => new CtUserdataService(client, "cmsUserId", "cache.json", 60)).toThrow();
  });

  it("accepts timeoutSeconds equal to 0", () => {
    const client = createFakeClient();
    const service = new CtUserdataService(client, "cmsUserId", cachePath, 0);

    expect(service).toBeInstanceOf(CtUserdataService);
  });

  it("throws if timeoutSeconds is negative", () => {
    const client = createFakeClient();

    expect(() => new CtUserdataService(client, "cmsUserId", cachePath, -1)).toThrow();
  });

  it("throws if timeoutSeconds is not a number", () => {
    const client = createFakeClient();

    // @ts-expect-error
    expect(() => new CtUserdataService(client, "cmsUserId", cachePath, "abc")).toThrow();
    // @ts-expect-error
    expect(() => new CtUserdataService(client, "cmsUserId", cachePath, NaN)).toThrow();
  });
});
