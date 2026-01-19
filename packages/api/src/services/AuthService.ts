import { PrismaClient, User, Business } from '../../generated/prisma';
import {
  hashPassword,
  verifyPassword,
  validatePasswordStrength,
  generateSecureToken,
} from '../utils/password';

/**
 * Custom error class for authentication errors
 */
export class AuthError extends Error {
  constructor(
    public readonly code: string,
    message: string
  ) {
    super(message);
    this.name = 'AuthError';
  }
}

/**
 * Public user data (without sensitive fields)
 */
export interface PublicUser {
  id: string;
  email: string;
  name: string | null;
  emailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Public business data
 */
export interface PublicBusiness {
  id: string;
  name: string;
  slug: string;
  accountState: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Signup input
 */
export interface SignupInput {
  email: string;
  password: string;
  businessName: string;
}

/**
 * Signup result
 */
export interface SignupResult {
  user: PublicUser;
  business: PublicBusiness;
  emailVerificationToken: string;
}

/**
 * Login input
 */
export interface LoginInput {
  email: string;
  password: string;
}

/**
 * Login result
 */
export interface LoginResult {
  user: PublicUser;
  sessionToken: string;
}

/**
 * Forgot password result
 */
export interface ForgotPasswordResult {
  resetToken: string;
}

/**
 * Reset password input
 */
export interface ResetPasswordInput {
  token: string;
  newPassword: string;
}

// Token expiration times
const EMAIL_VERIFICATION_EXPIRY_HOURS = 24;
const PASSWORD_RESET_EXPIRY_HOURS = 1;
const SESSION_EXPIRY_DAYS = 30;

/**
 * Authentication Service - handles user signup, login, and session management
 */
export class AuthService {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Sign up a new user and create their business
   */
  async signup(input: SignupInput): Promise<SignupResult> {
    const { email, password, businessName } = input;

    // Validate inputs
    if (!email || !email.trim()) {
      throw new AuthError('INVALID_EMAIL', 'Email is required');
    }

    if (!password) {
      throw new AuthError('WEAK_PASSWORD', 'Password is required');
    }

    if (!businessName || !businessName.trim()) {
      throw new AuthError('INVALID_INPUT', 'Business name is required');
    }

    // Normalize email
    const normalizedEmail = email.toLowerCase().trim();

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      throw new AuthError('INVALID_EMAIL', 'Invalid email format');
    }

    // Check if email already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    });
    if (existingUser) {
      throw new AuthError('EMAIL_EXISTS', 'Email already registered');
    }

    // Validate password strength
    const passwordValidation = validatePasswordStrength(password);
    if (!passwordValidation.isValid) {
      throw new AuthError('WEAK_PASSWORD', passwordValidation.errors.join('. '));
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Generate email verification token
    const emailVerificationToken = generateSecureToken(32);
    const emailVerificationExpires = new Date(
      Date.now() + EMAIL_VERIFICATION_EXPIRY_HOURS * 60 * 60 * 1000
    );

    // Generate unique slug
    const slug = await this.generateUniqueSlug(businessName.trim());

    // Create user and business in transaction
    const result = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: normalizedEmail,
          passwordHash,
          emailVerificationToken,
          emailVerificationExpires,
          businesses: {
            create: {
              name: businessName.trim(),
              slug,
            },
          },
        },
        include: {
          businesses: true,
        },
      });

