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
        const cfg = { modules: [] };
        mockConfigInstance.get.mockReturnValue(cfg);

        const provider = new CtAuthProvider("config.json", undefined, fakeLogger);

        expect(provider["config"]).toBe(cfg);
        expect(mockConfigInstance.get).toHaveBeenCalledTimes(1);
    });


    it("passes the correct parameters to Config", () => {
        mockConfigInstance.get.mockReturnValue({ modules: [] });

        const provider = new CtAuthProvider("config.json", "envfile", fakeLogger);

        expect(Config).toHaveBeenCalledTimes(1);
        expect(Config).toHaveBeenCalledWith("config.json", "envfile");
        expect(mockConfigInstance.get).toHaveBeenCalledTimes(1);
    });


    it("passes undefined envPath correctly to Config", () => {
        mockConfigInstance.get.mockReturnValue({ modules: [] });

        const provider = new CtAuthProvider("config.json", undefined, fakeLogger);

        expect(Config).toHaveBeenCalledWith("config.json", undefined);
        expect(mockConfigInstance.get).toHaveBeenCalledTimes(1);
    });


    it("rethrows errors from Config constructor", () => {
        Config.mockImplementation(() => {
            throw new Error("Config failed");
        });

        expect(() => new CtAuthProvider("x", undefined, fakeLogger))
            .toThrow("Config failed");
    });

    it("rethrows errors from Config.get()", () => {
        mockConfigInstance.get.mockImplementation(() => {
            throw new Error("get() failed");
        });

        expect(() => new CtAuthProvider("x", undefined, fakeLogger))
            .toThrow("get() failed");
    });

    // -------------------------------------------------------------------------
    // LOGGER TEST
    // -------------------------------------------------------------------------

    it("stores the logger instance", () => {
        mockConfigInstance.get.mockReturnValue({ modules: [] });

        const provider = new CtAuthProvider("config.json", undefined, fakeLogger);

        expect(provider["logger"]).toBe(fakeLogger);
    });

    // -------------------------------------------------------------------------
    // MODULE LOADING TESTS
    // -------------------------------------------------------------------------

    it("loads one module correctly", () => {
        mockConfigInstance.get.mockReturnValue({
            modules: ["A"],
            A: { foo: 1 }
        });

        const provider = new CtAuthProvider("config.json", undefined, fakeLogger);

        expect(provider["modules"]).toHaveLength(1);
        expect(provider["modules"][0].name).toBe("A");
        expect(moduleRegistry["A"]).toHaveBeenCalledWith({ foo: 1 }, fakeLogger);
    });

    it("loads two modules correctly", () => {
        mockConfigInstance.get.mockReturnValue({
            modules: ["A", "B"],
            A: { a: 1 },
            B: { b: 2 }
        });

        const provider = new CtAuthProvider("config.json", undefined, fakeLogger);

        expect(provider["modules"]).toHaveLength(2);
        expect(provider["modules"].map((m) => m.name)).toEqual(["A", "B"]);
    });

    it("loads all five modules correctly", () => {
        const names = ["A", "B", "C", "D", "E"];

        mockConfigInstance.get.mockReturnValue({
            modules: names,
            A: {}, B: {}, C: {}, D: {}, E: {}
        });

        const provider = new CtAuthProvider("config.json", undefined, fakeLogger);

        expect(provider["modules"]).toHaveLength(5);
        expect(provider["modules"].map((m) => m.name)).toEqual(names);
    });

    it("creates an empty modules array when no modules are configured", () => {
        mockConfigInstance.get.mockReturnValue({
            modules: []
        });

        const provider = new CtAuthProvider("config.json", undefined, fakeLogger);

        expect(provider["modules"]).toHaveLength(0);
    });

    it("throws when an unknown module is configured", () => {
        mockConfigInstance.get.mockReturnValue({
            modules: ["Unknown"]
        });

        expect(() => new CtAuthProvider("config.json", undefined, fakeLogger))
            .toThrow("Unknown authorization module 'Unknown' in config!");
    });

    it("throws when unknown module is mixed with known modules", () => {
        mockConfigInstance.get.mockReturnValue({
            modules: ["A", "Unknown"],
            A: {}
        });

        expect(() => new CtAuthProvider("config.json", undefined, fakeLogger))
            .toThrow("Unknown authorization module 'Unknown' in config!");
    });
});
