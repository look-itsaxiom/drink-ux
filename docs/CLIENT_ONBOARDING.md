# Client Onboarding Guide

This guide documents the process for onboarding new coffee shop businesses to the drink-ux platform. It is intended for internal use by the onboarding team.

---

## Table of Contents

1. [Pre-Onboarding Checklist](#1-pre-onboarding-checklist)
2. [Account Setup Process](#2-account-setup-process)
3. [Onboarding Wizard Steps](#3-onboarding-wizard-steps)
4. [Square POS Integration](#4-square-pos-integration)
5. [Menu Configuration](#5-menu-configuration)
6. [Theme Customization](#6-theme-customization)
7. [Subscription Setup](#7-subscription-setup)
8. [Go-Live Checklist](#8-go-live-checklist)
9. [Post-Launch Support](#9-post-launch-support)
10. [Account Lifecycle](#10-account-lifecycle)

---

## 1. Pre-Onboarding Checklist

### Business Requirements

Before starting the onboarding process, verify that the client meets the following requirements:

- [ ] **Square POS Account**: The business must have an active Square account (required for order processing and payment integration)
- [ ] **Square Location**: At least one active Square location configured
- [ ] **Internet Access**: Reliable internet connection at the business location
- [ ] **Device for Order Management**: Tablet or computer to receive and manage incoming orders

### Information to Collect from the Business

Gather the following information before beginning onboarding:

#### Business Information
| Field | Description | Required |
|-------|-------------|----------|
| Business Name | Legal or DBA name of the coffee shop | Yes |
| Contact Email | Primary email for account communication | Yes |
| Contact Phone | Business phone number | Optional |
| Owner Name | Name of the business owner/primary contact | Yes |

#### Square Account Details
| Field | Description | Required |
|-------|-------------|----------|
| Square Account Email | Email associated with Square account | Yes |
| Square Location Name | Which Square location to connect | Yes |
| Merchant ID | Will be retrieved during OAuth (for reference) | Auto |

#### Branding Assets (Optional but Recommended)
| Asset | Specifications | Required |
|-------|---------------|----------|
| Logo | PNG or JPG, minimum 200x200px, transparent background preferred | Optional |
| Primary Brand Color | Hex color code (e.g., #6B4226) | Optional |
| Secondary Brand Color | Hex color code for accents | Optional |

### Subdomain Selection and Verification

Each business receives a unique subdomain for their storefront:

**Format**: `https://{slug}.drink-ux.com`

**Subdomain Rules**:
- Lowercase letters, numbers, and hyphens only
- Must start with a letter
- 3-50 characters in length
- Must be unique across the platform

**Selection Process**:
1. Suggest subdomain based on business name (e.g., "Sunrise Coffee" -> `sunrise-coffee`)
2. Verify availability in the system
3. Confirm with the business owner
4. Reserve during account creation

---

## 2. Account Setup Process

### Business Owner Registration

The account setup begins with user registration via the signup endpoint.

**Registration Flow**:
1. Navigate to the registration page
2. Enter the following information:
   - Email address (will be used for login)
   - Password (minimum security requirements)
   - Business name
3. Submit registration

**What Happens Behind the Scenes**:
- User account is created
- Business record is created with status `ONBOARDING`
- Business slug is auto-generated from business name
- Email verification token is generated

### Email Verification

After registration, the business owner must verify their email:

1. Verification email is sent to the registered address
2. Owner clicks the verification link
3. Account is marked as email verified
4. Owner can proceed with onboarding wizard

**Troubleshooting**:
- If email not received, check spam folder
- Resend verification can be requested
- Verification tokens expire after a set period

### Initial Business Profile Setup

The business profile is automatically initialized during signup with:
- Business name (from registration)
- Auto-generated slug
- Account state: `ONBOARDING`
- Owner association

Additional profile information can be added during the onboarding wizard or later in the admin dashboard.

---

## 3. Onboarding Wizard Steps

The onboarding wizard guides new businesses through setup in five sequential steps. Each step must be completed (or explicitly skipped where allowed) before proceeding.

### Step Overview

| Step | Name | Description | Skippable |
|------|------|-------------|-----------|
| 1 | POS Connection | Connect Square account via OAuth | Yes |
| 2 | Path Selection | Choose catalog setup method | No |
| 3 | Catalog Setup | Initialize the menu catalog | No |
| 4 | Branding | Configure theme and colors | Yes |
| 5 | Review | Final review and launch | No |

### Step 1: Welcome / POS Connection

**Purpose**: Connect the business's Square POS account to enable order processing and optional catalog import.

**Process**:
1. Display welcome message and overview of what to expect
2. Present option to connect Square POS
3. If connecting:
   - Initiate OAuth flow
   - Redirect to Square authorization page
   - Business owner grants permissions
   - Return to app with authorization code
   - Exchange code for access tokens
   - Store encrypted tokens securely
4. If skipping:
   - Mark step as skipped
   - Note: Import path will not be available in next step

**OAuth State Management**:
- A unique state parameter is generated for security
- State is validated on callback to prevent CSRF attacks
- Errors during OAuth are captured and displayed

**After Completion**:
- `posConnected` flag is set to `true` (if connected)
- Merchant ID and Location ID are stored
- Move to Path Selection step

### Step 2: Path Selection

**Purpose**: Determine how the business wants to set up their initial catalog.

**Available Paths**:

| Path | Description | Requirements |
|------|-------------|--------------|
| **IMPORT** | Import existing catalog from Square POS | Square connection required |
| **TEMPLATE** | Start with a pre-built coffee shop template | None |
| **FRESH** | Start with an empty catalog | None |

**Path Details**:

**IMPORT Path** (Recommended if Square connected):
- Pulls categories, items, and modifiers from Square
- Maps Square catalog structure to drink-ux format
- Preserves pricing and item names
- Best for established businesses with existing Square menus

**TEMPLATE Path**:
- Provides a standard coffee shop menu template
- Includes common categories (Espresso Drinks, Cold Brew, Tea, etc.)
- Pre-configured drink bases and modifiers
- Easy to customize after setup
- Good for new businesses or those wanting a fresh start

**FRESH Path**:
- Starts with completely empty catalog
- Business builds menu from scratch
- Maximum flexibility
- Requires more setup time

### Step 3: Catalog Setup

**Purpose**: Execute the selected catalog setup path.

**IMPORT Execution**:
1. Fetch catalog data from Square API
2. Process categories:
   - Create category for each Square category
   - Map display order
3. Process items:
   - Create base drinks for each Square item
   - Map pricing (convert cents to dollars)
   - Store POS item ID for future sync
4. Process modifiers:
   - Infer modifier type (MILK, SYRUP, TOPPING) from names
   - Map pricing
   - Store POS modifier ID

**TEMPLATE Execution**:
1. Load predefined template catalog
2. Create categories with display order
3. Create base drinks with pricing
4. Create standard modifiers (milks, syrups, toppings)

**FRESH Execution**:
- No catalog items created
- Business will build menu manually in admin dashboard

**After Completion**:
- `catalogSetupComplete` flag is set
- `catalogIsEmpty` flag indicates if FRESH path was chosen

### Step 4: Branding

**Purpose**: Configure the storefront's visual appearance.

**Configuration Options**:

| Setting | Description | Format | Default |
|---------|-------------|--------|---------|
| Primary Color | Main brand color | Hex (#RRGGBB) | #6B4226 |
| Secondary Color | Accent color | Hex (#RRGGBB) | #D4A574 |
| Logo URL | Business logo | HTTPS URL | None |

**Validation**:
- Colors must be valid hex format
- Logo URL must be valid HTTPS URL
- Invalid inputs result in error messages

**Skip Option**:
- If skipped, default coffee-themed colors are applied
- Can be customized later in admin dashboard

### Step 5: Review and Launch

**Purpose**: Final verification before completing onboarding.

**Review Summary Displays**:

1. **Catalog Summary**:
   - Number of categories
   - Number of base drinks
   - Number of modifiers
   - Number of presets (if any)

2. **Theme Preview**:
   - Primary color swatch
   - Secondary color swatch
   - Logo preview (if uploaded)

3. **POS Status**:
   - Connection status (connected/not connected)
   - Merchant ID (if connected)
   - Location ID (if connected)

**Completion Actions**:
1. Validate all required steps are complete
2. Option to trigger initial POS sync (if connected)
3. Transition account state from `ONBOARDING` to `SETUP_COMPLETE`
4. Clear onboarding data from theme storage
5. Preserve actual theme configuration

---

## 4. Square POS Integration

### OAuth Connection Process

**Required Square Permissions**:
- `ITEMS_READ` - Read catalog items
- `ITEMS_WRITE` - Create/update catalog items
- `ORDERS_READ` - Read order information
- `ORDERS_WRITE` - Create/update orders
- `PAYMENTS_READ` - Read payment information
- `PAYMENTS_WRITE` - Process payments
- `MERCHANT_PROFILE_READ` - Read merchant information

**OAuth Flow**:

```
1. User clicks "Connect Square"
       |
       v
2. App generates authorization URL with:
   - Client ID
   - Redirect URI
   - Scopes (permissions)
   - State parameter (business ID)
       |
       v
3. User redirected to Square login
       |
       v
4. User authorizes app permissions
       |
       v
5. Square redirects back with:
   - Authorization code
   - State parameter
       |
       v
6. App exchanges code for tokens:
   - Access token
   - Refresh token
   - Expiration time
   - Merchant ID
       |
       v
7. Tokens encrypted and stored
       |
       v
8. POS connection complete
```

### Required Square Permissions

| Permission | Purpose |
|------------|---------|
| Items Read/Write | Catalog sync |
| Orders Read/Write | Order processing |
| Payments Read/Write | Payment processing |
| Merchant Profile Read | Location info |

### Catalog Sync Process

**Initial Sync (During Onboarding)**:
1. Fetch all categories from Square
2. Fetch all items and variations
3. Fetch all modifier lists and modifiers
4. Map to drink-ux catalog structure
5. Create local records with POS references

**Ongoing Sync (Post-Launch)**:
- On-demand sync triggered from admin dashboard
- Detects changes (creates, updates, deactivations)
- Maintains POS ID references for mapping

**Sync Status Indicators**:
| Status | Meaning |
|--------|---------|
| IDLE | No sync in progress |
| SYNCING | Sync currently running |
| SUCCESS | Last sync completed successfully |
| ERROR | Last sync failed |

### Troubleshooting Common Issues

**OAuth Errors**:

| Error | Cause | Solution |
|-------|-------|----------|
| `access_denied` | User denied permissions | Restart OAuth flow, ensure all permissions are granted |
| `invalid_grant` | Authorization code expired | Code expires in 5 minutes; restart flow if expired |
| `invalid_client` | Wrong client credentials | Verify Square app credentials in environment |
| `invalid_scope` | Requested invalid permission | Check requested scopes match Square app configuration |

**Sync Errors**:

| Error | Cause | Solution |
|-------|-------|----------|
| Token expired | Access token past expiration | Use refresh token to get new access token |
| Rate limited | Too many API calls | Wait and retry; implement exponential backoff |
| Item not found | Item deleted in Square | Will be marked as unavailable in next sync |
| Network error | Connection issues | Check internet connectivity; retry |

---

## 5. Menu Configuration

### Understanding the Catalog Structure

The drink-ux catalog has a hierarchical structure:

```
Business
  |
  +-- Categories (e.g., "Espresso Drinks", "Cold Brew")
  |     |
  |     +-- Bases (e.g., "Latte", "Cappuccino")
  |           |
  |           +-- Properties: price, temperature constraints, visual properties
  |
  +-- Modifiers (shared across all drinks)
  |     |
  |     +-- MILK (e.g., "Oat Milk", "Almond Milk")
  |     +-- SYRUP (e.g., "Vanilla", "Caramel")
  |     +-- TOPPING (e.g., "Whipped Cream", "Cinnamon")
  |
  +-- Presets (pre-configured drink combinations)
        |
        +-- Base + Modifiers + Default Size/Temp + Price
```

### Catalog Components

**Categories**:
- Organize menu items into logical groups
- Have display order for menu presentation
- Can have optional color and icon for visual distinction

| Field | Type | Description |
|-------|------|-------------|
| name | string | Category display name |
| displayOrder | number | Position in menu (0 = first) |
| color | string? | Hex color for UI |
| icon | string? | Icon identifier |

**Bases** (Drink Foundations):
- Core drink items that customers order
- Have a base price
- Belong to a category
- Can have temperature constraints

| Field | Type | Description |
|-------|------|-------------|
| name | string | Drink name |
| basePrice | number | Price in dollars |
| categoryId | string | Parent category |
| temperatureConstraint | enum | HOT_ONLY, ICED_ONLY, or BOTH |
| available | boolean | Currently orderable |
| visualColor | string? | Color for drink visualization |
| posItemId | string? | Square item reference |

**Modifiers** (Customizations):
- Add-ons that modify base drinks
- Three types: MILK, SYRUP, TOPPING
- Have individual pricing

| Field | Type | Description |
|-------|------|-------------|
| name | string | Modifier name |
| type | enum | MILK, SYRUP, or TOPPING |
| price | number | Additional cost in dollars |
| available | boolean | Currently available |
| visualColor | string? | Color for visualization |
| visualLayerOrder | number | Rendering order |
| posModifierId | string? | Square modifier reference |

**Presets** (Signature Drinks):
- Pre-configured drink combinations
- Combine base + modifiers
- Can have custom pricing
- Useful for popular or featured drinks

| Field | Type | Description |
|-------|------|-------------|
| name | string | Preset name |
| baseId | string | Base drink |
| price | number | Total price |
| defaultSize | enum | SMALL, MEDIUM, LARGE |
| defaultHot | boolean | Default temperature |
| modifiers | array | Included modifiers |

### Using the Menu Builder

**Creating a Category**:
```
POST /api/catalog/categories
{
  "businessId": "<business-id>",
  "name": "Espresso Drinks",
  "displayOrder": 0,
  "color": "#8B4513",
  "icon": "coffee"
}
```

**Creating a Base Drink**:
```
POST /api/catalog/bases
{
  "businessId": "<business-id>",
  "categoryId": "<category-id>",
  "name": "Latte",
  "basePrice": 4.50,
  "temperatureConstraint": "BOTH"
}
```

**Creating a Modifier**:
```
POST /api/catalog/modifiers
{
  "businessId": "<business-id>",
  "name": "Oat Milk",
  "type": "MILK",
  "price": 0.75
}
```

**Creating a Preset**:
```
POST /api/catalog/presets
{
  "businessId": "<business-id>",
  "name": "Vanilla Oat Latte",
  "baseId": "<latte-id>",
  "modifierIds": ["<oat-milk-id>", "<vanilla-id>"],
  "price": 5.75,
  "defaultSize": "MEDIUM",
  "defaultHot": true
}
```

### Setting Prices

**Pricing Strategy Options**:

1. **Component Pricing**: Base price + modifier prices
   - Latte ($4.50) + Oat Milk ($0.75) + Vanilla ($0.50) = $5.75

2. **Preset Fixed Pricing**: Override with fixed price
   - Vanilla Oat Latte preset = $5.50 (discount for ordering preset)

**Suggested Price Calculation**:
```
GET /api/catalog/presets/suggested-price?baseId=<id>&modifierIds=<id1>,<id2>
```
Returns sum of base price + all modifier prices.

### Managing Availability

**Toggling Item Availability**:
- Set `available: false` to hide from storefront
- Item remains in catalog for historical orders
- Use for seasonal items or sold-out products

**Bulk Operations**:
- Category reordering supported
- Batch availability updates recommended for large changes

---

## 6. Theme Customization

### Brand Colors

**Primary Color**:
- Main brand color
- Used for headers, buttons, and key UI elements
- Should have sufficient contrast for accessibility
- Default: #6B4226 (coffee brown)

**Secondary Color**:
- Accent color for highlights
- Used for hover states, borders, secondary buttons
- Should complement primary color
- Default: #D4A574 (light coffee)

**Color Format**:
- Must be valid hex color: `#RRGGBB` or `#RGB`
- Examples: `#6B4226`, `#FFF`, `#2196F3`

### Logo Upload

**Requirements**:
- Format: PNG or JPG (PNG with transparency preferred)
- Minimum size: 200x200 pixels
- Maximum size: 2MB recommended
- URL: Must be valid HTTPS URL

**Best Practices**:
- Use transparent background for versatility
- Square or horizontal orientation works best
- Ensure logo is legible at small sizes
- Test against both light and dark backgrounds

### Custom Messaging

Future enhancement - not yet implemented. Will allow:
- Custom welcome message on storefront
- Order confirmation messaging
- Pickup instructions

---

## 7. Subscription Setup

### Available Plans

| Plan | Price | Interval | Features |
|------|-------|----------|----------|
| Pro Monthly | $49/month | Monthly | Full features, unlimited orders |
| Pro Annual | $470/year | Annual | Full features + 2 months free |

**Plan Features**:
- Unlimited orders
- Custom branding
- POS integration
- Analytics dashboard
- Priority support

### Payment Setup

**Checkout Process**:
1. Select subscription plan
2. System creates checkout session
3. Redirect to payment page
4. Enter payment information
5. Payment processed
6. Subscription activated
7. Account state transitions to `ACTIVE`

**Payment Methods**:
- Credit/debit cards accepted
- Business billing information captured
- Recurring billing set up automatically

### Billing Cycle

**Monthly Plans**:
- Billed on the same date each month
- First charge: immediate upon subscription
- Subsequent charges: monthly anniversary

**Annual Plans**:
- Billed once per year
- Significant savings (2 months free)
- First charge: immediate upon subscription
- Renewal: 12 months from start

**Invoice Details**:
- Itemized billing
- Tax calculated based on location
- Invoice sent via email

---

## 8. Go-Live Checklist

Before sharing the storefront URL with the business, verify the following:

### Pre-Launch Verification

**Catalog Verification**:
- [ ] All menu categories present and ordered correctly
- [ ] All drink items have correct names and prices
- [ ] Temperature constraints set appropriately (hot/iced/both)
- [ ] All modifiers available with correct pricing
- [ ] Unavailable items marked as such
- [ ] At least one item in each category

**POS Sync Verification** (if connected):
- [ ] POS connection shows as active
- [ ] Last sync completed successfully
- [ ] No sync errors in history
- [ ] POS item IDs mapped correctly

**Test Order Flow**:
- [ ] Can browse menu on storefront
- [ ] Can add items to cart
- [ ] Can customize drinks with modifiers
- [ ] Cart total calculates correctly
- [ ] Can complete checkout (test mode if available)
- [ ] Order appears in POS system (if connected)
- [ ] Order confirmation displays pickup code

**Payment Processing Verification**:
- [ ] Payment integration active
- [ ] Test transaction successful
- [ ] Refund process tested (if applicable)

**Theme Verification**:
- [ ] Business logo displays correctly
- [ ] Brand colors applied consistently
- [ ] Storefront is readable and accessible

### Go-Live Actions

1. **Final Review with Business Owner**:
   - Walk through storefront together
   - Confirm pricing is accurate
   - Verify branding meets expectations

2. **Subscription Activation**:
   - Ensure subscription is active
   - Confirm payment method on file
   - Note billing date

3. **Share Storefront URL**:
   - Provide production URL: `https://{slug}.drink-ux.com`
   - Generate QR code for in-store display
   - Suggest social media announcement

4. **Staff Training** (if needed):
   - Order management dashboard overview
   - How to update menu items
   - How to handle order issues

---

## 9. Post-Launch Support

### Common Issues and Solutions

**Orders Not Appearing in POS**:
| Symptom | Possible Cause | Solution |
|---------|---------------|----------|
| No orders syncing | POS disconnected | Reconnect via OAuth |
| Intermittent failures | Token expired | Refresh token or reconnect |
| Specific items failing | Item mapping broken | Re-sync catalog |

**Menu Display Issues**:
| Symptom | Possible Cause | Solution |
|---------|---------------|----------|
| Missing items | Item marked unavailable | Toggle availability |
| Wrong prices | Price not updated | Update in admin dashboard |
| Categories wrong order | Display order incorrect | Reorder categories |

**Payment Issues**:
| Symptom | Possible Cause | Solution |
|---------|---------------|----------|
| Payments failing | Payment integration issue | Check Square dashboard |
| Wrong amounts | Tax configuration | Verify tax settings |

### How to Update Menu

**Via Admin Dashboard**:
1. Log in to admin dashboard
2. Navigate to Menu Management
3. Make desired changes:
   - Add/edit/remove categories
   - Add/edit/remove items
   - Update prices
   - Toggle availability
4. Changes take effect immediately

**Via POS Sync**:
1. Make changes in Square POS
2. Navigate to Catalog Sync in admin
3. Trigger sync
4. Review and confirm changes

### How to View Orders

**Active Orders**:
1. Log in to admin dashboard
2. Navigate to Orders
3. Filter by status (Pending, Preparing, Ready)
4. Click order for details

**Order Statuses**:
| Status | Description |
|--------|-------------|
| PENDING | Customer submitted, awaiting confirmation |
| CONFIRMED | Accepted, payment complete |
| PREPARING | Being made |
| READY | Ready for pickup |
| COMPLETED | Customer picked up |
| CANCELLED | Cancelled |
| FAILED | POS rejected or payment failed |

**Order Actions**:
- Update status
- Cancel with reason
- Sync status from POS

### Contact Support

**Support Channels**:
- Email: support@drink-ux.com
- In-app help chat
- Knowledge base: help.drink-ux.com

**Information to Include in Support Requests**:
- Business name and ID
- Description of issue
- Steps to reproduce
- Screenshots if applicable
- Any error messages

---

## 10. Account Lifecycle

### Account States

The account state machine tracks the business lifecycle:

```
                                    +------------+
                                    |   START    |
                                    +-----+------+
                                          |
                                          v
                                   +------+------+
                                   | ONBOARDING  | <-- Initial state after signup
                                   +------+------+
                                          |
                                          v
                                +--------+--------+
                                | SETUP_COMPLETE  | <-- Finished wizard
                                +--------+--------+
                                    |         |
                                    v         v
                              +-----+--+   +--+-----+
                              | TRIAL  |   | ACTIVE | <-- Subscribed
                              +-----+--+   +--+-----+
                                    |         |
                                    |    +----+----+
                                    |    |         |
                                    v    v         v
                            +-------+----+    +---+---+
                            | ACTIVE     |    | PAUSED| <-- User paused
                            +-----+------+    +---+---+
                                  |               |
              +-------------------+-------+-------+
              |                   |       |
              v                   v       v
       +------+------+     +-----+---+   +---------+
       | GRACE_PERIOD|     | CHURNED |   |         |
       +------+------+     +---------+   v         |
              |                      +---+----+    |
              +--------------------->|SUSPENDED|<--+
                                     +---+----+
                                         |
                    +--------------------+
                    |                    |
                    v                    v
             +------+------+      +-----+----+
             | SETUP_COMP. |      | CHURNED  | <-- Terminal state
             +-------------+      +----------+

             +----------+
             | EJECTED  | <-- Disconnected, data preserved
             +----------+
```

### State Definitions

| State | Description | Capabilities |
|-------|-------------|--------------|
| ONBOARDING | In setup wizard | Menu editing, no orders |
| SETUP_COMPLETE | Finished wizard, no subscription | Menu editing, no orders |
| TRIAL | Free trial period | Full access |
| ACTIVE | Paid subscription | Full access |
| GRACE_PERIOD | Payment failed, limited time | Storefront active, no order processing |
| PAUSED | User-initiated pause | Menu editing, no storefront |
| SUSPENDED | Subscription expired | Read-only, can resubscribe |
| CHURNED | Account closed | Terminal - no access |
| EJECTED | Disconnected | Data preserved, can start over |

### Account Capabilities by State

| Capability | ONBOARDING | SETUP_COMPLETE | TRIAL | ACTIVE | GRACE | PAUSED | SUSPENDED |
|------------|------------|----------------|-------|--------|-------|--------|-----------|
| Access Storefront | No | No | Yes | Yes | Yes | No | No |
| Edit Menu | Yes | Yes | Yes | Yes | Yes | Yes | No |
| Process Orders | No | No | Yes | Yes | No | No | No |
| Manage Subscription | Yes | Yes | Yes | Yes | Yes | Yes | Yes |
| View Analytics | No | No | Yes | Yes | Yes | Yes | Yes |
| Export Data | No | No | Yes | Yes | Yes | Yes | Yes |

### Grace Period Handling

**When Grace Period Starts**:
- Payment fails on subscription renewal
- Business enters GRACE_PERIOD state
- Configurable duration (typically 7-14 days)

**During Grace Period**:
- Storefront remains active for customers
- Order processing disabled
- Prominent notice shown in admin dashboard
- Multiple payment reminder emails sent

**Grace Period Resolution**:
- Payment succeeds: Return to ACTIVE
- Payment fails after period: Move to SUSPENDED
- Business cancels: Move to CHURNED

**Grace Period Extension**:
- Can be extended on case-by-case basis
- Requires manual intervention
- Use `extendGracePeriod` service method

### Pause/Resume Subscription

**Pausing a Subscription**:
1. Business requests pause via subscription settings
2. System confirms pause
3. Account state changes to PAUSED
4. Storefront goes offline
5. Menu editing remains available
6. Billing paused

**Resuming a Subscription**:
1. Business clicks resume
2. Payment method charged
3. Account state returns to ACTIVE
4. Storefront goes live immediately

**Pause Limits**:
- May have limits on pause duration
- May have limits on pause frequency

### Account Cancellation

**Voluntary Cancellation**:
1. Business initiates cancellation
2. Confirm cancellation intent
3. Options:
   - Cancel at period end (continue until paid period ends)
   - Cancel immediately (no refund, immediate termination)
4. Account transitions to CHURNED

**Involuntary Cancellation** (Suspension):
1. Grace period expires without payment
2. Account moves to SUSPENDED
3. Read-only access preserved
4. Can resubscribe to restore access

### Ejection (Self-Service Disconnect)

**When to Use Ejection**:
- Business wants to remove data but not close account
- Testing or development reset
- Business sold or transferred

**Ejection Process**:
1. Check ejection consequences (data that will be affected)
2. Confirm ejection intent
3. Execute ejection:
   - Account state to EJECTED
   - POS connection preserved (optional)
   - Catalog preserved (optional)
   - Orders archived
4. Option to start over with fresh onboarding

**Start Over After Ejection**:
1. Confirm start over intent
2. Choose what to clear:
   - Clear catalog (optional)
   - Clear POS connection (optional)
3. Account returns to ONBOARDING state
4. Begin wizard again

---

## Appendix: API Reference

### Key Endpoints

**Authentication**:
- `POST /api/auth/signup` - Create account
- `POST /api/auth/login` - Login
- `POST /api/auth/verify-email` - Verify email
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password` - Reset password

**Onboarding**:
- `GET /api/onboarding/status` - Current onboarding status
- `POST /api/onboarding/step/:step` - Complete a step
- `POST /api/onboarding/path` - Select catalog path
- `GET /api/onboarding/review` - Get review summary
- `POST /api/onboarding/complete` - Finish onboarding
- `POST /api/onboarding/back` - Go to previous step
- `POST /api/onboarding/reset` - Start over

**POS Integration**:
- `GET /api/pos/providers` - List supported providers
- `GET /api/pos/oauth/authorize` - Start OAuth flow
- `GET /api/pos/oauth/callback` - OAuth callback

**Catalog**:
- `GET/POST /api/catalog/categories` - List/create categories
- `GET/PUT/DELETE /api/catalog/categories/:id` - Category operations
- `GET/POST /api/catalog/bases` - List/create bases
- `GET/PUT/DELETE /api/catalog/bases/:id` - Base operations
- `GET/POST /api/catalog/modifiers` - List/create modifiers
- `GET/PUT/DELETE /api/catalog/modifiers/:id` - Modifier operations
- `GET/POST /api/catalog/presets` - List/create presets
- `GET/PUT/DELETE /api/catalog/presets/:id` - Preset operations

**Catalog Sync**:
- `GET /api/catalog/sync/status` - Sync status
- `POST /api/catalog/sync` - Trigger sync
- `GET /api/catalog/sync/history` - Sync history

**Subscription**:
- `GET /api/subscription` - Current subscription
- `POST /api/subscription/checkout` - Create checkout
- `POST /api/subscription/cancel` - Cancel subscription
- `POST /api/subscription/pause` - Pause subscription
- `POST /api/subscription/resume` - Resume subscription
- `GET /api/subscription/plans` - Available plans

**Orders**:
- `POST /api/orders` - Create order
- `GET /api/orders/:id` - Get order
- `PUT /api/orders/:id/status` - Update status
- `POST /api/orders/:id/cancel` - Cancel order

---

*Last updated: January 2026*
