# End-to-End Testing Guide

This guide provides detailed, practical E2E testing scenarios for drink-ux. It covers setting up a test environment, executing complete user flows, and verifying system behavior.

## Table of Contents

1. [Test Environment Setup](#test-environment-setup)
2. [E2E Flow: Business Onboarding](#e2e-flow-business-onboarding)
3. [E2E Flow: Menu Management](#e2e-flow-menu-management)
4. [E2E Flow: Customer Ordering](#e2e-flow-customer-ordering)
5. [E2E Flow: Subscription Lifecycle](#e2e-flow-subscription-lifecycle)
6. [Automated E2E Scripts](#automated-e2e-scripts)
7. [Troubleshooting](#troubleshooting)

---

## Test Environment Setup

### Option 1: Docker Compose (Recommended)

The Docker environment provides a complete, isolated testing setup with all services.

```bash
# Start test environment with fresh database
docker-compose -f docker-compose.test.yml up --build -d

# Wait for services to be healthy
docker-compose -f docker-compose.test.yml ps

# View logs
docker-compose -f docker-compose.test.yml logs -f api-test
```

**Service URLs**:
- API: `http://localhost:3001`
- Database: `localhost:5433` (test DB)

### Option 2: Local Development

```bash
# Terminal 1: Start database (using Docker)
docker run --name drink-ux-test-db -e POSTGRES_USER=drinkux_test \
  -e POSTGRES_PASSWORD=drinkux_test_password \
  -e POSTGRES_DB=drinkux_test \
  -p 5433:5432 postgres:15-alpine

# Terminal 2: Start API
cd packages/api
DATABASE_URL="postgresql://drinkux_test:drinkux_test_password@localhost:5433/drinkux_test" \
  npm run dev

# Terminal 3: Start Mobile (optional, for UI testing)
cd packages/mobile
VITE_API_URL=http://localhost:3001 npm run dev
```

### Environment Variables for Testing

Create a `.env.test` file:

```bash
NODE_ENV=test
PORT=3001
DATABASE_URL=postgresql://drinkux_test:drinkux_test_password@localhost:5433/drinkux_test
SESSION_SECRET=test-session-secret-32-characters
ENCRYPTION_KEY=test-encryption-key-32-chars!!
SQUARE_ENVIRONMENT=sandbox
SQUARE_APPLICATION_ID=sandbox-sq0idb-test-app-id
SQUARE_ACCESS_TOKEN=test-access-token
CORS_ORIGIN=*
```

### Reset Test Database

```bash
# Via Docker
docker-compose -f docker-compose.test.yml down -v
docker-compose -f docker-compose.test.yml up --build -d

# Or via Prisma
cd packages/api
DATABASE_URL="..." npx prisma migrate reset --force
```

---

## E2E Flow: Business Onboarding

This flow tests the complete journey of a new business owner from registration to a fully operational storefront.

### Prerequisites

- API running on `localhost:3001`
- Empty or reset test database

### Step 1: Business Registration

**Register a new business owner**:

```bash
# Create new business account
curl -X POST http://localhost:3001/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "owner@testcafe.com",
    "password": "SecureP@ss123!",
    "businessName": "Test Cafe"
  }' | jq
```

**Expected Response** (201 Created):
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "usr_abc123",
      "email": "owner@testcafe.com",
      "emailVerified": false,
      "role": "OWNER"
    },
    "business": {
      "id": "biz_xyz789",
      "name": "Test Cafe",
      "slug": "test-cafe",
      "accountState": "ONBOARDING"
    }
  }
}
```

**Save these values for later steps**:
```bash
USER_ID="usr_abc123"
BUSINESS_ID="biz_xyz789"
BUSINESS_SLUG="test-cafe"
```

### Step 2: Email Verification

In production, the user receives an email. For testing, retrieve the token from the database:

```bash
# Get verification token (in test environment)
docker exec drink-ux-db-test psql -U drinkux_test -d drinkux_test -c \
  "SELECT email_verification_token FROM users WHERE email='owner@testcafe.com';"
```

**Verify email**:
```bash
VERIFICATION_TOKEN="<token-from-database>"

curl -X POST http://localhost:3001/api/auth/verify-email \
  -H "Content-Type: application/json" \
  -d "{\"token\": \"$VERIFICATION_TOKEN\"}" | jq
```

**Expected Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "message": "Email verified successfully"
  }
}
```

### Step 3: Login

```bash
# Login to get session cookie
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{
    "email": "owner@testcafe.com",
    "password": "SecureP@ss123!"
  }' | jq
```

**Expected Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "usr_abc123",
      "email": "owner@testcafe.com",
      "emailVerified": true
    },
    "business": {
      "id": "biz_xyz789",
      "name": "Test Cafe",
      "slug": "test-cafe",
      "accountState": "ONBOARDING"
    }
  }
}
```

### Step 4: Get Onboarding Status

```bash
curl -X GET http://localhost:3001/api/onboarding/status \
  -b cookies.txt | jq
```

**Expected Response**:
```json
{
  "success": true,
  "data": {
    "currentStep": "WELCOME",
    "completedSteps": [],
    "posConnected": false,
    "catalogSetup": false,
    "brandingComplete": false,
    "canComplete": false
  }
}
```

### Step 5: POS Connection (Optional - Skip for basic testing)

**Option A: Skip POS Connection**
```bash
curl -X POST http://localhost:3001/api/onboarding/skip-pos \
  -b cookies.txt | jq
```

**Option B: Connect Square (Sandbox)**

For full POS testing, you'll need a Square sandbox account:

1. Get OAuth URL:
```bash
curl -X GET http://localhost:3001/api/square/oauth/url \
  -b cookies.txt | jq
```

2. Complete OAuth flow in browser (sandbox)
3. OAuth callback stores credentials automatically

### Step 6: Catalog Path Selection

Choose how to set up the initial catalog:

**Option A: Use Template** (recommended for testing):
```bash
curl -X POST http://localhost:3001/api/onboarding/catalog-path \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"path": "template"}' | jq
```

**Option B: Start Fresh**:
```bash
curl -X POST http://localhost:3001/api/onboarding/catalog-path \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"path": "scratch"}' | jq
```

**Expected Response**:
```json
{
  "success": true,
  "data": {
    "catalogCreated": true,
    "categoriesCount": 4,
    "basesCount": 12,
    "modifiersCount": 18
  }
}
```

### Step 7: Configure Branding

```bash
curl -X PUT http://localhost:3001/api/onboarding/branding \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "primaryColor": "#8B4513",
    "secondaryColor": "#D2B48C",
    "logoUrl": "https://example.com/logo.png"
  }' | jq
