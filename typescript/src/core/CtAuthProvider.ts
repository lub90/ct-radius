import { Config } from "./Config.js";
import { RejectResponse, RadiusResponse } from "../types/RadiusResponse.js";
import type { AuthModule } from "./AuthModule.js";
import type { AppConfig } from "./AppConfigSchema.js";
import { AuthenticationError } from "../errors/AuthenticationError.js";
import type { UserRequest } from "../types/UserRequest.js";
import { moduleRegistry } from "./ModuleRegistry.js";
import pino from "pino";
import { ChurchToolsClient, axiosCookieJarSupport, tough } from "./churchtoolsSetup.js";
import { resolveModuleConfig } from "./resolveModuleConfig.js";




export class CtAuthProvider {

    public static readonly ALLOWED_REQUEST_ROUTES = ["wifi", "vpn"];

    private readonly modules: AuthModule[];
    private readonly config: AppConfig;
    private readonly requestRoute: string;
    private readonly logger: pino.Logger;

    constructor(configPath: string, envPath: string | undefined, requestRoute: string, logger: pino.Logger) {
        this.logger = logger;
        this.config = new Config(configPath, envPath).get();
        if (!CtAuthProvider.ALLOWED_REQUEST_ROUTES.includes(requestRoute)) {
            throw new Error(`Invalid request route '${requestRoute}'. Allowed routes are: ${CtAuthProvider.ALLOWED_REQUEST_ROUTES.join(", ")}`);
        }
        this.requestRoute = requestRoute;
        this.modules = this.loadModules(this.config);
    }

    private loadModules(config: AppConfig): AuthModule[] {
        const route = this.requestRoute;

        // Get module names for this route
        const moduleNames = config.requestRoutes[route]?.modules ?? [];

        return moduleNames.map((moduleName) => {
            // Resolve full module config (handles inheritance)
            const resolvedConfig = resolveModuleConfig(config, moduleName);

            // Extract the module type
            const moduleType = resolvedConfig.type;
            if (!moduleType) {
                throw new Error(
                    `Module '${moduleName}' resolved without a 'type'. This should not happen.`
                );
            }

            // Get the factory for this module type
            const factory = moduleRegistry[moduleType];
            if (!factory) {
                throw new Error(
                    `Unknown module type '${moduleType}' for module '${moduleName}'.`
                );
            }

            // Create a ChurchTools client
            const churchtoolsClient = new ChurchToolsClient(
                this.config.backendConfig.serverUrl,
                this.config.backendConfig.apiToken
            );
            churchtoolsClient.setCookieJar(
                axiosCookieJarSupport.wrapper,
                new tough.CookieJar()
            );

            // Instantiate the module
            return factory(churchtoolsClient, resolvedConfig, this.logger);
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

        this.logger.info(`User ${username} not known by any module - reject request.`);
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

