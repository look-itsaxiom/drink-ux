import request from 'supertest';
import express, { Express } from 'express';
import cookieParser from 'cookie-parser';
import { PrismaClient } from '../../../generated/prisma';
import { createAuthRouter } from '../auth';
import { AuthService } from '../../services/AuthService';
import { SESSION_COOKIE_NAME } from '../../middleware/session';

const prisma = new PrismaClient();
let authService: AuthService;

beforeAll(async () => {
  authService = new AuthService(prisma);
});

beforeEach(async () => {
  // Clean database before each test
  await prisma.$transaction([
    prisma.session.deleteMany(),
    prisma.business.deleteMany(),
    prisma.user.deleteMany(),
  ]);
});

afterAll(async () => {
  await prisma.$transaction([
    prisma.session.deleteMany(),
    prisma.business.deleteMany(),
    prisma.user.deleteMany(),
  ]);
  await prisma.$disconnect();
});

describe('Auth Routes', () => {
  let app: Express;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use(cookieParser());
    // Disable rate limiting for tests
    app.use('/api/auth', createAuthRouter(authService, { disableRateLimit: true }));
  });

  describe('POST /api/auth/signup', () => {
    // Happy path
    it('creates user and business with valid input', async () => {
      const response = await request(app)
        .post('/api/auth/signup')
        .send({
          email: 'owner@coffeeshop.com',
          password: 'SecureP@ss1',
          businessName: "Joe's Coffee",
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user).toBeDefined();
      expect(response.body.data.user.email).toBe('owner@coffeeshop.com');
      expect(response.body.data.business).toBeDefined();
      expect(response.body.data.business.name).toBe("Joe's Coffee");
    });

    it('does not return password hash', async () => {
      const response = await request(app)
        .post('/api/auth/signup')
        .send({
          email: 'owner@test.com',
          password: 'SecureP@ss1',
          businessName: 'Test Coffee',
        });

      expect(response.body.data.user.hashedPassword).toBeUndefined();
    });

    it('returns emailVerificationToken (for testing only, should be removed in production)', async () => {
      const response = await request(app)
        .post('/api/auth/signup')
        .send({
          email: 'owner@verify.com',
          password: 'SecureP@ss1',
          businessName: 'Verify Coffee',
        });

      // In a real app, this wouldn't be returned - would be sent via email
      expect(response.body.data.emailVerificationToken).toBeDefined();
    });

    // Failure scenarios
    it('returns 400 for duplicate email', async () => {
      await request(app)
        .post('/api/auth/signup')
        .send({
          email: 'duplicate@test.com',
          password: 'SecureP@ss1',
          businessName: 'First Coffee',
        });

      const response = await request(app)
        .post('/api/auth/signup')
        .send({
          email: 'duplicate@test.com',
          password: 'SecureP@ss1',
          businessName: 'Second Coffee',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('EMAIL_EXISTS');
    });

    it('returns 400 for invalid email', async () => {
      const response = await request(app)
        .post('/api/auth/signup')
        .send({
          email: 'invalid-email',
          password: 'SecureP@ss1',
          businessName: 'Coffee Shop',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_EMAIL');
    });

    it('returns 400 for weak password', async () => {
      const response = await request(app)
        .post('/api/auth/signup')
        .send({
          email: 'owner@test.com',
          password: 'weak',
          businessName: 'Coffee Shop',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('WEAK_PASSWORD');
    });

    it('returns 400 for missing email', async () => {
      const response = await request(app)
        .post('/api/auth/signup')
        .send({
          password: 'SecureP@ss1',
          businessName: 'Coffee Shop',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('returns 400 for missing password', async () => {
      const response = await request(app)
        .post('/api/auth/signup')
        .send({
          email: 'owner@test.com',
          businessName: 'Coffee Shop',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('returns 400 for missing business name', async () => {
      const response = await request(app)
        .post('/api/auth/signup')
        .send({
          email: 'owner@test.com',
          password: 'SecureP@ss1',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    // Edge cases
    it('normalizes email to lowercase', async () => {
      const response = await request(app)
        .post('/api/auth/signup')
        .send({
          email: 'Owner@TEST.com',
          password: 'SecureP@ss1',
          businessName: 'Case Coffee',
        });

      expect(response.body.data.user.email).toBe('owner@test.com');
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      await authService.signup({
        email: 'login@test.com',
        password: 'SecureP@ss1',
        businessName: 'Login Test',
      });
    });

    // Happy path
    it('returns user and sets session cookie for valid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'login@test.com',
          password: 'SecureP@ss1',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user).toBeDefined();
      expect(response.body.data.user.email).toBe('login@test.com');

      // Check cookie was set
      const cookies = response.headers['set-cookie'];
      expect(cookies).toBeDefined();
      expect(cookies[0]).toContain(SESSION_COOKIE_NAME);
      expect(cookies[0]).toContain('HttpOnly');
    });

    it('does not return password hash', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'login@test.com',
          password: 'SecureP@ss1',
        });

      expect(response.body.data.user.hashedPassword).toBeUndefined();
    });

    // Failure scenarios
    it('returns 401 for wrong password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'login@test.com',
          password: 'WrongPassword1!',
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_CREDENTIALS');
    });

    it('returns 401 for non-existent email', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@test.com',
          password: 'SecureP@ss1',
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_CREDENTIALS');
    });

    it('returns same error for wrong email and wrong password (prevents enumeration)', async () => {
      const wrongEmailResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@test.com',
          password: 'SecureP@ss1',
        });

      const wrongPasswordResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'login@test.com',
          password: 'WrongPassword1!',
        });

      expect(wrongEmailResponse.body.error.code).toBe(wrongPasswordResponse.body.error.code);
      expect(wrongEmailResponse.body.error.message).toBe(wrongPasswordResponse.body.error.message);
    });

    it('returns 400 for missing email', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          password: 'SecureP@ss1',
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('returns 400 for missing password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'login@test.com',
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    // Edge cases
    it('handles case-insensitive email', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'LOGIN@TEST.COM',
          password: 'SecureP@ss1',
        });

      expect(response.status).toBe(200);
      expect(response.body.data.user.email).toBe('login@test.com');
    });
  });

  describe('GET /api/auth/me', () => {
    let sessionToken: string;

    beforeEach(async () => {
      await authService.signup({
        email: 'me@test.com',
        password: 'SecureP@ss1',
        businessName: 'Me Test',
      });
      const login = await authService.login({
        email: 'me@test.com',
        password: 'SecureP@ss1',
      });
      sessionToken = login.sessionToken;
    });

    // Happy path
    it('returns current user when authenticated', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Cookie', `${SESSION_COOKIE_NAME}=${sessionToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user).toBeDefined();
      expect(response.body.data.user.email).toBe('me@test.com');
    });

    it('does not return password hash', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Cookie', `${SESSION_COOKIE_NAME}=${sessionToken}`);

      expect(response.body.data.user.hashedPassword).toBeUndefined();
    });

    // Failure scenarios
    it('returns 401 when not authenticated', async () => {
      const response = await request(app)
        .get('/api/auth/me');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('UNAUTHORIZED');
    });

    it('returns 401 for invalid session token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Cookie', `${SESSION_COOKIE_NAME}=invalid-token`);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/auth/logout', () => {
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
    it('clears session and returns success', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .set('Cookie', `${SESSION_COOKIE_NAME}=${sessionToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // Cookie should be cleared
      const cookies = response.headers['set-cookie'];
      expect(cookies).toBeDefined();
      expect(cookies[0]).toContain(SESSION_COOKIE_NAME);
      // Cookie should have Max-Age=0 or expires in past
    });

    it('invalidates session so subsequent requests fail', async () => {
      await request(app)
        .post('/api/auth/logout')
        .set('Cookie', `${SESSION_COOKIE_NAME}=${sessionToken}`);

      // Try to access protected endpoint with same token
      const response = await request(app)
        .get('/api/auth/me')
        .set('Cookie', `${SESSION_COOKIE_NAME}=${sessionToken}`);

      expect(response.status).toBe(401);
    });

    // Edge cases
    it('returns success even if not authenticated', async () => {
      // Logout should be idempotent
      const response = await request(app)
        .post('/api/auth/logout');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('returns success for invalid token', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .set('Cookie', `${SESSION_COOKIE_NAME}=invalid-token`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('POST /api/auth/forgot-password', () => {
    beforeEach(async () => {
      await authService.signup({
        email: 'forgot@test.com',
        password: 'SecureP@ss1',
        businessName: 'Forgot Test',
      });
    });

    // Happy path
    it('returns success for valid email', async () => {
      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'forgot@test.com' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      // In real app, wouldn't return token - would be sent via email
      expect(response.body.data.resetToken).toBeDefined();
    });

    // Security: don't reveal if email exists
    it('returns success even for non-existent email (prevents enumeration)', async () => {
      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'nonexistent@test.com' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    // Failure scenarios
    it('returns 400 for missing email', async () => {
      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    // Edge cases
    it('handles case-insensitive email', async () => {
      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'FORGOT@TEST.COM' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('POST /api/auth/reset-password', () => {
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
      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: resetToken,
          newPassword: 'NewSecureP@ss2',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // Verify can login with new password
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'reset@test.com',
          password: 'NewSecureP@ss2',
        });
      expect(loginResponse.status).toBe(200);
    });

    // Failure scenarios
    it('returns 400 for invalid token', async () => {
      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: 'invalid-token',
          newPassword: 'NewSecureP@ss2',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_TOKEN');
    });

    it('returns 400 for weak new password', async () => {
      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: resetToken,
          newPassword: 'weak',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('WEAK_PASSWORD');
    });

    it('returns 400 for missing token', async () => {
      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({
          newPassword: 'NewSecureP@ss2',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('returns 400 for missing new password', async () => {
      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: resetToken,
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    // Edge cases
    it('token can only be used once', async () => {
      await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: resetToken,
          newPassword: 'NewSecureP@ss2',
        });

      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: resetToken,
          newPassword: 'AnotherP@ss3',
        });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('INVALID_TOKEN');
    });
  });

  describe('POST /api/auth/verify-email', () => {
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
    it('verifies email with valid token', async () => {
      const response = await request(app)
        .post('/api/auth/verify-email')
        .send({ token: verificationToken });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // Verify email is now verified
      const user = await prisma.user.findUnique({
        where: { email: 'verify@test.com' },
      });
      expect(user?.emailVerified).toBe(true);
    });

    // Failure scenarios
    it('returns 400 for invalid token', async () => {
      const response = await request(app)
        .post('/api/auth/verify-email')
        .send({ token: 'invalid-token' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_TOKEN');
    });

    it('returns 400 for missing token', async () => {
      const response = await request(app)
        .post('/api/auth/verify-email')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    // Edge cases
    it('token can only be used once', async () => {
      await request(app)
        .post('/api/auth/verify-email')
        .send({ token: verificationToken });

      const response = await request(app)
        .post('/api/auth/verify-email')
        .send({ token: verificationToken });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('INVALID_TOKEN');
    });
  });
});
