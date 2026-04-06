import request from "supertest";
import { jest, describe, it, expect, beforeEach } from "@jest/globals";
import {
  TOKENS,
  authHeader,
  mockState,
  resetMockState,
  authenticateTokenMock,
  buildRouteTestApp,
} from "./mocks/modelMocks.js";

const userControllerMocks = {
  uploadResume: jest.fn(async (req, res) => {
    if (!req.file) {
      return res.status(403).json({ message: "Resume must be uploaded" });
    }

    if (req.file.mimetype !== "application/pdf") {
      return res.status(400).json({ message: "Only PDF files are allowed" });
    }

    mockState.hasResume = true;
    mockState.resumePdfExists = true;

    return res.status(200).json({
      message: "Resume uploaded and analyzed successfully",
      resumeFileName: req.file.originalname,
      analysisStatus: "completed",
    });
  }),

  getProfile: jest.fn(async (req, res) => {
    return res.status(200).json({
      message: "Profile fetched successfully",
      data: {
        userId: req.user._id,
        educationLevel: "Bachelor",
      },
    });
  }),

  getResume: jest.fn(async (req, res) => {
    if (!mockState.hasResume) {
      return res.status(404).json({ message: "Resume not found" });
    }

    return res.status(200).json({
      message: "Resume fetched successfully",
      data: {
        resumeUrl: "https://example.com/resume.pdf",
        resumeFileName: "resume.pdf",
      },
    });
  }),

  getResumePdf: jest.fn(async (req, res) => {
    if (!mockState.hasResume || !mockState.resumePdfExists) {
      return res.status(404).json({ message: "Resume PDF not found" });
    }

    res.setHeader("Content-Type", "application/pdf");
    return res.status(200).send(Buffer.from("%PDF-1.4 mock"));
  }),

  getDashboard: jest.fn(async (req, res) => {
    return res.status(200).json({ message: "Dashboard data fetched", data: {} });
  }),

  calculateWeightedATSScore: jest.fn(async (req, res) => {
    if (!mockState.hasResume) {
      return res.status(404).json({
        message: "No resume found. Please upload your resume first.",
        success: false,
      });
    }

    return res.status(200).json({
      message: "ATS score calculated successfully",
      success: true,
      data: {
        final_score: 78,
      },
    });
  }),

  scoreResumeForJob: jest.fn(async (req, res) => {
    const { jobDescription } = req.body;

    if (!jobDescription || jobDescription.trim().length < 20) {
      return res.status(400).json({
        message: "Please provide a valid job description (minimum 20 characters)",
        success: false,
      });
    }

    if (!mockState.hasResume) {
      return res.status(404).json({
        message: "No resume found. Please upload your resume first.",
        success: false,
      });
    }

    return res.status(200).json({
      message: "ATS score calculated successfully",
      success: true,
      data: {
        final_score: 82,
      },
    });
  }),

  saveScanToHistoryHTTP: jest.fn(async (req, res) => {
    const scanId = `scan-${mockState.nextScanId++}`;
    mockState.scans.push({ _id: scanId, ...req.body, scannedAt: new Date().toISOString() });

    return res.status(201).json({
      message: "Scan saved to history successfully",
      success: true,
      data: { scanId },
    });
  }),

  getScanHistory: jest.fn(async (req, res) => {
    return res.status(200).json({
      message: "Scan history retrieved successfully",
      success: true,
      data: {
        scans: mockState.scans,
        pagination: {
          total: mockState.scans.length,
          page: 1,
          limit: 50,
          totalPages: 1,
        },
      },
    });
  }),

  getScanById: jest.fn(async (req, res) => {
    const scan = mockState.scans.find((item) => item._id === req.params.scanId);

    if (!scan) {
      return res.status(404).json({ message: "Scan not found", success: false });
    }

    return res.status(200).json({ message: "Scan retrieved successfully", success: true, data: scan });
  }),

  deleteScan: jest.fn(async (req, res) => {
    const idx = mockState.scans.findIndex((item) => item._id === req.params.scanId);

    if (idx === -1) {
      return res.status(404).json({ message: "Scan not found", success: false });
    }

    mockState.scans.splice(idx, 1);
    return res.status(200).json({ message: "Scan deleted successfully", success: true });
  }),

  clearScanHistory: jest.fn(async (req, res) => {
    const deletedCount = mockState.scans.length;
    mockState.scans = [];
    return res.status(200).json({
      message: `Successfully deleted ${deletedCount} scan(s)`,
      success: true,
      deletedCount,
    });
  }),
};

jest.unstable_mockModule("../Controller/user.controller.js", () => userControllerMocks);
jest.unstable_mockModule("../middleware/auth.middleware.js", () => ({
  authenticateToken: authenticateTokenMock,
}));

