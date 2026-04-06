"""
services/model_loader.py - ML Model Loading Service

This module handles loading the trained ML model bundles from disk.
Models are loaded once at application startup and cached globally
to avoid reloading on every request.

The bundles were created by the training notebook and contain:
- quality_bundle: Resume quality scoring model
- career_bundle: Career recommendation model
- job_fit_bundle: Optional job fit scoring model
"""

import os
from pathlib import Path
from typing import Dict, Any, Optional
import joblib


QUALITY_REQUIRED_KEYS = {
    "vectorizer",
    "imputer",
    "scaler",
    "model",
    "score_anchors",
    "rating_thresholds",
}

CAREER_REQUIRED_KEYS = {
    "vectorizer",
    "model",
    "label_encoder",
}

JOB_FIT_REQUIRED_KEYS = {
    "vectorizer",
    "model",
}


# ===============================
# Global Model Cache
# ===============================
# These variables store loaded models globally.
# They are populated by load_all_models() at startup.

_quality_bundle: Optional[Dict[str, Any]] = None
_career_bundle: Optional[Dict[str, Any]] = None
_job_fit_bundle: Optional[Dict[str, Any]] = None
_models_loaded: bool = False


# ===============================
# Path Configuration
# ===============================
def get_artifacts_path() -> Path:
    """
    Get the path to the artifacts folder containing trained models.

    The artifacts folder should be at: backend/ml/artifacts/
    This function determines the path relative to this file's location.

    You can also set the ARTIFACTS_PATH environment variable to
    override this path.

    Returns:
        Path object pointing to the artifacts directory
    """
    # Check for environment variable override
    env_path = os.environ.get("ARTIFACTS_PATH")
    if env_path:
        return Path(env_path)

    # Default: artifacts folder is sibling to api folder
    # api/ is at backend/ml/api/
    # artifacts/ is at backend/ml/artifacts/
    current_dir = Path(__file__).parent.parent  # Go from services/ to api/
    artifacts_path = current_dir.parent / "artifacts"  # Go to ml/artifacts/

    return artifacts_path


# ===============================
# Model Loading Functions
# ===============================
def load_quality_bundle(artifacts_path: Path) -> Optional[Dict[str, Any]]:
    """
    Load the quality scoring model bundle.

    The bundle contains:
    - task: "intrinsic_resume_quality"
    - vectorizer: TF-IDF vectorizer for text
    - imputer: SimpleImputer for numeric features
    - scaler: StandardScaler for numeric features
    - model: LogisticRegression classifier
    - metrics: Training metrics
    - feature_percentiles: Reference values for features
    - score_anchors: Score mapping for each quality class
    - rating_thresholds: Thresholds for quality ratings

    Args:
        artifacts_path: Path to artifacts directory

    Returns:
        Dictionary containing the quality bundle, or None if not found
    """
    bundle_path = artifacts_path / "quality_bundle.joblib"

    if not bundle_path.exists():
        print(f"[WARNING] Quality bundle not found at: {bundle_path}")
        return None

    try:
        bundle = joblib.load(bundle_path)
        missing_keys = QUALITY_REQUIRED_KEYS - set(bundle.keys())
        if missing_keys:
            print(f"[ERROR] Quality bundle is missing keys: {sorted(missing_keys)}")
            return None
        print(f"[INFO] Quality bundle loaded successfully")
        print(f"  - Keys: {list(bundle.keys())}")
        return bundle
    except Exception as e:
        print(f"[ERROR] Failed to load quality bundle: {e}")
        return None


def load_career_bundle(artifacts_path: Path) -> Optional[Dict[str, Any]]:
    """
    Load the career recommendation model bundle.

    The bundle contains:
    - vectorizer: TF-IDF vectorizer for text
    - model: LogisticRegression classifier
    - label_encoder: LabelEncoder for career categories
    - metrics: Training metrics

    Args:
        artifacts_path: Path to artifacts directory

    Returns:
        Dictionary containing the career bundle, or None if not found
    """
    bundle_path = artifacts_path / "career_bundle.joblib"

    if not bundle_path.exists():
        print(f"[WARNING] Career bundle not found at: {bundle_path}")
        return None

    try:
        bundle = joblib.load(bundle_path)
        missing_keys = CAREER_REQUIRED_KEYS - set(bundle.keys())
        if missing_keys:
            print(f"[ERROR] Career bundle is missing keys: {sorted(missing_keys)}")
            return None
        print(f"[INFO] Career bundle loaded successfully")
        print(f"  - Keys: {list(bundle.keys())}")
        # Show available career categories
        if "label_encoder" in bundle:
            categories = bundle["label_encoder"].classes_
            print(f"  - Career categories: {len(categories)} total")
        return bundle
    except Exception as e:
        print(f"[ERROR] Failed to load career bundle: {e}")
        return None


