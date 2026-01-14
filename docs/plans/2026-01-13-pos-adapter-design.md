# POS Adapter Design

**Date:** 2026-01-13
**Status:** Draft
**Task:** drink-ux-438

## Summary

Implement the POSAdapter interface and SquareAdapter - the building blocks that make POS operations possible. This is the plumbing layer only; business logic that uses these operations lives in other tasks.

## Scope

**In scope:**
- POSAdapter interface definition
- SquareAdapter implementation (Square API integration)
- OAuth flow (authorization URL, token exchange, token refresh)
- `importCatalog()` - pull existing Square data
- `pushItem()`, `pushModifier()`, `updateItem()` - push to Square
- MockPOSAdapter for testing
- Token encryption utilities

**Out of scope (separate tasks):**
- `createOrder()`, `getOrderStatus()` → drink-ux-frd (Order Submission Flow)
- `getPaymentLink()` → drink-ux-bd1 (Payment Integration)
- Onboarding wizard logic → drink-ux-wy0
- Catalog sync service logic → drink-ux-kbg

## Design Decisions

### Mock + Real Adapter
Design for easy switching between mock and real implementations. TDD uses mocked responses; sandbox/production use real Square APIs with same interface.

### Environment-based OAuth Callback
Callback URL configured via environment variable. Works for local development (`localhost:3001`) and production deployment.

### No Automatic Mapping
`importCatalog()` returns raw Square data for display during onboarding. Users create new Drink-UX domain objects informed by what they see. We push fresh to Square - no conversion/mapping logic in the adapter.

---

## File Structure

```
packages/api/src/
├── adapters/
│   └── pos/
│       ├── POSAdapter.ts        # Interface definition
│       ├── SquareAdapter.ts     # Real Square implementation
│       ├── MockPOSAdapter.ts    # Mock for testing
│       ├── index.ts             # Factory: getAdapter(provider)
│       └── __tests__/
│           ├── SquareAdapter.test.ts
│           └── fixtures/
│               ├── square-catalog-response.json
│               └── square-oauth-response.json
├── services/
│   └── POSService.ts            # Business logic layer (uses adapter)
├── routes/
│   └── pos.ts                   # HTTP endpoints for OAuth callback
└── utils/
    └── encryption.ts            # Token encryption utilities
```

---

## POSAdapter Interface

```typescript
interface POSAdapter {
  // OAuth
  getAuthorizationUrl(state: string): string
  exchangeCodeForTokens(code: string): Promise<TokenResult>
  refreshTokens(refreshToken: string): Promise<TokenResult>

  // Catalog read
  importCatalog(): Promise<RawCatalogData>

  // Catalog write
  pushItem(item: CatalogItem): Promise<string>              // returns posItemId
  pushModifier(modifier: CatalogModifier): Promise<string>  // returns posModifierId
  updateItem(posItemId: string, item: CatalogItem): Promise<void>

  // Orders (stubbed - implemented in drink-ux-frd)
  createOrder(order: OrderSubmission): Promise<string>
  getOrderStatus(posOrderId: string): Promise<OrderStatus>

  // Payment (stubbed - implemented in drink-ux-bd1)
  getPaymentLink(orderId: string): Promise<string>
}

interface TokenResult {
  accessToken: string
  refreshToken: string
  expiresAt: Date
  merchantId: string
}

interface RawCatalogData {
  items: RawPOSItem[]
  modifiers: RawPOSModifier[]
  categories: RawPOSCategory[]
}
```

### Changes from Original Design Doc
- Split `connect()` into explicit OAuth methods for clearer responsibility
- Added `refreshTokens()` for handling token expiry
- Stubbed methods throw "not implemented" until their respective tasks

---

## OAuth Flow

```
┌──────────┐     ┌─────────────┐     ┌────────┐
│  Admin   │     │  Drink-UX   │     │ Square │
│ (browser)│     │  API        │     │        │
└────┬─────┘     └──────┬──────┘     └───┬────┘
     │                  │                │
     │ 1. Click "Connect Square"        │
     │─────────────────>│                │
     │                  │                │
     │ 2. Redirect URL  │                │
     │<─────────────────│                │
     │                  │                │
     │ 3. Redirect to Square OAuth      │
     │───────────────────────────────────>
     │                  │                │
     │ 4. User authorizes               │
     │<───────────────────────────────────
     │                  │                │
     │ 5. Callback with code            │
     │─────────────────>│                │
     │                  │                │
     │                  │ 6. Exchange code
     │                  │───────────────>│
     │                  │                │
     │                  │ 7. Tokens      │
     │                  │<───────────────│
     │                  │                │
     │                  │ 8. Encrypt & store
     │                  │                │
     │ 9. Success redirect              │
     │<─────────────────│                │
```

### Token Storage
- Encrypt `accessToken` and `refreshToken` before storing in DB
- Store `expiresAt` to know when to refresh
- `merchantId` and `locationId` stored plain (not sensitive)

### Token Refresh
- Check expiry before each API call
- If expired, call `refreshTokens()` automatically
- If refresh fails, mark connection as needing re-auth

---

## Environment Variables

```
SQUARE_APP_ID=
SQUARE_APP_SECRET=
SQUARE_ENVIRONMENT=sandbox|production
POS_OAUTH_CALLBACK_URL=http://localhost:3001/api/pos/oauth/callback
ENCRYPTION_KEY=
```

---

## Adapter Abstraction

| Layer | Knows about Square? | Knows about our domain? |
|-------|---------------------|------------------------|
| Routes | No | Yes |
| POSService | No | Yes |
| SquareAdapter | Yes | Yes (translates between) |
| ToastAdapter (future) | Toast-specific | Yes (same interface) |

Each adapter translates between POS-specific formats and our domain types. Future POS providers implement the same interface.

---

## Testing Strategy

Unit tests with mocked HTTP responses:

- OAuth URL generation with correct scopes/params
- Token exchange parses Square response correctly
- Token refresh handles success and failure
- `importCatalog()` parses Square catalog format
- `pushItem()` transforms our model → Square format
- `updateItem()` sends correct payload
- Error handling: rate limits (429), auth expiry (401), network failures

No integration tests in this task - those come when building services that use the adapter.

---

## Implementation Sequence

1. Set up file structure and environment config
2. Implement encryption utilities
3. Define POSAdapter interface and types
4. Implement MockPOSAdapter (for TDD)
5. Implement SquareAdapter OAuth methods (with tests)
6. Implement `importCatalog()` (with tests)
7. Implement `pushItem()`, `pushModifier()`, `updateItem()` (with tests)
8. Add stubs for deferred methods
9. Create POS routes for OAuth callback
10. Create POSService wrapper

---

## Deferred Work

Tasks to create for out-of-scope methods:

- **getPaymentLink()** → Link to drink-ux-bd1 (Payment Integration)
- Order methods already covered by drink-ux-frd (Order Submission Flow)
