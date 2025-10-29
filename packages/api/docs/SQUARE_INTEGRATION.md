# Partner Onboarding Guide - Square Integration

This guide explains how to onboard new partners using Square POS by mapping their existing Square configuration to the Drink-UX common model.

## Overview

The Square integration uses the official Square JavaScript SDK to automatically map a partner's existing Square catalog to our standardized drink model. This makes onboarding seamless - partners don't need to reconfigure their menu in our system.

## Architecture

### Key Components

1. **SquareClient** (`src/services/pos/clients/SquareClient.ts`)
   - Initializes the Square SDK with partner credentials
   - Supports both sandbox (testing) and production environments
   - Handles authentication and environment configuration

2. **SquareMapper** (`src/services/pos/mappers/SquareMapper.ts`)
   - Transforms Square catalog items to our `POSMenuItem` model
   - Maps Square modifier lists to our modifier structure
   - Converts Square money amounts (bigint cents) to decimal prices
   - Provides filtering capabilities for partner customization

3. **SquarePOSProvider** (`src/services/pos/providers/SquarePOSProvider.ts`)
   - Implements the IPOSProvider interface
   - Uses Square SDK APIs for all operations:
     - Locations API for connection testing
     - Catalog API for menu synchronization
     - Orders API for order submission and status tracking

## Partner Onboarding Steps

### 1. Obtain Partner Credentials

Partners need to provide:
- **Access Token**: OAuth access token from Square Developer Dashboard
- **Location ID**: The Square location ID for their business

For sandbox testing:
- Use the Sandbox Access Token from Square Developer Dashboard
- Set `sandbox: true` in the configuration

### 2. Configure Partner Integration

```typescript
import { POSProvider, POSCredentials, POSConfig } from "@drink-ux/shared";
import { posManager } from "./managers/pos.manager";

const credentials: POSCredentials = {
  accessToken: "PARTNER_SQUARE_ACCESS_TOKEN",
};

const config: POSConfig = {
  locationId: "PARTNER_SQUARE_LOCATION_ID",
  sandbox: true, // Set to false for production
};

// Test the connection
const status = await posManager.testConnection(
  POSProvider.SQUARE,
  credentials,
  config
);

if (status.connected) {
  // Store credentials and sync menu
  await posManager.syncMenu(
    partnerId,
    POSProvider.SQUARE,
    credentials,
    config
  );
}
```

### 3. Automatic Catalog Mapping

The system automatically maps Square catalog items:

#### Square Item Structure → Drink-UX POSMenuItem

```typescript
// Square Catalog Item
{
  type: "ITEM",
  id: "ABC123",
  itemData: {
    name: "Latte",
    description: "Smooth espresso with steamed milk",
    categoryId: "COFFEE",
    variations: [
      {
        type: "ITEM_VARIATION",
        itemVariationData: {
          priceMoney: {
            amount: BigInt(450), // $4.50 in cents
            currency: "USD"
          }
        }
      }
    ],
    modifierListInfo: [...]
  }
}

// Maps to →

{
  id: "ABC123",
  name: "Latte",
  description: "Smooth espresso with steamed milk",
  price: 4.50, // Automatically converted
  category: "COFFEE",
  available: true,
  modifiers: [...] // Automatically mapped
}
```

#### Square Modifier Lists → Drink-UX Modifiers

```typescript
// Square Modifier List
{
  type: "MODIFIER_LIST",
  id: "MOD123",
  modifierListData: {
    name: "Milk Options",
    selectionType: "SINGLE", // or "MULTIPLE"
    modifiers: [
      {
        type: "MODIFIER",
        modifierData: {
          name: "Whole Milk",
          priceMoney: { amount: BigInt(0) }
        }
      },
      {
        type: "MODIFIER",
        modifierData: {
          name: "Oat Milk",
          priceMoney: { amount: BigInt(75) } // $0.75
        }
      }
    ]
  }
}

// Maps to →

{
  id: "MOD123",
  name: "Milk Options",
  required: true, // If selectionType is SINGLE
  minSelections: 1,
  maxSelections: 1,
  options: [
    {
      id: "...",
      name: "Whole Milk",
      price: 0,
      available: true
    },
    {
      id: "...",
      name: "Oat Milk",
      price: 0.75,
      available: true
    }
  ]
}
```

