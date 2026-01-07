import { vi, describe, it, expect } from 'vitest';
import { ChallengeResponse } from "../../src/types/RadiusResponse";

describe("ChallengeResponse", () => {
  it("throws for unsafe characters", () => {
    expect(() => new ChallengeResponse("bad\npass")).toThrow();
    expect(() => new ChallengeResponse("bad#pass")).toThrow();
    expect(() => new ChallengeResponse("bad\"pass")).toThrow();
  });

  it("accepts safe passwords", () => {
    expect(() => new ChallengeResponse("GoodPass123!")).not.toThrow();
  });
});
