import {
  POSMenuItem,
  POSModifier,
  POSModifierOption,
} from "@drink-ux/shared";
import * as Square from "square";

/**
 * SquareMapper - Utility class for mapping Square API data to our common POS model
 * 
 * This mapper makes it easy to onboard new partners by automatically transforming
 * their Square catalog configuration into our standardized drink model used in the UI.
 */
export class SquareMapper {
  /**
   * Convert Square Money object to decimal price
   */
  static moneyToPrice(money?: Square.Money): number {
    if (!money || money.amount === undefined) {
      return 0;
    }
    // Square amounts are in cents (or smallest currency unit) as bigint
    return Number(money.amount) / 100;
  }

  /**
   * Map a Square Catalog Item to our POSMenuItem format
   * This is the main mapping that partners need - it transforms their
   * Square menu items into our drink builder model
   */
  static mapCatalogItemToMenuItem(
    item: Square.CatalogObject,
    modifierLists?: Map<string, Square.CatalogObject>
  ): POSMenuItem | null {
    // Type guard to ensure this is an ITEM type
    if (item.type !== "ITEM") {
      return null;
    }

    const itemObj = item as Square.CatalogObject.Item;
    const itemData = itemObj.itemData;
    if (!itemData) {
      return null;
    }

    const variations = itemData.variations || [];

    // Get the first variation for price (most items have a single variation)
    const firstVariation = variations[0];
    if (!firstVariation || firstVariation.type !== "ITEM_VARIATION") {
      return null;
    }

    const variationObj = firstVariation as Square.CatalogObject.ItemVariation;
    const variationData = variationObj.itemVariationData;
    if (!variationData) {
      return null;
    }

    const price = this.moneyToPrice(variationData.priceMoney);

    // Map modifier lists
    const modifiers: POSModifier[] = [];
    if (itemData.modifierListInfo && modifierLists) {
      for (const modListInfo of itemData.modifierListInfo) {
        if (!modListInfo.modifierListId) continue;
        
        const modListObj = modifierLists.get(modListInfo.modifierListId);
        if (modListObj) {
          const mapped = this.mapModifierList(modListObj);
          if (mapped) {
            modifiers.push(mapped);
          }
        }
      }
    }

    return {
      id: item.id || "",
      name: itemData.name || "Unknown Item",
      description: itemData.description || undefined,
      price,
      category: itemData.categoryId || undefined,
      modifiers,
      available: true, // Square doesn't have isDeleted on itemData
    };
  }

  /**
   * Map a Square Modifier List to our POSModifier format
   * This allows partners to keep their existing modifier structure
   */
  static mapModifierList(modifierListObj: Square.CatalogObject): POSModifier | null {
    if (modifierListObj.type !== "MODIFIER_LIST") {
      return null;
    }

    const modListData = (modifierListObj as Square.CatalogObject.ModifierList).modifierListData;
    if (!modListData) {
      return null;
    }

    const modifiers = modListData.modifiers || [];

    const options: POSModifierOption[] = modifiers
      .filter((mod) => mod.type === "MODIFIER")
      .map((mod) => {
        const modObj = mod as Square.CatalogObject.Modifier;
        const modData = modObj.modifierData;
        if (!modData) {
          return null;
        }
        return {
          id: mod.id || "",
          name: modData.name || "Unknown",
          price: this.moneyToPrice(modData.priceMoney),
          available: true,
        };
      })
      .filter((opt): opt is POSModifierOption => opt !== null);

    // Determine if required based on selection type
    const selectionType = modListData.selectionType || "MULTIPLE";
    const required = selectionType === "SINGLE";

    return {
      id: modifierListObj.id || "",
      name: modListData.name || "Unknown Modifier List",
      options,
      required,
      minSelections: required ? 1 : undefined,
      maxSelections: selectionType === "SINGLE" ? 1 : undefined,
    };
  }

  /**
   * Build a map of modifier lists for quick lookup
   * This optimization helps when processing large catalogs
   */
  static buildModifierListMap(catalogObjects: Square.CatalogObject[]): Map<string, Square.CatalogObject> {
    const map = new Map<string, Square.CatalogObject>();
    
    for (const obj of catalogObjects) {
      if (obj.type === "MODIFIER_LIST" && obj.id) {
        map.set(obj.id, obj);
      }
    }
    
    return map;
  }

  /**
   * Filter catalog items to only include relevant drink items
   * Partners can customize this to filter their specific menu structure
   */
  static filterDrinkItems(catalogObjects: Square.CatalogObject[]): Square.CatalogObject[] {
    return catalogObjects.filter((obj) => {
      if (obj.type !== "ITEM") {
        return false;
      }
      
      // Could filter by category, name patterns, etc.
      // For now, include all items
      return true;
    });
  }

  /**
   * Complete mapping pipeline for partner onboarding
   * Takes Square catalog and returns our standardized menu items
   */
  static mapSquareCatalogToMenuItems(catalogObjects: Square.CatalogObject[]): POSMenuItem[] {
    // Build modifier list lookup map
    const modifierLists = this.buildModifierListMap(catalogObjects);
    
    // Filter to drink items (partners can customize this)
    const drinkItems = this.filterDrinkItems(catalogObjects);
    
    // Map each item to our model
    const menuItems: POSMenuItem[] = [];
    for (const item of drinkItems) {
      const mapped = this.mapCatalogItemToMenuItem(item, modifierLists);
      if (mapped) {
        menuItems.push(mapped);
      }
    }
    
    return menuItems;
  }
}
