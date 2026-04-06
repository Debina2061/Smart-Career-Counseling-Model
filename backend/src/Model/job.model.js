import mongoose from "mongoose";

const jobSchema = new mongoose.Schema({
    jobTitle: {
        type: String,
        required: true
    },
    company: {
        name: { type: String, required: true },
        logo: String,
        website: String
    },
    description: {
        type: String,
        required: true
    },
    requiredSkills: {
        technical: [String],
        soft: [String]
    },
    preferredSkills: [String],
    experienceLevel: {
        type: String,
        enum: ["entry", "mid", "senior", "lead"],
        default: "entry"
    },
    experienceYears: {
        min: { type: Number, default: 0 },
        max: { type: Number, default: 99 }
    },
    education: {
        level: {
            type: String,
            enum: ["secondary", "bachelor", "master", "phd", "any"],
            default: "any"
        },
        fields: [String]
    },
    salaryRange: {
        min: Number,
        max: Number,
        currency: { type: String, default: "USD" },
        isVisible: { type: Boolean, default: true }
    },
    location: {
        city: String,
        state: String,
        country: String,
        isRemoteAllowed: { type: Boolean, default: false }
    },
    workType: {
        type: String,
        enum: ["onsite", "remote", "hybrid"],
        default: "onsite"
    },
    workCategory: {
        type: String,
        enum: ["part-time", "full-time", "trainee", "internship", "contract"],
        default: "full-time"
    },
    benefits: [String],
    responsibilities: [String],
    applicationDeadline: Date,
    status: {
        type: String,
        enum: ["draft", "active", "paused", "closed", "filled"],
        default: "active"
    },
    applicants: [{
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        appliedAt: { type: Date, default: Date.now },
        status: {
            type: String,
            enum: ["pending", "reviewed", "shortlisted", "rejected", "hired"],
            default: "pending"
        },
        matchScore: Number,
        notes: String
    }],
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    viewCount: { type: Number, default: 0 },
    applicationCount: { type: Number, default: 0 }
}, { timestamps: true });

// Index for searching
jobSchema.index({ jobTitle: "text", description: "text", "company.name": "text" });
jobSchema.index({ status: 1, applicationDeadline: 1 });

const Job = mongoose.model("Job", jobSchema);
export { Job };