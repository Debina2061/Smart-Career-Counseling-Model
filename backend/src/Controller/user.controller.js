import crypto from "crypto";
import axios from "axios";
import { envConfig } from "../Config/envConfig.js";
import { LoginVerify } from "../Model/loginVerify.model.js";
import { Resume } from "../Model/resume.model.js";
import { Profile } from "../Model/profile.model.js";
import { User } from "../Model/user.model.js";
import { Recommendation } from "../Model/recommendation.model.js";
import { ChatSession } from "../Model/chatbot.model.js";
import { ATSScanHistory } from "../Model/atsScanHistory.model.js";
import { uploadPdf, cloudinary } from "../utils/cloudinary.js";
import { sendEmail } from "../utils/sendEmail.js";
import { verifyEmail } from "../utils/templates/loginVerifyMail.js";
import { ExtractText } from "../utils/pdf-parse.js";
import { detectResumeType } from "../utils/atsScoring.js";
import { getUserApplications } from "../services/job.service.js";
import { inngest } from "../services/inngest/client.js";
import { analyzeResumeWithMlApi, mapMlToDetailedAtsResult } from "../services/resumeMl.service.js";

const mapMlCareersToRecommendationRows = (items = []) => {
  if (!Array.isArray(items)) return [];
  return items
    .filter((item) => item?.role)
    .map((item) => ({
      careerName: String(item.role),
      matchScore: Number((Math.max(0, Math.min(1, Number(item.confidence) || 0)) * 100).toFixed(2)),
      matchReasons: ["Recommended by trained career model"],
      skillGaps: [],
      growthPotential: "medium",
    }));
};

const sanitizeResumeFilename = (fileName) => {
  const fallbackName = "resume.pdf";
  if (!fileName || typeof fileName !== "string") return fallbackName;

  const cleaned = fileName
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, "_")
    .replace(/\s+/g, " ")
    .trim();

  if (!cleaned) return fallbackName;
  return cleaned.toLowerCase().endsWith(".pdf") ? cleaned : `${cleaned}.pdf`;
};

const normalizeResumePublicId = (publicId) => {
  if (!publicId || typeof publicId !== "string") return "";
  return publicId.trim().replace(/^\/+|\/+$/g, "");
};

const appendUniqueUrl = (urls, url) => {
  if (url && typeof url === "string" && !urls.includes(url)) {
    urls.push(url);
  }
};

const buildResumeCandidateUrls = (resume) => {
  const candidateUrls = [];
  appendUniqueUrl(candidateUrls, resume.resumeUrl);

  const normalizedPublicId = normalizeResumePublicId(resume.resumePublicId);
  if (!normalizedPublicId) return candidateUrls;

  const publicIdVariants = new Set([normalizedPublicId]);
  if (normalizedPublicId.toLowerCase().endsWith(".pdf")) {
    publicIdVariants.add(normalizedPublicId.replace(/\.pdf$/i, ""));
  } else {
    publicIdVariants.add(`${normalizedPublicId}.pdf`);
  }

  for (const publicId of publicIdVariants) {
    for (const resourceType of ["raw", "image"]) {
      appendUniqueUrl(
        candidateUrls,
        cloudinary.url(publicId, {
          resource_type: resourceType,
          secure: true,
          type: "upload",
        }),
      );

      appendUniqueUrl(
        candidateUrls,
        cloudinary.url(publicId, {
          resource_type: resourceType,
          sign_url: true,
          secure: true,
          type: "upload",
        }),
      );
    }
  }

  const expiresAt = Math.floor(Date.now() / 1000) + 10 * 60;
  for (const publicId of publicIdVariants) {
    const downloadPublicIdVariants = new Set([publicId, publicId.replace(/\.pdf$/i, "")]);

    for (const downloadPublicId of downloadPublicIdVariants) {
      if (!downloadPublicId) continue;

      for (const resourceType of ["raw", "image"]) {
        for (const type of ["upload", "authenticated"]) {
          try {
            appendUniqueUrl(
              candidateUrls,
              cloudinary.utils.private_download_url(downloadPublicId, "pdf", {
                expires_at: expiresAt,
                resource_type: resourceType,
                type,
              }),
            );
          } catch (error) {
            console.error("[user:buildResumeCandidateUrls] Failed to build signed URL:", error.message);
          }
        }
      }
    }
  }

  return candidateUrls;
};

