# Square Mapper - Configuration Reference

## Overview

The `SquareMapper` class provides utilities to transform Square catalog data into the Drink-UX common model. This document explains how to configure and customize the mapping for specific partner needs.

## Basic Mapping

### Default Behavior

By default, the mapper:
- Converts all Square catalog items to POSMenuItem format
- Maps all modifier lists automatically
- Converts prices from Square's bigint cents to decimal dollars
- Preserves item and modifier IDs for proper order submission

### Usage

```typescript
import { SquareMapper } from "./services/pos/mappers/SquareMapper";

// Get catalog objects from Square API
const page = await squareClient.catalog.list({ types: "ITEM,MODIFIER_LIST" });
const catalogObjects = page.data;

// Transform to our model
const menuItems = SquareMapper.mapSquareCatalogToMenuItems(catalogObjects);
```

## Data Type Mappings

### Money Conversion

Square uses `bigint` for money amounts in the smallest currency unit (cents for USD).

```typescript
// Square Money
{
  amount: BigInt(450),  // $4.50
  currency: "USD"
}

// Converts to
price: 4.50
```

### Item Mapping

| Square Field | Drink-UX Field | Notes |
|--------------|----------------|-------|
| `id` | `id` | Preserved for orders |
| `itemData.name` | `name` | Required |
| `itemData.description` | `description` | Optional |
| `itemData.categoryId` | `category` | Optional |
| First variation price | `price` | Required |
| `modifierListInfo` | `modifiers` | Mapped array |

### Modifier Mapping

| Square Field | Drink-UX Field | Notes |
|--------------|----------------|-------|
| `id` | `id` | Preserved |
| `modifierListData.name` | `name` | Required |
| `selectionType: "SINGLE"` | `required: true` | Auto-detected |
| `selectionType: "MULTIPLE"` | `required: false` | Auto-detected |
| `modifiers` | `options` | Mapped array |

## Customization Patterns

### Pattern 1: Filter by Category

Include only specific drink categories:

```typescript
// In SquareMapper.filterDrinkItems()
static filterDrinkItems(catalogObjects: Square.CatalogObject[]): Square.CatalogObject[] {
  const ALLOWED_CATEGORIES = [
    "COFFEE_CATEGORY_ID",
    "TEA_CATEGORY_ID",
    "SPECIALTY_DRINKS_CATEGORY_ID"
  ];

  return catalogObjects.filter((obj) => {
    if (obj.type !== "ITEM") return false;
    
    const itemObj = obj as Square.CatalogObject.Item;
    const categoryId = itemObj.itemData?.categoryId;
    
    return categoryId && ALLOWED_CATEGORIES.includes(categoryId);
  });
}
```

### Pattern 2: Filter by Name Keywords

Include items matching drink-related keywords:

```typescript
static filterDrinkItems(catalogObjects: Square.CatalogObject[]): Square.CatalogObject[] {
  const DRINK_KEYWORDS = [
    "coffee", "latte", "cappuccino", "espresso", "americano",
    "tea", "chai", "matcha",
    "smoothie", "frappuccino", "frappe",
    "juice", "soda", "italian soda"
  ];

  return catalogObjects.filter((obj) => {
    if (obj.type !== "ITEM") return false;
    
    const itemObj = obj as Square.CatalogObject.Item;
    const name = itemObj.itemData?.name?.toLowerCase() || "";
    
    return DRINK_KEYWORDS.some(keyword => name.includes(keyword));
  });
}
```

### Pattern 3: Exclude Non-Drinks

Exclude food items or other products:

```typescript
static filterDrinkItems(catalogObjects: Square.CatalogObject[]): Square.CatalogObject[] {
  const EXCLUDE_KEYWORDS = [
    "sandwich", "bagel", "pastry", "muffin",
    "croissant", "cookie", "brownie",
    "merchandise", "gift card"
  ];

  return catalogObjects.filter((obj) => {
    if (obj.type !== "ITEM") return false;
    
    const itemObj = obj as Square.CatalogObject.Item;
    const name = itemObj.itemData?.name?.toLowerCase() || "";
    
    // Exclude if name contains any excluded keyword
    return !EXCLUDE_KEYWORDS.some(keyword => name.includes(keyword));
  });
}
```

