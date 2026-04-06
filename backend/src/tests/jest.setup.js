import { jest } from "@jest/globals";
import { MongoMemoryServer } from "mongodb-memory-server";

process.env.NODE_ENV = "test";
process.env.JWT_SECRET_TOKEN = process.env.JWT_SECRET_TOKEN || "test-jwt-secret";
process.env.PORT = process.env.PORT || "0";
process.env.BACKEND_URL = process.env.BACKEND_URL || "http://localhost:3000";

// Exposed for future DB-backed tests; current suites use mocked models/controllers.
globalThis.MongoMemoryServer = MongoMemoryServer;

afterEach(() => {
  jest.clearAllMocks();
});
