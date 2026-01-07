/**
 * Characters that are unsafe in FreeRADIUS configs, shell execution,
 * or RADIUS attribute values.
 */
const UNSAFE_CHARS = [
  "#", ";", "{", "}", "\"", "'", "\\", "(", ")", ",",
  ":", "|", ">", "<", "`", " ",
  "\n", "\r", "\t", "\0"
];
// Rejected unsafe chars after testing: "$", "%", "=", "*", "?", "!", "&", 


/**
 * Returns true if the string contains ANY unsafe character.
 */
export function containsUnsafeChars(value: string): boolean {
  for (const ch of UNSAFE_CHARS) {
    if (value.includes(ch)) {
      return true;
    }
  }
  return false;
}

/**
 * Returns an array of all unsafe characters found in the string.
 * Each character appears only once in the result.
 */
export function getUnsafeChars(value: string): string[] {
  const found = new Set<string>();

  for (const ch of UNSAFE_CHARS) {
    if (value.includes(ch)) {
      found.add(ch);
    }
  }

  return Array.from(found);
}
