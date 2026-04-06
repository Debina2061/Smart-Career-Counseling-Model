import express from "express";

export const TOKENS = Object.freeze({
  user: "token-user",
  admin: "token-admin",
  limitedAdmin: "token-limited-admin",
});

export const USERS = Object.freeze({
  user: {
    _id: "user-1",
    name: "Student User",
    email: "student@example.com",
    Role: "user",
    isVerified: true,
  },
  admin: {
    _id: "admin-1",
    name: "Admin User",
    email: "admin@example.com",
    Role: "admin",
    isVerified: true,
  },
  limitedAdmin: {
    _id: "admin-2",
    name: "Limited Admin",
    email: "limited-admin@example.com",
    Role: "admin",
    isVerified: true,
  },
});

export const mockState = {
  hasResume: false,
  resumePdfExists: true,
  scans: [],
  nextScanId: 1,
  sessions: [],
  nextSessionId: 1,
};

export const resetMockState = () => {
  mockState.hasResume = false;
  mockState.resumePdfExists = true;
  mockState.scans = [];
  mockState.nextScanId = 1;
  mockState.sessions = [];
  mockState.nextSessionId = 1;
};

export const authHeader = (token = TOKENS.user) => ({
  Authorization: `Bearer ${token}`,
});

const tokenToUser = (token) => {
  if (token === TOKENS.user) return USERS.user;
  if (token === TOKENS.admin) return USERS.admin;
  if (token === TOKENS.limitedAdmin) return USERS.limitedAdmin;
  return null;
};

export const authenticateTokenMock = (req, res, next) => {
  const rawAuth = req.headers?.authorization || req.query?.token;

  if (!rawAuth) {
    return res.status(401).json({
      message: "Access Denied. No token provided",
    });
  }

  const token = rawAuth.startsWith("Bearer ") ? rawAuth.split(" ")[1] : rawAuth;
  const user = tokenToUser(token);

  if (!user) {
    return res.status(403).json({
      message: "Invalid token",
    });
  }

  req.user = user;
  return next();
};

export const isAdminMock = (req, res, next) => {
  if (!req.user || req.user.Role !== "admin") {
    return res.status(403).json({ message: "Admin access required" });
  }

  const defaultPermissions = {
    manageUsers: true,
    manageJobs: true,
    manageCareers: true,
    viewAnalytics: true,
    manageAdmins: false,
    systemSettings: false,
  };

  req.admin = {
    _id: `admin-record-${req.user._id}`,
    userId: req.user._id,
    adminLevel: req.user._id === USERS.limitedAdmin._id ? "admin" : "super-admin",
    permissions:
      req.user._id === USERS.limitedAdmin._id
        ? { ...defaultPermissions, viewAnalytics: false }
        : defaultPermissions,
  };

  return next();
};

export const hasPermissionMock = (permission) => {
  return (req, res, next) => {
    if (!req.admin?.permissions?.[permission]) {
      return res.status(403).json({
        message: `Permission denied: ${permission} access required`,
      });
    }

    return next();
  };
};

export const isSuperAdminMock = (req, res, next) => {
  if (!req.admin || req.admin.adminLevel !== "super-admin") {
    return res.status(403).json({ message: "Super admin access required" });
  }
  return next();
};

export const buildRouteTestApp = (basePath, router) => {
  const app = express();

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(basePath, router);

  app.use((err, req, res, next) => {
    const message = err?.message || "Internal server error";
    const statusCode =
      err?.statusCode ||
      err?.status ||
      (message.toLowerCase().includes("only pdf") ? 400 : 500);

    return res.status(statusCode).json({ message });
  });

  app.use((req, res) => {
    return res.status(404).json({
      message: `${req.method} ${req.url} is not found`,
    });
  });

  return app;
};
