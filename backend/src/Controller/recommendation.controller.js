import { 
    generateRecommendations, 
    getAIEnhancedRecommendations, 
    saveRecommendations 
} from "../services/recommendation.service.js";
import { Recommendation } from "../Model/recommendation.model.js";
import { Career } from "../Model/carrerpath.model.js";

/**
 * DEBUG - Check user's resume data structure
 * GET /recommendation/debug-resume
 */
export const debugResumeData = async (req, res) => {
    try {
        const userId = req.user._id;
        const resume = await Resume.findOne({ userId });
        const profile = await Profile.findOne({ userId });
        
        if (!resume) {
            return res.status(404).json({
                message: "No resume found. Please upload your resume in ATS Scanner.",
                data: null
            });
        }
        
        return res.status(200).json({
            message: "Resume data found",
            data: {
                hasResume: !!resume,
                hasProfile: !!profile,
                resumeContentType: typeof resume.resumeContent,
                resumeContentKeys: resume.resumeContent ? Object.keys(resume.resumeContent) : [],
                atsScore: resume.atsScore,
                analysisStatus: resume.analysisStatus,
                // Show first 500 chars of resume content
                resumePreview: JSON.stringify(resume.resumeContent).substring(0, 500),
                profileData: {
                    educationLevel: profile?.educationLevel,
                    interests: profile?.interests || profile?.interest
                }
            }
        });
    } catch (error) {
        return res.status(500).json({
            message: "Error fetching resume data",
            error: error.message
        });
    }
};

/**
 * Generate new career recommendations for logged-in user
 * POST /recommendation/generate
 */
export const generateCareerRecommendations = async (req, res) => {
    const userId = req.user._id;
    const { useAI = false } = req.body;
    
    try {
        console.log(`[RECOMMENDATION] ============================================`);
        console.log(`[RECOMMENDATION] Generating recommendations for user: ${userId}`);
        console.log(`[RECOMMENDATION] Request body:`, req.body);
        console.log(`[RECOMMENDATION] User object:`, req.user);
        
        // Verify careers exist
        const careerCount = await Career.countDocuments({ isActive: true });
        console.log(`[RECOMMENDATION] Active careers in database: ${careerCount}`);
        
        if (careerCount === 0) {
            console.warn("[RECOMMENDATION] No active careers found in database");
            return res.status(400).json({
                message: "No career paths available in the system. Please contact administrator to configure careers.",
                data: null
            });
        }
        
        let recommendationData;
        
        try {
            if (useAI) {
                console.log("[RECOMMENDATION] Using AI-enhanced recommendations");
                recommendationData = await getAIEnhancedRecommendations(userId);
            } else {
                console.log("[RECOMMENDATION] Using standard recommendations");
                recommendationData = await generateRecommendations(userId);
            }
        } catch (genError) {
            console.error("[RECOMMENDATION] Error in recommendation generation:");
            console.error("[RECOMMENDATION] Message:", genError.message);
            console.error("[RECOMMENDATION] Stack:", genError.stack);
            
            // Provide helpful error messages
            let userMessage = genError.message;
            let statusCode = 500;
            
            if (genError.message.includes("Resume not found") || genError.message.includes("resume")) {
                statusCode = 400;
                userMessage = "Please upload your resume in the ATS Scanner before generating career recommendations.";
            } else if (genError.message.includes("No usable resume data")) {
                statusCode = 400;
                userMessage = "Your resume needs to be scanned first. Please go to ATS Scanner and upload your resume.";
            } else if (genError.message.includes("Resume data parsing failed")) {
                statusCode = 400;
                userMessage = "Resume data is incomplete. Please re-upload your resume in the ATS Scanner.";
            }
            
            return res.status(statusCode).json({
                message: userMessage,
                error: process.env.NODE_ENV === 'development' ? genError.message : undefined,
                data: null
            });
        }
        
        if (!recommendationData || !recommendationData.recommendations) {
            console.error("[RECOMMENDATION] No recommendations returned from service");
            return res.status(400).json({
                message: "Failed to generate recommendations - service returned empty data",
                data: null
            });
        }
        
        console.log(`[RECOMMENDATION] Generated ${recommendationData.recommendations.length} recommendations`);
        console.log(`[RECOMMENDATION] Top 3 careers:`, recommendationData.recommendations.slice(0, 3).map(r => ({ name: r.careerName, score: r.matchScore })));
        
        // Save to database
        try {
            await saveRecommendations(userId, recommendationData);
            console.log("[RECOMMENDATION] Saved recommendations to database");
        } catch (saveError) {
            console.error("[RECOMMENDATION] Error saving recommendations:", saveError.message);
            // Don't fail if save fails - still return recommendations to user
        }
        
        console.log(`[RECOMMENDATION] Sending response to client`);
        console.log(`[RECOMMENDATION] ============================================`);
        
        return res.status(200).json({
            message: "Career recommendations generated successfully",
            data: {
                recommendations: recommendationData.recommendations,
                generalAdvice: recommendationData.generalAdvice || null,
                userSnapshot: recommendationData.userSnapshot,
                generatedAt: new Date()
            }
        });
    } catch (error) {
        console.error("[RECOMMENDATION] ❌ FATAL ERROR ❌");
        console.error("[RECOMMENDATION] Error type:", error.constructor.name);
        console.error("[RECOMMENDATION] Error message:", error.message || error);
        console.error("[RECOMMENDATION] Error stack:", error.stack);
        console.error("[RECOMMENDATION] ============================================");
        
        // Determine appropriate status code based on error type
        let statusCode = 500;
        let userMessage = error.message || "Failed to generate recommendations";
        
        // Return 400 for validation/user errors, 500 for server errors
        if (userMessage.includes("Resume") || userMessage.includes("resume") || 
            userMessage.includes("upload") || userMessage.includes("scan")) {
            statusCode = 400;
        } else if (userMessage.includes("career") && userMessage.includes("not found")) {
            statusCode = 400;
        }
        
        return res.status(statusCode).json({
            message: userMessage,
            error: process.env.NODE_ENV === 'development' ? error.message : undefined,
            data: null
        });
    }
};