### Pattern 4: Price Range Filter

Include only items within a specific price range:

```typescript
static filterDrinkItems(catalogObjects: Square.CatalogObject[]): Square.CatalogObject[] {
  const MIN_PRICE = 2.00;  // $2.00
  const MAX_PRICE = 15.00; // $15.00

  return catalogObjects.filter((obj) => {
    if (obj.type !== "ITEM") return false;
    
    const itemObj = obj as Square.CatalogObject.Item;
    const variations = itemObj.itemData?.variations || [];
    
    if (variations.length === 0) return false;
    
    const firstVar = variations[0];
    if (firstVar.type !== "ITEM_VARIATION") return false;
    
    const varObj = firstVar as Square.CatalogObject.ItemVariation;
    const priceMoney = varObj.itemVariationData?.priceMoney;
    
    if (!priceMoney?.amount) return false;
    
    const price = Number(priceMoney.amount) / 100;
    return price >= MIN_PRICE && price <= MAX_PRICE;
  });
}
```

## Advanced Customization

### Custom Category Mapping

Map Square category IDs to your own category system:

```typescript
static mapCatalogItemToMenuItem(
  item: Square.CatalogObject,
  modifierLists?: Map<string, Square.CatalogObject>
): POSMenuItem | null {
  // ... existing code ...

  // Custom category mapping
  const CATEGORY_MAP: Record<string, string> = {
    "SQUARE_COFFEE_ID": "coffee",
    "SQUARE_TEA_ID": "tea",
    "SQUARE_SPECIALTY_ID": "specialty",
  };

  const squareCategoryId = itemData.categoryId;
  const mappedCategory = squareCategoryId 
    ? CATEGORY_MAP[squareCategoryId] || squareCategoryId
    : undefined;

  return {
    // ...
    category: mappedCategory,
    // ...
  };
}
```

### Custom Price Adjustments

Apply markup or adjustments to prices:

```typescript
static moneyToPrice(money?: Square.Money): number {
  if (!money || money.amount === undefined) {
    return 0;
  }
  
  const basePrice = Number(money.amount) / 100;
  
  // Apply 10% markup for mobile app
  const MARKUP_RATE = 1.10;
  return basePrice * MARKUP_RATE;
}
```

### Modifier Selection Rules

Customize modifier requirements:

```typescript
static mapModifierList(modifierListObj: Square.CatalogObject): POSModifier | null {
  // ... existing code ...

  // Custom rules based on modifier list name
  const name = modListData.name || "";
  let required = selectionType === "SINGLE";
  let minSelections = required ? 1 : undefined;
  let maxSelections = selectionType === "SINGLE" ? 1 : undefined;

  // Make "Size" modifier always required
  if (name.toLowerCase().includes("size")) {
    required = true;
    minSelections = 1;
    maxSelections = 1;
  }

  // Limit toppings to 3
  if (name.toLowerCase().includes("topping")) {
    maxSelections = 3;
  }

  return {
    id: modifierListObj.id || "",
    name,
    options,
    required,
    minSelections,
    maxSelections,
  };
}
```

## Partner-Specific Configurations

### Configuration Structure

Create partner-specific configurations:

```typescript
interface PartnerMappingConfig {
  partnerId: string;
  filterCategories?: string[];
  filterKeywords?: string[];
  excludeKeywords?: string[];
  priceRange?: { min: number; max: number };
  categoryMap?: Record<string, string>;
  priceAdjustment?: number;
}

class PartnerSquareMapper extends SquareMapper {
  constructor(private config: PartnerMappingConfig) {
    super();
  }

  static filterDrinkItems(catalogObjects: Square.CatalogObject[]): Square.CatalogObject[] {
    // Apply partner-specific filters
    // ...
  }
}
```

### Example: Coffee Shop Chain

```typescript
const starbucksConfig: PartnerMappingConfig = {
  partnerId: "starbucks",
  filterCategories: ["COFFEE", "TEA", "FRAPPUCCINO"],
  excludeKeywords: ["food", "sandwich", "pastry"],
  priceRange: { min: 2.50, max: 12.00 },
  categoryMap: {
    "FRAPPUCCINO": "blended",
    "COFFEE": "coffee",
    "TEA": "tea"
  },
  priceAdjustment: 1.05, // 5% markup
};
```

