import mongoose from "mongoose";

const adminSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        unique: true
    },
    permissions: {
        manageUsers: { type: Boolean, default: false },
        manageJobs: { type: Boolean, default: true },
        manageCareers: { type: Boolean, default: true },
        viewAnalytics: { type: Boolean, default: true },
        manageAdmins: { type: Boolean, default: false },
        systemSettings: { type: Boolean, default: false }
    },
    adminLevel: {
        type: String,
        enum: ["moderator", "admin", "super-admin"],
        default: "moderator"
    },
    isActive: {
        type: Boolean,
        default: true
    },
    lastLogin: Date,
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },
    activityLog: [{
        action: String,
        target: String,
        targetId: mongoose.Schema.Types.ObjectId,
        timestamp: { type: Date, default: Date.now },
        details: mongoose.Schema.Types.Mixed
    }]
}, { timestamps: true });

const Admin = mongoose.model("Admin", adminSchema);
export { Admin };