/**
 * Get saved recommendations for logged-in user
 * GET /recommendation
 */
export const getRecommendations = async (req, res) => {
    try {
        const userId = req.user._id;
        
        const recommendation = await Recommendation.findOne({ userId })
            .populate("recommendations.careerId", "careerName category salaryRange marketDemand")
            .sort({ generatedAt: -1 });
        
        if (!recommendation) {
            return res.status(404).json({
                message: "No recommendations found. Please generate recommendations first.",
                action: "POST /recommendation/generate"
            });
        }
        
        return res.status(200).json({
            message: "Recommendations retrieved successfully",
            data: recommendation
        });
    } catch (error) {
        console.error("Get recommendations error:", error);
        return res.status(500).json({
            message: "Failed to retrieve recommendations",
            error: process.env.NODE_ENV === 'development' ? error.message : "Internal error occurred"
        });
    }
};

/**
 * Get single career details
 * GET /recommendation/career/:careerId
 */
export const getCareerDetails = async (req, res) => {
    try {
        const { careerId } = req.params;
        
        const career = await Career.findById(careerId).populate("relatedCareers", "careerName category");
        
        if (!career) {
            return res.status(404).json({
                message: "Career not found"
            });
        }
        
        return res.status(200).json({
            message: "Career details retrieved successfully",
            data: career
        });
    } catch (error) {
        console.error("Get career details error:", error);
        return res.status(500).json({
            message: "Failed to retrieve career details",
            error: process.env.NODE_ENV === 'development' ? error.message : "Internal error occurred"
        });
    }
};

/**
 * Search for careers with custom parameters (for auto-search feature)
 * POST /recommendation/search
 * @param {string} career - Career name to search for
 * @param {Array<string>} skills - Required skills
 * @param {string} level - Experience level
 * @param {string} location - Preferred location
 */