export const uploadResume = async (req, res) => {
  if (!req.file)
    return res.status(403).json({ message: "Resume must be uploaded" });

  if (req.file.mimetype !== "application/pdf")
    return res.status(400).json({ message: "Only PDF files are allowed" });

  try {
    const { secure_url, public_id } = await uploadPdf(req.file.buffer);
    const uploadedFileName = sanitizeResumeFilename(req.file.originalname);
    const normalizedPublicId = normalizeResumePublicId(public_id);

    const pdfUrl = secure_url;
    const useInngest = Boolean(envConfig.inngestEventKey);

    let resumeDoc = await Resume.findOne({ userId: req.user._id });
    if (!resumeDoc) resumeDoc = new Resume({ userId: req.user._id });

    resumeDoc.resumeUrl = pdfUrl;
    resumeDoc.resumePublicId = normalizedPublicId || resumeDoc.resumePublicId;
    resumeDoc.resumeFileName = uploadedFileName;
    resumeDoc.analysisError = "";
    if (useInngest) resumeDoc.analysisStatus = "processing";
    await resumeDoc.save();

    if (useInngest) {
      try {
        await inngest.send({
          name: "resume/analyze",
          data: {
            resumeId: resumeDoc._id.toString(),
            userId: req.user._id.toString(),
            resumePublicId: normalizedPublicId,
            resumeUrl: pdfUrl,
          },
        });

        return res.status(202).json({
          message: "Resume uploaded successfully. Analysis is in progress.",
          status: "processing",
          analysisStatus: "processing",
          resumeId: resumeDoc._id,
          resumeFileName: resumeDoc.resumeFileName,
        });
      } catch (sendError) {
        console.error("Inngest send failed, falling back to sync:", sendError.message);
      }
    }

    let extractedText;
    try {
      extractedText = await ExtractText(req.file.buffer);
    } catch (err) {
      extractedText = await ExtractText(pdfUrl);
    }

    let mlAnalysis;
    try {
      mlAnalysis = await analyzeResumeWithMlApi({
        pdfBuffer: req.file.buffer,
        filename: req.file.originalname || "resume.pdf",
      });
    } catch (mlError) {
      console.error("ML API analysis failed:", mlError.message);
      return res.status(503).json({
        message: "ML model service is unavailable. Please try again.",
        error: mlError.message,
      });
    }

    const parsedResumeContent = {};
    resumeDoc.resumeContent = {
      ...parsedResumeContent,
      mlAnalysis: {
        resumeScore: mlAnalysis.resumeScore,
        rating: mlAnalysis.rating,
        careerRecommendations: mlAnalysis.careerRecommendations,
        jobFitScore: mlAnalysis.jobFitScore,
        extractedTextPreview: mlAnalysis.extractedTextPreview,
      },
    };
    resumeDoc.atsScore = mlAnalysis.resumeScore;
    resumeDoc.suggestions = mlAnalysis.improvementSuggestions || [];
    resumeDoc.analysisStatus = "completed";
    resumeDoc.analysisError = "";
    
    // Detect resume type
    const resumeTypeResult = detectResumeType(extractedText);
    resumeDoc.resume_type = resumeTypeResult.type;
    resumeDoc.resume_type_confidence = resumeTypeResult.confidence;
    resumeDoc.resume_type_indicators = resumeTypeResult.indicators;
    
    await resumeDoc.save();

    if (mlAnalysis.careerRecommendations?.length) {
      try {
        await Recommendation.findOneAndUpdate(
          { userId: req.user._id },
          {
            $set: {
              recommendations: mapMlCareersToRecommendationRows(mlAnalysis.careerRecommendations),
              generatedAt: new Date(),
              basedOn: { resumeId: resumeDoc._id },
            },
          },
          { upsert: true, new: true }
        );
      } catch (recSaveError) {
        console.error("Failed to save ML career recommendations:", recSaveError.message);
      }
    }

    return res.status(200).json({
      message: "Resume uploaded and analyzed successfully",
      resumeUrl: secure_url,
      resumeFileName: resumeDoc.resumeFileName,
      analysis: {},
      atsScore: resumeDoc.atsScore,
      rating: mlAnalysis.rating || null,
      careerRecommendations: mlAnalysis.careerRecommendations || [],
      jobFitScore: mlAnalysis.jobFitScore ?? null,
      suggestions: resumeDoc.suggestions,
      analysisStatus: resumeDoc.analysisStatus,
      resume_type: resumeTypeResult.type,
      resume_type_confidence: resumeTypeResult.confidence,
      resume_type_indicators: resumeTypeResult.indicators,
    });
  } catch (error) {
    console.error("Resume upload error:", error);
    return res.status(500).json({
      message: "Error uploading resume",
      error: error.message,
    });
  }
};

