from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from db.supabase_client import supabase
from api.dependencies import get_current_user
from services.ai_service import generate_quiz, generate_quiz_from_text, generate_title_from_text, extract_fallback_title
import uuid
import random
import string

router = APIRouter(prefix="/api/rooms", tags=["Rooms"])

class CreateRoomRequest(BaseModel):
    topic: str
    num_questions: int = 5
    difficulty: str = "medium"
    time_per_question: int = 30
    video_enabled: bool = False

class CreateDocumentRoomRequest(BaseModel):
    document_id: str
    room_name: str
    num_questions: int = 5
    difficulty: str = "medium"
    time_per_question: int = 30
    video_enabled: bool = False

class JoinRoomRequest(BaseModel):
    room_code: str
    guest_name: str | None = None

def generate_room_code():
    return "".join(random.choices(string.ascii_uppercase + string.digits, k=6))

def get_user_display_name(user) -> str:
    full_name = None
    if getattr(user, "user_metadata", None):
        metadata = user.user_metadata
        if isinstance(metadata, dict):
            full_name = metadata.get("full_name") or metadata.get("fullName")
        elif hasattr(metadata, "get"):
            full_name = metadata.get("full_name") or metadata.get("fullName")

    if full_name:
        return full_name

    profile = supabase.table("profiles").select("full_name").eq("id", user.id).single().execute()
    if profile.data and profile.data.get("full_name"):
        return profile.data["full_name"]

    if getattr(user, "email", None):
        return user.email.split("@")[0]

    return "User"

@router.post("/create")
async def create_room(req: CreateRoomRequest, user=Depends(get_current_user)):
    questions_data = generate_quiz(req.topic, req.num_questions, req.difficulty)
    if not questions_data:
        raise HTTPException(500, "Failed to generate quiz questions")

    quiz_id = str(uuid.uuid4())
    supabase.table("quizzes").insert({
        "id": quiz_id,
        "title": f"{req.topic} Quiz",
        "topic": req.topic,
        "difficulty": req.difficulty,
        "created_by": user.id,
    }).execute()

    for i, q in enumerate(questions_data):
        supabase.table("questions").insert({
            "quiz_id": quiz_id,
            "question_text": q["question_text"],
            "question_type": q["question_type"],
            "options": q.get("options"),
            "correct_answer": q["correct_answer"],
            "explanation": q.get("explanation", ""),
            "order_index": i,
        }).execute()

    room_code = generate_room_code()
    while True:
        existing = supabase.table("rooms").select("id").eq("room_code", room_code).execute()
        if not existing.data:
            break
        room_code = generate_room_code()

    room_payload = {
        "room_code": room_code,
        "quiz_id": quiz_id,
        "host_id": user.id,
        "settings": {"time_per_question": req.time_per_question, "show_explanations": True, "video_enabled": req.video_enabled},
    }
    supabase.table("rooms").insert(room_payload).execute()
    room = supabase.table("rooms").select("*").eq("room_code", room_code).single().execute()

    host_name = get_user_display_name(user)
    supabase.table("room_participants").insert({
        "room_id": room.data["id"],
        "user_id": user.id,
        "guest_name": host_name,
        "score": 0,
        "streak": 0,
    }).execute()

    questions = supabase.table("questions").select("*").eq("quiz_id", quiz_id).order("order_index").execute()
    for i, q in enumerate(questions.data):
        supabase.table("room_questions").insert({
            "room_id": room.data["id"],
            "question_id": q["id"],
            "order_index": i,
            "time_limit_seconds": req.time_per_question,
        }).execute()

    return {"room_id": room.data["id"], "room_code": room_code}

@router.post("/create-from-document")
async def create_room_from_document(req: CreateDocumentRoomRequest, user=Depends(get_current_user)):
    document = supabase.table("documents").select("*").eq("id", req.document_id).single().execute()
    if not document.data:
        raise HTTPException(404, "Document not found")
    if document.data["user_id"] != user.id:
        raise HTTPException(403, "You don't own this document")

    try:
        ai_title = generate_title_from_text(document.data["content_text"])
    except:
        ai_title = extract_fallback_title(document.data["content_text"])

    questions_data = generate_quiz_from_text(document.data["content_text"], req.num_questions, req.difficulty)
    if not questions_data:
        raise HTTPException(500, "Failed to generate quiz questions from document")

    quiz_id = str(uuid.uuid4())
    supabase.table("quizzes").insert({
        "id": quiz_id,
        "title": ai_title,
        "topic": ai_title,
        "difficulty": req.difficulty,
        "created_by": user.id,
    }).execute()

    for i, q in enumerate(questions_data):
        supabase.table("questions").insert({
            "quiz_id": quiz_id,
            "question_text": q["question_text"],
            "question_type": q["question_type"],
            "options": q.get("options"),
            "correct_answer": q["correct_answer"],
            "explanation": q.get("explanation", ""),
            "order_index": i,
        }).execute()

    room_code = generate_room_code()
    while True:
        existing = supabase.table("rooms").select("id").eq("room_code", room_code).execute()
        if not existing.data:
            break
        room_code = generate_room_code()

    room_payload = {
        "room_code": room_code,
        "quiz_id": quiz_id,
        "host_id": user.id,
        "settings": {"time_per_question": req.time_per_question, "show_explanations": True, "video_enabled": req.video_enabled},
    }
    supabase.table("rooms").insert(room_payload).execute()
    room = supabase.table("rooms").select("*").eq("room_code", room_code).single().execute()

    host_name = get_user_display_name(user)
    supabase.table("room_participants").insert({
        "room_id": room.data["id"],
        "user_id": user.id,
        "guest_name": host_name,
        "score": 0,
        "streak": 0,
    }).execute()

    questions = supabase.table("questions").select("*").eq("quiz_id", quiz_id).order("order_index").execute()
    for i, q in enumerate(questions.data):
        supabase.table("room_questions").insert({
            "room_id": room.data["id"],
            "question_id": q["id"],
            "order_index": i,
            "time_limit_seconds": req.time_per_question,
        }).execute()

    return {"room_id": room.data["id"], "room_code": room_code}

@router.post("/join")
async def join_room(req: JoinRoomRequest, user=Depends(get_current_user)):
    if not req.room_code:
        raise HTTPException(400, "Room code is required")
    rooms = supabase.table("rooms").select("*").eq("room_code", req.room_code.upper()).execute()
    if not rooms.data:
        raise HTTPException(404, "Room not found")
    room = rooms.data[0]

    participants = supabase.table("room_participants").select("*").eq("room_id", room["id"]).execute()
    if len(participants.data) >= room.get("max_players", 10):
        raise HTTPException(400, "Room is full")

    guest_name = req.guest_name or get_user_display_name(user)
    result = supabase.table("room_participants").insert({
        "room_id": room["id"],
        "user_id": user.id,
        "guest_name": guest_name,
        "score": 0,
        "streak": 0,
    }).execute()

    return {"room_id": room["id"], "room_code": room["room_code"], "participant_id": user.id}

@router.get("/{room_code}")
async def get_room(room_code: str):
    room = supabase.table("rooms").select("*").eq("room_code", room_code).single().execute()
    if not room.data:
        raise HTTPException(404, "Room not found")
    quiz = supabase.table("quizzes").select("title, topic").eq("id", room.data["quiz_id"]).single().execute()
    participants = supabase.table("room_participants").select("*").eq("room_id", room.data["id"]).execute()
    room_data = {**room.data, "topic": quiz.data.get("topic", "") if quiz.data else ""}
    return {"room": room_data, "participants": participants.data}