export const searchCareers = async (req, res) => {
    try {
        const userId = req.user?._id;
        const { career, skills = [], level, location, includeJobs = true } = req.body;
        
        if (!career) {
            return res.status(400).json({
                message: "Career search parameter is required"
            });
        }

        console.log(`[SEARCH] Searching for career: ${career}, skills: ${skills}, level: ${level}`);
        
        // Find careers matching the search criteria
        const filter = { isActive: true };
        const searchRegex = new RegExp(career, 'i');
        filter.$or = [
            { careerName: searchRegex },
            { description: searchRegex },
            { 'requiredSkills.technical': searchRegex }
        ];

        if (level) {
            filter.experienceLevel = new RegExp(level, 'i');
        }

        const matchedCareers = await Career.find(filter).limit(10);

        if (matchedCareers.length === 0) {
            return res.status(404).json({
                message: `No careers found matching "${career}". Try a different search term.`,
                data: { careers: [] }
            });
        }

        // Generate job search links for matched careers
        let enrichedCareers = matchedCareers.map(c => ({
            _id: c._id,
            careerName: c.careerName,
            category: c.category,
            description: c.description,
            experienceLevel: c.experienceLevel,
            requiredSkills: c.requiredSkills,
            salaryRange: c.salaryRange
        }));

        if (includeJobs) {
            const { generateCustomJobSearchLinks } = await import("../utils/jobSearchLinks.js");
            enrichedCareers = enrichedCareers.map(c => ({
                ...c,
                jobSearch: generateCustomJobSearchLinks({
                    career: c.careerName,
                    skills: skills || [],
                    level: level,
                    location: location
                })
            }));
        }

        return res.status(200).json({
            message: "Career search completed successfully",
            data: {
                careers: enrichedCareers,
                searchQuery: { career, skills, level, location },
                totalResults: enrichedCareers.length
            }
        });
    } catch (error) {
        console.error("Career search error:", error);
        return res.status(500).json({
            message: "Failed to search careers",
            error: process.env.NODE_ENV === 'development' ? error.message : "Internal error occurred"
        });
    }
};

/**
 * Get all available careers (for browsing)
 * GET /recommendation/careers
 */
export const getAllCareers = async (req, res) => {
    try {
        const { category, experienceLevel, marketDemand, page = 1, limit = 20 } = req.query;
        
        const filter = { isActive: true };
        
        if (category) filter.category = category;
        if (experienceLevel) filter.experienceLevel = experienceLevel;
        if (marketDemand) filter.marketDemand = marketDemand;
        
        const skip = (parseInt(page) - 1) * parseInt(limit);
        
        const [careers, total] = await Promise.all([
            Career.find(filter)
                .select("careerName category experienceLevel marketDemand salaryRange growthOutlook")
                .skip(skip)
                .limit(parseInt(limit))
                .sort({ marketDemand: -1 }),
            Career.countDocuments(filter)
        ]);
        
        return res.status(200).json({
            message: "Careers retrieved successfully",
            data: {
                careers,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages: Math.ceil(total / parseInt(limit)),
                    totalItems: total,
                    itemsPerPage: parseInt(limit)
                }
            }
        });
    } catch (error) {
        console.error("Get all careers error:", error);
        return res.status(500).json({
            message: "Failed to retrieve careers",
            error: process.env.NODE_ENV === 'development' ? error.message : "Internal error occurred"
        });
    }
};

/**
 * Admin: Create a new career path
 * POST /recommendation/careers
 */
export const createCareer = async (req, res) => {
    try {
        const {
            careerName,
            description,
            category,
            requiredSkills,
            preferredEducation,
            experienceLevel,
            experienceYearsRange,
            salaryRange,
            marketDemand,
            growthOutlook,
            certifications,
            workEnvironment
        } = req.body;
        
        if (!careerName || !category) {
            return res.status(400).json({
                message: "Career name and category are required"
            });
        }
        
        const existingCareer = await Career.findOne({ careerName: careerName });
        if (existingCareer) {
            return res.status(409).json({
                message: "Career with this name already exists"
            });
        }
        
        const career = await Career.create({
            careerName,
            description,
            category,
            requiredSkills,
            preferredEducation,
            experienceLevel,
            experienceYearsRange,
            salaryRange,
            marketDemand,
            growthOutlook,
            certifications,
            workEnvironment
        });
        
        return res.status(201).json({
            message: "Career created successfully",
            data: career
        });
    } catch (error) {
        console.error("Create career error:", error);
        return res.status(500).json({
            message: "Failed to create career",
            error: process.env.NODE_ENV === 'development' ? error.message : "Internal error occurred"
        });
    }
};

/**
 * Admin: Update career path
 * PATCH /recommendation/careers/:careerId
 */
export const updateCareer = async (req, res) => {
    try {
        const { careerId } = req.params;
        
        const career = await Career.findByIdAndUpdate(
            careerId,
            { $set: req.body },
            { new: true, runValidators: true }
        );
        
        if (!career) {
            return res.status(404).json({
                message: "Career not found"
            });
        }
        
        return res.status(200).json({
            message: "Career updated successfully",
            data: career
        });
    } catch (error) {
        console.error("Update career error:", error);
        return res.status(500).json({
            message: "Failed to update career",
            error: process.env.NODE_ENV === 'development' ? error.message : "Internal error occurred"
        });
    }
};

