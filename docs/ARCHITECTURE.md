# Drink-UX Architecture Documentation

This document provides a comprehensive overview of the Drink-UX system architecture, including component structure, data flows, design patterns, and integration points.

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Data Flow](#data-flow)
3. [Key Architectural Patterns](#key-architectural-patterns)
4. [Database Schema Overview](#database-schema-overview)
5. [Security Architecture](#security-architecture)
6. [Integration Points](#integration-points)

---

## System Overview

### High-Level Architecture

```
                                    +------------------+
                                    |   Square POS     |
                                    |   (External)     |
                                    +--------+---------+
                                             |
                                    OAuth / REST API
                                             |
+------------------+              +----------v---------+              +------------------+
|                  |   REST API   |                    |   REST API   |                  |
|   Mobile PWA     +-------------->      API Server    <--------------+   Admin Dashboard|
| (@drink-ux/      |              |   (@drink-ux/api)  |              | (@drink-ux/admin)|
|   mobile)        |              |                    |              |                  |
+------------------+              +----------+---------+              +------------------+
        |                                    |
        |                                    |
        v                                    v
+------------------+              +------------------+
|   Shared Types   |              |   SQLite/        |
| (@drink-ux/      |              |   PostgreSQL     |
|   shared)        |              |   (Prisma ORM)   |
+------------------+              +------------------+
```

### Package Structure

The project is organized as an **npm workspaces monorepo** with four packages:

| Package | Description | Port | Dependencies |
|---------|-------------|------|--------------|
| `@drink-ux/shared` | TypeScript types, enums, and shared React components | N/A | None |
| `@drink-ux/mobile` | Ionic/React/Capacitor PWA for customers | 3000 | shared |
| `@drink-ux/admin` | React dashboard for business owners | 3002 | shared |
| `@drink-ux/api` | Express/TypeScript backend with Prisma ORM | 3001 | shared |

```
drink-ux/
├── packages/
│   ├── shared/           # Type definitions & shared components
│   │   └── src/
│   │       ├── types.ts          # Core type definitions
│   │       └── components/       # Shared React components
│   │
│   ├── mobile/           # Customer-facing PWA
│   │   └── src/
│   │       ├── components/       # UI components (DrinkBuilder, etc.)
│   │       ├── pages/            # Route pages
│   │       ├── services/         # API clients
│   │       ├── hooks/            # React hooks
│   │       ├── context/          # React contexts
│   │       └── theme/            # Theming system
│   │
│   ├── admin/            # Business admin dashboard
│   │   └── src/
│   │       ├── components/
│   │       └── pages/
│   │
│   └── api/              # Backend server
│       └── src/
│           ├── adapters/         # POS adapters (Square, etc.)
│           ├── middleware/       # Express middleware
│           ├── routes/           # API endpoints
│           ├── services/         # Business logic
│           ├── utils/            # Utilities
│           └── generated/        # Prisma client
│
└── docs/                 # Documentation
```

### Technology Stack

| Layer | Technology |
|-------|------------|
| **Frontend (Mobile)** | React, Ionic Framework, Capacitor, Vite |
| **Frontend (Admin)** | React, Vite |
| **Backend** | Node.js, Express.js, TypeScript |
| **Database** | SQLite (dev), PostgreSQL/MySQL (production) |
| **ORM** | Prisma |
| **POS Integration** | Square API (OAuth 2.0) |
| **Deployment** | GitHub Pages (mobile PWA), Vercel |

---

## Data Flow

### Order Flow: Customer to POS

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Customer  │    │  Mobile     │    │    API      │    │  Square     │
│             │    │  App        │    │   Server    │    │    POS      │
└──────┬──────┘    └──────┬──────┘    └──────┬──────┘    └──────┬──────┘
       │                  │                  │                  │
       │ 1. Build drink   │                  │                  │
       │─────────────────>│                  │                  │
       │                  │                  │                  │
       │ 2. Add to cart   │                  │                  │
       │─────────────────>│                  │                  │
       │                  │                  │                  │
       │ 3. Checkout      │                  │                  │
       │─────────────────>│                  │                  │
       │                  │                  │                  │
       │                  │ 4. POST /orders  │                  │
       │                  │─────────────────>│                  │
       │                  │                  │                  │
       │                  │                  │ 5. Create order  │
       │                  │                  │─────────────────>│
       │                  │                  │                  │
       │                  │                  │<─────────────────│
       │                  │                  │ 6. POS Order ID  │
       │                  │                  │                  │
       │                  │<─────────────────│                  │
       │                  │ 7. Order + code  │                  │
       │                  │                  │                  │
       │<─────────────────│                  │                  │
       │ 8. Confirmation  │                  │                  │
       │                  │                  │                  │
```

**Order Service Flow:**

```typescript
// packages/api/src/services/OrderService.ts
async createOrder(input: CreateOrderInput): Promise<OrderResult> {
  // 1. Validate business exists
  // 2. Validate and calculate item prices
  // 3. Generate order number (e.g., "A42") and pickup code (e.g., "7X2K")
  // 4. Create order in database
  // 5. Submit to POS (non-blocking)
  // 6. Return order result with pickup code
}
```

### Catalog Sync: Admin to Square POS

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Admin     │    │   Admin     │    │    API      │    │  Square     │
│   User      │    │ Dashboard   │    │   Server    │    │    POS      │
└──────┬──────┘    └──────┬──────┘    └──────┬──────┘    └──────┬──────┘
       │                  │                  │                  │
       │ 1. Edit menu     │                  │                  │
       │─────────────────>│                  │                  │
       │                  │                  │                  │
       │                  │ 2. Save changes  │                  │
       │                  │─────────────────>│                  │
       │                  │                  │                  │
       │ 3. Click         │                  │                  │
       │ "Publish"        │                  │                  │
       │─────────────────>│                  │                  │
       │                  │                  │                  │
       │                  │ 4. POST /sync    │                  │
       │                  │─────────────────>│                  │
       │                  │                  │                  │
       │                  │                  │ 5. Calculate diff│
       │                  │                  │                  │
       │                  │                  │ 6. Push changes  │
       │                  │                  │─────────────────>│
       │                  │                  │                  │
       │                  │                  │<─────────────────│
       │                  │                  │ 7. Confirmation  │
       │                  │<─────────────────│                  │
       │<─────────────────│ 8. Sync result  │                  │
       │                  │                  │                  │
```

**Key Principle: Drink-UX Wins Conflicts**

The catalog sync is **on-demand** and **non-destructive**:
- Changes are only pushed when admin clicks "Publish Changes"
- Drink-UX is the source of truth - our data overwrites POS on sync
- Items are never deleted from POS, only marked inactive

### Authentication Flow

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   User      │    │   Client    │    │    API      │
│             │    │   App       │    │   Server    │
└──────┬──────┘    └──────┬──────┘    └──────┬──────┘
       │                  │                  │
       │ 1. Login         │                  │
       │─────────────────>│                  │
       │                  │                  │
       │                  │ 2. POST /login   │
       │                  │─────────────────>│
       │                  │                  │
       │                  │                  │ 3. Verify password
       │                  │                  │ 4. Create session
       │                  │                  │
       │                  │<─────────────────│
       │                  │ 5. Set cookie    │
       │                  │    + user data   │
       │<─────────────────│                  │
       │ 6. Logged in     │                  │
       │                  │                  │
       │ 7. Request page  │                  │
       │─────────────────>│                  │
       │                  │ 8. Request +     │
       │                  │    session cookie│
       │                  │─────────────────>│
       │                  │                  │ 9. Validate session
       │                  │<─────────────────│
       │<─────────────────│ 10. Response    │
       │                  │                  │
```

### Webhook Processing Flow

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│  Square     │    │    API      │    │  Database   │
│  Server     │    │   Server    │    │             │
└──────┬──────┘    └──────┬──────┘    └──────┬──────┘
       │                  │                  │
       │ 1. POST /webhook │                  │
       │  + signature     │                  │
       │─────────────────>│                  │
       │                  │                  │
       │                  │ 2. Verify HMAC   │
       │                  │    signature     │
       │                  │                  │
       │                  │ 3. Check event   │
       │                  │    idempotency   │
       │                  │                  │
       │                  │ 4. Route by type │
       │                  │                  │
       │                  │ 5. Update state  │
       │                  │─────────────────>│
       │                  │                  │
       │<─────────────────│                  │
       │ 6. 200 OK        │                  │
       │                  │                  │
```

**Supported Webhook Events:**
- `subscription.created` - New subscription activated
- `subscription.updated` - Subscription status changed
- `subscription.canceled` - Subscription canceled
- `subscription.paused` - Subscription paused
- `subscription.resumed` - Subscription resumed
- `invoice.payment_made` - Payment successful
- `invoice.payment_failed` - Payment failed (triggers grace period)

---

## Key Architectural Patterns

### Multi-tenancy (Subdomain Routing)

Drink-UX uses subdomain-based multi-tenancy to serve different businesses:

```
┌──────────────────────────────────────────────────────────────────┐
│                        Request Flow                               │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  joe-coffee.drink-ux.com  ──┐                                    │
│                              │                                    │
│  java-hut.drink-ux.com    ──┼──> Tenant Middleware ──> Business  │
│                              │        │                           │
│  brew-bros.drink-ux.com   ──┘        │                           │
│                                       v                           │
│                                 Parse subdomain                   │
│                                       │                           │
│                                       v                           │
│                                 Lookup business                   │
│                                       │                           │
│                                       v                           │
│                                 Check account state               │
│                                       │                           │
│                                       v                           │
│                                 Attach to request                 │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

```typescript
// packages/api/src/middleware/tenant.ts
export function tenantMiddleware(prisma: PrismaClient, options = {}) {
  return async (req, res, next) => {
    const hostname = req.hostname;
    const parseResult = parseHostForTenant(hostname);

    if (parseResult.slug) {
      const business = await prisma.business.findUnique({
        where: { slug: parseResult.slug },
      });

      // Check if business is in accessible state
      if (business && ACCESSIBLE_STATES.includes(business.accountState)) {
        req.tenant = toTenantBusiness(business);
      }
    }

    next();
  };
}
```

### POS Adapter Pattern

The POS Adapter pattern abstracts POS provider operations, enabling support for multiple providers:

```
┌─────────────────────────────────────────────────────────────────┐
│                      POSAdapter Interface                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  interface POSAdapter {                                          │
│    // OAuth                                                      │
│    getAuthorizationUrl(state: string): string                    │
│    exchangeCodeForTokens(code: string): Promise<TokenResult>     │
│    refreshTokens(refreshToken: string): Promise<TokenResult>     │
│                                                                  │
│    // Catalog                                                    │
│    importCatalog(): Promise<RawCatalogData>                     │
│    pushItem(item: CatalogItem): Promise<string>                 │
│    pushModifier(modifier: CatalogModifier): Promise<string>     │
│    updateItem(posItemId: string, item: CatalogItem): Promise    │
│                                                                  │
│    // Orders                                                     │
│    createOrder(order: OrderSubmission): Promise<string>         │
│    getOrderStatus(posOrderId: string): Promise<OrderStatus>     │
│                                                                  │
│    // Payment                                                    │
│    getPaymentLink(orderId: string): Promise<string>             │
│  }                                                               │
│                                                                  │
└───────────────────────────┬─────────────────────────────────────┘
                            │
            ┌───────────────┼───────────────┐
            │               │               │
            v               v               v
    ┌───────────────┐ ┌───────────┐ ┌───────────────┐
    │ SquareAdapter │ │ToastAdapter│ │ CloverAdapter │
    │ (Implemented) │ │ (Planned)  │ │  (Planned)    │
    └───────────────┘ └───────────┘ └───────────────┘
```

**SquareAdapter Implementation Highlights:**

```typescript
// packages/api/src/adapters/pos/SquareAdapter.ts
export class SquareAdapter implements POSAdapter {
  private getBaseUrl(): string {
    return this.environment === 'sandbox'
      ? 'https://connect.squareupsandbox.com'
      : 'https://connect.squareup.com';
  }

  async importCatalog(): Promise<RawCatalogData> {
    // Paginated fetch of all catalog objects
    // Maps Square types (CATEGORY, ITEM, MODIFIER_LIST) to internal format
  }

  async pushItem(item: CatalogItem): Promise<string> {
    // Creates catalog object in Square
    // Returns Square catalog object ID for mapping
  }
}
```

### Account State Machine

The account lifecycle is managed through a state machine pattern:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         Account State Machine                            │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│                        ┌─────────────┐                                   │
│                        │ ONBOARDING  │                                   │
│                        └──────┬──────┘                                   │
│                               │                                          │
│                               v                                          │
│                      ┌────────────────┐                                  │
│                      │ SETUP_COMPLETE │                                  │
│                      └───────┬────────┘                                  │
│                              │                                           │
│              ┌───────────────┼───────────────┐                          │
│              v               v               │                          │
│       ┌──────────┐    ┌──────────┐          │                          │
│       │  TRIAL   │───>│  ACTIVE  │<─────────┘                          │
│       └────┬─────┘    └────┬─────┘                                      │
│            │               │                                             │
│            │               ├──────────────┬──────────────┐              │
│            │               v              v              v              │
│            │        ┌────────────┐  ┌──────────┐  ┌──────────┐         │
│            └───────>│   PAUSED   │  │  GRACE   │  │ EJECTED  │         │
│                     └─────┬──────┘  │  PERIOD  │  └──────────┘         │
│                           │         └────┬─────┘       (terminal)       │
│                           │              │                              │
│                           │         ┌────┴─────┐                        │
│                           │         v          v                        │
│                           │   ┌──────────┐  ┌─────────┐                │
│                           └──>│SUSPENDED │  │ CHURNED │                │
│                               └──────────┘  └─────────┘                │
│                                    │         (terminal)                 │
│                                    v                                    │
│                             SETUP_COMPLETE                              │
│                             (resubscribe)                               │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

**State Capabilities:**

| State | Storefront | Edit Menu | Orders | Subscription |
|-------|------------|-----------|--------|--------------|
| ONBOARDING | No | Yes | No | Yes |
| SETUP_COMPLETE | No | Yes | No | Yes |
| TRIAL | Yes | Yes | Yes | Yes |
| ACTIVE | Yes | Yes | Yes | Yes |
| PAUSED | No | Yes | No | Yes |
| GRACE_PERIOD | Yes | Yes | No | Yes |
| SUSPENDED | No | No | No | Yes |
| CHURNED | No | No | No | No |
| EJECTED | No | No | No | No |

### Subscription Gating

Middleware controls access based on subscription status:

```typescript
// packages/api/src/middleware/subscriptionGate.ts

// Require active/trial subscription for full access
app.use('/api/orders', requireActiveSubscription(prisma));

// Allow storefront viewing during grace period
app.use('/api/catalog', requireStorefrontAccess(prisma));

// Allow editing during paused/grace period
app.use('/api/admin/menu', requireEditAccess(prisma));

// Non-blocking: adds status info to request
app.use(checkSubscriptionStatus(prisma));
```

**Response Codes:**
- `402 Payment Required` - Subscription needed, expired, or paused
- `403 Forbidden` - Account suspended or churned

---

## Database Schema Overview

### Entity Relationship Diagram

```
┌────────────────────────────────────────────────────────────────────────┐
│                           DATABASE SCHEMA                               │
├────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌──────────┐     ┌───────────────┐     ┌─────────────────────┐        │
│  │   User   │────<│    Session    │     │ AccountStateHistory │        │
│  └────┬─────┘     └───────────────┘     └──────────┬──────────┘        │
│       │                                            │                    │
│       │ 1:N                                        │ N:1                │
│       v                                            v                    │
│  ┌──────────────────────────────────────────────────────────┐          │
│  │                        Business                           │          │
│  │  - accountState (ONBOARDING, ACTIVE, etc.)               │          │
│  │  - posProvider (SQUARE, TOAST, CLOVER)                   │          │
│  │  - posAccessToken (encrypted)                            │          │
│  │  - posMerchantId, posLocationId                          │          │
│  │  - theme (JSON)                                          │          │
│  │  - syncStatus (IDLE, SYNCING, SUCCESS, ERROR)            │          │
│  └─────────┬───────────────────────────────────────┬────────┘          │
│            │                                       │                    │
│    ┌───────┴────────┐                     ┌───────┴────────┐           │
│    │                │                     │                │           │
│    v                v                     v                v           │
│ ┌──────────┐  ┌───────────┐        ┌───────────┐   ┌─────────────┐    │
│ │ Category │  │   Base    │        │   Order   │   │Subscription │    │
│ └────┬─────┘  └─────┬─────┘        └─────┬─────┘   └──────┬──────┘    │
│      │              │                    │                │           │
│      │ 1:N          │ 1:N                │ 1:N            │ N:1       │
│      v              v                    v                v           │
│ ┌──────────┐  ┌───────────┐        ┌───────────┐  ┌──────────────┐   │
│ │   Base   │  │  Preset   │        │ OrderItem │  │SubscriptionPlan│ │
│ └──────────┘  └─────┬─────┘        └───────────┘  └──────────────┘   │
│                     │                                                  │
│                     │ N:M                                              │
│                     v                                                  │
│              ┌─────────────────┐                                       │
│              │ PresetModifier  │<──────┐                               │
│              └─────────────────┘       │                               │
│                                        │ N:M                           │
│              ┌─────────────────┐       │                               │
│              │    Modifier     │───────┘                               │
│              │ (MILK, SYRUP,   │                                       │
│              │  TOPPING)       │                                       │
│              └─────────────────┘                                       │
│                                                                         │
│  ┌─────────────────┐                                                   │
│  │   SyncHistory   │ - Tracks catalog sync operations                  │
│  └─────────────────┘                                                   │
│                                                                         │
└────────────────────────────────────────────────────────────────────────┘
```

### Core Models

#### User & Business

```prisma
model User {
  id                        String    @id @default(cuid())
  email                     String    @unique
  passwordHash              String
  name                      String?
  emailVerified             Boolean   @default(false)
  emailVerificationToken    String?   @unique
  emailVerificationExpires  DateTime?
  passwordResetToken        String?   @unique
  passwordResetExpires      DateTime?
  businesses                Business[]
  sessions                  Session[]
}

model Business {
  id                String       @id @default(cuid())
  name              String
  slug              String       @unique    // Subdomain identifier
  ownerId           String
  accountState      AccountState @default(ONBOARDING)
  theme             Json?                   // { primaryColor, secondaryColor, logoUrl }

  // POS Connection
  posProvider       POSProvider?
  posAccessToken    String?                 // Encrypted OAuth token
  posRefreshToken   String?                 // Encrypted refresh token
  posMerchantId     String?
  posLocationId     String?

  // Sync Status
  syncStatus        SyncStatus   @default(IDLE)
  lastSyncedAt      DateTime?
  lastSyncError     String?
}
```

#### Catalog Models

```prisma
model Category {
  id           String   @id @default(cuid())
  businessId   String
  name         String
  displayOrder Int      @default(0)
  color        String?                      // Hex color for UI
  icon         String?                      // Icon identifier
  bases        Base[]
  @@unique([businessId, name])
}

model Base {
  id                    String                @id @default(cuid())
  businessId            String
  categoryId            String
  name                  String
  basePrice             Float
  temperatureConstraint TemperatureConstraint @default(BOTH)
  available             Boolean               @default(true)
  visualColor           String?               // For drink visualization
  visualOpacity         Float                 @default(1.0)
  posItemId             String?               // Square catalog ID
  @@unique([businessId, name])
}

model Modifier {
  id                   String       @id @default(cuid())
  businessId           String
  type                 ModifierType // MILK, SYRUP, TOPPING
  name                 String
  price                Float        @default(0)
  available            Boolean      @default(true)
  visualColor          String?
  visualLayerOrder     Int          @default(0)
  visualAnimationType  String?      // "foam", "drizzle", "sparkle"
  posModifierId        String?      // Square modifier ID
  @@unique([businessId, type, name])
}

model Preset {
  id          String    @id @default(cuid())
  businessId  String
  name        String                        // e.g., "Caramel Macchiato"
  baseId      String
  defaultSize CupSize   @default(MEDIUM)
  defaultHot  Boolean   @default(true)
  price       Float
  modifiers   PresetModifier[]
  posItemId   String?
  @@unique([businessId, name])
}
```

#### Order Models

```prisma
model Order {
  id            String      @id @default(cuid())
  businessId    String
  orderNumber   String                      // "A42" - Human readable
  pickupCode    String                      // "7X2K" - Short pickup code
  posOrderId    String?                     // Square order ID
  customerName  String
  customerEmail String?
  customerPhone String?
  status        OrderStatus @default(PENDING)
  subtotal      Float
  tax           Float
  total         Float
  paymentId     String?
  paymentStatus PaymentStatus @default(PENDING)
  items         OrderItem[]
  @@unique([businessId, orderNumber])
  @@index([businessId, pickupCode])
}

model OrderItem {
  id          String  @id @default(cuid())
  orderId     String
  baseId      String
  name        String                        // Snapshot: "Vanilla Oat Latte"
  quantity    Int     @default(1)
  size        String                        // SMALL, MEDIUM, LARGE
  temperature String                        // HOT, ICED
  unitPrice   Float
  totalPrice  Float
  modifiers   String  @default("[]")        // JSON: [{ id, name, price }]
  notes       String?
}
```

#### Subscription Models

```prisma
model SubscriptionPlan {
  id              String          @id @default(cuid())
  squarePlanId    String          @unique
  name            String
  description     String?
  price           Float
  interval        BillingInterval @default(MONTHLY)
  features        String          @default("[]")  // JSON array
  isActive        Boolean         @default(true)
  subscriptions   Subscription[]
}

model Subscription {
  id                    String              @id @default(cuid())
  businessId            String              @unique
  planId                String
  squareSubscriptionId  String?             @unique
  squareCustomerId      String?
  status                SubscriptionStatus  @default(PENDING)
  currentPeriodStart    DateTime?
  currentPeriodEnd      DateTime?
  gracePeriodEnd        DateTime?
}
```

### Key Relationships

| Relationship | Type | Description |
|--------------|------|-------------|
| User -> Business | 1:N | User owns multiple businesses |
| Business -> Category | 1:N | Business has menu categories |
| Category -> Base | 1:N | Category contains drink bases |
| Business -> Modifier | 1:N | Business has available modifiers |
| Base -> Preset | 1:N | Base can be in multiple preset drinks |
| Preset <-> Modifier | N:M | Presets have default modifiers |
| Business -> Order | 1:N | Business receives orders |
| Business -> Subscription | 1:1 | One subscription per business |

---

## Security Architecture

### Authentication (Session-based)

```
┌─────────────────────────────────────────────────────────────────┐
│                    Session Authentication                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. Password Hashing                                             │
│     - bcrypt with cost factor 12                                 │
│     - Unique salt per password                                   │
│                                                                  │
│  2. Session Tokens                                               │
│     - 32-byte cryptographically secure random                    │
│     - Stored in HttpOnly cookies                                 │
│     - 30-day expiration                                          │
│                                                                  │
│  3. Cookie Configuration                                         │
│     {                                                            │
│       httpOnly: true,          // No JS access                   │
│       secure: true,            // HTTPS only (production)        │
│       sameSite: 'lax',         // CSRF protection                │
│       maxAge: 30 * 24 * 60 * 60 * 1000  // 30 days              │
│     }                                                            │
│                                                                  │
│  4. Password Requirements                                        │
│     - Minimum 8 characters                                       │
│     - Uppercase, lowercase, number required                      │
│     - Strength validation before storage                         │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### POS Token Encryption

```typescript
// packages/api/src/utils/encryption.ts

// AES-256-GCM encryption for POS tokens
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

export function encryptToken(token: string, key: string): string {
  // 1. Generate random IV
  const iv = crypto.randomBytes(IV_LENGTH);

  // 2. Create cipher with AES-256-GCM
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  // 3. Encrypt token
  let encrypted = cipher.update(token, 'utf8', 'base64');
  encrypted += cipher.final('base64');

  // 4. Get authentication tag
  const authTag = cipher.getAuthTag();

  // 5. Combine: IV + ciphertext + authTag
  return Buffer.concat([iv, Buffer.from(encrypted, 'base64'), authTag])
    .toString('base64');
}
```

### Webhook Signature Verification

```typescript
// packages/api/src/services/WebhookService.ts

verifySquareSignature(payload: string, signature: string): boolean {
  // 1. Validate signature format
  if (!signature.startsWith('sha256=')) return false;

  // 2. String to sign = notification URL + payload
  const stringToSign = this.config.notificationUrl + payload;

  // 3. Create HMAC with webhook signature key
  const hmac = crypto.createHmac('sha256', this.config.webhookSignatureKey);
  hmac.update(stringToSign);
  const expectedSignature = 'sha256=' + hmac.digest('base64');

  // 4. Timing-safe comparison
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}
```

### Rate Limiting

```typescript
// packages/api/src/middleware/rateLimit.ts

// Authentication endpoints (stricter)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,    // 15 minutes
  max: 5,                       // 5 attempts
  message: 'Too many login attempts'
});

const signupLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,    // 1 hour
  max: 3,                       // 3 accounts
  message: 'Too many signup attempts'
});

const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,    // 1 hour
  max: 3,                       // 3 requests
  message: 'Too many password reset requests'
});

// General API (more lenient)
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,    // 15 minutes
  max: 100,                     // 100 requests
  message: 'Too many requests'
});
```

---

## Integration Points

### Square OAuth Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         Square OAuth 2.0 Flow                            │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  1. Authorization Request                                                │
│     GET /api/pos/oauth/authorize?businessId=xxx                         │
│                                                                          │
│     Response: { authorizationUrl, state }                               │
│                                                                          │
│  2. Redirect to Square                                                   │
│     https://connect.squareup.com/oauth2/authorize?                      │
│       client_id=<app_id>&                                               │
│       scope=MERCHANT_PROFILE_READ+ITEMS_READ+ITEMS_WRITE+               │
│             ORDERS_READ+ORDERS_WRITE+PAYMENTS_READ&                     │
│       state=<businessId>&                                               │
│       session=false                                                      │
│                                                                          │
│  3. User Authorizes on Square                                           │
│                                                                          │
│  4. Callback with Authorization Code                                     │
│     GET /api/pos/oauth/callback?code=xxx&state=<businessId>             │
│                                                                          │
│  5. Token Exchange                                                       │
│     POST https://connect.squareup.com/oauth2/token                      │
│     {                                                                    │
│       client_id, client_secret, code,                                   │
│       grant_type: 'authorization_code'                                  │
│     }                                                                    │
│                                                                          │
│  6. Store Encrypted Tokens                                               │
│     - access_token (encrypted)                                          │
│     - refresh_token (encrypted)                                         │
│     - merchant_id                                                        │
│     - expires_at                                                         │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

**Required Scopes:**
- `MERCHANT_PROFILE_READ` - Read merchant profile
- `ITEMS_READ` - Read catalog items
- `ITEMS_WRITE` - Create/update catalog items
- `ORDERS_READ` - Read orders
- `ORDERS_WRITE` - Create orders
- `PAYMENTS_READ` - Read payment information

### Square Payments SDK (Planned)

```typescript
// Mobile app payment flow (planned for drink-ux-bd1)
interface PaymentFlow {
  // 1. Get payment link from API
  getPaymentLink(orderId: string): Promise<string>;

  // 2. Initialize Square Web Payments SDK
  initializeSquarePayments(applicationId: string, locationId: string);

  // 3. Attach card form
  attachCard(containerId: string);

  // 4. Tokenize card
  tokenizeCard(): Promise<string>;

  // 5. Submit payment to API
  submitPayment(orderId: string, sourceId: string): Promise<PaymentResult>;
}
```

### Square Subscriptions API

```typescript
// Subscription management
interface SubscriptionOperations {
  // Create subscription checkout
  createCheckout(businessId: string, planId: string): Promise<string>;

  // Handle subscription webhook events
  handleWebhook(event: SquareWebhookEvent): Promise<void>;

  // Pause/resume subscription
  pauseSubscription(subscriptionId: string): Promise<void>;
  resumeSubscription(subscriptionId: string): Promise<void>;

  // Cancel subscription
  cancelSubscription(subscriptionId: string, reason?: string): Promise<void>;
}
```

### Webhook Endpoints

| Endpoint | Purpose |
|----------|---------|
| `POST /api/webhooks/square/subscription` | Subscription lifecycle events |
| `POST /api/webhooks/square/payment` | Payment events (planned) |
| `POST /api/webhooks/square/order` | Order status updates (planned) |

---

## Additional Resources

- [Implementation Roadmap](./phases/implementation-roadmap.md)
- [POS Integration Design](./plans/2026-01-10-pos-integration-design.md)
- [POS Adapter Design](./plans/2026-01-13-pos-adapter-design.md)
- [Development Guide](./DEVELOPMENT.md)
- [Mobile Theming](./mobile/THEMING.md)

---

*Last Updated: 2026-01-21*
