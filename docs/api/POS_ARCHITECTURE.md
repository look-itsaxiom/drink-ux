# POS Abstraction Layer Architecture

## Overview

The POS (Point of Sale) abstraction layer provides a unified interface for integrating with multiple POS systems. This architecture enables Drink-UX to easily support new POS providers while maintaining a consistent API for the frontend applications.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    API Routes Layer                          │
│         (Express Routes - /api/pos/*)                        │
└─────────────────┬───────────────────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────────────────┐
│                  POS Manager                                 │
│         (Business Logic & Orchestration)                     │
└─────────┬──────────────────────────────┬────────────────────┘
          │                              │
┌─────────▼───────────┐      ┌──────────▼──────────────────┐
│  POS Repository     │      │   POS Provider Factory       │
│  (Data Access)      │      │   (Provider Management)      │
└─────────────────────┘      └──────────┬──────────────────┘
                                        │
                    ┌───────────────────┼───────────────────┐
                    │                   │                   │
          ┌─────────▼─────────┐ ┌──────▼──────┐ ┌─────────▼────────┐
          │ SquarePOSProvider │ │ToastProvider│ │CloverPOSProvider │
          │  (Adapter)        │ │  (Adapter)  │ │   (Adapter)      │
          └───────────────────┘ └─────────────┘ └──────────────────┘
                    │                   │                   │
          ┌─────────▼─────────┐ ┌──────▼──────┐ ┌─────────▼────────┐
          │   Square API      │ │  Toast API  │ │   Clover API     │
          └───────────────────┘ └─────────────┘ └──────────────────┘
```

## Core Components

### 1. IPOSProvider Interface

The `IPOSProvider` interface defines the contract that all POS providers must implement:

```typescript
interface IPOSProvider {
  testConnection(credentials: POSCredentials, config: POSConfig): Promise<POSConnectionStatus>;
  fetchMenu(credentials: POSCredentials, config: POSConfig): Promise<POSMenuItem[]>;
  submitOrder(order: POSOrder, credentials: POSCredentials, config: POSConfig): Promise<{ orderId: string; status: string }>;
  syncMenu(credentials: POSCredentials, config: POSConfig): Promise<POSSyncResult>;
  getOrderStatus(orderId: string, credentials: POSCredentials, config: POSConfig): Promise<{ status: string; details?: any }>;
}
```

### 2. BasePOSAdapter

Abstract base class providing common functionality:
- Credential validation
- Config validation
- Error handling patterns
- Enforces implementation of required methods

### 3. Provider Adapters

#### SquarePOSProvider
- Integrates with Square's Catalog, Orders, and Locations APIs
- Handles Square-specific authentication (OAuth 2.0)
- Required credentials: `accessToken`, `locationId`

#### ToastPOSProvider
- Integrates with Toast's Menu, Orders, and Modifiers APIs
- Handles API key authentication
- Required credentials: `apiKey`, `merchantId` (Restaurant GUID)

#### CloverPOSProvider
- Integrates with Clover's Inventory, Orders, and Modifiers APIs
- Handles API token authentication
- Required credentials: `accessToken`, `merchantId`

### 4. POSProviderFactory

Singleton factory for creating and caching provider instances:

```typescript
const provider = POSProviderFactory.getProvider(POSProvider.SQUARE);
const isSupported = POSProviderFactory.isProviderSupported("square");
const allProviders = POSProviderFactory.getSupportedProviders();
```

### 5. POS Manager

Business logic layer that:
- Coordinates between providers and repositories
- Validates operations
- Manages integration lifecycle
- Handles connection testing before saving credentials

Key methods:
- `testConnection()` - Verify POS credentials
- `fetchMenu()` - Get menu items from POS
- `submitOrder()` - Send order to POS
- `syncMenu()` - Sync menu and update database
- `upsertIntegration()` - Create/update POS integration
- `deactivateIntegration()` - Disable POS integration

### 6. POS Integration Repository

Data access layer for managing POS integration records:
- `findByCompanyId()` - Get integration for a company
- `create()` - Create new integration
- `update()` - Update existing integration
- `delete()` - Remove integration
- `updateLastSyncTime()` - Track sync operations

### 7. API Routes

RESTful endpoints for POS operations:

```
GET    /api/pos/providers                  - List supported providers
GET    /api/pos/integration/:companyId     - Get company's integration
POST   /api/pos/test-connection            - Test POS credentials
POST   /api/pos/integration                - Create/update integration
POST   /api/pos/sync/:companyId            - Sync menu from POS
POST   /api/pos/menu                       - Fetch menu items
POST   /api/pos/order                      - Submit order to POS
GET    /api/pos/order/:orderId/status      - Get order status
DELETE /api/pos/integration/:companyId     - Deactivate integration
```

## Data Flow

### Connection Testing Flow

```
1. Client → POST /api/pos/test-connection
2. POS Routes → posManager.testConnection()
3. POS Manager → POSProviderFactory.getProvider(provider)
4. Provider Factory → Returns cached or new provider instance
5. Provider Instance → Validates credentials and config
6. Provider Instance → (Would call external POS API in production)
7. Provider Instance → Returns POSConnectionStatus
8. Response flows back through layers to client
```

### Menu Sync Flow

```
1. Client → POST /api/pos/sync/:companyId
2. POS Routes → posManager.syncMenu()
3. POS Manager → Gets provider via factory
4. Provider → Fetches menu from POS API
5. Provider → Transforms POS format to our POSMenuItem format
6. Provider → Returns POSSyncResult
7. POS Manager → Updates last sync time in database
8. Response flows back to client
```

### Order Submission Flow

```
1. Client → POST /api/pos/order
2. POS Routes → posManager.submitOrder()
3. POS Manager → Gets provider via factory
4. Provider → Transforms our order format to POS-specific format
5. Provider → Submits to POS API
6. Provider → Returns order ID and status
7. Response flows back to client
```

## Type System

### Core Types

```typescript
// Menu Items
interface POSMenuItem {
  id: string;
  name: string;
  description?: string;
  price: number;
  category?: string;
  modifiers?: POSModifier[];
  available: boolean;
}

// Orders
interface POSOrder {
  id: string;
  items: POSOrderItem[];
  subtotal: number;
  tax: number;
  total: number;
  customerId?: string;
  customerName?: string;
  status: string;
}

// Sync Results
interface POSSyncResult {
  itemsSynced: number;
  itemsAdded: number;
  itemsUpdated: number;
  itemsDeactivated: number;
  errors: string[];
}

// Connection Status
interface POSConnectionStatus {
  connected: boolean;
  provider: POSProvider;
  lastSyncAt?: Date;
  message?: string;
}
```

## Error Handling

All POS operations implement consistent error handling:

```typescript
try {
  const result = await posManager.someOperation(...);
  res.json({ success: true, data: result });
} catch (error) {
  res.status(500).json({
    success: false,
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: "Operation failed",
      details: error instanceof Error ? error.message : "Unknown error",
    },
  });
}
```

## Adding a New POS Provider

To add support for a new POS system:

### 1. Add provider to enum
```typescript
// In packages/shared/src/types.ts
export enum POSProvider {
  SQUARE = "square",
  TOAST = "toast",
  CLOVER = "clover",
  NEW_PROVIDER = "new_provider", // Add here
}
```

### 2. Create provider adapter
```typescript
// In packages/api/src/services/pos/providers/NewProviderPOSProvider.ts
import { BasePOSAdapter } from "../adapters/BasePOSAdapter";

export class NewProviderPOSProvider extends BasePOSAdapter {
  constructor() {
    super(POSProvider.NEW_PROVIDER);
  }

  async testConnection(credentials, config) {
    // Implement connection test
  }

  async fetchMenu(credentials, config) {
    // Implement menu fetch
  }

  async submitOrder(order, credentials, config) {
    // Implement order submission
  }

  async syncMenu(credentials, config) {
    // Implement menu sync
  }

  async getOrderStatus(orderId, credentials, config) {
    // Implement status check
  }
}
```

### 3. Register in factory
```typescript
// In packages/api/src/services/pos/POSProviderFactory.ts
case POSProvider.NEW_PROVIDER:
  providerInstance = new NewProviderPOSProvider();
  break;
```

### 4. Add tests
Create test file: `packages/api/src/services/pos/__tests__/NewProviderPOSProvider.test.ts`

### 5. Update documentation
Add provider-specific documentation to `docs/api/POS_INTEGRATION.md`

## Testing

The POS abstraction layer has comprehensive test coverage:

### Unit Tests
- **POSProviderFactory** - Provider instantiation and validation
- **Provider Adapters** - Each provider's implementation
- **POS Manager** - Business logic and orchestration
- **POS Repository** - Data access operations

### Test Utilities
- Mock providers for integration tests
- Mock credentials and configs
- Test data factories

### Running Tests
```bash
cd packages/api
npm test                    # Run all tests
npm test -- pos            # Run POS-related tests only
npm run test:coverage      # Generate coverage report
```

## Security Considerations

### Credential Storage
- **Never** store credentials in plain text
- Use environment variables for secrets
- Encrypt sensitive data in database
- Implement credential rotation

### API Security
- All POS API calls use HTTPS
- Implement rate limiting
- Use short-lived tokens when possible
- Validate all inputs

### Response Sanitization
- Never expose credentials in API responses
- Mask sensitive data in logs
- Use proper error messages (no stack traces in production)

## Performance Optimization

### Provider Caching
- Provider instances are cached as singletons
- Reduces instantiation overhead
- Memory efficient

### Connection Pooling
- Reuse HTTP connections to POS APIs
- Implement request batching where possible
- Use webhooks instead of polling when available

### Async Operations
- All POS operations are async
- Non-blocking I/O
- Proper timeout handling

## Future Enhancements

### Planned Features
1. **Webhook Support** - Real-time updates from POS systems
2. **Retry Logic** - Automatic retry with exponential backoff
3. **Circuit Breaker** - Prevent cascading failures
4. **Analytics** - Track POS operation metrics
5. **Caching Layer** - Cache frequently accessed menu data
6. **Bulk Operations** - Batch menu syncs and order submissions
7. **Provider Health Checks** - Monitor POS system availability

### Additional Providers
- Shopify POS
- Lightspeed
- Revel Systems
- TouchBistro

## Related Documentation

- [POS Integration Guide](./POS_INTEGRATION.md) - Setup instructions
- [Development Guide](../DEVELOPMENT.md) - General development workflow
- [API Reference](./API_REFERENCE.md) - Complete API documentation

## Support

For issues or questions:
- Check existing documentation
- Review test files for examples
- Consult provider-specific documentation
- Contact the development team
