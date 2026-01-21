# drink-ux API Documentation

This document provides comprehensive documentation for the drink-ux REST API.

**Base URL:** `http://localhost:3001` (development)

## Table of Contents

1. [Authentication](#authentication)
2. [Business](#business)
3. [Catalog](#catalog)
4. [Catalog Sync](#catalog-sync)
5. [Orders](#orders)
6. [POS Integration](#pos-integration)
7. [Subscription](#subscription)
8. [Webhooks](#webhooks)
9. [Account](#account)
10. [Onboarding](#onboarding)
11. [Ejection](#ejection)
12. [Health](#health)
13. [Error Handling](#error-handling)

---

## Response Format

All API responses follow a consistent format:

### Success Response

```json
{
  "success": true,
  "data": { ... }
}
```

### Error Response

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message"
  }
}
```

---

## Authentication

Authentication is handled via HTTP-only session cookies. After successful login, a session cookie named `drink_ux_session` is set automatically.

### POST /api/auth/signup

Create a new user account and business.

**Authentication:** None required

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| email | string | Yes | User's email address |
| password | string | Yes | Password (min 8 chars, requires uppercase, lowercase, number, special char) |
| businessName | string | Yes | Name of the business |

**Example Request:**

```bash
curl -X POST http://localhost:3001/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "owner@coffeeshop.com",
    "password": "SecureP@ss1",
    "businessName": "Joe'\''s Coffee"
  }'
```

**Success Response (201 Created):**

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user-uuid",
      "email": "owner@coffeeshop.com",
      "emailVerified": false,
      "businessId": "business-uuid"
    },
    "business": {
      "id": "business-uuid",
      "name": "Joe's Coffee",
      "slug": "joes-coffee"
    },
    "emailVerificationToken": "token-for-testing"
  }
}
```

**Error Responses:**

| Status | Code | Description |
|--------|------|-------------|
| 400 | EMAIL_EXISTS | Email already registered |
| 400 | INVALID_EMAIL | Invalid email format |
| 400 | WEAK_PASSWORD | Password doesn't meet requirements |

---

### POST /api/auth/login

Authenticate a user and establish a session.

**Authentication:** None required

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| email | string | Yes | User's email address |
| password | string | Yes | User's password |

**Example Request:**

```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{
    "email": "owner@coffeeshop.com",
    "password": "SecureP@ss1"
  }'
```

**Success Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user-uuid",
      "email": "owner@coffeeshop.com",
      "emailVerified": true,
      "businessId": "business-uuid"
    }
  }
}
```

**Note:** Sets `drink_ux_session` cookie with HttpOnly flag.

**Error Responses:**

| Status | Code | Description |
|--------|------|-------------|
| 401 | INVALID_CREDENTIALS | Invalid email or password |

---

### GET /api/auth/me

Get the currently authenticated user.

**Authentication:** Required (session cookie)

**Example Request:**

```bash
curl http://localhost:3001/api/auth/me \
  -b cookies.txt
```

**Success Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user-uuid",
      "email": "owner@coffeeshop.com",
      "emailVerified": true,
      "businessId": "business-uuid"
    }
  }
}
```

**Error Responses:**

| Status | Code | Description |
|--------|------|-------------|
| 401 | UNAUTHORIZED | Authentication required |

---

### POST /api/auth/logout

End the current session.

**Authentication:** Optional (idempotent)

**Example Request:**

```bash
curl -X POST http://localhost:3001/api/auth/logout \
  -b cookies.txt \
  -c cookies.txt
```

**Success Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "message": "Logged out successfully"
  }
}
```

---

### POST /api/auth/forgot-password

Request a password reset token.

**Authentication:** None required

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| email | string | Yes | User's email address |

**Example Request:**

```bash
curl -X POST http://localhost:3001/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email": "owner@coffeeshop.com"}'
```

**Success Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "resetToken": "reset-token-for-testing"
  }
}
```

**Note:** Always returns success to prevent email enumeration attacks.

---

### POST /api/auth/reset-password

Reset password using a token.

**Authentication:** None required

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| token | string | Yes | Reset token from forgot-password |
| newPassword | string | Yes | New password |

**Example Request:**

```bash
curl -X POST http://localhost:3001/api/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{
    "token": "reset-token",
    "newPassword": "NewSecureP@ss2"
  }'
```

**Success Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "message": "Password reset successfully"
  }
}
```

**Error Responses:**

| Status | Code | Description |
|--------|------|-------------|
| 400 | INVALID_TOKEN | Token is invalid or expired |
| 400 | WEAK_PASSWORD | New password doesn't meet requirements |

---

### POST /api/auth/verify-email

Verify email address using a token.

**Authentication:** None required

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| token | string | Yes | Verification token from signup |

**Example Request:**

```bash
curl -X POST http://localhost:3001/api/auth/verify-email \
  -H "Content-Type: application/json" \
  -d '{"token": "verification-token"}'
```

**Success Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "message": "Email verified successfully"
  }
}
```

**Error Responses:**

| Status | Code | Description |
|--------|------|-------------|
| 400 | INVALID_TOKEN | Token is invalid or already used |

---

## Business

Public endpoints for accessing business information and catalog.

### GET /api/business/:slug

Get business configuration by slug.

**Authentication:** None required (public endpoint)

**URL Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| slug | string | Business URL slug |

**Example Request:**

```bash
curl http://localhost:3001/api/business/joes-coffee
```

**Success Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "id": "business-uuid",
    "name": "Joe's Coffee",
    "slug": "joes-coffee",
    "accountState": "ACTIVE",
    "theme": {
      "primaryColor": "#8B4513",
      "secondaryColor": "#D2691E",
      "logoUrl": "https://example.com/logo.png"
    },
    "catalogSummary": {
      "categoryCount": 5,
      "itemCount": 24
    }
  }
}
```

**Error Responses:**

| Status | Code | Description |
|--------|------|-------------|
| 404 | BUSINESS_NOT_FOUND | Business not found or not accessible |

---

### GET /api/business/:slug/catalog

Get full catalog for a business.

**Authentication:** None required (public endpoint)

**URL Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| slug | string | Business URL slug |

**Example Request:**

```bash
curl http://localhost:3001/api/business/joes-coffee/catalog
```

**Success Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "businessId": "business-uuid",
    "categories": [
      {
        "id": "category-uuid",
        "name": "Hot Drinks",
        "displayOrder": 1,
        "color": "#8B4513",
        "icon": "coffee",
        "items": [
          {
            "id": "item-uuid",
            "name": "Espresso",
            "basePrice": 3.99,
            "temperatureConstraint": "BOTH",
            "visualColor": "#3D2314"
          }
        ]
      }
    ]
  }
}
```

---

## Catalog

Endpoints for managing drink catalog (categories, bases, modifiers, presets).

All catalog endpoints require authentication and verify business ownership.

### Categories

#### POST /api/catalog/categories

Create a new category.

**Authentication:** Required

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| businessId | string | Yes | Business ID |
| name | string | Yes | Category name |
| displayOrder | number | No | Sort order |
| color | string | No | Hex color code |
| icon | string | No | Icon identifier |

**Example Request:**

```bash
curl -X POST http://localhost:3001/api/catalog/categories \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "businessId": "business-uuid",
    "name": "Hot Drinks",
    "displayOrder": 1,
    "color": "#8B4513"
  }'
```

**Success Response (201 Created):**

```json
{
  "success": true,
  "data": {
    "id": "category-uuid",
    "businessId": "business-uuid",
    "name": "Hot Drinks",
    "displayOrder": 1,
    "color": "#8B4513",
    "icon": null
  }
}
```

---

#### GET /api/catalog/categories

List categories for a business.

**Authentication:** Required

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| businessId | string | Yes | Business ID |

**Example Request:**

```bash
curl "http://localhost:3001/api/catalog/categories?businessId=business-uuid" \
  -b cookies.txt
```

---

#### GET /api/catalog/categories/:id

Get a category by ID.

**Authentication:** Required

---

#### PUT /api/catalog/categories/:id

Update a category.

**Authentication:** Required

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| name | string | No | Category name |
| displayOrder | number | No | Sort order |
| color | string | No | Hex color code |
| icon | string | No | Icon identifier |

---

#### DELETE /api/catalog/categories/:id

Delete a category.

**Authentication:** Required

---

#### POST /api/catalog/categories/reorder

Reorder categories.

**Authentication:** Required

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| businessId | string | Yes | Business ID |
| categoryIds | string[] | Yes | Ordered list of category IDs |

---

### Bases (Drinks)

#### POST /api/catalog/bases

Create a new base drink.

**Authentication:** Required

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| businessId | string | Yes | Business ID |
| categoryId | string | Yes | Category ID |
| name | string | Yes | Drink name |
| basePrice | number | Yes | Base price |
| temperatureConstraint | string | No | HOT_ONLY, ICED_ONLY, or BOTH |
| visualColor | string | No | Hex color for visualization |
| visualOpacity | number | No | Opacity (0-1) |

---

#### GET /api/catalog/bases

List bases for a business.

**Authentication:** Required

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| businessId | string | Yes | Business ID |
| categoryId | string | No | Filter by category |
| available | boolean | No | Filter by availability |

---

#### GET /api/catalog/bases/:id

Get a base by ID.

**Authentication:** Required

---

#### PUT /api/catalog/bases/:id

Update a base.

**Authentication:** Required

---

#### DELETE /api/catalog/bases/:id

Soft delete a base.

**Authentication:** Required

---

### Modifiers

#### POST /api/catalog/modifiers

Create a new modifier.

**Authentication:** Required

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| businessId | string | Yes | Business ID |
| name | string | Yes | Modifier name |
| type | string | Yes | MILK, SYRUP, TOPPING, or SIZE |
| price | number | Yes | Price |
| visualColor | string | No | Hex color |
| visualLayerOrder | number | No | Layer order for visualization |
| visualAnimationType | string | No | Animation type |

---

#### GET /api/catalog/modifiers

List modifiers for a business.

**Authentication:** Required

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| businessId | string | Yes | Business ID |
| type | string | No | Filter by type |
| available | boolean | No | Filter by availability |

---

#### GET /api/catalog/modifiers/:id

Get a modifier by ID.

**Authentication:** Required

---

#### PUT /api/catalog/modifiers/:id

Update a modifier.

**Authentication:** Required

---

#### DELETE /api/catalog/modifiers/:id

Soft delete a modifier.

**Authentication:** Required

---

### Presets

#### POST /api/catalog/presets

Create a new preset (pre-configured drink).

**Authentication:** Required

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| businessId | string | Yes | Business ID |
| name | string | Yes | Preset name |
| baseId | string | Yes | Base drink ID |
| modifierIds | string[] | No | List of modifier IDs |
| price | number | No | Fixed price (or calculated) |
| defaultSize | string | No | Default size |
| defaultHot | boolean | No | Default temperature |
| imageUrl | string | No | Preset image URL |

---

#### GET /api/catalog/presets

List presets for a business.

**Authentication:** Required

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| businessId | string | Yes | Business ID |
| categoryId | string | No | Filter by category |
| available | boolean | No | Filter by availability |

---

#### GET /api/catalog/presets/:id

Get a preset by ID.

**Authentication:** Required

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| includeModifiers | boolean | No | Include modifier details |

---

#### PUT /api/catalog/presets/:id

Update a preset.

**Authentication:** Required

---

#### DELETE /api/catalog/presets/:id

Soft delete a preset.

**Authentication:** Required

---

#### GET /api/catalog/presets/suggested-price

Calculate suggested price from components.

**Authentication:** Required

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| baseId | string | Yes | Base drink ID |
| modifierIds | string | No | Comma-separated modifier IDs |

---

## Catalog Sync

Endpoints for syncing catalog to POS systems.

### GET /api/catalog/sync/status

Get sync status and pending changes.

**Authentication:** None (should have auth in production)

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| businessId | string | Yes | Business ID |

**Example Request:**

```bash
curl "http://localhost:3001/api/catalog/sync/status?businessId=business-uuid"
```

**Success Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "status": "SYNCED",
    "lastSyncedAt": "2024-01-15T10:30:00.000Z",
    "lastError": null,
    "pendingChanges": 0
  }
}
```

---

### POST /api/catalog/sync

Trigger sync of catalog changes to POS.

**Authentication:** None (should have auth in production)

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| businessId | string | Yes | Business ID |

**Example Request:**

```bash
curl -X POST http://localhost:3001/api/catalog/sync \
  -H "Content-Type: application/json" \
  -d '{"businessId": "business-uuid"}'
