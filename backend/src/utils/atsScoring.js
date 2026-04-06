/**
 * ============================================
 * ATS RESUME SCORING MODULE
 * ============================================
 * Comprehensive weighted scoring system for resume evaluation
 * 
 * Scoring Components:
 * 1. Keyword Matching (50%)
 * 2. Section Completeness (20%)
 * 3. Experience & Project Relevance (20%)
 * 4. Resume Formatting & Quality (10%)
 * 
 * Total Score: 100
 * ============================================
 */

/**
 * ============================================
 * 1️⃣ KEYWORD MATCHING SCORE (50%)
 * ============================================
 * Evaluates how well resume matches required job skills
 * 
 * @param {string} resumeText - Full resume text (lowercase for comparison)
 * @param {Array<string>} requiredSkills - Array of required job skills
 * @returns {Object} { score, matchedSkills }
 */
export const calculateKeywordScore = (resumeText, requiredSkills) => {
  // Validate inputs
  if (!resumeText || typeof resumeText !== 'string') {
    return {
      score: 0,
      matchedSkills: [],
      matchPercentage: 0
    };
  }

  if (!Array.isArray(requiredSkills) || requiredSkills.length === 0) {
    return {
      score: 0,
      matchedSkills: [],
      matchPercentage: 0
    };
  }

  // Convert resume text to lowercase for case-insensitive matching
  const resumeLower = resumeText.toLowerCase();
  
  // Track matched skills (avoid duplicates)
  const matchedSkills = [];
  
  // Check each required skill
  requiredSkills.forEach((skill) => {
    const skillLower = skill.toLowerCase().trim();
    
    // Skip empty skills
    if (!skillLower) return;
    
    // Check if skill appears in resume (exact or partial match)
    // Use word boundaries to avoid false matches (e.g., "java" shouldn't match "javascript" unless intended)
    const skillRegex = new RegExp(`\\b${skillLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    
    if (skillRegex.test(resumeText) || resumeLower.includes(skillLower)) {
      // Avoid duplicate counting
      if (!matchedSkills.some(s => s.toLowerCase() === skillLower)) {
        matchedSkills.push(skill);
      }
    }
  });
  
  // Calculate keyword score
  const totalSkills = requiredSkills.length;
  const matchedCount = matchedSkills.length;
  const matchPercentage = (matchedCount / totalSkills) * 100;
  
  // Score out of 50
  let keywordScore = (matchedCount / totalSkills) * 50;
  
  // Cap at 50 (safety check)
  keywordScore = Math.min(50, Math.max(0, keywordScore));
  
  return {
    score: Math.round(keywordScore * 10) / 10, // Round to 1 decimal
    matchedSkills,
    matchPercentage: Math.round(matchPercentage)
  };
};

/**
 * ============================================
 * 2️⃣ SECTION COMPLETENESS SCORE (20%)
 * ============================================
 * Checks if resume contains all essential sections
 * Each section = 4 points (5 sections × 4 = 20 points)
 * 
 * @param {string} resumeText - Full resume text
 * @returns {Object} { score, presentSections, missingSections }
 */
export const calculateSectionScore = (resumeText) => {
  if (!resumeText || typeof resumeText !== 'string') {
    return {
      score: 0,
      presentSections: [],
      missingSections: ['Contact Information', 'Summary/Objective', 'Skills', 'Education', 'Experience/Projects'],
      sectionDetails: {}
    };
  }
  
  const resumeLower = resumeText.toLowerCase();
  
  // Define required sections with their detection patterns
  const sections = {
    'Contact Information': {
      patterns: [
        /\b(email|e-mail)\b.*?[@]/i,
        /\b(phone|mobile|tel|contact)\b.*?[\d\(\)\-\+\s]{7,}/i,
        /\b(linkedin|github|portfolio)\b/i,
        /@[\w.-]+\.\w+/i // Email pattern
      ],
      points: 4
    },
    'Summary/Objective': {
      patterns: [
        /\b(summary|objective|profile|about\s*me|professional\s*summary|career\s*objective)\b/i
      ],
      points: 4
    },
    'Skills': {
      patterns: [
        /\b(skills|technical\s*skills|core\s*competencies|proficiencies|expertise|technologies)\b/i
      ],
      points: 4
    },
    'Education': {
      patterns: [
        /\b(education|academic|qualification|degree|university|college|bachelor|master|phd)\b/i
      ],
      points: 4
    },
    'Experience/Projects': {
      patterns: [
        /\b(experience|employment|work\s*history|professional\s*experience)\b/i,
        /\b(projects|portfolio|work\s*samples)\b/i,
        /\b(internship|intern)\b/i
      ],
      points: 4
    }
  };
  
  const presentSections = [];
  const missingSections = [];
  const sectionDetails = {};
  let totalScore = 0;
  
  // Check each section
  Object.entries(sections).forEach(([sectionName, { patterns, points }]) => {
    // Check if any pattern matches
    const isPresent = patterns.some(pattern => pattern.test(resumeText));
    
    sectionDetails[sectionName] = {
      present: isPresent,
      points: isPresent ? points : 0
    };
    
    if (isPresent) {
      presentSections.push(sectionName);
      totalScore += points;
    } else {
      missingSections.push(sectionName);
    }
  });
  
  return {
    score: Math.min(20, totalScore), // Cap at 20
    presentSections,
    missingSections,
    sectionDetails
  };
};

/**
 * ============================================
 * 3️⃣ EXPERIENCE & PROJECT RELEVANCE (20%)
 * ============================================
 * Evaluates professional experience and project work
 * 
 * Scoring Logic:
 * - No experience/projects → 5 points
 * - Projects only → 10 points
 * - Internship → 15 points
 * - Relevant experience (1+ year) → 20 points
 * 
 * @param {string} resumeText - Full resume text
 * @param {Object} parsedResume - Structured resume data (optional)
 * @returns {Object} { score, experienceLevel, details }
 */
export const calculateExperienceScore = (resumeText, parsedResume = null) => {
  if (!resumeText || typeof resumeText !== 'string') {
    return {
      score: 0,
      experienceLevel: 'None',
      details: {
        hasProjects: false,
        hasInternship: false,
        hasExperience: false,
        yearsOfExperience: 0
      }
    };
  }
  
  const resumeLower = resumeText.toLowerCase();
  
  // Detection patterns
  const hasProjects = /\b(project|projects|portfolio|capstone|case\s*study)\b/i.test(resumeText);
  const hasInternship = /\b(internship|intern|co-op|trainee|apprentice)\b/i.test(resumeText);
  const hasExperience = /\b(experience|employment|worked|developer|engineer|analyst|manager|specialist)\b/i.test(resumeText);
  
  // Detect years of experience
  const yearPatterns = [
    /(\d+)\+?\s*(years?|yrs?)\s*(of\s*)?(experience|exp)/i,
    /(\d+)\s*-\s*(\d+)\s*(years?|yrs?)/i,
    /(over|more\s*than)\s*(\d+)\s*(years?|yrs?)/i
  ];
  
  let yearsOfExperience = 0;
  
  yearPatterns.forEach(pattern => {
    const match = resumeText.match(pattern);
    if (match) {
      // Extract the number from the match
      const numbers = match[0].match(/\d+/g);
      if (numbers && numbers.length > 0) {
        // Take the largest number found
        const maxYear = Math.max(...numbers.map(n => parseInt(n, 10)));
        yearsOfExperience = Math.max(yearsOfExperience, maxYear);
      }
    }
  });
  
  // If parsed resume is provided, check structured experience data
  if (parsedResume && Array.isArray(parsedResume.experience)) {
    // Count experience entries
    const experienceCount = parsedResume.experience.length;
    
    // Try to calculate total years from date ranges
    let totalMonths = 0;
    parsedResume.experience.forEach(exp => {
      if (exp.startDate && exp.endDate) {
        try {
          const start = new Date(exp.startDate);
          const end = exp.endDate.toLowerCase() === 'present' ? new Date() : new Date(exp.endDate);
          const months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
          totalMonths += Math.max(0, months);
        } catch (e) {
          // Ignore date parsing errors
        }
      }
    });
    
    const calculatedYears = totalMonths / 12;
    yearsOfExperience = Math.max(yearsOfExperience, calculatedYears);
  }
  
  // Determine score based on experience level
  let score = 0;
  let experienceLevel = 'None';
  
  if (yearsOfExperience >= 1 || (hasExperience && !hasInternship)) {
    // Has relevant professional experience
    score = 20;
    experienceLevel = `${Math.round(yearsOfExperience)}+ year(s) experience`;
  } else if (hasInternship) {
    // Has internship experience
    score = 15;
    experienceLevel = 'Internship';
  } else if (hasProjects) {
    // Has projects only
    score = 10;
    experienceLevel = 'Projects only';
  } else {
    // No relevant experience
    score = 5;
    experienceLevel = 'Entry level';
  }
  
  return {
    score: Math.min(20, score), // Cap at 20
    experienceLevel,
    details: {
      hasProjects,
      hasInternship,
      hasExperience,
      yearsOfExperience: Math.round(yearsOfExperience * 10) / 10 // Round to 1 decimal
    }
  };
};

/**
 * ============================================
 * 4️⃣ RESUME FORMATTING & QUALITY (10%)
 * ============================================
 * Evaluates resume formatting, structure, and quality
 * 
 * Checks:
 * - Bullet points usage
 * - Section headings
 * - Appropriate length
 * - No keyword stuffing
 * 
 * @param {string} resumeText - Full resume text
 * @returns {Object} { score, quality, issues }
 */
export const calculateFormatScore = (resumeText) => {
  if (!resumeText || typeof resumeText !== 'string') {
    return {
      score: 0,
      quality: 'Poor',
      issues: ['Resume is empty or invalid'],
      checks: {}
    };
  }
  
  const issues = [];
  const checks = {};
  
  // Check 1: Bullet points (good formatting indicator)
  const bulletRegex = /[•\-\*\►\▪]\s+/g;
  const bulletMatches = resumeText.match(bulletRegex) || [];
  const hasBullets = bulletMatches.length >= 3; // At least 3 bullet points
  checks.bulletPoints = {
    present: hasBullets,
    count: bulletMatches.length
  };
  
  if (!hasBullets) {
    issues.push('Add bullet points to list achievements and responsibilities');
  }
  
  // Check 2: Section headings (proper structure)
  const headingPatterns = [
    /\b(EXPERIENCE|EDUCATION|SKILLS|PROJECTS|SUMMARY|OBJECTIVE)\b/,
    /^[A-Z\s]{3,}$/m, // All caps lines (common for headings)
    /\b[A-Z][a-z]+(\s+[A-Z][a-z]+)*\s*:\s*$/m // Title Case with colon
  ];
  
  const hasHeadings = headingPatterns.some(pattern => pattern.test(resumeText));
  checks.sectionHeadings = {
    present: hasHeadings
  };
  
  if (!hasHeadings) {
    issues.push('Use clear section headings (e.g., EXPERIENCE, EDUCATION, SKILLS)');
  }
  
  // Check 3: Resume length (not too short, not too long)
  const wordCount = resumeText.trim().split(/\s+/).length;
  const charCount = resumeText.length;
  
  const isGoodLength = wordCount >= 200 && wordCount <= 800 && charCount >= 300;
  checks.length = {
    appropriate: isGoodLength,
    wordCount,
    charCount
  };
  
  if (charCount < 300) {
    issues.push('Resume is too short - add more details about your experience and skills');
  } else if (wordCount > 800) {
    issues.push('Resume may be too long - consider condensing to 1-2 pages');
  }
  
  // Check 4: Keyword stuffing detection
  const words = resumeText.toLowerCase().split(/\s+/);
  const wordFrequency = {};
  
  words.forEach(word => {
    // Only count meaningful words (length > 3)
    if (word.length > 3) {
      wordFrequency[word] = (wordFrequency[word] || 0) + 1;
    }
  });
  
  // Find words that appear too frequently (potential keyword stuffing)
  const repeatedWords = Object.entries(wordFrequency)
    .filter(([word, count]) => count > Math.max(5, wordCount * 0.03)) // >3% of total words
    .map(([word, count]) => ({ word, count }));
  
  const hasKeywordStuffing = repeatedWords.length > 3;
  checks.keywordStuffing = {
    detected: hasKeywordStuffing,
    repeatedWords: repeatedWords.slice(0, 3) // Top 3 repeated words
  };
  
  if (hasKeywordStuffing) {
    issues.push('Avoid excessive repetition of keywords - vary your language');
  }
  
  // Check 5: Quantifiable achievements (numbers, percentages)
  const quantifiableRegex = /\d+[%+]?|\$\d+/g;
  const quantifiableMatches = resumeText.match(quantifiableRegex) || [];
  const hasQuantifiables = quantifiableMatches.length >= 3;
  checks.quantifiableAchievements = {
    present: hasQuantifiables,
    count: quantifiableMatches.length
  };
  
  if (!hasQuantifiables) {
    issues.push('Include quantifiable achievements (e.g., "Increased sales by 25%")');
  }
  
  // Calculate score based on passed checks
  const checksArray = [
    hasBullets,
    hasHeadings,
    isGoodLength,
    !hasKeywordStuffing,
    hasQuantifiables
  ];
  
  const passedChecks = checksArray.filter(check => check).length;
  const totalChecks = checksArray.length;
  
  let formatScore = 0;
  let quality = 'Poor';
  
  if (passedChecks >= 4) {
    formatScore = 10;
    quality = 'Good';
  } else if (passedChecks >= 3) {
    formatScore = 7;
    quality = 'Average';
  } else if (passedChecks >= 2) {
    formatScore = 5;
    quality = 'Below Average';
  } else {
    formatScore = 2;
    quality = 'Poor';
  }
  
  return {
    score: Math.min(10, formatScore), // Cap at 10
    quality,
    issues,
    checks,
    passedChecks: `${passedChecks}/${totalChecks}`
  };
};

/**
 * ============================================
 * FINAL ATS SCORE CALCULATION
 * ============================================
 * Combines all scoring components to produce final score
 * 
 * @param {string} resumeText - Full resume text
 * @param {Array<string>} requiredSkills - Array of required job skills
 * @param {Object} parsedResume - Structured resume data (optional)
 * @returns {Object} Complete scoring breakdown
 */
export const calculateATSScore = (resumeText, requiredSkills = [], parsedResume = null) => {
  // Handle empty or invalid inputs
  if (!resumeText || typeof resumeText !== 'string' || resumeText.trim().length === 0) {
    return {
      final_score: 0,
      keyword_score: 0,
      section_score: 0,
      experience_score: 0,
      format_score: 0,
      matched_skills: [],
      strength_level: 'Weak',
      improvement_suggestions: [
        'Upload a valid resume document',
        'Ensure your resume contains text (not just images)',
        'Include all essential sections: Contact, Summary, Skills, Education, Experience'
      ],
      detailed_breakdown: null
    };
  }
  
  // Calculate each component score
  const keywordResult = calculateKeywordScore(resumeText, requiredSkills);
  const sectionResult = calculateSectionScore(resumeText);
  const experienceResult = calculateExperienceScore(resumeText, parsedResume);
  const formatResult = calculateFormatScore(resumeText);
  const resumeTypeResult = detectResumeType(resumeText);
  
  // Calculate final score (sum of all components)
  const finalScore = 
    keywordResult.score +        // Max 50
    sectionResult.score +         // Max 20
    experienceResult.score +      // Max 20
    formatResult.score;           // Max 10
  
  // Ensure score is between 0 and 100
  const normalizedScore = Math.max(0, Math.min(100, Math.round(finalScore * 10) / 10));
  
  // Determine strength level
  let strengthLevel = 'Weak';
  if (normalizedScore >= 85) {
    strengthLevel = 'Excellent';
  } else if (normalizedScore >= 70) {
    strengthLevel = 'Strong';
  } else if (normalizedScore >= 50) {
    strengthLevel = 'Average';
  }
  
  // Generate improvement suggestions
  const improvementSuggestions = [];
  
  // Keyword suggestions
  if (keywordResult.matchPercentage < 50) {
    improvementSuggestions.push(
      'Consider adding more relevant skills that match the job requirements'
    );
  }
  
  // Section suggestions
  if (sectionResult.missingSections.length > 0) {
    improvementSuggestions.push(
      `Include missing sections: ${sectionResult.missingSections.join(', ')}`
    );
  }
  
  // Experience suggestions
  if (experienceResult.score < 15) {
    if (!experienceResult.details.hasExperience && !experienceResult.details.hasInternship) {
      improvementSuggestions.push(
        'Add internships or relevant work experience to strengthen your profile'
      );
    }
    if (!experienceResult.details.hasProjects) {
      improvementSuggestions.push(
        'Include projects to demonstrate practical skills'
      );
    }
  }
  
  // Format suggestions
  if (formatResult.issues.length > 0) {
    formatResult.issues.forEach(issue => {
      improvementSuggestions.push(issue);
    });
  }
  
  // General suggestions based on overall score
  if (normalizedScore < 50) {
    improvementSuggestions.push(
      'Consider using a professional resume template with clear sections'
    );
  }
  
  if (keywordResult.matchPercentage > 0 && keywordResult.matchPercentage < 30) {
    improvementSuggestions.push(
      'Tailor your resume more closely to the job requirements'
    );
  }
  
  // Return comprehensive results
  return {
    // Main scores
    final_score: normalizedScore,
    keyword_score: Math.round(keywordResult.score * 10) / 10,
    section_score: sectionResult.score,
    experience_score: experienceResult.score,
    format_score: formatResult.score,
    
    // Resume type detection
    resume_type: resumeTypeResult.type,
    resume_type_confidence: resumeTypeResult.confidence,
    resume_type_indicators: resumeTypeResult.indicators,
    
    // Skills analysis
    matched_skills: keywordResult.matchedSkills,
    skill_match_percentage: keywordResult.matchPercentage,
    
    // Overall assessment
    strength_level: strengthLevel,
    improvement_suggestions: improvementSuggestions.slice(0, 8), // Limit to top 8 suggestions
    
    // Detailed breakdown (for advanced analysis)
    detailed_breakdown: {
      keywords: {
        score: keywordResult.score,
        weight: '50%',
        matched: keywordResult.matchedSkills.length,
        total: requiredSkills.length,
        percentage: keywordResult.matchPercentage
      },
      sections: {
        score: sectionResult.score,
        weight: '20%',
        present: sectionResult.presentSections,
        missing: sectionResult.missingSections,
        details: sectionResult.sectionDetails
      },
      experience: {
        score: experienceResult.score,
        weight: '20%',
        level: experienceResult.experienceLevel,
        details: experienceResult.details
      },
      formatting: {
        score: formatResult.score,
        weight: '10%',
        quality: formatResult.quality,
        checks: formatResult.checks,
        passed: formatResult.passedChecks
      }
    }
  };
};

/**
 * ============================================
 * HELPER: Extract Skills from Job Description
 * ============================================
 * Intelligently extracts required skills from a job description
 * 
 * @param {string} jobDescription - Job description text
 * @returns {Array<string>} Array of extracted skills
 */
export const extractSkillsFromJobDescription = (jobDescription) => {
  if (!jobDescription || typeof jobDescription !== 'string') {
    return [];
  }
  
  const jdLower = jobDescription.toLowerCase();
  
  // Common technical skills and keywords to look for
  const commonSkills = [
    // Programming Languages
    'javascript', 'python', 'java', 'c++', 'c#', 'ruby', 'php', 'swift', 'kotlin',
    'typescript', 'go', 'rust', 'scala', 'r', 'matlab',
    
    // Web Technologies
    'html', 'css', 'react', 'angular', 'vue', 'node.js', 'express', 'django',
    'flask', 'spring', 'asp.net', 'jquery',
    
    // Databases
    'sql', 'mysql', 'postgresql', 'mongodb', 'redis', 'oracle', 'dynamodb',
    'cassandra', 'elasticsearch',
    
    // Cloud & DevOps
    'aws', 'azure', 'gcp', 'docker', 'kubernetes', 'jenkins', 'ci/cd', 'terraform',
    'ansible', 'git', 'github', 'gitlab',
    
    // Data Science & AI
    'machine learning', 'deep learning', 'tensorflow', 'pytorch', 'scikit-learn',
    'pandas', 'numpy', 'data analysis', 'statistics',
    
    // Soft Skills
    'communication', 'leadership', 'teamwork', 'problem solving', 'analytical',
    'project management', 'agile', 'scrum'
  ];
  
  const extractedSkills = [];
  
  // Find skills that appear in the job description
  commonSkills.forEach(skill => {
    const skillRegex = new RegExp(`\\b${skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    if (skillRegex.test(jobDescription)) {
      extractedSkills.push(skill);
    }
  });
  
  return extractedSkills;
};

/**
 * ============================================
 * HELPER: Detect Resume Type (Technical vs Non-Technical)
 * ============================================
 * Analyzes resume content to determine if it's a technical or non-technical profile
 * 
 * @param {string} resumeText - Full resume text
 * @returns {Object} { type, confidence, technicalScore, nonTechnicalScore, indicators }
 */
export const detectResumeType = (resumeText) => {
  if (!resumeText || typeof resumeText !== 'string') {
    return {
      type: 'Unknown',
      confidence: 0,
      technicalScore: 0,
      nonTechnicalScore: 0,
      indicators: {
        technical: [],
        nonTechnical: []
      }
    };
  }

  const textLower = resumeText.toLowerCase();
  let technicalScore = 0;
  let nonTechnicalScore = 0;
  const technicalIndicators = [];
  const nonTechnicalIndicators = [];

  // ============================================
  // TECHNICAL KEYWORDS & PATTERNS
  // ============================================
  const technicalPatterns = {
    'Programming Languages': /\b(javascript|python|java|c\+\+|c#|ruby|php|swift|kotlin|typescript|go|rust|scala|r|matlab|perl|groovy)\b/gi,
    'Web Technologies': /\b(html|css|react|angular|vue|node\.?js|express|django|flask|spring|asp\.net|jquery|webpack|babel|npm|yarn)\b/gi,
    'Databases': /\b(sql|mysql|postgresql|mongodb|redis|oracle|dynamodb|cassandra|elasticsearch|firebase|firestore|neo4j|mariadb)\b/gi,
    'Cloud & DevOps': /\b(aws|azure|gcp|google cloud|docker|kubernetes|jenkins|ci\/cd|terraform|ansible|git|github|gitlab|heroku|netlify)\b/gi,
    'Data Science & AI': /\b(machine learning|deep learning|tensorflow|pytorch|scikit-learn|pandas|numpy|data analysis|statistics|ai|artificial intelligence|nlp|opencv)\b/gi,
    'Software Development': /\b(api|rest|graphql|microservices|architecture|framework|library|sdk|ide|debugger|refactor|unit test|integration test)\b/gi,
    'Technical Roles': /\b(software engineer|developer|programmer|architect|devops|data scientist|full.?stack|backend|frontend|senior engineer|tech lead)\b/gi
  };

  const nonTechnicalPatterns = {
    'HR & Recruitment': /\b(hr|human resource|recruitment|recruiter|talent|employee|payroll|compensation|benefits|onboarding|training|development)\b/gi,
    'Sales & Business': /\b(sales|business development|account manager|business analyst|account executive|sales director|revenue|client management|deal closure)\b/gi,
    'Marketing': /\b(marketing|brand|campaign|content|digital marketing|social media|seo|advertising|promotion|market research|consumer)\b/gi,
    'Management & Leadership': /\b(manager|director|manager|supervisor|team lead|executive|c-level|ceo|cfo|cto|leadership|strategy)\b/gi,
    'Finance & Accounting': /\b(accounting|accountant|finance|financial|audit|bookkeeping|tax|cpa|financial analyst|controller|treasurer)\b/gi,
    'Administration & Support': /\b(administrative|secretary|assistant|office|coordinator|data entry|filing|scheduling|reception)\b/gi,
    'Customer Service': /\b(customer service|customer support|customer care|help desk|support ticket|service representative|call center)\b/gi,
    'Non-Technical Soft Skills': /\b(communication|presentation|negotiation|stakeholder management|decision making|strategic planning|problem solving|analytical thinking)\b/gi
  };

  // Count technical indicators
  Object.entries(technicalPatterns).forEach(([category, pattern]) => {
    const matches = resumeText.match(pattern) || [];
    if (matches.length > 0) {
      technicalScore += Math.min(5, matches.length); // Weight: up to 5 points per category
      technicalIndicators.push(category);
    }
  });

  // Count non-technical indicators
  Object.entries(nonTechnicalPatterns).forEach(([category, pattern]) => {
    const matches = resumeText.match(pattern) || [];
    if (matches.length > 0) {
      nonTechnicalScore += Math.min(5, matches.length); // Weight: up to 5 points per category
      nonTechnicalIndicators.push(category);
    }
  });

  // Check for key role titles
  const isTechnicalRole = /\b(engineer|developer|programmer|architect|devops|scientist|analyst)\b/i.test(resumeText);
  const isNonTechnicalRole = /\b(manager|director|consultant|officer|coordinator|specialist)\b/i.test(resumeText);

  if (isTechnicalRole) technicalScore += 3;
  if (isNonTechnicalRole) nonTechnicalScore += 3;

  // Check for project/portfolio links (common in tech resumes)
  const hasGithub = /github\.com|gitlab\.com|bitbucket\.org/i.test(resumeText);
  const hasPortfolio = /portfolio|project|demo|live|deployed|github/i.test(resumeText);
  if (hasGithub || hasPortfolio) technicalScore += 2;

  // Determine type based on scores
  let type = 'Unknown';
  let confidence = 0;

  const totalScore = technicalScore + nonTechnicalScore;
  if (totalScore > 0) {
    confidence = Math.round((Math.max(technicalScore, nonTechnicalScore) / totalScore) * 100);

    if (technicalScore > nonTechnicalScore) {
      type = 'Technical';
    } else if (nonTechnicalScore > technicalScore) {
      type = 'Non-Technical';
    } else {
      type = 'Hybrid'; // Equal scores
    }
  }

  return {
    type,
    confidence,
    technicalScore,
    nonTechnicalScore,
    indicators: {
      technical: technicalIndicators,
      nonTechnical: nonTechnicalIndicators
    }
  };
};
