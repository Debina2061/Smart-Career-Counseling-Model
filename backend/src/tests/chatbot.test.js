import request from "supertest";
import { jest, describe, it, expect, beforeEach } from "@jest/globals";
import {
  TOKENS,
  authHeader,
  mockState,
  resetMockState,
  authenticateTokenMock,
  buildRouteTestApp,
} from "./mocks/modelMocks.js";

const chatbotControllerMocks = {
  startChatSession: jest.fn(async (req, res) => {
    const sessionId = `session-${mockState.nextSessionId++}`;

    const session = {
      _id: sessionId,
      title: `New Chat ${sessionId}`,
      messages: [],
    };

    mockState.sessions.push(session);

    return res.status(201).json({
      message: "Chat session created",
      data: {
        sessionId,
        title: session.title,
        messages: session.messages,
      },
    });
  }),

  sendChatMessage: jest.fn(async (req, res) => {
    const { sessionId } = req.params;
    const { message } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ message: "Message cannot be empty" });
    }

    const session = mockState.sessions.find((item) => item._id === sessionId);
    if (!session) {
      return res.status(404).json({ message: "Session not found" });
    }

    session.messages.push({ role: "user", content: message.trim() });
    session.messages.push({ role: "assistant", content: "Mock AI response" });

    return res.status(200).json({
      message: "Message sent",
      data: {
        sessionId,
        reply: "Mock AI response",
      },
    });
  }),

  getAllSessions: jest.fn(async (req, res) => {
    return res.status(200).json({
      message: "Sessions retrieved",
      data: mockState.sessions,
    });
  }),

  getSession: jest.fn(async (req, res) => {
    const session = mockState.sessions.find((item) => item._id === req.params.sessionId);

    if (!session) {
      return res.status(404).json({ message: "Session not found" });
    }

    return res.status(200).json({ message: "Session retrieved", data: session });
  }),

  deleteSession: jest.fn(async (req, res) => {
    const idx = mockState.sessions.findIndex((item) => item._id === req.params.sessionId);

    if (idx === -1) {
      return res.status(404).json({ message: "Session not found" });
    }

    mockState.sessions.splice(idx, 1);
    return res.status(200).json({ message: "Session deleted" });
  }),

  quickAsk: jest.fn(async (req, res) => {
    const { question } = req.body;

    if (!question || !question.trim()) {
      return res.status(400).json({ message: "Question cannot be empty" });
    }

    return res.status(200).json({
      message: "Response generated",
      data: {
        question: question.trim(),
        answer: "Mock quick response",
      },
    });
  }),
};

jest.unstable_mockModule("../Controller/chatbot.controller.js", () => chatbotControllerMocks);
jest.unstable_mockModule("../middleware/auth.middleware.js", () => ({
  authenticateToken: authenticateTokenMock,
}));

const { chatRouter } = await import("../Routes/chatbot.route.js");
const app = buildRouteTestApp("/chat", chatRouter);

describe("Chatbot routes", () => {
  beforeEach(() => {
    resetMockState();
  });

  it("Ask quick question -> pass", async () => {
    const res = await request(app)
      .post("/chat/ask")
      .set(authHeader(TOKENS.user))
      .send({ question: "How can I improve my resume?" });

    expect(res.status).toBe(200);
  });

  it("Ask empty question -> fail", async () => {
    const res = await request(app)
      .post("/chat/ask")
      .set(authHeader(TOKENS.user))
      .send({ question: "   " });

    expect(res.status).toBe(400);
  });

  it("Create chat session -> pass", async () => {
    const res = await request(app)
      .post("/chat/session")
      .set(authHeader(TOKENS.user));

    expect(res.status).toBe(201);
    expect(res.body.data.sessionId).toBeDefined();
  });

  it("Get all chat sessions -> pass", async () => {
    await request(app)
      .post("/chat/session")
      .set(authHeader(TOKENS.user));

    const res = await request(app)
      .get("/chat/sessions")
      .set(authHeader(TOKENS.user));

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it("Send message in session -> pass", async () => {
    const sessionRes = await request(app)
      .post("/chat/session")
      .set(authHeader(TOKENS.user));

    const sessionId = sessionRes.body.data.sessionId;

    const res = await request(app)
      .post(`/chat/session/${sessionId}/message`)
      .set(authHeader(TOKENS.user))
      .send({ message: "Suggest software engineering career paths" });

    expect(res.status).toBe(200);
  });

  it("Delete chat session -> pass", async () => {
    const sessionRes = await request(app)
      .post("/chat/session")
      .set(authHeader(TOKENS.user));

    const sessionId = sessionRes.body.data.sessionId;

    const res = await request(app)
      .delete(`/chat/session/${sessionId}`)
      .set(authHeader(TOKENS.user));

    expect(res.status).toBe(200);
  });
});
