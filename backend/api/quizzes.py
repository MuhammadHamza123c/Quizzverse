from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from db.supabase_client import supabase
from services.ai_service import generate_quiz, get_hint, judge_answer
from api.dependencies import get_current_user
from postgrest.exceptions import APIError
import uuid

router = APIRouter(prefix="/api/quizzes", tags=["Quizzes"])

class QuizGenerateRequest(BaseModel):
    topic: str
    num_questions: int = 5
    difficulty: str = "medium"


class QuizCompleteRequest(BaseModel):
    score: int
    total_questions: int
    quiz_id: str | None = None

@router.post("/generate")
async def create_quiz(req: QuizGenerateRequest, user=Depends(get_current_user)):
    if not req.topic.strip():
        raise HTTPException(400, "Topic must not be empty")
    try:
        questions_data = generate_quiz(req.topic.strip(), req.num_questions, req.difficulty)
    except Exception as e:
        raise HTTPException(500, f"AI generation failed: {str(e)}")

    quiz_id = str(uuid.uuid4())
    quiz_payload = {
        "id": quiz_id,
        "title": f"Quiz: {req.topic}",
        "topic": req.topic,
        "difficulty": req.difficulty,
        "question_count": len(questions_data),
        "source": "ai",
        "created_by": user.id,
    }

    try:
        supabase.table("quizzes").insert(quiz_payload).execute()
        for i, q in enumerate(questions_data):
            question_payload = {
                "quiz_id": quiz_id,
                "question_text": q.get("question_text", q.get("question", "")),
                "question_type": q.get("question_type", "mcq"),
                "options": q.get("options"),
                "correct_answer": q.get("correct_answer", ""),
                "explanation": q.get("explanation", ""),
                "difficulty": req.difficulty,
                "order_index": i,
            }
            supabase.table("questions").insert(question_payload).execute()
    except APIError:
        pass

    inserted = supabase.table("questions").select("*").eq("quiz_id", quiz_id).order("order_index").execute()

    return {"quiz_id": quiz_id, "title": quiz_payload["title"], "questions": inserted.data}


@router.post("/complete")
async def complete_quiz(req: QuizCompleteRequest, user=Depends(get_current_user)):
    profile = supabase.table("profiles").select("*").eq("id", user.id).single().execute()
    if not profile.data:
        raise HTTPException(404, "Profile not found")

    current_played = profile.data.get("total_quizzes_played", 0) or 0
    current_score = profile.data.get("total_score", 0) or 0

    supabase.table("profiles").update({
        "total_quizzes_played": current_played + 1,
        "total_score": current_score + req.score,
    }).eq("id", user.id).execute()

    return {
        "message": "Quiz stats updated",
        "total_quizzes_played": current_played + 1,
        "total_score": current_score + req.score,
    }


@router.get("/")
async def list_quizzes(user=Depends(get_current_user)):
    res = supabase.table("quizzes").select("*").eq("created_by", user.id).order("created_at", desc=True).limit(50).execute()
    return res.data

@router.get("/{quiz_id}")
async def get_quiz(quiz_id: str):
    quiz = supabase.table("quizzes").select("*").eq("id", quiz_id).single().execute()
    if not quiz.data:
        raise HTTPException(404, "Quiz not found")
    questions = supabase.table("questions").select("*").eq("quiz_id", quiz_id).order("order_index").execute()
    return {"quiz": quiz.data, "questions": questions.data}

class JudgeAnswerRequest(BaseModel):
    question_text: str
    correct_answer: str
    user_answer: str
    question_type: str = "fill_blank"

@router.post("/judge-answer")
async def judge_user_answer(req: JudgeAnswerRequest, user=Depends(get_current_user)):
    try:
        correct = judge_answer(req.question_text, req.correct_answer, req.user_answer, req.question_type)
        return {"correct": correct}
    except Exception as e:
        raise HTTPException(500, f"Judgement failed: {str(e)}")

class HintRequest(BaseModel):
    question_id: str

