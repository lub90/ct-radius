import { describe, it, expect } from "vitest";
import { ChallengeResponse } from "../../src/types/RadiusResponse";

const LETTERS = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
const DIGITS = "0123456789";
const SYMBOLS = "!@$%&*-_+=?.";
const ALLOWED = LETTERS + DIGITS + SYMBOLS;

// Everything except allowed chars
// Includes whitespace, quotes, control chars, shell chars, FR-unsafe chars, etc.
const ALL_POSSIBLE = Array.from({ length: 127 }, (_, i) => String.fromCharCode(i)).join("");
const FORBIDDEN = ALL_POSSIBLE.split("").filter(ch => !ALLOWED.includes(ch));

describe("ChallengeResponse", () => {
  it("accepts ALL allowed characters individually", () => {
    for (const ch of ALLOWED) {
      expect(() => new ChallengeResponse(`Good${ch}Pass`)).not.toThrow();
    }
  });

  it("throws for ALL forbidden characters individually", () => {
    for (const ch of FORBIDDEN) {
      // Skip unprintable null byte in template literal
      const pwd = ch === "\0" ? "bad" + String.fromCharCode(0) + "pass" : `bad${ch}pass`;

      expect(() => new ChallengeResponse(pwd)).toThrow();
    }
  });

  it("throws for known unsafe examples", () => {
    expect(() => new ChallengeResponse("bad\npass")).toThrow();
    expect(() => new ChallengeResponse("bad#pass")).toThrow();
    expect(() => new ChallengeResponse('bad"pass')).toThrow();
  });

  it("accepts a typical safe password", () => {
    expect(() => new ChallengeResponse("GoodPass123!")).not.toThrow();
  });
});