export const getProfile = async (req, res) => {
  const profile = await Profile.findOne({ userId: req.user._id });
  return res.status(200).json({
    message: "Profile fetched successfully",
    data: profile,
  });
};

export const getResume = async (req, res) => {
  const resume = await Resume.findOne({ userId: req.user._id });
  if (!resume) {
    return res.status(404).json({ message: "Resume not found" });
  }
  return res.status(200).json({
    message: "Resume fetched successfully",
    data: resume,
  });
};

export const getResumePdf = async (req, res) => {
  try {
    const resume = await Resume.findOne({ userId: req.user._id });
    if (!resume || (!resume.resumeUrl && !resume.resumePublicId)) {
      return res.status(404).json({ message: "Resume PDF not found" });
    }

    const fileName = sanitizeResumeFilename(resume.resumeFileName || "resume.pdf");
    const candidateUrls = buildResumeCandidateUrls(resume);
    const isPreviewRequest = req.headers["x-resume-preview"] === "1" || req.query?.preview === "1";

    for (const url of candidateUrls) {
      if (!url) continue;

      try {
        const response = await axios.get(url, {
          responseType: "arraybuffer",
          timeout: 30000,
          maxRedirects: 5,
          headers: {
            Accept: "application/pdf,application/octet-stream;q=0.9,*/*;q=0.8",
          },
        });

        const responseBuffer = Buffer.from(response.data);
        const responseContentType = (response.headers?.["content-type"] || "").toLowerCase();
        const hasPdfSignature = responseBuffer.slice(0, 4).toString("utf8") === "%PDF";
        const isLikelyPdf =
          hasPdfSignature ||
          !responseContentType ||
          responseContentType.includes("pdf") ||
          responseContentType.includes("octet-stream") ||
          responseContentType.includes("binary") ||
          responseContentType.includes("download");

        if (!isLikelyPdf) {
          console.warn("[getResumePdf] Unexpected content type:", responseContentType, "for", url);
          continue;
        }

        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `inline; filename="${fileName}"`);
        res.setHeader("Cache-Control", "private, max-age=300");
        res.setHeader("X-Content-Type-Options", "nosniff");
        return res.send(responseBuffer);
      } catch (fetchErr) {
        console.error("[getResumePdf] Fetch failed:", fetchErr.message);
      }
    }

    if (resume.resumeUrl && !isPreviewRequest) {
      return res.redirect(resume.resumeUrl);
    }

    return res.status(502).json({ message: "Unable to fetch resume PDF from storage" });
  } catch (err) {
    console.error("[getResumePdf] Fatal error:", err.message, err.stack);
    return res.status(500).json({ message: "Failed to fetch resume PDF" });
  }
};

