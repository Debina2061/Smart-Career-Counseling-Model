import mongoose from "mongoose";

const recommendationSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    recommendations: [{
        careerId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Career"
        },
        careerName: String,
        matchScore: {
            type: Number,
            min: 0,
            max: 100
        },
        matchReasons: [String],
        skillGaps: [String],
        growthPotential: {
            type: String,
            enum: ["low", "medium", "high"]
        },
        aiInsights: String,
        learningPath: String,
        jobSearch: {
            final_keyword: String,
            job_level: String,
            job_portals: [
                {
                    portal_name: String,
                    search_url: String
                }
            ]
        }
    }],
    generatedAt: {
        type: Date,
        default: Date.now
    },
    basedOn: {
        resumeId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Resume"
        },
        profileId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Profile"
        }
    }
}, { timestamps: true });

const Recommendation = mongoose.model("Recommendation", recommendationSchema);
export { Recommendation };