import { Admin } from "../Model/admin.model.js";
import { User } from "../Model/user.model.js";

/**
 * Middleware to check if user is admin
 */
export const isAdmin = async (req, res, next) => {
    try {
        const userId = req.user?._id;
        
        if (!userId) {
            return res.status(401).json({ message: "Authentication required" });
        }

        // Check if user has admin role
        const user = await User.findById(userId);
        if (!user || user.Role !== "admin") {
            return res.status(403).json({ message: "Admin access required" });
        }

        const defaultPermissions = {
            manageUsers: true,
            manageJobs: true,
            manageCareers: true,
            viewAnalytics: true,
            manageAdmins: false,
            systemSettings: false
        };

        // Get admin record with permissions (auto-provision if missing)
        let adminRecord = await Admin.findOne({ userId, isActive: true });
        if (!adminRecord) {
            adminRecord = await Admin.findOne({ userId });
            if (!adminRecord) {
                adminRecord = await Admin.create({
                    userId,
                    permissions: defaultPermissions,
                    adminLevel: "admin",
                    isActive: true
                });
            } else {
                adminRecord.isActive = true;
                adminRecord.permissions = adminRecord.permissions || defaultPermissions;
                adminRecord.adminLevel = adminRecord.adminLevel || "admin";
                await adminRecord.save();
            }
        }

        req.admin = adminRecord || { permissions: defaultPermissions, adminLevel: "admin", isActive: true };
        next();
    } catch (error) {
        return res.status(500).json({ message: "Error checking admin status" });
    }
};

/**
 * Middleware to check specific permission
 */
export const hasPermission = (permission) => {
    return (req, res, next) => {
        if (!req.admin) {
            return res.status(403).json({ message: "Admin access required" });
        }

        if (!req.admin.permissions[permission]) {
            return res.status(403).json({ 
                message: `Permission denied: ${permission} access required` 
            });
        }

        next();
    };
};

/**
 * Middleware to check if super admin
 */
export const isSuperAdmin = (req, res, next) => {
    if (!req.admin || req.admin.adminLevel !== "super-admin") {
        return res.status(403).json({ message: "Super admin access required" });
    }
    next();
};
