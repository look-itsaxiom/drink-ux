# Milestone Definitions

**Created:** 2026-01-29
**Purpose:** Define clear criteria for "Demo-Ready" and "Business-Ready" milestones

---

## Context

Drink-UX is a SaaS platform for coffee shops. The value proposition, in priority order:

1. **Easy onboarding** - Connect Square, AI transforms menu, done
2. **Great mobile ordering** - Customers build drinks visually, orders flow to POS
3. **Intuitive admin control** - Shop owners manage catalog without friction

Revenue model: Monthly SaaS subscription (target ~$49/mo per shop)

---

## Current State (as of 2026-01-29)

Core features are implemented and code-complete:

| Feature | Status | Notes |
|---------|--------|-------|
| Onboarding wizard | ✅ Done | 4-step flow, real OAuth, AI transformation |
| Square OAuth | ✅ Done | Token exchange, encryption, storage |
| AI catalog transform | ✅ Done | Claude/OpenAI/Ollama with rule-based fallback |
| Mobile catalog fetch | ✅ Done | Real API integration |
| Mobile order submission | ✅ Done | Orders POST to API |
| Admin catalog CRUD | ✅ Done | Full create/edit/delete |
| Payment processing | ⚠️ Partial | PaymentService done, `getPaymentLink()` stubbed |
| Subscription billing | ⚠️ Partial | Service done, mobile integration incomplete |

**Not yet verified:** End-to-end flow against Square sandbox has never been tested.

---

## Milestone 1: Demo-Ready

**Goal:** Show a potential coffee shop owner the full flow working against Square sandbox.

**Demo script:**
1. Owner connects their Square sandbox account
2. AI transforms their test menu into drink-ux format
3. Owner reviews and tweaks the catalog in admin
4. Customer builds a drink on mobile
5. Order appears in Square sandbox dashboard

### Acceptance Criteria

- [ ] Square sandbox app credentials configured
- [ ] PostgreSQL database running with migrations applied
- [ ] Hardcoded `temp-business-id` bug fixed (drink-ux-1he)
- [ ] Full E2E flow tested manually (drink-ux-tga)
- [ ] All blocking bugs found during E2E are fixed
- [ ] Demo catalog/business exists for repeatable demos
- [ ] 13 failing API tests fixed (drink-ux-6yx) - ensures stability

### Out of Scope for Demo-Ready

- Customer payment (they don't pay for drinks in demo)
- Shop owner subscription (you're not charging them yet)
- Production Square environment
- Multi-location support
- Analytics/reporting

### Tracked Issues

| Issue | Description | Priority |
|-------|-------------|----------|
| drink-ux-1he | Fix hardcoded temp-business-id | P1 (blocker) |
| drink-ux-6yx | Fix 13 failing API tests | P2 |
| drink-ux-tga | E2E manual testing against Square sandbox | P1 |
| NEW | Square sandbox setup + demo business | P1 |

---

## Milestone 2: Business-Ready

**Goal:** Coffee shops can use this in production and you can charge them for it.

**What "Business-Ready" means:**
- Real customers can place and pay for orders
- Shop owners can subscribe and pay monthly
- System works reliably in production Square environment
- Basic operational visibility for shop owners

### Acceptance Criteria

- [ ] All Demo-Ready criteria met
- [ ] `getPaymentLink()` implemented - customers can pay for orders
- [ ] Subscription flow complete - shops can subscribe/manage billing
- [ ] Production Square environment supported (not just sandbox)
- [ ] Multi-tenant isolation verified (subdomain routing tested)
- [ ] Error handling covers common failure modes gracefully
- [ ] Basic dashboard shows order volume/revenue for shop owners
- [ ] Terms of Service and Privacy Policy pages exist
- [ ] Business entity registered (LLC/etc)

### Out of Scope for Business-Ready (v1)

- Multi-location support
- Customer loyalty programs
- Advanced analytics
- Native mobile apps (PWA is sufficient)
- Email marketing integration

### Tracked Issues

| Issue | Description | Priority |
|-------|-------------|----------|
| NEW | Implement getPaymentLink() for customer payments | P1 |
| NEW | Complete subscription flow integration | P1 |
| NEW | Production Square environment support | P2 |
| NEW | Basic dashboard analytics (order count, revenue) | P2 |
| NEW | Terms of Service / Privacy Policy pages | P2 |
| drink-ux-u22 | Contract tests for API alignment | P3 |
| drink-ux-bhc | Playwright E2E testing | P3 |

---

## Milestone Sequence

```
Current State
     │
     ▼
┌─────────────────┐
│  Demo-Ready     │  ← Fix bugs, test E2E, create demo setup
│  (show it works)│
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Business-Ready  │  ← Payment, subscriptions, production env
│ (charge for it) │
└────────┬────────┘
         │
         ▼
    🚀 Launch
```

---

## Next Actions

1. **Triage open issues** - Update with acceptance criteria, assign to milestones
2. **Create missing issues** - Square setup, payment link, subscription integration
3. **Retire stale docs** - Mark implementation-roadmap.md as superseded
4. **Execute Demo-Ready** - Fix bugs, run E2E, iterate until clean
