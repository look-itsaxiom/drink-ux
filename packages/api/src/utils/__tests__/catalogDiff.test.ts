import {
  CatalogDiff,
  DiffResult,
  LocalItem,
  LocalModifier,
  calculateCatalogDiff,
  DiffItemChange,
  DiffModifierChange,
} from '../catalogDiff';

describe('catalogDiff', () => {
  describe('calculateCatalogDiff', () => {
    // Happy path - normal successful diff calculation
    describe('happy path', () => {
      it('returns empty diff when no items exist', () => {
        const diff = calculateCatalogDiff({
          bases: [],
          modifiers: [],
          presets: [],
        });

        expect(diff.items.created).toEqual([]);
        expect(diff.items.updated).toEqual([]);
        expect(diff.items.deactivated).toEqual([]);
        expect(diff.modifiers.created).toEqual([]);
        expect(diff.modifiers.updated).toEqual([]);
        expect(diff.totalChanges).toBe(0);
        expect(diff.hasChanges).toBe(false);
      });

      it('identifies new items without posItemId', () => {
        const diff = calculateCatalogDiff({
          bases: [
            {
              id: 'base-1',
              name: 'Espresso',
              priceCents: 350,
              posItemId: null,
              available: true,
              updatedAt: new Date('2024-01-01'),
            },
          ],
          modifiers: [],
          presets: [],
        });

        expect(diff.items.created).toHaveLength(1);
        expect(diff.items.created[0].localId).toBe('base-1');
        expect(diff.items.created[0].name).toBe('Espresso');
        expect(diff.items.created[0].itemType).toBe('base');
        expect(diff.totalChanges).toBe(1);
        expect(diff.hasChanges).toBe(true);
      });

      it('identifies new presets without posItemId', () => {
        const diff = calculateCatalogDiff({
          bases: [],
          modifiers: [],
          presets: [
            {
              id: 'preset-1',
              name: 'Vanilla Latte',
              priceCents: 550,
              posItemId: null,
              available: true,
              updatedAt: new Date('2024-01-01'),
            },
          ],
        });

        expect(diff.items.created).toHaveLength(1);
        expect(diff.items.created[0].localId).toBe('preset-1');
        expect(diff.items.created[0].itemType).toBe('preset');
      });

      it('identifies new modifiers without posModifierId', () => {
        const diff = calculateCatalogDiff({
          bases: [],
          modifiers: [
            {
              id: 'mod-1',
              name: 'Oat Milk',
              groupName: 'MILK',
              priceCents: 70,
              posModifierId: null,
              available: true,
              updatedAt: new Date('2024-01-01'),
            },
          ],
          presets: [],
        });

        expect(diff.modifiers.created).toHaveLength(1);
        expect(diff.modifiers.created[0].localId).toBe('mod-1');
        expect(diff.modifiers.created[0].name).toBe('Oat Milk');
        expect(diff.totalChanges).toBe(1);
      });
    });

    // Success scenarios - various catalog states
    describe('success scenarios', () => {
      it('identifies updated items (synced before, modified since)', () => {
        const lastSyncTime = new Date('2024-01-01T12:00:00Z');
        const afterSyncTime = new Date('2024-01-02T12:00:00Z');

        const diff = calculateCatalogDiff(
          {
            bases: [
              {
                id: 'base-1',
                name: 'Updated Espresso',
                priceCents: 400,
                posItemId: 'pos-item-123', // Already synced
                available: true,
                updatedAt: afterSyncTime, // Modified after sync
              },
            ],
            modifiers: [],
            presets: [],
          },
          lastSyncTime
        );

        expect(diff.items.updated).toHaveLength(1);
        expect(diff.items.updated[0].localId).toBe('base-1');
        expect(diff.items.updated[0].posItemId).toBe('pos-item-123');
      });

      it('identifies deactivated items (has posItemId, available=false)', () => {
        const diff = calculateCatalogDiff({
          bases: [
            {
              id: 'base-1',
              name: 'Old Espresso',
              priceCents: 350,
              posItemId: 'pos-item-123',
              available: false, // Deactivated
              updatedAt: new Date('2024-01-01'),
            },
          ],
          modifiers: [],
          presets: [],
        });

        expect(diff.items.deactivated).toHaveLength(1);
        expect(diff.items.deactivated[0].localId).toBe('base-1');
        expect(diff.items.deactivated[0].posItemId).toBe('pos-item-123');
      });

      it('does not include synced items that have not changed', () => {
        const lastSyncTime = new Date('2024-01-02T12:00:00Z');
        const beforeSyncTime = new Date('2024-01-01T12:00:00Z');

        const diff = calculateCatalogDiff(
          {
            bases: [
              {
                id: 'base-1',
                name: 'Espresso',
                priceCents: 350,
                posItemId: 'pos-item-123',
                available: true,
                updatedAt: beforeSyncTime, // Modified before sync
              },
            ],
            modifiers: [],
            presets: [],
          },
          lastSyncTime
        );

        expect(diff.items.created).toHaveLength(0);
        expect(diff.items.updated).toHaveLength(0);
        expect(diff.items.deactivated).toHaveLength(0);
        expect(diff.hasChanges).toBe(false);
      });

      it('handles mixed catalog with creates, updates, and deactivates', () => {
        const lastSyncTime = new Date('2024-01-01T12:00:00Z');
        const afterSyncTime = new Date('2024-01-02T12:00:00Z');

        const diff = calculateCatalogDiff(
          {
            bases: [
              // New item
              {
                id: 'base-new',
                name: 'New Item',
                priceCents: 300,
                posItemId: null,
                available: true,
                updatedAt: afterSyncTime,
              },
              // Updated item
              {
                id: 'base-updated',
                name: 'Updated Item',
                priceCents: 400,
                posItemId: 'pos-123',
                available: true,
                updatedAt: afterSyncTime,
              },
              // Deactivated item
              {
                id: 'base-deactivated',
                name: 'Old Item',
                priceCents: 350,
                posItemId: 'pos-456',
                available: false,
                updatedAt: afterSyncTime,
              },
              // Unchanged item
              {
                id: 'base-unchanged',
                name: 'Unchanged',
                priceCents: 300,
                posItemId: 'pos-789',
                available: true,
                updatedAt: new Date('2023-12-01'), // Before sync
              },
            ],
            modifiers: [
              // New modifier
              {
                id: 'mod-new',
                name: 'New Syrup',
                groupName: 'SYRUP',
                priceCents: 50,
                posModifierId: null,
                available: true,
                updatedAt: afterSyncTime,
              },
            ],
            presets: [],
          },
          lastSyncTime
        );

        expect(diff.items.created).toHaveLength(1);
        expect(diff.items.updated).toHaveLength(1);
        expect(diff.items.deactivated).toHaveLength(1);
        expect(diff.modifiers.created).toHaveLength(1);
        expect(diff.totalChanges).toBe(4);
        expect(diff.hasChanges).toBe(true);
      });

      it('handles presets in all three states', () => {
        const lastSyncTime = new Date('2024-01-01T12:00:00Z');
        const afterSyncTime = new Date('2024-01-02T12:00:00Z');

        const diff = calculateCatalogDiff(
          {
            bases: [],
            modifiers: [],
            presets: [
              {
                id: 'preset-new',
                name: 'New Latte',
                priceCents: 500,
                posItemId: null,
                available: true,
                updatedAt: afterSyncTime,
              },
              {
                id: 'preset-updated',
                name: 'Updated Latte',
                priceCents: 550,
                posItemId: 'pos-preset-1',
                available: true,
                updatedAt: afterSyncTime,
              },
              {
                id: 'preset-deactivated',
                name: 'Old Latte',
                priceCents: 500,
                posItemId: 'pos-preset-2',
                available: false,
                updatedAt: afterSyncTime,
              },
            ],
          },
          lastSyncTime
        );

        expect(diff.items.created).toHaveLength(1);
        expect(diff.items.created[0].itemType).toBe('preset');
        expect(diff.items.updated).toHaveLength(1);
        expect(diff.items.updated[0].itemType).toBe('preset');
        expect(diff.items.deactivated).toHaveLength(1);
        expect(diff.items.deactivated[0].itemType).toBe('preset');
      });
    });

    // Edge cases
    describe('edge cases', () => {
      it('handles empty catalog with last sync time', () => {
        const diff = calculateCatalogDiff(
          { bases: [], modifiers: [], presets: [] },
          new Date('2024-01-01')
        );

        expect(diff.totalChanges).toBe(0);
        expect(diff.hasChanges).toBe(false);
      });

      it('handles null lastSyncedAt (treats all synced items as updates)', () => {
        const diff = calculateCatalogDiff(
          {
            bases: [
              {
                id: 'base-1',
                name: 'Espresso',
                priceCents: 350,
                posItemId: 'pos-123',
                available: true,
                updatedAt: new Date('2024-01-01'),
              },
            ],
            modifiers: [],
            presets: [],
          },
          null // No previous sync
        );

        // If never synced before, synced items should be considered updates
        expect(diff.items.updated).toHaveLength(1);
      });

      it('handles undefined lastSyncedAt same as null', () => {
        const diff = calculateCatalogDiff({
          bases: [
            {
              id: 'base-1',
              name: 'Espresso',
              priceCents: 350,
              posItemId: 'pos-123',
              available: true,
              updatedAt: new Date('2024-01-01'),
            },
          ],
          modifiers: [],
          presets: [],
        });

        expect(diff.items.updated).toHaveLength(1);
      });

      it('correctly identifies item type in change object', () => {
        const diff = calculateCatalogDiff({
          bases: [
            {
              id: 'base-1',
              name: 'Base Item',
              priceCents: 350,
              posItemId: null,
              available: true,
              updatedAt: new Date(),
            },
          ],
          modifiers: [],
          presets: [
            {
              id: 'preset-1',
              name: 'Preset Item',
              priceCents: 500,
              posItemId: null,
              available: true,
              updatedAt: new Date(),
            },
          ],
        });

        expect(diff.items.created).toHaveLength(2);
        const baseChange = diff.items.created.find(c => c.itemType === 'base');
        const presetChange = diff.items.created.find(c => c.itemType === 'preset');
        expect(baseChange).toBeDefined();
        expect(presetChange).toBeDefined();
      });

      it('includes price information in change objects', () => {
        const diff = calculateCatalogDiff({
          bases: [
            {
              id: 'base-1',
              name: 'Espresso',
              priceCents: 350,
              posItemId: null,
              available: true,
              updatedAt: new Date(),
            },
          ],
          modifiers: [
            {
              id: 'mod-1',
              name: 'Vanilla',
              groupName: 'SYRUP',
              priceCents: 75,
              posModifierId: null,
              available: true,
              updatedAt: new Date(),
            },
          ],
          presets: [
            {
              id: 'preset-1',
              name: 'Latte',
              priceCents: 450,
              posItemId: null,
              available: true,
              updatedAt: new Date(),
            },
          ],
        });

        expect(diff.items.created[0].priceCents).toBe(350);
        expect(diff.items.created[1].priceCents).toBe(450);
        expect(diff.modifiers.created[0].priceCents).toBe(75);
      });

      it('handles modifier type field correctly', () => {
        const diff = calculateCatalogDiff({
          bases: [],
          modifiers: [
            {
              id: 'mod-milk',
              name: 'Oat Milk',
              groupName: 'MILK',
              priceCents: 70,
              posModifierId: null,
              available: true,
              updatedAt: new Date(),
            },
            {
              id: 'mod-syrup',
              name: 'Vanilla',
              groupName: 'SYRUP',
              priceCents: 50,
              posModifierId: null,
              available: true,
              updatedAt: new Date(),
            },
            {
              id: 'mod-topping',
              name: 'Whipped Cream',
              groupName: 'TOPPING',
              priceCents: 50,
              posModifierId: null,
              available: true,
              updatedAt: new Date(),
            },
          ],
          presets: [],
        });

        expect(diff.modifiers.created).toHaveLength(3);
        expect(diff.modifiers.created.find(m => m.groupName === 'MILK')).toBeDefined();
        expect(diff.modifiers.created.find(m => m.groupName === 'SYRUP')).toBeDefined();
        expect(diff.modifiers.created.find(m => m.groupName === 'TOPPING')).toBeDefined();
      });

      it('handles large catalog efficiently', () => {
        const bases: LocalItem[] = [];
        const modifiers: LocalModifier[] = [];

        // Create 100 items with mixed states
        for (let i = 0; i < 100; i++) {
          bases.push({
            id: `base-${i}`,
            name: `Item ${i}`,
            priceCents: 300 + i * 10,
            posItemId: i % 3 === 0 ? null : `pos-${i}`,
            available: i % 5 !== 0,
            updatedAt: new Date('2024-01-02'),
          });
        }

        // Create 50 modifiers
        for (let i = 0; i < 50; i++) {
          modifiers.push({
            id: `mod-${i}`,
            name: `Modifier ${i}`,
            groupName: 'SYRUP',
            priceCents: 50,
            posModifierId: i % 2 === 0 ? null : `pos-mod-${i}`,
            available: true,
            updatedAt: new Date('2024-01-02'),
          });
        }

        const start = Date.now();
        const diff = calculateCatalogDiff(
          { bases, modifiers, presets: [] },
          new Date('2024-01-01')
        );
        const duration = Date.now() - start;

        // Should complete within reasonable time (less than 100ms)
        expect(duration).toBeLessThan(100);
        expect(diff.totalChanges).toBeGreaterThan(0);
      });
    });

    // Failure scenarios - data validation
    describe('validation', () => {
      it('handles items with empty names', () => {
        const diff = calculateCatalogDiff({
          bases: [
            {
              id: 'base-1',
              name: '',
              priceCents: 350,
              posItemId: null,
              available: true,
              updatedAt: new Date(),
            },
          ],
          modifiers: [],
          presets: [],
        });

        // Should still include the item, validation is not the diff's job
        expect(diff.items.created).toHaveLength(1);
      });

      it('handles items with zero or negative prices', () => {
        const diff = calculateCatalogDiff({
          bases: [
            {
              id: 'base-1',
              name: 'Free Item',
              priceCents: 0,
              posItemId: null,
              available: true,
              updatedAt: new Date(),
            },
          ],
          modifiers: [],
          presets: [],
        });

        expect(diff.items.created).toHaveLength(1);
        expect(diff.items.created[0].priceCents).toBe(0);
      });
    });
  });
});
