"""
services/predictor.py - Inference logic for quality, career, and optional job-fit.
"""

from __future__ import annotations

from typing import Any, Dict, List, Tuple

import numpy as np
from scipy import sparse

from services.feature_engineering import (
    compute_resume_features,
    generate_improvement_suggestions,
)


def _safe_float(value: Any, default: float = 0.0) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def _clamp(value: float, low: float = 0.0, high: float = 100.0) -> float:
    return max(low, min(high, value))


def _extract_anchor_score(score_anchors: Any, label: Any) -> float | None:
    """Resolve score anchor from dict/list with flexible key formats."""
    if not isinstance(score_anchors, dict):
        return None

    key_options = [label, str(label)]
    try:
        key_options.append(int(label))
        key_options.append(str(int(label)))
    except (TypeError, ValueError):
        pass

    for key in key_options:
        if key in score_anchors:
            anchor_value = score_anchors[key]
            if isinstance(anchor_value, (int, float)):
                return float(anchor_value)
            if isinstance(anchor_value, dict):
                for preferred in ("score", "mid", "mean", "center", "value"):
                    if preferred in anchor_value:
                        return _safe_float(anchor_value[preferred], default=0.0)
                # Fallback: average numeric values in the dict.
                numeric_values = [
                    _safe_float(v, default=np.nan)
                    for v in anchor_value.values()
                    if isinstance(v, (int, float))
                ]
                numeric_values = [v for v in numeric_values if not np.isnan(v)]
                if numeric_values:
                    return float(np.mean(numeric_values))

    return None


def _map_to_model_score(
    predicted_label: Any,
    score_anchors: Any,
    raw_regression_output: float | None = None,
) -> float:
    """
    Convert model output into ATS-like score.

    Preference order:
    1) score_anchors from training bundle
    2) direct regression output if it looks like 0-100
    3) fallback class-based anchors
    """
    score = _extract_anchor_score(score_anchors, predicted_label)

    if (
        score is None
        and raw_regression_output is not None
        and -5.0 <= raw_regression_output <= 105.0
    ):
        score = float(raw_regression_output)

    if score is None:
        label_text = str(predicted_label).lower()
        fallback_map = {
            "poor": 42.0,
            "fair": 56.0,
            "good": 69.0,
            "excellent": 83.0,
            "0": 42.0,
            "1": 56.0,
            "2": 69.0,
            "3": 83.0,
        }
        score = fallback_map.get(label_text, 60.0)

    return _clamp(score)


def _fallback_anchor_for_label(label: Any) -> float:
    label_text = str(label).lower()
    fallback_map = {
        "poor": 42.0,
        "fair": 56.0,
        "good": 69.0,
        "excellent": 83.0,
        "0": 42.0,
        "1": 56.0,
        "2": 69.0,
        "3": 83.0,
    }
    return fallback_map.get(label_text, 60.0)


def _score_from_probabilities(
    probabilities: np.ndarray | None,
    classes: Any,
    score_anchors: Any,
) -> float | None:
    if probabilities is None:
        return None

    try:
        class_values = list(classes)
    except Exception:
        class_values = list(range(len(probabilities)))

    if len(class_values) != len(probabilities):
        return None

    weighted_score = 0.0
    for idx, class_value in enumerate(class_values):
        anchor = _extract_anchor_score(score_anchors, class_value)
        if anchor is None:
            anchor = _fallback_anchor_for_label(class_value)
        weighted_score += float(probabilities[idx]) * float(anchor)

    return _clamp(weighted_score)


def _structure_penalty(features: Dict[str, float]) -> float:
    section_coverage = _safe_float(features.get("section_coverage", 0.0))
    email_count = _safe_float(features.get("email_count", 0.0))
    phone_count = _safe_float(features.get("phone_count", 0.0))
    quantified_bullet_ratio = _safe_float(features.get("quantified_bullet_ratio", 0.0))
    bullet_count = _safe_float(features.get("bullet_count", 0.0))
    word_count = _safe_float(features.get("word_count", 0.0))

    penalty = 0.0

    if section_coverage < 4.0:
        penalty += (4.0 - section_coverage) * 3.0

    if email_count < 1.0:
        penalty += 4.0

    if phone_count < 1.0:
        penalty += 4.0

    if quantified_bullet_ratio < 0.15:
        penalty += min(8.0, (0.15 - quantified_bullet_ratio) * 30.0)

    if bullet_count < 6.0:
        penalty += (6.0 - bullet_count) * 0.8

    if word_count < 250.0:
        penalty += min(8.0, (250.0 - word_count) / 25.0)

    if word_count > 900.0:
        penalty += min(4.0, (word_count - 900.0) / 100.0)

    return max(0.0, penalty)


