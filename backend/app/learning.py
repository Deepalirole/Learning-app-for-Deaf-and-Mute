import random
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, Request
from fastapi.responses import JSONResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.deps import get_db
from app.models import Lesson, User, UserProgress, UserStats

router = APIRouter(prefix="/learn", tags=["learn"])


LEVELS = [
    {"key": "beginner", "title": "Level 1 - Alphabet"},
    {"key": "intermediate", "title": "Level 2 - Words"},
    {"key": "advanced", "title": "Level 3 - Phrases"},
]


def seed_lessons(db: Session) -> None:
    existing = db.scalar(select(Lesson.id).limit(1))
    if existing is not None:
        return

    placeholder_img = "https://res.cloudinary.com/demo/image/upload/sample.jpg"
    placeholder_gif = "https://res.cloudinary.com/demo/image/upload/sample.gif"

    lessons: list[Lesson] = []

    # Level 1 - Alphabet A-Z
    for idx, letter in enumerate("ABCDEFGHIJKLMNOPQRSTUVWXYZ", start=1):
        lessons.append(
            Lesson(
                title=letter,
                level="beginner",
                category="alphabet",
                sign_image_url=placeholder_img,
                sign_gif_url=placeholder_gif,
                description=f"Sign for {letter}",
                xp_reward=10,
                landmark_hint="",
                order_index=idx,
            )
        )

    # Level 2 - Common Words
    words = [
        "Hello",
        "Thank You",
        "Please",
        "Sorry",
        "Yes",
        "No",
        "Help",
        "Water",
        "Food",
        "Love",
    ]
    for idx, word in enumerate(words, start=1):
        lessons.append(
            Lesson(
                title=word,
                level="intermediate",
                category="words",
                sign_image_url=placeholder_img,
                sign_gif_url=placeholder_gif,
                description=f"Sign for {word}",
                xp_reward=20,
                landmark_hint="",
                order_index=idx,
            )
        )

    # Level 3 - Phrases
    phrases = [
        "How are you",
        "Good morning",
        "Nice to meet you",
        "Good night",
        "See you later",
    ]
    for idx, phrase in enumerate(phrases, start=1):
        lessons.append(
            Lesson(
                title=phrase,
                level="advanced",
                category="phrases",
                sign_image_url=placeholder_img,
                sign_gif_url=placeholder_gif,
                description=f"Sign for {phrase}",
                xp_reward=30,
                landmark_hint="",
                order_index=idx,
            )
        )

    db.add_all(lessons)
    db.commit()


@router.get("/levels")
def get_levels(db: Session = Depends(get_db)):
    seed_lessons(db)
    return {"success": True, "data": [{"level": l["key"], "title": l["title"]} for l in LEVELS]}


@router.get("/lessons/{level}")
def get_lessons(level: str, category: str | None = None, db: Session = Depends(get_db)):
    seed_lessons(db)

    stmt = select(Lesson).where(Lesson.level == level)
    if category:
        stmt = stmt.where(Lesson.category == category)

    items = db.scalars(stmt.order_by(Lesson.order_index.asc(), Lesson.id.asc())).all()
    data = [
        {
            "id": l.id,
            "title": l.title,
            "level": l.level,
            "category": l.category,
            "gif_url": l.sign_gif_url,
            "description": l.description,
            "xp_reward": l.xp_reward,
        }
        for l in items
    ]
    return {"success": True, "data": data}


@router.get("/lesson/{lesson_id}")
def get_lesson_detail(lesson_id: int, db: Session = Depends(get_db)):
    seed_lessons(db)

    lesson = db.get(Lesson, lesson_id)
    if not lesson:
        return JSONResponse(status_code=404, content={"error": True, "message": "Lesson not found"})

    return {
        "success": True,
        "data": {
            "id": lesson.id,
            "title": lesson.title,
            "level": lesson.level,
            "category": lesson.category,
            "sign_image_url": lesson.sign_image_url,
            "sign_gif_url": lesson.sign_gif_url,
            "description": lesson.description,
            "xp_reward": lesson.xp_reward,
            "landmark_hint": lesson.landmark_hint,
        },
    }


@router.get("/quiz/{level}")
def get_quiz(level: str, db: Session = Depends(get_db)):
    seed_lessons(db)

    lessons = db.scalars(select(Lesson).where(Lesson.level == level)).all()
    if not lessons:
        return {"success": True, "data": []}

    sample = random.sample(lessons, k=min(5, len(lessons)))
    all_titles = [l.title for l in lessons]

    questions = []
    for l in sample:
        distractors = [t for t in all_titles if t != l.title]
        random.shuffle(distractors)
        options = [l.title] + distractors[:3]
        random.shuffle(options)

        questions.append(
            {
                "lesson_id": l.id,
                "prompt_gif_url": l.sign_gif_url,
                "options": options,
                "correct_answer": l.title,
            }
        )

    return {"success": True, "data": questions}


@router.post("/complete/{lesson_id}")
def complete_lesson(
    lesson_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    seed_lessons(db)

    lesson = db.get(Lesson, lesson_id)
    if not lesson:
        return JSONResponse(status_code=404, content={"error": True, "message": "Lesson not found"})

    progress = db.scalar(
        select(UserProgress).where(UserProgress.user_id == user.id, UserProgress.lesson_id == lesson_id)
    )

    if not progress:
        progress = UserProgress(user_id=user.id, lesson_id=lesson_id, completed=False, attempts=0)
        db.add(progress)
        db.flush()

    awarded = False
    if not progress.completed:
        progress.completed = True
        progress.completed_at = datetime.now(UTC).replace(tzinfo=None)
        awarded = True

        stats = db.get(UserStats, user.id)
        if stats:
            stats.total_xp += int(lesson.xp_reward)
            stats.total_lessons += 1

    db.add(progress)
    db.commit()

    return {"success": True, "data": {"awarded": awarded, "xp": lesson.xp_reward}}
