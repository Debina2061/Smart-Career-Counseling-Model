import request from "supertest";
import { jest, describe, it, expect } from "@jest/globals";
import {
  TOKENS,
  authHeader,
  authenticateTokenMock,
  isAdminMock,
  hasPermissionMock,
  isSuperAdminMock,
  buildRouteTestApp,
} from "./mocks/modelMocks.js";

const adminControllerMocks = {
  getDashboardStats: jest.fn(async (req, res) => {
    return res.status(200).json({
      message: "Dashboard stats retrieved",
      data: {
        stats: {
          users: { total: 50, verified: 45 },
          jobs: { total: 20, active: 14 },
          careers: 12,
        },
      },
    });
  }),

  getAdminMe: jest.fn(async (req, res) => {
    return res.status(200).json({ message: "Admin profile retrieved", data: {} });
  }),

  getAllUsers: jest.fn(async (req, res) => {
    return res.status(200).json({
      message: "Users retrieved",
      data: {
        users: [
          { _id: "user-1", email: "student@example.com", Role: "user" },
          { _id: "user-2", email: "another@example.com", Role: "user" },
        ],
      },
    });
  }),

  getUserDetails: jest.fn(async (req, res) => {
    return res.status(200).json({ message: "User details retrieved", data: {} });
  }),

  getUserResumePdf: jest.fn(async (req, res) => {
    return res.status(200).json({ message: "Resume PDF retrieved" });
  }),

  updateUser: jest.fn(async (req, res) => {
    return res.status(200).json({
      message: "User updated",
      data: {
        _id: req.params.userId,
        ...req.body,
      },
    });
  }),

  deleteUser: jest.fn(async (req, res) => {
    return res.status(200).json({ message: "User deleted" });
  }),

  getAllAdmins: jest.fn(async (req, res) => {
    return res.status(200).json({ message: "Admins retrieved", data: [] });
  }),

  createAdmin: jest.fn(async (req, res) => {
    return res.status(201).json({ message: "Admin created", data: {} });
  }),

  updateAdmin: jest.fn(async (req, res) => {
    return res.status(200).json({ message: "Admin updated", data: {} });
  }),

  removeAdmin: jest.fn(async (req, res) => {
    return res.status(200).json({ message: "Admin removed" });
  }),

  getSystemLogs: jest.fn(async (req, res) => {
    return res.status(200).json({ message: "Logs retrieved", data: {} });
  }),

  getAnalytics: jest.fn(async (req, res) => {
    return res.status(200).json({
      message: "Analytics retrieved",
      data: {
        userGrowth: [],
        jobsByCategory: [],
      },
    });
  }),
};

jest.unstable_mockModule("../Controller/admin.controller.js", () => adminControllerMocks);
jest.unstable_mockModule("../middleware/auth.middleware.js", () => ({
  authenticateToken: authenticateTokenMock,
}));
jest.unstable_mockModule("../middleware/admin.middleware.js", () => ({
  isAdmin: isAdminMock,
  hasPermission: hasPermissionMock,
  isSuperAdmin: isSuperAdminMock,
}));

const { adminRouter } = await import("../Routes/admin.route.js");
const app = buildRouteTestApp("/admin", adminRouter);

describe("Admin routes", () => {
  it("Access dashboard as admin -> pass", async () => {
    const res = await request(app)
      .get("/admin/dashboard")
      .set(authHeader(TOKENS.admin));

    expect(res.status).toBe(200);
  });

  it("Access dashboard as non-admin -> fail", async () => {
    const res = await request(app)
      .get("/admin/dashboard")
      .set(authHeader(TOKENS.user));

    expect(res.status).toBe(403);
  });

  it("View analytics with permission -> pass", async () => {
    const res = await request(app)
      .get("/admin/analytics")
      .set(authHeader(TOKENS.admin));

    expect(res.status).toBe(200);
  });

  it("Get all users -> pass", async () => {
    const res = await request(app)
      .get("/admin/users")
      .set(authHeader(TOKENS.admin));

    expect(res.status).toBe(200);
  });

  it("Update user details -> pass", async () => {
    const res = await request(app)
      .patch("/admin/users/user-1")
      .set(authHeader(TOKENS.admin))
      .send({
        Role: "admin",
        isVerified: true,
      });

    expect(res.status).toBe(200);
  });
});
