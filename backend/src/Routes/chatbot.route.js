import { Router } from "express";
import {
    startChatSession,
    sendChatMessage,
    getAllSessions,
    getSession,
    deleteSession,
    quickAsk
} from "../Controller/chatbot.controller.js";
import { ErrorHandler } from "../utils/errorHandler.js";
import { authenticateToken } from "../middleware/auth.middleware.js";

const chatRouter = Router();

// All chat routes require authentication
chatRouter.use(authenticateToken);

// Quick question (stateless)
chatRouter.route("/ask")
    .post(ErrorHandler(quickAsk));

// Session management
chatRouter.route("/sessions")
    .get(ErrorHandler(getAllSessions));

chatRouter.route("/session")
    .post(ErrorHandler(startChatSession));

chatRouter.route("/session/:sessionId")
    .get(ErrorHandler(getSession))
    .delete(ErrorHandler(deleteSession));

chatRouter.route("/session/:sessionId/message")
    .post(ErrorHandler(sendChatMessage));

export { chatRouter };
