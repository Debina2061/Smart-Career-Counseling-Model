"""
services/pdf_parser.py - Utilities for validating and parsing uploaded PDF resumes.
"""

from io import BytesIO

import pdfplumber
from fastapi import HTTPException, UploadFile


def validate_pdf_upload(file: UploadFile) -> None:
    """
    Validate uploaded file is a PDF.

    We check both MIME type and file extension because some clients send
    generic MIME types even for valid PDFs.
    """
    filename = (file.filename or "").lower()
    content_type = (file.content_type or "").lower()

    is_pdf_extension = filename.endswith(".pdf")
    is_pdf_mime = content_type in {
        "application/pdf",
        "application/x-pdf",
        "application/acrobat",
        "binary/octet-stream",
    }

    if not is_pdf_extension and not is_pdf_mime:
        raise HTTPException(status_code=400, detail="Only PDF files are supported")


def extract_text_from_pdf_bytes(pdf_bytes: bytes) -> str:
    """
    Extract text from PDF bytes using pdfplumber.

    Raises:
        ValueError: if PDF is corrupted, unreadable, or empty
    """
    if not pdf_bytes:
        raise ValueError("Uploaded PDF is empty")

    try:
        with pdfplumber.open(BytesIO(pdf_bytes)) as pdf:
            pages_text: list[str] = []
            for page in pdf.pages:
                page_text = page.extract_text() or ""
                pages_text.append(page_text)

        combined = "\n".join(pages_text).strip()

        if not combined:
            raise ValueError(
                "Could not extract text from PDF. The file may be image-only or scanned."
            )

        return combined
    except ValueError:
        raise
    except Exception as exc:
        raise ValueError(f"Failed to parse PDF: {str(exc)}") from exc
