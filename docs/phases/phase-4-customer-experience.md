# Phase 4: Customer Experience

**Status:** BLOCKED (waiting on Phase 3)
**Tasks:** 2 total (0 complete, 2 pending)
**Dependencies:** Phase 3 (Multi-tenancy, Catalog Sync Service)

---

## Overview

Phase 4 connects the customer-facing mobile app to real data. Both tasks can be worked on **in parallel** once their Phase 3 dependencies are met.

---

## Parallel Workstreams

```
                    ┌─────────────────────────────────────┐
                    │         Phase 3 Complete            │
                    │  (Multi-tenancy + Catalog Sync)     │
                    └───────────────────┬─────────────────┘
                                        │
                    ┌───────────────────┴───────────────────┐
                    │                                       │
                    ▼                                       ▼
            ┌───────────────┐                       ┌───────────────┐
            │Theme Application│                     │Mobile API     │
            │   (drink-ux-6ju)│                     │Integration    │
            │                 │                     │(drink-ux-3ny) │
            └───────────────┘                       └───────────────┘
```

---

## Tasks

### drink-ux-6ju: Theme Application - Dynamic theming from business config
**Status:** Open
**Labels:** `theming` `ui`
**Depends on:** drink-ux-o23 (Multi-tenancy) ❌, drink-ux-r5k (Schema) ✓

**Scope:**
- Fetch business theme from API on mobile load
- Apply colors and logo as CSS variables
- Handle theme loading states (skeleton/spinner)
- Fallback to default theme if fetch fails
- Admin preview of theme changes before save

**Testing:**
- Theme fetch from API
- CSS variable application to DOM
- Fallback behavior on API failure
- Logo rendering and sizing
- Theme preview in admin

**Deliverables:**
- [ ] Theme context/provider in mobile app
- [ ] CSS variable injection system
- [ ] Theme loading skeleton
- [ ] Default theme constants
- [ ] Admin theme preview component

**Files to create/modify:**
```
packages/mobile/src/
├── contexts/
│   └── ThemeContext.tsx        # Theme provider
├── hooks/
│   └── useBusinessTheme.ts     # Theme fetching hook
├── styles/
│   └── theme.ts                # Default theme, CSS var injection
packages/admin/src/
├── components/
│   └── ThemePreview.tsx        # Preview component
```

**Theme Variables:**
```css
:root {
  --color-primary: #...;
  --color-secondary: #...;
  --color-background: #...;
  --color-text: #...;
  --logo-url: url(...);
}
```

---

### drink-ux-3ny: Mobile API Integration - Replace mock data with real API
**Status:** Open
**Labels:** `api` `mobile`
**Depends on:** drink-ux-kbg (Catalog Sync) ❌, drink-ux-o23 (Multi-tenancy) ❌, drink-ux-r5k (Schema) ✓

**Scope:**
- Fetch business config (theme, name) by subdomain
- Load catalog (categories, bases, modifiers, presets) from API
- Submit orders to API (cart → order creation)
- Replace ALL hardcoded mock data
- Handle loading states and errors

**Testing:**
- API calls succeed and fail gracefully
- Loading states display correctly
- Subdomain parsing from hostname
- Theme application from API data
- Catalog rendering from API response

**Deliverables:**
- [ ] API client service
- [ ] Business config fetching
- [ ] Catalog data hooks
- [ ] Order submission service
- [ ] Remove all mock data files

**Files to create/modify:**
```
packages/mobile/src/
├── services/
│   └── api.ts                  # API client
├── hooks/
│   ├── useBusiness.ts          # Business config hook
│   ├── useCatalog.ts           # Catalog data hook
│   └── useOrders.ts            # Order submission hook
├── data/
│   └── [DELETE mock files]     # Remove hardcoded data
```

**API Endpoints Used:**
```
GET  /api/business/:slug        # Business config
GET  /api/catalog/:businessId   # Full catalog
POST /api/orders                # Create order
```

---

## Completion Criteria

Phase 4 is complete when:
- [ ] Mobile app fetches and applies business themes dynamically
- [ ] Mobile app loads catalog data from API (no mock data)
- [ ] Order submission calls real API
- [ ] Loading and error states are handled gracefully
- [ ] App works for any subdomain with valid business

---

## Unlocks

Completing Phase 4 unlocks Phase 5:
- `drink-ux-frd`: Order Submission Flow (needs Mobile API Integration)

---

## Notes

**Parallel with Phase 3:** While waiting for Multi-tenancy and Catalog Sync, developers can:
- Build the API client service structure
- Create loading/error state components
- Design the theme injection system

The actual integration happens once Phase 3 tasks complete.

---

*Previous: [Phase 3: Admin Core Features](./phase-3-admin-core-features.md)*
*Next: [Phase 5: Order & Payment](./phase-5-order-payment.md)*
