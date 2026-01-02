import fs from "fs";
import crypto from "crypto";

type KeyObject = crypto.KeyObject;

export class CtPasswordRetriever {
    private pathToPrivateKey: string;
    private privateKeyPwd: string;
    private apiToken: string;
    private serverUrl: string;

    constructor(pathToPrivateKey: string, privateKeyPwd: string, apiToken: string, serverUrl: string) {
        // Parameter validation described in Module Description
        if (pathToPrivateKey === undefined || privateKeyPwd === undefined || apiToken === undefined || serverUrl === undefined) {
            throw new Error("Missing constructor argument");
        }

        this.pathToPrivateKey = pathToPrivateKey;
        this.privateKeyPwd = privateKeyPwd;
        this.apiToken = apiToken;
        this.serverUrl = serverUrl;
    }

    // Returns the cleartext password or undefined if not present
    async getCleartextPwd(userId: number): Promise<string | undefined> {
        const enc = await this.getEncryptedPwd(userId);
        if (enc === undefined || enc === null) return undefined;
        return await this.decryptPwd(enc);
    }

    // Returns the encrypted password string from backend or undefined if 404
    async getEncryptedPwd(userId: number): Promise<string | undefined> {
        if (typeof userId !== "number" || !isFinite(userId) || userId <= 0) {
            throw new Error("Invalid userId");
        }

        const url = `${this.serverUrl.replace(/\/$/, "")}/entries/${userId}`;
        const res = await (globalThis as any).fetch(url, {
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
            return body?.secondaryPassword;
        }

        if (res.status === 404) return undefined;

        const t = await (res.text ? res.text() : Promise.resolve(String(res.status)));
        throw new Error(`Unexpected response from backend: ${res.status} ${t}`);
    }

    // Decrypts an encrypted password string and returns cleartext
    async decryptPwd(encryptedPwd: string): Promise<string> {
        if (typeof encryptedPwd !== "string" || encryptedPwd.length === 0) {
            throw new Error("encryptedPwd must be a non-empty string");
        }

        // Expect base64 string
        let encrypted: Buffer;
        try {
            encrypted = Buffer.from(encryptedPwd, "base64");
        } catch (e) {
            throw new Error("Encrypted password is not valid base64");
        }

        const plain = await this._decrypt(encrypted);
        return plain.toString("utf8");
    }

    // Internal helpers (signatures only)
    private _privateKeyObj: KeyObject | null = null;

    private async _getPrivateKey(): Promise<KeyObject> {
        if (this._privateKeyObj) return this._privateKeyObj;

        let pemData: Buffer;
        try {
            pemData = await fs.promises.readFile(this.pathToPrivateKey);
        } catch (e: any) {
            throw new Error(`Could not read private key file '${this.pathToPrivateKey}': ${e?.message ?? e}`);
        }

        try {
            const opts: crypto.CryptoKeyOptions | any = { key: pemData };
            if (this.privateKeyPwd) opts.passphrase = this.privateKeyPwd;

            // createPrivateKey accepts PEM (encrypted or not)
            this._privateKeyObj = crypto.createPrivateKey({ key: pemData, passphrase: this.privateKeyPwd });
            return this._privateKeyObj;
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

export default CtPasswordRetriever;