```

**Success Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "success": true,
    "itemsCreated": 5,
    "itemsUpdated": 2,
    "itemsDeactivated": 0,
    "modifiersCreated": 10,
    "modifiersUpdated": 1,
    "modifiersDeactivated": 0
  }
}
```

**Error Responses:**

| Status | Code | Description |
|--------|------|-------------|
| 400 | NO_POS_CONNECTION | Business has no POS provider |
| 404 | BUSINESS_NOT_FOUND | Business not found |
| 409 | SYNC_IN_PROGRESS | Sync already in progress |
| 502 | SYNC_FAILED | POS sync failed |

---

### GET /api/catalog/sync/history

Get recent sync history.

**Authentication:** None (should have auth in production)

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| businessId | string | Yes | Business ID |
| limit | number | No | Max results (default: 20, max: 100) |

---

## Orders

Endpoints for order management.

### POST /api/orders

Create a new order (guest checkout).

**Authentication:** None required (guest checkout)

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| businessId | string | Yes | Business ID |
| customerName | string | Yes | Customer name |
| customerPhone | string | No | Customer phone |
| customerEmail | string | No | Customer email |
| items | array | Yes | Order items |
| notes | string | No | Order notes |

**Order Item:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| baseId | string | Yes | Base drink ID |
| quantity | number | Yes | Quantity |
| size | string | Yes | SMALL, MEDIUM, or LARGE |
| temperature | string | Yes | HOT or ICED |
| modifiers | string[] | No | Modifier IDs |
| notes | string | No | Item notes |