```

**Expected Response**:
```json
{
  "success": true,
  "data": {
    "business": {
      "id": "biz_xyz789",
      "primaryColor": "#8B4513",
      "secondaryColor": "#D2B48C",
      "logoUrl": "https://example.com/logo.png"
    }
  }
}
```

### Step 8: Complete Onboarding

```bash
curl -X POST http://localhost:3001/api/onboarding/complete \
  -b cookies.txt | jq
```

**Expected Response**:
```json
{
  "success": true,
  "data": {
    "business": {
      "id": "biz_xyz789",
      "accountState": "SETUP_COMPLETE"
    },
    "message": "Onboarding completed successfully"
  }
}
```

### Step 9: Verify Onboarding Complete

```bash
# Check account state
curl -X GET http://localhost:3001/api/auth/me \
  -b cookies.txt | jq '.data.business.accountState'
# Expected: "SETUP_COMPLETE"

# Check catalog exists
curl -X GET "http://localhost:3001/api/catalog/categories?businessId=$BUSINESS_ID" \
  -b cookies.txt | jq '.data | length'
# Expected: 4 (if using template)
```

### Onboarding Flow Summary Checklist

- [ ] Registration creates user and business
- [ ] Email verification works
- [ ] Login returns session cookie
- [ ] Onboarding status shows correct step
- [ ] Catalog path creates template items
- [ ] Branding updates business settings
- [ ] Complete transitions to SETUP_COMPLETE
- [ ] All catalog items accessible

---

## E2E Flow: Menu Management

This flow tests creating, updating, and organizing menu items as a business owner.

### Prerequisites

- Completed onboarding flow (logged in as business owner)
- Business ID saved as `$BUSINESS_ID`
- Session cookie saved in `cookies.txt`

### Step 1: View Current Catalog

```bash
# Get all categories
curl -X GET "http://localhost:3001/api/catalog/categories?businessId=$BUSINESS_ID" \
  -b cookies.txt | jq
```

**Expected Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "cat_001",
      "name": "Hot Coffee",
      "displayOrder": 0,
      "bases": [...]
    },
    {
      "id": "cat_002",
      "name": "Iced Coffee",
      "displayOrder": 1,
      "bases": [...]
    }
  ]
}
```

### Step 2: Create New Category

```bash
curl -X POST http://localhost:3001/api/catalog/categories \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d "{
    \"businessId\": \"$BUSINESS_ID\",
    \"name\": \"Seasonal Specials\",
    \"displayOrder\": 10
  }" | jq
```

**Expected Response** (201 Created):
```json
{
  "success": true,
  "data": {
    "id": "cat_new123",
    "businessId": "biz_xyz789",
    "name": "Seasonal Specials",
    "displayOrder": 10
  }
}
```

```bash
CATEGORY_ID="cat_new123"
```

### Step 3: Create New Base Drink

