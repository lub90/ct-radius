import { Config } from "./Config.js";
import { RejectResponse, RadiusResponse } from "../types/RadiusResponse.js";
import type { AuthModule } from "./AuthModule.js";
import type { AppConfig } from "./AppConfigSchema.js";
import { AuthenticationError } from "../errors/AuthenticationError.js";
import type { UserRequest } from "../types/UserRequest.js";
import { moduleRegistry } from "./ModuleRegistry.js";
import pino from "pino";
import { ChurchToolsClient } from "@churchtools/churchtools-client";

export class CtAuthProvider {

    private readonly modules: AuthModule[];
    private readonly config: AppConfig;
    private readonly logger: pino.Logger;

    constructor(configPath: string, envPath: string | undefined, logger: pino.Logger) {
        this.logger = logger;
        this.config = new Config(configPath, envPath).get();
        this.modules = this.loadModules(this.config);
    }

    private loadModules(config: AppConfig): AuthModule[] {


        return config.modules.map((name) => {
            // Get the module-specific config
            const moduleConfig = config[name] ?? {};

            // The factory method to generate the module
            const factory = moduleRegistry[name];
            if (!factory) {
                throw new Error(`Unknown authorization module '${name}' in config!`);
            }

            // Generate a churchtools client for this module
            const churchtoolsClient = new ChurchToolsClient(this.config.backendConfig.serverUrl, this.config.backendConfig.apiToken);

            // Create the module and return it
            return factory(churchtoolsClient, moduleConfig, this.logger);
        });
    }


    async authorize(username: string): Promise<RadiusResponse> {

        // Get the cleaned up username, if an error occurs it will be caught in the index.ts
        const cleaned: UserRequest = this.cleanUsername(username, this.config);

        for (const module of this.modules) {
            const result = await module.authorize(cleaned);

            if (result === null || result === undefined) continue;

            if (!(result instanceof RadiusResponse)) {
                throw new Error("Invalid response from authorization module");
            }

            return result;
        }

        return new RejectResponse();
    }

    private cleanUsername(raw: string, config: AppConfig): UserRequest {
        const trimmed = (raw ?? "").trim();

        if (!trimmed) {
            throw new AuthenticationError("The provided username is empty");
        }

        // If VLAN requests are disabled → simple case
        if (!config.allowRequestedVlan) {
            return {
                username: trimmed.toLowerCase()
            };
        }

        // VLAN requests enabled → split by separator
        const sep = config.vlanSeparator;

        // If separator not present → no VLAN requested
        if (!trimmed.includes(sep)) {
            return {
                username: trimmed.toLowerCase()
            };
        }

        // Seperator is present → separate
        const parts = trimmed.split(sep);
        // Too many separators
        if (parts.length > 2) {
            throw new AuthenticationError(
                `Invalid username format: too many '${sep}' separators. Expected '<username>${sep}<vlanId>'.`
            );
        }
        const [userPart, vlanPart] = parts;
        const username = userPart!.trim();
        const vlanString = vlanPart?.trim();

        if (!username) {
            throw new AuthenticationError(
                `Invalid username format: expected '<username>${sep}<vlanId>', but the username part before '${sep}' is empty.`
            );
        }

        if (!vlanString) {
            throw new AuthenticationError(
                `Invalid username format: expected '<username>${sep}<vlanId>', but no VLAN ID was provided after '${sep}'.`
            );
        }

        // Becomes NaN if vlanString is not a number → the following check will fail
        const vlanId = Number(vlanString);

        if (!Number.isInteger(vlanId) || vlanId < 0) {
            throw new AuthenticationError(
                `Invalid VLAN ID '${vlanString}'. VLAN IDs must be a non-negative integer (0 or higher).`
            );
        }

        return {
            username: username.toLowerCase(),
            requestedVlanId: vlanId,
        };
    }


}

