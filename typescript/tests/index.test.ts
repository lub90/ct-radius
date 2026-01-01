import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import * as index from "../src/index.js"; // IMPORTANT: namespace import
import { authenticateUser } from "../src/authenticateUser.js";


vi.mock("../src/authenticateUser.js", () => ({
  authenticateUser: vi.fn(),
}));

describe("main", () => {
  let originalArgv: string[];

  beforeEach(() => {
    originalArgv = process.argv;

    // process.exit mock to prevent real ending, we are then catching the error and checking for correct return type
    vi.spyOn(process, "exit").mockImplementation((code: number) => { throw new Error(`EXIT_${code}`); });
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    process.argv = originalArgv;
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  it("should reject when required --config is missing", async () => {
    process.argv = ["node", "script.js", "--username", "testuser"];
    (authenticateUser as any).mockResolvedValue(0);

    await expect(index.main()).rejects.toThrow("EXIT_1");

    expect(console.log).toHaveBeenCalledWith("Auth-Type := Reject");
    expect(console.error).toHaveBeenCalledTimes(1);
    expect(authenticateUser).not.toHaveBeenCalled();
    expect(process.exit).toHaveBeenCalledWith(1);
  });

  it("should reject when required --username is missing", async () => {
    process.argv = ["node", "script.js", "--config", "config.json"];
    (authenticateUser as any).mockResolvedValue(0);

    await expect(index.main()).rejects.toThrow("EXIT_1");

    expect(console.log).toHaveBeenCalledWith("Auth-Type := Reject");
    expect(console.error).toHaveBeenCalledTimes(1);
    expect(authenticateUser).not.toHaveBeenCalled();
    expect(process.exit).toHaveBeenCalledWith(1);
  });

  it("should call authenticateUser with correct parameters and exit correctly", async () => {
    (authenticateUser as any).mockResolvedValue(0);

    process.argv = [
      "node",
      "script.js",
      "--config",
      "config.json",
      "--username",
      "testuser",
      "--env",
      "env.file",
      "--log",
      "mylog.log",
    ];

    await expect(index.main()).rejects.toThrow("EXIT_0");

    expect(authenticateUser).toHaveBeenCalledWith(
      "config.json",
      "env.file",
      "testuser",
      expect.any(Object) // logger
    );
    expect(authenticateUser).toHaveBeenCalledTimes(1);
    expect(process.exit).toHaveBeenCalledWith(0);
  });

  it("should exit with code returned by authenticateUser", async () => {
    (authenticateUser as any).mockResolvedValue(1);

    process.argv = [
      "node",
      "script.js",
      "--config",
      "config.json",
      "--username",
      "testuser",
    ];

    await expect(index.main()).rejects.toThrow("EXIT_1");

    expect(authenticateUser).toHaveBeenCalledTimes(1);
    expect(process.exit).toHaveBeenCalledWith(1);
  });
});
