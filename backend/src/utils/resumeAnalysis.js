/**
 * Resume analysis utilities without external API dependency.
 * All parsing and scoring is done locally using ML models.
 */

export const parseResumeJson = (content) => {
  if (!content) return null;
  if (typeof content === "object") return content;
  if (typeof content === "string") {
    const cleaned = content
      .replace(/```json/gi, "")
      .replace(/```/g, "")
      .trim();
    try {
      return JSON.parse(cleaned);
    } catch {
      const start = cleaned.indexOf("{");
      const end = cleaned.lastIndexOf("}");
      if (start !== -1 && end !== -1 && end > start) {
        const sliced = cleaned.slice(start, end + 1);
        try {
          return JSON.parse(sliced);
        } catch {
          return null;
        }
      }
      return null;
    }
  }
  return null;
};

/**
 * Detect sections in raw resume text for better ATS compliance
 */
const detectSections = (rawText) => {
  if (!rawText) return { detected: [], score: 0 };
  
  const sections = {
    contact: /\b(email|phone|mobile|address|linkedin|github|portfolio)\b/i,
    summary: /\b(summary|objective|profile|about)\b/i,
    experience: /\b(experience|employment|work history|professional)\b/i,
    education: /\b(education|academic|qualification|degree)\b/i,
    skills: /\b(skills|technical|proficiencies|competencies)\b/i,
    projects: /\b(projects|portfolio|work samples)\b/i,
    certifications: /\b(certifications|certificates|licenses)\b/i
  };
  
  const detected = [];
  for (const [section, regex] of Object.entries(sections)) {
    if (regex.test(rawText)) {
      detected.push(section);
    }
  }
  
  // Score based on detected sections (max 10 points)
  const sectionScore = Math.min(10, detected.length * 1.5);
  return { detected, score: Math.round(sectionScore) };
};

/**
 * Match resume keywords with common career-related terms
 */
const detectCareerKeywords = (rawText, resume) => {
  if (!rawText) return { count: 0, score: 0 };
  
  const textLower = rawText.toLowerCase();
  const keywords = [
    // Action verbs (highly valued by ATS)
    'developed', 'managed', 'created', 'implemented', 'designed', 'led', 'improved',
    'increased', 'achieved', 'delivered', 'coordinated', 'executed', 'analyzed',
    // Industry terms
    'team', 'project', 'client', 'stakeholder', 'quality', 'performance', 'efficiency',
    'budget', 'deadline', 'collaboration', 'communication', 'leadership', 'innovation',
    // Technical terms
    'database', 'framework', 'api', 'system', 'platform', 'architecture', 'development'
  ];
  
  let count = 0;
  for (const keyword of keywords) {
    if (textLower.includes(keyword)) count++;
  }
  
  // Count quantifiable achievements (numbers, percentages)
  const quantifiableMatches = rawText.match(/\d+[%+]?|\$\d+/g) || [];
  count += quantifiableMatches.length;
  
  // Score based on keyword density (max 12 points)
  const keywordScore = Math.min(12, Math.round(count / 3));
  return { count, score: keywordScore };
};

