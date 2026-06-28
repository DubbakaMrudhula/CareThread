# Deployment Configuration Guide

This guide details the build settings, environment variables, and output configurations required to deploy the **CareThread Secure Platform** on **Render** (for the FastAPI backend) and **Vercel** (for the Next.js frontend).

---

## 🐍 Backend Deployment: Render
Render is well-suited for hosting Python services. You should deploy the backend as a **Web Service**.

### 1. Web Service Settings
| Setting | Value |
| :--- | :--- |
| **Runtime** | `Python 3` |
| **Build Command** | `pip install -r requirements.txt` |
| **Start Command** | `uvicorn main:app --host 0.0.0.0 --port $PORT` |

### 2. Environment Variables
Add the following environment variables in the Render dashboard:
*   `MONGODB_URI`: *Your MongoDB production connection string*
*   `GROQ_API_KEY`: *Your Groq API key*
*   `PYTHON_VERSION`: `3.10.11` (or matching your preferred version)

### 3. Render Blueprint Specification (`render.yaml`)
Alternatively, you can place a `render.yaml` in the repository root to automatically configure the service:
```yaml
services:
  - type: web
    name: carethread-backend
    env: python
    repo: https://github.com/DubbakaMrudhula/CareThread.git # Change to your repo
    rootDir: backend
    buildCommand: pip install -r requirements.txt
    startCommand: uvicorn main:app --host 0.0.0.0 --port $PORT
    envVars:
      - key: MONGODB_URI
        sync: false
      - key: GROQ_API_KEY
        sync: false
```

---

## ⚡ Frontend Deployment: Vercel
Vercel is optimized for Next.js applications. You can import the repository directly and configure the subdirectory.

### 1. Project Configuration
During import, configure the following settings in the Vercel dashboard:
*   **Framework Preset**: `Next.js`
*   **Root Directory**: `frontend` (Make sure to select the `frontend` folder, not the repository root)

### 2. Build & Development Settings
Leave the defaults on unless you need specific modifications. Vercel automatically detects Next.js build configuration:
*   **Build Command**: `next build` (Vercel automatically triggers this)
*   **Output Directory**: `.next` (Default)
*   **Install Command**: `npm install` (Default)

### 3. Environment Variables
Add these variables in Vercel to route requests to your hosted Render backend:
*   `NEXT_PUBLIC_API_URL`: `https://carethread-eefn.onrender.com`

> [!IMPORTANT]
> **CORS Configurations**: Update the CORS configuration in the backend (`backend/main.py`) to include your production Vercel frontend URL in the `allow_origins` array.
