# Phase 3: Admin Core Features

**Status:** BLOCKED (waiting on Phase 2)
**Tasks:** 6 total (0 complete, 6 pending)
**Dependencies:** Phase 2 (Auth System, POS Adapter, Shared UI)

---

## Overview

Phase 3 builds out the admin dashboard features that business owners use to manage their menus and accounts. All six tasks can be worked on **in parallel** once their Phase 2 dependencies are met.

---

## Parallel Workstreams

```
                    ┌─────────────────────────────────────┐
                    │         Phase 2 Complete            │
                    │  (Auth + POS Adapter + Shared UI)   │
                    └───────────────────┬─────────────────┘
                                        │
    ┌───────────┬───────────┬───────────┼───────────┬───────────┬───────────┐
    │           │           │           │           │           │           │
    ▼           ▼           ▼           ▼           ▼           ▼           ▼
┌───────┐  ┌───────┐  ┌───────┐  ┌───────┐  ┌───────┐  ┌───────┐
│Multi- │  │Catalog│  │ Menu  │  │Account│  │Ejection│ │Onboard│
│tenancy│  │ Sync  │  │Builder│  │ Mgmt  │  │ Tool  │  │Wizard │
│ (o23) │  │ (kbg) │  │ (9ik) │  │ (jyq) │  │ (sax) │  │ (wy0) │
└───────┘  └───────┘  └───────┘  └───────┘  └───────┘  └───────┘
```

---

## Tasks

### drink-ux-o23: Multi-tenancy - Subdomain routing and tenant isolation
**Status:** Open
**Labels:** `infrastructure` `multitenancy`
**Depends on:** drink-ux-5ie (Auth) ❌, drink-ux-r5k (Schema) ✓

**Scope:**
- Wildcard subdomain routing (`*.drink-ux.com`)
- Tenant extraction from request hostname
- Business config lookup by slug
- API tenant validation on all requests
- Mobile app fetches config based on subdomain

**Testing:**
- Subdomain parsing (valid, invalid, edge cases)
- Tenant isolation verification
- Invalid slug handling (404 responses)
- API authorization per tenant

**Deliverables:**
- [ ] Subdomain middleware
- [ ] Tenant context in request
- [ ] Business lookup by slug endpoint
- [ ] Vercel/DNS configuration docs

**Files to create/modify:**
```
packages/api/src/
├── middleware/
│   └── tenant.ts            # Extract tenant from subdomain
├── routes/
│   └── business.ts          # Business config by slug
└── utils/
    └── subdomain.ts         # Subdomain parsing utilities
```

---

### drink-ux-kbg: Catalog Sync Service - On-demand publish to POS
**Status:** Open
**Labels:** `pos` `sync`
**Depends on:** drink-ux-438 (POS Adapter) ✓, drink-ux-r5k (Schema) ✓

**Can start immediately** - all dependencies are met!

**Scope:**
- Compare local catalog to last-known POS state
- Push new items via `adapter.pushItem()`
- Update changed items via `adapter.updateItem()`
- Mark deleted items inactive (non-destructive)
- Store posItemId/posModifierId mappings
- Track lastSyncedAt timestamp
- Admin UI: pending changes count, sync status, error messages

**Testing:**
- Diff calculation (new, updated, deleted items)
- Create/update/deactivate flows
- Error recovery and retry logic
- Partial sync handling
- Conflict resolution (Drink-UX wins)

**Deliverables:**
- [ ] CatalogSyncService
- [ ] Sync diff calculation logic
- [ ] Sync status tracking in database
- [ ] Admin API endpoints for sync status and trigger

**Files to create/modify:**
```
packages/api/src/
├── services/
│   └── CatalogSyncService.ts    # Sync business logic
├── routes/
│   └── catalog.ts               # Sync endpoints
└── utils/
    └── catalogDiff.ts           # Diff calculation
```

---

### drink-ux-9ik: Admin Menu Builder - Add/edit items via drink builder UI
**Status:** Open
**Labels:** `admin` `menu`
**Depends on:** drink-ux-5ie (Auth) ❌, drink-ux-8qi (Shared UI) ❌, drink-ux-r5k (Schema) ✓

**Scope:**
- Add item: Build drink in shared builder → Name → Price → Save
- Edit item: Open in builder → Adjust → Save
- Delete/deactivate items
- Category management (create, reorder, delete)
- Ingredients manager (bases, modifiers with availability and pricing)

**Testing:**
- CRUD operations for items, categories, ingredients
- Validation rules (required fields, price format)
- Optimistic UI updates
- Error handling for failed saves

**Deliverables:**
- [ ] Menu Builder page in admin
- [ ] Category management UI
- [ ] Ingredients manager UI
- [ ] CRUD API endpoints for catalog entities

