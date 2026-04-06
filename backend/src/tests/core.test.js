import request from "supertest";
import { describe, it, expect } from "@jest/globals";
import { createApp } from "../app.js";

const app = createApp();

describe("Core API routes", () => {
  it("GET / -> pass", async () => {
    const res = await request(app).get("/");

    expect(res.status).toBe(200);
    expect(res.body.message).toBe("Smart Career Counselling API");
  });

  it("GET /health -> pass", async () => {
    const res = await request(app).get("/health");

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("healthy");
  });

  it("Invalid route -> 404", async () => {
    const res = await request(app).get("/route-that-does-not-exist");

    expect(res.status).toBe(404);
  });
});
