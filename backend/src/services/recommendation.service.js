import { Career } from "../Model/carrerpath.model.js";
import { Resume } from "../Model/resume.model.js";
import { Profile } from "../Model/profile.model.js";
import { Recommendation } from "../Model/recommendation.model.js";
import { generateJobSearchLinks } from "../utils/jobSearchLinks.js";

// Weights for scoring algorithm
const WEIGHTS = {
    technicalSkills: 0.30,
    softSkills: 0.10,
    experience: 0.25,
    education: 0.15,
    interests: 0.10,
    marketDemand: 0.10
};

function toPercentConfidence(value) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return 0;
    return Number((Math.max(0, Math.min(1, numeric)) * 100).toFixed(2));
}

function mapGrowthPotential(outlook) {
    if (outlook === "rapid-growth") return "high";
    if (outlook === "growing") return "medium";
    return "low";
}

function findCareerByName(careers, role) {
    const normalizedRole = String(role || "").toLowerCase().trim();
    if (!normalizedRole) return null;

    const exact = careers.find(
        (career) => String(career?.careerName || "").toLowerCase().trim() === normalizedRole
    );
    if (exact) return exact;

    return (
        careers.find((career) => {
            const name = String(career?.careerName || "").toLowerCase().trim();
            return name.includes(normalizedRole) || normalizedRole.includes(name);
        }) || null
    );
}

function buildMlRecommendationRows({ mlCareers, careers, atsScore }) {
    const uniqueByRole = new Map();

    for (const item of mlCareers) {
        const role = String(item?.role || "").trim();
        if (!role) continue;

        const key = role.toLowerCase();
        if (uniqueByRole.has(key)) continue;
        uniqueByRole.set(key, item);
    }

    return Array.from(uniqueByRole.values())
        .map((item) => {
            const role = String(item?.role || "").trim();
            const careerMatch = findCareerByName(careers, role);
            const matchScore = toPercentConfidence(item?.confidence);

            return {
                careerId: careerMatch?._id,
                careerName: role,
                category: careerMatch?.category || "other",
                matchScore,
                matchReasons: ["Recommended by trained career model"],
                skillGaps: [],
                growthPotential: mapGrowthPotential(careerMatch?.growthOutlook),
                salaryRange: careerMatch?.salaryRange || {},
                marketDemand: careerMatch?.marketDemand || "medium",
                experienceLevel: careerMatch?.experienceLevel || "entry",
                detailedScores: {
                    mlConfidence: matchScore,
                },
                jobSearch: generateJobSearchLinks({
                    career_name: role,
                    ats_score: Number.isFinite(atsScore) ? atsScore : 0,
                    extracted_skills: [],
                    preferred_location: "",
                }),
            };
        })
        .sort((a, b) => b.matchScore - a.matchScore)
        .slice(0, 5);
}

/**
 * Calculate skill match score between user skills and career required skills
 */
function calculateSkillScore(userSkills, careerSkills) {
    try {
        if (!userSkills || !Array.isArray(userSkills) || userSkills.length === 0 || 
            !careerSkills || !Array.isArray(careerSkills) || careerSkills.length === 0) {
            return 0;
        }
        
        const normalizedUserSkills = userSkills
            .filter(s => s && typeof s === 'string')
            .map(s => s.toLowerCase().trim());
        
        const normalizedCareerSkills = careerSkills
            .filter(s => s && typeof s === 'string')
            .map(s => s.toLowerCase().trim());
        
        if (normalizedUserSkills.length === 0 || normalizedCareerSkills.length === 0) {
            return 0;
        }
        
        let matchCount = 0;
        for (const userSkill of normalizedUserSkills) {
            for (const careerSkill of normalizedCareerSkills) {
                // Exact match or partial match (e.g., "react" matches "react.js")
                if (userSkill === careerSkill || 
                    userSkill.includes(careerSkill) || 
                    careerSkill.includes(userSkill)) {
                    matchCount++;
                    break;
                }
            }
        }
        
        // Score based on percentage of career skills matched
        return Math.min((matchCount / normalizedCareerSkills.length) * 100, 100);
    } catch (error) {
        console.error("Error in calculateSkillScore:", error);
        return 0; // Return 0 if error
    }
}

/**
 * Calculate experience score based on years and level match
 */
