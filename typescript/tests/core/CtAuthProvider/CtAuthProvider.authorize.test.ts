import { describe, it, expect, beforeEach, vi } from "vitest";
import pino from "pino";
import { CtAuthProvider } from "../../../src/core/CtAuthProvider.js";
import { Config } from "../../../src/core/Config.js";
import { moduleRegistry } from "../../../src/core/ModuleRegistry.js";
import { RejectResponse } from "../../../src/types/RadiusResponse.js";

// ----------------------
// Mocks
// ----------------------
vi.mock("../../../src/core/Config.js", () => ({
    Config: vi.fn()
}));

vi.mock("../../../src/core/ModuleRegistry.js", () => ({
    moduleRegistry: {}
}));

vi.mock("@churchtools/churchtools-client", () => ({
    ChurchToolsClient: vi.fn(function (_url, _token, _csrf) {
        return {};
    })
}));


const fakeLogger = pino({ level: "silent" });

// Helper: create provider with injected config + modules
function createProviderWithModules(moduleFactories) {
    (Config as any).mockImplementation(function () {
        return {
            get: vi.fn().mockReturnValue({
                allowRequestedVlan: false,
                vlanSeparator: "#",
                modules: Object.keys(moduleFactories),
                backendConfig: {
                    serverUrl: "https://example.com",
                    apiToken: "test-token"
                }
            })
        };
    });

    Object.keys(moduleFactories).forEach(name => {
        moduleRegistry[name] = moduleFactories[name];
    });

    return new CtAuthProvider("config.json", undefined, fakeLogger);
}