def load_job_fit_bundle(artifacts_path: Path) -> Optional[Dict[str, Any]]:
    """
    Load the optional job fit scoring model bundle.

    This bundle is OPTIONAL - the API will work without it.
    When available, it enables job-resume fit scoring.

    The bundle contains:
    - task: "optional_resume_job_fit_proxy"
    - vectorizer: TF-IDF vectorizer
    - model: LogisticRegression classifier
    - metrics: Training metrics

    Args:
        artifacts_path: Path to artifacts directory

    Returns:
        Dictionary containing the job fit bundle, or None if not found
    """
    bundle_path = artifacts_path / "job_fit_bundle.joblib"

    if not bundle_path.exists():
        print(f"[INFO] Job fit bundle not found (optional)")
        return None

    try:
        bundle = joblib.load(bundle_path)
        missing_keys = JOB_FIT_REQUIRED_KEYS - set(bundle.keys())
        if missing_keys:
            print(f"[ERROR] Job fit bundle is missing keys: {sorted(missing_keys)}")
            return None
        print(f"[INFO] Job fit bundle loaded successfully")
        print(f"  - Keys: {list(bundle.keys())}")
        return bundle
    except Exception as e:
        print(f"[ERROR] Failed to load job fit bundle: {e}")
        return None


def load_all_models() -> bool:
    """
    Load all model bundles at application startup.

    This function should be called once when the FastAPI app starts.
    It loads all bundles into global variables for fast access.

    Returns:
        True if at least the required models (quality, career) loaded
        False if required models are missing

    Raises:
        FileNotFoundError: If artifacts directory doesn't exist
    """
    global _quality_bundle, _career_bundle, _job_fit_bundle, _models_loaded

    # Get artifacts path
    artifacts_path = get_artifacts_path()

    # Validate artifacts directory exists
    if not artifacts_path.exists():
        raise FileNotFoundError(
            f"Artifacts directory not found at: {artifacts_path}\n"
            f"Please ensure the trained model bundles are in place.\n"
            f"Expected files:\n"
            f"  - {artifacts_path}/quality_bundle.joblib\n"
            f"  - {artifacts_path}/career_bundle.joblib\n"
            f"  - {artifacts_path}/job_fit_bundle.joblib (optional)"
        )

    print(f"\n[INFO] Loading ML models from: {artifacts_path}")
    print("=" * 50)

    # Load each bundle
    _quality_bundle = load_quality_bundle(artifacts_path)
    _career_bundle = load_career_bundle(artifacts_path)
    _job_fit_bundle = load_job_fit_bundle(artifacts_path)

    print("=" * 50)

    # Check if required models are loaded
    if _quality_bundle is None:
        print("[ERROR] Quality model is required but not loaded!")
        _models_loaded = False
        return False

    if _career_bundle is None:
        print("[ERROR] Career model is required but not loaded!")
        _models_loaded = False
        return False

    _models_loaded = True
    print("[SUCCESS] All required models loaded successfully!\n")
    return True


# ===============================
# Model Access Functions
# ===============================
def get_quality_bundle() -> Optional[Dict[str, Any]]:
    """
    Get the loaded quality scoring bundle.

    Returns:
        Quality bundle dictionary or None if not loaded
    """
    return _quality_bundle


def get_career_bundle() -> Optional[Dict[str, Any]]:
    """
    Get the loaded career recommendation bundle.

    Returns:
        Career bundle dictionary or None if not loaded
    """
    return _career_bundle


def get_job_fit_bundle() -> Optional[Dict[str, Any]]:
    """
    Get the loaded job fit scoring bundle (optional).

    Returns:
        Job fit bundle dictionary or None if not loaded
    """
    return _job_fit_bundle


def are_models_loaded() -> bool:
    """
    Check if models have been loaded successfully.

    Returns:
        True if all required models are loaded
    """
    return _models_loaded


def get_model_status() -> Dict[str, bool]:
    """
    Get the loading status of each model.

    Useful for the /health endpoint to report model states.

    Returns:
        Dictionary with loading status of each model
    """
    return {
        "quality_model_loaded": _quality_bundle is not None,
        "career_model_loaded": _career_bundle is not None,
        "job_fit_model_loaded": _job_fit_bundle is not None,
    }
