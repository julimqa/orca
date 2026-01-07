import crypto from 'crypto';

/**
 * Generate a URL-safe random token for public share links.
 * 32 bytes -> 43~44 chars base64url.
 */
export function generateShareToken(bytes: number = 32): string {
  const buf = crypto.randomBytes(bytes);
  // Node >= 16 supports base64url in BufferEncoding typings.
  // Use a cast to be safe across older type definitions.
  const token = buf.toString('base64url' as BufferEncoding);
  if (token) return token;

  // Fallback: base64 -> url safe
  return buf
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}
