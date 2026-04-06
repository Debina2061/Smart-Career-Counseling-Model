"""
utils/text_cleaning.py - Text cleaning and normalization utilities

This module provides functions to clean and normalize resume text
before it's processed by the ML models.
"""

import re
from typing import Optional


def clean_text(text: Optional[str]) -> str:
    """
    Clean and normalize resume text for ML processing.

    This function performs several cleaning operations:
    1. Handles None/empty input safely
    2. Normalizes whitespace (multiple spaces -> single space)
    3. Removes weird repeated symbols
    4. Keeps useful resume words intact
    5. Removes excessive newlines while preserving structure

    Args:
        text: Raw text extracted from a resume (can be None)

    Returns:
        Cleaned text string, ready for feature extraction

    Example:
        >>> raw = "John   Doe\\n\\n\\nSoftware   Engineer"
        >>> clean_text(raw)
        'John Doe Software Engineer'
    """
    # Handle None or empty input
    if text is None:
        return ""

    # Convert to string if not already
    text = str(text).strip()

    if not text:
        return ""

    # -----------------------------------------------
    # Step 1: Remove non-printable characters
    # -----------------------------------------------
    # Keep only printable ASCII and common unicode
    text = re.sub(r"[^\x20-\x7E\xA0-\xFF\n\t]", " ", text)

    # -----------------------------------------------
    # Step 2: Normalize line breaks
    # -----------------------------------------------
    # Convert multiple newlines to single newline
    text = re.sub(r"\n\s*\n+", "\n", text)

    # -----------------------------------------------
    # Step 3: Remove repeated symbols/characters
    # -----------------------------------------------
    # Patterns like "----", "====", "****", etc.
    text = re.sub(r"[-=*_]{3,}", " ", text)

    # Repeated dots (but keep ellipsis patterns reasonable)
    text = re.sub(r"\.{4,}", "...", text)

    # -----------------------------------------------
    # Step 4: Normalize whitespace
    # -----------------------------------------------
    # Multiple spaces -> single space
    text = re.sub(r"[ \t]+", " ", text)

    # -----------------------------------------------
    # Step 5: Clean up line edges
    # -----------------------------------------------
    # Remove leading/trailing whitespace from each line
    lines = text.split("\n")
    lines = [line.strip() for line in lines]

    # Remove empty lines
    lines = [line for line in lines if line]

    # Join back with single spaces (flattening for ML)
    text = " ".join(lines)

    # -----------------------------------------------
    # Step 6: Final cleanup
    # -----------------------------------------------
    # Remove any remaining multiple spaces
    text = re.sub(r"\s+", " ", text)

    return text.strip()


def safe_text(value: Optional[str]) -> str:
    """
    Safely convert any value to a stripped string.

    This is a simpler version of clean_text for basic safety.
    Used when you just need to ensure a string is not None.

    Args:
        value: Any value that might be text

    Returns:
        String representation, stripped of whitespace
    """
    if value is None:
        return ""
    return str(value).strip()


def truncate_text(text: str, max_length: int = 500) -> str:
    """
    Truncate text to a maximum length with ellipsis.

    Args:
        text: Text to truncate
        max_length: Maximum number of characters

    Returns:
        Truncated text with "..." if it was cut
    """
    if len(text) <= max_length:
        return text
    return text[:max_length] + "..."


def extract_preview(text: str, length: int = 500) -> str:
    """
    Extract a preview of the resume text for API response.

    This creates a clean, readable preview suitable for
    showing to users in the API response.

    Args:
        text: Full resume text
        length: Preview length (default 500)

    Returns:
        Clean preview string
    """
    # Clean the text first
    cleaned = clean_text(text)

    # Truncate to preview length
    return truncate_text(cleaned, length)
