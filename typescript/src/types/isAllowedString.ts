const LETTERS = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
const DIGITS = "0123456789";
const SYMBOLS = "!@$%&*-_+=?.";

const ALLOWED_CHARS = LETTERS + DIGITS + SYMBOLS;

/**
 * Returns true if the string contains ONLY allowed characters.
 */
export function isAllowedString(value: string): boolean {
  for (const ch of value) {
    if (!ALLOWED_CHARS.includes(ch)) {
      return false;
    }
  }
  return true;
}


export function getInvalidChars(value: string): string[] {
  const invalid = new Set<string>();

  for (const ch of value) {
    if (!ALLOWED_CHARS.includes(ch)) {
      invalid.add(ch);
    }
  }

  return Array.from(invalid);
}

export function containsUnsafeChars(value: string): boolean {
  return !isAllowedString(value);
}