**Example Request:**

```bash
curl -X POST http://localhost:3001/api/orders \
  -H "Content-Type: application/json" \
  -d '{
    "businessId": "business-uuid",
    "customerName": "John Doe",
    "customerPhone": "555-1234",
    "items": [
      {
        "baseId": "base-uuid",
        "quantity": 1,
        "size": "MEDIUM",
        "temperature": "HOT",
        "modifiers": ["modifier-uuid-1", "modifier-uuid-2"]
      }
    ]
  }'
```

**Success Response (201 Created):**

```json
{
  "success": true,
  "data": {
    "order": {
      "id": "order-uuid",
      "orderNumber": "ORD-0001",
      "pickupCode": "ABC1",
      "status": "PENDING",
      "items": [...],
      "subtotal": 5.24,
      "tax": 0.42,
      "total": 5.66,
      "customerName": "John Doe",
      "createdAt": "2024-01-15T10:30:00.000Z"
    }
  }
}
```

**Error Responses:**

| Status | Code | Description |
|--------|------|-------------|
| 400 | VALIDATION_ERROR | Missing required fields |
| 400 | BUSINESS_NOT_FOUND | Invalid business ID |
| 400 | BASE_NOT_FOUND | Invalid base ID |

---

### GET /api/orders/:orderId

