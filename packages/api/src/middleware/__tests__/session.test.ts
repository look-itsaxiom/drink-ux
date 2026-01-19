import request from 'supertest';
import express, { Express, Request, Response, NextFunction } from 'express';
import cookieParser from 'cookie-parser';
import { PrismaClient } from '../../../generated/prisma';
import { AuthService } from '../../services/AuthService';
import {
  sessionMiddleware,
  requireAuth,
  AuthenticatedRequest,
  SESSION_COOKIE_NAME,
} from '../session';

const prisma = new PrismaClient();
let authService: AuthService;
let sessionToken: string;
let userId: string;

beforeAll(async () => {
  // Clean database
  await prisma.$transaction([
    prisma.session.deleteMany(),
    prisma.business.deleteMany(),
    prisma.user.deleteMany(),
  ]);

  authService = new AuthService(prisma);

  // Create a test user and login
  await authService.signup({
    email: 'session-test@example.com',
    password: 'SecureP@ss1',
    businessName: 'Session Test Business',
  });

  const login = await authService.login({
    email: 'session-test@example.com',
    password: 'SecureP@ss1',
  });

  sessionToken = login.sessionToken;
  userId = login.user.id;
});

afterAll(async () => {
  await prisma.$transaction([
    prisma.session.deleteMany(),
    prisma.business.deleteMany(),
    prisma.user.deleteMany(),
  ]);
  await prisma.$disconnect();
});

describe('sessionMiddleware', () => {
  let app: Express;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use(cookieParser());
    app.use(sessionMiddleware(authService));

    // Test endpoint that returns user info
    app.get('/test', (req: AuthenticatedRequest, res: Response) => {
      res.json({
        authenticated: !!req.user,
        user: req.user || null,
      });
    });
  });

  // Happy path
  it('attaches user to request when valid session cookie is present', async () => {
    const response = await request(app)
      .get('/test')
      .set('Cookie', `${SESSION_COOKIE_NAME}=${sessionToken}`);

    expect(response.status).toBe(200);
    expect(response.body.authenticated).toBe(true);
    expect(response.body.user).toBeDefined();
    expect(response.body.user.id).toBe(userId);
    expect(response.body.user.email).toBe('session-test@example.com');
  });

  it('does not include password hash in user object', async () => {
    const response = await request(app)
      .get('/test')
      .set('Cookie', `${SESSION_COOKIE_NAME}=${sessionToken}`);

    expect(response.body.user.passwordHash).toBeUndefined();
  });

  // No session scenarios
  it('sets user to undefined when no cookie is present', async () => {
    const response = await request(app)
      .get('/test');

    expect(response.status).toBe(200);
    expect(response.body.authenticated).toBe(false);
    expect(response.body.user).toBeNull();
  });

  it('sets user to undefined for invalid session token', async () => {
    const response = await request(app)
      .get('/test')
      .set('Cookie', `${SESSION_COOKIE_NAME}=invalid-token`);

    expect(response.status).toBe(200);
    expect(response.body.authenticated).toBe(false);
    expect(response.body.user).toBeNull();
  });

  it('sets user to undefined for expired session', async () => {
    // Create a separate expired session for this test
    const expiredSession = await prisma.session.create({
      data: {
        userId: userId,
        token: 'expired-test-token',
        expiresAt: new Date(Date.now() - 1000),
      },
    });

    const response = await request(app)
      .get('/test')
      .set('Cookie', `${SESSION_COOKIE_NAME}=${expiredSession.token}`);

    expect(response.status).toBe(200);
    expect(response.body.authenticated).toBe(false);
  });

  // Edge cases
  it('continues to next middleware even without session', async () => {
    const response = await request(app)
      .get('/test');

    expect(response.status).toBe(200); // Should not block
  });

  it('handles malformed cookie gracefully', async () => {
    const response = await request(app)
      .get('/test')
      .set('Cookie', 'malformed');

    expect(response.status).toBe(200);
    expect(response.body.authenticated).toBe(false);
  });
});

describe('requireAuth middleware', () => {
  let app: Express;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use(cookieParser());
    app.use(sessionMiddleware(authService));

    // Protected endpoint
    app.get('/protected', requireAuth, (req: AuthenticatedRequest, res: Response) => {
      res.json({
        message: 'Success',
        userId: req.user!.id,
      });
    });
  });

  // Happy path
  it('allows access when authenticated', async () => {
    const response = await request(app)
      .get('/protected')
      .set('Cookie', `${SESSION_COOKIE_NAME}=${sessionToken}`);

    expect(response.status).toBe(200);
    expect(response.body.message).toBe('Success');
    expect(response.body.userId).toBe(userId);
  });

  // Failure scenarios
  it('returns 401 when not authenticated', async () => {
    const response = await request(app)
      .get('/protected');

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('UNAUTHORIZED');
  });

  it('returns 401 for invalid session token', async () => {
    const response = await request(app)
      .get('/protected')
      .set('Cookie', `${SESSION_COOKIE_NAME}=invalid-token`);

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
  });

  it('returns JSON error response format', async () => {
    const response = await request(app)
      .get('/protected');

    expect(response.headers['content-type']).toMatch(/json/);
    expect(response.body).toHaveProperty('success');
    expect(response.body).toHaveProperty('error');
    expect(response.body.error).toHaveProperty('code');
    expect(response.body.error).toHaveProperty('message');
  });
});

describe('SESSION_COOKIE_NAME', () => {
  it('is a non-empty string', () => {
    expect(typeof SESSION_COOKIE_NAME).toBe('string');
    expect(SESSION_COOKIE_NAME.length).toBeGreaterThan(0);
  });
});
