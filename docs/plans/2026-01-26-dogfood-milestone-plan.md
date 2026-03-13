# Dogfood Milestone Plan

**Goal:** Get drink-ux to a state where it can be tested end-to-end against Square sandbox environments.

**Priority Order:** Onboarding → Admin → Ordering

---

## Phase 1: Onboarding Flow

Enable a business owner to connect their Square sandbox and have their menu transformed into drink-ux format.

### 1.1 Onboarding UI Shell
Create a simple multi-step wizard interface for the onboarding flow.

**Screens:**
- Step 1: Business profile (name, slug, contact email)
- Step 2: Connect POS (Square OAuth initiation)
- Step 3: Import & Transform (AI-assisted catalog conversion)
- Step 4: Confirmation (summary, proceed to admin)

**Tech:** Add to `@drink-ux/admin` package (owner-facing, not customer-facing)

**Backend:** Routes exist in `OnboardingService`, may need adjustment

### 1.2 Square OAuth Flow
Connect the onboarding UI to Square's OAuth sandbox.

**Flow:**
1. Owner clicks "Connect Square"
2. Redirect to Square authorization page
3. Square redirects back with auth code
4. Backend exchanges code for tokens
5. Store encrypted tokens, mark POS connected

**Backend:** `SquareAdapter` has OAuth methods, need to verify they work with sandbox

**Config needed:** Square sandbox app credentials in `.env`

### 1.3 Catalog Import
Pull the raw menu data from Square after OAuth completes.

**Flow:**
1. Call Square Catalog API
2. Retrieve items, modifiers, categories
3. Store raw data temporarily for transformation step

**Backend:** `CatalogSyncService.importCatalog()` exists

### 1.4 AI Catalog Transformation (Interactive)
Use AI to decompose traditional menu items into drink-ux's property-based model.

**Flow:**
1. Send raw catalog to AI with transformation prompt
2. AI returns suggested structure:
   - Categories (Coffee, Tea, etc.)
   - Bases (Espresso, Chai, etc.) with properties
   - Modifiers (milks, syrups, toppings) with types
3. Display suggestions in UI for owner review
4. Owner can approve, edit, or reject suggestions
5. Confirmed structure saved to database

**New work:**
- AI integration (likely Claude API)
- Transformation prompt engineering
- Review/edit UI component
- Save confirmed catalog to Prisma models

**Input example:**
```json
{
  "items": [
    {"name": "Vanilla Latte", "price": 550, "modifiers": ["Oat Milk +$0.75"]},
    {"name": "Caramel Macchiato", "price": 600}
  ]
}
```

**Output example:**
```json
{
  "categories": [{"name": "Coffee", "icon": "coffee"}],
  "bases": [
    {"name": "Latte", "category": "Coffee", "basePrice": 500},
    {"name": "Macchiato", "category": "Coffee", "basePrice": 550}
  ],
  "modifiers": [
    {"name": "Vanilla", "type": "SYRUP", "price": 50},
    {"name": "Caramel", "type": "SYRUP", "price": 50},
    {"name": "Oat Milk", "type": "MILK", "price": 75}
  ]
}
```

---

## Phase 2: Admin Flow

Enable the business owner to view and manage their catalog after onboarding.

### 2.1 View Catalog
Display the transformed catalog in a readable format.

**Screens:**
- Categories list with item counts
- Bases list by category
- Modifiers list by type (milk, syrup, topping)

**Tech:** Real React components replacing static mockups in `@drink-ux/admin`

### 2.2 Edit Catalog
Allow manual adjustments to catalog items.

**Capabilities:**
- Edit base name, price, temperature constraints
- Edit modifier name, price, type
- Add/remove items
- Reorder categories

**Backend:** CRUD routes exist in `catalog.ts`

### 2.3 Basic Dashboard
Simple overview of business status.

**Display:**
- Business name and slug
- POS connection status
- Catalog summary (X categories, Y bases, Z modifiers)
- Account state

**Defer:** Order analytics, revenue charts (not needed for dogfooding)

---

## Phase 3: Ordering Flow

Enable end-to-end ordering from customer drink builder to Square sandbox.

### 3.1 Connect DrinkBuilder to API
Replace hardcoded demo data with real API calls.

**Changes:**
- `CategorySelector` fetches from `/api/catalog/categories`
- `TypeSelector` fetches bases for selected category
- `ModificationPanel` fetches modifiers by type
- Prices come from database, not hardcoded

**Backend:** Routes exist, need to verify response shapes match frontend expectations

### 3.2 Cart & Checkout Flow
Ensure cart persists and checkout collects needed info.

**Already exists:** Cart context, checkout page
**Verify:** Customer info form, order summary

### 3.3 Order Submission to Square
Submit completed order to Square sandbox POS.

**Flow:**
1. Customer submits order
2. Backend creates Order in database
3. Backend calls Square Orders API (sandbox)
4. Return order confirmation with pickup code

**Backend:** `OrderService.createOrder()` exists, `SquareAdapter` has order methods

**Verify:** Square sandbox order appears in Square Dashboard

---

## Technical Prerequisites

Before starting Phase 1:

1. **PostgreSQL running** - Local or Docker
2. **Migrations applied** - `npx prisma migrate dev`
3. **Square sandbox app** - Create at developer.squareup.com
4. **Environment variables:**
   ```
   DATABASE_URL=postgresql://...
   SQUARE_ENVIRONMENT=sandbox
   SQUARE_APPLICATION_ID=sandbox-xxx
   SQUARE_ACCESS_TOKEN=xxx (for testing, OAuth replaces this)
   ```

---

## Out of Scope (Deferred)

- Theme/branding customization
- Subscription billing
- Multi-location support
- Production Square environment
- Customer accounts/loyalty
- Email notifications
- Review/activation step in onboarding

---

## Success Criteria

Dogfooding milestone is complete when:

1. Can connect a Square sandbox account via OAuth
2. AI successfully decomposes a sample menu into drink-ux format
3. Owner can review and edit the transformed catalog
4. Customer can build a drink using the real catalog
5. Order appears in Square sandbox dashboard
