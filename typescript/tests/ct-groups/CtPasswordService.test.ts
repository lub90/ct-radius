import { describe, it, expect, vi, beforeEach } from "vitest";
import crypto from "crypto";
import path from "path";
import fs from "fs";
import CtPasswordService from "../../src/core/modules/ct-groups/CtPasswordService";

describe("CtPasswordService", () => {
  const fixturesDir = path.resolve(__dirname, "fixtures", "keys");
  const privateKeyPlain = path.join(fixturesDir, "privateKey1.pem");
  const privateKeyEncrypted = path.join(fixturesDir, "privateKey1Encrypted.pem");
  const passphraseFile = path.join(fixturesDir, "privateKey1Passphrase");
  const privateKeyPwd = fs.readFileSync(passphraseFile, "utf8").trim();
  const publicKey = path.join(fixturesDir, "publicKey1.pem");

  const apiToken = "api-token";
  const serverUrl = "https://example.com";

  beforeEach(async () => {
    vi.restoreAllMocks();
  });

  it("constructor throws when any argument is undefined", () => {
    expect(() => new CtPasswordService(undefined as any, passphraseFile, apiToken, serverUrl)).toThrow();
    expect(() => new CtPasswordService(privateKeyEncrypted, undefined as any, apiToken, serverUrl)).toThrow();
    expect(() => new CtPasswordService(privateKeyEncrypted, passphraseFile, undefined as any, serverUrl)).toThrow();
    expect(() => new CtPasswordService(privateKeyEncrypted, passphraseFile, apiToken, undefined as any)).toThrow();
    // Check that no unencrypted private keys are allowed
    expect(() => new CtPasswordService(privateKeyPlain, "", apiToken, serverUrl)).toThrow();
    expect(() => new CtPasswordService(privateKeyPlain, " ", apiToken, serverUrl)).toThrow();
  });

  it("getEncryptedPwd rejects for invalid userId values", async () => {
    const instance = new CtPasswordService(privateKeyEncrypted, privateKeyPwd, apiToken, serverUrl);
    await expect(instance.getEncryptedPwd(0 as any)).rejects.toThrow();
    await expect(instance.getEncryptedPwd(-5 as any)).rejects.toThrow();
    await expect(instance.getEncryptedPwd(NaN as any)).rejects.toThrow();
    await expect(instance.getEncryptedPwd(("abc" as unknown) as number)).rejects.toThrow();
  });

  it("getEncryptedPwd handles 200/404/other responses", async () => {
    const instance = new CtPasswordService(privateKeyEncrypted, privateKeyPwd, apiToken, serverUrl);

    const fake200 = { status: 200, json: async () => ({ secondaryPassword: "PAY" }) } as any;
    vi.stubGlobal("fetch", vi.fn(async () => fake200));
    await expect(instance.getEncryptedPwd(1)).resolves.toBe("PAY");

    const fake404 = { status: 404 } as any;
    (globalThis as any).fetch = vi.fn(async () => fake404);
    await expect(instance.getEncryptedPwd(2)).resolves.toBeUndefined();

    const fake500 = { status: 500, text: async () => "err" } as any;
    (globalThis as any).fetch = vi.fn(async () => fake500);
    await expect(instance.getEncryptedPwd(3)).rejects.toThrow();
  });

  it("getEncryptedPwd throws when JSON parsing fails", async () => {
    const instance = new CtPasswordService(privateKeyEncrypted, privateKeyPwd, apiToken, serverUrl);

    const fakeBadJson = {
      status: 200,
      json: async () => { throw new Error("invalid json") }
    } as any;

    vi.stubGlobal("fetch", vi.fn(async () => fakeBadJson));

    await expect(instance.getEncryptedPwd(1)).rejects.toThrow();
  });

  it("getEncryptedPwd throws when secondaryPassword is missing", async () => {
    const instance = new CtPasswordService(privateKeyEncrypted, privateKeyPwd, apiToken, serverUrl);

    const fakeMissingField = {
      status: 200,
      json: async () => ({})
    } as any;

    vi.stubGlobal("fetch", vi.fn(async () => fakeMissingField));

    await expect(instance.getEncryptedPwd(1)).rejects.toThrow();
  });


  // Helper to encrypt with provided public key and return base64 string
  function encryptWithPublic(cleartext: string): string {
    const pub = fs.readFileSync(publicKey, "utf8");
    const encrypted = crypto.publicEncrypt({ key: pub, oaepHash: "sha256", padding: crypto.constants.RSA_PKCS1_OAEP_PADDING }, Buffer.from(cleartext, "utf8"));
    return encrypted.toString("base64");
  }

  it("getEncryptedPwd sends correct request", async () => {
    const instance = new CtPasswordService(privateKeyEncrypted, privateKeyPwd, apiToken, serverUrl);

    const fake200 = { status: 200, json: async () => ({ secondaryPassword: "X" }) };
    const fetchMock = vi.fn(async () => fake200);
    vi.stubGlobal("fetch", fetchMock);

    await instance.getEncryptedPwd(123);

    expect(fetchMock).toHaveBeenCalledWith(
      "https://example.com/entries/123",
      {
        method: "GET",
        headers: {
          "Authorization": `Login ${apiToken}`
        }
      }
    );

  });


  it("decryptPwd does not decrypt the payloads using a plain private key if a passphrase is provided", async () => {
    const instance = new CtPasswordService(privateKeyPlain, "abc", apiToken, serverUrl);

    const payloads = [
      "lowercaseletters",
      "1234567890",
      "special!@#$%^&*()",
      "mix3dChars!@#123abc",
      "abc",
      "p@ssw0rd!",
      "42-meaning"
    ];

    for (const p of payloads) {
      const enc = encryptWithPublic(p);
      await expect(instance.decryptPwd(enc)).rejects.toThrow();
    }
  });

  it("decryptPwd decrypts payloads using encrypted private key and passphrase", async () => {
    const instance = new CtPasswordService(privateKeyEncrypted, privateKeyPwd, apiToken, serverUrl);

    const payloads = [
      "lowercaseletters",
      "1234567890",
      "special!@#$%^&*()",
      "mix3dChars!@#123abc",
      "abc",
      "p@ssw0rd!",
      "42-meaning"
    ];

    for (const p of payloads) {
      const enc = encryptWithPublic(p);
      await expect(instance.decryptPwd(enc)).resolves.toBe(p);
    }
  });

  it("decryptPwd throws when private key file is missing or passphrase wrong", async () => {
    const instanceMissing = new CtPasswordService(path.join(fixturesDir, "no-such.pem"), privateKeyPwd, apiToken, serverUrl);
    await expect(instanceMissing.decryptPwd("xxx")).rejects.toThrow();

    // wrong passphrase for encrypted key
    const instanceWrong = new CtPasswordService(privateKeyEncrypted, "wrong-pass", apiToken, serverUrl);
    const enc = encryptWithPublic("willfail");
    await expect(instanceWrong.decryptPwd(enc)).rejects.toThrow();
  });

  it("decryptPwd throws for invalid encryptedPwd inputs", async () => {
    const instance = new CtPasswordService(privateKeyEncrypted, privateKeyPwd, apiToken, serverUrl);

    await expect(instance.decryptPwd("")).rejects.toThrow();
    await expect(instance.decryptPwd("not-base64")).rejects.toThrow();
    await expect(instance.decryptPwd(undefined as any)).rejects.toThrow();
    await expect(instance.decryptPwd(null as any)).rejects.toThrow();
  });





  it("getCleartextPwd integrates getEncryptedPwd and decryptPwd with various returned encrypted strings", async () => {
    const instance = new CtPasswordService(privateKeyEncrypted, privateKeyPwd, apiToken, serverUrl);

    const good = encryptWithPublic("ok-val");
    vi.spyOn(instance as any, "getEncryptedPwd").mockResolvedValue(good);
    await expect(instance.getCleartextPwd(11)).resolves.toBe("ok-val");

    vi.spyOn(instance as any, "getEncryptedPwd").mockResolvedValue(undefined);
    await expect(instance.getCleartextPwd(12)).resolves.toBeUndefined();

    vi.spyOn(instance as any, "getEncryptedPwd").mockRejectedValue(new Error("net"));
    await expect(instance.getCleartextPwd(13)).rejects.toThrow("net");
  });
});