## Customization Options

### Filtering Menu Items

Partners can customize which items are included by modifying the `SquareMapper.filterDrinkItems()` method:

```typescript
// Example: Only include items in the "Coffee" category
static filterDrinkItems(catalogObjects: Square.CatalogObject[]): Square.CatalogObject[] {
  return catalogObjects.filter((obj) => {
    if (obj.type !== "ITEM") return false;
    
    const itemObj = obj as Square.CatalogObject.Item;
    const itemData = itemObj.itemData;
    
    // Filter by category
    if (itemData?.categoryId === "COFFEE_CATEGORY_ID") {
      return true;
    }
    
    // Or filter by name pattern
    const drinkKeywords = ["coffee", "latte", "cappuccino", "espresso"];
    if (itemData?.name) {
      const nameLower = itemData.name.toLowerCase();
      return drinkKeywords.some(keyword => nameLower.includes(keyword));
    }
    
    return false;
  });
}
```

### Environment Configuration

**Sandbox Mode (for testing)**
```typescript
const config: POSConfig = {
  locationId: "SANDBOX_LOCATION_ID",
  sandbox: true, // Uses Square Sandbox environment
};
```

**Production Mode**
```typescript
const config: POSConfig = {
  locationId: "PRODUCTION_LOCATION_ID",
  sandbox: false, // or omit - defaults to production
};
```

## Testing Integration

### 1. Test Connection
```typescript
const status = await posProvider.testConnection(credentials, config);
console.log(status.connected); // true or false
console.log(status.message);   // Success or error message
```

### 2. Fetch Menu
```typescript
const menuItems = await posProvider.fetchMenu(credentials, config);
console.log(`Fetched ${menuItems.length} items`);
menuItems.forEach(item => {
  console.log(`- ${item.name}: $${item.price}`);
  item.modifiers?.forEach(mod => {
    console.log(`  Modifier: ${mod.name}`);
  });
});
```

### 3. Submit Test Order
```typescript
const testOrder: POSOrder = {
  id: "test-order-1",
  items: [
    {
      menuItemId: "ABC123", // Square catalog object ID
      quantity: 1,
      modifiers: [
        {
          modifierId: "MOD123",
          optionId: "OPT456"
        }
      ],
      itemTotal: 5.25,
    }
  ],
  subtotal: 5.25,
  tax: 0.42,
  total: 5.67,
  status: "pending",
};

const result = await posProvider.submitOrder(testOrder, credentials, config);
console.log(`Order created: ${result.orderId}`);
console.log(`Status: ${result.status}`);
```

## API Reference

### SquareClient

```typescript
class SquareClient {
  /**
   * Create a configured Square SDK client
   */
  static createClient(
    credentials: POSCredentials,
    config: POSConfig
  ): SquareClient;
  
  /**
   * Validate credentials
   */
  static validateCredentials(credentials: POSCredentials): void;
  
  /**
   * Validate configuration
   */
  static validateConfig(config: POSConfig): void;
}
```

### SquareMapper

```typescript
class SquareMapper {
  /**
   * Convert Square Money to decimal price
   */
  static moneyToPrice(money?: Square.Money): number;
  
  /**
   * Map Square catalog item to POSMenuItem
   */
  static mapCatalogItemToMenuItem(
    item: Square.CatalogObject,
    modifierLists?: Map<string, Square.CatalogObject>
  ): POSMenuItem | null;
  
  /**
   * Map Square modifier list to POSModifier
   */
  static mapModifierList(
    modifierListObj: Square.CatalogObject
  ): POSModifier | null;
  
  /**
   * Complete mapping pipeline
   */
  static mapSquareCatalogToMenuItems(
    catalogObjects: Square.CatalogObject[]
  ): POSMenuItem[];
}
```