      return {
        user,
        business: user.businesses[0],
      };
    });

    return {
      user: this.toPublicUser(result.user),
      business: this.toPublicBusiness(result.business),
      emailVerificationToken,
    };
  }

  /**
   * Log in a user
   */
  async login(input: LoginInput): Promise<LoginResult> {
    const { email, password } = input;

    // Validate inputs
    if (!email || !email.trim()) {
      throw new AuthError('INVALID_CREDENTIALS', 'Invalid email or password');
    }

    if (!password) {
      throw new AuthError('INVALID_CREDENTIALS', 'Invalid email or password');
    }

    // Normalize email
    const normalizedEmail = email.toLowerCase().trim();

    // Find user
    const user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    // Don't reveal if email exists
    if (!user) {
      throw new AuthError('INVALID_CREDENTIALS', 'Invalid email or password');
    }

    // Verify password
    const isValidPassword = await verifyPassword(password, user.passwordHash);
    if (!isValidPassword) {
      throw new AuthError('INVALID_CREDENTIALS', 'Invalid email or password');
    }

    // Create session
    const sessionToken = generateSecureToken(32);
    const expiresAt = new Date(
      Date.now() + SESSION_EXPIRY_DAYS * 24 * 60 * 60 * 1000
    );

    await this.prisma.session.create({
      data: {
        userId: user.id,
        token: sessionToken,
        expiresAt,
      },
    });

    return {
      user: this.toPublicUser(user),
      sessionToken,
    };
  }

  /**
   * Validate a session token and return the user if valid
   */
  async validateSession(token: string): Promise<PublicUser | null> {
    if (!token) {
      return null;
    }

    const session = await this.prisma.session.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!session) {
      return null;
    }

    // Check if expired
    if (session.expiresAt < new Date()) {
      // Clean up expired session
      await this.prisma.session.delete({
        where: { id: session.id },
      });
      return null;
    }

    return this.toPublicUser(session.user);
  }

  /**
   * Log out a user by destroying their session
   */
  async logout(token: string): Promise<boolean> {
    if (!token) {
      return false;
    }

    const result = await this.prisma.session.deleteMany({
      where: { token },
    });

    return result.count > 0;
  }

  /**
   * Generate password reset token
   */
  async forgotPassword(email: string): Promise<ForgotPasswordResult> {
    // Generate token regardless of whether user exists (prevent enumeration)
    const resetToken = generateSecureToken(32);

    // Normalize email
    const normalizedEmail = email.toLowerCase().trim();

    // Try to find user and update if exists
    const user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (user) {
      const passwordResetExpires = new Date(
        Date.now() + PASSWORD_RESET_EXPIRY_HOURS * 60 * 60 * 1000
      );

      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          passwordResetToken: resetToken,
          passwordResetExpires,
        },
      });
    }

    // Always return a token to prevent email enumeration
    return { resetToken };
  }

  /**
   * Reset password using a reset token
   */
  async resetPassword(input: ResetPasswordInput): Promise<void> {
    const { token, newPassword } = input;

    if (!token) {
      throw new AuthError('INVALID_TOKEN', 'Invalid or expired reset token');
    }

    if (!newPassword) {
      throw new AuthError('WEAK_PASSWORD', 'Password is required');
    }

    // Validate password strength
    const passwordValidation = validatePasswordStrength(newPassword);
    if (!passwordValidation.isValid) {
      throw new AuthError('WEAK_PASSWORD', passwordValidation.errors.join('. '));
    }

    // Find user by reset token
    const user = await this.prisma.user.findUnique({
      where: { passwordResetToken: token },
    });

    if (!user) {
      throw new AuthError('INVALID_TOKEN', 'Invalid or expired reset token');
    }

    // Check if token is expired
    if (!user.passwordResetExpires || user.passwordResetExpires < new Date()) {
      throw new AuthError('INVALID_TOKEN', 'Invalid or expired reset token');
    }

    // Hash new password
    const passwordHash = await hashPassword(newPassword);

    // Update password and clear reset token
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: user.id },
        data: {
          passwordHash,
          passwordResetToken: null,
          passwordResetExpires: null,
        },
      }),
      // Invalidate all sessions for this user
      this.prisma.session.deleteMany({
        where: { userId: user.id },
      }),
    ]);
  }

  /**
   * Verify email using verification token
   */
  async verifyEmail(token: string): Promise<void> {
    if (!token) {
      throw new AuthError('INVALID_TOKEN', 'Invalid or expired verification token');
    }

    // Find user by verification token
    const user = await this.prisma.user.findUnique({
      where: { emailVerificationToken: token },
    });

    if (!user) {
      throw new AuthError('INVALID_TOKEN', 'Invalid or expired verification token');
    }

    // Check if token is expired
    if (!user.emailVerificationExpires || user.emailVerificationExpires < new Date()) {
      throw new AuthError('INVALID_TOKEN', 'Invalid or expired verification token');
    }

    // Mark email as verified and clear token
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        emailVerificationToken: null,
        emailVerificationExpires: null,
      },
    });
  }

  /**
   * Generate a unique slug from business name
   */
  private async generateUniqueSlug(businessName: string): Promise<string> {
    // Convert to slug: lowercase, replace non-alphanumeric with hyphen, collapse multiple hyphens
    const baseSlug = businessName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')  // trim leading/trailing hyphens
      .replace(/-+/g, '-');     // collapse multiple hyphens

    // Check if slug exists
    const existing = await this.prisma.business.findUnique({
      where: { slug: baseSlug },
    });

    if (!existing) {
      return baseSlug;
    }

    // Find unique slug by appending number
    let counter = 1;
    let uniqueSlug = `${baseSlug}-${counter}`;

    while (await this.prisma.business.findUnique({ where: { slug: uniqueSlug } })) {
      counter++;
      uniqueSlug = `${baseSlug}-${counter}`;
    }

    return uniqueSlug;
  }

  /**
   * Convert user to public user (without sensitive fields)
   */
  private toPublicUser(user: User): PublicUser {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      emailVerified: user.emailVerified,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  /**
   * Convert business to public business
   */
  private toPublicBusiness(business: Business): PublicBusiness {
    return {
      id: business.id,
      name: business.name,
      slug: business.slug,
      accountState: business.accountState,
      createdAt: business.createdAt,
      updatedAt: business.updatedAt,
    };
  }
}
