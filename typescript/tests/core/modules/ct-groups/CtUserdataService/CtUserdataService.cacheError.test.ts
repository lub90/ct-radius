import { describe, it, expect, vi } from "vitest";
import { mkdtempSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { CtUserdataService } from "../../../../../src/core/modules/ct-groups/CtUserdataService";

function createFakeClient() {
    return {
        getAllPages: vi.fn(),
        get: vi.fn()
    };
}

describe("CtUserdataService cache error handling", () => {
    it("throws when the underlying Keyv cache emits an error", async () => {
        const tmp = mkdtempSync(join(tmpdir(), "ct-cache-"));
        const cachePath = join(tmp, "test-cache.sqlite");

        const client = createFakeClient();
        const service = new CtUserdataService(client, "cmsUserId", cachePath, 60);

        const error = new Error("cache failure");

        // Emit the error asynchronously so Vitest can catch it
        const trigger = () =>
            new Promise((_, reject) => {
                queueMicrotask(() => {
                    try {
                        // @ts-expect-error accessing private field for testing
                        service["cache"].emit("error", error);
                    } catch (err) {
                        reject(err);
                    }
                });
            });

        await expect(trigger()).rejects.toBe(error);
    });
});