def _apply_minimum_content_guard(score: float, features: Dict[str, float]) -> float:
    """Cap score for very low-content resumes so trivial input cannot score mid/high."""
    word_count = _safe_float(features.get("word_count", 0.0))
    section_coverage = _safe_float(features.get("section_coverage", 0.0))
    bullet_count = _safe_float(features.get("bullet_count", 0.0))
    email_count = _safe_float(features.get("email_count", 0.0))
    phone_count = _safe_float(features.get("phone_count", 0.0))

    # A name-only or near-empty CV should always remain in the lowest band.
    if word_count < 15.0:
        return min(score, 20.0)

    # Very short CVs should not exceed lower-fair at most.
    if word_count < 40.0:
        return min(score, 35.0)

    # Low structure/contact information should be capped even if model confidence is high.
    if section_coverage < 1.0 and bullet_count < 1.0 and (email_count + phone_count) < 1.0:
        return min(score, 30.0)

    return score


def _rating_from_thresholds(score: float, rating_thresholds: Any) -> str:
    """Map score to a readable rating using bundle thresholds when available."""
    default_rating = [
        (45.0, "Poor"),
        (60.0, "Fair"),
        (75.0, "Good"),
        (101.0, "Excellent"),
    ]

    if not isinstance(rating_thresholds, dict):
        for threshold, name in default_rating:
            if score < threshold:
                return name
        return "Excellent"

    # Supports styles:
    # 1) {"Poor": 45, "Fair": 60, ...}
    # 2) {"Poor": [0, 45], "Fair": [45, 60], ...}
    # 3) {"poor_max": 45, "fair_max": 60, "good_max": 79}
    scalar_pairs: list[tuple[float, str]] = []
    range_pairs: list[tuple[float, float, str]] = []

    for label, value in rating_thresholds.items():
        raw_label = str(label)
        if raw_label.lower().endswith("_max"):
            raw_label = raw_label[:-4]
        label_name = raw_label.replace("_", " ").title()
        if isinstance(value, (int, float)):
            scalar_pairs.append((float(value), label_name))
        elif isinstance(value, (list, tuple)) and len(value) == 2:
            low, high = _safe_float(value[0]), _safe_float(value[1])
            range_pairs.append((low, high, label_name))

    if range_pairs:
        for low, high, label_name in sorted(range_pairs, key=lambda x: x[0]):
            if low <= score < high:
                return label_name

    if scalar_pairs:
        for threshold, label_name in sorted(scalar_pairs, key=lambda x: x[0]):
            if score < threshold:
                return label_name

        # If using *_max style thresholds, scores above the largest max are Excellent.
        labels_lower = {name.lower() for _, name in scalar_pairs}
        if {"poor", "fair", "good"}.issubset(labels_lower):
            return "Excellent"

        return sorted(scalar_pairs, key=lambda x: x[0])[-1][1]

    for threshold, name in default_rating:
        if score < threshold:
            return name
    return "Excellent"


def _get_numeric_feature_names(*transformers: Any) -> list[str] | None:
    """Resolve training-time numeric feature names from preprocessing artifacts."""
    for transformer in transformers:
        if transformer is None:
            continue
        names = getattr(transformer, "feature_names_in_", None)
        if names is None:
            continue
        try:
            return [str(name) for name in names]
        except Exception:
            continue
    return None


