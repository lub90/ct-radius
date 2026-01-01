import { describe, it, expect, beforeEach, vi } from "vitest";
import pino from "pino";
import { CtAuthProvider } from "../../../src/core/CtAuthProvider.js";
import { Config } from "../../../src/core/Config.js";
import { moduleRegistry } from "../../../src/core/ModuleRegistry.js";
import { AuthenticationError } from "../../../src/errors/AuthenticationError.js";

// ----------------------
// Mocks
// ----------------------
vi.mock("../../../src/core/Config.js", () => ({
  Config: vi.fn()
}));

vi.mock("../../../src/core/ModuleRegistry.js", () => ({
  moduleRegistry: {}
}));

// Fake logger
const fakeLogger = pino({ level: "silent" });

// Fake module factory
const fakeModule = {
  authorize: vi.fn().mockResolvedValue(null)
};

// Helper: create provider with injected config + fake module
function createProviderWithConfig(config) {
  // Mock Config.get()
  (Config as any).mockImplementation(function () {
    return { get: vi.fn().mockReturnValue(config) };
  });

  // Inject one fake module so authorize() runs cleanUsername()
  moduleRegistry["dummy"] = vi.fn().mockReturnValue(fakeModule);

  return new CtAuthProvider("config.json", undefined, fakeLogger);
}

// Helper: generate username variants (Python equivalent)
function generateUsernameVariants(s) {
  if (!s) return ["", "", "", ""];

  const variant1 = " " + s;
  const variant2 = s.toUpperCase();
  const mid = Math.floor(s.length / 2);
  const variant3 = s.slice(0, mid) + s[mid].toUpperCase() + s.slice(mid + 1);
  const variant4 = s + " ";

  return [variant1, variant2, variant3, variant4];
}

describe("CtAuthProvider.cleanUsername (indirect via authorize)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.keys(moduleRegistry).forEach(k => delete moduleRegistry[k]);
  });

  // ------------------------------------------------------------
  // 1. Empty usernames → AuthenticationError
  // ------------------------------------------------------------
  for (const allowRequestedVlan of [false, true]) {
    const emptyUsernames = [
        "",
        undefined,
        null,
        " ",
        "\t",
        "\n",
        "\r",
        "\f",
        "\v",
        "  \t  ",
        "\n\r\t "
    ];

    for (const raw of emptyUsernames) {
        it(`throws AuthenticationError for empty username variant: ${JSON.stringify(raw)}`, async () => {
        const provider = createProviderWithConfig({
            allowRequestedVlan: allowRequestedVlan,
            modules: ["dummy"]
        });

        await expect(provider.authorize(raw as any))
            .rejects
            .toBeInstanceOf(AuthenticationError);
        });
    }
 }

  // ------------------------------------------------------------
  // 2. Valid usernames without VLAN tag
  // ------------------------------------------------------------

  for (const allowRequestedVlan of [false, true]) {
    const validUsers = ["alice", "bob123", "john.doe", "USER"];

    for (const user of validUsers) {
        it(`accepts valid username without VLAN: ${user}`, async () => {
        const provider = createProviderWithConfig({
            allowRequestedVlan: allowRequestedVlan,
            modules: ["dummy"]
        });

        await provider.authorize(user);

        expect(fakeModule.authorize).toHaveBeenCalledWith({
            username: user.trim().toLowerCase()
        });
        });
    }
  }

  // ------------------------------------------------------------
  // 3. Valid usernames with variants (whitespace, uppercase, mid-capitalized)
  // ------------------------------------------------------------
  for (const allowRequestedVlan of [false, true]) {
    for (const base of ["alice", "bob", "charlie"]) {
        const variants = generateUsernameVariants(base);

        for (const variant of variants) {
        it(`normalizes username variant '${variant}' → '${base}'`, async () => {
            const provider = createProviderWithConfig({
            allowRequestedVlan: allowRequestedVlan,
            modules: ["dummy"]
            });

            await provider.authorize(variant);

            expect(fakeModule.authorize).toHaveBeenCalledWith({
            username: base.toLowerCase()
            });
        });
        }
    }
  }

  // ------------------------------------------------------------
  // 4. Valid usernames with proper VLAN tags
  // ------------------------------------------------------------
  const vlanUsers = [
    ["alice|10", "alice", 10],
    ["Bob|0", "bob", 0],
    ["John|999", "john", 999]
  ];

  for (const [raw, expectedUser, vlan] of vlanUsers) {
    it(`parses VLAN username '${raw}' correctly`, async () => {
      const provider = createProviderWithConfig({
        allowRequestedVlan: true,
        vlanSeparator: "|",
        modules: ["dummy"]
      });

      await provider.authorize(raw);

      expect(fakeModule.authorize).toHaveBeenCalledWith({
        username: expectedUser,
        requestedVlanId: vlan
      });
    });
  }


    // ------------------------------------------------------------
    // 4b. Valid VLAN usernames with whitespace around separator
    // ------------------------------------------------------------
    const vlanUsersWithWhitespace = [
    [" alice | 10 ", "alice", 10],
    ["Bob | 0", "bob", 0],
    [" John| 999 ", "john", 999]
    ];

    for (const [raw, expectedUser, vlan] of vlanUsersWithWhitespace) {
    it(`parses VLAN username with whitespace '${raw}' correctly`, async () => {
        const provider = createProviderWithConfig({
        allowRequestedVlan: true,
        vlanSeparator: "|",
        modules: ["dummy"]
        });

        await provider.authorize(raw);

        expect(fakeModule.authorize).toHaveBeenCalledWith({
        username: expectedUser,
        requestedVlanId: vlan
        });
    });
    }


  // ------------------------------------------------------------
  // 5. Invalid VLAN formats → AuthenticationError
  // ------------------------------------------------------------
  const invalidVlanCases = [
    "alice|",       // no VLAN ID
    "alice|abc",    // non-numeric
    "alice|-1",     // negative
    "alice|10.5",   // float
    "|10",          // missing username
    "|",            // nothing
    " |10",         // whitespace username
    "alice|10|20",  // two separators
    "alice| "       // whitespace VLAN ID
  ];

  for (const raw of invalidVlanCases) {
    it(`throws AuthenticationError for invalid VLAN username: '${raw}'`, async () => {
      const provider = createProviderWithConfig({
        allowRequestedVlan: true,
        vlanSeparator: "|",
        modules: ["dummy"]
      });

      await expect(provider.authorize(raw))
        .rejects
        .toBeInstanceOf(AuthenticationError);
    });
  }

    // ------------------------------------------------------------
    // X. VLAN separator present but allowRequestedVlan = false, ignore it and treat as normal username
    // ------------------------------------------------------------
    const vlanIgnoredCases = [
    ["alice|10", "alice|10"],
    [" Bob | 20 ", "bob | 20"],
    ["charlie|999", "charlie|999"]
    ];

    for (const [raw, expectedUser] of vlanIgnoredCases) {
    it(`ignores VLAN when allowRequestedVlan=false for '${raw}'`, async () => {
        const provider = createProviderWithConfig({
        allowRequestedVlan: false,
        vlanSeparator: "|",
        modules: ["dummy"]
        });

        await provider.authorize(raw);

        expect(fakeModule.authorize).toHaveBeenCalledWith({
        username: expectedUser
        });
    });
    }



});
