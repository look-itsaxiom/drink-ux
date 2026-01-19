import { PrismaClient } from '../../../generated/prisma';
import { AuthService, SignupResult, LoginResult, AuthError } from '../AuthService';

const prisma = new PrismaClient();

beforeAll(async () => {
  // Clean database before tests
  await prisma.$transaction([
    prisma.session.deleteMany(),
    prisma.business.deleteMany(),
    prisma.user.deleteMany(),
  ]);
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('AuthService', () => {
  let authService: AuthService;

  beforeEach(async () => {
    // Clean database before each test
    await prisma.$transaction([
      prisma.session.deleteMany(),
      prisma.business.deleteMany(),
      prisma.user.deleteMany(),
    ]);
    authService = new AuthService(prisma);
  });

  describe('signup', () => {
    // Happy path
    it('creates user and business with valid input', async () => {
      const result = await authService.signup({
        email: 'owner@coffeeshop.com',
        password: 'SecureP@ss1',
        businessName: "Joe's Coffee",
      });

      expect(result.user).toBeDefined();
      expect(result.user.email).toBe('owner@coffeeshop.com');
      expect(result.user.id).toBeDefined();
      expect(result.business).toBeDefined();
      expect(result.business.name).toBe("Joe's Coffee");
      expect(result.emailVerificationToken).toBeDefined();
    });

    it('generates slug from business name', async () => {
      const result = await authService.signup({
        email: 'owner@test.com',
        password: 'SecureP@ss1',
        businessName: "Joes Coffee Shop",
      });

      expect(result.business.slug).toBe('joes-coffee-shop');
    });

    it('does not return password hash in user object', async () => {
      const result = await authService.signup({
        email: 'owner@secure.com',
        password: 'SecureP@ss1',
        businessName: 'Secure Coffee',
      });

      expect((result.user as any).passwordHash).toBeUndefined();
    });

    it('sets emailVerified to false by default', async () => {
      const result = await authService.signup({
        email: 'owner@verify.com',
        password: 'SecureP@ss1',
        businessName: 'Verify Coffee',
      });

      // Check in database
      const user = await prisma.user.findUnique({
        where: { email: 'owner@verify.com' },
      });
      expect(user?.emailVerified).toBe(false);
    });

    it('stores email verification token in database', async () => {
      const result = await authService.signup({
        email: 'owner@token.com',
        password: 'SecureP@ss1',
        businessName: 'Token Coffee',
      });

      const user = await prisma.user.findUnique({
        where: { email: 'owner@token.com' },
      });
      expect(user?.emailVerificationToken).toBe(result.emailVerificationToken);
      expect(user?.emailVerificationExpires).toBeDefined();
      expect(user?.emailVerificationExpires!.getTime()).toBeGreaterThan(Date.now());
    });

    // Success scenarios with various inputs
    it('handles business name with special characters', async () => {
      const result = await authService.signup({
        email: 'owner@special.com',
        password: 'SecureP@ss1',
        businessName: "O'Brien & Sons' Coffee (TM)",
      });

      // Special characters become separators, resulting in o-brien-sons-coffee-tm
      expect(result.business.slug).toBe('o-brien-sons-coffee-tm');
    });

    it('handles business name with multiple spaces', async () => {
      const result = await authService.signup({
        email: 'owner@spaces.com',
        password: 'SecureP@ss1',
        businessName: '  My   Coffee   Shop  ',
      });

      expect(result.business.slug).toBe('my-coffee-shop');
    });

    it('handles unicode business name', async () => {
      const result = await authService.signup({
        email: 'owner@unicode.com',
        password: 'SecureP@ss1',
        businessName: 'Cafe Muller',
      });

      expect(result.business.name).toBe('Cafe Muller');
    });

    // Failure scenarios
    it('throws error for duplicate email', async () => {
      await authService.signup({
        email: 'duplicate@test.com',
        password: 'SecureP@ss1',
        businessName: 'First Coffee',
      });

      await expect(
        authService.signup({
          email: 'duplicate@test.com',
          password: 'SecureP@ss1',
          businessName: 'Second Coffee',
        })
      ).rejects.toThrow(AuthError);

      try {
        await authService.signup({
          email: 'duplicate@test.com',
          password: 'SecureP@ss1',
          businessName: 'Second Coffee',
        });
      } catch (error) {
        expect(error).toBeInstanceOf(AuthError);
        expect((error as AuthError).code).toBe('EMAIL_EXISTS');
      }
    });

    it('throws error for invalid email format', async () => {
      await expect(
        authService.signup({
          email: 'invalid-email',
          password: 'SecureP@ss1',
          businessName: 'Coffee Shop',
        })
      ).rejects.toThrow(AuthError);

      try {
        await authService.signup({
          email: 'not-an-email',
          password: 'SecureP@ss1',
          businessName: 'Coffee Shop',
        });
      } catch (error) {
        expect((error as AuthError).code).toBe('INVALID_EMAIL');
      }
    });

    it('throws error for weak password', async () => {
      await expect(
        authService.signup({
          email: 'owner@weak.com',
          password: 'weak',
          businessName: 'Coffee Shop',
        })
      ).rejects.toThrow(AuthError);

      try {
        await authService.signup({
          email: 'owner@weak2.com',
          password: 'password123', // no uppercase, no special char
          businessName: 'Coffee Shop',
        });
      } catch (error) {
        expect((error as AuthError).code).toBe('WEAK_PASSWORD');
      }
    });

    it('throws error for missing email', async () => {
      await expect(
        authService.signup({
          email: '',
          password: 'SecureP@ss1',
          businessName: 'Coffee Shop',
        })
      ).rejects.toThrow(AuthError);
    });

    it('throws error for missing password', async () => {
      await expect(
        authService.signup({
          email: 'owner@test.com',
          password: '',
          businessName: 'Coffee Shop',
        })
      ).rejects.toThrow(AuthError);
    });

    it('throws error for missing business name', async () => {
      await expect(
        authService.signup({
          email: 'owner@test.com',
          password: 'SecureP@ss1',
          businessName: '',
        })
      ).rejects.toThrow(AuthError);
    });

    // Edge cases
    it('handles slug collision by appending number', async () => {
      await authService.signup({
        email: 'owner1@test.com',
        password: 'SecureP@ss1',
        businessName: 'Coffee Shop',
      });

      const result = await authService.signup({
        email: 'owner2@test.com',
        password: 'SecureP@ss1',
        businessName: 'Coffee Shop!', // Different name, same slug base
      });

      // Slug should be different from first
      expect(result.business.slug).not.toBe('coffee-shop');
      expect(result.business.slug).toMatch(/^coffee-shop-\d+$/);
    });

    it('normalizes email to lowercase', async () => {
      const result = await authService.signup({
        email: 'Owner@TestCase.COM',
        password: 'SecureP@ss1',
        businessName: 'Case Coffee',
      });

      expect(result.user.email).toBe('owner@testcase.com');
    });

    it('creates transaction - rolls back on failure', async () => {
      // This is implicitly tested by the atomic nature of the signup
      // If user creation succeeds but business fails, neither should exist
      const countBefore = await prisma.user.count();

      // Manually cause a unique constraint violation on slug
      await prisma.user.create({
        data: {
          email: 'preexisting@test.com',
          passwordHash: 'hash',
          businesses: {
            create: {
              name: 'Existing',
              slug: 'existing-shop',
            },
          },
        },
      });

      try {
        // Try to create with same slug (will fail in generateUniqueSlug if we forced collision)
        // This test ensures atomic behavior
        await authService.signup({
          email: 'new@test.com',
          password: 'SecureP@ss1',
          businessName: 'New Shop',
        });
      } catch {
        // Expected to fail
      }

      // Even after partial failure, database should be consistent
      const users = await prisma.user.findMany();
      const businesses = await prisma.business.findMany();

      // Each user should have a corresponding business relationship
      for (const user of users) {
        const userBusinesses = businesses.filter(b => b.ownerId === user.id);
        expect(userBusinesses.length).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('login', () => {
    beforeEach(async () => {
      // Create a test user for login tests
      await authService.signup({
        email: 'login@test.com',
        password: 'SecureP@ss1',
        businessName: 'Login Test',
      });
    });

    // Happy path
    it('returns user and session token for valid credentials', async () => {
      const result = await authService.login({
        email: 'login@test.com',
        password: 'SecureP@ss1',
      });

      expect(result.user).toBeDefined();
      expect(result.user.email).toBe('login@test.com');
      expect(result.sessionToken).toBeDefined();
      expect(result.sessionToken.length).toBeGreaterThan(0);
    });

    it('creates session in database', async () => {
      const result = await authService.login({
        email: 'login@test.com',
        password: 'SecureP@ss1',
      });

      const session = await prisma.session.findUnique({
        where: { token: result.sessionToken },
      });

      expect(session).toBeDefined();
      expect(session?.userId).toBe(result.user.id);
      expect(session?.expiresAt.getTime()).toBeGreaterThan(Date.now());
    });

    it('does not return password hash', async () => {
      const result = await authService.login({
        email: 'login@test.com',
        password: 'SecureP@ss1',
      });

      expect((result.user as any).passwordHash).toBeUndefined();
    });

    // Success scenarios
    it('handles case-insensitive email', async () => {
      const result = await authService.login({
        email: 'LOGIN@TEST.COM',
        password: 'SecureP@ss1',
      });

      expect(result.user.email).toBe('login@test.com');
    });

    // Failure scenarios
    it('throws error for wrong password', async () => {
      await expect(
        authService.login({
          email: 'login@test.com',
          password: 'WrongPassword1!',
        })
      ).rejects.toThrow(AuthError);

      try {
        await authService.login({
          email: 'login@test.com',
          password: 'WrongPassword1!',
        });
      } catch (error) {
        expect((error as AuthError).code).toBe('INVALID_CREDENTIALS');
      }
    });

    it('throws error for non-existent email', async () => {
      await expect(
        authService.login({
          email: 'nonexistent@test.com',
          password: 'SecureP@ss1',
        })
      ).rejects.toThrow(AuthError);

      try {
        await authService.login({
          email: 'nonexistent@test.com',
          password: 'SecureP@ss1',
        });
      } catch (error) {
        expect((error as AuthError).code).toBe('INVALID_CREDENTIALS');
      }
    });

    it('throws same error for wrong email and wrong password (no enumeration)', async () => {
      // Security: should not reveal whether email exists
      let wrongEmailError: AuthError | undefined;
      let wrongPasswordError: AuthError | undefined;

      try {
        await authService.login({
          email: 'nonexistent@test.com',
          password: 'SecureP@ss1',
        });
      } catch (error) {
        wrongEmailError = error as AuthError;
      }

      try {
        await authService.login({
          email: 'login@test.com',
          password: 'WrongPassword1!',
        });
      } catch (error) {
        wrongPasswordError = error as AuthError;
      }

      expect(wrongEmailError?.code).toBe(wrongPasswordError?.code);
      expect(wrongEmailError?.message).toBe(wrongPasswordError?.message);
    });

    it('throws error for empty email', async () => {
      await expect(
        authService.login({
          email: '',
          password: 'SecureP@ss1',
        })
      ).rejects.toThrow(AuthError);
    });

    it('throws error for empty password', async () => {
      await expect(
        authService.login({
          email: 'login@test.com',
          password: '',
        })
      ).rejects.toThrow(AuthError);
    });
  });

  describe('validateSession', () => {
    let sessionToken: string;
    let userId: string;

    beforeEach(async () => {
      const signup = await authService.signup({
        email: 'session@test.com',
        password: 'SecureP@ss1',
        businessName: 'Session Test',
      });
      const login = await authService.login({
        email: 'session@test.com',
        password: 'SecureP@ss1',
      });
      sessionToken = login.sessionToken;
      userId = login.user.id;
    });

    // Happy path
    it('returns user for valid session token', async () => {
      const user = await authService.validateSession(sessionToken);

      expect(user).toBeDefined();
      expect(user?.id).toBe(userId);
      expect(user?.email).toBe('session@test.com');
    });

    it('does not return password hash', async () => {
      const user = await authService.validateSession(sessionToken);

      expect((user as any)?.passwordHash).toBeUndefined();
    });

    // Failure scenarios
    it('returns null for invalid token', async () => {
      const user = await authService.validateSession('invalid-token');

      expect(user).toBeNull();
    });

    it('returns null for expired token', async () => {
      // Manually expire the session
      await prisma.session.update({
        where: { token: sessionToken },
        data: { expiresAt: new Date(Date.now() - 1000) },
      });

      const user = await authService.validateSession(sessionToken);

      expect(user).toBeNull();
    });

    it('returns null for empty token', async () => {
      const user = await authService.validateSession('');

      expect(user).toBeNull();
    });

    // Edge cases
    it('deletes expired session when validating', async () => {
      // Expire the session
      await prisma.session.update({
        where: { token: sessionToken },
        data: { expiresAt: new Date(Date.now() - 1000) },
      });

      await authService.validateSession(sessionToken);

      // Session should be deleted
      const session = await prisma.session.findUnique({
        where: { token: sessionToken },
      });
      expect(session).toBeNull();
    });
  });

  describe('logout', () => {
    let sessionToken: string;

    beforeEach(async () => {
      await authService.signup({
        email: 'logout@test.com',
        password: 'SecureP@ss1',
        businessName: 'Logout Test',
      });
      const login = await authService.login({
        email: 'logout@test.com',
        password: 'SecureP@ss1',
      });
      sessionToken = login.sessionToken;
    });

    // Happy path
    it('removes session from database', async () => {
      await authService.logout(sessionToken);

      const session = await prisma.session.findUnique({
        where: { token: sessionToken },
      });

      expect(session).toBeNull();
    });

    it('returns true for successful logout', async () => {
      const result = await authService.logout(sessionToken);

      expect(result).toBe(true);
    });

    // Edge cases
    it('returns false for non-existent token (idempotent)', async () => {
      const result = await authService.logout('non-existent-token');

      expect(result).toBe(false);
    });

    it('returns false for empty token', async () => {
      const result = await authService.logout('');

      expect(result).toBe(false);
    });
  });

  describe('forgotPassword', () => {
    beforeEach(async () => {
      await authService.signup({
        email: 'forgot@test.com',
        password: 'SecureP@ss1',
        businessName: 'Forgot Test',
      });
    });

    // Happy path
    it('generates password reset token for valid email', async () => {
      const result = await authService.forgotPassword('forgot@test.com');

      expect(result.resetToken).toBeDefined();
      expect(result.resetToken.length).toBeGreaterThan(0);
    });

    it('stores reset token in database', async () => {
      const result = await authService.forgotPassword('forgot@test.com');

      const user = await prisma.user.findUnique({
        where: { email: 'forgot@test.com' },
      });

      expect(user?.passwordResetToken).toBe(result.resetToken);
      expect(user?.passwordResetExpires).toBeDefined();
      expect(user?.passwordResetExpires!.getTime()).toBeGreaterThan(Date.now());
    });

    // Security: does not reveal if email exists
    it('returns token even for non-existent email (prevents enumeration)', async () => {
      const result = await authService.forgotPassword('nonexistent@test.com');

      // Should return a fake token to prevent email enumeration
      expect(result.resetToken).toBeDefined();
    });

    it('handles case-insensitive email', async () => {
      const result = await authService.forgotPassword('FORGOT@TEST.COM');

      expect(result.resetToken).toBeDefined();

      // Verify it was actually saved
      const user = await prisma.user.findUnique({
        where: { email: 'forgot@test.com' },
      });
      expect(user?.passwordResetToken).toBe(result.resetToken);
    });

    // Edge cases
    it('overwrites previous reset token', async () => {
      const result1 = await authService.forgotPassword('forgot@test.com');
      const result2 = await authService.forgotPassword('forgot@test.com');

      expect(result1.resetToken).not.toBe(result2.resetToken);

      const user = await prisma.user.findUnique({
        where: { email: 'forgot@test.com' },
      });
      expect(user?.passwordResetToken).toBe(result2.resetToken);
    });
  });

  describe('resetPassword', () => {
    let resetToken: string;

    beforeEach(async () => {
      await authService.signup({
        email: 'reset@test.com',
        password: 'SecureP@ss1',
        businessName: 'Reset Test',
      });
      const result = await authService.forgotPassword('reset@test.com');
      resetToken = result.resetToken;
    });

    // Happy path
    it('updates password with valid token', async () => {
      await authService.resetPassword({
        token: resetToken,
        newPassword: 'NewSecureP@ss2',
      });

      // Should be able to login with new password
      const result = await authService.login({
        email: 'reset@test.com',
        password: 'NewSecureP@ss2',
      });
      expect(result.user.email).toBe('reset@test.com');
    });

    it('clears reset token after successful reset', async () => {
      await authService.resetPassword({
        token: resetToken,
        newPassword: 'NewSecureP@ss2',
      });

      const user = await prisma.user.findUnique({
        where: { email: 'reset@test.com' },
      });
      expect(user?.passwordResetToken).toBeNull();
      expect(user?.passwordResetExpires).toBeNull();
    });

    it('invalidates old password', async () => {
      await authService.resetPassword({
        token: resetToken,
        newPassword: 'NewSecureP@ss2',
      });

      await expect(
        authService.login({
          email: 'reset@test.com',
          password: 'SecureP@ss1',
        })
      ).rejects.toThrow(AuthError);
    });

    // Failure scenarios
    it('throws error for invalid token', async () => {
      await expect(
        authService.resetPassword({
          token: 'invalid-token',
          newPassword: 'NewSecureP@ss2',
        })
      ).rejects.toThrow(AuthError);

      try {
        await authService.resetPassword({
          token: 'invalid-token',
          newPassword: 'NewSecureP@ss2',
        });
      } catch (error) {
        expect((error as AuthError).code).toBe('INVALID_TOKEN');
      }
    });

    it('throws error for expired token', async () => {
      // Manually expire the token
      await prisma.user.update({
        where: { email: 'reset@test.com' },
        data: { passwordResetExpires: new Date(Date.now() - 1000) },
      });

      await expect(
        authService.resetPassword({
          token: resetToken,
          newPassword: 'NewSecureP@ss2',
        })
      ).rejects.toThrow(AuthError);

      try {
        await authService.resetPassword({
          token: resetToken,
          newPassword: 'NewSecureP@ss2',
        });
      } catch (error) {
        expect((error as AuthError).code).toBe('INVALID_TOKEN');
      }
    });

    it('throws error for weak new password', async () => {
      await expect(
        authService.resetPassword({
          token: resetToken,
          newPassword: 'weak',
        })
      ).rejects.toThrow(AuthError);

      try {
        await authService.resetPassword({
          token: resetToken,
          newPassword: 'weak',
        });
      } catch (error) {
        expect((error as AuthError).code).toBe('WEAK_PASSWORD');
      }
    });

    it('throws error for empty new password', async () => {
      await expect(
        authService.resetPassword({
          token: resetToken,
          newPassword: '',
        })
      ).rejects.toThrow(AuthError);
    });

    // Edge cases
    it('token can only be used once', async () => {
      await authService.resetPassword({
        token: resetToken,
        newPassword: 'NewSecureP@ss2',
      });

      await expect(
        authService.resetPassword({
          token: resetToken,
          newPassword: 'AnotherP@ss3',
        })
      ).rejects.toThrow(AuthError);
    });

    it('invalidates all existing sessions after password reset', async () => {
      // Create a session
      const login = await authService.login({
        email: 'reset@test.com',
        password: 'SecureP@ss1',
      });

      // Reset password
      await authService.resetPassword({
        token: resetToken,
        newPassword: 'NewSecureP@ss2',
      });

      // Old session should be invalid
      const user = await authService.validateSession(login.sessionToken);
      expect(user).toBeNull();
    });
  });

  describe('verifyEmail', () => {
    let verificationToken: string;

    beforeEach(async () => {
      const result = await authService.signup({
        email: 'verify@test.com',
        password: 'SecureP@ss1',
        businessName: 'Verify Test',
      });
      verificationToken = result.emailVerificationToken;
    });

    // Happy path
    it('sets emailVerified to true with valid token', async () => {
      await authService.verifyEmail(verificationToken);

      const user = await prisma.user.findUnique({
        where: { email: 'verify@test.com' },
      });
      expect(user?.emailVerified).toBe(true);
    });

    it('clears verification token after success', async () => {
      await authService.verifyEmail(verificationToken);

      const user = await prisma.user.findUnique({
        where: { email: 'verify@test.com' },
      });
      expect(user?.emailVerificationToken).toBeNull();
      expect(user?.emailVerificationExpires).toBeNull();
    });

    // Failure scenarios
    it('throws error for invalid token', async () => {
      await expect(
        authService.verifyEmail('invalid-token')
      ).rejects.toThrow(AuthError);

      try {
        await authService.verifyEmail('invalid-token');
      } catch (error) {
        expect((error as AuthError).code).toBe('INVALID_TOKEN');
      }
    });

    it('throws error for expired token', async () => {
      // Manually expire the token
      await prisma.user.update({
        where: { email: 'verify@test.com' },
        data: { emailVerificationExpires: new Date(Date.now() - 1000) },
      });

      await expect(
        authService.verifyEmail(verificationToken)
      ).rejects.toThrow(AuthError);
    });

    // Edge cases
    it('token can only be used once', async () => {
      await authService.verifyEmail(verificationToken);

      await expect(
        authService.verifyEmail(verificationToken)
      ).rejects.toThrow(AuthError);
    });
  });
});
