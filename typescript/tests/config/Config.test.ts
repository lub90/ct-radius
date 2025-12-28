import { describe, it, expect } from "vitest";
import { FixtureLoader } from "../helpers/FixtureLoader";
import { Config } from "../../src/core/Config";
import { FileMocker } from "../helpers/FileMocker";
import { ConsoleChecker } from "../helpers/ConsoleChecker";
import dotenv from "dotenv";
import fs from "node:fs";

describe("Config validation using fixtures", () => {
  const fixtures = new FixtureLoader();

  // -----------------------------
  // VALID CONFIGS
  // -----------------------------
  describe("valid configs", () => {
    const validConfigs = fixtures.getValidConfigs();
    const consoleChecker = new ConsoleChecker();

    beforeEach(() => {
      consoleChecker.setup();
    });

    afterEach(() => {
      consoleChecker.teardown();
    });

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

        consoleChecker.checkNoOutput();
      });
    }
  });

  // -----------------------------
  // INVALID CONFIGS
  // -----------------------------
  describe("invalid configs", () => {
    const invalidConfigs = fixtures.getInvalidConfigs();
    const consoleChecker = new ConsoleChecker();

    beforeEach(() => {
      consoleChecker.setup();
    });

    afterEach(() => {
      consoleChecker.teardown();
    });

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

        consoleChecker.checkNoOutput();
      });
    }
  });

  // -----------------------------
  // VALID ENVS
  // -----------------------------
  describe("valid envs", () => {
    const validEnvPaths = fixtures.getValidEnvs();
    const consoleChecker = new ConsoleChecker();

    beforeEach(() => {
      consoleChecker.setup();
    });

    afterEach(() => {
      consoleChecker.teardown();
    });

    it(`should have at least one valid env fixture`, () => {
      expect(validEnvPaths.length).toBeGreaterThan(0);
    });

    for (const [index, envFixturePath] of validEnvPaths.entries()) {
      it(`valid env ${envFixturePath} should load env variables correctly`, () => {
        const envContent = fs.readFileSync(envFixturePath, "utf-8");
        const parsedEnv = dotenv.parse(envContent);

        const mocker = new FileMocker();
        const configPath = mocker.createFileFromPath("config.json", fixtures.getValidConfigs()[0]);
        const envPath = mocker.createFileFromPath("var.env", envFixturePath);

        // Backup original env
        const originalEnv: Record<string, string | undefined> = {};
        Object.keys(parsedEnv).forEach(key => {
          originalEnv[key] = process.env[key];
        });

        try {
          const config = new Config(configPath, envPath);

          // Check that env vars are set
          for (const [key, value] of Object.entries(parsedEnv)) {
            expect(process.env[key]).toBe(value);
          }

          consoleChecker.checkNoOutput();
        } finally {
          // Restore env
          Object.keys(parsedEnv).forEach(key => {
            if (originalEnv[key] !== undefined) {
              process.env[key] = originalEnv[key];
            } else {
              delete process.env[key];
            }
          });
        }
      });
    }
  });

  // -----------------------------
  // INVALID ENVS
  // -----------------------------
  // TODO: Currently, we do not check the .env files to be correct in the Config.ts, maybe we will add that later on...


});