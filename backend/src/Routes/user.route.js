import express from "express";
import {
  uploadResume,
  getProfile,
  getResume,
  getResumePdf,
  getDashboard,
  calculateWeightedATSScore,
  scoreResumeForJob,
  saveScanToHistoryHTTP,
  getScanHistory,
  getScanById,
  deleteScan,
  clearScanHistory,
} from "../Controller/user.controller.js";
import { ErrorHandler } from "../utils/errorHandler.js";
import {uploadCv} from "../middleware/multer.js";
import { authenticateToken } from "../middleware/auth.middleware.js";

export const userRouter = express.Router();


userRouter
  .route("/upload_resume")
  .post(authenticateToken, uploadCv.single("resume"), ErrorHandler(uploadResume));

userRouter.route("/profile").get(authenticateToken, ErrorHandler(getProfile));
userRouter.route("/resume").get(authenticateToken, ErrorHandler(getResume));
userRouter.route("/resume/pdf").get(authenticateToken, ErrorHandler(getResumePdf));
userRouter.route("/dashboard").get(authenticateToken, ErrorHandler(getDashboard));

// Weighted ATS Scoring Routes
userRouter.route("/ats-score")
  .post(authenticateToken, ErrorHandler(calculateWeightedATSScore));

userRouter.route("/ats-score/job")
  .post(authenticateToken, ErrorHandler(scoreResumeForJob));

// ATS Scan History Routes
userRouter.route("/scan-history")
  .get(authenticateToken, ErrorHandler(getScanHistory))
  .post(authenticateToken, ErrorHandler(saveScanToHistoryHTTP))
  .delete(authenticateToken, ErrorHandler(clearScanHistory));

userRouter.route("/scan-history/:scanId")
  .get(authenticateToken, ErrorHandler(getScanById))
  .delete(authenticateToken, ErrorHandler(deleteScan));
