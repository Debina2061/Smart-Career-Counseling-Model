#!/usr/bin/env python3
"""
Diagnostic script for ML API troubleshooting
Run this from: backend/ml/api/
Usage: python diagnose.py
"""

import os
import sys
from pathlib import Path
import socket


def check_python_version():
    """Check Python version compatibility"""
    print("=" * 60)
    print("1. PYTHON VERSION CHECK")
    print("=" * 60)
    version = sys.version_info
    print(f"Python Version: {version.major}.{version.minor}.{version.micro}")
    if version.major == 3 and version.minor >= 8:
        print("✅ Python version is compatible")
        return True
    else:
        print("❌ Python 3.8+ required")
        return False


def check_dependencies():
    """Check if required packages are installed"""
    print("\n" + "=" * 60)
    print("2. DEPENDENCY CHECK")
    print("=" * 60)

    required_packages = [
        "fastapi",
        "uvicorn",
        "pydantic",
        "pdfplumber",
        "scikit-learn",
        "joblib",
        "numpy",
        "pandas",
    ]

    missing = []
    for package in required_packages:
        try:
            __import__(package)
            print(f"✅ {package}: installed")
        except ImportError:
            print(f"❌ {package}: MISSING")
            missing.append(package)

    if missing:
        print(f"\n❌ Missing packages: {', '.join(missing)}")
        print(f"Install with: pip install {' '.join(missing)}")
        return False
    else:
        print("✅ All dependencies installed")
        return True


def check_model_files():
    """Check if model bundle files exist"""
    print("\n" + "=" * 60)
    print("3. MODEL BUNDLE FILES CHECK")
    print("=" * 60)

    artifacts_path = Path(__file__).parent.parent / "artifacts"
    required_files = [
        "quality_bundle.joblib",
        "career_bundle.joblib",
        "job_fit_bundle.joblib",
    ]

    print(f"Artifacts path: {artifacts_path}")
    print(f"Path exists: {artifacts_path.exists()}")

    if not artifacts_path.exists():
        print("❌ Artifacts directory not found!")
        return False

    missing_files = []
    for filename in required_files:
        filepath = artifacts_path / filename
        if filepath.exists():
            size_mb = filepath.stat().st_size / (1024 * 1024)
            print(f"✅ {filename}: {size_mb:.1f} MB")
        else:
            print(f"❌ {filename}: MISSING")
            missing_files.append(filename)

    if missing_files:
        print(f"\n❌ Missing files: {', '.join(missing_files)}")
        return False
    else:
        print("✅ All model files present")
        return True


def check_models_load():
    """Try to load the models"""
    print("\n" + "=" * 60)
    print("4. MODEL LOADING TEST")
    print("=" * 60)

    try:
        print("Loading models...")
        from services.model_loader import load_all_models

        result = load_all_models()
        if result:
            print("✅ Models loaded successfully")
            return True
        else:
            print("❌ Model loading failed")
            return False
    except Exception as e:
        print(f"❌ Error loading models: {e}")
        return False


def check_port_available():
    """Check if port 8000 is available"""
    print("\n" + "=" * 60)
    print("5. PORT AVAILABILITY CHECK")
    print("=" * 60)

    port = 8000
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    result = sock.connect_ex(("127.0.0.1", port))
    sock.close()

    if result == 0:
        print(f"❌ Port {port} is ALREADY IN USE")
        print("   Solution: Kill the process or use different port")
        return False
    else:
        print(f"✅ Port {port} is available")
        return True


def check_env_config():
    """Check environment configuration"""
    print("\n" + "=" * 60)
    print("6. ENVIRONMENT CONFIGURATION")
    print("=" * 60)

    from pathlib import Path

    env_file = Path(__file__).parent.parent.parent / ".env.local"

    print(f"Looking for: {env_file}")
    if env_file.exists():
        with open(env_file, "r") as f:
            content = f.read()
            if "ML_API_BASE_URL" in content:
                for line in content.split("\n"):
                    if "ML_API_BASE_URL" in line and not line.strip().startswith("#"):
                        print(f"✅ Found: {line}")
                        return True
        print("❌ ML_API_BASE_URL not configured")
        return False
    else:
        print(f"❌ .env.local not found at {env_file}")
        return False


def run_diagnostics():
    """Run all diagnostics"""
    print("\n")
    print("╔" + "=" * 58 + "╗")
    print("║" + " ML API DIAGNOSTIC TOOL ".center(58) + "║")
    print("╚" + "=" * 58 + "╝")

    checks = [
        ("Python Version", check_python_version),
        ("Dependencies", check_dependencies),
        ("Model Files", check_model_files),
        ("Port Available", check_port_available),
        ("Environment Config", check_env_config),
        ("Model Loading", check_models_load),
    ]

    results = {}
    for name, check_func in checks:
        try:
            results[name] = check_func()
        except Exception as e:
            print(f"❌ Error during {name}: {e}")
            results[name] = False

    print("\n" + "=" * 60)
    print("DIAGNOSTIC SUMMARY")
    print("=" * 60)

    for name, passed in results.items():
        status = "✅ PASS" if passed else "❌ FAIL"
        print(f"{status}: {name}")

    all_passed = all(results.values())

    print("\n" + "=" * 60)
    if all_passed:
        print("✅ ALL CHECKS PASSED!")
        print("Ready to start ML API with:")
        print("  uvicorn main:app --host 127.0.0.1 --port 8000")
    else:
        print("❌ SOME CHECKS FAILED")
        print("Fix the issues above before starting ML API")
    print("=" * 60)

    return all_passed


if __name__ == "__main__":
    success = run_diagnostics()
    sys.exit(0 if success else 1)
