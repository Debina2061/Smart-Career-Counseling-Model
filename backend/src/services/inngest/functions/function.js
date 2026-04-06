import { inngest } from "../client.js";
import { ExtractText } from "../../../utils/pdf-parse.js";
import { Resume } from "../../../Model/resume.model.js";
import { cloudinary } from "../../../utils/cloudinary.js";
import { Recommendation } from "../../../Model/recommendation.model.js";
import { analyzeResumeWithMlApi } from "../../resumeMl.service.js";

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

export const AiResponse = inngest.createFunction(
  { id: "resume-analysis" },
  { event: "resume/analyze" },
  async ({ event, step }) => {
    const { resumeId, userId, resumePublicId, resumeUrl } = event.data || {};

    try {
      const signedUrl = resumePublicId
        ? cloudinary.url(resumePublicId, {
            resource_type: "raw",
            type: "upload",
            sign_url: true,
            secure: true,
          })
        : resumeUrl;

      if (!signedUrl) {
        throw new Error("Missing resume URL or public id");
      }

      await step.run("extract-pdf-text", async () => {
        const text = await ExtractText(signedUrl);
        return text;
      });

      const pdfBytes = await step.run("download-pdf-bytes", async () => {
        const response = await fetch(signedUrl);
        if (!response.ok) {
          throw new Error(`Failed to download PDF for ML scoring: ${response.status}`);
        }
        const arrayBuffer = await response.arrayBuffer();
        return Buffer.from(arrayBuffer);
      });

      const mlAnalysis = await step.run("ml-resume-analysis", async () => {
        return analyzeResumeWithMlApi({
          pdfBuffer: pdfBytes,
          filename: "resume.pdf",
        });
      });

      await step.run("save-in-database", async () => {
        let resume = null;
        if (resumeId) resume = await Resume.findById(resumeId);
        if (!resume && userId) resume = await Resume.findOne({ userId });

        if (!resume) {
          const createdResume = await Resume.create({
            userId,
            resumeUrl: resumeUrl || "",
            resumePublicId: resumePublicId || "",
            resumeContent: {
              mlAnalysis: {
                resumeScore: mlAnalysis.resumeScore,
                rating: mlAnalysis.rating,
                careerRecommendations: mlAnalysis.careerRecommendations,
                jobFitScore: mlAnalysis.jobFitScore,
                extractedTextPreview: mlAnalysis.extractedTextPreview,
              },
            },
            atsScore: mlAnalysis.resumeScore,
            suggestions: mlAnalysis.improvementSuggestions || [],
            analysisStatus: "completed",
            analysisError: "",
          });

          if (mlAnalysis?.careerRecommendations?.length && userId) {
            await Recommendation.findOneAndUpdate(
              { userId },
              {
                $set: {
                  recommendations: mapMlCareersToRecommendationRows(
                    mlAnalysis.careerRecommendations
                  ),
                  generatedAt: new Date(),
                  basedOn: { resumeId: createdResume._id },
                },
              },
              { upsert: true, new: true }
            );
          }

          return;
        }

        resume.resumeUrl = resumeUrl || resume.resumeUrl;
        resume.resumePublicId = resumePublicId || resume.resumePublicId;
        resume.resumeContent = {
          mlAnalysis: {
            resumeScore: mlAnalysis.resumeScore,
            rating: mlAnalysis.rating,
            careerRecommendations: mlAnalysis.careerRecommendations,
            jobFitScore: mlAnalysis.jobFitScore,
            extractedTextPreview: mlAnalysis.extractedTextPreview,
          },
        };
        resume.atsScore = mlAnalysis.resumeScore;
        resume.suggestions = mlAnalysis.improvementSuggestions || [];
        resume.analysisStatus = "completed";
        resume.analysisError = "";
        await resume.save();

        if (mlAnalysis?.careerRecommendations?.length && userId) {
          await Recommendation.findOneAndUpdate(
            { userId },
            {
              $set: {
                recommendations: mapMlCareersToRecommendationRows(mlAnalysis.careerRecommendations),
                generatedAt: new Date(),
                basedOn: { resumeId: resume._id },
              },
            },
            { upsert: true, new: true }
          );
        }
      });

      await step.run("log-completion", async () => {
        console.log("Resume analysis completed successfully");
        return { status: "completed" };
      });

      return {
        message: "Resume analysis completed successfully",
        eventId: event.id,
        resumeId,
        userId,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      await step.run("mark-failed", async () => {
        let resume = null;
        if (resumeId) resume = await Resume.findById(resumeId);
        if (!resume && userId) resume = await Resume.findOne({ userId });
        if (resume) {
          resume.analysisStatus = "failed";
          resume.analysisError = error?.message || "Resume analysis failed";
          await resume.save();
        }
      });

      throw error;
    }
  }
);
