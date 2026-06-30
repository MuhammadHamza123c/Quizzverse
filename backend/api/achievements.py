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
    "half_century": {
        "id": "half_century",
        "name": "Half Century",
        "description": "Complete 50 quizzes",
        "icon": "🏆",
        "target": 50,
        "type": "progress",
    },
    "on_fire": {
        "id": "on_fire",
        "name": "On Fire",
        "description": "Complete 3 quizzes",
        "icon": "🔥",
        "target": 3,
        "type": "progress",
    },
    "double_digit": {
        "id": "double_digit",
        "name": "Double Digits",
        "description": "Score 10 or more on any quiz",
        "icon": "🔟",
        "type": "boolean",
    },
    "flashcard_fanatic": {
        "id": "flashcard_fanatic",
        "name": "Flashcard Fanatic",
        "description": "Review 10 flashcards",
        "icon": "🃏",
        "target": 10,
        "type": "progress",
    },
    "card_collector": {
        "id": "card_collector",
        "name": "Card Collector",
        "description": "Review 25 flashcards",
        "icon": "📇",
        "target": 25,
        "type": "progress",
    },
    "deck_master": {
        "id": "deck_master",
        "name": "Deck Master",
        "description": "Review 100 flashcards",
        "icon": "📚",
        "target": 100,
        "type": "progress",
    },
    "document_scholar": {
        "id": "document_scholar",
        "name": "Document Scholar",
        "description": "Generate a quiz from a document",
        "icon": "📄",
        "type": "boolean",
    },
    "paper_trail": {
        "id": "paper_trail",
        "name": "Paper Trail",
        "description": "Generate quizzes from 5 documents",
        "icon": "📑",
        "target": 5,
        "type": "progress",
    },
    "room_champion": {
        "id": "room_champion",
        "name": "Room Champion",
        "description": "Win a multiplayer room",
        "icon": "👑",
        "type": "boolean",
    },
    "crowd_favorite": {
        "id": "crowd_favorite",
        "name": "Crowd Favorite",
        "description": "Win 3 multiplayer rooms",
        "icon": "⭐",
        "target": 3,
        "type": "progress",
    },
    "legend": {
        "id": "legend",
        "name": "Legend",
        "description": "Win 10 multiplayer rooms",
        "icon": "💎",
        "target": 10,
        "type": "progress",
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

        # half_century (progress)
        if badges["half_century"].get("type") != "progress":
            badges["half_century"]["progress"] = badges["half_century"].get("progress", 0)
            badges["half_century"]["target"] = 50
        badges["half_century"]["progress"] += 1
        if badges["half_century"]["progress"] >= 50 and not badges["half_century"].get("earned"):
            badges["half_century"] = {"earned": True, "earned_at": datetime.now(timezone.utc).isoformat()}
            newly_earned.append("half_century")

        # on_fire (progress)
        if badges["on_fire"].get("type") != "progress":
            badges["on_fire"]["progress"] = badges["on_fire"].get("progress", 0)
            badges["on_fire"]["target"] = 3
        badges["on_fire"]["progress"] += 1
        if badges["on_fire"]["progress"] >= 3 and not badges["on_fire"].get("earned"):
            badges["on_fire"] = {"earned": True, "earned_at": datetime.now(timezone.utc).isoformat()}
            newly_earned.append("on_fire")

        # double_digit (boolean)
        if score >= 10 and not badges["double_digit"]["earned"]:
            badges["double_digit"] = {"earned": True, "earned_at": datetime.now(timezone.utc).isoformat()}
            newly_earned.append("double_digit")

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

        # card_collector (progress)
        if count >= 25 and not badges["card_collector"].get("earned"):
            badges["card_collector"] = {"earned": True, "earned_at": datetime.now(timezone.utc).isoformat()}
            newly_earned.append("card_collector")

        # deck_master (progress)
        if count >= 100 and not badges["deck_master"].get("earned"):
            badges["deck_master"] = {"earned": True, "earned_at": datetime.now(timezone.utc).isoformat()}
            newly_earned.append("deck_master")

    elif req.event == "document_quiz":
        if not badges["document_scholar"]["earned"]:
            badges["document_scholar"] = {"earned": True, "earned_at": datetime.now(timezone.utc).isoformat()}
            newly_earned.append("document_scholar")

        # paper_trail (progress)
        if badges["paper_trail"].get("type") != "progress":
            badges["paper_trail"]["progress"] = badges["paper_trail"].get("progress", 0)
            badges["paper_trail"]["target"] = 5
        badges["paper_trail"]["progress"] += 1
        if badges["paper_trail"]["progress"] >= 5 and not badges["paper_trail"].get("earned"):
            badges["paper_trail"] = {"earned": True, "earned_at": datetime.now(timezone.utc).isoformat()}
            newly_earned.append("paper_trail")

    elif req.event == "room_won":
        if not badges["room_champion"]["earned"]:
            badges["room_champion"] = {"earned": True, "earned_at": datetime.now(timezone.utc).isoformat()}
            newly_earned.append("room_champion")

        # crowd_favorite (progress)
        if badges["crowd_favorite"].get("type") != "progress":
            badges["crowd_favorite"]["progress"] = badges["crowd_favorite"].get("progress", 0)
            badges["crowd_favorite"]["target"] = 3
        badges["crowd_favorite"]["progress"] += 1
        if badges["crowd_favorite"]["progress"] >= 3 and not badges["crowd_favorite"].get("earned"):
            badges["crowd_favorite"] = {"earned": True, "earned_at": datetime.now(timezone.utc).isoformat()}
            newly_earned.append("crowd_favorite")

        # legend (progress)
        if badges["legend"].get("type") != "progress":
            badges["legend"]["progress"] = badges["legend"].get("progress", 0)
            badges["legend"]["target"] = 10
        badges["legend"]["progress"] += 1
        if badges["legend"]["progress"] >= 10 and not badges["legend"].get("earned"):
            badges["legend"] = {"earned": True, "earned_at": datetime.now(timezone.utc).isoformat()}
            newly_earned.append("legend")

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