```bash
curl -X POST http://localhost:3001/api/catalog/bases \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d "{
    \"businessId\": \"$BUSINESS_ID\",
    \"categoryId\": \"$CATEGORY_ID\",
    \"name\": \"Pumpkin Spice Latte\",
    \"description\": \"Fall favorite with real pumpkin and spices\",
    \"basePrice\": 5.99,
    \"smallPrice\": 4.99,
    \"largePrice\": 6.99,
    \"isHotOnly\": false,
    \"isColdOnly\": false
  }" | jq
```

**Expected Response** (201 Created):
```json
{
  "success": true,
  "data": {
    "id": "base_psl123",
    "businessId": "biz_xyz789",
    "categoryId": "cat_new123",
    "name": "Pumpkin Spice Latte",
    "description": "Fall favorite with real pumpkin and spices",
    "basePrice": 5.99,
    "smallPrice": 4.99,
    "largePrice": 6.99
  }
}
```

```bash
BASE_ID="base_psl123"
```

### Step 4: Create Modifiers

```bash
# Create a syrup modifier
curl -X POST http://localhost:3001/api/catalog/modifiers \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d "{
    \"businessId\": \"$BUSINESS_ID\",
    \"name\": \"Extra Pumpkin Spice\",
    \"type\": \"SYRUP\",
    \"price\": 0.75
  }" | jq

# Create a milk modifier
curl -X POST http://localhost:3001/api/catalog/modifiers \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d "{
    \"businessId\": \"$BUSINESS_ID\",
    \"name\": \"Coconut Milk\",
    \"type\": \"MILK\",
    \"price\": 0.80
  }" | jq

# Create a topping modifier
curl -X POST http://localhost:3001/api/catalog/modifiers \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d "{
    \"businessId\": \"$BUSINESS_ID\",
    \"name\": \"Whipped Cream\",
    \"type\": \"TOPPING\",
    \"price\": 0.50
  }" | jq
```

### Step 5: Update Existing Item

```bash
curl -X PUT "http://localhost:3001/api/catalog/bases/$BASE_ID" \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "name": "Pumpkin Spice Latte (Limited Time!)",
    "basePrice": 6.49,
    "smallPrice": 5.49,
    "largePrice": 7.49
  }' | jq
```

**Expected Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "id": "base_psl123",
    "name": "Pumpkin Spice Latte (Limited Time!)",
    "basePrice": 6.49,
    "smallPrice": 5.49,
    "largePrice": 7.49
  }
}
```

### Step 6: Create Preset (Pre-configured Drink)

Presets are pre-configured drinks with specific modifiers already selected:

```bash
# Get modifier IDs first
MODIFIERS=$(curl -s -X GET "http://localhost:3001/api/catalog/modifiers?businessId=$BUSINESS_ID" \
  -b cookies.txt | jq -r '.data')
PUMPKIN_MODIFIER_ID=$(echo $MODIFIERS | jq -r '.[] | select(.name | contains("Pumpkin")) | .id')

curl -X POST http://localhost:3001/api/catalog/presets \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d "{
    \"businessId\": \"$BUSINESS_ID\",
    \"baseId\": \"$BASE_ID\",
    \"name\": \"Classic PSL\",
    \"description\": \"Our recommended pumpkin spice configuration\",
    \"size\": \"MEDIUM\",
    \"temperature\": \"HOT\",
    \"modifierIds\": [\"$PUMPKIN_MODIFIER_ID\"]
  }" | jq
```

### Step 7: Reorder Categories

```bash
curl -X PUT http://localhost:3001/api/catalog/categories/reorder \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d "{
    \"businessId\": \"$BUSINESS_ID\",
    \"categoryOrder\": [\"$CATEGORY_ID\", \"cat_001\", \"cat_002\"]
  }" | jq
```

### Step 8: Delete Item

```bash
# Delete a modifier
curl -X DELETE "http://localhost:3001/api/catalog/modifiers/$MODIFIER_ID" \
  -b cookies.txt | jq
```

**Expected Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "message": "Modifier deleted successfully"
  }
}
```

### Step 9: POS Sync (If Connected)

```bash
# Check sync status
curl -X GET "http://localhost:3001/api/pos/sync/status?businessId=$BUSINESS_ID" \
  -b cookies.txt | jq

# Trigger sync to POS
curl -X POST "http://localhost:3001/api/pos/sync/push?businessId=$BUSINESS_ID" \
  -b cookies.txt | jq

# Pull changes from POS
curl -X POST "http://localhost:3001/api/pos/sync/pull?businessId=$BUSINESS_ID" \
  -b cookies.txt | jq
```

### Menu Management Checklist

- [ ] View all categories and items
- [ ] Create new category
- [ ] Create base drink with pricing tiers
- [ ] Create modifiers of each type (MILK, SYRUP, TOPPING)
- [ ] Update existing item pricing
- [ ] Create preset drink
- [ ] Reorder categories
- [ ] Delete item without breaking relationships
- [ ] POS sync reflects local changes (if connected)

---

## E2E Flow: Customer Ordering