function calculateExperienceScore(userExperience, career) {
    try {
        if (!userExperience || !Array.isArray(userExperience) || userExperience.length === 0) {
            // No experience - good for entry level only
            return career?.experienceLevel === "entry" ? 70 : 20;
        }
        
        // Calculate total years from experience array
        let totalYears = 0;
        for (const exp of userExperience) {
            if (!exp) continue;
            
            try {
                if (exp.startDate && exp.endDate) {
                    const start = new Date(exp.startDate);
                    const end = exp.endDate === "Present" || exp.endDate === "present" 
                        ? new Date() 
                        : new Date(exp.endDate);
                    
                    // Check if dates are valid
                    if (!isNaN(start) && !isNaN(end)) {
                        totalYears += (end - start) / (1000 * 60 * 60 * 24 * 365);
                    }
                }
            } catch (dateError) {
                console.warn("Error parsing experience dates:", dateError);
                continue;
            }
        }
        totalYears = Math.round(totalYears);
        
        const careerExpRange = career?.experienceYearsRange || { min: 0, max: 99 };
        const { min = 0, max = 99 } = careerExpRange;
        
        if (totalYears >= min && totalYears <= max) {
            return 100; // Perfect match
        } else if (totalYears < min) {
            // Under-qualified - score decreases with gap
            const gap = min - totalYears;
            return Math.max(100 - (gap * 15), 20);
        } else {
            // Over-qualified - slight penalty
            const gap = totalYears - max;
            return Math.max(100 - (gap * 5), 60);
        }
    } catch (error) {
        console.error("Error in calculateExperienceScore:", error);
        return 50; // Return neutral score on error
    }
}

/**
 * Calculate education score based on level and field match
 */
function calculateEducationScore(userEducation, userEducationLevel, career) {
    const educationLevelRank = {
        "secondary": 1,
        "bachelor": 2,
        "master": 3,
        "phd": 4,
        "any": 0
    };
    
    try {
        let bestScore = 0;
        const preferredEdu = career?.preferredEducation || [];
        
        if (!preferredEdu || preferredEdu.length === 0) {
            return 50; // Default if no preferences
        }
        
        for (const pref of preferredEdu) {
            if (!pref) continue; // Skip null/undefined preferences
            
            let levelScore = 0;
            let fieldScore = 0;
            
            // Level comparison
            if (pref.level === "any" || !pref.level) {
                levelScore = 80;
            } else {
                const userLevel = educationLevelRank[userEducationLevel] || 1;
                const requiredLevel = educationLevelRank[pref.level] || 1;
                
                if (userLevel >= requiredLevel) {
                    levelScore = 100;
                } else {
                    levelScore = Math.max(100 - ((requiredLevel - userLevel) * 25), 30);
                }
            }
            
            // Field match
            if (userEducation?.length && pref.fields?.length) {
                for (const edu of userEducation) {
                    const userField = (edu.field || "").toLowerCase().trim();
                    if (!userField) continue;
                    
                    for (const requiredField of pref.fields) {
                        if (!requiredField) continue;
                        const normRequired = requiredField.toLowerCase().trim();
                        if (userField.includes(normRequired) || normRequired.includes(userField)) {
                            fieldScore = 100;
                            break;
                        }
                    }
                    if (fieldScore === 100) break;
                }
            } else {
                fieldScore = 50; // Neutral if no field data
            }
            
            const combinedScore = (levelScore * 0.6) + (fieldScore * 0.4);
            bestScore = Math.max(bestScore, combinedScore);
        }
        
        return bestScore || 50; // Default 50 if no education preferences
    } catch (error) {
        console.error("Error in calculateEducationScore:", error);
        return 50; // Return default score on error
    }
}

/**
 * Calculate interest alignment score
 */
