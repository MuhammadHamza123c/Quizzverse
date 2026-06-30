from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from api.dependencies import get_current_user
from db.supabase_client import supabase
from datetime import datetime, timezone

router = APIRouter(prefix="/api/flashcards", tags=["Flashcards"])

class WrongAnswer(BaseModel):
    question_text: str
    question_type: str = "mcq"
    options: dict | None = None
    correct_answer: str
    user_wrong_answer: str | None = None
    explanation: str | None = None
    difficulty: str = "medium"

class GenerateRequest(BaseModel):
    wrong_answers: list[WrongAnswer]
    quiz_id: str

@router.post("/generate")
async def generate_flashcards(req: GenerateRequest, user=Depends(get_current_user)):
    quiz_title = ""
    try:
        quiz = supabase.table("quizzes").select("title").eq("id", req.quiz_id).single().execute()
        if quiz.data:
            quiz_title = quiz.data.get("title", "")
    except:
        pass

    created = []
    for wa in req.wrong_answers:
        card = {
            "user_id": user.id,
            "quiz_id": req.quiz_id,
            "quiz_title": quiz_title,
            "question_text": wa.question_text,
            "question_type": wa.question_type,
            "options": wa.options,
            "correct_answer": wa.correct_answer,
            "user_wrong_answer": wa.user_wrong_answer,
            "explanation": wa.explanation,
            "difficulty": wa.difficulty,
            "reviewed": False,
        }
        res = supabase.table("flashcards").insert(card).execute()
        if res.data:
            created.append(res.data[0])

    return {"flashcards": created}

@router.get("")
async def list_flashcards(user=Depends(get_current_user)):
    res = supabase.table("flashcards").select("*").eq("user_id", user.id).order("created_at", desc=True).execute()
    return {"flashcards": res.data or []}

@router.delete("/{card_id}")
async def delete_flashcard(card_id: str, user=Depends(get_current_user)):
    res = supabase.table("flashcards").delete().eq("id", card_id).eq("user_id", user.id).execute()
    if not res.data:
        raise HTTPException(404, "Flashcard not found")
    return {"ok": True}

@router.patch("/{card_id}/review")
async def toggle_review(card_id: str, user=Depends(get_current_user)):
    card = supabase.table("flashcards").select("reviewed").eq("id", card_id).eq("user_id", user.id).single().execute()
    if not card.data:
        raise HTTPException(404, "Flashcard not found")
    new_reviewed = not card.data["reviewed"]
    res = supabase.table("flashcards").update({"reviewed": new_reviewed}).eq("id", card_id).eq("user_id", user.id).execute()
    if not res.data:
        raise HTTPException(404, "Flashcard not found")
    return {"flashcard": res.data[0]}