export const calculateAtsScore = (resume, rawText) => {
  if (!resume) return 0;

  // Validate minimum content requirements
  const rawLen = rawText?.length || 0;
  
  // If resume is too short (less than 150 characters), return very low score
  if (rawLen < 150) {
    return Math.min(15, Math.round(rawLen / 10)); // Max 15% for very short resumes
  }

  // Check for essential sections
  const hasEmail = Boolean(resume?.personalInfo?.email);
  const hasPhone = Boolean(resume?.personalInfo?.phone);
  const hasName = Boolean(resume?.personalInfo?.name);
  const hasExperience = Array.isArray(resume?.experience) && resume.experience.length > 0;
  const hasEducation = Array.isArray(resume?.education) && resume.education.length > 0;
  const hasSkills = [
    ...(resume?.skills?.technical || []),
    ...(resume?.skills?.frameworks || []),
    ...(resume?.skills?.languages || []),
    ...(resume?.skills?.soft || []),
  ].filter(Boolean).length > 0;

  // If resume is missing most essential components, cap the score
  const essentialCount = [hasEmail, hasPhone, hasName, hasExperience, hasEducation, hasSkills].filter(Boolean).length;
  if (essentialCount < 3) {
    return Math.min(25, essentialCount * 8); // Max 25% if missing too many essentials
  }

  // Section Detection Score (max 10 points)
  const sectionDetection = detectSections(rawText);
  const sectionScore = sectionDetection.score;

  // Career Keyword Matching Score (max 12 points)
  const careerKeywords = detectCareerKeywords(rawText, resume);
  const keywordScore = careerKeywords.score;

  const contactFields = [
    resume?.personalInfo?.name,
    resume?.personalInfo?.email,
    resume?.personalInfo?.phone,
    resume?.personalInfo?.location,
    resume?.personalInfo?.linkedin,
    resume?.personalInfo?.portfolio,
  ];
  const contactScore = (contactFields.filter(Boolean).length / contactFields.length) * 10;

  const summaryLen = resume?.summary?.trim()?.length || 0;
  const summaryScore = summaryLen >= 60 ? 10 : summaryLen >= 30 ? 4 : 0;

  const experience = Array.isArray(resume?.experience) ? resume.experience : [];
  const experienceCount = experience.length;
  let experienceScore = 0;
  if (experienceCount > 0) {
    if (experienceCount === 1) experienceScore += 10;
    if (experienceCount === 2) experienceScore += 16;
    if (experienceCount >= 3) experienceScore += 20;

    const hasDescriptions = experience.some((e) => (e?.description || "").length >= 80);
    if (hasDescriptions) experienceScore += 5;

    const hasAchievements = experience.some((e) => Array.isArray(e?.achievements) && e.achievements.length > 0);
    if (hasAchievements) experienceScore += 3;

    const hasDates = experience.some((e) => e?.startDate || e?.endDate);
    if (hasDates) experienceScore += 2;

    const metricsRegex = /(\d+ %|\d+\s?(users|clients|projects|revenue|sales|kpi|metrics|hrs|hours))/i;
    const hasMetrics = experience.some((e) => metricsRegex.test(e?.description || "")) ||
      experience.some((e) => Array.isArray(e?.achievements) && e.achievements.some((a) => metricsRegex.test(a || "")));
    if (hasMetrics) experienceScore += 3;

    experienceScore = Math.min(30, experienceScore);
  }

  const education = Array.isArray(resume?.education) ? resume.education : [];
  let educationScore = 0;
  if (education.length > 0) {
    const hasDetails = education.some((e) => e?.institution && e?.degree && e?.field);
    educationScore = hasDetails ? 10 : 5;
  }

  const skills = [
    ...(resume?.skills?.technical || []),
    ...(resume?.skills?.frameworks || []),
    ...(resume?.skills?.languages || []),
    ...(resume?.skills?.soft || []),
  ].filter(Boolean);
  const uniqueSkills = [...new Set(skills.map((s) => s.toLowerCase()))];
  let skillsScore = 0;
  if (uniqueSkills.length >= 12) skillsScore = 18;
  else if (uniqueSkills.length >= 8) skillsScore = 14;
  else if (uniqueSkills.length >= 5) skillsScore = 10;
  else if (uniqueSkills.length >= 3) skillsScore = 6;
  else if (uniqueSkills.length > 0) skillsScore = 3;

  const projects = Array.isArray(resume?.projects) ? resume.projects : [];
  const projectsScore = projects.length >= 2 ? 8 : projects.length === 1 ? 4 : 0;

  const certifications = Array.isArray(resume?.certifications) ? resume.certifications : [];
  const certScore = certifications.length >= 2 ? 3 : certifications.length === 1 ? 1 : 0;

  // Calculate length score using rawLen already defined at top (max 6 points)
  let lengthScore = 0;
  if (rawLen >= 900 && rawLen <= 2500) lengthScore = 6;
  else if (rawLen >= 700) lengthScore = 4;
  else if (rawLen >= 400) lengthScore = 2;

  // Calculate total with new scoring components
  let total =
    contactScore +      // Max 10
    summaryScore +      // Max 10
    experienceScore +   // Max 30
    educationScore +    // Max 10
    skillsScore +       // Max 18
    projectsScore +     // Max 8
    certScore +         // Max 3
    lengthScore +       // Max 6
    sectionScore +      // Max 10 (NEW)
    keywordScore;       // Max 12 (NEW)

  // Apply stricter penalties
  if (rawLen > 0 && rawLen < 400) total -= 15; // Increased penalty for very short resumes
  if (rawLen >= 400 && rawLen < 600) total -= 8; // Moderate penalty
  
  if (!resume?.personalInfo?.email) total -= 10; // Increased penalty
  if (!resume?.personalInfo?.phone) total -= 8; // Increased penalty
  if (!resume?.personalInfo?.name) total -= 8; // New penalty for missing name
  
  if (experienceCount === 0) total -= 15; // Major penalty for no experience
  if (experienceCount > 0) {
    const hasDates = experience.some((e) => e?.startDate || e?.endDate);
    if (!hasDates) total -= 6; // Increased penalty
  }
  
  if (education.length === 0) total -= 10; // Penalty for no education
  
  // Additional penalty if resume is essentially empty
  if (total > 0 && essentialCount < 4) {
    total = Math.min(total, 35); // Cap at 35% if missing key sections
  }

  return Math.max(0, Math.min(100, Math.round(total)));
};

