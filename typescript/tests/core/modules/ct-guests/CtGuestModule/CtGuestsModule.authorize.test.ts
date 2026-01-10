import { describe, it, expect, vi, beforeEach } from "vitest";
import { CtGuestsModule } from "../../../../../src/core/modules/ct-guests/CtGuestsModule";
import { ChallengeResponse, RejectResponse } from "../../../../../src/types/RadiusResponse";
import type { UserRequest } from "../../../../../src/types/UserRequest";
import type { ChurchToolsClientType } from "../../../../../src/core/churchtoolsSetup";
import pino from "pino";

// ------------------------------
// Mock GuestDataService
// ------------------------------
const mockGet = vi.fn();

vi.mock("../../../../../src/core/modules/ct-guests/CtGuestDataService", () => {
  return {
    CtGuestDataService: vi.fn().mockImplementation(function () {
      this.get = mockGet;
    }),
  };
});


// ------------------------------
// Test Suite
// ------------------------------
describe("CtGuestsModule.authorize()", () => {
  let mockClient: ChurchToolsClientType;
  let mockLogger: pino.Logger;
  let module: CtGuestsModule;

  const config = {
    cachePath: "/tmp/test.sqlite",
    cacheTimeout: 60,
    vlansRequired: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockClient = {
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
    } as any;

    mockLogger = pino({ level: "silent" });

    module = new CtGuestsModule(mockClient, config, mockLogger);
  });

  // ---------------------------------------------------------------------------
  // USER NOT FOUND
  // ---------------------------------------------------------------------------
  it("returns null when user is not found", async () => {
    mockGet.mockResolvedValue(undefined);

    const req: UserRequest = { username: "ghost", requestedVlanId: undefined };
    const result = await module.authorize(req);

    expect(result).toBeNull();
  });

  // ---------------------------------------------------------------------------
  // VALID USER → CHALLENGE RESPONSE
  // ---------------------------------------------------------------------------
  it("returns ChallengeResponse for valid user", async () => {
    mockGet.mockResolvedValue({
      username: "alice",
      password: "pw123",
      valid: {
        from: new Date("2025-01-01"),
        to: new Date("2099-12-31"),
      },
    });

    const req: UserRequest = { username: "alice", requestedVlanId: undefined };
    const result = await module.authorize(req);

    expect(result).toBeInstanceOf(ChallengeResponse);
    expect(result?.cleartextPassword).toBe("pw123");
  });

  // ---------------------------------------------------------------------------
  // VALIDITY PERIOD
  // ---------------------------------------------------------------------------
  it("rejects user when validity period has expired", async () => {
    mockGet.mockResolvedValue({
      username: "alice",
      password: "pw123",
      valid: {
        from: new Date("2020-01-01"),
        to: new Date("2020-12-31"), // long expired
      },
    });

    const req: UserRequest = { username: "alice", requestedVlanId: undefined };
    const result = await module.authorize(req);

    expect(result).toBeInstanceOf(RejectResponse);
  });

  it("rejects user when validity period has not started yet", async () => {
    mockGet.mockResolvedValue({
      username: "alice",
      password: "pw123",
      valid: {
        from: new Date("2099-01-01"), // far in the future
        to: new Date("2099-12-31"),
      },
    });

    const req: UserRequest = { username: "alice", requestedVlanId: undefined };
    const result = await module.authorize(req);

    expect(result).toBeInstanceOf(RejectResponse);
  });

  // ---------------------------------------------------------------------------
  // VLAN HANDLING
  // ---------------------------------------------------------------------------
  it("includes VLAN attributes when user has assignedVlan", async () => {
    const moduleWithAllowedVlans = new CtGuestsModule(mockClient, {
      ...config,
      allowedVlans: [20]
    }, mockLogger);

    mockGet.mockResolvedValue({
      username: "alice",
      password: "pw123",
      assignedVlan: 20,
      valid: {
        from: new Date("2025-01-01"),
        to: new Date("2099-12-31"),
      },
    });

    const req: UserRequest = { username: "alice", requestedVlanId: undefined };
    const result = await moduleWithAllowedVlans.authorize(req);

    expect(result).toBeInstanceOf(ChallengeResponse);
    expect(result.vlan).toBeDefined();
    expect(result.vlan.tunnelPrivateGroupId).toBe(20);
    expect(result.vlan.tunnelType).toBe(13);
    expect(result.vlan.tunnelMediumType).toBe(6);
  });

  it("omits VLAN attributes when user has no assignedVlan", async () => {
    mockGet.mockResolvedValue({
      username: "alice",
      password: "pw123",
      valid: {
        from: new Date("2025-01-01"),
        to: new Date("2099-12-31"),
      },
    });

    const req: UserRequest = { username: "alice", requestedVlanId: undefined };
    const result = await module.authorize(req);

    expect(result).toBeInstanceOf(ChallengeResponse);
    expect(result.vlan).toBeUndefined();
  });

  // ---------------------------------------------------------------------------
  // VLAN REQUIREMENT ENFORCEMENT
  // ---------------------------------------------------------------------------
  it("thorws when vlansRequired=true and user has no VLAN", async () => {
    const moduleWithVlanRequired = new CtGuestsModule(mockClient, {
      ...config,
      vlansRequired: true,
    }, mockLogger);

    mockGet.mockResolvedValue({
      username: "alice",
      password: "pw123",
      valid: {
        from: new Date("2025-01-01"),
        to: new Date("2099-12-31"),
      },
    });

    const req: UserRequest = { username: "alice", requestedVlanId: undefined };
    await expect(moduleWithVlanRequired.authorize(req)).rejects.toThrow();
  });

  // ---------------------------------------------------------------------------
  // ERROR HANDLING
  // ---------------------------------------------------------------------------
  it("throws when GuestDataService.get() throws", async () => {
    mockGet.mockRejectedValue(new Error("backend-fail"));

    const req: UserRequest = { username: "alice", requestedVlanId: undefined };

    await expect(module.authorize(req)).rejects.toThrow("backend-fail");
  });

  it("throws when guest user has invalid date format", async () => {
    mockGet.mockResolvedValue({
      username: "alice",
      password: "pw123",
      valid: {
        from: "not-a-date" as unknown as Date,
        to: new Date("2099-12-31"),
      },
    });

    const req: UserRequest = { username: "alice", requestedVlanId: undefined };

    await expect(module.authorize(req)).rejects.toThrow();
  });


  // ---------------------------------------------------------------------------
  // VLAN ALLOWED LIST VALIDATION
  // ---------------------------------------------------------------------------

  describe("VLAN allowed list validation", () => {
    it("throws when returned VLAN is not in allowedVlans (user requested VLAN)", async () => {
      const moduleWithAllowed = new CtGuestsModule(mockClient, {
        ...config,
        allowedVlans: [10, 20, 30],
      }, mockLogger);

      mockGet.mockResolvedValue({
        username: "alice",
        password: "pw123",
        assignedVlan: 99, // not allowed
        valid: {
          from: new Date("2025-01-01"),
          to: new Date("2099-12-31"),
        },
      });

      const req: UserRequest = { username: "alice", requestedVlanId: 99 };

      await expect(moduleWithAllowed.authorize(req)).rejects.toThrow();
    });

    it("throws when returned VLAN is not in allowedVlans (vlansRequired=true, no requested VLAN)", async () => {
      const moduleWithAllowed = new CtGuestsModule(mockClient, {
        ...config,
        vlansRequired: true,
        allowedVlans: [10, 20, 30],
      }, mockLogger);

      mockGet.mockResolvedValue({
        username: "alice",
        password: "pw123",
        assignedVlan: 99, // not allowed
        valid: {
          from: new Date("2025-01-01"),
          to: new Date("2099-12-31"),
        },
      });

      const req: UserRequest = { username: "alice", requestedVlanId: undefined };

      await expect(moduleWithAllowed.authorize(req)).rejects.toThrow();
    });

    it("throw when returned VLAN is not in allowedVlans (vlansRequired=false)", async () => {
      const moduleWithAllowed = new CtGuestsModule(mockClient, {
        ...config,
        vlansRequired: false,
        allowedVlans: [10, 20, 30],
      }, mockLogger);

      mockGet.mockResolvedValue({
        username: "alice",
        password: "pw123",
        assignedVlan: 99, // not allowed
        valid: {
          from: new Date("2025-01-01"),
          to: new Date("2099-12-31"),
        },
      });

      const req: UserRequest = { username: "alice", requestedVlanId: undefined };

      await expect(moduleWithAllowed.authorize(req)).rejects.toThrow();
    });
  });

  // ---------------------------------------------------------------------------
  // USER REQUESTS SPECIFIC VLAN BUT WRONG VLAN IS RETURNED
  // ---------------------------------------------------------------------------

  describe("User requests specific VLAN but wrong VLAN is returned", () => {
    it("rejects when user requests VLAN X but backend returns VLAN Y (vlansRequired=true)", async () => {
      const moduleWithRequired = new CtGuestsModule(mockClient, {
        ...config,
        vlansRequired: true,
        allowedVlans: [55, 101, 20]
      }, mockLogger);

      mockGet.mockResolvedValue({
        username: "alice",
        password: "pw123",
        assignedVlan: 20, // backend returns VLAN 20
        valid: {
          from: new Date("2025-01-01"),
          to: new Date("2025-12-31"),
        },
      });

      const req: UserRequest = { username: "alice", requestedVlanId: 30 }; // user wants VLAN 30

      const result = await moduleWithRequired.authorize(req);
      expect(result).toBeInstanceOf(RejectResponse);
    });

    it("throws when user requests VLAN X and vlansRequired=true but backend returns no VLAN -> backend should return a VLAN, thus we throw in this case", async () => {
      const moduleWithRequired = new CtGuestsModule(mockClient, {
        ...config,
        vlansRequired: true,
      }, mockLogger);

      mockGet.mockResolvedValue({
        username: "alice",
        password: "pw123",
        valid: {
          from: new Date("2025-01-01"),
          to: new Date("2099-12-31"),
        },
        // no assignedVlan
      });

      const req: UserRequest = { username: "alice", requestedVlanId: 30 };

      await expect(moduleWithRequired.authorize(req)).rejects.toThrow();
    });

    it("rejects when user requests an allowed VLAN but backend returns no VLAN", async () => {
      const moduleWithAllowed = new CtGuestsModule(mockClient, {
        ...config,
        vlansRequired: false,
        allowedVlans: [10, 20, 30],
      }, mockLogger);

      mockGet.mockResolvedValue({
        username: "alice",
        password: "pw123",
        valid: {
          from: new Date("2025-01-01"),
          to: new Date("2099-12-31"),
        },
        // backend returns NO VLAN
      });

      const req: UserRequest = { username: "alice", requestedVlanId: 20 };

      const result = await moduleWithAllowed.authorize(req);
      expect(result).toBeInstanceOf(RejectResponse);
    });


    it("rejects when user requests an allowed VLAN but backend returns a different VLAN", async () => {
      const moduleWithAllowed = new CtGuestsModule(mockClient, {
        ...config,
        vlansRequired: true,
        allowedVlans: [10, 20, 30],
      }, mockLogger);

      mockGet.mockResolvedValue({
        username: "alice",
        password: "pw123",
        assignedVlan: 30, // backend returns VLAN 30
        valid: {
          from: new Date("2025-01-01"),
          to: new Date("2099-12-31"),
        },
      });

      const req: UserRequest = { username: "alice", requestedVlanId: 20 };

      const result = await moduleWithAllowed.authorize(req);
      expect(result).toBeInstanceOf(RejectResponse);
    });


    it("allows user when requested VLAN matches backend VLAN (vlansRequired=true)", async () => {
      const moduleWithRequired = new CtGuestsModule(mockClient, {
        ...config,
        vlansRequired: true,
        allowedVlans: [30, 44, 50]
      }, mockLogger);

      mockGet.mockResolvedValue({
        username: "alice",
        password: "pw123",
        assignedVlan: 30, // backend returns VLAN 30
        valid: {
          from: new Date("2025-01-01"),
          to: new Date("2099-12-31"),
        },
      });

      const req: UserRequest = { username: "alice", requestedVlanId: 30 };

      const result = await moduleWithRequired.authorize(req);

      expect(result).toBeInstanceOf(ChallengeResponse);
      expect(result.cleartextPassword).toBe("pw123");
      expect(result.vlan).toBeDefined();
      expect(result.vlan.tunnelPrivateGroupId).toBe(30);
      expect(result.vlan.tunnelType).toBe(13);
      expect(result.vlan.tunnelMediumType).toBe(6);
    });

  });



  describe("Password handling edge cases", () => {
    it("throws on cleartext password with special characters", async () => {
      const specialPassword = "P@ssw0rd! café-ß-µ-漢字";

      mockGet.mockResolvedValue({
        username: "alice",
        password: specialPassword,
        valid: {
          from: new Date("2025-01-01"),
          to: new Date("2099-12-31"),
        },
      });

      const req: UserRequest = { username: "alice", requestedVlanId: undefined };
      await expect(module.authorize(req)).rejects.toThrow();
    });

    it("handles very long passwords", async () => {
      const longPassword = "x".repeat(5000);

      mockGet.mockResolvedValue({
        username: "alice",
        password: longPassword,
        valid: {
          from: new Date("2025-01-01"),
          to: new Date("2099-12-31"),
        },
      });

      const req: UserRequest = { username: "alice", requestedVlanId: undefined };
      const result = await module.authorize(req);

      expect(result).toBeInstanceOf(ChallengeResponse);
      expect(result.cleartextPassword).toBe(longPassword);
    });
  });


  describe("Username edge cases", () => {
    it("handles usernames with different cases distinctly", async () => {
      mockGet.mockImplementation(async (username: string) => {
        if (username === "TestUser") {
          return {
            username,
            password: "pw1",
            valid: {
              from: new Date("2025-01-01"),
              to: new Date("2099-12-31"),
            },
          };
        }
        if (username === "testuser") {
          return {
            username,
            password: "pw2",
            valid: {
              from: new Date("2025-01-01"),
              to: new Date("2099-12-31"),
            },
          };
        }
        return undefined;
      });

      const req1: UserRequest = { username: "TestUser", requestedVlanId: undefined };
      const res1 = await module.authorize(req1);
      const req2: UserRequest = { username: "testuser", requestedVlanId: undefined };
      const res2 = await module.authorize(req2);

      expect(res1).toBeInstanceOf(ChallengeResponse);
      expect(res2).toBeInstanceOf(ChallengeResponse);
      expect((res1 as ChallengeResponse).cleartextPassword).toBe("pw1");
      expect((res2 as ChallengeResponse).cleartextPassword).toBe("pw2");
    });

    it("handles very long usernames", async () => {
      const longUsername = "u".repeat(1000);

      mockGet.mockResolvedValue({
        username: longUsername,
        password: "pw123",
        valid: {
          from: new Date("2025-01-01"),
          to: new Date("2099-12-31"),
        },
      });

      const req: UserRequest = { username: longUsername, requestedVlanId: undefined };
      const result = await module.authorize(req);

      expect(result).toBeInstanceOf(ChallengeResponse);
    });
  });



  describe("VLAN edge values", () => {
    it("handles VLAN ID 0", async () => {
      const moduleWithAllowed = new CtGuestsModule(mockClient, {
        ...config,
        allowedVlans: [0],
      }, mockLogger);

      mockGet.mockResolvedValue({
        username: "alice",
        password: "pw123",
        assignedVlan: 0,
        valid: {
          from: new Date("2025-01-01"),
          to: new Date("2099-12-31"),
        },
      });

      const req: UserRequest = { username: "alice", requestedVlanId: undefined };
      const result = await moduleWithAllowed.authorize(req);

      expect(result).toBeInstanceOf(ChallengeResponse);
      expect(result.vlan).toBeDefined();
      expect(result.vlan.tunnelPrivateGroupId).toBe(0);
    });

    it("handles maximum VLAN ID 4094", async () => {
      const moduleWithAllowed = new CtGuestsModule(mockClient, {
        ...config,
        allowedVlans: [4094],
      }, mockLogger);

      mockGet.mockResolvedValue({
        username: "alice",
        password: "pw123",
        assignedVlan: 4094,
        valid: {
          from: new Date("2025-01-01"),
          to: new Date("2099-12-31"),
        },
      });

      const req: UserRequest = { username: "alice", requestedVlanId: undefined };
      const result = await moduleWithAllowed.authorize(req);

      expect(result).toBeInstanceOf(ChallengeResponse);
      expect(result.vlan).toBeDefined();
      expect(result.vlan.tunnelPrivateGroupId).toBe(4094);
    });
  });




});
