/**
 * Template Catalog
 *
 * Default catalog data for the "Use Template" onboarding path.
 * Contains generic, non-branded items suitable for a typical coffee shop.
 * All prices are in cents.
 */

/**
 * Template category structure
 */
export interface TemplateCategory {
  name: string;
  displayOrder: number;
}

/**
 * Template base drink structure
 */
export interface TemplateBase {
  name: string;
  category: string;
  temp: 'HOT_ONLY' | 'ICED_ONLY' | 'BOTH';
  price: number; // In cents
}

/**
 * Template modifier structure
 */
export interface TemplateModifier {
  name: string;
  type: 'MILK' | 'SYRUP' | 'TOPPING';
  price: number; // In cents
}

/**
 * Complete template catalog structure
 */
export interface TemplateCatalog {
  categories: TemplateCategory[];
  bases: TemplateBase[];
  modifiers: TemplateModifier[];
}

/**
 * Default template catalog for coffee shops
 */
export const templateCatalog: TemplateCatalog = {
  categories: [
    { name: 'Coffee', displayOrder: 1 },
    { name: 'Tea', displayOrder: 2 },
    { name: 'Other', displayOrder: 3 },
  ],

  bases: [
    // Coffee - Hot & Iced
    { category: 'Coffee', name: 'Espresso', temp: 'HOT_ONLY', price: 300 },
    { category: 'Coffee', name: 'Americano', temp: 'BOTH', price: 350 },
    { category: 'Coffee', name: 'Latte', temp: 'BOTH', price: 450 },
    { category: 'Coffee', name: 'Cappuccino', temp: 'HOT_ONLY', price: 450 },
    { category: 'Coffee', name: 'Mocha', temp: 'BOTH', price: 500 },
    { category: 'Coffee', name: 'Macchiato', temp: 'BOTH', price: 400 },
    { category: 'Coffee', name: 'Flat White', temp: 'HOT_ONLY', price: 475 },
    { category: 'Coffee', name: 'Cold Brew', temp: 'ICED_ONLY', price: 400 },
    { category: 'Coffee', name: 'Drip Coffee', temp: 'BOTH', price: 275 },

    // Tea
    { category: 'Tea', name: 'Black Tea', temp: 'BOTH', price: 300 },
    { category: 'Tea', name: 'Green Tea', temp: 'BOTH', price: 300 },
    { category: 'Tea', name: 'Chai Latte', temp: 'BOTH', price: 450 },
    { category: 'Tea', name: 'Matcha Latte', temp: 'BOTH', price: 500 },
    { category: 'Tea', name: 'Herbal Tea', temp: 'HOT_ONLY', price: 300 },
    { category: 'Tea', name: 'Earl Grey', temp: 'BOTH', price: 300 },

    // Other
    { category: 'Other', name: 'Hot Chocolate', temp: 'HOT_ONLY', price: 400 },
    { category: 'Other', name: 'Steamer', temp: 'HOT_ONLY', price: 350 },
    { category: 'Other', name: 'Italian Soda', temp: 'ICED_ONLY', price: 375 },
    { category: 'Other', name: 'Lemonade', temp: 'ICED_ONLY', price: 350 },
    { category: 'Other', name: 'Smoothie', temp: 'ICED_ONLY', price: 550 },
  ],

  modifiers: [
    // Milk options
    { name: 'Whole Milk', type: 'MILK', price: 0 },
    { name: '2% Milk', type: 'MILK', price: 0 },
    { name: 'Skim Milk', type: 'MILK', price: 0 },
    { name: 'Oat Milk', type: 'MILK', price: 75 },
    { name: 'Almond Milk', type: 'MILK', price: 75 },
    { name: 'Coconut Milk', type: 'MILK', price: 75 },
    { name: 'Soy Milk', type: 'MILK', price: 50 },
    { name: 'Half & Half', type: 'MILK', price: 25 },
    { name: 'Heavy Cream', type: 'MILK', price: 50 },

    // Syrup flavors
    { name: 'Vanilla', type: 'SYRUP', price: 50 },
    { name: 'Caramel', type: 'SYRUP', price: 50 },
    { name: 'Hazelnut', type: 'SYRUP', price: 50 },
    { name: 'Mocha', type: 'SYRUP', price: 50 },
    { name: 'Lavender', type: 'SYRUP', price: 75 },
    { name: 'Honey', type: 'SYRUP', price: 50 },
    { name: 'Brown Sugar', type: 'SYRUP', price: 50 },
    { name: 'Pumpkin Spice', type: 'SYRUP', price: 75 },
    { name: 'Peppermint', type: 'SYRUP', price: 50 },
    { name: 'Sugar Free Vanilla', type: 'SYRUP', price: 50 },

    // Toppings
    { name: 'Whipped Cream', type: 'TOPPING', price: 50 },
    { name: 'Chocolate Drizzle', type: 'TOPPING', price: 25 },
    { name: 'Caramel Drizzle', type: 'TOPPING', price: 25 },
    { name: 'Cinnamon', type: 'TOPPING', price: 0 },
    { name: 'Cocoa Powder', type: 'TOPPING', price: 0 },
    { name: 'Extra Shot', type: 'TOPPING', price: 100 },
  ],
};