This flow tests the customer experience from visiting a storefront to receiving order confirmation.

### Prerequisites

- Business with completed onboarding and catalog
- Business slug: `$BUSINESS_SLUG` (e.g., "test-cafe")

### Step 1: Access Storefront (API)

Customers access the storefront via subdomain. For API testing:

```bash
# Get business info by slug
curl -X GET "http://localhost:3001/api/business/by-slug/$BUSINESS_SLUG" | jq
```

**Expected Response**:
```json
{
  "success": true,
  "data": {
    "id": "biz_xyz789",
    "name": "Test Cafe",
    "slug": "test-cafe",
    "primaryColor": "#8B4513",
    "secondaryColor": "#D2B48C",
    "logoUrl": "https://example.com/logo.png",
    "accountState": "ACTIVE",
    "storefrontEnabled": true
  }
}
```

### Step 2: Check Storefront Status

```bash
curl -X GET "http://localhost:3001/api/business/$BUSINESS_ID/storefront-status" | jq
```

**Expected Response** (storefront enabled):
```json
{
  "success": true,
  "data": {
    "enabled": true,
    "reason": null
  }
}
```

**Expected Response** (storefront disabled):
```json
{
  "success": true,
  "data": {
    "enabled": false,
    "reason": "SUBSCRIPTION_SUSPENDED"
  }
}
```

### Step 3: Load Catalog (Customer View)

```bash
# Get categories with bases
curl -X GET "http://localhost:3001/api/storefront/$BUSINESS_ID/catalog" | jq
```

**Expected Response**:
```json
{
  "success": true,
  "data": {
    "categories": [
      {
        "id": "cat_001",
        "name": "Hot Coffee",
        "bases": [
          {
            "id": "base_001",
            "name": "Espresso",
            "description": "Rich, bold espresso",
            "basePrice": 3.99,
            "smallPrice": 2.99,
            "largePrice": 4.99,
            "isHotOnly": false,
            "isColdOnly": false
          }
        ]
      }
    ],
    "modifiers": [
      {
        "id": "mod_001",
        "name": "Oat Milk",
        "type": "MILK",
        "price": 0.75
      }
    ]
  }
}
```

### Step 4: Build Order

Build order data structure (done client-side, shown here for reference):

```javascript
const order = {
  businessId: "biz_xyz789",
  customerName: "John Doe",
  customerEmail: "john@example.com",  // Optional
  customerPhone: "555-123-4567",      // Optional
  items: [
    {
      baseId: "base_001",
      name: "Espresso",
      size: "MEDIUM",
      temperature: "HOT",
      quantity: 1,
      unitPrice: 3.99,
      modifiers: [
        { id: "mod_001", name: "Oat Milk", price: 0.75 }
      ]
    },
    {
      baseId: "base_psl123",
      name: "Pumpkin Spice Latte",
      size: "LARGE",
      temperature: "ICED",
      quantity: 2,
      unitPrice: 6.99,
      modifiers: [
        { id: "mod_pumpkin", name: "Extra Pumpkin Spice", price: 0.75 },
        { id: "mod_whip", name: "Whipped Cream", price: 0.50 }
      ]
    }
  ]
};
```

### Step 5: Submit Order

```bash
curl -X POST http://localhost:3001/api/orders \
  -H "Content-Type: application/json" \
  -d '{
    "businessId": "biz_xyz789",
    "customerName": "John Doe",
    "customerEmail": "john@example.com",
    "items": [
      {
        "baseId": "base_001",
        "name": "Espresso",
        "size": "MEDIUM",
        "temperature": "HOT",
        "quantity": 1,
        "unitPrice": 3.99,
        "modifiers": [
          {"id": "mod_001", "name": "Oat Milk", "price": 0.75}
        ]
      },
      {
        "baseId": "base_psl123",
        "name": "Pumpkin Spice Latte",
        "size": "LARGE",
        "temperature": "ICED",
        "quantity": 2,
        "unitPrice": 6.99,
        "modifiers": [
          {"id": "mod_pumpkin", "name": "Extra Pumpkin Spice", "price": 0.75},
          {"id": "mod_whip", "name": "Whipped Cream", "price": 0.50}
        ]
      }
    ]
  }' | jq
```

**Expected Response** (201 Created):
```json
{
  "success": true,
  "data": {
    "order": {
      "id": "ord_abc123",
      "orderNumber": "TC-0001",
      "pickupCode": "A7B3",
      "status": "PENDING",
      "total": 21.21,
      "items": [
        {
          "id": "item_001",
          "name": "Espresso",
          "size": "MEDIUM",
          "temperature": "HOT",
          "quantity": 1,
          "unitPrice": 4.74,
          "modifiers": ["Oat Milk"]
        },
        {
          "id": "item_002",
          "name": "Pumpkin Spice Latte",
          "size": "LARGE",
          "temperature": "ICED",
          "quantity": 2,
          "unitPrice": 8.24,
          "modifiers": ["Extra Pumpkin Spice", "Whipped Cream"]
        }
      ],
      "createdAt": "2024-01-15T10:30:00.000Z"
    },
    "paymentLink": "https://squareup.com/pay/..."  // If POS connected
  }
}
```

