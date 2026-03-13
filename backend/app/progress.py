from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import desc, func, select
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.deps import get_db
from app.models import GestureHistory, Lesson, User, UserProgress, UserStats

router = APIRouter(prefix="/progress", tags=["progress"])


class ProgressUpdateRequest(BaseModel):
    accuracy: float


def _utc_today_date() -> datetime.date:
    return datetime.now(UTC).date()


def _calc_badges(db: Session, user_id: int, stats: UserStats) -> list[str]:
    badges: list[str] = []

    completed_count = db.scalar(
        select(func.count()).select_from(UserProgress).where(UserProgress.user_id == user_id, UserProgress.completed.is_(True))
    )
    if completed_count and completed_count >= 1:
        badges.append("First Sign")

    alphabet_completed = db.scalar(
        select(func.count())
        .select_from(UserProgress)
        .join(Lesson, Lesson.id == UserProgress.lesson_id)
        .where(
            UserProgress.user_id == user_id,
            UserProgress.completed.is_(True),
            Lesson.level == "beginner",
            Lesson.category == "alphabet",
        )
    )
    if alphabet_completed and alphabet_completed >= 26:
        badges.append("Alphabet Hero")

    if stats.current_streak >= 7:
        badges.append("Week Warrior")

    return badges


@router.get("")
def get_progress(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    stats = db.get(UserStats, user.id)
    if not stats:
        stats = UserStats(user_id=user.id)
        db.add(stats)
        db.commit()
        db.refresh(stats)

    completed = db.scalars(
        select(UserProgress).where(UserProgress.user_id == user.id, UserProgress.completed.is_(True))
    ).all()

    completed_lessons = [
        {
            "lesson_id": p.lesson_id,
            "completed_at": p.completed_at.isoformat() if p.completed_at else None,
            "accuracy": p.accuracy,
        }
        for p in completed
    ]

    accuracy_by_level = {
        "beginner": stats.avg_accuracy,
        "intermediate": stats.avg_accuracy,
        "advanced": stats.avg_accuracy,
    }

    recent_gestures = db.scalars(
        select(GestureHistory)
        .where(GestureHistory.user_id == user.id)
        .order_by(desc(GestureHistory.detected_at))
        .limit(10)
    ).all()

    recent = [
        {
            "gesture": g.gesture,
            "confidence": float(g.confidence),
            "detected_at": g.detected_at.isoformat(),
        }
        for g in recent_gestures
    ]

    badges = _calc_badges(db, user.id, stats)

    return {
        "success": True,
        "data": {
            "completed_lessons": completed_lessons,
            "accuracy_by_level": accuracy_by_level,
            "current_streak": stats.current_streak,
            "longest_streak": stats.longest_streak,
            "total_xp": stats.total_xp,
            "recent_gestures": recent,
            "badges_earned": badges,
        },
    }


@router.post("/update")
def update_progress(payload: ProgressUpdateRequest, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    stats = db.get(UserStats, user.id)
    if not stats:
        stats = UserStats(user_id=user.id)
        db.add(stats)
        db.commit()
        db.refresh(stats)

    # Accuracy tracking
    stats.accuracy_sum += float(payload.accuracy)
    stats.accuracy_count += 1
    stats.avg_accuracy = stats.accuracy_sum / stats.accuracy_count if stats.accuracy_count else 0.0

    # Streak logic based on last_active
    today = _utc_today_date()
    last = user.last_active.date() if user.last_active else None

    if last is None:
        stats.current_streak = 1
    elif last == today:
        stats.current_streak = stats.current_streak or 1
    elif last == (today - timedelta(days=1)):
        stats.current_streak += 1
    else:
        stats.current_streak = 1

    if stats.current_streak > stats.longest_streak:
        stats.longest_streak = stats.current_streak

    user.last_active = datetime.now(UTC).replace(tzinfo=None)

    db.add_all([stats, user])
    db.commit()

    return {"success": True, "data": {"avg_accuracy": stats.avg_accuracy, "current_streak": stats.current_streak}}


@router.get("/leaderboard")
def leaderboard(db: Session = Depends(get_db)):
    rows = db.scalars(select(UserStats).order_by(UserStats.total_xp.desc()).limit(10)).all()
    users = []
    for s in rows:
        u = db.get(User, s.user_id)
        if not u:
            continue
        users.append({"name": u.name, "total_xp": s.total_xp, "current_streak": s.current_streak})

    return {"success": True, "data": users}
