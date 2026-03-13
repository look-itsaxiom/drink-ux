import { templateCatalog, TemplateCatalog } from '../templateCatalog';

describe('templateCatalog', () => {
  describe('Structure validation', () => {
    it('exports a valid template catalog object', () => {
      expect(templateCatalog).toBeDefined();
      expect(templateCatalog.categories).toBeDefined();
      expect(templateCatalog.bases).toBeDefined();
      expect(templateCatalog.modifiers).toBeDefined();
      expect(Array.isArray(templateCatalog.categories)).toBe(true);
      expect(Array.isArray(templateCatalog.bases)).toBe(true);
      expect(Array.isArray(templateCatalog.modifiers)).toBe(true);
    });

    it('contains all required category names', () => {
      const categoryNames = templateCatalog.categories.map((c) => c.name);

      expect(categoryNames).toContain('Coffee');
      expect(categoryNames).toContain('Tea');
      expect(categoryNames).toContain('Other');
    });
  });

  describe('Categories', () => {
    it('all categories have required fields', () => {
      for (const category of templateCatalog.categories) {
        expect(category.name).toBeDefined();
        expect(typeof category.name).toBe('string');
        expect(category.name.length).toBeGreaterThan(0);

        expect(category.displayOrder).toBeDefined();
        expect(typeof category.displayOrder).toBe('number');
        expect(category.displayOrder).toBeGreaterThanOrEqual(0);
      }
    });

    it('categories have unique names', () => {
      const names = templateCatalog.categories.map((c) => c.name);
      const uniqueNames = new Set(names);
      expect(uniqueNames.size).toBe(names.length);
    });

    it('categories have sequential display orders', () => {
      const orders = templateCatalog.categories.map((c) => c.displayOrder).sort((a, b) => a - b);
      for (let i = 0; i < orders.length; i++) {
        expect(orders[i]).toBe(i + 1);
      }
    });
  });

  describe('Bases', () => {
    it('all bases have required fields', () => {
      for (const base of templateCatalog.bases) {
        expect(base.name).toBeDefined();
        expect(typeof base.name).toBe('string');
        expect(base.name.length).toBeGreaterThan(0);

        expect(base.category).toBeDefined();
        expect(typeof base.category).toBe('string');

        expect(base.price).toBeDefined();
        expect(typeof base.price).toBe('number');
        expect(base.price).toBeGreaterThanOrEqual(0);

        expect(base.temp).toBeDefined();
        expect(['HOT_ONLY', 'ICED_ONLY', 'BOTH']).toContain(base.temp);
      }
    });

    it('all bases reference valid categories', () => {
      const categoryNames = templateCatalog.categories.map((c) => c.name);

      for (const base of templateCatalog.bases) {
        expect(categoryNames).toContain(base.category);
      }
    });

    it('bases have valid temperature constraints', () => {
      const validConstraints = ['HOT_ONLY', 'ICED_ONLY', 'BOTH'];

      for (const base of templateCatalog.bases) {
        expect(validConstraints).toContain(base.temp);
      }
    });

    it('bases have unique names within their category', () => {
      const namesByCategory = new Map<string, string[]>();

      for (const base of templateCatalog.bases) {
        const existing = namesByCategory.get(base.category) || [];
        expect(existing).not.toContain(base.name);
        existing.push(base.name);
        namesByCategory.set(base.category, existing);
      }
    });

    it('bases have reasonable default prices', () => {
      for (const base of templateCatalog.bases) {
        // Prices in cents, should be between $1 and $20
        expect(base.price).toBeGreaterThanOrEqual(100);
        expect(base.price).toBeLessThanOrEqual(2000);
      }
    });
  });

  describe('Modifiers', () => {
    it('all modifiers have required fields', () => {
      for (const modifier of templateCatalog.modifiers) {
        expect(modifier.name).toBeDefined();
        expect(typeof modifier.name).toBe('string');
        expect(modifier.name.length).toBeGreaterThan(0);

        expect(modifier.type).toBeDefined();
        expect(['MILK', 'SYRUP', 'TOPPING']).toContain(modifier.type);

        expect(modifier.price).toBeDefined();
        expect(typeof modifier.price).toBe('number');
        expect(modifier.price).toBeGreaterThanOrEqual(0);
      }
    });

    it('modifiers have valid types', () => {
      const validTypes = ['MILK', 'SYRUP', 'TOPPING'];

      for (const modifier of templateCatalog.modifiers) {
        expect(validTypes).toContain(modifier.type);
      }
    });

    it('has at least one modifier of each type', () => {
      const types = templateCatalog.modifiers.map((m) => m.type);

      expect(types).toContain('MILK');
      expect(types).toContain('SYRUP');
      expect(types).toContain('TOPPING');
    });

    it('milk modifiers have reasonable prices (some free)', () => {
      const milkModifiers = templateCatalog.modifiers.filter((m) => m.type === 'MILK');
      const hasFreeOption = milkModifiers.some((m) => m.price === 0);

      expect(hasFreeOption).toBe(true);

      for (const milk of milkModifiers) {
        // Milk prices should be between $0 and $1.50
        expect(milk.price).toBeLessThanOrEqual(150);
      }
    });

    it('syrup modifiers have reasonable prices', () => {
      const syrupModifiers = templateCatalog.modifiers.filter((m) => m.type === 'SYRUP');

      for (const syrup of syrupModifiers) {
        // Syrup prices should be between $0 and $1.00
        expect(syrup.price).toBeLessThanOrEqual(100);
      }
    });

    it('modifiers have unique names within their type', () => {
      const namesByType = new Map<string, string[]>();

      for (const modifier of templateCatalog.modifiers) {
        const existing = namesByType.get(modifier.type) || [];
        expect(existing).not.toContain(modifier.name);
        existing.push(modifier.name);
        namesByType.set(modifier.type, existing);
      }
    });
  });

  describe('Content quality', () => {
    it('template names are generic (not branded)', () => {
      const allNames = [
        ...templateCatalog.bases.map((b) => b.name),
        ...templateCatalog.modifiers.map((m) => m.name),
      ];

      const brandedTerms = ['starbucks', 'dunkin', 'peets', 'frappuccino', 'mccafe'];

      for (const name of allNames) {
        const lowerName = name.toLowerCase();
        for (const term of brandedTerms) {
          expect(lowerName).not.toContain(term);
        }
      }
    });

    it('template prices are reasonable defaults', () => {
      // All prices should be in cents
      const allPrices = [
        ...templateCatalog.bases.map((b) => b.price),
        ...templateCatalog.modifiers.map((m) => m.price),
      ];

      for (const price of allPrices) {
        expect(Number.isInteger(price)).toBe(true);
        expect(price).toBeGreaterThanOrEqual(0);
      }
    });

    it('includes common coffee shop items', () => {
      const baseNames = templateCatalog.bases.map((b) => b.name.toLowerCase());

      // Should have some common drinks
      const commonTerms = ['espresso', 'latte', 'americano', 'cappuccino'];
      let foundCount = 0;

      for (const term of commonTerms) {
        if (baseNames.some((name) => name.includes(term))) {
          foundCount++;
        }
      }

      expect(foundCount).toBeGreaterThanOrEqual(2);
    });

    it('includes common modifiers', () => {
      const modifierNames = templateCatalog.modifiers.map((m) => m.name.toLowerCase());

      // Should have common milk options
      expect(modifierNames.some((n) => n.includes('whole') || n.includes('milk'))).toBe(true);
      expect(modifierNames.some((n) => n.includes('oat'))).toBe(true);

      // Should have common syrups
      expect(modifierNames.some((n) => n.includes('vanilla'))).toBe(true);
    });
  });
});
