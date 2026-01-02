import fs from "fs";
import crypto from "crypto";

export function isEncryptedPrivateKey(pathToKey: string): boolean {
  const pem = fs.readFileSync(pathToKey, "utf8");

  try {
    crypto.createPrivateKey({
      key: pem,
      format: "pem",
      // No passphrase provided
    });
    return false; // Loaded successfully → not encrypted
  } catch (err: any) {
    // Typical error messages:
    // - "error:06065064:digital envelope routines:EVP_DecryptFinal_ex:bad decrypt"
    // - "error:0909006C:PEM routines:get_name:no start line"
    // - "error:0908F066:PEM routines:get_header_and_data:bad password read"
    // - "error:0606506D:digital envelope routines:EVP_DecryptFinal_ex:wrong final block length"
    return true; // Failed → likely encrypted
  }
}
