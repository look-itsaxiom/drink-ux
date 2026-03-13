# Testing Audit Report
**Generated:** 2026-03-13
**Task:** SKI-58 — Audit existing test coverage and identify gaps
**Author:** QAEngineer-Claude (agent f616dc96)

---

## Summary

The Drink-UX API package has strong test coverage (93-100% across routes/services/adapters/utilities) with **1399 passing tests** across 49 test suites. However, two critical files have **zero test coverage**, and the entire admin package has no tests.

---

## Coverage by Package

| Package | Test Files | Coverage Level |
|---------|-----------|---------------|
| `packages/api` | 49 test files | ~93-94% of routes/services |
| `packages/mobile` | 26 test files | Good — services, components, hooks |
| `packages/admin` | **0 test files** | ❌ COMPLETE GAP |

---

## API Package — Route Coverage

| Route File | Tests | Status |
|-----------|-------|--------|
| auth.ts | 48 | ✅ |
| catalog.ts | 81 | ✅ |
| catalog-mapped.ts | 12 | ✅ |
| catalogSync.ts | 35 | ✅ |
| onboarding.ts | 43 | ✅ |
| orders.ts | 39 | ✅ |
| pos.ts | 15 | ✅ |
| business.ts | 33 | ✅ |
| account.ts | 50 | ✅ |
| ejection.ts | 46 | ✅ |
| subscription.ts | 46 | ✅ |
| subscriptionWebhooks.ts | 35 | ✅ |
| health.ts | 20 | ✅ |
| mappings.ts | 33 | ✅ |
| **payments.ts** | **0** | ❌ **CRITICAL GAP** |

---

## API Package — Service Coverage

| Service File | Tests | Status |
|-------------|-------|--------|
| AuthService.ts | 63 | ✅ |
| AccountService.ts | 61 | ✅ |
| AccountStateService.ts | 78 | ✅ |
| CatalogService.ts | 127 | ✅ |
| CatalogSyncService.ts | 46 | ✅ |
| EjectionService.test.ts | 60 | ✅ |
| FileUploadService.ts | 32 | ✅ |
| HealthCheckService.ts | 28 | ✅ |
| ItemMappingService.ts | 26 | ✅ |
| MappedCatalogService.ts | 27 | ✅ |
| OnboardingService.ts | 88 | ✅ |
| OrderService.ts | 54 | ✅ |
| PaymentService.ts | 32 | ✅ |
| SubscriptionService.ts | 55 | ✅ |
| SubscriptionExpiryService.ts | 10 | ✅ |
| WebhookService.ts | 43 | ✅ |
| **CatalogTransformService.ts** | **0** | ❌ **CRITICAL GAP** |

---

## API Package — Other Coverage

| Area | Files Tested | Status |
|------|-------------|--------|
| POS Adapters | MockPOSAdapter, SquareAdapter (OAuth, catalog, push), POSAdapter | ✅ 100% |
| Middleware | errorHandler, rateLimit, session, subscriptionGate, tenant | ✅ 100% |
| Utilities | catalogDiff, encryption, errors, password, subdomain | ✅ 100% |
| E2E (Square sandbox) | e2e-square-sandbox.test.ts (15 tests) | ✅ New in SKI-5 |

---

## Top 10 Highest-Risk Untested Code Paths

| Priority | File | LOC | Why High Risk |
|----------|------|-----|--------------|
| 🔴 CRITICAL | `packages/api/src/routes/payments.ts` | 271 | Direct financial transactions, Square payment API calls, order status mutations, token decryption — zero tests |
| 🔴 CRITICAL | `packages/api/src/services/CatalogTransformService.ts` | 595 | Complex AI orchestration across 5 providers (Anthropic, OpenAI, Ollama, Custom, rule-based); multi-provider failover chain untested |
| 🟠 HIGH | `packages/admin/src/` (entire package) | ~1000+ | Complete absence of test coverage for admin dashboard (menu management, POS config, onboarding wizard UI) |
| 🟠 HIGH | Payment end-to-end flow | — | PaymentService.ts has 32 unit tests but payments.ts (the route) has none; integration gap between the two |
| 🟡 MEDIUM | `CatalogTransformService` fallback logic | — | If Anthropic API fails, does OpenAI fallback work? Does rule-based fallback produce usable results? Untestable without tests. |
| 🟡 MEDIUM | `OnboardingService.importFromPOS` (variation ID) | — | Fixed in SKI-5 (added posVariationId storage), but test coverage of the fix only exists in E2E tests, not unit tests |
| 🟡 MEDIUM | Admin onboarding wizard flow | — | New feature (SKI-79); no UI tests, no E2E coverage of the admin-side wizard steps |
| 🟡 MEDIUM | Subscription webhook processing | 35 tests | Tests exist but focus on mock payloads; real Square webhook signature verification untested end-to-end |
| 🟢 LOW | Mobile cart → checkout flow | — | Unit tests exist for useCart and Checkout components separately, but no E2E test of the combined flow |
| 🟢 LOW | `CatalogService` size | 127 tests | Most-tested service; 127 tests for 1019 LOC means complex edge cases likely still exist |

