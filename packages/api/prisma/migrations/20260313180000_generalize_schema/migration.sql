-- Generalize schema: replace coffee-shop enums with flexible models
-- This migration:
--   1. Creates ModifierGroup and Variation tables
--   2. Migrates existing data from old enum-based columns
--   3. Renames price columns from Float dollars to Int cents
--   4. Drops old enum types (ModifierType, CupSize, TemperatureConstraint)

-- =============================================================================
-- Step 1: Create new tables
-- =============================================================================

-- Add posCategoryId to Category
ALTER TABLE "Category" ADD COLUMN "posCategoryId" TEXT;

-- Create ModifierGroup table
CREATE TABLE "ModifierGroup" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "selectionMode" TEXT NOT NULL DEFAULT 'multiple',
    "posModifierListId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ModifierGroup_pkey" PRIMARY KEY ("id")
);

-- Create Variation table
CREATE TABLE "Variation" (
    "id" TEXT NOT NULL,
    "baseId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "priceCents" INTEGER NOT NULL,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "available" BOOLEAN NOT NULL DEFAULT true,
    "posVariationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Variation_pkey" PRIMARY KEY ("id")
);

-- Add indexes and constraints for new tables
CREATE UNIQUE INDEX "ModifierGroup_businessId_name_key" ON "ModifierGroup"("businessId", "name");
CREATE UNIQUE INDEX "Variation_baseId_name_key" ON "Variation"("baseId", "name");

ALTER TABLE "ModifierGroup" ADD CONSTRAINT "ModifierGroup_businessId_fkey"
    FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Variation" ADD CONSTRAINT "Variation_baseId_fkey"
    FOREIGN KEY ("baseId") REFERENCES "Base"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- =============================================================================
-- Step 2: Migrate modifier data — create ModifierGroups from existing types
-- =============================================================================

-- Add modifierGroupId column to Modifier (nullable initially for migration)
ALTER TABLE "Modifier" ADD COLUMN IF NOT EXISTS "modifierGroupId" TEXT;

-- Migrate existing modifier types to ModifierGroups (only if old type column exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Modifier' AND column_name = 'type') THEN
        -- Create ModifierGroups from distinct types
        INSERT INTO "ModifierGroup" ("id", "businessId", "name", "displayOrder", "selectionMode", "updatedAt")
        SELECT gen_random_uuid()::text, "businessId",
            CASE "type" WHEN 'MILK' THEN 'Milk Options' WHEN 'SYRUP' THEN 'Syrups' WHEN 'TOPPING' THEN 'Toppings' END,
            CASE "type" WHEN 'MILK' THEN 1 WHEN 'SYRUP' THEN 2 WHEN 'TOPPING' THEN 3 END,
            CASE "type" WHEN 'MILK' THEN 'single' ELSE 'multiple' END,
            CURRENT_TIMESTAMP
        FROM "Modifier" GROUP BY "businessId", "type";

        -- Populate modifierGroupId from the type-to-group mapping
        UPDATE "Modifier" m SET "modifierGroupId" = mg."id"
        FROM "ModifierGroup" mg
        WHERE m."businessId" = mg."businessId"
          AND mg."name" = CASE m."type"
              WHEN 'MILK' THEN 'Milk Options' WHEN 'SYRUP' THEN 'Syrups' WHEN 'TOPPING' THEN 'Toppings' END;
    END IF;
END $$;

-- Now make modifierGroupId NOT NULL (set a default for any NULLs)
ALTER TABLE "Modifier" ALTER COLUMN "modifierGroupId" SET NOT NULL;

-- Add FK constraint
ALTER TABLE "Modifier" ADD CONSTRAINT "Modifier_modifierGroupId_fkey"
    FOREIGN KEY ("modifierGroupId") REFERENCES "ModifierGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- =============================================================================
-- Step 3: Migrate Base data — create Variations from existing posVariationId
-- =============================================================================

-- For each Base that exists, create a "Default" variation
-- Create a default "Regular" variation for each Base.
-- posVariationId may or may not exist on Base depending on prior migrations.
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Base' AND column_name = 'posVariationId') THEN
        INSERT INTO "Variation" ("id", "baseId", "name", "priceCents", "displayOrder", "posVariationId", "updatedAt")
        SELECT gen_random_uuid()::text, "id", 'Regular', ROUND("basePrice" * 100)::integer, 0, "posVariationId", CURRENT_TIMESTAMP
        FROM "Base";
    ELSE
        INSERT INTO "Variation" ("id", "baseId", "name", "priceCents", "displayOrder", "updatedAt")
        SELECT gen_random_uuid()::text, "id", 'Regular', ROUND("basePrice" * 100)::integer, 0, CURRENT_TIMESTAMP
        FROM "Base";
    END IF;
END $$;

-- Add imageUrl and needsReview to Base
ALTER TABLE "Base" ADD COLUMN IF NOT EXISTS "imageUrl" TEXT;
ALTER TABLE "Base" ADD COLUMN IF NOT EXISTS "needsReview" BOOLEAN NOT NULL DEFAULT false;

-- =============================================================================
-- Step 4: Rename price columns to cents (Float → Int)
-- =============================================================================

-- Base: basePrice (Float dollars) → priceCents (Int cents)
ALTER TABLE "Base" ADD COLUMN IF NOT EXISTS "priceCents" INTEGER NOT NULL DEFAULT 0;
DO $$ BEGIN IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Base' AND column_name = 'basePrice') THEN UPDATE "Base" SET "priceCents" = ROUND("basePrice" * 100)::integer; END IF; END $$;

-- Modifier: price (Float dollars) → priceCents (Int cents)
ALTER TABLE "Modifier" ADD COLUMN IF NOT EXISTS "priceCents" INTEGER NOT NULL DEFAULT 0;
DO $$ BEGIN IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Modifier' AND column_name = 'price') THEN UPDATE "Modifier" SET "priceCents" = ROUND("price" * 100)::integer; END IF; END $$;

-- Preset: price (Float dollars) → priceCents (Int cents), defaultSize → defaultVariationId
ALTER TABLE "Preset" ADD COLUMN IF NOT EXISTS "priceCents" INTEGER NOT NULL DEFAULT 0;
DO $$ BEGIN IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Preset' AND column_name = 'price') THEN UPDATE "Preset" SET "priceCents" = ROUND("price" * 100)::integer; END IF; END $$;
ALTER TABLE "Preset" ADD COLUMN IF NOT EXISTS "defaultVariationId" TEXT;

-- Link presets to their base's default variation (the "Regular" one we just created)
UPDATE "Preset" p
SET "defaultVariationId" = v."id"
FROM "Variation" v
WHERE p."baseId" = v."baseId" AND v."name" = 'Regular';

ALTER TABLE "Preset" ADD CONSTRAINT "Preset_defaultVariationId_fkey"
    FOREIGN KEY ("defaultVariationId") REFERENCES "Variation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Order: subtotal/tax/total (Float dollars) → cents (Int)
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "subtotalCents" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "taxCents" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "totalCents" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "paymentAmountCents" INTEGER;
DO $$ BEGIN IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Order' AND column_name = 'subtotal') THEN
    UPDATE "Order" SET "subtotalCents" = ROUND("subtotal" * 100)::integer, "taxCents" = ROUND("tax" * 100)::integer, "totalCents" = ROUND("total" * 100)::integer, "paymentAmountCents" = CASE WHEN "paymentAmount" IS NOT NULL THEN ROUND("paymentAmount" * 100)::integer ELSE NULL END;
END IF; END $$;

-- OrderItem: unitPrice/totalPrice (Float dollars) → cents (Int)
ALTER TABLE "OrderItem" ADD COLUMN IF NOT EXISTS "unitPriceCents" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "OrderItem" ADD COLUMN IF NOT EXISTS "totalPriceCents" INTEGER NOT NULL DEFAULT 0;
DO $$ BEGIN IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'OrderItem' AND column_name = 'unitPrice') THEN
    UPDATE "OrderItem" SET "unitPriceCents" = ROUND("unitPrice" * 100)::integer, "totalPriceCents" = ROUND("totalPrice" * 100)::integer;
