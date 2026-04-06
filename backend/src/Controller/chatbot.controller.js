import {
    createChatSession,
    sendMessage,
    getChatSessions,
    getChatSession,
    deleteChatSession,
    askQuickQuestion
} from "../services/chatbot.service.js";

/**
 * Create a new chat session
 * POST /chat/session
 */
export const startChatSession = async (req, res) => {
    const session = await createChatSession(req.user._id);

    return res.status(201).json({
        message: "Chat session created",
        data: {
            sessionId: session._id,
            title: session.title,
            messages: session.messages
        }
    });
};

/**
 * Send message in a chat session
 * POST /chat/session/:sessionId/message
 */
export const sendChatMessage = async (req, res) => {
    const { sessionId } = req.params;
    const { message } = req.body;

    if (!message?.trim()) {
        return res.status(400).json({
            message: "Message cannot be empty"
        });
    }

    const response = await sendMessage(req.user._id, sessionId, message.trim());

    return res.status(200).json({
        message: "Message sent",
        data: response
    });
};

/**
 * Get all user's chat sessions
 * GET /chat/sessions
 */
export const getAllSessions = async (req, res) => {
    const sessions = await getChatSessions(req.user._id);

    return res.status(200).json({
        message: "Sessions retrieved",
        data: sessions
    });
};

/**
 * Get a specific chat session with all messages
 * GET /chat/session/:sessionId
 */
export const getSession = async (req, res) => {
    const { sessionId } = req.params;

    const session = await getChatSession(req.user._id, sessionId);

    return res.status(200).json({
        message: "Session retrieved",
        data: session
    });
};

/**
 * Delete a chat session
 * DELETE /chat/session/:sessionId
 */
export const deleteSession = async (req, res) => {
    const { sessionId } = req.params;

    await deleteChatSession(req.user._id, sessionId);

    return res.status(200).json({
        message: "Session deleted"
    });
};

/**
 * Quick question without creating session
 * POST /chat/ask
 */
export const quickAsk = async (req, res) => {
    const { question } = req.body;

    if (!question?.trim()) {
        return res.status(400).json({
            message: "Question cannot be empty"
        });
    }

    const response = await askQuickQuestion(req.user._id, question.trim());

    return res.status(200).json({
        message: "Response generated",
        data: response
    });
};
