import { Router } from "express";
import {
    getDashboardStats,
    getAdminMe,
    getAllUsers,
    getUserDetails,
    getUserResumePdf,
    updateUser,
    deleteUser,
    getAllAdmins,
    createAdmin,
    updateAdmin,
    removeAdmin,
    getSystemLogs,
    getAnalytics
} from "../Controller/admin.controller.js";
import { ErrorHandler } from "../utils/errorHandler.js";
import { authenticateToken } from "../middleware/auth.middleware.js";
import { isAdmin, hasPermission, isSuperAdmin } from "../middleware/admin.middleware.js";

const adminRouter = Router();

// All admin routes require authentication and admin role
adminRouter.use(authenticateToken);
adminRouter.use(isAdmin);

// Dashboard
adminRouter.route("/dashboard")
    .get(ErrorHandler(getDashboardStats));

// Admin profile
adminRouter.route("/me")
    .get(ErrorHandler(getAdminMe));

// Analytics
adminRouter.route("/analytics")
    .get(hasPermission("viewAnalytics"), ErrorHandler(getAnalytics));

// User management
adminRouter.route("/users")
    .get(hasPermission("manageUsers"), ErrorHandler(getAllUsers));

adminRouter.route("/users/:userId/resume/pdf")
    .get(hasPermission("manageUsers"), ErrorHandler(getUserResumePdf));

adminRouter.route("/users/:userId")
    .get(hasPermission("manageUsers"), ErrorHandler(getUserDetails))
    .patch(hasPermission("manageUsers"), ErrorHandler(updateUser))
    .delete(hasPermission("manageUsers"), ErrorHandler(deleteUser));

// Admin management (super admin only)
adminRouter.route("/admins")
    .get(hasPermission("manageAdmins"), ErrorHandler(getAllAdmins))
    .post(hasPermission("manageAdmins"), ErrorHandler(createAdmin));

adminRouter.route("/admins/:adminId")
    .patch(hasPermission("manageAdmins"), ErrorHandler(updateAdmin))
    .delete(isSuperAdmin, ErrorHandler(removeAdmin));

// System logs
adminRouter.route("/logs")
    .get(hasPermission("systemSettings"), ErrorHandler(getSystemLogs));

export { adminRouter };
