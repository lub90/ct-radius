import { describe, it, expect, beforeEach, vi } from "vitest";
import pino from "pino";

// --- Mocks ------------------------------------------------------------------

vi.mock("../../../src/core/Config.js", () => ({
    Config: vi.fn().mockImplementation(function () {
        return { get: vi.fn() };
    })
}));

vi.mock("../../../src/core/ModuleRegistry.js", () => ({
    moduleRegistry: {}
}));


vi.mock("../../../src/core/churchtoolsSetup.js", () => {
    const mockChurchtoolsClientInstance = {
        __isMockChurchToolsClient: true,
        setCookieJar: vi.fn(),
    };

    return {
        ChurchToolsClient: vi.fn().mockImplementation(function () {
            return mockChurchtoolsClientInstance;
        }),
        axiosCookieJarSupport: { wrapper: vi.fn() },
        tough: { CookieJar: vi.fn() }
    };
});




// Import after mocks!
import { ChurchToolsClient } from "../../../src/core/churchtoolsSetup.js";
import { CtAuthProvider } from "../../../src/core/CtAuthProvider.js";
import { moduleRegistry } from "../../../src/core/ModuleRegistry.js";
import { Config } from "../../../src/core/Config.js";

// Helper: create a fake logger
const fakeLogger = pino({ level: "silent" });

// Helper: create fake module factories
const createFakeModule = (name: string) =>
    vi.fn().mockImplementation((cfg, logger) => ({
        name,
        cfg,
        logger,
        authorize: vi.fn()
    }));


// Helper: Generate a fake module factory
function registerModules(names: string[]) {
    const result: Record<string, any> = {};

    for (const name of names) {
        const mod = createFakeModule(name);
        moduleRegistry[name] = mod;
        result[name] = mod;
    }

    return result;
}


// ---------------------------------------------------------------------------