## Troubleshooting

### Common Issues

**1. "Access token is required"**
- Ensure the partner has provided a valid Square access token
- Verify the token hasn't expired
- Check that the token has the necessary permissions (read catalog, write orders)

**2. "Location ID is required"**
- Partner must provide their Square location ID
- Can be found in Square Dashboard → Locations

**3. "Location not found"**
- Verify the location ID is correct
- Ensure the access token has permission to access the location
- Check if using correct environment (sandbox vs production)

**4. Empty menu items**
- Check if the partner has items in their Square catalog
- Verify filter criteria in `filterDrinkItems()` isn't too restrictive
- Ensure catalog items have variations with prices

### Debug Mode

Enable detailed logging:
```typescript
// The provider logs errors to console.error
// Check application logs for detailed error messages
```

## Security Considerations

1. **Never commit credentials to version control**
   - Use environment variables or secure credential storage
   - Credentials are stored encrypted in the database

2. **Use HTTPS for API calls**
   - Square SDK automatically uses HTTPS
   - Ensure your API backend uses HTTPS in production

3. **Token Rotation**
   - Implement token refresh if using OAuth
   - Monitor for expired tokens and prompt partners to re-authenticate

4. **Sandbox vs Production**
   - Always test with sandbox tokens first
   - Never use production tokens in development/staging environments

## Next Steps

After successfully onboarding a partner:

1. **Menu Sync**: Schedule automatic menu synchronization
2. **Webhook Setup**: Configure Square webhooks for real-time updates
3. **Order Fulfillment**: Integrate order status updates
4. **Analytics**: Track menu item performance and sales

## Support Resources

- [Square Developer Documentation](https://developer.squareup.com/docs)
- [Square JavaScript SDK](https://github.com/square/square-nodejs-sdk)
- [Drink-UX API Documentation](../README.md)
- Square API Sandbox: https://developer.squareup.com/sandbox

## Example: Complete Partner Setup

```typescript
import { POSProvider } from "@drink-ux/shared";
import { posManager } from "./managers/pos.manager";

async function onboardPartner(partnerId: string) {
  // 1. Get credentials from partner
  const credentials = {
    accessToken: process.env.PARTNER_SQUARE_TOKEN,
  };
  
  const config = {
    locationId: process.env.PARTNER_SQUARE_LOCATION,
    sandbox: process.env.NODE_ENV !== "production",
    autoSyncMenu: true,
    syncInterval: 60, // minutes
  };
  
  // 2. Test connection
  console.log("Testing connection...");
  const status = await posManager.testConnection(
    POSProvider.SQUARE,
    credentials,
    config
  );
  
  if (!status.connected) {
    throw new Error(`Connection failed: ${status.message}`);
  }
  
  console.log("✓ Connection successful");
  
  // 3. Initial menu sync
  console.log("Syncing menu...");
  const syncResult = await posManager.syncMenu(
    partnerId,
    POSProvider.SQUARE,
    credentials,
    config
  );
  
  console.log(`✓ Synced ${syncResult.itemsSynced} items`);
  console.log(`  - Added: ${syncResult.itemsAdded}`);
  console.log(`  - Updated: ${syncResult.itemsUpdated}`);
  console.log(`  - Deactivated: ${syncResult.itemsDeactivated}`);
  
  if (syncResult.errors.length > 0) {
    console.warn("⚠ Errors during sync:", syncResult.errors);
  }
  
  // 4. Store integration
  await posManager.upsertIntegration(
    partnerId,
    POSProvider.SQUARE,
    credentials,
    config
  );
  
  console.log("✓ Partner onboarding complete!");
}
```
