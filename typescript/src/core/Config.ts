import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";

export interface AppConfig {
    allowRequestedVlan: boolean; // whether users may request VLANs
    // TODO: Must be set and have at least one char, if allowRequestedVlan is true
    vlanSeparator: string; // e.g. "#", ".", "-", "_vlan_"
    modules: string[];

    // Module-specific configs
    [moduleName: string]: unknown;
}

export class Config {
  private config: AppConfig;

  constructor(configPath: string, envPath?: string) {
    if (envPath) {
      dotenv.config({ path: envPath });
    }

    this.config = this.loadConfig(configPath);
  }

  private loadConfig(configPath: string): AppConfig {
    const absolute = path.resolve(configPath);

    // Check if file exists before reading
    if (!fs.existsSync(absolute)) {
        throw new Error(
            `Configuration file not found at '${absolute}'. ` +
            `Please verify the path and ensure the file exists.`
        );
    }

    let raw: string;
    try {
        raw = fs.readFileSync(absolute, "utf-8");
    } catch (err) {
        throw new Error(
            `Failed to read configuration file at '${absolute}'. ` +
            `Ensure the file is readable and permissions are correct.`
        );
    }

    let json: unknown;
    try {
        json = JSON.parse(raw);
    } catch (err) {
        throw new Error(
            `Configuration file at '${absolute}' contains invalid JSON. ` +
            `Please fix the syntax and try again.`
        );
    }

    // TODO: Optionally merge environment variables
    // TODO: Especially for modules...

    return json as AppConfig;
  }

  get(): AppConfig {
    return this.config;
  }
}
