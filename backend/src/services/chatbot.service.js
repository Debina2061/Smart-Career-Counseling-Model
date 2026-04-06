import { ChatSession } from "../Model/chatbot.model.js";
import { Resume } from "../Model/resume.model.js";
import { Profile } from "../Model/profile.model.js";
import { Recommendation } from "../Model/recommendation.model.js";
import { getCareerChatResponse } from "../utils/groq.setup.js";

function normalizeResumeData(resumeContent) {
    if (!resumeContent) return null;

    let parsed = resumeContent;
    if (typeof resumeContent === "string") {
        try {
            parsed = JSON.parse(resumeContent);
        } catch {
            return null;
        }
    }

    if (!parsed || typeof parsed !== "object") {
        return null;
    }

    if (parsed.analysis && typeof parsed.analysis === "object") return parsed.analysis;
    if (parsed.parsedResume && typeof parsed.parsedResume === "object") return parsed.parsedResume;
    if (parsed.resumeData && typeof parsed.resumeData === "object") return parsed.resumeData;
    return parsed;
}

function asStringList(value) {
    if (!Array.isArray(value)) return [];
    return value.filter((item) => typeof item === "string" && item.trim().length > 0);
}

function getFallbackResponse(lastUserMessage) {
    const prompt = (lastUserMessage || "").toLowerCase();

    if (prompt.includes("career") || prompt.includes("recommend")) {
        return "I am having trouble reaching the live AI service right now. Meanwhile, open Career Recommendation to view your latest career matches and skill-gap insights.";
    }

    if (prompt.includes("resume") || prompt.includes("score") || prompt.includes("ats")) {
        return "I am having trouble reaching the live AI service right now. You can still use ATS Resume Scanner to get your score, strengths, and actionable improvements.";
    }

    if (prompt.includes("job") || prompt.includes("match")) {
        return "I am having trouble reaching the live AI service right now. You can still use Job Matching to check fit percentage and improvement suggestions for roles.";
    }

    return "I am having trouble reaching the live AI service right now. Please try again in a moment.";
}

/**
 * Get user context for chat (resume, profile, recommendations)
 */
async function getUserContext(userId) {
    const [resume, profile, recommendation] = await Promise.all([
        Resume.findOne({ userId }),
        Profile.findOne({ userId }),
        Recommendation.findOne({ userId }).sort({ generatedAt: -1 })
    ]);

    let context = {
        hasResume: false,
        hasProfile: false,
        topCareerMatches: [],
        userSkills: []
    };

    let contextString = "";

    if (resume?.resumeContent) {
        const resumeData = normalizeResumeData(resume.resumeContent);
        if (resumeData) {
            context.hasResume = true;

            const technicalSkills = asStringList(resumeData.skills?.technical);
            const frameworkSkills = asStringList(resumeData.skills?.frameworks);

            context.userSkills = [...technicalSkills, ...frameworkSkills].slice(0, 15);

            contextString += `\n\nUSER'S RESUME DATA:
- Technical Skills: ${technicalSkills.join(", ") || "Not specified"}
- Frameworks: ${frameworkSkills.join(", ") || "Not specified"}
- Experience: ${Array.isArray(resumeData.experience) ? resumeData.experience.length : 0} positions
- Education: ${Array.isArray(resumeData.education) ? resumeData.education.map((e) => `${e?.degree || "Degree"} in ${e?.field || "field"}`).join(", ") : "Not specified"}
- Projects: ${Array.isArray(resumeData.projects) ? resumeData.projects.length : 0} projects`;
        }
    }

    if (profile) {
        context.hasProfile = true;
        contextString += `\n\nUSER'S PROFILE:
- Education Level: ${profile.educationLevel || "Not specified"}
- Interests: ${profile.interest?.join(", ") || "Not specified"}
- Skills: ${profile.skills?.join(", ") || "Not specified"}`;
    }

    if (recommendation?.recommendations?.length) {
        context.topCareerMatches = recommendation.recommendations
            .slice(0, 3)
            .map(r => r.careerName);

        contextString += `\n\nTOP CAREER MATCHES:
${recommendation.recommendations.slice(0, 3).map((r, i) => 
    `${i + 1}. ${r.careerName} (${r.matchScore}% match) - Skill gaps: ${r.skillGaps?.join(", ") || "None"}`
).join("\n")}`;
    }

    return { context, contextString };
}

