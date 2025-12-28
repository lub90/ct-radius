import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";
import { AppConfigSchema, type AppConfig } from "./AppConfigSchema.js";

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

    // Validate global config
    const parsed = AppConfigSchema.safeParse(json);
    if (!parsed.success) {
        const errors = parsed.error.issues
            .map(e => `- ${e.path.join(".")}: ${e.message}`)
            .join("\n");
        throw new Error(`Invalid configuration:\n${errors}`);
    }
    
    return parsed.data;
  }

  get(): AppConfig {
    return this.config;
  }
}
