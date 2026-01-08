import { CtAuthProvider } from "./core/CtAuthProvider.js";
import { RejectResponse } from "./types/RadiusResponse.js";
import { AuthenticationError } from "./errors/AuthenticationError.js";
import pino from "pino";

export async function authenticateUser(config: string, env: string, username: string, logger: pino.Logger): Promise<number> {

    // Firstly, check that the logger is valid
    // All other checks are left to the CtAuthProvider class
    if (!logger) {
        console.log("Auth-Type := Reject");
        console.error("Internal Error: Logger instance is undefined or null but logger is required.");
        return 1;
    }


    try {

        const ct = new CtAuthProvider(config, env, logger);
        // authorize() returns a RadiusResponse instance (Accept, Reject, Challenge)
        const response = await ct.authorize(username);

        // Print RADIUS-compatible output
        console.log(response.toString());
        logger.info(`Forwarded response to user ${username}.`);

        // Everything is fine - exit with 0
        return 0;

    } catch (err: unknown) {

        // Error → Reject
        const reject = new RejectResponse();
        console.log(reject.toString());

        if (err instanceof AuthenticationError) {
            // Authentication error
            logger.warn(`Authentication Error: ${err.message}`);
        } else {
            // Some internal error
            const message = err instanceof Error ? err.message : String(err);
            logger.error(`Internal Error: ${message}`);
        }

        // Something went wrong - return with exit code 1
        return 1;

    }

}