---

## E2E Test Coverage (New — SKI-5)

Added `packages/api/src/routes/__tests__/e2e-square-sandbox.test.ts` with 15 tests covering the full Square sandbox flow:

| Flow Step | Test | Result |
|-----------|------|--------|
| Square catalog import (SquareAdapter) | `importCatalog returns valid structure` | ✅ 7 categories, 22 items, 23 modifiers |
| Location discovery | `getLocations returns at least one location` | ✅ `Default Test Account (L78VEYZTWPZGP)` |
| HTTP catalog import endpoint | `POST /api/pos/import-catalog` | ✅ 200 OK |
| ItemMapping persistence | `ItemMapping records are persisted` | ✅ DB writes verified |
| Mapped catalog service | `MappedCatalogService.getCatalog` | ✅ Returns bases/modifiers structure |
| Mapped catalog endpoint | `GET /api/catalog/:id/mapped` | ✅ 200 OK |
| Direct order submission | `SquareAdapter.createOrder` | ✅ Square order ID returned |
| Full pipeline order | `OrderService.createOrder` | ✅ posOrderId persisted to DB |
| Error: no credentials | `NO_POS_CREDENTIALS` | ✅ 424 response |
| Error: unknown business | `BUSINESS_NOT_FOUND` | ✅ 404 response |

### Bug Found and Fixed

**Bug:** `Base.posItemId` stored the Square catalog ITEM ID, but Square's Orders API requires a VARIATION ID as `catalog_object_id` for line items.

**Symptom:** `OrderService.createOrder` silently failed to submit to Square (logged `"Item variation with catalog object ID ... not found"`), leaving `posOrderId: null` in DB.

**Fix (commit `218110c`):**
- Added `posVariationId String?` to `Base` model in schema
- `OnboardingService.importFromPOS` now stores `item.variations[0].id` as `posVariationId`
- `OrderService.submitToPOS` passes `posVariationId` as `variationId` in `OrderSubmission`

---

## Prioritized Recommendations

### Immediate (blocks demo/production)

1. **Add tests for `payments.ts` route** — This is the highest-risk gap: financial transactions with no test coverage. Minimum: payment success, payment failure, auth error, order not found, already paid.

2. **Add tests for `CatalogTransformService.ts`** — The AI fallback chain is complex and the business depends on it working correctly during onboarding. Test: each provider path, failover sequence, response parsing, rule-based fallback.

### High Priority

3. **Add admin package tests** — At minimum, test the key admin components that are being actively developed (MenuManagement, OnboardingWizard, OrderManagement). Consider adding a Vitest setup matching the mobile package.

4. **Add `posVariationId` to OnboardingService unit tests** — The fix in SKI-5 only has E2E coverage; add a unit test that verifies `posVariationId` is populated during catalog import.

### Ongoing

5. **Target 80% line coverage minimum** across all packages, 90% for payment-related code.

6. **Add mobile E2E tests** (Playwright) for the customer ordering flow: catalog browse → drink builder → cart → checkout → order confirmation.

---

## Notes on Test Architecture

- **Database:** Tests use embedded PostgreSQL on port 54329 (`drinkux_test` database). Jest setup in `jest.setup.js` overrides `DATABASE_URL` to use PostgreSQL.
- **POS mocking:** Unit tests use `MockPOSAdapter`; E2E tests use real `SquareAdapter` with sandbox credentials.
- **E2E guard:** `e2e-square-sandbox.test.ts` skips live Square tests when `SQUARE_ACCESS_TOKEN` is absent, so CI remains green without sandbox credentials.
- **Cleanup:** E2E tests create and destroy test businesses within each suite's `beforeAll`/`afterAll`.