function calculateInterestScore(userInterests, career) {
    try {
        if (!userInterests || !Array.isArray(userInterests) || userInterests.length === 0) {
            return 50; // Neutral
        }
        
        const categoryKeywords = {
            technology: ["programming", "coding", "software", "tech", "computers", "development", "web", "mobile", "ai", "data"],
            healthcare: ["health", "medicine", "medical", "nursing", "patient", "hospital", "wellness"],
            finance: ["money", "investment", "banking", "trading", "accounting", "financial"],
            education: ["teaching", "learning", "training", "academic", "students", "education"],
            engineering: ["engineering", "design", "building", "mechanical", "electrical", "civil"],
            creative: ["design", "art", "creative", "music", "writing", "content", "media"],
            business: ["business", "management", "marketing", "sales", "entrepreneurship", "strategy"],
            science: ["research", "science", "laboratory", "experiments", "analysis"],
            legal: ["law", "legal", "compliance", "contracts", "regulations"],
            other: []
        };
        
        const careerCategory = career?.category || "other";
        const keywords = categoryKeywords[careerCategory] || [];
        
        if (!keywords || keywords.length === 0) {
            return 50; // Neutral if no keywords for category
        }
        
        let matchCount = 0;
        
        for (const interest of userInterests) {
            if (!interest || typeof interest !== 'string') continue;
            
            const normalizedInterest = interest.toLowerCase().trim();
            for (const keyword of keywords) {
                if (keyword && normalizedInterest.includes(keyword)) {
                    matchCount++;
                    break;
                }
            }
        }
        
        return Math.min((matchCount / Math.max(keywords.length, 1)) * 150, 100);
    } catch (error) {
        console.error("Error in calculateInterestScore:", error);
        return 50; // Return default score on error
    }
}

/**
 * Get market demand score
 */
function getMarketDemandScore(marketDemand) {
    const scores = {
        "very-high": 100,
        "high": 80,
        "medium": 60,
        "low": 40
    };
    return scores[marketDemand] || 50;
}

/**
 * Identify skill gaps between user and career requirements
 */
function identifySkillGaps(userSkills, careerSkills) {
    try {
        const normalizedUserSkills = (userSkills || [])
            .filter(s => s && typeof s === 'string')
            .map(s => s.toLowerCase().trim());
        
        const gaps = [];
        
        for (const skill of (careerSkills || [])) {
            if (!skill || typeof skill !== 'string') continue;
            
            const normalizedSkill = skill.toLowerCase().trim();
            const hasSkill = normalizedUserSkills.some(us => 
                us === normalizedSkill || us.includes(normalizedSkill) || normalizedSkill.includes(us)
            );
            if (!hasSkill) {
                gaps.push(skill);
            }
        }
        
        return gaps.slice(0, 5); // Return top 5 gaps
    } catch (error) {
        console.error("Error in identifySkillGaps:", error);
        return []; // Return empty array on error
    }
}

/**
 * Generate human-readable match reasons
 */
function generateMatchReasons(scores, userSkills, career) {
    try {
        const reasons = [];
        
        if (scores?.technicalSkills >= 70) {
            reasons.push(`Strong match in technical skills`);
        }
        if (scores?.experience >= 80) {
            const expLevel = career?.experienceLevel || "entry";
            reasons.push(`Experience level aligns well with ${expLevel} position`);
        }
        if (scores?.education >= 70) {
            reasons.push(`Education background matches career requirements`);
        }
        if (scores?.interests >= 60) {
            const category = career?.category || "related";
            reasons.push(`Your interests align with ${category} field`);
        }
        if (scores?.marketDemand >= 80) {
            reasons.push(`High market demand offers good job opportunities`);
        }
        if (career?.growthOutlook === "rapid-growth" || career?.growthOutlook === "growing") {
            reasons.push(`Career has ${career.growthOutlook} outlook`);
        }
        
        return reasons.length ? reasons : ["Potential career path to explore"];
    } catch (error) {
        console.error("Error in generateMatchReasons:", error);
        return ["Potential career path to explore"]; // Return default reason on error
    }
}

/**
 * Main recommendation engine - calculates scores for all careers
 */
