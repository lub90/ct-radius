import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";
import { AppConfigSchema, type AppConfig } from "./AppConfigSchema.js";

export class Config {
    private config: AppConfig;

    constructor(configPath: string, envPath?: string) {
        if (envPath) {
            this.loadEnv(envPath);
        }

        this.config = this.loadConfig(configPath);
    }

    private loadEnv(envPath: string): void {
        // Check if file exists before loading
        if (!fs.existsSync(envPath)) {
            throw new Error(`Env file not found at path: ${envPath}`);
        }

        // Load environment variables
        const result = dotenv.config({ path: envPath, quiet: true });

        // dotenv only throws on file read errors, not syntax errors
        if (result.error) {
            throw new Error(`Failed to load env file '${envPath}': ${result.error.message}`);
        }
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

        let json: any;
        try {
            json = JSON.parse(raw);
        } catch (err) {
            throw new Error(
                `Configuration file at '${absolute}' contains invalid JSON. ` +
                `Please fix the syntax and try again.`
            );
        }

        if ("backendConfig" in json) {
            throw new Error("backendConfig must not be defined in the JSON config file. Use environment variables instead.");
        }

        // Merge the environment variables into the config
        const merged = {
            ...json,

            // Backend config must be delivered via the environment variables
            backendConfig: {
                serverUrl:
                    process.env.CT_SERVER_URL,

                apiToken:
                    process.env.CT_API_TOKEN
            }
        };

        // Validate global config
        const parsed = AppConfigSchema.safeParse(merged);
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