```bash
ORDER_ID="ord_abc123"
```

### Step 6: Check Order Status

```bash
curl -X GET "http://localhost:3001/api/orders/$ORDER_ID/status" | jq
```

**Expected Response**:
```json
{
  "success": true,
  "data": {
    "orderId": "ord_abc123",
    "status": "PENDING",
    "pickupCode": "A7B3",
    "estimatedReadyTime": null
  }
}
```

### Step 7: Track Order Status Updates

Orders go through these statuses:
1. `PENDING` - Order received, awaiting confirmation
2. `CONFIRMED` - Order confirmed by business
3. `PREPARING` - Order being made
4. `READY` - Ready for pickup
5. `COMPLETED` - Picked up
6. `CANCELLED` - Order cancelled

**Poll for status changes** (customer would do this):
```bash
# Check every 5 seconds
while true; do
  STATUS=$(curl -s "http://localhost:3001/api/orders/$ORDER_ID/status" | jq -r '.data.status')
  echo "Current status: $STATUS"
  if [ "$STATUS" == "READY" ] || [ "$STATUS" == "COMPLETED" ]; then
    break
  fi
  sleep 5
done
```

### Step 8: Business Confirms Order

As the business owner (with session cookie):

```bash
curl -X PUT "http://localhost:3001/api/orders/$ORDER_ID/status" \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"status": "CONFIRMED"}' | jq
```

### Step 9: Order Progresses to Ready

```bash
# Business marks as preparing
curl -X PUT "http://localhost:3001/api/orders/$ORDER_ID/status" \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"status": "PREPARING"}' | jq

# Business marks as ready
curl -X PUT "http://localhost:3001/api/orders/$ORDER_ID/status" \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"status": "READY"}' | jq
```

### Step 10: Complete Order

```bash
curl -X PUT "http://localhost:3001/api/orders/$ORDER_ID/status" \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"status": "COMPLETED"}' | jq
```

### Customer Ordering Checklist

- [ ] Storefront accessible via business slug
- [ ] Storefront status check works
- [ ] Catalog loads with categories, bases, modifiers
- [ ] Order submission creates order with pickup code
- [ ] Order total calculated correctly
- [ ] Order status tracking works
- [ ] Business can update order status
- [ ] Order flows through all statuses correctly
- [ ] Payment link generated (if POS connected)

---

## E2E Flow: Subscription Lifecycle

This flow tests subscription management and its effects on storefront access.

### Prerequisites

- Business with completed onboarding
- Square sandbox for payment testing

### Step 1: View Subscription Plans

```bash
curl -X GET http://localhost:3001/api/subscriptions/plans | jq
```

**Expected Response**:
```json
{
  "success": true,
  "data": {
    "plans": [
      {
        "id": "plan_basic",
        "name": "Basic",
        "price": 29.99,
        "interval": "MONTHLY",
        "features": ["Storefront", "Basic analytics"]
      },
      {
        "id": "plan_pro",
        "name": "Professional",
        "price": 79.99,
        "interval": "MONTHLY",
        "features": ["Storefront", "Advanced analytics", "POS integration"]
      }
    ]
  }
}
```

### Step 2: Start Subscription

```bash
curl -X POST http://localhost:3001/api/subscriptions/create \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "businessId": "biz_xyz789",
    "planId": "plan_basic",
    "paymentNonce": "cnon:card-nonce-ok"
  }' | jq
```

**Expected Response**:
```json
{
  "success": true,
  "data": {
    "subscription": {
      "id": "sub_123",
      "planId": "plan_basic",
      "status": "ACTIVE",
      "currentPeriodStart": "2024-01-15T00:00:00.000Z",
      "currentPeriodEnd": "2024-02-15T00:00:00.000Z"
    },
    "business": {
      "accountState": "ACTIVE"
    }
  }
}
```

### Step 3: Verify Storefront Enabled

```bash
curl -X GET "http://localhost:3001/api/business/$BUSINESS_ID/storefront-status" | jq
```

**Expected Response**:
```json
{
  "success": true,
  "data": {
    "enabled": true,
    "reason": null
  }
}
```

### Step 4: Simulate Payment Failure (Testing)

In a real scenario, Square sends a webhook. For testing:

```bash
# Simulate webhook (requires webhook endpoint)
curl -X POST http://localhost:3001/api/webhooks/square/subscription \
  -H "Content-Type: application/json" \
  -H "x-square-signature: test-signature" \
  -d '{
    "type": "subscription.updated",
    "data": {
      "object": {
        "subscription": {
          "id": "sub_123",
          "status": "DELINQUENT"
        }
      }
    }
  }'
```

