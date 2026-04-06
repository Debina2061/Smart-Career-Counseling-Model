import request from "supertest";
import { jest, describe, it, expect } from "@jest/globals";
import {
  TOKENS,
  authHeader,
  authenticateTokenMock,
  buildRouteTestApp,
} from "./mocks/modelMocks.js";

const authControllerMocks = {
  SignUp: jest.fn(async (req, res) => {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        message: "User must be provided all fields for sign up",
      });
    }

    const regExp = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!regExp.test(email)) {
      return res.status(400).json({
        message: "Please provide a valid email address",
      });
    }

    if (email === "student@example.com") {
      return res.status(401).json({
        message: "User with this email already exists",
      });
    }

    return res.status(201).json({
      message: "Account created. Please verify your email with the OTP sent to your inbox.",
      requiresVerification: true,
      user: { name, email },
    });
  }),
  SignOut: jest.fn(async (req, res) => {
    return res.status(200).json({ message: "User signed out successfully" });
  }),
  LoginRequest: jest.fn(async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "User must provide all fields for sign in" });
    }

    if (email === "unknown@example.com") {
      return res.status(404).json({ message: "User with this email does not exist" });
    }

    if (email === "unverified@example.com") {
      if (password !== "Unverified123!") {
        return res.status(401).json({ message: "Invalid password" });
      }
      return res.status(403).json({ message: "Please verify your email before login" });
    }

    if (email === "student@example.com" && password === "WrongPass123!") {
      return res.status(401).json({ message: "Invalid password" });
    }

    if (email === "student@example.com" && password === "ValidPass123!") {
      return res.status(200).json({
        message: "Login successfully",
        token: TOKENS.user,
        user: {
          _id: "user-1",
          email,
          name: "Student User",
          Role: "user",
          isVerified: true,
        },
      });
    }

    return res.status(401).json({ message: "Invalid password" });
  }),
  loginVerify: jest.fn(async (req, res) => {
    return res.status(200).json({ message: "Email verified successfully" });
  }),
  profile: jest.fn(async (req, res) => {
    return res.status(200).json({ message: "User profile fetched successfully", user: req.user });
  }),
  ChangePassword: jest.fn(async (req, res) => {
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      return res.status(400).json({ message: "Old password and new password must be provided" });
    }

    if (oldPassword !== "OldPass123!") {
      return res.status(401).json({ message: "Old passsword is incorrect" });
    }

    return res.status(200).json({ message: "Password changes successfully" });
  }),
  verifyEmailForgetPassword: jest.fn(async (req, res) => {
    if (!req.body?.email) {
      return res.status(404).json({ message: "User with this account is not found" });
    }
    return res.status(200).json({ message: "Password reset email sent" });
  }),
  ForgetPassword: jest.fn(async (req, res) => {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      return res.status(400).json({ message: "Email, OTP, and new password must be provided" });
    }

    if (otp !== "123456") {
      return res.status(404).json({ message: "Invalid or expired OTP" });
    }

    return res.status(200).json({ message: "Password reset successfully" });
  }),
  updateProfile: jest.fn(async (req, res) => {
    return res.status(200).json({ message: "Profile updated" });
  }),
  resendOtp: jest.fn(async (req, res) => {
    return res.status(200).json({ message: "OTP sent successfully" });
  }),
  deleteAccount: jest.fn(async (req, res) => {
    return res.status(200).json({ message: "Account deleted successfully" });
  }),
};

jest.unstable_mockModule("../Controller/auth.controller.js", () => authControllerMocks);
jest.unstable_mockModule("../middleware/auth.middleware.js", () => ({
  authenticateToken: authenticateTokenMock,
}));

const { authRouter } = await import("../Routes/auth.route.js");
const app = buildRouteTestApp("/auth", authRouter);

describe("Auth routes", () => {
  it("Login with unknown user -> fail", async () => {
    const res = await request(app).post("/auth/login").send({
      email: "unknown@example.com",
      password: "AnyPass123!",
    });

    expect(res.status).toBe(404);
  });

  it("Login with valid credentials -> pass", async () => {
    const res = await request(app).post("/auth/login").send({
      email: "student@example.com",
      password: "ValidPass123!",
    });

    expect(res.status).toBe(200);
    expect(res.body.token).toBe(TOKENS.user);
  });

  it("Login with wrong password -> fail", async () => {
    const res = await request(app).post("/auth/login").send({
      email: "student@example.com",
      password: "WrongPass123!",
    });

    expect(res.status).toBe(401);
  });

  it("Login with unverified user -> fail", async () => {
    const res = await request(app).post("/auth/login").send({
      email: "unverified@example.com",
      password: "Unverified123!",
    });

    expect(res.status).toBe(403);
  });

  it("Signup with empty fields -> fail", async () => {
    const res = await request(app).post("/auth/sign-up").send({
      name: "",
      email: "",
      password: "",
    });

    expect(res.status).toBe(400);
  });

  it("Signup with invalid email -> fail", async () => {
    const res = await request(app).post("/auth/sign-up").send({
      name: "New User",
      email: "invalid-email",
      password: "ValidPass123!",
    });

    expect(res.status).toBe(400);
  });

  it("Signup with duplicate email -> fail", async () => {
    const res = await request(app).post("/auth/sign-up").send({
      name: "Existing User",
      email: "student@example.com",
      password: "ValidPass123!",
    });

    expect(res.status).toBe(401);
  });

  it("Successful signup -> pass", async () => {
    const res = await request(app).post("/auth/sign-up").send({
      name: "Fresh User",
      email: "fresh@example.com",
      password: "ValidPass123!",
    });

    expect(res.status).toBe(201);
    expect(res.body.requiresVerification).toBe(true);
  });

  it("Forgot password request -> pass", async () => {
    const res = await request(app).post("/auth/verify-email").send({
      email: "student@example.com",
    });

    expect(res.status).toBe(200);
  });

  it("Reset password with invalid code -> fail", async () => {
    const res = await request(app).post("/auth/set-newpassword").send({
      email: "student@example.com",
      otp: "000000",
      newPassword: "NewPass123!",
    });

    expect(res.status).toBe(404);
  });

  it("Reset password with valid code -> pass", async () => {
    const res = await request(app).post("/auth/set-newpassword").send({
      email: "student@example.com",
      otp: "123456",
      newPassword: "NewPass123!",
    });

    expect(res.status).toBe(200);
  });

  it("Change password success -> pass", async () => {
    const res = await request(app)
      .post("/auth/change-password")
      .set(authHeader(TOKENS.user))
      .send({
        oldPassword: "OldPass123!",
        newPassword: "NewPass123!",
      });

    expect(res.status).toBe(200);
  });

  it("Change password wrong old password -> fail", async () => {
    const res = await request(app)
      .post("/auth/change-password")
      .set(authHeader(TOKENS.user))
      .send({
        oldPassword: "WrongOldPass123!",
        newPassword: "NewPass123!",
      });

    expect(res.status).toBe(401);
  });

  it("Delete account -> pass", async () => {
    const res = await request(app)
      .delete("/auth/delete-account")
      .set(authHeader(TOKENS.user));

    expect(res.status).toBe(200);
  });
});