/**
 * Admin: Delete/deactivate career
 * DELETE /recommendation/careers/:careerId
 */
export const deleteCareer = async (req, res) => {
    try {
        const { careerId } = req.params;
        
        // Soft delete by setting isActive to false
        const career = await Career.findByIdAndUpdate(
            careerId,
            { $set: { isActive: false } },
            { new: true }
        );
        
        if (!career) {
            return res.status(404).json({
                message: "Career not found"
            });
        }
        
        return res.status(200).json({
            message: "Career deactivated successfully"
        });
    } catch (error) {
        console.error("Delete career error:", error);
        return res.status(500).json({
            message: "Failed to deactivate career",
            error: process.env.NODE_ENV === 'development' ? error.message : "Internal error occurred"
        });
    }
};

/**
 * Compare user skills with specific career
 * POST /recommendation/compare/:careerId
 */
export const compareWithCareer = async (req, res) => {
    try {
        const { careerId } = req.params;
        const userId = req.user._id;
        
        const { Resume } = await import("../Model/resume.model.js");
        const { Profile } = await import("../Model/profile.model.js");
    
    const [resume, profile, career] = await Promise.all([
        Resume.findOne({ userId }),
        Profile.findOne({ userId }),
        Career.findById(careerId)
    ]);
    
    if (!career) {
        return res.status(404).json({ message: "Career not found" });
    }
    
    if (!resume?.resumeContent) {
        return res.status(400).json({ message: "Please upload your resume first" });
    }
    
    const resumeData = typeof resume.resumeContent === "string" 
        ? JSON.parse(resume.resumeContent) 
        : resume.resumeContent;
    
    const userSkills = [
        ...(resumeData.skills?.technical || []),
        ...(resumeData.skills?.frameworks || [])
    ].map(s => s.toLowerCase());
    
    const requiredSkills = career.requiredSkills?.technical || [];
    
    const matchedSkills = [];
    const missingSkills = [];
    
    for (const skill of requiredSkills) {
        const normalizedSkill = skill.toLowerCase();
        if (userSkills.some(us => us.includes(normalizedSkill) || normalizedSkill.includes(us))) {
            matchedSkills.push(skill);
        } else {
            missingSkills.push(skill);
        }
    }
    
    const matchPercentage = requiredSkills.length 
        ? Math.round((matchedSkills.length / requiredSkills.length) * 100)
        : 0;
    
    return res.status(200).json({
        message: "Comparison completed",
        data: {
            career: {
                name: career.careerName,
                category: career.category,
                experienceLevel: career.experienceLevel
            },
            matchPercentage,
            matchedSkills,
            missingSkills,
            recommendations: missingSkills.length > 0 
                ? `Consider learning: ${missingSkills.slice(0, 3).join(", ")}`
                : "You have all required skills for this career!"
        }
    });
    } catch (error) {
        console.error("Compare with career error:", error);
        return res.status(500).json({
            message: "Failed to compare with career",
            error: process.env.NODE_ENV === 'development' ? error.message : "Internal error occurred"
        });
    }
};

/**
 * Check system health and diagnostics
 * GET /recommendation/health/status
 */
export const checkRecommendationHealth = async (req, res) => {
    try {
        const careerCount = await Career.countDocuments({ isActive: true });
        const recommendationCount = await Recommendation.countDocuments();
        
        const sampleCareer = await Career.findOne({ isActive: true });
        
        return res.status(200).json({
            message: "Recommendation system health check",
            data: {
                status: "operational",
                careers: {
                    total: careerCount,
                    active: careerCount,
                    status: careerCount > 0 ? "OK" : "NO_CAREERS_FOUND"
                },
                recommendations: {
                    total: recommendationCount
                },
                sample: sampleCareer ? {
                    name: sampleCareer.careerName,
                    hasRequiredSkills: !!(sampleCareer.requiredSkills?.technical?.length || 0 > 0),
                    category: sampleCareer.category
                } : null,
                timestamp: new Date()
            }
        });
    } catch (error) {
        console.error("[HEALTH] Error checking system health:", error);
        return res.status(500).json({
            message: "Health check failed",
            error: error.message
        });
    }
};
