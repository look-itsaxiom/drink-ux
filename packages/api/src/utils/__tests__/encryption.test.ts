import { encryptToken, decryptToken } from '../encryption';

describe('Encryption Utilities', () => {
  const testKey = 'test-encryption-key-32-chars-ok!';

  describe('encryptToken', () => {
    // Happy path
    it('encrypts a token and returns a non-empty string', () => {
      const token = 'EAAAl2SyjUquuXyK9JWaLePixqriPqqo38Y1d6Zepaeusi3rndKQBZxeC1cCt4Ab';
      const encrypted = encryptToken(token, testKey);

      expect(encrypted).toBeDefined();
      expect(typeof encrypted).toBe('string');
      expect(encrypted.length).toBeGreaterThan(0);
      expect(encrypted).not.toBe(token);
    });

    // Success scenarios
    it('produces different ciphertext for same plaintext (uses IV)', () => {
      const token = 'same-token-value';
      const encrypted1 = encryptToken(token, testKey);
      const encrypted2 = encryptToken(token, testKey);

      expect(encrypted1).not.toBe(encrypted2);
    });

    it('handles tokens with special characters', () => {
      const token = 'token/with+special=chars&symbols!@#$%';
      const encrypted = encryptToken(token, testKey);

      expect(encrypted).toBeDefined();
      expect(encrypted.length).toBeGreaterThan(0);
    });

    // Error scenarios
    it('throws error when key is missing', () => {
      expect(() => encryptToken('token', '')).toThrow('Encryption key is required');
    });

    it('throws error when key is too short', () => {
      expect(() => encryptToken('token', 'short')).toThrow('Encryption key must be 32 characters');
    });

    it('throws error when token is null or undefined', () => {
      expect(() => encryptToken(null as any, testKey)).toThrow('Token is required');
      expect(() => encryptToken(undefined as any, testKey)).toThrow('Token is required');
    });

    // Edge cases
    it('handles empty string token', () => {
      const encrypted = encryptToken('', testKey);
      expect(encrypted).toBeDefined();
    });

    it('handles very long tokens', () => {
      const longToken = 'a'.repeat(10000);
      const encrypted = encryptToken(longToken, testKey);

      expect(encrypted).toBeDefined();
      expect(encrypted.length).toBeGreaterThan(0);
    });
  });

  describe('decryptToken', () => {
    // Happy path
    it('decrypts an encrypted token back to original', () => {
      const original = 'EAAAl2SyjUquuXyK9JWaLePixqriPqqo38Y1d6Zepaeusi3rndKQBZxeC1cCt4Ab';
      const encrypted = encryptToken(original, testKey);
      const decrypted = decryptToken(encrypted, testKey);

      expect(decrypted).toBe(original);
    });

    // Success scenarios
    it('decrypts tokens with special characters', () => {
      const original = 'token/with+special=chars&symbols!@#$%';
      const encrypted = encryptToken(original, testKey);
      const decrypted = decryptToken(encrypted, testKey);

      expect(decrypted).toBe(original);
    });

    it('decrypts empty string token', () => {
      const encrypted = encryptToken('', testKey);
      const decrypted = decryptToken(encrypted, testKey);

      expect(decrypted).toBe('');
    });

    it('decrypts very long tokens', () => {
      const original = 'a'.repeat(10000);
      const encrypted = encryptToken(original, testKey);
      const decrypted = decryptToken(encrypted, testKey);

      expect(decrypted).toBe(original);
    });

    // Failure scenarios
    it('throws error when using wrong key', () => {
      const encrypted = encryptToken('secret', testKey);
      const wrongKey = 'wrong-encryption-key-32-chars-!!';

      expect(() => decryptToken(encrypted, wrongKey)).toThrow();
    });

    it('throws error for corrupted ciphertext', () => {
      expect(() => decryptToken('not-valid-encrypted-data', testKey)).toThrow();
    });

    it('throws error for tampered ciphertext', () => {
      const encrypted = encryptToken('secret', testKey);
      const tampered = encrypted.slice(0, -4) + 'XXXX';

      expect(() => decryptToken(tampered, testKey)).toThrow();
    });

    // Error scenarios
    it('throws error when key is missing', () => {
      expect(() => decryptToken('encrypted', '')).toThrow('Encryption key is required');
    });

    it('throws error when ciphertext is null or undefined', () => {
      expect(() => decryptToken(null as any, testKey)).toThrow('Encrypted data is required');
      expect(() => decryptToken(undefined as any, testKey)).toThrow('Encrypted data is required');
    });
  });
});
