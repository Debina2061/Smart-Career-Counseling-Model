"""
schemas.py - Pydantic models for request/response validation

This file defines the structure of API responses using Pydantic.
Pydantic automatically validates data and generates clear error messages.
"""

from typing import List, Optional
from pydantic import BaseModel, Field


# ===============================
# Career Recommendation Schema
# ===============================
class CareerRecommendation(BaseModel):
    """
    Represents a single career recommendation with confidence score.

    Attributes:
        role: The recommended career/job role
        confidence: Probability score (0.0 to 1.0) indicating model confidence
    """

    role: str = Field(..., description="Recommended career role")
    confidence: float = Field(..., ge=0.0, le=1.0, description="Confidence score (0-1)")


# ===============================
# Resume Analysis Response Schema
# ===============================
class ResumeAnalysisResponse(BaseModel):
    """
    Complete response from the /analyze-resume endpoint.

    This is the main response model that contains all analysis results:
    - Resume quality score and rating
    - Career recommendations
    - Optional job fit score
    - Improvement suggestions
    """

    success: bool = Field(
        default=True, description="Whether the analysis completed successfully"
    )
    resume_score: float = Field(
        ..., ge=0.0, le=100.0, description="ATS-style resume quality score (0-100)"
    )
    rating: str = Field(
        ..., description="Quality rating: poor, fair, good, or excellent"
    )
    career_recommendations: List[CareerRecommendation] = Field(
        ..., description="Top career recommendations based on resume content"
    )
    job_fit_score: Optional[float] = Field(
        default=None,
        ge=0.0,
        le=100.0,
        description="Job fit score if job description was provided",
    )
    improvement_suggestions: List[str] = Field(
        ..., description="Actionable suggestions to improve the resume"
    )
    extracted_text_preview: str = Field(
        ..., description="First 500 characters of extracted resume text"
    )


# ===============================
# Health Check Response Schema
# ===============================
class HealthCheckResponse(BaseModel):
    """
    Response from the /health endpoint.

    Indicates server status and which ML models are loaded.
    """

    status: str = Field(default="ok", description="Server status")
    quality_model_loaded: bool = Field(
        ..., description="Whether the quality scoring model is loaded"
    )
    career_model_loaded: bool = Field(
        ..., description="Whether the career recommendation model is loaded"
    )
    job_fit_model_loaded: bool = Field(
        ..., description="Whether the optional job fit model is loaded"
    )


# ===============================
# Error Response Schema
# ===============================
class ErrorResponse(BaseModel):
    """
    Standard error response format.

    Returned when an error occurs during processing.
    """

    success: bool = Field(default=False, description="Always False for errors")
    error: str = Field(..., description="Human-readable error message")
    detail: Optional[str] = Field(
        default=None, description="Additional error details for debugging"
    )
