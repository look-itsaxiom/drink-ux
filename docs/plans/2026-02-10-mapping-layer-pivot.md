# Drink-UX Architecture Pivot: Mapping Layer

**Date:** 2026-02-10
**Status:** Draft
**Goal:** Transform Drink-UX from "source of truth menu system" to "smart mapping layer on top of POS"

---

## Executive Summary

**Before:** Drink-UX owns the menu. Shop owners recreate their menu in our system. We sync TO Square.

**After:** Square owns the menu. Drink-UX stores *mappings* that translate POS items into our drink-builder model. We read FROM Square, display beautifully, submit orders using their IDs.

**Why:** Eliminates the biggest friction point (menu duplication) while preserving the core value (luxury ordering UX).

---

## Architecture Comparison

### Current (Source of Truth)
```
Square ←── sync ←── Drink-UX DB ←── Admin UI
                         ↓
                    Mobile App
```
- Drink-UX stores: Categories, Bases, Modifiers, Prices
- Shop owner manages menu in Drink-UX
- Changes sync to Square

### New (Mapping Layer)
```
Square ──→ Cache ──→ Apply Mappings ──→ Drink Builder
                          ↑
                    Mapping Table
                    (lightweight)
```
- Square stores: Items, Modifiers, Prices (source of truth)
- Drink-UX stores: Mappings only (item X = "base drink", item Y = "milk option")
- Live prices, instant updates, no sync headaches

---

## Data Model Changes

### Remove/Deprecate
- `Category` model (becomes a mapping property)
- `Base` model (becomes a mapped Square item)
- `Modifier` model (becomes a mapped Square modifier)
- Complex sync logic

### Add
```prisma
model ItemMapping {
  id              String   @id @default(cuid())
  businessId      String
  business        Business @relation(fields: [businessId], references: [id])
  
  // Square reference
  squareItemId    String
  squareVariationId String?
  
  // Drink-UX classification
  itemType        ItemType  // BASE, MODIFIER, HIDDEN, COMBO
  category        String?   // "espresso", "tea", "milk", "syrup", "topping"
  
  // Display overrides (optional)
  displayName     String?   // Override Square name if needed
  displayOrder    Int       @default(0)
  
  // Customization rules
  temperatureOptions  String[]  // ["HOT", "ICED"] or ["HOT"] etc.
  sizeOptions         String[]  // ["SMALL", "MEDIUM", "LARGE"]
  
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  
  @@unique([businessId, squareItemId])
}

enum ItemType {
  BASE        // A drink you can order (Latte, Cold Brew)
  MODIFIER    // An add-on (Oat Milk, Vanilla Syrup)
  HIDDEN      // Don't show in Drink-UX (merch, combos)
  COMBO       // Future: meal deals
}
```

### Keep (mostly unchanged)
- `Business` - shop info, OAuth tokens
- `User` - auth
- `Order` / `OrderItem` - but simplify to use Square IDs directly

---

## Phase 1: New Onboarding Flow (Week 1-2)

### Goal
Replace "create your menu" with "categorize your items"

### New CatalogTransformStep.tsx Flow
1. Fetch items from Square (already works)
2. Display items in a categorization UI:
   ```
   ┌─────────────────────────────────────────────┐
   │  We found 24 items in your Square catalog   │
   │                                             │
   │  Drag items to categorize:                  │
   │                                             │
   │  ┌─────────┐ ┌─────────┐ ┌─────────┐       │
   │  │ Bases   │ │ Milks   │ │ Syrups  │ ...   │
   │  │         │ │         │ │         │       │
   │  │ Latte ▼ │ │ Oat   ▼ │ │ Vanilla│       │
   │  │ Mocha ▼ │ │ Almond▼ │ │ Caramel│       │
   │  └─────────┘ └─────────┘ └─────────┘       │
   │                                             │
   │  ┌─────────┐                               │
   │  │ Hidden  │ (won't show in ordering)      │
   │  │ T-Shirt │                               │
   │  └─────────┘                               │
   └─────────────────────────────────────────────┘
   ```
3. Optional: AI suggests initial categorization (owner confirms)
4. Save mappings to ItemMapping table
5. Done - menu ready to use

### Tasks
- [ ] Create ItemMapping Prisma model + migration
- [ ] Create CategorizationWizard component
- [ ] API: POST /api/mappings (save categorizations)
- [ ] API: GET /api/mappings/:businessId
- [ ] Optional: AI categorization suggestions endpoint

---

## Phase 2: Live Catalog Service (Week 2)

### Goal
Fetch from Square, apply mappings, serve to mobile app

