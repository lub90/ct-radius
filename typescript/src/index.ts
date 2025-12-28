import { Command, type OptionValues } from "commander";
import pino from "pino";
import { CtAuthProvider } from "./core/CtAuthProvider.js";
import { RejectResponse } from "./types/RadiusResponse.js";
import { AuthenticationError } from "./errors/AuthenticationError.js";

export async function main() {
    const program = new Command();

    // Custom error handling
    program.configureOutput({
        writeErr: (str) => {
            console.error("Auth-Type := Reject");
            console.error("Internal Error:", str.trim());
            process.exit(1);
        }
    });

    // Command line arguments definition
    program
        .name("churchtools-radius-auth")
        .description("ChurchTools RADIUS Authenticator")
        .option("--log <path>", "Path to your log file")
        .requiredOption("--config <path>", "Path to your ChurchTools config file")
        .option("--env <path>", "Path to your .env file")
        .requiredOption("--username <name>", "Username for authentication");

    // Parse arguments
    program.parse();
    const args = program.opts();

    // Create logger
    const logger = createLogger(args.log);


    /*
     * Setup is finished, now run the real stuff here
     */
    await authenticateUser(args, logger);
}

export async function authenticateUser(args: OptionValues, logger: pino.Logger) {

    try {

        const ct = new CtAuthProvider(args.config, args.env, logger);
        // authorize() returns a RadiusResponse instance (Accept, Reject, Challenge)
        const response = await ct.authorize(args.username);
        
        // Print RADIUS-compatible output
        console.log(response.toString());
        logger.info(`Retrieved data for user ${args.username}.`);
        await safeExit(logger, 0);

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

        await safeExit(logger, 1);

    }

}

async function safeExit(logger: pino.Logger, code: number) {
    await logger.flush();
    process.exit(code);
}

function createLogger(logPath?: string) {
  const destination = logPath ?? "./authorize.log";

  return pino(
    {
        level: "info",
        timestamp: () => `,"time":"${new Date().toISOString()}"`,
        formatters: {
            level(label, number) {
                return { level: label.toUpperCase(), levelNum: number };
            }
        }
    },
    pino.transport({
      target: "pino/file",
      options: { destination }
    })
  );
}


// Run main if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    await main();
}