const { userRouter } = await import("../Routes/user.route.js");
const app = buildRouteTestApp("/user", userRouter);

describe("User/Resume/ATS routes", () => {
  beforeEach(() => {
    resetMockState();
  });

  it("Upload valid resume PDF -> pass", async () => {
    const res = await request(app)
      .post("/user/upload_resume")
      .set(authHeader(TOKENS.user))
      .attach("resume", Buffer.from("%PDF-1.4 fake-pdf"), "resume.pdf");

    expect(res.status).toBe(200);
  });

  it("Upload without file -> fail", async () => {
    const res = await request(app)
      .post("/user/upload_resume")
      .set(authHeader(TOKENS.user));

    expect(res.status).toBe(403);
  });

  it("Upload invalid file type -> fail", async () => {
    const res = await request(app)
      .post("/user/upload_resume")
      .set(authHeader(TOKENS.user))
      .attach("resume", Buffer.from("plain text"), "resume.txt");

    expect(res.status).toBe(400);
  });

  it("View user profile -> pass", async () => {
    const res = await request(app)
      .get("/user/profile")
      .set(authHeader(TOKENS.user));

    expect(res.status).toBe(200);
  });

  it("Get uploaded resume details -> pass", async () => {
    await request(app)
      .post("/user/upload_resume")
      .set(authHeader(TOKENS.user))
      .attach("resume", Buffer.from("%PDF-1.4 fake-pdf"), "resume.pdf");

    const res = await request(app)
      .get("/user/resume")
      .set(authHeader(TOKENS.user));

    expect(res.status).toBe(200);
  });

  it("Get resume PDF when exists -> pass", async () => {
    await request(app)
      .post("/user/upload_resume")
      .set(authHeader(TOKENS.user))
      .attach("resume", Buffer.from("%PDF-1.4 fake-pdf"), "resume.pdf");

    const res = await request(app)
      .get("/user/resume/pdf")
      .set(authHeader(TOKENS.user));

    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toContain("application/pdf");
  });

  it("Get resume PDF when not found -> fail", async () => {
    const res = await request(app)
      .get("/user/resume/pdf")
      .set(authHeader(TOKENS.user));

    expect(res.status).toBe(404);
  });

  it("Generate ATS score successfully -> pass", async () => {
    await request(app)
      .post("/user/upload_resume")
      .set(authHeader(TOKENS.user))
      .attach("resume", Buffer.from("%PDF-1.4 fake-pdf"), "resume.pdf");

    const res = await request(app)
      .post("/user/ats-score")
      .set(authHeader(TOKENS.user))
      .send({ requiredSkills: ["Node.js", "Express"] });

    expect(res.status).toBe(200);
  });

  it("Generate ATS score without resume -> fail", async () => {
    const res = await request(app)
      .post("/user/ats-score")
      .set(authHeader(TOKENS.user))
      .send({ requiredSkills: ["Node.js"] });

    expect(res.status).toBe(404);
  });

  it("Generate job-specific ATS score -> pass", async () => {
    await request(app)
      .post("/user/upload_resume")
      .set(authHeader(TOKENS.user))
      .attach("resume", Buffer.from("%PDF-1.4 fake-pdf"), "resume.pdf");

    const res = await request(app)
      .post("/user/ats-score/job")
      .set(authHeader(TOKENS.user))
      .send({
        jobDescription:
          "We need a backend developer with Node.js, Express, MongoDB, and testing experience.",
      });

    expect(res.status).toBe(200);
  });

  it("Save ATS scan history -> pass", async () => {
    const res = await request(app)
      .post("/user/scan-history")
      .set(authHeader(TOKENS.user))
      .send({
        scanType: "detailed",
        resumeName: "resume.pdf",
        detailedResults: { final_score: 80 },
      });

    expect(res.status).toBe(201);
    expect(res.body.data.scanId).toBeDefined();
  });

  it("Get ATS scan history -> pass", async () => {
    await request(app)
      .post("/user/scan-history")
      .set(authHeader(TOKENS.user))
      .send({
        scanType: "quick",
        resumeName: "resume.pdf",
      });

    const res = await request(app)
      .get("/user/scan-history")
      .set(authHeader(TOKENS.user));

    expect(res.status).toBe(200);
    expect(res.body.data.scans.length).toBe(1);
  });

  it("Delete scan history record -> pass", async () => {
    const saveRes = await request(app)
      .post("/user/scan-history")
      .set(authHeader(TOKENS.user))
      .send({ scanType: "quick", resumeName: "resume.pdf" });

    const scanId = saveRes.body.data.scanId;

    const res = await request(app)
      .delete(`/user/scan-history/${scanId}`)
      .set(authHeader(TOKENS.user));

    expect(res.status).toBe(200);
  });
});
