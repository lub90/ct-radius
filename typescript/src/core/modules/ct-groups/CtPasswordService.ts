import fs from "fs";
import crypto from "crypto";
import { isEncryptedPrivateKey } from "./isEncryptedPrivateKey.js";

type KeyObject = crypto.KeyObject;

export class CtPasswordService {
    private pathToPrivateKey: string;
    private privateKeyPwd: string;
    private apiToken: string;
    private serverUrl: string;

    // Cache for the private key once loaded
    private privateKeyCache: KeyObject | null = null;

    constructor(pathToPrivateKey: string, privateKeyPwd: string, apiToken: string, serverUrl: string) {
        // We want to prevent accidental use of unencrypted private keys
        if (!privateKeyPwd || privateKeyPwd.trim() === "") {
            throw new Error("Encrypted private key required. Passphrase must not be empty.");
        }

        // Parameter validation described in Module Description
        if (!pathToPrivateKey || pathToPrivateKey.trim() === ""
            || !apiToken || apiToken.trim() === ""
            || !serverUrl || serverUrl.trim() === ""
        ) {
            throw new Error("Missing constructor argument");
        }

        // Server URL must start with https://
        if (!serverUrl.startsWith("https://")) throw new Error("serverUrl must start with https://");

        this.pathToPrivateKey = pathToPrivateKey.trim();
        this.privateKeyPwd = privateKeyPwd.trim();
        this.apiToken = apiToken.trim();
        this.serverUrl = serverUrl.trim();
    }

    // Returns the cleartext password or undefined if not present
    async getCleartextPwd(userId: number): Promise<string | undefined> {
        const enc = await this.getEncryptedPwd(userId);
        if (enc === undefined) return undefined;
        return await this.decryptPwd(enc);
    }

    // Returns the encrypted password string from backend or undefined if 404
    async getEncryptedPwd(userId: number): Promise<string | undefined> {
        if (typeof userId !== "number" || !isFinite(userId) || userId <= 0) {
            throw new Error("Invalid userId");
        }

        const url = `${this.serverUrl.replace(/\/$/, "")}/entries/${userId}`;
        const res = await globalThis.fetch(url, {
            method: "GET",
            headers: {
                Authorization: `Login ${this.apiToken}`,
            },
        });

        if (res.status === 200) {

            let body: any;
            try {
                body = await res.json();
            } catch (e) {
                throw new Error("Failed to parse JSON response from backend");
            }

            const pwd = body.secondaryPassword;
            if (!pwd || typeof pwd !== "string" || pwd.trim().length === 0) {
                throw new Error("secondaryPassword is missing in response");
            }

            return pwd.trim();

        } else if (res.status === 404) {
            return undefined;
        } else {
            const t = await (res.text ? res.text() : "");
            throw new Error(`Unexpected response from backend: ${res.status} ${t}`);
        }
    }

    // Decrypts an encrypted password string and returns cleartext
    async decryptPwd(encryptedPwd: string): Promise<string> {
        if (!encryptedPwd || typeof encryptedPwd !== "string" || encryptedPwd.trim().length === 0) {
            throw new Error("encryptedPwd must be a non-empty string");
        }

        // Expect base64 string
        const trimmed = encryptedPwd.trim();
        const encrypted = Buffer.from(trimmed, "base64");

        // Check if decoding was valid base64
        if (encrypted.length === 0 && trimmed.length > 0) {
            throw new Error("Encrypted password is not valid base64");
        }


        const plain = await this._decrypt(encrypted);
        return plain.toString("utf8");
    }



    private async _getPrivateKey(): Promise<KeyObject> {
        if (this.privateKeyCache) return this.privateKeyCache;

        // Check that file is really encrypted
        if (!isEncryptedPrivateKey(this.pathToPrivateKey)) {
            throw new Error("Private key is not encrypted");
        }

        // Read the file
        let pemData: Buffer;
        try {
            pemData = await fs.promises.readFile(this.pathToPrivateKey);
        } catch (e: any) {
            throw new Error(`Could not read private key file '${this.pathToPrivateKey}': ${e?.message ?? e}`);
        }

        // Load the private key with passphrase
        try {
            // createPrivateKey accepts PEM with passphrase
            this.privateKeyCache = crypto.createPrivateKey({ key: pemData, passphrase: this.privateKeyPwd });
            return this.privateKeyCache;
        } catch (e: any) {
            throw new Error(`Failed to load private key: ${e?.message ?? e}`);
        }
    }

    private async _decrypt(encrypted: Buffer): Promise<Buffer> {
        const keyObj = await this._getPrivateKey();

        try {
            const decrypted = crypto.privateDecrypt(
                {
                    key: keyObj,
                    padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
                    oaepHash: "sha256",
                } as any,
                encrypted
            );
            return decrypted;
        } catch (e: any) {
            throw new Error(`Decryption failed: ${e?.message ?? e}`);
        }
    }
}

export default CtPasswordService;
