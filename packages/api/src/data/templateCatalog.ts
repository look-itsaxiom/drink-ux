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
 * Template variation for a base item
 */
export interface TemplateVariation {
  name: string;
  priceCents: number;
}

/**
 * Template base drink structure
 */
export interface TemplateBase {
  name: string;
  category: string;
  priceCents: number; // Default/base price in cents
  variations: TemplateVariation[];
}

/**
 * Template modifier group structure
 */
export interface TemplateModifierGroup {
  name: string;
  displayOrder: number;
  selectionMode: string; // "single" or "multiple"
}

/**
 * Template modifier structure
 */
export interface TemplateModifier {
  name: string;
  group: string; // Name of the ModifierGroup this belongs to
  priceCents: number;
}

/**
 * Complete template catalog structure
 */
export interface TemplateCatalog {
  categories: TemplateCategory[];
  modifierGroups: TemplateModifierGroup[];
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

  modifierGroups: [
    { name: 'Milk Options', displayOrder: 1, selectionMode: 'single' },
    { name: 'Syrups', displayOrder: 2, selectionMode: 'multiple' },
    { name: 'Toppings', displayOrder: 3, selectionMode: 'multiple' },
  ],

  bases: [
    // Coffee - each with Small/Medium/Large variations
    { category: 'Coffee', name: 'Espresso', priceCents: 300, variations: [
      { name: 'Single', priceCents: 300 }, { name: 'Double', priceCents: 400 },
    ]},
    { category: 'Coffee', name: 'Americano', priceCents: 350, variations: [
      { name: 'Small', priceCents: 350 }, { name: 'Medium', priceCents: 425 }, { name: 'Large', priceCents: 500 },
    ]},
    { category: 'Coffee', name: 'Latte', priceCents: 450, variations: [
      { name: 'Small', priceCents: 450 }, { name: 'Medium', priceCents: 550 }, { name: 'Large', priceCents: 650 },
    ]},
    { category: 'Coffee', name: 'Cappuccino', priceCents: 450, variations: [
      { name: 'Small', priceCents: 450 }, { name: 'Medium', priceCents: 550 }, { name: 'Large', priceCents: 650 },
    ]},
    { category: 'Coffee', name: 'Mocha', priceCents: 500, variations: [
      { name: 'Small', priceCents: 500 }, { name: 'Medium', priceCents: 600 }, { name: 'Large', priceCents: 700 },
    ]},
    { category: 'Coffee', name: 'Macchiato', priceCents: 400, variations: [
      { name: 'Small', priceCents: 400 }, { name: 'Medium', priceCents: 500 }, { name: 'Large', priceCents: 600 },
    ]},
    { category: 'Coffee', name: 'Flat White', priceCents: 475, variations: [
      { name: 'Small', priceCents: 475 }, { name: 'Medium', priceCents: 575 },
    ]},
    { category: 'Coffee', name: 'Cold Brew', priceCents: 400, variations: [
      { name: 'Small', priceCents: 400 }, { name: 'Medium', priceCents: 500 }, { name: 'Large', priceCents: 600 },
    ]},
    { category: 'Coffee', name: 'Drip Coffee', priceCents: 275, variations: [
      { name: 'Small', priceCents: 275 }, { name: 'Medium', priceCents: 350 }, { name: 'Large', priceCents: 425 },
    ]},

    // Tea
    { category: 'Tea', name: 'Black Tea', priceCents: 300, variations: [
      { name: 'Small', priceCents: 300 }, { name: 'Medium', priceCents: 375 }, { name: 'Large', priceCents: 450 },
    ]},
    { category: 'Tea', name: 'Green Tea', priceCents: 300, variations: [
      { name: 'Small', priceCents: 300 }, { name: 'Medium', priceCents: 375 }, { name: 'Large', priceCents: 450 },
    ]},
    { category: 'Tea', name: 'Chai Latte', priceCents: 450, variations: [
      { name: 'Small', priceCents: 450 }, { name: 'Medium', priceCents: 550 }, { name: 'Large', priceCents: 650 },
    ]},
    { category: 'Tea', name: 'Matcha Latte', priceCents: 500, variations: [
      { name: 'Small', priceCents: 500 }, { name: 'Medium', priceCents: 600 }, { name: 'Large', priceCents: 700 },
    ]},
    { category: 'Tea', name: 'Herbal Tea', priceCents: 300, variations: [
      { name: 'Small', priceCents: 300 }, { name: 'Medium', priceCents: 375 }, { name: 'Large', priceCents: 450 },
    ]},
    { category: 'Tea', name: 'Earl Grey', priceCents: 300, variations: [
      { name: 'Small', priceCents: 300 }, { name: 'Medium', priceCents: 375 }, { name: 'Large', priceCents: 450 },
    ]},

    // Other
    { category: 'Other', name: 'Hot Chocolate', priceCents: 400, variations: [
      { name: 'Small', priceCents: 400 }, { name: 'Medium', priceCents: 500 }, { name: 'Large', priceCents: 600 },
    ]},
    { category: 'Other', name: 'Steamer', priceCents: 350, variations: [
      { name: 'Small', priceCents: 350 }, { name: 'Medium', priceCents: 425 },
    ]},
    { category: 'Other', name: 'Italian Soda', priceCents: 375, variations: [
      { name: 'Small', priceCents: 375 }, { name: 'Medium', priceCents: 450 }, { name: 'Large', priceCents: 525 },
    ]},
    { category: 'Other', name: 'Lemonade', priceCents: 350, variations: [
      { name: 'Small', priceCents: 350 }, { name: 'Medium', priceCents: 425 }, { name: 'Large', priceCents: 500 },
    ]},
    { category: 'Other', name: 'Smoothie', priceCents: 550, variations: [
      { name: 'Small', priceCents: 550 }, { name: 'Medium', priceCents: 650 }, { name: 'Large', priceCents: 750 },
    ]},
  ],

