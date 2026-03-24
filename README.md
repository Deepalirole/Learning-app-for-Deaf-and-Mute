# 🤟 SignLearn AI — Sign Language Learning Platform

<div align="center">

![SignLearn AI Banner](https://img.shields.io/badge/SignLearn-AI%20Platform-6366F1?style=for-the-badge&logo=hand&logoColor=white)

[![Live Demo](https://img.shields.io/badge/🌐%20Live%20Demo-signlearnapi.netlify.app-10B981?style=for-the-badge)](https://signlearnapi.netlify.app)
[![Backend](https://img.shields.io/badge/⚙️%20Backend-Render.com-6366F1?style=for-the-badge)](https://learning-app-for-deaf-and-mute.onrender.com/docs)
[![CI](https://github.com/Deepalirole/Learning-app-for-Deaf-and-Mute/actions/workflows/ci.yml/badge.svg)](https://github.com/Deepalirole/Learning-app-for-Deaf-and-Mute/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](LICENSE)

**An AI-powered accessibility platform that helps deaf and mute users communicate and learn sign language interactively using real-time computer vision.**

[🌐 Live Demo](https://signlearnapi.netlify.app) · [📖 API Docs](https://learning-app-for-deaf-and-mute.onrender.com/docs) · [🐛 Report Bug](https://github.com/Deepalirole/Learning-app-for-Deaf-and-Mute/issues) · [✨ Request Feature](https://github.com/Deepalirole/Learning-app-for-Deaf-and-Mute/issues)

</div>

---

## 📋 Table of Contents

- [About The Project](#about-the-project)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [System Architecture](#system-architecture)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [API Documentation](#api-documentation)
- [Deployment](#deployment)
- [CI/CD Pipeline](#cicd-pipeline)
- [Contributing](#contributing)
- [Contact](#contact)

---

## 🎯 About The Project

SignLearn AI is a full-stack web application built to bridge communication gaps for the **70 million deaf and hard-of-hearing individuals** worldwide. The platform uses computer vision and AI to:

- Detect hand gestures in real-time via camera
- Convert sign language to text and speech
- Teach sign language through interactive lessons
- Track learning progress with analytics

> 💡 Built entirely on **FREE platforms** — zero cost to run or use.

---

## ✨ Features

### 🎥 Real-Time Gesture Detection
- Camera-based hand gesture recognition using MediaPipe
- Supports both laptop and mobile cameras (front/rear toggle)
- Converts detected signs to text + speech (gTTS)
- Confidence score display for each detection

### 📚 Structured Learning Path
- **Level 1:** Alphabet (A-Z) — 26 lessons
- **Level 2:** Common Words — 10 lessons (Hello, Thank You, etc.)
- **Level 3:** Phrases — 5 lessons
- Animated GIF demonstrations for each sign
- Quiz mode after each lesson

### 🎮 Gamified Practice Mode
- Real-time camera-based sign validation
- XP points, learning streaks, and badges
- Three difficulty levels (Beginner/Intermediate/Advanced)
- Session summaries with accuracy scores

### 📊 Interactive Dashboard
- Weekly progress charts
- Accuracy trend analytics
- Learning streak tracker
- Leaderboard (top 10 users)
- Badge collection display

### 🤖 AI Chatbot Support
- Powered by Google Gemini API
- Answers questions about lessons and app usage
- Available on all pages as floating widget

### 🔐 Secure Authentication
- JWT-based authentication
- Password reset via Gmail SMTP
- bcrypt password hashing
- Rate limiting on sensitive endpoints

### ♿ Accessibility First
- High contrast mode
- Font size controls
- Full keyboard navigation
- ARIA labels throughout
- WCAG AA compliant (4.5:1 contrast ratio)

---

## 🛠️ Tech Stack

### Frontend
| Technology | Purpose |
|-----------|---------|
| React 18 + Vite | UI Framework + Build Tool |
| TailwindCSS | Styling |
| Framer Motion | Animations |
| Recharts | Dashboard Charts |
| Axios | HTTP Client |
| React Router v6 | Client-side Routing |
| Zustand | State Management |
| React Hook Form | Form Validation |

### Backend
| Technology | Purpose |
|-----------|---------|
| FastAPI | Web Framework |
| Python 3.12 | Language |
| SQLAlchemy 2.0 | ORM |
| Alembic | Database Migrations |
| PostgreSQL | Database |
| PyJWT | Authentication Tokens |
| bcrypt | Password Hashing |
| MediaPipe | Hand Detection |
| TensorFlow | Gesture Classification |
| gTTS | Text-to-Speech |
| slowapi | Rate Limiting |

### Infrastructure (All Free)
| Service | Purpose |
|---------|---------|
| Netlify | Frontend Hosting |
| Render.com | Backend Hosting (Docker) |
| Render PostgreSQL | Database |
| Cloudinary | Media Storage |
| Gmail SMTP | Email Service |
| Google Gemini API | AI Chatbot |
| GitHub Actions | CI/CD Pipeline |
| Docker | Containerization |

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────┐
│         User (Browser / Mobile)          │
└──────────────────┬──────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────┐
│      React Frontend (Netlify CDN)        │
│  React + Vite + TailwindCSS             │
└──────────────────┬──────────────────────┘
                   │ HTTPS REST API
                   ▼
┌─────────────────────────────────────────┐
│    FastAPI Backend (Render - Docker)     │
│                                         │
│  ┌──────────────┐  ┌─────────────────┐  │
│  │ Auth Service │  │ Gesture Service │  │
│  │ JWT + bcrypt │  │ MediaPipe + TF  │  │
│  └──────────────┘  └─────────────────┘  │
│  ┌──────────────┐  ┌─────────────────┐  │
│  │ Learn Module │  │ Chatbot Service │  │
│  │ Progress API │  │ Gemini API      │  │
│  └──────────────┘  └─────────────────┘  │
└──────────────────┬──────────────────────┘
                   │
         ┌─────────┴──────────┐
         ▼                    ▼
┌─────────────────┐  ┌─────────────────┐
│   PostgreSQL    │  │   Cloudinary    │
│ (Render DB)     │  │ (Media Storage) │
└─────────────────┘  └─────────────────┘
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- Python 3.12+
- Git

### 1. Clone the Repository
```bash
git clone https://github.com/Deepalirole/Learning-app-for-Deaf-and-Mute.git
cd Learning-app-for-Deaf-and-Mute
```

### 2. Backend Setup
```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Copy environment variables
cp .env.example .env
# Fill in your values in .env

# Run database migrations
alembic upgrade head

# Start backend server
uvicorn main:app --reload
# Backend runs at http://localhost:8000
# API docs at http://localhost:8000/docs
```

### 3. Frontend Setup
```bash
cd frontend

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env
# Add VITE_API_URL=http://localhost:8000

# Start frontend
npm run dev
# Frontend runs at http://localhost:5173
```

---

## 🔐 Environment Variables

### Backend `.env` 
```env
DATABASE_URL=postgresql://user:password@host/dbname
SECRET_KEY=your-super-secret-key-here
GMAIL_USER=deepalirole@gmail.com
GMAIL_APP_PASSWORD=your-gmail-app-password
GEMINI_API_KEY=your-gemini-api-key
CLOUDINARY_URL=cloudinary://api_key:api_secret@cloud_name
FRONTEND_URL=http://localhost:5173
```

### Frontend `.env` 
```env
VITE_API_URL=http://localhost:8000
```

> ⚠️ Never commit `.env` files. Use `.env.example` as template.

---

## 📡 API Documentation

Full interactive API documentation available at:
```
http://localhost:8000/docs        (local)
https://learning-app-for-deaf-and-mute.onrender.com/docs  (production)
```

### Key Endpoints

#### Authentication
```
POST /auth/signup          → Register new user
POST /auth/login           → Login, get JWT token
POST /auth/forgot-password → Send password reset email
POST /auth/reset-password  → Reset password with token
GET  /auth/profile         → Get user profile [Protected]
```

#### Gesture Detection
```
POST /detect               → Detect sign from base64 image [Protected]
GET  /detect/speech/{sign} → Get audio for sign
```

#### Learning
```
GET  /learn/levels         → Get all learning levels
GET  /learn/lessons/{level}→ Get lessons for level
GET  /learn/lesson/{id}    → Get lesson detail
GET  /learn/quiz/{level}   → Get 5 quiz questions
POST /learn/complete/{id}  → Mark lesson complete [Protected]
```

#### Progress
```
GET  /progress             → Get user stats [Protected]
POST /progress/update      → Update practice stats [Protected]
GET  /progress/leaderboard → Top 10 users by XP
```

#### Chatbot
```
POST /chatbot/message      → Send message to AI chatbot
```

---

## 🗄️ Database Schema

```sql
users           → id, email, hashed_password, name, 
                  created_at, last_active, reset_token
                  
lessons         → id, title, level, category, 
                  sign_image_url, sign_gif_url, 
                  description, xp_reward, order_index

user_progress   → id, user_id, lesson_id, completed,
                  accuracy, attempts, completed_at

gesture_history → id, user_id, gesture, confidence,
                  detected_at

user_stats      → user_id, total_lessons, current_streak,
                  longest_streak, total_xp, avg_accuracy
```

---

## 🚢 Deployment

### Frontend — Netlify
```bash
# Automatic deployment from GitHub
# Build settings:
Base directory:  frontend
Build command:   npm run build
Publish dir:     frontend/dist

# Environment variable:
VITE_API_URL = https://learning-app-for-deaf-and-mute.onrender.com
```

### Backend — Render (Docker)
```bash
# render.yaml handles configuration
# Environment variables to set on Render:
DATABASE_URL      = postgresql://...
SECRET_KEY        = ...
GMAIL_USER        = deepalirole@gmail.com
GMAIL_APP_PASSWORD= ...
GEMINI_API_KEY    = ...
CLOUDINARY_URL    = cloudinary://...
FRONTEND_URL      = https://signlearnapi.netlify.app
```

### Docker
```bash
# Build image locally
cd backend
docker build -t signlearn-api .

# Run container
docker run -p 8000:8000 --env-file .env signlearn-api
```

---

## ⚙️ CI/CD Pipeline

GitHub Actions automatically runs on every push to `main`:

```yaml
Jobs:
  ✅ Backend (pytest)   → Runs all Python tests
  ✅ Frontend (vitest)  → Runs all React tests
  
If both pass → Render auto-deploys new version
If either fails → Deployment blocked
```

### Running Tests Locally
```bash
# Backend tests
cd backend
pytest tests/ -v

# Frontend tests
cd frontend
npm run test
```

---

## 📊 Performance Metrics

| Metric | Value |
|--------|-------|
| Gesture detection latency | ~400ms |
| API response time | ~200ms |
| Camera frame rate | 15 fps |
| Frontend load time | ~1.5s |
| CI/CD pipeline duration | ~50s |
| Average gesture confidence | 85-94% |

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create your feature branch
   ```bash
   git checkout -b feature/AmazingFeature
   ```
3. Commit your changes
   ```bash
   git commit -m 'Add some AmazingFeature'
   ```
4. Push to the branch
   ```bash
   git push origin feature/AmazingFeature
   ```
5. Open a Pull Request

### Development Guidelines
- Run tests before submitting PR
- Follow existing code style
- Update documentation for new features
- Add tests for new functionality

---

## 🗺️ Roadmap

- [ ] Real-time WebSocket gesture detection
- [ ] LSTM model for motion signs (J, Z)
- [ ] Sentence generation using LLM
- [ ] Indian Sign Language (ISL) support
- [ ] British Sign Language (BSL) support
- [ ] Offline mode with service workers
- [ ] React Native mobile app
- [ ] Multi-language UI support

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

---

## 📞 Contact

**Deepali**
- 📧 Email: [deepalirole@gmail.com](mailto:deepalirole@gmail.com)
- 🌐 Live App: [signlearnapi.netlify.app](https://signlearnapi.netlify.app)
- 💻 GitHub: [@Deepalirole](https://github.com/Deepalirole)

---

## 🙏 Acknowledgements

- [MediaPipe](https://mediapipe.dev/) — Hand landmark detection
- [FastAPI](https://fastapi.tiangolo.com/) — Modern Python web framework
- [Google Gemini](https://ai.google.dev/) — AI chatbot capability
- [gTTS](https://gtts.readthedocs.io/) — Text to speech conversion
- [Netlify](https://netlify.com/) — Frontend hosting
- [Render](https://render.com/) — Backend hosting

---

<div align="center">

**Built with ❤️ for the Deaf and Mute Community**

⭐ Star this repo if you found it helpful!

</div>