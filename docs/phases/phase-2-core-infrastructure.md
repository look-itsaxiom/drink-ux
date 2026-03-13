# Phase 2: Core Infrastructure

**Status:** IN PROGRESS (1 of 3 tasks complete)
**Tasks:** 3 total (1 complete, 2 pending)
**Dependencies:** Phase 1 (Database Schema)

---

## Overview

Phase 2 builds the core infrastructure that enables all business features. These three tasks can be worked on **in parallel** since they have no dependencies on each other - only on Phase 1.

---

## Parallel Workstreams

```
                    ┌─────────────────────┐
                    │   Phase 1 Complete  │
                    │  (Database Schema)  │
                    └─────────┬───────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
┌───────────────┐    ┌───────────────┐    ┌───────────────┐
│   Auth System │    │  POS Adapter  │    │  Shared UI    │
│  (drink-ux-   │    │  (drink-ux-   │    │  Components   │
│     5ie)      │    │   438) ✓      │    │ (drink-ux-8qi)│
└───────────────┘    └───────────────┘    └───────────────┘
```

---

## Tasks

### drink-ux-438: POS Adapter - Square OAuth, catalog read/write, orders
**Status:** Closed (Completed)
**Labels:** `integration` `pos`
**Depends on:** drink-ux-r5k (Database Schema) ✓

**Scope:**
- POSAdapter interface definition
- SquareAdapter implementation
- OAuth flow (authorization URL, token exchange, token refresh)
- `importCatalog()` - pull existing Square data
- `pushItem()`, `pushModifier()`, `updateItem()` - catalog operations
- MockPOSAdapter for testing
- Token encryption utilities
- POS routes for OAuth callback

**Note:** Order and payment methods are stubbed - implemented in Phase 5.

**Deliverables:**
- [x] POSAdapter interface and types
- [x] SquareAdapter with OAuth and catalog operations
- [x] MockPOSAdapter for testing
- [x] Encryption utilities for token storage
- [x] POS routes (`/api/pos/oauth/*`)
- [x] 123 passing tests

---

### drink-ux-5ie: Auth System - Business owner signup, login, sessions
**Status:** Open
**Labels:** `auth` `foundation`
**Depends on:** drink-ux-r5k (Database Schema) ✓

**Scope:**
- Signup flow (email, password, business name)
- Email verification
- Login with secure session management
- Password reset flow
- HTTP-only cookie sessions
- User model linkage to Business
- Rate limiting for auth endpoints

**Testing:**
- Signup validation (email format, password strength, unique email)
- Login success and failure paths
- Session persistence and expiry
- Password reset token generation and validation
- Rate limiting behavior

**Deliverables:**
- [ ] User model with password hashing
- [ ] Signup endpoint with email verification
- [ ] Login endpoint with session creation
- [ ] Password reset flow
- [ ] Session middleware for protected routes
- [ ] Rate limiting middleware

**Files to create/modify:**
```
packages/api/src/
├── routes/
│   └── auth.ts              # Auth endpoints
├── services/
│   └── AuthService.ts       # Auth business logic
├── middleware/
│   ├── session.ts           # Session handling
│   └── rateLimit.ts         # Rate limiting
└── utils/
    └── password.ts          # Password hashing
```

---

### drink-ux-8qi: Shared UI Components - Move drink builder to shared package
**Status:** Open
**Labels:** `shared` `ui`
**Depends on:** None (can start immediately)

**Scope:**
- Extract from `packages/mobile/src/components/DrinkBuilder/`:
  - DrinkVisualizer
  - LayeredCup
  - CategorySelector
  - TypeSelector
  - ModificationPanel
- Create shared UI package or add to `@drink-ux/shared`
- Ensure both mobile and admin can import components
- Maintain visual consistency across apps

**Testing:**
- Component rendering in isolation
- Prop handling and TypeScript types
- Visual output consistency
- SSR compatibility (for admin)

**Deliverables:**
- [ ] Shared UI package structure
- [ ] Extracted drink builder components
- [ ] Component documentation
- [ ] Import/export configuration for both apps

**Files to create/modify:**
```
packages/shared/src/
├── components/
│   └── DrinkBuilder/
│       ├── DrinkVisualizer.tsx
│       ├── LayeredCup.tsx
│       ├── CategorySelector.tsx
│       ├── TypeSelector.tsx
│       ├── ModificationPanel.tsx
│       └── index.ts
└── index.ts                   # Export components
```

---

## Completion Criteria

Phase 2 is complete when:
- [x] POS Adapter fully implemented with tests
- [ ] Auth system handles signup, login, password reset
- [ ] Shared UI components extracted and importable
- [ ] All three systems have comprehensive test coverage

---

## Unlocks

Completing Phase 2 unlocks all Phase 3 tasks:
- `drink-ux-o23`: Multi-tenancy (needs Auth)
- `drink-ux-kbg`: Catalog Sync Service (needs POS Adapter)
- `drink-ux-9ik`: Admin Menu Builder (needs Auth + Shared UI)
- `drink-ux-jyq`: Admin Account Management (needs Auth)
- `drink-ux-sax`: Admin Ejection Tool (needs Auth + POS Adapter)
- `drink-ux-wy0`: Admin Onboarding Wizard (needs Auth + POS Adapter)

---

*Previous: [Phase 1: Foundation](./phase-1-foundation.md)*
*Next: [Phase 3: Admin Core Features](./phase-3-admin-core-features.md)*
