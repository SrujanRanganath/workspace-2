# 🚀 AI Engineering Workspace

An AI-powered engineering workspace built using **FastAPI**, **Python**, **Google Gemini AI**, **SQLAlchemy**, and **JWT Authentication**.

The backend provides multiple AI-powered tools that help developers generate code, build websites, generate professional documents, and clean datasets through REST APIs.

---

# 📌 Project Overview

AI Engineering Workspace is a modular FastAPI backend developed as a Final Year Engineering Project.

The backend exposes AI-powered REST APIs that integrate with Google Gemini AI while supporting authentication, file handling, and database operations.

---

# ✨ Features

## 🔐 Authentication

- User Registration
- User Login
- JWT Authentication
- Password Hashing
- Protected Routes
- Current User API

---

## 💻 AI Code Tool

- Generate Code
- Explain Existing Code
- Save Generated Code
- support multi language
- Download Generated Code

---

## 🌐 AI Website Builder

- Generate AI Websites
- React Website Generation
- Multiple Templates
- Save Website
- Download Website ZIP

---

## 📄 AI Document Generator

- Generate DOCX Documents
- Resume Template
- Cover Letter Template
- Statement of Purpose
- Project Report
- Download Documents

---

## 🧹 AI Data Cleaner

- Upload CSV Files
- Remove Duplicate Records
- Handle Missing Values
- Clean Dataset
- Download Cleaned Dataset

---

# 🛠 Tech Stack

## Backend

- FastAPI
- Python 3.12+
- Uvicorn
- Pydantic

## Database

- SQLAlchemy ORM
- SQLite
- PostgreSQL (Configurable)

## Authentication

- JWT Authentication
- Password Hashing
- OAuth2 Password Bearer

## AI

- Google Gemini API

## File Handling

- ZIP File Generation
- DOCX Generation
- CSV Processing

---

# 📂 Project Structure

```text
backend/
│
├── auth/
│   ├── dependencies.py
│   ├── hashing.py
│   ├── jwt_handler.py
│   ├── routes.py
│   ├── schemas.py
│   └── service.py
│
├── models/
│
├── services/
│   └── llm.py
│
├── tools/
│   ├── code_tool/
│   ├── data_cleaner/
│   ├── document_generator/
│   └── website_builder/
│
├── uploads/
├── cleaned_files/
├── generated/
├── generated_docs/
├── generated_websites/
│
├── config.py
├── database.py
├── main.py
├── requirements.txt
├── .env.example
├── README.md
└── .gitignore
```

---

# 🔗 API Endpoints

## Authentication

| Method | Endpoint |
|---------|----------|
| GET | `/auth/test` |
| POST | `/auth/register` |
| POST | `/auth/login` |
| GET | `/auth/me` |

---

## Code Tool

| Method | Endpoint |
|---------|----------|
| POST | `/code/generate` |
| POST | `/code/explain` |
| POST | `/code/save` |
| POST | `/code/run` |
| GET | `/code/download/{filename}` |

---

## Website Builder

| Method | Endpoint |
|---------|----------|
| POST | `/website/generate` |
| POST | `/website/save` |
| GET | `/website/download/{project_name}` |

---

## Document Generator

| Method | Endpoint |
|---------|----------|
| POST | `/document-generator/generate` |
| GET | `/document-generator/download/{filename}` |

---

## Data Cleaner

| Method | Endpoint |
|---------|----------|
| POST | `/data-cleaner/upload` |
| POST | `/data-cleaner/clean` |
| GET | `/data-cleaner/download/{filename}` |

---

# ⚙ Installation

Clone the repository

```bash
git clone <repository-url>
```

Go to backend

```bash
cd backend
```

Create virtual environment

```bash
python -m venv venv
```

Activate virtual environment

### Windows

```bash
venv\Scripts\activate
```

### Linux / macOS

```bash
source venv/bin/activate
```

Install dependencies

```bash
pip install -r requirements.txt
```

---

# 🔑 Environment Variables

Create a `.env` file.

Example:

```env
DATABASE_URL=sqlite:///workspace.db

SECRET_KEY=your_secret_key

GEMINI_API_KEY=your_gemini_api_key
```

---

# ▶ Running the Backend

```bash
uvicorn main:app --reload
```

Server

```
http://127.0.0.1:8000
```

Swagger UI

```
http://127.0.0.1:8000/docs
```

ReDoc

```
http://127.0.0.1:8000/redoc
```

---

# 🧪 Testing

All backend APIs have been tested successfully using Swagger UI.

### Completed Modules

- ✅ Authentication
- ✅ AI Code Tool
- ✅ AI Website Builder
- ✅ AI Document Generator
- ✅ AI Data Cleaner

---

# 📦 Generated Output

Generated files are stored in:

```
generated/
generated_docs/
generated_websites/
cleaned_files/
uploads/
```

---

# 🚧 Project Status

## ✅ Backend

- FastAPI Architecture
- SQLAlchemy Integration
- JWT Authentication
- AI Tool Modules
- REST APIs
- File Management
- Swagger Documentation

## 🚧 Frontend

Frontend development is currently in progress.

---

# 🔮 Future Enhancements

- React Frontend
- User Dashboard
- Chat History
- Docker Support
- Cloud Deployment
- Admin Dashboard

---

# 👩‍💻 Developed By

**Tejaswini S**

Final Year Engineering Project

**AI Engineering Workspace**

---

# 📄 License

This project is developed for educational and learning purposes.
