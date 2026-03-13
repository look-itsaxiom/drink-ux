describe("database module", () => {
  beforeEach(() => {
    jest.resetModules();
    delete (global as any).prisma;
  });

  it("should export a PrismaClient instance", async () => {
    const { default: prisma } = await import("../database");
    expect(prisma).toBeDefined();
    expect(prisma).toHaveProperty("user");
  });

  it("should cache PrismaClient on global in development", async () => {
    process.env.NODE_ENV = "development";
    const { default: prisma } = await import("../database");
    expect((global as any).prisma).toBe(prisma);
    process.env.NODE_ENV = "test";
  });

  it("should not cache PrismaClient on global in test/production", async () => {
    process.env.NODE_ENV = "test";
    await import("../database");
    expect((global as any).prisma).toBeUndefined();
  });

  it("should reuse global PrismaClient if already set", async () => {
    const mockClient = { user: "mock" } as any;
    (global as any).prisma = mockClient;
    const { default: prisma } = await import("../database");
    expect(prisma).toBe(mockClient);
  });
});
