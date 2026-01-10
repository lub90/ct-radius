import { describe, it, expect, vi, beforeEach } from "vitest";
import { CtGuestsModule } from "../../../../../src/core/modules/ct-guests/CtGuestsModule";
import type { ChurchToolsClientType } from "../../../../../src/core/churchtoolsSetup";
import pino from "pino";

describe("CtGuestsModule constructor", () => {
  let mockClient: ChurchToolsClientType;
  let mockLogger: pino.Logger;

  const baseConfig = {
    cachePath: "/tmp/test_cache.sqlite",
    cacheTimeout: 60,
    vlansRequired: false,
  };

  beforeEach(() => {
    mockClient = {
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
    } as any;

    mockLogger = pino({ level: "silent" });
  });

  // ---------------------------------------------------------------------------
  // BASIC VALIDATION
  // ---------------------------------------------------------------------------
  it("creates instance with valid parameters", () => {
    const module = new CtGuestsModule(mockClient, baseConfig, mockLogger);

    expect(module).toBeInstanceOf(CtGuestsModule);
    expect(module.name).toBe("ct-guests");
  });

  it("throws for invalid ChurchTools client", () => {
    expect(
      () => new CtGuestsModule(null as any, baseConfig, mockLogger),
    ).toThrow("Invalid ChurchTools client");

    expect(
      () => new CtGuestsModule(undefined as any, baseConfig, mockLogger),
    ).toThrow("Invalid ChurchTools client");

    expect(
      () => new CtGuestsModule("not-a-client" as any, baseConfig, mockLogger),
    ).toThrow("Invalid ChurchTools client");
  });

  it("throws for invalid logger", () => {
    expect(
      () => new CtGuestsModule(mockClient, baseConfig, null as any),
    ).toThrow("Invalid logger");

    expect(
      () => new CtGuestsModule(mockClient, baseConfig, undefined as any),
    ).toThrow("Invalid logger");

    expect(
      () => new CtGuestsModule(mockClient, baseConfig, "not-a-logger" as any),
    ).toThrow("Invalid logger");
  });

  // ---------------------------------------------------------------------------
  // CONFIG VALIDATION (Zod)
  // ---------------------------------------------------------------------------
  it("throws on invalid configuration (generic invalid config error)", () => {
    const invalidConfig = {
      cachePath: "cache.db", // invalid: no .sqlite
      cacheTimeout: 60,
      vlansRequired: false,
    };

    expect(
      () => new CtGuestsModule(mockClient, invalidConfig, mockLogger),
    ).toThrow("Invalid ct-guests configuration");
  });

  it("throws when cachePath is missing", () => {
    const configMissingCachePath = {
      cacheTimeout: 60,
      vlansRequired: false,
    };

    expect(
      () => new CtGuestsModule(mockClient, configMissingCachePath, mockLogger),
    ).toThrow("Invalid ct-guests configuration");
  });

  it("throws when cachePath does not end with .sqlite", () => {
    const configBadCachePath = {
      ...baseConfig,
      cachePath: "/tmp/cache.db",
    };

    expect(
      () => new CtGuestsModule(mockClient, configBadCachePath, mockLogger),
    ).toThrow("Invalid ct-guests configuration");
  });

  it("trims cachePath before validation", () => {
    const configWithSpaces = {
      ...baseConfig,
      cachePath: "   /tmp/test_cache.sqlite   ",
    };

    const module = new CtGuestsModule(mockClient, configWithSpaces, mockLogger);
    expect(module).toBeInstanceOf(CtGuestsModule);
    // We don't assert internal config here; the fact that it didn't throw
    // proves trim + .sqlite validation worked.
  });

  it("rejects negative cacheTimeout", () => {
    const badConfig = {
      ...baseConfig,
      cacheTimeout: -10,
    };

    expect(
      () => new CtGuestsModule(mockClient, badConfig, mockLogger),
    ).toThrow("Invalid ct-guests configuration");
  });

  it("rejects non-integer cacheTimeout", () => {
    const badConfig = {
      ...baseConfig,
      cacheTimeout: 3.14,
    };

    expect(
      () => new CtGuestsModule(mockClient, badConfig, mockLogger),
    ).toThrow("Invalid ct-guests configuration");
  });

  it("rejects NaN cacheTimeout", () => {
    const badConfig = {
      cachePath: "/tmp/test_cache.sqlite",
      cacheTimeout: NaN,
      vlansRequired: false,
    };

    expect(() => new CtGuestsModule(mockClient, badConfig, mockLogger))
      .toThrow("Invalid ct-guests configuration");
  });


  it("rejects non-boolean vlansRequired", () => {
    const badConfig = {
      ...baseConfig,
      vlansRequired: "true" as any,
    };

    expect(
      () => new CtGuestsModule(mockClient, badConfig, mockLogger),
    ).toThrow("Invalid ct-guests configuration");
  });

  it("accepts vlansRequired=true", () => {
    const configWithVlansRequired = {
      ...baseConfig,
      vlansRequired: true,
    };

    const module = new CtGuestsModule(mockClient, configWithVlansRequired, mockLogger);
    expect(module).toBeInstanceOf(CtGuestsModule);
  });

  it("accepts cacheTimeout=0", () => {
    const configWithZeroTimeout = {
      ...baseConfig,
      cacheTimeout: 0,
    };

    const module = new CtGuestsModule(mockClient, configWithZeroTimeout, mockLogger);
    expect(module).toBeInstanceOf(CtGuestsModule);
  });

  it("accepts large cacheTimeout values", () => {
    const configWithLargeTimeout = {
      ...baseConfig,
      cacheTimeout: 999_999,
    };

    const module = new CtGuestsModule(mockClient, configWithLargeTimeout, mockLogger);
    expect(module).toBeInstanceOf(CtGuestsModule);
  });



  // ---------------------------------------------------------------------------
  // allowedVlans default & validation
  // ---------------------------------------------------------------------------
  it("defaults allowedVlans to [] when not provided", () => {
    const configWithoutAllowedVlans = {
      cachePath: "/tmp/test_cache.sqlite",
      cacheTimeout: 60,
      vlansRequired: false,
    };

    const module = new CtGuestsModule(mockClient, configWithoutAllowedVlans, mockLogger);

    // @ts-expect-error accessing private config for verification
    expect(module.config.allowedVlans).toEqual([]);
  });

  it("accepts valid allowedVlans array", () => {
    const configWithAllowedVlans = {
      ...baseConfig,
      allowedVlans: [0, 10, 4094],
    };

    const module = new CtGuestsModule(mockClient, configWithAllowedVlans, mockLogger);

    // @ts-expect-error
    expect(module.config.allowedVlans).toEqual([0, 10, 4094]);
  });

  it("rejects invalid allowedVlans values", () => {
    const invalidConfigs = [
      {
        ...baseConfig,
        allowedVlans: [-1],
      },
      {
        ...baseConfig,
        allowedVlans: [3.14],
      },
      {
        ...baseConfig,
        allowedVlans: ["10" as any],
      },
      {
        ...baseConfig,
        allowedVlans: [null],
      },
    ];

    for (const cfg of invalidConfigs) {
      expect(
        () => new CtGuestsModule(mockClient, cfg, mockLogger),
      ).toThrow("Invalid ct-guests configuration");
    }
  });

  // ---------------------------------------------------------------------------
  // NO SIDE EFFECTS IN CONSTRUCTOR
  // ---------------------------------------------------------------------------
  it("constructor does not call ChurchTools client or logger", () => {
    const getSpy = vi.spyOn(mockClient, "get");
    const postSpy = vi.spyOn(mockClient, "post");
    const loggerInfoSpy = vi.spyOn(mockLogger, "info");
    const loggerErrorSpy = vi.spyOn(mockLogger, "error");

    new CtGuestsModule(mockClient, baseConfig, mockLogger);

    expect(getSpy).not.toHaveBeenCalled();
    expect(postSpy).not.toHaveBeenCalled();
    expect(loggerInfoSpy).not.toHaveBeenCalled();
    expect(loggerErrorSpy).not.toHaveBeenCalled();
  });


  it("stores constructor parameters correctly in internal fields", () => {
    const config = {
      cachePath: "/tmp/test_cache.sqlite",
      cacheTimeout: 60,
      vlansRequired: true,
      allowedVlans: [10, 20],
    };

    const module = new CtGuestsModule(mockClient, config, mockLogger);

    const internal = module as any; // bypass private fields for testing

    // Check dependencies
    expect(internal.churchtoolsClient).toBe(mockClient);
    expect(internal.logger).toBe(mockLogger);

    // Check config was parsed and stored
    expect(internal.config.cachePath).toBe("/tmp/test_cache.sqlite");
    expect(internal.config.cacheTimeout).toBe(60);
    expect(internal.config.vlansRequired).toBe(true);
    expect(internal.config.allowedVlans).toEqual([10, 20]);

    // GuestDataService must not be created yet
    expect(internal.guestDataService).toBeNull();
  });


});
