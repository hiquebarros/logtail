import { randomBytes } from "crypto";

const BASE62_ALPHABET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
const BASE62_BASE = BASE62_ALPHABET.length;
const MAX_UNBIASED_BYTE = 248;

export function generateBase62Token(length = 28): string {
  if (!Number.isInteger(length) || length <= 0) {
    throw new Error("length must be a positive integer");
  }

  let value = "";
  while (value.length < length) {
    const bytes = randomBytes(length);
    for (const byte of bytes) {
      if (byte >= MAX_UNBIASED_BYTE) {
        continue;
      }
      value += BASE62_ALPHABET[byte % BASE62_BASE];
      if (value.length === length) {
        break;
      }
    }
  }

  return value;
}