export const buildSuggestions = (resume, rawText) => {
  const suggestions = [];
  const rawLen = rawText?.length || 0;

  // Check if resume is essentially empty
  if (!resume || Object.keys(resume).length === 0) {
    if (rawLen > 150 && rawLen < 600) {
      suggestions.push("[X] We extracted text but could not structure it reliably. Try a different PDF export or simplify formatting.");
    } else if (rawLen > 0) {
      suggestions.push("[X] This document is too short to be a complete resume. A professional resume should be at least 400-500 words.");
    } else {
      suggestions.push("[X] We could not extract structured text from this PDF. Make sure the PDF has selectable text (not a scanned image).");
    }
    return suggestions;
  }

  // Detect sections in raw text
  const sectionsDetected = detectSections(rawText);
  const missingSections = ['contact', 'summary', 'experience', 'education', 'skills']
    .filter(s => !sectionsDetected.detected.includes(s));
  
  if (missingSections.length > 0) {
    suggestions.push(`[SECTIONS] Add clear section headings: ${missingSections.join(', ')}`);
  }

  // Check for career keywords
  const keywordAnalysis = detectCareerKeywords(rawText, resume);
  if (keywordAnalysis.count < 10) {
    suggestions.push("[KEYWORDS] Use more action verbs (developed, managed, led) and quantifiable achievements (increased by 30%)");
  }

  // Check for very short resumes first
  if (rawLen < 300) {
    suggestions.push("[!] Your resume is extremely short. Add more details about your experience, education, and skills.");
  } else if (rawLen < 600) {
    suggestions.push("[!] Your resume seems brief. Consider adding more details to reach 700-1000 words.");
  }

  // Contact information
  if (!resume?.personalInfo?.email) suggestions.push("[CONTACT] Add a professional email address.");
  if (!resume?.personalInfo?.phone) suggestions.push("[CONTACT] Add a phone number.");
  if (!resume?.personalInfo?.name) suggestions.push("[CONTACT] Add your full name at the top of your resume.");
  
  // Summary
  if (!resume?.summary || resume.summary.trim().length < 60) {
    suggestions.push("[SUMMARY] Add a strong summary (2-3 lines) highlighting your expertise and career goals.");
  }
  
  // Experience
  if (!Array.isArray(resume?.experience) || resume.experience.length === 0) {
    suggestions.push("[!] Add work experience or internships. This is crucial for ATS scoring.");
  }
  if (Array.isArray(resume?.experience) && resume.experience.length > 0) {
    const hasDates = resume.experience.some((e) => e?.startDate || e?.endDate);
    if (!hasDates) suggestions.push("[DATES] Include start/end dates for each experience.");
    const hasMetrics = resume.experience.some((e) => /(\d+%|\d+\s?(users|clients|projects|revenue|sales|kpi|metrics|hrs|hours))/i.test(e?.description || ""));
    if (!hasMetrics) suggestions.push("[METRICS] Add measurable impact (percentages, counts, outcomes) in your experience descriptions.");
  }
  
  // Education
  if (!Array.isArray(resume?.education) || resume.education.length === 0) {
    suggestions.push("[!] Add education details. This is essential for most positions.");
  }
  
  // Skills
  const skillCount = [
    ...(resume?.skills?.technical || []),
    ...(resume?.skills?.frameworks || []),
    ...(resume?.skills?.languages || []),
    ...(resume?.skills?.soft || []),
  ].filter(Boolean).length;
  
  if (skillCount === 0) {
    suggestions.push("[SKILLS] Add skills section with relevant technical and soft skills.");
  } else if (skillCount < 5) {
    suggestions.push("[SKILLS] List more relevant skills (aim for at least 8-12 skills).");
  }
  
  // Projects
  if (!Array.isArray(resume?.projects) || resume.projects.length === 0) {
    suggestions.push("[PROJECTS] Include at least one project showcasing your practical experience.");
  }
  
  // General length check
  if (rawLen > 300 && rawLen < 700 && !suggestions.some(s => s.includes('brief') || s.includes('short'))) {
    suggestions.push("[FORMAT] Consider adding more detail to sections to improve ATS compatibility.");
  }
  
  return suggestions;
};

export const analyzeResumeContent = async (extractedText) => {
  // NOTE: This function is deprecated. Use the ML API via resumeMl.service.js instead.
  // ML API provides both resume parsing and scoring via the /analyze-resume endpoint.
  
  // For backwards compatibility, throw an informative error
  throw new Error(
    "analyzeResumeContent is deprecated. Use the ML API (resumeMl.service.js) via the /calculate-weighted-ats-score endpoint instead. " +
    "This provides ML-based resume parsing, scoring, and recommendations."
  );
};