export async function generateRecommendations(userId) {
    try {
        console.log(`[SERVICE] Generating recommendations for user: ${userId}`);
        
        // Fetch user data
        const [resume, profile] = await Promise.all([
            Resume.findOne({ userId }),
            Profile.findOne({ userId })
        ]);
        
        console.log(`[SERVICE] Resume found: ${!!resume}, Profile found: ${!!profile}`);
        
        if (!resume?.resumeContent) {
            throw new Error("Resume not found. Please upload your resume first.");
        }

        const careers = await Career.find({ isActive: true });
        if (!careers || careers.length === 0) {
            throw new Error("No career paths available. Please contact administrator.");
        }

        const mlCareerRecommendations = resume?.resumeContent?.mlAnalysis?.careerRecommendations;
        if (Array.isArray(mlCareerRecommendations) && mlCareerRecommendations.length > 0) {
            const atsScore = Number.isFinite(resume?.atsScore) ? resume.atsScore : 0;
            const mlRecommendations = buildMlRecommendationRows({
                mlCareers: mlCareerRecommendations,
                careers,
                atsScore,
            });

            if (mlRecommendations.length > 0) {
                console.log(`[SERVICE] Using ML-based career recommendations from resume analysis (${mlRecommendations.length})`);
                return {
                    recommendations: mlRecommendations,
                    userSnapshot: {
                        technicalSkills: [],
                        softSkills: [],
                        educationLevel: profile?.educationLevel || "secondary",
                        interests: (profile?.interest || profile?.interests || []).slice(0, 5),
                    },
                    resumeId: resume._id,
                    profileId: profile?._id,
                };
            }
        }
        
        // Parse resume content - ULTRA DEFENSIVE
        let resumeData;
        try {
            console.log(`[SERVICE] ==================== PARSING RESUME ====================`);
            console.log(`[SERVICE] Resume content type:`, typeof resume.resumeContent);
            console.log(`[SERVICE] Resume content is empty:`, !resume.resumeContent);
            
            // Validate resume content exists and is not empty
            if (!resume.resumeContent || (typeof resume.resumeContent === 'object' && Object.keys(resume.resumeContent).length === 0)) {
                throw new Error("Resume data is empty. Please scan your resume first using ATS Scanner.");
            }
            
            // Parse if string, use directly if object
            let rawData = resume.resumeContent;
            if (typeof resume.resumeContent === "string") {
                console.log(`[SERVICE] Parsing string resume content...`);
                console.log(`[SERVICE] String preview:`, resume.resumeContent.substring(0, 300));
                try {
                    rawData = JSON.parse(resume.resumeContent);
                } catch (parseErr) {
                    console.warn("[SERVICE] Failed to parse resume content as JSON, using as object");
                    rawData = resume.resumeContent;
                }
            }
            
            if (!rawData || typeof rawData !== 'object') {
                throw new Error("Resume data must be a valid object or JSON string");
            }
            
            console.log(`[SERVICE] RawData type:`, typeof rawData);
            console.log(`[SERVICE] RawData keys:`, Object.keys(rawData || {}));
            
            // Try multiple possible structures - check each one properly
            if (rawData.analysis && typeof rawData.analysis === 'object' && Object.keys(rawData.analysis).length > 0) {
                // Nested analysis field
                console.log(`[SERVICE] Found analysis field (nested structure)`);
                resumeData = typeof rawData.analysis === "string" 
                    ? JSON.parse(rawData.analysis) 
                    : rawData.analysis;
            } else if (rawData.parsedResume && typeof rawData.parsedResume === 'object' && Object.keys(rawData.parsedResume).length > 0) {
                // Alternative nested structure
                console.log(`[SERVICE] Found parsedResume field`);
                resumeData = typeof rawData.parsedResume === "string"
                    ? JSON.parse(rawData.parsedResume)
                    : rawData.parsedResume;
            } else if (rawData.resumeData && typeof rawData.resumeData === 'object' && Object.keys(rawData.resumeData).length > 0) {
                // Another possible structure
                console.log(`[SERVICE] Found resumeData field`);
                resumeData = typeof rawData.resumeData === "string"
                    ? JSON.parse(rawData.resumeData)
                    : rawData.resumeData;
            } else {
                // Use root level data
                console.log(`[SERVICE] Using root level data`);
                resumeData = rawData;
            }
            
            // Final validation
            if (!resumeData || typeof resumeData !== 'object' || Object.keys(resumeData).length === 0) {
                throw new Error("Could not extract valid resume data. Please re-scan your resume.");
            }
            
            console.log(`[SERVICE] Final resumeData keys:`, Object.keys(resumeData || {}));
            console.log(`[SERVICE] Has skills:`, !!resumeData?.skills);
            console.log(`[SERVICE] Has experience:`, !!resumeData?.experience);
            console.log(`[SERVICE] Has education:`, !!resumeData?.education);
            
            if (resumeData?.skills && typeof resumeData.skills === 'object') {
                console.log(`[SERVICE] Skills keys:`, Object.keys(resumeData.skills));
            }
            
            console.log(`[SERVICE] ==================== RESUME PARSED ====================`);
        } catch (e) {
            console.error("[SERVICE] ❌❌❌ RESUME PARSE ERROR ❌❌❌");
            console.error("[SERVICE] Error:", e.message);
            console.error("[SERVICE] Stack:", e.stack);
            console.error("[SERVICE] Resume content type:", typeof resume.resumeContent);
            try {
                console.error("[SERVICE] Resume content:", JSON.stringify(resume.resumeContent).substring(0, 1000));
            } catch (stringifyErr) {
                console.error("[SERVICE] Could not stringify resume content");
            }
            throw new Error(`Resume data parsing failed: ${e.message}. Please re-upload your resume via ATS Scanner.`);
        }
        
        // Safely extract skills with MULTIPLE fallback paths
        console.log(`[SERVICE] ==================== EXTRACTING SKILLS ====================`);
        
        const userTechnicalSkills = [
            ...(Array.isArray(resumeData.skills?.technical) ? resumeData.skills.technical : []),
            ...(Array.isArray(resumeData.skills?.frameworks) ? resumeData.skills.frameworks : []),
            ...(Array.isArray(resumeData.skills?.languages) ? resumeData.skills.languages : []),
            ...(Array.isArray(resumeData.skills?.tools) ? resumeData.skills.tools : []),
            ...(Array.isArray(resumeData.technicalSkills) ? resumeData.technicalSkills : []),
            ...(Array.isArray(resumeData.technical) ? resumeData.technical : []),
            ...(Array.isArray(resumeData.hardSkills) ? resumeData.hardSkills : [])
        ].filter(s => s && typeof s === 'string' && s.trim().length > 0);
        
        const userSoftSkills = [
            ...(Array.isArray(resumeData.skills?.soft) ? resumeData.skills.soft : []),
            ...(Array.isArray(resumeData.softSkills) ? resumeData.softSkills : []),
            ...(Array.isArray(resumeData.soft) ? resumeData.soft : [])
        ].filter(s => s && typeof s === 'string' && s.trim().length > 0);
        
        console.log(`[SERVICE] ✅ Extracted ${userTechnicalSkills.length} technical skills`);
        console.log(`[SERVICE] ✅ Extracted ${userSoftSkills.length} soft skills`);
        console.log(`[SERVICE] Technical skills:`, userTechnicalSkills.slice(0, 10));
        console.log(`[SERVICE] Soft skills:`, userSoftSkills);
        
        // Get all active careers
        console.log(`[SERVICE] Found ${careers?.length || 0} active careers`);
        
        // Safely extract experience and education with fallbacks
        console.log(`[SERVICE] ==================== EXTRACTING EXPERIENCE & EDUCATION ====================`);
        
        const userExperience = Array.isArray(resumeData.experience) ? resumeData.experience :
                               Array.isArray(resumeData.workExperience) ? resumeData.workExperience :
                               Array.isArray(resumeData.work) ? resumeData.work :
                               Array.isArray(resumeData.jobs) ? resumeData.jobs : [];
                               
        const userEducation = Array.isArray(resumeData.education) ? resumeData.education :
                              Array.isArray(resumeData.educationHistory) ? resumeData.educationHistory :
                              Array.isArray(resumeData.academicBackground) ? resumeData.academicBackground :
                              Array.isArray(resumeData.qualifications) ? resumeData.qualifications : [];
                              
        const userEducationLevel = profile?.educationLevel || 
                                   resumeData?.educationLevel || 
                                   (Array.isArray(resumeData.education) && resumeData.education[0]?.level) ||
                                   (Array.isArray(resumeData.qualifications) && resumeData.qualifications[0]?.level) ||
                                   "secondary";
        
        console.log(`[SERVICE] ✅ Experience entries: ${userExperience.length}`);
        console.log(`[SERVICE] ✅ Education entries: ${userEducation.length}`);
        console.log(`[SERVICE] ✅ Education level: ${userEducationLevel}`);
        
        // Validate we have SOME data to work with
        if (userTechnicalSkills.length === 0 && userSoftSkills.length === 0 && 
            userExperience.length === 0 && userEducation.length === 0) {
            throw new Error("No usable resume data found. Please ensure your resume contains skills, experience, or education information.");
        }
        
        console.log(`[SERVICE] ==================== CALCULATING CAREER MATCHES ====================`);
        
        const atsScore = Number.isFinite(resume?.atsScore) ? resume.atsScore : 0;

        // Calculate scores for each career
        const scoredCareers = [];
        let processedCount = 0;
        let skippedCount = 0;
        
        for (const career of careers) {
            try {
                // Ensure career has required properties
                if (!career || !career.careerName) {
                    skippedCount++;
                    continue;
                }
                
                // Safely extract career required skills
                const careerRequiredSkills = career.requiredSkills || {};
                const careerTechSkills = Array.isArray(careerRequiredSkills.technical) ? careerRequiredSkills.technical : 
                                        Array.isArray(careerRequiredSkills) ? careerRequiredSkills : [];
                const careerSoftSkills = Array.isArray(careerRequiredSkills.soft) ? careerRequiredSkills.soft : [];
                
                // Safely extract profile interests
                const profileInterests = Array.isArray(profile?.interests) ? profile.interests :
                                        Array.isArray(profile?.interest) ? profile.interest :
                                        profile?.interest && typeof profile.interest === 'string' ? [profile.interest] : [];
                
                const scores = {
                    technicalSkills: calculateSkillScore(userTechnicalSkills, careerTechSkills),
                    softSkills: calculateSkillScore(userSoftSkills, careerSoftSkills),
                    experience: calculateExperienceScore(userExperience, career),
                    education: calculateEducationScore(userEducation, userEducationLevel, career),
                    interests: calculateInterestScore(profileInterests, career),
                    marketDemand: getMarketDemandScore(career.marketDemand)
                };
                
                // Calculate weighted total
                const totalScore = Math.round(
                    (scores.technicalSkills * WEIGHTS.technicalSkills) +
                    (scores.softSkills * WEIGHTS.softSkills) +
                    (scores.experience * WEIGHTS.experience) +
                    (scores.education * WEIGHTS.education) +
                    (scores.interests * WEIGHTS.interests) +
                    (scores.marketDemand * WEIGHTS.marketDemand)
                );
                
                const skillGaps = identifySkillGaps(
                    userTechnicalSkills, 
                    career.requiredSkills?.technical || []
                );
                
                const matchReasons = generateMatchReasons(scores, userTechnicalSkills, career);
                
                const jobSearch = generateJobSearchLinks({
                    career_name: career.careerName,
                    ats_score: atsScore,
                    extracted_skills: [...userTechnicalSkills, ...userSoftSkills],
                    preferred_location: resumeData?.personalInfo?.location || ""
                });

                scoredCareers.push({
                    careerId: career._id,
                    careerName: career.careerName,
                    category: career.category || "other",
                    matchScore: totalScore,
                    matchReasons,
                    skillGaps,
                    growthPotential: career.growthOutlook === "rapid-growth" ? "high" : 
                                     career.growthOutlook === "growing" ? "medium" : "low",
                    salaryRange: career.salaryRange || {},
                    marketDemand: career.marketDemand || "medium",
                    experienceLevel: career.experienceLevel || "entry",
                    detailedScores: scores,
                    jobSearch
                });
                
                processedCount++;
            } catch (careerError) {
                console.warn(`[SERVICE] Error processing career ${career?.careerName}:`, careerError.message);
                skippedCount++;
                continue;
            }
        }
        
        console.log(`[SERVICE] ✅ Processed ${processedCount} careers successfully`);
        if (skippedCount > 0) {
            console.log(`[SERVICE] ⚠️ Skipped ${skippedCount} careers due to errors`);
        }
        
        if (scoredCareers.length === 0) {
            throw new Error("Could not calculate recommendations for any careers. Please ensure career data is properly configured.");
        }
        
        // Sort by match score (highest first)
        scoredCareers.sort((a, b) => b.matchScore - a.matchScore);
        
        console.log(`[SERVICE] ==================== TOP RECOMMENDATIONS ====================`);
        console.log(`[SERVICE] 🏆 #1: ${scoredCareers[0].careerName} - ${scoredCareers[0].matchScore}%`);
        if (scoredCareers[1]) console.log(`[SERVICE] 🥈 #2: ${scoredCareers[1].careerName} - ${scoredCareers[1].matchScore}%`);
        if (scoredCareers[2]) console.log(`[SERVICE] 🥉 #3: ${scoredCareers[2].careerName} - ${scoredCareers[2].matchScore}%`);
        if (scoredCareers[3]) console.log(`[SERVICE] 📌 #4: ${scoredCareers[3].careerName} - ${scoredCareers[3].matchScore}%`);
        if (scoredCareers[4]) console.log(`[SERVICE] 📌 #5: ${scoredCareers[4].careerName} - ${scoredCareers[4].matchScore}%`);
        console.log(`[SERVICE] ==================== RECOMMENDATIONS COMPLETE ====================`);
        
        // Get top 5 recommendations
        const topRecommendations = scoredCareers.slice(0, 5);
        
        return {
            recommendations: topRecommendations,
            userSnapshot: {
                technicalSkills: userTechnicalSkills.slice(0, 10),
                softSkills: userSoftSkills.slice(0, 5),
                educationLevel: userEducationLevel,
                interests: (profile?.interest || profile?.interests || []).slice(0, 5)
            },
            resumeId: resume._id,
            profileId: profile?._id
        };
    } catch (error) {
        console.error("[SERVICE] GenerateRecommendations error:", error.message);
        console.error("[SERVICE] Stack trace:", error.stack);
        throw error;
    }
}