### Step 5: Check Grace Period

```bash
curl -X GET "http://localhost:3001/api/subscriptions/$BUSINESS_ID/status" \
  -b cookies.txt | jq
```

**Expected Response** (during grace period):
```json
{
  "success": true,
  "data": {
    "status": "DELINQUENT",
    "inGracePeriod": true,
    "gracePeriodEndsAt": "2024-01-22T00:00:00.000Z",
    "storefrontEnabled": true
  }
}
```

### Step 6: Verify Storefront Still Works (Grace Period)

```bash
# Storefront should still be accessible
curl -X GET "http://localhost:3001/api/business/$BUSINESS_ID/storefront-status" | jq
# Expected: enabled: true (grace period)
```

### Step 7: Simulate Grace Period Expiration

After grace period expires (in testing, you can adjust database):

```bash
# Check status after grace period
curl -X GET "http://localhost:3001/api/business/$BUSINESS_ID/storefront-status" | jq
```

**Expected Response** (grace period expired):
```json
{
  "success": true,
  "data": {
    "enabled": false,
    "reason": "SUBSCRIPTION_SUSPENDED"
  }
}
```

### Step 8: Customer Sees Coming Soon Page

When storefront is disabled, customers see a "Coming Soon" page:

```bash
curl -X GET "http://localhost:3001/api/storefront/$BUSINESS_ID/catalog" | jq
```

**Expected Response**:
```json
{
  "success": false,
  "error": {
    "code": "STOREFRONT_DISABLED",
    "message": "This storefront is currently unavailable"
  }
}
```

### Step 9: Reactivate Subscription

```bash
curl -X POST http://localhost:3001/api/subscriptions/reactivate \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "businessId": "biz_xyz789",
    "paymentNonce": "cnon:card-nonce-ok"
  }' | jq
```

**Expected Response**:
```json
{
  "success": true,
  "data": {
    "subscription": {
      "status": "ACTIVE"
    },
    "business": {
      "accountState": "ACTIVE"
    }
  }
}
```

### Step 10: Cancel Subscription

```bash
curl -X POST "http://localhost:3001/api/subscriptions/$BUSINESS_ID/cancel" \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"reason": "Testing cancellation"}' | jq
```

**Expected Response**:
```json
{
  "success": true,
  "data": {
    "subscription": {
      "status": "CANCELED",
      "canceledAt": "2024-01-15T10:30:00.000Z",
      "endsAt": "2024-02-15T00:00:00.000Z"
    },
    "message": "Subscription will remain active until end of billing period"
  }
}
```

### Subscription Lifecycle Checklist

- [ ] View available plans
- [ ] Create subscription with payment
- [ ] Account state transitions to ACTIVE
- [ ] Storefront enabled after subscription
- [ ] Grace period activates on payment failure
- [ ] Storefront works during grace period
- [ ] Storefront disabled after grace period
- [ ] Customers see Coming Soon page
- [ ] Reactivation restores access
- [ ] Cancellation scheduled correctly

---

## Automated E2E Scripts

Save these scripts to automate E2E testing:

### `scripts/e2e-onboarding.sh`

```bash
#!/bin/bash
set -e

API_URL="${API_URL:-http://localhost:3001}"
TIMESTAMP=$(date +%s)
EMAIL="e2e-test-$TIMESTAMP@test.com"

echo "=== E2E Onboarding Test ==="
echo "API URL: $API_URL"
echo "Test Email: $EMAIL"

# Step 1: Register
echo -e "\n>>> Step 1: Register"
SIGNUP_RESPONSE=$(curl -s -X POST "$API_URL/api/auth/signup" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$EMAIL\",
    \"password\": \"SecureP@ss123!\",
    \"businessName\": \"E2E Test Cafe $TIMESTAMP\"
  }")

echo "$SIGNUP_RESPONSE" | jq

USER_ID=$(echo "$SIGNUP_RESPONSE" | jq -r '.data.user.id')
BUSINESS_ID=$(echo "$SIGNUP_RESPONSE" | jq -r '.data.business.id')

if [ "$USER_ID" == "null" ]; then
  echo "ERROR: Registration failed"
  exit 1
fi

echo "User ID: $USER_ID"
echo "Business ID: $BUSINESS_ID"

# Step 2: Login
echo -e "\n>>> Step 2: Login"
curl -s -X POST "$API_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -c /tmp/e2e-cookies.txt \
  -d "{
    \"email\": \"$EMAIL\",
    \"password\": \"SecureP@ss123!\"
  }" | jq

# Step 3: Skip POS
echo -e "\n>>> Step 3: Skip POS Connection"
curl -s -X POST "$API_URL/api/onboarding/skip-pos" \
  -b /tmp/e2e-cookies.txt | jq

# Step 4: Use Template
echo -e "\n>>> Step 4: Catalog from Template"
curl -s -X POST "$API_URL/api/onboarding/catalog-path" \
  -H "Content-Type: application/json" \
  -b /tmp/e2e-cookies.txt \
  -d '{"path": "template"}' | jq

# Step 5: Set Branding
echo -e "\n>>> Step 5: Configure Branding"
curl -s -X PUT "$API_URL/api/onboarding/branding" \
  -H "Content-Type: application/json" \
  -b /tmp/e2e-cookies.txt \
  -d '{
    "primaryColor": "#FF5733",
    "secondaryColor": "#C4C4C4"
  }' | jq

# Step 6: Complete
echo -e "\n>>> Step 6: Complete Onboarding"
COMPLETE_RESPONSE=$(curl -s -X POST "$API_URL/api/onboarding/complete" \
  -b /tmp/e2e-cookies.txt)

echo "$COMPLETE_RESPONSE" | jq

ACCOUNT_STATE=$(echo "$COMPLETE_RESPONSE" | jq -r '.data.business.accountState')

if [ "$ACCOUNT_STATE" == "SETUP_COMPLETE" ]; then
  echo -e "\n✅ E2E Onboarding PASSED"
  echo "Business ID: $BUSINESS_ID"
  echo "Account State: $ACCOUNT_STATE"
else
  echo -e "\n❌ E2E Onboarding FAILED"
  echo "Expected: SETUP_COMPLETE, Got: $ACCOUNT_STATE"
  exit 1
fi

# Cleanup
rm -f /tmp/e2e-cookies.txt
```

