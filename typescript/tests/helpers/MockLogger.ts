import type pino from "pino";

export class MockLogger {
  // Stores all log messages in memory
  public logs: { level: string; msg: string }[] = [];

  // Required by pino.Logger interface
  level = "debug";

  // Generic log collector
  private push(level: string, msg: any) {
    this.logs.push({ level, msg: String(msg) });
  }

  // Implement the log methods you use
  debug(msg: any, ..._args: any[]) {
    this.push("debug", msg);
  }

  info(msg: any, ..._args: any[]) {
    this.push("info", msg);
  }

  warn(msg: any, ..._args: any[]) {
    this.push("warn", msg);
  }

  error(msg: any, ..._args: any[]) {
    this.push("error", msg);
  }

  fatal(msg: any, ..._args: any[]) {
    this.push("fatal", msg);
  }

  silent(msg: any, ..._args: any[]) {
    this.push("silent", msg);
    }

  // IMPORTANT: child() returns *something shaped like a logger*, not typed as pino.Logger
  child(): MockLogger {
    return this;
    }

  // Optional: clear logs between tests
  clear() {
    this.logs = [];
  }
}

// Export a type that is "close enough" to pino.Logger for the constructor
export type TestLogger = Pick<
    pino.Logger,
    "debug" | "info" | "warn" | "error" | "fatal" | "trace" | "silent" | "child"
    >;