  modifiers: [
    // Milk options (single-select group)
    { name: 'Whole Milk', group: 'Milk Options', priceCents: 0 },
    { name: '2% Milk', group: 'Milk Options', priceCents: 0 },
    { name: 'Skim Milk', group: 'Milk Options', priceCents: 0 },
    { name: 'Oat Milk', group: 'Milk Options', priceCents: 75 },
    { name: 'Almond Milk', group: 'Milk Options', priceCents: 75 },
    { name: 'Coconut Milk', group: 'Milk Options', priceCents: 75 },
    { name: 'Soy Milk', group: 'Milk Options', priceCents: 50 },
    { name: 'Half & Half', group: 'Milk Options', priceCents: 25 },
    { name: 'Heavy Cream', group: 'Milk Options', priceCents: 50 },

    // Syrup flavors (multi-select group)
    { name: 'Vanilla', group: 'Syrups', priceCents: 50 },
    { name: 'Caramel', group: 'Syrups', priceCents: 50 },
    { name: 'Hazelnut', group: 'Syrups', priceCents: 50 },
    { name: 'Mocha', group: 'Syrups', priceCents: 50 },
    { name: 'Lavender', group: 'Syrups', priceCents: 75 },
    { name: 'Honey', group: 'Syrups', priceCents: 50 },
    { name: 'Brown Sugar', group: 'Syrups', priceCents: 50 },
    { name: 'Pumpkin Spice', group: 'Syrups', priceCents: 75 },
    { name: 'Peppermint', group: 'Syrups', priceCents: 50 },
    { name: 'Sugar Free Vanilla', group: 'Syrups', priceCents: 50 },

    // Toppings (multi-select group)
    { name: 'Whipped Cream', group: 'Toppings', priceCents: 50 },
    { name: 'Chocolate Drizzle', group: 'Toppings', priceCents: 25 },
    { name: 'Caramel Drizzle', group: 'Toppings', priceCents: 25 },
    { name: 'Cinnamon', group: 'Toppings', priceCents: 0 },
    { name: 'Cocoa Powder', group: 'Toppings', priceCents: 0 },
    { name: 'Extra Shot', group: 'Toppings', priceCents: 100 },
  ],
};