### `scripts/e2e-order.sh`

```bash
#!/bin/bash
set -e

API_URL="${API_URL:-http://localhost:3001}"
BUSINESS_ID="${BUSINESS_ID:-}"

if [ -z "$BUSINESS_ID" ]; then
  echo "ERROR: BUSINESS_ID required"
  echo "Usage: BUSINESS_ID=biz_xxx ./scripts/e2e-order.sh"
  exit 1
fi

echo "=== E2E Order Test ==="
echo "API URL: $API_URL"
echo "Business ID: $BUSINESS_ID"

# Step 1: Get Catalog
echo -e "\n>>> Step 1: Load Catalog"
CATALOG=$(curl -s -X GET "$API_URL/api/storefront/$BUSINESS_ID/catalog")
echo "$CATALOG" | jq '.data.categories | length'

BASE_ID=$(echo "$CATALOG" | jq -r '.data.categories[0].bases[0].id')
echo "Using Base ID: $BASE_ID"

if [ "$BASE_ID" == "null" ]; then
  echo "ERROR: No bases in catalog"
  exit 1
fi

# Step 2: Submit Order
echo -e "\n>>> Step 2: Submit Order"
ORDER_RESPONSE=$(curl -s -X POST "$API_URL/api/orders" \
  -H "Content-Type: application/json" \
  -d "{
    \"businessId\": \"$BUSINESS_ID\",
    \"customerName\": \"E2E Test Customer\",
    \"items\": [
      {
        \"baseId\": \"$BASE_ID\",
        \"name\": \"Test Drink\",
        \"size\": \"MEDIUM\",
        \"temperature\": \"HOT\",
        \"quantity\": 1,
        \"unitPrice\": 3.99,
        \"modifiers\": []
      }
    ]
  }")

echo "$ORDER_RESPONSE" | jq

ORDER_ID=$(echo "$ORDER_RESPONSE" | jq -r '.data.order.id')
PICKUP_CODE=$(echo "$ORDER_RESPONSE" | jq -r '.data.order.pickupCode')

if [ "$ORDER_ID" == "null" ]; then
  echo "ERROR: Order creation failed"
  exit 1
fi

echo "Order ID: $ORDER_ID"
echo "Pickup Code: $PICKUP_CODE"

# Step 3: Check Status
echo -e "\n>>> Step 3: Check Order Status"
STATUS_RESPONSE=$(curl -s -X GET "$API_URL/api/orders/$ORDER_ID/status")
echo "$STATUS_RESPONSE" | jq

ORDER_STATUS=$(echo "$STATUS_RESPONSE" | jq -r '.data.status')

if [ "$ORDER_STATUS" == "PENDING" ]; then
  echo -e "\n✅ E2E Order Test PASSED"
  echo "Order ID: $ORDER_ID"
  echo "Status: $ORDER_STATUS"
  echo "Pickup Code: $PICKUP_CODE"
else
  echo -e "\n❌ E2E Order Test FAILED"
  echo "Expected: PENDING, Got: $ORDER_STATUS"
  exit 1
fi
```

### `scripts/e2e-full.sh`

