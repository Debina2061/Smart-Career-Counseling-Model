import mongoose from "mongoose";

const messageSchema = new mongoose.Schema({
    role: {
        type: String,
        enum: ["user", "assistant"],
        required: true
    },
    content: {
        type: String,
        required: true
    },
    timestamp: {
        type: Date,
        default: Date.now
    }
});

const chatSessionSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    title: {
        type: String,
        default: "New Conversation"
    },
    messages: [messageSchema],
    context: {
        hasResume: { type: Boolean, default: false },
        hasProfile: { type: Boolean, default: false },
        topCareerMatches: [String],
        userSkills: [String]
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, { timestamps: true });

// Index for fetching user's chat sessions
chatSessionSchema.index({ userId: 1, updatedAt: -1 });

const ChatSession = mongoose.model("ChatSession", chatSessionSchema);
export { ChatSession };