/**
 * Get AI response from Groq with fallback when unavailable
 */
async function getAIResponse(messages, contextString) {
    const chatMessages = Array.isArray(messages)
        ? messages
            .filter(
                (m) =>
                    m &&
                    (m.role === "user" || m.role === "assistant") &&
                    typeof m.content === "string" &&
                    m.content.trim().length > 0
            )
            .slice(-12)
            .map((m) => ({ role: m.role, content: m.content.trim() }))
        : [];

    const lastUserMessage = [...chatMessages]
        .reverse()
        .find((m) => m.role === "user")?.content;

    try {
        return await getCareerChatResponse(chatMessages, contextString);
    } catch (error) {
        console.error("[CHATBOT] Groq response error:", error?.message || error);
        return getFallbackResponse(lastUserMessage || "");
    }
}

/**
 * Create a new chat session
 */
export async function createChatSession(userId) {
    const { context } = await getUserContext(userId);

    const session = await ChatSession.create({
        userId,
        title: "New Conversation",
        context,
        messages: [{
            role: "assistant",
            content: "Hello! I'm your AI Career Counselor. I'm here to help you with career guidance, resume improvements, skill development, and job search strategies. How can I assist you today?"
        }]
    });

    return session;
}

/**
 * Send a message in a chat session
 */
export async function sendMessage(userId, sessionId, userMessage) {
    let session = await ChatSession.findOne({ _id: sessionId, userId });

    if (!session) {
        throw new Error("Chat session not found");
    }

    // Add user message
    session.messages.push({
        role: "user",
        content: userMessage
    });

    // Get user context
    const { contextString } = await getUserContext(userId);

    // Get AI response
    const aiResponse = await getAIResponse(
        session.messages.slice(-10), // Last 10 messages for context
        contextString
    );

    // Add AI response
    session.messages.push({
        role: "assistant",
        content: aiResponse
    });

    // Update title if it's the first user message
    if (session.messages.filter(m => m.role === "user").length === 1) {
        session.title = userMessage.slice(0, 50) + (userMessage.length > 50 ? "..." : "");
    }

    await session.save();

    return {
        userMessage: {
            role: "user",
            content: userMessage,
            timestamp: session.messages[session.messages.length - 2].timestamp
        },
        aiResponse: {
            role: "assistant",
            content: aiResponse,
            timestamp: session.messages[session.messages.length - 1].timestamp
        }
    };
}

/**
 * Get all chat sessions for a user
 */
export async function getChatSessions(userId) {
    const sessions = await ChatSession.find({ userId, isActive: true })
        .select("title createdAt updatedAt messages")
        .sort({ updatedAt: -1 });

    return sessions.map(s => ({
        _id: s._id,
        title: s.title,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
        messageCount: s.messages.length,
        lastMessage: s.messages[s.messages.length - 1]?.content?.slice(0, 100)
    }));
}

/**
 * Get a specific chat session with messages
 */
export async function getChatSession(userId, sessionId) {
    const session = await ChatSession.findOne({ _id: sessionId, userId });

    if (!session) {
        throw new Error("Chat session not found");
    }

    return session;
}

/**
 * Delete a chat session
 */
export async function deleteChatSession(userId, sessionId) {
    const result = await ChatSession.findOneAndUpdate(
        { _id: sessionId, userId },
        { $set: { isActive: false } }
    );

    if (!result) {
        throw new Error("Chat session not found");
    }

    return { success: true };
}

/**
 * Quick question without session (stateless)
 */
export async function askQuickQuestion(userId, question) {
    const { contextString } = await getUserContext(userId);

    const response = await getAIResponse(
        [{ role: "user", content: question }],
        contextString
    );

    return {
        question,
        answer: response
    };
}
