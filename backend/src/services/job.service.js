import { Job } from "../Model/job.model.js";
import { Resume } from "../Model/resume.model.js";
import { Profile } from "../Model/profile.model.js";

// Weights for job matching
const WEIGHTS = {
    technicalSkills: 0.35,
    softSkills: 0.10,
    experience: 0.25,
    education: 0.15,
    preferences: 0.15
};

/**
 * Calculate skill match percentage
 */
function calculateSkillMatch(userSkills, requiredSkills) {
    if (!requiredSkills?.length) return 100; // No requirements = full match
    if (!userSkills?.length) return 0;
    
    const normalizedUser = userSkills.map(s => s.toLowerCase().trim());
    let matchCount = 0;
    
    for (const required of requiredSkills) {
        const normalizedRequired = required.toLowerCase().trim();
        const hasMatch = normalizedUser.some(us => 
            us === normalizedRequired || 
            us.includes(normalizedRequired) || 
            normalizedRequired.includes(us)
        );
        if (hasMatch) matchCount++;
    }
    
    return Math.round((matchCount / requiredSkills.length) * 100);
}

/**
 * Calculate experience match
 */
function calculateExperienceMatch(userExperience, job) {
    let userYears = 0;
    
    if (userExperience?.length) {
        for (const exp of userExperience) {
            if (exp.startDate) {
                const start = new Date(exp.startDate);
                const end = exp.endDate === "Present" ? new Date() : new Date(exp.endDate || new Date());
                userYears += (end - start) / (1000 * 60 * 60 * 24 * 365);
            }
        }
    }
    userYears = Math.round(userYears);
    
    const { min = 0, max = 99 } = job.experienceYears || {};
    
    if (userYears >= min && userYears <= max) {
        return 100;
    } else if (userYears < min) {
        const gap = min - userYears;
        return Math.max(100 - (gap * 20), 10);
    } else {
        // Overqualified - small penalty
        return 80;
    }
}

/**
 * Calculate education match
 */
function calculateEducationMatch(userEducation, userLevel, job) {
    const levels = { secondary: 1, bachelor: 2, master: 3, phd: 4, any: 0 };
    
    if (!job.education?.level || job.education.level === "any") return 100;
    
    const userLevelNum = levels[userLevel] || 1;
    const requiredLevel = levels[job.education.level] || 0;
    
    if (userLevelNum >= requiredLevel) {
        // Check field match if specified
        if (job.education.fields?.length && userEducation?.length) {
            for (const edu of userEducation) {
                const userField = edu.field?.toLowerCase() || "";
                const hasFieldMatch = job.education.fields.some(f => 
                    userField.includes(f.toLowerCase()) || f.toLowerCase().includes(userField)
                );
                if (hasFieldMatch) return 100;
            }
            return 70; // Has level but not exact field
        }
        return 100;
    }
    
    return Math.max(100 - ((requiredLevel - userLevelNum) * 30), 20);
}

/**
 * Calculate preference match (work type, location, etc.)
 */
function calculatePreferenceMatch(profile, job) {
    let score = 70; // Base score
    
    // Work type preference could be added to profile later
    if (job.workType === "remote" || job.location?.isRemoteAllowed) {
        score += 15; // Remote is generally preferred
    }
    
    if (job.workCategory === "full-time") {
        score += 10;
    }
    
    return Math.min(score, 100);
}

/**
 * Find missing skills
 */
function findMissingSkills(userSkills, requiredSkills) {
    if (!requiredSkills?.length) return [];
    
    const normalizedUser = (userSkills || []).map(s => s.toLowerCase().trim());
    
    return requiredSkills.filter(skill => {
        const normalized = skill.toLowerCase().trim();
        return !normalizedUser.some(us => 
            us === normalized || us.includes(normalized) || normalized.includes(us)
        );
    }).slice(0, 5);
}

/**
 * Find matched skills
 */
function findMatchedSkills(userSkills, requiredSkills) {
    if (!requiredSkills?.length || !userSkills?.length) return [];
    
    const normalizedUser = userSkills.map(s => s.toLowerCase().trim());
    
    return requiredSkills.filter(skill => {
        const normalized = skill.toLowerCase().trim();
        return normalizedUser.some(us => 
            us === normalized || us.includes(normalized) || normalized.includes(us)
        );
    });
}

