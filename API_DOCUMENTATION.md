# 📚 AI Engineering Workspace - API Documentation

This document describes all available backend APIs.

Base URL

```
http://127.0.0.1:8000
```

Swagger UI

```
http://127.0.0.1:8000/docs
```

---

# 🔐 Authentication APIs

## Test Authentication

**GET**

```
/auth/test
```

Returns:

- Authentication module status

---

## Register User

**POST**

```
/auth/register
```

Request

```json
{
  "name": "Tejaswini S",
  "email": "tejaswini@example.com",
  "password": "Password123"
}
```

---

## Login User

**POST**

```
/auth/login
```

Request

```json
{
  "email": "tejaswini@example.com",
  "password": "Password123"
}
```

Returns

```json
{
  "access_token": "...",
  "token_type": "bearer"
}
```

---

## Current User

**GET**

```
/auth/me
```

Authorization Required

---

# 💻 Code Tool APIs

## Generate Code

**POST**

```
/code/generate
```

---

## Explain Code

**POST**

```
/code/explain
```

---

## Save Code

**POST**

```
/code/save
```

---

## Run Code

**POST**

```
/code/run
```

---

## Download Code

**GET**

```
/code/download/{filename}
```

---

# 📄 Document Generator APIs

## Generate Document

**POST**

```
/document-generator/generate
```

---

## Download Document

**GET**

```
/document-generator/download/{filename}
```

---

# 🧹 Data Cleaner APIs

## Upload Dataset

**POST**

```
/data-cleaner/upload
```

---

## Clean Dataset

**POST**

```
/data-cleaner/clean
```

---

## Download Dataset

**GET**

```
/data-cleaner/download/{filename}
```

---

# 🌐 Website Builder APIs

## Generate Website

**POST**

```
/website/generate
```

---

## Save Website

**POST**

```
/website/save
```

---

## Download Website

**GET**

```
/website/download/{project_name}
```

---

# 📝 Response Codes

| Status Code | Meaning |
|-------------|---------|
| 200 | Success |
| 201 | Resource Created |
| 400 | Bad Request |
| 401 | Unauthorized |
| 404 | Not Found |
| 500 | Internal Server Error |

---

# 🧪 Testing

All APIs can be tested using Swagger UI.

```
http://127.0.0.1:8000/docs
```

---

# Developed By

Tejaswini S

AI Engineering Workspace