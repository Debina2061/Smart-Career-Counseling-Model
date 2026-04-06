import { SystemLog } from "../Model/systemLog.model.js";

/**
 * Request logging middleware
 * Logs all incoming requests and responses
 */
export const requestLogger = async (req, res, next) => {
    const startTime = Date.now();

    // Store original end function
    const originalEnd = res.end;

    // Override res.end to capture response
    res.end = async function (chunk, encoding) {
        const duration = Date.now() - startTime;

        // Don't log health check endpoints
        if (req.url === "/" || req.url === "/health") {
            return originalEnd.call(this, chunk, encoding);
        }

        try {
            // Determine log level based on status code
            let level = "info";
            if (res.statusCode >= 400 && res.statusCode < 500) {
                level = "warn";
            } else if (res.statusCode >= 500) {
                level = "error";
            }

            // Create log entry (non-blocking)
            SystemLog.create({
                type: "request",
                level,
                message: `${req.method} ${req.originalUrl} - ${res.statusCode}`,
                userId: req.user?._id || null,
                request: {
                    method: req.method,
                    url: req.originalUrl,
                    ip: req.ip || req.connection?.remoteAddress,
                    userAgent: req.get("User-Agent"),
                    // Don't log sensitive body data
                    body: sanitizeBody(req.body),
                    params: req.params,
                    query: req.query
                },
                response: {
                    statusCode: res.statusCode,
                    duration
                }
            }).catch(err => console.error("Logging error:", err));
        } catch (error) {
            console.error("Request logger error:", error);
        }

        // Call original end
        return originalEnd.call(this, chunk, encoding);
    };

    next();
};

/**
 * Error logging middleware
 */
export const errorLogger = (err, req, res, next) => {
    SystemLog.create({
        type: "error",
        level: "error",
        message: err.message,
        userId: req.user?._id || null,
        request: {
            method: req.method,
            url: req.originalUrl,
            ip: req.ip
        },
        error: {
            name: err.name,
            message: err.message,
            stack: err.stack
        }
    }).catch(logErr => console.error("Error logging failed:", logErr));

    next(err);
};

/**
 * Auth event logger
 */
export const logAuthEvent = async (type, userId, details = {}) => {
    try {
        await SystemLog.create({
            type: "auth",
            level: "info",
            message: `Auth event: ${type}`,
            userId,
            metadata: details
        });
    } catch (error) {
        console.error("Auth logging error:", error);
    }
};

/**
 * Admin action logger
 */
export const logAdminAction = async (adminId, action, details = {}) => {
    try {
        await SystemLog.create({
            type: "admin",
            level: "info",
            message: `Admin action: ${action}`,
            userId: adminId,
            metadata: details
        });
    } catch (error) {
        console.error("Admin logging error:", error);
    }
};

/**
 * Remove sensitive fields from request body
 */
function sanitizeBody(body) {
    if (!body) return null;

    const sanitized = { ...body };
    const sensitiveFields = ["password", "newPassword", "oldPassword", "token", "secret", "apiKey"];

    for (const field of sensitiveFields) {
        if (sanitized[field]) {
            sanitized[field] = "[REDACTED]";
        }
    }

    return sanitized;
}
