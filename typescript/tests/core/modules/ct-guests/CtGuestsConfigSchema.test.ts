import { describe, it, expect } from "vitest";
import { CtGuestsConfigSchema, type CtGuestsConfig } from "../../../../src/core/modules/ct-guests/CtGuestsConfigSchema";

describe("CtGuestsConfigSchema", () => {
  const validConfig = {
    cachePath: "/path/to/cache.sqlite",
    cacheTimeout: 300,
    vlansRequired: false,
  };

  // ---------------------------------------------------------------------------
  // VALID CONFIGURATIONS
  // ---------------------------------------------------------------------------
  describe("Valid configurations", () => {
    it("accepts a complete valid config", () => {
      const result = CtGuestsConfigSchema.safeParse(validConfig);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.cachePath).toBe(validConfig.cachePath);
        expect(result.data.cacheTimeout).toBe(validConfig.cacheTimeout);
        expect(result.data.vlansRequired).toBe(validConfig.vlansRequired);
        expect(result.data.allowedVlans).toEqual([]); // default
      }
    });

    it("accepts vlansRequired=true", () => {
      const config = { ...validConfig, vlansRequired: true };
      const result = CtGuestsConfigSchema.safeParse(config);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.vlansRequired).toBe(true);
      }
    });

    it("accepts various cacheTimeout values", () => {
      const timeouts = [0, 1, 60, 300, 999999];

      for (const timeout of timeouts) {
        const config = { ...validConfig, cacheTimeout: timeout };
        const result = CtGuestsConfigSchema.safeParse(config);
        expect(result.success).toBe(true);
      }
    });
  });

  // ---------------------------------------------------------------------------
  // INVALID cachePath
  // ---------------------------------------------------------------------------
  describe("Invalid cachePath", () => {
    it("rejects missing cachePath", () => {
      const config = {
        cacheTimeout: 300,
        vlansRequired: false,
      };
      expect(CtGuestsConfigSchema.safeParse(config).success).toBe(false);
    });

    it("rejects empty or whitespace cachePath", () => {
      const badPaths = ["", " ", "   "];

      for (const cachePath of badPaths) {
        const config = { ...validConfig, cachePath };
        expect(CtGuestsConfigSchema.safeParse(config).success).toBe(false);
      }
    });

    it("rejects cachePath without .sqlite suffix", () => {
      const badPaths = [
        "/path/to/cache.db",
        "/path/to/cache",
        "/path/to/cache.sqlite3",
        "/path/to/cache.sqlite.",
      ];

      for (const cachePath of badPaths) {
        const config = { ...validConfig, cachePath };
        expect(CtGuestsConfigSchema.safeParse(config).success).toBe(false);
      }
    });

    it("accepts valid .sqlite paths", () => {
      const goodPaths = [
        "/path/to/cache.sqlite",
        "/path.sqlite",
        "cache.sqlite",
        "/tmp/my_cache.sqlite",
      ];

      for (const cachePath of goodPaths) {
        const config = { ...validConfig, cachePath };
        expect(CtGuestsConfigSchema.safeParse(config).success).toBe(true);
      }
    });
  });

  // ---------------------------------------------------------------------------
  // INVALID cacheTimeout
  // ---------------------------------------------------------------------------
  describe("Invalid cacheTimeout", () => {
    it("rejects missing cacheTimeout", () => {
      const config = {
        cachePath: "/path/to/cache.sqlite",
        vlansRequired: false,
      };
      expect(CtGuestsConfigSchema.safeParse(config).success).toBe(false);
    });

    it("rejects negative values", () => {
      const config = { ...validConfig, cacheTimeout: -1 };
      expect(CtGuestsConfigSchema.safeParse(config).success).toBe(false);
    });

    it("rejects non-integer values", () => {
      const badValues = [3.14, 1.5, -0.5];

      for (const cacheTimeout of badValues) {
        const config = { ...validConfig, cacheTimeout };
        expect(CtGuestsConfigSchema.safeParse(config).success).toBe(false);
      }
    });

    it("rejects NaN", () => {
      const config = { ...validConfig, cacheTimeout: NaN };
      expect(CtGuestsConfigSchema.safeParse(config).success).toBe(false);
    });

    it("rejects non-number types", () => {
      const config = { ...validConfig, cacheTimeout: "300" as any };
      expect(CtGuestsConfigSchema.safeParse(config).success).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // INVALID vlansRequired
  // ---------------------------------------------------------------------------
  describe("Invalid vlansRequired", () => {
    it("rejects missing vlansRequired", () => {
      const config = {
        cachePath: "/path/to/cache.sqlite",
        cacheTimeout: 300,
      };
      expect(CtGuestsConfigSchema.safeParse(config).success).toBe(false);
    });

    it("rejects non-boolean values", () => {
      const badValues = ["true", "false", 1, 0, null];

      for (const vlansRequired of badValues) {
        const config = { ...validConfig, vlansRequired } as any;
        expect(CtGuestsConfigSchema.safeParse(config).success).toBe(false);
      }
    });
  });

  // ---------------------------------------------------------------------------
  // allowedVlans
  // ---------------------------------------------------------------------------
  describe("allowedVlans validation", () => {
    it("defaults to empty array", () => {
      const result = CtGuestsConfigSchema.safeParse(validConfig);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.allowedVlans).toEqual([]);
      }
    });

    it("accepts valid VLAN arrays", () => {
      const config = { ...validConfig, allowedVlans: [0, 10, 4094] };
      expect(CtGuestsConfigSchema.safeParse(config).success).toBe(true);
    });

    it("rejects negative VLAN IDs", () => {
      const config = { ...validConfig, allowedVlans: [-1] };
      expect(CtGuestsConfigSchema.safeParse(config).success).toBe(false);
    });

    it("rejects non-integer VLAN IDs", () => {
      const config = { ...validConfig, allowedVlans: [3.14] };
      expect(CtGuestsConfigSchema.safeParse(config).success).toBe(false);
    });

    it("rejects non-number VLAN IDs", () => {
      const config = { ...validConfig, allowedVlans: ["20" as any] };
      expect(CtGuestsConfigSchema.safeParse(config).success).toBe(false);
    });

    it("rejects NaN in allowedVlans", () => {
      const config = { ...validConfig, allowedVlans: [NaN] };
      expect(CtGuestsConfigSchema.safeParse(config).success).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // Extra fields
  // ---------------------------------------------------------------------------
  describe("Extra fields", () => {
    it("ignores extra fields", () => {
      const config = {
        ...validConfig,
        extraField: "ignored",
        another: 123,
      };
      expect(CtGuestsConfigSchema.safeParse(config).success).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // Type inference
  // ---------------------------------------------------------------------------
  describe("Type inference", () => {
    it("accepts a valid CtGuestsConfig type", () => {
      const config: CtGuestsConfig = validConfig;
      expect(CtGuestsConfigSchema.safeParse(config).success).toBe(true);
    });
  });
});
