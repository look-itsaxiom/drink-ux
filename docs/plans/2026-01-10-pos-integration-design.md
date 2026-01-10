# Drink-UX POS Integration & Source of Truth Design

**Date:** 2026-01-10
**Status:** Approved for implementation

## Executive Summary

Drink-UX becomes the source of truth for coffee shop menu management, syncing TO POS systems (starting with Square). This enables the core product vision: an inverted drink ordering experience where customers build what they want and discover what it's called, rather than navigating traditional menu structures.

### Core Principles (Non-negotiable)

1. **Onboarding is easy** - for the business owner
2. **Ordering is fun** - for the customer
3. **Non-destructive** - never delete anything from their POS
4. **Psychological safety** - businesses can eject anytime

---

## Design Philosophy

### The Inversion

Traditional POS ordering: Pick a named drink → Customize it

Drink-UX ordering: Build what you want → Discover what it's called

The drink visualizer presents ingredients first - espresso, milk types, syrups, sizes. Customers compose their drink modularly, and the system resolves it to a transactable POS item. This serves both coffee novices (approachable, no jargon) and enthusiasts (granular control, exploration).

### Why Source of Truth?

After evaluating three approaches:
- **Thin overlay** (just display POS data prettily) - violates "fun ordering"
- **Smart translator** (rich UI, map back to POS) - brittle, complex
- **Source of truth** (Drink-UX owns catalog, syncs to POS) - cleanest long-term

Source of truth wins because:
- One mental model for business owners ("manage everything in Drink-UX")
- No bidirectional sync complexity
- Order submission is simpler when we control POS item structure
- Non-destructive by design (we only add/update, never delete)

---

## Onboarding Flow

### Step 1: Sign Up
- Marketing site → "Get Started"
- Create account (email, password, business name)
- Email verification
- Slug auto-generated from business name (editable)

### Step 2: Connect POS
OAuth with Square (Toast/Clover later). Drink-UX gets read/write access to catalog and order APIs.

### Step 3: Choose Your Path

Three options:
1. **"Import my menu"** - Pull existing items as presets. Manual organization into Drink-UX format. *(Stretch goal: AI-assisted decomposition)*
2. **"Start from a template"** - Pre-built coffee shop catalog to customize
3. **"Start fresh"** - Blank canvas, guided flow

### Step 4: Catalog Setup

Depending on path:
- *Import*: Items become named presets. Business organizes into categories, adds ingredients/modifiers.
- *Template*: Pre-built catalog, adjust pricing and availability.
- *Fresh*: Build from scratch with guided flow.

### Step 5: Branding & Theme
- Primary/secondary colors
- Logo upload
- Business name and info

### Step 6: Review & Sync
Preview what will be pushed to POS. Confirm and sync.

### Subscription Gate

**Free:**
- Full onboarding and setup
- Menu configuration
- Preview storefront (shows "Coming Soon")
- POS sync setup

**Requires subscription:**
- Live storefront accepting real orders
- Order submission to POS

Billing via Square Subscriptions API (aligns with plugin store presence).

---

## Multi-Tenancy

### Subdomain-based routing

Each business gets: `{slug}.drink-ux.com`
- `joes-coffee.drink-ux.com`
- `mainstreet-cafe.drink-ux.com`

**Why subdomains:**
- Clean, brandable URLs
- Easy tenant extraction from request
- PWA installs per-business with correct branding

**Admin:** `admin.drink-ux.com` - business owners log in, see only their data.

**API:** `api.drink-ux.com` - tenant-aware, validates business ownership on all requests.

**Stretch:** Custom domains (`order.joes-coffee.com`)

---

## Catalog Data Model

### Entities

**Business**
```
id, name, slug
theme (colors, logo)
posConnection (provider, credentials, lastSync)
subscriptionStatus
accountState (onboarding | setup_complete | active | paused | ejected)
```

**Category**
```
id, businessId
name, displayOrder
color, icon
```

