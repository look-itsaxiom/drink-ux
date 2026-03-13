import request from "supertest";
import app from "../index";
import prisma from "../database";

// Mock the database module
jest.mock("../database", () => ({
  __esModule: true,
  default: {
    user: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
  },
}));

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

describe("GET /api/example", () => {
  it("should return success with hello message", async () => {
    const res = await request(app).get("/api/example");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      success: true,
      data: "Hello from the API!",
    });
  });
});

describe("GET /api/example/users", () => {
  it("should return list of users", async () => {
    const mockUsers = [
      {
        id: "clx1",
        email: "alice@example.com",
        name: "Alice",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: "clx2",
        email: "bob@example.com",
        name: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];
    (mockPrisma.user.findMany as jest.Mock).mockResolvedValue(mockUsers);

    const res = await request(app).get("/api/example/users");

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toEqual(mockUsers);
    expect(mockPrisma.user.findMany).toHaveBeenCalledTimes(1);
  });

  it("should return empty array when no users exist", async () => {
    (mockPrisma.user.findMany as jest.Mock).mockResolvedValue([]);

    const res = await request(app).get("/api/example/users");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, data: [] });
  });

  it("should return 500 when database query fails", async () => {
    (mockPrisma.user.findMany as jest.Mock).mockRejectedValue(
      new Error("DB connection lost")
    );

    const res = await request(app).get("/api/example/users");

    expect(res.status).toBe(500);
    expect(res.body).toEqual({
      success: false,
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to fetch users",
      },
    });
  });
});

describe("POST /api/example/users", () => {
  it("should create a user with email and name", async () => {
    const newUser = {
      id: "clx3",
      email: "charlie@example.com",
      name: "Charlie",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    (mockPrisma.user.create as jest.Mock).mockResolvedValue(newUser);

    const res = await request(app)
      .post("/api/example/users")
      .send({ email: "charlie@example.com", name: "Charlie" });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toEqual(newUser);
    expect(mockPrisma.user.create).toHaveBeenCalledWith({
      data: { email: "charlie@example.com", name: "Charlie" },
    });
  });

  it("should create a user with email only (name optional)", async () => {
    const newUser = {
      id: "clx4",
      email: "dave@example.com",
      name: undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    (mockPrisma.user.create as jest.Mock).mockResolvedValue(newUser);

    const res = await request(app)
      .post("/api/example/users")
      .send({ email: "dave@example.com" });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
  });

  it("should return 400 when email is missing", async () => {
    const res = await request(app)
      .post("/api/example/users")
      .send({ name: "No Email" });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({
      success: false,
      error: {
        code: "BAD_REQUEST",
        message: "Email is required",
      },
    });
    expect(mockPrisma.user.create).not.toHaveBeenCalled();
  });

  it("should return 400 when body is empty", async () => {
    const res = await request(app)
      .post("/api/example/users")
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe("BAD_REQUEST");
  });

  it("should return 500 when database create fails", async () => {
    (mockPrisma.user.create as jest.Mock).mockRejectedValue(
      new Error("Unique constraint failed")
    );

    const res = await request(app)
      .post("/api/example/users")
      .send({ email: "duplicate@example.com" });

    expect(res.status).toBe(500);
    expect(res.body).toEqual({
      success: false,
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to create user",
      },
    });
  });
});