@router.post("/hint")
async def get_quiz_hint(req: HintRequest, user=Depends(get_current_user)):
    question = supabase.table("questions").select("*").eq("id", req.question_id).single().execute()
    if not question.data:
        raise HTTPException(404, "Question not found")
    try:
        hint = get_hint(
            question_text=question.data["question_text"],
            question_type=question.data["question_type"],
            options=question.data.get("options"),
            correct_answer=question.data["correct_answer"],
        )
        return {"hint": hint}
    except Exception as e:
        raise HTTPException(500, f"Failed to generate hint: {str(e)}")

@router.get("/{quiz_id}/export")
async def export_quiz(quiz_id: str):
    quiz = supabase.table("quizzes").select("*").eq("id", quiz_id).single().execute()
    if not quiz.data:
        raise HTTPException(404, "Quiz not found")
    questions = supabase.table("questions").select("*").eq("quiz_id", quiz_id).order("order_index").execute()
    return {
        "title": quiz.data["title"],
        "topic": quiz.data.get("topic", ""),
        "difficulty": quiz.data.get("difficulty", "medium"),
        "question_count": len(questions.data),
        "questions": [
            {
                "question_text": q["question_text"],
                "question_type": q["question_type"],
                "options": q.get("options"),
                "correct_answer": q["correct_answer"],
                "explanation": q.get("explanation", ""),
                "difficulty": q.get("difficulty", "medium"),
            }
            for q in questions.data
        ],
    }


class ImportQuestion(BaseModel):
    question_text: str
    question_type: str = "mcq"
    options: dict | None = None
    correct_answer: str
    explanation: str = ""
    difficulty: str = "medium"


class QuizImportRequest(BaseModel):
    title: str = ""
    topic: str = ""
    difficulty: str = "medium"
    questions: list[ImportQuestion]


@router.post("/import")
async def import_quiz(req: QuizImportRequest, user=Depends(get_current_user)):
    if not req.questions:
        raise HTTPException(400, "At least one question is required")

    quiz_id = str(uuid.uuid4())
    title = req.title or f"Quiz: {req.topic}" if req.topic else "Imported Quiz"
    topic = req.topic or title

    quiz_payload = {
        "id": quiz_id,
        "title": title,
        "topic": topic,
        "difficulty": req.difficulty,
        "question_count": len(req.questions),
        "source": "imported",
        "created_by": user.id,
    }

    try:
        supabase.table("quizzes").insert(quiz_payload).execute()
        for i, q in enumerate(req.questions):
            supabase.table("questions").insert({
                "quiz_id": quiz_id,
                "question_text": q.question_text,
                "question_type": q.question_type,
                "options": q.options,
                "correct_answer": q.correct_answer,
                "explanation": q.explanation,
                "difficulty": q.difficulty,
                "order_index": i,
            }).execute()
    except APIError as e:
        raise HTTPException(500, f"Failed to save quiz: {str(e)}")

    return {"quiz_id": quiz_id, "title": title, "question_count": len(req.questions)}


@router.delete("/{quiz_id}")
async def delete_quiz(quiz_id: str, user=Depends(get_current_user)):
    quiz = supabase.table("quizzes").select("id, created_by").eq("id", quiz_id).single().execute()
    if not quiz.data:
        raise HTTPException(404, "Quiz not found")
    if quiz.data["created_by"] != user.id:
        raise HTTPException(403, "You can only delete your own quizzes")
    rooms = supabase.table("rooms").select("id").eq("quiz_id", quiz_id).execute()
    if rooms.data:
        for r in rooms.data:
            supabase.table("room_questions").delete().eq("room_id", r["id"]).execute()
            supabase.table("room_participants").delete().eq("room_id", r["id"]).execute()
        supabase.table("rooms").delete().eq("quiz_id", quiz_id).execute()
    supabase.table("questions").delete().eq("quiz_id", quiz_id).execute()
    supabase.table("quizzes").delete().eq("id", quiz_id).execute()
    return {"message": "Quiz deleted"}
