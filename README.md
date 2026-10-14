# AI Engineering Workspace

A requirement-driven AI engineering workspace featuring a **FastAPI** backend,
a **React + TypeScript + Vite** frontend, AI-assisted generation, and
verification workflows. It is an academic/MVP project, not a production-ready
or independently benchmarked autonomous multi-agent system.

---

## 📌 Project Overview

**AI Engineering Workspace Using Multi-Agent Systems** is a modular engineering platform developed as a Final Year Engineering Project.

The platform provides:
1. **Core AI Engineering Tools**: Code Generation & Explanation, Multi-File Website Building, DOCX Document Generation, and Dataset Cleaning.
2. **Project-Centric Engineering Lifecycle**: Requirement ingestion, architectural planning, multi-artifact generation, static verification, optional isolated test execution, defect tracking, and repair attempts.
3. **Security Controls**: Authentication, project ownership checks, path confinement, and Docker-isolated test execution when Docker and the runner image are available.

The lifecycle is implemented as backend pipeline/services; the UI's agent
terminology describes workflow roles, not independently deployed or
autonomously collaborating agents. Generation may use an LLM or deterministic
fallback. A generated artifact, static check, or fallback result is not proof
that an application is correct or deployable.

---

## 👩‍💻 Authors & Attributions

* **Tejaswini S** — *Original Project Architecture & Core AI Tool Implementation* (Final Year Engineering Project)
* **Srujan Ranganath** — *Multi-Agent Architecture, Verification Pipeline, Security Controls, and Full-Stack Monorepo Integration*

---

## 🛠 Tech Stack

### Backend
* **FastAPI** (v2.0.0 Architecture)
* **Python 3.12+**
* **SQLAlchemy ORM** (SQLite default, PostgreSQL configurable)
* **Pydantic v2**
* **JWT Authentication & Passlib/Bcrypt**
* **Google Gemini AI API** (with resilient offline/mock fallback)
* **pandas, python-docx, openpyxl**

### Frontend
* **React 18**
* **TypeScript**
* **Vite**
* **Tailwind CSS & Lucide Icons**

### Testing & Verification
* **pytest** test suite
* **Static Test Verifier** (AST analysis, syntax validation)
* **File Path Security Suite** (Path traversal defenses)

---

## 📂 Project Structure

```text
AI-Engineering-Workspace/
├── backend/                  # FastAPI 2.0 Backend Application
│   ├── api/                  # Project Lifecycle v1 Routers (projects, requirements, artifacts, etc.)
│   ├── auth/                 # JWT Authentication, password hashing, dependencies
│   ├── models/               # SQLAlchemy ORM Models (User, Project, Requirement, Artifact, etc.)
│   ├── services/             # Pipeline orchestration, LLM service, test runners, verifiers
│   ├── tests/                # Backend unit, integration, and security tests
│   ├── tools/                # 4 Core AI Tools (code_tool, website_builder, data_cleaner, document_generator)
│   ├── utils/                # Security utils (path containment, filename sanitation)
│   ├── config.py             # Backend configuration and environment management
│   ├── database.py           # Database engine, session maker, schema migration
│   ├── main.py               # FastAPI application entry point
│   ├── requirements.txt      # Python dependencies
│   └── .env.example          # Backend environment template
│
├── frontend/                 # React + TypeScript + Vite Web Application
│   ├── src/
│   │   ├── api/              # API client and mock services
│   │   ├── components/       # Shared UI components (Navbar, ProtectedRoute, CodeViewer, etc.)
│   │   ├── context/          # Auth and Toast contexts
│   │   ├── pages/            # Dashboard, Projects, ProjectStudio, and Tool pages
│   │   └── types/            # TypeScript interfaces and data contracts
│   ├── package.json          # Node dependencies
│   └── vite.config.ts        # Vite configuration
│
├── docs/                     # Comprehensive Project Documentation
│   ├── ARCHITECTURE.md       # System architecture & component diagrams
│   ├── SECURITY.md           # Threat model, path traversal controls, and audit records
│   ├── API_WORKFLOW.md       # Complete REST API lifecycle documentation
│   └── DEVELOPMENT_STATUS.md # Milestone and feature implementation status
│
├── main.py                   # Root entry point bridging directly to backend.main:app
├── requirements.txt          # Root Python dependencies reference
├── API_DOCUMENTATION.md      # Legacy REST API reference
├── HANDOVER_GUIDE.md         # Operational handover documentation
├── README.md                 # Project README
└── .gitignore                # Unified monorepo ignore rules
```

---

## ✨ Features & Tools

### 1. 💻 AI Code Tool
* Multi-language code generation (Python, JavaScript, TypeScript, Go, Java, C++, Rust).
* Code explanation and architectural rationale.
* Project save, static syntax verification, and ZIP download.