**Base**
```
id, businessId, categoryId
name, basePrice
temperatureConstraint (hot_only | iced_only | both)
visualProperties (color, opacity)
posItemId (once synced)
available
```

**Modifier**
```
id, businessId
type (milk | syrup | topping)
name, price
visualProperties (color, layerPosition, animationType)
posModifierId (once synced)
available
```

**Preset**
```
id, businessId
name (e.g., "Vanilla Latte")
baseId, defaultModifiers[], defaultSize
price
posItemId (once synced)
```

**Order**
```
id, businessId
posOrderId
items[] (what they ordered)
status (pending | confirmed | ready | completed | cancelled | failed)
customerName, customerContact
timestamps
```

---

## POS Integration

### Adapter Pattern

```typescript
interface POSAdapter {
  connect(credentials): Promise<Connection>
  importCatalog(): Promise<RawCatalogData>
  pushItem(item): Promise<posItemId>
  pushModifier(modifier): Promise<posModifierId>
  updateItem(posItemId, item): Promise<void>
  createOrder(order): Promise<posOrderId>
  getPaymentLink(orderId): Promise<checkoutUrl>
  getOrderStatus(posOrderId): Promise<status>
}

class SquareAdapter implements POSAdapter { ... }
// Future: ToastAdapter, CloverAdapter
```

### Sync Mechanics

**On-demand sync (MVP):**
- Business makes changes in admin
- Clicks "Publish Changes"
- Drink-UX pushes updates to POS
- Clear feedback: success or error details

**Sync process:**
1. Compare local catalog to last-known POS state
2. New item → `adapter.pushItem()`
3. Updated item → `adapter.updateItem()`
4. Deleted item → mark inactive in POS (non-destructive)
5. Store new `posItemId` mappings
6. Update `lastSyncedAt`

**Conflict handling (MVP):** Drink-UX wins. Next sync overwrites POS.

### Order Flow

1. Customer builds drink in modular UI
2. If build matches preset → submit as that POS item
3. If custom build → submit as base item + modifier codes
4. Order hits POS via API
5. POS handles payment (via Square Web Payments SDK - card info never touches Drink-UX)
6. Order status polled from POS, displayed to customer

---

## Customer Experience

### Guest-first checkout
- No account required
- Enter name + phone/email for order identification
- Cart stored in localStorage per subdomain
- Order confirmation with pickup code

### Optional accounts (stretch)
- Save info for faster checkout
- Order history
- Favorite drinks

---

## Admin Experience

### Philosophy
Managing your menu should feel like building drinks, not configuring software.

### Pages

**Onboarding Wizard**
- POS OAuth
- Path selection
- Catalog setup
- Branding
- Review & sync

**Menu Administration**
- Add item = build a drink in the builder UI, name it, price it
- Edit item = open in builder, adjust, save
- Ingredients manager = availability toggles, pricing
- Categories = organize and reorder

**Account Management**
- Business profile
- Subscription/billing
- User management (stretch: multi-user)

**Settings**
- POS connection status, re-sync
- Ejection tool

### Ejection (First-class feature)

Accessible anytime. One-click "Disconnect from Drink-UX":
- Stops syncing
- Leaves all POS items intact
- Data preserved for potential return
- Option to start over with fresh onboarding

---

## Technical Architecture

### Package Structure

```
packages/
├── mobile/     # Customer-facing PWA
├── admin/      # Business owner dashboard (core product)
├── api/        # Backend
├── shared/     # Types + shared UI components
```

Drink builder components move to `@drink-ux/shared` for use in both mobile and admin.

### Database (Prisma)

New models needed:
- Business, Category, Base, Modifier, Preset, Order
- POSConnection (credentials, provider, sync state)

Existing User model becomes business owner account.

### API Routes

```
/api/auth          # Business owner auth
/api/onboarding    # POS connect, import, setup
/api/catalog       # CRUD for bases, modifiers, presets
/api/pos           # Sync to POS, order submission
/api/orders        # Order management
/api/business      # Config, theme, settings
```

