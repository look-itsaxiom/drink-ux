# POS Integration Usage Examples

This document provides practical examples of how to use the POS integration system in the Drink-UX application.

## Square Integration Example

### 1. Setting Up a Square Integration

```typescript
import { POSIntegration, POSProvider } from '@drink-ux/shared';

// Create an integration configuration
const squareIntegration: POSIntegration = {
  id: 'integration-1',
  businessId: 'coffee-shop-123',
  provider: POSProvider.SQUARE,
  credentials: {
    accessToken: 'EAAAxxxxxxxx', // Sandbox token
    // For production: accessToken: 'sq0atpxxxxxxxx'
  },
  config: {
    locationId: 'L1234567890ABC',
    autoSyncMenu: true,
    syncInterval: 60, // Sync every 60 minutes
  },
  isActive: true,
};
```

### 2. Testing Connection

```typescript
import { posIntegrationManager } from './managers/posIntegration.manager';

async function testSquareConnection() {
  const result = await posIntegrationManager.testConnection(squareIntegration);
  
  if (result.success) {
    console.log('✅ Connected to Square!');
    console.log(`Location: ${result.locationName}`);
  } else {
    console.error('❌ Connection failed:', result.error);
  }
}
```

### 3. Syncing Menu from Square

```typescript
async function syncMenuFromSquare() {
  const result = await posIntegrationManager.syncMenu(squareIntegration);
  
  if (result.success) {
    console.log(`✅ Synced ${result.productsCount} products`);
    
    // Display the products
    result.products?.forEach(product => {
      console.log(`- ${product.name}: $${product.basePrice}`);
      
      // Show variations (sizes)
      if (product.variations) {
        product.variations.forEach(variation => {
          console.log(`  └─ ${variation.name}: $${variation.price}`);
        });
      }
      
      // Show modifiers
      if (product.modifiers) {
        product.modifiers.forEach(modifierList => {
          console.log(`  └─ ${modifierList.name} (${modifierList.selectionType})`);
          modifierList.modifiers.forEach(mod => {
            console.log(`     • ${mod.name}: +$${mod.price}`);
          });
        });
      }
    });
  } else {
    console.error('❌ Menu sync failed:', result.error);
  }
}
```

### 4. Submitting an Order to Square

```typescript
import { POSOrder } from '@drink-ux/shared';

async function submitOrderToSquare() {
  // Create an order in the universal format
  const order: POSOrder = {
    locationId: 'L1234567890ABC',
    lineItems: [
      {
        catalogItemId: 'ITEM_001', // Latte item ID
        quantity: 2,
        variationId: 'VAR_LARGE', // Large size
        modifiers: [
          {
            catalogItemId: 'MOD_OATMILK', // Oat milk modifier
            quantity: 1,
          },
          {
            catalogItemId: 'MOD_VANILLA', // Vanilla syrup
            quantity: 1,
          },
        ],
        note: 'Extra hot',
      },
      {
        catalogItemId: 'ITEM_002', // Cold brew
        quantity: 1,
        variationId: 'VAR_MEDIUM',
      },
    ],
    note: 'Customer prefers contactless pickup',
  };
  
  // Submit to Square
  const result = await posIntegrationManager.submitOrder(
    squareIntegration,
    order
  );
  
  if (result.success) {
    console.log('✅ Order submitted successfully!');
    console.log(`Order ID: ${result.orderId}`);
  } else {
    console.error('❌ Order submission failed:', result.error);
  }
}
```

### 5. Using in an Express Route

```typescript
import { Router } from 'express';
import { posIntegrationManager } from '../managers/posIntegration.manager';

const router = Router();

// Test connection endpoint
router.post('/test-square', async (req, res) => {
  try {
    const { accessToken, locationId } = req.body;
    
    const testIntegration = {
      id: 'temp',
      businessId: req.user.businessId,
      provider: 'square',
      credentials: { accessToken },
      config: { locationId },
      isActive: true,
    };
    
    const result = await posIntegrationManager.testConnection(testIntegration);
    
    res.json({
      success: result.success,
      message: result.success ? 'Connection successful!' : result.error,
      locationName: result.locationName,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// Sync menu endpoint
router.post('/sync-menu', async (req, res) => {
  try {
    // Fetch integration from database
    const integration = await getIntegrationFromDB(req.user.businessId);
    
    const result = await posIntegrationManager.syncMenu(integration);
    
    if (result.success) {
      // Save products to database
      await saveProductsToDB(result.products);
      
      res.json({
        success: true,
        message: `Synced ${result.productsCount} products`,
        products: result.products,
      });
    } else {
      res.status(500).json({
        success: false,
        message: result.error,
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

export default router;
```

## Mapping Square Products to Drink-UX Format

### Example: Converting Square Latte to Drink Components

```typescript
function mapSquareProductToDrinkComponents(product: POSProduct) {
  // Base drink information
  const drinkType = {
    id: product.id,
    name: product.name,
    category: product.category || 'Espresso Drinks',
    basePrice: product.basePrice,
    description: product.description,
  };
  
  // Map size variations
  const sizeCustomizations = product.variations?.map(variation => ({
    id: variation.id,
    name: variation.name,
    category: 'SIZE',
    price: variation.price - product.basePrice, // Price difference
    available: variation.available,
  })) || [];
  
  // Map modifiers
  const modifierCustomizations = product.modifiers?.flatMap(modifierList => 
    modifierList.modifiers.map(modifier => ({
      id: modifier.id,
      name: modifier.name,
      category: mapModifierCategory(modifierList.name),
      price: modifier.price,
      available: modifier.available,
    }))
  ) || [];
  
  return {
    drinkType,
    customizations: [...sizeCustomizations, ...modifierCustomizations],
  };
}

function mapModifierCategory(modifierListName: string): string {
  const categoryMap: Record<string, string> = {
    'Milk Options': 'MILK',
    'Syrups': 'FLAVOR',
    'Sweeteners': 'SWEETENER',
    'Toppings': 'TOPPING',
  };
  
  return categoryMap[modifierListName] || 'MODIFIER';
}
```