```bash
#!/bin/bash
set -e

API_URL="${API_URL:-http://localhost:3001}"

echo "========================================"
echo "         FULL E2E TEST SUITE           "
echo "========================================"
echo "API URL: $API_URL"
echo ""

# Wait for API to be ready
echo ">>> Waiting for API..."
for i in {1..30}; do
  if curl -s "$API_URL/health" > /dev/null 2>&1; then
    echo "API is ready!"
    break
  fi
  sleep 1
  if [ $i -eq 30 ]; then
    echo "ERROR: API not responding"
    exit 1
  fi
done

# Run onboarding test
echo -e "\n========================================"
echo "         1. ONBOARDING TEST             "
echo "========================================"
source ./scripts/e2e-onboarding.sh
ONBOARD_BUSINESS_ID=$BUSINESS_ID

# Run order test with the new business
echo -e "\n========================================"
echo "         2. ORDER TEST                  "
echo "========================================"
BUSINESS_ID=$ONBOARD_BUSINESS_ID ./scripts/e2e-order.sh

echo -e "\n========================================"
echo "       ALL E2E TESTS PASSED ✅          "
echo "========================================"
```

### Running Automated Tests

```bash
# Make scripts executable
chmod +x scripts/e2e-*.sh

# Run with Docker
docker-compose -f docker-compose.test.yml up -d
API_URL=http://localhost:3001 ./scripts/e2e-full.sh

# Run with local dev
./scripts/e2e-full.sh
```

---

## Troubleshooting

### Common Issues

#### 1. API Not Responding

```bash
# Check if API is running
curl http://localhost:3001/health

# Check Docker logs
docker-compose -f docker-compose.test.yml logs api-test

# Restart services
docker-compose -f docker-compose.test.yml restart
```

#### 2. Database Connection Failed

```bash
# Check database is running
docker-compose -f docker-compose.test.yml ps db-test

# Verify connection string
docker exec drink-ux-api-test printenv DATABASE_URL

# Run migrations manually
docker exec drink-ux-api-test npx prisma migrate deploy
```

#### 3. Session Cookie Not Working

```bash
# Verify cookie is being set
curl -v -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{"email": "...", "password": "..."}'

# Check cookie file
cat cookies.txt

# Ensure proper cookie header
curl -X GET http://localhost:3001/api/auth/me \
  -b cookies.txt -v
```

#### 4. CORS Issues (Browser Testing)

```bash
# Verify CORS origin
docker exec drink-ux-api-test printenv CORS_ORIGIN

# For testing, set to allow all
CORS_ORIGIN="*" npm run dev
```

#### 5. Square Sandbox Issues

- Verify sandbox credentials in Square Dashboard
- Check webhook URL is accessible (use ngrok for local)
- Test nonces: `cnon:card-nonce-ok` for success, `cnon:card-nonce-declined` for failure

### Debug Mode

Enable verbose logging:

```bash
# API debug mode
DEBUG=* npm run dev

# Prisma query logging
DEBUG=prisma:query npm run dev
```

### Test Database Reset

```bash
# Complete reset
docker-compose -f docker-compose.test.yml down -v
docker-compose -f docker-compose.test.yml up -d --build

# Quick reset (keeps volumes)
docker exec drink-ux-db-test psql -U drinkux_test -d drinkux_test -c "
  DELETE FROM order_items;
  DELETE FROM orders;
  DELETE FROM sync_history;
  DELETE FROM preset_modifiers;
  DELETE FROM presets;
  DELETE FROM modifiers;
  DELETE FROM bases;
  DELETE FROM categories;
  DELETE FROM sessions;
  DELETE FROM subscriptions;
  DELETE FROM businesses;
  DELETE FROM users;
"
```

---

## Quick Reference

### API Endpoints Summary

| Flow | Endpoint | Method |
|------|----------|--------|
| Register | `/api/auth/signup` | POST |
| Login | `/api/auth/login` | POST |
| Current User | `/api/auth/me` | GET |
| Onboarding Status | `/api/onboarding/status` | GET |
| Complete Onboarding | `/api/onboarding/complete` | POST |
| Get Catalog | `/api/catalog/categories` | GET |
| Create Category | `/api/catalog/categories` | POST |
| Submit Order | `/api/orders` | POST |
| Order Status | `/api/orders/:id/status` | GET |
| Storefront Status | `/api/business/:id/storefront-status` | GET |

### Test Credentials

| Use Case | Email | Password |
|----------|-------|----------|
| Basic test | `test@example.com` | `SecureP@ss123!` |
| E2E test | `e2e-{timestamp}@test.com` | `SecureP@ss123!` |

### Square Sandbox Test Cards

| Card | Number | Result |
|------|--------|--------|
| Visa Success | 4532 0123 4567 8901 | Approved |
| Declined | 4000 0000 0000 0002 | Declined |

### Environment Files

- `.env.test` - Test environment variables
- `docker-compose.test.yml` - Docker test environment
- `cookies.txt` - Session storage for curl testing
