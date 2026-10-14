"""Isolate pytest from the developer's real database and generated files."""
import os
from pathlib import Path

_TEST_DB = Path(__file__).resolve().parent / "_isolated_test.db"
# Always isolate tests, even when DATABASE_URL/SECRET_KEY are already in the shell.
os.environ["DATABASE_URL"] = "sqlite:///" + _TEST_DB.as_posix()
os.environ["APP_ENV"] = "test"
os.environ["SECRET_KEY"] = "pytest-only-secret-key-not-used-in-production"
os.environ["GEMINI_API_KEY"] = "pytest-only-gemini-key"
os.environ["ALGORITHM"] = "HS256"

if _TEST_DB.exists():
    try:
        _TEST_DB.unlink()
    except OSError:
        pass
