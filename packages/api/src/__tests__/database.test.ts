import { PrismaClient } from "../../generated/prisma";
import {
  AccountState,
  POSProvider,
  TemperatureConstraint,
  ModifierType,
  OrderStatus,
  CupSize,
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
          basePrice: 3.5,
          temperatureConstraint: TemperatureConstraint.HOT_ONLY,
          visualColor: "#3d2314",
          visualOpacity: 1.0,
        },
      });

      expect(base.name).toBe("Espresso");
      expect(base.temperatureConstraint).toBe(TemperatureConstraint.HOT_ONLY);
      expect(base.available).toBe(true);
      expect(base.posItemId).toBeNull();
    });

    it("should create a base that supports both temperatures", async () => {
      const base = await prisma.base.create({
        data: {
          businessId,
          categoryId,
          name: "Latte Base",
          basePrice: 4.0,
          temperatureConstraint: TemperatureConstraint.BOTH,
          visualColor: "#c4a484",
        },
      });

      expect(base.temperatureConstraint).toBe(TemperatureConstraint.BOTH);
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
          type: ModifierType.MILK,
          name: "Oat Milk",
          price: 0.7,
          visualColor: "#f5f5dc",
          visualLayerOrder: 2,
        },
      });

      expect(oatMilk.type).toBe(ModifierType.MILK);
      expect(oatMilk.price).toBe(0.7);
    });

    it("should create syrup modifiers", async () => {
      const vanilla = await prisma.modifier.create({
        data: {
          businessId,
          type: ModifierType.SYRUP,
          name: "Vanilla",
          price: 0.5,
          visualColor: "#f3e5ab",
          visualLayerOrder: 1,
        },
      });

      expect(vanilla.type).toBe(ModifierType.SYRUP);
    });

    it("should create topping modifiers", async () => {
      const whippedCream = await prisma.modifier.create({
        data: {
          businessId,
          type: ModifierType.TOPPING,
          name: "Whipped Cream",
          price: 0.5,
          visualColor: "#fffafa",
          visualLayerOrder: 5,
          visualAnimationType: "foam",
        },
      });

      expect(whippedCream.type).toBe(ModifierType.TOPPING);
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
          defaultSize: CupSize.MEDIUM,
          price: 5.5,
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
      expect(preset.defaultSize).toBe(CupSize.MEDIUM);
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
          subtotal: 12.50,
          tax: 1.03,
          total: 13.53,
          items: {
            create: [
              {
                baseId: "test-base-id-1",
                name: "Vanilla Oat Latte",
                quantity: 1,
                size: "MEDIUM",
                temperature: "HOT",
                unitPrice: 5.5,
                totalPrice: 5.5,
                modifiers: "[]",
              },
              {
                baseId: "test-base-id-2",
                name: "Espresso",
                quantity: 2,
                size: "SMALL",
                temperature: "HOT",
                unitPrice: 3.5,
                totalPrice: 7.0,
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