def _build_numeric_matrix(
    features: Dict[str, float],
    imputer: Any | None,
    scaler: Any | None,
) -> np.ndarray:
    """Build numeric matrix using model-known feature names when available."""
    feature_names = _get_numeric_feature_names(imputer, scaler)

    if feature_names:
        ordered_values = [
            _safe_float(features.get(name, 0.0), default=0.0) for name in feature_names
        ]
        numeric_raw = np.array([ordered_values], dtype=float)
    else:
        # Fallback keeps deterministic ordering but only used when names are unavailable.
        ordered_keys = sorted(features.keys())
        ordered_values = [
            _safe_float(features.get(key, 0.0), default=0.0) for key in ordered_keys
        ]
        numeric_raw = np.array([ordered_values], dtype=float)

        expected_numeric = None
        if imputer is not None and hasattr(imputer, "n_features_in_"):
            expected_numeric = int(imputer.n_features_in_)
        elif scaler is not None and hasattr(scaler, "n_features_in_"):
            expected_numeric = int(scaler.n_features_in_)

        if expected_numeric is not None:
            current_numeric = numeric_raw.shape[1]
            if current_numeric > expected_numeric:
                numeric_raw = numeric_raw[:, :expected_numeric]
            elif current_numeric < expected_numeric:
                pad_width = expected_numeric - current_numeric
                numeric_raw = np.hstack(
                    [numeric_raw, np.zeros((1, pad_width), dtype=float)]
                )

    numeric_matrix = numeric_raw
    if imputer is not None:
        numeric_matrix = imputer.transform(numeric_matrix)
    if scaler is not None:
        numeric_matrix = scaler.transform(numeric_matrix)

    return numeric_matrix


def _build_quality_input_matrix(
    cleaned_resume_text: str,
    features: Dict[str, float],
    quality_bundle: Dict[str, Any],
) -> Any:
    """Build feature matrix for quality model inference."""
    vectorizer = quality_bundle["vectorizer"]
    model = quality_bundle["model"]
    imputer = quality_bundle.get("imputer")
    scaler = quality_bundle.get("scaler")

    text_matrix = vectorizer.transform([cleaned_resume_text])
    numeric_matrix = _build_numeric_matrix(features, imputer=imputer, scaler=scaler)

    expected_features = getattr(model, "n_features_in_", None)
    text_dim = text_matrix.shape[1]
    combined = sparse.hstack(
        [text_matrix, sparse.csr_matrix(numeric_matrix)], format="csr"
    )

    if expected_features is not None and expected_features == text_dim:
        return text_matrix

    if expected_features is not None and expected_features == combined.shape[1]:
        return combined

    return [combined, text_matrix]


def _predict_with_fallback(model: Any, candidate_input: Any) -> tuple[Any, Any]:
    """Try prediction with one matrix or a list of candidate matrices."""
    candidates = (
        candidate_input if isinstance(candidate_input, list) else [candidate_input]
    )
    last_error: Exception | None = None

    for matrix in candidates:
        try:
            pred = model.predict(matrix)[0]
            proba = None
            if hasattr(model, "predict_proba"):
                proba = model.predict_proba(matrix)[0]
            return pred, proba
        except Exception as exc:
            last_error = exc

    if last_error is not None:
        raise ValueError(
            f"Quality model prediction failed: {str(last_error)}"
        ) from last_error
    raise ValueError("Quality model prediction failed for unknown reason")


def predict_resume_quality(
    cleaned_resume_text: str,
    quality_bundle: Dict[str, Any],
    features: Dict[str, float],
) -> tuple[float, str]:
    """Predict ATS-style resume score and rating."""
    model = quality_bundle["model"]
    score_anchors = quality_bundle.get("score_anchors")
    rating_thresholds = quality_bundle.get("rating_thresholds")

    candidate_matrix = _build_quality_input_matrix(
        cleaned_resume_text, features, quality_bundle
    )
    predicted_label, probabilities = _predict_with_fallback(model, candidate_matrix)

    raw_regression_output = None
    try:
        # Helpful when model itself outputs a numeric quality score.
        raw_regression_output = float(predicted_label)
    except Exception:
        raw_regression_output = None

    score = _score_from_probabilities(
        probabilities=probabilities,
        classes=getattr(model, "classes_", np.arange(len(probabilities) if probabilities is not None else 0)),
        score_anchors=score_anchors,
    )

    if score is None:
        score = _map_to_model_score(
            predicted_label=predicted_label,
            score_anchors=score_anchors,
            raw_regression_output=raw_regression_output,
        )

    score = _clamp(score - _structure_penalty(features))
    score = _apply_minimum_content_guard(score, features)
    rating = _rating_from_thresholds(score=score, rating_thresholds=rating_thresholds)

    return round(score, 2), rating


