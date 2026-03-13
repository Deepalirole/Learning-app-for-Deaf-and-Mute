import base64
import io
import os
import tempfile
from datetime import UTC, datetime

import numpy as np
from fastapi import APIRouter, BackgroundTasks, Depends, Request
from fastapi.responses import FileResponse
from gtts import gTTS
from PIL import Image
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.deps import get_db
from app.models import GestureHistory, User
from app.rate_limiter import limiter

router = APIRouter(prefix="/detect", tags=["detect"])


def _envelope(payload: dict) -> dict:
    # Backward compatible: keep existing top-level keys while adding success/data wrapper.
    return {"success": True, "data": payload, **payload}


def _decode_base64_image(data: str) -> Image.Image:
    if "," in data:
        data = data.split(",", 1)[1]
    raw = base64.b64decode(data)
    return Image.open(io.BytesIO(raw)).convert("RGB")


def _image_to_numpy(img: Image.Image) -> np.ndarray:
    return np.array(img)


def _cleanup_file(path: str) -> None:
    try:
        os.remove(path)
    except OSError:
        pass


@router.post("")
@limiter.limit("30/minute")
def detect(
    payload: dict,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    frame_b64 = payload.get("frame") or payload.get("image")
    if not frame_b64:
        return _envelope({"gesture": None, "confidence": 0.0, "message": "No hand detected"})

    try:
        img = _decode_base64_image(frame_b64)
    except Exception:
        return _envelope({"gesture": None, "confidence": 0.0, "message": "No hand detected"})

    detector = getattr(request.app.state, "hand_detector", None)
    classifier = getattr(request.app.state, "gesture_classifier", None)

    if not detector:
        return _envelope({"gesture": None, "confidence": 0.0, "message": "No hand detected"})

    np_img = _image_to_numpy(img)
    hands = detector.extract_landmarks(np_img)
    if not hands:
        return _envelope({"gesture": None, "confidence": 0.0, "message": "No hand detected"})

    gesture = None
    confidence = 0.0

    if classifier:
        gesture, confidence = classifier.classify(hands)

    if not gesture or confidence < 0.75:
        return _envelope({"gesture": None, "confidence": float(confidence), "message": "No clear sign detected"})

    gh = GestureHistory(
        user_id=user.id,
        gesture=gesture,
        confidence=float(confidence),
        detected_at=datetime.now(UTC).replace(tzinfo=None),
    )
    db.add(gh)
    db.commit()

    landmarks = hands[0]
    return _envelope({"gesture": gesture, "confidence": float(confidence), "landmarks": landmarks})


@router.get("/speech/{gesture}")
def speech(gesture: str, background_tasks: BackgroundTasks):
    fd, path = tempfile.mkstemp(suffix=".mp3")
    os.close(fd)

    tts = gTTS(text=gesture, lang="en")
    tts.save(path)

    background_tasks.add_task(_cleanup_file, path)
    return FileResponse(path, media_type="audio/mpeg", filename="speech.mp3")