Get order by ID.

**Authentication:** Required

**Example Request:**

```bash
curl http://localhost:3001/api/orders/order-uuid \
  -b cookies.txt
```

**Error Responses:**

| Status | Code | Description |
|--------|------|-------------|
| 401 | UNAUTHORIZED | Authentication required |
| 404 | NOT_FOUND | Order not found |

---

### GET /api/orders/pickup/:pickupCode

Get order by pickup code (for customers).

**Authentication:** None required

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| businessId | string | Yes | Business ID |

**Example Request:**

```bash
curl "http://localhost:3001/api/orders/pickup/ABC1?businessId=business-uuid"
```

---

### PUT /api/orders/:orderId/status

Update order status.

**Authentication:** Required

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| status | string | Yes | New status |

**Valid Statuses:** PENDING, CONFIRMED, PREPARING, READY, COMPLETED, CANCELLED, FAILED

**Example Request:**

```bash
curl -X PUT http://localhost:3001/api/orders/order-uuid/status \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"status": "CONFIRMED"}'
```

**Error Responses:**

| Status | Code | Description |
|--------|------|-------------|
| 400 | INVALID_STATUS | Invalid status value |
| 404 | NOT_FOUND | Order not found |

---

### POST /api/orders/:orderId/cancel

Cancel an order.