/**
 * Main job matching function - match user to all active jobs
 */
export async function matchUserToJobs(userId, options = {}) {
    const { limit = 20, minScore = 30 } = options;
    
    // Fetch user data
    const [resume, profile] = await Promise.all([
        Resume.findOne({ userId }),
        Profile.findOne({ userId })
    ]);
    
    if (!resume?.resumeContent) {
        throw new Error("Resume not found. Please upload your resume first.");
    }
    
    // Parse resume
    let resumeData;
    try {
        resumeData = typeof resume.resumeContent === "string"
            ? JSON.parse(resume.resumeContent)
            : resume.resumeContent;
    } catch (e) {
        throw new Error("Resume data is corrupted. Please re-upload your resume.");
    }
    
    // Get user skills
    const userTechnicalSkills = [
        ...(resumeData.skills?.technical || []),
        ...(resumeData.skills?.frameworks || []),
        ...(resumeData.skills?.languages || [])
    ];
    const userSoftSkills = resumeData.skills?.soft || [];
    
    // Get active jobs
    const jobs = await Job.find({
        status: "active",
        $or: [
            { applicationDeadline: { $gte: new Date() } },
            { applicationDeadline: null }
        ]
    }).populate("createdBy", "name email");
    
    if (!jobs.length) {
        return { matches: [], total: 0 };
    }
    
    // Score each job
    const scoredJobs = [];
    
    for (const job of jobs) {
        const scores = {
            technicalSkills: calculateSkillMatch(userTechnicalSkills, job.requiredSkills?.technical),
            softSkills: calculateSkillMatch(userSoftSkills, job.requiredSkills?.soft),
            experience: calculateExperienceMatch(resumeData.experience, job),
            education: calculateEducationMatch(resumeData.education, profile?.educationLevel, job),
            preferences: calculatePreferenceMatch(profile, job)
        };
        
        const totalScore = Math.round(
            (scores.technicalSkills * WEIGHTS.technicalSkills) +
            (scores.softSkills * WEIGHTS.softSkills) +
            (scores.experience * WEIGHTS.experience) +
            (scores.education * WEIGHTS.education) +
            (scores.preferences * WEIGHTS.preferences)
        );
        
        if (totalScore >= minScore) {
            scoredJobs.push({
                job: {
                    _id: job._id,
                    jobTitle: job.jobTitle,
                    company: job.company,
                    location: job.location,
                    workType: job.workType,
                    workCategory: job.workCategory,
                    experienceLevel: job.experienceLevel,
                    salaryRange: job.salaryRange?.isVisible ? job.salaryRange : null,
                    applicationDeadline: job.applicationDeadline,
                    postedBy: job.createdBy?.name
                },
                matchScore: totalScore,
                matchedSkills: findMatchedSkills(userTechnicalSkills, job.requiredSkills?.technical),
                missingSkills: findMissingSkills(userTechnicalSkills, job.requiredSkills?.technical),
                detailedScores: scores,
                recommendation: totalScore >= 70 ? "Strong Match" : 
                               totalScore >= 50 ? "Good Match" : "Consider Applying"
            });
        }
    }
    
    // Sort by score
    scoredJobs.sort((a, b) => b.matchScore - a.matchScore);
    
    return {
        matches: scoredJobs.slice(0, limit),
        total: scoredJobs.length,
        userSkillsSummary: {
            technical: userTechnicalSkills.slice(0, 10),
            soft: userSoftSkills.slice(0, 5)
        }
    };
}

/**
 * Get AI-enhanced job match analysis
 */
