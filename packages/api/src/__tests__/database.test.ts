import { PrismaClient } from "../../generated/prisma";
import {
  AccountState,
  POSProvider,
  OrderStatus,
} from "../../generated/prisma";

const prisma = new PrismaClient();

beforeAll(async () => {
  // Clean database before tests
  await prisma.$transaction([
    prisma.orderItem.deleteMany(),
    prisma.order.deleteMany(),
    prisma.presetModifier.deleteMany(),
    prisma.preset.deleteMany(),
    prisma.modifier.deleteMany(),
    prisma.base.deleteMany(),
    prisma.category.deleteMany(),
    prisma.business.deleteMany(),
    prisma.user.deleteMany(),
  ]);
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("Database Schema", () => {
  describe("User Model", () => {
    it("should create a user with required fields", async () => {
      const user = await prisma.user.create({
        data: {
          email: "test@example.com",
          hashedPassword: "hashed_password_here",
          name: "Test User",
        },
      });

      expect(user.id).toBeDefined();
      expect(user.email).toBe("test@example.com");
      expect(user.name).toBe("Test User");
      expect(user.emailVerified).toBe(false);
      expect(user.createdAt).toBeInstanceOf(Date);
    });

    it("should enforce unique email constraint", async () => {
      await expect(
        prisma.user.create({
          data: {
            email: "test@example.com",
            hashedPassword: "another_hash",
          },
        })
      ).rejects.toThrow();
    });
  });

  describe("Business Model", () => {
    let userId: string;

    beforeAll(async () => {
      const user = await prisma.user.findFirst({
        where: { email: "test@example.com" },
      });
      userId = user!.id;
    });

    it("should create a business with required fields", async () => {
      const business = await prisma.business.create({
        data: {
          name: "Joe's Coffee",
          slug: "joes-coffee",
          ownerId: userId,
        },
      });

      expect(business.id).toBeDefined();
      expect(business.name).toBe("Joe's Coffee");
      expect(business.slug).toBe("joes-coffee");
      expect(business.accountState).toBe(AccountState.ONBOARDING);
      expect(business.subscriptionStatus).toBeNull();
    });

    it("should enforce unique slug constraint", async () => {
      await expect(
        prisma.business.create({
          data: {
            name: "Another Coffee Shop",
            slug: "joes-coffee",
            ownerId: userId,
          },
        })
      ).rejects.toThrow();
    });

    it("should store theme as JSON", async () => {
      const business = await prisma.business.update({
        where: { slug: "joes-coffee" },
        data: {
          theme: {
            primaryColor: "#667eea",
            secondaryColor: "#764ba2",
            logoUrl: "https://example.com/logo.png",
          },
        },
      });

      expect(business.theme).toEqual({
        primaryColor: "#667eea",
        secondaryColor: "#764ba2",
        logoUrl: "https://example.com/logo.png",
      });
    });

    it("should store POS connection details", async () => {
      const business = await prisma.business.update({
        where: { slug: "joes-coffee" },
        data: {
          posProvider: POSProvider.SQUARE,
          posAccessToken: "encrypted_token_here",
          posMerchantId: "merchant_123",
          posLocationId: "location_456",
          posLastSyncAt: new Date(),
        },
      });

      expect(business.posProvider).toBe(POSProvider.SQUARE);
      expect(business.posMerchantId).toBe("merchant_123");
    });

    it("should transition account states", async () => {
      const business = await prisma.business.update({
        where: { slug: "joes-coffee" },
        data: { accountState: AccountState.SETUP_COMPLETE },
      });

      expect(business.accountState).toBe(AccountState.SETUP_COMPLETE);
    });
  });

  describe("Category Model", () => {
    let businessId: string;

    beforeAll(async () => {
      const business = await prisma.business.findFirst({
        where: { slug: "joes-coffee" },
      });
      businessId = business!.id;
    });

    it("should create a category linked to a business", async () => {
      const category = await prisma.category.create({
        data: {
          businessId,
          name: "Coffee",
          displayOrder: 1,
          color: "#6B4226",
          icon: "coffee",
        },
      });

      expect(category.id).toBeDefined();
      expect(category.name).toBe("Coffee");
      expect(category.displayOrder).toBe(1);
    });

    it("should cascade delete when business is deleted", async () => {
      // Create a temporary business and category
      const tempUser = await prisma.user.create({
        data: { email: "temp@test.com", hashedPassword: "hash" },
      });
      const tempBusiness = await prisma.business.create({
        data: { name: "Temp", slug: "temp-shop", ownerId: tempUser.id },
      });
      await prisma.category.create({
        data: { businessId: tempBusiness.id, name: "Temp Cat", displayOrder: 1 },
      });

      // Delete business - category should cascade
      await prisma.business.delete({ where: { id: tempBusiness.id } });
      await prisma.user.delete({ where: { id: tempUser.id } });

      const orphanedCategory = await prisma.category.findFirst({
        where: { businessId: tempBusiness.id },
      });
      expect(orphanedCategory).toBeNull();
    });
  });

  describe("Base Model", () => {
    let businessId: string;
    let categoryId: string;

    beforeAll(async () => {
      const business = await prisma.business.findFirst({
        where: { slug: "joes-coffee" },
      });
      businessId = business!.id;

      const category = await prisma.category.findFirst({
        where: { businessId, name: "Coffee" },
      });
      categoryId = category!.id;
    });

    it("should create a base with temperature constraint", async () => {
      const base = await prisma.base.create({
        data: {
          businessId,
          categoryId,
          name: "Espresso",
          priceCents: 350,
          visualColor: "#3d2314",
          visualOpacity: 1.0,
        },
      });

      expect(base.name).toBe("Espresso");
      // temperatureConstraint assertion removed (field no longer exists)
      expect(base.available).toBe(true);
      expect(base.posItemId).toBeNull();
    });

    it("should create a base that supports both temperatures", async () => {
      const base = await prisma.base.create({
        data: {
          businessId,
          categoryId,
          name: "Latte Base",
          priceCents: 400,
          visualColor: "#c4a484",
        },
      });

      // temperatureConstraint assertion removed (field no longer exists)
    });

    it("should store POS item ID after sync", async () => {
      const base = await prisma.base.update({
        where: {
          businessId_name: { businessId, name: "Espresso" },
        },
        data: { posItemId: "square_item_abc123" },
      });

      expect(base.posItemId).toBe("square_item_abc123");
    });
  });

  describe("Modifier Model", () => {
    let businessId: string;

    beforeAll(async () => {
      const business = await prisma.business.findFirst({
        where: { slug: "joes-coffee" },
      });
      businessId = business!.id;
    });

    it("should create milk modifiers", async () => {
      const oatMilk = await prisma.modifier.create({
        data: {
          businessId,
          modifierGroupId: "test-mg-milk",
          name: "Oat Milk",
          priceCents: 70,
          visualColor: "#f5f5dc",
          visualLayerOrder: 2,
        },
      });

      expect(oatMilk.modifierGroupId).toBe("test-mg-milk");
      expect(oatMilk.priceCents).toBe(70);
    });

    it("should create syrup modifiers", async () => {
      const vanilla = await prisma.modifier.create({
        data: {
          businessId,
          modifierGroupId: "test-mg-syrup",
          name: "Vanilla",
          priceCents: 50,
          visualColor: "#f3e5ab",
          visualLayerOrder: 1,
        },
      });

      expect(vanilla.modifierGroupId).toBe("test-mg-syrup");
    });

    it("should create topping modifiers", async () => {
      const whippedCream = await prisma.modifier.create({
        data: {
          businessId,
          modifierGroupId: "test-mg-topping",
          name: "Whipped Cream",
          priceCents: 50,
          visualColor: "#fffafa",
          visualLayerOrder: 5,
          visualAnimationType: "foam",
        },
      });

      expect(whippedCream.modifierGroupId).toBe("test-mg-topping");
      expect(whippedCream.visualAnimationType).toBe("foam");
    });
  });

  describe("Preset Model", () => {
    let businessId: string;
    let baseId: string;
    let vanillaId: string;
    let oatMilkId: string;

    beforeAll(async () => {
      const business = await prisma.business.findFirst({
        where: { slug: "joes-coffee" },
      });
      businessId = business!.id;

      const base = await prisma.base.findFirst({
        where: { businessId, name: "Latte Base" },
      });
      baseId = base!.id;

      const vanilla = await prisma.modifier.findFirst({
        where: { businessId, name: "Vanilla" },
      });
      vanillaId = vanilla!.id;

      const oatMilk = await prisma.modifier.findFirst({
        where: { businessId, name: "Oat Milk" },
      });
      oatMilkId = oatMilk!.id;
    });

    it("should create a preset with base and modifiers", async () => {
      const preset = await prisma.preset.create({
        data: {
          businessId,
          name: "Vanilla Oat Latte",
          baseId,
          defaultVariationId: 'test-variation-1',
          priceCents: 550,
          modifiers: {
            create: [
              { modifierId: vanillaId },
              { modifierId: oatMilkId },
            ],
          },
        },
        include: { modifiers: true },
      });

      expect(preset.name).toBe("Vanilla Oat Latte");
      expect(preset.defaultVariationId).toBe('test-variation-1');
      expect(preset.modifiers).toHaveLength(2);
    });

    it("should store POS item ID after sync", async () => {
      const preset = await prisma.preset.update({
        where: {
          businessId_name: { businessId, name: "Vanilla Oat Latte" },
        },
        data: { posItemId: "square_preset_xyz789" },
      });

      expect(preset.posItemId).toBe("square_preset_xyz789");
    });
  });

  describe("Order Model", () => {
    let businessId: string;

    beforeAll(async () => {
      const business = await prisma.business.findFirst({
        where: { slug: "joes-coffee" },
      });
      businessId = business!.id;
    });

    it("should create an order with items", async () => {
      const order = await prisma.order.create({
        data: {
          businessId,
          orderNumber: "A1",
          pickupCode: "TEST",
          customerName: "John Doe",
          customerEmail: "john@example.com",
          customerPhone: "555-1234",
          status: OrderStatus.PENDING,
          subtotalCents: 1250,
          taxCents: 103,
          totalCents: 1353,
          items: {
            create: [
              {
                baseId: "test-base-id-1",
                name: "Vanilla Oat Latte",
                quantity: 1,
                size: "MEDIUM",
                temperature: "HOT",
                unitPriceCents: 550,
                totalPriceCents: 550,
                modifiers: "[]",
              },
              {
                baseId: "test-base-id-2",
                name: "Espresso",
                quantity: 2,
                size: "SMALL",
                temperature: "HOT",
                unitPriceCents: 350,
                totalPriceCents: 700,
                modifiers: "[]",
              },
            ],
          },
        },
        include: { items: true },
      });

      expect(order.id).toBeDefined();
      expect(order.status).toBe(OrderStatus.PENDING);
      expect(order.customerName).toBe("John Doe");
      expect(order.items).toHaveLength(2);
    });

    it("should transition order status", async () => {
      const order = await prisma.order.findFirst({
        where: { businessId, customerName: "John Doe" },
      });

      const updated = await prisma.order.update({
        where: { id: order!.id },
        data: {
          status: OrderStatus.CONFIRMED,
          posOrderId: "square_order_12345",
        },
      });

      expect(updated.status).toBe(OrderStatus.CONFIRMED);
      expect(updated.posOrderId).toBe("square_order_12345");
    });

    it("should track order through lifecycle", async () => {
      const order = await prisma.order.findFirst({
        where: { businessId, customerName: "John Doe" },
      });

      // Confirm -> Ready -> Completed
      await prisma.order.update({
        where: { id: order!.id },
        data: { status: OrderStatus.READY },
      });

      const completed = await prisma.order.update({
        where: { id: order!.id },
        data: { status: OrderStatus.COMPLETED },
      });

      expect(completed.status).toBe(OrderStatus.COMPLETED);
    });
  });

  describe("Relationships", () => {
    it("should fetch business with all related entities", async () => {
      const business = await prisma.business.findFirst({
        where: { slug: "joes-coffee" },
        include: {
          owner: true,
          categories: true,
          bases: true,
          modifiers: true,
          presets: { include: { modifiers: true } },
          orders: { include: { items: true } },
        },
      });

      expect(business).not.toBeNull();
      expect(business!.owner).toBeDefined();
      expect(business!.categories.length).toBeGreaterThan(0);
      expect(business!.bases.length).toBeGreaterThan(0);
      expect(business!.modifiers.length).toBeGreaterThan(0);
      expect(business!.presets.length).toBeGreaterThan(0);
      expect(business!.orders.length).toBeGreaterThan(0);
    });

    it("should fetch category with bases", async () => {
      const category = await prisma.category.findFirst({
        where: { name: "Coffee" },
        include: { bases: true },
      });

      expect(category!.bases.length).toBeGreaterThan(0);
    });

    it("should fetch preset with base and modifiers", async () => {
      const preset = await prisma.preset.findFirst({
        where: { name: "Vanilla Oat Latte" },
        include: {
          base: true,
          modifiers: { include: { modifier: true } },
        },
      });

      expect(preset!.base).toBeDefined();
      expect(preset!.modifiers.length).toBe(2);
      expect(preset!.modifiers[0].modifier).toBeDefined();
    });
  });
});