### 2. 🌐 AI Website Builder
* Multi-file website generation (HTML, CSS, JavaScript).
* Live interactive preview.
* Owner-authorized static publishing. A successfully published URL is public.
* One-click ZIP download.

### 3. 📄 AI Document Generator
* Professional DOCX document generation.
* Standard templates: Resumes, Cover Letters, Statement of Purpose (SOP), and Technical Project Reports.
* Downloadable Word artifacts.

### 4. 🧹 AI Data Cleaner
* Upload and analyze CSV datasets.
* Automated missing value imputation, duplicate removal, and data type formatting.
* Before/after data quality summary reports and CSV export.

### 5. 🤖 Multi-Agent Project Lifecycle
* **Requirements workflow**: Parse and structure functional specifications, using an LLM or deterministic fallback.
* **Architecture & planning workflow**: Produce a specification and phased implementation plan.
* **Artifact workflow**: Generate persisted artifacts from templates and/or provider output.
* **Validation and testing workflow**: Static checks plus Docker test execution when its prerequisites are available.
* **Defect and repair workflow**: Record detected issues and repair attempts; a repair or syntax check does not establish semantic correctness.

---

## ⚙ Installation & Setup

### 1. Prerequisites
* Python 3.12+
* Node.js v18+ & npm v9+

### 2. Backend Setup
```bash
# Navigate to backend directory
cd backend

# Create virtual environment
python -m venv .venv

# Activate virtual environment
# Windows (PowerShell):
.venv\Scripts\Activate.ps1
# Linux / macOS:
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure environment variables
cp .env.example .env
# Edit .env and configure SECRET_KEY and GEMINI_API_KEY
```

### 3. Frontend Setup
```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Configure environment (optional, defaults to http://127.0.0.1:8000)
cp .env.example .env
```

---

## ▶ Running the Application

### Start the Backend
```bash
# From the repository root:
python main.py
# Or from backend directory:
cd backend
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```
* API Server: `http://127.0.0.1:8000`
* Interactive API Documentation (Swagger): `http://127.0.0.1:8000/docs`
* ReDoc: `http://127.0.0.1:8000/redoc`

### Start the Frontend
```bash
cd frontend
npm run dev
```
* Frontend Application: `http://localhost:3000`

### Faculty Demo Walkthrough

1. Configure `backend/.env` from `backend/.env.example`, using a unique
   `SECRET_KEY` and a Gemini API key only if live model calls are needed.
   Never commit the populated environment file.
2. Start the backend and frontend as above, open `http://localhost:3000`, and
   select **Live FastAPI** to demonstrate persisted, authenticated project
   workflows. Register/sign in, create a project, and submit a requirement,
   for example: “A course portal lets instructors publish assignments with a
   due date; students can submit work before the deadline; instructors can
   review each submission.”
3. Walk through requirement analysis, specification, plan, artifact
   generation, and validation in Project Studio. Validation is static and
   coarse; inspect its findings rather than presenting it as proof of
   correctness. Generated provider output may use deterministic fallback
   depending on credentials/provider configuration.
4. For registered test artifacts, show the reported verification type. Docker
   runtime tests require an available Docker daemon and runner image; if
   Docker is unavailable, the backend may report static verification instead.
5. Open `http://127.0.0.1:8000/docs`, authorize with the signed-in user's
   bearer token, and call
   `GET /api/v1/projects/{project_id}/evaluation` to show persisted counts,
   traceability and metric denominators. The API report excludes standalone
   browser state.
6. Optionally switch to **Standalone Engine** to show the UI without a
   backend. Treat requirement/specification/plan/artifact output as simulated;
   validation and tests are not executed, repair is not applied, and the
   in-memory project state resets when the page reloads.

The tools demonstrate focused capabilities: Code Tool, static website
generation (HTML/CSS/JavaScript), CSV/XLSX cleaning (10 MB maximum), and DOCX
generation. Website generation is not a React/Vue project compiler.

---

## 🧪 Testing

Run the automated backend test suite:
```bash
cd backend
pytest tests/ -v
```
See [Development Status](docs/DEVELOPMENT_STATUS.md) and
[Research Evaluation](docs/RESEARCH_EVALUATION.md) for verified scope, metric
definitions, test commands, and current limitations. Do not treat historical
test counts or unrun workflows as current verification results.

---

## 🔒 Security Architecture

* **Path Traversal Protection**: All user file access and downloads are strictly confined to authorized subdirectories using `os.path.commonpath` verification.
* **Cross-User Isolation**: Projects, artifacts, and test runs are isolated by user ownership.
* **Generated-code boundary**: Static validation does not execute generated code. Test execution uses a Docker runner when available; this does not imply that every workflow or generated artifact has been runtime-tested.

---

## 📄 License

Developed for academic and educational purposes under the Final Year Engineering Curriculum.
