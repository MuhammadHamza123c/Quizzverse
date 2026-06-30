from fastapi import APIRouter, HTTPException, UploadFile, File, Depends
from db.supabase_client import supabase
from services.doc_parser import parse_document
from services.ai_service import generate_quiz_from_text, generate_title_from_text, extract_fallback_title
from api.dependencies import get_current_user
import uuid

router = APIRouter(prefix="/api/documents", tags=["Documents"])

@router.post("/upload")
async def upload_document(file: UploadFile = File(...), user=Depends(get_current_user)):
    if file.filename is None:
        raise HTTPException(400, "No file provided")

    allowed = ["pdf", "docx", "txt", "json"]
    ext = file.filename.split(".")[-1].lower()
    if ext not in allowed:
        raise HTTPException(400, f"Unsupported file type: .{ext}. Allowed: {allowed}")

    file_bytes = await file.read()

    try:
        content_text = parse_document(file.filename, file_bytes)
    except Exception as e:
        raise HTTPException(400, f"Failed to parse document: {str(e)}")

    if not content_text.strip():
        raise HTTPException(400, "No extractable text found in document")

    file_path = f"{user.id}/{uuid.uuid4()}_{file.filename}"
    supabase.storage.from_("documents").upload(file_path, file_bytes)
    file_url = supabase.storage.from_("documents").get_public_url(file_path)

    word_count = len(content_text.split())
    doc_payload = {
        "user_id": user.id,
        "file_name": file.filename,
        "file_url": file_url,
        "content_text": content_text,
        "word_count": word_count,
    }
    doc_res = supabase.table("documents").insert(doc_payload).execute()
    doc_id = doc_res.data[0]["id"]

    return {
        "document_id": doc_id,
        "file_name": file.filename,
        "word_count": word_count,
        "file_url": file_url,
        "content_preview": content_text[:500],
    }

@router.post("/{document_id}/generate-quiz")
async def create_quiz_from_document(document_id: str, num_questions: int = 5, difficulty: str = "medium", user=Depends(get_current_user)):
    doc = supabase.table("documents").select("*").eq("id", document_id).single().execute()
    if not doc.data:
        raise HTTPException(404, "Document not found")
    if doc.data["user_id"] != user.id:
        raise HTTPException(403, "You don't own this document")

    try:
        ai_title = generate_title_from_text(doc.data["content_text"])
    except:
        ai_title = extract_fallback_title(doc.data["content_text"])

    try:
        questions_data = generate_quiz_from_text(doc.data["content_text"], num_questions, difficulty)
    except Exception as e:
        raise HTTPException(500, f"AI generation failed: {str(e)}")

    quiz_id = str(uuid.uuid4())
    quiz_payload = {
        "id": quiz_id,
        "title": ai_title,
        "topic": ai_title,
        "difficulty": difficulty,
        "question_count": len(questions_data),
        "source": "document",
        "document_id": document_id,
        "created_by": user.id,
    }

    supabase.table("quizzes").insert(quiz_payload).execute()
    for i, q in enumerate(questions_data):
        question_payload = {
            "quiz_id": quiz_id,
            "question_text": q["question_text"],
            "question_type": q["question_type"],
            "options": q.get("options"),
            "correct_answer": q["correct_answer"],
            "explanation": q.get("explanation", ""),
            "difficulty": difficulty,
            "order_index": i,
        }
        supabase.table("questions").insert(question_payload).execute()

    inserted = supabase.table("questions").select("*").eq("quiz_id", quiz_id).order("order_index").execute()

    return {"quiz_id": quiz_id, "title": quiz_payload["title"], "questions": inserted.data}

@router.get("/")
async def list_documents(user=Depends(get_current_user)):
    res = supabase.table("documents").select("*").eq("user_id", user.id).order("created_at", desc=True).execute()
    return res.data

@router.delete("/{document_id}")
async def delete_document(document_id: str, user=Depends(get_current_user)):
    doc = supabase.table("documents").select("*").eq("id", document_id).single().execute()
    if not doc.data:
        raise HTTPException(404, "Document not found")
    if doc.data["user_id"] != user.id:
        raise HTTPException(403, "You don't own this document")
    supabase.table("documents").delete().eq("id", document_id).execute()
    return {"message": "Document deleted"}
