import axios from "axios";
import { Admin } from "../Model/admin.model.js";
import { User } from "../Model/user.model.js";
import { Job } from "../Model/job.model.js";
import { Career } from "../Model/carrerpath.model.js";
import { Resume } from "../Model/resume.model.js";
import { Recommendation } from "../Model/recommendation.model.js";
import { ChatSession } from "../Model/chatbot.model.js";
import { SystemLog } from "../Model/systemLog.model.js";
import { cloudinary } from "../utils/cloudinary.js";

const sanitizeResumeFilename = (fileName) => {
    const fallbackName = "resume.pdf";
    if (!fileName || typeof fileName !== "string") return fallbackName;

    const cleaned = fileName
        .replace(/[<>:"/\\|?*\x00-\x1F]/g, "_")
        .replace(/\s+/g, " ")
        .trim();

    if (!cleaned) return fallbackName;
    return cleaned.toLowerCase().endsWith(".pdf") ? cleaned : `${cleaned}.pdf`;
};

const normalizeResumePublicId = (publicId) => {
    if (!publicId || typeof publicId !== "string") return "";
    return publicId.trim().replace(/^\/+|\/+$/g, "");
};

const appendUniqueUrl = (urls, url) => {
    if (url && typeof url === "string" && !urls.includes(url)) {
        urls.push(url);
    }
};

const buildResumeCandidateUrls = (resume) => {
    const candidateUrls = [];
    appendUniqueUrl(candidateUrls, resume.resumeUrl);

    const normalizedPublicId = normalizeResumePublicId(resume.resumePublicId);
    if (!normalizedPublicId) return candidateUrls;

    const publicIdVariants = new Set([normalizedPublicId]);
    if (normalizedPublicId.toLowerCase().endsWith(".pdf")) {
        publicIdVariants.add(normalizedPublicId.replace(/\.pdf$/i, ""));
    } else {
        publicIdVariants.add(`${normalizedPublicId}.pdf`);
    }

    for (const publicId of publicIdVariants) {
        for (const resourceType of ["raw", "image"]) {
            appendUniqueUrl(
                candidateUrls,
                cloudinary.url(publicId, {
                    resource_type: resourceType,
                    secure: true,
                    type: "upload",
                }),
            );

            appendUniqueUrl(
                candidateUrls,
                cloudinary.url(publicId, {
                    resource_type: resourceType,
                    sign_url: true,
                    secure: true,
                    type: "upload",
                }),
            );
        }
    }

    const expiresAt = Math.floor(Date.now() / 1000) + 10 * 60;
    for (const publicId of publicIdVariants) {
        const downloadPublicIdVariants = new Set([publicId, publicId.replace(/\.pdf$/i, "")]);

        for (const downloadPublicId of downloadPublicIdVariants) {
            if (!downloadPublicId) continue;

            for (const resourceType of ["raw", "image"]) {
                for (const type of ["upload", "authenticated"]) {
                    try {
                        appendUniqueUrl(
                            candidateUrls,
                            cloudinary.utils.private_download_url(downloadPublicId, "pdf", {
                                expires_at: expiresAt,
                                resource_type: resourceType,
                                type,
                            }),
                        );
                    } catch (error) {
                        console.error("[admin:buildResumeCandidateUrls] Failed to build signed URL:", error.message);
                    }
                }
            }
        }
    }

    return candidateUrls;
};

const sendResumePdf = async (resume, req, res) => {
    const fileName = sanitizeResumeFilename(resume.resumeFileName || "resume.pdf");
    const candidateUrls = buildResumeCandidateUrls(resume);
    const isPreviewRequest = req.headers["x-resume-preview"] === "1" || req.query?.preview === "1";

    for (const url of candidateUrls) {
        if (!url) continue;

        try {
            const response = await axios.get(url, {
                responseType: "arraybuffer",
                timeout: 30000,
                maxRedirects: 5,
                headers: {
                    Accept: "application/pdf,application/octet-stream;q=0.9,*/*;q=0.8",
                },
            });

            const responseBuffer = Buffer.from(response.data);
            const responseContentType = (response.headers?.["content-type"] || "").toLowerCase();
            const hasPdfSignature = responseBuffer.slice(0, 4).toString("utf8") === "%PDF";
            const isLikelyPdf =
                hasPdfSignature ||
                !responseContentType ||
                responseContentType.includes("pdf") ||
                responseContentType.includes("octet-stream") ||
                responseContentType.includes("binary") ||
                responseContentType.includes("download");

            if (!isLikelyPdf) {
                continue;
            }

            res.setHeader("Content-Type", "application/pdf");
            res.setHeader("Content-Disposition", `inline; filename="${fileName}"`);
            res.setHeader("Cache-Control", "private, max-age=300");
            res.setHeader("X-Content-Type-Options", "nosniff");
            return res.send(responseBuffer);
        } catch (fetchErr) {
            console.error("[admin:getUserResumePdf] Fetch failed:", fetchErr.message);
        }
    }

    if (resume.resumeUrl && !isPreviewRequest) {
        return res.redirect(resume.resumeUrl);
    }

    return res.status(502).json({ message: "Unable to fetch resume PDF from storage" });
};

/**
 * Get admin dashboard stats
 * GET /admin/dashboard
 */
export const getDashboardStats = async (req, res) => {
    const [
        totalUsers,
        verifiedUsers,
        totalJobs,
        activeJobs,
        totalCareers,
        totalResumes,
        totalRecommendations,
        recentUsers,
        recentJobs
    ] = await Promise.all([
        User.countDocuments(),
        User.countDocuments({ isVerified: true }),
        Job.countDocuments(),
        Job.countDocuments({ status: "active" }),
        Career.countDocuments({ isActive: true }),
        Resume.countDocuments(),
        Recommendation.countDocuments(),
        User.find().sort({ DateCreated: -1 }).limit(5).select("name email DateCreated isVerified"),
        Job.find().sort({ createdAt: -1 }).limit(5).select("jobTitle company.name status createdAt")
    ]);

    return res.status(200).json({
        message: "Dashboard stats retrieved",
        data: {
            stats: {
                users: { total: totalUsers, verified: verifiedUsers },
                jobs: { total: totalJobs, active: activeJobs },
                careers: totalCareers,
                resumes: totalResumes,
                recommendations: totalRecommendations
            },
            recent: {
                users: recentUsers,
                jobs: recentJobs
            }
        }
    });
};

/**
 * Get all users with pagination and filters
 * GET /admin/users
 */
export const getAllUsers = async (req, res) => {
    const { page = 1, limit = 20, search, role, verified } = req.query;

    const filter = {};
    if (role) filter.Role = role;
    if (verified !== undefined) filter.isVerified = verified === "true";
    if (search) {
        filter.$or = [
            { name: new RegExp(search, "i") },
            { email: new RegExp(search, "i") }
        ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [users, total] = await Promise.all([
        User.find(filter)
            .select("-password")
            .skip(skip)
            .limit(parseInt(limit))
            .sort({ DateCreated: -1 }),
        User.countDocuments(filter)
    ]);

    return res.status(200).json({
        message: "Users retrieved",
        data: {
            users,
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(total / parseInt(limit)),
                totalItems: total
            }
        }
    });
};

/**
 * Get single user details
 * GET /admin/users/:userId
 */
export const getUserDetails = async (req, res) => {
    const { userId } = req.params;

    const [user, resume, recommendations] = await Promise.all([
        User.findById(userId).select("-password"),
        Resume.findOne({ userId }),
        Recommendation.findOne({ userId }).sort({ generatedAt: -1 })
    ]);

    if (!user) {
        return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json({
        message: "User details retrieved",
        data: {
            user,
            resume: resume
                ? {
                    resumeUrl: resume.resumeUrl,
                    resumePdfUrl: `/admin/users/${userId}/resume/pdf`,
                    atsScore: resume.atsScore,
                    analysisStatus: resume.analysisStatus || "completed",
                    updatedAt: resume.updatedAt || resume.createdAt,
                    suggestions: resume.suggestions || []
                }
                : null,
            hasResume: !!resume,
            resumeUploadedAt: resume?.createdAt,
            topRecommendations: recommendations?.recommendations?.slice(0, 3) || []
        }
    });
};

/**
 * Get user resume PDF (admin)
 * GET /admin/users/:userId/resume/pdf
 */
export const getUserResumePdf = async (req, res) => {
    try {
        const { userId } = req.params;

        const resume = await Resume.findOne({ userId });
        if (!resume || (!resume.resumeUrl && !resume.resumePublicId)) {
            return res.status(404).json({ message: "Resume PDF not found" });
        }

        return sendResumePdf(resume, req, res);
    } catch (err) {
        console.error("[admin:getUserResumePdf] Fatal error:", err.message, err.stack);
        return res.status(500).json({ message: "Failed to fetch resume PDF" });
    }
};

/**
 * Get current admin profile info
 * GET /admin/me
 */
export const getAdminMe = async (req, res) => {
    return res.status(200).json({
        message: "Admin profile retrieved",
        data: {
            user: req.user,
            admin: req.admin
        }
    });
};

/**
 * Update user role or status
 * PATCH /admin/users/:userId
 */
export const updateUser = async (req, res) => {
    const { userId } = req.params;
    const { Role, isVerified } = req.body;

    const updates = {};
    if (Role) updates.Role = Role;
    if (isVerified !== undefined) updates.isVerified = isVerified;

    const user = await User.findByIdAndUpdate(
        userId,
        { $set: updates },
        { new: true }
    ).select("-password");

    if (!user) {
        return res.status(404).json({ message: "User not found" });
    }

    // Log admin action
    await logAdminAction(req.admin._id, "update_user", "User", userId, updates);

    return res.status(200).json({
        message: "User updated",
        data: user
    });
};

/**
 * Delete user
 * DELETE /admin/users/:userId
 */
export const deleteUser = async (req, res) => {
    const { userId } = req.params;

    // Don't allow deleting yourself
    if (userId === req.user._id.toString()) {
        return res.status(400).json({ message: "Cannot delete your own account" });
    }

    const user = await User.findByIdAndDelete(userId);
    if (!user) {
        return res.status(404).json({ message: "User not found" });
    }

    // Cleanup related data
    await Promise.all([
        Resume.deleteMany({ userId }),
        Recommendation.deleteMany({ userId }),
        ChatSession.deleteMany({ userId })
    ]);

    await logAdminAction(req.admin._id, "delete_user", "User", userId, { email: user.email });

    return res.status(200).json({ message: "User deleted" });
};

/**
 * Get all admins
 * GET /admin/admins
 */
export const getAllAdmins = async (req, res) => {
    const admins = await Admin.find({ isActive: true })
        .populate("userId", "name email avatarUrl")
        .populate("createdBy", "name");

    return res.status(200).json({
        message: "Admins retrieved",
        data: admins
    });
};

/**
 * Create new admin
 * POST /admin/admins
 */
export const createAdmin = async (req, res) => {
    const { userId, permissions, adminLevel } = req.body;

    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
        return res.status(404).json({ message: "User not found" });
    }

    // Check if already admin
    const existingAdmin = await Admin.findOne({ userId });
    if (existingAdmin) {
        return res.status(409).json({ message: "User is already an admin" });
    }

    // Update user role
    user.Role = "admin";
    await user.save();

    // Create admin record
    const admin = await Admin.create({
        userId,
        permissions: permissions || {},
        adminLevel: adminLevel || "moderator",
        createdBy: req.user._id
    });

    await logAdminAction(req.admin._id, "create_admin", "Admin", admin._id, { userId });

    return res.status(201).json({
        message: "Admin created",
        data: admin
    });
};

/**
 * Update admin permissions
 * PATCH /admin/admins/:adminId
 */
export const updateAdmin = async (req, res) => {
    const { adminId } = req.params;
    const { permissions, adminLevel, isActive } = req.body;

    const admin = await Admin.findById(adminId);
    if (!admin) {
        return res.status(404).json({ message: "Admin not found" });
    }

    if (permissions) admin.permissions = { ...admin.permissions, ...permissions };
    if (adminLevel) admin.adminLevel = adminLevel;
    if (isActive !== undefined) admin.isActive = isActive;

    await admin.save();

    await logAdminAction(req.admin._id, "update_admin", "Admin", adminId, { permissions, adminLevel });

    return res.status(200).json({
        message: "Admin updated",
        data: admin
    });
};

/**
 * Remove admin privileges
 * DELETE /admin/admins/:adminId
 */
export const removeAdmin = async (req, res) => {
    const { adminId } = req.params;

    const admin = await Admin.findById(adminId);
    if (!admin) {
        return res.status(404).json({ message: "Admin not found" });
    }

    // Don't allow removing yourself
    if (admin.userId.toString() === req.user._id.toString()) {
        return res.status(400).json({ message: "Cannot remove your own admin privileges" });
    }

    // Update user role back to student
    await User.findByIdAndUpdate(admin.userId, { $set: { Role: "student" } });

    // Deactivate admin record
    admin.isActive = false;
    await admin.save();

    await logAdminAction(req.admin._id, "remove_admin", "Admin", adminId, {});

    return res.status(200).json({ message: "Admin privileges removed" });
};

/**
 * Get system logs
 * GET /admin/logs
 */
export const getSystemLogs = async (req, res) => {
    const { type, level, page = 1, limit = 50 } = req.query;

    const filter = {};
    if (type) filter.type = type;
    if (level) filter.level = level;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [logs, total] = await Promise.all([
        SystemLog.find(filter)
            .populate("userId", "name email")
            .skip(skip)
            .limit(parseInt(limit))
            .sort({ createdAt: -1 }),
        SystemLog.countDocuments(filter)
    ]);

    return res.status(200).json({
        message: "Logs retrieved",
        data: {
            logs,
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(total / parseInt(limit)),
                totalItems: total
            }
        }
    });
};

/**
 * Get analytics data
 * GET /admin/analytics
 */
export const getAnalytics = async (req, res) => {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const atsThreshold = parseInt(req.query?.lowAtsThreshold || "50");

    const [
        usersByDay,
        jobsByCategory,
        topCareers,
        applicationStats,
        lowAtsResumes,
        resumesForSkills
    ] = await Promise.all([
        // Users created in last 30 days
        User.aggregate([
            { $match: { DateCreated: { $gte: thirtyDaysAgo } } },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$DateCreated" } },
                    count: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]),
        // Jobs by work category
        Job.aggregate([
            { $group: { _id: "$workCategory", count: { $sum: 1 } } }
        ]),
        // Most recommended careers
        Recommendation.aggregate([
            { $unwind: "$recommendations" },
            {
                $group: {
                    _id: "$recommendations.careerName",
                    count: { $sum: 1 },
                    avgScore: { $avg: "$recommendations.matchScore" }
                }
            },
            { $sort: { count: -1 } },
            { $limit: 10 }
        ]),
        // Job application stats
        Job.aggregate([
            { $match: { "applicants.0": { $exists: true } } },
            {
                $project: {
                    jobTitle: 1,
                    applicationCount: { $size: "$applicants" }
                }
            },
            { $sort: { applicationCount: -1 } },
            { $limit: 10 }
        ]),
        // Students with low ATS scores
        Resume.find({ atsScore: { $lte: atsThreshold } })
            .sort({ atsScore: 1 })
            .limit(10)
            .populate("userId", "name email")
            .select("atsScore userId updatedAt")
            .lean(),
        // Sample resumes for skill aggregation
        Resume.find({ resumeContent: { $exists: true } })
            .limit(200)
            .select("resumeContent")
            .lean()
    ]);

    const skillCounts = {};
    for (const resume of resumesForSkills) {
        const content = resume.resumeContent;
        let parsed = null;
        if (typeof content === "string") {
            try {
                parsed = JSON.parse(content);
            } catch {
                parsed = null;
            }
        } else if (typeof content === "object" && content) {
            parsed = content;
        }

        if (!parsed?.skills) continue;
        const skills = [
            ...(parsed.skills.technical || []),
            ...(parsed.skills.frameworks || []),
            ...(parsed.skills.languages || []),
            ...(parsed.skills.soft || [])
        ];
        skills.forEach((skill) => {
            if (!skill) return;
            const key = skill.toLowerCase();
            skillCounts[key] = (skillCounts[key] || 0) + 1;
        });
    }

    const popularSkills = Object.entries(skillCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 20)
        .map(([skill, count]) => ({ skill, count }));

    return res.status(200).json({
        message: "Analytics retrieved",
        data: {
            userGrowth: usersByDay,
            jobsByCategory,
            topCareers,
            topJobsByApplications: applicationStats,
            lowAtsUsers: lowAtsResumes.map((resume) => ({
                userId: resume.userId?._id,
                name: resume.userId?.name,
                email: resume.userId?.email,
                atsScore: resume.atsScore,
                updatedAt: resume.updatedAt
            })),
            popularSkills
        }
    });
};

/**
 * Helper function to log admin actions
 */
async function logAdminAction(adminId, action, target, targetId, details) {
    try {
        await Admin.findByIdAndUpdate(adminId, {
            $push: {
                activityLog: {
                    action,
                    target,
                    targetId,
                    details,
                    timestamp: new Date()
                }
            }
        });
    } catch (error) {
        console.error("Failed to log admin action:", error);
    }
}
