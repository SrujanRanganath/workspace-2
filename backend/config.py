from dotenv import load_dotenv
import os

load_dotenv()

# --- Database ---
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./workspace.db")

# --- JWT Authentication ---
SECRET_KEY = os.getenv("SECRET_KEY")
if not SECRET_KEY:
    raise ValueError("SECRET_KEY is missing in .env file")

ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))

# --- Gemini API ---
# Missing API keys should not crash startup; the app falls back to a deterministic
# offline response when Gemini is unavailable or misconfigured.
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "").strip()

# --- LLM Provider ---
LLM_PROVIDER = (os.getenv("LLM_PROVIDER", "gemini") or "gemini").strip().lower()
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.0-flash").strip() or "gemini-2.0-flash"

# --- CORS ---
_cors_raw = os.getenv(
    "CORS_ORIGINS",
    "http://localhost:3000,http://localhost:3001,http://localhost:3002,http://localhost:5173,http://127.0.0.1:3000,http://127.0.0.1:3001,http://127.0.0.1:3002,http://127.0.0.1:5173",
)
CORS_ORIGINS = [origin.strip() for origin in _cors_raw.split(",") if origin.strip()]

# --- Application ---
APP_ENV = os.getenv("APP_ENV", "development")
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")
CODE_EXECUTION_TIMEOUT = int(os.getenv("CODE_EXECUTION_TIMEOUT", "10"))