def _decode_role(class_value: Any, label_encoder: Any | None) -> str:
    if label_encoder is None:
        return str(class_value)

    try:
        decoded = label_encoder.inverse_transform([class_value])[0]
        return str(decoded)
    except Exception:
        return str(class_value)


def predict_top_careers(
    cleaned_resume_text: str,
    career_bundle: Dict[str, Any],
    top_k: int = 3,
) -> List[Dict[str, Any]]:
    """Predict top career recommendations with confidence scores."""
    vectorizer = career_bundle["vectorizer"]
    model = career_bundle["model"]
    label_encoder = career_bundle.get("label_encoder")

    matrix = vectorizer.transform([cleaned_resume_text])

    if hasattr(model, "predict_proba"):
        probs = model.predict_proba(matrix)[0]
        classes = getattr(model, "classes_", np.arange(len(probs)))
        top_idx = np.argsort(probs)[::-1][:top_k]

        recommendations: list[dict[str, Any]] = []
        for idx in top_idx:
            class_value = classes[idx]
            role = _decode_role(class_value, label_encoder)
            recommendations.append(
                {"role": role, "confidence": round(float(probs[idx]), 4)}
            )
        return recommendations

    predicted_class = model.predict(matrix)[0]
    predicted_role = _decode_role(predicted_class, label_encoder)

    # Safe fallback when probabilities are unavailable.
    return [{"role": predicted_role, "confidence": 1.0}]


def predict_job_fit_score(
    cleaned_resume_text: str,
    job_description: str | None,
    job_fit_bundle: Dict[str, Any] | None,
) -> float | None:
    """Predict optional job-fit score (0-100) if bundle + JD are provided."""
    if job_fit_bundle is None:
        return None

    if not job_description or not job_description.strip():
        return None

    vectorizer = job_fit_bundle["vectorizer"]
    model = job_fit_bundle["model"]

    combined_text = (
        f"resume: {cleaned_resume_text}\n\n"
        f"job_description: {job_description.strip()}"
    )
    matrix = vectorizer.transform([combined_text])

    if hasattr(model, "predict_proba"):
        probs = model.predict_proba(matrix)[0]
        classes = list(getattr(model, "classes_", range(len(probs))))

        positive_index = None
        for index, class_value in enumerate(classes):
            if str(class_value) in {"1", "1.0", "true", "fit", "match", "yes"}:
                positive_index = index
                break

        if positive_index is None:
            positive_index = int(np.argmax(probs))

        score = float(probs[positive_index]) * 100.0
        return round(_clamp(score), 2)

    prediction = model.predict(matrix)[0]
    score = _safe_float(prediction, default=0.0)

    if 0.0 <= score <= 1.0:
        score *= 100.0

    return round(_clamp(score), 2)


def run_full_resume_analysis(
    cleaned_resume_text: str,
    quality_bundle: Dict[str, Any],
    career_bundle: Dict[str, Any],
    job_fit_bundle: Dict[str, Any] | None,
    job_description: str | None,
) -> Dict[str, Any]:
    """Run complete pipeline and return response payload fields."""
    features = compute_resume_features(cleaned_resume_text)

    score, rating = predict_resume_quality(
        cleaned_resume_text=cleaned_resume_text,
        quality_bundle=quality_bundle,
        features=features,
    )

    careers = predict_top_careers(
        cleaned_resume_text=cleaned_resume_text,
        career_bundle=career_bundle,
        top_k=3,
    )

    job_fit_score = predict_job_fit_score(
        cleaned_resume_text=cleaned_resume_text,
        job_description=job_description,
        job_fit_bundle=job_fit_bundle,
    )

    suggestions = generate_improvement_suggestions(features)

    return {
        "resume_score": score,
        "rating": rating,
        "career_recommendations": careers,
        "job_fit_score": job_fit_score,
        "improvement_suggestions": suggestions,
    }
