# SignLearn AI Platform (Learning App for Deaf & Mute)

Full-stack Sign Language learning platform.

- Backend: FastAPI + SQLAlchemy + Alembic
- Frontend: React + Vite + Tailwind
- Deployment: Render (backend + Postgres, Docker) + Netlify (frontend)

## Repo structure

- `backend/` — FastAPI API
- `frontend/` — React app

## Prerequisites

- Node.js 20+
- Python 3.11+ (local)
- Git

## Local development (Windows)

### 1) Backend

From the repository root:

```powershell
cd backend

# create venv (if not already)
python -m venv .venv

# activate
.\.venv\Scripts\Activate.ps1

# install deps
python -m pip install -r requirements.txt

# migrations (SQLite)
python -m alembic upgrade head

# run API
python -m uvicorn main:app --host 127.0.0.1 --port 8001 --reload
```

Backend runs at:

- `http://127.0.0.1:8001`

### 2) Frontend

Open a second terminal:

```powershell
cd frontend
npm install

# set API URL for the dev session
$env:VITE_API_URL="http://127.0.0.1:8001"

npm run dev -- --port 5173 --strictPort
```

Frontend runs at:

- `http://localhost:5173`

## Environment variables

### Backend

- `DATABASE_URL`
  - Local default: SQLite (`sqlite:///./sign_language_app.db`)
  - Render: Postgres internal URL
- `SECRET_KEY` (required for production)
- `FRONTEND_URL`
  - Example: `https://<your-netlify-site>.netlify.app`
- `CORS_ALLOW_ORIGINS` (comma-separated)
  - Example: `https://<your-netlify-site>.netlify.app`

Optional:

- `COOKIE_SECURE` (`true`/`false`)
- `COOKIE_SAMESITE` (`none`/`lax`)

### Frontend

- `VITE_API_URL`
  - Local: `http://127.0.0.1:8001`
  - Production: `https://<your-render-backend>.onrender.com`

## Deployment

### Backend on Render (recommended: Docker)

This repo includes:

- `render.yaml` Blueprint
- `backend/Dockerfile`

Why Docker? Render’s native Python runtime may use Python 3.14, which can crash with SQLAlchemy typing.
Docker pins Python to a compatible version.

Steps:

1. Push latest code to GitHub.
2. Render Dashboard → New → **Blueprint** → select this repo.
3. Apply. Render will create:
   - a Docker web service
   - a managed Postgres database
4. After deploy, set/verify environment variables on the Render service:
   - `FRONTEND_URL`
   - `CORS_ALLOW_ORIGINS`
5. Confirm health:
   - `GET /` returns `{"success": true, ...}`

### Frontend on Netlify

1. Netlify → Add new site → Import from Git.
2. Select repo.
3. Build settings:
   - Base directory: `frontend`
   - Build command: `npm run build`
   - Publish directory: `dist`
4. Set environment variable:
   - `VITE_API_URL=https://<your-render-backend>.onrender.com`
5. Deploy.

After Netlify deploy, update Render env vars:

- `FRONTEND_URL=https://<your-netlify-site>.netlify.app`
- `CORS_ALLOW_ORIGINS=https://<your-netlify-site>.netlify.app`

## Notes

- If your local SQLite DB is old, you may need to run Alembic migrations to update schema.
- In CI, the backend can run with `E2E_STUB_MODE=1` to avoid heavy ML initialization.