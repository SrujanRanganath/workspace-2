# 🤝 AI Engineering Workspace - Backend Handover Guide

This guide explains how to set up and run the backend project.

---

# 1. Clone the Repository

```bash
git clone <repository-url>
```

---

# 2. Move to Backend Folder

```bash
cd backend
```

---

# 3. Create Virtual Environment

```bash
python -m venv venv
```

---

# 4. Activate Virtual Environment

## Windows

```bash
venv\Scripts\activate
```

## Linux / macOS

```bash
source venv/bin/activate
```

---

# 5. Install Required Packages

```bash
pip install -r requirements.txt
```

---

# 6. Create Environment File

Copy

```
.env.example
```

Rename it to

```
.env
```

Update the following values:

```env
DATABASE_URL=sqlite:///workspace.db

SECRET_KEY=your_secret_key

GEMINI_API_KEY=your_gemini_api_key
```

---

# 7. Run the Backend

```bash
uvicorn main:app --reload
```

---

# 8. Open Swagger Documentation

```
http://127.0.0.1:8000/docs
```

---

# Available Modules

## Authentication

- Register
- Login
- Current User

---

## AI Code Tool

- Generate Code
- Explain Code
- Save Code
- Run Code
- Download Code

---

## AI Website Builder

- Generate Website
- Save Website
- Download ZIP

---

## AI Document Generator

- Generate DOCX
- Download DOCX

---

## AI Data Cleaner

- Upload Dataset
- Clean Dataset
- Download Dataset

---

# Notes

- Do not upload the `.env` file to GitHub.
- Always keep API keys private.
- Install dependencies before running the backend.
- Test APIs using Swagger UI.

---

# Developed By

Tejaswini S

AI Engineering Workspace