**Authentication:** Required

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| reason | string | No | Cancellation reason |

**Example Request:**

```bash
curl -X POST http://localhost:3001/api/orders/order-uuid/cancel \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"reason": "Customer requested"}'
```

**Error Responses:**

| Status | Code | Description |
|--------|------|-------------|
| 400 | CANNOT_CANCEL | Order cannot be cancelled (e.g., already ready) |
| 404 | NOT_FOUND | Order not found |

---

### POST /api/orders/:orderId/sync

Sync order status from POS.

**Authentication:** Required

**Example Request:**

```bash
curl -X POST http://localhost:3001/api/orders/order-uuid/sync \
  -b cookies.txt
```

**Error Responses:**

| Status | Code | Description |
|--------|------|-------------|
| 400 | NO_POS_ORDER | Order has no POS reference |
| 404 | NOT_FOUND | Order not found |

---

### GET /api/business/:businessId/orders

Get business orders (admin view).

**Authentication:** Required (must own business)

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| status | string | No | Filter by status (comma-separated) |
| limit | number | No | Max results |
| offset | number | No | Pagination offset |

**Example Request:**

```bash
curl "http://localhost:3001/api/business/business-uuid/orders?status=PENDING,CONFIRMED&limit=10" \
  -b cookies.txt
```

**Error Responses:**

| Status | Code | Description |
|--------|------|-------------|
| 403 | FORBIDDEN | Not authorized for this business |

---

## POS Integration

Endpoints for POS (Point of Sale) system integration.

### GET /api/pos/providers

List supported POS providers.

**Authentication:** None required

**Example Request:**

```bash
curl http://localhost:3001/api/pos/providers
```

**Success Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "providers": ["SQUARE", "TOAST", "CLOVER"]
  }
}
```

---

### GET /api/pos/oauth/authorize

Initiate OAuth flow with Square.

**Authentication:** None required

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| businessId | string | Yes | Business ID |

**Example Request:**

```bash
curl "http://localhost:3001/api/pos/oauth/authorize?businessId=business-uuid"
```

**Success Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "authorizationUrl": "https://connect.squareup.com/oauth2/authorize?...",
    "state": "business-uuid"
  }
}
```

---

### GET /api/pos/oauth/callback

Handle OAuth callback from Square.

**Authentication:** None required

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| code | string | Yes | Authorization code |
| state | string | Yes | State (business ID) |
| error | string | No | Error code if auth failed |
| error_description | string | No | Error description |

**Success Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "merchantId": "square-merchant-id",
    "businessId": "business-uuid"
  }
}
```

**Error Responses:**

| Status | Code | Description |
|--------|------|-------------|
| 400 | OAUTH_ERROR | User denied access |
| 400 | MISSING_CODE | Missing authorization code |
| 500 | TOKEN_EXCHANGE_FAILED | Failed to exchange code for tokens |

---

## Subscription

Endpoints for subscription management.

### GET /api/subscription

Get current subscription status.

**Authentication:** Required

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| businessId | string | Yes | Business ID |

**Example Request:**

```bash
curl "http://localhost:3001/api/subscription?businessId=business-uuid" \
  -b cookies.txt
```

**Success Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "status": "active",
    "planId": "pro-monthly",
    "subscriptionId": "sub-123",
    "currentPeriodEnd": "2024-02-15T00:00:00.000Z"
  }
}
```

---

### POST /api/subscription/checkout

Create checkout session for subscription.

**Authentication:** Required

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| businessId | string | Yes | Business ID |
| planId | string | Yes | Plan ID (pro-monthly or pro-annual) |

**Example Request:**

```bash
curl -X POST http://localhost:3001/api/subscription/checkout \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "businessId": "business-uuid",
    "planId": "pro-monthly"
  }'
```