**Files to create/modify:**
```
packages/admin/src/
├── pages/
│   ├── MenuBuilder.tsx         # Main menu builder page
│   ├── Categories.tsx          # Category management
│   └── Ingredients.tsx         # Ingredients manager
├── components/
│   └── ItemEditor/             # Item create/edit modal
packages/api/src/
├── routes/
│   └── catalog.ts              # CRUD endpoints
```

---

### drink-ux-jyq: Admin Account Management - Profile, settings, billing
**Status:** Open
**Labels:** `account` `admin`
**Depends on:** drink-ux-5ie (Auth) ❌

**Scope:**
- Business profile page (name, slug, contact info)
- Branding settings (theme colors, logo upload)
- POS connection status and re-sync option
- Subscription/billing management (link to Square)

**Testing:**
- Profile update validation
- Logo upload (file type, size limits)
- Theme preview
- Slug uniqueness validation

**Deliverables:**
- [ ] Account settings page
- [ ] Business profile form
- [ ] Branding/theme editor
- [ ] Logo upload functionality
- [ ] POS connection status display

**Files to create/modify:**
```
packages/admin/src/
├── pages/
│   ├── Account.tsx             # Main account page
│   ├── Profile.tsx             # Business profile
│   └── Branding.tsx            # Theme/logo settings
packages/api/src/
├── routes/
│   └── business.ts             # Profile update endpoints
└── services/
    └── FileUploadService.ts    # Logo upload handling
```

---

### drink-ux-sax: Admin Ejection Tool - Disconnect from Drink-UX
**Status:** Open
**Labels:** `admin` `ejection`
**Depends on:** drink-ux-438 (POS Adapter) ✓, drink-ux-5ie (Auth) ❌

**Scope:**
- Prominent "Disconnect" option in settings
- Confirmation flow explaining consequences
- Set account state to `ejected`
- Disable storefront
- Option to "Start Over" (re-run onboarding)
- Preserve data for potential return

**Testing:**
- Ejection flow completion
- State transition (`active` → `ejected`)
- Storefront disable verification
- Data preservation verification
- Re-onboarding flow

**Deliverables:**
- [ ] Ejection confirmation modal
- [ ] Ejection API endpoint
- [ ] Storefront disable logic
- [ ] "Start Over" flow

**Files to create/modify:**
```
packages/admin/src/
├── components/
│   └── EjectionModal.tsx       # Confirmation dialog
├── pages/
│   └── Settings.tsx            # Settings with disconnect option
packages/api/src/
├── routes/
│   └── business.ts             # Ejection endpoint
```

---

### drink-ux-wy0: Admin Onboarding Wizard
**Status:** Open
**Labels:** `admin` `onboarding`
**Depends on:** drink-ux-438 (POS Adapter) ✓, drink-ux-5ie (Auth) ❌

**Scope:**
- Step 1: POS OAuth connection (Square)
- Step 2: Path selection (Import/Template/Fresh)
- Step 3: Catalog setup per chosen path
- Step 4: Branding and theme configuration
- Step 5: Review and sync preview
- Handle account states (`onboarding` → `setup_complete`)

**Testing:**
- Wizard navigation (forward, back, skip logic)
- Path branching based on selection
- Validation at each step
- State persistence across browser refreshes
- OAuth callback handling

**Deliverables:**
- [ ] Onboarding wizard component
- [ ] Step-by-step flow UI
- [ ] Path selection logic
- [ ] Template catalog data
- [ ] Onboarding API endpoints

**Files to create/modify:**
```
packages/admin/src/
├── pages/
│   └── Onboarding/
│       ├── index.tsx           # Wizard container
│       ├── Step1Connect.tsx    # POS OAuth
│       ├── Step2Path.tsx       # Path selection
│       ├── Step3Catalog.tsx    # Catalog setup
│       ├── Step4Branding.tsx   # Theme/logo
│       └── Step5Review.tsx     # Final review
packages/api/src/
├── routes/
│   └── onboarding.ts           # Onboarding endpoints
└── data/
    └── templateCatalog.ts      # Template catalog data
```

---

## Completion Criteria

Phase 3 is complete when:
- [ ] Multi-tenancy routing works for all subdomains
- [ ] Catalog can sync to POS on demand
- [ ] Business owners can manage menus via drink builder UI
- [ ] Account management allows profile, branding, and settings changes
- [ ] Ejection tool safely disconnects businesses
- [ ] Onboarding wizard guides new businesses through setup

---

## Unlocks

Completing Phase 3 unlocks Phase 4 tasks:
- `drink-ux-6ju`: Theme Application (needs Multi-tenancy)
- `drink-ux-3ny`: Mobile API Integration (needs Multi-tenancy + Catalog Sync)

---

## Notes

**Quick Win:** `drink-ux-kbg` (Catalog Sync Service) can start immediately since POS Adapter is complete. This unblocks Phase 4 faster.

---

*Previous: [Phase 2: Core Infrastructure](./phase-2-core-infrastructure.md)*
*Next: [Phase 4: Customer Experience](./phase-4-customer-experience.md)*