/**
 * Get AI-enhanced insights for top recommendations
 * Now uses ML model-based scoring. No external AI APIs needed.
 */
export async function getAIEnhancedRecommendations(userId) {
    try {
        // Base recommendations already include ML-based scoring from the ML model
        // No additional AI enhancement needed - the ML model provides all the insights
        const baseRecommendations = await generateRecommendations(userId);
        
        // Enhance with ML model insights
        const top5 = baseRecommendations.recommendations.slice(0, 5);
        
        if (!top5 || top5.length === 0) {
            return baseRecommendations;
        }
        
        // Generate learning path based on skill gaps
        for (let i = 0; i < top5.length; i++) {
            const career = top5[i];
            
            // Create a simple learning path based on skill gaps
            const skillGaps = career.skillGaps || [];
            const learningPath = [];
            
            if (skillGaps.length > 0) {
                learningPath.push(`Master core skills: ${skillGaps.slice(0, 3).join(", ")}`);
                learningPath.push(`Complete relevant certifications in ${career.category}`);
                learningPath.push(`Build portfolio projects using required technologies`);
                learningPath.push(`Gain 1-2 years of practical experience in the field`);
            }
            
            top5[i].learningPath = learningPath.length > 0 ? learningPath : null;
            top5[i].aiInsights = `${career.careerName} is a ${career.growthPotential} growth opportunity with ${career.matchReasons.length} strong match factors.`;
        }
        
        return {
            ...baseRecommendations,
            recommendations: top5,
            generalAdvice: `Based on ML model analysis, these career recommendations are tailored to your skills, experience, and interests. Focus on closing skill gaps in your top matches.`
        };
    } catch (error) {
        console.error("GetAIEnhancedRecommendations error:", error);
        throw error; // Let the controller handle this error
    }
}