### Deployment

| Component | Platform | Cost |
|-----------|----------|------|
| Mobile + Admin | Vercel | Free tier |
| API | Railway | ~$5/mo |
| Database | Railway PostgreSQL | Included |
| File storage | Cloudflare R2 | Free tier |

Wildcard subdomain: `*.drink-ux.com` → Vercel

---

## Theme Application

Business theme stored in database. Mobile app fetches on load, applies as CSS variables.

**Customizable:** Primary color, secondary color, logo, business name

**Fixed:** Layout, UX patterns, DrinkVisualizer style, "Powered by Drink-UX" footer

---

## Error Handling

### Catalog sync failures
- Retry with backoff
- Clear error messages in admin
- Auth expiry prompts reconnection

### Order submission failures
- Never leave customer in limbo
- Payment declined → retry option
- POS unreachable → "Unable to place order, please try again"
- Item unavailable → return to cart with message

### POS downtime
- Detect via failed health checks
- Storefront shows "Ordering temporarily unavailable"
- Business notified
- Auto-recover when POS responds

---

## Offline & Edge Cases

### Customer browser issues
- Cart persists in localStorage
- Offline indicator, block checkout
- Queue order locally if connection lost during submit

### Business edge cases
- Subscription lapses → storefront shows "Temporarily unavailable"
- Switch POS providers → eject, re-onboard
- Delete item in POS directly → next Drink-UX sync recreates it

### Invalid states
- Old/invalid slug → 404
- Shop in setup_complete state → "Coming soon"
- Ejected shop → "No longer available"

---

## Account States

| State | Meaning |
|-------|---------|
| `onboarding` | In wizard, not complete |
| `setup_complete` | Finished onboarding, no subscription |
| `active` | Subscribed, accepting orders |
| `paused` | Subscription lapsed, storefront disabled |
| `ejected` | Disconnected, data preserved |

---

## MVP vs Stretch

### MVP

- Onboarding: Template + Import (manual) paths
- Admin: Menu builder, ingredients manager, account, ejection
- POS: Square only
- Mobile: Connect to real API, order submission
- Payment: Square Web Payments SDK handoff
- Auth: Email/password, single user per business
- Sync: On-demand, Drink-UX wins conflicts

### Stretch

- AI-assisted import decomposition
- Toast and Clover adapters
- Dashboard with analytics
- Multi-user accounts
- Custom domains
- "Start fresh" onboarding path
- Customer accounts with order history
- Native mobile apps via Capacitor

---

## Testing Strategy

Strict TDD with coverage for:
- **Happy path** - normal successful flows
- **Success scenarios** - various valid inputs
- **Failure scenarios** - expected failures handled gracefully
- **Error scenarios** - unexpected errors caught and reported
- **Edge cases** - boundary conditions, empty states, race conditions

---

## Implementation Sequence

1. **Database schema** - Business, Catalog, Order models
2. **Auth system** - Sign up, login, session management
3. **POS adapter** - Square OAuth, catalog read/write, order submission
4. **Admin onboarding** - Wizard flow with template path
5. **Admin menu builder** - Shared drink builder components, CRUD
6. **Sync service** - On-demand publish to POS
7. **Mobile API integration** - Replace mock data, real order submission
8. **Payment handoff** - Square Web Payments integration
9. **Subscription gate** - Square billing, account states
10. **Polish** - Error handling, edge cases, testing

---

## Open Questions (Resolved)

- ~~Should we do AI decomposition on import?~~ → Stretch goal
- ~~Where do customers see orders?~~ → Stay in ordering app, status from POS
- ~~Where do businesses manage orders?~~ → In their POS (don't reinvent the wheel)
- ~~Who handles payment?~~ → POS via Square Web Payments SDK
- ~~How do we bill businesses?~~ → Square Subscriptions (plugin store alignment)
