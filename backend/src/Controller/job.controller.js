import { Job } from "../Model/job.model.js";
import { 
    matchUserToJobs, 
    getAIJobMatch, 
    applyToJob, 
    getUserApplications 
} from "../services/job.service.js";

/**
 * Create a new job posting
 * POST /job/create
 */
export const createJob = async (req, res) => {
    const {
        jobTitle,
        company,
        description,
        requiredSkills,
        preferredSkills,
        experienceLevel,
        experienceYears,
        education,
        salaryRange,
        location,
        workType,
        workCategory,
        benefits,
        responsibilities,
        applicationDeadline
    } = req.body;

    if (!jobTitle || !description || !company?.name) {
        return res.status(400).json({
            message: "Job title, description, and company name are required"
        });
    }

    const job = await Job.create({
        jobTitle,
        company,
        description,
        requiredSkills,
        preferredSkills,
        experienceLevel: experienceLevel || "entry",
        experienceYears: experienceYears || { min: 0, max: 99 },
        education,
        salaryRange,
        location,
        workType: workType || "onsite",
        workCategory: workCategory || "full-time",
        benefits,
        responsibilities,
        applicationDeadline: applicationDeadline ? new Date(applicationDeadline) : null,
        createdBy: req.user._id,
        status: "active"
    });

    return res.status(201).json({
        message: "Job created successfully",
        data: job
    });
};

/**
 * Get all jobs with filters
 * GET /job
 */
export const getAllJobs = async (req, res) => {
    const {
        search,
        workType,
        workCategory,
        experienceLevel,
        location,
        page = 1,
        limit = 20
    } = req.query;

    const filter = { status: "active" };

    if (workType) filter.workType = workType;
    if (workCategory) filter.workCategory = workCategory;
    if (experienceLevel) filter.experienceLevel = experienceLevel;
    if (location) {
        filter.$or = [
            { "location.city": new RegExp(location, "i") },
            { "location.country": new RegExp(location, "i") }
        ];
    }

    let query = Job.find(filter);

    if (search) {
        query = Job.find({
            ...filter,
            $text: { $search: search }
        });
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [jobs, total] = await Promise.all([
        query
            .select("jobTitle company location workType workCategory experienceLevel salaryRange applicationDeadline createdAt")
            .skip(skip)
            .limit(parseInt(limit))
            .sort({ createdAt: -1 }),
        Job.countDocuments(filter)
    ]);

    return res.status(200).json({
        message: "Jobs retrieved successfully",
        data: {
            jobs,
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(total / parseInt(limit)),
                totalItems: total
            }
        }
    });
};

/**
 * Get single job details
 * GET /job/:jobId
 */
export const getJobById = async (req, res) => {
    const { jobId } = req.params;

    const job = await Job.findById(jobId)
        .populate("createdBy", "name email");

    if (!job) {
        return res.status(404).json({ message: "Job not found" });
    }

    // Increment view count
    job.viewCount += 1;
    await job.save();

    return res.status(200).json({
        message: "Job retrieved successfully",
        data: job
    });
};

/**
 * Get job matches for authenticated user
 * GET /job/matches
 */
export const getJobMatches = async (req, res) => {
    const { limit = 20, minScore = 30 } = req.query;

    const matches = await matchUserToJobs(req.user._id, {
        limit: parseInt(limit),
        minScore: parseInt(minScore)
    });

    return res.status(200).json({
        message: "Job matches retrieved successfully",
        data: matches
    });
};

/**
 * Get AI analysis for specific job match
 * GET /job/:jobId/analyze
 */
export const analyzeJobMatch = async (req, res) => {
    const { jobId } = req.params;

    const analysis = await getAIJobMatch(req.user._id, jobId);

    return res.status(200).json({
        message: "Job analysis completed",
        data: analysis
    });
};

/**
 * Apply to a job
 * POST /job/:jobId/apply
 */
export const applyForJob = async (req, res) => {
    const { jobId } = req.params;

    const result = await applyToJob(req.user._id, jobId);

    return res.status(200).json({
        message: "Application submitted successfully",
        data: result
    });
};

/**
 * Get user's applications
 * GET /job/applications
 */
export const getMyApplications = async (req, res) => {
    const applications = await getUserApplications(req.user._id);

    return res.status(200).json({
        message: "Applications retrieved successfully",
        data: applications
    });
};

/**
 * Update job (for job owner)
 * PATCH /job/:jobId
 */
export const updateJob = async (req, res) => {
    const { jobId } = req.params;

    const job = await Job.findOne({
        _id: jobId,
        createdBy: req.user._id
    });

    if (!job) {
        return res.status(404).json({
            message: "Job not found or you don't have permission"
        });
    }

    const allowedUpdates = [
        "description", "requiredSkills", "preferredSkills", "salaryRange",
        "benefits", "responsibilities", "status", "applicationDeadline"
    ];

    for (const field of allowedUpdates) {
        if (req.body[field] !== undefined) {
            job[field] = req.body[field];
        }
    }

    await job.save();

    return res.status(200).json({
        message: "Job updated successfully",
        data: job
    });
};

/**
 * Delete/close job
 * DELETE /job/:jobId
 */
export const deleteJob = async (req, res) => {
    const { jobId } = req.params;

    const job = await Job.findOneAndUpdate(
        { _id: jobId, createdBy: req.user._id },
        { $set: { status: "closed" } },
        { new: true }
    );

    if (!job) {
        return res.status(404).json({
            message: "Job not found or you don't have permission"
        });
    }

    return res.status(200).json({
        message: "Job closed successfully"
    });
};

/**
 * Get applicants for a job (for job owner)
 * GET /job/:jobId/applicants
 */
export const getJobApplicants = async (req, res) => {
    const { jobId } = req.params;

    const job = await Job.findOne({
        _id: jobId,
        createdBy: req.user._id
    }).populate("applicants.userId", "name email avatarUrl");

    if (!job) {
        return res.status(404).json({
            message: "Job not found or you don't have permission"
        });
    }

    return res.status(200).json({
        message: "Applicants retrieved successfully",
        data: {
            jobTitle: job.jobTitle,
            totalApplicants: job.applicants.length,
            applicants: job.applicants.map(a => ({
                user: a.userId,
                appliedAt: a.appliedAt,
                status: a.status,
                matchScore: a.matchScore,
                notes: a.notes
            }))
        }
    });
};

/**
 * Update applicant status
 * PATCH /job/:jobId/applicants/:applicantId
 */
export const updateApplicantStatus = async (req, res) => {
    const { jobId, applicantId } = req.params;
    const { status, notes } = req.body;

    const job = await Job.findOne({
        _id: jobId,
        createdBy: req.user._id
    });

    if (!job) {
        return res.status(404).json({
            message: "Job not found or you don't have permission"
        });
    }

    const applicant = job.applicants.find(
        a => a.userId?.toString() === applicantId
    );

    if (!applicant) {
        return res.status(404).json({ message: "Applicant not found" });
    }

    if (status) applicant.status = status;
    if (notes) applicant.notes = notes;

    await job.save();

    return res.status(200).json({
        message: "Applicant status updated",
        data: { status: applicant.status }
    });
};