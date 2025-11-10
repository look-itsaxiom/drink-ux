import request from "supertest";
import app from "../index";

describe("API Health Check", () => {
  it("should return health status", async () => {
    const response = await request(app).get("/health");

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("status", "ok");
    expect(response.body).toHaveProperty("timestamp");
  });
});

describe("Example Routes", () => {
  it("should return hello message", async () => {
    const response = await request(app).get("/api/example");

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toBe("Hello from the API!");
  });
});
