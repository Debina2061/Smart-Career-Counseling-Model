import mongoose from "mongoose";

const systemLogSchema = new mongoose.Schema({
    type: {
        type: String,
        enum: ["request", "error", "auth", "admin", "system"],
        required: true
    },
    level: {
        type: String,
        enum: ["info", "warn", "error", "debug"],
        default: "info"
    },
    message: String,
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },
    request: {
        method: String,
        url: String,
        ip: String,
        userAgent: String,
        body: mongoose.Schema.Types.Mixed,
        params: mongoose.Schema.Types.Mixed,
        query: mongoose.Schema.Types.Mixed
    },
    response: {
        statusCode: Number,
        duration: Number // in ms
    },
    error: {
        name: String,
        message: String,
        stack: String
    },
    metadata: mongoose.Schema.Types.Mixed
}, { 
    timestamps: true,
    expires: 60 * 60 * 24 * 30 // Auto-delete after 30 days
});

// Index for querying logs
systemLogSchema.index({ type: 1, level: 1, createdAt: -1 });
systemLogSchema.index({ userId: 1, createdAt: -1 });

const SystemLog = mongoose.model("SystemLog", systemLogSchema);
export { SystemLog };