### Example: Local Cafe

```typescript
const localCafeConfig: PartnerMappingConfig = {
  partnerId: "local-cafe",
  filterKeywords: ["coffee", "espresso", "tea", "latte"],
  excludeKeywords: ["merchandise", "retail"],
  priceRange: { min: 1.50, max: 8.00 },
  priceAdjustment: 1.0, // No markup
};
```

## Testing Mappings

### Test Data

Create test catalog objects:

```typescript
const testCatalogItem: Square.CatalogObject = {
  type: "ITEM",
  id: "test-item-1",
  itemData: {
    name: "Test Latte",
    description: "A test latte item",
    categoryId: "COFFEE",
    variations: [
      {
        type: "ITEM_VARIATION",
        id: "test-var-1",
        itemVariationData: {
          priceMoney: {
            amount: BigInt(450),
            currency: "USD"
          }
        }
      }
    ]
  }
};
```

### Validation

```typescript
function validateMapping(menuItem: POSMenuItem): boolean {
  // Required fields
  if (!menuItem.id || !menuItem.name || menuItem.price === undefined) {
    return false;
  }

  // Price validation
  if (menuItem.price < 0 || menuItem.price > 100) {
    return false;
  }

  // Modifier validation
  for (const modifier of menuItem.modifiers || []) {
    if (!modifier.id || !modifier.name || !modifier.options) {
      return false;
    }
    
    if (modifier.options.length === 0) {
      return false;
    }
  }

  return true;
}
```

## Performance Optimization

### Caching Modifier Lists

The mapper uses a Map for O(1) modifier list lookups:

```typescript
// Built once per sync
const modifierLists = SquareMapper.buildModifierListMap(catalogObjects);

// Reused for all items
for (const item of drinkItems) {
  const mapped = SquareMapper.mapCatalogItemToMenuItem(item, modifierLists);
}
```

### Batch Processing

Process large catalogs efficiently:

```typescript
function processCatalogInBatches(
  catalogObjects: Square.CatalogObject[],
  batchSize: number = 100
): POSMenuItem[] {
  const allItems: POSMenuItem[] = [];
  
  for (let i = 0; i < catalogObjects.length; i += batchSize) {
    const batch = catalogObjects.slice(i, i + batchSize);
    const items = SquareMapper.mapSquareCatalogToMenuItems(batch);
    allItems.push(...items);
  }
  
  return allItems;
}
```

## Debugging

### Enable Detailed Logging

```typescript
static mapCatalogItemToMenuItem(
  item: Square.CatalogObject,
  modifierLists?: Map<string, Square.CatalogObject>
): POSMenuItem | null {
  console.log(`Mapping item: ${item.id}`, item);
  
  const result = /* mapping logic */;
  
  console.log(`Mapped result:`, result);
  
  return result;
}
```

### Track Mapping Statistics

```typescript
interface MappingStats {
  totalItems: number;
  mappedItems: number;
  skippedItems: number;
  errors: string[];
}

function mapWithStats(catalogObjects: Square.CatalogObject[]): {
  items: POSMenuItem[];
  stats: MappingStats;
} {
  const stats: MappingStats = {
    totalItems: catalogObjects.filter(o => o.type === "ITEM").length,
    mappedItems: 0,
    skippedItems: 0,
    errors: []
  };

  const items = SquareMapper.mapSquareCatalogToMenuItems(catalogObjects);
  stats.mappedItems = items.length;
  stats.skippedItems = stats.totalItems - stats.mappedItems;

  return { items, stats };
}
```

## Best Practices

1. **Always validate mapped data** before storing in database
2. **Use appropriate filters** to include only relevant items
3. **Test with real partner data** before production deployment
4. **Monitor mapping errors** and handle edge cases
5. **Cache modifier lists** to optimize performance
6. **Document partner-specific customizations** for maintainability

## Support

For questions or issues with the mapping system:
- Review the [Square Integration Guide](./SQUARE_INTEGRATION.md)
- Check Square's [Catalog API documentation](https://developer.squareup.com/docs/catalog-api/what-it-does)
- Examine test cases in `__tests__/SquarePOSProvider.test.ts`
