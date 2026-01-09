import { describe, it, expect } from "vitest";
import { CtGuestsConfigSchema, type CtGuestsConfig } from "../../../../src/core/modules/ct-guests/CtGuestsConfigSchema";

describe("CtGuestsConfigSchema", () => {
  const validConfig = {
    cachePath: "/path/to/cache.sqlite",
    cacheTimeout: 300,
    vlansRequired: false,
  };

  describe("Valid configurations", () => {
    it("accepts a valid minimal config", () => {
      const config = {
        cachePath: "/path/to/cache.sqlite",
      };

      const result = CtGuestsConfigSchema.safeParse(config);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.cachePath).toBe("/path/to/cache.sqlite");
        expect(result.data.cacheTimeout).toBe(300); // default
        expect(result.data.vlansRequired).toBe(false); // default
      }
    });

    it("accepts a complete valid config", () => {
      const result = CtGuestsConfigSchema.safeParse(validConfig);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validConfig);
      }
    });

    it("accepts vlansRequired as true", () => {
      const config = { ...validConfig, vlansRequired: true };
      const result = CtGuestsConfigSchema.safeParse(config);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.vlansRequired).toBe(true);
      }
    });

    it("accepts different cache timeout values", () => {
      const testCases = [0, 60, 300, 3600, 999999];
      
      for (const timeout of testCases) {
        const config = { ...validConfig, cacheTimeout: timeout };
        const result = CtGuestsConfigSchema.safeParse(config);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.cacheTimeout).toBe(timeout);
        }
      }
    });

    it("uses default cacheTimeout of 300 when not provided", () => {
      const config = {
        cachePath: "/path/to/cache.sqlite",
        vlansRequired: false,
      };
      const result = CtGuestsConfigSchema.safeParse(config);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.cacheTimeout).toBe(300);
      }
    });

    it("uses default vlansRequired of false when not provided", () => {
      const config = {
        cachePath: "/path/to/cache.sqlite",
        cacheTimeout: 60,
      };
      const result = CtGuestsConfigSchema.safeParse(config);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.vlansRequired).toBe(false);
      }
    });
  });

  describe("Invalid cachePath", () => {
    it("rejects missing cachePath", () => {
      const config = {
        cacheTimeout: 300,
        vlansRequired: false,
      };
      const result = CtGuestsConfigSchema.safeParse(config);
      expect(result.success).toBe(false);
    });

    it("rejects cachePath that doesn't end with .sqlite", () => {
      const testCases = [
        "/path/to/cache.db",
        "/path/to/cache",
        "/path/to/cache.json",
        "/path/to/cache.sqlite3",
        "/path/to/cache.sqlite.",
      ];

      for (const cachePath of testCases) {
        const config = { ...validConfig, cachePath };
        const result = CtGuestsConfigSchema.safeParse(config);
        expect(result.success).toBe(false);
      }
    });

    it("rejects empty string cachePath", () => {
      const config = { ...validConfig, cachePath: "" };
      const result = CtGuestsConfigSchema.safeParse(config);
      expect(result.success).toBe(false);
    });

    it("accepts paths with .sqlite at the end", () => {
      const testCases = [
        "/path/to/cache.sqlite",
        "/path.sqlite",
        "cache.sqlite",
        "/tmp/my_cache_file.sqlite",
      ];

      for (const cachePath of testCases) {
        const config = { ...validConfig, cachePath };
        const result = CtGuestsConfigSchema.safeParse(config);
        expect(result.success).toBe(true);
      }
    });
  });

  describe("Invalid cacheTimeout", () => {
    it("rejects negative cacheTimeout", () => {
      const config = { ...validConfig, cacheTimeout: -1 };
      const result = CtGuestsConfigSchema.safeParse(config);
      expect(result.success).toBe(false);
    });

    it("rejects non-integer cacheTimeout", () => {
      const testCases = [3.14, 1.5, -0.5];
      
      for (const timeout of testCases) {
        const config = { ...validConfig, cacheTimeout: timeout };
        const result = CtGuestsConfigSchema.safeParse(config);
        expect(result.success).toBe(false);
      }
    });

    it("rejects string cacheTimeout", () => {
      const config = { ...validConfig, cacheTimeout: "300" as any };
      const result = CtGuestsConfigSchema.safeParse(config);
      expect(result.success).toBe(false);
    });

    it("rejects NaN cacheTimeout", () => {
      const config = { ...validConfig, cacheTimeout: NaN };
      const result = CtGuestsConfigSchema.safeParse(config);
      expect(result.success).toBe(false);
    });
  });

  describe("Invalid vlansRequired", () => {
    it("rejects non-boolean vlansRequired", () => {
      const testCases = [
        "true",
        "false",
        1,
        0,
      ];

      for (const vlansRequired of testCases) {
        const config = { ...validConfig, vlansRequired } as any;
        const result = CtGuestsConfigSchema.safeParse(config);
        expect(result.success).toBe(false);
      }
    });

    it("allows null and undefined for vlansRequired (uses default)", () => {
      const configNoVlansRequired = {
        cachePath: "/path/to/cache.sqlite",
        // vlansRequired not provided
      };
      const result = CtGuestsConfigSchema.safeParse(configNoVlansRequired);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.vlansRequired).toBe(false);
      }
    });
  });

  describe("Extra fields", () => {
    it("ignores extra fields in config", () => {
      const config = {
        ...validConfig,
        extraField: "should be ignored",
        another: 123,
      };
      const result = CtGuestsConfigSchema.safeParse(config);
      expect(result.success).toBe(true);
    });
  });

  describe("Type inference", () => {
    it("correctly infers CtGuestsConfig type", () => {
      const config: CtGuestsConfig = {
        cachePath: "/path/to/cache.sqlite",
        cacheTimeout: 300,
        vlansRequired: false,
      };

      const result = CtGuestsConfigSchema.safeParse(config);
      expect(result.success).toBe(true);
    });
  });
});
