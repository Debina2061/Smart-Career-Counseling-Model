"""
main.py - FastAPI entrypoint for resume analysis.

This app exposes:
- GET /health
- POST /analyze-resume

It loads trained joblib bundles once at startup and reuses them for inference.
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.responses import JSONResponse

from schemas import HealthCheckResponse, ResumeAnalysisResponse
from services.model_loader import (
    are_models_loaded,
    get_career_bundle,
    get_job_fit_bundle,
    get_model_status,
    get_quality_bundle,
    load_all_models,
)
from services.pdf_parser import extract_text_from_pdf_bytes, validate_pdf_upload
from services.predictor import run_full_resume_analysis
from utils.text_cleaning import clean_text, extract_preview


@asynccontextmanager
async def lifespan(_: FastAPI):
    """
    Load ML models once when server starts.

    If required bundles are missing, fail startup early so deployment issues are clear.
    """
    try:
        loaded = load_all_models()
    except FileNotFoundError as exc:
        raise RuntimeError(str(exc)) from exc

    if not loaded:
        raise RuntimeError(
            "Required model bundles could not be loaded. "
            "Check quality_bundle.joblib and career_bundle.joblib in artifacts folder."
        )

    yield


app = FastAPI(
    title="Smart Career Counseling API",
    description="Analyze resume PDFs using trained scikit-learn joblib bundles.",
    version="1.0.0",
    lifespan=lifespan,
)


@app.get("/health", response_model=HealthCheckResponse)
async def health() -> HealthCheckResponse:
    """Return API and model-loading status."""
    status = get_model_status()
    return HealthCheckResponse(status="ok", **status)


@app.post("/analyze-resume", response_model=ResumeAnalysisResponse)
async def analyze_resume(
    resume: UploadFile = File(..., description="Resume PDF file"),
    job_description: str | None = Form(default=None),
) -> ResumeAnalysisResponse:
    """
    Analyze an uploaded resume and return scores + recommendations.

    Request:
    - resume: PDF upload
    - job_description: optional plain text for job-fit scoring
    """
    if not are_models_loaded():
        raise HTTPException(status_code=503, detail="Models are not loaded yet")

    validate_pdf_upload(resume)

    try:
        pdf_bytes = await resume.read()
        raw_text = extract_text_from_pdf_bytes(pdf_bytes)
        cleaned_resume_text = clean_text(raw_text)

        if not cleaned_resume_text.strip():
            raise HTTPException(
                status_code=422,
                detail="PDF processed but extracted text is empty. Use a text-based PDF.",
            )

        quality_bundle = get_quality_bundle()
        career_bundle = get_career_bundle()
        job_fit_bundle = get_job_fit_bundle()

        if quality_bundle is None or career_bundle is None:
            raise HTTPException(
                status_code=503,
                detail="Required model bundles are unavailable. Check server startup logs.",
            )

        analysis = run_full_resume_analysis(
            cleaned_resume_text=cleaned_resume_text,
            quality_bundle=quality_bundle,
            career_bundle=career_bundle,
            job_fit_bundle=job_fit_bundle,
            job_description=job_description,
        )

        return ResumeAnalysisResponse(
            success=True,
            resume_score=analysis["resume_score"],
            rating=analysis["rating"],
            career_recommendations=analysis["career_recommendations"],
            job_fit_score=analysis["job_fit_score"],
            improvement_suggestions=analysis["improvement_suggestions"],
            extracted_text_preview=extract_preview(cleaned_resume_text, length=500),
        )

    except HTTPException:
        raise
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Resume analysis failed: {str(exc)}",
        ) from exc


@app.exception_handler(HTTPException)
async def http_error_handler(_, exc: HTTPException):
    """Return readable JSON for expected API errors."""
    return JSONResponse(
        status_code=exc.status_code,
        content={"success": False, "error": exc.detail},
    )


@app.exception_handler(Exception)
async def unhandled_error_handler(_, exc: Exception):
    """Catch-all safeguard for unexpected failures."""
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "error": "Internal server error",
            "detail": str(exc),
        },
    )