## Testing with Square Sandbox

### Setup Steps

1. Create a Square Developer Account at https://developer.squareup.com
2. Create a new application
3. Get your Sandbox Access Token (starts with `EAAA`)
4. Get your Sandbox Location ID from the dashboard

### Testing Connection

```bash
curl -X POST http://localhost:3001/api/pos/integration/test \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "square",
    "credentials": {
      "accessToken": "EAAAxxxxxxxx"
    },
    "config": {
      "locationId": "L1234567890ABC"
    },
    "businessId": "test-business",
    "id": "test",
    "isActive": true
  }'
```

### Testing Menu Sync

```bash
curl -X POST http://localhost:3001/api/pos/sync/test-business \
  -H "Content-Type: application/json" \
  -d '{
    "credentials": {
      "accessToken": "EAAAxxxxxxxx"
    },
    "config": {
      "locationId": "L1234567890ABC"
    }
  }'
```

### Testing Order Submission

```bash
curl -X POST http://localhost:3001/api/pos/order/test-business \
  -H "Content-Type: application/json" \
  -d '{
    "order": {
      "locationId": "L1234567890ABC",
      "lineItems": [
        {
          "catalogItemId": "ITEM_001",
          "quantity": 2,
          "variationId": "VAR_LARGE"
        }
      ]
    },
    "credentials": {
      "accessToken": "EAAAxxxxxxxx"
    },
    "config": {}
  }'
```

## Error Handling

### Handling Connection Errors

```typescript
async function safeTestConnection(integration: POSIntegration) {
  try {
    const result = await posIntegrationManager.testConnection(integration);
    
    if (!result.success) {
      // Log error for debugging
      console.error('Connection test failed:', result.error);
      
      // Notify user
      showNotification({
        type: 'error',
        message: 'Unable to connect to POS system. Please check your credentials.',
      });
      
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Unexpected error:', error);
    showNotification({
      type: 'error',
      message: 'An unexpected error occurred. Please try again.',
    });
    return false;
  }
}
```

### Handling Menu Sync Errors

```typescript
async function syncMenuWithRetry(
  integration: POSIntegration,
  maxRetries: number = 3
) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await posIntegrationManager.syncMenu(integration);
      
      if (result.success) {
        return result;
      }
      
      if (attempt < maxRetries) {
        // Wait before retrying (exponential backoff)
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    } catch (error) {
      if (attempt === maxRetries) {
        throw error;
      }
    }
  }
  
  throw new Error('Menu sync failed after multiple attempts');
}
```

## Best Practices

### 1. Credential Security

```typescript
// ❌ Bad: Hardcoded credentials
const integration = {
  credentials: {
    accessToken: 'EAAAxxxxxxxx',
  },
};

// ✅ Good: Use environment variables
const integration = {
  credentials: {
    accessToken: process.env.SQUARE_ACCESS_TOKEN,
  },
};
```

### 2. Rate Limiting

```typescript
class RateLimitedPOSManager {
  private lastCallTime: number = 0;
  private minInterval: number = 100; // ms between calls
  
  async syncMenu(integration: POSIntegration) {
    // Enforce rate limit
    const now = Date.now();
    const timeSinceLastCall = now - this.lastCallTime;
    
    if (timeSinceLastCall < this.minInterval) {
      await new Promise(resolve => 
        setTimeout(resolve, this.minInterval - timeSinceLastCall)
      );
    }
    
    this.lastCallTime = Date.now();
    return posIntegrationManager.syncMenu(integration);
  }
}
```

### 3. Caching Menu Data

```typescript
class CachedMenuManager {
  private menuCache: Map<string, { data: any; timestamp: number }> = new Map();
  private cacheTimeout: number = 15 * 60 * 1000; // 15 minutes
  
  async getMenu(integration: POSIntegration, forceRefresh: boolean = false) {
    const cacheKey = `${integration.businessId}-${integration.provider}`;
    const cached = this.menuCache.get(cacheKey);
    
    if (!forceRefresh && cached) {
      const age = Date.now() - cached.timestamp;
      if (age < this.cacheTimeout) {
        return cached.data;
      }
    }
    
    // Fetch fresh data
    const result = await posIntegrationManager.syncMenu(integration);
    
    if (result.success) {
      this.menuCache.set(cacheKey, {
        data: result.products,
        timestamp: Date.now(),
      });
      return result.products;
    }
    
    throw new Error(result.error);
  }
}
```

## Integration with Mobile App

The mobile app doesn't need to change to support POS integration! The API handles all POS-specific logic and returns data in the universal Drink-UX format.

### Example Flow

1. **User opens app** → Mobile fetches menu from API
2. **API checks** → Menu synced from Square within last hour?
3. **If not** → API syncs from Square, converts to universal format
4. **API returns** → Universal menu format to mobile app
5. **Mobile displays** → User sees drinks in visual builder
6. **User orders** → Mobile sends order in universal format
7. **API converts** → Universal order to Square format
8. **API submits** → Order to Square
9. **API returns** → Confirmation to mobile app

The mobile app remains completely POS-agnostic!
