from contextlib import asynccontextmanager

import os

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.exc import OperationalError
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

from app.detection import router as detect_router
from app.chatbot import router as chatbot_router
from app.gesture_classifier import TFLiteGestureClassifier
from app.hand_detector import MediaPipeHandDetector
from app.learning import router as learn_router
from app.learning import seed_lessons
from app.progress import router as progress_router
from app.rate_limiter import limiter

from app.auth import router as auth_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.model_init_count = 0

    if os.getenv("E2E_STUB_MODE") == "1":
        class _StubDetector:
            def initialize(self):
                return None

            def extract_landmarks(self, rgb):
                return [[{"x": 0.1, "y": 0.2, "z": 0.0} for _ in range(21)]]

        class _StubClassifier:
            def initialize(self):
                return None

            def classify(self, hands):
                return "A", 0.91

        detector = _StubDetector()
        classifier = _StubClassifier()
    else:
        detector = MediaPipeHandDetector()
        detector.initialize()
        classifier = TFLiteGestureClassifier()
        classifier.initialize()

    app.state.hand_detector = detector
    app.state.gesture_classifier = classifier
    app.state.model_init_count += 1

    print("Model initialization complete")

    from app import db as db_module

    if db_module.SessionLocal is not None:
        with db_module.SessionLocal() as db:
            try:
                seed_lessons(db)
            except OperationalError:
                pass

    yield


app = FastAPI(title="SignLearn AI Platform API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.getenv("FRONTEND_URL", "https://signlearnapi.netlify.app")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.state.limiter = limiter
app.add_middleware(SlowAPIMiddleware)


@app.exception_handler(RateLimitExceeded)
def rate_limit_handler(request: Request, exc: RateLimitExceeded):
    return _rate_limit_exceeded_handler(request, exc)


app.include_router(auth_router)
app.include_router(detect_router)
app.include_router(learn_router)
app.include_router(progress_router)
app.include_router(chatbot_router)


@app.get("/")
def root():
    return {"success": True, "data": {"message": "API running"}}