**Success Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "sessionId": "cs_123...",
    "checkoutUrl": "/checkout?session=cs_123..."
  }
}
```

**Error Responses:**

| Status | Code | Description |
|--------|------|-------------|
| 400 | INVALID_PLAN | Invalid plan ID |
| 400 | ALREADY_SUBSCRIBED | Already has active subscription |

---

### POST /api/subscription/cancel

Cancel subscription.

**Authentication:** Required

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| businessId | string | Yes | Business ID |
| immediate | boolean | No | Cancel immediately vs end of period |

**Success Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "canceledAt": "2024-01-15T10:30:00.000Z",
    "effectiveAt": "2024-02-15T00:00:00.000Z"
  }
}
```

**Error Responses:**

| Status | Code | Description |
|--------|------|-------------|
| 400 | ALREADY_CANCELLED | Subscription already cancelled |
| 400 | NO_ACTIVE_SUBSCRIPTION | No subscription to cancel |

---

### POST /api/subscription/pause

Pause subscription.

**Authentication:** Required

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| businessId | string | Yes | Business ID |
| durationDays | number | No | Pause duration in days |

**Success Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "status": "paused",
    "pausedAt": "2024-01-15T10:30:00.000Z",
    "resumeAt": "2024-02-15T10:30:00.000Z"
  }
}
```

**Error Responses:**

| Status | Code | Description |
|--------|------|-------------|
| 400 | CANNOT_PAUSE | Only active subscriptions can be paused |

---

### POST /api/subscription/resume

Resume paused subscription.

**Authentication:** Required

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| businessId | string | Yes | Business ID |

**Success Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "status": "active",
    "resumedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

**Error Responses:**

| Status | Code | Description |
|--------|------|-------------|
| 400 | NOT_PAUSED | Subscription is not paused |
| 402 | PAYMENT_REQUIRED | Payment method update required |

---

### GET /api/subscription/plans

List available subscription plans.

**Authentication:** None required (public endpoint)

**Example Request:**

```bash
curl http://localhost:3001/api/subscription/plans
```

**Success Response (200 OK):**

```json
{
  "success": true,
  "data": [
    {
      "id": "pro-monthly",
      "name": "Pro Monthly",
      "price": 49,
      "interval": "monthly",
      "features": [
        "Unlimited orders",
        "Custom branding",
        "POS integration",
        "Analytics dashboard",
        "Priority support"
      ]
    },
    {
      "id": "pro-annual",
      "name": "Pro Annual",
      "price": 470,
      "interval": "annual",
      "features": [
        "Unlimited orders",
        "Custom branding",
        "POS integration",
        "Analytics dashboard",
        "Priority support",
        "2 months free"
      ]
    }
  ]
}
```

---

## Webhooks

Endpoints for receiving webhook events from external services.

### POST /webhooks/square/subscription

Receive Square subscription webhook events.

**Authentication:** Signature verification via `x-square-hmacsha256-signature` header

**Headers:**

| Header | Required | Description |
|--------|----------|-------------|
| x-square-hmacsha256-signature | Yes | HMAC-SHA256 signature |
| Content-Type | Yes | application/json |

**Supported Event Types:**

- `subscription.created`
- `subscription.updated`
- `subscription.canceled`
- `invoice.payment_made`
- `invoice.payment_failed`

**Example Request:**

```bash
curl -X POST http://localhost:3001/webhooks/square/subscription \
  -H "Content-Type: application/json" \
  -H "x-square-hmacsha256-signature: <signature>" \
  -d '{
    "merchant_id": "merchant-123",
    "type": "subscription.created",
    "event_id": "event-123",
    "created_at": "2024-01-15T10:30:00.000Z",
    "data": {
      "type": "subscription",
      "id": "sub-123",
      "object": {...}
    }
  }'
```

**Success Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "success": true,
    "processed": true,
    "message": "Subscription created"
  }
}
```

**Error Responses:**

| Status | Code | Description |
|--------|------|-------------|
| 400 | EMPTY_PAYLOAD | Request body is empty |
| 400 | INVALID_PAYLOAD | Invalid JSON payload |
| 400 | MISSING_FIELDS | Missing required event fields |
| 401 | MISSING_SIGNATURE | Missing signature header |
| 401 | INVALID_SIGNATURE | Signature verification failed |

---

## Account

Endpoints for account management.

### GET /api/account/profile

Get business profile.

**Authentication:** Required

