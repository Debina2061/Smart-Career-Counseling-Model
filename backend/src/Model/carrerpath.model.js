import mongoose from "mongoose";

const careerSchema = new mongoose.Schema({
    careerName: {
        type: String,
        required: true,
        unique: true
    },
    description: String,
    category: {
        type: String,
        enum: ["technology", "healthcare", "finance", "education", "engineering", "creative", "business", "science", "legal", "other"],
        required: true
    },
    requiredSkills: {
        technical: [String],
        soft: [String]
    },
    preferredEducation: [{
        level: {
            type: String,
            enum: ["secondary", "bachelor", "master", "phd", "any"]
        },
        fields: [String]
    }],
    experienceLevel: {
        type: String,
        enum: ["entry", "mid", "senior", "lead"],
        default: "entry"
    },
    experienceYearsRange: {
        min: { type: Number, default: 0 },
        max: { type: Number, default: 99 }
    },
    salaryRange: {
        min: Number,
        max: Number,
        currency: { type: String, default: "USD" }
    },
    marketDemand: {
        type: String,
        enum: ["low", "medium", "high", "very-high"],
        default: "medium"
    },
    growthOutlook: {
        type: String,
        enum: ["declining", "stable", "growing", "rapid-growth"],
        default: "stable"
    },
    relatedCareers: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Career"
    }],
    certifications: [String],
    workEnvironment: [{
        type: String,
        enum: ["remote", "hybrid", "onsite", "travel"]
    }],
    isActive: {
        type: Boolean,
        default: true
    }
}, { timestamps: true });

const Career = mongoose.model("Career", careerSchema);
export { Career };