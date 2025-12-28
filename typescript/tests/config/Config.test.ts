import { describe, it, expect } from "vitest";
import { FixtureLoader } from "../helpers/FixtureLoader";
import { Config } from "../../src/core/Config";
import { FileMocker } from "../helpers/FileMocker";

describe("Config validation using fixtures", () => {
  const fixtures = new FixtureLoader();

  // -----------------------------
  // VALID CONFIGS
  // -----------------------------
  describe("valid configs", () => {
    const validConfigs = fixtures.getValidConfigs();

    it(`should have at least one valid config fixture`, () => {
      expect(validConfigs.length).toBeGreaterThan(0);
    });

    for (const [index, filePath] of validConfigs.entries()) {
      it(`valid config ${filePath} should load successfully`, () => {
        const mocker = new FileMocker();
        const configPath = mocker.createFileFromPath("config.json", filePath);
        // The FileMocker already wrote the real content into config.json
        // so we just pass the path to Config
        const config = new Config(configPath).get();

        // Semantics sanity check
        expect(config).toBeDefined();
        expect(typeof config).toBe("object");

        // Content wise check
        expect(config).toMatchSnapshot();
      });
    }
  });

  // -----------------------------
  // INVALID CONFIGS
  // -----------------------------
  describe("invalid configs", () => {
    const invalidConfigs = fixtures.getInvalidConfigs();

    it(`should have at least one invalid config fixture`, () => {
      expect(invalidConfigs.length).toBeGreaterThan(0);
    });

    for (const [index, filePath] of invalidConfigs.entries()) {
      it(`invalid config ${filePath} should throw`, () => {
        const mocker = new FileMocker();
        const configPath = mocker.createFileFromPath("config.json", filePath);

        expect(() => {
          new Config(configPath).get();
        }).toThrow();
      });
    }
  });
});