**Example Request:**

```bash
curl http://localhost:3001/api/account/profile \
  -b cookies.txt
```

**Success Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "profile": {
      "id": "business-uuid",
      "name": "Joe's Coffee",
      "slug": "joes-coffee",
      "contactEmail": "contact@joescoffee.com",
      "contactPhone": "555-1234"
    }
  }
}
```

---

### PUT /api/account/profile

Update business profile.

**Authentication:** Required

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| name | string | No | Business name |
| contactEmail | string | No | Contact email |
| contactPhone | string | No | Contact phone |

---

### PUT /api/account/slug

Update business slug.

**Authentication:** Required

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| slug | string | Yes | New URL slug |

**Error Responses:**

| Status | Code | Description |
|--------|------|-------------|
| 400 | INVALID_SLUG | Invalid slug format |
| 400 | RESERVED_SLUG | Slug is reserved |
| 400 | SLUG_TAKEN | Slug already in use |

---

### GET /api/account/slug/available

Check if slug is available.

**Authentication:** Required

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| slug | string | Yes | Slug to check |

**Success Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "available": true
  }
}
```

---

### GET /api/account/branding

Get business branding/theme.

**Authentication:** Required

---

### PUT /api/account/branding

Update business branding/theme.

**Authentication:** Required

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| primaryColor | string | No | Primary hex color |
| secondaryColor | string | No | Secondary hex color |
| logoUrl | string | No | Logo URL |

---

### GET /api/account/pos-status

Get POS connection status.

**Authentication:** Required

**Success Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "posStatus": {
      "connected": true,
      "provider": "SQUARE",
      "merchantId": "merchant-123",
      "lastSyncAt": "2024-01-15T10:30:00.000Z"
    }
  }
}
```

---

## Onboarding

Endpoints for the onboarding wizard.

### GET /api/onboarding/status

Get current onboarding status.

**Authentication:** Required (business must be in onboarding state)

**Success Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "currentStep": "PATH_SELECTION",
    "completedSteps": ["WELCOME"],
    "selectedPath": null
  }
}
```

---

### POST /api/onboarding/step/:step

Complete an onboarding step.

**Authentication:** Required

**URL Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| step | string | Step name |

**Valid Steps:** WELCOME, PATH_SELECTION, POS_CONNECT, CATALOG_SETUP, BRANDING, REVIEW

---

### POST /api/onboarding/path

Select catalog setup path.

**Authentication:** Required

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| path | string | Yes | IMPORT, SCRATCH, or TEMPLATE |

---

### GET /api/onboarding/review

Get review summary for final step.

**Authentication:** Required

---

### POST /api/onboarding/complete

Complete the onboarding process.

**Authentication:** Required

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| triggerSync | boolean | No | Trigger POS sync after completion |

---

### POST /api/onboarding/back

Go back to previous step.

**Authentication:** Required

---

### POST /api/onboarding/reset

Reset onboarding to start over.

**Authentication:** Required

---

## Ejection

Endpoints for ejecting (downgrading/pausing) a business.

### GET /api/ejection/check

Check ejection consequences before ejecting.

**Authentication:** Required

**Success Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "activeOrders": 5,
    "catalogItems": 24,
    "posConnected": true,
    "consequences": [
      "Active orders will be preserved but no new orders can be placed",
      "POS sync will be disabled",
      "Public ordering page will be unavailable"
    ]
  }
}
```

---

### POST /api/ejection/eject

Execute ejection for the business.

**Authentication:** Required

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| confirmed | boolean | Yes | Must be true to proceed |
| reason | string | No | Reason for ejecting |

---

### POST /api/ejection/start-over

Reset an ejected business to onboarding state.

**Authentication:** Required

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| confirmed | boolean | Yes | Must be true to proceed |
| clearCatalog | boolean | No | Clear existing catalog |
| clearPOSConnection | boolean | No | Clear POS connection |

---

## Health

Endpoints for monitoring API health.

### GET /health

Simple health check (root level).

**Authentication:** None required

**Example Request:**

```bash
curl http://localhost:3001/health
```

**Success Response (200 OK):**

```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

---

### GET /api/health

Overall health check with service status.

**Authentication:** None required