export async function getAIJobMatch(userId, jobId) {
    const [resume, job] = await Promise.all([
        Resume.findOne({ userId }),
        Job.findById(jobId)
    ]);
    
    if (!resume?.resumeContent) {
        throw new Error("Resume not found");
    }
    if (!job) {
        throw new Error("Job not found");
    }
    
    const resumeData = typeof resume.resumeContent === "string"
        ? JSON.parse(resume.resumeContent)
        : resume.resumeContent;
    
    // Use local scoring (ML model already provided this via matchUserToJobs)
    // For detailed analysis, use matchUserToJobs and filter by jobId
    const userExperience = Array.isArray(resumeData.experience) ? resumeData.experience : [];
    const userEducation = Array.isArray(resumeData.education) ? resumeData.education : [];
    const userSkills = [
        ...(Array.isArray(resumeData.skills?.technical) ? resumeData.skills.technical : []),
        ...(Array.isArray(resumeData.skills?.frameworks) ? resumeData.skills.frameworks : [])
    ];
    
    // Calculate match using local scoring
    const skillMatch = calculateSkillMatch(userSkills, job.requiredSkills?.technical || []);
    const experienceMatch = calculateExperienceMatch(userExperience, job);
    const educationMatch = calculateEducationMatch(userEducation, resume.educationLevel || "secondary", job);
    const preferenceMatch = calculatePreferenceMatch({ educationLevel: resume.educationLevel }, job);
    
    const analysis = {
        matchPercentage: Math.round(
            (skillMatch * WEIGHTS.technicalSkills) +
            (experienceMatch * WEIGHTS.experience) +
            (educationMatch * WEIGHTS.education) +
            (preferenceMatch * WEIGHTS.preferences)
        ),
        skills: {
            matched: findMatchedSkills(userSkills, job.requiredSkills?.technical || []),
            missing: findMissingSkills(userSkills, job.requiredSkills?.technical || [])
        },
        strengths: [
            skillMatch >= 70 ? `Strong technical skill alignment (${skillMatch}%)` : null,
            experienceMatch >= 80 ? `Experience level matches job requirements` : null,
            educationMatch >= 80 ? `Education background aligns with position` : null
        ].filter(Boolean),
        gaps: [
            skillMatch < 50 ? `Missing key technical skills` : null,
            experienceMatch < 60 ? `Experience level may be below requirements` : null,
            educationMatch < 60 ? `Education level may not meet requirements` : null
        ].filter(Boolean),
        recommendation: matchPercentage >= 75 ? "Strong match - Apply now"
            : matchPercentage >= 60 ? "Good match - Worth applying"
            : matchPercentage >= 45 ? "Moderate match - Consider applying"
            : "Low match - Build skills first"
    };
    
    return {
        job: {
            _id: job._id,
            jobTitle: job.jobTitle,
            company: job.company
        },
        mlAnalysis: analysis
    };
}

/**
 * Apply to a job
 */
export async function applyToJob(userId, jobId) {
    const job = await Job.findById(jobId);
    
    if (!job) {
        throw new Error("Job not found");
    }
    
    if (job.status !== "active") {
        throw new Error("This job is no longer accepting applications");
    }
    
    if (job.applicationDeadline && new Date(job.applicationDeadline) < new Date()) {
        throw new Error("Application deadline has passed");
    }
    
    // Check if already applied
    const alreadyApplied = job.applicants?.some(a => a.userId?.toString() === userId.toString());
    if (alreadyApplied) {
        throw new Error("You have already applied to this job");
    }
    
    // Get match score
    const resume = await Resume.findOne({ userId });
    let matchScore = 0;
    
    if (resume?.resumeContent) {
        const resumeData = typeof resume.resumeContent === "string"
            ? JSON.parse(resume.resumeContent)
            : resume.resumeContent;
        
        const userSkills = [
            ...(resumeData.skills?.technical || []),
            ...(resumeData.skills?.frameworks || [])
        ];
        
        matchScore = calculateSkillMatch(userSkills, job.requiredSkills?.technical);
    }
    
    // Add applicant
    job.applicants.push({
        userId,
        matchScore,
        status: "pending"
    });
    job.applicationCount += 1;
    
    await job.save();
    
    return {
        success: true,
        applicationStatus: "pending",
        matchScore
    };
}

/**
 * Get user's job applications
 */
export async function getUserApplications(userId) {
    const jobs = await Job.find({
        "applicants.userId": userId
    }).select("jobTitle company applicants status");
    
    return jobs.map(job => {
        const application = job.applicants.find(a => a.userId?.toString() === userId.toString());
        return {
            jobId: job._id,
            jobTitle: job.jobTitle,
            company: job.company?.name,
            appliedAt: application?.appliedAt,
            status: application?.status,
            matchScore: application?.matchScore,
            jobStatus: job.status
        };
    });
}
