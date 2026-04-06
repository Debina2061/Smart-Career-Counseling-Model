import request from "supertest";
import { jest, describe, it, expect } from "@jest/globals";
import {
  TOKENS,
  authHeader,
  authenticateTokenMock,
  isAdminMock,
  hasPermissionMock,
  buildRouteTestApp,
} from "./mocks/modelMocks.js";

const recommendationControllerMocks = {
  generateCareerRecommendations: jest.fn(async (req, res) => {
    return res.status(200).json({
      message: "Career recommendations generated successfully",
      data: {
        recommendations: [
          { careerName: "Backend Developer", matchScore: 85 },
          { careerName: "Data Analyst", matchScore: 74 },
        ],
      },
    });
  }),

  getRecommendations: jest.fn(async (req, res) => {
    return res.status(200).json({ message: "Recommendations retrieved successfully", data: {} });
  }),

  getCareerDetails: jest.fn(async (req, res) => {
    return res.status(200).json({ message: "Career details retrieved successfully", data: {} });
  }),

  getAllCareers: jest.fn(async (req, res) => {
    return res.status(200).json({
      message: "Careers retrieved successfully",
      data: {
        careers: [
          { _id: "c1", careerName: "Backend Developer", category: "Software" },
          { _id: "c2", careerName: "AI Engineer", category: "AI" },
        ],
      },
    });
  }),

  createCareer: jest.fn(async (req, res) => {
    const { careerName, category } = req.body;

    if (!careerName || !category) {
      return res.status(400).json({ message: "Career name and category are required" });
    }

    return res.status(201).json({
      message: "Career created successfully",
      data: {
        _id: "new-career-1",
        careerName,
        category,
      },
    });
  }),

  updateCareer: jest.fn(async (req, res) => {
    return res.status(200).json({ message: "Career updated successfully", data: {} });
  }),

  deleteCareer: jest.fn(async (req, res) => {
    return res.status(200).json({ message: "Career deleted successfully" });
  }),

  compareWithCareer: jest.fn(async (req, res) => {
    return res.status(200).json({ message: "Comparison completed", data: {} });
  }),

  checkRecommendationHealth: jest.fn(async (req, res) => {
    return res.status(200).json({
      message: "Recommendation system health check",
      data: {
        status: "operational",
      },
    });
  }),

  debugResumeData: jest.fn(async (req, res) => {
    return res.status(200).json({ message: "Resume data found", data: {} });
  }),

  searchCareers: jest.fn(async (req, res) => {
    const { career } = req.body;

    if (!career) {
      return res.status(400).json({ message: "Career search parameter is required" });
    }

    return res.status(200).json({
      message: "Career search completed successfully",
      data: {
        careers: [{ _id: "c1", careerName: "Backend Developer" }],
        totalResults: 1,
      },
    });
  }),
};

jest.unstable_mockModule("../Controller/recommendation.controller.js", () => recommendationControllerMocks);
jest.unstable_mockModule("../middleware/auth.middleware.js", () => ({
  authenticateToken: authenticateTokenMock,
}));
jest.unstable_mockModule("../middleware/admin.middleware.js", () => ({
  isAdmin: isAdminMock,
  hasPermission: hasPermissionMock,
  isSuperAdmin: (req, res, next) => next(),
}));

const { recommendationRouter } = await import("../Routes/recommendation.route.js");
const app = buildRouteTestApp("/recommendation", recommendationRouter);

describe("Recommendation routes", () => {
  it("Recommendation health check -> pass", async () => {
    const res = await request(app).get("/recommendation/health/status");

    expect(res.status).toBe(200);
  });

  it("Generate recommendations -> pass", async () => {
    const res = await request(app)
      .post("/recommendation/generate")
      .set(authHeader(TOKENS.user))
      .send({ useAI: false });

    expect(res.status).toBe(200);
  });

  it("Search careers with valid input -> pass", async () => {
    const res = await request(app)
      .post("/recommendation/search")
      .set(authHeader(TOKENS.user))
      .send({ career: "backend developer", skills: ["Node.js"] });

    expect(res.status).toBe(200);
  });

  it("Search careers with invalid input -> fail", async () => {
    const res = await request(app)
      .post("/recommendation/search")
      .set(authHeader(TOKENS.user))
      .send({ skills: ["Node.js"] });

    expect(res.status).toBe(400);
  });

  it("Get all public careers -> pass", async () => {
    const res = await request(app).get("/recommendation/careers");

    expect(res.status).toBe(200);
  });

  it("Create career as admin -> pass", async () => {
    const res = await request(app)
      .post("/recommendation/careers")
      .set(authHeader(TOKENS.admin))
      .send({
        careerName: "DevOps Engineer",
        category: "Software",
      });

    expect(res.status).toBe(201);
  });

  it("Create career as non-admin -> fail", async () => {
    const res = await request(app)
      .post("/recommendation/careers")
      .set(authHeader(TOKENS.user))
      .send({
        careerName: "DevOps Engineer",
        category: "Software",
      });

    expect(res.status).toBe(403);
  });
});
