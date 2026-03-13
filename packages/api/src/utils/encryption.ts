import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

/**
 * Encrypts a token using AES-256-GCM.
 * Returns base64-encoded string containing: IV + ciphertext + auth tag
 */
export function encryptToken(token: string, key: string): string {
  if (token === null || token === undefined) {
    throw new Error('Token is required');
  }

  if (!key) {
    throw new Error('Encryption key is required');
  }

  if (key.length !== 32) {
    throw new Error('Encryption key must be 32 characters');
  }

  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(token, 'utf8', 'base64');
  encrypted += cipher.final('base64');

  const authTag = cipher.getAuthTag();

  // Combine IV + encrypted + authTag
  const combined = Buffer.concat([
    iv,
    Buffer.from(encrypted, 'base64'),
    authTag,
  ]);

  return combined.toString('base64');
}

/**
 * Decrypts a token that was encrypted with encryptToken.
 * Expects base64-encoded string containing: IV + ciphertext + auth tag
 */
export function decryptToken(encryptedData: string, key: string): string {
  if (encryptedData === null || encryptedData === undefined) {
    throw new Error('Encrypted data is required');
  }

  if (!key) {
    throw new Error('Encryption key is required');
  }

  if (key.length !== 32) {
    throw new Error('Encryption key must be 32 characters');
  }

  const combined = Buffer.from(encryptedData, 'base64');

  if (combined.length < IV_LENGTH + AUTH_TAG_LENGTH) {
    throw new Error('Invalid encrypted data');
  }

  const iv = combined.subarray(0, IV_LENGTH);
  const authTag = combined.subarray(combined.length - AUTH_TAG_LENGTH);
  const ciphertext = combined.subarray(IV_LENGTH, combined.length - AUTH_TAG_LENGTH);

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(ciphertext);
  decrypted = Buffer.concat([decrypted, decipher.final()]);

  return decrypted.toString('utf8');
}
