"""
AI Engineering Workspace - Root Entry Point
Redirects to backend.main:app for unified execution from root or backend directory.
"""
import sys
from pathlib import Path

# Add backend directory to sys.path so modules resolve correctly
backend_dir = Path(__file__).resolve().parent / "backend"
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from backend.main import app  # noqa: F401

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="127.0.0.1", port=8000, reload=True)
