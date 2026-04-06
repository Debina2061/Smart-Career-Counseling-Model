import { envConfig } from "../Config/envConfig.js";

function getMlApiBaseUrl() {
  return (envConfig.mlApiBaseUrl || "http://127.0.0.1:8000").replace(/\/+$/, "");
}

function safeNumber(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function normalizeCareerRecommendations(items) {
  if (!Array.isArray(items)) return [];
  return items
    .map((item) => ({
      role: String(item?.role || "").trim(),
      confidence: Math.max(0, Math.min(1, safeNumber(item?.confidence, 0))),
    }))
    .filter((item) => item.role);
}

export async function analyzeResumeWithMlApi({
  pdfBuffer,
  filename = "resume.pdf",
  jobDescription,
}) {
  if (!pdfBuffer || !(pdfBuffer instanceof Uint8Array) || pdfBuffer.length === 0) {
    throw new Error("Missing resume PDF bytes for ML analysis");
  }

  const formData = new FormData();
  const pdfBlob = new Blob([pdfBuffer], { type: "application/pdf" });
  formData.append("resume", pdfBlob, filename || "resume.pdf");

  if (jobDescription && typeof jobDescription === "string" && jobDescription.trim()) {
    formData.append("job_description", jobDescription.trim());
  }

  const response = await fetch(`${getMlApiBaseUrl()}/analyze-resume`, {
    method: "POST",
    body: formData,
  });

  let payload = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const message = payload?.error || payload?.detail || `ML API request failed with status ${response.status}`;
    throw new Error(message);
  }

  return {
    resumeScore: Math.max(0, Math.min(100, safeNumber(payload?.resume_score, 0))),
    rating: String(payload?.rating || "Unknown"),
    careerRecommendations: normalizeCareerRecommendations(payload?.career_recommendations),
    jobFitScore:
      payload?.job_fit_score === null || payload?.job_fit_score === undefined
        ? null
        : Math.max(0, Math.min(100, safeNumber(payload?.job_fit_score, 0))),
    improvementSuggestions: Array.isArray(payload?.improvement_suggestions)
      ? payload.improvement_suggestions.filter(Boolean).map(String)
      : [],
    extractedTextPreview: String(payload?.extracted_text_preview || ""),
    raw: payload,
  };
}

export function mapMlToDetailedAtsResult(mlResult, { requiredSkillsCount = 0 } = {}) {
  const finalScore = Math.max(0, Math.min(100, safeNumber(mlResult?.resumeScore, 0)));
  const keywordScore = Math.round((finalScore * 0.5) * 10) / 10;
  const sectionScore = Math.round((finalScore * 0.2) * 10) / 10;
  const experienceScore = Math.round((finalScore * 0.2) * 10) / 10;
  const formatScore = Math.round((finalScore * 0.1) * 10) / 10;

  const matchedSkills = normalizeCareerRecommendations(mlResult?.careerRecommendations).map((item) => item.role);

  let strengthLevel = "Needs Improvement";
  if (finalScore >= 80) strengthLevel = "Strong";
  else if (finalScore >= 65) strengthLevel = "Good";
  else if (finalScore >= 50) strengthLevel = "Moderate";

  return {
    final_score: Number(finalScore.toFixed(2)),
    strength_level: strengthLevel,
    rating: mlResult?.rating || "Unknown",
    keyword_score: Number(keywordScore.toFixed(1)),
    section_score: Number(sectionScore.toFixed(1)),
    experience_score: Number(experienceScore.toFixed(1)),
    format_score: Number(formatScore.toFixed(1)),
    skill_match_percentage: mlResult?.jobFitScore === null ? Number(finalScore.toFixed(2)) : Number(safeNumber(mlResult?.jobFitScore, finalScore).toFixed(2)),
    matched_skills: matchedSkills,
    missing_skills: requiredSkillsCount > matchedSkills.length ? ["Add more target role keywords from the job description"] : [],
    career_recommendations: normalizeCareerRecommendations(mlResult?.careerRecommendations),
    improvement_suggestions: Array.isArray(mlResult?.improvementSuggestions)
      ? mlResult.improvementSuggestions
      : [],
  };
}