**Success Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "healthy": true,
    "services": {
      "database": true,
      "pos": true
    },
    "lastChecked": "2024-01-15T10:30:00.000Z"
  }
}
```

**Degraded Response (503 Service Unavailable):**

```json
{
  "success": true,
  "data": {
    "healthy": false,
    "services": {
      "database": true,
      "pos": false
    },
    "lastChecked": "2024-01-15T10:30:00.000Z",
    "message": "POS service unavailable"
  }
}
```

---

### GET /api/health/pos

POS-specific health check.

**Authentication:** None required

**Success Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "pos": true,
    "lastChecked": "2024-01-15T10:30:00.000Z"
  }
}
```

---

### GET /api/health/ready

Kubernetes readiness probe.

**Authentication:** None required

**Success Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "ready": true
  }
}
```

**Not Ready Response (503 Service Unavailable):**

```json
{
  "success": true,
  "data": {
    "ready": false,
    "reason": "Database unavailable"
  }
}
```

---

### GET /api/health/live

Kubernetes liveness probe.

**Authentication:** None required

**Success Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "alive": true,
    "uptime": 3600
  }
}
```

---

## Error Handling

### Common Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| UNAUTHORIZED | 401 | Authentication required |
| FORBIDDEN | 403 | Not authorized for this action |
| NOT_FOUND | 404 | Resource not found |
| VALIDATION_ERROR | 400 | Invalid input data |
| INTERNAL_ERROR | 500 | Unexpected server error |

### Authentication Errors

| Code | HTTP Status | Description |
|------|-------------|-------------|
| INVALID_CREDENTIALS | 401 | Wrong email or password |
| EMAIL_EXISTS | 400 | Email already registered |
| INVALID_EMAIL | 400 | Invalid email format |
| WEAK_PASSWORD | 400 | Password doesn't meet requirements |
| INVALID_TOKEN | 400 | Token is invalid or expired |
| EMAIL_NOT_VERIFIED | 403 | Email verification required |

### Business Errors

| Code | HTTP Status | Description |
|------|-------------|-------------|
| BUSINESS_NOT_FOUND | 404 | Business not found |
| NO_BUSINESS | 404 | No business for user |
| SLUG_TAKEN | 400 | Slug already in use |
| RESERVED_SLUG | 400 | Slug is reserved |
| INVALID_SLUG | 400 | Invalid slug format |

### Order Errors

| Code | HTTP Status | Description |
|------|-------------|-------------|
| INVALID_STATUS | 400 | Invalid order status |
| CANNOT_CANCEL | 400 | Order cannot be cancelled |
| NO_POS_ORDER | 400 | Order has no POS reference |

### Subscription Errors

| Code | HTTP Status | Description |
|------|-------------|-------------|
| INVALID_PLAN | 400 | Invalid plan ID |
| ALREADY_SUBSCRIBED | 400 | Already has subscription |
| ALREADY_CANCELLED | 400 | Already cancelled |
| NO_ACTIVE_SUBSCRIPTION | 400 | No subscription to manage |
| CANNOT_PAUSE | 400 | Cannot pause subscription |
| NOT_PAUSED | 400 | Subscription not paused |
| PAYMENT_REQUIRED | 402 | Payment update required |

### POS/Sync Errors

| Code | HTTP Status | Description |
|------|-------------|-------------|
| NO_POS_CONNECTION | 400 | No POS provider configured |
| SYNC_IN_PROGRESS | 409 | Sync already running |
| SYNC_FAILED | 502 | POS sync failed |
| OAUTH_ERROR | 400 | OAuth authorization failed |
| TOKEN_EXCHANGE_FAILED | 500 | Failed to get tokens |

---

## Rate Limiting

The following endpoints have rate limiting applied:

| Endpoint | Limit | Window |
|----------|-------|--------|
| POST /api/auth/signup | 5 requests | 15 minutes |
| POST /api/auth/login | 10 requests | 15 minutes |
| POST /api/auth/forgot-password | 3 requests | 15 minutes |
| POST /api/auth/reset-password | 5 requests | 15 minutes |

When rate limited, the API returns:

```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests, please try again later"
  }
}
```

HTTP Status: 429 Too Many Requests
