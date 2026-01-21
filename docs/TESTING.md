# Testing Documentation

This document provides comprehensive testing guidance for the drink-ux project, including test frameworks, patterns, commands, and end-to-end testing scenarios.

## Table of Contents

1. [Testing Overview](#testing-overview)
2. [Running Tests](#running-tests)
3. [Test Structure](#test-structure)
4. [Writing Tests](#writing-tests)
5. [End-to-End Testing Scenarios](#end-to-end-testing-scenarios)
6. [Integration Testing](#integration-testing)
7. [Test Data](#test-data)

---

## Testing Overview

### Test Frameworks

| Package | Framework | Environment | Key Libraries |
|---------|-----------|-------------|---------------|
| `@drink-ux/api` | Jest 29.x | Node.js | supertest, jest-mock-extended, prisma-mock |
| `@drink-ux/mobile` | Vitest 1.x | jsdom | @testing-library/react, @testing-library/user-event |
| `@drink-ux/shared` | Vitest 1.x | Node.js | - |

### Test Coverage Goals

- **API Package**: Comprehensive coverage of all services, routes, middleware, and adapters
- **Mobile Package**: Component tests, hook tests, service tests, and integration tests
- **Minimum Target**: 80% line coverage for critical paths (authentication, orders, payments)

### Current Test Counts

- **API Tests**: ~1303 tests across services, routes, middleware, and adapters
- **Mobile Tests**: ~434 tests across components, hooks, and services

---

## Running Tests

### API Package (`@drink-ux/api`)

```bash
cd packages/api

# Run all tests
npm test

# Watch mode (re-runs on file changes)
npm run test:watch

# Generate coverage report
npm run test:coverage

# Verbose output with test names
npm run test:verbose

# Run specific test file
npm test -- src/services/__tests__/AuthService.test.ts

# Run tests matching a pattern
npm test -- --testNamePattern="signup"

# Run tests in a specific directory
npm test -- src/routes/__tests__/

# CI mode (no watch, with coverage)
npm run test:ci
```

### Mobile Package (`@drink-ux/mobile`)

```bash
cd packages/mobile

# Run all tests
npm test

# Watch mode (interactive)
npm run test:watch

# Generate coverage report
npm run test:coverage

# Run specific test file
npm test -- src/hooks/__tests__/useCart.test.tsx

# Run tests matching a pattern
npm test -- --grep "addItem"
```

### Monorepo Commands (from root)

```bash
# Run tests in specific workspace
npm test --workspace=@drink-ux/api
npm test --workspace=@drink-ux/mobile
```

---

## Test Structure

### API Tests Organization

```
packages/api/src/
├── __tests__/
│   ├── api.test.ts              # API integration tests
│   └── database.test.ts         # Database connection tests
├── adapters/pos/__tests__/
│   ├── POSAdapter.test.ts       # Base adapter interface tests
│   ├── SquareAdapter.OAuth.test.ts
│   ├── SquareAdapter.importCatalog.test.ts
│   ├── SquareAdapter.push.test.ts
│   └── MockPOSAdapter.test.ts
├── middleware/__tests__/
│   ├── session.test.ts          # Session middleware tests
│   ├── tenant.test.ts           # Multi-tenant middleware tests
│   ├── rateLimit.test.ts        # Rate limiting tests
│   ├── subscriptionGate.test.ts # Subscription access control tests
│   └── errorHandler.test.ts     # Error handling middleware tests
├── routes/__tests__/
│   ├── auth.test.ts             # Authentication routes
│   ├── orders.test.ts           # Order management routes
│   ├── catalog.test.ts          # Catalog routes
│   ├── subscription.test.ts     # Subscription routes
│   ├── subscriptionWebhooks.test.ts
│   └── ...
├── services/__tests__/
│   ├── AuthService.test.ts      # Authentication service
│   ├── OrderService.test.ts     # Order processing service
│   ├── SubscriptionService.test.ts
│   ├── OnboardingService.test.ts
│   ├── CatalogService.test.ts
│   └── ...
└── utils/__tests__/
    ├── encryption.test.ts       # Encryption utilities
    ├── password.test.ts         # Password hashing
    ├── subdomain.test.ts        # Subdomain parsing
    └── catalogDiff.test.ts      # Catalog diff utilities
```

### Mobile Tests Organization

```
packages/mobile/src/
├── components/
│   ├── Checkout/__tests__/
│   │   └── CustomerInfoForm.test.tsx
│   ├── ErrorBoundary/__tests__/
│   │   └── ErrorBoundary.test.tsx
│   ├── ErrorDisplay/__tests__/
│   │   └── ErrorDisplay.test.tsx
│   ├── GracePeriodBanner/__tests__/
│   │   └── GracePeriodBanner.test.tsx
│   ├── OfflineIndicator/__tests__/
│   │   └── OfflineIndicator.test.tsx
│   ├── StorefrontStatus/__tests__/
│   │   └── StorefrontStatus.test.tsx
│   └── SubscriptionGate/__tests__/
│       └── SubscriptionGate.test.tsx
├── hooks/__tests__/
│   ├── useCart.test.tsx         # Shopping cart hook
│   ├── useBusiness.test.tsx     # Business context hook
│   ├── useCatalog.test.tsx      # Catalog data hook
│   ├── useOrderStatus.test.tsx  # Order status polling
│   ├── useRetry.test.tsx        # Retry logic hook
│   └── useSubscriptionStatus.test.tsx
├── pages/__tests__/
│   ├── Checkout.test.tsx
│   └── OrderConfirmation.test.tsx
├── pages/
│   ├── ComingSoon/__tests__/
│   │   └── ComingSoon.test.tsx
│   └── NotFound/__tests__/
│       └── NotFound.test.tsx
├── services/__tests__/
│   ├── api.test.ts              # API client tests
│   ├── businessService.test.ts
│   ├── catalogService.test.ts
│   └── orderService.test.ts
├── theme/__tests__/
│   ├── applyTheme.test.ts
│   └── ThemeProvider.test.tsx
├── utils/__tests__/
│   └── errors.test.ts
└── test/
    └── setup.ts                 # Test setup and helpers
```

### Naming Conventions

- Test files: `*.test.ts` or `*.test.tsx`
- Test files location: `__tests__/` directory next to source files
- Describe blocks: Match class/function name being tested
- Test names: Descriptive, action-oriented (e.g., "creates user and business with valid input")

---

## Writing Tests

### TDD Approach

This project follows Test-Driven Development (TDD). When implementing new features:

1. **Write failing tests first** - Define expected behavior before implementation
2. **Implement minimal code** - Write just enough code to pass the tests
3. **Refactor** - Improve code quality while keeping tests green
4. **Repeat** - Continue the cycle for each feature

### Test Categories

Each test file should organize tests into these categories:

```typescript
describe('ServiceName', () => {
  describe('methodName', () => {
    // Happy path - the expected successful flow
    it('creates resource successfully with valid input', async () => {
      // Test the primary success case
    });

    // Success scenarios - additional valid inputs
    it('handles business name with special characters', async () => {
      // Test variations that should succeed
    });

    it('normalizes email to lowercase', async () => {
      // Test input normalization
    });

    // Failure scenarios - expected rejections
    it('throws error for duplicate email', async () => {
      await expect(
        service.create({ email: 'duplicate@test.com' })
      ).rejects.toThrow(CustomError);
    });

    it('throws error for invalid email format', async () => {
      // Test validation failures
    });

    // Error scenarios - system/external errors
    it('handles database connection failure', async () => {
      // Test error handling for external failures
    });

    it('handles Square API timeout', async () => {
      // Test external service failures
    });

    // Edge cases - boundary conditions
    it('handles empty string input', async () => {
      // Test boundary conditions
    });

    it('handles maximum length input', async () => {
      // Test limits
    });
  });
});
```

### Mocking Patterns

#### Mocking Prisma Client

```typescript
import { PrismaClient } from '../../../generated/prisma';

const prisma = new PrismaClient();

// Clean database before tests
beforeEach(async () => {
  await prisma.$transaction([
    prisma.orderItem.deleteMany(),
    prisma.order.deleteMany(),
    prisma.session.deleteMany(),
    prisma.business.deleteMany(),
    prisma.user.deleteMany(),
  ]);
});

afterAll(async () => {
  await prisma.$disconnect();
});
```

#### Mocking Square API

```typescript
interface MockSquareClient {
  subscriptionsApi: {
    createSubscription: jest.Mock;
    cancelSubscription: jest.Mock;
  };
  catalogApi: {
    listCatalog: jest.Mock;
  };
}

function createMockSquareClient(): MockSquareClient {
  return {
    subscriptionsApi: {
      createSubscription: jest.fn(),
      cancelSubscription: jest.fn(),
    },
    catalogApi: {
      listCatalog: jest.fn(),
    },
  };
}

// In tests
let mockSquareClient: MockSquareClient;

beforeEach(() => {
  mockSquareClient = createMockSquareClient();
  service = new SubscriptionService(prisma, mockSquareClient as any);
});

it('creates subscription successfully', async () => {
  mockSquareClient.subscriptionsApi.createSubscription.mockResolvedValueOnce({
    result: {
      subscription: {
        id: 'sq-subscription-123',
        status: 'ACTIVE',
      },
    },
  });

  const result = await service.createSubscription(businessId, planId, 'nonce');
  expect(result.success).toBe(true);
});
```

#### Mocking Fetch (Mobile)

```typescript
import { vi } from 'vitest';
import { createMockResponse, createMockErrorResponse } from '../../test/setup';

// Mock successful response
vi.mocked(global.fetch).mockResolvedValueOnce(
  createMockResponse({
    success: true,
    data: mockOrderResponse,
  })
);

// Mock error response
vi.mocked(global.fetch).mockResolvedValueOnce(
  createMockErrorResponse('VALIDATION_ERROR', 'Invalid input', 400)
);
```

### Example Test Structure (Service)

```typescript
import { PrismaClient } from '../../../generated/prisma';
import { AuthService, AuthError } from '../AuthService';

const prisma = new PrismaClient();

beforeAll(async () => {
  await cleanDatabase();
});

afterAll(async () => {
  await cleanDatabase();
  await prisma.$disconnect();
});

describe('AuthService', () => {
  let authService: AuthService;

  beforeEach(async () => {
    await cleanDatabase();
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
      expect(result.business).toBeDefined();
      expect(result.business.name).toBe("Joe's Coffee");
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
        expect((error as AuthError).code).toBe('EMAIL_EXISTS');
      }
    });
  });
});
```

### Example Test Structure (React Hook)

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React from 'react';
import { useCart, CartProvider } from '../useCart';

const wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <CartProvider businessId="biz-123">{children}</CartProvider>
);

describe('useCart', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe('addItem', () => {
    it('should add item to cart', () => {
      const { result } = renderHook(() => useCart(), { wrapper });

      act(() => {
        result.current.addItem(mockCartItem);
      });

      expect(result.current.items).toHaveLength(1);
      expect(result.current.itemCount).toBe(1);
      expect(result.current.total).toBe(5.5);
    });
  });

  describe('submitOrder', () => {
    it('should submit order successfully', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce(
        createMockResponse({ success: true, data: mockOrderResponse })
      );

      const { result } = renderHook(() => useCart(), { wrapper });

      act(() => {
        result.current.addItem(mockCartItem);
      });

      await act(async () => {
        await result.current.submitOrder({
          customerName: 'John Doe',
          customerEmail: 'john@example.com',
        });
      });

      expect(result.current.items).toHaveLength(0); // Cart cleared
    });
  });
});
```

### Example Test Structure (Route)

```typescript
import request from 'supertest';
import express, { Express } from 'express';
import cookieParser from 'cookie-parser';
import { PrismaClient } from '../../../generated/prisma';
import { createOrderRouter } from '../orders';
import { OrderService } from '../../services/OrderService';
import { sessionMiddleware, SESSION_COOKIE_NAME } from '../../middleware/session';

const prisma = new PrismaClient();
let app: Express;
let orderService: OrderService;

beforeEach(async () => {
  await cleanDatabase();

  app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use(sessionMiddleware(authService));
  app.use('/api/orders', createOrderRouter(orderService));
});

describe('POST /api/orders', () => {
  it('creates order and returns result', async () => {
    const { business } = await createAuthenticatedUser();
    const catalog = await setupBusinessWithCatalog(business.id);

    const response = await request(app)
      .post('/api/orders')
      .send({
        businessId: business.id,
        customerName: 'John Doe',
        items: [{
          baseId: catalog.baseId,
          quantity: 1,
          size: 'MEDIUM',
          temperature: 'HOT',
          modifiers: catalog.modifierIds,
        }],
      });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.order.id).toBeDefined();
  });

  it('returns 400 for missing required fields', async () => {
    const response = await request(app)
      .post('/api/orders')
      .send({ businessId: 'some-id' });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });
});
```

---

## End-to-End Testing Scenarios

These scenarios should be manually verified before major releases. They cover complete user flows across the system.

### a. New Business Onboarding Flow

**Scenario**: A new coffee shop owner signs up and sets up their storefront.

**Steps to verify**:

1. **Registration**
   - [ ] Navigate to signup page
   - [ ] Enter valid email, password, and business name
   - [ ] Verify account creation succeeds
   - [ ] Check email verification token is generated

2. **Email Verification**
   - [ ] Click verification link from email (or use token directly in dev)
   - [ ] Verify email is marked as verified
   - [ ] User can now access onboarding

3. **Onboarding Step 1: POS Connection (Optional)**
   - [ ] Can skip POS connection
   - [ ] OR initiate Square OAuth flow
   - [ ] OAuth callback stores credentials
   - [ ] Access token is encrypted at rest

4. **Onboarding Step 2: Path Selection**
   - [ ] "Import from POS" enabled only if POS connected
   - [ ] "Use Template" creates sample catalog
   - [ ] "Start Fresh" creates empty catalog

5. **Onboarding Step 3: Catalog Setup**
   - [ ] Categories created correctly
   - [ ] Bases (drinks) have correct pricing
   - [ ] Modifiers have correct types (MILK, SYRUP, TOPPING)

6. **Onboarding Step 4: Branding**
   - [ ] Can set primary/secondary colors
   - [ ] Can upload/set logo URL
   - [ ] Can skip with default theme

7. **Onboarding Step 5: Review & Complete**
   - [ ] Summary shows catalog counts
   - [ ] Theme preview displays correctly
   - [ ] Complete transitions to SETUP_COMPLETE state

**Expected Result**: Business is ready to accept orders with configured catalog and branding.

---

### b. Customer Order Flow

**Scenario**: A customer orders a customized drink from a business storefront.

**Steps to verify**:

1. **Visit Storefront**
   - [ ] Access via subdomain: `{business-slug}.drink-ux.com`
   - [ ] Business theme (colors, logo) loads correctly
   - [ ] Catalog displays available categories

2. **Build Drink**
   - [ ] Select category (e.g., "Coffee")
   - [ ] Select base drink (e.g., "Latte")
   - [ ] Choose size (S/M/L) - price updates
   - [ ] Choose temperature (Hot/Iced)
   - [ ] Add modifiers (milk type, syrups, toppings)
   - [ ] Visual drink representation updates
   - [ ] Total price calculates correctly

3. **Add to Cart**
   - [ ] Drink added to cart with all customizations
   - [ ] Cart persists in localStorage
   - [ ] Can modify quantity
   - [ ] Can remove items

4. **Checkout**
   - [ ] Enter customer name and contact info
   - [ ] Review order summary
   - [ ] Submit order

5. **Payment** (if Square connected)
   - [ ] Payment link generated
   - [ ] Customer completes payment
   - [ ] Order status updates to PENDING

6. **Order Confirmation**
   - [ ] Order number and pickup code displayed
   - [ ] Can track order status
   - [ ] Status updates: PENDING -> CONFIRMED -> PREPARING -> READY

**Expected Result**: Order created in system and POS (if connected), customer receives pickup code.

---

### c. Subscription Lifecycle

**Scenario**: Managing business subscription through various states.

**Steps to verify**:

1. **Subscribe**
   - [ ] Select subscription plan
   - [ ] Checkout via Square payment link
   - [ ] Subscription status changes to ACTIVE
   - [ ] Business can accept orders

2. **Active Usage**
   - [ ] Storefront accessible to customers
   - [ ] Orders process normally
   - [ ] POS sync works (if connected)

3. **Payment Failure**
   - [ ] Webhook receives `subscription.payment_failed`
   - [ ] Status changes to DELINQUENT
   - [ ] Grace period banner shows on admin

4. **Grace Period**
   - [ ] Business still operational during grace period
   - [ ] Grace period end date displayed
   - [ ] Admin prompted to update payment method

5. **Suspension**
   - [ ] Grace period expires
   - [ ] Status changes to SUSPENDED
   - [ ] Storefront shows "Coming Soon" page
   - [ ] Admin can still access dashboard

6. **Resubscribe**
   - [ ] Update payment method
   - [ ] Subscription resumes
   - [ ] Status returns to ACTIVE
   - [ ] Storefront operational again

**Expected Result**: Subscription lifecycle handled gracefully with appropriate user feedback.

---

### d. Catalog Management

**Scenario**: Business owner manages their catalog and syncs with POS.

**Steps to verify**:

1. **Create Items**
   - [ ] Add new category
   - [ ] Add new base drink with pricing
   - [ ] Add modifiers (different types)
   - [ ] Set temperature constraints

2. **Edit Items**
   - [ ] Update drink name
   - [ ] Update pricing
   - [ ] Add/remove modifiers
   - [ ] Reorder categories

3. **Sync to POS** (Square connected)
   - [ ] Trigger catalog sync
   - [ ] Items pushed to Square with correct:
     - Names and descriptions
     - Pricing
     - Variations (sizes)
     - Modifier lists
   - [ ] POS IDs stored in local records

4. **Verify in Square**
   - [ ] Items appear in Square Dashboard
   - [ ] Pricing matches
   - [ ] Modifiers linked correctly

5. **Import Changes from POS**
   - [ ] Make changes in Square Dashboard
   - [ ] Trigger sync from POS
   - [ ] Changes reflected in drink-ux catalog

**Expected Result**: Catalog stays synchronized between drink-ux and Square POS.

---

### e. Multi-tenant Isolation

**Scenario**: Verify data isolation between different businesses.

**Steps to verify**:

1. **Subdomain Routing**
   - [ ] `business-a.drink-ux.com` shows Business A's storefront
   - [ ] `business-b.drink-ux.com` shows Business B's storefront
   - [ ] Main domain `drink-ux.com` shows landing page

2. **Data Isolation - Catalog**
   - [ ] Business A only sees their own categories
   - [ ] Business A only sees their own drinks
   - [ ] Business A only sees their own modifiers
   - [ ] No cross-business data leakage

3. **Data Isolation - Orders**
   - [ ] Business A only sees orders from their storefront
   - [ ] Cannot access Business B's orders
   - [ ] Order query filters by businessId

4. **Data Isolation - Settings**
   - [ ] Theme settings isolated per business
   - [ ] POS credentials isolated per business
   - [ ] Subscription status independent

5. **API Authorization**
   - [ ] API routes validate business ownership
   - [ ] Returns 403 when accessing other business data
   - [ ] Session tied to specific user's businesses

**Expected Result**: Complete data isolation between tenants at all levels.

---

## Integration Testing

### Square Sandbox Testing

Use Square's sandbox environment for integration testing:

```bash
# Environment variables for sandbox
SQUARE_ENVIRONMENT=sandbox
SQUARE_APP_ID=sandbox-sq0idb-xxx
SQUARE_APP_SECRET=sandbox-sq0csb-xxx
```

**Sandbox test data**:
- Test card: `4532 0123 4567 8901` (Visa, any expiry, any CVV)
- Sandbox merchant ID available in Square Dashboard

### Webhook Testing with ngrok

For testing webhooks locally:

```bash
# Start ngrok tunnel
ngrok http 3001

# Use ngrok URL for webhook endpoint
# https://abc123.ngrok.io/api/webhooks/square/subscription
```

Configure Square Dashboard to send webhooks to ngrok URL.

### Payment Testing

**Test card numbers** (Square sandbox):

| Card Type | Number | Expected Result |
|-----------|--------|-----------------|
| Visa | 4532 0123 4567 8901 | Success |
| Mastercard | 5425 2334 3010 9903 | Success |
| Declined | 4000 0000 0000 0002 | Declined |

**Test nonces** (Square):
- `cnon:card-nonce-ok` - Successful payment
- `cnon:card-nonce-declined` - Declined

---

## Test Data

### Test Fixtures

Common test fixtures are created via helper functions:

```typescript
// Create authenticated user with business
async function createAuthenticatedUser(emailPrefix?: string) {
  const uniqueId = `${Date.now()}-${Math.random().toString(36).substring(7)}`;
  const email = `${emailPrefix || 'test'}-${uniqueId}@test.com`;

  const result = await authService.signup({
    email,
    password: 'SecureP@ss1',
    businessName: `Test Business ${uniqueId}`,
  });
  const login = await authService.login({
    email,
    password: 'SecureP@ss1',
  });
  return {
    user: result.user,
    business: result.business,
    sessionToken: login.sessionToken,
  };
}

// Setup business with catalog items
async function setupBusinessWithCatalog(businessId: string) {
  const category = await prisma.category.create({
    data: { businessId, name: 'Hot Drinks' },
  });

  const base = await prisma.base.create({
    data: {
      businessId,
      categoryId: category.id,
      name: 'Espresso',
      basePrice: 3.99,
    },
  });

  const modifier = await prisma.modifier.create({
    data: {
      businessId,
      type: 'MILK',
      name: 'Oat Milk',
      price: 0.75,
    },
  });

  return { categoryId: category.id, baseId: base.id, modifierIds: [modifier.id] };
}
```

### Seed Data

For development/testing, use Prisma seeding:

```bash
cd packages/api
npx prisma db seed
```

### Database Cleanup

Tests clean up data in specific order due to foreign key constraints:

```typescript
async function cleanDatabase() {
  await prisma.$transaction([
    prisma.orderItem.deleteMany(),
    prisma.order.deleteMany(),
    prisma.syncHistory.deleteMany(),
    prisma.presetModifier.deleteMany(),
    prisma.preset.deleteMany(),
    prisma.modifier.deleteMany(),
    prisma.base.deleteMany(),
    prisma.category.deleteMany(),
    prisma.session.deleteMany(),
    prisma.subscription.deleteMany(),
    prisma.business.deleteMany(),
    prisma.user.deleteMany(),
  ]);
}
```

### Cleanup Strategies

1. **beforeEach cleanup**: Clean database before each test for isolation
2. **afterAll cleanup**: Final cleanup and disconnect after all tests
3. **Transaction rollback**: For complex tests, use transactions that rollback
4. **Unique identifiers**: Generate unique emails/slugs to avoid collisions

```typescript
// Generate unique test email
const uniqueSuffix = `${Date.now()}-${Math.random().toString(36).substring(7)}`;
const email = `test-${uniqueSuffix}@example.com`;
```

---

## Best Practices Summary

1. **Always run tests serially** for database tests (`maxWorkers: 1` in Jest config)
2. **Clean database before each test** for isolation
3. **Use unique identifiers** to prevent test pollution
4. **Mock external services** (Square API, email services)
5. **Test error codes** not just error messages
6. **Follow TDD** - write tests before implementation
7. **Organize by category** - happy path, success, failure, error, edge cases
8. **Use descriptive test names** that explain expected behavior
9. **Keep tests focused** - one assertion concept per test
10. **Avoid test interdependence** - each test should work in isolation
