import mongoose from "mongoose";

/**
 * ATS Scan History Model
 * Stores all resume scans for a user to view history
 */
const atsScanHistorySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true
  },
  
  // Resume information
  resumeUrl: {
    type: String,
    required: true
  },
  resumePublicId: {
    type: String
  },
  resumeName: {
    type: String,
    default: "Resume.pdf"
  },
  
  // Scan type
  scanType: {
    type: String,
    enum: ["quick", "detailed"],
    default: "quick"
  },
  
  // Job description used for scan (if any)
  jobDescription: {
    type: String,
    default: ""
  },
  
  // Quick scan results
  quickScanResults: {
    compatibility: { type: Number, default: 0 },
    matchedCount: { type: Number, default: 0 },
    suggestionsCount: { type: Number, default: 0 },
    matched: [String],
    suggestions: [String]
  },
  
  // Detailed weighted scoring results
  detailedResults: {
    final_score: { type: Number, default: 0 },
    keyword_score: { type: Number, default: 0 },
    section_score: { type: Number, default: 0 },
    experience_score: { type: Number, default: 0 },
    format_score: { type: Number, default: 0 },
    matched_skills: [String],
    skill_match_percentage: { type: Number, default: 0 },
    strength_level: { type: String, default: "Weak" },
    improvement_suggestions: [String],
    detailed_breakdown: mongoose.Schema.Types.Mixed
  },
  
  // Parsed resume content snapshot
  resumeSnapshot: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  
  // Metadata
  scannedAt: {
    type: Date,
    default: Date.now,
    index: true
  }
}, { 
  timestamps: true 
});

// Index for efficient queries
atsScanHistorySchema.index({ userId: 1, scannedAt: -1 });

const ATSScanHistory = mongoose.model("ATSScanHistory", atsScanHistorySchema);

export { ATSScanHistory };
