from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from api.dependencies import get_current_user
from db.supabase_client import supabase
from datetime import datetime, timezone
import json
import uuid

router = APIRouter(prefix="/api/achievements", tags=["Achievements"])

BADGE_DEFS = {
    "first_quiz": {
        "id": "first_quiz",
        "name": "First Steps",
        "description": "Complete your first quiz",
        "icon": "🎯",
        "type": "boolean",
    },
    "perfect_score": {
        "id": "perfect_score",
        "name": "Perfect Score",
        "description": "Get 100% on any quiz",
        "icon": "💯",
        "type": "boolean",
    },
    "quiz_master": {
        "id": "quiz_master",
        "name": "Quiz Master",
        "description": "Complete 10 quizzes",
        "icon": "🎓",
        "target": 10,
        "type": "progress",
    },
    "flashcard_fanatic": {
        "id": "flashcard_fanatic",
        "name": "Flashcard Fanatic",
        "description": "Review 10 flashcards",
        "icon": "🃏",
        "target": 10,
        "type": "progress",
    },
    "document_scholar": {
        "id": "document_scholar",
        "name": "Document Scholar",
        "description": "Generate a quiz from a document",
        "icon": "📄",
        "type": "boolean",
    },
    "room_champion": {
        "id": "room_champion",
        "name": "Room Champion",
        "description": "Win a multiplayer room",
        "icon": "👑",
        "type": "boolean",
    },
}


def _default_achievements():
    return {
        bid: {"earned": False, "progress": 0, "target": b.get("target", 1)}
        for bid, b in BADGE_DEFS.items()
    }


def _get_file_path(user_id: str) -> str:
    return f"{user_id}.json"


def _load(user_id: str) -> dict:
    try:
        data = supabase.storage.from_("achievements").download(_get_file_path(user_id))
        return json.loads(data.decode())
    except Exception:
        return _default_achievements()


def _save(user_id: str, data: dict):
    path = _get_file_path(user_id)
    try:
        supabase.storage.from_("achievements").update(
            path, json.dumps(data).encode(), {"content-type": "application/json"}
        )
    except Exception:
        supabase.storage.from_("achievements").upload(
            path, json.dumps(data).encode(), {"content-type": "application/json"}
        )


class CheckRequest(BaseModel):
    event: str
    data: dict = {}


@router.post("/check")
async def check_achievements(req: CheckRequest, user=Depends(get_current_user)):
    badges = _load(user.id)
    newly_earned = []

    if req.event == "quiz_complete":
        d = req.data
        score = d.get("score", 0)
        total = d.get("total_questions", 1)

        # first_quiz
        if not badges["first_quiz"]["earned"]:
            badges["first_quiz"] = {"earned": True, "earned_at": datetime.now(timezone.utc).isoformat()}
            newly_earned.append("first_quiz")

        # perfect_score
        if score == total and total > 0:
            if not badges["perfect_score"]["earned"]:
                badges["perfect_score"] = {"earned": True, "earned_at": datetime.now(timezone.utc).isoformat()}
                newly_earned.append("perfect_score")

        # quiz_master (progress)
        if badges["quiz_master"].get("type") != "progress":
            badges["quiz_master"]["progress"] = badges["quiz_master"].get("progress", 0)
            badges["quiz_master"]["target"] = 10
        badges["quiz_master"]["progress"] += 1
        if badges["quiz_master"]["progress"] >= 10 and not badges["quiz_master"].get("earned"):
            badges["quiz_master"] = {"earned": True, "earned_at": datetime.now(timezone.utc).isoformat()}
            newly_earned.append("quiz_master")

    elif req.event == "flashcard_reviewed":
        d = req.data
        count = d.get("total_reviewed", 1)
        if badges["flashcard_fanatic"].get("type") != "progress":
            badges["flashcard_fanatic"]["progress"] = badges["flashcard_fanatic"].get("progress", 0)
            badges["flashcard_fanatic"]["target"] = 10
        badges["flashcard_fanatic"]["progress"] = count
        if count >= 10 and not badges["flashcard_fanatic"].get("earned"):
            badges["flashcard_fanatic"] = {"earned": True, "earned_at": datetime.now(timezone.utc).isoformat()}
            newly_earned.append("flashcard_fanatic")

    elif req.event == "document_quiz":
        if not badges["document_scholar"]["earned"]:
            badges["document_scholar"] = {"earned": True, "earned_at": datetime.now(timezone.utc).isoformat()}
            newly_earned.append("document_scholar")

    elif req.event == "room_won":
        if not badges["room_champion"]["earned"]:
            badges["room_champion"] = {"earned": True, "earned_at": datetime.now(timezone.utc).isoformat()}
            newly_earned.append("room_champion")

    _save(user.id, badges)

    earned_list = []
    for bid in newly_earned:
        b = dict(BADGE_DEFS[bid])
        b["earned_at"] = badges[bid].get("earned_at")
        earned_list.append(b)

    return {"new_achievements": earned_list}


@router.get("")
async def list_achievements(user=Depends(get_current_user)):
    badges = _load(user.id)
    result = []
    for bid, bd in BADGE_DEFS.items():
        entry = dict(bd)
        state = badges.get(bid, {})
        entry["earned"] = state.get("earned", False)
        if bd["type"] == "progress":
            entry["progress"] = state.get("progress", 0)
        if state.get("earned_at"):
            entry["earned_at"] = state["earned_at"]
        result.append(entry)
    return {"achievements": result}
