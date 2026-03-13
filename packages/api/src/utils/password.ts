import bcrypt from 'bcrypt';
import crypto from 'crypto';

/**
 * Number of salt rounds for bcrypt hashing.
 * Higher = more secure but slower. 12 is a good balance for 2024+.
 */
const SALT_ROUNDS = 12;

/**
 * Result of password strength validation
 */
export interface PasswordValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Hash a password using bcrypt.
 *
 * @param password - Plain text password to hash
 * @returns Promise resolving to the hashed password
 * @throws Error if password is empty or invalid
 */
export async function hashPassword(password: string): Promise<string> {
  if (!password) {
    throw new Error('Password is required');
  }

  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Verify a password against a bcrypt hash.
 *
 * @param password - Plain text password to verify
 * @param hash - Bcrypt hash to compare against
 * @returns Promise resolving to true if password matches, false otherwise
 * @throws Error if password or hash is invalid
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  if (password === null || password === undefined) {
    throw new Error('Password is required');
  }

  if (!hash) {
    throw new Error('Hash is required');
  }

  return bcrypt.compare(password, hash);
}

/**
 * Validate password strength against security requirements.
 *
 * Requirements:
 * - Minimum 8 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one number
 * - At least one special character
 *
 * @param password - Password to validate
 * @returns Validation result with isValid flag and array of error messages
 */
export function validatePasswordStrength(password: string): PasswordValidationResult {
  const errors: string[] = [];

  if (!password || typeof password !== 'string') {
    return {
      isValid: false,
      errors: ['Password must be at least 8 characters'],
    };
  }

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Generate a cryptographically secure random token.
 *
 * @param bytes - Number of random bytes (default: 32)
 * @returns Hex-encoded secure token
 */
export function generateSecureToken(bytes: number = 32): string {
  return crypto.randomBytes(bytes).toString('hex');
}
