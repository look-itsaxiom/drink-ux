import {
  hashPassword,
  verifyPassword,
  validatePasswordStrength,
  generateSecureToken,
  PasswordValidationResult,
} from '../password';

describe('Password Utilities', () => {
  describe('hashPassword', () => {
    // Happy path
    it('returns a hash different from the input password', async () => {
      const password = 'SecureP@ssw0rd!';
      const hash = await hashPassword(password);

      expect(hash).toBeDefined();
      expect(hash).not.toBe(password);
      expect(hash.length).toBeGreaterThan(0);
    });

    it('generates different hashes for the same password (due to salt)', async () => {
      const password = 'SecureP@ssw0rd!';
      const hash1 = await hashPassword(password);
      const hash2 = await hashPassword(password);

      expect(hash1).not.toBe(hash2);
    });

    it('generates a bcrypt-formatted hash', async () => {
      const password = 'SecureP@ssw0rd!';
      const hash = await hashPassword(password);

      // Bcrypt hashes start with $2b$ (or $2a$, $2y$)
      expect(hash).toMatch(/^\$2[aby]\$/);
    });

    // Failure scenarios
    it('throws error for empty password', async () => {
      await expect(hashPassword('')).rejects.toThrow('Password is required');
    });

    it('throws error for null/undefined password', async () => {
      await expect(hashPassword(null as unknown as string)).rejects.toThrow('Password is required');
      await expect(hashPassword(undefined as unknown as string)).rejects.toThrow('Password is required');
    });

    // Edge cases
    it('handles passwords with special characters', async () => {
      const password = '!@#$%^&*()_+-=[]{}|;:\'",.<>?/`~';
      const hash = await hashPassword(password);

      expect(hash).toBeDefined();
      expect(hash.length).toBeGreaterThan(0);
    });

    it('handles unicode passwords', async () => {
      const password = 'Passw0rd!';
      const hash = await hashPassword(password);

      expect(hash).toBeDefined();
    });

    it('handles very long passwords', async () => {
      const password = 'A'.repeat(100) + '1!';
      const hash = await hashPassword(password);

      expect(hash).toBeDefined();
    });
  });

  describe('verifyPassword', () => {
    // Happy path
    it('returns true for correct password', async () => {
      const password = 'SecureP@ssw0rd!';
      const hash = await hashPassword(password);

      const isValid = await verifyPassword(password, hash);

      expect(isValid).toBe(true);
    });

    // Failure scenarios
    it('returns false for incorrect password', async () => {
      const password = 'SecureP@ssw0rd!';
      const hash = await hashPassword(password);

      const isValid = await verifyPassword('WrongPassword!', hash);

      expect(isValid).toBe(false);
    });

    it('returns false for similar but not exact password', async () => {
      const password = 'SecureP@ssw0rd!';
      const hash = await hashPassword(password);

      const isValid = await verifyPassword('securep@ssw0rd!', hash); // lowercase

      expect(isValid).toBe(false);
    });

    it('returns false for empty password against valid hash', async () => {
      const hash = await hashPassword('SomePassword123!');

      const isValid = await verifyPassword('', hash);

      expect(isValid).toBe(false);
    });

    // Error scenarios
    it('returns false for invalid hash format', async () => {
      // bcrypt.compare returns false for malformed hashes rather than throwing
      const isValid = await verifyPassword('password', 'invalid-hash');
      expect(isValid).toBe(false);
    });

    it('throws error for null/undefined inputs', async () => {
      const hash = await hashPassword('ValidPassword1!');

      await expect(verifyPassword(null as unknown as string, hash)).rejects.toThrow();
      await expect(verifyPassword('password', null as unknown as string)).rejects.toThrow();
    });

    // Edge cases
    it('handles password with special characters correctly', async () => {
      const password = '!@#$%^&*()_+-=[]{}|;:\'",.<>?/`~';
      const hash = await hashPassword(password);

      const isValid = await verifyPassword(password, hash);

      expect(isValid).toBe(true);
    });
  });

  describe('validatePasswordStrength', () => {
    // Happy path - valid passwords
    it('accepts strong password with all requirements', () => {
      const result = validatePasswordStrength('SecureP@ss1');

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('accepts password with minimum length of 8', () => {
      const result = validatePasswordStrength('Secure1!');

      expect(result.isValid).toBe(true);
    });

    // Failure scenarios - missing requirements
    it('rejects password shorter than 8 characters', () => {
      const result = validatePasswordStrength('Sec1!');

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must be at least 8 characters');
    });

    it('rejects password without uppercase letter', () => {
      const result = validatePasswordStrength('secure1!abc');

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one uppercase letter');
    });

    it('rejects password without lowercase letter', () => {
      const result = validatePasswordStrength('SECURE1!ABC');

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one lowercase letter');
    });

    it('rejects password without number', () => {
      const result = validatePasswordStrength('SecurePass!');

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one number');
    });

    it('rejects password without special character', () => {
      const result = validatePasswordStrength('SecurePass1');

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one special character');
    });

    it('returns all errors for completely weak password', () => {
      const result = validatePasswordStrength('weak');

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThanOrEqual(4);
    });

    // Edge cases
    it('handles empty password', () => {
      const result = validatePasswordStrength('');

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must be at least 8 characters');
    });

    it('handles null/undefined', () => {
      const result1 = validatePasswordStrength(null as unknown as string);
      const result2 = validatePasswordStrength(undefined as unknown as string);

      expect(result1.isValid).toBe(false);
      expect(result2.isValid).toBe(false);
    });

    it('accepts various special characters', () => {
      const specialChars = ['!', '@', '#', '$', '%', '^', '&', '*', '(', ')', '-', '_', '+', '='];

      for (const char of specialChars) {
        const password = `Secure1${char}a`;
        const result = validatePasswordStrength(password);
        expect(result.isValid).toBe(true);
      }
    });
  });

  describe('generateSecureToken', () => {
    // Happy path
    it('generates a token of specified length (hex characters)', () => {
      const token = generateSecureToken(32);

      // 32 bytes = 64 hex characters
      expect(token).toHaveLength(64);
    });

    it('generates tokens with only hex characters', () => {
      const token = generateSecureToken(32);

      expect(token).toMatch(/^[a-f0-9]+$/);
    });

    it('generates unique tokens on each call', () => {
      const tokens = new Set<string>();

      for (let i = 0; i < 100; i++) {
        tokens.add(generateSecureToken(32));
      }

      expect(tokens.size).toBe(100);
    });

    // Default length
    it('uses default length of 32 bytes when not specified', () => {
      const token = generateSecureToken();

      expect(token).toHaveLength(64); // 32 bytes = 64 hex chars
    });

    // Edge cases
    it('generates token of custom length', () => {
      const token16 = generateSecureToken(16);
      const token64 = generateSecureToken(64);

      expect(token16).toHaveLength(32); // 16 bytes = 32 hex chars
      expect(token64).toHaveLength(128); // 64 bytes = 128 hex chars
    });

    it('handles minimum length of 1', () => {
      const token = generateSecureToken(1);

      expect(token).toHaveLength(2); // 1 byte = 2 hex chars
    });
  });
});
