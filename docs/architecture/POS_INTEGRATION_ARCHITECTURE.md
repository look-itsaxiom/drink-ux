# POS Integration Architecture

## Overview

The Drink-UX POS integration system is designed using the **Decorator Pattern** and **Factory Pattern** to provide a plug-and-play architecture that supports multiple Point of Sale (POS) systems. This design allows for easy extension to new POS providers without modifying existing code.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    Mobile/Admin Client                       │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│                   API Layer (Express)                        │
│  ┌─────────────────────────────────────────────────────┐   │
│  │         POS Routes (/api/pos/*)                      │   │
│  └────────────────┬────────────────────────────────────┘   │
└───────────────────┼─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────┐
│              POSIntegrationManager                           │
│  • testConnection()                                          │
│  • syncMenu()                                                │
│  • submitOrder()                                             │
│  • validateCredentials()                                     │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│              POSAdapterFactory                               │
│  • createAdapter(provider, credentials, config)              │
│  • registerAdapter(provider, adapterClass)                   │
│  • getSupportedProviders()                                   │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
        ┌────────┴────────┐
        │                 │
        ▼                 ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│ SquareAdapter│  │ ToastAdapter │  │CloverAdapter │
│   (Active)   │  │   (Future)   │  │   (Future)   │
└──────────────┘  └──────────────┘  └──────────────┘
        │
        ▼
┌──────────────────────────────────────────────────────────┐
│            Square API (External)                          │
│  • Catalog API (Menu Items)                               │
│  • Orders API (Order Submission)                          │
│  • Locations API (Location Management)                    │
└──────────────────────────────────────────────────────────┘
```

## Design Patterns

### 1. Decorator Pattern (via Interface-based Design)

The system uses interface-based design to provide a consistent API across different POS systems:

**Base Interface (`IPOSAdapter`)**
```typescript
interface IPOSAdapter {
  readonly provider: string;
  testConnection(): Promise<boolean>;
  fetchMenu(): Promise<POSProduct[]>;
  submitOrder(order: POSOrder): Promise<POSOrderResult>;
  getLocation(locationId: string): Promise<POSLocationInfo>;
  validateCredentials(): Promise<boolean>;
}
```

**Abstract Base Class (`BasePOSAdapter`)**
- Provides common functionality
- Enforces interface implementation
- Manages credentials and configuration

**Concrete Implementations**
- `SquareAdapter` - Square POS integration
- Future: `ToastAdapter`, `CloverAdapter`, etc.

### 2. Factory Pattern

The `POSAdapterFactory` creates appropriate adapter instances based on the provider:

```typescript
const adapter = posAdapterFactory.createAdapter(
  'square',
  credentials,
  config
);
```

**Benefits:**
- Centralized adapter creation
- Runtime provider selection
- Easy registration of new providers
- Type-safe adapter construction

### 3. Manager Pattern

The `POSIntegrationManager` orchestrates POS operations:

```typescript
const manager = new POSIntegrationManager();
await manager.syncMenu(integration);
await manager.submitOrder(integration, order);
```

## Key Components

### 1. Shared Package (`packages/shared`)

**Types (`types.ts`)**
- `POSIntegration` - Integration configuration
- `POSProduct` - Universal product representation
- `POSOrder` - Universal order format
- `POSCredentials` - Provider credentials
- `POSConfig` - Provider configuration

**Interfaces (`pos-adapter.ts`)**
- `IPOSAdapter` - Adapter interface
- `BasePOSAdapter` - Abstract base class
- `IPOSAdapterFactory` - Factory interface

### 2. API Package (`packages/api`)

**Adapters (`src/pos-adapters/`)**
- `square.adapter.ts` - Square implementation
- `factory.ts` - Adapter factory
- `index.ts` - Module exports

**Manager (`src/managers/`)**
- `posIntegration.manager.ts` - Integration orchestration

**Routes (`src/routes/`)**
- `pos.ts` - HTTP endpoints for POS operations

## Square Adapter Implementation

### Features

1. **Connection Testing**
   - Validates API credentials
   - Tests connectivity to Square API
   - Checks location availability

2. **Menu Synchronization**
   - Fetches catalog items
   - Converts Square catalog to universal format
   - Handles variations and modifiers
   - Maps categories

3. **Order Submission**
   - Converts universal order to Square format
   - Submits to Square Orders API
   - Returns order confirmation

4. **Location Management**
   - Fetches location information
   - Handles multiple locations

### API Integration

The Square adapter integrates with:
- **Catalog API** - Menu items and modifiers
- **Orders API** - Order submission
- **Locations API** - Location management

**Base URLs:**
- Production: `https://connect.squareup.com`
- Sandbox: `https://connect.squareupsandbox.com`

## Data Flow

### Menu Sync Flow

```
1. Client requests menu sync
2. API route receives request
3. POSIntegrationManager.syncMenu() called
4. Factory creates appropriate adapter
5. Adapter fetches menu from POS
6. Adapter converts to universal format
7. Universal menu returned to client
```

### Order Submission Flow

```
1. Client submits order
2. API route receives order
3. POSIntegrationManager.submitOrder() called
4. Factory creates appropriate adapter
5. Adapter converts universal order to POS format
6. Adapter submits to POS system
7. Confirmation returned to client
```

## Adding New POS Providers

To add a new POS provider (e.g., Toast):

### Step 1: Create Adapter Class

```typescript
// packages/api/src/pos-adapters/toast.adapter.ts
export class ToastAdapter extends BasePOSAdapter {
  readonly provider = 'toast';

  async testConnection(): Promise<boolean> {
    // Implement Toast connection test
  }

  async fetchMenu(): Promise<POSProduct[]> {
    // Implement Toast menu fetch
  }

  async submitOrder(order: POSOrder): Promise<POSOrderResult> {
    // Implement Toast order submission
  }

  // ... implement other methods
}
```

### Step 2: Register Adapter

```typescript
// packages/api/src/pos-adapters/factory.ts
import { ToastAdapter } from './toast.adapter';

static {
  this.registerAdapter('square', SquareAdapter);
  this.registerAdapter('toast', ToastAdapter);  // Add this line
}
```

### Step 3: Export Adapter

```typescript
// packages/api/src/pos-adapters/index.ts
export * from './toast.adapter';  // Add this line
```

That's it! The new adapter is now available throughout the system.

## API Endpoints

### Test Connection
```http
POST /api/pos/integration/test
Content-Type: application/json

{
  "provider": "square",
  "credentials": {
    "accessToken": "your-token"
  },
  "config": {
    "locationId": "your-location-id"
  }
}
```

### Sync Menu
```http
POST /api/pos/sync/:businessId
Content-Type: application/json

{
  "credentials": {
    "accessToken": "your-token"
  },
  "config": {
    "locationId": "your-location-id"
  }
}
```

### Submit Order
```http
POST /api/pos/order/:businessId
Content-Type: application/json

{
  "order": {
    "locationId": "location-123",
    "lineItems": [
      {
        "catalogItemId": "item-1",
        "quantity": 2,
        "variationId": "var-1",
        "modifiers": [
          {
            "catalogItemId": "mod-1"
          }
        ]
      }
    ]
  },
  "credentials": {
    "accessToken": "your-token"
  }
}
```

### Get Supported Providers
```http
GET /api/pos/providers
```

Response:
```json
{
  "success": true,
  "data": {
    "providers": ["square", "toast", "clover"]
  }
}
```

## Testing

The integration includes comprehensive test coverage:

### Unit Tests
- **Square Adapter Tests** - All adapter methods
- **Factory Tests** - Adapter creation and registration
- **Manager Tests** - Integration orchestration

### Test Structure
```
packages/api/src/
├── pos-adapters/
│   ├── __tests__/
│   │   ├── square.adapter.test.ts
│   │   └── factory.test.ts
│   ├── square.adapter.ts
│   └── factory.ts
└── managers/
    ├── __tests__/
    │   └── posIntegration.manager.test.ts
    └── posIntegration.manager.ts
```

### Running Tests
```bash
cd packages/api
npm test
```

## Security Considerations

1. **Credential Storage**
   - Never commit credentials to source control
   - Store in secure environment variables
   - Use different credentials for dev/prod

2. **API Key Rotation**
   - Rotate keys regularly
   - Support credential updates without downtime

3. **HTTPS Only**
   - All POS API calls use HTTPS
   - Token refresh handling for OAuth

4. **Rate Limiting**
   - Respect POS provider rate limits
   - Implement exponential backoff

## Benefits of This Architecture

1. **Extensibility**
   - Easy to add new POS providers
   - No changes to existing code required
   - Plugin-like architecture

2. **Maintainability**
   - Clear separation of concerns
   - Single responsibility principle
   - Easy to test and debug

3. **Flexibility**
   - Runtime provider selection
   - Configuration-driven behavior
   - Support for multiple providers simultaneously

4. **Type Safety**
   - Full TypeScript support
   - Compile-time type checking
   - Excellent IDE support

5. **Testability**
   - Mockable interfaces
   - Isolated unit tests
   - Easy to test edge cases

## Future Enhancements

1. **Webhook Support**
   - Real-time inventory updates
   - Order status notifications

2. **Caching**
   - Cache menu data
   - Reduce API calls

3. **Retry Logic**
   - Automatic retry for failed requests
   - Exponential backoff

4. **Analytics**
   - Track sync success rates
   - Monitor API performance
   - Order submission metrics

5. **Additional Providers**
   - Toast POS
   - Clover POS
   - Custom POS systems

## Conclusion

This architecture provides a robust, extensible foundation for POS integration. The use of design patterns ensures maintainability and makes it straightforward to add new providers as the platform grows.
