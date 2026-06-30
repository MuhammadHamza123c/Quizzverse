from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from pydantic import BaseModel
from api.dependencies import get_current_user
from services.chat_service import chat_with_context, transcribe_audio
from services.doc_parser import parse_document
from services.ai_service import generate_suggestions

router = APIRouter(prefix="/api/chat", tags=["Chat"])


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    messages: list[ChatMessage]
    profile: str | None = None


@router.post("/message")
async def chat_message(req: ChatRequest, user=Depends(get_current_user)):
    try:
        messages = [{"role": m.role, "content": m.content} for m in req.messages]
        response = chat_with_context(messages, req.profile)
        return {"response": response, "role": "assistant"}
    except Exception as e:
        raise HTTPException(500, f"AI chat failed: {str(e)}")


@router.get("/suggestions")
async def chat_suggestions(user=Depends(get_current_user)):
    try:
        suggestions = generate_suggestions()
        return {"suggestions": suggestions}
    except Exception as e:
        from services.ai_service import _default_suggestions
        return {"suggestions": _default_suggestions()}


@router.post("/upload")
async def chat_upload(file: UploadFile = File(...), user=Depends(get_current_user)):
    try:
        file_bytes = await file.read()
        filename = file.filename or "file"
        ext = filename.lower().split(".")[-1]

        audio_exts = {"mp3", "wav", "m4a", "ogg", "webm"}
        image_exts = {"png", "jpg", "jpeg", "gif", "bmp", "webp"}

        if ext in audio_exts:
            text = transcribe_audio(file_bytes, filename)
            source = "transcribed audio"
        elif ext in image_exts:
            text = f"[Image uploaded: {filename}]"
            source = "image"
        else:
            text = parse_document(filename, file_bytes)
            source = "document"

        max_chars = 8000
        if len(text) > max_chars:
            text = text[:max_chars] + "\n\n[Content truncated...]"

        return {"text": text, "source": source, "filename": filename}
    except ValueError as e:
        raise HTTPException(400, str(e))
    except Exception as e:
        raise HTTPException(500, f"File processing failed: {str(e)}")