export const getDashboard = async (req, res) => {
  const userId = req.user._id;
  const [profile, resume, recommendation, applications, chatSessions] =
    await Promise.all([
      Profile.findOne({ userId }),
      Resume.findOne({ userId }),
      Recommendation.findOne({ userId }).sort({ generatedAt: -1 }),
      getUserApplications(userId),
      ChatSession.find({ userId, isActive: true })
        .sort({ updatedAt: -1 })
        .limit(3),
    ]);

  const completionFields = [
    profile?.age,
    profile?.gender,
    profile?.educationLevel,
    profile?.skills?.length ? true : null,
    profile?.interest?.length ? true : null,
    resume ? true : null,
  ];
  const completionScore = completionFields.filter(Boolean).length;
  const completionPercent = Math.round((completionScore / completionFields.length) * 100);

  const topCareers =
    recommendation?.recommendations?.slice(0, 3).map((r) => ({
      careerName: r.careerName,
      matchScore: r.matchScore,
      growthPotential: r.growthPotential,
    })) || [];

  const recentApplications = applications.slice(0, 3).map((app) => ({
    jobTitle: app.jobTitle,
    company: app.company,
    appliedAt: app.appliedAt,
    status: app.status,
    matchScore: app.matchScore,
  }));

  const recentChats = chatSessions.map((session) => ({
    id: session._id,
    title: session.title,
    updatedAt: session.updatedAt,
    messageCount: session.messages?.length || 0,
    lastMessage: session.messages?.[session.messages.length - 1]?.content?.slice(0, 120),
  }));

  const resumeStatus = resume?.analysisStatus || "completed";
  const resumeScore = resumeStatus === "completed" ? resume?.atsScore : null;

  return res.status(200).json({
    message: "Dashboard data fetched",
    data: {
      profile: {
        name: req.user.name,
        email: req.user.email,
        avatarUrl: req.user.avatarUrl,
        isVerified: req.user.isVerified,
        completionPercent,
      },
      resume: resume
        ? {
            atsScore: resumeScore,
            updatedAt: resume.updatedAt,
            hasResume: true,
            analysisStatus: resumeStatus,
          }
        : { atsScore: null, updatedAt: null, hasResume: false, analysisStatus: "missing" },
      recommendations: {
        count: recommendation?.recommendations?.length || 0,
        generatedAt: recommendation?.generatedAt || null,
        topCareers,
      },
      applications: {
        count: applications.length,
        recent: recentApplications,
      },
      chat: {
        sessions: recentChats,
      },
    },
  });
};

export const sendVerificationUser = async (req, res) => {
  const user = await User.findById(req.user?._id);
  if (!user) return res.status(403).json({ message: "User is not found" });
  let token = crypto.randomBytes(8).toString("hex");
  await LoginVerify.create({
    email: user.email,
    token: token,
  });
  setTimeout(
    async () => {
      await LoginVerify.findOneAndDelete({ email: user.email, token: token });
    },
    5 * 60 * 1000,
  ); // 5 minutes
  let verifyLink = `${envConfig.backendUrl}/auth/verify-token?email=${user.email}&token=${token}`;
  const htmlContent = verifyEmail(user.email, verifyLink);
  const result = await sendEmail({
    to: user.email,
    subject: "Verify User",
    html: htmlContent,
  });

  if (!result.success) {
    return res.status(500).json({ message: "Failed to send verification email" });
  }

  return res
    .status(200)
    .json({ message: "Verification email sent successfully" });
};

export const verifyUser = async (req, res) => {
  const { email, token } = req.query;
  if (!email || !token)
    return res
      .status(400)
      .json({ message: "email and token must be provided in query" });
  const verifyUserToken = await LoginVerify.findOne({
    email: email,
    token: token,
  });
  if (!verifyUserToken) {
    return res.status(404).json({ message: "Email and token is not matched" });
  }
  await User.findOneAndUpdate({ email: email }, { $set: { isVerified: true } });
  await LoginVerify.findOneAndDelete({ email: email, token: token });
  return res.status(200).json({ message: "User verified successfully" });
};

/**
 * ============================================
 * WEIGHTED ATS SCORING ENDPOINT
 * ============================================
 * Calculates comprehensive ATS score based on:
 * - Keyword Matching (50%)
 * - Section Completeness (20%)
 * - Experience & Projects (20%)
 * - Formatting & Quality (10%)
 * 
 * Can be used with or without job description
 */
