import Groq from "groq-sdk";
import { envConfig } from "../Config/envConfig.js";

let groqClient = null;

function getGroqModel() {
  return envConfig.groqModel || process.env.GROQ_MODEL || "llama-3.3-70b-versatile";
}

function getGroqClient() {
  const apiKey = envConfig.groqApiKey || process.env.GROQ_API_KEY || process.env.GROQ_SECRET_API_KEY;

  if (!apiKey) {
    throw new Error(
      "Groq API key is missing. Configure GROQ_SECRET_API_KEY (or GROQ_API_KEY) to enable AI features."
    );
  }

  if (!groqClient) {
    groqClient = new Groq({ apiKey });
  }

  return groqClient;
}

function sanitizeChatMessages(messages = []) {
  if (!Array.isArray(messages)) return [];

  return messages
    .filter(
      (message) =>
        message &&
        (message.role === "user" || message.role === "assistant") &&
        typeof message.content === "string" &&
        message.content.trim().length > 0
    )
    .slice(-12)
    .map((message) => ({ role: message.role, content: message.content.trim() }));
}

export async function getCareerChatResponse(messages, userContext = "") {
  const groq = getGroqClient();
  const chatMessages = sanitizeChatMessages(messages);

  const systemPrompt = `You are Smart Career's AI chatbot.

Goals:
- Answer naturally and directly.
- Give practical guidance for careers, resume quality, interview prep, and job strategy.
- Use markdown when it improves readability.
- If user asks something unrelated, answer briefly and offer a career-focused follow-up.
- Never output JSON unless the user explicitly asks for it.
- Avoid repetitive boilerplate responses.`;

  const contextPrompt = userContext?.trim()
    ? `\n\nKNOWN USER CONTEXT (may be incomplete; do not invent missing facts):${userContext}`
    : "\n\nKNOWN USER CONTEXT: none available yet.";

  const completion = await groq.chat.completions.create({
    messages: [
      {
        role: "system",
        content: `${systemPrompt}${contextPrompt}`,
      },
      ...chatMessages,
    ],
    model: getGroqModel(),
    temperature: 0.6,
    max_completion_tokens: 1024,
    top_p: 1,
    stream: false,
  });

  const content = completion?.choices?.[0]?.message?.content?.trim();

  if (!content) {
    throw new Error("Groq returned an empty chatbot response");
  }

  return content;
}

export async function getGroqChatCompletion(resumeText) {
  const groq = getGroqClient();
  return await groq.chat.completions.create({
    messages: [
      {
        role: "system",
        content:
          'You are an ATS resume parser.\n\nTask:\nConvert the provided resume text into a clean, structured JSON object.\nRequired JSON Schema:\n{\n  "personalInfo": {\n    "name": "string",\n    "email": "string",\n    "phone": "string",\n    "location": "string",\n    "linkedin": "string",\n    "portfolio": "string"\n  },\n  "summary": "string",\n  "experience": [\n    {\n      "company": "string",\n      "position": "string",\n      "startDate": "string (YYYY-MM)",\n      "endDate": "string (YYYY-MM or \'Present\')",\n      "description": "string",\n      "achievements": ["string"]\n    }\n  ],\n  "education": [\n    {\n      "institution": "string",\n      "degree": "string",\n      "field": "string",\n      "graduationDate": "string (YYYY)",\n      "gpa": "string (optional)"\n    }\n  ],\n  "skills": {\n    "technical": ["string"],\n    "soft": ["string"],\n    "languages": ["string"],\n    "frameworks": ["string"]\n  },\n  "projects": [\n    {\n      "name": "string",\n      "description": "string",\n      "technologies": ["string"],\n      "url": "string (optional)"\n    }\n  ],\n  "certifications": [\n    {\n      "name": "string",\n      "issuer": "string",\n      "date": "string (YYYY-MM)",\n      "url": "string (optional)"\n    }\n  ]\n}\n\nRules:\n- Output ONLY valid JSON matching the schema above\n- Do not add explanations or comments\n- If data is missing, use empty strings or empty arrays\n- Do not guess or hallucinate information\n- Normalize dates to YYYY or YYYY-MM format\n- Remove duplicate skills\n- Ensure all required fields are present',
      },
      {
        role: "user",
        content: resumeText 
    },
    ],
    model: getGroqModel(),
    temperature: 0.3,
    max_completion_tokens: 4096,
    top_p: 1,
    stream: false,
    stop: null,
  });
}

export async function getCareerRecommendationAI(userProfile, topCareers) {
  const groq = getGroqClient();
  const prompt = `You are a career counselor AI. Based on the user's profile and top matching careers, provide personalized insights.

USER PROFILE:
- Technical Skills: ${userProfile.technicalSkills?.join(", ") || "Not specified"}
- Soft Skills: ${userProfile.softSkills?.join(", ") || "Not specified"}
- Education Level: ${userProfile.educationLevel || "Not specified"}
- Interests: ${userProfile.interests?.join(", ") || "Not specified"}

TOP MATCHING CAREERS:
${topCareers.map((c, i) => `${i + 1}. ${c.name} (${c.category}) - Match: ${c.matchScore}%, Skill Gaps: ${c.skillGaps?.join(", ") || "None"}`).join("\n")}

Provide your response as valid JSON matching this schema:
{
  "generalAdvice": "2-3 sentences of overall career guidance",
  "careers": [
    {
      "insight": "Why this career suits them (2 sentences)",
      "learningPath": ["Step 1", "Step 2", "Step 3"]
    }
  ]
}

Rules:
- Output ONLY valid JSON
- Provide actionable, specific advice
- Consider skill gaps when suggesting learning paths
- Be encouraging but realistic`;

  return await groq.chat.completions.create({
    messages: [
      { role: "system", content: "You are an expert career counselor. Respond only with valid JSON." },
      { role: "user", content: prompt }
    ],
    model: getGroqModel(),
    temperature: 0.7,
    max_completion_tokens: 2048,
    top_p: 1,
    stream: false,
  });
}

export async function getJobMatchAnalysis(resumeData, jobRequirements) {
  const groq = getGroqClient();
  const prompt = `Analyze how well this candidate matches the job requirements.

CANDIDATE SKILLS:
Technical: ${resumeData.skills?.technical?.join(", ") || "None"}
Frameworks: ${resumeData.skills?.frameworks?.join(", ") || "None"}
Experience: ${resumeData.experience?.length || 0} positions

JOB REQUIREMENTS:
Title: ${jobRequirements.jobTitle}
Required Skills: ${jobRequirements.requiredSkills?.join(", ") || "Not specified"}
Experience: ${jobRequirements.experience}
Work Type: ${jobRequirements.workType}

Respond with JSON:
{
  "matchPercentage": number (0-100),
  "strengths": ["strength1", "strength2"],
  "gaps": ["gap1", "gap2"],
  "recommendation": "Should apply / Consider applying / Need more preparation",
  "improvementSuggestions": ["suggestion1", "suggestion2"]
}`;

  return await groq.chat.completions.create({
    messages: [
      { role: "system", content: "You are an ATS job matching expert. Respond only with valid JSON." },
      { role: "user", content: prompt }
    ],
    model: getGroqModel(),
    temperature: 0.5,
    max_completion_tokens: 1024,
    top_p: 1,
    stream: false,
  });
}