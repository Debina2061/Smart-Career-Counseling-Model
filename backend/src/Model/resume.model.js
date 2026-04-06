import mongoose from "mongoose";

export const resumeSchema = new mongoose.Schema({
    userId:{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    resumeUrl : {
        type : String
    },
    resumePublicId: {
        type: String,
        default: ""
    },
    resumeFileName: {
        type: String,
        default: "resume.pdf"
    },
    resumeContent : {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
    atsScore:{
        type:Number,
        min: 0,
        max: 100,
        default:0
    },
    suggestions: {
        type: [String],
        default: []
    },
    analysisStatus: {
        type: String,
        enum: ["processing", "completed", "failed"],
        default: "completed"
    },
    analysisError: {
        type: String,
        default: ""
    },
    resume_type: {
        type: String,
        enum: ["Technical", "Non-Technical", "Hybrid", "Unknown"],
        default: "Unknown"
    },
    resume_type_confidence: {
        type: Number,
        min: 0,
        max: 100,
        default: 0
    },
    resume_type_indicators: {
        type: mongoose.Schema.Types.Mixed,
        default: { technical: [], nonTechnical: [] }
    }
}, { timestamps: true });

const Resume = mongoose.model("Resume",resumeSchema);
export {Resume};