export const calculateWeightedATSScore = async (req, res) => {
  try {
    const userId = req.user._id;
    const { jobDescription, requiredSkills = [] } = req.body;

    // Get user's resume
    const resume = await Resume.findOne({ userId });
    
    if (!resume || !resume.resumeUrl) {
      return res.status(404).json({
        message: "No resume found. Please upload your resume first.",
        success: false
      });
    }

    try {
      const pdfResponse = await axios.get(resume.resumeUrl, {
        responseType: "arraybuffer",
        timeout: 30000,
      });

      const mlResult = await analyzeResumeWithMlApi({
        pdfBuffer: Buffer.from(pdfResponse.data),
        filename: "resume.pdf",
        jobDescription: typeof jobDescription === "string" ? jobDescription : undefined,
      });

      const scoreResult = mapMlToDetailedAtsResult(mlResult, {
        requiredSkillsCount: Array.isArray(requiredSkills) ? requiredSkills.length : 0,
      });

      // Save the ML-derived score
      resume.weightedAtsScore = scoreResult.final_score;
      resume.lastScoredAt = new Date();
      await resume.save();

      await saveScanToHistory(userId, {
        resumeUrl: resume.resumeUrl,
        resumePublicId: resume.resumePublicId,
        resumeName: "Resume.pdf",
        scanType: "detailed",
        jobDescription: jobDescription || "",
        detailedResults: scoreResult,
        resumeSnapshot: resume.resumeContent
      });

      return res.status(200).json({
        message: "ATS score calculated successfully",
        success: true,
        data: scoreResult,
        metadata: {
          resumeId: resume._id,
          analyzedWith: jobDescription ? 'job description' : 'general assessment (ML model)',
          totalSkillsAnalyzed: Array.isArray(requiredSkills) ? requiredSkills.length : 0,
        }
      });
    } catch (mlError) {
      console.error("ML API detailed score failed:", mlError.message);
      return res.status(503).json({
        message: "ML model service is unavailable. Please try again.",
        error: mlError.message,
        success: false,
      });
    }

  } catch (error) {
    console.error("Weighted ATS scoring error:", error);
    return res.status(500).json({
      message: "Error calculating ATS score",
      error: error.message,
      success: false
    });
  }
};

/**
 * Score resume against specific job posting
 * Simplified endpoint that requires job description
 */
export const scoreResumeForJob = async (req, res) => {
  try {
    const { jobDescription } = req.body;

    if (!jobDescription || typeof jobDescription !== 'string' || jobDescription.trim().length < 20) {
      return res.status(400).json({
        message: "Please provide a valid job description (minimum 20 characters)",
        success: false
      });
    }

    // Reuse the main scoring function
    return await calculateWeightedATSScore(req, res);

  } catch (error) {
    console.error("Job-specific scoring error:", error);
    return res.status(500).json({
      message: "Error scoring resume for job",
      error: error.message,
      success: false
    });
  }
};

/**
 * ============================================
 * ATS SCAN HISTORY MANAGEMENT
 * ============================================
 * Save, retrieve, and manage ATS scan history
 */

/**
 * Save ATS scan to history
 * Called internally after each scan
 */
export const saveScanToHistory = async (userId, scanData) => {
  try {
    const scanHistory = new ATSScanHistory({
      userId,
      resumeUrl: scanData.resumeUrl,
      resumePublicId: scanData.resumePublicId || "",
      resumeName: scanData.resumeName || "Resume.pdf",
      scanType: scanData.scanType || "quick",
      jobDescription: scanData.jobDescription || "",
      quickScanResults: scanData.quickScanResults || {},
      detailedResults: scanData.detailedResults || {},
      resumeSnapshot: scanData.resumeSnapshot || {},
      scannedAt: new Date()
    });

    await scanHistory.save();
    return scanHistory;
  } catch (error) {
    console.error("Error saving scan to history:", error);
    return null;
  }
};

/**
 * HTTP endpoint to save scan to history
 * POST /user/scan-history
 */
export const saveScanToHistoryHTTP = async (req, res) => {
  try {
    const userId = req.user._id;
    const scanData = req.body;

    const savedScan = await saveScanToHistory(userId, scanData);
    
    if (!savedScan) {
      return res.status(500).json({
        message: "Failed to save scan to history",
        success: false
      });
    }

    return res.status(201).json({
      message: "Scan saved to history successfully",
      success: true,
      data: { scanId: savedScan._id }
    });
  } catch (error) {
    console.error("Error saving scan via HTTP:", error);
    return res.status(500).json({
      message: error.message || "Failed to save scan",
      success: false
    });
  }
};

