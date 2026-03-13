import request from "supertest";
import app from "../index";

describe("API Health Check", () => {
  it("should return health status", async () => {
    const response = await request(app).get("/health");

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveProperty("healthy", true);
  });
});

describe("API Routes", () => {
  it("should return 404 for non-existent routes", async () => {
    const response = await request(app).get("/api/nonexistent");
    expect(response.status).toBe(404);
  });
});
