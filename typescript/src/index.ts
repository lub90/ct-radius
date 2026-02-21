import { Command, type OptionValues } from "commander";
import pino from "pino";
import { authenticateUser } from "./authenticateUser.js";

export async function main() {
    const program = new Command();

    // Custom error handling
    program.configureOutput({
        writeErr: (str) => {
            console.log("Auth-Type := Reject");
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
        .requiredOption("--requestRoute <name>", "The request route for this authentication attempt (e.g., 'wifi' or 'vpn')")
        .requiredOption("--username <name>", "Username for authentication");

    // Parse arguments
    program.parse();
    const args = program.opts();

    // Create logger
    const logger = createLogger(args.log);


    /*
     * Setup is finished, now run the real stuff here
     */
    const exitCode = await authenticateUser(args.config, args.env, args.username, args.requestRoute, logger);
    await safeExit(logger, exitCode);
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