/**
 * Get all scan history for a user
 * Returns list of all scans, sorted by most recent
 */
export const getScanHistory = async (req, res) => {
  try {
    const userId = req.user._id;
    const { limit = 50, page = 1 } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [scans, totalCount] = await Promise.all([
      ATSScanHistory.find({ userId })
        .sort({ scannedAt: -1 })
        .limit(parseInt(limit))
        .skip(skip)
        .select('-resumeSnapshot -__v')
        .lean(),
      ATSScanHistory.countDocuments({ userId })
    ]);

    // Format scans for response - include full results for detail view
    const formattedScans = scans.map(scan => ({
      _id: scan._id,
      id: scan._id,
      resumeName: scan.resumeName,
      resumeUrl: scan.resumeUrl,
      scanType: scan.scanType,
      scannedAt: scan.scannedAt,
      jobDescription: scan.jobDescription || '',
      // Include full results for detail view
      quickScanResults: scan.quickScanResults || {},
      detailedResults: scan.detailedResults || {},
      // Summary fields for list view
      score: scan.scanType === 'detailed' 
        ? scan.detailedResults?.overallScore || scan.detailedResults?.final_score || 0
        : scan.quickScanResults?.compatibility || 0,
      strengthLevel: scan.detailedResults?.strength_level || 'N/A',
      hasJobDescription: !!scan.jobDescription,
      matchedSkillsCount: scan.scanType === 'detailed'
        ? scan.detailedResults?.matched_skills?.length || 0
        : scan.quickScanResults?.matchedCount || scan.quickScanResults?.matched?.length || 0
    }));

    return res.status(200).json({
      message: "Scan history retrieved successfully",
      success: true,
      data: {
        scans: formattedScans,
        pagination: {
          total: totalCount,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(totalCount / parseInt(limit))
        }
      }
    });

  } catch (error) {
    console.error("Get scan history error:", error);
    return res.status(500).json({
      message: "Error retrieving scan history",
      error: error.message,
      success: false
    });
  }
};

/**
 * Get a specific scan by ID
 * Returns full scan details
 */
export const getScanById = async (req, res) => {
  try {
    const userId = req.user._id;
    const { scanId } = req.params;

    const scan = await ATSScanHistory.findOne({
      _id: scanId,
      userId: userId
    }).lean();

    if (!scan) {
      return res.status(404).json({
        message: "Scan not found",
        success: false
      });
    }

    return res.status(200).json({
      message: "Scan retrieved successfully",
      success: true,
      data: scan
    });

  } catch (error) {
    console.error("Get scan by ID error:", error);
    return res.status(500).json({
      message: "Error retrieving scan",
      error: error.message,
      success: false
    });
  }
};

/**
 * Delete a scan from history
 */
export const deleteScan = async (req, res) => {
  try {
    const userId = req.user._id;
    const { scanId } = req.params;

    const result = await ATSScanHistory.findOneAndDelete({
      _id: scanId,
      userId: userId
    });

    if (!result) {
      return res.status(404).json({
        message: "Scan not found",
        success: false
      });
    }

    return res.status(200).json({
      message: "Scan deleted successfully",
      success: true
    });

  } catch (error) {
    console.error("Delete scan error:", error);
    return res.status(500).json({
      message: "Error deleting scan",
      error: error.message,
      success: false
    });
  }
};

/**
 * Delete all scan history for user
 */
export const clearScanHistory = async (req, res) => {
  try {
    const userId = req.user._id;

    const result = await ATSScanHistory.deleteMany({ userId });

    return res.status(200).json({
      message: `Successfully deleted ${result.deletedCount} scan(s)`,
      success: true,
      deletedCount: result.deletedCount
    });

  } catch (error) {
    console.error("Clear scan history error:", error);
    return res.status(500).json({
      message: "Error clearing scan history",
      error: error.message,
      success: false
    });
  }
};


