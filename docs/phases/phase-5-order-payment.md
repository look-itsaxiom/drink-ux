# Phase 5: Order & Payment

**Status:** BLOCKED (waiting on Phase 4)
**Tasks:** 3 total (0 complete, 3 pending)
**Dependencies:** Phase 4 (Mobile API Integration)

---

## Overview

Phase 5 implements the full order flow from customer cart to POS, including payment handling and subscription gating. These tasks have **sequential dependencies** - they must be completed in order.

---

## Sequential Dependency Chain

```
┌─────────────────────────────────────┐
│         Phase 4 Complete            │
│   (Mobile API Integration)          │
└───────────────────┬─────────────────┘
                    │
                    ▼
        ┌───────────────────┐
        │  Order Submission │
        │    (drink-ux-frd) │
        └─────────┬─────────┘
                  │
                  ▼
        ┌───────────────────┐
        │Payment Integration│
        │   (drink-ux-bd1)  │
        └─────────┬─────────┘
                  │
                  ▼
        ┌───────────────────┐
        │ Subscription Gate │
        │   (drink-ux-58i)  │
        └───────────────────┘
```

---

## Tasks

### drink-ux-frd: Order Submission Flow - Customer to POS
**Status:** Open
**Labels:** `mobile` `orders`
**Depends on:** drink-ux-3ny (Mobile API Integration) ❌, drink-ux-438 (POS Adapter) ✓

**Scope:**
- Customer builds drink → Add to cart (localStorage)
- Cart management (add, remove, update quantity)
- Checkout form (name, phone/email for identification)
- Submit order to API
- API creates order in POS via adapter
- Return confirmation with pickup code
- Poll order status from POS
- Display status updates to customer

**Testing:**
- Cart persistence in localStorage
- Order creation validation
- POS submission success and failure
- Status polling and updates
- Payment handoff flow
- Error scenarios (POS down, payment failed, item unavailable)

**Deliverables:**
- [ ] Cart context/state management
- [ ] Cart UI (view, edit, checkout)
- [ ] Checkout form component
- [ ] Order confirmation page
- [ ] Order status polling
- [ ] Order API endpoints (create, status)

**Files to create/modify:**
```
packages/mobile/src/
├── contexts/
│   └── CartContext.tsx         # Cart state management
├── components/
│   ├── Cart/
│   │   ├── CartDrawer.tsx      # Cart sidebar/drawer
│   │   ├── CartItem.tsx        # Individual cart item
│   │   └── CartSummary.tsx     # Totals and checkout button
│   └── Checkout/
│       ├── CheckoutForm.tsx    # Name, contact info
│       └── OrderConfirmation.tsx
├── pages/
│   └── OrderStatus.tsx         # Status polling display
packages/api/src/
├── routes/
│   └── orders.ts               # Order CRUD endpoints
├── services/
│   └── OrderService.ts         # Order business logic
```

**Order Flow:**
```
1. Build drink → Add to cart → Review cart
2. Enter checkout info (name, contact)
3. Submit order to API
4. API resolves drink to POS items
5. API calls POSAdapter.createOrder()
6. Return order ID + pickup code
7. Poll for status updates
8. Display "Ready for pickup" when complete
```

---

### drink-ux-bd1: Payment Integration - Square Web Payments SDK
**Status:** Open
**Labels:** `integration` `payment`
**Depends on:** drink-ux-438 (POS Adapter) ✓, drink-ux-frd (Order Submission) ❌

**Scope:**
- Integrate Square Web Payments SDK
- Card info goes directly to Square (never touches Drink-UX servers)
- Handle payment confirmation callbacks
- Update order status after payment
- Link payment to POS order

**Security:** Card data is tokenized by Square's SDK and sent directly to Square. Drink-UX servers never see card numbers.

**Testing:**
- Payment initiation with Square SDK
- Success callback handling
- Failure callback handling
- Order status update after payment
- Declined card scenarios
- Timeout handling

**Deliverables:**
- [ ] Square Web Payments SDK integration
- [ ] Payment form component
- [ ] Payment callback handlers
- [ ] Order status update on payment
- [ ] POSAdapter.getPaymentLink() implementation

**Files to create/modify:**
```
packages/mobile/src/
├── components/
│   └── Payment/
│       ├── PaymentForm.tsx     # Square SDK form
│       └── PaymentStatus.tsx   # Processing/success/failure
├── services/
│   └── payment.ts              # Square SDK initialization
packages/api/src/
├── adapters/pos/
│   └── SquareAdapter.ts        # Add getPaymentLink()
├── routes/
│   └── payments.ts             # Payment webhooks
```

**Payment Flow:**
```
1. Customer clicks "Pay"
2. Square Web Payments SDK loads
3. Customer enters card info (in Square iframe)
4. SDK tokenizes card → sends to Square
5. Square processes payment
6. Callback to Drink-UX with result
7. Update order status
8. Show confirmation
```

---

### drink-ux-58i: Subscription Gate - Square billing and account states
**Status:** Open
**Labels:** `billing` `subscription`
**Depends on:** drink-ux-5ie (Auth) ❌, drink-ux-bd1 (Payment Integration) ❌

**Scope:**
- Square Subscriptions API integration
- Subscription plans configuration
- Subscription checkout flow for business owners
- Webhook handling for subscription status changes
- Gate live storefront behind active subscription
- Handle account state transitions
- Show "Coming Soon" for non-subscribed businesses

**Account State Transitions:**
```
setup_complete → (subscribe) → active
active → (subscription lapses) → paused
paused → (resubscribe) → active
any → (eject) → ejected
```

**Testing:**
- Subscription creation flow
- Webhook processing (subscription created, updated, cancelled)
- State transitions
- Storefront gating verification
- Grace period handling

**Deliverables:**
- [ ] Subscription plans in database
- [ ] Subscription checkout UI (admin)
- [ ] Square Subscriptions API integration
- [ ] Webhook endpoint for subscription events
- [ ] Storefront gating middleware
- [ ] "Coming Soon" page for non-subscribed

**Files to create/modify:**
```
packages/admin/src/
├── pages/
│   └── Subscription.tsx        # Plan selection, checkout
├── components/
│   └── SubscriptionStatus.tsx  # Current status display
packages/api/src/
├── routes/
│   └── subscriptions.ts        # Checkout, webhooks
├── services/
│   └── SubscriptionService.ts  # Business logic
├── middleware/
│   └── subscriptionGate.ts     # Require active subscription
packages/mobile/src/
├── pages/
│   └── ComingSoon.tsx          # Non-subscribed storefront
```

---

## Completion Criteria

Phase 5 is complete when:
- [ ] Customers can build drinks, add to cart, and checkout
- [ ] Orders are submitted to POS and confirmed
- [ ] Payment is processed via Square Web Payments SDK
- [ ] Business owners can subscribe via Square
- [ ] Non-subscribed businesses show "Coming Soon"
- [ ] Account states transition correctly based on subscription

---

## Unlocks

Completing Phase 5 unlocks Phase 6:
- `drink-ux-7ji`: Error Handling and Edge Cases

---

## Notes

**Critical Path:** This phase is on the critical path to launch. Order flow and payment must work reliably before going live.

**Security Considerations:**
- Never log or store card data
- Use Square's PCI-compliant SDK
- Validate webhook signatures
- Rate limit payment attempts

---

*Previous: [Phase 4: Customer Experience](./phase-4-customer-experience.md)*
*Next: [Phase 6: Polish & Launch](./phase-6-polish-launch.md)*