describe("CtAuthProvider.authorize", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        Object.keys(moduleRegistry).forEach(k => delete moduleRegistry[k]);
    });

    // ------------------------------------------------------------
    // 1. One module → must be called
    // ------------------------------------------------------------
    it("calls the only module once", async () => {
        const mod = { authorize: vi.fn().mockResolvedValue(null) };

        const provider = createProviderWithModules({ A: () => mod });

        await provider.authorize("alice");

        expect(mod.authorize).toHaveBeenCalledTimes(1);
    });

    // ------------------------------------------------------------
    // 2. Two modules → test all branches
    // ------------------------------------------------------------
    it("two modules: first returns RejectResponse → second not called", async () => {
        const reject = new RejectResponse();

        const modA = { authorize: vi.fn().mockResolvedValue(reject) };
        const modB = { authorize: vi.fn().mockResolvedValue(null) };

        const provider = createProviderWithModules({
            A: (client, cfg, logger) => modA,
            B: (client, cfg, logger) => modB
        });

        const result = await provider.authorize("alice");

        expect(result).toBe(reject);
        expect(modA.authorize).toHaveBeenCalledTimes(1);
        expect(modB.authorize).not.toHaveBeenCalled();
    });

    it("two modules: first returns null → second called and returns RejectResponse", async () => {
        const reject = new RejectResponse();

        const modA = { authorize: vi.fn().mockResolvedValue(null) };
        const modB = { authorize: vi.fn().mockResolvedValue(reject) };

        const provider = createProviderWithModules({
            A: (client, cfg, logger) => modA,
            B: (client, cfg, logger) => modB
        });

        const result = await provider.authorize("alice");

        expect(result).toBe(reject);
        expect(modA.authorize).toHaveBeenCalledTimes(1);
        expect(modB.authorize).toHaveBeenCalledTimes(1);
    });

    it("two modules: both return null → final RejectResponse returned", async () => {
        const modA = { authorize: vi.fn().mockResolvedValue(null) };
        const modB = { authorize: vi.fn().mockResolvedValue(null) };

        const provider = createProviderWithModules({
            A: (client, cfg, logger) => modA,
            B: (client, cfg, logger) => modB
        });

        const result = await provider.authorize("alice");

        expect(result).toBeInstanceOf(RejectResponse);
        expect(modA.authorize).toHaveBeenCalledTimes(1);
        expect(modB.authorize).toHaveBeenCalledTimes(1);
    });

    // ------------------------------------------------------------
    // 3. Five modules → short-circuiting + fallback
    // ------------------------------------------------------------
    it("five modules: stops early when one returns a response", async () => {
        const reject = new RejectResponse();

        const mods = [
            { authorize: vi.fn().mockResolvedValue(null) },
            { authorize: vi.fn().mockResolvedValue(null) },
            { authorize: vi.fn().mockResolvedValue(reject) }, // stop here
            { authorize: vi.fn().mockResolvedValue(null) },
            { authorize: vi.fn().mockResolvedValue(null) }
        ];

        const provider = createProviderWithModules({
            A: (client, cfg, logger) => mods[0],
            B: (client, cfg, logger) => mods[1],
            C: (client, cfg, logger) => mods[2],
            D: (client, cfg, logger) => mods[3],
            E: (client, cfg, logger) => mods[4]
        });

        const result = await provider.authorize("alice");

        expect(result).toBe(reject);

        expect(mods[0].authorize).toHaveBeenCalledTimes(1);
        expect(mods[1].authorize).toHaveBeenCalledTimes(1);
        expect(mods[2].authorize).toHaveBeenCalledTimes(1);
        expect(mods[3].authorize).not.toHaveBeenCalled();
        expect(mods[4].authorize).not.toHaveBeenCalled();
    });

    it("five modules: none return → final RejectResponse returned", async () => {
        const mods = Array.from({ length: 5 }, () => ({
            authorize: vi.fn().mockResolvedValue(null)
        }));

        const provider = createProviderWithModules({
            A: (client, cfg, logger) => mods[0],
            B: (client, cfg, logger) => mods[1],
            C: (client, cfg, logger) => mods[2],
            D: (client, cfg, logger) => mods[3],
            E: (client, cfg, logger) => mods[4]
        });

        const result = await provider.authorize("alice");

        expect(result).toBeInstanceOf(RejectResponse);
        mods.forEach(mod => {
            expect(mod.authorize).toHaveBeenCalledTimes(1);
        });
    });

    // ------------------------------------------------------------
    // 4. Invalid return type → must throw
    // ------------------------------------------------------------
    it("throws if a module returns an invalid object", async () => {
        const modA = { authorize: vi.fn().mockResolvedValue({ foo: "bar" }) };

        const provider = createProviderWithModules({
            A: (client, cfg, logger) => modA
        });

        await expect(provider.authorize("alice"))
            .rejects
            .toBeInstanceOf(Error);
    });

    // ------------------------------------------------------------
    // 5. Each module authorize() called at most once
    // ------------------------------------------------------------
    it("each module authorize() is called at most once", async () => {
        const mods = [
            { authorize: vi.fn().mockResolvedValue(null) },
            { authorize: vi.fn().mockResolvedValue(null) },
            { authorize: vi.fn().mockResolvedValue(null) }
        ];

        const provider = createProviderWithModules({
            A: (client, cfg, logger) => mods[0],
            B: (client, cfg, logger) => mods[1],
            C: (client, cfg, logger) => mods[2]
        });

        await provider.authorize("alice");

        mods.forEach(mod => {
            expect(mod.authorize).toHaveBeenCalledTimes(1);
        });
    });


    // ------------------------------------------------------------
    // 6. Config with no modules → always RejectResponse
    // ------------------------------------------------------------
    it("returns RejectResponse when config has no modules", async () => {
        (Config as any).mockImplementation(function () {
            return {
                get: vi.fn().mockReturnValue({
                    allowRequestedVlan: false,
                    modules: [] // no modules at all
                })
            };
        });

        const provider = new CtAuthProvider("config.json", undefined, fakeLogger);

        const result = await provider.authorize("alice");

        expect(result).toBeInstanceOf(RejectResponse);
    });


    // ------------------------------------------------------------
    // 7. Errors thrown by modules must propagate
    // ------------------------------------------------------------
    it("propagates errors thrown by modules", async () => {
        const error = new Error("Module failure");

        const modA = { authorize: vi.fn().mockRejectedValue(error) };
        const modB = { authorize: vi.fn().mockResolvedValue(null) };

        const provider = createProviderWithModules({
            A: (client, cfg, logger) => modA,
            B: (client, cfg, logger) => modB
        });

        await expect(provider.authorize("alice"))
            .rejects
            .toBe(error);

        expect(modA.authorize).toHaveBeenCalledTimes(1);
        expect(modB.authorize).not.toHaveBeenCalled();
    });


    // ------------------------------------------------------------
    // 8. Module order is preserved
    // ------------------------------------------------------------
    it("calls modules in the correct order", async () => {
        const callOrder = [];

        const modA = {
            authorize: vi.fn().mockImplementation(async () => {
                callOrder.push("A");
                return null;
            })
        };

        const modB = {
            authorize: vi.fn().mockImplementation(async () => {
                callOrder.push("B");
                return null;
            })
        };

        const modC = {
            authorize: vi.fn().mockImplementation(async () => {
                callOrder.push("C");
                return new RejectResponse();
            })
        };

        const provider = createProviderWithModules({
            A: (client, cfg, logger) => modA,
            B: (client, cfg, logger) => modB,
            C: (client, cfg, logger) => modC
        });

        await provider.authorize("alice");

        expect(callOrder).toEqual(["A", "B", "C"]);
    });


});