describe("CtAuthProvider constructor", () => {
    let mockConfigInstance: any;

    beforeEach(() => {
        vi.clearAllMocks();

        // Reset moduleRegistry for each test
        Object.keys(moduleRegistry).forEach((k) => delete moduleRegistry[k]);
        registerModules(["A", "B", "C", "D", "E"]);

        // Capture the Config mock instance
        mockConfigInstance = {
            get: vi.fn()
        };
        (Config as any).mockImplementation(function () { return mockConfigInstance; });
    });

    // -------------------------------------------------------------------------
    // CONFIG TESTS
    // -------------------------------------------------------------------------

    it("stores the config returned by Config.get()", () => {
        const cfg = {
            requestRoutes: {
                "wifi": { modules: [] },
                "vpn": { modules: [] }
            },
            backendConfig: {
                serverUrl: "https://example.com",
                apiToken: "test-token"
            }
        };
        mockConfigInstance.get.mockReturnValue(cfg);

        const provider = new CtAuthProvider("config.json", undefined, "wifi", fakeLogger);

        expect(provider["config"]).toBe(cfg);
        expect(mockConfigInstance.get).toHaveBeenCalledTimes(1);
    });


    it("passes the correct parameters to Config", () => {
        mockConfigInstance.get.mockReturnValue({
            requestRoutes: {
                "wifi": { modules: [] },
                "vpn": { modules: [] }
            },
            backendConfig: {
                serverUrl: "https://example.com",
                apiToken: "test-token"
            }
        });

        const provider = new CtAuthProvider("config.json", "envfile", "vpn", fakeLogger);

        expect(Config).toHaveBeenCalledTimes(1);
        expect(Config).toHaveBeenCalledWith("config.json", "envfile");
        expect(mockConfigInstance.get).toHaveBeenCalledTimes(1);
    });


    it("passes undefined envPath correctly to Config", () => {
        mockConfigInstance.get.mockReturnValue({
            requestRoutes: {
                "wifi": { modules: [] },
                "vpn": { modules: [] }
            },
            backendConfig: {
                serverUrl: "https://example.com",
                apiToken: "test-token"
            }
        });

        const provider = new CtAuthProvider("config.json", undefined, "wifi", fakeLogger);

        expect(Config).toHaveBeenCalledWith("config.json", undefined);
        expect(mockConfigInstance.get).toHaveBeenCalledTimes(1);
    });


    it("rethrows errors from Config constructor", () => {
        Config.mockImplementation(() => {
            throw new Error("Config failed");
        });

        expect(() => new CtAuthProvider("x", undefined, "vpn", fakeLogger))
            .toThrow("Config failed");
    });

    it("rethrows errors from Config.get()", () => {
        mockConfigInstance.get.mockImplementation(() => {
            throw new Error("get() failed");
        });

        expect(() => new CtAuthProvider("x", undefined, "wifi", fakeLogger))
            .toThrow("get() failed");
    });

    // -------------------------------------------------------------------------
    // LOGGER TEST
    // -------------------------------------------------------------------------

    it("stores the logger instance", () => {
        mockConfigInstance.get.mockReturnValue({
            requestRoutes: {
                "wifi": { modules: [] },
                "vpn": { modules: [] }
            },
            backendConfig: {
                serverUrl: "https://example.com",
                apiToken: "test-token"
            }
        });

        const provider = new CtAuthProvider("config.json", undefined, "wifi", fakeLogger);

        expect(provider["logger"]).toBe(fakeLogger);
    });

    // -------------------------------------------------------------------------
    // MODULE LOADING TESTS
    // -------------------------------------------------------------------------

    it("loads one module correctly", () => {
        mockConfigInstance.get.mockReturnValue({
            requestRoutes: {
                "wifi": { modules: ["A1"] },
                "vpn": { modules: [] }
            },
            A1: { foo: 1, type: "A" },
            backendConfig: {
                serverUrl: "https://example.com",
                apiToken: "test-token"
            }
        });

        const provider = new CtAuthProvider("config.json", undefined, "wifi", fakeLogger);

        expect(provider["modules"]).toHaveLength(1);
        expect(provider["modules"][0].name).toBe("A");
        // Factory is called with (churchtoolsClient, moduleConfig, logger)
        expect(moduleRegistry["A"]).toHaveBeenCalledTimes(1);
        const callArgs = (moduleRegistry["A"] as any).mock.calls[0];
        expect(callArgs[0].__isMockChurchToolsClient).toBe(true); // churchtoolsClient
        expect(callArgs[1]).toEqual({ foo: 1, type: "A" }); // moduleConfig
        expect(callArgs[2]).toBe(fakeLogger); // logger
    });

    it("loads two modules correctly", () => {
        mockConfigInstance.get.mockReturnValue({
            modules: ["A", "B"],
            requestRoutes: {
                "vpn": { modules: ["A1", "BModule"] },
                "wifi": { modules: [] }
            },
            A1: { a: 1, type: "A" },
            BModule: { b: 2, type: "B" },
            backendConfig: {
                serverUrl: "https://example.com",
                apiToken: "test-token"
            }
        });

        const provider = new CtAuthProvider("config.json", undefined, "vpn", fakeLogger);

        expect(provider["modules"]).toHaveLength(2);
        expect(provider["modules"].map((m) => m.name)).toEqual(["A", "B"]);
    });

    it("loads all five modules correctly", () => {
        const names = ["A", "B", "C", "D", "E"];

        mockConfigInstance.get.mockReturnValue({
            requestRoutes: {
                "vpn": { modules: names },
                "wifi": { modules: names }
            },
            A: { type: "A" }, B: { type: "B" }, C: { type: "C" }, D: { type: "D" }, E: { type: "E" },
            backendConfig: {
                serverUrl: "https://example.com",
                apiToken: "test-token"
            }
        });

        const provider = new CtAuthProvider("config.json", undefined, "vpn", fakeLogger);

        expect(provider["modules"]).toHaveLength(5);
        expect(provider["modules"].map((m) => m.name)).toEqual(names);
    });

    it("creates an empty modules array when no modules are configured", () => {
        mockConfigInstance.get.mockReturnValue({
            requestRoutes: {
                "vpn": { modules: [] },
                "wifi": { modules: [] }
            },
            backendConfig: {
                serverUrl: "https://example.com",
                apiToken: "test-token"
            }
        });

        const provider = new CtAuthProvider("config.json", undefined, "wifi", fakeLogger);

        expect(provider["modules"]).toHaveLength(0);
    });

    it("throws when an unknown module is configured", () => {
        mockConfigInstance.get.mockReturnValue({
            requestRoutes: {
                "vpn": { modules: ["Unknown"] },
                "wifi": { modules: ["Unknown"] }
            },
            backendConfig: {
                serverUrl: "https://example.com",
                apiToken: "test-token"
            }
        });

        expect(() => new CtAuthProvider("config.json", undefined, "vpn", fakeLogger))
            .toThrow("Module 'Unknown' does not exist in configuration.");
    });

    it("throws when unknown module is mixed with known modules", () => {
        mockConfigInstance.get.mockReturnValue({
            requestRoutes: {
                "vpn": { modules: ["Unknown", "module"] },
                "wifi": { modules: [] }
            },
            module: { type: "A" },
            backendConfig: {
                serverUrl: "https://example.com",
                apiToken: "test-token"
            }
        });

        expect(() => new CtAuthProvider("config.json", undefined, "vpn", fakeLogger))
            .toThrow("Module 'Unknown' does not exist in configuration.");
    });

    it("forwards errors thrown by a module constructor", () => {
        mockConfigInstance.get.mockReturnValue({
            requestRoutes: {
                "vpn": { modules: [] },
                "wifi": { modules: ["A"] }
            },
            A: { type: "A", foo: 20 },
            backendConfig: {
                serverUrl: "https://example.com",
                apiToken: "test-token"
            }
        });

        moduleRegistry["A"] = vi.fn().mockImplementation(() => {
            throw new Error("Module A failed");
        });

        expect(() => new CtAuthProvider("config.json", undefined, "wifi", fakeLogger))
            .toThrow("Module A failed");
    });


    it("passes the correct config object to each module constructor", () => {
        mockConfigInstance.get.mockReturnValue({
            requestRoutes: {
                "vpn": { modules: [] },
                "wifi": { modules: ["A", "B"] }
            },
            A: { type: "A", a: 1 },
            B: { type: "B", b: 2 },
            backendConfig: {
                serverUrl: "https://example.com",
                apiToken: "test-token"
            }
        });

        const provider = new CtAuthProvider("config.json", undefined, "wifi", fakeLogger);

        // Factory is called with (churchtoolsClient, moduleConfig, logger)
        const callArgsA = (moduleRegistry["A"] as any).mock.calls[0];
        expect(callArgsA[0].__isMockChurchToolsClient).toBe(true);
        expect(callArgsA[1]).toEqual({ type: "A", a: 1 });
        expect(callArgsA[2]).toBe(fakeLogger);
        const callArgsB = (moduleRegistry["B"] as any).mock.calls[0];
        expect(callArgsB[0].__isMockChurchToolsClient).toBe(true);
        expect(callArgsB[1]).toEqual({ type: "B", b: 2 });
        expect(callArgsB[2]).toBe(fakeLogger);

        expect(ChurchToolsClient).toHaveBeenCalledTimes(2);
    });

    it("passes the churchtools client to each module", () => {
        const serverUrl = "https://example.com";
        const apiToken = "test-token-123";

        mockConfigInstance.get.mockReturnValue({
            requestRoutes: {
                "vpn": { modules: [] },
                "wifi": { modules: ["A", "B"] }
            },
            A: { type: "A" },
            B: { type: "B" },
            backendConfig: {
                serverUrl,
                apiToken
            }
        });

        const provider = new CtAuthProvider("config.json", undefined, "wifi", fakeLogger);

        // Verify ChurchToolsClient was instantiated with correct parameters
        // The actual client is passed as first argument to each module factory
        const callArgsA = (moduleRegistry["A"] as any).mock.calls[0];
        expect(callArgsA[0].__isMockChurchToolsClient).toBe(true);
        const churchtoolsClientA = callArgsA[0];
        expect(churchtoolsClientA).toBeDefined();

        const callArgsB = (moduleRegistry["B"] as any).mock.calls[0];
        expect(callArgsB[0].__isMockChurchToolsClient).toBe(true);
        const churchtoolsClientB = callArgsB[0];
        expect(churchtoolsClientB).toBeDefined();

        expect(ChurchToolsClient).toHaveBeenCalledTimes(2);
    });

    it("throws if the selected requestRoute does not exist", () => {
        mockConfigInstance.get.mockReturnValue({
            requestRoutes: {
                wifi: { modules: [] },
                vpn: { modules: [] }
            },
            backendConfig: {
                serverUrl: "https://example.com",
                apiToken: "test-token"
            }
        });

        expect(() => new CtAuthProvider("config.json", undefined, "nonexistent", fakeLogger))
            .toThrow();
    });

    it("passes the resolved module config (with inheritance) to the module constructor", () => {
        mockConfigInstance.get.mockReturnValue({
            requestRoutes: {
                wifi: { modules: ["Child"] },
                vpn: { modules: [] }
            },

            // Parent defines the type and base attributes
            Parent: {
                type: "A",
                base: 1,
                overrideMe: "parent"
            },

            // Child inherits and overrides one attribute
            Child: {
                inherits: "Parent",
                overrideMe: "child",
                extra: 42
            },

            backendConfig: {
                serverUrl: "https://example.com",
                apiToken: "test-token"
            }
        });

        const provider = new CtAuthProvider("config.json", undefined, "wifi", fakeLogger);

        // Factory call: (churchtoolsClient, resolvedConfig, logger)
        const callArgs = (moduleRegistry["A"] as any).mock.calls[0];

        expect(callArgs[1]).toEqual({
            type: "A",
            base: 1,
            overrideMe: "child",
            extra: 42
        });
    });

});