END IF; END $$;

-- SubscriptionPlan: price (Float dollars) → priceCents (Int cents)
ALTER TABLE "SubscriptionPlan" ADD COLUMN IF NOT EXISTS "priceCents" INTEGER NOT NULL DEFAULT 0;
DO $$ BEGIN IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'SubscriptionPlan' AND column_name = 'price') THEN
    UPDATE "SubscriptionPlan" SET "priceCents" = ROUND("price" * 100)::integer;
END IF; END $$;

-- =============================================================================
-- Step 5: Drop old columns and enums
-- =============================================================================

-- Drop old columns from Base (conditionally — some may not exist in fresh DBs)
ALTER TABLE "Base" DROP COLUMN IF EXISTS "basePrice";
ALTER TABLE "Base" DROP COLUMN IF EXISTS "temperatureConstraint";
ALTER TABLE "Base" DROP COLUMN IF EXISTS "posVariationId";

-- Drop old columns from Modifier (type enum and float price)
-- First drop the old unique constraint that references type
ALTER TABLE "Modifier" DROP CONSTRAINT IF EXISTS "Modifier_businessId_type_name_key";
ALTER TABLE "Modifier" DROP COLUMN IF EXISTS "type";
ALTER TABLE "Modifier" DROP COLUMN IF EXISTS "price";

-- Add new unique constraint for Modifier
CREATE UNIQUE INDEX "Modifier_businessId_modifierGroupId_name_key" ON "Modifier"("businessId", "modifierGroupId", "name");

-- Drop old columns from Preset
ALTER TABLE "Preset" DROP COLUMN IF EXISTS "defaultSize";
ALTER TABLE "Preset" DROP COLUMN IF EXISTS "price";

-- Drop old columns from Order
ALTER TABLE "Order" DROP COLUMN IF EXISTS "subtotal";
ALTER TABLE "Order" DROP COLUMN IF EXISTS "tax";
ALTER TABLE "Order" DROP COLUMN IF EXISTS "total";
ALTER TABLE "Order" DROP COLUMN IF EXISTS "paymentAmount";

-- Drop old columns from OrderItem
ALTER TABLE "OrderItem" DROP COLUMN IF EXISTS "unitPrice";
ALTER TABLE "OrderItem" DROP COLUMN IF EXISTS "totalPrice";

-- Drop old column from SubscriptionPlan
ALTER TABLE "SubscriptionPlan" DROP COLUMN IF EXISTS "price";

-- Drop old enums (only if no other columns reference them)
DROP TYPE IF EXISTS "TemperatureConstraint";
DROP TYPE IF EXISTS "ModifierType";
DROP TYPE IF EXISTS "CupSize";
