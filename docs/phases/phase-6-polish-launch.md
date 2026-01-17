# Phase 6: Polish & Launch

**Status:** BLOCKED (waiting on Phase 5)
**Tasks:** 1 total (0 complete, 1 pending)
**Dependencies:** Phase 5 (Order Submission, Payment, Subscription Gate)

---

## Overview

Phase 6 is the final polish pass before launch. It focuses on comprehensive error handling, edge cases, and ensuring a robust user experience in all scenarios.

---

## Dependency Chain

```
┌─────────────────────────────────────┐
│         Phase 5 Complete            │
│  (Orders + Payment + Subscription)  │
└───────────────────┬─────────────────┘
                    │
                    ▼
        ┌───────────────────────┐
        │  Error Handling &     │
        │    Edge Cases         │
        │   (drink-ux-7ji)      │
        └───────────────────────┘
                    │
                    ▼
        ┌───────────────────────┐
        │     🚀 LAUNCH 🚀      │
        │   Epic Complete:      │
        │   drink-ux-418        │
        └───────────────────────┘
```

---

## Tasks

### drink-ux-7ji: Error Handling and Edge Cases
**Status:** Open
**Labels:** `errors` `polish`
**Depends on:** drink-ux-3ny (Mobile API) ❌, drink-ux-frd (Order Flow) ❌, drink-ux-kbg (Catalog Sync) ❌

**Scope:**

#### Catalog Sync Failures
- Retry logic with exponential backoff
- Clear error messages in admin dashboard
- Auth expiry detection and re-connection prompts
- Partial sync recovery (resume from failure point)

#### Order Submission Failures
- Payment declined → retry option with clear message
- POS unreachable → "Unable to place order, please try again"
- Item unavailable → return to cart with item marked unavailable
- Never leave customer in limbo state

#### POS Downtime Detection
- Health check polling
- "Ordering temporarily unavailable" storefront message
- Business owner notification
- Auto-recovery when POS responds

#### Browser/Network Edge Cases
- Cart persistence across refreshes (localStorage)
- Offline indicator when connection lost
- Queue order locally if connection lost during submit
- Graceful reconnection handling

#### Invalid State Handling
- Old/invalid slug → 404 page
- Shop in `setup_complete` state → "Coming soon" page
- Shop in `ejected` state → "No longer available" page
- Shop in `paused` state → "Temporarily unavailable" page

**Testing:**
- Every error scenario has a test
- Edge cases are explicitly tested
- Graceful degradation verified
- Recovery paths work correctly

**Deliverables:**
- [ ] Error boundary components
- [ ] Retry logic utilities
- [ ] Error message constants
- [ ] Offline detection hook
- [ ] Status pages (404, Coming Soon, Unavailable)
- [ ] Health check endpoints and polling
- [ ] Comprehensive error test suite

**Files to create/modify:**
```
packages/mobile/src/
├── components/
│   ├── ErrorBoundary.tsx       # React error boundary
│   ├── OfflineIndicator.tsx    # Network status display
│   └── StatusPages/
│       ├── NotFound.tsx        # 404
│       ├── ComingSoon.tsx      # setup_complete
│       ├── Unavailable.tsx     # paused/ejected
│       └── Maintenance.tsx     # POS down
├── hooks/
│   ├── useOnlineStatus.ts      # Network detection
│   └── useRetry.ts             # Retry with backoff
├── utils/
│   └── errors.ts               # Error types, messages
packages/admin/src/
├── components/
│   └── SyncStatus/
│       ├── SyncErrors.tsx      # Error display
│       └── RetryButton.tsx     # Manual retry
packages/api/src/
├── routes/
│   └── health.ts               # Health check endpoints
├── middleware/
│   └── errorHandler.ts         # Centralized error handling
├── utils/
│   └── retry.ts                # Retry utilities
```

---

## Error Categories

### User-Facing Errors

| Scenario | User Message | Recovery Action |
|----------|--------------|-----------------|
| Network offline | "You're offline. Please check your connection." | Auto-retry when online |
| POS unreachable | "Unable to place order right now. Please try again." | Retry button |
| Payment declined | "Payment was declined. Please try a different card." | Return to payment form |
| Item unavailable | "Some items in your cart are no longer available." | Show which items, suggest alternatives |
| Invalid slug | "Shop not found." | 404 page |
| Shop paused | "This shop is temporarily unavailable." | Contact info |

### Admin-Facing Errors

| Scenario | Admin Message | Recovery Action |
|----------|---------------|-----------------|
| Sync failed | "Sync failed: [specific error]. Click to retry." | Retry button |
| Auth expired | "Square connection expired. Please reconnect." | Re-OAuth flow |
| Rate limited | "Too many requests. Sync will resume in X minutes." | Auto-retry after cooldown |
| Partial sync | "3 of 10 items synced. Click to continue." | Resume sync |

---

## Completion Criteria

Phase 6 is complete when:
- [ ] All error scenarios have user-friendly messages
- [ ] Retry logic works for transient failures
- [ ] Offline state is detected and communicated
- [ ] Invalid states show appropriate pages
- [ ] POS health is monitored and communicated
- [ ] No scenario leaves users in a "stuck" state
- [ ] Comprehensive test coverage for all edge cases

---

## Completes Epic

When Phase 6 is complete, the epic `drink-ux-418: POS Integration & Source of Truth` is satisfied.

**Epic Checklist:**
- [x] Phase 1: Database Schema
- [ ] Phase 2: Core Infrastructure (Auth, POS Adapter ✓, Shared UI)
- [ ] Phase 3: Admin Core Features
- [ ] Phase 4: Customer Experience
- [ ] Phase 5: Order & Payment
- [ ] Phase 6: Polish & Launch

---

## Post-Launch (Stretch Goals)

After MVP launch, consider:
- AI-assisted menu import decomposition
- Toast and Clover POS adapters
- Dashboard with analytics
- Multi-user business accounts
- Custom domains (`order.joescoffee.com`)
- Customer accounts with order history
- Native mobile apps via Capacitor

---

*Previous: [Phase 5: Order & Payment](./phase-5-order-payment.md)*
*Back to: [Implementation Roadmap](./implementation-roadmap.md)*
