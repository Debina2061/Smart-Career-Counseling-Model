import { Router } from "express";
import {
    createJob,
    getAllJobs,
    getJobById,
    getJobMatches,
    analyzeJobMatch,
    applyForJob,
    getMyApplications,
    updateJob,
    deleteJob,
    getJobApplicants,
    updateApplicantStatus
} from "../Controller/job.controller.js";
import { ErrorHandler } from "../utils/errorHandler.js";
import { authenticateToken } from "../middleware/auth.middleware.js";

const jobRoute = Router();

// Static routes MUST come before parameterized routes
// Create job
jobRoute.route("/create")
    .post(authenticateToken, ErrorHandler(createJob));

// User-specific routes
jobRoute.route("/user/matches")
    .get(authenticateToken, ErrorHandler(getJobMatches));

jobRoute.route("/user/applications")
    .get(authenticateToken, ErrorHandler(getMyApplications));

// Public routes
jobRoute.route("/")
    .get(ErrorHandler(getAllJobs));

// Parameterized routes (must come after static routes)
jobRoute.route("/:jobId/analyze")
    .get(authenticateToken, ErrorHandler(analyzeJobMatch));

jobRoute.route("/:jobId/apply")
    .post(authenticateToken, ErrorHandler(applyForJob));

jobRoute.route("/:jobId/applicants/:applicantId")
    .patch(authenticateToken, ErrorHandler(updateApplicantStatus));

jobRoute.route("/:jobId/applicants")
    .get(authenticateToken, ErrorHandler(getJobApplicants));

jobRoute.route("/:jobId")
    .get(ErrorHandler(getJobById))
    .patch(authenticateToken, ErrorHandler(updateJob))
    .delete(authenticateToken, ErrorHandler(deleteJob));

export { jobRoute };