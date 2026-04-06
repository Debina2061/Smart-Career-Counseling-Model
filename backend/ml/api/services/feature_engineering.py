"""
services/feature_engineering.py - Resume feature extraction and suggestions.

IMPORTANT:
This module provides a practical approximation of training-time features.
Align this logic with your notebook if your exact feature pipeline differs.
"""

from __future__ import annotations

import re
from typing import Dict, List


SECTION_PATTERNS = {
    "skills": r"\bskills?\b|\btechnical skills\b|\bcore competencies\b",
    "education": r"\beducation\b|\bacademic\b|\bqualification\b",
    "experience": r"\bexperience\b|\bwork history\b|\bemployment\b|\binternship\b",
    "projects": r"\bprojects?\b|\bportfolio\b",
    "certifications": r"\bcertifications?\b|\blicense\b|\bcertificate\b",
}

ACTION_VERBS = {
    "achieved",
    "built",
    "created",
    "designed",
    "developed",
    "implemented",
    "improved",
    "increased",
    "led",
    "managed",
    "optimized",
    "reduced",
    "resolved",
}

RESUME_KEYWORDS = {
    "python",
    "java",
    "sql",
    "aws",
    "docker",
    "api",
    "machine learning",
    "data analysis",
    "leadership",
    "communication",
    "project",
    "internship",
}

FEATURE_ORDER = [
    "word_count",
    "character_count",
    "line_count",
    "bullet_count",
    "section_count",
    "has_skills_section",
    "has_education_section",
    "has_experience_section",
    "has_projects_section",
    "has_certifications_section",
    "achievement_number_count",
    "action_verb_count",
    "keyword_density",
    "avg_line_length",
    "email_count",
    "phone_count",
]


EMAIL_PATTERN = re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}")
PHONE_PATTERN = re.compile(
    r"(?:\+?\d{1,3}[\s.-]?)?(?:\(?\d{2,4}\)?[\s.-]?)?\d{3,4}[\s.-]?\d{3,4}"
)
BULLET_PATTERN = re.compile(r"(^|\n)\s*(?:[-*\u2022]|\d+\.)\s+")
NUMBER_PATTERN = re.compile(r"\b\d+(?:\.\d+)?%?\b")
YEAR_PATTERN = re.compile(r"\b(?:19|20)\d{2}\b")


def _has_section(text_lower: str, pattern: str) -> int:
    return int(re.search(pattern, text_lower) is not None)


def compute_resume_features(resume_text: str) -> Dict[str, float]:
    """
    Compute readable numeric indicators from resume text.

    These are useful for:
    - scoring quality strictness adjustments
    - optional numeric feature stacking with text vectors
    - rule-based suggestions
    """
    text = resume_text or ""
    text_lower = text.lower()
    words = re.findall(r"\b\w+\b", text_lower)
    lines = [line.strip() for line in text.splitlines() if line.strip()]

    word_count = len(words)
    character_count = len(text)
    line_count = len(lines)
    bullet_count = len(BULLET_PATTERN.findall(text))

    has_skills = _has_section(text_lower, SECTION_PATTERNS["skills"])
    has_education = _has_section(text_lower, SECTION_PATTERNS["education"])
    has_experience = _has_section(text_lower, SECTION_PATTERNS["experience"])
    has_projects = _has_section(text_lower, SECTION_PATTERNS["projects"])
    has_certifications = _has_section(text_lower, SECTION_PATTERNS["certifications"])

    section_count = (
        has_skills + has_education + has_experience + has_projects + has_certifications
    )

    achievement_number_count = len(NUMBER_PATTERN.findall(text))
    year_mentions = len(YEAR_PATTERN.findall(text))
    action_verb_count = sum(1 for token in words if token in ACTION_VERBS)

    # A simple keyword density estimate: matched keyword mentions over total words.
    keyword_hits = 0
    for keyword in RESUME_KEYWORDS:
        keyword_hits += text_lower.count(keyword)
    keyword_density = float(keyword_hits / max(word_count, 1))

    avg_line_length = float(sum(len(line) for line in lines) / max(line_count, 1))
    email_count = len(EMAIL_PATTERN.findall(text))
    phone_count = len(PHONE_PATTERN.findall(text))

    # Match the original notebook-style engineered numeric feature.
    bullet_lines = [
        line for line in lines if re.match(r"^(?:[-*\u2022]|\d+[.)])\s+", line)
    ]
    quantified_bullets = [line for line in bullet_lines if re.search(r"\d|%", line)]
    quantified_bullet_ratio = float(len(quantified_bullets) / max(len(bullet_lines), 1))

    return {
        "word_count": float(word_count),
        "character_count": float(character_count),
        "line_count": float(line_count),
        "bullet_count": float(bullet_count),
        "section_count": float(section_count),
        "section_coverage": float(section_count),
        "has_skills_section": float(has_skills),
        "has_education_section": float(has_education),
        "has_experience_section": float(has_experience),
        "has_projects_section": float(has_projects),
        "has_certifications_section": float(has_certifications),
        "achievement_number_count": float(achievement_number_count),
        "year_mentions": float(year_mentions),
        "quantified_bullet_ratio": float(quantified_bullet_ratio),
        "action_verb_count": float(action_verb_count),
        "keyword_density": float(keyword_density),
        "avg_line_length": float(avg_line_length),
        "email_count": float(email_count),
        "phone_count": float(phone_count),
    }


def feature_vector_from_dict(features: Dict[str, float]) -> List[float]:
    """Convert feature dict to ordered numeric list for model input."""
    return [float(features.get(name, 0.0)) for name in FEATURE_ORDER]


def generate_improvement_suggestions(features: Dict[str, float]) -> List[str]:
    """Generate practical, demo-friendly rule-based suggestions."""
    suggestions: list[str] = []

    if features.get("has_projects_section", 0.0) < 1.0:
        suggestions.append("Add a projects section that shows practical hands-on work.")

    if features.get("achievement_number_count", 0.0) < 3.0:
        suggestions.append(
            "Add more measurable achievements (percentages, counts, outcomes)."
        )

    if features.get("has_skills_section", 0.0) < 1.0:
        suggestions.append(
            "Include a clear skills section with role-relevant technical skills."
        )

    if features.get("word_count", 0.0) < 180.0:
        suggestions.append(
            "Your resume looks short; expand experience bullets with impact details."
        )

    if features.get("has_experience_section", 0.0) < 1.0:
        suggestions.append(
            "Add experience such as internships, volunteer work, or practical projects."
        )

    if features.get("has_certifications_section", 0.0) < 1.0:
        suggestions.append(
            "If relevant to your target role, include certifications to strengthen credibility."
        )

    if features.get("email_count", 0.0) < 1.0 or features.get("phone_count", 0.0) < 1.0:
        suggestions.append(
            "Ensure contact details include at least one email and one phone number."
        )

    if features.get("action_verb_count", 0.0) < 5.0:
        suggestions.append(
            "Use stronger action verbs (built, improved, implemented, optimized) in bullet points."
        )

    if not suggestions:
        suggestions.append(
            "Resume structure is strong; tailor keywords more closely to your target job."
        )

    return suggestions
