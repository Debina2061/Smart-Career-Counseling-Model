import { Router } from "express";
import { 
    generateCareerRecommendations,
    getRecommendations,
    getCareerDetails,
    getAllCareers,
    createCareer,
    updateCareer,
    deleteCareer,
    compareWithCareer,
    checkRecommendationHealth,
    debugResumeData,
    searchCareers
} from "../Controller/recommendation.controller.js";
import { ErrorHandler } from "../utils/errorHandler.js";
import { authenticateToken } from "../middleware/auth.middleware.js";
import { isAdmin, hasPermission } from "../middleware/admin.middleware.js";

const recommendationRouter = Router();

// Health check route (public)
recommendationRouter.route("/health/status")
    .get(checkRecommendationHealth);

// Debug route (requires authentication)
recommendationRouter.route("/debug-resume")
    .get(authenticateToken, ErrorHandler(debugResumeData));

// User routes (require authentication)
recommendationRouter.route("/generate")
    .post(authenticateToken, ErrorHandler(generateCareerRecommendations));

// Career search with custom parameters (auto-search)
recommendationRouter.route("/search")
    .post(authenticateToken, ErrorHandler(searchCareers));

recommendationRouter.route("/")
    .get(authenticateToken, ErrorHandler(getRecommendations));

recommendationRouter.route("/compare/:careerId")
    .post(authenticateToken, ErrorHandler(compareWithCareer));

// Public career browsing routes
recommendationRouter.route("/careers")
    .get(ErrorHandler(getAllCareers))
    .post(
        authenticateToken,
        isAdmin,
        hasPermission("manageCareers"),
        ErrorHandler(createCareer)
    );

recommendationRouter.route("/careers/:careerId")
    .get(ErrorHandler(getCareerDetails))
    .patch(
        authenticateToken,
        isAdmin,
        hasPermission("manageCareers"),
        ErrorHandler(updateCareer)
    )
    .delete(
        authenticateToken,
        isAdmin,
        hasPermission("manageCareers"),
        ErrorHandler(deleteCareer)
    );

export { recommendationRouter };
