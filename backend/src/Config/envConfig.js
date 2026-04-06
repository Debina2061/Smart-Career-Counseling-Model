// process.loadEnvFile(".env")


// export const envConfig = {
//     portNumber : process.env.PORT_NUMBER || 3000,
//     frontendUrl: process.env.FRONTEND_URL || "http://localhost:5173",
//     backendUrl: process.env.BACKEND_URL,
//     mongoUrl: process.env.DB_URL,
//     githubClinet: process.env.GITHUB_CLIENT_KEY,
//     githubSecretClient: process.env.GITHUB_SECRET_CLIENT_KEY,
//     googleClinet: process.env.GOOGLE_CLIENT_KEY,
//     googleSecretClient: process.env.GOOGLE_SECRET_CLIENT_KEY,
//     jwtSecretToken: process.env.JWT_SECRET_TOKEN,
//     resendApiKey: process.env.RESEND_API_KEY,
//     cloudName: process.env.CLOUDINARY_CLOUD_NAME,
//     cloudSecret: process.env.CLOUDINARY_API_SECRET,
//     cloudKey: process.env.CLOUDINARY_API_KEY,
//     inngestEventKey: process.env.INNGEST_EVENT_KEY,
//     inngestSigningKey: process.env.INNGEST_SIGNING_KEY
// }

// Load local env files only if present (safe for Render where files are absent)
for (const envFile of [".env.local", ".env"]) {
    try {
        process.loadEnvFile(envFile);
    } catch (error) {
        if (error?.code !== "ENOENT") {
            throw error;
        }
    }
}

export const envConfig = {
    // Render provides PORT automatically
    portNumber: process.env.PORT || process.env.PORT_NUMBER,

    // Use Render Environment values in production
    frontendUrl: process.env.FRONTEND_URL || "",
    backendUrl: process.env.BACKEND_URL,
    mongoUrl: process.env.DB_URL,

    githubClinet: process.env.GITHUB_CLIENT_KEY,
    githubSecretClient: process.env.GITHUB_SECRET_CLIENT_KEY,
    googleClinet: process.env.GOOGLE_CLIENT_KEY,
    googleSecretClient: process.env.GOOGLE_SECRET_CLIENT_KEY,

    jwtSecretToken: process.env.JWT_SECRET_TOKEN,
    resendApiKey: process.env.RESEND_API_KEY,

    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    cloudSecret: process.env.CLOUDINARY_API_SECRET,
    cloudKey: process.env.CLOUDINARY_API_KEY,

    mlApiBaseUrl: process.env.ML_API_BASE_URL || "http://127.0.0.1:8000",
    groqApiKey: process.env.GROQ_API_KEY || process.env.GROQ_SECRET_API_KEY,
    groqModel: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
    inngestEventKey: process.env.INNGEST_EVENT_KEY,
    inngestSigningKey: process.env.INNGEST_SIGNING_KEY
};