/**
 * Save recommendations to database
 */
export async function saveRecommendations(userId, recommendationData) {
    try {
        if (!userId || !recommendationData) {
            throw new Error("Invalid userId or recommendationData");
        }
        
        const existing = await Recommendation.findOne({ userId });
        
        const recommendations = (recommendationData.recommendations || []).map(r => ({
            careerId: r.careerId,
            careerName: r.careerName || "Unknown Career",
            matchScore: r.matchScore || 0,
            matchReasons: r.matchReasons || [],
            skillGaps: r.skillGaps || [],
            growthPotential: r.growthPotential || "low",
            aiInsights: r.aiInsights || null,
            learningPath: r.learningPath || null,
            jobSearch: r.jobSearch || null
        }));
        
        if (existing) {
            existing.recommendations = recommendations;
            existing.generatedAt = new Date();
            existing.basedOn = {
                resumeId: recommendationData.resumeId,
                profileId: recommendationData.profileId
            };
            await existing.save();
            return existing;
        }
        
        return await Recommendation.create({
            userId,
            recommendations,
            basedOn: {
                resumeId: recommendationData.resumeId,
                profileId: recommendationData.profileId
            }
        });
    } catch (error) {
        console.error("Error saving recommendations:", error);
        throw new Error(`Failed to save recommendations: ${error.message}`);
    }
}