### New Service: MappedCatalogService
```typescript
class MappedCatalogService {
  // Fetch from Square + apply mappings
  async getCatalog(businessId: string): Promise<MappedCatalog> {
    const cached = await this.cache.get(businessId);
    if (cached && !this.isStale(cached)) {
      return cached;
    }
    
    const rawCatalog = await this.squareAdapter.importCatalog();
    const mappings = await this.getMappings(businessId);
    const mapped = this.applyMappings(rawCatalog, mappings);
    
    await this.cache.set(businessId, mapped, TTL);
    return mapped;
  }
  
  // Returns drink-builder-ready structure
  applyMappings(raw, mappings): MappedCatalog {
    return {
      bases: raw.items.filter(i => mappings[i.id]?.type === 'BASE'),
      modifiers: {
        milks: raw.modifiers.filter(m => mappings[m.id]?.category === 'milk'),
        syrups: raw.modifiers.filter(m => mappings[m.id]?.category === 'syrup'),
        // ...
      },
      // Live prices from Square
    };
  }
}
```

### Tasks
- [ ] Create MappedCatalogService
- [ ] Create cache layer (Redis or in-memory with TTL)
- [ ] API: GET /api/catalog/:businessId (returns mapped catalog)
- [ ] Update mobile app to use new endpoint

---

## Phase 3: Order Flow Simplification (Week 2-3)

### Goal
Orders use Square IDs directly - no translation needed

### Current Flow (complex)
```
Customer selects → Drink-UX Base ID → lookup Square ID → submit
```

### New Flow (simple)
```
Customer selects → Square Item ID (already known) → submit
```

### Changes
- Mobile app receives Square IDs in the mapped catalog
- Order submission includes Square IDs directly
- OrderService simplified - no ID translation

### Tasks
- [ ] Update mobile cart to store Square IDs
- [ ] Simplify OrderService.createOrder()
- [ ] Update order submission to Square API
- [ ] Test E2E order flow

---

## Phase 4: Admin Simplification (Week 3)

### Goal
Replace complex menu management with simple mapping management

### Remove
- Full Category CRUD
- Full Base CRUD  
- Full Modifier CRUD
- Sync status/controls

### Add
- Mapping overview ("Your menu structure")
- "New items detected" notification
- Quick recategorization UI
- "Refresh from Square" button

### Tasks
- [ ] Simplify MenuManagement.tsx
- [ ] Create MappingOverview component
- [ ] Create NewItemsAlert component
- [ ] Remove sync-related UI

---

## Phase 5: Edge Cases & Polish (Week 3-4)

### Handle
- [ ] Deleted Square items (mapping points to nothing)
- [ ] New Square items (prompt to categorize)
- [ ] Price changes (automatic - live from Square)
- [ ] Modifier availability (live from Square)
- [ ] Items that don't fit model (HIDDEN category)

### Webhook Integration (optional, improves UX)
- Square catalog webhook → invalidate cache
- Notify admin of new items to categorize

---

## Migration Path

### For Existing Test Data
1. Keep current schema temporarily
2. Add new ItemMapping model alongside
3. Build new flows using new model
4. Deprecate old models once verified

### For Future Customers
- They only see the new flow
- Never exposed to the old "menu management" complexity

---

## Success Criteria

### Demo-Ready (after Phase 3)
- [ ] Shop owner connects Square
- [ ] Categorizes items in 10-15 minutes
- [ ] Customer can order via drink builder
- [ ] Order appears in Square dashboard

### Business-Ready (after Phase 5)
- [ ] All Demo-Ready criteria
- [ ] Edge cases handled gracefully
- [ ] Admin can manage mappings easily
- [ ] System handles menu changes from Square

---

## Time Estimate

| Phase | Scope | Estimate |
|-------|-------|----------|
| Phase 1 | New onboarding | 1-2 weeks |
| Phase 2 | Live catalog service | 1 week |
| Phase 3 | Order flow | 1 week |
| Phase 4 | Admin simplification | 1 week |
| Phase 5 | Edge cases | 1 week |

**Total to Demo-Ready:** ~3-4 weeks
**Total to Business-Ready:** ~5-6 weeks

---

## Open Questions

1. **AI categorization:** Use AI to suggest initial categories, or keep it fully manual?
2. **Cache strategy:** Redis, in-memory, or simple DB cache?
3. **Webhook vs polling:** Real-time updates from Square or periodic refresh?
4. **Multi-location:** Each location has different mappings, or shared?

---

## Next Steps

1. Review and approve this plan
2. Create feature branch
3. Start Phase 1: ItemMapping model + categorization wizard
